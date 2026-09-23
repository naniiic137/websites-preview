/* Hamza Ben Ismail — showcase landing page (vanilla JS, no dependencies) */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme ---------- */
  var themeBtn = $('#themeToggle');
  var darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : darkMq.matches;
  }
  function syncThemeLabel() {
    themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
  }
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('hb-theme', next);
    syncThemeLabel();
  });
  if (darkMq.addEventListener) darkMq.addEventListener('change', syncThemeLabel);
  syncThemeLabel();

  /* ---------- Header + mobile nav ---------- */
  var header = $('.site-header');
  var nav = $('#mainNav');
  var menuBtn = $('#menuToggle');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !e.target.closest('.site-header')) setMenu(false);
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });

  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // highlight current section in nav
  var navLinks = $$('.main-nav ul a');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* ---------- Screenshot fallback (previews/*.webp may not exist yet) ---------- */
  $$('.shot img, .thumb img').forEach(function (img) {
    function fail() { img.classList.add('failed'); }
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();
    img.addEventListener('error', fail);
  });

  /* ---------- Industry filter ---------- */
  var list = $('#projects');
  var chips = $$('#chips .chip');
  var items = $$('#projects .project');
  var status = $('#filterStatus');
  list.classList.add('all');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      var shown = 0;
      items.forEach(function (it) {
        var match = f === 'all' || it.getAttribute('data-cat') === f;
        it.hidden = !match;
        if (match) {
          shown++;
          it.classList.add('in');
          if (!reduceMotion && it.animate) it.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'ease-out' });
        }
      });
      list.classList.toggle('all', f === 'all');
      status.textContent = shown + (shown === 1 ? ' project' : ' projects') + ' shown';
    });
  });

  /* ---------- Device preview dialog ---------- */
  var dialog = $('#preview');
  var frame = $('#previewFrame');
  var device = $('#device');
  var stage = $('#previewStage');
  var titleEl = $('#previewTitle');
  var openLink = $('#previewOpen');
  var segBtns = $$('.segmented button', dialog);
  var SIZES = { desktop: { w: 1280, h: 800, padX: 0, padY: 0 }, phone: { w: 390, h: 844, padX: 28, padY: 62 } }; // padY = top bezel 40 + bottom 22
  var mode = window.innerWidth < 900 ? 'phone' : 'desktop';
  var lastTrigger = null;

  function layout() {
    if (!dialog.open) return;
    var cs = getComputedStyle(stage);
    var sw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var sh = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var s = SIZES[mode];
    var outerW = s.w + s.padX;
    var scale, outerH;
    if (mode === 'desktop') {
      scale = Math.min(1, sw / outerW);
      outerH = Math.max(400, sh / scale); // fill the available height
    } else {
      outerH = s.h + s.padY;
      scale = Math.min(1, sw / outerW, sh / outerH);
    }
    device.className = 'device ' + mode;
    device.style.width = outerW + 'px';
    device.style.height = outerH + 'px';
    device.style.position = 'absolute';
    device.style.left = '50%';
    device.style.top = '50%';
    device.style.transform = 'translate(-50%, -50%) scale(' + scale.toFixed(4) + ')';
  }
  function setMode(m) {
    mode = m;
    segBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-device') === m)); });
    layout();
  }
  segBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-device')); }); });

  function openPreview(folder, name, trigger) {
    lastTrigger = trigger || null;
    titleEl.textContent = name;
    openLink.href = folder + '/index.html';
    frame.title = name + ' — live preview';
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else { // very old browsers: just navigate
      window.location.href = folder + '/index.html';
      return;
    }
    document.body.style.overflow = 'hidden';
    setMode(mode);
    frame.src = folder + '/index.html';
  }
  function closePreview() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', function () {
    frame.src = 'about:blank';
    document.body.style.overflow = '';
    if (lastTrigger) lastTrigger.focus();
  });
  $('#previewClose').addEventListener('click', closePreview);
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closePreview(); }); // backdrop click
  window.addEventListener('resize', layout);
  $$('.preview-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openPreview(btn.getAttribute('data-folder'), btn.getAttribute('data-name'), btn);
    });
  });

  /* ---------- Contact form (Netlify Forms, mailto fallback) ---------- */
  var form = $('#contactForm');
  var success = $('#formSuccess');
  var errorBox = $('#formError');
  var submitBtn = $('#contactSubmit');
  var MAIL = 'hamza.benismail.6@gmail.com';
  var fields = $$('.field input, .field select, .field textarea', form);
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your name.'; },
    email: function (v) { return !v.trim() ? 'Please enter your email.' : (emailRe.test(v.trim()) ? '' : 'That email doesn’t look right — check for typos.'); },
    type: function (v) { return v ? '' : 'Please choose the closest option.'; },
    message: function (v) { return v.trim().length >= 10 ? '' : 'Tell me a bit more (at least 10 characters).'; }
  };
  function val(n) { return form.elements[n].value.trim(); }
  function check(el) {
    var msg = rules[el.name] ? rules[el.name](el.value) : '';
    var field = el.closest('.field');
    field.classList.toggle('invalid', !!msg);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $('#' + el.getAttribute('aria-describedby')).textContent = msg;
    return !msg;
  }
  function mailtoHref() {
    var subject = 'Website enquiry — ' + (val('type') || 'new project');
    var body = 'Hi Hamza,\n\n' + val('message') + '\n\n— ' + val('name') + (val('email') ? ' (' + val('email') + ')' : '');
    return 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  function syncMailto() { var h = mailtoHref(); $('#mailtoFallback').href = h; $('#mailtoNote').href = h; }
  fields.forEach(function (el) {
    el.addEventListener('blur', function () { if (el.value) check(el); });
    el.addEventListener('input', function () { if (el.closest('.field').classList.contains('invalid')) check(el); syncMailto(); });
    el.addEventListener('change', syncMailto);
  });
  function setSending(on) {
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.textContent = on ? 'Sending…' : 'Send message';
  }
  function showError() {
    syncMailto();
    errorBox.hidden = false;
    setSending(false);
    $('#mailtoFallback').focus();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;
    var firstBad = null;
    fields.forEach(function (el) { if (!check(el) && !firstBad) firstBad = el; });
    if (firstBad) { firstBad.focus(); return; }
    if (!window.fetch || !window.URLSearchParams || location.protocol === 'file:') { showError(); return; }
    var body = new URLSearchParams();
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name) body.append(el.name, el.value); });
    setSending(true);
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      $('#successName').textContent = val('name').split(' ')[0];
      $('#successEmail').textContent = val('email');
      setSending(false);
      form.hidden = true;
      success.hidden = false;
      success.focus();
    }).catch(showError);
  });
  $('#newMessage').addEventListener('click', function () {
    form.reset();
    syncMailto();
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('.section-head, .project, .benefit, .steps li, .contact-copy, .form-card');
  if ('IntersectionObserver' in window && !reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  $('#year').textContent = new Date().getFullYear();
})();
