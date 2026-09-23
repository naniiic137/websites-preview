/* La Maison Dorée — interactions (vanilla, offline). */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Opening hours (Paris time). Minutes from midnight; null = closed ---------- */
  var HOURS = {
    0: [17 * 60 + 30, 21 * 60 + 30], // Sun
    1: null,                         // Mon
    2: [18 * 60, 22 * 60],
    3: [18 * 60, 22 * 60],
    4: [18 * 60, 22 * 60],
    5: [17 * 60 + 30, 23 * 60],
    6: [17 * 60 + 30, 23 * 60]
  };
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var LAST_SEATING = 60; // minutes before close
  var MAX_DAYS_AHEAD = 90;
  var MAX_PARTY = 8;

  function fmt(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  // Current date/time in Paris, regardless of the visitor's timezone.
  function parisNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var y = +o.year, mo = +o.month, d = +o.day;
      return { y: y, m: mo, d: d, dow: new Date(Date.UTC(y, mo - 1, d)).getUTCDay(), min: (+o.hour % 24) * 60 + +o.minute };
    } catch (e) {
      var n = new Date();
      return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), dow: n.getDay(), min: n.getHours() * 60 + n.getMinutes() };
    }
  }
  function isoDate(y, m, d) { return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d; }
  function addDays(iso, n) {
    var p = iso.split('-');
    var dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  function dowOf(iso) { var p = iso.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }

  function computeStatus() {
    var now = parisNow(), today = HOURS[now.dow];
    if (today && now.min >= today[0] && now.min < today[1]) {
      var left = today[1] - now.min;
      return { cls: left <= 45 ? 'soon' : 'open', text: (left <= 45 ? 'Closing soon' : 'Open now') + ' · until ' + fmt(today[1]), short: 'Open now · until ' + fmt(today[1]) };
    }
    if (today && now.min < today[0]) {
      return { cls: 'closed', text: 'Closed · opens today at ' + fmt(today[0]), short: 'Opens today at ' + fmt(today[0]) };
    }
    for (var i = 1; i <= 7; i++) {
      var dow = (now.dow + i) % 7;
      if (HOURS[dow]) {
        var when = i === 1 ? 'tomorrow' : DAY_NAMES[dow];
        return { cls: 'closed', text: 'Closed · opens ' + when + ' at ' + fmt(HOURS[dow][0]), short: 'Opens ' + when + ' ' + fmt(HOURS[dow][0]) };
      }
    }
  }
  function renderStatus() {
    var s = computeStatus();
    $$('[data-status-dot]').forEach(function (el) { el.className = 'status-dot ' + s.cls; });
    $$('[data-status-text]').forEach(function (el) { el.textContent = s.text; });
    $$('[data-status-short]').forEach(function (el) { el.textContent = s.short; });
    var dow = parisNow().dow;
    $$('.hours tr').forEach(function (tr) { tr.classList.toggle('today', +tr.dataset.day === dow); });
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  /* ---------- Header + mobile nav ---------- */
  var header = $('.site-header');
  var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toggle = $('.nav-toggle'), nav = $('#main-nav');
  function setNav(open) {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
    if (open) { var first = nav.querySelector('a'); if (first) first.focus(); }
  }
  toggle.addEventListener('click', function () { setNav(toggle.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { setNav(false); toggle.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 900 && document.body.classList.contains('nav-open')) setNav(false); });

  // Highlight current section in nav
  if ('IntersectionObserver' in window) {
    var links = $$('.main-nav a[href^="#"]:not(.btn)');
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) links.forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Menu tabs (WAI-ARIA tabs pattern) ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var idx = null;
      if (e.key === 'ArrowRight') idx = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') idx = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') idx = 0;
      if (e.key === 'End') idx = tabs.length - 1;
      if (idx !== null) { e.preventDefault(); selectTab(tabs[idx], true); }
    });
  });

  /* ---------- Gallery lightbox ---------- */
  var items = $$('.g-item'), lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  var current = 0, lastFocus = null;
  function show(i) {
    current = (i + items.length) % items.length;
    var it = items[current], thumb = it.querySelector('img');
    lbImg.src = it.dataset.full;
    lbImg.width = +it.dataset.w; lbImg.height = +it.dataset.h;
    lbImg.alt = thumb.alt;
    lbCap.textContent = thumb.alt + ' — ' + (current + 1) + ' / ' + items.length;
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.lb-close', lb).focus();
  }
  function closeLb() {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  items.forEach(function (it, i) { it.addEventListener('click', function () { openLb(i); }); });
  $('.lb-close', lb).addEventListener('click', closeLb);
  $('.lb-prev', lb).addEventListener('click', function () { show(current - 1); });
  $('.lb-next', lb).addEventListener('click', function () { show(current + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'Tab') { // keep focus inside dialog
      var f = $$('button', lb), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var touchX = null;
  lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Storage helpers ---------- */
  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }

  /* ---------- Reservation form ---------- */
  var form = $('#reservation-form');
  var dateEl = $('#r-date'), timeEl = $('#r-time'), partyEl = $('#r-party');
  var todayIso = (function () { var n = parisNow(); return isoDate(n.y, n.m, n.d); })();
  dateEl.min = todayIso;
  dateEl.max = addDays(todayIso, MAX_DAYS_AHEAD);

  function setError(input, msg) {
    var field = input.closest('.field');
    var err = $('#' + input.id + '-err');
    field.classList.toggle('invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
    return !msg;
  }
  function slotsFor(iso) {
    var h = HOURS[dowOf(iso)];
    if (!h) return [];
    var out = [], now = parisNow();
    for (var t = h[0]; t <= h[1] - LAST_SEATING; t += 30) {
      if (iso === todayIso && t < now.min + 60) continue; // need at least 1h notice today
      out.push(t);
    }
    return out;
  }
  function checkDate() {
    var v = dateEl.value;
    if (!v) return setError(dateEl, 'Please choose a date.');
    if (v < todayIso) return setError(dateEl, 'That date has already passed.');
    if (v > dateEl.max) return setError(dateEl, 'We take bookings up to ' + MAX_DAYS_AHEAD + ' days ahead.');
    if (!HOURS[dowOf(v)]) return setError(dateEl, 'We are closed on Mondays. Please choose another day.');
    if (!slotsFor(v).length) return setError(dateEl, 'No more tables today. Please choose another date.');
    return setError(dateEl, '');
  }
  function fillTimes() {
    var prev = timeEl.value;
    timeEl.innerHTML = '';
    var ok = dateEl.value && checkDate();
    var slots = ok ? slotsFor(dateEl.value) : [];
    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = slots.length ? 'Select a time' : 'Choose a valid date first';
    timeEl.appendChild(ph);
    slots.forEach(function (t) {
      var o = document.createElement('option');
      o.value = fmt(t); o.textContent = fmt(t);
      timeEl.appendChild(o);
    });
    timeEl.disabled = !slots.length;
    if (prev && slots.some(function (t) { return fmt(t) === prev; })) timeEl.value = prev;
  }
  dateEl.addEventListener('change', fillTimes);
  timeEl.addEventListener('change', function () { if (timeEl.value) setError(timeEl, ''); });

  function clampParty() {
    var n = parseInt(partyEl.value, 10);
    $$('.stepper button').forEach(function (b) {
      var s = +b.dataset.step;
      b.disabled = (s < 0 && n <= 1) || (s > 0 && n >= MAX_PARTY);
    });
    return n;
  }
  function checkParty() {
    var n = parseInt(partyEl.value, 10);
    if (!n || n < 1) return setError(partyEl, 'At least one guest, please.');
    if (n > MAX_PARTY) return setError(partyEl, 'For parties of 9 or more please call +33 1 42 86 87 88 for our private salon.');
    return setError(partyEl, '');
  }
  $$('.stepper button').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = (parseInt(partyEl.value, 10) || 0) + +b.dataset.step;
      partyEl.value = Math.max(1, Math.min(MAX_PARTY, n));
      clampParty(); checkParty();
    });
  });
  partyEl.addEventListener('input', function () { clampParty(); checkParty(); });
  clampParty();

  var validators = {
    'r-name': function (v) { return v.trim().length >= 2 ? '' : 'Please enter your full name.'; },
    'r-email': function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
    'r-phone': function (v) { return v.replace(/[^\d]/g, '').length >= 8 ? '' : 'Please enter a phone number we can reach you on.'; }
  };
  Object.keys(validators).forEach(function (id) {
    var el = $('#' + id);
    el.addEventListener('blur', function () { if (el.value) setError(el, validators[id](el.value)); });
    el.addEventListener('input', function () { if (el.closest('.field').classList.contains('invalid')) setError(el, validators[id](el.value)); });
  });

  // "Book the tasting menu" pre-selects occasion
  $$('[data-occasion]').forEach(function (a) {
    a.addEventListener('click', function () { $('#r-occasion').value = a.dataset.occasion; });
  });

  function prettyDate(iso) {
    var p = iso.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = checkDate();
    ok = (timeEl.value ? setError(timeEl, '') : setError(timeEl, 'Please choose a time.')) && ok;
    ok = checkParty() && ok;
    Object.keys(validators).forEach(function (id) { var el = $('#' + id); ok = setError(el, validators[id](el.value)) && ok; });
    if (!ok) { var bad = $('[aria-invalid="true"]', form); if (bad) bad.focus(); return; }

    var ref = 'LMD-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    var booking = {
      ref: ref, date: dateEl.value, time: timeEl.value, party: +partyEl.value,
      name: $('#r-name').value.trim(), email: $('#r-email').value.trim(), phone: $('#r-phone').value.trim(),
      occasion: $('#r-occasion').value, notes: $('#r-notes').value.trim(), createdAt: new Date().toISOString()
    };
    var all = load('lmd-reservations'); all.push(booking); save('lmd-reservations', all);

    $('#success-summary').textContent = 'Thank you, ' + booking.name.split(' ')[0] + '. A table for ' + booking.party +
      (booking.party === 1 ? ' guest' : ' guests') + ' on ' + prettyDate(booking.date) + ' at ' + booking.time +
      '. A confirmation will be sent to ' + booking.email + '.';
    $('#success-ref').textContent = ref;
    form.hidden = true;
    var s = $('#reserve-success'); s.hidden = false; s.focus();
  });
  $('#reserve-again').addEventListener('click', function () {
    form.reset(); partyEl.value = 2; clampParty(); fillTimes();
    $$('.field', form).forEach(function (f) { f.classList.remove('invalid'); });
    $$('.err', form).forEach(function (p) { p.textContent = ''; });
    $('#reserve-success').hidden = true; form.hidden = false; dateEl.focus();
  });

  /* ---------- Newsletter ---------- */
  var nf = $('#news-form'), nm = $('#news-msg');
  nf.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#news-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { nm.className = 'news-msg bad'; nm.textContent = 'Please enter a valid email.'; return; }
    var list = load('lmd-newsletter');
    if (list.indexOf(v) === -1) { list.push(v); save('lmd-newsletter', list); }
    nm.className = 'news-msg ok'; nm.textContent = 'Merci! You are on the list.';
    nf.reset();
  });

  $('#year').textContent = new Date().getFullYear();
})();
