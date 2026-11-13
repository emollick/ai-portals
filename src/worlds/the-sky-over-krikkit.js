// THE SKY OVER KRIKKIT. Night on a gentle farming planet whose sky has never held a single light: black from rim to rim.
// We fly low over a lamplit village, up the hill where a small white home-built ship has just gone up on a thread of fire,
// follow its trail into the dust cloud that has always wrapped this world, and come out on top of it into the whole universe.
// An original place, imagined from Douglas Adams's Life, the Universe and Everything.
import * as THREE from 'three';
import { makePath, makeNoise } from '../kit/core.js';

const DUR = 46;
const HILL = [0, -520], HILL_H = 62, HILL_R = 150;
const CLOUD_LO = 450, CLOUD_HI = 1300;      // the dust cloud's underside and its top, metres
const PTS = [[0, 42, 80], [0, 40, -60], [8, 40, -220], [0, 62, -380], [0, 112, -500], [0, 330, -640], [0, 760, -860],
  [0, 1250, -1120], [0, 1650, -1360], [0, 1860, -1560], [0, 1900, -1760], [0, 1900, -1960]];

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function softTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.35)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.4, mid); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function puffTexture(rng) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 128 + (rng() - 0.5) * 120, y = 128 + (rng() - 0.5) * 90, r = 30 + rng() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(c);
}

export default {
  id: 'the-sky-over-krikkit',
  name: 'The Sky over Krikkit',
  category: 'books',
  placeKind: 'sky',
  book: 'Life, the Universe and Everything',
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.6,
  async build(ctx) {
    const rng = ctx.rng, detail = ctx.quality?.detail ?? 1;
    const noise = makeNoise(Math.floor(rng() * 1e9));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');
    const fogLow = new THREE.Color('#04070b'), fogDust = new THREE.Color('#0c0a0f');
    scene.fog = new THREE.FogExp2(fogLow.clone(), 0.0009);
    const path = makePath(PTS);
    const disposables = [];
    const keep = (o) => { disposables.push(o); return o; };

    // ---- the land ----
    const height = (x, z) => {
      const dx = x - HILL[0], dz = z - HILL[1];
      return noise.fbm2(x * 0.0022, z * 0.0022, 4) * 10 + HILL_H * Math.exp(-(dx * dx + dz * dz) / (HILL_R * HILL_R))
        + 40 * ss(900, 1500, Math.hypot(x, z + 300)) * (0.6 + 0.4 * noise.n2(x * 0.0007, z * 0.0007));
    };

    // houses first (the land takes their lamplight)
    const houses = [];
    const nHouse = Math.round(90 * Math.min(1.2, Math.max(0.6, detail)));
    for (let tries = 0; houses.length < nHouse && tries < 4000; tries++) {
      // clustered along a lane that wanders up the valley toward the hill
      const z = rng.range(40, -430), lane = 40 * Math.sin(z * 0.012) + 20 * Math.sin(z * 0.031 + 2);
      const x = lane + rng.sign() * rng.range(16, 150) * (rng() < 0.7 ? 0.6 : 1.4);
      if (Math.hypot(x - HILL[0], z - HILL[1]) < 115) continue;
      if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 17)) continue;
      houses.push({ x, z, y: height(x, z), w: rng.range(6, 10), d: rng.range(5, 7.5), h: rng.range(3.2, 4.4), rot: rng.range(0, Math.PI), lit: rng() < 0.82 });
    }
    await ctx.yield();

    {
      const SEG = Math.round(170 * Math.min(1.2, Math.max(0.55, detail))), SIZE = 3600;
      const geo = keep(new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i) - 300, y = height(x, z);
        pos.setXYZ(i, x, y, z);
        const n = 0.5 + 0.5 * noise.fbm2(x * 0.006 + 9, z * 0.006 - 4, 3), f = 0.5 + 0.5 * noise.n2(x * 0.03, z * 0.03);
        // dark meadow and ploughland, blue-green; patchwork from a coarse noise
        let r = 0.07 + 0.05 * n, g = 0.15 + 0.10 * n + 0.03 * f, b = 0.14 + 0.07 * n;
        if (noise.n2(Math.floor(x / 70) * 3.1, Math.floor(z / 70) * 1.7) > 0.35) { r += 0.03; g -= 0.02; b -= 0.03; }
        // lamplight from the cottages
        let warm = 0;
        for (let k = 0; k < houses.length; k++) { const h = houses[k]; if (!h.lit) continue; const dx = h.x - x, dz = h.z - z, d2 = dx * dx + dz * dz; if (d2 < 3600) warm += 1 / (1 + d2 * 0.012); }
        const dh = Math.hypot(x - HILL[0], z - HILL[1]); warm += 1.6 / (1 + dh * dh * 0.0012);      // the launch fire's glow on the hilltop
        warm = Math.min(1.6, warm);
        col[i * 3] = r + warm * 0.34; col[i * 3 + 1] = g + warm * 0.2; col[i * 3 + 2] = b + warm * 0.05;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
      scene.add(new THREE.Mesh(geo, keep(new THREE.MeshLambertMaterial({ vertexColors: true }))));
    }
    await ctx.yield();

    // ---- light: no moon, no stars; a faint airglow so the land reads, and the lamps ----
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.34, 0.44, 0.62), new THREE.Color(0.10, 0.12, 0.10), Math.PI * 0.95));
    const key = new THREE.DirectionalLight(new THREE.Color('#8fa0c8'), 0.7); key.position.set(-300, 600, 200); scene.add(key);

    // ---- cottages ----
    {
      const wallG = keep(new THREE.BoxGeometry(1, 1, 1)), roofG = keep(new THREE.ConeGeometry(0.75, 1, 4)); roofG.rotateY(Math.PI / 4);
      const wallM = keep(new THREE.MeshLambertMaterial({ color: '#d9d6cc' })), roofM = keep(new THREE.MeshLambertMaterial({ color: '#2a2622' }));
      const winM = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.6, 0.6) }));
      const walls = new THREE.InstancedMesh(wallG, wallM, houses.length), roofs = new THREE.InstancedMesh(roofG, roofM, houses.length);
      const nLit = houses.filter((h) => h.lit).length, wins = new THREE.InstancedMesh(wallG, winM, nLit * 4);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), o = new THREE.Vector3();
      let wi = 0;
      houses.forEach((h, i) => {
        q.setFromAxisAngle(up, h.rot);
        walls.setMatrixAt(i, m.compose(p.set(h.x, h.y + h.h / 2 - 0.4, h.z), q, s.set(h.w, h.h + 0.8, h.d)));
        roofs.setMatrixAt(i, m.compose(p.set(h.x, h.y + h.h + 1.5, h.z), q, s.set(h.w * 1.02, 3.2, h.d * 1.08)));
        if (h.lit) for (let k = 0; k < 4; k++) {
          const side = k < 2 ? 1 : -1, along = (k % 2 ? 0.26 : -0.26) * h.w;
          o.set(along, 0, side * (h.d / 2 + 0.03)).applyQuaternion(q);
          wins.setMatrixAt(wi++, m.compose(p.set(h.x + o.x, h.y + h.h * 0.55, h.z + o.z), q, s.set(1.1, 1.3, 0.12)));
        }
      });
      wins.count = wi;
      scene.add(walls, roofs, wins);
    }
    await ctx.yield();

    // ---- trees and hedges ----
    {
      const n = Math.round(900 * detail), g = keep(new THREE.ConeGeometry(1, 1, 6)), mat = keep(new THREE.MeshLambertMaterial({ color: '#0d1f1a' }));
      const trees = new THREE.InstancedMesh(g, mat, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
      let c = 0;
      for (let i = 0; i < n * 3 && c < n; i++) {
        const x = rng.range(-900, 900), z = rng.range(250, -1100);
        if (noise.fbm2(x * 0.004 + 3, z * 0.004, 3) < 0.05 && rng() < 0.85) continue;
        if (Math.hypot(x - HILL[0], z - HILL[1]) < 60) continue;
        if (houses.some((h) => Math.abs(h.x - x) < 8 && Math.abs(h.z - z) < 8)) continue;
        const hgt = rng.range(7, 15), y = height(x, z);
        if (Math.abs(x) < 26 && y + hgt > 24 && z > -330) continue;      // keep the road of the flight clear
        trees.setMatrixAt(c++, m.compose(p.set(x, y + hgt / 2 - 0.5, z), q, s.set(hgt * 0.3, hgt, hgt * 0.3)));
      }
      trees.count = c; scene.add(trees);
    }
    await ctx.yield();

    // ---- lanterns: along the lane, round the hilltop where the whole village stood to watch ----
    const lampTex = keep(softTexture('rgba(255,236,190,1)', 'rgba(255,170,80,0.4)'));
    {
      const pts = [];
      for (let z = 60; z > -420; z -= 14) { const x = 40 * Math.sin(z * 0.012) + 20 * Math.sin(z * 0.031 + 2); pts.push(x + rng.range(-2, 2), height(x, z) + 3.2, z); }
      for (let i = 0; i < 160; i++) { const a = rng.range(0, 6.283), r = rng.range(14, 60), x = HILL[0] + Math.cos(a) * r, z = HILL[1] + Math.sin(a) * r; pts.push(x, height(x, z) + 1.7, z); }
      houses.forEach((h) => { if (h.lit) pts.push(h.x + rng.range(-5, 5), h.y + 2.6, h.z + rng.range(-5, 5)); });
      const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const mat = keep(new THREE.PointsMaterial({ map: lampTex, color: new THREE.Color(1.8, 1.25, 0.6), size: 7, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      scene.add(new THREE.Points(g, mat));
    }
    // the launch gantry: a few bits of timber and scaffold pole
    {
      const mat = keep(new THREE.MeshLambertMaterial({ color: '#8d877a' })), g = keep(new THREE.BoxGeometry(1, 1, 1));
      const gx = HILL[0] + 18, gz = HILL[1], gy = height(gx, gz);
      for (let i = 0; i < 4; i++) { const mesh = new THREE.Mesh(g, mat); mesh.scale.set(0.5, 16, 0.5); mesh.position.set(gx + (i % 2 ? 3 : -3), gy + 8, gz + (i < 2 ? 3 : -3)); scene.add(mesh); }
      for (let i = 0; i < 3; i++) { const mesh = new THREE.Mesh(g, mat); mesh.scale.set(6.5, 0.4, 6.5); mesh.position.set(gx, gy + 4 + i * 5, gz); scene.add(mesh); }
      const fire = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: lampTex, color: new THREE.Color(3, 1.7, 0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      fire.scale.setScalar(46); fire.position.set(gx, gy + 5, gz); scene.add(fire);
    }
    await ctx.yield();

    // ---- the ship's trail: one thread of white fire from the hilltop to the top of the sky ----
    const TRAIL_X = 18;
    const trailPts = [new THREE.Vector3(HILL[0] + TRAIL_X, height(HILL[0] + TRAIL_X, HILL[1]) + 14, HILL[1])];
    for (let i = 5; i < PTS.length; i++) trailPts.push(new THREE.Vector3(PTS[i][0] + TRAIL_X + 6 * Math.sin(i * 1.7), PTS[i][1] - 6, PTS[i][2] - 20));
    const trailCurve = new THREE.CatmullRomCurve3(trailPts, false, 'centripetal');
    const trailMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.7) }));
    scene.add(new THREE.Mesh(keep(new THREE.TubeGeometry(trailCurve, 400, 0.7, 6, false)), trailMat));
    const sparkMat = keep(new THREE.PointsMaterial({ map: lampTex, color: new THREE.Color(1.6, 1.3, 0.9), size: 5, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    {
      const n = Math.round(2600 * detail), a = new Float32Array(n * 3), v = new THREE.Vector3();
      for (let i = 0; i < n; i++) { trailCurve.getPointAt(rng(), v); const sp = 2 + rng() * rng() * 22; a[i * 3] = v.x + rng.gauss() * sp; a[i * 3 + 1] = v.y + rng.gauss() * sp; a[i * 3 + 2] = v.z + rng.gauss() * sp; }
      const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
      scene.add(new THREE.Points(g, sparkMat));
    }
    // the ship itself, small and white and home-made, stopped dead at the top of the sky
    const ship = new THREE.Group();
    {
      const white = keep(new THREE.MeshLambertMaterial({ color: '#f2f0ea', emissive: new THREE.Color(0.12, 0.12, 0.14) }));
      const body = new THREE.Mesh(keep(new THREE.CylinderGeometry(1.6, 1.9, 7, 12)), white), nose = new THREE.Mesh(keep(new THREE.ConeGeometry(1.6, 3.4, 12)), white);
      nose.position.y = 5.2; ship.add(body, nose);
      for (let i = 0; i < 3; i++) { const fin = new THREE.Mesh(keep(new THREE.BoxGeometry(0.2, 2.6, 2.4)), white); const a = i * 2.094; fin.position.set(Math.cos(a) * 2.2, -2.6, Math.sin(a) * 2.2); fin.rotation.y = -a + Math.PI / 2; ship.add(fin); }
      const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: lampTex, color: new THREE.Color(2.5, 1.8, 1.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      glow.scale.setScalar(16); glow.position.y = -5; ship.add(glow);
      const end = trailCurve.getPointAt(1); ship.position.copy(end).add(new THREE.Vector3(0, 4, 0)); ship.rotation.z = -1.2; ship.rotation.y = 0.4;
      scene.add(ship);
    }
    await ctx.yield();

    // ---- the dust cloud ----
    const puffTex = keep(puffTexture(rng));
    const puffMat = keep(new THREE.SpriteMaterial({ map: puffTex, color: '#2b2631', transparent: true, opacity: 0.6, depthWrite: false }));
    const topMat = keep(new THREE.SpriteMaterial({ map: puffTex, color: '#23202c', transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    {
      const n = Math.round(240 * detail), v = new THREE.Vector3();
      for (let i = 0; i < n; i++) {      // puffs about the road of the flight, so the murk is seen to go by
        path.pointAt(rng.range(0.3, 0.86), v);
        if (v.y < CLOUD_LO - 60 || v.y > CLOUD_HI + 20) { continue; }
        const a = rng.range(0, 6.283), r = rng.range(40, 420);
        const sp = new THREE.Sprite(puffMat); sp.position.set(v.x + Math.cos(a) * r, v.y + rng.range(-120, 120), v.z + Math.sin(a) * r * 0.7);
        sp.scale.set(rng.range(180, 420), rng.range(120, 260), 1); sp.material.rotation = 0; scene.add(sp);
      }
      const nt = Math.round(170 * detail);
      for (let i = 0; i < nt; i++) {      // the cloud's top: a dark billowing country seen by starlight
        const a = rng.range(0, 6.283), r = 200 + rng() * rng() * 5200;
        const sp = new THREE.Sprite(topMat); sp.position.set(Math.cos(a) * r, CLOUD_HI + rng.range(-10, 46), -1500 + Math.sin(a) * r);
        sp.scale.set(rng.range(500, 1100), rng.range(160, 320), 1); scene.add(sp);
      }
      // the deck under them: seen only from above (its face is up), it hides the land for good
      const deck = new THREE.Mesh(keep(new THREE.CircleGeometry(16000, 48)), keep(new THREE.MeshBasicMaterial({ color: '#08070c', fog: false })));
      deck.rotation.x = -Math.PI / 2; deck.position.set(0, CLOUD_HI - 6, -1500); scene.add(deck);
      // motes in the murk
      const nm = Math.round(5000 * detail), a = new Float32Array(nm * 3);
      for (let i = 0; i < nm; i++) { path.pointAt(rng.range(0.34, 0.8), v); a[i * 3] = v.x + rng.gauss() * 60; a[i * 3 + 1] = v.y + rng.gauss() * 60; a[i * 3 + 2] = v.z + rng.gauss() * 60; }
      const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
      scene.add(new THREE.Points(g, keep(new THREE.PointsMaterial({ color: '#8a8290', size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false }))));
    }
    await ctx.yield();

    // ---- the universe: carried round the eye, unseen from under the cloud ----
    const sky = new THREE.Group(); scene.add(sky);
    const R = 9000, band = new THREE.Vector3(0.35, 0.82, 0.45).normalize();      // the pole of the galaxy's plane
    const bu = new THREE.Vector3(1, 0, 0).cross(band).normalize(), bv = band.clone().cross(bu).normalize();
    const PAL = [[0.7, 0.8, 1.0], [1, 1, 1], [1, 0.95, 0.8], [1, 0.8, 0.55], [1, 0.62, 0.45], [0.75, 0.9, 1]];
    const starField = (n, bandShare, bright) => {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), d = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        if (rng() < bandShare) { const a = rng.range(0, 6.283), off = rng.gauss() * 0.11; d.copy(bu).multiplyScalar(Math.cos(a)).addScaledVector(bv, Math.sin(a)).addScaledVector(band, off).normalize(); }
        else { d.set(rng.gauss(), rng.gauss(), rng.gauss()).normalize(); }
        pos[i * 3] = d.x * R; pos[i * 3 + 1] = d.y * R; pos[i * 3 + 2] = d.z * R;
        const c = PAL[Math.floor(rng() * PAL.length)], k = bright * (0.25 + 1.9 * Math.pow(rng(), 5));
        col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k;
      }
      const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    };
    const starMat = keep(new THREE.PointsMaterial({ vertexColors: true, size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const bigMat = keep(new THREE.PointsMaterial({ vertexColors: true, map: keep(softTexture()), size: 9, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sky.add(new THREE.Points(starField(Math.round(40000 * Math.max(0.5, detail)), 0.45, 1.0), starMat));
    await ctx.yield();
    sky.add(new THREE.Points(starField(700, 0.3, 2.2), bigMat));
    const nebMats = [];
    {
      const nebTex = keep(puffTexture(rng)), NEB = ['#5a3fb0', '#b0406a', '#2f6fb8', '#c88a4a', '#3aa39a', '#7a4fd0'];
      const d = new THREE.Vector3();
      for (let i = 0; i < 46; i++) {
        const a = rng.range(0, 6.283), off = rng.gauss() * 0.07;
        d.copy(bu).multiplyScalar(Math.cos(a)).addScaledVector(bv, Math.sin(a)).addScaledVector(band, off).normalize();
        const m = keep(new THREE.SpriteMaterial({ map: nebTex, color: i % 3 === 0 ? '#cfd6ff' : NEB[i % NEB.length], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, rotation: rng.range(0, 6.283) }));
        m.userData.k = i % 3 === 0 ? 0.5 : rng.range(0.35, 0.8); nebMats.push(m);
        const sp = new THREE.Sprite(m); sp.position.copy(d).multiplyScalar(R * 0.96); const sc = rng.range(1800, 4200); sp.scale.set(sc, sc * rng.range(0.5, 0.9), 1); sky.add(sp);
      }
    }
    await ctx.yield();

    const eye = new THREE.Vector3();
    function update(dt, time, camera) {
      camera.getWorldPosition(eye);
      const y = eye.y;
      // the air: clear night below, dust in the cloud, nothing above it
      const inDust = ss(CLOUD_LO - 120, CLOUD_LO + 220, y) * (1 - ss(CLOUD_HI - 160, CLOUD_HI + 60, y)), above = ss(CLOUD_HI - 60, CLOUD_HI + 120, y);
      scene.fog.density = 0.0009 * (1 - ss(CLOUD_LO - 200, CLOUD_LO, y)) + 0.0085 * inDust + 0.00002 * above + 0.0006 * (1 - above) * ss(CLOUD_LO - 200, CLOUD_LO, y);
      scene.fog.color.copy(fogLow).lerp(fogDust, ss(CLOUD_LO - 200, CLOUD_LO + 100, y));
      // the stars: none at all until the top of the cloud
      const show = ss(CLOUD_HI - 110, CLOUD_HI + 170, y);
      sky.position.copy(eye); sky.visible = show > 0.001;
      starMat.opacity = show; bigMat.opacity = show * (0.9 + 0.1 * Math.sin(time * 3.1));
      for (let i = 0; i < nebMats.length; i++) nebMats[i].opacity = show * nebMats[i].userData.k * 0.5;
      sparkMat.opacity = 0.65 + 0.2 * Math.sin(time * 5.3);
      ship.rotation.x = 0.1 * Math.sin(time * 0.6);
    }

    return {
      scene, path, duration: DUR,
      camera: { fov: 62, near: 0.5, far: 20000, lookAhead: 30, sway: 0.3, bank: 0.12 },
      pois: [],
      portal: { shape: 'circle', radius: 9, color: '#dfe8ff', glow: 0.5 },
      post: { exposure: 1.1, bloom: { strength: 0.6, radius: 0.8, threshold: 0.85 },
        grade: { saturation: 1.05, contrast: 1.05, vignette: 0.3, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() { for (const d of disposables) { try { d.dispose?.(); } catch (e) {} } },
    };
  },
};
