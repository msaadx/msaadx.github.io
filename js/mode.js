/* =====================================================================
   MODE SWITCH — classic (default) ⇄ engineering
   ---------------------------------------------------------------------
   The page ships in its classic cream-paper dress. The spinning galaxy
   next to Contact swaps the stylesheet, adds the instruments (particle
   field, HUD, ticker, typed prompt) and starts js/field.js. Clicking it
   again puts everything back exactly as it was. Same content, two looks.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var classicCss = $('#classicCss'), fieldCss = $('#fieldCss'), toggle = $('#modeToggle'), theme = $('meta[name="theme-color"]');
  if (!classicCss || !fieldCss || !toggle) return;

  function isOn() { return root.classList.contains('mode-field'); }

  /* ─────────── the engineering-only furniture, built on first switch ─────────── */
  var built = false;
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function build() {
    if (built) return; built = true;
    var lead = $('.hero__lead');
    if (lead) lead.parentNode.insertBefore(el(
      '<p class="hero__typed field-only" aria-hidden="true"><span class="hero__prompt">&gt;</span> building <span id="typed">agentic RAG platforms</span><span class="hero__caret">_</span></p>'), lead);

    var hero = $('#hero'), stats = hero && $('.stats', hero);
    if (stats) hero.insertBefore(el(
      '<a href="#about" class="scroll-cue field-only" aria-label="Scroll to about"><span>Scroll to explore</span><i aria-hidden="true"></i></a>'), stats.parentNode);

    var words = ['PyTorch', 'TensorFlow', 'Qdrant', 'Cohere Rerank', 'YOLOv12', 'FastAPI', 'Celery', 'Gemini', 'OpenRouter', 'AWS ECS',
      'Kolmogorov–Arnold Nets', 'Fourier Neural Operators', 'DeepSORT', 'TrOCR', 'U-Net', 'Knowledge Distillation', 'Docker', 'React'];
    if (hero) hero.parentNode.insertBefore(el(
      '<div class="ticker field-only" aria-hidden="true"><div class="ticker__track" id="ticker">' +
      words.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div></div>'), hero.nextSibling);

    [
      '<canvas id="field" class="field-only" aria-hidden="true"></canvas>',
      '<div class="progress field-only" aria-hidden="true"><i id="progress"></i></div>',
      '<div class="hud field-only" aria-hidden="true"><p id="hudScene"></p><p id="hudStat"></p><p><span id="hudScroll"></span> &nbsp; <span id="hudClock"></span></p></div>',
      '<div class="reticle field-only" id="reticle" aria-hidden="true"><i></i><span id="reticleXY"></span></div>'
    ].forEach(function (h) { document.body.appendChild(el(h)); });

    var vt = document.createElement('style');
    vt.textContent = '::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}' +
      '::view-transition-new(root){z-index:9999}';
    document.head.appendChild(vt);
    effects();
  }

  /* ─────────── section labels: "I. About" ⇄ "01 — About" ─────────── */
  var ROMAN = { I: 1, V: 5, X: 10 };
  function roman(r) { var n = 0; for (var i = 0; i < r.length; i++) { var v = ROMAN[r[i]], nx = ROMAN[r[i + 1]] || 0; n += v < nx ? -v : v; } return n; }
  function labels(on) {
    $$('.label').forEach(function (l) {
      if (on) {
        if (l.dataset.classic == null) l.dataset.classic = l.innerHTML;
        var t = l.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim(), m = t.match(/^([IVX]+)\.\s*(.*)$/);
        l.textContent = m ? (roman(m[1]) < 10 ? '0' : '') + roman(m[1]) + ' — ' + m[2] : '00 — ' + t;
      } else if (l.dataset.classic != null) {
        l.innerHTML = l.dataset.classic;
      }
    });
  }

  /* ─────────── the switch itself ─────────── */
  // the two looks have different heights, so hold on to whichever section is in view
  function anchor() {
    var mid = innerHeight / 2, secs = $$('main > section');
    for (var i = 0; i < secs.length; i++) {
      var r = secs[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) return { el: secs[i], f: (mid - r.top) / r.height };
    }
    return null;
  }

  function apply(on) {
    var keep = window.scrollY > 0 ? anchor() : null;
    if (on) build();
    root.classList.toggle('mode-field', on);
    fieldCss.media = on ? 'all' : 'not all';
    classicCss.media = on ? 'not all' : 'all';
    if (theme) theme.setAttribute('content', on ? '#0a1020' : '#f3ede1');
    labels(on);
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', on ? 'Switch back to the classic site' : 'Switch to engineering mode');
    var tip = $('.mode-toggle__tip', toggle); if (tip) tip.textContent = on ? 'Classic mode' : 'Engineering mode';
    try { sessionStorage.setItem('msh-mode', on ? 'field' : 'classic'); } catch (e) {}
    if (keep) {
      var r = keep.el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top + keep.f * r.height - innerHeight / 2, behavior: 'instant' });
    }
    if (window.Field) { if (on) window.Field.start(); else window.Field.stop(); }
  }

  function whenLoaded(link, fn) {
    if (link.sheet) return fn();
    link.addEventListener('load', fn, { once: true });
  }

  function switchTo(on) {
    var r = toggle.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    whenLoaded(on ? fieldCss : classicCss, function () {
      if (reduced || !document.startViewTransition) { apply(on); return; }
      var far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var t = document.startViewTransition(function () { apply(on); });
      t.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + far + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 1100, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(function () {});
    });
  }

  toggle.addEventListener('click', function () { switchTo(!isOn()); });
  if (reduced) { var svg = $('svg', toggle); if (svg && svg.pauseAnimations) svg.pauseAnimations(); }

  // the inline script in <head> may already have chosen engineering mode
  if (isOn()) apply(true);

  /* ═══════════════════ ENGINEERING-ONLY EFFECTS ═══════════════════
     Set up once, on the first switch; each one idles in classic mode.  */
  function effects() {

    /* typed roles in the hero prompt */
    (function () {
      var t = $('#typed'); if (!t || reduced) return;
      var words = ['agentic RAG platforms', 'multimodal AI engines', 'computer-vision systems', 'novel neural architectures', 'things that think'];
      var w = 0, i = t.textContent.length, del = true;
      function tick() {
        if (!isOn()) return setTimeout(tick, 800);
        var word = words[w];
        if (del) { i--; if (i <= 0) { del = false; w = (w + 1) % words.length; } }
        else { i++; if (i >= words[w].length) { del = true; t.textContent = words[w]; return setTimeout(tick, 2200); } }
        t.textContent = (del ? word : words[w]).slice(0, Math.max(i, 0));
        setTimeout(tick, del ? 28 : 55);
      }
      setTimeout(tick, 2600);
    })();

    /* ticker: its speed and lean follow scroll velocity */
    (function () {
      var track = $('#ticker'); if (!track) return;
      track.innerHTML += track.innerHTML;
      var x = 0, lastY = window.scrollY, v = 0;
      function clampN(n, a, b) { return Math.max(a, Math.min(b, n)); }
      (function step() {
        if (isOn()) {
          var sy = window.scrollY, dy = sy - lastY; lastY = sy;
          v += (dy - v) * .1;
          if (!reduced) x -= .6 + Math.abs(v) * .35;
          var half = track.scrollWidth / 2;
          if (x <= -half) x += half;
          track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) skewX(' + clampN(-v * .15, -10, 10).toFixed(2) + 'deg)';
        }
        requestAnimationFrame(step);
      })();
    })();

    /* labels decode into place; numbers count up */
    var GLYPHS = '01<>/#*+=-_ABCDEFGHJKLMNPQRSTUVWXYZ';
    function decode(l) {
      if (reduced || l.dataset.done) return;
      l.dataset.done = '1';
      var final = l.textContent, start = performance.now(), dur = 700;
      (function run(now) {
        if (!isOn()) return;
        var p = Math.min(1, (now - start) / dur), n = Math.floor(final.length * p), out = final.slice(0, n);
        for (var k = n; k < final.length; k++) out += final[k] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        l.textContent = out;
        if (p < 1) requestAnimationFrame(run); else l.textContent = final;
      })(start);
    }
    function countUp(d) {
      if (reduced || d.dataset.counted) return;
      d.dataset.counted = '1';
      var m = d.textContent.trim().match(/^([~>]?)(\d+(?:\.\d+)?)(.*)$/);
      if (!m) return;
      var pre = m[1], target = parseFloat(m[2]), dec = (m[2].split('.')[1] || '').length, suf = m[3], start = performance.now(), dur = 1400;
      (function run(now) {
        var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
        d.textContent = pre + (target * e).toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(run);
      })(start);
    }

    if ('IntersectionObserver' in window) {
      var once = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting || !isOn()) return;
          if (en.target.classList.contains('label')) decode(en.target); else countUp(en.target);
        });
      }, { threshold: .6 });
      $$('.label, .stat dt, .figures dt, .honours dt').forEach(function (n) { once.observe(n); });

      // the role nearest the middle of the screen is "live" (its core lights on the chip)
      var live = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.classList.toggle('is-live', en.isIntersecting); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      $$('.role').forEach(function (r) { live.observe(r); });

      // the HUD steps aside for the footer
      var hud = $('.hud'), foot = $('.footer');
      if (hud && foot) new IntersectionObserver(function (en) { hud.classList.toggle('is-hidden', en[0].isIntersecting); }).observe(foot);
    }

    /* cursor reticle + glint on panels */
    (function () {
      var ret = $('#reticle'), xy = $('#reticleXY');
      if (!ret || reduced || window.matchMedia('(hover: none)').matches) return;
      var tx = 0, ty = 0, cx = 0, cy = 0;
      window.addEventListener('pointermove', function (e) {
        if (!isOn()) return;
        tx = e.clientX; ty = e.clientY; ret.classList.add('is-on');
        ret.classList.toggle('is-link', !!e.target.closest('a,button,.filter,label'));
        var card = e.target.closest('.feature,.paper,.column');
        if (card) {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }
      }, { passive: true });
      document.addEventListener('pointerleave', function () { ret.classList.remove('is-on'); });
      (function follow() {
        if (isOn()) {
          cx += (tx - cx) * .22; cy += (ty - cy) * .22;
          ret.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
          if (xy) xy.textContent = 'X ' + String(Math.round(tx)).padStart(4, '0') + '  Y ' + String(Math.round(ty + window.scrollY)).padStart(5, '0');
        }
        requestAnimationFrame(follow);
      })();
    })();
  }
})();
