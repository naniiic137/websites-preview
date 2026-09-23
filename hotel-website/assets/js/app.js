/* The Azure Palace — vanilla JS, no dependencies, works offline. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const IMG = 'assets/img/';
  const eur = n => '€' + Math.round(n).toLocaleString('en-US');
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };

  /* ---------- Data ---------- */
  const ROOMS = [
    { id: 'deluxe', name: 'Deluxe Sea View Room', short: 'Deluxe Room', tag: 'Classic', rate: 299, size: 32, bed: 'King or twin', max: 3, maxAdults: 2,
      img: 'room-deluxe', desc: 'Bright and calm, with a king bed, a writing desk by the window and a rain shower. Ideal for a couple or a solo traveller.',
      features: ['Sea view', 'Rain shower', 'Nespresso machine', 'Smart TV', 'Minibar', 'Blackout curtains'],
      gallery: ['room-deluxe', 'sea-view', 'morning'] },
    { id: 'premium', name: 'Premium Terrace Suite', short: 'Premium Suite', tag: 'Most booked', rate: 499, size: 48, bed: 'King + sofa bed', max: 4, maxAdults: 3,
      img: 'room-premium', desc: 'Floor-to-ceiling doors open onto a private terrace. Separate lounge with sofa bed, marble bathroom with soaking tub.',
      features: ['Private terrace', 'Soaking tub', 'Separate lounge', 'Pillow menu', 'Bose speaker', 'Evening turndown'],
      gallery: ['room-premium', 'pool-deck', 'sea-view'] },
    { id: 'royal', name: 'Royal Garden Suite', short: 'Royal Suite', tag: 'Couples', rate: 799, size: 72, bed: 'Super-king', max: 4, maxAdults: 4,
      img: 'room-royal', desc: 'Warm teak interiors, a walk-in dressing room and a garden patio. Includes butler service and daily in-suite breakfast.',
      features: ['Butler service', 'Garden patio', 'Walk-in closet', 'Breakfast in suite', 'Double vanity', 'Spa credit €100'],
      gallery: ['room-royal', 'exterior', 'pool-deck'] },
    { id: 'presidential', name: 'Presidential Penthouse', short: 'Penthouse', tag: 'Signature', rate: 1299, size: 140, bed: '2 bedrooms', max: 6, maxAdults: 4,
      img: 'room-presidential', desc: 'The top floor: two bedrooms, a panoramic terrace with hot tub, and a private chef on request. The Riviera at your feet.',
      features: ['Panoramic terrace', 'Private hot tub', 'Chef on request', 'Airport limousine', 'Two bedrooms', 'Priority spa booking'],
      gallery: ['room-presidential', 'morning', 'exterior'] }
  ];
  const GALLERY_ALT = {
    'room-deluxe': 'Deluxe room with a king bed, neutral tones and a large window',
    'room-premium': 'Premium suite with terrace doors opening to the garden',
    'room-royal': 'Royal suite with warm teak panelling and a garden view',
    'room-presidential': 'Penthouse bedroom on a terrace overlooking mountains and the sea',
    'sea-view': 'Palm-lined pool terrace at sunset',
    'morning': 'Sun loungers on a rooftop terrace in the morning light',
    'pool-deck': 'Wooden pool deck shaded by trees by the sea',
    'exterior': 'Resort pool surrounded by tropical gardens and mountains',
    'hero-800': 'The hotel pool lit up at blue hour'
  };
  const OFFERS = [
    { code: 'STAY3PAY2', kicker: 'Best value', title: 'Stay 3, pay 2', save: '33%', unit: 'off every 3rd night',
      text: 'Stay three nights or more and every third night is on us. Breakfast and late check-out included.' },
    { code: 'HONEYMOON20', kicker: 'Romance', title: 'Honeymoon escape', save: '20%', unit: 'off suites',
      text: 'Twenty percent off the Royal Suite and Penthouse, with champagne on arrival and a candle-lit dinner.' },
    { code: 'SPA90', kicker: 'Wellness', title: 'Spa retreat', save: '€180', unit: 'value included',
      text: 'Book two nights or more and enjoy a complimentary 90-minute signature treatment for two.' }
  ];
  const REVIEWS = [
    { name: 'James Hartford', from: 'London, UK', img: 'guest-james', stay: 'Royal Suite · June', text: 'From the moment we arrived every member of staff made us feel at home. The Royal Suite was beyond anything we expected, and the butler remembered every little thing.' },
    { name: 'Sophia Laurent', from: 'Lyon, France', img: 'guest-sophia', stay: 'Premium Suite · Anniversary', text: 'We chose the Azure Palace for our anniversary. The spa was heavenly, dinner was world-class, and waking up to the sea every morning was pure bliss.' },
    { name: 'Marcus Chen', from: 'San Francisco, US', img: 'guest-marcus', stay: 'Penthouse · Business', text: 'I stay in a lot of luxury hotels and this is among the very best. The concierge arranged a private boat tour at an hour’s notice.' },
    { name: 'Amira Haddad', from: 'Dubai, UAE', stay: 'Deluxe Room · Weekend', text: 'Small enough to feel personal, polished enough to feel special. The rooftop pool at sunset is worth the trip alone.' },
    { name: 'Lukas Weber', from: 'Munich, Germany', stay: 'Premium Suite · Family', text: 'Travelled with two kids and never felt out of place. The team set up a tent and cookies in the lounge — they still talk about it.' },
    { name: 'Chiara Rossi', from: 'Milan, Italy', stay: 'Royal Suite · Honeymoon', text: 'The honeymoon package was perfect: champagne, flowers and a table on the terrace just for us. We are already planning to come back.' }
  ];

  /* ---------- Helpers: dates ---------- */
  const DAY = 864e5;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d); return isNaN(x) ? null : x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const nightsBetween = (a, b) => Math.round((b - a) / DAY);
  const fmt = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const maxDate = addDays(today, 365);
  // Deterministic "sold out" nights per room so the calendar mock is stable
  const isSold = (d, roomIdx) => {
    const n = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    const weekend = d.getDay() === 5 || d.getDay() === 6;
    const h = (n * 2654435761 + roomIdx * 97) >>> 0;
    return (h % 100) < (weekend ? 16 + roomIdx * 6 : 6 + roomIdx * 3);
  };
  const firstSold = (a, b, roomIdx) => { for (let d = new Date(a); d < b; d = addDays(d, 1)) if (isSold(d, roomIdx)) return d; return null; };

  /* ---------- Header / nav ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const toggle = $('#menuToggle'), nav = $('#mainNav');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', open); toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('open', open); document.body.classList.toggle('modal-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); toggle.focus(); } });
  matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  const links = $$('.main-nav ul a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(s => io.observe(s));
    const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { threshold: .12 });
    $$('.reveal').forEach(el => rv.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('in'));

  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200); };

  /* ---------- Rooms ---------- */
  $('#roomGrid').innerHTML = ROOMS.map((r, i) => `
    <article class="room-card reveal">
      <div class="room-img">
        <img src="${IMG}${r.img}-600.webp" width="600" height="400" loading="lazy" alt="${GALLERY_ALT[r.img]}">
        <span class="room-tag">${r.tag}</span>
      </div>
      <div class="room-body">
        <h3>${r.short}</h3>
        <p class="room-meta"><span>${r.size} m²</span><span>${r.bed}</span><span>Up to ${r.max} guests</span></p>
        <p>${r.desc.split('. ')[0]}.</p>
        <div class="room-foot">
          <p class="room-price">from<strong>${eur(r.rate)}</strong>per night</p>
          <div class="room-actions">
            <button class="btn btn-ghost" data-details="${i}" aria-label="View details of the ${r.short}">Details</button>
            <button class="btn btn-gold" data-book="${i}" aria-label="Book the ${r.short}">Book</button>
          </div>
        </div>
      </div>
    </article>`).join('');
  $$('#roomGrid .reveal').forEach(el => el.classList.add('in'));

  /* ---------- Modal helpers (focus trap + restore) ---------- */
  let lastFocus = null;
  const openModal = m => {
    lastFocus = document.activeElement; m.hidden = false; document.body.classList.add('modal-open');
    (m.querySelector('.modal-close') || m.querySelector('button')).focus();
  };
  const closeModal = m => { m.hidden = true; if (!$$('.modal:not([hidden]), .lightbox:not([hidden])').length) document.body.classList.remove('modal-open'); lastFocus && lastFocus.focus(); };
  const trap = (m, e) => {
    if (e.key !== 'Tab') return;
    const f = $$('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])', m).filter(x => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };
  $$('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(m); });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(m); trap(m, e); });
  });

  /* ---------- Room details ---------- */
  const roomModal = $('#roomModal');
  let modalRoom = 0;
  const showRoomPhoto = (r, k) => {
    const name = r.gallery[k];
    $('#rmMain').src = `${IMG}${name}.webp`; $('#rmMain').alt = GALLERY_ALT[name];
    $$('#rmThumbs button').forEach((b, j) => b.setAttribute('aria-current', j === k));
    $('#rmMainBtn').dataset.k = k;
  };
  const openRoom = i => {
    const r = ROOMS[i]; modalRoom = i;
    $('#rmTag').textContent = r.tag; $('#rmTitle').textContent = r.name;
    $('#rmMeta').textContent = `${r.size} m² · ${r.bed} · up to ${r.max} guests`;
    $('#rmDesc').textContent = r.desc;
    $('#rmFeatures').innerHTML = r.features.map(f => `<li>${f}</li>`).join('');
    $('#rmPrice').textContent = eur(r.rate);
    $('#rmThumbs').innerHTML = r.gallery.map((g, k) => `<button type="button" data-k="${k}" aria-label="Show photo ${k + 1} of ${r.gallery.length}"><img src="${IMG}${g}-600.webp" alt="" width="600" height="400" loading="lazy"></button>`).join('');
    showRoomPhoto(r, 0);
    openModal(roomModal);
  };
  $('#rmThumbs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showRoomPhoto(ROOMS[modalRoom], +b.dataset.k); });
  $('#rmMainBtn').addEventListener('click', () => {
    const r = ROOMS[modalRoom];
    openLightbox(r.gallery.map(g => ({ src: `${IMG}${g}.webp`, alt: GALLERY_ALT[g] })), +$('#rmMainBtn').dataset.k || 0);
  });
  $('#rmBook').addEventListener('click', () => { closeModal(roomModal); selectRoom(modalRoom, true); });
  $('#roomGrid').addEventListener('click', e => {
    const d = e.target.closest('[data-details]'), b = e.target.closest('[data-book]');
    if (d) openRoom(+d.dataset.details);
    if (b) selectRoom(+b.dataset.book, true);
  });

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox'); let lbItems = [], lbIdx = 0, lbPrevFocus = null;
  const lbShow = k => { lbIdx = (k + lbItems.length) % lbItems.length; const it = lbItems[lbIdx]; $('#lbImg').src = it.src; $('#lbImg').alt = it.alt; $('#lbCap').textContent = `${it.alt} — ${lbIdx + 1} / ${lbItems.length}`; };
  function openLightbox(items, k) { lbItems = items; lbPrevFocus = document.activeElement; lbShow(k); lb.hidden = false; document.body.classList.add('modal-open'); $('.lb-close').focus(); }
  const closeLb = () => { lb.hidden = true; if (!$$('.modal:not([hidden])').length) document.body.classList.remove('modal-open'); lbPrevFocus && lbPrevFocus.focus(); };
  lb.addEventListener('click', e => {
    const a = e.target.closest('[data-lb]')?.dataset.lb;
    if (a === 'close' || e.target === lb) closeLb(); else if (a === 'prev') lbShow(lbIdx - 1); else if (a === 'next') lbShow(lbIdx + 1);
  });
  lb.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); closeLb(); }
    if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
    if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
    trap(lb, e);
  });
  let tx = null;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) lbShow(lbIdx + (dx < 0 ? 1 : -1)); tx = null; });

  /* ---------- Gallery ---------- */
  const GAL = ['sea-view', 'room-premium', 'hero-800', 'morning', 'pool-deck', 'room-royal', 'exterior'];
  const galItems = GAL.map(g => ({ src: `${IMG}${g === 'hero-800' ? 'hero-1600' : g}.webp`, thumb: `${IMG}${g === 'hero-800' ? 'hero-800' : g + '-600'}.webp`, alt: GALLERY_ALT[g] }));
  $('#galleryGrid').innerHTML = galItems.map((g, i) => `<li><button type="button" data-i="${i}" aria-label="Open photo: ${g.alt}"><img src="${g.thumb}" width="600" height="400" loading="lazy" alt="${g.alt}"></button></li>`).join('');
  $('#galleryGrid').addEventListener('click', e => { const b = e.target.closest('button'); if (b) openLightbox(galItems, +b.dataset.i); });

  /* ---------- Reviews carousel ---------- */
  const track = $('#reviewTrack');
  track.innerHTML = REVIEWS.map((r, i) => `
    <figure class="review" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${REVIEWS.length}">
      <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
      <blockquote>“${r.text}”</blockquote>
      <figcaption>${r.img ? `<img src="${IMG}${r.img}.webp" width="48" height="48" loading="lazy" alt="">` : `<span class="avatar" aria-hidden="true">${r.name.split(' ').map(w => w[0]).join('')}</span>`}
        <div><strong>${r.name}</strong><span>${r.from}</span><em class="stay">${r.stay}</em></div></figcaption>
    </figure>`).join('');
  const slides = $$('.review', track);
  $('#revDots').innerHTML = slides.map((_, i) => `<button type="button" role="tab" aria-label="Review ${i + 1}" aria-selected="${i === 0}"></button>`).join('');
  const dots = $$('#revDots button');
  const step = () => slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 22);
  const goSlide = i => track.scrollTo({ left: Math.max(0, Math.min(i, slides.length - 1)) * step(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const current = () => Math.round(track.scrollLeft / step());
  $('#revPrev').addEventListener('click', () => goSlide(current() - 1));
  $('#revNext').addEventListener('click', () => { const c = current(); const maxStart = Math.round((track.scrollWidth - track.clientWidth) / step()); goSlide(c >= maxStart ? 0 : c + 1); });
  dots.forEach((d, i) => d.addEventListener('click', () => goSlide(i)));
  track.addEventListener('scroll', () => { const c = current(); dots.forEach((d, i) => d.setAttribute('aria-selected', i === c)); }, { passive: true });
  track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') goSlide(current() + 1); if (e.key === 'ArrowLeft') goSlide(current() - 1); });

  /* ---------- Offers ---------- */
  $('#offerGrid').innerHTML = OFFERS.map(o => `
    <article class="offer-card reveal in" data-code="${o.code}">
      <span class="offer-kicker">${o.kicker}</span>
      <h3>${o.title}</h3>
      <p class="offer-save">${o.save} <small>${o.unit}</small></p>
      <p>${o.text}</p>
      <span class="offer-code">Code: ${o.code}</span>
      <button class="btn btn-outline" data-apply="${o.code}">Apply this offer</button>
    </article>`).join('');
  $('#offerGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-apply]'); if (!b) return;
    $('#bPromo').value = b.dataset.apply; update();
    $('#booking').scrollIntoView(); toast(`Offer ${b.dataset.apply} applied to your booking`);
  });

  /* ---------- Booking engine ---------- */
  const form = $('#bookingForm');
  const f = { room: $('#bRoom'), inp: $('#bIn'), out: $('#bOut'), adults: $('#bAdults'), children: $('#bChildren'), name: $('#bName'), email: $('#bEmail'), phone: $('#bPhone'), promo: $('#bPromo'), notes: $('#bNotes') };
  f.room.innerHTML = ROOMS.map((r, i) => `<option value="${i}">${r.name} — ${eur(r.rate)}/night</option>`).join('');
  [f.inp, f.out, $('#qbIn'), $('#qbOut')].forEach(el => { el.min = iso(addDays(today, 0)); el.max = iso(maxDate); });

  const state = { start: null, end: null, view: new Date(today.getFullYear(), today.getMonth(), 1) };
  const roomIdx = () => +f.room.value;

  // default: first free 3-night window starting in 2 weeks
  const defaultRange = (ri, from = addDays(today, 14), len = 3) => {
    for (let d = from, k = 0; k < 120; k++, d = addDays(d, 1)) if (!firstSold(d, addDays(d, len), ri)) return [d, addDays(d, len)];
    return [from, addDays(from, len)];
  };
  [state.start, state.end] = defaultRange(0);

  const OFFER_RULES = {
    STAY3PAY2: (ctx) => ctx.nights >= 3 ? { label: 'Stay 3, pay 2', amount: -Math.floor(ctx.nights / 3) * ctx.rate } : { error: 'STAY3PAY2 needs 3 nights or more' },
    HONEYMOON20: (ctx) => ctx.room.rate >= 799 ? { label: 'Honeymoon −20%', amount: -ctx.subtotal * 0.2 } : { error: 'HONEYMOON20 is valid on Royal Suite and Penthouse' },
    SPA90: (ctx) => ctx.nights >= 2 ? { label: 'Spa treatment for two', amount: 0, note: 'Included' } : { error: 'SPA90 needs 2 nights or more' }
  };

  const quote = () => {
    const room = ROOMS[roomIdx()];
    const a = parse(f.inp.value), b = parse(f.out.value);
    const adults = +f.adults.value || 0, children = +f.children.value || 0;
    const nights = a && b ? nightsBetween(a, b) : 0;
    if (nights <= 0) return { room, nights: 0 };
    const subtotal = nights * room.rate;
    const ctx = { room, rate: room.rate, nights, subtotal };
    const code = f.promo.value.trim().toUpperCase();
    let offer = null, offerMsg = '';
    if (code) {
      const rule = OFFER_RULES[code];
      if (!rule) offerMsg = 'Unknown code';
      else { const r = rule(ctx); if (r.error) offerMsg = r.error; else offer = r; }
    }
    const afterOffer = subtotal + (offer ? offer.amount : 0);
    const vat = afterOffer * 0.10;
    const cityTax = 4 * adults * nights;
    return { room, nights, adults, children, subtotal, offer, offerMsg, code, vat, cityTax, total: afterOffer + vat + cityTax };
  };

  const setErr = (el, id, msg) => { $(id).textContent = msg || ''; el.closest('.field')?.classList.toggle('invalid', !!msg); el.setAttribute('aria-invalid', !!msg); };

  const validateStay = (showAll) => {
    let ok = true;
    const a = parse(f.inp.value), b = parse(f.out.value), ri = roomIdx(), room = ROOMS[ri];
    let e1 = '', e2 = '';
    if (!a) e1 = 'Choose an arrival date';
    else if (a < today) e1 = 'Arrival can’t be in the past';
    else if (a > maxDate) e1 = 'We take bookings up to 12 months ahead';
    if (!b) e2 = 'Choose a departure date';
    else if (a && b <= a) e2 = 'Departure must be after arrival';
    else if (a && nightsBetween(a, b) > 30) e2 = 'Maximum stay is 30 nights';
    if (!e1 && !e2 && a && b) { const s = firstSold(a, b, ri); if (s) e2 = `${room.short} is sold out on ${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — try other dates or rooms`; }
    if (showAll || f.inp.value) setErr(f.inp, '#bInErr', e1);
    if (showAll || f.out.value) setErr(f.out, '#bOutErr', e2);
    ok = !e1 && !e2;
    const adults = +f.adults.value, children = +f.children.value;
    let g = '';
    if (adults > room.maxAdults) g = `${room.short} sleeps up to ${room.maxAdults} adults`;
    else if (adults + children > room.max) g = `${room.short} sleeps up to ${room.max} guests in total`;
    $('#bGuestsErr').textContent = g;
    return ok && !g;
  };

  const renderSummary = () => {
    const q = quote();
    $('#sumRoom').textContent = q.room.name;
    $('#sumImg').src = `${IMG}${q.room.img}-600.webp`;
    const pm = $('#bPromoMsg');
    pm.textContent = q.code ? (q.offer ? `✓ ${q.offer.label} applied` : q.offerMsg) : '';
    pm.classList.toggle('bad', !!(q.code && !q.offer));
    $$('.offer-card').forEach(c => c.classList.toggle('applied', !!q.offer && c.dataset.code === q.code));
    if (!q.nights) { $('#sumLines').innerHTML = '<div><dt>Select your dates</dt><dd>—</dd></div>'; $('#sumTotal').textContent = '—'; return q; }
    const a = parse(f.inp.value), b = parse(f.out.value);
    const lines = [
      ['Check-in', fmt(a)], ['Check-out', fmt(b)],
      ['Guests', `${q.adults} adult${q.adults > 1 ? 's' : ''}${q.children ? `, ${q.children} child${q.children > 1 ? 'ren' : ''}` : ''}`],
      [`${eur(q.room.rate)} × ${q.nights} night${q.nights > 1 ? 's' : ''}`, eur(q.subtotal)]
    ];
    let html = lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    if (q.offer) html += `<div class="discount"><dt>${q.offer.label}</dt><dd>${q.offer.note || '−' + eur(-q.offer.amount)}</dd></div>`;
    html += `<div><dt>VAT (10%)</dt><dd>${eur(q.vat)}</dd></div><div><dt>City tax (€4 / adult / night)</dt><dd>${eur(q.cityTax)}</dd></div>`;
    $('#sumLines').innerHTML = html;
    $('#sumTotal').textContent = eur(q.total);
    return q;
  };

  /* Calendar */
  const monthsToShow = () => matchMedia('(max-width: 720px)').matches ? 1 : 2;
  const renderCalendar = () => {
    const n = monthsToShow(), ri = roomIdx();
    $('#calMonths').style.setProperty('--months', n);
    const minView = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxView = new Date(maxDate.getFullYear(), maxDate.getMonth() - n + 1, 1);
    if (state.view < minView) state.view = minView;
    if (state.view > maxView) state.view = maxView;
    $('#calPrev').disabled = state.view <= minView;
    $('#calNext').disabled = state.view >= maxView;
    let html = '';
    for (let m = 0; m < n; m++) {
      const first = new Date(state.view.getFullYear(), state.view.getMonth() + m, 1);
      const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      const offset = (first.getDay() + 6) % 7;
      html += `<div class="cal-month"><h4>${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h4><div class="cal-grid">`;
      html += ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => `<span class="cal-dow" aria-hidden="true">${d}</span>`).join('');
      html += '<span class="cal-empty"></span>'.repeat(offset);
      for (let d = 1; d <= days; d++) {
        const dt = new Date(first.getFullYear(), first.getMonth(), d);
        const past = dt < today || dt > maxDate, sold = !past && isSold(dt, ri);
        const cls = ['cal-day'];
        if (sold) cls.push('sold');
        if (+dt === +today) cls.push('today');
        if (state.start && +dt === +state.start) cls.push('start');
        if (state.end && +dt === +state.end) cls.push('end');
        if (state.start && state.end && dt > state.start && dt < state.end) cls.push('in-range');
        const label = `${dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${sold ? ', sold out' : ''}`;
        html += `<button type="button" class="${cls.join(' ')}" data-date="${iso(dt)}" aria-label="${label}"${past ? ' disabled' : ''}${cls.includes('start') || cls.includes('end') ? ' aria-pressed="true"' : ''}>${d}</button>`;
      }
      html += '</div></div>';
    }
    $('#calMonths').innerHTML = html;
  };
  $('#calPrev').addEventListener('click', () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCalendar(); });
  $('#calNext').addEventListener('click', () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCalendar(); });
  $('#calMonths').addEventListener('click', e => {
    const b = e.target.closest('.cal-day'); if (!b || b.disabled) return;
    const d = parse(b.dataset.date), ri = roomIdx();
    if (!state.start || state.end || d <= state.start) {
      if (isSold(d, ri)) { toast('That night is sold out for this room'); return; }
      state.start = d; state.end = null;
    } else {
      const s = firstSold(state.start, d, ri);
      if (s) { toast('Your range includes a sold-out night'); state.start = isSold(d, ri) ? null : d; state.end = null; }
      else state.end = d;
    }
    syncInputsFromState(); update(); renderCalendar();
    const again = $(`#calMonths [data-date="${b.dataset.date}"]`); again && again.focus();
  });
  const syncInputsFromState = () => { f.inp.value = state.start ? iso(state.start) : ''; f.out.value = state.end ? iso(state.end) : ''; };
  const syncStateFromInputs = () => { state.start = parse(f.inp.value); state.end = parse(f.out.value); if (state.start) state.view = new Date(state.start.getFullYear(), state.start.getMonth(), 1); };

  const update = () => { validateStay(false); renderSummary(); updateSteppers(); };

  f.inp.addEventListener('change', () => {
    const a = parse(f.inp.value), b = parse(f.out.value);
    if (a && (!b || b <= a)) f.out.value = iso(addDays(a, 1));
    syncStateFromInputs(); update(); renderCalendar();
  });
  f.out.addEventListener('change', () => { syncStateFromInputs(); update(); renderCalendar(); });
  f.room.addEventListener('change', () => { update(); renderCalendar(); });
  f.promo.addEventListener('input', update);
  [f.adults, f.children].forEach(el => el.addEventListener('input', update));

  // steppers
  function updateSteppers() {
    $$('.stepper').forEach(s => {
      const inp = $('input', s), min = +s.dataset.min, max = +s.dataset.max;
      const [dec, inc] = $$('.step-btn', s); dec.disabled = +inp.value <= min; inc.disabled = +inp.value >= max;
    });
  }
  $$('.stepper').forEach(s => s.addEventListener('click', e => {
    const b = e.target.closest('.step-btn'); if (!b) return;
    const inp = $('input', s); const v = Math.min(+s.dataset.max, Math.max(+s.dataset.min, (+inp.value || 0) + +b.dataset.step));
    inp.value = v; update();
  }));

  function selectRoom(i, scroll) {
    f.room.value = i;
    const room = ROOMS[i];
    if (+f.adults.value > room.maxAdults) f.adults.value = room.maxAdults;
    if (+f.adults.value + +f.children.value > room.max) f.children.value = Math.max(0, room.max - f.adults.value);
    if (state.start && state.end && firstSold(state.start, state.end, i)) { [state.start, state.end] = defaultRange(i, state.start, nightsBetween(state.start, state.end)); syncInputsFromState(); state.view = new Date(state.start.getFullYear(), state.start.getMonth(), 1); toast('We moved your dates to the next available nights'); }
    update(); renderCalendar();
    if (scroll) { $('#booking').scrollIntoView(); setTimeout(() => f.room.focus({ preventScroll: true }), 400); }
  }

  // Quick book in hero
  const qbIn = $('#qbIn'), qbOut = $('#qbOut');
  qbIn.value = iso(state.start); qbOut.value = iso(state.end);
  qbIn.addEventListener('change', () => { const a = parse(qbIn.value), b = parse(qbOut.value); if (a && (!b || b <= a)) qbOut.value = iso(addDays(a, 1)); });
  $('#quickBook').addEventListener('submit', e => {
    e.preventDefault();
    const a = parse(qbIn.value), b = parse(qbOut.value), g = +$('#qbGuests').value, err = $('#qbError');
    err.textContent = !a || !b ? 'Please choose both dates.' : a < today ? 'Arrival can’t be in the past.' : b <= a ? 'Check-out must be after check-in.' : nightsBetween(a, b) > 30 ? 'Maximum stay is 30 nights.' : '';
    if (err.textContent) return;
    f.inp.value = qbIn.value; f.out.value = qbOut.value; syncStateFromInputs();
    f.adults.value = Math.min(4, g); f.children.value = Math.max(0, g - 4);
    // choose the first room that fits and is free
    let pick = ROOMS.findIndex((r, i) => g <= r.max && Math.min(4, g) <= r.maxAdults && !firstSold(a, b, i));
    if (pick < 0) pick = ROOMS.findIndex(r => g <= r.max);
    f.room.value = Math.max(0, pick);
    update(); renderCalendar();
    $('#booking').scrollIntoView();
    toast(pick >= 0 && !firstSold(a, b, pick) ? `Good news — the ${ROOMS[pick].short} is available` : 'Some nights are sold out — see the calendar');
  });

  // Submit
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const validateGuest = () => {
    const n = f.name.value.trim(), em = f.email.value.trim(), ph = f.phone.value.trim();
    const en = n.length < 2 ? 'Please enter your full name' : '';
    const ee = !em ? 'Please enter your email' : !EMAIL.test(em) ? 'That email doesn’t look right' : '';
    const ep = ph && !/^[+()\d\s.-]{6,20}$/.test(ph) ? 'Use digits, spaces and + only' : '';
    setErr(f.name, '#bNameErr', en); setErr(f.email, '#bEmailErr', ee); setErr(f.phone, '#bPhoneErr', ep);
    return !en && !ee && !ep;
  };
  [f.name, f.email, f.phone].forEach(el => el.addEventListener('blur', () => { if (el.value) validateGuest(); }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const okStay = validateStay(true), okGuest = validateGuest();
    const st = $('#bookStatus');
    if (!okStay || !okGuest) {
      st.textContent = 'Please check the highlighted fields.';
      const bad = form.querySelector('[aria-invalid="true"]') || (!okStay ? f.room : null);
      bad && bad.focus();
      return;
    }
    st.textContent = '';
    const q = quote();
    const ref = 'AZP-' + Date.now().toString(36).toUpperCase().slice(-6);
    const booking = { ref, room: q.room.name, checkin: f.inp.value, checkout: f.out.value, nights: q.nights, adults: q.adults, children: q.children,
      name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), promo: q.offer ? q.code : '', notes: f.notes.value.trim(), total: Math.round(q.total), created: new Date().toISOString() };
    const all = store.get('azure-palace-bookings', []); all.push(booking); store.set('azure-palace-bookings', all);
    $('#cfRef').textContent = ref; $('#cfEmail').textContent = booking.email;
    $('#cfLines').innerHTML = [
      ['Guest', booking.name], ['Room', q.room.name], ['Arrival', fmt(parse(booking.checkin)) + ' · from 3pm'], ['Departure', fmt(parse(booking.checkout)) + ' · by 12pm'],
      ['Nights', q.nights], ['Guests', `${q.adults} adult${q.adults > 1 ? 's' : ''}${q.children ? ', ' + q.children + ' child' + (q.children > 1 ? 'ren' : '') : ''}`],
      ...(q.offer ? [['Offer', q.offer.label]] : []), ['Total due at hotel', eur(q.total)]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    openModal($('#confirmModal'));
    form.reset(); f.room.value = ROOMS.indexOf(q.room); f.adults.value = 2; f.children.value = 0;
    [state.start, state.end] = defaultRange(roomIdx()); syncInputsFromState(); update(); renderCalendar();
    $$('.field.invalid').forEach(x => x.classList.remove('invalid'));
    $$('#bookingForm .err').forEach(x => x.textContent = '');
  });
  $('#cfPrint').addEventListener('click', () => { document.body.classList.add('printing'); print(); setTimeout(() => document.body.classList.remove('printing'), 500); });

  // Newsletter
  $('#newsletter').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('#nlEmail'), msg = $('#nlMsg'), v = inp.value.trim();
    if (!EMAIL.test(v)) { msg.textContent = 'Please enter a valid email address.'; msg.className = 'nl-msg bad'; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
    const list = store.get('azure-palace-newsletter', []); if (!list.includes(v)) list.push(v); store.set('azure-palace-newsletter', list);
    msg.textContent = 'Merci! You’re on the list.'; msg.className = 'nl-msg good'; inp.removeAttribute('aria-invalid'); inp.value = '';
  });

  // Init
  syncInputsFromState(); state.view = new Date(state.start.getFullYear(), state.start.getMonth(), 1);
  update(); renderCalendar();
  let lastN = monthsToShow();
  addEventListener('resize', () => { const n = monthsToShow(); if (n !== lastN) { lastN = n; renderCalendar(); } });
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
