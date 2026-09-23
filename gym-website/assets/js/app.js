/* FORGE Fitness Studio — vanilla JS: timetable + class booking, membership toggle,
   BMI / calorie calculator (Mifflin–St Jeor), coaches, free-trial form. No dependencies. */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const icon = id => `<svg class="i" aria-hidden="true"><use href="#${id}"/></svg>`;

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- Mobile nav ---------- */
  const menuBtn = $('#menuToggle'), nav = $('#mainNav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', e => { if (nav.classList.contains('open') && !e.target.closest('.site-header')) setMenu(false); });
  window.matchMedia('(min-width: 961px)').addEventListener('change', m => { if (m.matches) setMenu(false); });

  /* ---------- Data ---------- */
  const CATS = {
    strength: 'Strength & Cross', boxing: 'Boxing', spin: 'Spin', hiit: 'HIIT', mind: 'Yoga, Pilates & Mobility', dance: 'Dance Cardio'
  };
  const COACHES = [
    { id: 'youssef', name: 'Youssef Trabelsi', role: 'Head coach · Strength', img: 'coach-youssef.webp', years: 12, alt: 'Coach Youssef Trabelsi smiling with arms crossed in the weights area',
      bio: 'Ex national-team weightlifter who teaches first-timers and competitors to lift safely — and heavy.', certs: ['NSCA-CSCS', 'Weightlifting L2', 'First aid'] },
    { id: 'karim', name: 'Karim Jaziri', role: 'Boxing & HIIT', img: 'coach-karim.webp', years: 9, alt: 'Coach Karim Jaziri in a black tank top against a dark wall',
      bio: 'Grand Tunis amateur boxing champion turned conditioning coach. His Friday Fight Club sells out weekly.', certs: ['Boxing coach L1', 'Group fitness', 'Kettlebell'] },
    { id: 'ines', name: 'Inès Ben Salah', role: 'Spin & Dance Cardio', img: 'coach-ines.webp', years: 7, alt: 'Coach Inès Ben Salah with a battle rope over her shoulder',
      bio: 'Builds playlists like a DJ and classes like an engineer. Expect to leave smiling and soaked.', certs: ['Indoor cycling', 'Dance fitness', 'HIIT specialist'] },
    { id: 'sarra', name: 'Sarra Mansouri', role: 'Yoga, Pilates & Mobility', img: 'coach-sarra.webp', years: 10, alt: 'Coach Sarra Mansouri with arms crossed, looking upward',
      bio: 'Physiotherapist by training. She fixes the stiff hips and sore backs the rest of the timetable creates.', certs: ['BSc Physiotherapy', 'RYT-500 Yoga', 'Mat Pilates'] }
  ];
  const coach = id => COACHES.find(c => c.id === id);

  // [weekday 0=Sun..6=Sat, start, minutes, name, category, coach, intensity 1–3, capacity, always full?]
  const WEEK = [
    [1, '06:30', 45, 'HIIT Burn', 'hiit', 'karim', 3, 20], [1, '09:30', 45, 'Mobility Flow', 'mind', 'sarra', 1, 16],
    [1, '12:30', 45, 'Lunch Spin', 'spin', 'ines', 2, 24], [1, '18:00', 60, 'Strength Foundations', 'strength', 'youssef', 2, 12],
    [1, '19:30', 60, 'Boxing Technique', 'boxing', 'karim', 2, 16],
    [2, '07:00', 45, 'Spin 45', 'spin', 'ines', 3, 24], [2, '09:30', 50, 'Pilates Core', 'mind', 'sarra', 2, 14],
    [2, '12:30', 45, 'CrossTraining WOD', 'strength', 'youssef', 3, 14], [2, '18:30', 50, 'Dance Cardio', 'dance', 'ines', 2, 25],
    [2, '20:00', 60, 'Yoga Unwind', 'mind', 'sarra', 1, 18],
    [3, '06:30', 45, 'CrossTraining WOD', 'strength', 'youssef', 3, 14], [3, '12:30', 30, 'HIIT Express', 'hiit', 'karim', 3, 20],
    [3, '18:00', 45, 'Spin Climb', 'spin', 'ines', 3, 24], [3, '19:30', 50, 'Pilates Core', 'mind', 'sarra', 2, 14],
    [3, '20:30', 60, 'Boxing Sparring', 'boxing', 'karim', 3, 12],
    [4, '07:00', 45, 'Mobility Flow', 'mind', 'sarra', 1, 16], [4, '09:30', 50, 'Dance Cardio', 'dance', 'ines', 2, 25],
    [4, '12:30', 60, 'Strength Foundations', 'strength', 'youssef', 2, 12], [4, '18:00', 45, 'HIIT Burn', 'hiit', 'karim', 3, 20],
    [4, '19:30', 45, 'Spin 45', 'spin', 'ines', 3, 24],
    [5, '06:30', 45, 'Spin 45', 'spin', 'ines', 3, 24], [5, '09:30', 50, 'Pilates Core', 'mind', 'sarra', 2, 14],
    [5, '12:30', 60, 'Power Yoga', 'mind', 'sarra', 2, 18], [5, '18:00', 60, 'Friday Fight Club', 'boxing', 'karim', 3, 20, true],
    [5, '19:30', 45, 'CrossTraining WOD', 'strength', 'youssef', 3, 14],
    [6, '09:00', 45, 'Team HIIT', 'hiit', 'karim', 3, 24], [6, '10:30', 90, 'Olympic Lifting Clinic', 'strength', 'youssef', 2, 10],
    [6, '11:00', 45, 'Spin Climb', 'spin', 'ines', 3, 24], [6, '17:00', 50, 'Dance Cardio', 'dance', 'ines', 2, 25],
    [0, '09:30', 75, 'Sunday Yoga Flow', 'mind', 'sarra', 1, 20], [0, '11:00', 45, 'Mobility & Stretch', 'mind', 'sarra', 1, 16],
    [0, '12:00', 60, 'Boxing Basics', 'boxing', 'karim', 2, 16]
  ].map(([day, time, dur, name, cat, coachId, int, cap, full], i) => ({ id: 'c' + i, day, time, dur, name, cat, coach: coachId, int, cap, full: !!full }));

  // deterministic "already booked by others" count per class + date
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function takenBy(cls, date) {
    if (cls.full) return cls.cap;
    const r = (hash(cls.id + '@' + date) % 1000) / 1000;
    return Math.min(cls.cap, Math.round(cls.cap * (0.3 + 0.72 * r)));
  }

  /* ---------- Opening hours ---------- */
  const HOURS = { 0: [9, 14], 1: [6, 23], 2: [6, 23], 3: [6, 23], 4: [6, 23], 5: [6, 23], 6: [8, 20] };
  (function openStatus() {
    const now = new Date(), d = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
    const [o, c] = HOURS[d];
    const dot = $('.live-dot'), el = $('#openStatus');
    if (h >= o && h < c) { dot.classList.add('open'); el.textContent = `Open now · until ${pad(c)}:00 · Lac 2, Tunis`; }
    else {
      const next = h < o ? `today at ${pad(o)}:00` : `tomorrow at ${pad(HOURS[(d + 1) % 7][0])}:00`;
      el.textContent = `Closed · opens ${next} · Lac 2, Tunis`;
    }
    $$('#hours [data-days]').forEach(row => { if (row.dataset.days.split(',').includes(String(d))) row.classList.add('now'); });
  })();

  /* ---------- Timetable ---------- */
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const DAYS = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d; });
  const todayIso = iso(today);

  // occurrences for the next 7 days
  const OCC = [];
  DAYS.forEach((d, di) => {
    WEEK.filter(c => c.day === d.getDay()).sort((a, b) => a.time.localeCompare(b.time)).forEach(c => {
      const [hh, mm] = c.time.split(':').map(Number);
      const start = new Date(d); start.setHours(hh, mm, 0, 0);
      OCC.push({ ...c, date: iso(d), dayIndex: di, start, key: c.id + '|' + iso(d) });
    });
  });

  let bookings = store.get('forge.bookings', []).filter(k => (k.split('|')[1] || '') >= todayIso);
  store.set('forge.bookings', bookings);
  const isBooked = o => bookings.includes(o.key);
  const isPast = o => o.start.getTime() <= Date.now();
  const spotsLeft = o => o.cap - takenBy(o, o.date) - (isBooked(o) ? 1 : 0);
  const isFull = o => takenBy(o, o.date) >= o.cap;

  const fType = $('#fType'), fCoach = $('#fCoach'), filters = $('#ttFilters');
  fType.insertAdjacentHTML('beforeend', Object.entries(CATS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join(''));
  fCoach.insertAdjacentHTML('beforeend', COACHES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join(''));

  let activeDay = 0;
  const slot = t => { const h = +t.slice(0, 2); return h < 12 ? 'am' : h < 17 ? 'mid' : 'pm'; };
  function matches(o) {
    const time = filters.elements.time.value;
    return (!fType.value || o.cat === fType.value) && (!fCoach.value || o.coach === fCoach.value) && (!time || slot(o.time) === time);
  }
  const dayLabel = d => d.getTime() === today.getTime() ? 'Today' : DAY_SHORT[d.getDay()];

  function classCard(o) {
    const left = spotsLeft(o), booked = isBooked(o), past = isPast(o), full = !booked && isFull(o);
    const c = coach(o.coach);
    const end = new Date(o.start.getTime() + o.dur * 60000);
    const pct = Math.round(((o.cap - left) / o.cap) * 100);
    let btn;
    if (past) btn = `<button class="book" type="button" disabled>Started</button>`;
    else if (booked) btn = `<button class="book is-booked" type="button" data-key="${o.key}" aria-label="Cancel booking: ${esc(o.name)}, ${dayLabel(DAYS[o.dayIndex])} ${o.time}">Booked ✓ · Cancel</button>`;
    else if (full) btn = `<button class="book" type="button" disabled aria-label="${esc(o.name)} is full">Full</button>`;
    else btn = `<button class="book" type="button" data-key="${o.key}" aria-label="Book ${esc(o.name)}, ${dayLabel(DAYS[o.dayIndex])} ${o.time}">Book</button>`;
    const spotTxt = full ? 'Full' : left === 1 ? '1 spot left' : `${left} spots left`;
    return `<article class="tt-class cat-${o.cat}${booked ? ' booked' : ''}${past ? ' past' : ''}" data-cat="${o.cat}">
      <p class="tt-time">${o.time}–${pad(end.getHours())}:${pad(end.getMinutes())}<span>${o.dur} min</span></p>
      <h4>${esc(o.name)}</h4>
      <p class="tt-coach">with ${esc(c.name.split(' ')[0])} · ${esc(CATS[o.cat])}</p>
      <div class="tt-meta"><span class="ints" role="img" aria-label="Intensity ${o.int} of 3">${[1, 2, 3].map(n => `<i class="int${n <= o.int ? ' on' : ''}"></i>`).join('')}</span>
        <span class="spots${full ? ' full' : left <= 3 ? ' low' : ''}">${spotTxt} <span class="sr-only">of ${o.cap}</span></span></div>
      <div class="spot-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      ${btn}
    </article>`;
  }

  function renderTimetable(focusKey) {
    const shown = OCC.filter(matches);
    $('#ttGrid').innerHTML = DAYS.map((d, di) => {
      const list = shown.filter(o => o.dayIndex === di);
      return `<section class="tt-day${di === 0 ? ' today' : ''}${di === activeDay ? ' active' : ''}" aria-label="${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}">
        <h3>${dayLabel(d)} <small>${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}</small></h3>
        <div class="tt-list">${list.length ? list.map(classCard).join('') : '<p class="tt-empty">No classes match your filters this day.</p>'}</div>
      </section>`;
    }).join('');
    $('#dayPicker').innerHTML = DAYS.map((d, di) => {
      const n = shown.filter(o => o.dayIndex === di).length;
      return `<button type="button" data-day="${di}" aria-pressed="${di === activeDay}"><small>${dayLabel(d)}</small><b>${d.getDate()}</b><i>${n} class${n === 1 ? '' : 'es'}</i></button>`;
    }).join('');
    const bits = [];
    if (fType.value) bits.push(CATS[fType.value]);
    if (fCoach.value) bits.push('with ' + coach(fCoach.value).name.split(' ')[0]);
    const t = filters.elements.time.value; if (t) bits.push({ am: 'mornings', mid: 'midday', pm: 'evenings' }[t]);
    $('#ttSummary').textContent = `Showing ${shown.length} of ${OCC.length} classes` + (bits.length ? ' · ' + bits.join(', ') : '');
    if (focusKey) { const b = $(`#ttGrid [data-key="${focusKey}"]`); if (b) b.focus(); }
  }

  $('#dayPicker').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    activeDay = +b.dataset.day;
    $$('#dayPicker button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('.tt-day').forEach((s, i) => s.classList.toggle('active', i === activeDay));
  });
  filters.addEventListener('change', () => renderTimetable());
  filters.addEventListener('reset', () => setTimeout(() => renderTimetable(), 0));
  filters.addEventListener('submit', e => e.preventDefault());

  function toggleBooking(key) {
    const o = OCC.find(x => x.key === key); if (!o || isPast(o)) return;
    const when = `${dayLabel(DAYS[o.dayIndex])} ${o.time}`;
    if (isBooked(o)) {
      bookings = bookings.filter(k => k !== key);
      toast(`Cancelled: ${o.name}, ${when}. Your spot is released.`);
    } else {
      if (isFull(o)) { toast(`${o.name} is full — try another time.`); return; }
      bookings.push(key);
      toast(`Booked: ${o.name}, ${when}. See you there!`);
    }
    store.set('forge.bookings', bookings);
    renderTimetable(key);
    renderMine();
    renderNext();
  }
  $('#ttGrid').addEventListener('click', e => { const b = e.target.closest('button[data-key]'); if (b) toggleBooking(b.dataset.key); });

  // my bookings
  const myBtn = $('#myBtn'), myPanel = $('#myPanel');
  myBtn.addEventListener('click', () => {
    const open = myPanel.hidden;
    myPanel.hidden = !open;
    myBtn.setAttribute('aria-expanded', String(open));
  });
  function renderMine() {
    const mine = OCC.filter(isBooked).sort((a, b) => a.start - b.start);
    $('#myCount').textContent = mine.length;
    $('#myEmpty').hidden = mine.length > 0;
    $('#myList').innerHTML = mine.map(o => `<li><div><strong>${esc(o.name)}</strong><br><span>${DAYS[o.dayIndex].toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} · ${o.time} · ${esc(coach(o.coach).name)}</span></div>
      <button type="button" data-cancel="${o.key}" aria-label="Cancel ${esc(o.name)} on ${dayLabel(DAYS[o.dayIndex])}">Cancel</button></li>`).join('');
  }
  $('#myList').addEventListener('click', e => {
    const b = e.target.closest('[data-cancel]'); if (!b) return;
    toggleBooking(b.dataset.cancel);
    myBtn.focus();
  });

  function renderNext() {
    const o = OCC.find(x => !isPast(x));
    if (!o) { $('#nextName').textContent = 'See the full timetable'; $('#nextMeta').textContent = ''; return; }
    const left = spotsLeft(o);
    $('#nextName').textContent = o.name;
    $('#nextMeta').textContent = `${dayLabel(DAYS[o.dayIndex])} ${o.time} · ${coach(o.coach).name.split(' ')[0]} · ${isFull(o) && !isBooked(o) ? 'full' : isBooked(o) ? 'you’re booked' : left + ' spots left'}`;
    $('#nextCard').dataset.day = o.dayIndex;
  }
  $('#nextCard').addEventListener('click', () => {
    const di = +$('#nextCard').dataset.day || 0;
    const b = $(`#dayPicker [data-day="${di}"]`); if (b) b.click();
  });

  function jumpToClasses() { $('#classes').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  $$('[data-filter-type]').forEach(b => b.addEventListener('click', () => {
    fType.value = b.dataset.filterType; fCoach.value = ''; renderTimetable(); jumpToClasses();
    toast(`Showing ${CATS[b.dataset.filterType]} classes`);
  }));

  renderTimetable();
  renderMine();
  renderNext();

  /* ---------- Coaches ---------- */
  $('#coachGrid').innerHTML = COACHES.map(c => {
    const classes = [...new Set(WEEK.filter(w => w.coach === c.id).map(w => w.name))];
    return `<li class="coach">
      <div class="coach-photo"><img src="assets/img/${c.img}" width="600" height="750" loading="lazy" alt="${esc(c.alt)}"><span class="years">${c.years} yrs</span></div>
      <div class="coach-body">
        <p class="role">${esc(c.role)}</p>
        <h3>${esc(c.name)}</h3>
        <p class="bio">${esc(c.bio)}</p>
        <ul class="certs" aria-label="Certifications">${c.certs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <button type="button" class="link-btn" data-coach="${c.id}">${classes.length} classes a week ${icon('i-arrow')}<span class="sr-only"> — show ${esc(c.name)}’s classes</span></button>
      </div>
    </li>`;
  }).join('');
  $('#coachGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-coach]'); if (!b) return;
    fCoach.value = b.dataset.coach; fType.value = '';
    renderTimetable(); jumpToClasses();
    toast(`Showing ${coach(b.dataset.coach).name.split(' ')[0]}’s classes`);
  });

  /* ---------- Membership toggle ---------- */
  function renderPlans() {
    const yearly = $('#billing input:checked').value === 'yearly';
    $$('#planGrid .plan').forEach(p => {
      const m = +p.dataset.monthly;
      $('.amount', p).textContent = yearly ? Math.round(m * 10 / 12) : m;
      $('.billed', p).innerHTML = yearly
        ? `<b>${fmt(m * 10)} DT</b> billed yearly — you save ${fmt(m * 2)} DT`
        : 'Billed monthly · cancel any time';
    });
  }
  $('#billing').addEventListener('change', renderPlans);
  renderPlans();
  $$('[data-plan]').forEach(a => a.addEventListener('click', () => { $('#tPlan').value = a.dataset.plan; }));

  /* ---------- Calculator ---------- */
  const cForm = $('#calcForm');
  const LIMITS = { age: [15, 90, 'Age must be between 15 and 90.'], height: [120, 230, 'Height must be 120–230 cm.'], weight: [35, 250, 'Weight must be 35–250 kg.'] };
  function checkNum(name) {
    const el = cForm.elements[name], v = parseFloat(el.value), [lo, hi, msg] = LIMITS[name];
    const bad = !(v >= lo && v <= hi);
    const f = el.closest('.field');
    f.classList.toggle('invalid', bad);
    el.setAttribute('aria-invalid', String(bad));
    $('#' + el.id + '-err').textContent = bad ? (el.value === '' ? 'Required.' : msg) : '';
    return !bad;
  }
  function calc() {
    const f = cForm.elements;
    const sex = f.sex.value, age = +f.age.value, h = +f.height.value, w = +f.weight.value, act = +f.activity.value, goal = f.goal.value;
    const bmi = w / Math.pow(h / 100, 2);
    const bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'm' ? 5 : -161);
    const tdee = bmr * act;
    const floor = sex === 'm' ? 1500 : 1200;
    const target = goal === 'lose' ? Math.max(floor, tdee - 500) : goal === 'gain' ? tdee + 300 : tdee;
    const protein = Math.round(w * (goal === 'maintain' ? 1.8 : 2.0));
    const fat = Math.round(target * 0.25 / 9);
    const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));
    return { bmi, bmr, tdee, target, protein, fat, carbs, goal };
  }
  function renderCalc() {
    const r = calc();
    const b = Math.round(r.bmi * 10) / 10;
    const [cls, label] = b < 18.5 ? ['c-under', 'Underweight'] : b < 25 ? ['c-ok', 'Healthy range'] : b < 30 ? ['c-over', 'Overweight'] : ['c-obese', 'Obese range'];
    $('#bmiValue').textContent = b.toFixed(1);
    const cat = $('#bmiCat'); cat.className = 'bmi-cat ' + cls; cat.textContent = label;
    $('#bmiMarker').style.left = Math.min(100, Math.max(0, (r.bmi - 15) / 25 * 100)) + '%';
    $('#rBmr').innerHTML = fmt(r.bmr) + ' <small>kcal</small>';
    $('#rTdee').innerHTML = fmt(r.tdee) + ' <small>kcal</small>';
    $('#rTarget').innerHTML = fmt(r.target) + ' <small>kcal</small>';
    $('#rGoalLabel').textContent = { lose: 'to lose fat (−500)', maintain: 'to maintain', gain: 'to build muscle (+300)' }[r.goal];
    $('#mP').textContent = r.protein + ' g'; $('#mC').textContent = r.carbs + ' g'; $('#mF').textContent = r.fat + ' g';
    const kp = r.protein * 4, kc = r.carbs * 4, kf = r.fat * 9, tot = kp + kc + kf || 1;
    $('#mbP').style.flexBasis = (kp / tot * 100) + '%';
    $('#mbC').style.flexBasis = (kc / tot * 100) + '%';
    $('#mbF').style.flexBasis = (kf / tot * 100) + '%';
  }
  const validCalc = () => ['age', 'height', 'weight'].map(checkNum).every(Boolean);
  cForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validCalc()) { const bad = $('.field.invalid input', cForm); if (bad) bad.focus(); return; }
    renderCalc();
    if (window.innerWidth < 961) $('#calcResult').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
  cForm.addEventListener('input', e => {
    const n = e.target.name;
    if (LIMITS[n]) { if (!checkNum(n)) return; }
    if (['age', 'height', 'weight'].every(k => { const v = parseFloat(cForm.elements[k].value); return v >= LIMITS[k][0] && v <= LIMITS[k][1]; })) renderCalc();
  });
  cForm.addEventListener('change', () => { if (['age', 'height', 'weight'].every(k => { const v = parseFloat(cForm.elements[k].value); return v >= LIMITS[k][0] && v <= LIMITS[k][1]; })) renderCalc(); });
  renderCalc();

  /* ---------- Free trial ---------- */
  const tForm = $('#trialForm');
  const tDate = $('#tDate');
  const maxDay = new Date(today); maxDay.setDate(maxDay.getDate() + 60);
  tDate.min = todayIso; tDate.max = iso(maxDay);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneDigits = v => v.replace(/\D/g, '').replace(/^216(?=\d{8}$)/, '');
  const rules = {
    name: v => v.trim().length >= 2 && /[a-zà-ÿ]/i.test(v) ? '' : 'Please enter your full name.',
    phone: v => /^[2-9]\d{7}$/.test(phoneDigits(v)) ? '' : 'Enter a valid Tunisian number: 8 digits, e.g. 20 123 456.',
    email: v => !v.trim() ? 'Please enter your email.' : emailRe.test(v.trim()) ? '' : 'That email doesn’t look right.',
    date: v => !v ? 'Pick a day for your free class.' : v < todayIso ? 'That day has already passed.' : v > iso(maxDay) ? 'Please choose a day within the next 60 days.' : '',
    goal: v => v ? '' : 'Choose your main goal.'
  };
  function check(el) {
    const msg = rules[el.name] ? rules[el.name](el.value) : '';
    el.closest('.field').classList.toggle('invalid', !!msg);
    el.setAttribute('aria-invalid', String(!!msg));
    const err = $('#' + el.id + '-err'); if (err) err.textContent = msg;
    return !msg;
  }
  $$('input, select', tForm).forEach(el => {
    el.addEventListener('blur', () => { if (el.value) check(el); });
    el.addEventListener('input', () => { if (el.closest('.field').classList.contains('invalid')) check(el); });
  });
  const COACH_FOR_GOAL = { 'Lose weight': 'ines', 'Build muscle': 'youssef', 'Get fitter overall': 'karim', 'Learn to box': 'karim', 'Move better, less pain': 'sarra' };
  tForm.addEventListener('submit', e => {
    e.preventDefault();
    let first = null;
    ['name', 'phone', 'email', 'date', 'goal'].forEach(n => { const el = tForm.elements[n]; if (!check(el) && !first) first = el; });
    if (first) { first.focus(); return; }
    const d = phoneDigits(tForm.elements.phone.value);
    const rec = {
      ref: 'FRG-' + String(1000 + Math.floor(Math.random() * 9000)),
      name: tForm.elements.name.value.trim(), phone: '+216 ' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5),
      email: tForm.elements.email.value.trim(), date: tForm.elements.date.value, goal: tForm.elements.goal.value,
      plan: tForm.elements.plan.value, at: new Date().toISOString()
    };
    const all = store.get('forge.trials', []); all.push(rec); store.set('forge.trials', all);
    const [y, m, dd] = rec.date.split('-').map(Number);
    $('#sName').textContent = rec.name.split(' ')[0];
    $('#sRef').textContent = rec.ref;
    $('#sDate').textContent = new Date(y, m - 1, dd).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#sCoach').textContent = coach(COACH_FOR_GOAL[rec.goal] || 'karim').name.split(' ')[0];
    $('#sPhone').textContent = rec.phone;
    tForm.hidden = true;
    $('#trialSuccess').hidden = false;
    $('#trialSuccess').focus();
  });
  $('#trialAgain').addEventListener('click', () => {
    tForm.reset();
    $$('.field.invalid', tForm).forEach(f => f.classList.remove('invalid'));
    $('#trialSuccess').hidden = true;
    tForm.hidden = false;
    tForm.elements.name.focus();
  });

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    const els = $$('.section-head, .program, .coach, .calc-card, .studio-media, .trial-card');
    els.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(el => io.observe(el));
  }

  $('#year').textContent = new Date().getFullYear();
})();
