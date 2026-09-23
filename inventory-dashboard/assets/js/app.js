/* StockPulse — vanilla JS inventory app. All data lives in localStorage. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const KEY = 'stockpulse-data-v2';
  const DAY = 864e5;
  const money = (n, dec = 0) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const compact = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? '$' + (n / 1e3).toFixed(1) + 'k' : money(n);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* unavailable */ } }
  };

  /* ---------------- Seed data ---------------- */
  const SEED = [
    ['Smartwatch Pure', 'ELC-001', 'Electronics', 45, 15, 118, 249, 'Nordtech', 'p1'],
    ['Wireless Headphones', 'ELC-002', 'Electronics', 120, 30, 38, 89.99, 'Nordtech', 'p2'],
    ['Instant Camera', 'ELC-003', 'Electronics', 18, 10, 62, 129, 'Lumen Supply', 'p3'],
    ['Flyknit Runner — Red', 'FTW-004', 'Footwear', 62, 20, 54, 129.99, 'Stride Co.', 'p4'],
    ['Urban Backpack', 'ACC-005', 'Accessories', 5, 12, 31, 79.99, 'Carry Goods', 'p5'],
    ['Organic White Tee', 'CLT-006', 'Clothing', 200, 50, 7.5, 24.99, 'Loom & Co.', 'p6'],
    ['Quilted Crossbody Bag', 'ACC-007', 'Accessories', 33, 10, 96, 219, 'Carry Goods', 'p7'],
    ['Graphic Print Tee', 'CLT-008', 'Clothing', 88, 30, 9, 29.99, 'Loom & Co.', 'p8'],
    ['Chronograph Watch', 'ACC-009', 'Accessories', 8, 10, 160, 349.99, 'Nordtech', 'p9'],
    ['Essential Black Tee', 'CLT-010', 'Clothing', 0, 40, 7.5, 24.99, 'Loom & Co.', 'p10'],
    ['Trail Runner', 'FTW-011', 'Footwear', 75, 20, 48, 109.99, 'Stride Co.', 'p11'],
    ['Eau de Parfum 50 ml', 'BTY-012', 'Beauty', 7, 12, 64, 139, 'Maison Verre', 'p12'],
    ['Classic Sunglasses', 'ACC-013', 'Accessories', 26, 10, 41, 159.99, 'Lumen Supply', 'p13'],
    ['Retro Sneaker — Sunset', 'FTW-014', 'Footwear', 42, 15, 58, 139.99, 'Stride Co.', 'p14'],
    ['Oxford Shirt', 'CLT-015', 'Clothing', 3, 15, 18, 54.99, 'Loom & Co.', 'p15'],
    ['USB-C Hub 7-in-1', 'ELC-016', 'Electronics', 0, 20, 21, 59.99, 'Nordtech', ''],
    ['Wool Overcoat', 'CLT-017', 'Clothing', 14, 6, 110, 249.99, 'Loom & Co.', '']
  ];
  const IMG_ALT = {
    p1: 'White smartwatch', p2: 'Black over-ear headphones', p3: 'White instant camera', p4: 'Red running shoe', p5: 'Navy backpack',
    p6: 'White T-shirt', p7: 'Black quilted bag', p8: 'Printed T-shirt', p9: 'Steel chronograph watch', p10: 'Black T-shirt',
    p11: 'Grey trail running shoe', p12: 'Perfume bottle', p13: 'Black sunglasses', p14: 'Orange and white sneaker', p15: 'White shirts on hangers'
  };

  // Seeded PRNG so the demo history looks the same every reset
  function seedData() {
    const rng = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42);
    const now = Date.now();
    const products = SEED.map(([name, sku, category, qty, reorder, cost, price, supplier, img], i) =>
      ({ id: 'p' + (i + 1), name, sku, category, qty, reorder, cost, price, supplier, img, updated: now - Math.floor(rng() * 20) * DAY }));
    const moves = [];
    let mid = 1;
    for (let d = 29; d >= 0; d--) {
      const base = now - d * DAY;
      const weekend = new Date(base).getDay() % 6 === 0;
      const sales = 3 + Math.floor(rng() * (weekend ? 7 : 5));
      for (let s = 0; s < sales; s++) {
        const p = products[Math.floor(rng() * products.length)];
        moves.push({ id: 'm' + mid++, pid: p.id, type: 'out', qty: 1 + Math.floor(rng() * (p.price < 60 ? 6 : 3)), note: 'Order #' + (48000 + mid * 7), date: base - Math.floor(rng() * 10) * 36e5 });
      }
      if (d % 4 === 1 || rng() < .12) {
        const p = products[Math.floor(rng() * products.length)];
        moves.push({ id: 'm' + mid++, pid: p.id, type: 'in', qty: 10 + Math.floor(rng() * 40), note: 'PO-' + (2100 + mid), date: base - 2 * 36e5 });
      }
    }
    moves.push({ id: 'm' + mid++, pid: 'p10', type: 'adjust', qty: -2, note: 'Cycle count: damaged', date: now - 5 * DAY });
    moves.sort((a, b) => a.date - b.date);
    // compute "after" values backwards from current stock so the log is coherent
    const running = Object.fromEntries(products.map(p => [p.id, p.qty]));
    for (let i = moves.length - 1; i >= 0; i--) {
      const m = moves[i]; m.after = running[m.pid];
      running[m.pid] -= m.type === 'in' ? m.qty : m.type === 'out' ? -m.qty : m.qty;
      if (running[m.pid] < 0) running[m.pid] = 0;
    }
    return { products, moves, seq: mid };
  }

  let db = store.get(KEY, null);
  if (!db || !Array.isArray(db.products)) { db = seedData(); save(); }
  function save() { store.set(KEY, db); }
  const prefs = Object.assign({ collapsed: false, alerts: true }, store.get('stockpulse-prefs', {}));
  const savePrefs = () => store.set('stockpulse-prefs', prefs);

  const status = p => p.qty <= 0 ? 'out' : p.qty <= p.reorder ? 'low' : 'ok';
  const STATUS_LABEL = { ok: 'In stock', low: 'Low stock', out: 'Out of stock' };
  const byId = id => db.products.find(p => p.id === id);
  const thumb = (p, size = 40) => p.img
    ? `<img class="thumb" src="assets/img/${p.img}.webp" width="${size}" height="${size}" alt="${esc(IMG_ALT[p.img] || p.name)}" loading="lazy">`
    : `<span class="thumb ph" aria-hidden="true">${esc(p.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>`;
  const ago = t => {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago'; if (s < 172800) return 'yesterday';
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  /* ---------------- Toasts ---------------- */
  function toast(msg, action) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<span>${esc(msg)}</span>`;
    if (action) { const b = document.createElement('button'); b.textContent = action.label; b.onclick = () => { action.fn(); t.remove(); }; t.append(b); }
    $('#toasts').append(t); setTimeout(() => t.remove(), action ? 6000 : 3200);
  }

  /* ---------------- Theme ---------------- */
  const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  function syncThemeUI() {
    const d = isDark();
    $('#themeBtn').setAttribute('aria-label', d ? 'Switch to light theme' : 'Switch to dark theme');
    $('#themeSwitch').setAttribute('aria-checked', d);
    $('meta[name="theme-color"]').content = d ? '#0b1219' : '#0f766e';
  }
  function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('stockpulse-theme', t); } catch {} syncThemeUI(); renderCharts(); }
  $('#themeBtn').onclick = () => setTheme(isDark() ? 'light' : 'dark');
  $('#themeSwitch').onclick = () => setTheme(isDark() ? 'light' : 'dark');
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeUI);

  /* ---------------- Sidebar ---------------- */
  const app = $('#app'), sidebar = $('#sidebar'), scrim = $('#scrim'), menuBtn = $('#menuBtn');
  const setCollapsed = c => { prefs.collapsed = c; savePrefs(); app.classList.toggle('collapsed', c); $('#collapseBtn').setAttribute('aria-expanded', !c); $('#collapseBtn').setAttribute('aria-label', c ? 'Expand sidebar' : 'Collapse sidebar'); setTimeout(renderCharts, 280); };
  $('#collapseBtn').onclick = () => setCollapsed(!prefs.collapsed);
  setCollapsed(prefs.collapsed);
  const setDrawer = open => {
    sidebar.classList.toggle('open', open); scrim.hidden = !open; menuBtn.setAttribute('aria-expanded', open);
    if (open) $('.side-nav a', sidebar).focus();
  };
  menuBtn.onclick = () => setDrawer(true);
  scrim.onclick = () => setDrawer(false);
  addEventListener('keydown', e => { if (e.key === 'Escape' && sidebar.classList.contains('open')) { setDrawer(false); menuBtn.focus(); } });

  /* ---------------- Routing ---------------- */
  const TITLES = { dashboard: 'Dashboard', products: 'Products', movements: 'Stock movements', settings: 'Data & settings' };
  let view = 'dashboard';
  function route() {
    const v = (location.hash || '#dashboard').slice(1);
    view = TITLES[v] ? v : 'dashboard';
    $$('.view').forEach(s => s.hidden = s.dataset.view !== view);
    $$('[data-view-link]').forEach(a => a.dataset.viewLink === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    $('#pageTitle').textContent = TITLES[view];
    document.title = `${TITLES[view]} · StockPulse`;
    setDrawer(false);
    render();
  }
  addEventListener('hashchange', () => { route(); $('#content').focus({ preventScroll: true }); scrollTo(0, 0); });

  /* ---------------- Render all ---------------- */
  function render() {
    renderAlerts();
    if (view === 'dashboard') { renderKpis(); renderCharts(); renderLowList(); renderActivity(); }
    if (view === 'products') renderProducts();
    if (view === 'movements') renderMoves();
  }

  /* KPIs */
  const sumMoves = (type, from, to) => db.moves.filter(m => m.type === type && m.date >= from && m.date < to).reduce((a, m) => a + m.qty, 0);
  function renderKpis() {
    const retail = db.products.reduce((a, p) => a + p.qty * p.price, 0);
    const cost = db.products.reduce((a, p) => a + p.qty * p.cost, 0);
    const units = db.products.reduce((a, p) => a + p.qty, 0);
    const low = db.products.filter(p => status(p) === 'low').length, out = db.products.filter(p => status(p) === 'out').length;
    const now = Date.now();
    const sold7 = sumMoves('out', now - 7 * DAY, now + 1), soldPrev = sumMoves('out', now - 14 * DAY, now - 7 * DAY);
    const delta = soldPrev ? Math.round((sold7 - soldPrev) / soldPrev * 100) : 0;
    const I = {
      value: '<svg viewBox="0 0 24 24"><path d="M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/></svg>',
      units: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>',
      sold: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>',
      alert: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17.5v.01"/></svg>'
    };
    $('#kpis').innerHTML = `
      <article class="panel kpi"><p class="kpi-label"><span class="kpi-icon">${I.value}</span>Stock value (retail)</p><p class="kpi-value">${compact(retail)}</p><p class="kpi-foot">${compact(cost)} at cost · ${Math.round((1 - cost / (retail || 1)) * 100)}% margin</p></article>
      <article class="panel kpi"><p class="kpi-label"><span class="kpi-icon">${I.units}</span>Units on hand</p><p class="kpi-value">${units.toLocaleString('en-US')}</p><p class="kpi-foot">across ${db.products.length} products</p></article>
      <article class="panel kpi"><p class="kpi-label"><span class="kpi-icon">${I.sold}</span>Units sold · 7 days</p><p class="kpi-value">${sold7.toLocaleString('en-US')}</p><p class="kpi-foot"><span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</span> vs previous week</p></article>
      <article class="panel kpi ${out ? 'danger' : low ? 'alert' : ''}"><p class="kpi-label"><span class="kpi-icon">${I.alert}</span>Stock alerts</p><p class="kpi-value">${low + out}</p><p class="kpi-foot">${low} low · ${out} out of stock</p></article>`;
  }

  /* Charts (hand-drawn SVG) */
  let range = 14;
  const tip = $('#tooltip');
  const showTip = (html, x, y) => {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y - r.height - 12;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top < 8) top = y + 16;
    tip.style.left = Math.max(8, left) + 'px'; tip.style.top = top + 'px';
  };
  const hideTip = () => { tip.hidden = true; };
  const niceMax = v => { const raw = Math.max(1, v / 4); const p = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / p; return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(s => n <= s)) * p * 4; };

  function renderCharts() {
    if (view !== 'dashboard') return;
    renderMoveChart(); renderCatChart();
  }
  function dayBuckets(n) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = n - 1; i >= 0; i--) { const d = new Date(start - i * DAY); days.push({ d, from: +d, to: +d + DAY, in: 0, out: 0 }); }
    db.moves.forEach(m => { const b = days.find(x => m.date >= x.from && m.date < x.to); if (b && (m.type === 'in' || m.type === 'out')) b[m.type] += m.qty; });
    return days;
  }
  function renderMoveChart() {
    const el = $('#moveChart'); const W = Math.max(280, el.clientWidth || 600); const H = W < 480 ? 220 : 260;
    const days = dayBuckets(range);
    const pad = { l: 34, r: 6, t: 10, b: 26 };
    const max = niceMax(Math.max(1, ...days.map(d => Math.max(d.in, d.out))));
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const slot = iw / days.length;
    const gap = 2; // 2px surface gap between adjacent bars
    const bw = Math.max(2, Math.min(18, (slot * 0.72 - gap) / 2));
    const y = v => pad.t + ih - (v / max) * ih;
    const rr = (x, top, w, h) => { const r = Math.min(4, w / 2, h); if (h <= 0) return ''; return `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${top + h}Z`; };
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of units received and sold per day over the last ${range} days">`;
    for (let i = 0; i <= 4; i++) { const v = max * i / 4, yy = y(v); s += `<line class="${i ? 'gridline' : 'baseline'}" x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}"/><text x="${pad.l - 8}" y="${yy + 4}" text-anchor="end">${Math.round(v)}</text>`; }
    const every = Math.ceil(days.length / (W < 480 ? 5 : 10));
    days.forEach((d, i) => {
      const cx = pad.l + slot * i + slot / 2;
      const x1 = cx - bw - gap / 2, x2 = cx + gap / 2;
      s += `<path class="b-in" d="${rr(x1, y(d.in), bw, pad.t + ih - y(d.in))}"/><path class="b-out" d="${rr(x2, y(d.out), bw, pad.t + ih - y(d.out))}"/>`;
      if ((days.length - 1 - i) % every === 0) s += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${d.d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>`;
      s += `<rect class="hit" tabindex="0" data-i="${i}" x="${pad.l + slot * i}" y="${pad.t}" width="${slot}" height="${ih}" aria-label="${d.d.toDateString()}: ${d.in} received, ${d.out} sold"/>`;
    });
    s += '</svg>';
    el.innerHTML = s;
    const tipHtml = d => `<strong>${d.d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong><div class="row"><span><i class="sw sw-in"></i>Received</span><b>${d.in}</b></div><div class="row"><span><i class="sw sw-out"></i>Sold</span><b>${d.out}</b></div>`;
    $$('.hit', el).forEach(h => {
      const d = days[+h.dataset.i];
      h.addEventListener('pointermove', e => showTip(tipHtml(d), e.clientX, e.clientY));
      h.addEventListener('pointerleave', hideTip);
      h.addEventListener('focus', () => { const r = h.getBoundingClientRect(); showTip(tipHtml(d), r.left + r.width / 2, r.top + 20); });
      h.addEventListener('blur', hideTip);
    });
    $('#moveChartSub').textContent = `Units received vs. sold, last ${range} days`;
    $('#moveTable').innerHTML = '<thead><tr><th>Day</th><th>Received</th><th>Sold</th></tr></thead><tbody>' +
      days.map(d => `<tr><td>${d.d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td><td>${d.in}</td><td>${d.out}</td></tr>`).join('') + '</tbody>';
  }
  function renderCatChart() {
    const el = $('#catChart'); const W = Math.max(280, el.clientWidth || 400);
    const cats = {};
    db.products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + p.qty * p.price; });
    const rows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((a, r) => a + r[1], 0) || 1;
    const rowH = 44, labelW = Math.min(110, W * .32), valW = 64, H = rows.length * rowH + 4;
    const bw = W - labelW - valW;
    const max = Math.max(1, ...rows.map(r => r[1]));
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Horizontal bar chart of stock value by category">`;
    rows.forEach(([c, v], i) => {
      const yy = i * rowH + 8, w = Math.max(3, (v / max) * (bw - 8));
      s += `<text x="0" y="${yy + 15}" class="val">${esc(c)}</text><text x="0" y="${yy + 30}">${Math.round(v / total * 100)}% of value</text>`;
      s += `<path class="b-cat" d="M${labelW},${yy + 4}H${labelW + w - 4}Q${labelW + w},${yy + 4} ${labelW + w},${yy + 8}V${yy + 22}Q${labelW + w},${yy + 26} ${labelW + w - 4},${yy + 26}H${labelW}Z"/>`;
      s += `<text x="${labelW + w + 8}" y="${yy + 20}" class="val">${compact(v)}</text>`;
      s += `<rect class="hit" tabindex="0" data-i="${i}" x="0" y="${yy - 4}" width="${W}" height="${rowH - 4}" aria-label="${esc(c)}: ${money(v)}"/>`;
    });
    s += '</svg>';
    el.innerHTML = s;
    $$('.hit', el).forEach(h => {
      const [c, v] = rows[+h.dataset.i];
      const n = db.products.filter(p => p.category === c);
      const html = `<strong>${esc(c)}</strong><div class="row"><span>Retail value</span><b>${money(v)}</b></div><div class="row"><span>Products</span><b>${n.length}</b></div><div class="row"><span>Units</span><b>${n.reduce((a, p) => a + p.qty, 0)}</b></div>`;
      h.addEventListener('pointermove', e => showTip(html, e.clientX, e.clientY));
      h.addEventListener('pointerleave', hideTip);
      h.addEventListener('focus', () => { const r = h.getBoundingClientRect(); showTip(html, r.left + r.width / 2, r.top + 10); });
      h.addEventListener('blur', hideTip);
      h.addEventListener('click', () => { filters.cat = c; location.hash = '#products'; });
    });
    $('#catTable').innerHTML = '<thead><tr><th>Category</th><th>Retail value</th><th>Share</th></tr></thead><tbody>' +
      rows.map(([c, v]) => `<tr><td>${esc(c)}</td><td>${money(v)}</td><td>${Math.round(v / total * 100)}%</td></tr>`).join('') + '</tbody>';
  }
  $$('.seg button').forEach(b => b.onclick = () => { range = +b.dataset.range; $$('.seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); renderMoveChart(); });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderCharts, 120); });

  function renderLowList() {
    const list = db.products.filter(p => status(p) !== 'ok').sort((a, b) => a.qty / (a.reorder || 1) - b.qty / (b.reorder || 1));
    $('#lowList').innerHTML = list.length ? list.slice(0, 6).map(p => `
      <li>${thumb(p)}
        <div class="li-main"><strong>${esc(p.name)}</strong><small>${p.qty} left · reorder at ${p.reorder}</small>
          <div class="meter ${p.qty === 0 ? 'crit' : ''}" aria-hidden="true"><i style="width:${Math.min(100, p.qty / (p.reorder || 1) * 100)}%"></i></div></div>
        <button class="btn btn-ghost btn-sm" data-restock="${p.id}" aria-label="Restock ${esc(p.name)}">Restock</button>
      </li>`).join('') : '<li class="empty-note">All products are above their reorder point. 🎉</li>';
  }
  function renderActivity() {
    const list = [...db.moves].sort((a, b) => b.date - a.date).slice(0, 6);
    $('#activity').innerHTML = list.map(m => {
      const p = byId(m.pid); const nm = p ? p.name : 'Deleted product';
      const sign = m.type === 'in' ? '+' : m.type === 'out' ? '−' : '±';
      const verb = m.type === 'in' ? `Received ${m.qty}` : m.type === 'out' ? `Sold ${m.qty}` : `Adjusted ${m.qty > 0 ? '+' : ''}${m.qty}`;
      return `<li><span class="mv-ico mv-${m.type}" aria-hidden="true">${sign}</span><div class="li-main"><strong>${esc(nm)}</strong><small>${verb}${m.note ? ' · ' + esc(m.note) : ''}</small></div><span class="when">${ago(m.date)}</span></li>`;
    }).join('') || '<li class="empty-note">No movements yet.</li>';
  }

  /* Alerts */
  function renderAlerts() {
    const list = db.products.filter(p => status(p) !== 'ok');
    const n = list.length;
    $('#alertCount').textContent = n; $('#alertCount').hidden = !n || !prefs.alerts;
    $('#alertBtn').setAttribute('aria-label', `Stock alerts (${n})`);
    $('#navLowBadge').textContent = n; $('#navLowBadge').hidden = !n;
    $('#alertList').innerHTML = n ? list.map(p => `<li><button data-restock="${p.id}">${thumb(p, 32)}<span><strong>${esc(p.name)}</strong><small>${p.qty === 0 ? 'Out of stock' : `Only ${p.qty} left (reorder at ${p.reorder})`}</small></span></button></li>`).join('') : '<li class="empty-note">No alerts</li>';
    $('#alertSwitch').setAttribute('aria-checked', prefs.alerts);
  }
  const alertBtn = $('#alertBtn'), alertPanel = $('#alertPanel');
  alertBtn.onclick = e => { e.stopPropagation(); const open = alertPanel.hidden; alertPanel.hidden = !open; alertBtn.setAttribute('aria-expanded', open); };
  document.addEventListener('click', e => { if (!alertPanel.hidden && !e.target.closest('.alerts')) { alertPanel.hidden = true; alertBtn.setAttribute('aria-expanded', false); } });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !alertPanel.hidden) { alertPanel.hidden = true; alertBtn.setAttribute('aria-expanded', false); alertBtn.focus(); } });
  $('#alertSwitch').onclick = () => { prefs.alerts = !prefs.alerts; savePrefs(); renderAlerts(); };

  document.addEventListener('click', e => {
    const r = e.target.closest('[data-restock]');
    if (r) { alertPanel.hidden = true; const p = byId(r.dataset.restock); openMove(p.id, 'in', Math.max(p.reorder * 2 - p.qty, 1)); }
    const sl = e.target.closest('[data-status-link]');
    if (sl) { filters.status = sl.dataset.statusLink; filters.cat = 'All'; }
  });

  /* ---------------- Products ---------------- */
  const filters = { q: '', cat: 'All', status: 'all', sort: 'name', dir: 'asc' };
  const search = $('#globalSearch');
  search.addEventListener('input', () => { filters.q = search.value.trim().toLowerCase(); if (view !== 'products') location.hash = '#products'; else renderProducts(); });
  addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !$('dialog[open]')) { e.preventDefault(); search.focus(); } });
  $('#statusFilter').onchange = e => { filters.status = e.target.value; renderProducts(); };
  $('#sortSelect').onchange = e => { [filters.sort, filters.dir] = e.target.value.split(':'); renderProducts(); };
  $$('.th-sort').forEach(b => b.onclick = () => {
    const k = b.dataset.sort; filters.dir = filters.sort === k && filters.dir === 'asc' ? 'desc' : 'asc'; filters.sort = k;
    renderProducts();
  });
  $('#clearFilters').onclick = () => { Object.assign(filters, { q: '', cat: 'All', status: 'all' }); search.value = ''; renderProducts(); };

  function filtered() {
    const q = filters.q;
    const val = p => p.qty * p.price;
    const list = db.products.filter(p =>
      (filters.cat === 'All' || p.category === filters.cat) &&
      (filters.status === 'all' || status(p) === filters.status) &&
      (!q || [p.name, p.sku, p.supplier, p.category].some(x => String(x).toLowerCase().includes(q))));
    const k = filters.sort, dir = filters.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const A = k === 'value' ? val(a) : a[k], B = k === 'value' ? val(b) : b[k];
      return (typeof A === 'string' ? A.localeCompare(B) : A - B) * dir;
    });
  }
  const categories = () => [...new Set(db.products.map(p => p.category))].sort();
  function renderProducts() {
    const cats = categories();
    if (filters.cat !== 'All' && !cats.includes(filters.cat)) filters.cat = 'All';
    $('#catChips').innerHTML = ['All', ...cats].map(c => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${filters.cat === c}">${esc(c)}<span class="n">${c === 'All' ? db.products.length : db.products.filter(p => p.category === c).length}</span></button>`).join('');
    $('#statusFilter').value = filters.status;
    const sv = `${filters.sort}:${filters.dir}`; if ([...$('#sortSelect').options].some(o => o.value === sv)) $('#sortSelect').value = sv;
    $$('.th-sort').forEach(b => b.dataset.sort === filters.sort ? b.dataset.dir = filters.dir : delete b.dataset.dir);
    $$('.th-sort').forEach(b => b.closest('th').setAttribute('aria-sort', b.dataset.sort === filters.sort ? (filters.dir === 'asc' ? 'ascending' : 'descending') : 'none'));
    if (search.value.trim().toLowerCase() !== filters.q) search.value = filters.q;
    const list = filtered();
    $('#resultCount').textContent = `${list.length} of ${db.products.length} products`;
    $('#emptyState').hidden = !!list.length;
    $('#ptbody').innerHTML = list.map(p => {
      const st = status(p);
      return `<tr>
        <td class="c-prod"><div class="prod">${thumb(p)}<div><strong>${esc(p.name)}</strong><small>${esc(p.sku)}</small></div></div></td>
        <td class="c-cat">${esc(p.category)}</td>
        <td class="num c-qty qty-cell" data-label="Stock"><strong>${p.qty}</strong><small>min ${p.reorder}</small></td>
        <td class="num c-price" data-label="Price">${money(p.price, 2)}</td>
        <td class="num c-value" data-label="Value">${money(p.qty * p.price)}</td>
        <td class="c-status"><span class="badge ${st}">${STATUS_LABEL[st]}</span></td>
        <td class="c-actions"><div class="row-actions">
          <button class="icon-btn" data-act="out" data-id="${p.id}" aria-label="Record sale of ${esc(p.name)}" title="Record sale"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
          <button class="icon-btn" data-act="in" data-id="${p.id}" aria-label="Receive stock for ${esc(p.name)}" title="Receive stock"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
          <button class="icon-btn" data-act="edit" data-id="${p.id}" aria-label="Edit ${esc(p.name)}" title="Edit"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg></button>
          <button class="icon-btn" data-act="del" data-id="${p.id}" aria-label="Delete ${esc(p.name)}" title="Delete"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button>
        </div></td></tr>`;
    }).join('');
  }
  $('#catChips').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { filters.cat = b.dataset.cat; renderProducts(); } });
  $('#ptbody').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const p = byId(b.dataset.id);
    if (b.dataset.act === 'edit') openProduct(p);
    if (b.dataset.act === 'in') openMove(p.id, 'in');
    if (b.dataset.act === 'out') openMove(p.id, 'out');
    if (b.dataset.act === 'del') confirmDlg(`Delete “${p.name}”?`, 'The product is removed from your catalogue. You can undo right after.', 'Delete', () => {
      const idx = db.products.indexOf(p); db.products.splice(idx, 1); save(); render();
      toast(`Deleted ${p.name}`, { label: 'Undo', fn: () => { db.products.splice(idx, 0, p); save(); render(); } });
    });
  });

  /* Dialog helpers */
  $$('[data-dlg-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
  function confirmDlg(title, text, okLabel, fn) {
    const d = $('#confirmDlg'); $('#cfTitle').textContent = title; $('#cfText').textContent = text; $('#cfOk').textContent = okLabel;
    d.returnValue = ''; d.showModal();
    d.addEventListener('close', () => { if (d.returnValue === 'ok') fn(); }, { once: true });
  }
  const setFErr = (input, msg) => { const f = input.closest('.f'); f.classList.toggle('invalid', !!msg); $('.ferr', f).textContent = msg || ''; input.setAttribute('aria-invalid', !!msg); };

  /* Product form */
  const pdlg = $('#productDlg'), pform = $('#productForm');
  let editing = null;
  function openProduct(p) {
    editing = p || null;
    $('#pdTitle').textContent = p ? 'Edit product' : 'Add product';
    $('#pdSubmit').textContent = p ? 'Save changes' : 'Add product';
    $('#catList').innerHTML = categories().map(c => `<option value="${esc(c)}">`).join('');
    const v = p || { name: '', sku: '', category: '', qty: '', reorder: 10, cost: '', price: '', supplier: '' };
    $('#fName').value = v.name; $('#fSku').value = v.sku; $('#fCat').value = v.category; $('#fQty').value = v.qty;
    $('#fReorder').value = v.reorder; $('#fCost').value = v.cost; $('#fPrice').value = v.price; $('#fSupplier').value = v.supplier;
    $$('.f', pform).forEach(f => { f.classList.remove('invalid'); const e = $('.ferr', f); if (e) e.textContent = ''; });
    pdlg.showModal(); $('#fName').focus();
  }
  $('#addBtn').onclick = () => openProduct();
  pform.addEventListener('submit', e => {
    e.preventDefault();
    const g = id => $(id).value.trim();
    const name = g('#fName'), sku = g('#fSku').toUpperCase(), category = g('#fCat'), supplier = g('#fSupplier');
    const qty = g('#fQty'), reorder = g('#fReorder'), cost = g('#fCost'), price = g('#fPrice');
    const isInt = v => /^\d+$/.test(v), isNum = v => v !== '' && !isNaN(v) && +v >= 0;
    const errs = [
      ['#fName', name.length < 2 ? 'Enter a product name' : ''],
      ['#fSku', !/^[A-Z0-9-]{3,20}$/.test(sku) ? 'Use 3–20 letters, digits or dashes' : db.products.some(p => p.sku === sku && p !== editing) ? 'This SKU already exists' : ''],
      ['#fCat', !category ? 'Choose or type a category' : ''],
      ['#fQty', !isInt(qty) ? 'Whole number, 0 or more' : ''],
      ['#fReorder', !isInt(reorder) ? 'Whole number, 0 or more' : ''],
      ['#fCost', !isNum(cost) ? 'Enter a valid cost' : ''],
      ['#fPrice', !isNum(price) || +price <= 0 ? 'Enter a price above 0' : +price < +cost ? 'Price is below cost' : '']
    ];
    errs.forEach(([id, m]) => setFErr($(id), m));
    const bad = errs.find(x => x[1]); if (bad) { $(bad[0]).focus(); return; }
    const data = { name, sku, category, supplier, qty: +qty, reorder: +reorder, cost: +(+cost).toFixed(2), price: +(+price).toFixed(2), updated: Date.now() };
    if (editing) {
      const diff = data.qty - editing.qty;
      if (diff) db.moves.push({ id: 'm' + db.seq++, pid: editing.id, type: 'adjust', qty: diff, note: 'Edited quantity', date: Date.now(), after: data.qty });
      Object.assign(editing, data); toast(`Saved ${name}`);
    } else {
      const p = { id: 'p' + Date.now().toString(36), img: '', ...data };
      db.products.push(p);
      if (p.qty) db.moves.push({ id: 'm' + db.seq++, pid: p.id, type: 'in', qty: p.qty, note: 'Opening stock', date: Date.now(), after: p.qty });
      toast(`Added ${name}`);
    }
    save(); pdlg.close(); render();
  });
  $$('#productForm input').forEach(i => i.addEventListener('input', () => { if (i.getAttribute('aria-invalid') === 'true') setFErr(i, ''); }));

  /* Movement form */
  const mdlg = $('#moveDlg'), mform = $('#moveForm');
  const mtype = () => $('input[name="mtype"]:checked', mform).value;
  function updateAfter() {
    const p = byId($('#mProduct').value), q = $('#mQty').value, t = mtype();
    $('#mQtyLabel').textContent = t === 'in' ? 'Units received' : t === 'out' ? 'Units sold' : 'Counted units';
    if (!p || q === '' || !/^\d+$/.test(q)) { $('#mAfter').textContent = p ? `${p.qty} now` : '—'; return; }
    const after = t === 'in' ? p.qty + +q : t === 'out' ? p.qty - +q : +q;
    $('#mAfter').textContent = after;
    $('#mAfter').style.color = after < 0 ? 'var(--crit)' : after <= p.reorder ? 'var(--warn)' : '';
  }
  function openMove(pid, type = 'in', qty = '') {
    $('#mProduct').innerHTML = [...db.products].sort((a, b) => a.name.localeCompare(b.name)).map(p => `<option value="${p.id}">${esc(p.name)} (${p.qty} in stock)</option>`).join('');
    if (pid) $('#mProduct').value = pid;
    $(`input[name="mtype"][value="${type}"]`, mform).checked = true;
    $('#mQty').value = qty; $('#mNote').value = '';
    setFErr($('#mQty'), ''); updateAfter();
    mdlg.showModal(); $('#mQty').focus();
  }
  $('#newMoveBtn').onclick = () => openMove();
  mform.addEventListener('input', updateAfter); mform.addEventListener('change', updateAfter);
  mform.addEventListener('submit', e => {
    e.preventDefault();
    const p = byId($('#mProduct').value), q = $('#mQty').value.trim(), t = mtype();
    let err = '';
    if (!/^\d+$/.test(q) || (t !== 'adjust' && +q === 0)) err = t === 'adjust' ? 'Enter the counted quantity' : 'Enter a whole number above 0';
    else if (+q > 100000) err = 'That seems too large';
    else if (t === 'out' && +q > p.qty) err = `Only ${p.qty} in stock`;
    setFErr($('#mQty'), err); if (err) { $('#mQty').focus(); return; }
    let diff;
    if (t === 'in') { p.qty += +q; diff = +q; }
    else if (t === 'out') { p.qty -= +q; diff = +q; }
    else { diff = +q - p.qty; p.qty = +q; if (!diff) { mdlg.close(); toast('Count matches — no change'); return; } }
    p.updated = Date.now();
    db.moves.push({ id: 'm' + db.seq++, pid: p.id, type: t, qty: diff, note: $('#mNote').value.trim(), date: Date.now(), after: p.qty });
    save(); mdlg.close(); render();
    toast(t === 'in' ? `Received ${q} × ${p.name}` : t === 'out' ? `Sold ${q} × ${p.name}` : `Stock of ${p.name} set to ${p.qty}`);
    if (status(p) !== 'ok' && t === 'out') setTimeout(() => toast(`${p.name} is ${p.qty ? 'running low' : 'now out of stock'}`), 400);
  });

  /* ---------------- Movements log ---------------- */
  let mFilter = 'all', mPage = 1; const M_PAGE = 20;
  $('#moveChips').addEventListener('click', e => { const b = e.target.closest('[data-mtype]'); if (!b) return; mFilter = b.dataset.mtype; mPage = 1; $$('#moveChips .chip').forEach(c => c.setAttribute('aria-pressed', c === b)); renderMoves(); });
  function renderMoves() {
    const list = db.moves.filter(m => mFilter === 'all' || m.type === mFilter).sort((a, b) => b.date - a.date);
    const pages = Math.max(1, Math.ceil(list.length / M_PAGE)); mPage = Math.min(mPage, pages);
    $('#mtbody').innerHTML = list.slice((mPage - 1) * M_PAGE, mPage * M_PAGE).map(m => {
      const p = byId(m.pid);
      const q = m.type === 'in' ? `<span class="pos">+${m.qty}</span>` : m.type === 'out' ? `<span class="neg">−${m.qty}</span>` : `<span class="${m.qty >= 0 ? 'pos' : 'neg'}">${m.qty >= 0 ? '+' : '−'}${Math.abs(m.qty)}</span>`;
      return `<tr><td class="c-date">${new Date(m.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
        <td class="c-prod">${p ? esc(p.name) : '<span class="muted">Deleted product</span>'}</td>
        <td class="c-type"><span class="type-tag type-${m.type}">${m.type === 'in' ? 'Received' : m.type === 'out' ? 'Sold' : 'Adjustment'}</span></td>
        <td class="num c-qty">${q}</td><td class="num c-after">${m.after ?? '—'}</td><td class="c-note">${esc(m.note)}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="empty-note">No movements</td></tr>';
    $('#mpager').innerHTML = pages > 1 ? `<button class="btn btn-ghost btn-sm" data-pg="-1" ${mPage === 1 ? 'disabled' : ''}>Previous</button><span>Page ${mPage} of ${pages} · ${list.length} entries</span><button class="btn btn-ghost btn-sm" data-pg="1" ${mPage === pages ? 'disabled' : ''}>Next</button>` : '';
  }
  $('#mpager').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { mPage += +b.dataset.pg; renderMoves(); } });

  /* ---------------- CSV ---------------- */
  const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const download = (name, text) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  const stamp = () => new Date().toISOString().slice(0, 10);
  $('#exportProducts').onclick = () => {
    const H = ['name', 'sku', 'category', 'qty', 'reorder', 'cost', 'price', 'supplier'];
    download(`stockpulse-products-${stamp()}.csv`, [H.join(','), ...db.products.map(p => H.map(h => csvCell(p[h])).join(','))].join('\n'));
    toast(`Exported ${db.products.length} products`);
  };
  $('#exportMoves').onclick = () => {
    const rows = [...db.moves].sort((a, b) => b.date - a.date).map(m => { const p = byId(m.pid); return [new Date(m.date).toISOString(), p ? p.sku : '', p ? p.name : 'Deleted', m.type, m.qty, m.after ?? '', m.note].map(csvCell).join(','); });
    download(`stockpulse-movements-${stamp()}.csv`, ['date,sku,product,type,qty,stock_after,note', ...rows].join('\n'));
    toast(`Exported ${rows.length} movements`);
  };
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',' || c === ';') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  }
  function importCSV(text) {
    const out = $('#importResult');
    const rows = parseCSV(text);
    if (rows.length < 2) { out.className = 'import-result bad'; out.textContent = 'The file has no data rows.'; return; }
    const H = rows[0].map(h => h.trim().toLowerCase());
    const need = ['name', 'sku', 'category', 'qty', 'price'];
    const missing = need.filter(h => !H.includes(h));
    if (missing.length) { out.className = 'import-result bad'; out.textContent = `Missing column(s): ${missing.join(', ')}`; return; }
    let added = 0, updated = 0; const skipped = [];
    rows.slice(1).forEach((r, i) => {
      const o = Object.fromEntries(H.map((h, k) => [h, (r[k] ?? '').trim()]));
      const sku = o.sku.toUpperCase();
      if (!o.name || !/^[A-Z0-9-]{3,20}$/.test(sku) || !/^\d+$/.test(o.qty) || isNaN(o.price) || +o.price <= 0) { skipped.push(i + 2); return; }
      const data = { name: o.name, sku, category: o.category || 'Uncategorized', qty: +o.qty, reorder: /^\d+$/.test(o.reorder) ? +o.reorder : 10, cost: isNaN(o.cost) || o.cost === '' ? +(o.price * .5).toFixed(2) : +o.cost, price: +o.price, supplier: o.supplier || '', updated: Date.now() };
      const ex = db.products.find(p => p.sku === sku);
      if (ex) {
        if (data.qty !== ex.qty) db.moves.push({ id: 'm' + db.seq++, pid: ex.id, type: 'adjust', qty: data.qty - ex.qty, note: 'CSV import', date: Date.now(), after: data.qty });
        Object.assign(ex, data); updated++;
      } else {
        const p = { id: 'p' + Date.now().toString(36) + i, img: '', ...data }; db.products.push(p); added++;
        if (p.qty) db.moves.push({ id: 'm' + db.seq++, pid: p.id, type: 'in', qty: p.qty, note: 'CSV import', date: Date.now(), after: p.qty });
      }
    });
    save(); render();
    out.className = 'import-result ' + (added + updated ? 'good' : 'bad');
    out.textContent = `${added} added, ${updated} updated${skipped.length ? `, ${skipped.length} skipped (line${skipped.length > 1 ? 's' : ''} ${skipped.slice(0, 6).join(', ')}${skipped.length > 6 ? '…' : ''})` : ''}.`;
    toast('Import finished');
  }
  const readFile = f => { if (!f) return; if (f.size > 2e6) { $('#importResult').className = 'import-result bad'; $('#importResult').textContent = 'File is larger than 2 MB.'; return; } const r = new FileReader(); r.onload = () => importCSV(String(r.result)); r.readAsText(f); };
  $('#importFile').onchange = e => { readFile(e.target.files[0]); e.target.value = ''; };
  const dz = $('#dropZone');
  ['dragenter', 'dragover'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));

  $('#resetBtn').onclick = () => confirmDlg('Reset demo data?', 'All products and movements in this browser are replaced by the sample data.', 'Reset', () => {
    db = seedData(); save(); Object.assign(filters, { q: '', cat: 'All', status: 'all' }); search.value = ''; render(); toast('Demo data restored');
  });

  // expose import for testing / console use
  window.StockPulse = { importCSV, get data() { return db; } };

  syncThemeUI();
  route();
})();
