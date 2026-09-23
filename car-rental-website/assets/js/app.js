/* Yalla Drive — vanilla JS: trip search, fleet filters & sort, car detail with gallery,
   live pricing (weekend + long-rental discounts, extras, one-way fee), driver form, bookings in localStorage. */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const KEYS = { trip: 'yalladrive.trip', bookings: 'yalladrive.bookings', driver: 'yalladrive.driver' };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = n => String(n).padStart(2, '0');
  const r2 = n => Math.round(n * 100) / 100;
  const dt = n => { n = r2(n); return n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' DT'; };
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const at = (date, time) => new Date(`${date}T${time}`);
  const fmtWhen = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  const scrollToEl = el => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  const DAY = 86400000;

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- Data ---------- */
  // sched: 7 entries Sun..Sat, [open, close] as "HH:MM" or null (closed); 'all' = 24/7
  const WEEK = (wk, sat, sun) => [sun, wk, wk, wk, wk, wk, sat];
  const OFFICES = [
    { id: 'tun', name: 'Tunis-Carthage Airport', short: 'Tunis Airport', code: 'TUN', air: true, address: 'Arrivals hall, Terminal 1, Tunis', phone: '+216 70 145 200', sched: 'all', lat: 36.851, lon: 10.227 },
    { id: 'tunis', name: 'Tunis Centre', short: 'Tunis Centre', air: false, address: '42 Avenue Habib Bourguiba, Tunis', phone: '+216 70 145 210', sched: WEEK(['08:00', '19:00'], ['08:00', '19:00'], ['09:00', '13:00']), lat: 36.800, lon: 10.180 },
    { id: 'ham', name: 'Hammamet Yasmine', short: 'Hammamet', air: false, address: 'Avenue de la Médina, Yasmine Hammamet', phone: '+216 72 145 230', sched: WEEK(['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00']), lat: 36.370, lon: 10.540 },
    { id: 'nbe', name: 'Enfidha-Hammamet Airport', short: 'Enfidha Airport', code: 'NBE', air: true, address: 'Arrivals hall, Enfidha', phone: '+216 73 145 240', sched: 'all', lat: 36.076, lon: 10.438 },
    { id: 'sousse', name: 'Sousse Centre', short: 'Sousse', air: false, address: '18 Boulevard du 14 Janvier, Sousse', phone: '+216 73 145 250', sched: WEEK(['08:00', '19:00'], ['08:00', '19:00'], null), lat: 35.830, lon: 10.630 },
    { id: 'mir', name: 'Monastir Habib Bourguiba Airport', short: 'Monastir Airport', code: 'MIR', air: true, address: 'Arrivals hall, Monastir', phone: '+216 73 145 260', sched: WEEK(['06:00', '23:30'], ['06:00', '23:30'], ['06:00', '23:30']), lat: 35.758, lon: 10.755 },
    { id: 'sfax', name: 'Sfax Centre', short: 'Sfax', air: false, address: 'Route de Tunis km 2, Sfax', phone: '+216 74 145 270', sched: WEEK(['08:00', '18:00'], ['08:00', '13:00'], null), lat: 34.740, lon: 10.760 },
    { id: 'dje', name: 'Djerba-Zarzis Airport', short: 'Djerba Airport', code: 'DJE', air: true, address: 'Arrivals hall, Mellita, Djerba', phone: '+216 75 145 280', sched: 'all', lat: 33.875, lon: 10.775 }
  ];
  const office = id => OFFICES.find(o => o.id === id);

  const CATS = { economy: 'Economy', compact: 'Compact', suv: 'SUV & 4×4', van: 'Vans & MPV', premium: 'Premium' };
  const DEPOSIT = { economy: 600, compact: 800, suv: 1200, van: 1000, premium: 2000 };
  const IMG = 'assets/img/';
  const INT = {
    seats: { src: 'int-rear-seats.webp', alt: 'Grey leather rear seats of a modern car (representative interior)' },
    boot: { src: 'int-boot.webp', alt: 'Open boot of an estate car showing the luggage space (representative)' },
    screen: { src: 'int-screen.webp', alt: 'Dashboard touchscreen with navigation and climate controls (representative)' },
    luxury: { src: 'int-luxury.webp', alt: 'Cream leather rear seats with headrest screens in an executive saloon (representative)' },
    gear: { src: 'int-gear.webp', alt: 'Automatic gear selector and centre console (representative)' }
  };
  const CARS = [
    { id: 'picanto', name: 'Kia Picanto', cat: 'economy', trans: 'manual', fuel: 'Petrol', seats: 4, bags: 1, doors: 5, rate: 69, img: 'car-economy-red.webp', alt: 'Small red five-door city car parked beside a grey building', gallery: ['seats', 'boot'], note: 'Easy to park in the medina' },
    { id: 'fiat500', name: 'Fiat 500', cat: 'economy', trans: 'automatic', fuel: 'Petrol', seats: 4, bags: 1, doors: 3, rate: 82, img: 'car-citycar-blue.webp', alt: 'Pale blue retro-styled city car parked in front of a stone house', gallery: ['screen', 'seats'], tag: 'Popular' },
    { id: 'i20', name: 'Hyundai i20', cat: 'compact', trans: 'manual', fuel: 'Petrol', seats: 5, bags: 2, doors: 5, rate: 89, img: 'car-compact-red.webp', alt: 'Red compact hatchback parked on a grassy clifftop above the sea', gallery: ['seats', 'boot'], tag: 'Best value' },
    { id: 'golf', name: 'Volkswagen Golf', cat: 'compact', trans: 'automatic', fuel: 'Diesel', seats: 5, bags: 3, doors: 5, rate: 115, img: 'car-compact-white.webp', alt: 'White five-door compact hatchback seen from the side', gallery: ['screen', 'boot'] },
    { id: 'mini', name: 'Mini Cooper', cat: 'compact', trans: 'automatic', fuel: 'Petrol', seats: 4, bags: 1, doors: 3, rate: 145, img: 'car-mini-black.webp', alt: 'Black three-door hatchback with red brake calipers parked on paving', gallery: ['gear', 'seats'] },
    { id: 'ev', name: 'BMW i3', cat: 'compact', trans: 'automatic', fuel: 'Electric', seats: 4, bags: 2, doors: 5, rate: 139, img: 'car-electric.webp', alt: 'Bronze and black electric city car parked on a tree-lined street', gallery: ['screen', 'seats'], tag: 'Electric', range: '290 km range' },
    { id: 'tucson', name: 'Hyundai Tucson', cat: 'suv', trans: 'automatic', fuel: 'Diesel', seats: 5, bags: 4, doors: 5, rate: 175, img: 'car-suv-white.webp', alt: 'White SUV parked on a sandy track with mountains in the distance', gallery: ['screen', 'boot'], tag: 'Popular' },
    { id: 'landcruiser', name: 'Toyota Land Cruiser', cat: 'suv', trans: 'automatic', fuel: 'Diesel', seats: 7, bags: 4, doors: 5, rate: 290, img: 'car-4x4.webp', alt: 'Silver 4×4 parked on an empty plain under a dusky sky', gallery: ['screen', 'boot'], tag: '4×4', deposit: 1500, insRate: 45, note: 'Sahara-ready, sand ladders on request' },
    { id: 'scenic', name: 'Renault Grand Scénic', cat: 'van', trans: 'manual', fuel: 'Diesel', seats: 7, bags: 3, doors: 5, rate: 185, img: 'car-mpv.webp', alt: 'White seven-seat people carrier driving through a city at night', gallery: ['seats', 'boot'] },
    { id: 'proace', name: 'Toyota Proace City', cat: 'van', trans: 'manual', fuel: 'Diesel', seats: 2, bags: 0, cargo: '3.3 m³', doors: 4, rate: 150, img: 'car-van.webp', alt: 'White compact panel van parked on a gravel path by a hedge', gallery: ['screen'], note: 'Moving house? 3.3 m³ of cargo space' },
    { id: 'eclass', name: 'Mercedes E-Class', cat: 'premium', trans: 'automatic', fuel: 'Diesel', seats: 5, bags: 3, doors: 4, rate: 340, img: 'car-premium.webp', alt: 'Dark blue executive saloon parked on a city street, side view', gallery: ['luxury', 'gear'], deposit: 2000, insRate: 45, minAge: 25 }
  ];
  const car = id => CARS.find(c => c.id === id);

  const EXTRAS = [
    { id: 'ins', name: 'Full insurance', desc: 'Zero excess, tyres, glass & underbody covered. Deposit drops to 300 DT.', per: 'day', price: c => c.insRate || 25 },
    { id: 'gps', name: 'GPS navigation', desc: 'Offline maps of all Tunisia in English, French or Arabic.', per: 'day', price: () => 8 },
    { id: 'child', name: 'Child seat', desc: 'Infant, child or booster — tell us the age at pick-up.', per: 'day', price: () => 7, qty: 2 },
    { id: 'driver2', name: 'Second driver', desc: 'Share the driving. Same licence rules apply.', per: 'rental', price: () => 30 },
    { id: 'delivery', name: 'Airport or hotel delivery', desc: 'We bring the car to the arrivals hall or your hotel door in the pick-up city.', per: 'rental', price: () => 40 }
  ];
  const YOUNG_FEE = 10;

  /* ---------- Rules ---------- */
  function openHours(o, d) {
    if (o.sched === 'all') return ['00:00', '24:00'];
    return o.sched[d.getDay()];
  }
  function hoursText(o, d) {
    const h = openHours(o, d);
    if (o.sched === 'all') return 'open 24/7';
    return h ? `open ${h[0]}–${h[1]} on ${d.toLocaleDateString('en-GB', { weekday: 'long' })}s` : `closed on ${d.toLocaleDateString('en-GB', { weekday: 'long' })}s`;
  }
  function isOpen(o, d) {
    const h = openHours(o, d);
    if (!h) return false;
    const t = pad(d.getHours()) + ':' + pad(d.getMinutes());
    return t >= h[0] && t <= h[1];
  }
  function km(a, b) {
    const R = 6371, rad = x => x * Math.PI / 180;
    const d = 2 * R * Math.asin(Math.sqrt(Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2));
    return d * 1.25; // road factor
  }
  function oneWayFee(pickId, retId) {
    if (!retId || retId === pickId) return 0;
    return Math.max(25, Math.round((25 + km(office(pickId), office(retId)) * 0.25) / 5) * 5);
  }
  function rentalDays(from, to) { return Math.max(1, Math.ceil((to - from - 59 * 60000) / DAY)); } // 59-min grace
  function weekendDays(from, days) {
    let n = 0;
    for (let i = 0; i < days; i++) { const d = new Date(from); d.setDate(d.getDate() + i); if (d.getDay() === 0 || d.getDay() === 6) n++; }
    return n;
  }
  const longTier = days => days >= 30 ? 0.20 : days >= 14 ? 0.15 : days >= 7 ? 0.10 : 0;

  // Returns { days, lines: [{label, amount, disc?}], total, deposit }
  function quote(c, t, ex = {}, age = null) {
    const from = at(t.fromDate, t.fromTime), to = at(t.toDate, t.toTime);
    const days = rentalDays(from, to);
    const lines = [];
    const base = days * c.rate;
    lines.push({ label: `${days} day${days > 1 ? 's' : ''} × ${dt(c.rate)}`, amount: base });
    const wk = weekendDays(from, days);
    const wkDisc = r2(wk * c.rate * 0.15);
    if (wkDisc) lines.push({ label: `Weekend days (${wk}) −15%`, amount: -wkDisc, disc: true });
    const tier = longTier(days);
    const longDisc = r2((base - wkDisc) * tier);
    if (longDisc) lines.push({ label: `Long rental (${days} days) −${tier * 100}%`, amount: -longDisc, disc: true });
    EXTRAS.forEach(e => {
      const q = e.qty ? (+ex[e.id] || 0) : (ex[e.id] ? 1 : 0);
      if (!q) return;
      const p = e.price(c);
      if (e.per === 'day') lines.push({ label: `${e.name}${q > 1 ? ' ×' + q : ''} · ${days} × ${dt(p)}`, amount: days * p * q });
      else lines.push({ label: e.name, amount: p });
    });
    if (age && age >= 21 && age <= 24) lines.push({ label: `Young driver · ${days} × ${dt(YOUNG_FEE)}`, amount: days * YOUNG_FEE });
    const ow = oneWayFee(t.pickup, t.ret);
    if (ow) lines.push({ label: `One-way ${office(t.pickup).short} → ${office(t.ret).short}`, amount: ow });
    const total = r2(lines.reduce((s, l) => s + l.amount, 0));
    const deposit = ex.ins ? 300 : (c.deposit || DEPOSIT[c.cat]);
    return { days, lines, total, deposit, from, to };
  }

  /* ---------- Header & nav ---------- */
  const header = $('.site-header');
  const nav = $('#mainNav'), menuBtn = $('#menuToggle');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', e => { if (nav.classList.contains('open') && !e.target.closest('.site-header')) setMenu(false); });
  window.matchMedia('(min-width: 960px)').addEventListener('change', m => { if (m.matches) setMenu(false); });
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Trip search ---------- */
  const sf = $('#search');
  const sPickup = $('#sPickup'), sReturn = $('#sReturn'), sFromDate = $('#sFromDate'), sFromTime = $('#sFromTime'), sToDate = $('#sToDate'), sToTime = $('#sToTime');
  const officeOpts = OFFICES.map(o => `<option value="${o.id}">${esc(o.short)}${o.code ? ' (' + o.code + ')' : ''}</option>`).join('');
  sPickup.innerHTML = officeOpts;
  sReturn.innerHTML = '<option value="">Same as pick-up</option>' + officeOpts;
  const times = [];
  for (let h = 6; h < 24; h++) ['00', '30'].forEach(m => times.push(pad(h) + ':' + m));
  const timeOpts = times.map(t => `<option>${t}</option>`).join('');
  sFromTime.innerHTML = timeOpts; sToTime.innerHTML = timeOpts;

  function defaultTrip() {
    const a = new Date(); a.setDate(a.getDate() + 1);
    const b = new Date(a); b.setDate(b.getDate() + 3);
    return { pickup: 'tun', ret: '', fromDate: isoDate(a), fromTime: '10:00', toDate: isoDate(b), toTime: '10:00' };
  }
  let trip = store.get(KEYS.trip, null);
  if (!trip || !trip.fromDate || at(trip.fromDate, trip.fromTime) < new Date() || !office(trip.pickup)) trip = defaultTrip();

  function fillSearch() {
    sPickup.value = trip.pickup; sReturn.value = trip.ret || '';
    sFromDate.value = trip.fromDate; sFromTime.value = trip.fromTime;
    sToDate.value = trip.toDate; sToTime.value = trip.toTime;
    syncDateMins();
  }
  function syncDateMins() {
    const today = isoDate(new Date());
    sFromDate.min = today;
    if (sFromDate.value) { const d = new Date(sFromDate.value + 'T00:00'); d.setDate(d.getDate() + 1); sToDate.min = isoDate(d); }
  }
  sFromDate.addEventListener('change', () => {
    syncDateMins();
    // keep the same rental length when the pick-up date moves
    if (sFromDate.value && (!sToDate.value || sToDate.value <= sFromDate.value)) {
      const d = new Date(sFromDate.value + 'T00:00'); d.setDate(d.getDate() + 3); sToDate.value = isoDate(d);
    }
  });

  function setSfError(inputEl, errEl, msg) {
    const box = inputEl.closest('.sf');
    box.classList.toggle('invalid', !!msg);
    inputEl.setAttribute('aria-invalid', msg ? 'true' : 'false');
    errEl.textContent = msg || '';
  }
  function validateSearch() {
    const t = { pickup: sPickup.value, ret: sReturn.value, fromDate: sFromDate.value, fromTime: sFromTime.value, toDate: sToDate.value, toTime: sToTime.value };
    let fromMsg = '', toMsg = '';
    const from = t.fromDate ? at(t.fromDate, t.fromTime) : null;
    const to = t.toDate ? at(t.toDate, t.toTime) : null;
    const pOff = office(t.pickup), rOff = office(t.ret || t.pickup);
    if (!from || isNaN(from)) fromMsg = 'Choose a pick-up date.';
    else if (from < new Date()) fromMsg = 'Pick-up can’t be in the past.';
    else if (!isOpen(pOff, from)) fromMsg = `${pOff.short} is ${hoursText(pOff, from)}.`;
    if (!to || isNaN(to)) toMsg = 'Choose a return date.';
    else if (from && !isNaN(from)) {
      if (t.toDate <= t.fromDate) toMsg = 'Return must be at least one day after pick-up.';
      else if (to - from > 60 * DAY) toMsg = 'Over 60 days? Call us for a long-term quote.';
      else if (!isOpen(rOff, to)) toMsg = `${rOff.short} is ${hoursText(rOff, to)}.`;
    }
    setSfError(sFromDate, $('#sFromErr'), fromMsg);
    setSfError(sToDate, $('#sToErr'), toMsg);
    return fromMsg || toMsg ? null : t;
  }
  [sFromDate, sFromTime, sToDate, sToTime, sPickup, sReturn].forEach(el => el.addEventListener('change', () => {
    if ($$('.sf.invalid', sf).length) validateSearch();
  }));
  sf.addEventListener('submit', e => {
    e.preventDefault();
    const t = validateSearch();
    if (!t) { ($('.sf.invalid input', sf) || sFromDate).focus(); return; }
    trip = t;
    store.set(KEYS.trip, trip);
    renderTripPill(); renderFleet();
    const days = rentalDays(at(t.fromDate, t.fromTime), at(t.toDate, t.toTime));
    toast(`Showing prices for ${days} day${days > 1 ? 's' : ''} from ${office(t.pickup).short}`);
    scrollToEl($('#fleet'));
  });

  function renderTripPill() {
    const from = at(trip.fromDate, trip.fromTime), to = at(trip.toDate, trip.toTime);
    const days = rentalDays(from, to);
    const ow = trip.ret && trip.ret !== trip.pickup ? ` → ${esc(office(trip.ret).short)}` : '';
    $('#tripPill').innerHTML = `<strong>${days} day${days > 1 ? 's' : ''}</strong><span class="sep" aria-hidden="true">|</span><span>${fmtWhen(from)} → ${fmtWhen(to)}</span><span class="sep" aria-hidden="true">|</span><span>${esc(office(trip.pickup).short)}${ow}</span>`;
  }

  /* ---------- Fleet filters ---------- */
  const F = { cat: 'all', trans: 'any', seats: 0, max: 350, sort: 'rec' };
  const catChips = $('#catChips');
  catChips.innerHTML = [['all', 'All', CARS.length]].concat(Object.keys(CATS).map(k => [k, CATS[k], CARS.filter(c => c.cat === k).length]))
    .map(([k, l, n]) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="${k === 'all'}">${l} <span class="n">${n}</span></button>`).join('');
  catChips.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    F.cat = b.dataset.cat; syncFilterUI(); renderFleet();
  });
  $$('input[name="trans"]').forEach(r => r.addEventListener('change', () => { F.trans = r.value; renderFleet(); }));
  $$('input[name="seats"]').forEach(r => r.addEventListener('change', () => { F.seats = +r.value; renderFleet(); }));
  const fPrice = $('#fPrice'), fPriceOut = $('#fPriceOut');
  fPrice.addEventListener('input', () => { F.max = +fPrice.value; fPriceOut.textContent = dt(F.max); renderFleet(); });
  $('#sortSel').addEventListener('change', e => { F.sort = e.target.value; renderFleet(); });
  function resetFilters() { Object.assign(F, { cat: 'all', trans: 'any', seats: 0, max: 350 }); syncFilterUI(); renderFleet(); }
  $('#resetFilters').addEventListener('click', resetFilters);
  $('#emptyReset').addEventListener('click', resetFilters);
  function syncFilterUI() {
    $$('.chip', catChips).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.cat === F.cat)));
    $$('input[name="trans"]').forEach(r => { r.checked = r.value === F.trans; });
    $$('input[name="seats"]').forEach(r => { r.checked = +r.value === F.seats; });
    fPrice.value = F.max; fPriceOut.textContent = dt(F.max);
  }
  const ft = $('#filtersToggle'), filtersEl = $('#filters');
  ft.addEventListener('click', () => {
    const open = ft.getAttribute('aria-expanded') !== 'true';
    ft.setAttribute('aria-expanded', String(open));
    filtersEl.classList.toggle('open', open);
  });

  function specsHTML(c) {
    return `<li>${icon('i-seat')}${c.seats} seats</li>` +
      `<li>${icon('i-bag')}${c.cargo ? c.cargo : c.bags + (c.bags === 1 ? ' bag' : ' bags')}</li>` +
      `<li>${icon('i-gear')}${c.trans === 'automatic' ? 'Automatic' : 'Manual'}</li>` +
      `<li>${icon(c.fuel === 'Electric' ? 'i-bolt' : 'i-fuel')}${c.fuel}</li>`;
  }
  function renderFleet() {
    let list = CARS.filter(c => (F.cat === 'all' || c.cat === F.cat) && (F.trans === 'any' || c.trans === F.trans) && c.seats >= F.seats && c.rate <= F.max);
    if (F.sort === 'price-asc') list.sort((a, b) => a.rate - b.rate);
    else if (F.sort === 'price-desc') list.sort((a, b) => b.rate - a.rate);
    else if (F.sort === 'seats') list.sort((a, b) => b.seats - a.seats || a.rate - b.rate);
    const n = list.length;
    $('#resultCount').textContent = `${n} car${n === 1 ? '' : 's'} available`;
    $('#emptyState').hidden = n > 0;
    const active = (F.cat !== 'all') + (F.trans !== 'any') + (F.seats > 0) + (F.max < 350);
    $('#filtersN').hidden = !active; $('#filtersN').textContent = active;
    $('#carGrid').innerHTML = list.map((c, i) => {
      const q = quote(c, trip);
      const tagCls = c.tag === 'Electric' ? 'tag tag-ev' : 'tag tag-hot';
      return `<li class="car" data-id="${c.id}">
        <div class="car-media">
          <img src="${IMG + c.img}" width="800" height="520" alt="${esc(c.alt)}" ${i > 2 ? 'loading="lazy" ' : ''}decoding="async">
          <div class="car-badges"><span class="tag">${CATS[c.cat]}</span>${c.tag ? `<span class="${tagCls}">${c.tag}</span>` : ''}</div>
        </div>
        <div class="car-body">
          <h3><button type="button" data-open="${c.id}">${esc(c.name)}</button></h3>
          <p class="car-sim">or similar${c.range ? ' · ' + c.range : ''}</p>
          <ul class="specs" aria-label="Specifications">${specsHTML(c)}</ul>
          <div class="car-foot">
            <div class="price"><strong>${dt(c.rate)} <small>/day</small></strong><p>Total <b>${dt(q.total)}</b> <span class="nw">· ${q.days} day${q.days > 1 ? 's' : ''}</span></p></div>
            <button type="button" class="btn btn-primary btn-sm" data-open="${c.id}" aria-label="Choose ${esc(c.name)}">Choose</button>
          </div>
        </div>
      </li>`;
    }).join('');
  }
  $('#carGrid').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openCar(b.dataset.open, b); });

  $('#promoSuv').addEventListener('click', () => { F.cat = 'suv'; syncFilterUI(); renderFleet(); scrollToEl($('#fleet')); });

  /* ---------- Offices ---------- */
  function hoursSummary(o) {
    if (o.sched === 'all') return 'Open 24 hours, 7 days';
    const f = h => h ? h.join('–') : 'closed', same = (a, b) => f(a) === f(b);
    const [sun, wk, sat] = [o.sched[0], o.sched[1], o.sched[6]];
    if (same(wk, sat) && same(wk, sun)) return `Daily ${f(wk)}`;
    if (same(wk, sat)) return `Mon–Sat ${f(wk)} · Sun ${f(sun)}`;
    return `Mon–Fri ${f(wk)} · Sat ${f(sat)} · Sun ${f(sun)}`;
  }
  function renderOffices() {
    const now = new Date();
    $('#officeGrid').innerHTML = OFFICES.map(o => {
      const open = isOpen(o, now);
      return `<li class="office">
        <div class="office-top">
          <span class="otag ${o.air ? 'air' : ''}">${o.air ? icon('i-plane') + ' Airport' : 'City office'}${o.code ? ' · ' + o.code : ''}</span>
          <span class="status ${open ? 'is-open' : ''}">${open ? 'Open now' : 'Closed now'}</span>
        </div>
        <h3>${esc(o.name)}</h3>
        <p>${icon('i-pin')}<span>${esc(o.address)}</span></p>
        <p>${icon('i-clock')}<span>${hoursSummary(o)}</span></p>
        <div class="office-foot">
          <a href="tel:${o.phone.replace(/\s/g, '')}">${icon('i-phone')}${o.phone}</a>
          <button type="button" class="btn btn-outline btn-sm" data-pick="${o.id}" aria-label="Pick up at ${esc(o.name)}">Pick up here</button>
        </div>
      </li>`;
    }).join('');
  }
  $('#officeGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    sPickup.value = b.dataset.pick;
    scrollToEl($('#top'));
    setTimeout(() => sFromDate.focus({ preventScroll: true }), reduce ? 0 : 400);
    toast(`Pick-up set to ${office(b.dataset.pick).name}`);
  });

  /* ---------- Car dialog ---------- */
  const dlg = $('#carDialog');
  const S = { car: null, ex: {}, g: 0, step: 1, trigger: null, age: null };
  const lockScroll = on => { document.documentElement.style.overflow = on ? 'hidden' : ''; };

  function galleryOf(c) {
    return [{ src: c.img, alt: c.alt }].concat(c.gallery.map(k => INT[k]));
  }
  function showImg(i) {
    const g = galleryOf(S.car);
    S.g = (i + g.length) % g.length;
    const img = $('#gMain');
    img.src = IMG + g[S.g].src; img.alt = g[S.g].alt;
    $('#gCount').textContent = `${S.g + 1} / ${g.length}`;
    $$('#gThumbs button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === S.g)));
    $('#gPrev').hidden = $('#gNext').hidden = g.length < 2;
  }
  $('#gPrev').addEventListener('click', () => showImg(S.g - 1));
  $('#gNext').addEventListener('click', () => showImg(S.g + 1));
  $('#gThumbs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showImg(+b.dataset.i); });
  $('.gallery').addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { showImg(S.g - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { showImg(S.g + 1); e.preventDefault(); }
  });

  function renderExtras() {
    const c = S.car;
    $('#extrasList').innerHTML = EXTRAS.map(e => {
      const p = e.price(c), unit = e.per === 'day' ? '/day' : '/rental';
      if (e.qty) {
        const v = +S.ex[e.id] || 0;
        return `<div class="extra ${v ? 'on' : ''}" data-ex="${e.id}">
          <span class="ex-txt"><strong id="ex-${e.id}-l">${e.name}</strong><small>${e.desc}</small></span>
          <span class="ex-price">${dt(p)} ${unit}</span>
          <select aria-labelledby="ex-${e.id}-l" data-qty="${e.id}">${Array.from({ length: e.qty + 1 }, (_, k) => `<option value="${k}" ${k === v ? 'selected' : ''}>${k === 0 ? 'None' : k}</option>`).join('')}</select>
        </div>`;
      }
      return `<label class="extra ${S.ex[e.id] ? 'on' : ''}" data-ex="${e.id}">
        <input type="checkbox" data-chk="${e.id}" ${S.ex[e.id] ? 'checked' : ''}>
        <span class="ex-txt"><strong>${e.name}</strong><small>${e.desc}</small></span>
        <span class="ex-price">${dt(p)} ${unit}</span>
      </label>`;
    }).join('');
  }
  $('#extrasList').addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.chk) { S.ex[t.dataset.chk] = t.checked; t.closest('.extra').classList.toggle('on', t.checked); }
    if (t.dataset.qty) { S.ex[t.dataset.qty] = +t.value; t.closest('.extra').classList.toggle('on', +t.value > 0); }
    renderSummary();
  });

  function renderSummary() {
    const q = quote(S.car, trip, S.ex, S.age);
    const ret = trip.ret || trip.pickup;
    $('#sumFrom').textContent = office(trip.pickup).name;
    $('#sumFromWhen').textContent = fmtWhen(q.from);
    $('#sumTo').textContent = office(ret).name;
    $('#sumToWhen').textContent = fmtWhen(q.to);
    $('#breakdown').innerHTML = q.lines.map(l => `<div${l.disc ? ' class="disc"' : ''}><dt>${esc(l.label)}</dt><dd>${l.amount < 0 ? '−' + dt(-l.amount) : dt(l.amount)}</dd></div>`).join('');
    $('#sumTotal').textContent = dt(q.total);
    $('#mbTotal').textContent = dt(q.total);
    $('#mbDays').textContent = `${q.days} day${q.days > 1 ? 's' : ''}`;
    $('#sumDeposit').innerHTML = `Refundable deposit <b>${dt(q.deposit)}</b>, held on your card at pick-up.`;
    return q;
  }

  function setStep(n) {
    S.step = n;
    $('#step1').hidden = n !== 1;
    $('#step2').hidden = n !== 2;
    $('#step3').hidden = n !== 3;
    $('.cd-main').hidden = n === 3;
    $('#cdSummary').hidden = n === 3;
    $('#toDriver').hidden = n !== 1;
    $('#cdMbar').hidden = n !== 1;
    $$('#cdSteps span').forEach(s => {
      const k = +s.dataset.step;
      if (k === n) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
      s.classList.toggle('done', k < n);
    });
    dlg.scrollTop = 0;
  }

  function openCar(id, trigger) {
    const c = car(id); if (!c) return;
    S.car = c; S.ex = {}; S.trigger = trigger || null; S.age = null;
    $('#cdCat').textContent = CATS[c.cat];
    $('#cdTitle').textContent = c.name;
    $('#cdTag').textContent = `${c.trans === 'automatic' ? 'Automatic' : 'Manual'} · ${c.fuel}${c.range ? ' · ' + c.range : ''}${c.note ? ' · ' + c.note : ''}`;
    $('#cdSpecs').innerHTML = [
      ['i-seat', c.seats, 'seats'], ['i-bag', c.cargo || c.bags, c.cargo ? 'cargo' : 'large bags'], ['i-door', c.doors, 'doors'],
      ['i-gear', c.trans === 'automatic' ? 'Auto' : 'Manual', 'gearbox'], [c.fuel === 'Electric' ? 'i-bolt' : 'i-fuel', c.fuel, c.range || 'full to full'], ['i-snow', 'A/C', 'air conditioning']
    ].map(([ic, v, l]) => `<li>${icon(ic)}<span>${v}<small>${l}</small></span></li>`).join('');
    const g = galleryOf(c);
    $('#gThumbs').innerHTML = g.map((im, k) => `<button type="button" data-i="${k}" aria-pressed="false" aria-label="Photo ${k + 1}: ${esc(im.alt)}"><img src="${IMG + im.src}" width="800" height="520" alt="" loading="lazy"></button>`).join('');
    showImg(0);
    renderExtras();
    const saved = store.get(KEYS.driver, null);
    const f = $('#driverForm');
    f.reset();
    $$('.field', f).forEach(x => x.classList.remove('invalid'));
    $$('.field-error', f).forEach(x => { x.textContent = ''; });
    if (saved) ['name', 'email', 'phone'].forEach(k => { if (saved[k]) f.elements[k].value = saved[k]; });
    setStep(1);
    renderSummary();
    if (!dlg.open) { dlg.showModal(); lockScroll(true); }
    $('#cdClose').focus();
  }
  function closeCar() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', () => { lockScroll(false); if (S.trigger && document.contains(S.trigger)) S.trigger.focus(); });
  $('#cdClose').addEventListener('click', closeCar);
  $('#cfDone').addEventListener('click', closeCar);
  dlg.addEventListener('click', e => { if (e.target === dlg) closeCar(); });
  $('#changeTrip').addEventListener('click', () => {
    S.trigger = null; closeCar();
    scrollToEl($('#top'));
    setTimeout(() => sFromDate.focus({ preventScroll: true }), reduce ? 0 : 400);
  });
  $('#mbNext').addEventListener('click', () => $('#toDriver').click());
  $('#toDriver').addEventListener('click', () => {
    setStep(2);
    renderSummary();
    $('#dName').focus();
  });
  $('#backToCar').addEventListener('click', () => { setStep(1); $('#toDriver').focus(); });
  $('#termsLink').addEventListener('click', () => { S.trigger = null; closeCar(); });

  /* ---------- Driver form ---------- */
  const df = $('#driverForm');
  const yearNow = new Date().getFullYear();
  $('#dLicYear').innerHTML = '<option value="">Year…</option>' + Array.from({ length: 61 }, (_, k) => `<option>${yearNow - k}</option>`).join('');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneDigits = v => v.replace(/\D/g, '').replace(/^(00)?216(?=\d{8}$)/, '');
  const rules = {
    name: v => v.trim().split(/\s+/).length >= 2 && v.trim().length >= 4 ? '' : 'Enter the driver’s first and last name, as on the licence.',
    email: v => !v.trim() ? 'Enter an email for your confirmation.' : emailRe.test(v.trim()) ? '' : 'That email doesn’t look right — check for typos.',
    phone: v => /^[2-9]\d{7}$/.test(phoneDigits(v)) ? '' : 'Enter an 8-digit Tunisian number, e.g. 20 123 456.',
    age: v => {
      const a = +v;
      if (!v || !Number.isInteger(a)) return 'Enter the driver’s age.';
      if (a < 21) return 'Drivers must be at least 21 years old.';
      if (a > 99) return 'Please check the age.';
      if (S.car && S.car.minAge && a < S.car.minAge) return `The ${S.car.name} requires a driver aged ${S.car.minAge} or over.`;
      return '';
    },
    licYear: v => {
      if (!v) return 'Choose the year your licence was issued.';
      if (yearNow - +v < 2) return 'You need to have held your licence for at least 2 years.';
      const a = +df.elements.age.value;
      if (a && a - (yearNow - +v) < 17) return 'The licence year doesn’t match the driver’s age.';
      return '';
    },
    licence: v => /^(?=(?:.*\d){5})[A-Za-z0-9/\- ]{6,16}$/.test(v.trim()) ? '' : 'Enter the licence number (6–16 letters and digits).',
    flight: v => !v.trim() || /^[A-Za-z0-9]{2}\s?\d{1,4}[A-Za-z]?$/.test(v.trim()) ? '' : 'Flight numbers look like TU 715 or BJ 342.',
    terms: (v, el) => el.checked ? '' : 'Please accept the rental conditions.'
  };
  function check(el) {
    const fn = rules[el.name]; if (!fn) return true;
    const msg = fn(el.value, el);
    const field = el.closest('.field');
    field.classList.toggle('invalid', !!msg);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    const errId = (el.getAttribute('aria-describedby') || '').split(' ')[0];
    if (errId) $('#' + errId).textContent = msg;
    return !msg;
  }
  $$('input, select', df).forEach(el => {
    el.addEventListener('blur', () => { if (el.value && el.type !== 'checkbox') check(el); });
    el.addEventListener('input', () => { if (el.closest('.field').classList.contains('invalid')) check(el); });
    el.addEventListener('change', () => { if (el.type === 'checkbox' || el.tagName === 'SELECT') check(el); });
  });
  df.elements.age.addEventListener('input', () => {
    const a = +df.elements.age.value;
    S.age = a >= 21 && a <= 99 ? a : null;
    renderSummary();
  });

  const REF_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const makeRef = () => 'YD-' + Array.from({ length: 6 }, () => REF_ABC[Math.floor(Math.random() * REF_ABC.length)]).join('');

  df.addEventListener('submit', e => {
    e.preventDefault();
    let bad = null;
    $$('input, select', df).forEach(el => { if (!check(el) && !bad) bad = el; });
    if (bad) { bad.focus(); return; }
    const c = S.car, q = quote(c, trip, S.ex, S.age);
    const extras = EXTRAS.filter(x => x.qty ? +S.ex[x.id] : S.ex[x.id]).map(x => x.qty && S.ex[x.id] > 1 ? `${x.name} ×${S.ex[x.id]}` : x.name);
    const rec = {
      ref: makeRef(), status: 'confirmed', carId: c.id, car: c.name, img: c.img,
      pickup: trip.pickup, ret: trip.ret || trip.pickup, from: q.from.toISOString(), to: q.to.toISOString(), days: q.days,
      extras, lines: q.lines, total: q.total, deposit: q.deposit,
      driver: { name: df.elements.name.value.trim(), email: df.elements.email.value.trim(), phone: '+216 ' + phoneDigits(df.elements.phone.value), age: +df.elements.age.value, licence: df.elements.licence.value.trim(), licYear: +df.elements.licYear.value, flight: df.elements.flight.value.trim() },
      createdAt: new Date().toISOString()
    };
    const all = store.get(KEYS.bookings, []);
    all.push(rec);
    store.set(KEYS.bookings, all);
    store.set(KEYS.driver, { name: rec.driver.name, email: rec.driver.email, phone: df.elements.phone.value.trim() });
    updateBadge();

    $('#cfName').textContent = rec.driver.name.split(' ')[0];
    $('#cfRef').textContent = rec.ref;
    const rows = [
      ['Car', `${c.name} or similar`],
      ['Pick-up', `${office(rec.pickup).name}<br>${fmtWhen(q.from)}`],
      ['Return', `${office(rec.ret).name}<br>${fmtWhen(q.to)}`],
      ['Duration', `${q.days} day${q.days > 1 ? 's' : ''}`],
      ['Extras', extras.length ? esc(extras.join(', ')) : 'None'],
      ['Total, pay at pick-up', dt(q.total)],
      ['Deposit', dt(q.deposit)]
    ];
    $('#cfLines').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v.includes('<br>') ? v.split('<br>').map(esc).join('<br>') : v}</dd></div>`).join('');
    setStep(3);
    $('#step3').focus();
  });

  /* ---------- My bookings ---------- */
  const bkDlg = $('#bookingsDialog');
  function updateBadge() {
    const n = store.get(KEYS.bookings, []).filter(b => b.status === 'confirmed').length;
    const b = $('#bookingsCount');
    b.hidden = !n; b.textContent = n;
    $('#myBookingsBtn').setAttribute('aria-label', `My bookings${n ? ', ' + n + ' active' : ''}`);
  }
  function renderBookings() {
    const all = store.get(KEYS.bookings, []).slice().reverse();
    if (!all.length) {
      $('#bkList').innerHTML = `<div class="bk-empty">${icon('i-key')}<p><strong>No bookings yet.</strong><br>Choose a car and your booking will appear here.</p><button type="button" class="btn btn-primary" id="bkBrowse">Browse the fleet</button></div>`;
      return;
    }
    $('#bkList').innerHTML = all.map(b => `<article class="bk ${b.status}" data-ref="${esc(b.ref)}">
      <img src="${IMG + esc(b.img)}" width="800" height="520" alt="">
      <div>
        <h3>${esc(b.car)} <span class="muted" style="font-weight:400">or similar</span></h3>
        <p>${esc(office(b.pickup) ? office(b.pickup).short : b.pickup)} · ${fmtWhen(new Date(b.from))}</p>
        <p>→ ${esc(office(b.ret) ? office(b.ret).short : b.ret)} · ${fmtWhen(new Date(b.to))} · ${b.days} day${b.days > 1 ? 's' : ''}</p>
        <div class="bk-meta">
          <span><span class="bk-ref">${esc(b.ref)}</span> <span class="bk-status">${b.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</span></span>
          <span class="bk-total">${dt(b.total)}</span>
        </div>
        ${b.status === 'confirmed' && new Date(b.from) > new Date() ? `<p style="margin-top:10px"><button type="button" class="link-btn" data-cancel="${esc(b.ref)}">Cancel booking</button></p>` : ''}
      </div>
    </article>`).join('');
  }
  let lastBkTrigger = null;
  function openBookings(trigger) {
    lastBkTrigger = trigger || null;
    renderBookings();
    if (!bkDlg.open) { bkDlg.showModal(); lockScroll(true); }
    $('#bkClose').focus();
  }
  bkDlg.addEventListener('close', () => { lockScroll(false); if (lastBkTrigger && document.contains(lastBkTrigger)) lastBkTrigger.focus(); });
  $('#bkClose').addEventListener('click', () => bkDlg.close());
  bkDlg.addEventListener('click', e => {
    if (e.target === bkDlg) { bkDlg.close(); return; }
    if (e.target.closest('#bkBrowse')) { lastBkTrigger = null; bkDlg.close(); scrollToEl($('#fleet')); return; }
    const c = e.target.closest('[data-cancel]');
    if (!c) return;
    if (c.dataset.armed !== '1') {
      c.dataset.armed = '1'; c.textContent = 'Tap again to confirm cancellation';
      setTimeout(() => { if (document.contains(c)) { c.dataset.armed = ''; c.textContent = 'Cancel booking'; } }, 4000);
      return;
    }
    const all = store.get(KEYS.bookings, []);
    const b = all.find(x => x.ref === c.dataset.cancel);
    if (b) { b.status = 'cancelled'; store.set(KEYS.bookings, all); }
    renderBookings(); updateBadge();
    toast(`Booking ${c.dataset.cancel} cancelled — no fee charged`);
    $('#bkClose').focus();
  });
  $('#myBookingsBtn').addEventListener('click', e => openBookings(e.currentTarget));
  $$('[data-open-bookings]').forEach(b => b.addEventListener('click', () => openBookings(b)));
  $('#cfBookings').addEventListener('click', () => { S.trigger = null; closeCar(); openBookings($('#myBookingsBtn')); });

  /* ---------- Init ---------- */
  fillSearch();
  renderTripPill();
  renderFleet();
  renderOffices();
  updateBadge();
  $('#year').textContent = new Date().getFullYear();
})();
