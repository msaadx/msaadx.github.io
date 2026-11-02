/* =====================================================================
   THE FIELD — one particle system behind the whole page.
   ---------------------------------------------------------------------
   Every section names a scene with data-scene. The same particles hold
   one shape while you read a section and are thrown to the next shape
   as you scroll past its edge: galaxy → brain → neural net → chip →
   rover → orbits → helix → atom → strings → rocket.
   Vanilla JS, 2D canvas, no dependencies.
   ===================================================================== */
(function () {
  'use strict';

  // The canvas is created by js/mode.js when the visitor switches modes;
  // nothing here runs until Field.start() is called.
  var canvas = null, ctx = null;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;

  /* ─────────────────────────── utilities ─────────────────────────── */

  // Seeded, so the field looks the same on every visit.
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry(20021128);
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function hash(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
  function wrap(v, a, b) { var w = b - a; return ((((v - a) % w) + w) % w) + a; }

  // Palette indices. Particles are drawn in buckets by colour.
  var PAL = [
    'rgba(236,230,216,.92)', // 0 cream
    'rgba(236,230,216,.38)', // 1 cream, dim
    'rgba(255,106,61,.95)',  // 2 signal orange
    'rgba(127,216,255,.9)',  // 3 cyan
    'rgba(127,216,255,.32)', // 4 cyan, dim
    'rgba(255,255,255,1)'    // 5 hot white
  ];
  var INK = 'rgba(236,230,216,', ORANGE = 'rgba(255,106,61,', CYAN = 'rgba(127,216,255,';

  /* ───────────────── shape sampling from canvas drawings ─────────────────
     A part can be drawn with ordinary canvas calls in a 400×400 box; the
     filled pixels become the particles' seats in unit coordinates [-1, 1]. */
  var BOX = 400;
  var off = document.createElement('canvas'); off.width = off.height = BOX;
  var octx = off.getContext('2d', { willReadFrequently: true });

  function sample(draw, n) {
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, BOX, BOX);
    octx.strokeStyle = octx.fillStyle = '#fff';
    octx.lineCap = 'round'; octx.lineJoin = 'round';
    draw(octx);
    var d = octx.getImageData(0, 0, BOX, BOX).data, px = [];
    for (var i = 0; i < BOX * BOX; i++) if (d[i * 4 + 3] > 120) px.push(i);
    var out = new Float32Array(n * 2);
    for (var k = 0; k < n; k++) {
      var p = px.length ? px[(rand() * px.length) | 0] : 0;
      out[k * 2] = ((p % BOX) + rand() - .5) / (BOX / 2) - 1;
      out[k * 2 + 1] = (((p / BOX) | 0) + rand() - .5) / (BOX / 2) - 1;
    }
    return out;
  }
  function U(px) { return px / (BOX / 2) - 1; }          // 400-box px → unit
  function staticPart(w, draw, opt) {
    opt = opt || {};
    return {
      w: w, c: opt.c == null ? 0 : opt.c, s: opt.s || 1,
      init: function (n) { this.pts = sample(draw, n); },
      at: function (k, t, o) { o.x = this.pts[k * 2]; o.y = this.pts[k * 2 + 1]; }
    };
  }

  /* ────────────── annotation helpers (engineering-drawing callouts) ────────────── */
  var FONT_PX = 11;
  function mono(size) { return (size || FONT_PX) * DPR + 'px "IBM Plex Mono", ui-monospace, monospace'; }
  function callout(T, ux, uy, dx, dy, text, a, col) {
    ctx.font = mono();
    var w = ctx.measureText(text).width, x = T.x(ux), y = T.y(uy);
    // keep the label on the canvas: flip it to the other side if it would run off
    if (dx > 0 && x + dx * DPR + w > canvas.width - 12 * DPR) dx = -dx;
    else if (dx < 0 && x + dx * DPR - w < 12 * DPR) dx = -dx;
    var lx = x + dx * DPR, ly = y + dy * DPR, right = dx < 0;
    ctx.strokeStyle = (col || INK) + (.55 * a) + ')';
    ctx.fillStyle = (col || INK) + (.9 * a) + ')';
    ctx.lineWidth = DPR;
    ctx.beginPath(); ctx.arc(x, y, 2.5 * DPR, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly);
    ctx.lineTo(right ? lx - w : lx + w, ly); ctx.stroke();
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillText(text, lx, ly - 5 * DPR);
    ctx.textAlign = 'left';
  }
  function label(x, y, text, a, col, size, align) {
    ctx.font = mono(size); ctx.textAlign = align || 'left';
    ctx.fillStyle = (col || INK) + a + ')';
    ctx.fillText(text, x, y); ctx.textAlign = 'left';
  }
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }

  /* ═════════════════════════════ SCENES ═════════════════════════════
     Each scene: parts (weighted particle groups, each with init/at),
     optional scale/offset in unit space, and an overlay for callouts.  */

  var dom = {
    roles: Array.prototype.map.call(document.querySelectorAll('.role .role__org'), function (e) { return e.firstChild ? e.firstChild.textContent.trim() : ''; }),
    papers: Array.prototype.map.call(document.querySelectorAll('.paper .paper__title'), function (e) { return e.textContent.trim(); }),
    tools: Array.prototype.map.call(document.querySelectorAll('.facts--wide dt'), function (e) { return e.textContent.trim(); }),
    cats: Array.prototype.map.call(document.querySelectorAll('.ledger__row'), function (e) { return e.getAttribute('data-cat'); })
  };
  var state = { core: 0, fire: -1, fireT: -99, orbit: -1, electron: -1, cat: 'all', pluck: [0, 0, 0, 0], sectionP: 0 };

  /* ── 01 · GALAXY ─────────────────────────────────────────────── */
  var galaxy = {
    id: 'galaxy', name: 'SPIRAL GALAXY · N-BODY', scale: 1.08,
    parts: [
      { w: .62, c: 0, init: function (n) {
          this.r = new Float32Array(n); this.a = new Float32Array(n); this.col = new Uint8Array(n);
          for (var k = 0; k < n; k++) {
            var r = Math.pow(rand(), .62) * .98;
            this.r[k] = r;
            this.a[k] = (k % 3) * TAU / 3 + r * 4.4 + (rand() - .5) * (.55 - r * .25);
            this.col[k] = rand() < .12 ? 3 : rand() < .25 ? 1 : 0;
          }
        },
        at: function (k, t, o) {
          var r = this.r[k], a = this.a[k] + t * .07 * (1.35 - r);
          var x = Math.cos(a) * r, y = Math.sin(a) * r * .58;
          o.x = x * .94 - y * .34; o.y = x * .34 + y * .94; o.c = this.col[k];
        } },
      { w: .2, c: 2, s: 1.3, init: function (n) {
          this.r = new Float32Array(n); this.a = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.r[k] = Math.pow(rand(), 1.8) * .2; this.a[k] = rand() * TAU; }
        },
        at: function (k, t, o) {
          var r = this.r[k], a = this.a[k] + t * .22;
          o.x = Math.cos(a) * r; o.y = Math.sin(a) * r * .6;
          o.c = r < .06 ? 5 : r < .12 ? 2 : 0;
        } },
      { w: .18, c: 1, init: function (n) {
          this.p = new Float32Array(n * 2);
          for (var k = 0; k < n; k++) { this.p[k * 2] = (rand() - .5) * 2.6; this.p[k * 2 + 1] = (rand() - .5) * 2.2; }
        },
        at: function (k, t, o) {
          o.x = this.p[k * 2]; o.y = this.p[k * 2 + 1];
          o.c = hash(k + Math.floor(t * 2 + k)) < .08 ? 0 : 1;
        } }
    ],
    overlay: function (T, a, t) {
      var cx = T.x(0), cy = T.y(0), R = T.s * 1.12;
      ctx.strokeStyle = INK + (.12 * a) + ')'; ctx.lineWidth = DPR;
      ctx.beginPath(); ctx.ellipse(cx, cy, R, R * .62, .35, 0, TAU); ctx.stroke();
      for (var i = 0; i < 36; i++) {
        var ang = i / 36 * TAU, c = Math.cos(ang), s = Math.sin(ang), L = i % 9 ? 4 : 10;
        ctx.beginPath();
        ctx.moveTo(cx + c * R, cy + s * R * .62);
        ctx.lineTo(cx + c * (R + L * DPR), cy + s * (R + L * DPR) * .62);
        ctx.stroke();
      }
      callout(T, 0, 0, 120, -150, 'CORE · Sgr A*', a, ORANGE);
      callout(T, -.62, .22, -70, 90, 'PERSEUS ARM', a);
      label(T.x(.3), T.y(1.0), 'N = ' + N.toLocaleString() + ' BODIES', .7 * a);
      label(T.x(.3), T.y(1.0) + 16 * DPR, 'Ω = 0.07 rad/s · t = ' + t.toFixed(1) + 's', .45 * a);
    }
  };

  /* ── 02 · BRAIN ──────────────────────────────────────────────── */
  function cortexPath(c) {
    c.beginPath();
    c.moveTo(62, 232);
    c.bezierCurveTo(30, 150, 100, 66, 196, 66);
    c.bezierCurveTo(296, 56, 368, 120, 356, 204);
    c.bezierCurveTo(350, 254, 304, 274, 258, 264);
    c.bezierCurveTo(222, 292, 166, 288, 136, 272);
    c.bezierCurveTo(96, 278, 66, 262, 62, 232);
    c.closePath();
  }
  var brain = {
    id: 'brain', name: 'CORTEX · SYNAPTIC MAP',
    parts: [
      staticPart(.34, function (c) {
        c.lineWidth = 3.2; cortexPath(c); c.stroke();
        c.save(); c.translate(298, 282); c.rotate(-.14);
        c.beginPath(); c.ellipse(0, 0, 56, 31, 0, 0, TAU); c.stroke(); c.restore();
        c.beginPath(); c.moveTo(244, 290); c.quadraticCurveTo(240, 320, 234, 350);
        c.moveTo(272, 292); c.quadraticCurveTo(268, 322, 262, 350); c.stroke();
      }),
      { w: .56, c: 0, init: function (n) {
          this.pts = sample(function (c) {
            c.save(); cortexPath(c); c.clip(); c.lineWidth = 2;
            for (var j = 0; j < 9; j++) {
              c.beginPath();
              for (var x = 40; x <= 370; x += 3) {
                var y = 92 + j * 22 + 7 * Math.sin(x * .085 + j * 1.9) + 4 * Math.sin(x * .031 + j);
                if (x === 40) c.moveTo(x, y); else c.lineTo(x, y);
              }
              c.stroke();
            }
            c.lineWidth = 2.6;
            c.beginPath(); c.moveTo(214, 70); c.bezierCurveTo(196, 130, 222, 170, 190, 240); c.stroke();
            c.beginPath(); c.moveTo(108, 222); c.bezierCurveTo(170, 200, 230, 214, 290, 186); c.stroke();
            c.restore();
            c.save(); c.translate(298, 282); c.rotate(-.14);
            c.beginPath(); c.ellipse(0, 0, 56, 31, 0, 0, TAU); c.clip(); c.lineWidth = 1.6;
            for (var s = -24; s <= 24; s += 8) { c.beginPath(); c.ellipse(0, s * .4, 54, 10 + Math.abs(s) * .2, 0, 0, Math.PI); c.stroke(); }
            c.restore();
          }, n);
        },
        at: function (k, t, o) {
          o.x = this.pts[k * 2]; o.y = this.pts[k * 2 + 1];
          var f = hash(k * 1.37 + Math.floor(t * 2.5 + hash(k) * 9));
          o.c = f < .035 ? 2 : f < .06 ? 5 : (k % 5 ? 0 : 4);
          o.s = f < .06 ? 1.8 : 1;
        } },
      { w: .1, c: 4, init: function (n) {
          this.r = new Float32Array(n); this.a = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.r[k] = 1.02 + rand() * .2; this.a[k] = rand() * TAU; }
        },
        at: function (k, t, o) {
          var a = this.a[k] + t * .05;
          o.x = Math.cos(a) * this.r[k]; o.y = Math.sin(a) * this.r[k] * .8;
        } }
    ],
    overlay: function (T, a, t) {
      // synapses: short arcs between pairs that fire on their own clocks
      var g = scenesById.brain.parts[1];
      if (g.pts) {
        ctx.lineWidth = DPR;
        for (var i = 0; i < 46; i++) {
          var A = (i * 37) % (g.pts.length / 2), B = (A + 1 + (i * 11) % 23) % (g.pts.length / 2);
          var ph = (t * .9 + hash(i) * 7) % 3;
          if (ph > 1) continue;
          var pulse = Math.sin(ph * Math.PI);
          var x1 = T.x(g.pts[A * 2]), y1 = T.y(g.pts[A * 2 + 1]), x2 = T.x(g.pts[B * 2]), y2 = T.y(g.pts[B * 2 + 1]);
          if (Math.abs(x1 - x2) + Math.abs(y1 - y2) > T.s * .7) continue;
          ctx.strokeStyle = ORANGE + (.55 * pulse * a) + ')';
          ctx.beginPath(); ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 18 * DPR, x2, y2); ctx.stroke();
        }
      }
      callout(T, U(150), U(110), -60, -60, 'FRONTAL LOBE', a);
      callout(T, U(300), U(282), 70, 70, 'CEREBELLUM', a);
      callout(T, U(205), U(150), 110, -120, 'CENTRAL SULCUS', a, CYAN);
      label(T.x(-1.12), T.y(1.08), '≈ 86,000,000,000 NEURONS · 1 CURIOUS ONE', .55 * a);
    }
  };

  /* ── 03 · NEURAL NETWORK ─────────────────────────────────────── */
  var LAYERS = [4, 6, 6, 3];
  var nodes = [], edges = [];
  (function () {
    for (var l = 0; l < LAYERS.length; l++) {
      for (var j = 0; j < LAYERS[l]; j++) {
        nodes.push({ l: l, j: j, x: -.86 + l * (1.72 / (LAYERS.length - 1)), y: (j - (LAYERS[l] - 1) / 2) * .27 });
      }
    }
    nodes.forEach(function (a, ia) {
      nodes.forEach(function (b, ib) { if (b.l === a.l + 1) edges.push([ia, ib, rand()]); });
    });
  })();
  function nodeAct(i, t) {
    // forward pass: a wave that sweeps the layers every 3s, or from a hovered input
    var n = nodes[i], since = t - state.fireT, ph;
    if (since >= 0 && since < 2.4) {
      ph = since / .55 - n.l;
      if (n.l === 0 && n.j !== state.fire) return .1;
    } else ph = ((t % 3) / .55) - n.l;
    var w = n.l === 0 ? 1 : .35 + .65 * hash(i * 3.1 + Math.floor(t / 3));
    return ph > 0 && ph < 1 ? Math.sin(ph * Math.PI) * w : 0;
  }
  var net = {
    id: 'net', name: 'NEURAL NETWORK · FORWARD PASS',
    parts: [
      { w: .5, c: 0, init: function (n) {
          this.nd = new Uint8Array(n); this.r = new Float32Array(n); this.a = new Float32Array(n);
          for (var k = 0; k < n; k++) {
            this.nd[k] = k % nodes.length;
            this.r[k] = rand() < .7 ? .068 + (rand() - .5) * .01 : .06 * Math.sqrt(rand());
            this.a[k] = rand() * TAU;
          }
        },
        at: function (k, t, o) {
          var i = this.nd[k], nd = nodes[i], act = nodeAct(i, t), r = this.r[k] * (1 + act * .45);
          o.x = nd.x + Math.cos(this.a[k]) * r; o.y = nd.y + Math.sin(this.a[k]) * r;
          o.c = act > .35 ? (r > .06 ? 2 : 5) : (r > .06 ? 0 : 1);
        } },
      { w: .5, c: 4, init: function (n) {
          this.e = new Uint16Array(n); this.u = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.e[k] = (rand() * edges.length) | 0; this.u[k] = rand(); }
        },
        at: function (k, t, o) {
          var e = edges[this.e[k]], A = nodes[e[0]], B = nodes[e[1]];
          var u = (this.u[k] + t * .16) % 1;
          o.x = A.x + (B.x - A.x) * u; o.y = A.y + (B.y - A.y) * u;
          o.c = nodeAct(e[0], t) > .4 && u < .5 ? 3 : 4;
        } }
    ],
    overlay: function (T, a, t) {
      ctx.lineWidth = 1.4 * DPR;
      edges.forEach(function (e) {
        var act = Math.min(nodeAct(e[0], t), 1);
        if (act < .2 || e[2] < .45) return;
        var A = nodes[e[0]], B = nodes[e[1]];
        ctx.strokeStyle = ORANGE + (act * .35 * a) + ')';
        ctx.beginPath(); ctx.moveTo(T.x(A.x), T.y(A.y)); ctx.lineTo(T.x(B.x), T.y(B.y)); ctx.stroke();
      });
      var names = ['x₁ RAG', 'x₂ VISION', 'x₃ RESEARCH', 'x₄ CLOUD'];
      for (var j = 0; j < 4; j++) label(T.x(-.98), T.y(nodes[j].y) + 4 * DPR, names[j], (j === state.fire && t - state.fireT < 2.4 ? 1 : .55) * a, j === state.fire ? ORANGE : INK, 10, 'right');
      var heads = ['INPUT ∈ ℝ⁴', 'HIDDEN h₁', 'HIDDEN h₂', 'OUTPUT ŷ'];
      for (var l = 0; l < LAYERS.length; l++) label(T.x(-.86 + l * (1.72 / 3)), T.y(-1.0), heads[l], .45 * a, CYAN, 10, 'center');
      var cyc = t % 40, loss = .018 + .62 * Math.exp(-cyc / 7);
      label(T.x(-.86), T.y(1.02), 'EPOCH ' + pad(Math.floor(cyc * 12), 4) + '   LOSS ' + loss.toFixed(4) + '   ACC ' + (99.2 - loss * 60).toFixed(1) + '%', .7 * a);
      label(T.x(-.86), T.y(1.02) + 16 * DPR, '↳ hover a discipline to fire its input', .4 * a);
    }
  };

  /* ── 04 · CHIP ───────────────────────────────────────────────── */
  var traces = [];
  (function () {
    // pins leave the die on four sides and run out to vias with one 45° bend
    for (var side = 0; side < 4; side++) {
      for (var p = 0; p < 7; p++) {
        var o = -.42 + p * .14, len = .32 + hash(side * 9 + p) * .38, bend = (hash(side * 5 + p * 3) - .5) * .5;
        var pts = [[o, -.38], [o, -.48], [o + bend * .4, -.48 - len * .45], [o + bend, -.48 - len]];
        traces.push(pts.map(function (q) {
          var x = q[0], y = q[1];
          return side === 0 ? [x, y] : side === 1 ? [-y, x] : side === 2 ? [-x, -y] : [y, -x];
        }));
      }
    }
    traces.forEach(function (tr) {
      var L = 0; tr.len = [0];
      for (var i = 1; i < tr.length; i++) { L += Math.hypot(tr[i][0] - tr[i - 1][0], tr[i][1] - tr[i - 1][1]); tr.len.push(L); }
      tr.L = L;
    });
  })();
  function alongTrace(tr, u, o) {
    var d = u * tr.L, i = 1;
    while (i < tr.length - 1 && tr.len[i] < d) i++;
    var seg = (d - tr.len[i - 1]) / (tr.len[i] - tr.len[i - 1] || 1);
    o.x = tr[i - 1][0] + (tr[i][0] - tr[i - 1][0]) * seg; o.y = tr[i - 1][1] + (tr[i][1] - tr[i - 1][1]) * seg;
  }
  var CORE_W = .2, CORE_H = .28;
  function coreXY(j) { return [-.24 + (j % 3) * .24, j < 3 ? -.15 : .15]; }
  var chip = {
    id: 'chip', name: 'SILICON · 6-CORE SoC',
    parts: [
      staticPart(.24, function (c) {
        c.lineWidth = 3; c.strokeRect(124, 124, 152, 152);
        c.lineWidth = 1.5; c.strokeRect(116, 116, 168, 168);
        traces.forEach(function (tr) {
          var e = tr[tr.length - 1];
          c.beginPath(); c.arc((e[0] + 1) * 200, (e[1] + 1) * 200, 5, 0, TAU); c.stroke();
        });
      }),
      { w: .34, c: 0, init: function (n) {
          this.j = new Uint8Array(n); this.p = new Float32Array(n * 2);
          for (var k = 0; k < n; k++) {
            this.j[k] = k % 6;
            var edge = rand() < .55, x, y;
            if (edge) { var s = rand() * 4, f = s % 1; x = s < 1 ? f : s < 2 ? 1 : s < 3 ? 1 - f : 0; y = s < 1 ? 0 : s < 2 ? f : s < 3 ? 1 : 1 - f; }
            else { x = rand(); y = Math.floor(rand() * 6) / 5; }
            this.p[k * 2] = (x - .5) * CORE_W; this.p[k * 2 + 1] = (y - .5) * CORE_H;
          }
        },
        at: function (k, t, o) {
          var j = this.j[k], c = coreXY(j), on = j === state.core;
          o.x = c[0] + this.p[k * 2] * (on ? 1.06 : 1); o.y = c[1] + this.p[k * 2 + 1] * (on ? 1.06 : 1);
          o.c = on ? (hash(k + Math.floor(t * 6)) < .2 ? 5 : 2) : (k % 3 ? 1 : 0);
        } },
      { w: .42, c: 3, init: function (n) {
          this.tr = new Uint8Array(n); this.u = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.tr[k] = (rand() * traces.length) | 0; this.u[k] = rand(); }
        },
        at: function (k, t, o) {
          var tr = traces[this.tr[k]], dir = this.tr[k] % 2 ? 1 : -1;
          var u = wrap(this.u[k] + t * .12 * dir, 0, 1);
          alongTrace(tr, u, o);
          o.c = hash(this.tr[k] * 7 + Math.floor(t * 1.5)) < .25 && Math.abs(u - wrap(t * .5 * dir, 0, 1)) < .12 ? 2 : (k % 4 ? 4 : 3);
        } }
    ],
    overlay: function (T, a, t) {
      var c = coreXY(state.core);
      ctx.strokeStyle = ORANGE + (.7 * a) + ')'; ctx.lineWidth = DPR;
      var x0 = T.x(c[0] - CORE_W * .62), y0 = T.y(c[1] - CORE_H * .62);
      ctx.strokeRect(x0, y0, T.s * CORE_W * 1.24, T.s * CORE_H * 1.24);
      var org = dom.roles[state.core] || '';
      callout(T, c[0] + CORE_W * .6, c[1] - CORE_H * .6, 90, -90, 'CORE ' + pad(state.core, 2) + ' · ' + org.toUpperCase(), a, ORANGE);
      label(T.x(-1.05), T.y(1.12), '6 CORES = 6 ROLES · ' + (2.4 + .2 * Math.sin(t)).toFixed(2) + ' GHz · 28 I/O', .6 * a);
      label(T.x(-1.05), T.y(-1.06), 'DIE  ' + 'MSH-SoC r' + pad(2025, 4), .45 * a, CYAN);
    }
  };

  /* ── 05 · ROVER ──────────────────────────────────────────────── */
  var WHEELS = [[110, 304], [205, 304], [300, 304]], WR = 26, GROUND = 332;
  function groundY(wx) { return U(GROUND) + .025 * Math.sin(wx * 3.1) + .012 * Math.sin(wx * 9.7 + 1) + .02 * Math.max(0, Math.sin(wx * 1.3) - .7) * 4; }
  var rover = {
    id: 'rover', name: 'ROVER · SURFACE OPS', oy: -.18, scale: 1.18,
    parts: [
      staticPart(.46, function (c) {
        c.lineWidth = 3;
        c.strokeRect(120, 212, 180, 40);
        c.fillRect(96, 196, 236, 9);
        c.beginPath(); c.moveTo(286, 196); c.lineTo(286, 124); c.stroke();
        c.strokeRect(262, 98, 50, 26);
        c.beginPath(); c.arc(276, 111, 5, 0, TAU); c.arc(298, 111, 5, 0, TAU); c.stroke();
        c.beginPath(); c.ellipse(152, 180, 18, 8, -.4, 0, TAU); c.stroke();
        c.beginPath(); c.moveTo(152, 188); c.lineTo(152, 196); c.stroke();
        c.lineWidth = 2.6;
        c.beginPath(); c.moveTo(300, 238); c.lineTo(342, 268); c.lineTo(356, 246); c.stroke();
        c.beginPath();
        c.moveTo(250, 252); c.lineTo(300, 304); c.moveTo(250, 252); c.lineTo(168, 274);
        c.moveTo(168, 274); c.lineTo(110, 304); c.moveTo(168, 274); c.lineTo(205, 304); c.stroke();
        c.beginPath(); c.arc(250, 252, 6, 0, TAU); c.arc(168, 274, 5, 0, TAU); c.stroke();
        c.lineWidth = 1.4;
        for (var x = 104; x < 328; x += 18) { c.beginPath(); c.moveTo(x, 196); c.lineTo(x, 205); c.stroke(); }
      }),
      { w: .27, c: 0, init: function (n) {
          this.wh = new Uint8Array(n); this.r = new Float32Array(n); this.a = new Float32Array(n);
          for (var k = 0; k < n; k++) {
            this.wh[k] = k % 3;
            var rim = rand() < .68;
            this.r[k] = rim ? (WR + (rand() - .5) * 4) / 200 : (rand() * WR * .9) / 200;
            this.a[k] = rim ? rand() * TAU : Math.floor(rand() * 6) * TAU / 6;
          }
        },
        at: function (k, t, o) {
          var w = WHEELS[this.wh[k]], a = this.a[k] + t * 1.7;
          o.x = U(w[0]) + Math.cos(a) * this.r[k]; o.y = U(w[1]) + Math.sin(a) * this.r[k];
          o.c = this.r[k] > .11 ? 0 : 1;
        } },
      { w: .2, c: 1, init: function (n) {
          this.x = new Float32Array(n); this.d = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.x[k] = (rand() * 2 - 1) * 1.7; this.d[k] = rand() < .85 ? 0 : rand() * .05; }
        },
        at: function (k, t, o) {
          var x = wrap(this.x[k] - t * .28, -1.7, 1.7);
          o.x = x; o.y = groundY(x + t * .28) + this.d[k];
          o.c = this.d[k] ? 4 : 1;
        } },
      { w: .07, c: 2, init: function (n) {
          this.p = new Float32Array(n); this.j = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.p[k] = rand(); this.j[k] = rand() - .5; }
        },
        at: function (k, t, o) {
          var ph = (this.p[k] + t * .7) % 1;
          o.x = U(WHEELS[0][0]) - .08 - ph * .55 + this.j[k] * .1;
          o.y = U(GROUND) - .02 - ph * .22 * (1 - ph) * 2 - this.j[k] * ph * .1;
          o.c = ph < .3 ? 2 : ph < .6 ? 1 : 4;
        } }
    ],
    move: function (t) { return Math.sin(t * 3.2) * .006; },
    overlay: function (T, a, t) {
      callout(T, U(287), U(98), 60, -40, 'MASTCAM-Z', a);
      callout(T, U(250), U(252), 90, 80, 'ROCKER-BOGIE', a, CYAN);
      callout(T, U(110), U(196), -50, -70, 'SOLAR DECK · 140 W', a);
      callout(T, U(356), U(246), 40, 30, 'ROBOTIC ARM', a);
      var odo = 12.48 + t * .0031 + state.sectionP * .8;
      label(T.x(-1.05), T.y(-.98), 'SOL ' + pad(412 + Math.floor(t / 20), 4) + '   ODO ' + odo.toFixed(3) + ' km', .75 * a);
      label(T.x(-1.05), T.y(-.98) + 16 * DPR, 'SURFACE OPS · 3 MISSIONS SHIPPED', .45 * a, ORANGE);
      // wheel diameter dimension line
      var x1 = T.x(U(WHEELS[2][0] - WR)), x2 = T.x(U(WHEELS[2][0] + WR)), y = T.y(U(WHEELS[2][1] + WR + 30));
      ctx.strokeStyle = INK + (.4 * a) + ')'; ctx.lineWidth = DPR;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
      ctx.moveTo(x1, y - 4 * DPR); ctx.lineTo(x1, y + 4 * DPR); ctx.moveTo(x2, y - 4 * DPR); ctx.lineTo(x2, y + 4 * DPR); ctx.stroke();
      label((x1 + x2) / 2, y + 14 * DPR, 'Ø 0.52 m', .55 * a, INK, 10, 'center');
    }
  };

  /* ── 06 · ORBITS ─────────────────────────────────────────────── */
  var ORB = [[.34, .05, .2], [.48, .12, 1.1], [.63, .08, 2.3], [.78, .18, .7], [.95, .1, 1.8]]; // a, e, ω
  function orbitPos(o, M, out) {
    var a = ORB[o][0], e = ORB[o][1], w = ORB[o][2], E = M;
    for (var i = 0; i < 4; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    var x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E);
    var xr = x * Math.cos(w) - y * Math.sin(w), yr = x * Math.sin(w) + y * Math.cos(w);
    out.x = xr; out.y = yr * .56;
  }
  function meanMotion(o) { return .55 / Math.pow(ORB[o][0] / .34, 1.5); }
  var orbits = {
    id: 'orbits', name: 'ORBITAL MECHANICS · 5 BODIES', scale: 1.05,
    parts: [
      { w: .22, c: 0, init: function (n) {
          this.p = new Float32Array(n * 2); this.lit = new Uint8Array(n);
          for (var k = 0; k < n; k++) {
            var r = Math.sqrt(rand()) * .15, a = rand() * TAU, x = Math.cos(a) * r, y = Math.sin(a) * r;
            this.p[k * 2] = x; this.p[k * 2 + 1] = y; this.lit[k] = x - y < -.03 ? 1 : 0;
          }
        },
        at: function (k, t, o) {
          o.x = this.p[k * 2]; o.y = this.p[k * 2 + 1];
          o.c = this.lit[k] ? 0 : 1;
        } },
      { w: .1, c: 2, init: function (n) {
          this.a = new Float32Array(n); this.r = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.a[k] = rand() * TAU; this.r[k] = .2 + rand() * .07; }
        },
        at: function (k, t, o) {
          var a = this.a[k] + t * .15, x = Math.cos(a) * this.r[k], y = Math.sin(a) * this.r[k] * .22;
          o.x = x * .97 - y * .26; o.y = x * .26 + y * .97;
          o.c = Math.sin(a) < 0 && Math.abs(x) < .15 ? 1 : 2;
        } },
      { w: .4, c: 4, init: function (n) {
          this.o = new Uint8Array(n); this.M = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.o[k] = k % 5; this.M[k] = rand() * TAU; }
        },
        at: function (k, t, o) {
          orbitPos(this.o[k], this.M[k] + t * .02, o);
          o.c = this.o[k] === state.orbit ? 3 : 4;
        } },
      { w: .28, c: 0, init: function (n) {
          this.o = new Uint8Array(n); this.lag = new Float32Array(n); this.j = new Float32Array(n * 2);
          for (var k = 0; k < n; k++) {
            this.o[k] = k % 5;
            var trail = rand() < .55;
            this.lag[k] = trail ? rand() * .9 : 0;
            var r = trail ? .006 : Math.sqrt(rand()) * .032, a = rand() * TAU;
            this.j[k * 2] = Math.cos(a) * r; this.j[k * 2 + 1] = Math.sin(a) * r;
          }
        },
        at: function (k, t, o) {
          var ob = this.o[k];
          orbitPos(ob, ob * 1.3 + t * meanMotion(ob) - this.lag[k], o);
          o.x += this.j[k * 2]; o.y += this.j[k * 2 + 1];
          o.c = this.lag[k] ? (this.lag[k] < .25 ? 0 : 1) : (ob === state.orbit ? 5 : 2);
          o.s = this.lag[k] ? 1 : 1.4;
        } }
    ],
    overlay: function (T, a, t) {
      var p = {};
      for (var ob = 0; ob < 5; ob++) {
        orbitPos(ob, ob * 1.3 + t * meanMotion(ob), p);
        var hi = ob === state.orbit, name = (dom.papers[ob] || '').split(' ')[0];
        label(T.x(p.x) + 10 * DPR, T.y(p.y) - 8 * DPR, pad(ob + 1, 2) + ' ' + name.toUpperCase(), (hi ? 1 : .55) * a, hi ? ORANGE : INK, 10);
      }
      label(T.x(-1.05), T.y(-1.0), 'T² = 4π²a³ / GM', .7 * a, CYAN, 12);
      label(T.x(-1.05), T.y(-1.0) + 16 * DPR, '5 PAPERS · 5 KEPLERIAN ORBITS', .45 * a);
    }
  };

  /* ── 07 · DOUBLE HELIX ───────────────────────────────────────── */
  var RUNGS = Math.max(dom.cats.length, 34);
  function helixAt(y, t, strand) { var ph = y * 7 + t * .8 + strand * Math.PI; return { x: Math.sin(ph) * .38, z: Math.cos(ph) }; }
  var helix = {
    id: 'helix', name: 'DOUBLE HELIX · ' + RUNGS + ' BASE PAIRS', scale: 1.05,
    parts: [
      { w: .52, c: 0, init: function (n) {
          this.y = new Float32Array(n); this.st = new Uint8Array(n); this.j = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.y[k] = rand() * 2.1 - 1.05; this.st[k] = k % 2; this.j[k] = (rand() - .5) * .025; }
        },
        at: function (k, t, o) {
          var h = helixAt(this.y[k], t, this.st[k]);
          o.x = h.x + this.j[k]; o.y = this.y[k];
          o.c = this.st[k] ? (h.z > 0 ? 3 : 4) : (h.z > 0 ? 0 : 1);
          o.s = h.z > 0 ? 1.4 : .9;
        } },
      { w: .48, c: 1, init: function (n) {
          this.r = new Uint8Array(n); this.u = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.r[k] = k % RUNGS; this.u[k] = rand(); }
        },
        at: function (k, t, o) {
          var j = this.r[k], y = -1 + (j + .5) * (2 / RUNGS), A = helixAt(y, t, 0), B = helixAt(y, t, 1), u = this.u[k];
          o.x = A.x + (B.x - A.x) * u; o.y = y;
          var hit = state.cat === 'all' || dom.cats[j] === state.cat;
          o.c = hit ? (state.cat === 'all' ? 1 : 2) : 4;
          o.s = hit && state.cat !== 'all' ? 1.3 : 1;
        } }
    ],
    overlay: function (T, a, t) {
      for (var j = 0; j < RUNGS; j += 1) {
        var y = -1 + (j + .5) * (2 / RUNGS), hit = state.cat !== 'all' && dom.cats[j] === state.cat;
        if (!hit && j % 4) continue;
        var A = helixAt(y, t, 0);
        label(T.x(.5), T.y(y) + 3 * DPR, '#' + pad(j + 1, 2) + (hit ? ' ◂' : ''), (hit ? 1 : .3) * a, hit ? ORANGE : INK, 9);
      }
      label(T.x(-1.0), T.y(-1.12), RUNGS + ' REPOS ↔ ' + RUNGS + ' BASE PAIRS', .7 * a);
      label(T.x(-1.0), T.y(-1.12) + 16 * DPR, state.cat === 'all' ? '↳ filter to light up a strand' : 'SEQUENCE · ' + state.cat.toUpperCase(), .45 * a, state.cat === 'all' ? INK : ORANGE);
    }
  };

  /* ── 08 · ATOM ───────────────────────────────────────────────── */
  var ORBIT_TILT = [0, Math.PI / 3, -Math.PI / 3];
  function electronPos(e, t, lag, out) {
    var orb = e % 3, a = t * (1.1 + orb * .25) + (e >= 3 ? Math.PI : 0) - lag;
    var x = Math.cos(a) * .9, y = Math.sin(a) * .28, r = ORBIT_TILT[orb];
    out.x = x * Math.cos(r) - y * Math.sin(r); out.y = x * Math.sin(r) + y * Math.cos(r);
  }
  var atom = {
    id: 'atom', name: 'ATOM · Z = 6 (CARBON)',
    parts: [
      { w: .26, c: 0, init: function (n) {
          this.b = new Uint8Array(n); this.p = new Float32Array(n * 2);
          this.ctr = [];
          for (var i = 0; i < 12; i++) { var a = i * 2.39996, r = .045 * Math.sqrt(i + .5); this.ctr.push([Math.cos(a) * r, Math.sin(a) * r]); }
          for (var k = 0; k < n; k++) {
            this.b[k] = k % 12; var r2 = Math.sqrt(rand()) * .045, an = rand() * TAU;
            this.p[k * 2] = Math.cos(an) * r2; this.p[k * 2 + 1] = Math.sin(an) * r2;
          }
        },
        at: function (k, t, o) {
          var b = this.b[k], c = this.ctr[b], jig = .006 * Math.sin(t * 9 + b);
          o.x = c[0] + this.p[k * 2] + jig; o.y = c[1] + this.p[k * 2 + 1] - jig;
          o.c = b % 2 ? 2 : 0;
        } },
      { w: .44, c: 4, init: function (n) {
          this.o = new Uint8Array(n); this.a = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.o[k] = k % 3; this.a[k] = rand() * TAU; }
        },
        at: function (k, t, o) {
          var a = this.a[k] + t * .05, x = Math.cos(a) * .9, y = Math.sin(a) * .28, r = ORBIT_TILT[this.o[k]];
          o.x = x * Math.cos(r) - y * Math.sin(r); o.y = x * Math.sin(r) + y * Math.cos(r);
          o.c = state.electron >= 0 && state.electron % 3 === this.o[k] ? 3 : 4;
        } },
      { w: .3, c: 3, init: function (n) {
          this.e = new Uint8Array(n); this.lag = new Float32Array(n); this.j = new Float32Array(n * 2);
          for (var k = 0; k < n; k++) {
            this.e[k] = k % 6; var tr = rand() < .5;
            this.lag[k] = tr ? rand() * .8 : 0;
            var r = tr ? .005 : Math.sqrt(rand()) * .03, a = rand() * TAU;
            this.j[k * 2] = Math.cos(a) * r; this.j[k * 2 + 1] = Math.sin(a) * r;
          }
        },
        at: function (k, t, o) {
          electronPos(this.e[k], t, this.lag[k], o);
          o.x += this.j[k * 2]; o.y += this.j[k * 2 + 1];
          var hi = this.e[k] === state.electron;
          o.c = this.lag[k] ? (this.lag[k] < .2 ? 3 : 4) : (hi ? 2 : 5);
          o.s = this.lag[k] ? 1 : 1.5;
        } }
    ],
    overlay: function (T, a, t) {
      var p = {};
      for (var e = 0; e < 6; e++) {
        electronPos(e, t, 0, p);
        var hi = e === state.electron;
        label(T.x(p.x) + 9 * DPR, T.y(p.y) - 7 * DPR, 'e⁻ ' + (dom.tools[e] || '').toUpperCase(), (hi ? 1 : .5) * a, hi ? ORANGE : INK, 9);
      }
      callout(T, .08, .02, 90, 110, 'NUCLEUS · 6p⁺ 6n⁰', a, ORANGE);
      label(T.x(-1.05), T.y(-1.0), '¹²C · 1s² 2s² 2p²', .7 * a, CYAN, 12);
      label(T.x(-1.05), T.y(-1.0) + 16 * DPR, '6 TOOLKITS · 6 ELECTRONS', .45 * a);
    }
  };

  /* ── 09 · STANDING WAVES (a bass, four strings) ──────────────── */
  var STRINGS = [-.5, -.18, .14, .46], NOTE = ['E₁ 41.2 Hz', 'A₁ 55.0 Hz', 'D₂ 73.4 Hz', 'G₂ 98.0 Hz'];
  function stringY(s, x, t) {
    var u = (x + 1) / 2, base = .028 + state.pluck[s] * .1;
    return base * (Math.sin(Math.PI * u) * Math.cos(t * (3 + s * 1.1)) + .5 * Math.sin(2 * Math.PI * u) * Math.cos(t * (6 + s * 2.2) + s)
      + .25 * Math.sin(3 * Math.PI * u) * Math.cos(t * (9.1 + s)));
  }
  var wave = {
    id: 'wave', name: 'STANDING WAVES · 4 STRINGS',
    parts: [
      { w: .58, c: 0, init: function (n) {
          this.str = new Uint8Array(n); this.x = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.str[k] = k % 4; this.x[k] = rand() * 2 - 1; }
        },
        at: function (k, t, o) {
          var s = this.str[k], x = this.x[k];
          o.x = x; o.y = STRINGS[s] + stringY(s, x, t);
          o.c = state.pluck[s] > .2 ? 2 : (k % 6 ? 0 : 3);
        } },
      { w: .3, c: 4, init: function (n) {
          this.b = new Uint8Array(n); this.h = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.b[k] = k % 28; this.h[k] = rand(); }
        },
        at: function (k, t, o) {
          var b = this.b[k], e = .2 + .8 * Math.abs(Math.sin(t * (1.3 + b * .21) + b * 1.7)) * Math.exp(-b / 22);
          e += state.pluck[b % 4] * .6 * Math.exp(-Math.abs(b - (b % 4) * 7 - 3) / 3);
          o.x = -1 + (b + .5) * (2 / 28) + (hash(k) - .5) * .03; o.y = 1.02 - this.h[k] * e * .38;
          o.c = this.h[k] * e > .55 ? 2 : this.h[k] > .5 ? 3 : 4;
        } },
      staticPart(.12, function (c) {
        c.lineWidth = 3;
        c.beginPath(); c.moveTo(4, 70); c.lineTo(4, 320); c.moveTo(396, 70); c.lineTo(396, 320); c.stroke();
        c.lineWidth = 1.2;
        [60, 113, 163, 210, 254, 296, 336].forEach(function (x) { c.beginPath(); c.moveTo(x, 80); c.lineTo(x, 310); c.stroke(); });
      }, { c: 1 })
    ],
    overlay: function (T, a, t) {
      for (var s = 0; s < 4; s++) label(T.x(-1.06), T.y(STRINGS[s]) + 4 * DPR, NOTE[s], (state.pluck[s] > .2 ? 1 : .55) * a, state.pluck[s] > .2 ? ORANGE : INK, 10, 'right');
      label(T.x(-1.0), T.y(-.95), 'f = (n / 2L) · √(T / μ)', .7 * a, CYAN, 12);
      label(T.x(-1.0), T.y(-.95) + 16 * DPR, '↳ sweep the cursor across a string to pluck it', .45 * a);
      label(T.x(-1.0), T.y(1.16), 'FFT · 28 BINS', .45 * a);
    }
  };

  /* ── 10 · ROCKET ─────────────────────────────────────────────── */
  var rocket = {
    id: 'rocket', name: 'LAUNCH VEHICLE · MSH-1', scale: 1.05,
    parts: [
      staticPart(.5, function (c) {
        c.lineWidth = 3;
        c.beginPath(); c.moveTo(200, 38); c.bezierCurveTo(236, 70, 240, 100, 236, 128); c.lineTo(236, 286); c.lineTo(164, 286);
        c.lineTo(164, 128); c.bezierCurveTo(160, 100, 164, 70, 200, 38); c.stroke();
        c.beginPath(); c.arc(200, 168, 15, 0, TAU); c.stroke();
        c.beginPath(); c.arc(200, 168, 8, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(164, 236); c.lineTo(124, 306); c.lineTo(164, 290);
        c.moveTo(236, 236); c.lineTo(276, 306); c.lineTo(236, 290); c.stroke();
        c.beginPath(); c.moveTo(184, 286); c.lineTo(176, 312); c.lineTo(224, 312); c.lineTo(216, 286); c.stroke();
        c.lineWidth = 1.4;
        [128, 210, 252].forEach(function (y) { c.beginPath(); c.moveTo(165, y); c.lineTo(235, y); c.stroke(); });
        c.beginPath(); c.moveTo(200, 210); c.lineTo(200, 286); c.stroke();
      }),
      { w: .36, c: 2, init: function (n) {
          this.p = new Float32Array(n); this.j = new Float32Array(n);
          for (var k = 0; k < n; k++) { this.p[k] = rand(); this.j[k] = rand() * 2 - 1; }
        },
        at: function (k, t, o) {
          var thrust = .6 + state.sectionP * .9, ph = (this.p[k] + t * 1.6) % 1, spread = .03 + ph * .22 * thrust;
          o.x = this.j[k] * spread + Math.sin(t * 20 + k) * .004; o.y = U(316) + ph * .9 * thrust;
          o.c = ph < .12 ? 5 : ph < .45 ? 2 : ph < .75 ? 0 : 1;
          o.s = ph < .3 ? 1.6 : 1;
        } },
      { w: .14, c: 1, init: function (n) {
          this.p = new Float32Array(n * 2);
          for (var k = 0; k < n; k++) { this.p[k * 2] = (rand() - .5) * 2.8; this.p[k * 2 + 1] = rand() * 2.6 - 1.3; }
        },
        at: function (k, t, o) {
          o.x = this.p[k * 2];
          o.y = wrap(this.p[k * 2 + 1] + t * (.12 + state.sectionP * .5), -1.3, 1.3);
          o.c = k % 9 ? 1 : 3;
        } }
    ],
    move: function (t) { return -state.sectionP * .28 + Math.sin(t * 30) * .002 * (1 + state.sectionP * 3); },
    overlay: function (T, a, t) {
      var p = state.sectionP, sec = Math.max(0, 10 - Math.floor(p * 12));
      var alt = Math.floor(Math.pow(p, 2) * 42000);
      label(T.x(-1.05), T.y(-1.02), sec > 0 ? 'T-00:00:' + pad(sec, 2) : 'LIFT-OFF', .85 * a, sec > 0 ? INK : ORANGE, 13);
      label(T.x(-1.05), T.y(-1.02) + 18 * DPR, 'ALT ' + alt.toLocaleString() + ' m   v ' + Math.floor(p * p * 1900) + ' m/s', .6 * a);
      callout(T, U(200), U(168), 110, -60, 'PAYLOAD · YOUR IDEA', a, ORANGE);
      callout(T, U(276), U(306), 60, 50, 'FIN · CF-ALU', a);
    }
  };

  var SCENES = [galaxy, brain, net, chip, rover, orbits, helix, atom, wave, rocket];
  var scenesById = {};
  SCENES.forEach(function (s, i) { s.index = i; scenesById[s.id] = s; });

  /* ═══════════════════════ PARTICLES & BINDING ═══════════════════════ */
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var small = window.innerWidth < 760;
  var N = small ? 1100 : 2000;

  var size, stagger, curl, wob, wobP, offX, offY, px, py, pc, ps;

  // sampling every shape costs a moment, so it waits for the first switch
  function setup() {
  size = new Float32Array(N); stagger = new Float32Array(N); curl = new Float32Array(N);
  wob = new Float32Array(N); wobP = new Float32Array(N);
  offX = new Float32Array(N); offY = new Float32Array(N);
  px = new Float32Array(N); py = new Float32Array(N); pc = new Uint8Array(N); ps = new Float32Array(N);
  for (var i = 0; i < N; i++) {
    size[i] = rand() < .7 ? 1.4 : rand() < .7 ? 2 : 2.6;
    stagger[i] = rand() * .45;
    curl[i] = (rand() - .5) * 1.4;
    wob[i] = .6 + rand() * 1.4; wobP[i] = rand() * TAU;
  }

  // each scene gets its own shuffled assignment of particles to parts
  SCENES.forEach(function (sc) {
    var total = sc.parts.reduce(function (s, p) { return s + p.w; }, 0), counts = [], used = 0;
    sc.parts.forEach(function (p, j) {
      var c = j === sc.parts.length - 1 ? N - used : Math.round(N * p.w / total);
      counts.push(c); used += c; p.init(c);
    });
    var perm = new Uint16Array(N); for (var q = 0; q < N; q++) perm[q] = q;
    for (q = N - 1; q > 0; q--) { var r = (rand() * (q + 1)) | 0, tmp = perm[q]; perm[q] = perm[r]; perm[r] = tmp; }
    sc.part = new Uint8Array(N); sc.local = new Uint16Array(N);
    var at = 0;
    counts.forEach(function (c, j) { for (var m = 0; m < c; m++) { sc.part[perm[at]] = j; sc.local[perm[at]] = m; at++; } });
  });
  }

  /* ═══════════════════════ LAYOUT & SCROLL MAP ═══════════════════════ */
  var W = 0, H = 0, sections = [], centers = [];
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    measure();
  }
  function measure() {
    sections = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
    var y = window.scrollY || window.pageYOffset, max = document.documentElement.scrollHeight - H;
    centers = sections.map(function (el) { var r = el.getBoundingClientRect(); return { top: r.top + y, h: r.height, c: r.top + y + Math.min(r.height, H * 1.2) / 2, sc: scenesById[el.getAttribute('data-scene')] }; });
    if (centers.length) {
      centers[0].c = Math.max(centers[0].c, H / 2);
      var last = centers[centers.length - 1];
      last.c = Math.min(last.c, max + H / 2 - 40);
    }
  }
  function frame() { // the stage: where a unit shape lands on screen
    var wide = W >= 1000, shellW = Math.min(W, 1240), left = (W - shellW) / 2;
    return wide
      ? { cx: left + shellW * .79, cy: H * .53, S: Math.min(shellW * .19, H * .33) }
      : { cx: W * .5, cy: H * .5, S: Math.min(W * .4, H * .3) };
  }

  /* ═══════════════════════ INTERACTION ═══════════════════════ */
  var mx = -1e4, my = -1e4, waves = [];
  window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', function () { mx = my = -1e4; });
  window.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a,button,input,textarea,label,select')) return;
    waves.push({ x: e.clientX, y: e.clientY, t0: now });
    if (waves.length > 4) waves.shift();
  }, { passive: true });

  function hook(sel, fn, ev) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el, i) {
      el.addEventListener(ev || 'pointerenter', function () { fn(i, el); });
    });
  }
  hook('.expertise .column', function (i) { state.fire = i; state.fireT = now; });
  hook('.paper', function (i) { state.orbit = i; });
  hook('.facts--wide > div', function (i) { state.electron = i; });
  hook('.filter', function (i, el) { state.cat = el.getAttribute('data-filter'); }, 'click');
  if ('IntersectionObserver' in window) {
    var roleIO = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) state.core = Array.prototype.indexOf.call(document.querySelectorAll('.role'), e.target); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('.role'), function (r) { roleIO.observe(r); });
  }

  /* ═══════════════════════ HUD ═══════════════════════ */
  var hud = {};
  function findHud() {
    hud = {
      scene: document.getElementById('hudScene'), stat: document.getElementById('hudStat'),
      scroll: document.getElementById('hudScroll'), clock: document.getElementById('hudClock'),
      bar: document.getElementById('progress')
    };
  }
  var fps = 60, lastHud = 0;
  function updateHud(sceneIdx, scrollFrac) {
    if (hud.bar) hud.bar.style.transform = 'scaleX(' + scrollFrac.toFixed(4) + ')';
    if (now - lastHud < .25) return; lastHud = now;
    var sc = SCENES[sceneIdx];
    if (hud.scene) hud.scene.textContent = 'SCN ' + pad(sceneIdx + 1, 2) + '/' + SCENES.length + '  ' + sc.name;
    if (hud.stat) hud.stat.textContent = N.toLocaleString() + ' PARTICLES · ' + Math.round(fps) + ' FPS';
    if (hud.scroll) hud.scroll.textContent = 'SCROLL ' + pad(Math.round(scrollFrac * 100), 3) + '%';
    if (hud.clock) {
      try { hud.clock.textContent = 'ISB ' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour12: false }); }
      catch (e) { hud.clock.textContent = ''; }
    }
  }

  /* ═══════════════════════ RENDER LOOP ═══════════════════════ */
  var now = 0, last = performance.now(), running = true, o = { x: 0, y: 0, c: 0, s: 1 };
  var buckets = PAL.map(function () { return []; });

  function scenePos(sc, i, t, F, out) {
    var p = sc.parts[sc.part[i]];
    out.c = p.c; out.s = 1;
    p.at(sc.local[i], t, out);
    var sS = F.S * (sc.scale || 1), lift = sc.move ? sc.move(t) : 0;
    out.x = F.cx + (out.x + (sc.ox || 0)) * sS;
    out.y = F.cy + (out.y + (sc.oy || 0) + lift) * sS;
    out.s *= p.s || 1;
  }

  function draw(ts) {
    var dt = Math.min(.05, (ts - last) / 1000); last = ts;
    if (!reduced) now += dt;
    fps += ((dt > 0 ? 1 / dt : 60) - fps) * .05;
    var t = reduced ? 14 : now;

    var y = window.scrollY || window.pageYOffset, vc = y + H / 2;
    var max = Math.max(1, document.documentElement.scrollHeight - H);
    if (!centers.length) return;

    // where we are between two scenes, and how far the throw has got
    var k = 0;
    while (k < centers.length - 1 && vc >= centers[k + 1].c) k++;
    var A = centers[k], B = centers[Math.min(k + 1, centers.length - 1)];
    var p = B === A ? 0 : clamp((vc - A.c) / (B.c - A.c), 0, 1);
    var u = smooth(.32, .78, p);
    var cur = u < .5 ? A : B;
    state.sectionP = clamp((y + H - cur.top) / (cur.h + H * .2), 0, 1);
    if (cur.sc.id === 'rocket') state.sectionP = clamp((vc - (cur.top + H * .1)) / Math.max(1, (max + H / 2) - (cur.top + H * .1)), 0, 1);

    // plucking: the cursor crossing a string while the wave scene shows
    var F = frame();
    for (var s = 0; s < 4; s++) {
      state.pluck[s] *= .965;
      if (cur.sc.id === 'wave' && mx > F.cx - F.S && mx < F.cx + F.S && Math.abs(my - (F.cy + STRINGS[s] * F.S)) < 10) state.pluck[s] = 1;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var b = 0; b < buckets.length; b++) buckets[b].length = 0;

    var mxd = mx * DPR, myd = my * DPR, R = 110 * DPR, R2 = R * R;
    var sa = A.sc, sb = B.sc, bx, by, bc, bs;
    for (var i = 0; i < N; i++) {
      scenePos(sa, i, t, F, o);
      var ax = o.x, ay = o.y, ac = o.c, as = o.s;
      var ui = clamp((u - stagger[i]) / .55, 0, 1);
      if (ui > 0 && sb !== sa) {
        scenePos(sb, i, t, F, o);
        bx = o.x; by = o.y; bc = o.c; bs = o.s;
        var e = ease(ui), dx = bx - ax, dy = by - ay, arc = Math.sin(Math.PI * e) * curl[i] * .35;
        ax = ax + dx * e - dy * arc; ay = ay + dy * e + dx * arc;
        if (e > .5) { ac = bc; as = bs; }
      }
      if (!reduced) {
        ax += Math.sin(t * wob[i] + wobP[i]) * 1.6;
        ay += Math.cos(t * wob[i] * .8 + wobP[i]) * 1.6;
      }
      var X = ax * DPR, Y = ay * DPR;

      // cursor: a soft lens that pushes the field aside
      var tx = 0, ty = 0;
      if (!reduced) {
        var ddx = X - mxd, ddy = Y - myd, d2 = ddx * ddx + ddy * ddy;
        if (d2 < R2 && d2 > 1) { var d = Math.sqrt(d2), f = (1 - d / R); f = f * f * 34 * DPR; tx = ddx / d * f; ty = ddy / d * f; }
        for (var w = 0; w < waves.length; w++) {
          var wv = waves[w], age = now - wv.t0, rad = age * 900 * DPR;
          var wx = X - wv.x * DPR, wy = Y - wv.y * DPR, wd = Math.sqrt(wx * wx + wy * wy) || 1, band = 1 - Math.abs(wd - rad) / (60 * DPR);
          if (band > 0) { var amp = band * 26 * DPR * Math.max(0, 1 - age / 1.4); tx += wx / wd * amp; ty += wy / wd * amp; }
        }
      }
      offX[i] += (tx - offX[i]) * .14; offY[i] += (ty - offY[i]) * .14;
      X += offX[i]; Y += offY[i];

      if (X < -10 || Y < -10 || X > canvas.width + 10 || Y > canvas.height + 10) continue;
      px[i] = X; py[i] = Y; pc[i] = ac; ps[i] = size[i] * as * DPR;
      buckets[ac].push(i);
    }
    waves = waves.filter(function (wv) { return now - wv.t0 < 1.4; });

    for (b = 0; b < buckets.length; b++) {
      var list = buckets[b]; if (!list.length) continue;
      ctx.fillStyle = PAL[b];
      for (var m = 0; m < list.length; m++) {
        var q = list[m], z = ps[q];
        ctx.fillRect(px[q] - z / 2, py[q] - z / 2, z, z);
      }
    }

    // overlays: callouts belong to a settled scene, so they fade out early in a throw
    var T = { s: F.S * DPR, x: null, y: null };
    function overlayFor(sc, alpha) {
      // callouts need the clear right-hand lane; on narrow screens the field is wallpaper
      if (alpha <= .01 || !sc.overlay || W < 1000) return;
      var sS = F.S * (sc.scale || 1), lift = sc.move ? sc.move(t) : 0;
      T.s = sS * DPR;
      T.x = function (ux) { return (F.cx + (ux + (sc.ox || 0)) * sS) * DPR; };
      T.y = function (uy) { return (F.cy + (uy + (sc.oy || 0) + lift) * sS) * DPR; };
      ctx.save(); sc.overlay(T, alpha, t); ctx.restore();
    }
    overlayFor(sa, 1 - smooth(0, .3, u));
    if (sb !== sa) overlayFor(sb, smooth(.7, 1, u));

    updateHud(u < .5 ? sa.index : sb.index, y / max);
  }

  /* ═══════════════════════ START / STOP ═══════════════════════ */
  var raf = 0, ticker = 0, ready = false, active = false;
  function loop(ts) {
    if (running) draw(ts);
    raf = requestAnimationFrame(loop);
  }
  function onVis() { running = !document.hidden; last = performance.now(); }

  window.Field = {
    start: function () {
      if (active) return;
      canvas = document.getElementById('field');
      if (!canvas || !canvas.getContext) return;
      ctx = canvas.getContext('2d');
      if (!ready) { setup(); ready = true; }
      findHud();
      active = true; running = !document.hidden; last = performance.now();
      resize();
      window.addEventListener('resize', resize);
      document.addEventListener('visibilitychange', onVis);
      // content above can reflow (fonts, filters, pagination); re-measure now and then
      ticker = setInterval(measure, 1500);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
      raf = requestAnimationFrame(loop);
    },
    stop: function () {
      if (!active) return;
      active = false;
      cancelAnimationFrame(raf); clearInterval(ticker);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    },
    measure: measure
  };
})();
