/* Ember & Oak — digital menu app (vanilla JS, offline) */
(function () {
  'use strict';

  var D = window.MENU_DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var HOSTED_URL = 'https://websites-preview.netlify.app/digital-menu/index.html';
  var MAX_TABLE = 40;
  var FILTERS = [
    { id: 'vegan', color: '#7fbf6a' }, { id: 'veg', color: '#a6dc92' },
    { id: 'spicy', color: '#ff7a59' }, { id: 'gf', color: '#f0cf8e' }
  ];

  var store = {
    get: function (k, fb) { try { var v = localStorage.getItem('eo-' + k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } },
    set: function (k, v) { try { localStorage.setItem('eo-' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  var itemsById = {};
  D.items.forEach(function (it) { itemsById[it.id] = it; });

  var params = new URLSearchParams(location.search);
  var state = {
    lang: pickLang(),
    table: validTable(params.get('table')) || validTable(store.get('table', null)),
    order: sanitizeOrder(store.get('order', {})),
    note: store.get('note', ''),
    filters: [],
    query: '',
    sent: store.get('lastSent', null),
    sending: false,
    pendingSend: false,
    detail: null
  };
  if (validTable(params.get('table'))) store.set('table', state.table);

  function pickLang() {
    var q = params.get('lang');
    if (q && D.i18n[q]) return q;
    var saved = store.get('lang', null);
    if (saved && D.i18n[saved]) return saved;
    return 'en';
  }
  function validTable(v) { var n = parseInt(v, 10); return n >= 1 && n <= MAX_TABLE && String(n) === String(v).trim() ? n : null; }
  function sanitizeOrder(o) {
    var out = {};
    if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { var q = parseInt(o[k], 10); if (itemsById[k] && q > 0) out[k] = Math.min(q, 20); });
    return out;
  }

  // ---------- i18n helpers ----------
  function t(key, vars) {
    var s = (D.i18n[state.lang] && D.i18n[state.lang][key]) || D.i18n.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function L(obj) { return obj[state.lang] || obj.en; }
  // Plural-aware strings: looks up key_one / key_two / key_few / key_many / key_other for the current language.
  function tp(key, n) {
    var form = 'other';
    try { form = new Intl.PluralRules(LOCALES[state.lang]).select(n); } catch (e) { form = n === 1 ? 'one' : 'other'; }
    var dict = D.i18n[state.lang] || {};
    var k = dict[key + '_' + form] != null ? key + '_' + form : dict[key + '_other'] != null ? key + '_other' : (n === 1 && D.i18n.en[key + '_one'] != null ? key + '_one' : key + '_other');
    return t(k, { n: n });
  }
  var LOCALES = { en: 'en-IE', fr: 'fr-FR', ar: 'ar-u-nu-latn' };
  function money(v) {
    var whole = Math.round(v * 100) % 100 === 0;
    return new Intl.NumberFormat(LOCALES[state.lang], { style: 'currency', currency: 'EUR', minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(v);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""); } // strip accents and Arabic harakat

  function applyStatic() {
    var html = document.documentElement;
    html.lang = state.lang;
    html.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
    $$('[data-i18n-label]').forEach(function (el) { var s = t(el.getAttribute('data-i18n-label')); el.setAttribute('aria-label', s); if (el.tagName === 'BUTTON') el.title = s; });
    $$('.lang-switch').forEach(function (g) { g.setAttribute('aria-label', t('language')); });
    $('#moreSheet').setAttribute('aria-label', t('more'));
    $('#backLink').title = t('allProjects');
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === state.lang)); });
    document.title = 'Ember & Oak — ' + (state.lang === 'fr' ? 'Carte digitale' : state.lang === 'ar' ? 'القائمة الرقمية' : 'Digital Menu');
    updateOpenStatus();
    updateTableChip();
  }

  function updateOpenStatus() {
    var h = new Date().getHours();
    var open = h >= 12 && h < 23;
    $('#openStatus').textContent = open ? t('openNow') : t('closed');
    $('#statusDot').classList.toggle('closed', !open);
  }

  // ---------- Filters & nav ----------
  function renderFilters() {
    $('#filters').innerHTML = FILTERS.map(function (f) {
      var on = state.filters.indexOf(f.id) > -1;
      return '<button type="button" class="filter" data-filter="' + f.id + '" aria-pressed="' + on + '"><span class="dot" style="background:' + f.color + '" aria-hidden="true"></span>' + esc(t('f_' + f.id)) + '</button>';
    }).join('');
  }

  function matches(it) {
    for (var i = 0; i < state.filters.length; i++) if (it.flags.indexOf(state.filters[i]) < 0) return false;
    if (!state.query) return true;
    var cat = D.categories.filter(function (c) { return c.id === it.cat; })[0];
    // search every language at once, so "poulet", "chicken" and "دجاج" all find the same dish
    var vals = function (o) { return Object.keys(o).map(function (k) { return o[k]; }); };
    var hay = norm(vals(it.name).concat(vals(it.desc), vals(cat.name)).join(' '));
    return state.query.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
  }

  // ---------- Menu rendering ----------
  function tagsHTML(it, withDiet) {
    var out = '';
    if (it.tag) out += '<span class="tag tag-' + it.tag + '">' + esc(t('t_' + it.tag)) + '</span>';
    if (it.forTwo) out += '<span class="tag tag-special">' + esc(t('forTwo')) + '</span>';
    if (withDiet) {
      ['vegan', 'spicy', 'gf'].forEach(function (f) {
        if (it.flags.indexOf(f) > -1) out += '<span class="tag tag-diet tag-' + f + '">' + esc(t('f_' + f)) + '</span>';
      });
      if (it.flags.indexOf('veg') > -1 && it.flags.indexOf('vegan') < 0) out += '<span class="tag tag-diet tag-veg">' + esc(t('f_veg')) + '</span>';
    }
    return out;
  }
  var CHILI = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M14 6c3 0 6 2 6 5 0 5-6 9-13 9-2 0-3-1-3-2 5 0 9-3 10-8M14 6c0-2 1-3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function dietIcons(it) {
    var out = '';
    if (it.flags.indexOf('vegan') > -1) out += '<span class="di di-vegan" role="img" aria-label="' + esc(t('f_vegan')) + '" title="' + esc(t('f_vegan')) + '">VG</span>';
    else if (it.flags.indexOf('veg') > -1) out += '<span class="di di-veg" role="img" aria-label="' + esc(t('f_veg')) + '" title="' + esc(t('f_veg')) + '">V</span>';
    if (it.flags.indexOf('gf') > -1) out += '<span class="di di-gf" role="img" aria-label="' + esc(t('f_gf')) + '" title="' + esc(t('f_gf')) + '">GF</span>';
    if (it.flags.indexOf('spicy') > -1) out += '<span class="di di-spicy" role="img" aria-label="' + esc(t('f_spicy')) + '" title="' + esc(t('f_spicy')) + '">' + CHILI + '</span>';
    return out ? '<span class="diet-icons">' + out + '</span>' : '';
  }
  function badge(id) { var q = state.order[id]; return q ? '<span class="qty-badge" aria-hidden="true">' + q + '</span>' : ''; }

  function cardHTML(it, idx) {
    var name = L(it.name);
    return '<article class="card" data-item="' + it.id + '">' +
      '<button type="button" class="card-open" data-open="' + it.id + '" aria-label="' + esc(name) + '"></button>' +
      '<div class="card-media"><img src="assets/img/' + it.img + '.webp" alt="' + esc(name) + '" width="640" height="480"' + (idx > 3 ? ' loading="lazy"' : '') + ' decoding="async"></div>' +
      '<div class="card-body"><div class="card-tags">' + tagsHTML(it, true) + '</div>' +
      '<h3>' + esc(name) + '</h3><p>' + esc(L(it.desc)) + '</p>' +
      '<div class="card-foot"><span class="price-wrap"><span class="price">' + money(it.price) + '</span>' + dietIcons(it) + '</span>' +
      '<button type="button" class="add-btn" data-add="' + it.id + '" aria-label="' + esc(t('addNamed', { name: name })) + '"><span class="plus" aria-hidden="true">+</span><span>' + esc(t('add')) + '</span></button></div></div>' +
      badge(it.id) + '</article>';
  }
  function drinkHTML(it) {
    var name = L(it.name);
    return '<li class="drink" data-item="' + it.id + '">' +
      '<button type="button" class="card-open" data-open="' + it.id + '" aria-label="' + esc(name) + '"></button>' +
      '<div class="drink-name-row"><h3>' + esc(name) + badge(it.id) + '</h3><span class="leader" aria-hidden="true"></span><span class="price">' + money(it.price) + '</span></div>' +
      '<p>' + esc(L(it.desc)) + '</p>' +
      '<button type="button" class="add-btn" data-add="' + it.id + '" aria-label="' + esc(t('addNamed', { name: name })) + '"><span class="plus" aria-hidden="true">+</span></button></li>';
  }

  var sectionEls = [];
  function renderMenu() {
    var html = '', total = 0, idx = 0, filtering = !!(state.query || state.filters.length), navHTML = '';
    D.categories.forEach(function (c) {
      var list = D.items.filter(function (it) { return it.cat === c.id && matches(it); });
      if (!list.length) return;
      total += list.length;
      var title = L(c.name);
      navHTML += '<a href="#' + c.id + '" data-nav="' + c.id + '">' + esc(title) + (filtering ? '<span class="count">' + list.length + '</span>' : '') + '</a>';
      html += '<section class="menu-section" id="' + c.id + '" aria-labelledby="h-' + c.id + '">' +
        '<div class="section-head"><h2 id="h-' + c.id + '">' + esc(title) + '</h2><span class="count">' + list.length + '</span></div>';
      if (c.kind === 'cards') {
        html += '<div class="cards">' + list.map(function (it) { return cardHTML(it, idx++); }).join('') + '</div>';
      } else {
        html += '<div class="drink-panel"><div class="drink-banner"><img src="assets/img/' + c.img + '.webp" alt="" width="800" height="450" loading="lazy" decoding="async"><p>' + esc(L(c.blurb)) + '</p></div>' +
          '<ul class="drinks">' + list.map(drinkHTML).join('') + '</ul></div>';
      }
      html += '</section>';
      if (c.id === 'grill' && !filtering) {
        html += '<aside class="happy" aria-labelledby="hhTitle"><img src="assets/img/happy-hour.webp" alt="" width="800" height="500" loading="lazy" decoding="async">' +
          '<div class="happy-body"><span class="happy-kicker">' + esc(t('hhTime')) + '</span><h2 id="hhTitle">' + esc(t('hhTitle')) + '</h2><p>' + esc(t('hhBody')) + '</p></div></aside>';
      }
    });
    $('#menu').innerHTML = html;
    $('#catnav').innerHTML = navHTML;
    $('#emptyState').hidden = total > 0;
    $('#resultNote').textContent = filtering ? tp('results', total) : '';
    setupSpy();
  }

  // ---------- Scrollspy ----------
  var spyTicking = false;
  function computeSpy() {
    spyTicking = false;
    if (!sectionEls.length) return;
    var line = $('#topbar').offsetHeight + Math.min(160, window.innerHeight * 0.25);
    var active = sectionEls[0].id;
    for (var i = 0; i < sectionEls.length; i++) {
      if (sectionEls[i].getBoundingClientRect().top <= line) active = sectionEls[i].id; else break;
    }
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 4) active = sectionEls[sectionEls.length - 1].id;
    setActiveNav(active);
  }
  window.addEventListener('scroll', function () { if (!spyTicking) { spyTicking = true; requestAnimationFrame(computeSpy); } }, { passive: true });
  function setupSpy() {
    sectionEls = $$('.menu-section');
    currentNav = null;
    if (sectionEls.length) { setActiveNav(sectionEls[0].id, true); computeSpy(); }
  }
  var currentNav = null;
  function setActiveNav(id, silent) {
    if (currentNav === id && !silent) return;
    currentNav = id;
    var track = $('#catnav');
    $$('a', track).forEach(function (a) { if (a.getAttribute('data-nav') === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    var chip = $('a[data-nav="' + id + '"]', track);
    if (chip && !silent) {
      var tr = track.getBoundingClientRect(), cr = chip.getBoundingClientRect();
      var delta = cr.left - tr.left - (tr.width - cr.width) / 2;
      track.scrollBy({ left: delta, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
  }
  function reduceMotion() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // ---------- Order ----------
  function orderCount() { var n = 0; for (var k in state.order) n += state.order[k]; return n; }
  function orderTotal() { var s = 0; for (var k in state.order) s += itemsById[k].price * state.order[k]; return s; }
  function saveOrder() { store.set('order', state.order); store.set('note', state.note); }

  function setQty(id, q) {
    q = Math.max(0, Math.min(20, q));
    if (q) state.order[id] = q; else delete state.order[id];
    if (state.sent && q) { state.sent = null; store.set('lastSent', null); }
    saveOrder();
    refreshBadges(id);
    renderOrder();
  }
  function addItem(id, n) {
    setQty(id, (state.order[id] || 0) + (n || 1));
    toast(t('added', { name: L(itemsById[id].name) }));
    var bar = $('#orderBarCount'); bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump');
  }
  function refreshBadges(id) {
    $$('[data-item="' + id + '"]').forEach(function (el) {
      var old = $('.qty-badge', el); if (old) old.remove();
      var q = state.order[id];
      if (!q) return;
      var host = el.classList.contains('drink') ? $('h3', el) : el;
      host.insertAdjacentHTML('beforeend', '<span class="qty-badge" aria-hidden="true">' + q + '</span>');
    });
  }

  var ICON_PLATE = '<svg viewBox="0 0 64 64" width="52" height="52" aria-hidden="true"><circle cx="32" cy="34" r="20" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="32" cy="34" r="12" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".6"/><path d="M8 14v12m-3-12v8a3 3 0 0 0 6 0v-8M56 14c-4 2-5 8-5 12h5V14z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function orderHTML(isSheet) {
    var idAttr = isSheet ? 'orderSheetTitle' : 'orderAsideTitle';
    var tableBtn = '<button type="button" class="chip-btn' + (state.table ? ' is-set' : '') + '" data-action="table">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9h16M6 9v10M18 9v10M3 6h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      esc(state.table ? t('table') + ' ' + state.table : t('chooseTable')) + '</button>';

    if (state.sent) {
      var s = state.sent;
      return '<div class="order-success" aria-live="polite">' +
        '<div class="success-ring"><svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<h2 id="' + idAttr + '">' + esc(t('sentTitle')) + '</h2>' +
        '<p>' + esc(t('sentBody', { code: s.code, table: s.table, mins: s.mins })) + '</p>' +
        '<ul>' + s.items.map(function (li) { var it = itemsById[li.id]; return it ? '<li><span>' + (parseInt(li.qty, 10) || 0) + ' × ' + esc(L(it.name)) + '</span><span>' + money(it.price * li.qty) + '</span></li>' : ''; }).join('') +
        '<li><strong>' + esc(t('subtotal')) + '</strong><strong>' + money(s.total) + '</strong></li></ul>' +
        '<button type="button" class="btn btn-ghost btn-block" data-action="new">' + esc(t('newOrder')) + '</button></div>';
    }

    var ids = Object.keys(state.order);
    var head = '<div class="order-head"><h2 id="' + idAttr + '">' + esc(t('yourOrder')) + '</h2>' + tableBtn + '</div>';
    if (!ids.length) return head + '<div class="order-empty">' + ICON_PLATE + '<p>' + esc(t('emptyOrder')) + '</p></div>';

    var n = orderCount();
    return head +
      '<ul class="order-list">' + ids.map(function (id) {
        var it = itemsById[id], q = state.order[id], name = L(it.name);
        return '<li class="order-item"><div><div class="order-item-name">' + esc(name) + '</div><div class="order-item-unit">' + money(it.price) + '</div></div>' +
          '<div class="order-item-total">' + money(it.price * q) + '</div>' +
          '<div class="stepper" role="group" aria-label="' + esc(t('quantity') + ': ' + name) + '">' +
          '<button type="button" data-dec="' + id + '" aria-label="' + esc(q === 1 ? t('remove') + ' ' + name : t('decrease')) + '">' + (q === 1 ? '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2m-7 0 1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' : '−') + '</button>' +
          '<output aria-live="polite">' + q + '</output>' +
          '<button type="button" data-inc="' + id + '" aria-label="' + esc(t('increase')) + '">+</button></div></li>';
      }).join('') + '</ul>' +
      '<label class="order-note"><span>' + esc(t('kitchenNote')) + '</span><textarea data-note maxlength="240">' + esc(state.note) + '</textarea></label>' +
      '<div class="order-total"><span>' + esc(t('subtotal')) + ' · ' + esc(tp('itemsCount', n)) + '</span><strong>' + money(orderTotal()) + '</strong></div>' +
      '<p class="order-sub">' + esc(t('serviceNote')) + '</p>' +
      '<p class="order-msg" data-order-msg hidden></p>' +
      '<button type="button" class="btn btn-primary btn-block" data-action="send"' + (state.sending ? ' disabled' : '') + '>' + esc(state.sending ? t('sending') : t('send')) + '</button>';
  }

  function renderOrder() {
    var focusedNote = document.activeElement && document.activeElement.hasAttribute && document.activeElement.hasAttribute('data-note');
    $$('[data-order-root]').forEach(function (root) {
      var isSheet = !!root.closest('dialog');
      if (focusedNote && root.contains(document.activeElement)) return; // don't clobber typing
      root.innerHTML = orderHTML(isSheet);
    });
    var n = orderCount();
    var bar = $('#orderBar');
    var show = n > 0 && !state.sent;
    bar.hidden = !show;
    document.body.classList.toggle('has-bar', show || !!state.sent);
    if (state.sent && !show) {
      bar.hidden = false;
      $('#orderBarCount').innerHTML = '&#10003;';
      $('#orderBarTotal').textContent = state.sent.code;
      $('.order-bar-label').textContent = t('sentTitle');
    } else {
      $('#orderBarCount').textContent = n;
      $('#orderBarTotal').textContent = money(orderTotal());
      $('.order-bar-label').textContent = t('viewOrder');
    }
  }

  function sendOrder() {
    if (!orderCount() || state.sending) return;
    if (!state.table) {
      state.pendingSend = true;
      $$('[data-order-msg]').forEach(function (m) { m.hidden = false; m.textContent = t('needTable'); });
      openTable(t('needTable'));
      return;
    }
    state.sending = true; renderOrder();
    setTimeout(function () {
      var items = Object.keys(state.order).map(function (id) { return { id: id, qty: state.order[id] }; });
      var maxTime = items.reduce(function (m, li) { return Math.max(m, itemsById[li.id].time || 5); }, 5);
      var sent = {
        code: 'EO-' + String(Math.floor(1000 + Math.random() * 9000)),
        table: state.table, items: items, total: orderTotal(), note: state.note,
        mins: maxTime + 5, at: new Date().toISOString()
      };
      var history = store.get('orders', []);
      if (!Array.isArray(history)) history = [];
      history.push(sent); store.set('orders', history.slice(-20));
      state.sent = sent; store.set('lastSent', sent);
      state.order = {}; state.note = ''; state.sending = false;
      saveOrder();
      renderMenu();
      renderOrder();
      var focusTarget = $('#orderSheet').open ? $('#orderSheet .order-success h2') : $('#orderAside .order-success h2');
      if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus(); }
    }, 900);
  }

  // ---------- Detail sheet ----------
  function openDetail(id) {
    var it = itemsById[id]; if (!it) return;
    var qty = 1, name = L(it.name);
    state.detail = id;
    var dlg = $('#detailSheet'), body = $('#detailBody');
    dlg.classList.toggle('no-media', !it.img);
    body.classList.toggle('has-media', !!it.img);
    var allergens = it.allergens.length ? it.allergens.map(function (a) { return t('a_' + a); }).join(', ') : t('noAllergens');
    var tags = tagsHTML(it, true);
    body.innerHTML = (it.img ? '<div class="detail-media"><img src="assets/img/' + it.img + '.webp" alt="' + esc(name) + '" width="640" height="480"></div>' : '') +
      '<div class="detail-content">' +
      (tags ? '<div class="card-tags" style="position:static">' + tags + '</div>' : '') +
      '<h2 id="detailName">' + esc(name) + '</h2><div class="detail-price">' + money(it.price) + '</div>' +
      '<p class="detail-desc">' + esc(L(it.desc)) + '</p>' +
      '<dl class="detail-facts">' +
      (it.time ? '<div class="fact"><dt>' + esc(t('prep')) + '</dt><dd>' + esc(t('minutes', { n: it.time })) + '</dd></div>' : '') +
      '<div class="fact"' + (it.time ? '' : ' style="grid-column:1/-1"') + '><dt>' + esc(t('allergens')) + '</dt><dd>' + esc(allergens) + '</dd></div>' +
      (it.alcohol ? '<div class="fact" style="grid-column:1/-1"><dt>' + esc(t('description')) + '</dt><dd>' + esc(t('alcohol')) + ' · 18+</dd></div>' : '') +
      '</dl>' +
      '<div class="detail-actions"><div class="stepper lg" role="group" aria-label="' + esc(t('quantity')) + '"><button type="button" data-dq="-1" aria-label="' + esc(t('decrease')) + '">−</button><output id="detailQty" aria-live="polite">1</output><button type="button" data-dq="1" aria-label="' + esc(t('increase')) + '">+</button></div>' +
      '<button type="button" class="btn btn-primary" id="detailAdd"></button></div></div>';
    function upd() { $('#detailQty').textContent = qty; $('#detailAdd').textContent = t('addToOrder') + ' · ' + money(it.price * qty); }
    upd();
    $$('[data-dq]', body).forEach(function (b) { b.addEventListener('click', function () { qty = Math.max(1, Math.min(20, qty + parseInt(b.getAttribute('data-dq'), 10))); upd(); }); });
    $('#detailAdd').addEventListener('click', function () { addItem(id, qty); dlg.close(); });
    openDialog(dlg);
  }

  // ---------- Table picker ----------
  function openTable(msg) {
    var grid = $('#tableGrid'), html = '';
    for (var i = 1; i <= 20; i++) html += '<button type="button" data-pick="' + i + '" aria-pressed="' + (state.table === i) + '">' + i + '</button>';
    grid.innerHTML = html;
    var input = $('#tableInput');
    input.value = state.table || '';
    input.removeAttribute('aria-invalid');
    $('#tableError').textContent = msg || '';
    openDialog($('#tableSheet'));
  }
  function setTable(n) {
    state.table = n; store.set('table', n);
    updateTableChip(); renderOrder();
    toast(t('tableSet', { n: n }));
    try { var u = new URL(location.href); u.searchParams.set('table', n); history.replaceState(null, '', u); } catch (e) { /* ignore */ }
  }
  function updateTableChip() {
    $('#tableChipLabel').textContent = state.table ? t('table') + ' ' + state.table : t('chooseTable');
    $('#tableChip').classList.toggle('is-set', !!state.table);
  }

  // ---------- QR ----------
  function qrUrl(n) {
    var base = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : HOSTED_URL;
    return base + '?table=' + n;
  }
  function renderQR(n) {
    var url = qrUrl(n);
    $('#qrTableNum').textContent = n;
    $('#qrUrl').textContent = url;
    $('#qrCode').innerHTML = window.QR.toSVG(url, { level: 'M', dark: '#1d130b', light: '#fffaf2' });
    $('#qrCode').setAttribute('aria-label', 'QR code: ' + url);
  }
  function openQR() {
    var n = state.table || 1;
    $('#qrTableInput').value = n;
    renderQR(n);
    openDialog($('#qrSheet'));
  }

  // ---------- Dialog helpers ----------
  function openDialog(d) {
    $$('dialog[open]').forEach(function (o) { if (o !== d) o.close(); });
    if (!d.open) d.showModal();
    if (d.id === 'moreSheet') $('#menuBtn').setAttribute('aria-expanded', 'true');
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target !== d) return;
      var r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    });
    d.addEventListener('close', function () {
      if (d.id === 'moreSheet') $('#menuBtn').setAttribute('aria-expanded', 'false');
      if (d.id === 'tableSheet') state.pendingSend = false;
    });
  });

  // ---------- Toast ----------
  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  // ---------- Events ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('button, a');
    if (!el) return;
    var v;
    if ((v = el.getAttribute('data-add'))) { addItem(v); return; }
    if ((v = el.getAttribute('data-open'))) { openDetail(v); return; }
    if ((v = el.getAttribute('data-inc'))) { setQty(v, state.order[v] + 1); refocus('[data-inc="' + v + '"]', el); return; }
    if ((v = el.getAttribute('data-dec'))) { setQty(v, state.order[v] - 1); refocus('[data-dec="' + v + '"]', el); return; }
    if ((v = el.getAttribute('data-filter'))) {
      var i = state.filters.indexOf(v);
      if (i > -1) state.filters.splice(i, 1); else state.filters.push(v);
      renderFilters(); renderMenu();
      var b = $('[data-filter="' + v + '"]'); if (b) b.focus();
      return;
    }
    if ((v = el.getAttribute('data-lang'))) { setLang(v); return; }
    if ((v = el.getAttribute('data-pick'))) { $('#tableInput').value = v; $$('#tableGrid button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === el)); }); return; }
    if (el.hasAttribute('data-close')) { el.closest('dialog').close(); return; }
    v = el.getAttribute('data-action');
    if (v === 'send') sendOrder();
    else if (v === 'table') openTable();
    else if (v === 'new') { state.sent = null; store.set('lastSent', null); renderOrder(); }
  });
  function refocus(sel, fallbackEl) {
    var root = fallbackEl.closest('[data-order-root]');
    var again = root && $(sel, root);
    if (again) again.focus();
    else if (root) { var h = $('h2', root); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } }
  }
  document.addEventListener('input', function (e) {
    if (e.target.hasAttribute('data-note')) { state.note = e.target.value; saveOrder(); }
  });

  var searchTimer;
  $('#search').addEventListener('input', function (e) {
    $('#searchClear').hidden = !e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { state.query = norm(e.target.value.trim()); renderMenu(); }, 120);
  });
  $('#searchClear').addEventListener('click', function () { var s = $('#search'); s.value = ''; this.hidden = true; state.query = ''; renderMenu(); s.focus(); });
  $('#resetFilters').addEventListener('click', function () {
    $('#search').value = ''; $('#searchClear').hidden = true; state.query = ''; state.filters = [];
    renderFilters(); renderMenu(); $('#search').focus();
  });

  $('#tableChip').addEventListener('click', function () { openTable(); });
  $('#qrBtn').addEventListener('click', openQR);
  $('#menuBtn').addEventListener('click', function () { openDialog($('#moreSheet')); });
  $('#moreTable').addEventListener('click', function () { openTable(); });
  $('#moreQr').addEventListener('click', openQR);
  $('#orderBarBtn').addEventListener('click', function () { renderOrder(); openDialog($('#orderSheet')); });
  $('#printQr').addEventListener('click', function () { window.print(); });
  $('#qrTableInput').addEventListener('input', function () { var n = validTable(this.value); if (n) renderQR(n); });

  $('#tableForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#tableInput'), n = validTable(input.value);
    if (!n) {
      input.setAttribute('aria-invalid', 'true');
      $('#tableError').textContent = t('tableInvalid');
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    var resume = state.pendingSend;
    setTable(n);
    $('#tableSheet').close();
    if (resume) {
      if (window.innerWidth < 1100) openDialog($('#orderSheet'));
      sendOrder();
    }
  });

  function setLang(l) {
    if (!D.i18n[l] || l === state.lang) return;
    state.lang = l; store.set('lang', l);
    applyStatic(); renderFilters(); renderMenu(); renderOrder();
    if ($('#qrSheet').open) renderQR(parseInt($('#qrTableNum').textContent, 10) || 1);
    if ($('#detailSheet').open && state.detail) openDetail(state.detail);
  }

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1100 && $('#orderSheet').open) $('#orderSheet').close();
  });

  var back = $('#backLink');
  function onScroll() { back.classList.toggle('compact', window.scrollY > 320); }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- Init ----------
  applyStatic();
  renderFilters();
  renderMenu();
  renderOrder();
  if (validTable(params.get('table'))) setTimeout(function () { toast(t('tableSet', { n: state.table })); }, 400);
  setInterval(updateOpenStatus, 60000);
})();

/* "All projects" link: on phones it moves into the page footer so it never sits on top of content */
(function () {
  var link = document.querySelector('.back-link');
  if (!link || !window.matchMedia) return;
  var foot = Array.prototype.filter.call(document.querySelectorAll('footer'), function (f) {
    return !f.closest('dialog, article, figure, blockquote, .modal, [role="dialog"]');
  }).pop();
  if (!foot) return;
  var home = document.createComment('back-link');
  link.parentNode.insertBefore(home, link);
  var slot = document.createElement('div');
  slot.className = 'back-foot';
  var mq = window.matchMedia('(max-width: 640px)');
  function place() {
    if (mq.matches) {
      if (link.parentNode !== slot) { slot.appendChild(link); foot.appendChild(slot); link.classList.add('in-footer'); }
    } else if (link.parentNode === slot) {
      home.parentNode.insertBefore(link, home.nextSibling); slot.remove(); link.classList.remove('in-footer');
    }
  }
  place();
  if (mq.addEventListener) mq.addEventListener('change', place); else if (mq.addListener) mq.addListener(place);
})();
