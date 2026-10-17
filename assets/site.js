/* Site-wide behaviour: theme toggle, contact reveal, GoatCounter view counts, YZY mark, proof counters, ruler, post extras, Giscus. */

(function () {
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function current() { return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light'); }
  function sync() {
    var t = current();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', 'Theme: ' + t + '. Switch to ' + (t === 'dark' ? 'light' : 'dark'));
      b.setAttribute('data-state', t);
      var l = b.querySelector('[data-theme-label]');
      if (l) l.textContent = t === 'dark' ? 'Dark' : 'Light';
    });
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', n);
      try { localStorage.setItem('theme', n); } catch (e) {}
      sync();
    });
  });
  if (mq.addEventListener) mq.addEventListener('change', sync);
  sync();

  /* Contact form reveal */
  document.querySelectorAll('[data-contact-toggle]').forEach(function (b) {
    var panel = document.getElementById(b.getAttribute('aria-controls'));
    if (!panel) return;
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
      if (!open) { var f = panel.querySelector('input:not([type=hidden])'); if (f) f.focus(); }
    });
  });

  /* Quiet per-post view counts (GoatCounter public counter) */
  document.querySelectorAll('[data-gc-path]').forEach(function (el) {
    fetch('https://yizhouyu.goatcounter.com/counter/' + encodeURIComponent(el.getAttribute('data-gc-path')) + '.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { if (d && d.count) { el.textContent = d.count + ' views'; el.hidden = false; } })
      .catch(function () {});
  });
})();

/* Years at Meta, counted from the July 2020 start date so the copy never goes stale. */
(function () {
  var els = document.querySelectorAll('[data-meta-years]');
  if (!els.length) return;
  var y = Math.floor((new Date() - new Date(2020, 6, 1)) / (365.25 * 864e5));
  var W = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen'];
  els.forEach(function (e) { e.textContent = e.getAttribute('data-meta-years') === 'word' ? (W[y] || y) : y; });
})();

/* Live proof figures: total essay reads = sum of GoatCounter counts (static fallback stays if offline). */
(function () {
  var el = document.querySelectorAll('[data-reads]');
  if (el.length) {
  var paths = ['/blog/posts/claude-code-edits-my-vlogs/', '/blog/posts/deleted-the-ui/', '/blog/posts/cultivation-ai/', '/blog/posts/vibe-coding-with-claude-code/'];
  Promise.all(paths.map(function (p) {
    return fetch('https://yizhouyu.goatcounter.com/counter/' + encodeURIComponent(p) + '.json')
      .then(function (r) { return r.ok ? r.json() : { count: '0' }; })
      .then(function (d) { return parseInt(String(d.count || '0').replace(/\D/g, ''), 10) || 0; })
      .catch(function () { return 0; });
  })).then(function (n) {
    var sum = n.reduce(function (a, b) { return a + b; }, 0);
    if (sum > 0) el.forEach(function (e) { e.textContent = sum.toLocaleString('en-US'); });
  });
  }
  /* weeks so far: exact count from the /weeks app (number only, DOB stays server-side);
     falls back to a month-level estimate (June 1998) offline or if the endpoint is unreachable */
  function setWeeks(w) {
    document.querySelectorAll('[data-weeks-live]').forEach(function (e) { e.textContent = w.toLocaleString('en-US'); });
  }
  setWeeks(Math.floor((new Date() - new Date(1998, 5, 1)) / 6048e5));
  fetch('/weeks/api/weeks')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.weeks > 0) setWeeks(d.weeks); })
    .catch(function () {});
})();

/* Life-in-Weeks ruler.
   Month-level precision only (exact DOB stays server-side in the /weeks app).
   One row per calendar year, 52 columns = weeks of that year. Lived weeks only — no future tail.
   Milestones come from /weeks/api/milestones (events flagged `home` in life-events.ts);
   M below is only the offline fallback, drawn first and replaced when the endpoint answers. */
(function () {
  var root = document.querySelector('[data-ruler]');
  if (!root) return;
  var WEEKS_URL = root.getAttribute('data-href') || 'https://yizhouyu.dev/weeks/';
  var START = new Date(1998, 5, 1);              // June 1998
  var US = new Date(2016, 7, 1), NYC = new Date(2020, 6, 1);
  var FALLBACK = [
    ['1998-06', 'Born in Shanghai'],
    ['2009-09', 'Shanghai Foreign Language School'],
    ['2016-08', 'Came to the US for college · Cornell'],
    ['2018-05', 'Meta intern'],
    ['2019-06', 'Point72 intern'],
    ['2020-05', 'Cornell M.Eng.'],
    ['2020-07', 'Meta, full-time'],
    ['2022-01', 'Started a YouTube channel'],
    ['2022-08', 'Experimentation Platform'],
    ['2022-09', 'Started dating my future wife'],
    ['2024-08', 'Adopted Humi'],
    ['2025-01', 'AI for Analytics'],
    ['2025-06', 'AI for Experimentation'],
    ['2025-07', 'Married'],
    ['2026-02', 'Agent Captain'],
    ['2026-09', 'AIGC · New AI Bets']
  ];
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DAY = 864e5;
  function wk(d) { return Math.min(51, Math.floor((d - new Date(d.getFullYear(), 0, 1)) / (7 * DAY))); }
  var now = new Date();
  var grid = root.querySelector('.ruler-grid');
  var cap = root.querySelector('.ruler-cap');
  var defaultCap = cap ? cap.innerHTML : '';
  var nowKey = now.getFullYear() + ':' + wk(now);

  function build(M) {
  var byCell = {};
  M.forEach(function (m) {
    var p = m[0].split('-'), d = new Date(+p[0], +p[1] - 1, 1);
    var k = d.getFullYear() + ':' + wk(d);
    (byCell[k] = byCell[k] || []).push({ when: MON[d.getMonth()] + ' ' + d.getFullYear(), mon: MON[d.getMonth()], label: m[1] });
  });
  var lived = 0, frag = document.createDocumentFragment();
  for (var y = START.getFullYear(); y <= now.getFullYear(); y++) {
    var row = document.createElement('div');
    row.className = 'ruler-row' + (y % 5 === 0 ? ' is-5' : '');
    var lab = document.createElement('span');
    lab.className = 'ruler-yr';
    lab.textContent = y;
    row.appendChild(lab);
    var notes = [];
    for (var w = 0; w < 52; w++) {
      var s = new Date(y, 0, 1 + w * 7);
      var e = w === 51 ? new Date(y + 1, 0, 1) : new Date(y, 0, 8 + w * 7);
      var key = y + ':' + w, ms = byCell[key];
      var isLived = e > START && s <= now;
      var el;
      if (ms && isLived) {
        el = document.createElement('button');
        el.type = 'button';
        el.className = 'c m';
        var txt = ms.map(function (x) { return x.when + ' — ' + x.label; }).join('; ');
        el.setAttribute('aria-label', txt);
        el.setAttribute('data-label', txt);
        ms.forEach(function (x) { notes.push('<span class="it"><b>' + x.mon + '</b> ' + x.label + '</span>'); });
      } else {
        el = document.createElement('i');
        el.className = 'c';
        el.setAttribute('aria-hidden', 'true');
      }
      if (!isLived) el.className += ' x';
      else {
        lived++;
        el.className += s < US ? ' sh' : (s < NYC ? ' it' : ' ny');
        if (key === nowKey) el.className += ' now';
      }
      row.appendChild(el);
    }
    if (y === now.getFullYear()) notes.push('<span class="it"><b>' + MON[now.getMonth()] + '</b> <span class="now-t">This week</span></span>');
    var n = document.createElement('span');
    n.className = 'ruler-note';
    n.innerHTML = notes.join('<span class="sep"> · </span>');
    row.appendChild(n);
    frag.appendChild(row);
  }
  grid.textContent = '';
  grid.appendChild(frag);
  }
  build(FALLBACK);
  fetch('/weeks/api/milestones')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (d && d.milestones && d.milestones.length) build(d.milestones.map(function (m) { return [m.month, m.label]; }));
    })
    .catch(function () {});
  var weeksSoFar = Math.floor((now - START) / (7 * DAY));   // computed live from today's date
  root.querySelectorAll('[data-weeks-count]').forEach(function (el) { el.textContent = weeksSoFar.toLocaleString('en-US'); });
  if (cap) defaultCap = cap.innerHTML;

  function show(btn) { if (cap) cap.innerHTML = '<span class="ruler-hit">' + btn.getAttribute('data-label') + '</span>'; }
  function reset() { if (cap) cap.innerHTML = defaultCap; }
  grid.addEventListener('pointerover', function (ev) { var b = ev.target.closest('.m'); if (b) show(b); });
  grid.addEventListener('pointerleave', reset);
  grid.addEventListener('focusin', function (ev) { var b = ev.target.closest('.m'); if (b) show(b); });
  grid.addEventListener('focusout', reset);
  grid.addEventListener('click', function (ev) {
    var b = ev.target.closest('.m');
    if (b) { show(b); return; }                     // tap a milestone: read its label
    if (ev.target.closest('.c:not(.x)')) location.href = WEEKS_URL;   // any other week: open /weeks
  });
})();

/* YZY mark: the string is a palindrome, so the two Ys trade places (one over the Z, one under) and land identical. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.yzy').forEach(function (m) {
    var a = m.querySelector('.y1'), b = m.querySelector('.y2');
    if (!a || !b) return;
    function measure() { m.style.setProperty('--d', (b.offsetLeft - a.offsetLeft) + 'px'); }
    function play() {
      if (reduce || m.classList.contains('swap')) return;
      measure();
      m.classList.add('swap');
      b.addEventListener('animationend', function done() { m.classList.remove('swap'); b.removeEventListener('animationend', done); });
    }
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); setTimeout(play, 500); });
    else setTimeout(play, 800);
    m.addEventListener('mouseenter', play);
    m.addEventListener('focus', play);
  });
})();


/* ===== Blog post extras (only act on pages that have .post-content) ===== */
(function () {
  var pc = document.querySelector('.post-content');
  if (!pc) return;

  /* Pull-quote style for paragraphs that are a single <strong> */
  pc.querySelectorAll('p').forEach(function (p) {
    var s = p.querySelector(':scope > strong');
    if (s && p.children.length === 1 && p.textContent.trim() === s.textContent.trim() && !/[:：]$/.test(s.textContent.trim())) p.classList.add('aphorism');
  });

  /* Reading time: 200 words per minute over the article text */
  var rt = document.querySelector('[data-reading]');
  if (rt) {
    var words = (pc.textContent || '').trim().split(/\s+/).length;
    rt.textContent = Math.max(1, Math.ceil(words / 200)) + ' min';
  }

  /* Hide the dash fallback once the live view count arrives */
  var facts = document.querySelector('.facts');
  if (facts) new MutationObserver(function () {
    var b = facts.querySelector('[data-gc-path]');
    if (b && !b.hidden) { var f = facts.querySelector('.gc-fallback'); if (f) f.remove(); }
  }).observe(facts, { attributes: true, subtree: true });

  /* Giscus comments (repo yizhouyu/blog-comments, mapped by pathname) */
  function pageTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t !== 'dark' && t !== 'light') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return t;
  }
  function syncGiscus() {
    var f = document.querySelector('iframe.giscus-frame');
    if (f && f.contentWindow) f.contentWindow.postMessage({ giscus: { setConfig: { theme: pageTheme() } } }, 'https://giscus.app');
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.addEventListener('click', syncGiscus); });
  var box = document.querySelector('[data-giscus]');
  if (box) {
    var g = document.createElement('script');
    g.src = 'https://giscus.app/client.js';
    [['repo', 'yizhouyu/blog-comments'], ['repo-id', 'R_kgDOQGKylA'], ['category', 'Announcements'],
     ['category-id', 'DIC_kwDOQGKylM4Cw4bj'], ['mapping', 'pathname'], ['strict', '0'],
     ['reactions-enabled', '1'], ['emit-metadata', '0'], ['input-position', 'bottom'],
     ['theme', pageTheme()], ['lang', 'en']].forEach(function (kv) { g.setAttribute('data-' + kv[0], kv[1]); });
    g.setAttribute('crossorigin', 'anonymous');
    g.async = true;
    box.appendChild(g);
  }
})();
