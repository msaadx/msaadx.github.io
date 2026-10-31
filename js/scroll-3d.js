/* =====================================================================
   SHOWCASE — scroll-driven particle morph  ("the Iron Man scroll")
   One point cloud smoothly morphs through five formations as you scroll:
     01 Neural network  →  02 Brain  →  03 Atom  →  04 Machine  →  05 Orbit
   Pinned section · damped scroll-linked motion · drag to spin · Three.js.
   Works on file://, offline and deployed (vendored classic build).
   ===================================================================== */
(function () {
  'use strict';

  var THREE = window.THREE;
  var section = document.getElementById('showcase');
  var canvas = document.getElementById('showcaseCanvas');
  if (!THREE || !section || !canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sticky  = section.querySelector('.showcase__sticky');
  var caps    = [].slice.call(document.querySelectorAll('#showcaseCaptions .sc-cap'));
  var dots    = [].slice.call(document.querySelectorAll('#showcaseDots button'));
  var lblEl   = document.getElementById('scLabel');
  var cntEl   = document.getElementById('scCount');

  var small = window.innerWidth < 820;
  var N = small ? 12000 : 24000;
  if (cntEl) cntEl.textContent = (N / 1000).toFixed(0) + ' 000';

  var LABELS = ['NEURAL_NETWORK', 'HUMAN_BRAIN', 'ATOMIC_ORBITALS', 'MACHINE_MIND', 'LOW_EARTH_ORBIT'];
  var TINTS  = ['#5ce1ff', '#9c7bff', '#ff6fb8', '#7cf2c4', '#bcd8ff'].map(function (h) { return new THREE.Color(h); });

  /* ---------- helpers ---------- */
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* fills `arr` from a {verts, edges} wireframe model: some points cluster on
     the vertices (bright nodes), the rest string along the edges (glow lines) */
  function fillFromModel(arr, model, nodeRatio, nodeJit, edgeJit) {
    var V = model.verts, E = model.edges;
    for (var k = 0; k < N; k++) {
      if (Math.random() < nodeRatio) {
        var v = V[(Math.random() * V.length) | 0];
        arr[k * 3]     = v[0] + gauss() * nodeJit;
        arr[k * 3 + 1] = v[1] + gauss() * nodeJit;
        arr[k * 3 + 2] = v[2] + gauss() * nodeJit;
      } else {
        var e = E[(Math.random() * E.length) | 0];
        var a = V[e[0]], b = V[e[1]], t = Math.random();
        arr[k * 3]     = a[0] + (b[0] - a[0]) * t + gauss() * edgeJit;
        arr[k * 3 + 1] = a[1] + (b[1] - a[1]) * t + gauss() * edgeJit;
        arr[k * 3 + 2] = a[2] + (b[2] - a[2]) * t + gauss() * edgeJit;
      }
    }
  }
  function modelLines(model) {
    var V = model.verts, E = model.edges;
    var seg = new Float32Array(E.length * 6);
    for (var i = 0; i < E.length; i++) {
      var a = V[E[i][0]], b = V[E[i][1]];
      seg[i * 6] = a[0]; seg[i * 6 + 1] = a[1]; seg[i * 6 + 2] = a[2];
      seg[i * 6 + 3] = b[0]; seg[i * 6 + 4] = b[1]; seg[i * 6 + 5] = b[2];
    }
    return seg;
  }

  /* ═══ 01 · DEEP NEURAL NETWORK — layers of neurons, densely wired ═══ */
  function genNeuralNet(arr) {
    var layers = [5, 8, 11, 13, 13, 11, 8, 5], L = layers.length;
    var width = 11.5, height = 5.2, depth = 1.7;
    var nodes = [], start = [], s = 0;
    for (var li = 0; li < L; li++) {
      start.push(s); s += layers[li];
      var x = (li / (L - 1) - 0.5) * width, c = layers[li];
      for (var i = 0; i < c; i++) {
        var y = (c > 1 ? (i / (c - 1) - 0.5) : 0) * height;
        nodes.push([x, y, (Math.random() - 0.5) * depth]);
      }
    }
    var edges = [];
    for (var l2 = 0; l2 < L - 1; l2++)
      for (var a = 0; a < layers[l2]; a++)
        for (var b = 0; b < layers[l2 + 1]; b++)
          edges.push([start[l2] + a, start[l2 + 1] + b]);
    fillFromModel(arr, { verts: nodes, edges: edges }, 0.4, 0.13, 0.04);
  }

  /* ═══ 02 · THE BRAIN — low-poly wireframe: cerebrum, cerebellum, stem ═══ */
  function buildBrain() {
    var verts = [], edges = [];
    function addV(x, y, z) { verts.push([x, y, z]); return verts.length - 1; }
    function jit(i, j) { return (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1; }

    var RI = 8, RJ = 13, grid = [];
    for (var i = 0; i <= RI; i++) {
      var row = [], phi = (0.07 + 0.86 * (i / RI)) * Math.PI;
      for (var j = 0; j < RJ; j++) {
        var th = (j / RJ) * Math.PI * 2;
        var nx = Math.sin(phi) * Math.cos(th), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(th);
        var wob = 1 + 0.05 * Math.sin(3 * th) * Math.sin(2 * phi) + (jit(i, j) - 0.5) * 0.07;
        var x = 2.5 * wob * nx, y = 2.2 * wob * ny, z = 3.1 * wob * nz;
        if (nz > 0) z += 0.42 * nz * nz; else x *= 1 - 0.14 * nz * nz;
        var mid = Math.exp(-(x * x) / 0.05);
        if (ny > 0) y -= mid * 0.72 * ny;
        x += (x >= 0 ? 1 : -1) * mid * 0.18;
        if (y < 0) y *= 0.8;
        row.push(addV(x, y + 0.5, z));
      }
      grid.push(row);
    }
    for (var i2 = 0; i2 <= RI; i2++) for (var j2 = 0; j2 < RJ; j2++) {
      var a = grid[i2][j2];
      edges.push([a, grid[i2][(j2 + 1) % RJ]]);
      if (i2 < RI) { edges.push([a, grid[i2 + 1][j2]]); edges.push([a, grid[i2 + 1][(j2 + 1) % RJ]]); }
    }

    var CI = 5, CJ = 11, cg = [];
    for (var i3 = 0; i3 <= CI; i3++) {
      var r2 = [], p2 = (0.1 + 0.8 * (i3 / CI)) * Math.PI;
      for (var j3 = 0; j3 < CJ; j3++) {
        var t3 = (j3 / CJ) * Math.PI * 2;
        r2.push(addV(1.45 * Math.sin(p2) * Math.cos(t3), 1.05 * Math.cos(p2) - 1.75,
                     1.2 * Math.sin(p2) * Math.sin(t3) - 2.75));
      }
      cg.push(r2);
    }
    for (var i4 = 0; i4 <= CI; i4++) for (var j4 = 0; j4 < CJ; j4++) {
      var b2 = cg[i4][j4];
      edges.push([b2, cg[i4][(j4 + 1) % CJ]]);
      if (i4 < CI) edges.push([b2, cg[i4 + 1][j4]]);
    }

    var prev = addV(0, -1.9, -1.5);
    for (var s2 = 1; s2 <= 5; s2++) {
      var t4 = s2 / 5, v2 = addV(0, -1.9 - t4 * 2.7, -1.5 + t4 * 1.5);
      edges.push([prev, v2]); prev = v2;
    }
    return { verts: verts, edges: edges };
  }

  /* ═══ 03 · THE ATOM — nucleus + three tilted electron orbitals ═══ */
  var ATOM_ORBITS = [
    { r: 5.0, rx: Math.PI / 2.1,  ry: 0.0 },
    { r: 5.0, rx: Math.PI / 2.1,  ry: Math.PI / 3 },
    { r: 5.0, rx: Math.PI / 2.1,  ry: -Math.PI / 3 }
  ];
  function rot(p, rx, ry) {
    var y1 = p[1] * Math.cos(rx) - p[2] * Math.sin(rx);
    var z1 = p[1] * Math.sin(rx) + p[2] * Math.cos(rx);
    var x2 = p[0] * Math.cos(ry) + z1 * Math.sin(ry);
    var z2 = -p[0] * Math.sin(ry) + z1 * Math.cos(ry);
    return [x2, y1, z2];
  }
  function genAtom(arr) {
    // three electrons parked on their rings, so they read as particles
    var electrons = ATOM_ORBITS.map(function (o, i) {
      var a = i * 2.1;
      return rot([Math.cos(a) * o.r, Math.sin(a) * o.r, 0], o.rx, o.ry);
    });
    for (var k = 0; k < N; k++) {
      var r = Math.random(), x, y, z;
      if (r < 0.2) {                                  // nucleus — clustered nucleons
        x = gauss() * 0.55; y = gauss() * 0.55; z = gauss() * 0.55;
      } else if (r < 0.9) {                           // orbital rings
        var o = ATOM_ORBITS[(Math.random() * 3) | 0];
        var a2 = Math.random() * Math.PI * 2;
        var rr = o.r + gauss() * 0.11;
        var p = rot([Math.cos(a2) * rr, Math.sin(a2) * rr, gauss() * 0.11], o.rx, o.ry);
        x = p[0]; y = p[1]; z = p[2];
      } else {                                        // the electrons themselves
        var e = electrons[(Math.random() * 3) | 0];
        x = e[0] + gauss() * 0.3; y = e[1] + gauss() * 0.3; z = e[2] + gauss() * 0.3;
      }
      arr[k * 3] = x; arr[k * 3 + 1] = y; arr[k * 3 + 2] = z;
    }
  }
  function buildAtomLines() {
    var verts = [], edges = [];
    ATOM_ORBITS.forEach(function (o) {
      var SEG = 96, first = verts.length;
      for (var i = 0; i < SEG; i++) {
        var a = (i / SEG) * Math.PI * 2;
        verts.push(rot([Math.cos(a) * o.r, Math.sin(a) * o.r, 0], o.rx, o.ry));
        edges.push([first + i, first + ((i + 1) % SEG)]);
      }
    });
    return { verts: verts, edges: edges };
  }

  /* ═══ 04 · THE MACHINE — a low-poly robot head ═══ */
  function buildRobot() {
    var verts = [], edges = [];
    function addV(x, y, z) { verts.push([x, y, z]); return verts.length - 1; }
    function E(a, b) { edges.push([a, b]); }
    function ring(pts) { for (var i = 0; i < pts.length; i++) E(pts[i], pts[(i + 1) % pts.length]); }
    function bridge(A, B) { for (var i = 0; i < A.length; i++) E(A[i], B[i]); }

    // ---- cranium: stacked rounded-square rings (superellipse) ----
    var RJ = 14, levels = [
      { y:  3.30, sx: 0.62, sz: 0.55 },
      { y:  2.70, sx: 1.35, sz: 1.15 },
      { y:  1.85, sx: 1.85, sz: 1.55 },
      { y:  0.85, sx: 2.00, sz: 1.70 },
      { y: -0.15, sx: 1.95, sz: 1.68 },
      { y: -1.05, sx: 1.70, sz: 1.48 },
      { y: -1.75, sx: 1.25, sz: 1.12 }
    ];
    var rings = levels.map(function (L) {
      var r = [];
      for (var j = 0; j < RJ; j++) {
        var a = (j / RJ) * Math.PI * 2;
        var ca = Math.cos(a), sa = Math.sin(a);
        // superellipse → boxy, machined silhouette
        var px = Math.sign(ca) * Math.pow(Math.abs(ca), 0.62) * L.sx;
        var pz = Math.sign(sa) * Math.pow(Math.abs(sa), 0.62) * L.sz;
        if (pz > 0) pz *= 0.86;                      // flat faceplate at the front
        r.push(addV(px, L.y, pz));
      }
      ring(r); return r;
    });
    for (var i = 0; i < rings.length - 1; i++) bridge(rings[i], rings[i + 1]);

    // ---- visor: a glowing horizontal slot across the face ----
    var vy1 = 1.28, vy2 = 0.52, vz = 1.52, top = [], bot = [];
    for (var v = 0; v <= 10; v++) {
      var x = -1.62 + (v / 10) * 3.24;
      var bulge = vz * (1 - 0.16 * Math.pow(x / 1.62, 2));
      top.push(addV(x, vy1, bulge));
      bot.push(addV(x, vy2, bulge));
    }
    for (var v2 = 0; v2 < top.length - 1; v2++) { E(top[v2], top[v2 + 1]); E(bot[v2], bot[v2 + 1]); }
    E(top[0], bot[0]); E(top[top.length - 1], bot[bot.length - 1]);
    for (var v3 = 0; v3 < top.length; v3 += 2) E(top[v3], bot[v3]);

    // ---- jaw / mouth grille ----
    var jy = -0.55, jz = 1.42, g1 = [], g2 = [];
    for (var g = 0; g <= 6; g++) {
      var gx = -1.05 + (g / 6) * 2.1;
      g1.push(addV(gx, jy, jz)); g2.push(addV(gx, jy - 0.55, jz * 0.94));
    }
    for (var g3 = 0; g3 < g1.length - 1; g3++) { E(g1[g3], g1[g3 + 1]); E(g2[g3], g2[g3 + 1]); }
    for (var g4 = 0; g4 < g1.length; g4++) E(g1[g4], g2[g4]);

    // ---- antennae ----
    [-1, 1].forEach(function (s) {
      var base = addV(s * 1.5, 2.35, 0);
      var mid  = addV(s * 2.15, 3.35, 0);
      var tip  = addV(s * 2.35, 4.15, 0);
      E(base, mid); E(mid, tip);
    });

    // ---- neck + shoulders ----
    var nA = [], nB = [];
    for (var n = 0; n < 8; n++) {
      var an = (n / 8) * Math.PI * 2;
      nA.push(addV(Math.cos(an) * 0.85, -2.2, Math.sin(an) * 0.75));
      nB.push(addV(Math.cos(an) * 0.95, -3.2, Math.sin(an) * 0.85));
    }
    ring(nA); ring(nB); bridge(nA, nB);

    var sh = [
      addV(-4.3, -4.3, 0.3), addV(-2.1, -3.5, 0.6), addV(2.1, -3.5, 0.6), addV(4.3, -4.3, 0.3),
      addV(-4.1, -5.3, -0.2), addV(-2.0, -4.6, 0.1), addV(2.0, -4.6, 0.1), addV(4.1, -5.3, -0.2)
    ];
    E(sh[0], sh[1]); E(sh[1], sh[2]); E(sh[2], sh[3]);
    E(sh[4], sh[5]); E(sh[5], sh[6]); E(sh[6], sh[7]);
    for (var s4 = 0; s4 < 4; s4++) E(sh[s4], sh[s4 + 4]);
    E(nB[6], sh[1]); E(nB[2], sh[2]);

    return { verts: verts, edges: edges };
  }

  /* ═══ 05 · LOW EARTH ORBIT — the ISS ═══ */
  function genISS(arr) {
    for (var k = 0; k < N; k++) {
      var r = Math.random(), x, y, z, ang, rad;
      if (r < 0.15) {
        x = (Math.random() - 0.5) * 12; y = (Math.random() - 0.5) * 0.45; z = (Math.random() - 0.5) * 0.45;
      } else if (r < 0.29) {
        ang = Math.random() * Math.PI * 2; rad = 0.58;
        z = (Math.random() - 0.5) * 5.4; x = Math.cos(ang) * rad; y = Math.sin(ang) * rad;
      } else if (r < 0.39) {
        ang = Math.random() * Math.PI * 2; rad = 0.42;
        x = (Math.random() - 0.5) * 3.3; y = Math.sin(ang) * rad;
        z = Math.cos(ang) * rad + (Math.random() < 0.5 ? 1.35 : -1.35);
      } else if (r < 0.88) {
        x = (Math.random() < 0.5 ? -1 : 1) * (3.4 + Math.random() * 2.8);
        z = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2.7);
        y = (Math.random() - 0.5) * 0.1;
        z = Math.round(z * 6) / 6 + (Math.random() - 0.5) * 0.05;
      } else {
        x = (Math.random() - 0.5) * 2.5;
        y = (Math.random() < 0.5 ? -1 : 1) * (1.1 + Math.random() * 1.8);
        z = (Math.random() - 0.5) * 0.1;
      }
      arr[k * 3] = x; arr[k * 3 + 1] = y; arr[k * 3 + 2] = z;
    }
  }

  /* ---------- build every formation once ---------- */
  var brainModel = buildBrain();
  var atomModel  = buildAtomLines();
  var robotModel = buildRobot();

  var forms = [];
  for (var f = 0; f < 5; f++) forms.push(new Float32Array(N * 3));
  genNeuralNet(forms[0]);
  fillFromModel(forms[1], brainModel, 0.36, 0.05, 0.015);
  genAtom(forms[2]);
  fillFromModel(forms[3], robotModel, 0.34, 0.055, 0.018);
  genISS(forms[4]);

  /* ═══════════════ THREE.js scene ═══════════════ */
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 150);
  camera.position.set(0, 0, 15);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var group = new THREE.Group();
  scene.add(group);

  function makeSprite() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(215,245,255,.9)');
    grd.addColorStop(0.6, 'rgba(120,200,255,.32)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    var t = new THREE.Texture(c); t.needsUpdate = true; return t;
  }

  var geo = new THREE.BufferGeometry();
  var positions = new Float32Array(N * 3);
  positions.set(forms[0]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // per-point brightness variation (white → pale blue), tinted by material colour
  var colors = new Float32Array(N * 3);
  var WHITE = new THREE.Color('#ffffff'), PALE = new THREE.Color('#8fd4ff');
  for (var ci = 0; ci < N; ci++) {
    var c2 = WHITE.clone().lerp(PALE, Math.random());
    var b = 0.55 + Math.random() * 0.45;
    colors[ci * 3] = c2.r * b; colors[ci * 3 + 1] = c2.g * b; colors[ci * 3 + 2] = c2.b * b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  var mat = new THREE.PointsMaterial({
    size: small ? 0.1 : 0.085,
    map: makeSprite(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  mat.color = TINTS[0].clone();
  var points = new THREE.Points(geo, mat);
  group.add(points);

  /* ---------- crisp wireframes, faded in only on a settled formation ---------- */
  function lineLayer(model, hex) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(modelLines(model), 3));
    var m = new THREE.LineBasicMaterial({
      color: new THREE.Color(hex), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var ls = new THREE.LineSegments(g, m);
    ls.visible = false; group.add(ls);
    return ls;
  }
  var layers = [null,
    lineLayer(brainModel, '#c3b0ff'),
    lineLayer(atomModel,  '#ff9ed2'),
    lineLayer(robotModel, '#9ef0ff'),
    null];

  /* ═══════════════ Scroll → morph mapping ═══════════════ */
  var STOPS = [0.10, 0.22, 0.31, 0.43, 0.52, 0.64, 0.73, 0.85];
  function morphState(p) {
    if (p <= STOPS[0]) return { a: 0, b: 0, t: 0 };
    if (p <  STOPS[1]) return { a: 0, b: 1, t: easeInOut((p - STOPS[0]) / (STOPS[1] - STOPS[0])) };
    if (p <= STOPS[2]) return { a: 1, b: 1, t: 0 };
    if (p <  STOPS[3]) return { a: 1, b: 2, t: easeInOut((p - STOPS[2]) / (STOPS[3] - STOPS[2])) };
    if (p <= STOPS[4]) return { a: 2, b: 2, t: 0 };
    if (p <  STOPS[5]) return { a: 2, b: 3, t: easeInOut((p - STOPS[4]) / (STOPS[5] - STOPS[4])) };
    if (p <= STOPS[6]) return { a: 3, b: 3, t: 0 };
    if (p <  STOPS[7]) return { a: 3, b: 4, t: easeInOut((p - STOPS[6]) / (STOPS[7] - STOPS[6])) };
    return { a: 4, b: 4, t: 0 };
  }
  function activeScene(p) {
    return p < 0.16 ? 0 : p < 0.37 ? 1 : p < 0.58 ? 2 : p < 0.79 ? 3 : 4;
  }
  function layerWeight(idx, m, t) {
    if (m.a === idx && m.b === idx) return 1;
    if (m.b === idx) return clamp01((t - 0.62) / 0.38);
    if (m.a === idx) return clamp01((0.38 - t) / 0.38);
    return 0;
  }
  function updateLayers(m, t) {
    for (var i = 0; i < layers.length; i++) {
      if (!layers[i]) continue;
      var w = layerWeight(i, m, t);
      layers[i].visible = w > 0.002;
      layers[i].material.opacity = w * 0.55;
    }
  }

  /* ---------- scroll progress through the tall section ---------- */
  var targetP = 0;
  function inView() {
    var r = section.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
  function readScroll() {
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    targetP = clamp01(-rect.top / (total || 1));
    section.classList.toggle('is-end', targetP > 0.94);
    // drive the loop from scroll as well as from the observer, so the cloud can
    // never be left paused (restored scroll positions, stale observer records…)
    if (inView()) start(); else stop();
  }
  window.addEventListener('scroll', readScroll, { passive: true });

  /* ---------- rail: click a scene to jump to it ---------- */
  var CENTERS = [0.05, 0.265, 0.475, 0.685, 0.94];
  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      var idx = +d.getAttribute('data-scene');
      var total = section.offsetHeight - window.innerHeight;
      window.scrollTo({ top: section.offsetTop + CENTERS[idx] * total, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  var activeIdx = -1;
  function syncUI(p) {
    var idx = activeScene(p);
    if (idx === activeIdx) return;
    activeIdx = idx;
    caps.forEach(function (c, i) { c.classList.toggle('is-active', i === idx); });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === idx); });
    if (lblEl) lblEl.textContent = LABELS[idx];
  }

  /* ---------- pointer parallax + drag to spin ---------- */
  var tmx = 0, tmy = 0, mx = 0, my = 0, dragging = false, lastX = 0, spin = 0;
  sticky.addEventListener('pointermove', function (e) {
    var r = sticky.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tmy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (dragging) { spin += (e.clientX - lastX) * 0.006; lastX = e.clientX; }
  }, { passive: true });
  sticky.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; });
  window.addEventListener('pointerup', function () { dragging = false; });
  sticky.addEventListener('pointerleave', function () { tmx = 0; tmy = 0; dragging = false; });

  /* ═══════════════ Render loop ═══════════════ */
  var curP = 0, running = false, t0 = 0, raf = null;
  var pos = geo.attributes.position.array;
  var tint = TINTS[0].clone();

  function resize() {
    var w = sticky.clientWidth, h = sticky.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function apply(m) {
    var A = forms[m.a], B = forms[m.b], t = m.t;
    if (m.a === m.b) {
      pos.set(A);
    } else {
      for (var i = 0; i < N * 3; i++) pos[i] = A[i] + (B[i] - A[i]) * t;
    }
    geo.attributes.position.needsUpdate = true;
    updateLayers(m, t);

    // colour eases between the two formations' tints
    tint.copy(TINTS[m.a]).lerp(TINTS[m.b], t);
    mat.color.copy(tint);

    // camera dollies in on the detailed formations, out on the wide ones
    var wide = (m.a === 0 || m.a === 4) ? 1 : 0, wideB = (m.b === 0 || m.b === 4) ? 1 : 0;
    var far = wide + (wideB - wide) * t;
    camera.position.z = 13.4 + far * 2.6;
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    var time = (now - t0) / 1000;

    curP += (targetP - curP) * (reduced ? 1 : 0.08);
    var m = morphState(curP);
    apply(m);

    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;

    if (!reduced) {
      group.rotation.y = time * 0.1 + curP * Math.PI * 1.35 + mx * 0.45 + spin;
      group.rotation.x = my * 0.26 + Math.sin(time * 0.3) * 0.05;
      group.position.y = Math.sin(time * 0.5) * 0.14;
      // during a morph the cloud swells slightly — makes the transition feel alive
      group.scale.setScalar(1 + Math.sin(m.t * Math.PI) * 0.06);
    } else {
      group.rotation.y = curP * Math.PI * 1.35;
    }

    syncUI(curP);
    renderer.render(scene, camera);
  }

  function renderOnce() {
    resize();
    apply(morphState(curP));
    group.rotation.y = curP * Math.PI * 1.35;
    syncUI(curP);
    renderer.render(scene, camera);
  }
  function start() {
    if (running) return;
    running = true; resize(); t0 = performance.now();
    apply(morphState(curP)); renderer.render(scene, camera);   // never show a blank frame
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  window.addEventListener('resize', function () { resize(); if (!running) renderOnce(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (inView()) start();
  });
  readScroll();
  curP = targetP;
  renderOnce();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      en.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0 }).observe(section);
  } else start();
})();
