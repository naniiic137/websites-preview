/* Nour Clinic — vanilla JS: live opening status, services tabs, doctors, appointment booking
   (doctor → day → slot from each doctor's weekly schedule, no double-booking), .ics export, my appointments. */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = n => String(n).padStart(2, '0');
  const icon = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ---------- Dates in Tunis time (UTC+1, no daylight saving) ---------- */
  function tunisNow() {
    const d = new Date(Date.now() + 3600e3);
    return { iso: d.toISOString().slice(0, 10), dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  const parseIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const dowOf = s => parseIso(s).getUTCDay();
  const addDays = (s, n) => { const t = parseIso(s); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fromMin = n => pad(Math.floor(n / 60)) + ':' + pad(n % 60);
  const fmt = (s, o) => parseIso(s).toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, o));
  const longDate = s => fmt(s, { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = s => fmt(s, { weekday: 'short', day: 'numeric', month: 'short' });
  function dayLabel(s) {
    const today = tunisNow().iso;
    if (s === today) return 'Today';
    if (s === addDays(today, 1)) return 'Tomorrow';
    return shortDate(s);
  }

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAYS3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = { 0: null, 1: ['08:30', '19:00'], 2: ['08:30', '19:00'], 3: ['08:30', '19:00'], 4: ['08:30', '19:00'], 5: ['08:30', '19:00'], 6: ['09:00', '14:00'] };
  const SLOT = 30;          // minutes per appointment
  const NOTICE = 60;        // minimum minutes of notice for same-day bookings
  const HORIZON = 60;       // bookable days ahead

  /* ---------- Data ---------- */
  const DOCTORS = [
    { id: 'amira', name: 'Dr. Amira Ben Salah', short: 'Dr. Amira', role: 'General & cosmetic dentist', spec: 'Dentistry', fee: 50,
      img: 'assets/img/dr-amira.webp', alt: 'Portrait of Dr. Amira Ben Salah in a white coat at her desk', langs: ['Arabic', 'French', 'English'],
      schedule: { 1: [['08:30', '12:30'], ['14:00', '17:30']], 2: [['08:30', '12:30'], ['14:00', '17:30']], 3: [['08:30', '12:30'], ['14:00', '17:30']], 4: [['08:30', '12:30'], ['14:00', '17:30']], 6: [['09:00', '13:00']] } },
    { id: 'karim', name: 'Dr. Karim Trabelsi', short: 'Dr. Karim', role: 'Oral surgeon & implantologist', spec: 'Implants', fee: 70,
      img: 'assets/img/dr-karim.webp', alt: 'Portrait of Dr. Karim Trabelsi, smiling, wearing glasses and a stethoscope', langs: ['Arabic', 'French', 'Italian'],
      schedule: { 2: [['13:00', '19:00']], 4: [['13:00', '19:00']], 5: [['08:30', '14:00']] } },
    { id: 'yasmine', name: 'Dr. Yasmine Chaabane', short: 'Dr. Yasmine', role: 'Orthodontist for adults & children', spec: 'Orthodontics', fee: 80,
      img: 'assets/img/dr-yasmine.webp', alt: 'Portrait of Dr. Yasmine Chaabane with arms crossed and a stethoscope', langs: ['Arabic', 'French', 'English'],
      schedule: { 1: [['14:00', '19:00']], 3: [['14:00', '19:00']], 5: [['14:00', '19:00']], 6: [['09:00', '14:00']] } },
    { id: 'mehdi', name: 'Dr. Mehdi Gharbi', short: 'Dr. Mehdi', role: 'Family doctor & paediatrics', spec: 'Family medicine', fee: 50,
      img: 'assets/img/dr-mehdi.webp', alt: 'Portrait of Dr. Mehdi Gharbi in a white coat with arms crossed', langs: ['Arabic', 'French', 'English', 'German'],
      schedule: { 1: [['08:30', '12:30']], 2: [['08:30', '12:30'], ['15:00', '19:00']], 3: [['08:30', '12:30']], 4: [['08:30', '12:30'], ['15:00', '19:00']], 5: [['08:30', '12:30']], 6: [['09:00', '12:00']] } }
  ];
  const doctor = id => DOCTORS.find(d => d.id === id);

  const SERVICES = [
    { id: 'general', name: 'General dentistry', sub: 'Check-ups, fillings, root canals', icon: 'i-tooth', doc: 'amira',
      desc: 'Everyday care for healthy teeth and gums — prevention first, with digital X-rays included when needed.',
      items: [
        { n: 'Check-up & consultation', d: 'Full exam, advice and a written plan', t: 30, p: 50 },
        { n: 'Scale & polish', d: 'Ultrasonic cleaning, stain removal', t: 45, p: 80 },
        { n: 'Tooth-coloured filling', d: 'Composite resin, per surface', t: 45, p: 90, from: true },
        { n: 'Root canal treatment', d: 'Per tooth, under local anaesthetic', t: 90, p: 280, from: true },
        { n: 'Kids’ first dental visit', d: 'Under 6 years, gentle and playful', t: 30, p: 40 },
        { n: 'Emergency visit', d: 'Pain relief the same day', t: 30, p: 70 }
      ] },
    { id: 'ortho', name: 'Orthodontics', sub: 'Aligners, braces, retainers', icon: 'i-scan', doc: 'yasmine',
      desc: 'Straighter teeth at any age. Every plan starts with a 3D scan and a preview of your new smile.',
      items: [
        { n: 'Orthodontic consultation', d: '3D scan and treatment options', t: 45, p: 80 },
        { n: 'Clear aligners', d: 'Complete treatment, refinements included', t: 0, p: 4200, from: true },
        { n: 'Metal braces', d: 'Complete treatment, monthly adjustments', t: 0, p: 2600, from: true },
        { n: 'Ceramic braces', d: 'Tooth-coloured brackets', t: 0, p: 3300, from: true },
        { n: 'Retainer', d: 'Fixed or removable, per arch', t: 30, p: 180 }
      ] },
    { id: 'implants', name: 'Implants & surgery', sub: 'Implants, crowns, extractions', icon: 'i-shield', doc: 'karim',
      desc: 'Replace missing teeth for good. Surgery is planned digitally for precise, comfortable treatment.',
      items: [
        { n: 'Implant consultation + 3D scan', d: 'CBCT scan and full treatment plan', t: 60, p: 150 },
        { n: 'Single implant with crown', d: 'Titanium implant, ceramic crown', t: 0, p: 2300, from: true },
        { n: 'Ceramic crown', d: 'Zirconia, made to match your teeth', t: 60, p: 650, from: true },
        { n: 'Wisdom tooth extraction', d: 'Per tooth, local anaesthetic', t: 60, p: 220, from: true },
        { n: 'Bone graft', d: 'When needed before an implant', t: 60, p: 700, from: true }
      ] },
    { id: 'aesthetic', name: 'Whitening & aesthetics', sub: 'Whitening, veneers, bonding', icon: 'i-tooth', doc: 'amira',
      desc: 'A brighter, even smile with safe, dentist-supervised treatments and natural-looking results.',
      items: [
        { n: 'In-chair whitening', d: 'Up to 8 shades in one visit', t: 90, p: 450 },
        { n: 'Home whitening kit', d: 'Custom trays and gel for 2 weeks', t: 30, p: 320 },
        { n: 'Composite bonding', d: 'Repair chips and gaps, per tooth', t: 45, p: 180, from: true },
        { n: 'Porcelain veneer', d: 'Per tooth, with smile design', t: 0, p: 900, from: true }
      ] },
    { id: 'family', name: 'Family medicine', sub: 'GP visits, check-ups, vaccines', icon: 'i-chat', doc: 'mehdi',
      desc: 'Your family doctor for everyday illness, long-term conditions and prevention — adults and seniors.',
      items: [
        { n: 'GP consultation', d: 'Illness, prescriptions, referrals', t: 30, p: 50 },
        { n: 'Annual health check', d: 'Exam, blood-test review, ECG', t: 60, p: 150 },
        { n: 'Vaccination', d: 'Vaccine not included', t: 15, p: 30 },
        { n: 'Medical certificate', d: 'Sport, work or travel', t: 20, p: 40 }
      ] },
    { id: 'paeds', name: 'Paediatrics', sub: 'Babies, children, teens', icon: 'i-shield', doc: 'mehdi',
      desc: 'Calm, unhurried visits for children — from newborn checks to school certificates.',
      items: [
        { n: 'Child consultation', d: 'Fever, infections, rashes, advice', t: 30, p: 55 },
        { n: 'Growth & development check', d: 'Newborn to 12 years', t: 45, p: 90 },
        { n: 'Childhood vaccination', d: 'National schedule, vaccine not included', t: 20, p: 30 },
        { n: 'School or sports certificate', d: 'Same-day certificate', t: 20, p: 40 }
      ] }
  ];
  const dtFmt = n => n.toLocaleString('en-US') + ' DT';

  /* ---------- Small UI helpers ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }
  const scrollToEl = el => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  /* ---------- Mobile nav + header ---------- */
  const menuBtn = $('#menuToggle'), nav = $('#mainNav'), header = $('.site-header');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', e => { if (nav.classList.contains('open') && !e.target.closest('.site-header')) setMenu(false); });
  window.matchMedia('(min-width: 961px)').addEventListener('change', m => { if (m.matches) setMenu(false); });
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Opening hours: live status + table ---------- */
  function openStatus() {
    const now = tunisNow(), h = HOURS[now.dow];
    if (h && now.min >= toMin(h[0]) && now.min < toMin(h[1])) {
      const left = toMin(h[1]) - now.min;
      return { open: true, text: left <= 60 ? 'Closing soon' : 'Open now', detail: 'Closes at ' + h[1] + ' today' };
    }
    if (h && now.min < toMin(h[0])) return { open: false, text: 'Closed now', detail: 'Opens today at ' + h[0] };
    for (let i = 1; i <= 7; i++) {
      const dow = (now.dow + i) % 7;
      if (HOURS[dow]) return { open: false, text: 'Closed now', detail: 'Opens ' + (i === 1 ? 'tomorrow' : DAYS[dow]) + ' at ' + HOURS[dow][0] };
    }
    return { open: false, text: 'Closed', detail: '' };
  }
  function renderStatus() {
    const s = openStatus(), now = tunisNow(), h = HOURS[now.dow];
    $$('[data-open-dot]').forEach(d => { d.classList.toggle('open', s.open); d.classList.toggle('closed', !s.open); });
    $$('[data-open-status]').forEach(el => { el.textContent = s.open ? s.text + ' · until ' + h[1] : s.text + ' · ' + s.detail.replace(/^Opens /, 'opens '); });
    $('.fc-status [data-open-status]').textContent = s.text;
    $$('[data-open-detail]').forEach(el => { el.textContent = s.detail; });
    $$('[data-today-hours]').forEach(el => { el.textContent = h ? h[0] + ' – ' + h[1] + (s.open ? ' · open now' : '') : 'Closed · emergency line open'; });
  }
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('#hoursBody').innerHTML = order.map(d => {
    const today = d === tunisNow().dow;
    const h = HOURS[d];
    return `<tr${today ? ' class="is-today"' : ''}><th scope="row">${DAYS[d]}${today ? '<span class="today-tag">Today</span>' : ''}</th><td>${h ? h[0] + ' – ' + h[1] : 'Closed · emergencies only'}</td></tr>`;
  }).join('');
  renderStatus();
  setInterval(renderStatus, 60000);

  /* ---------- Services (accessible tabs) ---------- */
  const tabsEl = $('#svcTabs'), panelsEl = $('#svcPanels');
  tabsEl.innerHTML = SERVICES.map((s, i) => `<button type="button" role="tab" class="svc-tab" id="tab-${s.id}" aria-controls="panel-${s.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${icon(s.icon)}<span>${esc(s.name)}<small>${esc(s.sub)}</small></span></button>`).join('');
  panelsEl.innerHTML = SERVICES.map((s, i) => {
    const d = doctor(s.doc);
    return `<div class="svc-panel" role="tabpanel" id="panel-${s.id}" aria-labelledby="tab-${s.id}" tabindex="0"${i ? ' hidden' : ''}>
      <div class="svc-top"><div><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p></div>
        <span class="svc-doc"><img src="${d.img}" width="600" height="720" alt="" loading="lazy" decoding="async">with ${esc(d.name)}</span></div>
      <ul class="price-list">${s.items.map(it => `<li><div><strong>${esc(it.n)}</strong><span class="desc">${esc(it.d)}</span></div>
        <span class="dur">${it.t ? it.t + ' min' : 'Plan'}</span>
        <span class="price">${it.from ? '<small>from</small>' : ''}${dtFmt(it.p)}</span></li>`).join('')}</ul>
      <div class="svc-foot"><p>Prices include VAT. CNAM reimbursement applies to eligible treatments.</p>
        <button type="button" class="btn btn-primary" data-book-doc="${d.id}" data-book-reason="${esc(s.items[0].n)}">Book with ${esc(d.short)} ${icon('i-arrow')}</button></div>
    </div>`;
  }).join('');
  const tabs = $$('.svc-tab', tabsEl);
  function selectTab(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  tabsEl.addEventListener('click', e => { const t = e.target.closest('.svc-tab'); if (t) selectTab(t); });
  tabsEl.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (map[e.key]) { e.preventDefault(); selectTab(tabs[(i + map[e.key] + tabs.length) % tabs.length], true); }
    if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
    if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
  });

  /* ---------- Doctors ---------- */
  function groupSchedule(doc) {
    const groups = new Map();
    [1, 2, 3, 4, 5, 6].forEach(d => {
      const r = doc.schedule[d];
      if (!r) return;
      const key = r.map(x => x.join('–')).join(', ');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(d);
    });
    const label = days => {
      const runs = [];
      days.forEach(d => { const last = runs[runs.length - 1]; if (last && last[1] === d - 1) last[1] = d; else runs.push([d, d]); });
      return runs.map(([a, b]) => a === b ? DAYS3[a] : (b - a === 1 ? DAYS3[a] + ', ' + DAYS3[b] : DAYS3[a] + '–' + DAYS3[b])).join(', ');
    };
    return [...groups.entries()].map(([hours, days]) => ({ days: label(days), hours }));
  }
  $('#docGrid').innerHTML = DOCTORS.map(d => `<li class="doc-card">
      <div class="doc-photo"><img src="${d.img}" width="600" height="720" loading="lazy" decoding="async" alt="${esc(d.alt)}"><span class="doc-spec">${esc(d.spec)}</span></div>
      <div class="doc-body">
        <h3>${esc(d.name)}</h3>
        <p class="doc-role">${esc(d.role)}</p>
        <ul class="langs" aria-label="Languages spoken">${d.langs.map(l => `<li>${l}</li>`).join('')}</ul>
        <div class="week" aria-hidden="true">${[1, 2, 3, 4, 5, 6, 0].map(n => `<span class="${d.schedule[n] ? 'on' : ''}">${DAYS3[n].slice(0, 2)}</span>`).join('')}</div>
        <div class="sched"><span class="sr-only">Weekly hours: </span>${groupSchedule(d).map(g => `<div><b>${g.days}</b><span>${g.hours}</span></div>`).join('')}</div>
        <button type="button" class="btn btn-ghost" data-book-doc="${d.id}">Book with ${esc(d.short)}</button>
      </div>
    </li>`).join('');

  /* ---------- Booking engine ---------- */
  const KEY = 'nour.appointments';
  const getAppts = () => store.get(KEY, []);
  const setAppts = a => store.set(KEY, a);
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // Simulated bookings by other patients (deterministic), so the diary looks realistic
  const takenByOthers = (doc, date, time) => hash(doc + date + time) % 100 < 27;

  function slotsFor(docId, date) {
    const doc = doctor(docId), dow = dowOf(date), now = tunisNow();
    const ranges = doc.schedule[dow];
    if (!ranges || !HOURS[dow]) return [];
    const mine = getAppts().filter(a => a.doc === docId && a.date === date).map(a => a.time);
    const out = [];
    ranges.forEach(([s, e]) => {
      for (let t = toMin(s); t + SLOT <= toMin(e); t += SLOT) {
        const time = fromMin(t);
        let status = 'free';
        if (date === now.iso && t < now.min + NOTICE) status = 'past';
        else if (mine.includes(time)) status = 'mine';
        else if (takenByOthers(docId, date, time)) status = 'taken';
        out.push({ time, min: t, status });
      }
    });
    return out;
  }
  const freeCount = (docId, date) => slotsFor(docId, date).filter(s => s.status === 'free').length;
  function inRange(date) { const t = tunisNow().iso; return date >= t && date <= addDays(t, HORIZON); }
  const bookable = (docId, date) => inRange(date) && freeCount(docId, date) > 0;
  function firstBookable(docId) {
    let d = tunisNow().iso;
    for (let i = 0; i <= HORIZON; i++, d = addDays(d, 1)) if (bookable(docId, d)) return d;
    return null;
  }

  const state = { doc: null, date: null, time: null, month: null };
  const form = $('#bookForm');
  const stepDate = $('#stepDate'), stepTime = $('#stepTime');
  const reasonSel = $('#fReason');

  $('#docPick').innerHTML = DOCTORS.map(d => `<label class="pick"><input type="radio" name="doctor" value="${d.id}"><span class="pick-body"><img src="${d.img}" width="600" height="720" alt="" loading="lazy" decoding="async"><span><strong>${esc(d.name)}</strong><small>${esc(d.role)}</small></span></span></label>`).join('');

  function reasonsFor(docId) {
    const list = [];
    SERVICES.filter(s => s.doc === docId).forEach(s => s.items.forEach(it => list.push({ n: it.n, p: it.p, from: it.from, cat: s.name })));
    return list;
  }
  function fillReasons() {
    const prev = reasonSel.value;
    const list = reasonsFor(state.doc);
    const cats = [...new Set(list.map(r => r.cat))];
    reasonSel.innerHTML = '<option value="">Choose a reason…</option>' + cats.map(c => `<optgroup label="${esc(c)}">${list.filter(r => r.cat === c).map(r => `<option value="${esc(r.n)}">${esc(r.n)} — ${r.from ? 'from ' : ''}${dtFmt(r.p)}</option>`).join('')}</optgroup>`).join('') + '<option value="Other / not sure">Other / not sure</option>';
    if (prev && list.some(r => r.n === prev)) reasonSel.value = prev;
  }

  function onDoctor(id) {
    state.doc = id; state.date = null; state.time = null;
    const first = firstBookable(id);
    state.month = (first || tunisNow().iso).slice(0, 7);
    stepDate.disabled = false;
    stepTime.disabled = true;
    setErr('docErr', '');
    fillReasons();
    renderCal(); renderSlots(); updateSummary();
  }
  function selectDoctor(id, reason) {
    const r = $(`#docPick input[value="${id}"]`);
    r.checked = true;
    onDoctor(id);
    if (reason) reasonSel.value = reason;
    updateSummary();
  }
  $('#docPick').addEventListener('change', e => { if (e.target.name === 'doctor') onDoctor(e.target.value); });

  /* Calendar */
  function monthAdd(ym, n) { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); }
  function renderCal() {
    const grid = $('#calGrid');
    const ym = state.month || tunisNow().iso.slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    const first = ym + '-01';
    const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const offset = (dowOf(first) + 6) % 7;
    const today = tunisNow().iso;
    $('#calTitle').textContent = parseIso(first).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    let html = '<span class="cal-blank"></span>'.repeat(offset);
    for (let d = 1; d <= daysIn; d++) {
      const iso = ym + '-' + pad(d);
      const n = state.doc && inRange(iso) ? freeCount(state.doc, iso) : 0;
      const ok = n > 0;
      const label = longDate(iso) + (ok ? `, ${n} free time${n === 1 ? '' : 's'}` : ', unavailable');
      html += `<button type="button" class="cal-day${iso === today ? ' today' : ''}" data-date="${iso}" aria-label="${label}"${ok ? ` aria-pressed="${iso === state.date}"` : ' disabled'}>${d}</button>`;
    }
    grid.innerHTML = html;
    const minM = today.slice(0, 7), maxM = addDays(today, HORIZON).slice(0, 7);
    $('#calPrev').disabled = ym <= minM;
    $('#calNext').disabled = ym >= maxM;
  }
  $('#calPrev').addEventListener('click', () => { state.month = monthAdd(state.month, -1); renderCal(); });
  $('#calNext').addEventListener('click', () => { state.month = monthAdd(state.month, 1); renderCal(); });
  $('#calGrid').addEventListener('click', e => {
    const b = e.target.closest('.cal-day');
    if (!b || b.disabled) return;
    state.date = b.dataset.date; state.time = null;
    $$('.cal-day[aria-pressed]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    stepTime.disabled = false;
    setErr('dateErr', '');
    renderSlots(); updateSummary();
    if (window.innerWidth < 900) stepTime.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  });

  /* Slots */
  function renderSlots() {
    const box = $('#slots'), hint = $('#slotHint');
    if (!state.doc || !state.date) { box.innerHTML = ''; hint.textContent = state.doc ? 'Pick a day to see free times.' : 'Choose a doctor and a day first.'; return; }
    const list = slotsFor(state.doc, state.date);
    const free = list.filter(s => s.status === 'free').length;
    hint.textContent = `${longDate(state.date)} · ${free} free time${free === 1 ? '' : 's'} with ${doctor(state.doc).name}`;
    const groups = [['Morning', list.filter(s => s.min < 13 * 60)], ['Afternoon', list.filter(s => s.min >= 13 * 60)]].filter(g => g[1].length);
    box.innerHTML = groups.map(([name, arr]) => `<div class="slot-group" role="group" aria-label="${name}"><h4>${name}</h4><div class="slot-row">${arr.map(s => {
      if (s.status === 'free') return `<button type="button" class="slot" data-time="${s.time}" aria-pressed="${s.time === state.time}">${s.time}</button>`;
      const why = s.status === 'mine' ? 'booked by you' : (s.status === 'past' ? 'no longer available' : 'already taken');
      return `<button type="button" class="slot${s.status === 'mine' ? ' mine-slot' : ''}" data-time="${s.time}" disabled aria-label="${s.time}, ${why}">${s.status === 'mine' ? 'Yours' : s.time}</button>`;
    }).join('')}</div></div>`).join('');
  }
  $('#slots').addEventListener('click', e => {
    const b = e.target.closest('.slot');
    if (!b || b.disabled) return;
    state.time = b.dataset.time;
    $$('.slot:not(:disabled)').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    setErr('timeErr', '');
    updateSummary();
  });

  /* Summary */
  function priceFor(docId, reason) {
    const r = reasonsFor(docId).find(x => x.n === reason);
    if (r) return (r.from ? 'from ' : '') + dtFmt(r.p);
    return dtFmt(doctor(docId).fee);
  }
  function updateSummary() {
    const d = state.doc && doctor(state.doc);
    const box = $('#sumDoc');
    box.querySelector('strong').textContent = d ? d.name : 'No doctor selected';
    box.querySelector('small').textContent = d ? d.role : 'Step 1';
    box.querySelector('.sum-avatar').style.backgroundImage = d ? `url("${d.img}")` : '';
    $('#sumDate').textContent = state.date ? longDate(state.date) : '—';
    $('#sumTime').textContent = state.time ? state.time + ' – ' + fromMin(toMin(state.time) + SLOT) : '—';
    $('#sumReason').textContent = reasonSel.value || '—';
    $('#sumPrice').textContent = d ? priceFor(d.id, reasonSel.value) : '—';
  }
  reasonSel.addEventListener('change', () => { updateSummary(); if (reasonSel.value) check(reasonSel); });

  /* Book-from-anywhere buttons */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-book-doc]');
    if (!b) return;
    selectDoctor(b.dataset.bookDoc, b.dataset.bookReason);
    scrollToEl($('#book'));
    setTimeout(() => $(`#docPick input[value="${b.dataset.bookDoc}"]`).focus({ preventScroll: true }), reduce ? 0 : 500);
  });

  /* Validation */
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const normPhone = v => v.replace(/[\s.\-()]/g, '').replace(/^(\+|00)216/, '');
  const rules = {
    name: v => v.trim().length >= 3 ? '' : 'Please enter your full name.',
    phone: v => /^[2-9]\d{7}$/.test(normPhone(v)) ? '' : 'Enter a valid Tunisian number: 8 digits, e.g. 20 123 456.',
    email: v => !v.trim() || emailRe.test(v.trim()) ? '' : 'That email doesn’t look right — check for typos.',
    reason: v => v ? '' : 'Please tell us the reason for your visit.'
  };
  function setErr(id, msg) { $('#' + id).textContent = msg; }
  function check(el) {
    const msg = rules[el.name] ? rules[el.name](el.value) : '';
    const field = el.closest('.field');
    field.classList.toggle('invalid', !!msg);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    setErr(el.id + 'Err', msg);
    return !msg;
  }
  ['fName', 'fPhone', 'fEmail'].forEach(id => {
    const el = $('#' + id);
    el.addEventListener('blur', () => { if (el.value) check(el); });
    el.addEventListener('input', () => { if (el.closest('.field').classList.contains('invalid')) check(el); });
  });

  const saved = store.get('nour.patient', null);
  if (saved) { $('#fName').value = saved.name || ''; $('#fPhone').value = saved.phone || ''; $('#fEmail').value = saved.email || ''; }

  function makeRef() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = '';
    for (let i = 0; i < 6; i++) r += abc[Math.floor(Math.random() * abc.length)];
    return 'NC-' + r;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    let firstBad = null;
    const flag = (ok, el) => { if (!ok && !firstBad) firstBad = el; };
    flag(!!state.doc || (setErr('docErr', 'Please choose a doctor.'), false), $('#docPick input'));
    if (state.doc) {
      flag(!!state.date || (setErr('dateErr', 'Please pick a day.'), false), $('.cal-day:not(:disabled)') || $('#calNext'));
      if (state.date) flag(!!state.time || (setErr('timeErr', 'Please choose a time.'), false), $('.slot:not(:disabled)'));
    }
    ['fName', 'fPhone', 'fEmail', 'fReason'].forEach(id => { const el = $('#' + id); flag(check(el), el); });
    if (firstBad) {
      firstBad.focus({ preventScroll: true });
      firstBad.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      toast('Please check the highlighted fields.');
      return;
    }
    // Guard against double booking (e.g. another tab booked it meanwhile)
    const slot = slotsFor(state.doc, state.date).find(s => s.time === state.time);
    if (!slot || slot.status !== 'free') {
      state.time = null; renderSlots(); updateSummary();
      setErr('timeErr', 'Sorry, that time was just taken — please choose another.');
      return;
    }
    const appt = {
      ref: makeRef(), doc: state.doc, date: state.date, time: state.time,
      name: $('#fName').value.trim(), phone: '+216 ' + normPhone($('#fPhone').value).replace(/^(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3'),
      email: $('#fEmail').value.trim(), reason: reasonSel.value,
      type: form.elements.ptype.value, notes: $('#fNotes').value.trim(), createdAt: new Date().toISOString()
    };
    const all = getAppts(); all.push(appt); setAppts(all);
    store.set('nour.patient', { name: appt.name, phone: appt.phone.replace(/^\+216 /, ''), email: appt.email });
    showConfirm(appt);
    state.time = null;
    $('#fNotes').value = '';
    renderCal(); renderSlots(); updateSummary(); renderMine(); renderNext();
  });

  /* ---------- .ics export ---------- */
  function icsFor(a) {
    const [y, mo, d] = a.date.split('-').map(Number);
    const start = toMin(a.time);
    const utc = min => { const t = new Date(Date.UTC(y, mo - 1, d, 0, min - 60)); return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }; // Tunis = UTC+1
    const ex = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const doc = doctor(a.doc);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nour Clinic//Online booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + a.ref + '@nourclinic.example',
      'DTSTAMP:' + stamp,
      'DTSTART:' + utc(start),
      'DTEND:' + utc(start + SLOT),
      'SUMMARY:' + ex('Nour Clinic — ' + doc.name),
      'DESCRIPTION:' + ex(`${a.reason}\nReference: ${a.ref}\nPlease arrive 10 minutes early with your CNAM card.\nReception: +216 71 960 960`),
      'LOCATION:' + ex('Nour Clinic, Immeuble Nour 2nd floor, Rue du Lac Windermere, Les Berges du Lac 1, 1053 Tunis'),
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + ex('Appointment at Nour Clinic'), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR', ''
    ].join('\r\n');
  }
  const icsUrls = new Map();
  function icsUrl(a) {
    if (!icsUrls.has(a.ref)) icsUrls.set(a.ref, URL.createObjectURL(new Blob([icsFor(a)], { type: 'text/calendar;charset=utf-8' })));
    return icsUrls.get(a.ref);
  }

  /* ---------- Confirmation modal ---------- */
  const modal = $('#confirmModal');
  let lastFocus = null;
  function showConfirm(a) {
    const d = doctor(a.doc);
    $('#cfName').textContent = a.name.split(' ')[0];
    $('#cfRef').textContent = a.ref;
    $('#cfPhone').textContent = a.phone;
    $('#cfLines').innerHTML = [
      ['Doctor', d.name], ['Day', longDate(a.date)], ['Time', a.time + ' – ' + fromMin(toMin(a.time) + SLOT)],
      ['Visit', a.reason], ['Estimated price', priceFor(a.doc, a.reason)]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    const link = $('#cfIcs');
    link.href = icsUrl(a);
    link.setAttribute('download', `nour-clinic-${a.ref}.ics`);
    lastFocus = document.activeElement;
    clearTimeout(toastTimer);
    $('#toast').classList.remove('show');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal-panel', modal).focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    const target = $('#mineList .mine-item') || lastFocus;
    if (target && target.focus) { if (target.classList && target.classList.contains('mine-item')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: false }); }
  }
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      const f = $$('a[href], button:not([disabled])', modal);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === $('.modal-panel', modal))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- My appointments ---------- */
  function upcoming() {
    const now = tunisNow();
    return getAppts()
      .filter(a => a.date > now.iso || (a.date === now.iso && toMin(a.time) >= now.min))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }
  function renderMine() {
    const list = upcoming();
    $('#mineEmpty').hidden = list.length > 0;
    $('#mineList').innerHTML = list.map(a => {
      const d = doctor(a.doc);
      return `<li class="mine-item" data-ref="${a.ref}">
        <div class="mine-date" aria-hidden="true"><b>${Number(a.date.slice(8))}</b><small>${fmt(a.date, { month: 'short' })}</small></div>
        <div class="mine-info"><strong>${a.time} · ${esc(d.name)}</strong><small>${longDate(a.date)} · ${esc(a.reason)}</small><small>Ref ${a.ref}</small></div>
        <div class="mine-actions">
          <a class="link-btn ics" href="${icsUrl(a)}" download="nour-clinic-${a.ref}.ics">${icon('i-download')} Calendar<span class="sr-only"> file for ${a.ref}</span></a>
          <span class="spacer"></span>
          <button type="button" class="link-btn" data-cancel="${a.ref}">Cancel<span class="sr-only"> appointment ${a.ref}</span></button>
        </div>
      </li>`;
    }).join('');
  }
  $('#mineList').addEventListener('click', e => {
    const c = e.target.closest('[data-cancel]');
    const yes = e.target.closest('[data-yes]');
    const keep = e.target.closest('[data-keep]');
    if (c) {
      const actions = c.parentElement;
      actions.innerHTML = `<span>Cancel this appointment?</span><span class="spacer"></span><button type="button" class="link-btn" data-yes="${c.dataset.cancel}">Yes, cancel</button><button type="button" class="link-btn keep" data-keep>Keep it</button>`;
      $('[data-yes]', actions).focus();
    } else if (yes) {
      const ref = yes.dataset.yes;
      setAppts(getAppts().filter(a => a.ref !== ref));
      renderMine();
      if (state.doc) { renderCal(); renderSlots(); }
      renderNext();
      toast(`Appointment ${ref} cancelled — the time is free again.`);
      $('#mineTitle').setAttribute('tabindex', '-1');
      $('#mineTitle').focus();
    } else if (keep) {
      renderMine();
    }
  });

  /* ---------- Next free appointment (hero card) ---------- */
  let nextFree = null;
  function renderNext() {
    nextFree = null;
    let d = tunisNow().iso;
    for (let i = 0; i < 14 && !nextFree; i++, d = addDays(d, 1)) {
      let best = null;
      DOCTORS.forEach(doc => {
        const s = slotsFor(doc.id, d).find(x => x.status === 'free');
        if (s && (!best || s.min < best.min)) best = { doc: doc.id, date: d, time: s.time, min: s.min };
      });
      nextFree = best;
    }
    $('#nextSlot').textContent = nextFree ? `${dayLabel(nextFree.date)}, ${nextFree.time} · ${doctor(nextFree.doc).short}` : 'Call reception';
  }
  $('#nextSlotCard').addEventListener('click', e => {
    if (!nextFree) return;
    e.preventDefault();
    selectDoctor(nextFree.doc);
    state.date = nextFree.date; state.month = nextFree.date.slice(0, 7); state.time = nextFree.time;
    stepTime.disabled = false;
    renderCal(); renderSlots(); updateSummary();
    scrollToEl($('#book'));
  });

  renderCal();
  renderSlots();
  renderMine();
  renderNext();
  updateSummary();
  $('#year').textContent = new Date().getFullYear();
})();
