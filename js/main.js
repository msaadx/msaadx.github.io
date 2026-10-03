/* =====================================================================
   MUHAMMAD SAAD HASAN — portfolio
   Light interaction layer · vanilla JS · no dependencies
   ===================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ═══════════════════ HEADER ═══════════════════ */
  var header = $('#header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', (window.scrollY || window.pageYOffset) > 30);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ═══════════════════ MOBILE NAV ═══════════════════ */
  var burger = $('#navToggle'), nav = $('#primaryNav');
  function setNav(open) {
    nav.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
  }

  /* ═══════════════════ ACTIVE NAV LINK ═══════════════════ */
  var navLinks = $$('.nav__link');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = '#' + en.target.id;
        navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    $$('section[id]').forEach(function (s) { io.observe(s); });
  }

  /* ═══════════════════ REVEAL ON SCROLL ═══════════════════ */
  var revealEls = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        obs.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  /* ═══════════════════ PROJECT FILTERS + PAGINATION ═══════════════════ */
  (function () {
    var wrap = $('#projectFilters'), list = $('#projectsGrid'); if (!wrap || !list) return;
    var PER_PAGE = 10;
    var btns = $$('.filter', wrap);
    var rows = $$('.ledger__row', list);
    var pager = $('#projectPager'), count = $('#pagerCount'), pagesEl = $('#pagerPages');
    var steps = pager ? $$('.pager__step', pager) : [];
    var cat = 'all', page = 1;

    function render() {
      var matches = rows.filter(function (r) { return cat === 'all' || r.getAttribute('data-cat') === cat; });
      var total = Math.max(1, Math.ceil(matches.length / PER_PAGE));
      page = Math.min(Math.max(page, 1), total);
      var start = (page - 1) * PER_PAGE, end = start + PER_PAGE;

      rows.forEach(function (r) { r.classList.add('is-hidden'); });
      matches.slice(start, end).forEach(function (r) { r.classList.remove('is-hidden'); });

      if (!pager) return;
      pager.hidden = total < 2;
      if (count) count.textContent = 'Showing ' + (start + 1) + '–' + Math.min(end, matches.length) + ' of ' + matches.length;
      pagesEl.innerHTML = '';
      for (var i = 1; i <= total; i++) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'pager__num'; b.textContent = i;
        b.setAttribute('data-page', i);
        b.setAttribute('aria-label', 'Page ' + i);
        if (i === page) b.setAttribute('aria-current', 'page');
        pagesEl.appendChild(b);
      }
      steps[0].disabled = page === 1;
      steps[1].disabled = page === total;
    }

    function goTo(p) {
      page = p; render();
      // keep the list in view when paging from the bottom controls
      var top = list.getBoundingClientRect().top;
      if (top < 0) window.scrollTo({ top: top + window.scrollY - 120, behavior: reduced ? 'auto' : 'smooth' });
    }

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter'); if (!btn) return;
      cat = btn.getAttribute('data-filter'); page = 1;
      btns.forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      render();
    });

    if (pager) pager.addEventListener('click', function (e) {
      var num = e.target.closest('.pager__num'), step = e.target.closest('.pager__step');
      if (num) goTo(+num.getAttribute('data-page'));
      else if (step && !step.disabled) goTo(page + +step.getAttribute('data-step'));
    });

    render();
  })();

  /* ═══════════════════ SMOOTH ANCHORS (offset for fixed header) ═══════════════════ */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id === '#top') {
        e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); return;
      }
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 64, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ═══════════════════ DOWNLOAD CV (print → save as PDF) ═══════════════════ */
  var cv = $('#downloadCv');
  if (cv) cv.addEventListener('click', function () {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    window.print();
  });

  /* ═══════════════════ CONTACT FORM (mailto — no backend) ═══════════════════ */
  (function () {
    var form = $('#contactForm'); if (!form) return;
    var note = $('#formNote');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('#cf-name').value.trim(), m = $('#cf-email').value.trim(), b = $('#cf-message').value.trim();
      if (!n || !m || !b) {
        if (note) { note.textContent = 'Kindly fill in every field.'; note.classList.add('is-err'); }
        return;
      }
      if (note) note.classList.remove('is-err');
      window.location.href = 'mailto:muhammadsaadhsn@gmail.com?subject=' +
        encodeURIComponent('Portfolio enquiry from ' + n) + '&body=' +
        encodeURIComponent(b + '\n\n— ' + n + ' (' + m + ')');
      if (note) note.textContent = 'Thank you — opening your mail client.';
      form.reset();
    });
  })();

  /* ═══════════════════ FOOTER YEAR ═══════════════════ */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
