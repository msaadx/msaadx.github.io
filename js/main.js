/* =====================================================================
   Muhammad Saad Hasan — Portfolio interactions
   Vanilla JS · no dependencies · reduced-motion aware
   ===================================================================== */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ----------------------------- Preloader ----------------------------- */
  const preloader = $('#preloader');
  function hidePreloader() {
    if (!preloader) return;
    preloader.classList.add('is-done');
    document.body.style.overflow = '';
    window.setTimeout(() => preloader.remove(), 800);
  }
  window.addEventListener('load', () => window.setTimeout(hidePreloader, 550));
  // safety net in case 'load' is delayed by fonts/images
  window.setTimeout(hidePreloader, 3500);

  /* ----------------------------- Footer year ----------------------------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----------------------------- Header / scroll progress ----------------------------- */
  const header = $('#header');
  const progress = $('#scrollProgress');
  function onScroll() {
    const y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 40);

    if (progress) {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }

    const toTop = $('#toTop');
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----------------------------- Mobile nav ----------------------------- */
  const navToggle = $('#navToggle');
  const nav = $('#primaryNav');
  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove('is-open');
    navToggle.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('.nav__link, .nav__cta', nav).forEach((a) => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
  }

  /* ----------------------------- Active nav link ----------------------------- */
  const sections = $$('section[id]');
  const navLinks = $$('.nav__link');
  if ('IntersectionObserver' in window && sections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach((link) =>
              link.classList.toggle('is-active', link.getAttribute('href') === '#' + id)
            );
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((s) => navObserver.observe(s));
  }

  /* ----------------------------- Reveal on scroll ----------------------------- */
  const reveals = $$('.reveal');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  }

  /* ----------------------------- Stat counters ----------------------------- */
  const counters = $$('[data-count]');
  function animateCount(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    if (prefersReduced) { el.textContent = target; return; }
    const dur = 1600;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    requestAnimationFrame(tick);
  }
  if (counters.length && 'IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { animateCount(entry.target); obs.unobserve(entry.target); }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => countObserver.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = c.getAttribute('data-count')));
  }

  /* ----------------------------- Hero text rotator ----------------------------- */
  const rotator = $('#rotator');
  if (rotator && !prefersReduced) {
    const words = [
      'agentic RAG platforms',
      'multimodal AI',
      'computer-vision systems',
      'deep-learning research',
    ];
    let i = 0;
    const wordEl = $('.rotator__word', rotator);
    window.setInterval(() => {
      if (!wordEl) return;
      wordEl.classList.add('is-out');
      window.setTimeout(() => {
        i = (i + 1) % words.length;
        wordEl.innerHTML = words[i];
        wordEl.classList.remove('is-out');
      }, 400);
    }, 2600);
  }

  /* ----------------------------- Project filters ----------------------------- */
  const filterWrap = $('#projectFilters');
  if (filterWrap) {
    const filters = $$('.filter', filterWrap);
    const cards = $$('#projectsGrid .pj-card');
    filterWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter');
      if (!btn) return;
      filters.forEach((f) => f.classList.remove('is-active'));
      btn.classList.add('is-active');
      const cat = btn.getAttribute('data-filter');
      cards.forEach((card) => {
        const show = cat === 'all' || card.getAttribute('data-cat') === cat;
        card.classList.toggle('is-hidden', !show);
      });
    });
  }

  /* ----------------------------- Back to top ----------------------------- */
  const toTop = $('#toTop');
  if (toTop) {
    toTop.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })
    );
  }

  /* ----------------------------- Download CV (print → Save as PDF) ----------------------------- */
  const cvBtn = $('#downloadCv');
  if (cvBtn) cvBtn.addEventListener('click', () => window.print());

  /* ----------------------------- Contact form (mailto, no backend) ----------------------------- */
  const form = $('#contactForm');
  if (form) {
    const note = $('#formNote');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#cf-name').value.trim();
      const email = $('#cf-email').value.trim();
      const message = $('#cf-message').value.trim();
      if (!name || !email || !message) {
        if (note) note.textContent = 'Please fill in every field.';
        return;
      }
      const subject = encodeURIComponent('Portfolio enquiry from ' + name);
      const body = encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
      window.location.href =
        'mailto:muhammadsaadhsn@gmail.com?subject=' + subject + '&body=' + body;
      if (note) note.textContent = 'Opening your email client…';
      form.reset();
    });
  }

  /* ----------------------------- Smooth in-page anchors ----------------------------- */
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id === '#' || id === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
        return;
      }
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
      }
    });
  });

  /* =====================================================================
     HERO — neural-network particle canvas
     ===================================================================== */
  const canvas = $('#heroCanvas');
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, nodes = [], raf, mouse = { x: -9999, y: -9999 };

    const GOLD = 'rgba(200, 164, 92,';
    const CREAM = 'rgba(222, 205, 151,';

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      const area = w * h;
      const count = Math.max(28, Math.min(78, Math.round(area / 17000)));
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.6 + 0.6,
        });
      }
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      const maxDist = 138;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        // subtle mouse attraction
        const mdx = mouse.x - n.x, mdy = mouse.y - n.y;
        const md = Math.hypot(mdx, mdy);
        if (md < 160) { n.x += (mdx / md) * 0.25; n.y += (mdy / md) * 0.25; }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = CREAM + '0.55)';
        ctx.fill();
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const op = (1 - dist / maxDist) * 0.32;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = GOLD + op + ')';
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(step);
    }

    const hero = $('#hero');
    if (hero) {
      hero.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      });
      hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(size, 200);
    });

    // pause when hero off-screen to save CPU
    if ('IntersectionObserver' in window && hero) {
      const heroObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { if (!raf) step(); }
          else { cancelAnimationFrame(raf); raf = null; }
        });
      }, { threshold: 0 });
      heroObs.observe(hero);
    }

    size();
    step();
  }
})();
