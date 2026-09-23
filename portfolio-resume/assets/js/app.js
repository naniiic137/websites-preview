/* Alex Rivera — portfolio (vanilla JS, offline). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* unavailable */ } }
  };

  /* ---------- Content (single source for the site and the printed résumé) ---------- */
  const PROJECTS = [
    { id: 'shopwave', title: 'ShopWave Storefront', cat: 'E-commerce', year: 2025, img: 'proj-ecommerce', featured: true,
      alt: 'Shop assistant helping a customer pay at a bright checkout counter',
      summary: 'Headless storefront with cart, Stripe checkout and an admin for 3,000+ SKUs.',
      result: '+18% conversion · LCP 1.2 s on 4G',
      desc: 'ShopWave’s old theme was slow and hard to change. I rebuilt it as a headless Next.js storefront with incremental static regeneration, a typed API layer and a small admin for merchandisers. Checkout moved to Stripe Payment Element with Apple Pay and Google Pay.',
      role: 'Lead developer', time: '4 months', team: '3 people', tags: ['Next.js', 'TypeScript', 'Stripe', 'PostgreSQL'] },
    { id: 'dataflow', title: 'DataFlow Analytics', cat: 'Data viz', year: 2024, img: 'proj-social',
      alt: 'Laptop showing analytics charts on a desk',
      summary: 'Real-time analytics dashboard for marketing teams, streaming 2M events a day.',
      result: 'p95 render from 2.8 s to 180 ms',
      desc: 'A dashboard that had grown to 40 widgets became unusably slow. I introduced virtualised tables, WebSocket deltas instead of polling, and canvas-rendered charts for dense series.',
      role: 'Senior engineer', time: '6 months', team: '5 people', tags: ['React', 'D3.js', 'WebSockets', 'Redis'] },
    { id: 'fitlife', title: 'FitLife Tracker', cat: 'Mobile', year: 2024, img: 'proj-fitness',
      alt: 'Runner’s shoes climbing concrete stairs',
      summary: 'Workout and nutrition tracker with offline sync and progress charts.',
      result: '4.8★ average · 60k installs',
      desc: 'Built from zero with a founder and a designer. React Native with an offline-first SQLite store that syncs to a GraphQL API once the phone is back online.',
      role: 'Full-stack developer', time: '5 months', team: '3 people', tags: ['React Native', 'GraphQL', 'Firebase'] },
    { id: 'taskboard', title: 'Taskboard', cat: 'Web app', year: 2023, img: 'proj-tasks',
      alt: 'Sticky notes labelled To Do, Doing and Done',
      summary: 'Collaborative kanban with real-time presence and drag-and-drop.',
      result: 'Used daily by 1,200 teams',
      desc: 'A kanban app with live cursors, optimistic updates and keyboard-first drag-and-drop that also works with screen readers.',
      role: 'Full-stack developer', time: '3 months', team: 'Solo', tags: ['Vue.js', 'Express', 'Socket.io', 'PostgreSQL'] },
    { id: 'skycast', title: 'Skycast Weather', cat: 'Web app', year: 2022, img: 'proj-weather',
      alt: 'Dramatic storm clouds lit by the sunset',
      summary: 'Animated forecasts, location search and radar in a 60 kB bundle.',
      result: '100 Lighthouse performance',
      desc: 'A side project turned client work: a weather PWA that installs to the home screen and caches the last forecast for offline use.',
      role: 'Designer & developer', time: '6 weeks', team: 'Solo', tags: ['Preact', 'Service Worker', 'Canvas'] },
    { id: 'inkwell', title: 'Inkwell Blog Platform', cat: 'E-commerce', year: 2021, img: 'proj-blog',
      alt: 'Laptop, notebook and coffee on a wooden desk',
      summary: 'Markdown blogging platform with paid memberships and SEO tooling.',
      result: '3× organic traffic in a year',
      desc: 'Multi-author publishing with a markdown editor, scheduled posts, Stripe memberships and automatic Open Graph images.',
      role: 'Full-stack developer', time: '4 months', team: '2 people', tags: ['Next.js', 'Prisma', 'Tailwind', 'Stripe'] }
  ];
  const SKILLS = [
    { group: 'Frontend', items: [['TypeScript', 3], ['React / Next.js', 3], ['CSS & design systems', 3], ['Vue.js', 2], ['Accessibility (WCAG)', 2]] },
    { group: 'Backend', items: [['Node.js', 3], ['REST & GraphQL', 3], ['Python / Django', 2], ['Auth & payments', 2], ['Go', 1]] },
    { group: 'Data', items: [['PostgreSQL', 3], ['Redis', 2], ['MongoDB', 2], ['Prisma', 2], ['D3.js', 2]] },
    { group: 'Workflow', items: [['Git & code review', 3], ['Testing (Vitest, Playwright)', 2], ['Docker', 2], ['CI/CD', 2], ['Figma', 1]] }
  ];
  const EXPERIENCE = [
    { from: '2022', to: 'Present', title: 'Senior Full-Stack Developer', org: 'TechCorp Solutions', current: true,
      text: 'Lead developer on enterprise web apps used by 100k+ people.',
      points: ['Moved a monolith to three well-bounded services; deploys went from weekly to daily', 'Cut median page load by 40% with a performance budget in CI', 'Mentor four developers; run the frontend guild'] },
    { from: '2020', to: '2022', title: 'Full-Stack Developer', org: 'Digital Agency Inc.',
      text: 'Built web apps for clients in e-commerce, healthcare and fintech.',
      points: ['Shipped 15 client projects, several with HIPAA and PCI constraints', 'Introduced CI/CD and preview deploys — delivery 20% faster'] },
    { from: '2018', to: '2020', title: 'Frontend Developer', org: 'StartupHub',
      text: 'Interfaces for a B2B SaaS platform.',
      points: ['Built the component library and design tokens with the design team', 'Raised test coverage from 12% to 78%'] },
    { from: '2014', to: '2018', title: 'B.S. Computer Science', org: 'State University', edu: true,
      text: 'Graduated with honors. Led the web development club; capstone on real-time collaborative editing.', points: [] }
  ];

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const syncTheme = () => {
    $('#themeToggle').setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
    $('meta[name="theme-color"]').content = isDark() ? '#0f0f10' : '#f6f4ef';
  };
  $('#themeToggle').addEventListener('click', () => {
    const t = isDark() ? 'light' : 'dark'; root.dataset.theme = t;
    try { localStorage.setItem('ar-theme', t); } catch { /* ignore */ }
    syncTheme();
  });
  syncTheme();

  /* ---------- Nav ---------- */
  const nav = $('.nav'), menuBtn = $('#menuBtn'), menu = $('#navMenu');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });
  const setMenu = open => { menu.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); document.body.style.overflow = open ? 'hidden' : ''; };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a, button')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  matchMedia('(min-width: 861px)').addEventListener('change', e => e.matches && setMenu(false));
  if ('IntersectionObserver' in window) {
    const links = $$('.nav-menu ul a');
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle('active', a.hash === '#' + en.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(s => io.observe(s));
  }

  /* ---------- Projects + filters ---------- */
  const cats = ['All', ...new Set(PROJECTS.map(p => p.cat))];
  let active = 'All';
  $('#filters').innerHTML = cats.map(c => `<button type="button" class="filter" data-cat="${c}" aria-pressed="${c === active}">${c}<span class="n">${c === 'All' ? PROJECTS.length : PROJECTS.filter(p => p.cat === c).length}</span></button>`).join('');
  const renderProjects = () => {
    const list = PROJECTS.filter(p => active === 'All' || p.cat === active);
    const feat = p => p.featured && active === 'All';
    const rest = list.filter(p => !feat(p)).length;
    $('#projects').innerHTML = list.map((p, i) => `
      <li class="project${feat(p) || (rest % 2 === 1 && i === list.length - 1) ? ' featured' : ''}" style="animation-delay:${i * 60}ms">
        <div class="p-media"><img src="assets/img/${p.img}.webp" width="900" height="600" alt="${p.alt}" loading="lazy"><span class="p-year">${p.year}</span></div>
        <div class="p-body">
          <p class="p-cat">${p.cat} · ${p.role}</p>
          <h3>${p.title}</h3>
          <p>${p.summary}</p>
          <p class="p-result">${p.result}</p>
          <ul class="tags" aria-label="Technologies">${p.tags.map(t => `<li>${t}</li>`).join('')}</ul>
          <div class="p-foot"><button class="p-link" type="button" data-project="${p.id}">Read case study<span class="sr-only">: ${p.title}</span> <span aria-hidden="true">&rarr;</span></button></div>
        </div>
      </li>`).join('');
    $('#filterStatus').textContent = `Showing ${list.length} project${list.length > 1 ? 's' : ''}${active === 'All' ? '' : ' in ' + active}`;
  };
  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    active = b.dataset.cat; $$('.filter').forEach(f => f.setAttribute('aria-pressed', f === b)); renderProjects();
  });
  renderProjects();

  const dlg = $('#projectDlg');
  $('#projects').addEventListener('click', e => {
    const b = e.target.closest('[data-project]'); if (!b) return;
    const p = PROJECTS.find(x => x.id === b.dataset.project);
    $('#pdImg').src = `assets/img/${p.img}.webp`; $('#pdImg').alt = p.alt;
    $('#pdMeta').textContent = `${p.cat} · ${p.year}`; $('#pdTitle').textContent = p.title; $('#pdDesc').textContent = p.desc;
    $('#pdFacts').innerHTML = [['Role', p.role], ['Timeline', p.time], ['Team', p.team], ['Outcome', p.result]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    $('#pdTags').innerHTML = p.tags.map(t => `<li>${t}</li>`).join('');
    dlg.showModal();
  });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });

  /* ---------- Skills ---------- */
  const LV = ['', 'Working knowledge', 'Advanced', 'Expert'];
  $('#skillsGrid').innerHTML = SKILLS.map((g, i) => `
    <article class="skill-card"><h3><span>0${i + 1}</span>${g.group}</h3>
      <ul>${g.items.map(([n, l]) => `<li><span>${n}</span><span class="lvl lvl-${l}" role="img" aria-label="${LV[l]}"><i></i><i></i><i></i></span></li>`).join('')}</ul>
    </article>`).join('');

  /* ---------- Timeline ---------- */
  $('#timeline').innerHTML = EXPERIENCE.map(x => `
    <li class="tl-item${x.current ? ' current' : ''}">
      <p class="tl-when"><b>${x.from} — ${x.to}</b>${x.edu ? 'Education' : x.current ? 'Full-time · Current' : 'Full-time'}</p>
      <div class="tl-body"><h3>${x.title}</h3><p class="tl-org">${x.org}</p><p>${x.text}</p>
        ${x.points.length ? `<ul>${x.points.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}</div>
    </li>`).join('');

  /* ---------- Printable résumé ---------- */
  $('#rExp').innerHTML = EXPERIENCE.filter(x => !x.edu).map(x => `
    <div class="r-job"><div class="r-job-head"><strong>${x.title} · <span class="r-org">${x.org}</span></strong><span>${x.from} – ${x.to}</span></div>
    <ul>${[x.text, ...x.points].map(p => `<li>${p}</li>`).join('')}</ul></div>`).join('');
  $('#rSkills').innerHTML = SKILLS.map(g => `<p class="r-skill"><strong>${g.group}</strong><span>${g.items.map(i => i[0]).join(', ')}</span></p>`).join('');
  $$('[data-print]').forEach(b => b.addEventListener('click', () => { setMenu(false); print(); }));

  /* ---------- Copy email ---------- */
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Email copied to clipboard'); }
    catch { toast(b.dataset.copy); }
  }));

  /* ---------- Contact form ---------- */
  const form = $('#contactForm'), sent = $('#sent');
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const f = { name: $('#cName'), email: $('#cEmail'), msg: $('#cMsg') };
  const draft = store.get('ar-contact-draft', {});
  if (draft.name) f.name.value = draft.name; if (draft.email) f.email.value = draft.email; if (draft.msg) f.msg.value = draft.msg;
  const count = () => { $('#cMsgCount').textContent = `${f.msg.value.length} / 1500`; };
  count();
  const setErr = (el, msg) => { const box = el.closest('.field'); box.classList.toggle('invalid', !!msg); $('.err', box).textContent = msg || ''; el.setAttribute('aria-invalid', !!msg); };
  const rules = {
    name: v => v.trim().length < 2 ? 'Please tell me your name' : '',
    email: v => !v.trim() ? 'I need an email to reply to' : !EMAIL.test(v.trim()) ? 'That email address looks incomplete' : '',
    msg: v => v.trim().length < 20 ? `A few more words, please (${Math.max(0, 20 - v.trim().length)} to go)` : ''
  };
  Object.entries(f).forEach(([k, el]) => {
    el.addEventListener('blur', () => { if (el.value) setErr(el, rules[k](el.value)); });
    el.addEventListener('input', () => {
      if (el.getAttribute('aria-invalid') === 'true') setErr(el, rules[k](el.value));
      if (k === 'msg') count();
      store.set('ar-contact-draft', { name: f.name.value, email: f.email.value, msg: f.msg.value });
    });
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    let first = null;
    Object.entries(f).forEach(([k, el]) => { const m = rules[k](el.value); setErr(el, m); if (m && !first) first = el; });
    if (first) { first.focus(); return; }
    const data = { name: f.name.value.trim(), email: f.email.value.trim(), type: $('input[name="type"]:checked').value, budget: $('#cBudget').value, message: f.msg.value.trim(), sentAt: new Date().toISOString() };
    const inbox = store.get('ar-messages', []); inbox.push(data); store.set('ar-messages', inbox);
    store.set('ar-contact-draft', {});
    $('#sentName').textContent = data.name.split(' ')[0]; $('#sentEmail').textContent = data.email;
    form.hidden = true; sent.hidden = false; sent.focus();
  });
  $('#sendAnother').addEventListener('click', () => { form.reset(); count(); sent.hidden = true; form.hidden = false; f.name.focus(); });

  $('#year').textContent = new Date().getFullYear();
})();
