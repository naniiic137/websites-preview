/* Maison Lina — vanilla JS: service menu & price list, stylist booking engine, gallery lightbox,
   loyalty stamp card and gift-card builder. Everything is stored in localStorage (demo, no backend). */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full / blocked */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = n => String(n).padStart(2, '0');
  const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const dt = n => n.toLocaleString('en-US') + ' DT';
  const durTxt = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) : '');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const longDate = s => fromIso(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = s => fromIso(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const scrollToEl = el => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  const icon = id => `<svg class="ic" aria-hidden="true"><use href="#${id}"/></svg>`;
  const code = n => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < n; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- Data ---------- */
  const SALON_HOURS = { 0: [600, 960], 2: [540, 1200], 3: [540, 1200], 4: [540, 1200], 5: [540, 1200], 6: [540, 1200] }; // minutes, Monday closed

  const SERVICES = [
    { id: 'b-cut', cat: 'barber', name: 'Classic cut', desc: 'Scissor or clipper cut, wash and styling.', dur: 30, price: 25 },
    { id: 'b-fade', cat: 'barber', name: 'Skin fade', desc: 'Zero-blend fade with a sharp, detailed finish.', dur: 45, price: 30 },
    { id: 'b-beard', cat: 'barber', name: 'Beard sculpt & line-up', desc: 'Shape, razor edges and beard oil.', dur: 30, price: 15 },
    { id: 'b-shave', cat: 'barber', name: 'Hot-towel shave', desc: 'Traditional straight-razor shave, three hot towels.', dur: 45, price: 25 },
    { id: 'b-combo', cat: 'barber', name: 'Cut & beard', desc: 'Our most booked: any cut plus a full beard sculpt.', dur: 60, price: 38 },
    { id: 'b-kids', cat: 'barber', name: 'Kids cut (under 12)', desc: 'Patient hands and a lollipop at the end.', dur: 30, price: 18 },
    { id: 'b-facial', cat: 'barber', name: 'Grooming facial', desc: 'Deep cleanse, steam and clay mask for men.', dur: 45, price: 45 },
    { id: 'h-cut', cat: 'hair', name: 'Cut & finish', desc: 'Consultation, wash, precision cut and blow-dry.', dur: 60, price: 45 },
    { id: 'h-blow', cat: 'hair', name: 'Blow-dry & styling', desc: 'Smooth, bouncy or beach waves — lasts for days.', dur: 45, price: 30 },
    { id: 'h-colour', cat: 'hair', name: 'Root colour', desc: 'Ammonia-free colour, gloss and blow-dry.', dur: 90, price: 90 },
    { id: 'h-balayage', cat: 'hair', name: 'Balayage', desc: 'Hand-painted, sun-kissed lightness with toner.', dur: 180, price: 220 },
    { id: 'h-keratin', cat: 'hair', name: 'Keratin smoothing', desc: 'Frizz-free, glossy hair for up to four months.', dur: 150, price: 250 },
    { id: 'h-bridal', cat: 'hair', name: 'Bridal hair', desc: 'Trial session included, pins and veil fitting.', dur: 120, price: 300 },
    { id: 'y-mani', cat: 'beauty', name: 'Gel manicure', desc: 'Shape, cuticle care and long-wear gel colour.', dur: 45, price: 35 },
    { id: 'y-pedi', cat: 'beauty', name: 'Spa pedicure', desc: 'Soak, scrub, massage and polish.', dur: 60, price: 45 },
    { id: 'y-brows', cat: 'beauty', name: 'Brow shaping & tint', desc: 'Thread or wax, then a tint to frame the face.', dur: 30, price: 20 },
    { id: 'y-facial', cat: 'beauty', name: 'Signature facial', desc: 'Cleanse, exfoliation, mask and a face massage.', dur: 60, price: 70 },
    { id: 'y-hammam', cat: 'beauty', name: 'Hammam ritual', desc: 'Black soap, kessa scrub, rhassoul wrap and orange-blossom mist.', dur: 90, price: 95 }
  ];
  const svc = id => SERVICES.find(s => s.id === id);
  const CATS = { barber: 'Barber', hair: 'Hair', beauty: 'Beauty & rituals' };

  const STYLISTS = [
    { id: 'lina', name: 'Lina Ben Salah', first: 'Lina', role: 'Founder · Colour director', img: 'team-lina.webp', alt: 'Portrait of Lina Ben Salah, smiling, hair up',
      bio: 'Fifteen years of colour, trained in Paris. Lina is the one to see for balayage and colour correction.',
      tags: ['Balayage', 'Colour correction', 'Bridal'], days: { 2: [540, 1080], 3: [540, 1080], 4: [540, 1080], 5: [540, 1080], 6: [540, 1020] }, brk: [780, 840],
      services: ['h-cut', 'h-blow', 'h-colour', 'h-balayage', 'h-keratin', 'h-bridal'] },
    { id: 'karim', name: 'Karim Jaziri', first: 'Karim', role: 'Master barber', img: 'team-karim.webp', alt: 'Portrait of Karim Jaziri, bearded and smiling',
      bio: 'Fades so clean they look airbrushed. Karim also runs our Saturday barber workshop.',
      tags: ['Skin fades', 'Beard design', 'Hot-towel shave'], days: { 2: [660, 1200], 3: [660, 1200], 4: [660, 1200], 5: [660, 1200], 6: [660, 1200] }, brk: [900, 930],
      services: ['b-cut', 'b-fade', 'b-beard', 'b-shave', 'b-combo', 'b-kids'] },
    { id: 'yasmine', name: 'Yasmine Trabelsi', first: 'Yasmine', role: 'Nails, brows & rituals', img: 'team-yasmine.webp', alt: 'Portrait of Yasmine Trabelsi with long curly hair, smiling',
      bio: 'Gel nails that last three weeks and a hammam ritual inspired by her grandmother in Nabeul.',
      tags: ['Gel nails', 'Brows', 'Hammam ritual'], days: { 0: [600, 960], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [600, 1140] }, brk: [810, 870],
      services: ['y-mani', 'y-pedi', 'y-brows', 'y-facial', 'y-hammam', 'h-blow'] },
    { id: 'slim', name: 'Slim Haddad', first: 'Slim', role: 'Barber & grooming', img: 'team-slim.webp', alt: 'Portrait of Slim Haddad with a grey-streaked beard, smiling',
      bio: 'Old-school barbering with a calm hand — the Sunday regular’s favourite, and great with kids.',
      tags: ['Classic cuts', 'Shaves', 'Grooming facial'], days: { 0: [600, 960], 4: [540, 1020], 5: [540, 1020], 6: [540, 1020] }, brk: [780, 810],
      services: ['b-cut', 'b-beard', 'b-shave', 'b-combo', 'b-kids', 'b-facial'] }
  ];
  const stylistById = id => STYLISTS.find(s => s.id === id);
  const offeredBy = sid => STYLISTS.filter(s => s.services.includes(sid));
  const dayRange = days => {
    const order = [2, 3, 4, 5, 6, 0], on = order.filter(d => days[d]);
    const short = d => DAYS[d].slice(0, 3);
    // collapse consecutive days in salon week order
    const groups = []; let g = [];
    order.forEach(d => { if (days[d]) g.push(d); else if (g.length) { groups.push(g); g = []; } });
    if (g.length) groups.push(g);
    return on.length ? groups.map(x => x.length > 2 ? short(x[0]) + '–' + short(x[x.length - 1]) : x.map(short).join(', ')).join(', ') : '';
  };

  /* ---------- Header + mobile nav ---------- */
  const header = $('.site-header'), nav = $('#mainNav'), menuBtn = $('#menuToggle');
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
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Opening hours + status ---------- */
  function nowMin() { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  function renderHours() {
    const today = new Date().getDay();
    const order = [1, 2, 3, 4, 5, 6, 0];
    $('#hoursTable tbody').innerHTML = order.map(d => {
      const h = SALON_HOURS[d];
      return `<tr${d === today ? ' class="today" aria-current="date"' : ''}><th scope="row">${DAYS[d]}${d === today ? ' <span class="tag">Today</span>' : ''}</th><td>${h ? hhmm(h[0]) + ' – ' + hhmm(h[1]) : 'Closed'}</td></tr>`;
    }).join('');
    const h = SALON_HOURS[today], m = nowMin();
    let txt, open = false;
    if (h && m >= h[0] && m < h[1]) { open = true; txt = 'Open now · until ' + hhmm(h[1]); }
    else {
      let d = today, add = 0;
      if (h && m < h[0]) txt = 'Closed now · opens today at ' + hhmm(h[0]);
      else {
        do { d = (d + 1) % 7; add++; } while (!SALON_HOURS[d]);
        txt = 'Closed now · opens ' + (add === 1 ? 'tomorrow' : DAYS[d]) + ' at ' + hhmm(SALON_HOURS[d][0]);
      }
    }
    $('#openStatus').textContent = txt;
    $('#openDot').classList.toggle('open', open);
  }
  renderHours();

  /* ---------- Service menu + price list ---------- */
  let curCat = 'barber';
  function renderMenu() {
    $('#svcList').innerHTML = SERVICES.filter(s => s.cat === curCat).map(s => {
      const who = offeredBy(s.id).map(x => x.first).join(' & ');
      return `<li class="svc">
        <div class="svc-main"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p><p class="svc-who">with ${esc(who)}</p></div>
        <div class="svc-meta"><span class="svc-dur">${icon('i-clock')}${durTxt(s.dur)}</span><strong class="svc-price">${dt(s.price)}</strong>
        <button type="button" class="btn btn-line btn-xs" data-book="${s.id}">Book <span class="sr-only">${esc(s.name)}</span></button></div>
      </li>`;
    }).join('');
  }
  const tabs = $$('#svcTabs [role=tab]');
  function selectTab(tab, focus) {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    curCat = tab.dataset.cat;
    $('#panel-services').setAttribute('aria-labelledby', tab.id);
    renderMenu();
    if (focus) tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const k = e.key; let j = null;
      if (k === 'ArrowRight') j = (i + 1) % tabs.length; else if (k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (k === 'Home') j = 0; else if (k === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });
  renderMenu();

  $('#plCols').innerHTML = Object.keys(CATS).map(c => `<section class="pl-col"><h4>${CATS[c]}</h4><ul>${
    SERVICES.filter(s => s.cat === c).map(s => `<li><span>${esc(s.name)}</span><i aria-hidden="true"></i><small>${durTxt(s.dur)}</small><b>${s.price}</b></li>`).join('')
  }</ul></section>`).join('');
  const plBtn = $('#showPriceList');
  plBtn.addEventListener('click', () => {
    const open = $('#priceList').hidden;
    $('#priceList').hidden = !open;
    plBtn.setAttribute('aria-expanded', String(open));
    plBtn.lastChild.textContent = open ? ' Hide price list' : ' Full price list';
    if (open) scrollToEl($('#priceList'));
  });
  function printWith(cls) {
    document.body.classList.add(cls);
    const done = () => { document.body.classList.remove(cls); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
  }
  $('#printPrices').addEventListener('click', () => printWith('print-prices'));

  /* ---------- Booking engine ---------- */
  const BK = 'maisonlina.bookings';
  const getBookings = () => store.get(BK, []);
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function hoursFor(st, dateStr) { const d = fromIso(dateStr).getDay(); return SALON_HOURS[d] ? st.days[d] || null : null; }
  // Busy intervals: break + deterministic "existing clients" (simulated) + bookings saved in this browser
  function busyFor(st, dateStr, ignoreRef) {
    const h = hoursFor(st, dateStr); if (!h) return [];
    const busy = [{ s: st.brk[0], e: st.brk[1], why: 'break' }];
    let r = hash(st.id + dateStr);
    const n = 2 + (r % 3);
    for (let i = 0; i < n; i++) {
      r = Math.imul(r ^ (r >>> 13), 2654435761) >>> 0;
      const slots = (h[1] - h[0]) / 30;
      const start = h[0] + (r % slots) * 30, len = [30, 45, 60, 90][(r >>> 8) % 4];
      busy.push({ s: start, e: Math.min(start + len, h[1]), why: 'client' });
    }
    getBookings().forEach(b => { if (b.stylist === st.id && b.date === dateStr && b.ref !== ignoreRef) busy.push({ s: b.start, e: b.start + b.dur, why: 'you' }); });
    return busy;
  }
  // Returns [{t, state: 'free'|'taken'|'short'}] for 30-min start times; past times today are dropped.
  function slotsFor(st, dateStr, dur) {
    const h = hoursFor(st, dateStr); if (!h) return [];
    const busy = busyFor(st, dateStr);
    const isToday = dateStr === iso(new Date()), cut = nowMin() + 30;
    const out = [];
    for (let t = h[0]; t + 30 <= h[1]; t += 30) {
      if (isToday && t < cut) continue;
      let state = 'free';
      if (busy.some(b => t >= b.s && t < b.e)) state = 'taken';
      else if (t + dur > h[1] || busy.some(b => t < b.e && t + dur > b.s)) state = 'short';
      out.push({ t, state });
    }
    return out;
  }

  const state = { step: 1, max: 1, stylist: null, services: [], date: null, start: null, wantStart: null };
  const dur = () => state.services.reduce((a, id) => a + svc(id).dur, 0);
  const price = () => state.services.reduce((a, id) => a + svc(id).price, 0);

  // Step 1: stylists
  function renderStylists() {
    const pre = state.services[0] ? svc(state.services[0]) : null;
    $('#stylistGrid').innerHTML = STYLISTS.map(st => {
      const note = pre && !st.services.includes(pre.id) ? `<span class="st-note">Doesn’t offer ${esc(pre.name)}</span>` : '';
      return `<label class="stylist-opt">
        <input type="radio" name="stylist" value="${st.id}"${state.stylist === st.id ? ' checked' : ''}>
        <span class="st-card"><img src="assets/img/${st.img}" width="600" height="750" alt="" loading="lazy">
        <span class="st-txt"><strong>${esc(st.name)}</strong><small>${esc(st.role)}</small><em>${dayRange(st.days)}</em>${note}</span></span>
      </label>`;
    }).join('');
  }
  $('#stylistGrid').addEventListener('change', e => {
    if (e.target.name !== 'stylist') return;
    chooseStylist(e.target.value);
  });
  function chooseStylist(id) {
    const st = stylistById(id);
    state.stylist = id;
    state.services = state.services.filter(s => st.services.includes(s));
    state.start = null;
    if (state.date && !hoursFor(st, state.date)) state.date = null;
    renderServicesPick(); update();
  }

  // Step 2: services
  function renderServicesPick() {
    const st = stylistById(state.stylist); if (!st) return;
    $('#svcHint').textContent = `${st.first} offers ${st.services.length} services. Combine as many as you like — up to 4 hours.`;
    $('#svcPicks').innerHTML = st.services.map(id => {
      const s = svc(id);
      return `<label class="svc-pick"><input type="checkbox" value="${s.id}"${state.services.includes(s.id) ? ' checked' : ''}>
        <span><strong>${esc(s.name)}</strong><small>${durTxt(s.dur)}</small><b>${dt(s.price)}</b></span></label>`;
    }).join('');
  }
  $('#svcPicks').addEventListener('change', e => {
    const id = e.target.value;
    if (e.target.checked) {
      if (dur() + svc(id).dur > 240) { e.target.checked = false; $('#svcError').textContent = 'That would go over 4 hours — please book a second appointment for the rest.'; return; }
      state.services.push(id);
    } else state.services = state.services.filter(x => x !== id);
    $('#svcError').textContent = '';
    state.start = null;
    update();
  });

  // Step 3: date + slots
  function upcomingDays() { const out = [], d = new Date(); for (let i = 0; i < 21; i++) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i); out.push(iso(x)); } return out; }
  function dayStatus(st, ds) {
    const d = fromIso(ds).getDay();
    if (!SALON_HOURS[d]) return 'Closed';
    if (!st.days[d]) return 'Off';
    return slotsFor(st, ds, dur()).some(s => s.state === 'free') ? '' : 'Full';
  }
  function renderDates() {
    const st = stylistById(state.stylist);
    const days = upcomingDays();
    if (!state.date || dayStatus(st, state.date)) state.date = days.find(ds => !dayStatus(st, ds)) || null;
    $('#dateStrip').innerHTML = days.map((ds, i) => {
      const status = dayStatus(st, ds), d = fromIso(ds), on = ds === state.date;
      const label = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-GB', { weekday: 'short' });
      return `<button type="button" role="radio" class="day" data-date="${ds}" aria-checked="${on}" tabindex="${on ? 0 : -1}"${status ? ' disabled' : ''}
        aria-label="${longDate(ds)}${status ? ' — ' + status : ''}"><small>${label}</small><strong>${d.getDate()}</strong><em>${status || d.toLocaleDateString('en-GB', { month: 'short' })}</em></button>`;
    }).join('');
    renderSlots();
  }
  $('#dateStrip').addEventListener('click', e => {
    const b = e.target.closest('.day'); if (!b || b.disabled) return;
    state.date = b.dataset.date; state.start = null;
    $$('.day', $('#dateStrip')).forEach(x => { const on = x === b; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
    renderSlots(); update(true);
  });
  $('#dateStrip').addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const all = $$('.day:not([disabled])', $('#dateStrip')); const i = all.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); const n = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length]; n.focus(); n.click();
  });
  function renderSlots() {
    const st = stylistById(state.stylist), wrap = $('#slots');
    if (!st || !state.date) { wrap.innerHTML = '<p class="no-slots">No free days in the next three weeks for this combination — try fewer services or another stylist.</p>'; $('#slotHint').textContent = ''; return; }
    const list = slotsFor(st, state.date, dur());
    if (state.wantStart != null) { const w = list.find(s => s.t === state.wantStart && s.state === 'free'); if (w) state.start = w.t; state.wantStart = null; }
    const free = list.filter(s => s.state === 'free').length;
    $('#slotHint').textContent = `${longDate(state.date)} · ${free} start time${free === 1 ? '' : 's'} for ${durTxt(dur())} with ${st.first}.`;
    const groups = [['Morning', 0, 720], ['Afternoon', 720, 1020], ['Evening', 1020, 1440]];
    wrap.innerHTML = groups.map(([name, a, b]) => {
      const g = list.filter(s => s.t >= a && s.t < b); if (!g.length) return '';
      return `<div class="slot-group"><p>${name}</p><div class="slot-row">${g.map(s => {
        const why = s.state === 'taken' ? 'booked' : s.state === 'short' ? 'not enough time' : 'available';
        const tag = s.state === 'short' ? '<small>too short</small>' : s.state === 'taken' ? '<small>booked</small>' : '';
        return `<button type="button" class="slot ${s.state}" data-t="${s.t}" aria-pressed="${state.start === s.t}"${s.state !== 'free' ? ' disabled' : ''} aria-label="${hhmm(s.t)}, ${why}"><span class="slot-t">${hhmm(s.t)}</span>${tag}</button>`;
      }).join('')}</div></div>`;
    }).join('') || '<p class="no-slots">No start times left today.</p>';
  }
  $('#slots').addEventListener('click', e => {
    const b = e.target.closest('.slot'); if (!b || b.disabled) return;
    state.start = +b.dataset.t;
    $$('.slot', $('#slots')).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    update(true);
  });

  // Stepper + summary
  const panels = $$('[data-panel]'), stepBtns = $$('#stepper button');
  const nextBtn = $('#nextStep'), prevBtn = $('#prevStep');
  function canLeave(step) {
    if (step === 1) return !!state.stylist;
    if (step === 2) return state.services.length > 0;
    if (step === 3) return state.start != null;
    return true;
  }
  function update(keepFocus) {
    // max reachable step
    let max = 1; while (max < 4 && canLeave(max)) max++;
    state.max = max;
    if (state.step > max) state.step = max;
    stepBtns.forEach(b => {
      const n = +b.dataset.step;
      b.disabled = n > max;
      if (n === state.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.parentElement.classList.toggle('done', n < state.step);
    });
    panels.forEach(p => { p.hidden = +p.dataset.panel !== state.step; });
    prevBtn.hidden = state.step === 1;
    nextBtn.textContent = state.step === 4 ? 'Confirm booking · ' + dt(price()) : 'Continue';
    nextBtn.disabled = state.step < 4 && !canLeave(state.step);
    // summary
    const st = stylistById(state.stylist);
    $('#sumStylist').textContent = st ? st.name : '—';
    $('#sumServices').innerHTML = state.services.length ? state.services.map(id => `<span>${esc(svc(id).name)} <small>${dt(svc(id).price)}</small></span>`).join('') : '—';
    $('#sumWhen').textContent = state.date && state.start != null ? shortDate(state.date) + ' · ' + hhmm(state.start) + '–' + hhmm(state.start + dur()) : state.date && state.step >= 3 ? shortDate(state.date) : '—';
    $('#sumDur').textContent = durTxt(dur()).replace(/^0 min$/, '0 min');
    $('#sumTotal').textContent = dt(price());
    if (!keepFocus) { /* no-op: focus handled in goTo */ }
  }
  function goTo(n) {
    state.step = n;
    if (n === 3) renderDates();
    update();
    const p = panels.find(x => +x.dataset.panel === n);
    const t = p.querySelector('.step-title') || p;
    t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
    const card = $('#bookCard');
    if (card.getBoundingClientRect().top < 0) scrollToEl(card);
  }
  stepBtns.forEach(b => b.addEventListener('click', () => { if (!b.disabled) goTo(+b.dataset.step); }));
  prevBtn.addEventListener('click', () => goTo(Math.max(1, state.step - 1)));
  nextBtn.addEventListener('click', () => {
    if (state.step < 4) { if (canLeave(state.step)) goTo(state.step + 1); }
    else submitBooking();
  });

  // Step 4: client form
  const form = $('#clientForm');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const normPhone = v => v.replace(/\D/g, '').replace(/^216(?=\d{8}$)/, '');
  const rules = {
    name: v => v.trim().length >= 2 ? '' : 'Please enter your name.',
    phone: v => /^[2-9]\d{7}$/.test(normPhone(v)) ? '' : 'Enter a valid Tunisian number: 8 digits, e.g. 22 123 456.',
    email: v => !v.trim() || emailRe.test(v.trim()) ? '' : 'That email doesn’t look right.',
    policy: (v, el) => el.checked ? '' : 'Please confirm you’ve read the cancellation policy.'
  };
  function check(el) {
    const rule = rules[el.name]; if (!rule) return true;
    const msg = rule(el.value, el);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    const err = $('#' + el.id + '-err'); if (err) err.textContent = msg;
    const f = el.closest('.field'); if (f) f.classList.toggle('invalid', !!msg);
    return !msg;
  }
  $$('input, textarea', form).forEach(el => {
    el.addEventListener('blur', () => { if (el.value && el.type !== 'checkbox') check(el); });
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => { if (el.getAttribute('aria-invalid') === 'true') check(el); });
  });
  form.addEventListener('submit', e => { e.preventDefault(); submitBooking(); });
  const saved = store.get('maisonlina.client', null);
  if (saved) { form.name.value = saved.name || ''; form.phone.value = saved.phone || ''; form.email.value = saved.email || ''; }

  function submitBooking() {
    let bad = null;
    ['name', 'phone', 'email', 'policy'].forEach(n => { if (!check(form.elements[n]) && !bad) bad = form.elements[n]; });
    if (bad) { bad.focus(); return; }
    const st = stylistById(state.stylist);
    // re-check the slot is still free (another tab could have booked it)
    const still = slotsFor(st, state.date, dur()).find(s => s.t === state.start && s.state === 'free');
    if (!still) { toast('Sorry — that time was just taken. Please pick another.'); state.start = null; goTo(3); return; }
    const rec = {
      ref: 'ML-' + code(5), stylist: st.id, services: state.services.slice(), date: state.date, start: state.start, dur: dur(), price: price(),
      name: form.name.value.trim(), phone: '+216 ' + normPhone(form.phone.value).replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3'),
      email: form.email.value.trim(), notes: form.notes.value.trim(), created: new Date().toISOString()
    };
    const all = getBookings(); all.push(rec); store.set(BK, all);
    store.set('maisonlina.client', { name: rec.name, phone: form.phone.value.trim(), email: rec.email });
    const stampMsg = addStamp(rec.ref);
    showConfirm(rec, stampMsg);
    renderAppts(); renderNext();
  }

  function icsFor(b) {
    const d = b.date.replace(/-/g, ''), t = m => pad(Math.floor(m / 60)) + pad(m % 60) + '00';
    const names = b.services.map(id => svc(id).name).join(' + ');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maison Lina//Booking//EN', 'BEGIN:VEVENT', 'UID:' + b.ref + '@maisonlina.example', 'DTSTAMP:' + stamp,
      'DTSTART:' + d + 'T' + t(b.start), 'DTEND:' + d + 'T' + t(b.start + b.dur), 'SUMMARY:Maison Lina — ' + names,
      'DESCRIPTION:With ' + stylistById(b.stylist).name + '. Ref ' + b.ref + '. Total ' + b.price + ' DT.', 'LOCATION:12 Rue du Lac Léman\\, La Marsa', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  let icsUrl = null;
  function showConfirm(b, stampMsg) {
    const st = stylistById(b.stylist);
    $('#cfName').textContent = b.name.split(' ')[0];
    $('#cfRef').textContent = b.ref;
    $('#cfLines').innerHTML = [
      ['Stylist', st.name], ['When', longDate(b.date) + ', ' + hhmm(b.start) + '–' + hhmm(b.start + b.dur)],
      ['Services', b.services.map(id => svc(id).name).join(', ')], ['Total', dt(b.price) + ' · pay in salon']
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('#cfStamp').innerHTML = stampMsg;
    if (icsUrl) URL.revokeObjectURL(icsUrl);
    icsUrl = URL.createObjectURL(new Blob([icsFor(b)], { type: 'text/calendar' }));
    $('#cfIcs').href = icsUrl; $('#cfIcs').download = 'maison-lina-' + b.ref + '.ics';
    panels.forEach(p => { p.hidden = true; });
    $('#stepNav').hidden = true; $('#stepper').classList.add('complete');
    stepBtns.forEach(x => { x.disabled = true; x.parentElement.classList.add('done'); x.removeAttribute('aria-current'); });
    $('#confirm').hidden = false; $('#confirm').focus({ preventScroll: true });
    scrollToEl($('#bookCard'));
  }
  $('#cfAgain').addEventListener('click', () => {
    $('#confirm').hidden = true; $('#stepNav').hidden = false; $('#stepper').classList.remove('complete');
    stepBtns.forEach(x => x.parentElement.classList.remove('done'));
    Object.assign(state, { step: 1, stylist: null, services: [], date: null, start: null });
    form.policy.checked = false; form.notes.value = '';
    renderStylists(); update(); goTo(1);
  });

  // My appointments
  function renderAppts() {
    const today = iso(new Date());
    const list = getBookings().filter(b => b.date >= today).sort((a, b) => (a.date + pad(a.start)).localeCompare(b.date + pad(b.start)));
    $('#apptEmpty').hidden = list.length > 0;
    $('#apptList').innerHTML = list.map(b => `<li class="appt" data-ref="${esc(b.ref)}">
      <div class="appt-date"><strong>${fromIso(b.date).getDate()}</strong><small>${fromIso(b.date).toLocaleDateString('en-GB', { month: 'short' })}</small></div>
      <div class="appt-txt"><p><strong>${hhmm(b.start)}–${hhmm(b.start + b.dur)}</strong> · ${esc(stylistById(b.stylist).first)}</p><p class="appt-svcs">${esc(b.services.map(id => svc(id).name).join(', '))}</p><p class="appt-ref">${esc(b.ref)} · ${dt(b.price)}</p></div>
      <button type="button" class="btn btn-line btn-xs appt-cancel" data-ref="${esc(b.ref)}">Cancel <span class="sr-only">appointment ${esc(b.ref)}</span></button>
    </li>`).join('');
  }
  $('#apptList').addEventListener('click', e => {
    const b = e.target.closest('.appt-cancel'); if (!b) return;
    if (!b.classList.contains('confirming')) {
      b.classList.add('confirming'); b.firstChild.textContent = 'Tap again to cancel ';
      setTimeout(() => { if (b.isConnected) { b.classList.remove('confirming'); b.firstChild.textContent = 'Cancel '; } }, 4000);
      return;
    }
    const ref = b.dataset.ref;
    store.set(BK, getBookings().filter(x => x.ref !== ref));
    const stamps = getStamps(); if (stamps.includes(ref)) { store.set(ST, stamps.filter(x => x !== ref)); renderStamps(); }
    renderAppts(); renderNext();
    if (state.step === 3) renderDates();
    toast('Appointment ' + ref + ' cancelled — the slot is free again.');
    const first = $('#apptList .appt-cancel'); (first || $('#myTitle')).focus?.();
  });

  // Hero "next free chair"
  let nextPick = null;
  function renderNext() {
    const days = upcomingDays().slice(0, 7);
    let best = null;
    for (const ds of days) {
      for (const st of STYLISTS) {
        const s = slotsFor(st, ds, 30).find(x => x.state === 'free');
        if (s && (!best || s.t < best.t)) best = { st, ds, t: s.t };
      }
      if (best) break;
    }
    nextPick = best;
    if (!best) { $('#nextWhen').textContent = 'Fully booked this week'; $('#nextWho').textContent = 'Join the waiting list by phone.'; return; }
    const i = days.indexOf(best.ds);
    $('#nextWhen').textContent = (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : shortDate(best.ds)) + ' · ' + hhmm(best.t);
    $('#nextWho').textContent = 'with ' + best.st.first + ' · ' + best.st.role.split(' · ')[0];
  }
  $('#nextBook').addEventListener('click', () => {
    if (!nextPick) { scrollToEl($('#book')); return; }
    Object.assign(state, { stylist: nextPick.st.id, services: [], date: nextPick.ds, start: null, wantStart: nextPick.t });
    renderStylists(); renderServicesPick(); update();
    scrollToEl($('#book')); goTo(2);
    toast('Pick your services — we’ll hold ' + hhmm(nextPick.t) + ' with ' + nextPick.st.first + ' if it fits.');
  });

  // "Book" buttons in the service menu
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-book]'); if (!b) return;
    const id = b.dataset.book, who = offeredBy(id);
    if (!$('#confirm').hidden) $('#cfAgain').click();
    state.services = [id]; state.start = null;
    if (who.length === 1) { state.stylist = who[0].id; renderStylists(); renderServicesPick(); update(); scrollToEl($('#book')); goTo(2); }
    else {
      if (state.stylist && !stylistById(state.stylist).services.includes(id)) state.stylist = null;
      renderStylists(); if (state.stylist) renderServicesPick(); update(); scrollToEl($('#book')); goTo(1);
      toast(svc(id).name + ' is offered by ' + who.map(w => w.first).join(' and ') + ' — choose your stylist.');
    }
  });

  renderStylists(); update(); renderAppts(); renderNext();

  /* ---------- Team ---------- */
  $('#teamGrid').innerHTML = STYLISTS.map(st => `<li class="member">
    <div class="arch member-photo"><img src="assets/img/${st.img}" width="600" height="750" alt="${esc(st.alt)}" loading="lazy"></div>
    <h3>${esc(st.name)}</h3><p class="member-role">${esc(st.role)}</p>
    <p class="member-bio">${esc(st.bio)}</p>
    <ul class="tags">${st.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <p class="member-days">${icon('i-cal')}${dayRange(st.days)}</p>
    <button type="button" class="btn btn-line btn-sm" data-with="${st.id}">Book with ${esc(st.first)}</button>
  </li>`).join('');
  $('#teamGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-with]'); if (!b) return;
    if (!$('#confirm').hidden) $('#cfAgain').click();
    state.services = state.services.filter(id => stylistById(b.dataset.with).services.includes(id));
    chooseStylist(b.dataset.with); renderStylists();
    scrollToEl($('#book')); goTo(2);
  });

  /* ---------- Gallery + lightbox ---------- */
  const GALLERY = [
    { f: 'skin-fade', cat: 'barber', w: 1200, h: 1500, alt: 'Barber refining a skin fade with scissors over comb', cap: 'Skin fade & beard — Karim' },
    { f: 'soft-curls', cat: 'hair', w: 1200, h: 2136, alt: 'Stylist curling long brunette hair into soft waves', cap: 'Soft curls for an engagement party — Lina' },
    { f: 'manicure', cat: 'beauty', w: 1200, h: 800, alt: 'Nail technician applying gel polish during a manicure', cap: 'Gel manicure — Yasmine' },
    { f: 'scissor-cut', cat: 'barber', w: 1200, h: 1800, alt: 'Close-up of a barber cutting with thinning scissors and a comb', cap: 'Textured scissor cut — Slim' },
    { f: 'blonde-blowout', cat: 'hair', w: 1200, h: 1800, alt: 'Round brush blow-drying long blonde hair', cap: 'Glossy blow-out after balayage — Lina' },
    { f: 'facial', cat: 'beauty', w: 1200, h: 800, alt: 'Client relaxing during a clay mask facial', cap: 'Signature facial — Yasmine' },
    { f: 'hot-towel', cat: 'barber', w: 1200, h: 800, alt: 'Client reclined in a barber chair ready for a hot-towel shave', cap: 'Hot-towel shave — Karim' },
    { f: 'hair-ritual', cat: 'hair', w: 1200, h: 800, alt: 'Client at the wash basin during a hair treatment', cap: 'Keratin ritual at the basin' },
    { f: 'nude-nails', cat: 'beauty', w: 1200, h: 1915, alt: 'Hand with neat nude-pink manicured nails', cap: 'Nude gel, three weeks later — Yasmine' }
  ];
  $('#galGrid').innerHTML = GALLERY.map((g, i) => `<li data-cat="${g.cat}"><button type="button" class="gal-item" data-i="${i}" aria-label="Open photo: ${esc(g.cap)}">
    <img src="assets/img/g-${g.f}-640.webp" width="640" height="800" alt="${esc(g.alt)}" loading="lazy"><span class="gal-cap">${esc(g.cap)}</span></button></li>`).join('');
  const galChips = $$('#galChips .chip');
  galChips.forEach(c => c.addEventListener('click', () => {
    const f = c.dataset.filter;
    galChips.forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    $$('#galGrid li').forEach(li => { li.hidden = f !== 'all' && li.dataset.cat !== f; });
  }));
  const lb = $('#lightbox'), lbImg = $('#lbImg');
  let lbList = [], lbI = 0, lbTrigger = null;
  function lbShow() {
    const g = GALLERY[lbList[lbI]];
    lbImg.src = 'assets/img/g-' + g.f + '.webp'; lbImg.width = g.w; lbImg.height = g.h; lbImg.alt = g.alt;
    $('#lbCap').textContent = g.cap; $('#lbCount').textContent = (lbI + 1) + ' / ' + lbList.length;
  }
  function lbOpen(i, trigger) {
    lbList = $$('#galGrid li:not([hidden]) .gal-item').map(b => +b.dataset.i);
    lbI = Math.max(0, lbList.indexOf(i)); lbTrigger = trigger;
    lbShow(); lb.hidden = false; document.body.classList.add('no-scroll');
    $('.lb-close', lb).focus();
  }
  function lbClose() { lb.hidden = true; document.body.classList.remove('no-scroll'); lbImg.removeAttribute('src'); if (lbTrigger) lbTrigger.focus(); }
  const lbStep = d => { lbI = (lbI + d + lbList.length) % lbList.length; lbShow(); };
  $('#galGrid').addEventListener('click', e => { const b = e.target.closest('.gal-item'); if (b) lbOpen(+b.dataset.i, b); });
  lb.addEventListener('click', e => {
    const a = e.target.closest('[data-lb]');
    if (a) { a.dataset.lb === 'close' ? lbClose() : lbStep(a.dataset.lb === 'next' ? 1 : -1); }
    else if (e.target === lb) lbClose();
  });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowRight') lbStep(1);
    else if (e.key === 'ArrowLeft') lbStep(-1);
    else if (e.key === 'Tab') { // keep focus inside the viewer
      const f = $$('button', lb), i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  /* ---------- Loyalty stamp card ---------- */
  const ST = 'maisonlina.stamps', GOAL = 8;
  const getStamps = () => store.get(ST, []);
  function addStamp(ref) {
    const s = getStamps();
    if (s.length >= GOAL) { renderStamps(); return 'Your loyalty card is full — <a href="#loyalty">redeem your free service</a>.'; }
    s.push(ref); store.set(ST, s); renderStamps();
    return s.length >= GOAL ? `Stamp ${GOAL} of ${GOAL} added — <a href="#loyalty">your next service is free!</a>` : `Stamp ${s.length} of ${GOAL} added to your <a href="#loyalty">loyalty card</a>.`;
  }
  function renderStamps(animateLast) {
    const n = getStamps().length;
    $('#stamps').innerHTML = Array.from({ length: GOAL }, (_, i) => `<li class="${i < n ? 'on' : ''}${i === GOAL - 1 ? ' last' : ''}${animateLast && i === n - 1 ? ' pop' : ''}"><span>${i < n ? 'ML' : i === GOAL - 1 ? 'Free' : i + 1}</span></li>`).join('');
    $('#scCount').textContent = n + ' / ' + GOAL;
    $('#stampCard').setAttribute('aria-label', `Loyalty card: ${n} of ${GOAL} stamps collected`);
    $('#stampCard').classList.toggle('full', n >= GOAL);
    $('#loyaltyStatus').textContent = n >= GOAL ? 'Your card is full — your next service (up to 60 DT) is on us.' : n === 0 ? 'No stamps yet — book your first appointment to start your card.' : `${n} stamp${n === 1 ? '' : 's'} collected · ${GOAL - n} more visit${GOAL - n === 1 ? '' : 's'} to a free service.`;
    $('#redeemBtn').disabled = n < GOAL;
  }
  $('#redeemBtn').addEventListener('click', () => {
    const c = 'ML-FREE-' + code(4);
    const r = store.get('maisonlina.rewards', []); r.push({ code: c, at: new Date().toISOString() }); store.set('maisonlina.rewards', r);
    store.set(ST, []); renderStamps();
    $('#rewardCode').hidden = false;
    $('#rewardCode').innerHTML = `Reward code <strong class="mono">${c}</strong> — show it at the desk or mention it when you book. Your card starts again at zero.`;
    toast('Free service unlocked: ' + c);
  });
  $('#resetCard').addEventListener('click', () => { store.set(ST, []); $('#rewardCode').hidden = true; renderStamps(); toast('Loyalty card reset.'); });
  renderStamps();

  /* ---------- Gift cards ---------- */
  const gForm = $('#giftForm');
  const gAmount = () => gForm.amount.value === 'custom' ? Math.round(+gForm.custom.value || 0) : +gForm.amount.value;
  function gPreview() {
    const a = gAmount();
    const custom = gForm.amount.value === 'custom';
    $('#customWrap').hidden = !custom;
    $('#gcAmount').textContent = a ? dt(a) : '— DT';
    $('#gTotal').textContent = a ? dt(a) : '— DT';
    $('#gcTo').textContent = gForm.to.value.trim() || 'someone lovely';
    $('#gcMsg').textContent = gForm.message.value.trim() || 'An hour just for you.';
    $('#gcFrom').textContent = 'From ' + (gForm.from.value.trim() || '—');
    $('#gMsg-count').textContent = gForm.message.value.length + ' / 140';
    $('#giftPreview').className = 'giftcard gc-' + gForm.design.value;
  }
  gForm.addEventListener('input', gPreview);
  gForm.addEventListener('change', e => { gPreview(); if (e.target.name === 'amount' && e.target.value === 'custom') gForm.custom.focus(); });
  const today = iso(new Date());
  gForm.sendOn.min = today;
  const gRules = {
    custom: v => gForm.amount.value !== 'custom' ? '' : (/^\d+$/.test(v) && +v >= 30 && +v <= 1000 ? '' : 'Enter a whole amount between 30 and 1,000 DT.'),
    to: v => v.trim().length >= 2 ? '' : 'Who is the gift for?',
    toEmail: v => emailRe.test(v.trim()) ? '' : 'Enter the recipient’s email so we can send the card.',
    from: v => v.trim().length >= 2 ? '' : 'Add your name so they know who to thank.',
    sendOn: v => !v || (v >= today && v <= iso(new Date(Date.now() + 365 * 864e5))) ? '' : 'Choose a date from today up to one year ahead.'
  };
  function gCheck(el) {
    const msg = gRules[el.name](el.value);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $('#' + el.id + '-err').textContent = msg;
    el.closest('.field, .custom-amount').classList.toggle('invalid', !!msg);
    return !msg;
  }
  Object.keys(gRules).forEach(n => {
    const el = gForm.elements[n];
    el.addEventListener('blur', () => { if (el.value) gCheck(el); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') gCheck(el); });
  });
  gForm.addEventListener('submit', e => {
    e.preventDefault();
    let bad = null;
    Object.keys(gRules).forEach(n => { if (!gCheck(gForm.elements[n]) && !bad) bad = gForm.elements[n]; });
    if (bad) { bad.focus(); return; }
    const c = 'ML-GIFT-' + code(4) + '-' + code(4);
    const rec = { code: c, amount: gAmount(), design: gForm.design.value, to: gForm.to.value.trim(), toEmail: gForm.toEmail.value.trim(), from: gForm.from.value.trim(), message: gForm.message.value.trim(), sendOn: gForm.sendOn.value || today, created: new Date().toISOString() };
    const all = store.get('maisonlina.giftcards', []); all.push(rec); store.set('maisonlina.giftcards', all);
    $('#gcCode').textContent = c;
    $('#gsCode').textContent = c; $('#gsAmount').textContent = dt(rec.amount); $('#gsTo').textContent = rec.to;
    $('#gsWhen').textContent = (rec.sendOn === today ? 'It will be emailed to ' + rec.toEmail + ' today' : 'It will be emailed to ' + rec.toEmail + ' on ' + longDate(rec.sendOn)) + ' (demo: nothing is actually sent or charged).';
    gForm.hidden = true; $('.gift-grid').classList.add('done');
    $('#giftSuccess').hidden = false; $('#giftSuccess').focus();
  });
  $('#giftAgain').addEventListener('click', () => {
    gForm.reset(); $$('[aria-invalid]', gForm).forEach(el => el.removeAttribute('aria-invalid'));
    $$('.invalid', gForm).forEach(el => el.classList.remove('invalid'));
    $('#gcCode').textContent = 'ML-GIFT-····';
    gForm.hidden = false; $('.gift-grid').classList.remove('done'); $('#giftSuccess').hidden = true; gPreview(); gForm.to.focus();
  });
  $('#printGift').addEventListener('click', () => printWith('print-gift'));
  gPreview();

  $('#year').textContent = new Date().getFullYear();
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
