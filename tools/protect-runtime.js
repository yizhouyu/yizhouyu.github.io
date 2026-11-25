/* yzy-vault runtime. Inlined into every protected page by tools/protect.mjs.
   Flow: password -> PBKDF2-SHA256 -> AES-256-GCM key -> decrypt the page in the browser.
   After unlocking, the page's own HTML replaces this document and can use window.vault. */
(function () {
  'use strict';

  var cfg = JSON.parse(document.getElementById('vault-data').textContent);
  var SLOT = 'vault:' + cfg.page;            // where the derived key is remembered
  var AAD = 'vault1|' + cfg.page + '|';      // binds every ciphertext to its page and name
  var base = new URL('.', location.href).href;
  var te = new TextEncoder(), td = new TextDecoder();

  var form = document.getElementById('vault-form');
  var input = document.getElementById('vault-pw');
  var keep = document.getElementById('vault-keep');
  var button = document.getElementById('vault-go');
  var msg = document.getElementById('vault-msg');

  function b64d(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function b64e(a) { var s = ''; for (var i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); }
  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function read(kind) { try { return store(kind).getItem(SLOT); } catch (e) { return null; } }
  function write(kind, v) { try { store(kind).setItem(SLOT, v); } catch (e) {} }
  function forget() { ['sessionStorage', 'localStorage'].forEach(function (k) { try { store(k).removeItem(SLOT); } catch (e) {} }); }

  async function derive(password) {
    var km = await crypto.subtle.importKey('raw', te.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64d(cfg.salt), iterations: cfg.iter }, km, 256);
    return new Uint8Array(bits);
  }
  function importKey(raw) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
  /* Blob layout everywhere: 12-byte IV, then ciphertext with the 16-byte GCM tag appended. */
  function open(key, blob, label) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: blob.subarray(0, 12), additionalData: te.encode(AAD + label) }, key, blob.subarray(12));
  }
  async function seal(key, bytes, label) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: te.encode(AAD + label) }, key, bytes));
    var out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
  }
  /* Returns the decrypted page ({ html, files }) or throws when the key is wrong. */
  async function unlock(raw) {
    var key = await importKey(raw);
    var main = JSON.parse(td.decode(await open(key, b64d(cfg.main), 'index')));
    return { key: key, main: main };
  }

  function render(key, main) {
    var files = main.files || {}, urls = {};
    function entry(name) {
      if (!Object.prototype.hasOwnProperty.call(files, name)) throw new Error('vault: no such file "' + name + '"');
      return files[name];
    }
    async function bytes(name) {
      var f = entry(name);
      var res = await fetch(base + f.id + '.enc?v=' + f.v);
      if (!res.ok) throw new Error('vault: could not load "' + name + '" (HTTP ' + res.status + ')');
      return open(key, new Uint8Array(await res.arrayBuffer()), 'file|' + name);
    }
    function url(name) {
      if (!urls[name]) {
        urls[name] = bytes(name).then(function (b) { return URL.createObjectURL(new Blob([b], { type: entry(name).type })); });
        urls[name].catch(function () { delete urls[name]; });
      }
      return urls[name];
    }
    function dataSlot(k) { return SLOT + ':data:' + k; }

    window.vault = Object.freeze({
      page: cfg.page,
      files: Object.keys(files),
      url: url,                                                                    // Promise<blob: URL>
      bytes: bytes,                                                                // Promise<ArrayBuffer>
      text: function (name) { return bytes(name).then(function (b) { return td.decode(b); }); },
      json: function (name) { return bytes(name).then(function (b) { return JSON.parse(td.decode(b)); }); },
      lock: function () { forget(); location.reload(); },
      /* Small private notebook: values are encrypted with the page key and kept in this browser only. */
      store: Object.freeze({
        get: async function (k) {
          var v = null; try { v = localStorage.getItem(dataSlot(k)); } catch (e) {}
          if (v == null) return null;
          try { return JSON.parse(td.decode(await open(key, b64d(v), 'store|' + k))); } catch (e) { return null; }
        },
        set: async function (k, value) {
          localStorage.setItem(dataSlot(k), b64e(await seal(key, te.encode(JSON.stringify(value)), 'store|' + k)));
        },
        remove: function (k) { try { localStorage.removeItem(dataSlot(k)); } catch (e) {} }
      })
    });

    document.open();
    document.write(main.html);
    document.close();
    if (document.getElementById('vault-data')) throw new Error('vault: could not replace the gate page');

    /* <img data-secret-src="photo.jpg">, <a data-secret-href="doc.pdf">, <video data-secret-poster="..."> */
    var MAP = { 'data-secret-src': 'src', 'data-secret-href': 'href', 'data-secret-poster': 'poster' };
    var ATTRS = Object.keys(MAP), SEL = ATTRS.map(function (a) { return '[' + a + ']'; }).join(',');
    var done = new WeakMap();
    function apply(el) {
      if (!el.getAttribute) return;
      ATTRS.forEach(function (attr) {
        var name = el.getAttribute(attr);
        if (!name) return;
        var seen = done.get(el) || {};
        if (seen[attr] === name) return;
        seen[attr] = name; done.set(el, seen);
        url(name).then(function (u) {
          if (el.getAttribute(attr) === name) el.setAttribute(MAP[attr], u);
        }).catch(function (e) { console.error(e); el.setAttribute('data-secret-error', String(e && e.message || e)); });
      });
    }
    function scan(root) {
      if (root.nodeType !== 1 && root.nodeType !== 9) return;
      if (root.nodeType === 1 && root.matches(SEL)) apply(root);
      root.querySelectorAll(SEL).forEach(apply);
    }
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'attributes') apply(m.target);
        else m.addedNodes.forEach(scan);
      });
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ATTRS });
    scan(document);
  }

  /* document.open() only replaces the page once the browser has finished parsing the gate itself. */
  function parsed() {
    return new Promise(function (done) {
      if (document.readyState !== 'loading') done();
      else document.addEventListener('DOMContentLoaded', function () { done(); }, { once: true });
    });
  }

  function showForm(text) {
    document.body.classList.remove('checking');
    msg.textContent = text || '';
    try { input.focus(); } catch (e) {}
  }

  async function start() {
    if (!window.crypto || !crypto.subtle) {
      showForm('This browser cannot decrypt here (needs HTTPS and a modern browser).');
      button.disabled = true; input.disabled = true;
      return;
    }
    var saved = read('sessionStorage') || read('localStorage');
    if (saved) {
      try {
        var r = await unlock(b64d(saved));
      } catch (e) {
        forget();   // password was changed since this device remembered it
      }
      if (r) { await parsed(); return render(r.key, r.main); }
    }
    showForm();
  }

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    if (button.disabled || !input.value) return;
    form.classList.remove('bad');
    msg.textContent = '';
    button.disabled = true;
    var label = button.innerHTML;
    button.textContent = 'Unlocking…';
    var raw, r;
    try {
      raw = await derive(input.value);
      r = await unlock(raw);
    } catch (e) {
      button.disabled = false;
      button.innerHTML = label;
      void form.offsetWidth;                 // restart the nudge animation
      form.classList.add('bad');
      msg.textContent = 'Wrong password';
      input.select();
      return;
    }
    forget();
    write(keep.checked ? 'localStorage' : 'sessionStorage', b64e(raw));
    await parsed();
    render(r.key, r.main);
  });

  start();
})();
