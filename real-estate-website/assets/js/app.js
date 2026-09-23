/* PrimeNest Realty — vanilla JS: search, favourites, compare, detail + lightbox, mortgage, forms. */
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
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const money = n => fmt(n) + ' DT';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IMG = n => `assets/img/${n}.webp`;

  /* ---------- Data ---------- */
  const AGENTS = [
    { id: 'leila', name: 'Leila Mansouri', role: 'Senior agent · Luxury homes', areas: 'La Marsa, Sidi Bou Said, Carthage, Gammarth', phone: '+216 20 000 101', img: 'agent-leila', alt: 'Portrait of Leila Mansouri, smiling, in a grey blazer' },
    { id: 'karim', name: 'Karim Haddad', role: 'Commercial & new builds', areas: 'Les Berges du Lac, Lac 2, Tunis centre', phone: '+216 20 000 102', img: 'agent-karim', alt: 'Portrait of Karim Haddad in a dark jacket' },
    { id: 'sarra', name: 'Sarra Ben Ali', role: 'Rentals & relocation', areas: 'Ariana, El Menzah, Ennasr, Carthage', phone: '+216 20 000 103', img: 'agent-sarra', alt: 'Portrait of Sarra Ben Ali with short auburn hair' },
    { id: 'youssef', name: 'Youssef Gharbi', role: 'Sahel coast specialist', areas: 'Hammamet, Sousse, Monastir, Sfax', phone: '+216 20 000 104', img: 'agent-youssef', alt: 'Portrait of Youssef Gharbi, smiling, in a white t-shirt' }
  ];
  const agentById = id => AGENTS.find(a => a.id === id);
  const INT = {
    livingBright: ['int-living-bright', 'Double-height living room with sofas and a staircase'],
    livingMinimal: ['int-living-minimal', 'Minimalist open-plan living room with wood panelling'],
    livingCosy: ['int-living-cosy', 'Bright living room with beige sofas and large windows'],
    livingArt: ['int-living-art', 'Living room with white sofa, blue cushions and artwork'],
    kitchenWhite: ['int-kitchen-white', 'White kitchen with island and pendant lights'],
    kitchenMarble: ['int-kitchen-marble', 'Marble kitchen worktop with fresh produce'],
    stair: ['int-glass-stair', 'Glass-walled living area with a floating staircase and pool view'],
    bedLight: ['int-bedroom-light', 'Light bedroom with black-framed doors to the garden'],
    bedDark: ['int-bedroom-dark', 'Master bedroom with upholstered headboard and chandelier'],
    bath: ['int-bathroom', 'Bright bathroom with white basin and plants'],
    extWood: ['int-exterior-wood', 'Contemporary timber-clad façade and garden'],
    extDusk: ['int-exterior-dusk', 'Modern façade lit up at dusk']
  };
  const H = (id, o) => Object.assign({ id, img: id }, o);
  const HOMES = [
    H('villa-azur-hammamet', { title: 'Villa Azur', type: 'Villa', deal: 'buy', city: 'Hammamet', area: 'Yasmine Hammamet', price: 1450000, beds: 5, baths: 4, size: 420, land: 900, year: 2019, isNew: true, rank: 1, agent: 'youssef', coast: true, ll: [36.37, 10.54], alt: 'Modern white villa with an infinity pool at dusk', extra: ['livingBright', 'kitchenMarble', 'bedLight'], features: ['Infinity pool', 'Sea view', 'Private garden', 'Double garage', 'Solar panels', 'Summer kitchen'], near: [['Beach', '350 m'], ['Yasmine marina', '1.1 km'], ['Golf course', '2.4 km'], ['Int. school', '3 km']], desc: 'A contemporary villa a short walk from the beach, with generous glazing that frames the pool and the sea beyond. The ground floor opens entirely onto the terrace; upstairs, four en-suite bedrooms and a roof deck for summer evenings.' }),
    H('residence-carthage', { title: 'Résidence Les Jardins', type: 'Apartment', deal: 'rent', city: 'Carthage', area: 'Carthage Byrsa', price: 3800, beds: 3, baths: 2, size: 160, year: 2016, rank: 4, agent: 'sarra', coast: false, ll: [36.853, 10.323], alt: 'Contemporary apartment building with balconies against a blue sky', extra: ['livingCosy', 'kitchenWhite', 'bedDark'], features: ['Furnished', 'Balcony', 'Lift', 'Underground parking', 'Concierge', 'Central heating'], near: [['TGM station', '500 m'], ['Byrsa hill', '700 m'], ['Supermarket', '300 m'], ['School', '650 m']], desc: 'A calm, fully furnished three-bedroom apartment in a secure residence with gardens, steps from the archaeological park and the TGM line to Tunis.' }),
    H('villa-sidi-bou-said', { title: 'Villa Blanche', type: 'Villa', deal: 'buy', city: 'Sidi Bou Said', area: 'Sidi Bou Said heights', price: 2900000, beds: 6, baths: 5, size: 520, land: 1200, year: 2021, isNew: true, rank: 2, agent: 'leila', coast: true, ll: [36.87, 10.347], alt: 'White cubic villa with a large pool and sun loungers', extra: ['livingMinimal', 'stair', 'bath'], features: ['Heated pool', 'Panoramic sea view', 'Home cinema', 'Staff quarters', 'Smart home', 'Garage for 3 cars'], near: [['Village centre', '600 m'], ['Beach', '900 m'], ['Marina', '1.3 km'], ['Airport', '14 km']], desc: 'An architect-designed villa on the heights of Sidi Bou Said with uninterrupted views over the Gulf of Tunis. Six bedrooms, a heated pool and interiors finished in Carrara marble and oak.' }),
    H('maison-la-marsa', { title: 'Maison Corniche', type: 'House', deal: 'buy', city: 'La Marsa', area: 'Marsa Corniche', price: 1150000, beds: 4, baths: 3, size: 280, land: 450, year: 2018, rank: 3, agent: 'leila', coast: true, ll: [36.878, 10.325], alt: 'Two-storey modern house with a swimming pool and palm trees', extra: ['livingArt', 'kitchenMarble', 'bedLight'], features: ['Pool', 'Garden', 'Roof terrace', 'Fireplace', 'Parking for 2', 'Alarm system'], near: [['Beach', '250 m'], ['Marsa Plage', '800 m'], ['Int. school', '1.2 km'], ['Market', '400 m']], desc: 'A family house two streets from the Corniche: four bedrooms, a sunny garden with pool and a roof terrace facing the sea. Walk to cafés, schools and the Saturday market.' }),
    H('villa-gammarth', { title: 'Villa Les Palmiers', type: 'Villa', deal: 'rent', city: 'Gammarth', area: 'Gammarth Supérieur', price: 9500, beds: 5, baths: 4, size: 450, land: 1000, year: 2015, rank: 5, agent: 'leila', coast: true, ll: [36.918, 10.29], alt: 'Mediterranean villa with palm trees and a turquoise pool', extra: ['livingBright', 'bedDark', 'bath'], features: ['Furnished', 'Pool', 'Mature garden', 'Guest house', 'Sea view', 'Gated'], near: [['Beach', '600 m'], ['Golf', '4 km'], ['Hotels & spa', '1 km'], ['La Marsa', '5 km']], desc: 'A furnished villa set in a palm garden with a large pool and a separate guest house. Ideal for families or embassy staff looking for space near the sea.' }),
    H('penthouse-lac2', { title: 'Penthouse Lac 2', type: 'Penthouse', deal: 'buy', city: 'Tunis', area: 'Lac 2', price: 890000, beds: 3, baths: 2, size: 210, year: 2022, isNew: true, rank: 6, agent: 'karim', coast: false, lake: true, ll: [36.845, 10.27], alt: 'Bright penthouse living room with large windows and staircase', extra: ['stair', 'bedLight', 'bath'], features: ['120 m² terrace', 'Lake view', 'Lift to apartment', 'Air conditioning', '2 parking spaces', '24/7 security'], near: [['Tunis City mall', '400 m'], ['Lake promenade', '200 m'], ['Int. school', '1 km'], ['Airport', '6 km']], desc: 'Top-floor penthouse with a wrap-around terrace overlooking the lake. Open-plan living, three bedrooms, and a private lift in one of Lac 2’s most sought-after new buildings.' }),
    H('maison-sousse', { title: 'Maison Kantaoui', type: 'House', deal: 'buy', city: 'Sousse', area: 'Port El Kantaoui', price: 620000, beds: 4, baths: 3, size: 240, land: 400, year: 2017, rank: 8, agent: 'youssef', coast: true, ll: [35.892, 10.595], alt: 'Modern house with timber cladding and a lawn', extra: ['extWood', 'livingCosy', 'kitchenWhite'], features: ['Garden', 'Garage', 'Terrace', 'Air conditioning', 'Solar water heater', 'Storage room'], near: [['Marina', '900 m'], ['Beach', '1 km'], ['Golf', '2 km'], ['Sousse medina', '9 km']], desc: 'A bright four-bedroom house near the Kantaoui marina, with a south-facing lawn, a covered terrace and a garage. Turn-key and ready to move in.' }),
    H('appartement-ennasr', { title: 'Appartement Lumière', type: 'Apartment', deal: 'rent', city: 'Ariana', area: 'Ennasr 2', price: 1900, beds: 2, baths: 1, size: 110, year: 2020, rank: 7, agent: 'sarra', coast: false, ll: [36.86, 10.16], alt: 'Sunny living room with a grey sofa, plants and wooden chairs', extra: ['kitchenWhite', 'bedLight'], features: ['Semi-furnished', 'Balcony', 'Lift', 'Parking', 'Fibre internet'], near: [['Shops & cafés', '150 m'], ['Metro (Line 2)', '1.4 km'], ['Park', '500 m'], ['Clinic', '800 m']], desc: 'A light-filled two-bedroom apartment on a quiet street of Ennasr 2, close to cafés and shops, with a balcony and a parking space.' }),
    H('duplex-sfax', { title: 'Duplex Moderne', type: 'House', deal: 'buy', city: 'Sfax', area: 'Route de Tunis, km 5', price: 540000, beds: 4, baths: 3, size: 230, year: 2021, rank: 10, agent: 'youssef', coast: false, ll: [34.77, 10.76], alt: 'Dark modern duplex façade with warm lighting', extra: ['extDusk', 'livingArt', 'kitchenMarble'], features: ['Private entrance', 'Terrace', 'Central heating', 'Garage', 'Fitted kitchen'], near: [['City centre', '5 km'], ['University', '2 km'], ['Hypermarket', '1 km'], ['School', '600 m']], desc: 'A recently built duplex with its own entrance, terrace and garage. Four bedrooms over two levels and a spacious fitted kitchen.' }),
    H('studio-menzah', { title: 'Studio Menzah 6', type: 'Apartment', deal: 'rent', city: 'Tunis', area: 'El Menzah 6', price: 1200, beds: 1, baths: 1, size: 55, year: 2014, rank: 11, agent: 'sarra', coast: false, ll: [36.845, 10.175], alt: 'Compact living room with a red armchair and a dining table', extra: ['kitchenWhite', 'bath'], features: ['Furnished', 'Air conditioning', 'Lift', 'Close to transport'], near: [['Metro', '400 m'], ['University', '1.5 km'], ['Supermarket', '200 m'], ['Park', '700 m']], desc: 'A smart, furnished one-bedroom flat perfect for young professionals or students, minutes from the metro and university campus.' }),
    H('villa-monastir', { title: 'Villa Skanès', type: 'Villa', deal: 'buy', city: 'Monastir', area: 'Skanès', price: 1750000, beds: 5, baths: 4, size: 380, land: 800, year: 2020, rank: 9, agent: 'youssef', coast: true, ll: [35.76, 10.78], alt: 'White modern villa with a pool and lush plants', extra: ['livingBright', 'bedDark', 'stair'], features: ['Pool', 'Direct beach access', 'Garden', 'Outdoor kitchen', 'Garage', 'Guest suite'], near: [['Beach', '80 m'], ['Airport', '4 km'], ['Marina', '6 km'], ['Golf', '3 km']], desc: 'A seafront villa in Skanès with direct beach access, a pool and a large garden. Five bedrooms including a separate guest suite.' }),
    H('bureaux-berges-du-lac', { title: 'Plateau de bureaux', type: 'Office', deal: 'rent', city: 'Tunis', area: 'Les Berges du Lac', price: 6500, beds: 0, baths: 2, size: 300, year: 2012, rank: 12, agent: 'karim', coast: false, lake: true, ll: [36.832, 10.235], alt: 'Glass office towers seen from below', extra: ['stair', 'livingMinimal'], features: ['Open-plan', '6 parking spaces', 'Fibre', 'Generator', 'Reception', 'Meeting rooms'], near: [['Lake promenade', '300 m'], ['Banks & embassies', '500 m'], ['Tunis centre', '5 km'], ['Airport', '5 km']], desc: 'A 300 m² open-plan office floor with two meeting rooms and private parking, in a prestige building of Les Berges du Lac.' })
  ];
  HOMES.forEach((h, i) => { h.added = i; h.photos = [[IMG(h.img), h.alt], ...h.extra.map(k => [IMG(INT[k][0]), INT[k][1]])]; });
  const homeById = id => HOMES.find(h => h.id === id);
  const priceLabel = h => h.deal === 'rent' ? `${money(h.price)}<small> / month</small>` : money(h.price);
  const MAX = {
    buy: [['', 'No limit'], ['500000', '500,000 DT'], ['800000', '800,000 DT'], ['1200000', '1.2 M DT'], ['2000000', '2 M DT'], ['3000000', '3 M DT']],
    rent: [['', 'No limit'], ['1500', '1,500 DT / mo'], ['3000', '3,000 DT / mo'], ['5000', '5,000 DT / mo'], ['10000', '10,000 DT / mo']]
  };

  /* ---------- State ---------- */
  let favs = store.get('primenest.favs', []).filter(homeById);
  let cmp = store.get('primenest.compare', []).filter(homeById);
  const q = { deal: 'buy', city: '', type: '', max: '', beds: 0, saved: false };
  let sort = 'featured';

  /* ---------- Toast ---------- */
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2600);
  }

  /* ---------- Mobile nav ---------- */
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.innerHTML = icon(open ? 'i-close' : 'i-menu');
  }
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', e => { if (e.target.isConnected && nav.classList.contains('is-open') && !e.target.closest('.header')) setMenu(false); });

  /* ---------- Search ---------- */
  const sForm = $('#searchForm');
  function fillMax() {
    const cur = $('#fMax').value;
    $('#fMax').innerHTML = MAX[q.deal].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    if (MAX[q.deal].some(([v]) => v === cur)) $('#fMax').value = cur;
  }
  function readSearch() {
    const f = sForm.elements;
    q.deal = f.deal.value; q.city = f.city.value; q.type = f.type.value; q.max = f.max.value; q.beds = +f.beds.value;
  }
  function writeSearch() {
    const f = sForm.elements;
    $$('input[name="deal"]', sForm).forEach(r => { r.checked = r.value === q.deal; });
    fillMax(); f.city.value = q.city; f.type.value = q.type; f.max.value = q.max; f.beds.value = String(q.beds);
  }
  sForm.addEventListener('change', e => { if (e.target.name === 'deal') { q.deal = e.target.value; fillMax(); } readSearch(); render(); });
  sForm.addEventListener('submit', e => { e.preventDefault(); readSearch(); render(); $('#listings').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-deal]'); if (!a) return;
    q.deal = a.dataset.deal; q.city = ''; q.type = ''; q.max = ''; q.beds = 0; writeSearch(); render();
  });
  $('#sort').addEventListener('change', e => { sort = e.target.value; render(); });
  $('#savedOnly').addEventListener('change', e => { q.saved = e.target.checked; syncSavedBtn(); render(); });
  $('#savedBtn').addEventListener('click', () => {
    q.saved = !q.saved; $('#savedOnly').checked = q.saved; syncSavedBtn(); render();
    if (q.saved) $('#listings').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });
  function syncSavedBtn() { $('#savedBtn').setAttribute('aria-pressed', String(q.saved)); }
  $('#resetSearch').addEventListener('click', () => { Object.assign(q, { city: '', type: '', max: '', beds: 0, saved: false }); $('#savedOnly').checked = false; syncSavedBtn(); writeSearch(); render(); });

  function results() {
    const list = HOMES.filter(h => (q.saved ? favs.includes(h.id) : h.deal === q.deal) &&
      (!q.city || h.city === q.city) && (!q.type || h.type === q.type) &&
      (!q.max || h.price <= +q.max) && h.beds >= q.beds);
    const s = { featured: (a, b) => a.rank - b.rank, 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, area: (a, b) => b.size - a.size, new: (a, b) => b.year - a.year }[sort];
    return list.sort(s);
  }
  function card(h, i) {
    const fav = favs.includes(h.id), inCmp = cmp.includes(h.id);
    return `<li class="pcard" style="animation-delay:${Math.min(i, 6) * 50}ms">
      <div class="pcard__media">
        <img src="${IMG(h.img + '-600')}" srcset="${IMG(h.img + '-600')} 600w, ${IMG(h.img)} 1200w" sizes="(min-width: 960px) 30vw, (min-width: 680px) 45vw, 92vw" width="600" height="400" alt="${esc(h.alt)}" loading="lazy">
        <div class="pcard__tags"><span class="tag ${h.deal === 'rent' ? 'tag--rent' : ''}">${h.deal === 'rent' ? 'For rent' : 'For sale'}</span>${h.isNew ? '<span class="tag tag--new">New</span>' : ''}</div>
        <button class="icon-btn pcard__fav" data-fav="${h.id}" aria-pressed="${fav}" aria-label="Save ${esc(h.title)}">${icon(fav ? 'i-heart-fill' : 'i-heart')}</button>
        <span class="pcard__photos">${icon('i-photos')} ${h.photos.length}</span>
      </div>
      <div class="pcard__body">
        <p class="pcard__price">${priceLabel(h)}</p>
        <h3 class="pcard__title"><a href="#p/${h.id}" data-open="${h.id}">${esc(h.title)} · ${h.type}</a></h3>
        <p class="pcard__loc">${icon('i-pin')} ${esc(h.area)}, ${esc(h.city)}</p>
        <div class="facts">${h.beds ? `<span>${icon('i-bed')} ${h.beds} bed${h.beds > 1 ? 's' : ''}</span>` : '<span>' + icon('i-bed') + ' Open-plan</span>'}<span>${icon('i-bath')} ${h.baths} bath${h.baths > 1 ? 's' : ''}</span><span>${icon('i-area')} ${h.size} m²</span></div>
        <label class="pcard__compare"><input type="checkbox" data-cmp="${h.id}" ${inCmp ? 'checked' : ''}> Compare</label>
      </div>
    </li>`;
  }
  function render() {
    const list = results();
    $('#cards').innerHTML = list.map(card).join('');
    $('#empty').hidden = list.length > 0;
    $('#emptyText').textContent = q.saved && !favs.length ? 'You haven’t saved any homes yet. Tap the heart on a listing to keep it here — it stays saved on this device.' : 'Try another city, a higher budget or fewer bedrooms. New listings arrive every week.';
    $('#dealWord').textContent = q.saved ? 'you saved' : (q.deal === 'rent' ? 'for rent' : 'for sale');
    $('#resultCount').textContent = `${list.length} ${list.length === 1 ? 'property' : 'properties'}${q.city ? ' in ' + q.city : ' across Tunisia'}`;
    const chips = [];
    if (q.city) chips.push(['city', q.city]);
    if (q.type) chips.push(['type', q.type]);
    if (q.max) chips.push(['max', 'Up to ' + money(+q.max)]);
    if (q.beds) chips.push(['beds', q.beds + '+ bedrooms']);
    if (q.saved) chips.push(['saved', 'Saved homes']);
    $('#activeChips').innerHTML = chips.map(([k, l]) => `<button class="chip-x" data-chip="${k}" aria-label="Remove filter: ${esc(l)}">${esc(l)} ${icon('i-close')}</button>`).join('');
  }
  $('#activeChips').addEventListener('click', e => {
    const b = e.target.closest('[data-chip]'); if (!b) return;
    const k = b.dataset.chip;
    if (k === 'saved') { q.saved = false; $('#savedOnly').checked = false; syncSavedBtn(); } else q[k] = k === 'beds' ? 0 : '';
    writeSearch(); render();
  });

  /* ---------- Favourites ---------- */
  function toggleFav(id) {
    const h = homeById(id);
    if (favs.includes(id)) { favs = favs.filter(x => x !== id); toast(h.title + ' removed from saved homes'); }
    else { favs.push(id); toast(h.title + ' saved'); const c = $('#savedCount'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    store.set('primenest.favs', favs);
    syncFavUI();
    if (q.saved) render();
  }
  function syncFavUI() {
    $('#savedCount').textContent = favs.length;
    $('#savedBtn').setAttribute('aria-label', `Saved homes, ${favs.length}`);
    $$('[data-fav]').forEach(b => { const on = favs.includes(b.dataset.fav); b.setAttribute('aria-pressed', String(on)); b.innerHTML = icon(on ? 'i-heart-fill' : 'i-heart') + (b.dataset.label ? `<span>${on ? 'Saved' : 'Save'}</span>` : ''); });
  }

  /* ---------- Compare ---------- */
  function toggleCmp(id, checked) {
    if (checked && !cmp.includes(id)) {
      if (cmp.length >= 3) { toast('You can compare up to 3 homes — remove one first.'); syncCmpUI(); return; }
      cmp.push(id);
    } else if (!checked) cmp = cmp.filter(x => x !== id);
    store.set('primenest.compare', cmp); syncCmpUI();
  }
  function syncCmpUI() {
    $$('[data-cmp]').forEach(c => { c.checked = cmp.includes(c.dataset.cmp); });
    const bar = $('#compareBar');
    bar.hidden = !cmp.length;
    document.body.classList.toggle('has-compare', cmp.length > 0);
    $('#compareThumbs').innerHTML = cmp.map(id => `<li><img src="${IMG(homeById(id).img + '-600')}" alt="${esc(homeById(id).title)}" width="44" height="44"></li>`).join('');
    $('#compareText').textContent = cmp.length === 1 ? '1 home selected — add up to 2 more' : `${cmp.length} of 3 homes selected`;
    $('#compareOpen').disabled = cmp.length < 2;
    if ($('#compare').open) renderCompare();
  }
  $('#compareClear').addEventListener('click', () => { cmp = []; store.set('primenest.compare', cmp); syncCmpUI(); });
  $('#compareOpen').addEventListener('click', () => { renderCompare(); openDialog($('#compare')); });
  function renderCompare() {
    const hs = cmp.map(homeById);
    if (hs.length < 2) { closeDialog($('#compare')); return; }
    const ppm = h => h.price / h.size;
    const bestPpm = Math.min(...hs.filter(h => h.deal === 'buy').map(ppm));
    const maxSize = Math.max(...hs.map(h => h.size));
    const allFeat = ['Pool', 'Garden', 'Sea view', 'Parking', 'Furnished', 'Terrace'];
    const has = (h, f) => h.features.some(x => x.toLowerCase().includes(f.toLowerCase().replace('parking', 'park')) || (f === 'Parking' && /garage/i.test(x)) || (f === 'Sea view' && /sea view|beach access/i.test(x)));
    const row = (label, fn) => `<tr><th scope="row">${label}</th>${hs.map(h => `<td>${fn(h)}</td>`).join('')}</tr>`;
    $('#cmpTable').innerHTML = `<thead><tr><td></td>${hs.map(h => `<th scope="col"><img src="${IMG(h.img + '-600')}" alt="" width="600" height="400"><strong>${esc(h.title)}</strong><span class="muted">${esc(h.area)}, ${esc(h.city)}</span><br><button class="remove" data-cmp-remove="${h.id}">Remove</button></th>`).join('')}</tr></thead><tbody>` +
      row('Price', h => `<strong>${priceLabel(h)}</strong>`) +
      row('Type', h => `${h.type} · ${h.deal === 'rent' ? 'Rent' : 'Sale'}`) +
      row('Bedrooms', h => h.beds || 'Open-plan') +
      row('Bathrooms', h => h.baths) +
      row('Living area', h => `<span class="${h.size === maxSize ? 'best' : ''}">${h.size} m²</span>`) +
      row('Price per m²', h => h.deal === 'buy' ? `<span class="${ppm(h) === bestPpm ? 'best' : ''}">${money(ppm(h))}</span>` : '—') +
      row('Plot', h => h.land ? h.land + ' m²' : '—') +
      row('Built', h => h.year) +
      allFeat.map(f => row(f, h => has(h, f) ? '✓' : '<span class="muted">—</span>')).join('') +
      row('', h => `<button class="btn btn--green btn--sm" data-open="${h.id}">View details</button>`) + '</tbody>';
  }
  $('#cmpTable').addEventListener('click', e => {
    const r = e.target.closest('[data-cmp-remove]'); if (r) { toggleCmp(r.dataset.cmpRemove, false); return; }
    const o = e.target.closest('[data-open]'); if (o) { closeDialog($('#compare')); openDetail(o.dataset.open); }
  });

  /* ---------- Dialogs ---------- */
  function openDialog(d) { if (!d.open) d.showModal(); }
  function closeDialog(d) { if (d.open) d.close(); }
  $$('dialog').forEach(d => d.addEventListener('click', e => {
    if (e.target === d && !d.classList.contains('lightbox')) closeDialog(d);
    if (e.target.closest('[data-close]')) closeDialog(d);
  }));

  /* ---------- Cards events ---------- */
  $('#cards').addEventListener('click', e => {
    const f = e.target.closest('[data-fav]'); if (f) { e.preventDefault(); toggleFav(f.dataset.fav); return; }
    const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); openDetail(o.dataset.open, o); }
  });
  $('#cards').addEventListener('change', e => { const c = e.target.closest('[data-cmp]'); if (c) toggleCmp(c.dataset.cmp, c.checked); });

  /* ---------- Neighbourhood illustration (inline SVG, no external maps) ---------- */
  function hoodSVG(h) {
    const seed = h.id.length;
    const sea = h.coast ? `<path d="M0 0H600V60C520 78 470 56 400 70S260 60 180 76 60 58 0 70Z" fill="#cfe4ea"/><path d="M40 30c20-6 40 6 60 0M260 22c20-6 40 6 60 0M470 36c20-6 40 6 60 0" stroke="#9cc6d2" stroke-width="3" fill="none" stroke-linecap="round"/>` : '';
    const lake = h.lake ? `<ellipse cx="520" cy="60" rx="140" ry="70" fill="#cfe4ea"/>` : '';
    const blocks = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      const x = 20 + c * 98, y = 96 + r * 56;
      if ((r === 1 && (c === 2 || c === 3))) continue;
      const park = (r + c + seed) % 7 === 0;
      blocks.push(`<rect x="${x}" y="${y}" width="82" height="40" rx="6" fill="${park ? '#d7e6cf' : '#ece6da'}"/>` + (park ? `<circle cx="${x + 22}" cy="${y + 20}" r="9" fill="#b8d3a8"/><circle cx="${x + 50}" cy="${y + 16}" r="11" fill="#b8d3a8"/>` : ''));
    }
    const slots = [[70, 118], [520, 118], [90, 230], [500, 230]];
    const pins = h.near.slice(0, 4).map(([name, dist], i) => {
      const [x, y] = slots[i];
      const anchor = x > 300 ? 'end' : 'start';
      const tx = x > 300 ? x - 16 : x + 16;
      return `<g><circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="#1f3a33" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="3.5" fill="#b8894a"/>
        <text x="${tx}" y="${y - 2}" text-anchor="${anchor}" font-size="13" font-weight="700" fill="#1b2421" font-family="system-ui, sans-serif">${esc(name)}</text>
        <text x="${tx}" y="${y + 13}" text-anchor="${anchor}" font-size="12" fill="#5f6b66" font-family="system-ui, sans-serif">${esc(dist)}</text>
        <path d="M${x} ${y}L300 170" stroke="#b8894a" stroke-width="1.5" stroke-dasharray="4 5" fill="none" opacity=".7"/></g>`;
    }).join('');
    return `<svg viewBox="0 0 600 270" role="img" aria-labelledby="hoodT hoodD">
      <title id="hoodT">Illustrated neighbourhood map around ${esc(h.title)}</title>
      <desc id="hoodD">Nearby: ${h.near.map(n => n.join(' ')).join(', ')}.</desc>
      <rect width="600" height="270" fill="#f6f2ea"/>${sea}${lake}
      <path d="M0 88H600M0 144H600M0 200H600M108 80V270M206 80V270M304 80V270M402 80V270M500 80V270" stroke="#fff" stroke-width="12"/>
      ${blocks.join('')}${pins}
      <g transform="translate(300 170)"><circle r="30" fill="#1f3a33" opacity=".12"/><path d="M0 18s-16-13-16-25a16 16 0 0 1 32 0c0 12-16 25-16 25Z" transform="translate(0 -20)" fill="#1f3a33"/><path d="M-6 -26l6-5 6 5v7h-12Z" fill="#d9b57a"/></g>
    </svg>`;
  }

  /* ---------- Detail ---------- */
  const detail = $('#detail');
  let currentHome = null, detailReturn = null;
  function openDetail(id, trigger) {
    const h = homeById(id); if (!h) return;
    currentHome = h; detailReturn = trigger || document.activeElement;
    const a = agentById(h.agent);
    const fav = favs.includes(h.id);
    const g = h.photos.slice(0, 4);
    while (g.length < 3) g.push(h.photos[0]);
    const today = new Date().toISOString().slice(0, 10);
    $('#detailBody').innerHTML = `
      <div class="gallery">${g.map(([src, alt], i) => `<button type="button" data-lb="${i % h.photos.length}" aria-label="Open photo ${i + 1}: ${esc(alt)}"><img src="${src}" width="1200" height="800" alt="">${i === 0 ? `<span class="gallery__all">${icon('i-photos')} All ${h.photos.length} photos</span>` : ''}</button>`).join('')}</div>
      <div class="detail__grid">
        <div>
          <div class="detail__head">
            <div><p class="eyebrow">${h.deal === 'rent' ? 'For rent' : 'For sale'} · ${h.type}</p><h2 class="detail__title" id="dTitle">${esc(h.title)}</h2>
            <p class="pcard__loc">${icon('i-pin')} ${esc(h.area)}, ${esc(h.city)}</p></div>
            <p class="detail__price">${priceLabel(h)}</p>
          </div>
          <div class="detail__actions">
            <button class="btn btn--ghost btn--sm" data-fav="${h.id}" data-label="1" aria-pressed="${fav}">${icon(fav ? 'i-heart-fill' : 'i-heart')}<span>${fav ? 'Saved' : 'Save'}</span></button>
            <label class="btn btn--ghost btn--sm"><input type="checkbox" data-cmp="${h.id}" ${cmp.includes(h.id) ? 'checked' : ''} style="accent-color:var(--green);width:18px;height:18px;margin:0"> Compare</label>
            <button class="btn btn--ghost btn--sm" id="shareBtn">${icon('i-external')} Share</button>
          </div>
          <dl class="keyfacts">
            <div><dt>Bedrooms</dt><dd>${h.beds || '—'}</dd></div>
            <div><dt>Bathrooms</dt><dd>${h.baths}</dd></div>
            <div><dt>Living area</dt><dd>${h.size} m²</dd></div>
            <div><dt>${h.land ? 'Plot' : 'Built'}</dt><dd>${h.land ? h.land + ' m²' : h.year}</dd></div>
          </dl>
          <p>${esc(h.desc)}</p>
          <h3>Features</h3>
          <ul class="features">${h.features.map(f => `<li>${icon('i-check')} ${esc(f)}</li>`).join('')}</ul>
          <h3>The neighbourhood</h3>
          <div class="hood">${hoodSVG(h)}
            <div class="hood__foot"><span class="muted">Approximate location — exact address shared after booking.</span>
            <a href="https://www.google.com/maps/search/?api=1&query=${h.ll[0]},${h.ll[1]}" target="_blank" rel="noopener">Open in Maps ${icon('i-external')}<span class="sr-only">(opens in a new tab)</span></a></div>
          </div>
        </div>
        <aside class="detail__side">
          <div class="side-card">
            <div class="agent-mini"><img src="${IMG(a.img)}" alt="" width="56" height="56"><div><strong>${a.name}</strong><span>${a.role}</span></div></div>
            <form id="viewForm" novalidate>
              <h3>Request a viewing</h3>
              <div class="form-grid">
                <div class="field"><label for="vName">Name</label><input id="vName" name="name" autocomplete="name" required><p class="err"></p></div>
                <div class="field"><label for="vPhone">Phone</label><input id="vPhone" name="phone" type="tel" autocomplete="tel" required data-rule="phone"><p class="err"></p></div>
                <div class="field"><label for="vDate">Preferred date</label><input id="vDate" name="date" type="date" min="${today}" required data-rule="future"><p class="err"></p></div>
                <div class="field"><label for="vTime">Time</label><select id="vTime" name="time"><option>Morning (9–12)</option><option>Afternoon (14–17)</option><option>Evening (17–19)</option><option>Video call</option></select><p class="err"></p></div>
              </div>
              <button class="btn btn--brass btn--block" type="submit">Book viewing</button>
            </form>
            <div class="success-inline" id="viewSuccess" hidden tabindex="-1"></div>
          </div>
          <div class="side-card mini-calc">${h.deal === 'buy' ? `
            <h3>Estimate your payments</h3>
            <div class="rf"><div class="rf__top"><label for="dDown">Down payment</label><output id="dDownOut"></output></div><input type="range" id="dDown" min="10" max="80" step="5" value="20"></div>
            <div class="rf"><div class="rf__top"><label for="dYears">Term</label><output id="dYearsOut"></output></div><input type="range" id="dYears" min="5" max="25" step="1" value="20"></div>
            <div class="mini-calc__out"><span>Per month at 9.5%</span><strong id="dMonthly"></strong></div>` : `
            <h3>Move-in costs</h3>
            <dl class="calc__dl"><div><dt>First month</dt><dd>${money(h.price)}</dd></div><div><dt>Deposit (2 months)</dt><dd>${money(h.price * 2)}</dd></div><div><dt>Agency fee (1 month)</dt><dd>${money(h.price)}</dd></div><div><dt><strong>Total at signing</strong></dt><dd><strong>${money(h.price * 4)}</strong></dd></div></dl>`}
          </div>
        </aside>
      </div>`;
    if (h.deal === 'buy') {
      const upd = () => {
        const d = +$('#dDown').value, y = +$('#dYears').value;
        $('#dDownOut').textContent = d + '% · ' + money(h.price * d / 100);
        $('#dYearsOut').textContent = y + ' years';
        $('#dMonthly').textContent = money(payment(h.price * (1 - d / 100), 9.5, y));
        setFill($('#dDown')); setFill($('#dYears'));
      };
      $('#dDown').addEventListener('input', upd); $('#dYears').addEventListener('input', upd); upd();
    }
    const prev = store.get('primenest.contact', {});
    if (prev.name) $('#vName').value = prev.name;
    if (prev.phone) $('#vPhone').value = prev.phone;
    try { history.replaceState(null, '', '#p/' + h.id); } catch (e) { /* file:// may block */ }
    openDialog(detail);
    detail.scrollTop = 0;
    requestAnimationFrame(() => { detail.scrollTop = 0; $('.modal__close', detail).focus({ preventScroll: true }); });
  }
  detail.addEventListener('close', () => {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    if (detailReturn && document.contains(detailReturn)) detailReturn.focus();
  });
  detail.addEventListener('click', e => {
    const lb = e.target.closest('[data-lb]'); if (lb) { openLightbox(currentHome, +lb.dataset.lb); return; }
    const f = e.target.closest('[data-fav]'); if (f) { toggleFav(f.dataset.fav); return; }
    if (e.target.closest('#shareBtn')) {
      const url = location.href.split('#')[0] + '#p/' + currentHome.id;
      if (navigator.share) navigator.share({ title: currentHome.title, url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link copied to clipboard'), () => toast(url));
      else toast(url);
    }
  });
  detail.addEventListener('change', e => { const c = e.target.closest('[data-cmp]'); if (c) toggleCmp(c.dataset.cmp, c.checked); });
  detail.addEventListener('submit', e => {
    if (e.target.id !== 'viewForm') return;
    e.preventDefault();
    const form = e.target;
    if (!validateForm(form)) return;
    const f = form.elements;
    const v = { home: currentHome.id, name: f.name.value.trim(), phone: f.phone.value.trim(), date: f.date.value, time: f.time.value, at: new Date().toISOString() };
    const list = store.get('primenest.viewings', []); list.push(v); store.set('primenest.viewings', list);
    store.set('primenest.contact', Object.assign(store.get('primenest.contact', {}), { name: v.name, phone: v.phone }));
    const a = agentById(currentHome.agent);
    const when = new Date(v.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    form.hidden = true;
    const s = $('#viewSuccess');
    s.innerHTML = `<div class="success__icon" style="margin:0 auto 1rem">${icon('i-check')}</div><h3 style="text-align:center">Viewing requested</h3><p class="muted" style="text-align:center">${esc(a.name.split(' ')[0])} will call ${esc(v.phone)} to confirm <strong>${esc(when)}</strong>, ${esc(v.time.toLowerCase())}.</p>`;
    s.hidden = false; s.focus();
  });

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  let lbHome = null, lbIdx = 0;
  function openLightbox(h, i) {
    lbHome = h;
    $('#lbThumbs').innerHTML = h.photos.map(([src], k) => `<button type="button" data-k="${k}" aria-label="Photo ${k + 1}"><img src="${src}" alt="" width="72" height="50"></button>`).join('');
    showLb(i); openDialog(lb);
  }
  function showLb(i) {
    const n = lbHome.photos.length; lbIdx = (i + n) % n;
    const [src, alt] = lbHome.photos[lbIdx];
    const img = $('#lbImg'); img.src = src; img.alt = alt;
    img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    $('#lbCap').textContent = alt;
    $('#lbCount').textContent = `${lbHome.title} — ${lbIdx + 1} / ${n}`;
    $$('#lbThumbs button').forEach((b, k) => b.setAttribute('aria-current', String(k === lbIdx)));
  }
  $('#lbPrev').addEventListener('click', () => showLb(lbIdx - 1));
  $('#lbNext').addEventListener('click', () => showLb(lbIdx + 1));
  $('#lbThumbs').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) showLb(+b.dataset.k); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') showLb(lbIdx - 1); if (e.key === 'ArrowRight') showLb(lbIdx + 1); });
  let tx = null;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) showLb(lbIdx + (dx < 0 ? 1 : -1)); tx = null; });

  /* ---------- Mortgage ---------- */
  function payment(P, rate, years) {
    const r = rate / 100 / 12, n = years * 12;
    return r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
  }
  function setFill(inp) { inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min) * 100) + '%'); }
  function calc() {
    const price = +$('#mPrice').value, down = +$('#mDown').value, rate = +$('#mRate').value, years = +$('#mYears').value;
    const loan = price * (1 - down / 100);
    const m = payment(loan, rate, years), total = m * years * 12, interest = total - loan;
    $('#mPriceOut').textContent = money(price);
    $('#mDownOut').textContent = `${down}% · ${money(price * down / 100)}`;
    $('#mRateOut').textContent = rate.toFixed(2) + ' %';
    $('#mYearsOut').textContent = years + ' years';
    $('#mMonthly').textContent = money(m);
    $('#mLoan').textContent = money(loan);
    $('#mInterest').textContent = money(interest);
    $('#mTotal').textContent = money(total);
    const C = 2 * Math.PI * 48, share = loan / total;
    $('#donutPrincipal').setAttribute('stroke-dasharray', `${(C * share).toFixed(1)} ${C.toFixed(1)}`);
    $('#donutLabel').textContent = `Principal ${Math.round(share * 100)}% and interest ${100 - Math.round(share * 100)}% of the total repaid`;
    $$('#calc input[type=range]').forEach(setFill);
  }
  $('#calc').addEventListener('input', calc);

  /* ---------- Agents ---------- */
  $('#agentList').innerHTML = AGENTS.map(a => `<li class="agent"><img src="${IMG(a.img)}" width="400" height="400" alt="${esc(a.alt)}" loading="lazy">
    <div class="agent__body"><h3>${a.name}</h3><p class="agent__role">${a.role}</p><p class="agent__areas">${a.areas}</p>
    <div class="agent__actions"><a class="btn btn--green" href="#contact" data-agent="${a.id}">Message</a><a class="icon-btn" href="tel:${a.phone.replace(/\s/g, '')}" aria-label="Call ${a.name}, ${a.phone}">${icon('i-phone')}</a></div></div></li>`).join('');
  $('#cAgent').insertAdjacentHTML('beforeend', AGENTS.map(a => `<option value="${a.id}">${a.name} — ${a.role.split('·')[0].trim()}</option>`).join(''));
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-agent]'); if (a) { $('#cAgent').value = a.dataset.agent; setTimeout(() => $('#cName').focus({ preventScroll: true }), 500); }
    const t = e.target.closest('[data-topic]'); if (t) $('#cTopic').value = t.dataset.topic;
  });

  /* ---------- Validation ---------- */
  const rules = {
    phone: v => /^[2-9]\d{7}$/.test(v.replace(/\D/g, '').replace(/^216(?=\d{8}$)/, '')) ? '' : 'Enter a valid Tunisian number, e.g. 20 123 456.',
    future: v => v && v >= new Date().toISOString().slice(0, 10) ? '' : 'Choose today or a later date.'
  };
  function validateField(f) {
    const wrap = f.closest('.field'); if (!wrap) return true;
    const v = f.value.trim(); let msg = '';
    if (f.required && !v) msg = 'This field is required.';
    else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Enter a valid email address.';
    else if (f.minLength > 0 && v.length < f.minLength) msg = `Please write at least ${f.minLength} characters.`;
    else if (f.dataset.rule) msg = rules[f.dataset.rule](v);
    wrap.classList.toggle('invalid', !!msg);
    f.setAttribute('aria-invalid', String(!!msg));
    const err = $('.err', wrap);
    if (err) { if (!err.id) err.id = (f.id || f.name) + '-err'; err.textContent = msg; f.setAttribute('aria-describedby', err.id); }
    return !msg;
  }
  function validateForm(form) {
    const bad = $$('input, select, textarea', form).filter(f => f.type !== 'checkbox' && !validateField(f));
    if (bad.length) { bad[0].focus(); return false; }
    return true;
  }
  document.addEventListener('input', e => { if (e.target.closest('.field.invalid')) validateField(e.target); });
  document.addEventListener('focusout', e => { if (e.target.matches('.field input, .field textarea') && e.target.value) validateField(e.target); });

  /* ---------- Contact form ---------- */
  const cForm = $('#contactForm');
  const savedContact = store.get('primenest.contact', {});
  ['name', 'email', 'phone'].forEach(k => { if (savedContact[k]) cForm.elements[k].value = savedContact[k]; });
  cForm.addEventListener('submit', e => {
    e.preventDefault();
    let ok = validateForm(cForm);
    const consent = $('#cConsent');
    $('#cConsent-err').textContent = consent.checked ? '' : 'Please tick the box so we can reply.';
    if (!consent.checked && ok) { consent.focus(); ok = false; }
    if (!ok) return;
    const f = cForm.elements;
    const msg = { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), topic: f.topic.value, agent: f.agent.value, message: f.message.value.trim(), at: new Date().toISOString() };
    const list = store.get('primenest.messages', []); list.push(msg); store.set('primenest.messages', list);
    store.set('primenest.contact', { name: msg.name, email: msg.email, phone: msg.phone });
    const a = agentById(msg.agent);
    $('#contactSuccessText').textContent = `Thanks ${msg.name.split(' ')[0]} — ${a ? a.name : 'one of our agents'} will get back to you at ${msg.email} within one working day.`;
    $('#contactSuccess').hidden = false; $('#contactSuccess').focus();
  });
  $('#contactAgain').addEventListener('click', () => { $('#contactSuccess').hidden = true; cForm.elements.message.value = ''; $('#cConsent').checked = false; cForm.elements.message.focus(); });

  /* ---------- Init ---------- */
  fillMax(); render(); syncFavUI(); syncCmpUI(); calc();
  const m = /^#p\/(.+)$/.exec(location.hash);
  if (m && homeById(m[1])) openDetail(m[1]);
})();
