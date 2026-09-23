/* Rihla Tours — vanilla JS: tour filters, tour detail with itinerary + lightbox, season-aware price calculator, enquiry form. */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const dt = n => Math.round(n).toLocaleString('en-US') + ' DT';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const longDate = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MIN_NOTICE = 2;      // days
  const MAX_AHEAD = 540;     // days

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- Seasons & pricing rules ---------- */
  // l = low (−10%), m = mid, h = high (+15%) — per month, Jan..Dec
  const SEASONS = {
    coast:   { label: 'Coast & islands', sub: 'Djerba, Tabarka, Hammamet', months: 'llllmhhhhmll' },
    desert:  { label: 'Sahara & oases', sub: 'Douz, Tozeur, Tataouine', months: 'mmhhmllllmhh' },
    culture: { label: 'Cities & heritage', sub: 'Tunis, Kairouan, El Jem', months: 'llmhhmmmhhml' }
  };
  const SEASON_INFO = { l: { key: 'low', name: 'Low season', mult: 0.9 }, m: { key: 'mid', name: 'Mid season', mult: 1 }, h: { key: 'high', name: 'High season', mult: 1.15 } };
  const CHILD_RATE = 0.7, PRIVATE_SURCHARGE = 0.3;
  const GROUP_TIERS = [{ min: 8, pct: 0.10 }, { min: 4, pct: 0.05 }];
  const seasonFor = (kind, date) => SEASON_INFO[SEASONS[kind].months[date.getMonth()]];

  /* ---------- Tours ---------- */
  const IMG = {
    'sbs-palm-terrace': 'White domes and a palm tree above the sea in Sidi Bou Said',
    'carthage-antonine-baths': 'Columns of the Antonine Baths in Carthage beside the sea',
    'sbs-harbour-view': 'Terraces of Sidi Bou Said overlooking the marina and the gulf',
    'djerba-erriadh-street': 'Painted walls and blue balconies in the street-art village of Erriadh, Djerba',
    'djerba-camel-beach': 'Travellers riding camels along the sea on Djerba',
    'djerba-white-mosque': 'A whitewashed domed mosque on the island of Djerba',
    'sahara-camel-caravan': 'A camel caravan crossing the dunes of the Tunisian Sahara',
    'sahara-dunes-sunset': 'Dunes glowing at sunset in the Grand Erg Oriental',
    'sahara-camels-resting': 'Saddled camels resting on the sand near Douz',
    'tozeur-mos-espa': 'Film-set domes of Mos Espa standing in the desert near Tozeur',
    'chebika-oasis-pool': 'The turquoise spring pool of the Chebika mountain oasis',
    'tamerza-palm-canyon': 'Date palms filling a rocky canyon near Tamerza',
    'tabarka-pine-coast': 'Pine trees above red rocks and clear water on the north coast',
    'tabarka-rocky-cove': 'Wooded cliffs above a deep blue Mediterranean cove',
    'tabarka-sea-cliff': 'The sea seen from a cliff top through agave plants',
    'el-jem-amphitheatre': 'The Roman amphitheatre of El Jem under a blue sky',
    'kairouan-great-mosque': 'Courtyard arcades and minaret of the Great Mosque of Kairouan',
    'el-jem-arena': 'Inside the arena of the El Jem amphitheatre',
    'ksar-ouled-soltane': 'Stacked granary vaults of Ksar Ouled Soltane near Tataouine',
    'matmata-troglodyte': 'Troglodyte dwellings carved into the hillside at Matmata',
    'sousse-ribat': 'Crenellated walls and watchtower of the ribat of Sousse',
    'tunis-medina-souk': 'A shop full of lanterns and copperware in the souks of the Tunis medina'
  };

  const TOURS = [
    {
      id: 'carthage-sidi-bou-said', title: 'Carthage & Sidi Bou Said', region: 'Tunis & the northern coast', type: 'culture', season: 'culture',
      days: 1, level: 'Easy', price: 145, rating: 4.9, reviews: 212, max: 12, single: 0, rec: 3,
      blurb: 'Punic ports, Roman baths and the blue-and-white village above the Gulf of Tunis — in one unhurried day.',
      intro: 'Start where Tunisia’s story starts: on Byrsa Hill, where Queen Dido founded Carthage. Walk the Antonine Baths by the sea, lunch on grilled fish in La Goulette, then lose the afternoon in the lanes of Sidi Bou Said with a mint tea and pine nuts on a cliff-top terrace.',
      gallery: ['sbs-palm-terrace', 'carthage-antonine-baths', 'sbs-harbour-view'],
      itin: [
        ['Byrsa Hill & the Carthage Museum', 'The panorama over the gulf, the Punic quarter and the museum’s mosaics. Your guide sets the scene from Dido to Hannibal.'],
        ['Antonine Baths & the Punic ports', 'The largest Roman baths in Africa, right on the water — then the circular harbour that once sheltered 220 warships.'],
        ['Lunch in La Goulette', 'Fresh fish, brik à l’œuf and salade méchouia in a family restaurant by the old port.'],
        ['Sidi Bou Said', 'Blue doors, bougainvillea and the view across the gulf. Free time for the Ennejma Ezzahra palace and a café with a view.']
      ],
      inc: ['Hotel pick-up & drop-off in Greater Tunis', 'Licensed English-speaking guide', 'All entrance fees (Carthage pass)', 'Seafood lunch with soft drinks', 'Bottled water'],
      exc: ['Tips for guide and driver', 'Personal purchases', 'Alcoholic drinks'],
      meet: 'Hotel pick-up in Tunis, La Marsa, Gammarth or Carthage at 08:30. Back around 17:30.'
    },
    {
      id: 'djerba', title: 'Djerba, island of dreams', region: 'Djerba, the south-east', type: 'beach', season: 'coast',
      days: 4, level: 'Easy', price: 690, rating: 4.8, reviews: 164, max: 12, single: 40, rec: 4,
      blurb: 'Street-art village, the potters of Guellala, a camel ride on the lagoon beach and three nights in a traditional houch.',
      intro: 'Djerba is the Mediterranean at its gentlest: whitewashed mosques, olive groves, flamingos in the lagoon and fishermen who still use clay pots to catch octopus. We stay in a restored houch, eat where islanders eat and leave plenty of time for the sea.',
      gallery: ['djerba-erriadh-street', 'djerba-camel-beach', 'djerba-white-mosque'],
      itin: [
        ['Arrival & Houmt Souk', 'Transfer from Djerba airport to your guesthouse. Evening stroll through the souks and the fishermen’s auction.', 'Houch guesthouse, Houmt Souk'],
        ['Erriadh & El Ghriba', 'Morning in Djerbahood, the open-air gallery of 250 murals, then the El Ghriba synagogue and a lunch of island couscous.', 'Houch guesthouse, Houmt Souk'],
        ['Guellala potters & the south coast', 'Watch potters work in their underground workshops, visit the heritage museum and swim at Sidi Mahrez beach.', 'Houch guesthouse, Houmt Souk'],
        ['Camel ride & farewell', 'Sunrise camel ride along the lagoon, a last mint tea and transfer to the airport.']
      ],
      inc: ['Airport transfers', '3 nights in a traditional guesthouse with breakfast', '2 lunches and 1 dinner', 'Local guide on days 2–4', 'Camel ride and museum entry'],
      exc: ['Flights to Djerba', 'Drinks with meals', 'Tips'],
      meet: 'Djerba–Zarzis airport (DJE) arrivals hall, or your hotel in Houmt Souk.'
    },
    {
      id: 'sahara-douz', title: 'Sahara expedition: Douz & Ksar Ghilane', region: 'Grand Erg Oriental', type: 'desert', season: 'desert',
      days: 3, level: 'Moderate', price: 780, rating: 4.9, reviews: 238, max: 10, single: 35, rec: 1,
      blurb: 'Camel trek into the Grand Erg, a night in a Berber camp and a hot spring in the middle of the dunes.',
      intro: 'Beyond Douz the road ends and the Grand Erg Oriental begins — a sea of dunes that stretches to Algeria. Ride out by camel at golden hour, sleep under more stars than you knew existed, and soak in the warm spring of Ksar Ghilane.',
      gallery: ['sahara-camel-caravan', 'sahara-dunes-sunset', 'sahara-camels-resting'],
      itin: [
        ['Douz, gateway to the Sahara', 'Meet in Douz and visit the Sahara museum. Late-afternoon camel trek to camp as the dunes turn orange; bread baked in the sand for dinner.', 'Berber tent camp'],
        ['4×4 to Ksar Ghilane', 'Cross the dunes by 4×4 to the oasis of Ksar Ghilane. Swim in the natural hot spring and walk to the Roman fort of Tisavar.', 'Desert camp, Ksar Ghilane'],
        ['Sunrise & return', 'Sunrise over the Erg, breakfast by the fire, then back to Douz via the troglodyte village of Matmata.']
      ],
      inc: ['4×4 with driver-guide', 'Camel trek (2 hours)', '2 nights in desert camps, all meals', 'Sand-boarding and hot-spring access', 'Blankets and sleeping bags'],
      exc: ['Transport to Douz', 'Travel insurance', 'Tips'],
      meet: 'Place du Souk, Douz, at 14:00 on day 1. Transfers from Djerba or Tozeur on request.'
    },
    {
      id: 'tozeur-oases', title: 'Tozeur oases & film sets', region: 'Tozeur & the Jerid', type: 'adventure', season: 'desert',
      days: 3, level: 'Moderate', price: 720, rating: 4.8, reviews: 131, max: 12, single: 40, rec: 2,
      blurb: 'Mountain oases by 4×4, sunrise on the salt lake of Chott el Djerid and the desert town from Star Wars.',
      intro: 'Tozeur’s brick medina and its sea of date palms are only the beginning. Head into the mountains for waterfalls and canyons on the Algerian border, cross the shimmering salt flats of Chott el Djerid at dawn and walk through the film set of Mos Espa.',
      gallery: ['tozeur-mos-espa', 'chebika-oasis-pool', 'tamerza-palm-canyon'],
      itin: [
        ['Tozeur medina & palm grove', 'Walk the Ouled el Hadef quarter and its geometric brickwork, then a calèche ride through 400,000 date palms.', 'Guesthouse in the medina'],
        ['Mountain oases: Chebika, Tamerza, Midès', 'By 4×4 to the springs and waterfalls of the mountain oases and the deep canyon of Midès.', 'Guesthouse in the medina'],
        ['Chott el Djerid & Ong Jmel', 'Sunrise over the salt flats — mirages included — then the Mos Espa film set among the dunes of Ong Jmel.']
      ],
      inc: ['4×4 excursions with driver-guide', '2 nights in a medina guesthouse, breakfast and dinner', 'Calèche ride', 'Entrance fees', 'Airport transfers in Tozeur'],
      exc: ['Flights to Tozeur', 'Lunches', 'Tips'],
      meet: 'Tozeur–Nefta airport (TOE) or your hotel in Tozeur.'
    },
    {
      id: 'tabarka', title: 'Tabarka coral coast & Aïn Draham', region: 'The green north-west', type: 'beach', season: 'coast',
      days: 3, level: 'Easy', price: 560, rating: 4.7, reviews: 88, max: 12, single: 40, rec: 6,
      blurb: 'Pine forests meet the sea: snorkel the coral coast, hike cork-oak hills and visit a Roman city built underground.',
      intro: 'The north-west is Tunisia’s green secret: cork-oak forests, red cliffs and the clearest water in the country. Snorkel the coral coast from a fishing boat, walk the Kroumirie hills and discover the underground villas of Bulla Regia.',
      gallery: ['tabarka-pine-coast', 'tabarka-rocky-cove', 'tabarka-sea-cliff'],
      itin: [
        ['The fort & the Needles', 'Arrive in Tabarka, climb to the Genoese fort and watch the sunset from Les Aiguilles, the town’s rock needles.', 'Seafront hotel, Tabarka'],
        ['Boat trip & snorkelling', 'A morning along the coral coast with two snorkel stops (gear included) and grilled fish for lunch on board.', 'Seafront hotel, Tabarka'],
        ['Aïn Draham forest & Bulla Regia', 'Hike through cork-oak forest in the Kroumirie hills, then Bulla Regia, where Romans built their villas underground to escape the heat.']
      ],
      inc: ['Transport from Tunis (3 hours)', '2 nights, half board', 'Boat trip with lunch and snorkel gear', 'Forest hike with guide', 'Bulla Regia entry'],
      exc: ['Scuba diving (on request)', 'Drinks', 'Tips'],
      meet: 'Rihla office, 21 Rue de Marseille, Tunis, at 08:00 — or join us in Tabarka at 12:00.'
    },
    {
      id: 'kairouan-el-jem', title: 'Kairouan & El Jem heritage', region: 'Central Tunisia', type: 'culture', season: 'culture',
      days: 2, level: 'Easy', price: 390, rating: 4.9, reviews: 176, max: 12, single: 35, rec: 5,
      blurb: 'The holiest city of the Maghreb and a Roman colosseum rising from the olive groves.',
      intro: 'Two UNESCO sites, one weekend. Kairouan’s Great Mosque has stood since the 9th century; El Jem’s amphitheatre could seat 35,000 spectators. Between them: carpets, pastries and a night in a restored medina house.',
      gallery: ['el-jem-amphitheatre', 'kairouan-great-mosque', 'el-jem-arena'],
      itin: [
        ['Kairouan', 'The Great Mosque’s courtyard and minaret, the Aghlabid basins, a carpet cooperative and makroudh pastries fresh from the medina ovens.', 'Dar guesthouse in the medina'],
        ['El Jem & Sousse', 'Climb to the upper tiers of the third-largest amphitheatre of the Roman world, see the mosaics museum, then return via the ribat of Sousse.']
      ],
      inc: ['Transport from Tunis or Sousse', '1 night with breakfast and dinner', 'Licensed guide', 'All entrance fees', 'Pastry tasting'],
      exc: ['Lunches', 'Carpets (no pressure, promise)', 'Tips'],
      meet: 'Hotel pick-up in Tunis at 07:30 or in Sousse at 09:00.'
    },
    {
      id: 'ksour-matmata', title: 'Ksour & troglodytes of the south', region: 'Matmata & Tataouine', type: 'desert', season: 'desert',
      days: 4, level: 'Moderate', price: 840, rating: 4.8, reviews: 97, max: 10, single: 35, rec: 7,
      blurb: 'Sleep in a cave home, explore hilltop granaries and hike between Berber villages above the plains.',
      intro: 'The deep south is a land of fortified granaries and houses dug into the earth. Spend a night underground in Matmata, wander the honeycomb vaults of Ksar Ouled Soltane and hike between the Berber hill villages of Chenini and Douiret.',
      gallery: ['ksar-ouled-soltane', 'matmata-troglodyte', 'sahara-dunes-sunset'],
      itin: [
        ['Matmata troglodyte homes', 'Tea with a family who still lives underground, then dinner and a night in a cave hotel.', 'Troglodyte hotel, Matmata'],
        ['Tataouine’s ksour', 'The four-storey granaries of Ksar Ouled Soltane and Tataouine’s dinosaur museum.', 'Ksar guesthouse, Tataouine'],
        ['Chenini & Douiret on foot', 'A three-hour hike between two Berber hill villages with a picnic in an olive grove.', 'Ksar guesthouse, Tataouine'],
        ['Road to Djerba', 'Via the ksar of Medenine to the ferry at Ajim. Drop-off in Djerba around 15:00.']
      ],
      inc: ['4×4 with driver-guide', '3 nights, half board', 'Guided hike and picnic', 'Entrance fees', 'Djerba ferry'],
      exc: ['Lunches except day 3', 'Drinks', 'Tips'],
      meet: 'Gabès railway station at 10:00, or hotel pick-up in Djerba on request.'
    },
    {
      id: 'grand-tour', title: 'Grand Tour of Tunisia', region: 'From Tunis to the Sahara', type: 'culture', season: 'culture',
      days: 10, level: 'Moderate', price: 2850, rating: 5.0, reviews: 64, max: 12, single: 45, rec: 0,
      blurb: 'Ten days, north to south: medinas, Roman cities, mountain oases, a Sahara night and the island of Djerba.',
      intro: 'Our signature journey, refined over twelve years. One tour leader, one small group and the whole country — from the souks of Tunis to a camp in the Grand Erg — at a pace that leaves time for long lunches and conversations.',
      gallery: ['sousse-ribat', 'tunis-medina-souk', 'sahara-camel-caravan', 'sbs-palm-terrace', 'el-jem-amphitheatre', 'djerba-erriadh-street'],
      itin: [
        ['Tunis medina', 'Welcome at the airport, then the souks, the Zitouna mosque and a rooftop mint tea.', 'Dar in the Tunis medina'],
        ['Carthage & Sidi Bou Said', 'Byrsa Hill, the Antonine Baths and an afternoon in the blue-and-white village.', 'Dar in the Tunis medina'],
        ['Kairouan', 'The Great Mosque, the Aghlabid basins and the carpet weavers.', 'Dar guesthouse, Kairouan'],
        ['El Jem & Sousse', 'The Roman amphitheatre, then the ribat and medina of Sousse.', 'Seafront hotel, Sousse'],
        ['Matmata', 'Into the south: troglodyte homes and dinner underground.', 'Troglodyte hotel, Matmata'],
        ['Douz & the Sahara', 'Camel trek into the Grand Erg and a night at camp.', 'Berber tent camp'],
        ['Chott el Djerid & Tozeur', 'Across the salt lake to the brick medina of Tozeur.', 'Guesthouse, Tozeur'],
        ['Mountain oases', 'Chebika, Tamerza and Midès by 4×4, then a cooking class.', 'Guesthouse, Tozeur'],
        ['Djerba', 'Along the Gulf of Gabès to the island and its street-art village.', 'Houch guesthouse, Djerba'],
        ['Djerba & departure', 'A free morning on the beach and transfer to Djerba airport.']
      ],
      inc: ['Private air-conditioned minibus throughout', '9 nights in characterful hotels and guesthouses, half board', 'Licensed tour leader for 10 days', 'All entrance fees and listed activities', 'Airport transfers'],
      exc: ['International flights', 'Lunches', 'Tips'],
      meet: 'Tunis–Carthage airport (TUN), any time on day 1. The tour ends at Djerba airport (DJE).'
    }
  ];
  const tourById = id => TOURS.find(t => t.id === id);
  const durLabel = t => t.days === 1 ? 'Day trip' : t.days + ' days';
  const durBucket = t => t.days === 1 ? 'day' : t.days <= 4 ? 'short' : 'long';
  const TYPE_LABEL = { culture: 'Culture', desert: 'Desert', beach: 'Coast', adventure: 'Adventure' };

  /* ---------- Price engine (shared by the calculator and the enquiry form) ---------- */
  function quote(t, o) {
    const date = parse(o.date) || addDays(today(), 21);
    const s = seasonFor(t.season, date);
    const adultRate = Math.round(t.price * s.mult);
    const childRate = Math.round(adultRate * CHILD_RATE);
    const travellers = o.adults + o.kids;
    const base = o.adults * adultRate + o.kids * childRate;
    const tier = o.priv ? null : GROUP_TIERS.find(g => travellers >= g.min);
    const discount = tier ? Math.round(base * tier.pct) : 0;
    const surcharge = o.priv ? Math.round(base * PRIVATE_SURCHARGE) : 0;
    const nights = t.days - 1;
    const singles = nights > 0 ? Math.min(o.singles || 0, o.adults) : 0;
    const supplement = singles * t.single * nights;
    const total = base - discount + surcharge + supplement;
    const lines = [[`${o.adults} adult${o.adults > 1 ? 's' : ''} × ${dt(adultRate)}`, dt(o.adults * adultRate)]];
    if (o.kids) lines.push([`${o.kids} child${o.kids > 1 ? 'ren' : ''} × ${dt(childRate)}`, dt(o.kids * childRate)]);
    if (discount) lines.push([`Group discount −${tier.pct * 100}%`, '−' + dt(discount), 'minus']);
    if (surcharge) lines.push(['Private tour +30%', '+' + dt(surcharge)]);
    if (supplement) lines.push([`${singles} single room${singles > 1 ? 's' : ''} × ${nights} night${nights > 1 ? 's' : ''}`, '+' + dt(supplement)]);
    let tip = '';
    if (!o.priv && travellers < 4) tip = `Add ${4 - travellers} more traveller${4 - travellers > 1 ? 's' : ''} to save 5% as a group.`;
    else if (!o.priv && travellers < 8) tip = `Groups of 8+ save 10% — ${8 - travellers} to go.`;
    else if (!o.priv) tip = 'Best group rate unlocked: −10%.';
    return { season: s, adultRate, childRate, base, discount, surcharge, supplement, total, travellers, perPerson: Math.round(total / travellers), lines, tip, nights, date };
  }
  const linesHTML = lines => lines.map(([k, v, cls]) => `<div${cls ? ` class="${cls}"` : ''}><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

  /* ---------- Header, nav, scroll spy ---------- */
  const header = $('.site-header'), nav = $('#mainNav'), menuBtn = $('#menuToggle');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', e => { if (nav.classList.contains('open') && !e.target.closest('.site-header')) setMenu(false); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', m => { if (m.matches) setMenu(false); });
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const navLinks = $$('.main-nav ul a');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) navLinks.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id ? 'true' : 'false'));
    }), { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });
  }
  const scrollToEl = el => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  // Next departure badge: the coming Saturday for the Sahara tour
  (function () {
    const d = today(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    $('#nextDep').textContent = 'Sahara Expedition · ' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  /* ---------- Tour grid: filters + sort ---------- */
  const grid = $('#tourGrid'), countEl = $('#resultCount'), empty = $('#emptyState');
  const priceMax = $('#priceMax'), priceOut = $('#priceOut'), durSel = $('#durSel'), sortSel = $('#sortSel');
  const state = { type: 'all', dur: 'all', max: +priceMax.value, sort: 'rec' };

  function card(t) {
    return `<li class="tour-card" data-id="${t.id}">
      <div class="tc-media">
        <img src="assets/img/${t.gallery[0]}.webp" width="960" height="640" loading="lazy" decoding="async" alt="${esc(IMG[t.gallery[0]])}">
        <span class="tc-type" data-t="${t.type}">${TYPE_LABEL[t.type]}</span>
        <span class="tc-days">${icon('i-clock')}${durLabel(t)}</span>
      </div>
      <div class="tc-body">
        <p class="tc-region">${icon('i-pin')}${esc(t.region)}</p>
        <h3><button type="button" data-open="${t.id}">${esc(t.title)}</button></h3>
        <p class="tc-blurb">${esc(t.blurb)}</p>
        <p class="tc-meta"><span class="rate">${icon('i-rate')}<span><b>${t.rating.toFixed(1)}</b> <span class="sr-only">out of 5,</span>(${t.reviews})</span></span><span class="lvl">${icon('i-bolt')}${t.level}</span><span class="lvl">${icon('i-group')}Max ${t.max}</span></p>
        <div class="tc-foot">
          <p class="tc-price"><small>From</small><strong>${dt(t.price)} <span>/ person</span></strong></p>
          <span class="tc-cta" aria-hidden="true">View tour ${icon('i-arrow')}</span>
        </div>
      </div>
    </li>`;
  }
  function renderGrid() {
    let list = TOURS.filter(t => (state.type === 'all' || t.type === state.type) && (state.dur === 'all' || durBucket(t) === state.dur) && t.price <= state.max);
    const sorters = {
      rec: (a, b) => a.rec - b.rec,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      days: (a, b) => a.days - b.days || a.price - b.price,
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews
    };
    list = list.slice().sort(sorters[state.sort]);
    grid.innerHTML = list.map(card).join('') + (list.length ? `<li class="tour-card tailor">
      <div class="tailor-inner">
        <span class="tailor-mark" aria-hidden="true">${icon('i-star')}</span>
        <p class="kicker">Tailor-made</p>
        <h3>Your Tunisia, your pace</h3>
        <p>Honeymoon in Djerba, a photography trip to the Sahara, a family week with a pool? Tell us how you like to travel and we’ll design it — free of charge.</p>
        <a class="btn btn-terra" href="#book">Design my trip ${icon('i-arrow')}</a>
      </div>
    </li>` : '');
    empty.hidden = list.length > 0;
    countEl.textContent = list.length === TOURS.length ? `All ${list.length} tours` : `${list.length} of ${TOURS.length} tours`;
  }
  function syncControls() {
    $$('#typeChips .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.type === state.type)));
    durSel.value = state.dur; sortSel.value = state.sort; priceMax.value = state.max;
    priceOut.textContent = dt(state.max);
  }
  $('#typeChips').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    state.type = c.dataset.type; syncControls(); renderGrid();
  });
  durSel.addEventListener('change', () => { state.dur = durSel.value; renderGrid(); });
  sortSel.addEventListener('change', () => { state.sort = sortSel.value; renderGrid(); });
  priceMax.addEventListener('input', () => { state.max = +priceMax.value; priceOut.textContent = dt(state.max); renderGrid(); });
  $('#resetFilters').addEventListener('click', () => { Object.assign(state, { type: 'all', dur: 'all', max: 3000, sort: 'rec' }); syncControls(); renderGrid(); });
  $('#finder').addEventListener('submit', e => {
    e.preventDefault();
    Object.assign(state, { type: $('#fType').value, dur: $('#fDur').value, max: 3000 });
    syncControls(); renderGrid(); scrollToEl($('#tours'));
  });
  $$('[data-foot-type]').forEach(a => a.addEventListener('click', () => { state.type = a.dataset.footType; state.dur = 'all'; syncControls(); renderGrid(); }));
  grid.addEventListener('click', e => { const card = e.target.closest('.tour-card[data-id]'); if (card) openTour(card.dataset.id, card.querySelector('[data-open]')); });
  syncControls(); renderGrid();

  /* ---------- Seasons table ---------- */
  (function () {
    const now = new Date().getMonth();
    const head = '<thead><tr><td></td>' + MONTHS.map((m, i) => `<th scope="col"${i === now ? ' class="now"' : ''}>${m}</th>`).join('') + '</tr></thead>';
    const body = '<tbody>' + Object.keys(SEASONS).map(k => {
      const s = SEASONS[k];
      return `<tr><th scope="row">${s.label}<small>${s.sub}</small></th>` + [...s.months].map((c, i) => {
        const info = SEASON_INFO[c];
        return `<td class="cell-${info.key}${i === now ? ' now' : ''}" title="${MONTHS[i]}: ${info.name}"><span class="sr-only">${info.name}</span><span aria-hidden="true">${c === 'h' ? '+' : c === 'l' ? '−' : ''}</span></td>`;
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    $('#seasonTable').insertAdjacentHTML('beforeend', head + body);
    // on narrow screens, scroll the current month into view inside the table
    const wrap = $('.season-table-wrap'), cell = $('#seasonTable thead .now');
    if (wrap.scrollWidth > wrap.clientWidth && cell) wrap.scrollLeft = Math.max(0, cell.offsetLeft - wrap.clientWidth / 2);
  })();

  /* ---------- Focus trap helper ---------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  function trap(e, container) {
    if (e.key !== 'Tab') return;
    const f = $$(FOCUSABLE, container).filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Tour detail modal + calculator ---------- */
  const modal = $('#tourModal'), panel = $('#tmPanel');
  let current = null, lastTrigger = null;
  const calc = { date: '', adults: 2, kids: 0, singles: 0, priv: false };
  const cDate = $('#cDate');

  function openTour(id, trigger) {
    const t = tourById(id); if (!t) return;
    current = t; lastTrigger = trigger || document.activeElement;
    $('#tmKicker').textContent = `${TYPE_LABEL[t.type]} · ${t.region}`;
    $('#tmTitle').textContent = t.title;
    $('#tmFacts').innerHTML = [
      [icon('i-clock'), durLabel(t)], [icon('i-bolt'), t.level], [icon('i-group'), 'Max ' + t.max + ' travellers'],
      [icon('i-rate'), `${t.rating.toFixed(1)} · ${t.reviews} reviews`]
    ].map(([i, s]) => `<li>${i}${esc(s)}</li>`).join('');
    $('#tmIntro').textContent = t.intro;
    const g = t.gallery;
    $('#tmGallery').innerHTML = g.slice(0, 3).map((f, i) => `<button type="button" data-lb-open="${i}" aria-label="View photo ${i + 1} of ${g.length}: ${esc(IMG[f])}">
        <img src="assets/img/${f}.webp" width="960" height="640" alt="" decoding="async">${i === 2 || (g.length < 3 && i === g.length - 1) ? `<span class="more">${icon('i-expand')}${g.length} photos</span>` : ''}</button>`).join('');
    $('#tmItin').innerHTML = t.itin.map(([title, text, stay], i) => `<details${i === 0 ? ' open' : ''}>
        <summary><span class="day-n">${t.days === 1 ? 'Stop' : 'Day'}<b>${i + 1}</b></span><span class="day-t">${esc(title)}</span><span class="chev" aria-hidden="true"></span></summary>
        <div class="day-body"><p>${esc(text)}</p>${stay ? `<p class="stay">Night: ${esc(stay)}</p>` : ''}</div>
      </details>`).join('');
    $('#tmInc').innerHTML = t.inc.map(s => `<li>${esc(s)}</li>`).join('');
    $('#tmExc').innerHTML = t.exc.map(s => `<li>${esc(s)}</li>`).join('');
    $('#tmMeet').textContent = t.meet;
    // calculator defaults
    const min = addDays(today(), MIN_NOTICE);
    cDate.min = iso(min); cDate.max = iso(addDays(today(), MAX_AHEAD));
    if (!calc.date || parse(calc.date) < min) calc.date = iso(addDays(today(), 21));
    cDate.value = calc.date;
    clampCalc();
    $('#cSinglesRow').hidden = t.days === 1;
    $('#cSingleNote').textContent = t.days > 1 ? `+${t.single} DT per night` : '';
    renderCalc();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    panel.scrollTop = 0;
    $('.modal-close', modal).focus();
  }
  function closeTour() {
    if (modal.hidden) return;
    modal.hidden = true; document.body.style.overflow = '';
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }
  function clampCalc() {
    const max = calc.priv ? 16 : current.max;
    calc.adults = Math.max(1, Math.min(calc.adults, max));
    calc.kids = Math.max(0, Math.min(calc.kids, max - calc.adults));
    calc.singles = Math.max(0, Math.min(calc.singles, calc.adults));
  }
  function renderCalc() {
    const q = quote(current, calc);
    const max = calc.priv ? 16 : current.max;
    $('#cAdults').textContent = calc.adults; $('#cKids').textContent = calc.kids; $('#cSingles').textContent = calc.singles;
    $('#cPrivate').checked = calc.priv;
    $$('.stepper button', modal).forEach(b => {
      const k = b.dataset.step, d = +b.dataset.d;
      const lim = { adults: [1, max - calc.kids], kids: [0, max - calc.adults], singles: [0, calc.adults] }[k];
      b.disabled = d < 0 ? calc[k] <= lim[0] : calc[k] >= lim[1];
    });
    const pill = $('#cSeason');
    pill.dataset.s = q.season.key;
    pill.textContent = `${q.season.name} in ${MONTHS[q.date.getMonth()]}` + (q.season.mult === 1 ? '' : ` · ${q.season.mult > 1 ? '+15%' : '−10%'}`);
    $('#cLines').innerHTML = linesHTML(q.lines);
    $('#cTotal').textContent = dt(q.total);
    $('#cPerPerson').textContent = `${dt(q.perPerson)} per traveller · ${q.travellers} traveller${q.travellers > 1 ? 's' : ''}`;
    $('#cTip').textContent = q.tip;
  }
  $$('.stepper button', modal).forEach(b => b.addEventListener('click', () => {
    calc[b.dataset.step] += +b.dataset.d; clampCalc(); renderCalc();
  }));
  $('#cPrivate').addEventListener('change', e => { calc.priv = e.target.checked; clampCalc(); renderCalc(); });
  cDate.addEventListener('change', () => {
    const d = parse(cDate.value), min = addDays(today(), MIN_NOTICE);
    if (d && d >= min) calc.date = cDate.value; else { cDate.value = calc.date; toast(`Departures need ${MIN_NOTICE} days’ notice.`); }
    renderCalc();
  });
  $('#cBook').addEventListener('click', () => {
    const t = current;
    fillForm({ tour: t.id, date: calc.date, adults: calc.adults, kids: calc.kids, singles: calc.singles, priv: calc.priv });
    lastTrigger = null; closeTour();
    scrollToEl($('#book'));
    setTimeout(() => $('#bName').focus({ preventScroll: true }), reduce ? 0 : 450);
    toast(`${t.title} added to your enquiry`);
  });
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeTour(); });
  modal.addEventListener('keydown', e => {
    if (!lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeTour(); }
    trap(e, panel);
  });
  $('#tmGallery').addEventListener('click', e => { const b = e.target.closest('[data-lb-open]'); if (b) openLightbox(current.gallery, +b.dataset.lbOpen, b); });

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('#lbImg');
  let lbList = [], lbIdx = 0, lbTrigger = null;
  function showLb() {
    const f = lbList[lbIdx];
    lbImg.src = `assets/img/${f}.webp`; lbImg.alt = IMG[f];
    $('#lbCap').textContent = IMG[f];
    $('#lbCount').textContent = `${lbIdx + 1} / ${lbList.length}`;
  }
  function openLightbox(list, i, trigger) {
    lbList = list; lbIdx = i; lbTrigger = trigger; showLb();
    lb.hidden = false; $('.lb-close', lb).focus();
  }
  function closeLightbox() { lb.hidden = true; if (lbTrigger) lbTrigger.focus(); }
  const stepLb = d => { lbIdx = (lbIdx + d + lbList.length) % lbList.length; showLb(); };
  lb.addEventListener('click', e => {
    const a = e.target.closest('[data-lb]');
    if (a) { const k = a.dataset.lb; if (k === 'close') closeLightbox(); else stepLb(k === 'next' ? 1 : -1); }
    else if (e.target === lb) closeLightbox();
  });
  lb.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeLightbox(); }
    else if (e.key === 'ArrowRight') stepLb(1);
    else if (e.key === 'ArrowLeft') stepLb(-1);
    trap(e, lb);
  });
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) stepLb(dx < 0 ? 1 : -1); touchX = null; });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });

  /* ---------- Enquiry form ---------- */
  const form = $('#bookForm'), success = $('#bookSuccess');
  const f = form.elements;
  f.tour.innerHTML = '<option value="">Choose a tour…</option>' + TOURS.map(t => `<option value="${t.id}">${esc(t.title)} — ${durLabel(t)}, from ${dt(t.price)}</option>`).join('');
  f.date.min = iso(addDays(today(), MIN_NOTICE)); f.date.max = iso(addDays(today(), MAX_AHEAD));

  function formOpts() {
    return { date: f.date.value, adults: Math.max(1, parseInt(f.adults.value, 10) || 1), kids: Math.max(0, parseInt(f.kids.value, 10) || 0), singles: +f.singles.value || 0, priv: f.private.checked };
  }
  function syncSingles() {
    const t = tourById(f.tour.value);
    const show = !!t && t.days > 1;
    $('#bSinglesField').hidden = !show;
    const n = Math.max(1, Math.min(16, parseInt(f.adults.value, 10) || 1));
    const keep = Math.min(+f.singles.value || 0, n);
    f.singles.innerHTML = Array.from({ length: n + 1 }, (_, i) => `<option value="${i}">${i === 0 ? 'None — sharing' : i + (t ? ` (+${t.single} DT / night each)` : '')}</option>`).join('');
    f.singles.value = String(keep);
  }
  function renderEstimate() {
    const t = tourById(f.tour.value);
    if (!t) { $('#estTour').textContent = 'Choose a tour to see your price'; $('#estLines').innerHTML = ''; $('#estTotal').textContent = '—'; return; }
    const o = formOpts();
    const q = quote(t, o);
    $('#estTour').textContent = t.title;
    const when = parse(o.date) ? `${longDate(q.date)} · ${q.season.name}` : `Pick a date · prices shown for ${q.season.name.toLowerCase()}`;
    $('#estLines').innerHTML = linesHTML([[when, ''], ...q.lines]);
    $('#estTotal').textContent = dt(q.total);
  }
  function fillForm(o) {
    f.tour.value = o.tour; f.date.value = o.date; f.adults.value = o.adults; f.kids.value = o.kids; f.private.checked = o.priv;
    syncSingles(); f.singles.value = String(Math.min(o.singles, o.adults)); renderEstimate();
    ['tour', 'date', 'adults'].forEach(n => { const el = f[n]; if (el.closest('.field').classList.contains('invalid')) check(el); });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const rules = {
    tour: v => v ? '' : 'Please choose a tour.',
    date: v => {
      const d = parse(v);
      if (!d) return 'Please choose a departure date.';
      if (d < addDays(today(), MIN_NOTICE)) return `Departures need at least ${MIN_NOTICE} days’ notice — choose ${longDate(addDays(today(), MIN_NOTICE))} or later.`;
      if (d > addDays(today(), MAX_AHEAD)) return 'We take bookings up to 18 months ahead.';
      return '';
    },
    adults: () => {
      const a = parseInt(f.adults.value, 10), k = parseInt(f.kids.value || '0', 10), t = tourById(f.tour.value);
      if (!(a >= 1)) return 'At least one adult must travel.';
      if (!(k >= 0) || k > 10) return 'Children: between 0 and 10.';
      const max = f.private.checked ? 16 : (t ? t.max : 16);
      if (a + k > max) return `This ${f.private.checked ? 'private tour' : 'group tour'} takes up to ${max} travellers — ${f.private.checked ? 'contact us for larger groups' : 'choose “Private tour” for bigger groups'}.`;
      return '';
    },
    name: v => v.trim().length >= 2 ? '' : 'Please enter your full name.',
    email: v => !v.trim() ? 'Please enter your email.' : emailRe.test(v.trim()) ? '' : 'That email doesn’t look right — check for typos.',
    phone: v => {
      const digits = v.replace(/[\s.\-()]/g, '');
      if (!digits) return 'Please enter a phone number so we can reach you.';
      if (!/^\+?\d+$/.test(digits)) return 'Use digits only.';
      if (f.cc.value === '216') return /^[2-9]\d{7}$/.test(digits.replace(/^(\+|00)?216(?=\d{8}$)/, '')) ? '' : 'Enter a valid Tunisian number: 8 digits, e.g. 20 123 456.';
      return /^\d{6,14}$/.test(digits.replace(/^\+/, '')) ? '' : 'Enter a valid phone number (6–14 digits).';
    }
  };
  const errFor = el => $('#' + (el.name === 'kids' ? 'bAdults' : el.id) + '-err');
  function check(el) {
    const key = el.name === 'kids' ? 'adults' : el.name;
    if (!rules[key]) return true;
    const msg = rules[key](el.value);
    const field = el.closest('.field');
    field.classList.toggle('invalid', !!msg);
    (key === 'adults' ? [f.adults, f.kids] : [el]).forEach(x => x.setAttribute('aria-invalid', msg ? 'true' : 'false'));
    errFor(el).textContent = msg;
    return !msg;
  }
  $$('input, select, textarea', form).forEach(el => {
    el.addEventListener('blur', () => { if (el.value && el.type !== 'checkbox') check(el); });
    el.addEventListener('input', () => { if (el.closest('.field') && el.closest('.field').classList.contains('invalid')) check(el); });
  });
  ['tour', 'date', 'adults', 'kids', 'singles', 'private'].forEach(n => form.elements[n].addEventListener(n === 'date' || n === 'tour' || n === 'singles' || n === 'private' ? 'change' : 'input', () => {
    if (n === 'tour' || n === 'adults') syncSingles();
    if (n === 'private' && f.adults.closest('.field').classList.contains('invalid')) check(f.adults);
    renderEstimate();
  }));
  f.cc.addEventListener('change', () => { f.phone.placeholder = f.cc.value === '216' ? '20 123 456' : 'Phone number'; if (f.phone.value) check(f.phone); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let firstBad = null;
    [f.tour, f.date, f.adults, f.name, f.email, f.phone].forEach(el => { if (!check(el) && !firstBad) firstBad = el; });
    if (firstBad) { firstBad.focus(); return; }
    const t = tourById(f.tour.value), o = formOpts(), q = quote(t, o);
    const ref = 'RIH-' + Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
    const rec = {
      ref, tour: t.id, tourTitle: t.title, date: o.date, adults: o.adults, kids: o.kids, singles: q.nights ? o.singles : 0, private: o.priv,
      estimate: q.total, name: f.name.value.trim(), email: f.email.value.trim(), phone: (f.cc.value === 'other' ? '' : '+' + f.cc.value + ' ') + f.phone.value.trim(),
      message: f.message.value.trim(), created: new Date().toISOString()
    };
    const all = store.get('rihla.enquiries', []); all.push(rec); store.set('rihla.enquiries', all);
    $('#sName').textContent = rec.name.split(' ')[0];
    $('#sRef').textContent = ref;
    $('#sEmail').textContent = rec.email;
    $('#sCount').textContent = all.length + (all.length === 1 ? ' enquiry' : ' enquiries');
    const who = `${o.adults} adult${o.adults > 1 ? 's' : ''}` + (o.kids ? `, ${o.kids} child${o.kids > 1 ? 'ren' : ''}` : '');
    const opts = [o.priv ? 'Private tour' : 'Small group', rec.singles ? `${rec.singles} single room${rec.singles > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
    $('#sSummary').innerHTML = linesHTML([['Tour', t.title], ['Departure', longDate(q.date)], ['Travellers', who], ['Options', opts], ['Estimated total', dt(q.total)]]);
    form.hidden = true; success.hidden = false; success.focus();
    success.closest('.form-card').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  });
  $('#newEnquiry').addEventListener('click', () => {
    form.reset(); $$('.field.invalid', form).forEach(x => x.classList.remove('invalid')); $$('[aria-invalid]', form).forEach(x => x.setAttribute('aria-invalid', 'false'));
    syncSingles(); renderEstimate();
    success.hidden = true; form.hidden = false; f.tour.focus();
  });
  syncSingles(); renderEstimate();

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('.section-head, .why-grid li, .review, .season-table-wrap, .form-card, .estimate');
  if ('IntersectionObserver' in window && !reduce) {
    revealEls.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(el => io.observe(el));
  }

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
