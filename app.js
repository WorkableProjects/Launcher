(function () {
  'use strict';

  var C = window.LAUNCHER_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------- Themes ---------- */
  var THEME_COLORS = { light: '#ffffff', dark: '#000000', cyan: '#5ce1e6', pink: '#ff009d' };
  var SLOTS = [
    { from: 6, to: 12, theme: 'light', label: 'Morning · Light' },
    { from: 12, to: 17, theme: 'cyan', label: 'Afternoon · Cyan' },
    { from: 17, to: 20, theme: 'pink', label: 'Evening · Pink' },
    { from: 20, to: 30, theme: 'dark', label: 'Night · Dark' },
  ];
  function slotNow() {
    var h = new Date().getHours();
    if (h < 6) h += 24;
    for (var i = 0; i < SLOTS.length; i++) if (h >= SLOTS[i].from && h < SLOTS[i].to) return SLOTS[i];
    return SLOTS[3];
  }
  function mode() { return store.get('iw.theme') || 'auto'; }

  function applyTheme() {
    var m = mode();
    var slot = slotNow();
    var t = m === 'auto' ? slot.theme : m;
    var root = document.documentElement;
    root.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]').content = THEME_COLORS[t];
    var logo = 'assets/logo-' + t + '.png';
    $('mark').src = logo;
    $('signin-mark').src = logo;
    $('favicon').href = logo;
    $('themeNote').textContent = m === 'auto' ? 'Auto — ' + slot.label : '';
    var btns = document.querySelectorAll('#themes button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-checked', String(btns[i].dataset.mode === m));
    }
  }

  $('themes').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    store.set('iw.theme', b.dataset.mode);
    applyTheme();
  });
  // Arrow-key navigation within the segmented control.
  $('themes').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var btns = Array.prototype.slice.call(this.querySelectorAll('button'));
    var i = btns.indexOf(document.activeElement);
    var n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
    n.focus(); n.click();
  });
  setInterval(function () { if (mode() === 'auto') applyTheme(); }, 60000);

  /* ---------- Session ---------- */
  function user() { return store.get('iw.name'); }

  function show() {
    var signed = !!user();
    $('signin').hidden = signed;
    $('launcher').hidden = !signed;
    $('signout').hidden = !signed;
    if (signed) {
      var h = new Date().getHours();
      var part = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
      $('greeting').textContent = part + ', ' + user();
      load();
    } else {
      setTimeout(function () { $('name').focus(); }, 50);
    }
  }

  $('signin-form').addEventListener('submit', function (e) {
    e.preventDefault();
    store.set('iw.name', $('name').value.trim());
    var tok = $('token').value.trim();
    store.set('iw.token', tok || null);
    show();
  });
  $('signout').addEventListener('click', function () {
    store.set('iw.name', null);
    store.set('iw.token', null);
    store.set('iw.cache', null);
    $('grid').innerHTML = '';
    show();
  });

  /* ---------- Repos ---------- */
  var norm = function (s) { return String(s).toLowerCase().replace(/[\s_\-.]/g, ''); };
  var NO_LINK = C.noLink.map(norm);

  function linkFor(r) {
    var key = norm(r.name);
    if (NO_LINK.indexOf(key) !== -1) return null;
    if (key === norm(C.launcherRepo) && !C.launcherLaunched) return null;
    if (C.links[r.name]) return C.links[r.name];
    if (r.homepage && /^https?:\/\//.test(r.homepage)) return r.homepage;
    if (r.has_pages) {
      var owner = r.owner.login.toLowerCase();
      return r.name.toLowerCase() === owner + '.github.io'
        ? 'https://' + owner + '.github.io/'
        : 'https://' + owner + '.github.io/' + r.name + '/';
    }
    return r.html_url;
  }

  function prettyName(n) {
    return n.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function fetchAll() {
    var headers = { Accept: 'application/vnd.github+json' };
    var tok = store.get('iw.token');
    if (tok) headers.Authorization = 'Bearer ' + tok;
    var all = [];
    function page(p) {
      return fetch('https://api.github.com/orgs/' + C.org + '/repos?type=public&sort=updated&per_page=100&page=' + p, { headers: headers })
        .then(function (res) {
          if (!res.ok) {
            var err = new Error(res.status === 403 || res.status === 429 ? 'rate' : 'http ' + res.status);
            throw err;
          }
          return res.json();
        })
        .then(function (list) {
          all = all.concat(list);
          return list.length === 100 ? page(p + 1) : all;
        });
    }
    return page(1);
  }

  var repos = [];

  function load() {
    var cached = store.get('iw.cache');
    if (cached) {
      try { repos = JSON.parse(cached).repos; render(); } catch (e) {}
    }
    if (!repos.length) skeleton();
    status('');
    fetchAll().then(function (list) {
      repos = list
        .filter(function (r) { return !r.private && !(C.hideForks && r.fork) && !(C.hideArchived && r.archived); })
        .map(function (r) {
          return {
            name: r.name,
            title: prettyName(r.name),
            desc: r.description || '',
            lang: r.language || '',
            updated: r.pushed_at,
            repo: r.html_url,
            link: linkFor(r),
          };
        });
      store.set('iw.cache', JSON.stringify({ at: Date.now(), repos: repos }));
      render();
    }).catch(function (e) {
      if (repos.length) {
        status('Showing saved list — couldn’t refresh from GitHub.');
      } else {
        $('grid').innerHTML = '';
        status(e.message === 'rate'
          ? 'GitHub’s hourly limit was reached. Try again later, or sign out and add a token.'
          : 'Couldn’t reach GitHub. Check your connection and reload.', true);
      }
    });
  }

  function status(msg, isErr) {
    var s = $('status');
    s.textContent = msg;
    s.className = 'status' + (isErr ? ' err' : '');
  }

  function skeleton() {
    var g = $('grid');
    g.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      var d = document.createElement('div');
      d.className = 'tile skel';
      g.appendChild(d);
    }
  }

  function initials(t) {
    var w = t.split(' ').filter(Boolean);
    return (w.length > 1 ? w[0][0] + w[1][0] : t.slice(0, 2)).toUpperCase();
  }

  function rel(iso) {
    var d = (Date.now() - new Date(iso)) / 864e5;
    if (d < 1) return 'today';
    if (d < 2) return 'yesterday';
    if (d < 30) return Math.floor(d) + ' days ago';
    if (d < 365) return Math.floor(d / 30) + ' mo ago';
    return Math.floor(d / 365) + ' yr ago';
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render() {
    var q = norm($('q').value);
    var match = function (r) { return !q || norm(r.name + r.desc).indexOf(q) !== -1; };
    var linked = repos.filter(function (r) { return r.link && match(r); });
    var unlinked = repos.filter(function (r) { return !r.link && match(r); });

    var g = $('grid');
    g.innerHTML = '';
    linked.forEach(function (r) {
      var a = el('a', 'tile');
      a.href = r.link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', r.title + (r.desc ? ' — ' + r.desc : ''));
      var top = el('div', 'tile-top');
      top.appendChild(el('span', 'glyph', initials(r.title)));
      var arrow = el('span', 'arrow');
      arrow.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
      top.appendChild(arrow);
      a.appendChild(top);
      a.appendChild(el('h3', 'tile-title', r.title));
      a.appendChild(el('p', 'tile-desc', r.desc || 'No description yet.'));
      var meta = el('div', 'tile-meta');
      if (r.lang) meta.appendChild(el('span', 'chip', r.lang));
      meta.appendChild(el('span', null, 'Updated ' + rel(r.updated)));
      a.appendChild(meta);
      g.appendChild(a);
    });

    if (!linked.length) status(q ? 'No apps match “' + $('q').value + '”.' : 'No launchable apps yet.');
    else if (!/couldn/.test($('status').textContent)) status('');

    $('title').textContent = linked.length + (linked.length === 1 ? ' app' : ' apps');

    var ul = $('unlinked');
    ul.innerHTML = '';
    unlinked.forEach(function (r) {
      var li = el('li');
      var a = el('a', null, r.title);
      a.href = r.repo; a.target = '_blank'; a.rel = 'noopener';
      li.appendChild(a);
      li.appendChild(el('span', 'muted', r.desc));
      ul.appendChild(li);
    });
    $('unlinked-wrap').hidden = !unlinked.length;
  }

  $('q').addEventListener('input', render);
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && !$('launcher').hidden) {
      e.preventDefault(); $('q').focus();
    }
    if (e.key === 'Escape' && document.activeElement === $('q')) { $('q').value = ''; render(); $('q').blur(); }
  });

  applyTheme();
  show();
})();
