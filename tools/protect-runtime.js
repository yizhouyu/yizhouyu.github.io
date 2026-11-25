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
  /* Speed bump against guessing on the page: every 3 wrong tries lock the form, 1 min at first and
     doubling up to 1 h. It lives in this browser only, so it does not stop offline guessing. */
  var TRIES = SLOT + ':tries', MAX_TRIES = 3, LOCK_MS = 60 * 1000, LOCK_MAX_MS = 60 * 60 * 1000, TRIES_TTL_MS = 24 * 60 * 60 * 1000;
  function tries() {
    try {
      var t = JSON.parse(localStorage.getItem(TRIES));
      if (t && t.n > 0 && Math.abs(Date.now() - t.at) < TRIES_TTL_MS) return { n: t.n, at: t.at, until: t.until || 0 };
    } catch (e) {}
    return { n: 0, at: 0, until: 0 };
  }
  function lockedFor() { return Math.min(tries().until - Date.now(), LOCK_MAX_MS); }
  /* Records one wrong try. Returns how many tries are left before the next lock (0 = locked now). */
  function strike() {
    var t = tries(), now = Date.now();
    t.n++; t.at = now;
    if (t.n % MAX_TRIES === 0) t.until = now + Math.min(LOCK_MS * Math.pow(2, t.n / MAX_TRIES - 1), LOCK_MAX_MS);
    try { localStorage.setItem(TRIES, JSON.stringify(t)); } catch (e) {}
    return (MAX_TRIES - t.n % MAX_TRIES) % MAX_TRIES;
  }
  function pardon() { try { localStorage.removeItem(TRIES); } catch (e) {} }

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

  /* Shows the countdown and disables the form while locked. Returns false when not locked. */
  var ticker = null;
  function lockout() {
    clearInterval(ticker);
    function tick() {
      var ms = lockedFor();
      if (ms <= 0) return false;
      var s = Math.ceil(ms / 1000);
      var text = 'Too many wrong attempts. Try again in ' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2) + '.';
      input.disabled = button.disabled = true;
      if (msg.textContent !== text) msg.textContent = text;
      return true;
    }
    if (!tick()) return false;
    ticker = setInterval(function () {
      if (tick()) return;
      clearInterval(ticker);
      input.disabled = button.disabled = false;
      msg.textContent = '';
      form.classList.remove('bad');
      try { input.focus(); } catch (e) {}
    }, 250);
    return true;
  }

  function showForm(text) {
    document.body.classList.remove('checking');
    msg.textContent = text || '';
    if (lockout()) return;
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
    if (lockout()) return;                   // locked from another tab
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
      var left = strike();
      if (!lockout()) {
        msg.textContent = 'Wrong password. ' + left + (left === 1 ? ' attempt' : ' attempts') + ' left.';
        input.select();
      }
      return;
    }
    pardon();
    forget();
    write(keep.checked ? 'localStorage' : 'sessionStorage', b64e(raw));
    await parsed();
    render(r.key, r.main);
  });

  start();
})();
