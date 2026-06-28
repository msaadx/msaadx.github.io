/* =====================================================================
   Muhammad Saad Hasan — Portfolio
   Scroll-driven 3D particle showcase
   A single point cloud that smoothly MORPHS through three formations as
   you scroll:  Neural network  →  Brain  →  ISS.
   Scale.com-style pinned section · damped, scroll-linked · mouse parallax.
   Three.js (vendored classic build). Works on file://, offline, deployed.
   ===================================================================== */
(function () {
  'use strict';

  const THREE = window.THREE;
  const section = document.getElementById('showcase');
  const canvas = document.getElementById('showcaseCanvas');
  if (!THREE || !section || !canvas) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sticky = section.querySelector('.showcase__sticky');
  const caps = Array.prototype.slice.call(document.querySelectorAll('#showcaseCaptions .sc-cap'));
  const dots = Array.prototype.slice.call(document.querySelectorAll('#showcaseDots button'));

  /* ----- particle count (lighter on small / low-power screens) ----- */
  const small = window.innerWidth < 760;
  const N = small ? 11000 : 22000;

  /* ----- helpers ----- */
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* =====================================================================
     FORMATION GENERATORS — each fills a Float32Array(N*3)
     ===================================================================== */

  // 1) Deep neural network — many layers, side by side
  function genNeuralNet(arr) {
    const layers = [5, 8, 11, 13, 13, 11, 8, 5];
    const L = layers.length;
    const width = 11, height = 5.0, depth = 1.6;

    const nodes = [];
    const layerStart = [];
    let s = 0;
    for (let li = 0; li < L; li++) {
      layerStart.push(s); s += layers[li];
      const x = (li / (L - 1) - 0.5) * width;
      const c = layers[li];
      for (let i = 0; i < c; i++) {
        const y = (c > 1 ? (i / (c - 1) - 0.5) : 0) * height;
        const z = (Math.random() - 0.5) * depth;
        nodes.push([x, y, z]);
      }
    }
    const edges = [];
    for (let li = 0; li < L - 1; li++) {
      for (let i = 0; i < layers[li]; i++)
        for (let j = 0; j < layers[li + 1]; j++)
          edges.push([layerStart[li] + i, layerStart[li + 1] + j]);
    }
    for (let k = 0; k < N; k++) {
      if (Math.random() < 0.42) {            // node clusters (the "neurons")
        const n = nodes[(Math.random() * nodes.length) | 0];
        arr[k * 3] = n[0] + gauss() * 0.13;
        arr[k * 3 + 1] = n[1] + gauss() * 0.13;
        arr[k * 3 + 2] = n[2] + gauss() * 0.13;
      } else {                                // points strung along connections
        const e = edges[(Math.random() * edges.length) | 0];
        const a = nodes[e[0]], b = nodes[e[1]];
        const t = Math.random();
        arr[k * 3] = a[0] + (b[0] - a[0]) * t + gauss() * 0.04;
        arr[k * 3 + 1] = a[1] + (b[1] - a[1]) * t + gauss() * 0.04;
        arr[k * 3 + 2] = a[2] + (b[2] - a[2]) * t + gauss() * 0.04;
      }
    }
  }

  // 2) Brain — a LOW-POLY WIREFRAME model (triangulated facets, glowing vertex
  //    nodes, cerebellum at the lower back, stem dropping to a base point).
  //    A coarse mesh is built once; particles then form it (clustered at the
  //    vertices = bright nodes, strung along the edges = glowing lines).
  //    Axes:  X = left/right,  Y = up,  Z = back(-)/front(+).
  function buildBrainModel() {
    const verts = [];
    const edges = [];
    const addV = (x, y, z) => (verts.push([x, y, z]), verts.length - 1);
    // stable per-vertex pseudo-jitter → irregular low-poly facets
    const jit = (i, j) => (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;

    /* ---- cerebrum: coarse lat/long grid shaped into a brain profile ---- */
    const RI = 8, RJ = 13, grid = [];
    for (let i = 0; i <= RI; i++) {
      const row = [];
      const phi = (0.07 + 0.86 * (i / RI)) * Math.PI;      // skip exact poles
      for (let j = 0; j < RJ; j++) {
        const theta = (j / RJ) * Math.PI * 2;
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);
        const wob = 1 + 0.05 * Math.sin(3 * theta) * Math.sin(2 * phi) + (jit(i, j) - 0.5) * 0.07;
        let x = 2.45 * wob * nx, y = 2.15 * wob * ny, z = 3.05 * wob * nz;
        if (nz > 0) z += 0.4 * nz * nz;                    // frontal lobe bulge
        else x *= 1 - 0.14 * nz * nz;                      // occipital taper
        const mid = Math.exp(-(x * x) / 0.05);             // longitudinal fissure
        if (ny > 0) y -= mid * 0.7 * ny;
        x += (x >= 0 ? 1 : -1) * mid * 0.18;
        if (y < 0) y *= 0.8;                               // flatter underside
        row.push(addV(x, y + 0.5, z));
      }
      grid.push(row);
    }
    for (let i = 0; i <= RI; i++) for (let j = 0; j < RJ; j++) {
      const a = grid[i][j];
      edges.push([a, grid[i][(j + 1) % RJ]]);              // ring
      if (i < RI) {
        edges.push([a, grid[i + 1][j]]);                   // meridian
        edges.push([a, grid[i + 1][(j + 1) % RJ]]);        // diagonal → triangles
      }
    }

    /* ---- cerebellum: smaller mesh at the lower back (extra rings = folia) ---- */
    const CI = 5, CJ = 11, cg = [];
    for (let i = 0; i <= CI; i++) {
      const row = [];
      const phi = (0.1 + 0.8 * (i / CI)) * Math.PI;
      for (let j = 0; j < CJ; j++) {
        const theta = (j / CJ) * Math.PI * 2;
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);
        row.push(addV(1.4 * nx, 1.0 * ny - 1.7, 1.15 * nz - 2.7));
      }
      cg.push(row);
    }
    for (let i = 0; i <= CI; i++) for (let j = 0; j < CJ; j++) {
      const a = cg[i][j];
      edges.push([a, cg[i][(j + 1) % CJ]]);
      if (i < CI) edges.push([a, cg[i + 1][j]]);
    }

    /* ---- brain stem dropping to a glowing base node ---- */
    let prev = addV(0, -1.85, -1.5);
    const steps = 5;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const v = addV(0, -1.85 - t * 2.7, -1.5 + t * 1.5);
      edges.push([prev, v]);
      prev = v;
    }

    return { verts, edges };
  }

  function genBrain(arr, model) {
    const V = model.verts, E = model.edges;
    for (let k = 0; k < N; k++) {
      if (Math.random() < 0.36) {                          // bright vertex nodes
        const v = V[(Math.random() * V.length) | 0];
        arr[k * 3] = v[0] + gauss() * 0.05;
        arr[k * 3 + 1] = v[1] + gauss() * 0.05;
        arr[k * 3 + 2] = v[2] + gauss() * 0.05;
      } else {                                             // dotted glowing edges
        const e = E[(Math.random() * E.length) | 0];
        const a = V[e[0]], b = V[e[1]], t = Math.random();
        arr[k * 3] = a[0] + (b[0] - a[0]) * t + gauss() * 0.015;
        arr[k * 3 + 1] = a[1] + (b[1] - a[1]) * t + gauss() * 0.015;
        arr[k * 3 + 2] = a[2] + (b[2] - a[2]) * t + gauss() * 0.015;
      }
    }
  }

  // 3) ISS — central truss, perpendicular module stack, four solar wings, radiators
  function genISS(arr) {
    for (let k = 0; k < N; k++) {
      const r = Math.random();
      let x, y, z;
      if (r < 0.15) {                          // main truss (long box along X)
        x = (Math.random() - 0.5) * 11.5;
        y = (Math.random() - 0.5) * 0.45;
        z = (Math.random() - 0.5) * 0.45;
      } else if (r < 0.29) {                   // pressurized modules — cylinder along Z
        const ang = Math.random() * Math.PI * 2;
        const rad = 0.55;
        z = (Math.random() - 0.5) * 5.2;
        x = Math.cos(ang) * rad;
        y = Math.sin(ang) * rad;
      } else if (r < 0.39) {                   // side modules — short cylinders along X
        const ang = Math.random() * Math.PI * 2;
        const rad = 0.4;
        x = (Math.random() - 0.5) * 3.2;
        y = Math.sin(ang) * rad;
        z = Math.cos(ang) * rad + (Math.random() < 0.5 ? 1.3 : -1.3);
      } else if (r < 0.88) {                   // four big solar wings (flat panels)
        const sideX = Math.random() < 0.5 ? -1 : 1;
        const sideZ = Math.random() < 0.5 ? -1 : 1;
        x = sideX * (3.3 + Math.random() * 2.7);
        z = sideZ * (1.5 + Math.random() * 2.6);
        y = (Math.random() - 0.5) * 0.1;
        // faint cell striations across each panel
        z = Math.round(z * 6) / 6 + (Math.random() - 0.5) * 0.05;
      } else {                                 // thermal radiators — vertical panels mid-truss
        const sideY = Math.random() < 0.5 ? -1 : 1;
        x = (Math.random() - 0.5) * 2.4;
        y = sideY * (1.1 + Math.random() * 1.7);
        z = (Math.random() - 0.5) * 0.1;
      }
      arr[k * 3] = x;
      arr[k * 3 + 1] = y;
      arr[k * 3 + 2] = z;
    }
  }

  const brainModel = buildBrainModel();

  const forms = [new Float32Array(N * 3), new Float32Array(N * 3), new Float32Array(N * 3)];
  genNeuralNet(forms[0]);
  genBrain(forms[1], brainModel);
  genISS(forms[2]);

  /* ----- brain wireframe: the model's own triangulated edges, drawn as crisp
     glowing lines so the low-poly mesh reads clearly ----- */
  function buildBrainLines(model) {
    const V = model.verts, E = model.edges;
    const seg = new Float32Array(E.length * 6);
    for (let i = 0; i < E.length; i++) {
      const a = V[E[i][0]], b = V[E[i][1]];
      seg[i * 6] = a[0]; seg[i * 6 + 1] = a[1]; seg[i * 6 + 2] = a[2];
      seg[i * 6 + 3] = b[0]; seg[i * 6 + 4] = b[1]; seg[i * 6 + 5] = b[2];
    }
    return seg;
  }
  const brainLinePos = buildBrainLines(brainModel);

  /* ----- per-point colour: a gold↔cream blend, fixed across morphs ----- */
  const gold = new THREE.Color('#c8a45c');
  const cream = new THREE.Color('#e3cd97');
  const colors = new Float32Array(N * 3);
  for (let k = 0; k < N; k++) {
    const c = gold.clone().lerp(cream, Math.pow(Math.random(), 1.6));
    colors[k * 3] = c.r; colors[k * 3 + 1] = c.g; colors[k * 3 + 2] = c.b;
  }

  /* ----- soft round sprite so points read as glowing dots ----- */
  function makeSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,244,214,0.9)');
    grd.addColorStop(0.6, 'rgba(200,164,92,0.35)');
    grd.addColorStop(1, 'rgba(200,164,92,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.Texture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /* =====================================================================
     THREE.js scene
     ===================================================================== */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const group = new THREE.Group();
  scene.add(group);

  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(N * 3);
  positions.set(forms[0]);                         // start on the neural network
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: small ? 0.11 : 0.09,
    map: makeSprite(),
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  group.add(points);

  // brain wireframe — fixed at the brain's positions, faded in only while the
  // cloud is settled on the brain so the lines align with the particles
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(brainLinePos, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#e3cd97'),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const brainLines = new THREE.LineSegments(lineGeo, lineMat);
  brainLines.visible = false;
  group.add(brainLines);

  // how strongly the brain wireframe shows for a given morph state (only near
  // the fully-formed brain, so lines don't float over half-morphed particles)
  function brainLineWeight(m, t) {
    if (m.a === 1 && m.b === 1) return 1;
    if (m.a === 0 && m.b === 1) return clamp01((t - 0.55) / 0.45);
    if (m.a === 1 && m.b === 2) return clamp01((0.45 - t) / 0.45);
    return 0;
  }
  function updateBrainLines(m, t) {
    const w = brainLineWeight(m, t);
    brainLines.visible = w > 0.001;
    lineMat.opacity = w * 0.62;
  }

  /* =====================================================================
     Scroll → morph mapping
     Hold each formation, then morph to the next. Returns {a,b,t}.
     ===================================================================== */
  function morphState(p) {
    if (p <= 0.16) return { a: 0, b: 0, t: 0 };
    if (p < 0.42) return { a: 0, b: 1, t: easeInOut((p - 0.16) / 0.26) };
    if (p <= 0.58) return { a: 1, b: 1, t: 0 };
    if (p < 0.84) return { a: 1, b: 2, t: easeInOut((p - 0.58) / 0.26) };
    return { a: 2, b: 2, t: 0 };
  }
  function activeScene(p) { return p < 0.33 ? 0 : p < 0.70 ? 1 : 2; }

  /* ----- scroll progress through the tall section ----- */
  let targetP = 0;
  function readScroll() {
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    targetP = clamp01(-rect.top / (total || 1));
    section.classList.toggle('is-end', targetP > 0.96);
  }
  window.addEventListener('scroll', readScroll, { passive: true });

  /* ----- dots: click to jump to a scene ----- */
  const sceneCenters = [0.06, 0.5, 0.94];
  dots.forEach((d) => {
    d.addEventListener('click', () => {
      const idx = +d.getAttribute('data-scene');
      const total = section.offsetHeight - window.innerHeight;
      const top = section.offsetTop + sceneCenters[idx] * total;
      window.scrollTo({ top: top, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });

  let activeIdx = -1;
  function syncUI(p) {
    const idx = activeScene(p);
    if (idx === activeIdx) return;
    activeIdx = idx;
    caps.forEach((c, i) => c.classList.toggle('is-active', i === idx));
    dots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
  }

  /* ----- mouse / touch parallax + light drag spin (interacts with you) ----- */
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  let dragging = false, lastX = 0, dragSpin = 0;
  sticky.addEventListener('pointermove', (e) => {
    const r = sticky.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tmy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (dragging) { dragSpin += (e.clientX - lastX) * 0.005; lastX = e.clientX; }
  });
  sticky.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; });
  window.addEventListener('pointerup', () => { dragging = false; });
  sticky.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; });

  /* =====================================================================
     Render loop (damped → very smooth) — only runs while in view
     ===================================================================== */
  let curP = 0;
  let running = false;
  let t0 = 0;
  const pos = geo.attributes.position.array;

  function resize() {
    const w = sticky.clientWidth, h = sticky.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const time = (now - t0) / 1000;

    // damp scroll progress for buttery, lagged motion
    curP += (targetP - curP) * (prefersReduced ? 1 : 0.075);

    const m = morphState(curP);
    const A = forms[m.a], B = forms[m.b], t = m.t;
    if (m.a === m.b) {
      if (pos[0] !== A[0] || t === 0) pos.set(A);   // settled on a formation
    } else {
      for (let i = 0; i < N * 3; i++) pos[i] = A[i] + (B[i] - A[i]) * t;
    }
    geo.attributes.position.needsUpdate = true;
    updateBrainLines(m, t);

    // damp mouse parallax
    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;

    // rotation: gentle idle spin + scroll-driven turn + drag + mouse tilt
    if (!prefersReduced) {
      group.rotation.y = time * 0.12 + curP * Math.PI * 1.1 + mx * 0.5 + dragSpin;
      group.rotation.x = my * 0.28 + Math.sin(time * 0.3) * 0.05;
      group.position.y = Math.sin(time * 0.5) * 0.12;
    } else {
      group.rotation.y = curP * Math.PI * 1.1;
    }

    syncUI(curP);
    renderer.render(scene, camera);
  }

  // draw one frame immediately so the cloud is visible even before rAF spins up
  function renderOnce() {
    resize();
    const m = morphState(curP);
    pos.set(forms[m.a]);
    geo.attributes.position.needsUpdate = true;
    updateBrainLines(m, m.t);
    group.rotation.y = curP * Math.PI * 1.1;
    syncUI(curP);
    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    t0 = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  window.addEventListener('resize', resize);
  readScroll();
  curP = targetP;
  renderOnce();

  // run only while the showcase is on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0 }).observe(section);
  } else {
    start();
  }
})();
