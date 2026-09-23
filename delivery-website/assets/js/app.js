/* SwiftDrop — vanilla JS: quote calculator, live tracking simulation, coverage checker, pickup form. */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const dt = n => n.toFixed(2).replace(/\.00$/, '') + ' DT';
  const dt2 = n => n.toFixed(2) + ' DT';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  const pad = n => String(n).padStart(2, '0');
  const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const dayName = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const scrollTo = id => document.getElementById(id).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });

  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2800);
  }

  /* ---------- Cities (lat, lon, tier: 1 same-day, 2 next-day, 3 48 h) ---------- */
  const CITIES = [
    ['Tunis', 36.81, 10.18, 1, 1], ['Ariana', 36.86, 10.19, 1], ['Ben Arous', 36.75, 10.23, 1, 1], ['La Marsa', 36.88, 10.32, 1], ['Manouba', 36.81, 10.10, 1],
    ['Bizerte', 37.27, 9.87, 2, 1], ['Nabeul', 36.45, 10.73, 2, 1], ['Hammamet', 36.40, 10.61, 2], ['Zaghouan', 36.40, 10.14, 2], ['Béja', 36.73, 9.18, 2, 1],
    ['Jendouba', 36.50, 8.78, 2], ['Tabarka', 36.95, 8.76, 3], ['Le Kef', 36.18, 8.71, 2, 1], ['Siliana', 36.08, 9.37, 2],
    ['Sousse', 35.83, 10.64, 1, 1], ['Monastir', 35.77, 10.83, 1], ['Mahdia', 35.50, 11.06, 2], ['Kairouan', 35.68, 10.10, 2, 1],
    ['Kasserine', 35.17, 8.84, 2, 1], ['Sidi Bouzid', 35.04, 9.48, 2], ['Sfax', 34.74, 10.76, 1, 1], ['Gafsa', 34.43, 8.78, 2, 1],
    ['Tozeur', 33.92, 8.13, 3], ['Kébili', 33.70, 8.97, 3], ['Gabès', 33.88, 10.10, 2, 1], ['Djerba', 33.81, 10.85, 2, 1],
    ['Médenine', 33.35, 10.50, 2, 1], ['Zarzis', 33.50, 11.11, 3], ['Tataouine', 32.93, 10.45, 3]
  ].map(([name, lat, lon, tier, hub]) => ({ name, lat, lon, tier, hub: !!hub }));
  const city = n => CITIES.find(c => c.name === n);
  function km(a, b) {
    if (a === b) return 8;
    const R = 6371, r = x => x * Math.PI / 180;
    const d = 2 * R * Math.asin(Math.sqrt(Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2));
    return Math.max(8, Math.round(d * 1.25));
  }

  /* ---------- Map projection & Tunisia silhouette (illustrative) ---------- */
  const P = (lon, lat) => [((lon - 7.3) * 62 + 10), ((37.5 - lat) * 72 + 10)];
  const OUTLINE = [[8.62, 36.94], [9.1, 37.18], [9.85, 37.33], [10.15, 37.2], [10.3, 36.98], [10.2, 36.82], [10.45, 36.75], [10.8, 36.92], [11.07, 37.07], [11.12, 36.85], [10.9, 36.55], [10.55, 36.37], [10.52, 36.05], [10.62, 35.85], [10.85, 35.72], [11.07, 35.5], [11.0, 35.2], [10.72, 34.8], [10.35, 34.4], [10.05, 34.1], [10.1, 33.85], [10.45, 33.65], [10.72, 33.7], [10.95, 33.55], [11.12, 33.3], [11.55, 33.15], [11.5, 32.4], [10.3, 31.7], [10.2, 30.9], [9.5, 30.25], [9.05, 32.1], [8.3, 32.6], [7.5, 33.25], [7.75, 34.2], [8.25, 34.65], [8.4, 35.2], [8.3, 36.0], [8.4, 36.5]];
  const outlinePath = 'M' + OUTLINE.map(([lo, la]) => P(lo, la).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z';
  const djerba = P(10.9, 33.8);
  function baseMap(fill, stroke) {
    return `<path d="${outlinePath}" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="${djerba[0]}" cy="${djerba[1]}" rx="11" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
  }

  /* ---------- Mobile nav ---------- */
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', e => { if (nav.classList.contains('is-open') && !e.target.closest('.header')) setMenu(false); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', () => setMenu(false));

  /* ---------- Quote calculator ---------- */
  const SIZES = [
    { id: 'envelope', label: 'Envelope', hint: 'up to 0.5 kg', base: 5, incl: 0.5, perKg: 0.6, max: 1, icon: 'i-box' },
    { id: 'small', label: 'Small', hint: 'shoebox', base: 7, incl: 2, perKg: 0.6, max: 5, icon: 'i-box' },
    { id: 'medium', label: 'Medium', hint: 'carry-on', base: 10, incl: 5, perKg: 0.55, max: 15, icon: 'i-box' },
    { id: 'large', label: 'Large', hint: 'suitcase', base: 15, incl: 15, perKg: 0.5, max: 30, icon: 'i-box' },
    { id: 'pallet', label: 'Pallet', hint: 'up to 500 kg', base: 60, incl: 150, perKg: 0.12, max: 500, icon: 'i-pallet' }
  ];
  const SPEEDS = [
    { id: 'economy', label: 'Economy', hint: '2–3 days', mult: 0.8 },
    { id: 'standard', label: 'Standard', hint: 'next day', mult: 1 },
    { id: 'express', label: 'Express', hint: 'same day', mult: 1.6, maxKm: 300 },
    { id: 'flash', label: 'Flash', hint: '2 hours', mult: 2.6, maxKm: 40 }
  ];
  const cityOptions = sel => CITIES.map(c => `<option${c.name === sel ? ' selected' : ''}>${c.name}</option>`).join('');
  $('#qFrom').innerHTML = cityOptions('Tunis');
  $('#qTo').innerHTML = cityOptions('Sousse');
  $('#qSizes').innerHTML = SIZES.map((s, i) => `<label class="opt-card"><input type="radio" name="size" value="${s.id}" ${i === 1 ? 'checked' : ''}><span>${icon(s.icon)}${s.label}<small>${s.hint}</small></span></label>`).join('');
  $('#qSpeeds').innerHTML = SPEEDS.map((s, i) => `<label class="opt-card"><input type="radio" name="speed" value="${s.id}" ${i === 1 ? 'checked' : ''}><span>${s.label}<small>${s.hint}</small></span></label>`).join('');

  function quote({ from, to, size, weight, speed, insureValue, cod }) {
    const a = city(from), b = city(to), s = SIZES.find(x => x.id === size), sp = SPEEDS.find(x => x.id === speed);
    const dist = km(a, b);
    const base = s.base;
    const distFee = Math.max(0, dist - 10) * 0.045;
    const weightFee = Math.max(0, weight - s.incl) * s.perKg;
    const speedFee = (base + distFee + weightFee) * (sp.mult - 1);
    const insurance = insureValue ? Math.max(2, insureValue * 0.01) : 0;
    const codFee = cod ? 1.5 : 0;
    const sub = base + distFee + weightFee + speedFee + insurance + codFee;
    const vat = sub * 0.19;
    return { dist, base, distFee, weightFee, speedFee, insurance, codFee, vat, total: sub + vat, a, b, sp };
  }
  function nextWorkday(d, n) { const x = new Date(d); let k = 0; while (k < n) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0) k++; } return x; }
  function eta(speed, a, b, now = new Date()) {
    const far = b.tier === 3 || a.tier === 3;
    if (speed === 'flash') { const t = new Date(now.getTime() + 2 * 3600e3); if (now.getHours() >= 19 || now.getHours() < 8) { const d = nextWorkday(now, 1); d.setHours(10, 0); return 'Tomorrow by 10:00'; } return `Today by ${hm(t)}`; }
    if (speed === 'express') return now.getHours() < 13 ? 'Today before 20:00' : `${dayName(nextWorkday(now, 1))} before 13:00`;
    if (speed === 'standard') return `${dayName(nextWorkday(now, far ? 2 : 1))} before 18:00`;
    return `${dayName(nextWorkday(now, far ? 3 : 2))} – ${dayName(nextWorkday(now, far ? 4 : 3))}`;
  }
  const qForm = $('#quoteForm');
  function setFill(inp) { inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min) * 100) + '%'); }
  function readQuote() {
    const f = qForm.elements;
    return { from: f.from.value, to: f.to.value, size: f.size.value, weight: +f.weight.value, speed: f.speed.value, insureValue: f.insure.checked ? Math.max(0, +f.value.value || 0) : 0 };
  }
  function renderQuote() {
    const f = qForm.elements;
    const s = SIZES.find(x => x.id === f.size.value);
    const w = f.weight;
    if (+w.max !== s.max) { w.max = s.max; w.step = s.max > 30 ? 5 : 0.5; if (+w.value > s.max) w.value = s.max; if (s.id === 'pallet' && +w.value < 20) w.value = 120; }
    $('#qWeightOut').textContent = (+w.value) + ' kg';
    setFill(w);
    const dist = km(city(f.from.value), city(f.to.value));
    // disable speeds not available for this distance
    $$('input[name="speed"]', qForm).forEach(r => {
      const sp = SPEEDS.find(x => x.id === r.value);
      r.disabled = !!(sp.maxKm && dist > sp.maxKm) || (s.id === 'pallet' && sp.id === 'flash');
    });
    if (f.speed.value === '' || $(`input[name="speed"][value="${f.speed.value}"]`, qForm).disabled) { $('input[name="speed"][value="standard"]', qForm).checked = true; }
    $('#flashNote').hidden = dist <= 40;
    $('#qValueWrap').hidden = !f.insure.checked;
    const q = quote(readQuote());
    $('#qRoute').innerHTML = `${esc(q.a.name)} → ${esc(q.b.name)} · ≈ ${q.dist} km`;
    $('#qTotal').textContent = dt2(q.total);
    $('#qEta').textContent = `${q.sp.label}: ${eta(q.sp.id, q.a, q.b)}`;
    const rows = [['Base (' + s.label.toLowerCase() + ')', q.base], ['Distance', q.distFee], ['Extra weight', q.weightFee], [q.sp.label + ' speed', q.speedFee], ['Insurance', q.insurance], ['VAT 19%', q.vat]];
    $('#qBreakdown').innerHTML = rows.filter(([k, v]) => v !== 0 || k.startsWith('Base')).map(([k, v]) => `<div><dt>${k}</dt><dd>${v < 0 ? '−' + dt2(-v) : dt2(v)}</dd></div>`).join('');
  }
  qForm.addEventListener('input', renderQuote);
  qForm.addEventListener('change', renderQuote);
  $('#qSwap').addEventListener('click', () => { const f = qForm.elements; [f.from.value, f.to.value] = [f.to.value, f.from.value]; renderQuote(); });
  $('#qBook').addEventListener('click', () => {
    const q = readQuote(), f = $('#pickupForm').elements;
    f.from.value = q.from; f.to.value = q.to; f.size.value = q.size; f.weight.value = q.weight; f.speed.value = q.speed;
    updatePickupPrice(); scrollTo('pickup');
    setTimeout(() => $('#pName').focus({ preventScroll: true }), reduce ? 0 : 600);
    toast('Quote copied to the pickup form');
  });

  /* ---------- Tracking simulation ---------- */
  const STEPS = [
    { t: 0, title: 'Order created', icon: 'i-box' },
    { t: 0.1, title: 'Picked up', icon: 'i-check' },
    { t: 0.25, title: 'Sorted at {from} hub', icon: 'i-warehouse' },
    { t: 0.45, title: 'In transit to {to}', icon: 'i-truck' },
    { t: 0.8, title: 'Out for delivery', icon: 'i-bolt' },
    { t: 1, title: 'Delivered', icon: 'i-check' }
  ];
  const COURIERS = ['Walid', 'Nour', 'Aymen', 'Rania', 'Skander', 'Ines', 'Bilel'];
  const DEMOS = { 'SD-24815': ['Tunis', 'Sousse', 0.47], 'SD-77310': ['Tunis', 'Bizerte', 0.82], 'SD-10392': ['Nabeul', 'Tunis', 1] };
  let sim = null, simTimer = null;
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }
  function normalizeNum(v) { const m = /^\s*sd[\s-]?(\d{5})\s*$/i.exec(v); return m ? 'SD-' + m[1] : null; }
  function buildSim(num) {
    const pickups = store.get('swiftdrop.pickups', []);
    const p = pickups.find(x => x.ref === num);
    let from, to, progress, total;
    if (p) { from = p.from; to = p.to; progress = 0.02; }
    else if (DEMOS[num]) [from, to, progress] = DEMOS[num];
    else { const h = hash(num); from = CITIES[h % CITIES.length].name; to = CITIES[(h >> 5) % CITIES.length].name; if (to === from) to = 'Tunis'; progress = 0.15 + (h % 60) / 100; }
    const a = city(from), b = city(to), d = km(a, b);
    total = (d < 40 ? 3 : d < 200 ? 9 : 26) * 3600e3;
    const start = Date.now() - progress * total;
    return { num, from, to, a, b, progress, total, start, courier: COURIERS[hash(num) % COURIERS.length], booked: !!p };
  }
  function track(raw) {
    const msg = $('#trackMsg');
    const num = normalizeNum(raw || '');
    if (!num) { msg.textContent = raw ? 'Tracking numbers look like SD-12345 (SD followed by 5 digits).' : 'Please enter a tracking number.'; $('#tracker').hidden = true; $('#trackInput').setAttribute('aria-invalid', 'true'); return false; }
    msg.textContent = ''; $('#trackInput').setAttribute('aria-invalid', 'false');
    $('#trackInput').value = num;
    sim = buildSim(num);
    $('#tracker').hidden = false;
    $('#tNum').textContent = num;
    $('#tRoute').textContent = `${sim.from} → ${sim.to} · ${km(sim.a, sim.b)} km`;
    $('#tMap').innerHTML = routeSVG(sim);
    renderSim();
    clearInterval(simTimer);
    if (sim.progress < 1) simTimer = setInterval(() => { sim.progress = Math.min(1, sim.progress + (reduce ? 0.03 : 0.012)); renderSim(); if (sim.progress >= 1) { clearInterval(simTimer); toast(`${num} has been delivered`); } }, reduce ? 4000 : 1500);
    return true;
  }
  function routeSVG(s) {
    const [x1, y1] = P(s.a.lon, s.a.lat), [x2, y2] = P(s.b.lon, s.b.lat);
    const same = s.a === s.b;
    const mx = (x1 + x2) / 2 + (y2 - y1) * 0.25 + (same ? 30 : 0), my = (y1 + y2) / 2 - (x2 - x1) * 0.25 - (same ? 30 : 0);
    const minX = Math.min(x1, x2, mx) - 60, minY = Math.min(y1, y2, my) - 60, maxX = Math.max(x1, x2, mx) + 60, maxY = Math.max(y1, y2, my) + 60;
    const w = Math.max(maxX - minX, 160), h = Math.max(maxY - minY, 160);
    return `<svg viewBox="${minX.toFixed(0)} ${minY.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}" role="img" aria-label="Route map from ${esc(s.from)} to ${esc(s.to)}">
      ${baseMap('#ffffff', '#d6d9cf')}
      <path id="routePath" d="M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="#0b1220" stroke-width="2.5" stroke-dasharray="5 6" stroke-linecap="round"/>
      <path id="routeDone" d="M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="#ff5b2e" stroke-width="4" stroke-linecap="round"/>
      <circle cx="${x1}" cy="${y1}" r="6" fill="#0b1220"/><text x="${x1}" y="${y1 - 11}" text-anchor="middle" font-size="12" font-weight="700" fill="#0b1220" font-family="system-ui,sans-serif">${esc(s.from)}</text>
      <circle cx="${x2}" cy="${y2}" r="7" fill="#16b88f" stroke="#fff" stroke-width="2"/><text x="${x2}" y="${y2 + 22}" text-anchor="middle" font-size="12" font-weight="700" fill="#0b1220" font-family="system-ui,sans-serif">${esc(s.to)}</text>
      <g id="van"><circle r="13" fill="#ff5b2e" stroke="#fff" stroke-width="3"/><path d="M-6 -3h7v6h-7zM1 -1h3l2 2v2h-5" fill="#fff"/></g>
    </svg>`;
  }
  function renderSim() {
    const s = sim; if (!s) return;
    const idx = STEPS.reduce((acc, st, i) => s.progress >= st.t ? i : acc, 0);
    const delivered = s.progress >= 1;
    const fill = str => str.replace('{from}', s.from).replace('{to}', s.to);
    $('#tStatus').textContent = s.booked && s.progress < 0.1 ? 'Pickup scheduled' : fill(STEPS[idx].title);
    $('#tStatus').classList.toggle('done', delivered);
    $('#tLive').hidden = delivered;
    const end = new Date(s.start + s.total);
    $('#tEta').textContent = delivered ? 'Delivered ' + hm(new Date(s.start + s.total)) : (end.toDateString() === new Date().toDateString() ? 'Today ' : dayName(end) + ' ') + hm(end);
    $('#tBar').style.width = (s.progress * 100).toFixed(1) + '%';
    $('#tProgress').setAttribute('aria-valuenow', Math.round(s.progress * 100));
    $('#tTimeline').innerHTML = STEPS.map((st, i) => {
      const when = new Date(s.start + st.t * s.total);
      const cls = delivered || i < idx ? 'done' : i === idx ? 'current' : '';
      const meta = cls ? `${dayName(when)}, ${hm(when)}` : `Expected ~${hm(when)}`;
      return `<li class="${cls}"><span class="tl-dot">${icon(st.icon)}</span><div><span class="tl-title">${esc(fill(st.title))}</span><span class="tl-meta">${meta}${i === 4 && cls ? ' · courier ' + s.courier : ''}</span></div></li>`;
    }).join('');
    $('#tCourier').textContent = delivered ? `Signed for at the door. Thank you for shipping with SwiftDrop.` : `Your courier ${s.courier} will call before arriving. Keep your phone nearby.`;
    // van along route between hub departure (0.25) and arrival (0.8)
    const path = $('#routePath'), van = $('#van'), done = $('#routeDone');
    if (path && van) {
      const L = path.getTotalLength();
      const f = Math.min(1, Math.max(0, (s.progress - 0.25) / 0.55));
      const pt = path.getPointAtLength(L * f);
      van.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      done.setAttribute('stroke-dasharray', `${(L * f).toFixed(1)} ${L.toFixed(1)}`);
    }
  }
  $('#trackForm').addEventListener('submit', e => { e.preventDefault(); track($('#trackInput').value); });
  $('#heroTrack').addEventListener('submit', e => { e.preventDefault(); const v = $('#heroTrackInput').value; $('#trackInput').value = v; track(v); scrollTo('track'); });
  document.addEventListener('click', e => { const d = e.target.closest('[data-demo]'); if (d) { $('#trackInput').value = d.dataset.demo; track(d.dataset.demo); if (!d.closest('#track')) scrollTo('track'); } });
  $('#tNotify').addEventListener('click', e => {
    const subs = store.get('swiftdrop.sms', []);
    if (!sim) return;
    if (!subs.includes(sim.num)) { subs.push(sim.num); store.set('swiftdrop.sms', subs); }
    e.currentTarget.textContent = '✓ SMS alerts on'; toast(`We’ll text you each time ${sim.num} moves.`);
  });

  /* ---------- Coverage ---------- */
  const tierText = { 1: 'Same-day & Flash', 2: 'Next day', 3: '48 hours' };
  const tierColor = { 1: '#ffd23f', 2: '#16b88f', 3: '#8ea2c8' };
  $('#cityList').innerHTML = CITIES.map(c => `<option value="${c.name}">`).join('');
  function covMap(hit) {
    return `<svg viewBox="0 0 290 550" role="img" aria-labelledby="covMapT"><title id="covMapT">Illustrative map of SwiftDrop coverage across Tunisia, with ${CITIES.filter(c => c.hub).length} hubs</title>
      ${baseMap('rgba(255,255,255,.06)', 'rgba(255,255,255,.28)')}
      ${CITIES.filter(c => c.hub && c.name !== 'Tunis').map(c => { const [x, y] = P(c.lon, c.lat), [tx, ty] = P(10.18, 36.81); return `<path d="M${tx} ${ty}L${x} ${y}" stroke="rgba(255,255,255,.14)" stroke-width="1.2"/>`; }).join('')}
      ${CITIES.map(c => { const [x, y] = P(c.lon, c.lat); const isHit = hit && hit.name === c.name; return `${c.hub ? `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${tierColor[c.tier]}" stroke-opacity=".5"/>` : ''}<circle class="city-dot${isHit ? ' hit' : ''}" cx="${x}" cy="${y}" r="${isHit ? 8 : 4.5}" fill="${tierColor[c.tier]}"/>${isHit ? `<text x="${x > 200 ? x - 14 : x + 14}" y="${y + 4}" text-anchor="${x > 200 ? 'end' : 'start'}" font-size="14" font-weight="800" fill="#fff" stroke="#131d35" stroke-width="4" paint-order="stroke" font-family="system-ui,sans-serif">${esc(c.name)}</text>` : ''}`; }).join('')}
    </svg>`;
  }
  $('#covMap').innerHTML = covMap(null);
  $('#covForm').addEventListener('submit', e => {
    e.preventDefault();
    const raw = $('#covInput').value.trim(), out = $('#covResult');
    if (!raw) { out.innerHTML = '<p class="form-msg" style="color:#ffb4a6">Type a city or town name.</p>'; $('#covInput').focus(); return; }
    const c = CITIES.find(x => norm(x.name) === norm(raw)) || CITIES.find(x => norm(x.name).startsWith(norm(raw)) && norm(raw).length >= 3);
    $('#covMap').innerHTML = covMap(c || null);
    if (c) {
      const hubs = CITIES.filter(x => x.hub).sort((p, q) => km(c, p) - km(c, q));
      const hub = hubs[0];
      out.innerHTML = `<div class="cov-card"><h3><span class="ok">${icon('i-check')}</span>Yes, we deliver to ${esc(c.name)}</h3>
        <ul><li><span>Fastest delivery</span><span>${tierText[c.tier]}</span></li>
        <li><span>Flash (2 h)</span><span>${c.tier === 1 ? 'Available' : '—'}</span></li>
        <li><span>Cash-on-delivery</span><span>Available</span></li>
        <li><span>Nearest hub</span><span>${esc(hub.name)}${hub === c ? '' : ' · ' + km(c, hub) + ' km'}</span></li></ul></div>`;
    } else {
      out.innerHTML = `<div class="cov-card"><h3>Not in ${esc(raw)} yet</h3><p class="muted" style="margin:0">We’re opening new delegations every month. Leave your email and we’ll tell you the day we arrive.</p>
        <form id="waitForm" novalidate><label for="waitEmail" class="sr-only">Email</label><input id="waitEmail" type="email" placeholder="you@example.com" autocomplete="email" required><button class="btn btn--dark btn--sm" type="submit">Notify me</button></form><p class="err" id="waitErr" role="alert"></p></div>`;
      $('#waitForm').addEventListener('submit', ev => {
        ev.preventDefault();
        const v = $('#waitEmail').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { $('#waitErr').textContent = 'Enter a valid email address.'; $('#waitEmail').focus(); return; }
        const list = store.get('swiftdrop.waitlist', []); list.push({ email: v, city: raw, at: new Date().toISOString() }); store.set('swiftdrop.waitlist', list);
        ev.target.outerHTML = `<p style="margin:.8rem 0 0;font-weight:700;color:#0b6b53">✓ Thanks! We’ll email ${esc(v)} when SwiftDrop reaches ${esc(raw)}.</p>`;
        $('#waitErr').textContent = '';
      });
    }
  });

  /* ---------- Pricing toggle ---------- */
  $$('input[name="billing"]').forEach(r => r.addEventListener('change', () => {
    const yearly = r.value === 'year' && r.checked;
    $$('[data-price]').forEach(el => {
      const p = +el.dataset.price;
      el.textContent = yearly ? Math.round(p * 0.85) : p;
      el.nextSibling.textContent = ' DT';
      el.parentElement.querySelector('span').textContent = yearly && p ? '/ month, billed yearly' : '/ month';
    });
  }));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-plan]'); if (!b) return;
    const notes = $('#pNotes'); notes.value = `Interested in the ${b.dataset.plan} plan.` + (notes.value ? ' ' + notes.value : '');
    toast(`${b.dataset.plan} plan noted — book your first pickup below.`);
  });

  /* ---------- Pickup form ---------- */
  const pForm = $('#pickupForm');
  $('#pFrom').innerHTML = cityOptions('Tunis');
  $('#pTo').innerHTML = cityOptions('Sfax');
  $('#pSize').innerHTML = SIZES.map(s => `<option value="${s.id}"${s.id === 'small' ? ' selected' : ''}>${s.label} (${s.hint})</option>`).join('');
  $('#pSpeed').innerHTML = SPEEDS.map(s => `<option value="${s.id}"${s.id === 'standard' ? ' selected' : ''}>${s.label} — ${s.hint}</option>`).join('');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  $('#pDate').min = todayISO();
  $('#pDate').value = new Date().getHours() >= 17 ? (() => { const d = nextWorkday(new Date(), 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })() : todayISO();
  const saved = store.get('swiftdrop.sender', null);
  if (saved) ['name', 'phone', 'address'].forEach(k => { if (saved[k]) pForm.elements[k].value = saved[k]; });
  function pickupQuote() {
    const f = pForm.elements;
    const s = SIZES.find(x => x.id === f.size.value);
    const dist = km(city(f.from.value), city(f.to.value));
    let speed = f.speed.value;
    const sp = SPEEDS.find(x => x.id === speed);
    if (sp.maxKm && dist > sp.maxKm) speed = 'standard';
    return { q: quote({ from: f.from.value, to: f.to.value, size: s.id, weight: Math.min(s.max, Math.max(0.1, +f.weight.value || 0.1)), speed, insureValue: 0, cod: +f.cod.value > 0 }), speed, downgraded: speed !== f.speed.value };
  }
  function updatePickupPrice() {
    const { q, downgraded } = pickupQuote();
    $('#pPrice').textContent = dt2(q.total);
    const errEl = $('#pSpeed').closest('.field').querySelector('.err');
    errEl.textContent = downgraded ? `${SPEEDS.find(x => x.id === pForm.elements.speed.value).label} isn’t available for ${q.dist} km — Standard will be used.` : '';
  }
  pForm.addEventListener('input', updatePickupPrice);
  pForm.addEventListener('change', updatePickupPrice);

  const rules = {
    phone: v => /^[2-9]\d{7}$/.test(v.replace(/\D/g, '').replace(/^216(?=\d{8}$)/, '')) ? '' : 'Enter a valid Tunisian mobile number (8 digits).',
    weight: (v, f) => { const s = SIZES.find(x => x.id === pForm.elements.size.value); const n = +v; return n > 0 && n <= s.max ? '' : `Weight must be between 0.1 and ${s.max} kg for a ${s.label.toLowerCase()} parcel.`; },
    date: v => v && v >= todayISO() ? '' : 'Choose today or a later date.',
    cod: v => !v || (+v >= 0 && +v <= 5000) ? '' : 'Cash on delivery is limited to 5,000 DT.'
  };
  function validateField(f) {
    const wrap = f.closest('.field'); if (!wrap) return true;
    const v = f.value.trim(); let msg = '';
    if (f.required && !v) msg = 'This field is required.';
    else if (f.dataset.rule) msg = rules[f.dataset.rule](v, f);
    wrap.classList.toggle('invalid', !!msg);
    f.setAttribute('aria-invalid', String(!!msg));
    const err = $('.err', wrap);
    if (err && f.id !== 'pSpeed') { if (!err.id) err.id = f.id + '-err'; err.textContent = msg; f.setAttribute('aria-describedby', err.id); }
    return !msg;
  }
  pForm.addEventListener('focusout', e => { if (e.target.matches('input, select') && e.target.value) validateField(e.target); });
  pForm.addEventListener('input', e => { if (e.target.closest('.field.invalid')) validateField(e.target); });
  pForm.addEventListener('submit', e => {
    e.preventDefault();
    const fields = $$('input:not([type=checkbox]), select', pForm).filter(f => f.id !== 'pSpeed');
    const bad = fields.filter(f => !validateField(f));
    const terms = $('#pTerms');
    $('#pTermsErr').textContent = terms.checked ? '' : 'Please confirm the parcel contents.';
    if (bad.length) { bad[0].focus(); return; }
    if (!terms.checked) { terms.focus(); return; }
    const f = pForm.elements;
    const { q, speed } = pickupQuote();
    let ref; do { ref = 'SD-' + (30000 + Math.floor(Math.random() * 69999)); } while (DEMOS[ref]);
    const rec = { ref, name: f.name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim(), from: f.from.value, to: f.to.value, size: f.size.value, weight: +f.weight.value, date: f.date.value, slot: f.slot.value, speed, cod: +f.cod.value || 0, notes: f.notes.value.trim(), price: +q.total.toFixed(2), at: new Date().toISOString() };
    const list = store.get('swiftdrop.pickups', []); list.push(rec); store.set('swiftdrop.pickups', list);
    store.set('swiftdrop.sender', { name: rec.name, phone: rec.phone, address: rec.address });
    const when = rec.date === todayISO() ? 'today' : new Date(rec.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#pickupSuccessText').textContent = `A courier will collect your parcel in ${rec.from} ${when}, ${rec.slot}. Total ${dt2(rec.price)}${rec.cod ? `, and we’ll collect ${dt(rec.cod)} from the recipient` : ''}.`;
    $('#pRef').textContent = ref;
    $('#pickupSuccess').hidden = false; $('#pickupSuccess').focus();
  });
  $('#pTrackIt').addEventListener('click', () => { const ref = $('#pRef').textContent; $('#trackInput').value = ref; track(ref); scrollTo('track'); });
  $('#pAnother').addEventListener('click', () => { $('#pickupSuccess').hidden = true; pForm.elements.notes.value = ''; pForm.elements.cod.value = ''; $('#pTerms').checked = false; $('#pName').focus(); });

  /* ---------- Init ---------- */
  renderQuote(); updatePickupPrice();
})();
