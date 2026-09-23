/* Sarah & James — wedding invitation. Vanilla JS, no dependencies, works offline. */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ceremony: Saturday 19 June 2027, 2:00 pm Pacific Daylight Time (UTC-7)
  var WEDDING = new Date('2027-06-19T14:00:00-07:00');
  var STORAGE_KEY = 'sarah-james-rsvp';

  /* ---------------- Navigation ---------------- */
  var nav = $('#nav');
  var toggle = $('#menuToggle');
  var links = $('#navLinks');

  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    links.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) { setTimeout(function () { var first = links.querySelector('a'); if (first) first.focus(); }, 60); }
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && links.classList.contains('open')) { setMenu(false); toggle.focus(); }
  });
  // keep focus inside the open mobile menu
  links.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !links.classList.contains('open')) return;
    var items = $$('a', links);
    if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); toggle.focus(); }
    else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); toggle.focus(); }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });

  // highlight current section
  if ('IntersectionObserver' in window) {
    var navMap = {};
    $$('.nav-links a[href^="#"]').forEach(function (a) { navMap[a.getAttribute('href').slice(1)] = a; });
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = navMap[en.target.id];
        if (a && en.isIntersecting) {
          $$('.nav-links a').forEach(function (x) { x.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(navMap).forEach(function (id) { var s = document.getElementById(id); if (s) secObs.observe(s); });
  }

  /* ---------------- Reveal on scroll ---------------- */
  var reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var rObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); rObs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { rObs.observe(el); });
  }

  /* ---------------- Countdown ---------------- */
  var cdEls = {};
  $$('[data-cd]').forEach(function (el) { cdEls[el.getAttribute('data-cd')] = el; });
  var cdTimer;
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function tick() {
    var now = new Date();
    var diff = WEDDING - now;
    if (diff <= 0) {
      clearInterval(cdTimer);
      $('#cdLive').hidden = true;
      var done = $('#cdDone');
      var sameDay = now - WEDDING < 12 * 3600 * 1000;
      done.textContent = sameDay ? 'Today is the day — we’ll see you in the garden!' : 'We’re married! Thank you for celebrating with us.';
      done.hidden = false;
      $('#cdTitle').textContent = sameDay ? 'The big day is here' : 'Happily ever after';
      return;
    }
    var s = Math.floor(diff / 1000);
    cdEls.days.textContent = Math.floor(s / 86400);
    cdEls.hours.textContent = pad(Math.floor(s % 86400 / 3600));
    cdEls.minutes.textContent = pad(Math.floor(s % 3600 / 60));
    cdEls.seconds.textContent = pad(s % 60);
  }
  tick();
  cdTimer = setInterval(tick, 1000);

  /* ---------------- Calendar (.ics) ---------------- */
  function icsEscape(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) {
    // RFC 5545: lines longer than 75 octets are folded with CRLF + space
    var out = [], cur = '';
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      var next = cur + ch;
      if (unescape(encodeURIComponent(next)).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch; }
      else cur = next;
    }
    out.push(cur);
    return out.join('\r\n ');
  }
  function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function buildICS() {
    var now = stamp(new Date());
    var events = [
      { uid: 'sj-2027-ceremony@sarah-and-james', start: '20270619T210000Z', end: '20270619T220000Z',
        summary: 'Sarah & James — Wedding Ceremony', location: 'Rose Garden, Golden Gate Park, Rose Garden Dr, San Francisco, CA 94118',
        desc: 'Please be seated by 1:50 pm. Garden formal attire. Shuttles to the reception leave at 4:00 pm.' },
      { uid: 'sj-2027-reception@sarah-and-james', start: '20270619T233000Z', end: '20270620T063000Z',
        summary: 'Sarah & James — Reception', location: 'The Grand Garden Estate, 456 Garden Boulevard, San Francisco, CA 94129',
        desc: 'Cocktail hour, dinner, toasts and dancing. Sparkler send-off at 11:30 pm.' }
    ];
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sarah and James//Wedding Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Sarah & James Wedding'];
    events.forEach(function (ev) {
      lines.push('BEGIN:VEVENT', 'UID:' + ev.uid, 'DTSTAMP:' + now, 'DTSTART:' + ev.start, 'DTEND:' + ev.end,
        'SUMMARY:' + icsEscape(ev.summary), 'LOCATION:' + icsEscape(ev.location), 'DESCRIPTION:' + icsEscape(ev.desc),
        'STATUS:CONFIRMED', 'TRANSP:OPAQUE',
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(ev.summary + ' is tomorrow'), 'END:VALARM',
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  window.__buildICS = buildICS; // exposed for testing
  function downloadICS() {
    var blob = new Blob([buildICS()], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'sarah-and-james-wedding.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-ics]')) downloadICS(); });

  /* ---------------- Gallery lightbox ---------------- */
  var items = $$('#gallery-grid .g-item');
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCaption'), lbCount = $('#lbCount');
  var current = 0, lastFocus = null;
  function show(i) {
    current = (i + items.length) % items.length;
    var img = items[current].querySelector('img');
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = items[current].querySelector('span').textContent;
    lbCount.textContent = (current + 1) + ' / ' + items.length;
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    requestAnimationFrame(function () { lb.classList.add('open'); });
    document.body.style.overflow = 'hidden';
    $('#lbClose').focus();
  }
  function closeLb() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function () { lb.hidden = true; }, reduceMotion ? 0 : 300);
    if (lastFocus) lastFocus.focus();
  }
  items.forEach(function (btn, i) { btn.addEventListener('click', function () { openLb(i); }); });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', function () { show(current - 1); });
  $('#lbNext').addEventListener('click', function () { show(current + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-stage')) closeLb(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'Tab') {
      var f = $$('button', lb); var idx = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  var touchX = null, touchY = null;
  lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  /* ---------------- RSVP ---------------- */
  var form = $('#rsvpForm');
  var done = $('#rsvpDone');
  var guestsList = $('#guestsList');
  var countOut = $('#guestCount');
  var MAX_GUESTS = 4;
  var MEALS = [
    ['', 'Choose a meal…'],
    ['beef', 'Braised short rib'],
    ['fish', 'Seared halibut'],
    ['veg', 'Wild mushroom risotto (vegetarian)'],
    ['kids', 'Kids’ menu']
  ];
  var MEAL_LABEL = {}; MEALS.forEach(function (m) { MEAL_LABEL[m[0]] = m[1]; });
  var guestCount = 1;

  function storage() { try { return window.localStorage; } catch (e) { return null; } }
  function loadSaved() { try { var s = storage(); return s ? JSON.parse(s.getItem(STORAGE_KEY) || 'null') : null; } catch (e) { return null; } }

  function guestRow(i, data) {
    data = data || {};
    var row = document.createElement('div');
    row.className = 'guest-row';
    var nameId = 'g' + i + '-name', mealId = 'g' + i + '-meal';
    var opts = MEALS.map(function (m) {
      return '<option value="' + m[0] + '"' + (m[0] === '' ? ' disabled' : '') + (data.meal === m[0] || (!data.meal && m[0] === '') ? ' selected' : '') + '>' + m[1] + '</option>';
    }).join('');
    row.innerHTML =
      '<span class="guest-title">' + (i === 0 ? 'You' : 'Guest ' + (i + 1)) + '</span>' +
      '<div class="field"><label for="' + nameId + '">Name</label>' +
      '<input class="input" id="' + nameId + '" type="text" autocomplete="off" aria-describedby="' + nameId + '-err"' + (i === 0 ? ' readonly tabindex="-1"' : '') + '>' +
      '<p class="error" id="' + nameId + '-err" aria-live="polite"></p></div>' +
      '<div class="field"><label for="' + mealId + '">Meal choice</label>' +
      '<select class="input" id="' + mealId + '" aria-describedby="' + mealId + '-err">' + opts + '</select>' +
      '<p class="error" id="' + mealId + '-err" aria-live="polite"></p></div>';
    row.querySelector('input').value = i === 0 ? ($('#fullName').value.trim() || 'You') : (data.name || '');
    return row;
  }
  function readGuests() {
    return $$('.guest-row', guestsList).map(function (r) {
      return { name: r.querySelector('input').value.trim(), meal: r.querySelector('select').value };
    });
  }
  function renderGuests(list) {
    var existing = list || readGuests();
    guestsList.innerHTML = '';
    for (var i = 0; i < guestCount; i++) guestsList.appendChild(guestRow(i, existing[i]));
    countOut.textContent = guestCount;
    $('#guestMinus').disabled = guestCount <= 1;
    $('#guestPlus').disabled = guestCount >= MAX_GUESTS;
  }
  $('#guestMinus').addEventListener('click', function () { if (guestCount > 1) { guestCount--; renderGuests(); } });
  $('#guestPlus').addEventListener('click', function () {
    if (guestCount < MAX_GUESTS) { guestCount++; renderGuests(); var ins = $$('.guest-row input', guestsList); ins[ins.length - 1].focus(); }
  });
  $('#fullName').addEventListener('input', function () {
    var first = $('.guest-row input', guestsList); if (first) first.value = this.value.trim() || 'You';
  });

  function attending() { var r = form.querySelector('input[name="attending"]:checked'); return r ? r.value : ''; }
  function syncAttending() {
    var yes = attending() === 'yes';
    $$('.attending-only', form).forEach(function (el) { el.hidden = !yes; });
    if (yes && !guestsList.children.length) renderGuests();
  }
  $$('input[name="attending"]', form).forEach(function (r) { r.addEventListener('change', function () { syncAttending(); setError($('#attendRow'), $('#attend-err'), ''); }); });

  function setError(input, errEl, msg) {
    errEl.textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !msg;
  }
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validate() {
    var ok = true, firstBad = null;
    function check(input, errEl, msg) { if (!setError(input, errEl, msg)) { ok = false; if (!firstBad) firstBad = input; } }
    var name = $('#fullName'), email = $('#email');
    check(name, $('#fullName-err'), name.value.trim().length < 2 ? 'Please enter your full name.' : '');
    check(email, $('#email-err'), !email.value.trim() ? 'Please enter your email.' : (!emailRe.test(email.value.trim()) ? 'That email doesn’t look quite right.' : ''));
    var att = attending();
    check($('#attendRow'), $('#attend-err'), att ? '' : 'Please let us know if you can make it.');
    if (!att && firstBad === $('#attendRow')) firstBad = $('#att-yes');
    if (att === 'yes') {
      $$('.guest-row', guestsList).forEach(function (r, i) {
        var n = r.querySelector('input'), m = r.querySelector('select');
        if (i > 0) check(n, $('#' + n.id + '-err'), n.value.trim().length < 2 ? 'Please add this guest’s name.' : '');
        check(m, $('#' + m.id + '-err'), m.value ? '' : 'Please choose a meal.');
      });
    }
    return { ok: ok, firstBad: firstBad };
  }
  // clear errors as the guest types
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.getAttribute('aria-invalid') === 'true') { var err = document.getElementById(t.id + '-err'); if (err) setError(t, err, ''); }
  });
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.tagName === 'SELECT' && t.value) { var err = document.getElementById(t.id + '-err'); if (err) setError(t, err, ''); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var status = $('#formStatus');
    var v = validate();
    if (!v.ok) {
      status.textContent = 'A few details are missing — please check the highlighted fields.';
      if (v.firstBad) v.firstBad.focus();
      return;
    }
    status.textContent = '';
    var att = attending();
    var data = {
      fullName: $('#fullName').value.trim(),
      email: $('#email').value.trim(),
      attending: att,
      guests: att === 'yes' ? readGuests() : [],
      dietary: att === 'yes' ? $('#dietary').value.trim() : '',
      song: att === 'yes' ? $('#song').value.trim() : '',
      message: $('#message').value.trim(),
      savedAt: new Date().toISOString()
    };
    var s = storage();
    try { if (s) s.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (err) { /* storage full or blocked: still show success */ }
    showDone(data, true);
  });

  function row(label, value) {
    var d = document.createElement('div');
    var dt = document.createElement('dt'); dt.textContent = label;
    var dd = document.createElement('dd'); dd.textContent = value;
    d.appendChild(dt); d.appendChild(dd); return d;
  }
  function showDone(data, focus) {
    var yes = data.attending === 'yes';
    $('#doneTitle').textContent = yes ? 'See you there, ' + data.fullName.split(' ')[0] + '!' : 'You’ll be missed, ' + data.fullName.split(' ')[0];
    $('#doneText').textContent = yes
      ? 'Your reply has been received with love. We’ve saved your seat' + (data.guests.length > 1 ? 's' : '') + ' and can’t wait to celebrate with you.'
      : 'Thank you for letting us know. We’ll raise a glass in your honour.';
    var dl = $('#doneSummary'); dl.innerHTML = '';
    dl.appendChild(row('Name', data.fullName));
    dl.appendChild(row('Email', data.email));
    dl.appendChild(row('Attending', yes ? 'Joyfully accepts' : 'Regretfully declines'));
    if (yes) {
      data.guests.forEach(function (g, i) { dl.appendChild(row(i === 0 ? 'Your meal' : g.name, MEAL_LABEL[g.meal] || '—')); });
      if (data.dietary) dl.appendChild(row('Dietary notes', data.dietary));
      if (data.song) dl.appendChild(row('Song request', data.song));
    }
    if (data.message) dl.appendChild(row('Your note', data.message));
    $('#doneCal').hidden = !yes;
    form.hidden = true;
    done.hidden = false;
    if (focus) done.focus();
  }

  function fillForm(data) {
    $('#fullName').value = data.fullName || '';
    $('#email').value = data.email || '';
    var r = form.querySelector('input[name="attending"][value="' + data.attending + '"]');
    if (r) r.checked = true;
    guestCount = Math.max(1, Math.min(MAX_GUESTS, (data.guests || []).length || 1));
    renderGuests(data.guests || []);
    $('#dietary').value = data.dietary || '';
    $('#song').value = data.song || '';
    $('#message').value = data.message || '';
    syncAttending();
  }

  $('#editRsvp').addEventListener('click', function () {
    var data = loadSaved();
    if (data) fillForm(data);
    done.hidden = true;
    form.hidden = false;
    $('#fullName').focus();
  });

  var saved = loadSaved();
  if (saved && saved.fullName) { fillForm(saved); showDone(saved, false); }
})();
