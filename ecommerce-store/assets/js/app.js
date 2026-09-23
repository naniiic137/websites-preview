/* LUXE store — vanilla JS. Cart, wishlist and orders persist in localStorage. */
(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const money = n => {
    const r = Math.round(n * 100) / 100;
    return (Number.isInteger(r) ? r.toLocaleString('en-US') : r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' DT';
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ---------- Catalogue ---------- */
  const COLORS = { Black: '#1d1b19', White: '#f4f1ea', Red: '#c62d2d', Beige: '#d8c3a5', Blue: '#2f4a73', Green: '#4d5a3f', Brown: '#7a4b2c', Pink: '#e6b3a8', Terracotta: '#c0643b' };
  const APPAREL = ['XS', 'S', 'M', 'L', 'XL'];
  const SHOES = ['40', '41', '42', '43', '44', '45'];
  const ONE = ['One size'];
  const P = (id, name, cat, type, price, opt) => Object.assign({ id, name, cat, type, price, img: `assets/img/p-${id}.webp`, detail: `assets/img/p-${id}-detail.webp` }, opt);
  const PRODUCTS = [
    P('scarlet-maxi-dress', 'Scarlet Wrap Maxi Dress', 'women', 'Dresses', 289, { colors: ['Red', 'Black'], sizes: APPAREL, out: ['XL'], rating: 4.8, reviews: 126, isNew: true, order: 1, alt: 'Woman twirling in a flowing red maxi dress outdoors', desc: 'A floor-grazing wrap dress cut on the bias so it moves with you. Adjustable tie waist, flutter sleeves and a hidden side pocket.', fabric: '100% viscose crêpe. Cold hand wash, hang to dry, cool iron.' }),
    P('linen-offshoulder-dress', 'Linen Off-Shoulder Dress', 'women', 'Dresses', 219, { was: 259, colors: ['White', 'Beige'], sizes: APPAREL, out: ['XS'], rating: 4.6, reviews: 88, order: 5, alt: 'Woman in a white off-shoulder mini dress on a staircase', desc: 'A breezy mini in washed linen with a smocked back, elasticated neckline and broderie hem.', fabric: '100% European linen. Machine wash 30°C, gets softer with every wash.' }),
    P('ruffle-poplin-blouse', 'Ruffle Poplin Blouse', 'women', 'Tops', 139, { colors: ['White', 'Black'], sizes: APPAREL, rating: 4.7, reviews: 64, order: 9, alt: 'Woman in a white ruffled off-shoulder poplin blouse', desc: 'Crisp cotton poplin with a double ruffle neckline — wear it on or off the shoulder.', fabric: '100% organic cotton poplin. Machine wash 30°C.' }),
    P('satin-cami-romper', 'Satin Cami Romper', 'women', 'Dresses', 179, { colors: ['Green', 'Black'], sizes: APPAREL, out: ['S'], rating: 4.5, reviews: 41, isNew: true, order: 3, alt: 'Olive satin romper with thin straps and a belt, hung on a wall', desc: 'Liquid-satin romper with adjustable straps and a self-tie belt. Dress it up with heels or down with sneakers.', fabric: '95% recycled polyester satin, 5% elastane. Hand wash cold.' }),
    P('open-knit-poncho', 'Open-Knit Cotton Poncho', 'women', 'Knitwear', 159, { was: 199, colors: ['Beige'], sizes: ['S', 'M', 'L'], rating: 4.4, reviews: 37, order: 12, alt: 'Cream open-knit cotton poncho with fringe on a wooden hanger', desc: 'Hand-finished crochet-effect poncho with a fringed hem. The perfect layer for sea breezes at sunset.', fabric: '100% cotton yarn. Hand wash cold, dry flat.' }),
    P('blush-joggers', 'Blush Relaxed Joggers', 'women', 'Bottoms', 119, { colors: ['Pink', 'Beige'], sizes: APPAREL, rating: 4.3, reviews: 52, order: 15, alt: 'Blush pink relaxed-fit joggers with cuffed ankles', desc: 'Soft brushed jersey joggers with a paper-bag waist and deep pockets. Lounge-ready, street-approved.', fabric: '80% cotton, 20% recycled polyester fleece.' }),
    P('terracotta-bomber', 'Terracotta Bomber', 'women', 'Outerwear', 249, { colors: ['Terracotta', 'Black'], sizes: APPAREL, rating: 4.7, reviews: 29, isNew: true, order: 2, alt: 'Terracotta satin bomber jacket on a hanger', desc: 'A lightweight bomber in a sun-baked terracotta tone, with ribbed trims and a two-way zip.', fabric: 'Shell 100% recycled nylon, lining 100% cotton.' }),
    P('essential-crew-tee', 'Essential Crew Tee', 'men', 'Tops', 59, { colors: ['White', 'Black', 'Blue'], sizes: APPAREL, rating: 4.9, reviews: 311, order: 4, alt: 'Man wearing a plain white crew-neck t-shirt', desc: 'Our best-seller: heavyweight 220 g cotton with a structured collar that keeps its shape wash after wash.', fabric: '100% combed cotton, 220 g/m². Machine wash 40°C.' }),
    P('monochrome-logo-tee', 'Monochrome Logo Tee', 'men', 'Tops', 69, { was: 89, colors: ['Black', 'White'], sizes: APPAREL, out: ['M'], rating: 4.5, reviews: 97, order: 14, alt: 'Black t-shirt with a small white printed logo on a hanger', desc: 'Garment-dyed tee with a tonal chest print and a boxy, slightly cropped fit.', fabric: '100% organic cotton. Wash inside out.' }),
    P('rider-leather-jacket', 'Rider Leather Jacket', 'men', 'Outerwear', 649, { colors: ['Black', 'Brown'], sizes: APPAREL, rating: 4.9, reviews: 74, order: 6, alt: 'Black leather biker jacket with silver zips on a hanger', desc: 'Full-grain lambskin biker with asymmetric zip, quilted shoulders and a buttery-soft lining. Ages beautifully.', fabric: '100% lamb leather. Specialist leather clean only.' }),
    P('selvedge-denim-jacket', 'Selvedge Denim Jacket', 'men', 'Outerwear', 329, { colors: ['Blue'], sizes: APPAREL, rating: 4.6, reviews: 58, order: 10, alt: 'Dark indigo denim jacket with a corduroy collar', desc: 'A 14 oz raw selvedge trucker with a corduroy collar. Fades with you over years of wear.', fabric: '100% cotton selvedge denim, 14 oz. Wash rarely, cold.' }),
    P('oxford-shirt', 'Oxford Button-Down Shirt', 'men', 'Tops', 149, { colors: ['White', 'Blue'], sizes: APPAREL, rating: 4.7, reviews: 133, order: 11, alt: 'Hand reaching for a white oxford shirt on a clothing rail', desc: 'The shirt that goes with everything: soft oxford cotton, button-down collar, back box pleat.', fabric: '100% cotton oxford. Machine wash 40°C.' }),
    P('straight-raw-jeans', 'Straight Raw Denim Jeans', 'men', 'Bottoms', 189, { colors: ['Blue', 'Black'], sizes: ['S', 'M', 'L', 'XL'], rating: 4.4, reviews: 70, order: 16, alt: 'Dark indigo straight-leg jeans laid flat', desc: 'Mid-rise straight leg in rigid Japanese denim. Break them in and they become yours.', fabric: '100% cotton denim, 13.5 oz.' }),
    P('heritage-boots', 'Heritage Leather Boots', 'men', 'Shoes', 389, { was: 449, colors: ['Brown'], sizes: SHOES, out: ['45'], rating: 4.8, reviews: 49, order: 8, alt: 'Pair of worn tan leather lace-up work boots', desc: 'Goodyear-welted work boots in oiled leather with a lug sole. Resoleable for a lifetime of wear.', fabric: 'Oiled full-grain leather upper, rubber lug sole.' }),
    P('runner-sneaker', 'Runner Knit Sneaker', 'men', 'Shoes', 299, { colors: ['Red', 'Black'], sizes: SHOES, rating: 4.6, reviews: 142, isNew: true, order: 7, alt: 'Red knit running sneaker on a red background', desc: 'Featherlight knit upper and a responsive foam sole — built for city miles.', fabric: 'Recycled polyester knit upper, EVA foam midsole.' }),
    P('quilted-chain-bag', 'Quilted Chain Bag', 'accessories', 'Bags', 549, { colors: ['Black', 'Beige'], sizes: ONE, rating: 4.9, reviews: 61, order: 13, alt: 'Black quilted leather camera bag with gold hardware', desc: 'Chevron-quilted leather crossbody with an antique-gold chain strap and three inner compartments.', fabric: 'Calf leather, microsuede lining, brass hardware.' }),
    P('commuter-backpack', 'Commuter Backpack', 'accessories', 'Bags', 229, { colors: ['Blue', 'Black'], sizes: ONE, rating: 4.5, reviews: 83, order: 18, alt: 'Navy canvas backpack with a small yellow label', desc: 'Water-resistant canvas daypack with a padded 15" laptop sleeve and hidden back pocket.', fabric: 'Waxed cotton canvas, recycled polyester lining.' }),
    P('chronograph-watch', 'Chronograph Steel Watch', 'accessories', 'Watches', 690, { colors: ['Blue', 'Black'], sizes: ONE, rating: 4.8, reviews: 27, order: 17, alt: 'Stainless steel chronograph watch with a navy dial', desc: '42 mm stainless steel chronograph, sapphire crystal and 100 m water resistance.', fabric: '316L stainless steel, sapphire glass. 2-year warranty.' }),
    P('wayfarer-sunglasses', 'Classic Wayfarer Sunglasses', 'accessories', 'Eyewear', 179, { was: 219, colors: ['Black', 'Brown'], sizes: ONE, rating: 4.6, reviews: 104, order: 19, alt: 'Black wayfarer sunglasses on a white surface', desc: 'Acetate frames with polarised, 100% UV400 lenses. Comes with a leather case.', fabric: 'Italian acetate, polarised CR-39 lenses.' }),
    P('bifold-wallet', 'Bifold Leather Wallet', 'accessories', 'Small leather', 129, { colors: ['Brown', 'Black'], sizes: ONE, rating: 4.7, reviews: 66, order: 20, alt: 'Brown textured leather bifold wallet', desc: 'Slim vegetable-tanned bifold with six card slots and a note pocket. Develops a rich patina.', fabric: 'Vegetable-tanned leather, hand-stitched edges.' })
  ];
  PRODUCTS.forEach((p, i) => { p.added = PRODUCTS.length - i + (p.isNew ? 100 : 0); });
  const byId = id => PRODUCTS.find(p => p.id === id);

  const SHIP_FREE = 300, SHIP_STD = 8, SHIP_EXPRESS = 15;
  const PROMOS = {
    WELCOME10: { label: '10% off', apply: s => ({ pct: 10 }) },
    LUXE20: { label: '20% off orders over 400 DT', min: 400, apply: s => ({ pct: 20 }) },
    FREESHIP: { label: 'Free shipping', apply: s => ({ freeShip: true }) }
  };

  /* ---------- State ---------- */
  let cart = store.get('luxe.cart', []).filter(i => byId(i.id));
  let wish = store.get('luxe.wish', []).filter(byId);
  let promo = store.get('luxe.promo', null);
  const filters = { cat: 'all', min: 0, max: 700, sizes: new Set(), colors: new Set(), sale: false, q: '' };
  let sort = 'featured';

  const saveCart = () => { store.set('luxe.cart', cart); renderCart(); };
  const saveWish = () => { store.set('luxe.wish', wish); renderWish(); syncWishButtons(); };

  /* ---------- Toasts ---------- */
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = icon('i-check') + '<span>' + esc(msg) + '</span>';
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 2600);
  }

  /* ---------- Dialog helpers ---------- */
  function openDialog(d) { if (!d.open) d.showModal(); }
  function closeDialog(d) { if (d.open) d.close(); }
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d) closeDialog(d); // backdrop click
      const c = e.target.closest('[data-close]');
      if (c) {
        closeDialog(d);
        if (c.dataset.goto) document.getElementById(c.dataset.goto).scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* ---------- Announcement rotator ---------- */
  const msgs = ['Free shipping across Tunisia on orders over 300 DT', 'New here? Use code WELCOME10 for 10% off', 'Cash on delivery available in all 24 governorates'];
  let mi = 0;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) setInterval(() => {
    const el = $('#announceMsg'); el.style.opacity = 0;
    setTimeout(() => { mi = (mi + 1) % msgs.length; el.textContent = msgs[mi]; el.style.opacity = 1; }, 350);
  }, 4500);

  /* ---------- Menu ---------- */
  const menuBtn = $('#menuBtn'), menu = $('#menuDrawer');
  menuBtn.addEventListener('click', () => { openDialog(menu); menuBtn.setAttribute('aria-expanded', 'true'); });
  menu.addEventListener('close', () => { menuBtn.setAttribute('aria-expanded', 'false'); });

  /* ---------- Search ---------- */
  const searchBar = $('#searchBar'), searchInput = $('#searchInput');
  function toggleSearch(show) {
    searchBar.hidden = !show;
    $('#searchBtn').setAttribute('aria-expanded', String(show));
    if (show) searchInput.focus();
  }
  $('#searchBtn').addEventListener('click', () => toggleSearch(searchBar.hidden));
  $('#searchClose').addEventListener('click', () => { searchInput.value = ''; filters.q = ''; renderGrid(); toggleSearch(false); });
  searchInput.addEventListener('input', () => { filters.q = searchInput.value.trim().toLowerCase(); renderGrid(); });
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); $('#shop').scrollIntoView({ behavior: 'smooth' }); });
  searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') $('#searchClose').click(); });

  /* ---------- Category links ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-cat], a[data-sale]');
    if (!a) return;
    if (a.hasAttribute('data-sale')) { resetFilters(); filters.sale = true; $('#saleOnly').checked = true; }
    else { resetFilters(); filters.cat = a.dataset.cat; }
    syncFilterForm(); renderGrid();
    if (menu.open) closeDialog(menu);
  });

  /* ---------- Filters UI ---------- */
  const allSizes = [...APPAREL, ...SHOES, 'One size'];
  $('#sizeChips').innerHTML = allSizes.map(s => `<label class="chip"><input type="checkbox" name="size" value="${s}"><span>${s}</span></label>`).join('');
  $('#colorChips').innerHTML = Object.entries(COLORS).map(([n, c]) => `<label class="swatch" title="${n}"><input type="checkbox" name="color" value="${n}" aria-label="${n}"><span style="--c:${c}"></span></label>`).join('');
  $$('[data-count]').forEach(el => { el.textContent = PRODUCTS.filter(p => p.cat === el.dataset.count).length + ' pieces'; });

  const form = $('#filterForm'), pMin = $('#priceMin'), pMax = $('#priceMax');
  function updateRange() {
    let a = +pMin.value, b = +pMax.value;
    if (a > b - 20) { if (document.activeElement === pMin) { a = b - 20; pMin.value = a; } else { b = a + 20; pMax.value = b; } }
    filters.min = a; filters.max = b;
    const fill = $('#rangeFill');
    fill.style.left = (a / 700 * 100) + '%'; fill.style.right = (100 - b / 700 * 100) + '%';
    $('#priceOut').textContent = money(a) + ' — ' + (b >= 700 ? '700+ DT' : money(b));
    pMin.setAttribute('aria-valuetext', money(a)); pMax.setAttribute('aria-valuetext', money(b));
  }
  form.addEventListener('input', e => {
    const t = e.target;
    if (t.name === 'cat') filters.cat = t.value;
    if (t.name === 'min' || t.name === 'max') updateRange();
    if (t.name === 'size') t.checked ? filters.sizes.add(t.value) : filters.sizes.delete(t.value);
    if (t.name === 'color') t.checked ? filters.colors.add(t.value) : filters.colors.delete(t.value);
    if (t.name === 'sale') filters.sale = t.checked;
    renderGrid();
  });
  function resetFilters() {
    filters.cat = 'all'; filters.min = 0; filters.max = 700; filters.sizes.clear(); filters.colors.clear(); filters.sale = false;
  }
  function syncFilterForm() {
    $$('input[name="cat"]', form).forEach(r => { r.checked = r.value === filters.cat; });
    pMin.value = filters.min; pMax.value = filters.max; updateRange();
    $$('input[name="size"]', form).forEach(c => { c.checked = filters.sizes.has(c.value); });
    $$('input[name="color"]', form).forEach(c => { c.checked = filters.colors.has(c.value); });
    $('#saleOnly').checked = filters.sale;
  }
  form.addEventListener('reset', e => { e.preventDefault(); resetFilters(); filters.q = ''; searchInput.value = ''; syncFilterForm(); renderGrid(); });
  $('#emptyClear').addEventListener('click', () => form.dispatchEvent(new Event('reset', { cancelable: true })));
  $('#sort').addEventListener('change', e => { sort = e.target.value; renderGrid(); });

  // Mobile filter sheet
  const filterPanel = $('#filters'), filterBtn = $('#filterBtn'), backdrop = $('#filtersBackdrop');
  function setFilterSheet(open) {
    filterPanel.classList.toggle('is-open', open);
    backdrop.hidden = !open;
    filterBtn.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) setTimeout(() => $('#filterClose').focus(), 50); else filterBtn.focus();
  }
  filterBtn.addEventListener('click', () => setFilterSheet(true));
  $('#filterClose').addEventListener('click', () => setFilterSheet(false));
  $('#applyFilters').addEventListener('click', () => setFilterSheet(false));
  backdrop.addEventListener('click', () => setFilterSheet(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && filterPanel.classList.contains('is-open')) setFilterSheet(false); });

  /* ---------- Grid ---------- */
  function filtered() {
    let list = PRODUCTS.filter(p =>
      (filters.cat === 'all' || p.cat === filters.cat) &&
      p.price >= filters.min && (filters.max >= 700 || p.price <= filters.max) &&
      (!filters.sizes.size || p.sizes.some(s => filters.sizes.has(s) && !(p.out || []).includes(s))) &&
      (!filters.colors.size || p.colors.some(c => filters.colors.has(c))) &&
      (!filters.sale || p.was) &&
      (!filters.q || (p.name + ' ' + p.type + ' ' + p.cat + ' ' + p.colors.join(' ')).toLowerCase().includes(filters.q))
    );
    const s = { featured: (a, b) => a.order - b.order, new: (a, b) => b.added - a.added, 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews }[sort];
    return list.sort(s);
  }
  function priceHTML(p) {
    return p.was ? `<span class="price price--sale">${money(p.price)}<s aria-label="was ${money(p.was)}">${money(p.was)}</s></span>` : `<span class="price">${money(p.price)}</span>`;
  }
  function renderGrid() {
    const list = filtered();
    const grid = $('#grid');
    grid.innerHTML = list.map((p, i) => `
      <li class="card" style="animation-delay:${Math.min(i, 8) * 40}ms">
        <div class="card__media">
          <img src="${p.img}" width="640" height="800" alt="${esc(p.alt)}" ${i > 2 ? 'loading="lazy"' : ''}>
          <img class="alt" src="${p.detail}" width="560" height="700" alt="" loading="lazy">
          <button class="card__open" data-quick="${p.id}" aria-label="Quick view: ${esc(p.name)}"></button>
          <div class="card__badges">${p.isNew ? '<span class="badge">New</span>' : ''}${p.was ? `<span class="badge badge--sale">−${Math.round((1 - p.price / p.was) * 100)}%</span>` : ''}</div>
          <button class="icon-btn card__wish" data-wish="${p.id}" aria-pressed="${wish.includes(p.id)}" aria-label="Save ${esc(p.name)} to wishlist">${icon(wish.includes(p.id) ? 'i-heart-fill' : 'i-heart')}</button>
          <button class="card__quick" data-quick="${p.id}" aria-label="Quick add: ${esc(p.name)}">${icon('i-bag')}<span>Quick add</span></button>
        </div>
        <div class="card__body">
          <p class="card__type">${p.type}</p>
          <h3 class="card__name">${esc(p.name)}</h3>
          <div class="card__row">${priceHTML(p)}<span class="dots" aria-label="Colours: ${p.colors.join(', ')}">${p.colors.map(c => `<i style="--c:${COLORS[c]}"></i>`).join('')}</span></div>
          <span class="rating">${icon('i-star')} ${p.rating} <span class="sr-only">out of 5,</span>(${p.reviews})</span>
        </div>
      </li>`).join('');
    $('#gridEmpty').hidden = list.length > 0;
    $('#resultCount').textContent = list.length === 1 ? '1 piece' : list.length + ' pieces';
    renderActiveChips();
    $$('.nav a[data-cat]').forEach(a => a.setAttribute('aria-current', String(a.dataset.cat === filters.cat && filters.cat !== 'all')));
  }
  function renderActiveChips() {
    const chips = [];
    if (filters.cat !== 'all') chips.push(['cat', filters.cat[0].toUpperCase() + filters.cat.slice(1)]);
    if (filters.min > 0 || filters.max < 700) chips.push(['price', money(filters.min) + '–' + (filters.max >= 700 ? '700+ DT' : money(filters.max))]);
    filters.sizes.forEach(s => chips.push(['size:' + s, 'Size ' + s]));
    filters.colors.forEach(c => chips.push(['color:' + c, c]));
    if (filters.sale) chips.push(['sale', 'On sale']);
    if (filters.q) chips.push(['q', '“' + filters.q + '”']);
    $('#activeChips').innerHTML = chips.map(([k, l]) => `<button class="active-chip" data-chip="${esc(k)}" aria-label="Remove filter ${esc(l)}">${esc(l)} ${icon('i-close')}</button>`).join('');
    const n = chips.length;
    $('#filterCount').hidden = !n; $('#filterCount').textContent = n;
  }
  $('#activeChips').addEventListener('click', e => {
    const b = e.target.closest('[data-chip]'); if (!b) return;
    const k = b.dataset.chip;
    if (k === 'cat') filters.cat = 'all';
    else if (k === 'price') { filters.min = 0; filters.max = 700; }
    else if (k === 'sale') filters.sale = false;
    else if (k === 'q') { filters.q = ''; searchInput.value = ''; }
    else if (k.startsWith('size:')) filters.sizes.delete(k.slice(5));
    else if (k.startsWith('color:')) filters.colors.delete(k.slice(6));
    syncFilterForm(); renderGrid();
  });

  $('#grid').addEventListener('click', e => {
    const w = e.target.closest('[data-wish]');
    if (w) { toggleWish(w.dataset.wish); return; }
    const q = e.target.closest('[data-quick]');
    if (q) openQuickView(q.dataset.quick, q);
  });

  /* ---------- Wishlist ---------- */
  function toggleWish(id) {
    const p = byId(id);
    if (wish.includes(id)) { wish = wish.filter(x => x !== id); toast(p.name + ' removed from wishlist'); }
    else { wish.push(id); toast(p.name + ' saved to wishlist'); }
    saveWish();
  }
  function syncWishButtons() {
    $$('[data-wish]').forEach(b => {
      const on = wish.includes(b.dataset.wish);
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = icon(on ? 'i-heart-fill' : 'i-heart');
    });
    if (qvProduct) setQvWish();
  }
  function renderWish() {
    const n = wish.length;
    const c = $('[data-wish-count]'); c.hidden = !n; c.textContent = n;
    $('#wishBtn').setAttribute('aria-label', `Wishlist, ${n} item${n === 1 ? '' : 's'}`);
    $('#wishList').innerHTML = wish.map(id => {
      const p = byId(id);
      return `<li class="cart-item"><img src="${p.img}" width="84" height="105" alt="" loading="lazy">
        <div><h3>${esc(p.name)}</h3><p class="cart-item__meta">${p.type} · ${p.colors.join(' / ')}</p>
        <div class="cart-item__row">${priceHTML(p)}<span><button class="btn btn--dark btn--sm" data-wish-add="${id}">Choose size</button></span></div>
        <button class="remove" data-wish-remove="${id}">Remove</button></div></li>`;
    }).join('');
    $('#wishEmpty').hidden = n > 0;
  }
  $('#wishBtn').addEventListener('click', () => openDialog($('#wishDrawer')));
  $('#wishList').addEventListener('click', e => {
    const r = e.target.closest('[data-wish-remove]'); if (r) { toggleWish(r.dataset.wishRemove); return; }
    const a = e.target.closest('[data-wish-add]'); if (a) { closeDialog($('#wishDrawer')); openQuickView(a.dataset.wishAdd); }
  });

  /* ---------- Quick view ---------- */
  const qv = $('#quickView');
  let qvProduct = null, qvColor = null, qvSize = null, qvReturn = null;
  function openQuickView(id, trigger) {
    const p = byId(id); qvProduct = p; qvReturn = trigger || null;
    qvColor = p.colors[0]; qvSize = p.sizes.length === 1 ? p.sizes[0] : null;
    $('#qvType').textContent = p.type + ' · ' + p.cat;
    $('#qvName').textContent = p.name;
    $('#qvPrice').innerHTML = priceHTML(p);
    $('#qvRating').innerHTML = `${icon('i-star')} ${p.rating} · ${p.reviews} reviews`;
    $('#qvDesc').textContent = p.desc;
    $('#qvFabric').textContent = p.fabric;
    const imgs = [[p.img, p.alt], [p.detail, 'Close-up detail of the ' + p.name]];
    $('#qvStage').innerHTML = imgs.map(([s, a]) => `<img src="${s}" width="640" height="800" alt="${esc(a)}">`).join('');
    $('#qvStage').scrollLeft = 0;
    $('#qvThumbs').innerHTML = imgs.map(([s], i) => `<button type="button" data-idx="${i}" aria-label="Show image ${i + 1} of ${imgs.length}" aria-current="${i === 0}"><img src="${s}" alt="" width="64" height="80"></button>`).join('');
    $('#qvColors').innerHTML = p.colors.map((c, i) => `<label class="swatch" title="${c}"><input type="radio" name="qvColor" value="${c}" ${i === 0 ? 'checked' : ''} aria-label="${c}"><span style="--c:${COLORS[c]}"></span></label>`).join('');
    $('#qvColorName').textContent = qvColor;
    $('#qvSizes').innerHTML = p.sizes.map(s => {
      const out = (p.out || []).includes(s);
      return `<label class="chip"><input type="radio" name="qvSize" value="${s}" ${out ? 'disabled' : ''} ${qvSize === s ? 'checked' : ''} aria-label="Size ${s}${out ? ', sold out' : ''}"><span>${s}</span></label>`;
    }).join('');
    $('#sizeGuideBtn').hidden = p.sizes === ONE || p.sizes === SHOES;
    $('#sizeGuide').hidden = true; $('#sizeGuideBtn').setAttribute('aria-expanded', 'false');
    $('#qvSizeMsg').textContent = '';
    $('#qvQty').value = 1;
    setQvWish();
    openDialog(qv);
  }
  function setQvWish() {
    const on = wish.includes(qvProduct.id);
    const b = $('#qvWish'); b.setAttribute('aria-pressed', String(on)); b.innerHTML = icon(on ? 'i-heart-fill' : 'i-heart');
    b.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Save to wishlist');
  }
  qv.addEventListener('close', () => { if (qvReturn && document.contains(qvReturn)) qvReturn.focus(); });
  $('#qvThumbs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const stage = $('#qvStage');
    stage.scrollTo({ left: stage.clientWidth * +b.dataset.idx, behavior: reduce ? 'auto' : 'smooth' });
  });
  $('#qvStage').addEventListener('scroll', () => {
    const s = $('#qvStage'); const idx = Math.round(s.scrollLeft / s.clientWidth);
    $$('#qvThumbs button').forEach((b, i) => b.setAttribute('aria-current', String(i === idx)));
  }, { passive: true });
  $('#qvColors').addEventListener('change', e => { qvColor = e.target.value; $('#qvColorName').textContent = qvColor; });
  $('#qvSizes').addEventListener('change', e => { qvSize = e.target.value; $('#qvSizeMsg').textContent = ''; });
  $('#sizeGuideBtn').addEventListener('click', e => { const g = $('#sizeGuide'); g.hidden = !g.hidden; e.currentTarget.setAttribute('aria-expanded', String(!g.hidden)); });
  $('#qvWish').addEventListener('click', () => toggleWish(qvProduct.id));
  qv.addEventListener('click', e => {
    const b = e.target.closest('[data-qty]'); if (!b) return;
    const i = $('#qvQty'); i.value = Math.min(10, Math.max(1, (+i.value || 1) + +b.dataset.qty));
  });
  $('#qvForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!qvSize) { $('#qvSizeMsg').textContent = 'Please choose a size.'; $('#qvSizes input:not(:disabled)').focus(); return; }
    addToCart(qvProduct.id, qvColor, qvSize, Math.min(10, Math.max(1, +$('#qvQty').value || 1)));
    closeDialog(qv);
  });

  /* ---------- Cart ---------- */
  function addToCart(id, color, size, qty) {
    const key = [id, color, size].join('|');
    const line = cart.find(i => i.key === key);
    if (line) line.qty = Math.min(10, line.qty + qty); else cart.push({ key, id, color, size, qty });
    saveCart();
    const c = $('[data-cart-count]'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    toast(byId(id).name + ' added to your bag');
  }
  function totals(shipMethod) {
    const sub = cart.reduce((s, i) => s + byId(i.id).price * i.qty, 0);
    let discount = 0, freeShip = sub >= SHIP_FREE;
    const pr = promo && PROMOS[promo];
    let promoValid = false;
    if (pr && (!pr.min || sub >= pr.min)) {
      promoValid = true;
      const r = pr.apply(sub);
      if (r.pct) discount = Math.round(sub * r.pct) / 100;
      if (r.freeShip) freeShip = true;
    }
    let ship = freeShip ? 0 : SHIP_STD;
    if (shipMethod === 'express') ship = SHIP_EXPRESS;
    if (shipMethod === 'pickup') ship = 0;
    if (!cart.length) ship = 0;
    return { sub, discount, ship, total: sub - discount + ship, promoValid, freeShip };
  }
  function totalsHTML(t) {
    return `<dt>Subtotal</dt><dd>${money(t.sub)}</dd>` +
      (t.discount ? `<dt class="discount">Discount (${esc(promo)})</dt><dd class="discount">−${money(t.discount)}</dd>` : '') +
      `<dt>Shipping</dt><dd>${t.ship ? money(t.ship) : 'Free'}</dd>` +
      `<dt class="total">Total</dt><dd class="total">${money(t.total)}</dd>`;
  }
  function renderCart() {
    const n = cart.reduce((s, i) => s + i.qty, 0);
    const c = $('[data-cart-count]'); c.hidden = !n; c.textContent = n;
    $('#cartBtn').setAttribute('aria-label', `Shopping bag, ${n} item${n === 1 ? '' : 's'}`);
    $('#cartTitleCount').textContent = n ? `(${n})` : '';
    $('#cartList').innerHTML = cart.map(i => {
      const p = byId(i.id);
      return `<li class="cart-item" data-key="${esc(i.key)}"><img src="${p.img}" width="84" height="105" alt="" loading="lazy">
        <div><h3>${esc(p.name)}</h3><p class="cart-item__meta">${esc(i.color)} · ${esc(i.size)} · ${money(p.price)}</p>
        <div class="cart-item__row">
          <div class="qty qty--sm" role="group" aria-label="Quantity for ${esc(p.name)}">
            <button class="qty__btn" data-step="-1" aria-label="Decrease quantity">${icon('i-minus')}</button>
            <input type="number" value="${i.qty}" min="1" max="10" aria-label="Quantity" data-qty-input inputmode="numeric">
            <button class="qty__btn" data-step="1" aria-label="Increase quantity">${icon('i-plus')}</button>
          </div>
          <strong class="price">${money(p.price * i.qty)}</strong>
        </div>
        <button class="remove" data-remove>Remove</button></div></li>`;
    }).join('');
    const empty = !cart.length;
    $('#cartEmpty').hidden = !empty; $('#cartFoot').hidden = empty; $('#shipMeter').hidden = empty;
    const t = totals();
    $('#cartTotals').innerHTML = totalsHTML(t);
    const left = SHIP_FREE - t.sub;
    $('#shipText').innerHTML = t.freeShip ? '<strong>You’ve unlocked free shipping.</strong>' : `You’re <strong>${money(left)}</strong> away from free shipping.`;
    $('#shipBar').style.width = Math.min(100, t.sub / SHIP_FREE * 100) + '%';
    if (promo) {
      const pr = PROMOS[promo];
      $('#promoInput').value = promo;
      $('#promoMsg').className = 'form-msg ' + (t.promoValid ? 'ok' : 'bad');
      $('#promoMsg').textContent = t.promoValid ? `${promo} applied — ${pr.label}.` : `${promo} needs an order over ${pr.min} DT.`;
    }
  }
  $('#cartBtn').addEventListener('click', () => openDialog($('#cartDrawer')));
  $('#cartList').addEventListener('click', e => {
    const li = e.target.closest('[data-key]'); if (!li) return;
    const line = cart.find(i => i.key === li.dataset.key);
    if (e.target.closest('[data-remove]')) { cart = cart.filter(i => i !== line); saveCart(); toast('Item removed'); $('#cartDrawer .drawer__head .icon-btn').focus(); return; }
    const s = e.target.closest('[data-step]');
    if (s) {
      line.qty += +s.dataset.step;
      if (line.qty < 1) { cart = cart.filter(i => i !== line); saveCart(); return; }
      line.qty = Math.min(10, line.qty); saveCart();
      const btn = $(`[data-key="${CSS.escape(line.key)}"] [data-step="${s.dataset.step}"]`); if (btn) btn.focus();
    }
  });
  $('#cartList').addEventListener('change', e => {
    if (!e.target.matches('[data-qty-input]')) return;
    const li = e.target.closest('[data-key]'); const line = cart.find(i => i.key === li.dataset.key);
    line.qty = Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)); saveCart();
  });
  $('#promoForm').addEventListener('submit', e => {
    e.preventDefault();
    const code = $('#promoInput').value.trim().toUpperCase();
    const msg = $('#promoMsg');
    if (!code) { promo = null; store.set('luxe.promo', null); msg.className = 'form-msg bad'; msg.textContent = 'Enter a promo code.'; renderCart(); return; }
    if (!PROMOS[code]) { msg.className = 'form-msg bad'; msg.textContent = `“${code}” isn’t a valid code.`; return; }
    promo = code; store.set('luxe.promo', promo); renderCart();
  });

  /* ---------- Checkout ---------- */
  const co = $('#checkout'), coForm = $('#coForm');
  let step = 1;
  const nextLabels = { 1: 'Continue to delivery', 2: 'Continue to payment', 3: 'Review order', 4: 'Place order' };
  const saved = store.get('luxe.customer', null);
  $('#checkoutBtn').addEventListener('click', () => {
    closeDialog($('#cartDrawer'));
    step = 1; coForm.hidden = false; $('#confirm').hidden = true; $('#steps').hidden = false;
    if (saved) Object.entries(saved).forEach(([k, v]) => { const f = coForm.elements[k]; if (f && !f.value) f.value = v; });
    showStep(); renderSummary(); openDialog(co);
  });
  function shipMethod() { return (coForm.elements.ship || {}).value || 'standard'; }
  function renderSummary() {
    $('#coItems').innerHTML = cart.map(i => { const p = byId(i.id); return `<li><img src="${p.img}" alt="" width="52" height="64" loading="lazy"><span>${esc(p.name)}<small>${esc(i.color)} · ${esc(i.size)} · ×${i.qty}</small></span><strong>${money(p.price * i.qty)}</strong></li>`; }).join('');
    $('#coTotals').innerHTML = totalsHTML(totals(shipMethod()));
    const t = totals('standard');
    $('[data-ship-price="standard"]').textContent = t.ship ? money(t.ship) : 'Free';
  }
  coForm.addEventListener('change', e => { if (e.target.name === 'ship') renderSummary(); if (e.target.name === 'pay') toggleCard(); });
  function toggleCard() {
    const card = coForm.elements.pay.value === 'card';
    $('#cardFields').hidden = !card;
    $$('#cardFields input').forEach(i => { i.disabled = !card; });
  }
  function showStep() {
    $$('.step', coForm).forEach(f => { f.hidden = +f.dataset.step !== step; });
    $$('#steps li').forEach((li, i) => {
      li.classList.toggle('is-active', i + 1 === step); li.classList.toggle('is-done', i + 1 < step);
      if (i + 1 === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('#coBack').hidden = step === 1;
    $('#coNext').textContent = step === 4 ? 'Place order · ' + money(totals(shipMethod()).total) : nextLabels[step];
    toggleCard();
    if (step === 4) renderReview();
    const first = $(`.step[data-step="${step}"] input:not([type=hidden]):not(:disabled), .step[data-step="${step}"] select`, coForm);
    if (first && co.open) first.focus();
  }
  const rules = {
    phone: v => /^[2-9]\d{7}$/.test(v.replace(/\D/g, '').replace(/^216(?=\d{8}$)/, '')) ? '' : 'Enter a valid Tunisian number (8 digits).',
    zip: v => /^\d{4}$/.test(v) ? '' : 'Postal codes have 4 digits.',
    card: v => { const d = v.replace(/\D/g, ''); if (d.length < 13 || d.length > 19) return 'Enter a full card number.'; let s = 0; for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } s += n; } return s % 10 ? 'This card number doesn’t look right.' : ''; },
    exp: v => { const m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m || +m[1] < 1 || +m[1] > 12) return 'Use the MM/YY format.'; const end = new Date(2000 + +m[2], +m[1], 1); return end > new Date() ? '' : 'This card has expired.'; },
    cvc: v => /^\d{3,4}$/.test(v) ? '' : '3 or 4 digits on the back of the card.'
  };
  function validateField(f) {
    const wrap = f.closest('.field'); if (!wrap) return true;
    let msg = '';
    const v = f.value.trim();
    if (f.required && !v) msg = 'This field is required.';
    else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Enter a valid email address.';
    else if (f.dataset.rule && rules[f.dataset.rule]) msg = rules[f.dataset.rule](v);
    wrap.classList.toggle('invalid', !!msg);
    f.setAttribute('aria-invalid', String(!!msg));
    const err = $('.err', wrap); if (err) { err.textContent = msg; if (!err.id) err.id = f.id + '-err'; f.setAttribute('aria-describedby', err.id); }
    return !msg;
  }
  coForm.addEventListener('blur', e => { if (e.target.matches('input, select') && e.target.value) validateField(e.target); }, true);
  coForm.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'coCard') { const d = t.value.replace(/\D/g, '').slice(0, 19); t.value = d.replace(/(.{4})/g, '$1 ').trim(); }
    if (t.id === 'coExp') { let d = t.value.replace(/\D/g, '').slice(0, 4); if (d.length > 2) d = d.slice(0, 2) + '/' + d.slice(2); t.value = d; }
    if (t.closest('.field.invalid')) validateField(t);
  });
  function renderReview() {
    const f = coForm.elements;
    const shipNames = { standard: 'Standard (2–3 days)', express: 'Express (next day)', pickup: 'Boutique pick-up' };
    const pay = f.pay.value === 'card' ? 'Card ending ' + f.card.value.replace(/\D/g, '').slice(-4) : 'Cash on delivery';
    $('#reviewBox').innerHTML = `<dl><dt>Contact</dt><dd>${esc(f.email.value)} · ${esc(f.phone.value)}</dd>
      <dt>Ship to</dt><dd>${esc(f.first.value)} ${esc(f.last.value)}, ${esc(f.address.value)}, ${esc(f.zip.value)} ${esc(f.city.value)}</dd>
      <dt>Delivery</dt><dd>${shipNames[f.ship.value]}</dd><dt>Payment</dt><dd>${esc(pay)}</dd></dl>`;
  }
  $('#coBack').addEventListener('click', () => { step--; showStep(); });
  coForm.addEventListener('submit', e => {
    e.preventDefault();
    const fields = $$(`.step[data-step="${step}"] input, .step[data-step="${step}"] select`, coForm).filter(f => !f.disabled && f.type !== 'radio' && f.type !== 'checkbox');
    const bad = fields.filter(f => !validateField(f));
    if (bad.length) { bad[0].focus(); return; }
    if (step < 4) {
      if (step === 1) { const f = coForm.elements; store.set('luxe.customer', { email: f.email.value, first: f.first.value, last: f.last.value, phone: f.phone.value, address: f.address.value, city: f.city.value, zip: f.zip.value }); }
      step++; showStep(); return;
    }
    if (!$('#coTerms').checked) { $('#termsErr').textContent = 'Please accept the terms to place your order.'; $('#coTerms').focus(); return; }
    $('#termsErr').textContent = '';
    placeOrder();
  });
  function placeOrder() {
    const f = coForm.elements;
    const t = totals(shipMethod());
    const number = 'LX-' + Date.now().toString(36).toUpperCase().slice(-6);
    const orders = store.get('luxe.orders', []);
    orders.push({ number, date: new Date().toISOString(), items: cart, totals: t, promo, ship: f.ship.value, pay: f.pay.value, customer: { name: f.first.value + ' ' + f.last.value, email: f.email.value, city: f.city.value } });
    store.set('luxe.orders', orders);
    const eta = new Date(); eta.setDate(eta.getDate() + (f.ship.value === 'express' ? 1 : f.ship.value === 'pickup' ? 0 : 3));
    $('#cfName').textContent = f.first.value;
    $('#cfNumber').textContent = number;
    $('#cfEmail').textContent = f.email.value;
    $('#cfEta').textContent = f.ship.value === 'pickup' ? 'Ready for pick-up today after 4 pm at Les Berges du Lac.' : 'Estimated delivery: ' + eta.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + '.';
    coForm.hidden = true; $('#steps').hidden = true; $('#confirm').hidden = false; $('#confirm').focus();
    cart = []; promo = null; store.set('luxe.promo', null); $('#promoInput').value = ''; $('#promoMsg').textContent = ''; $('#coTerms').checked = false;
    ['card', 'exp', 'cvc', 'cardName'].forEach(k => { f[k].value = ''; });
    saveCart(); renderSummary();
  }

  /* ---------- Newsletter ---------- */
  $('#nlForm').addEventListener('submit', e => {
    e.preventDefault();
    const i = $('#nlEmail'), m = $('#nlMsg'), v = i.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { m.textContent = 'Please enter a valid email address.'; i.setAttribute('aria-invalid', 'true'); i.focus(); return; }
    i.setAttribute('aria-invalid', 'false');
    const list = store.get('luxe.newsletter', []);
    if (list.includes(v)) { m.textContent = 'You’re already on the list — see you in your inbox.'; return; }
    list.push(v); store.set('luxe.newsletter', list);
    m.textContent = '✓ Welcome! Your code WELCOME10 is ready to use at checkout.';
    i.value = '';
  });

  /* ---------- Init ---------- */
  updateRange();
  renderGrid(); renderCart(); renderWish();
})();
