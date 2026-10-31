/* =====================================================================
   HERO — "THE CORE"
   A living arc-reactor / atom / neural lattice built with Three.js:
     · an icosahedral neural lattice (glowing wireframe + vertex neurons)
     · three electron orbits with electrons racing around them
     · a particle halo that reacts to the pointer
   Mouse moves it, clicking pulses it, scroll drifts it away.
   ===================================================================== */
(function () {
  'use strict';

  var THREE = window.THREE;
  var hero = document.getElementById('hero');
  var canvas = document.getElementById('heroCanvas');
  if (!THREE || !hero || !canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.innerWidth < 820;

  /* ---------- renderer / scene ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
  camera.position.set(0, 0, 15);

  var rig = new THREE.Group();      // whole assembly — mouse & scroll act here
  scene.add(rig);
  var core = new THREE.Group();     // the lattice + core, spins on its own
  rig.add(core);

  var CY = new THREE.Color('#5ce1ff');
  var VI = new THREE.Color('#9c7bff');
  var RO = new THREE.Color('#ff5fa8');

  /* ---------- soft round sprite ---------- */
  function sprite(inner, outer) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.22, inner);
    grd.addColorStop(0.55, outer);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    var t = new THREE.Texture(c); t.needsUpdate = true; return t;
  }
  var dotTex = sprite('rgba(190,240,255,.95)', 'rgba(92,225,255,.34)');

  /* ---------- 1 · neural lattice (icosahedron wireframe) ---------- */
  var latGeo = new THREE.IcosahedronGeometry(3.15, small ? 1 : 2);
  var wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(latGeo),
    new THREE.LineBasicMaterial({ color: CY, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  core.add(wire);

  // neurons at every lattice vertex
  var lp = latGeo.attributes.position.array;
  var seen = {}, verts = [];
  for (var i = 0; i < lp.length; i += 3) {
    var key = lp[i].toFixed(3) + ',' + lp[i + 1].toFixed(3) + ',' + lp[i + 2].toFixed(3);
    if (seen[key]) continue; seen[key] = 1;
    verts.push(lp[i], lp[i + 1], lp[i + 2]);
  }
  var nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  var nCols = new Float32Array(verts.length);
  for (var v = 0; v < verts.length / 3; v++) {
    var c = (v % 5 === 0 ? VI : CY).clone().lerp(new THREE.Color('#ffffff'), Math.random() * 0.45);
    nCols[v * 3] = c.r; nCols[v * 3 + 1] = c.g; nCols[v * 3 + 2] = c.b;
  }
  nGeo.setAttribute('color', new THREE.BufferAttribute(nCols, 3));
  var neurons = new THREE.Points(nGeo, new THREE.PointsMaterial({
    size: 0.24, map: dotTex, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  core.add(neurons);

  /* ---------- 2 · the core itself ---------- */
  var nucleus = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 1),
    new THREE.MeshBasicMaterial({ color: 0xbdf1ff, transparent: true, opacity: 0.92 })
  );
  core.add(nucleus);
  var nucleusWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.95, 1)),
    new THREE.LineBasicMaterial({ color: VI, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  core.add(nucleusWire);

  // glow billboard behind the nucleus
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sprite('rgba(140,225,255,.55)', 'rgba(92,225,255,.14)'),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9
  }));
  glow.scale.set(7, 7, 1);
  core.add(glow);

  /* ---------- 3 · electron orbits ---------- */
  var orbits = [];
  function addOrbit(radius, tiltX, tiltY, color, speed) {
    var g = new THREE.Group();
    g.rotation.set(tiltX, tiltY, 0);
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 6, 180),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    g.add(ring);
    var e = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sprite('rgba(255,255,255,.95)', 'rgba(' + Math.round(color.r * 255) + ',' + Math.round(color.g * 255) + ',' + Math.round(color.b * 255) + ',.4)'),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    e.scale.set(0.85, 0.85, 1);
    g.add(e);
    rig.add(g);
    orbits.push({ group: g, electron: e, r: radius, speed: speed, phase: Math.random() * 6.28 });
  }
  addOrbit(4.4, Math.PI / 2.15,  0.0,           CY, 0.62);
  addOrbit(5.1, Math.PI / 2.6,   Math.PI / 3,   VI, -0.46);
  addOrbit(5.8, Math.PI / 1.75, -Math.PI / 3.2, RO, 0.34);

  /* ---------- 4 · particle halo ---------- */
  var HN = small ? 1400 : 3200;
  var hPos = new Float32Array(HN * 3), hBase = new Float32Array(HN * 3), hCol = new Float32Array(HN * 3);
  for (var k = 0; k < HN; k++) {
    var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    var rad = 4.2 + Math.pow(Math.random(), 0.6) * 6.4;
    var s = Math.sqrt(1 - u * u);
    var x = rad * s * Math.cos(th), y = rad * u * 0.65, z = rad * s * Math.sin(th);
    hBase[k * 3] = hPos[k * 3] = x;
    hBase[k * 3 + 1] = hPos[k * 3 + 1] = y;
    hBase[k * 3 + 2] = hPos[k * 3 + 2] = z;
    var cc = (Math.random() < 0.72 ? CY : VI).clone().multiplyScalar(0.55 + Math.random() * 0.6);
    hCol[k * 3] = cc.r; hCol[k * 3 + 1] = cc.g; hCol[k * 3 + 2] = cc.b;
  }
  var haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3));
  haloGeo.setAttribute('color', new THREE.BufferAttribute(hCol, 3));
  var halo = new THREE.Points(haloGeo, new THREE.PointsMaterial({
    size: 0.075, map: dotTex, vertexColors: true, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  rig.add(halo);

  /* ---------- pointer / interaction ---------- */
  var tmx = 0, tmy = 0, mx = 0, my = 0;
  var pulse = 0;
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tmy = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }, { passive: true });
  hero.addEventListener('pointerleave', function () { tmx = 0; tmy = 0; });
  hero.addEventListener('pointerdown', function () { pulse = 1; });

  /* ---------- layout ---------- */
  function layout() {
    var w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    var wide = w > 1024;
    // push the core to the right of the copy on wide screens, centre it on mobile
    rig.position.x = wide ? 4.4 : 0;
    rig.position.y = wide ? 0.2 : -0.6;
    var s = wide ? 0.92 : (w < 560 ? 0.6 : 0.75);
    rig.scale.setScalar(s);
    camera.position.z = wide ? 15 : 17.5;
  }

  /* ---------- render loop ---------- */
  var running = false, t0 = performance.now(), raf = null;
  var scrollFade = 1;

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    var t = (now - t0) / 1000;

    mx += (tmx - mx) * 0.055;
    my += (tmy - my) * 0.055;

    if (!reduced) {
      core.rotation.y = t * 0.16;
      core.rotation.x = Math.sin(t * 0.24) * 0.16;
      halo.rotation.y = -t * 0.045;
      halo.rotation.z = Math.sin(t * 0.14) * 0.08;
      rig.rotation.y = mx * 0.42;
      rig.rotation.x = my * 0.3;
    }

    // electrons ride their rings
    for (var i = 0; i < orbits.length; i++) {
      var o = orbits[i];
      var a = t * o.speed + o.phase;
      o.electron.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r, 0);
      if (!reduced) o.group.rotation.z = t * o.speed * 0.14;
    }

    // breathing nucleus + click pulse
    pulse *= 0.93;
    var breathe = 1 + Math.sin(t * 1.5) * 0.06 + pulse * 0.65;
    nucleus.scale.setScalar(breathe);
    nucleusWire.rotation.y = -t * 0.5;
    nucleusWire.rotation.x = t * 0.32;
    glow.scale.setScalar(7 * (1 + Math.sin(t * 1.5) * 0.05 + pulse * 0.5));
    wire.material.opacity = 0.24 + Math.sin(t * 1.2) * 0.05 + pulse * 0.4;

    // halo breathes outward on the pulse and swirls gently
    var hp = haloGeo.attributes.position.array;
    var kk = 1 + pulse * 0.22;
    for (var p = 0; p < HN; p++) {
      var i3 = p * 3;
      var wob = Math.sin(t * 0.7 + hBase[i3] * 0.5) * 0.09;
      hp[i3]     = hBase[i3] * kk + wob;
      hp[i3 + 1] = hBase[i3 + 1] * kk + Math.cos(t * 0.6 + hBase[i3 + 2] * 0.5) * 0.09;
      hp[i3 + 2] = hBase[i3 + 2] * kk - wob;
    }
    haloGeo.attributes.position.needsUpdate = true;

    // fade + drift as the hero scrolls away
    var rect = hero.getBoundingClientRect();
    scrollFade = Math.max(0, Math.min(1, 1 + rect.top / (rect.height * 0.85)));
    rig.position.y = (window.innerWidth > 1024 ? 0.2 : -0.6) - (1 - scrollFade) * 3.4;
    renderer.domElement.style.opacity = (0.25 + scrollFade * 0.75).toFixed(3);

    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true; t0 = performance.now() - 1000; layout();
    renderer.render(scene, camera);                              // never show a blank frame
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  function inView() {
    var r = hero.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
  window.addEventListener('scroll', function () { if (inView()) start(); else stop(); }, { passive: true });
  window.addEventListener('resize', function () { layout(); if (!running) renderer.render(scene, camera); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (inView()) start();
  });
  layout();
  renderer.render(scene, camera);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      en.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0 }).observe(hero);
  } else start();
})();
