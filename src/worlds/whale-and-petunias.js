// A Whale and a Bowl of Petunias. Three kilometres over a dead grey-gold planet with two suns low on its limb, a sperm
// whale that was not there a moment ago is falling through four thin decks of cloud, slowly turning, and close by a
// bowl of petunias is falling too. We go down with them in one wide turn of a spiral: the whale is met from behind,
// held broadside for the middle of the flight, and let go toward the ground; the bowl is passed at arm's length. Under
// the last of the turn lies the ruin of a landing field, its long shadows thrown away from the suns.
// An original place imagined from The Hitchhiker's Guide to the Galaxy; nothing here is copied from a picture of it.
//
// THE TWO WHO FALL are laid by the road, not by the world: each frame they are set at so many metres ahead, aside and
// below the road's own point for this u (update's fourth argument), so the eye keeps their company all the way down.
// THE GAZE: one steady pull toward the level far ahead (the road dives at twenty degrees; the horizon should stay in
// the picture), one toward the whale for the first three quarters, a light one toward the bowl before it comes abeam.
import * as THREE from 'three';
import { makePath } from '../kit/core.js';

const DUR = 44, FOG = 4.5e-5, TAU = Math.PI * 2;
const WL = 19;                                   // the whale, nose to tail stock, metres
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// a curve through keys (xs rising), cubic Hermite with finite-difference slopes
function spline(xs, ys) {
  const n = xs.length, m = new Array(n);
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); m[i] = (ys[b] - ys[a]) / (xs[b] - xs[a]); }
  return (x) => {
    if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// a skin drawn over rings: prof(s) gives { w, ht, hb, n, yc, z, bump }: half-width, height above and below the centre
// line, the superellipse power, the centre line's height, the ring's z, and a ridge added along the back
function loft(prof, NS, NT) {
  const cnt = (NS + 1) * (NT + 1), pos = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), idx = [];
  for (let i = 0; i <= NS; i++) {
    const s = i / NS, p = prof(s), e = 2 / p.n;
    for (let j = 0; j <= NT; j++) {
      const v = j / NT, th = v * TAU, sx = Math.sin(th), cy = -Math.cos(th), k = i * (NT + 1) + j;
      pos[k * 3] = p.w * Math.sign(sx) * Math.pow(Math.abs(sx), e);
      pos[k * 3 + 1] = p.yc + (cy > 0 ? p.ht : p.hb) * Math.sign(cy) * Math.pow(Math.abs(cy), e) + (p.bump || 0) * Math.pow(Math.max(cy, 0), 6);
      pos[k * 3 + 2] = p.z; uv[k * 2] = s; uv[k * 2 + 1] = v;
    }
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + 1, c = a + NT + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); weldSeam(g, NS, NT);
  return g;
}
function weldSeam(g, NS, NT) {      // the first and last vertex of each ring are one place: give them one normal
  const n = g.attributes.normal.array;
  for (let i = 0; i <= NS; i++) {
    const a = i * (NT + 1) * 3, b = (i * (NT + 1) + NT) * 3;
    let x = n[a] + n[b], y = n[a + 1] + n[b + 1], z = n[a + 2] + n[b + 2]; const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
    n[a] = n[b] = x; n[a + 1] = n[b + 1] = y; n[a + 2] = n[b + 2] = z;
  }
  g.attributes.normal.needsUpdate = true;
}

// ---------- the whale's hide, painted: x is nose to tail, the middle row is the back, top and bottom rows the belly ----------
function paintHide(rng) {
  const W = 1024, H = 512, c = document.createElement('canvas'), b = document.createElement('canvas');
  c.width = W; c.height = H; b.width = W; b.height = H;
  const g = c.getContext('2d'), q = b.getContext('2d');
  const row = g.createLinearGradient(0, 0, 0, H);
  for (const [t, col] of [[0, '#8a8d90'], [0.1, '#6c7279'], [0.22, '#4a525c'], [0.5, '#353c45'], [0.78, '#4a525c'], [0.9, '#6c7279'], [1, '#8a8d90']]) row.addColorStop(t, col);
  g.fillStyle = row; g.fillRect(0, 0, W, H);
  q.fillStyle = '#808080'; q.fillRect(0, 0, W, H);
  const both = (y, f) => { f(y); f(H - y); };      // the two flanks are painted alike enough, not mirror-true
  // mottle
  for (let i = 0; i < 1400; i++) {
    const x = rng() * W, y = rng() * H, r = 4 + rng() * 26, lite = rng() < 0.45;
    g.fillStyle = lite ? `rgba(160,168,176,${0.03 + rng() * 0.05})` : `rgba(18,22,28,${0.04 + rng() * 0.07})`;
    g.beginPath(); g.ellipse(x, y, r * (1 + rng() * 2), r, rng() * 3, 0, TAU); g.fill();
    q.fillStyle = lite ? 'rgba(150,150,150,0.08)' : 'rgba(100,100,100,0.08)'; q.beginPath(); q.ellipse(x, y, r * 1.5, r, 0, 0, TAU); q.fill();
  }
  // the pale belly blotches and the white round the mouth
  for (let i = 0; i < 90; i++) both(rng() * 46, (y) => { g.fillStyle = `rgba(214,214,208,${0.1 + rng() * 0.22})`; g.beginPath(); g.ellipse(rng() * W, y + rng() * 8 - 4, 14 + rng() * 60, 4 + rng() * 14, 0, 0, TAU); g.fill(); });
  for (let i = 0; i < 70; i++) both(rng() * 34, (y) => { g.fillStyle = `rgba(232,230,222,${0.2 + rng() * 0.3})`; g.beginPath(); g.ellipse(30 + rng() * 270, y, 8 + rng() * 34, 3 + rng() * 9, 0, 0, TAU); g.fill(); });
  // the wrinkled hide aft of the head: long shallow furrows
  for (let i = 0; i < 150; i++) {
    const y0 = rng() * H, x0 = W * (0.3 + rng() * 0.12), x1 = W * (0.7 + rng() * 0.27), a = 2 + rng() * 5, f = 0.01 + rng() * 0.02, ph = rng() * 9;
    g.strokeStyle = `rgba(14,18,24,${0.14 + rng() * 0.2})`; g.lineWidth = 0.8 + rng() * 1.4; q.strokeStyle = `rgba(40,40,40,${0.35 + rng() * 0.3})`; q.lineWidth = 1.5 + rng() * 2;
    for (const ctx of [g, q]) { ctx.beginPath(); for (let x = x0; x <= x1; x += 8) { const y = y0 + Math.sin(x * f + ph) * a; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
  }
  // scars: the long scratches of old fights, rakes of parallel teeth, the rings left by squid
  for (let i = 0; i < 170; i++) {
    const head = rng() < 0.6, x = head ? rng() * W * 0.36 : rng() * W, y = rng() * H, len = 14 + rng() * (head ? 130 : 70), an = rng() * TAU, bend = (rng() - 0.5) * 0.8;
    g.strokeStyle = `rgba(190,198,206,${0.16 + rng() * 0.3})`; g.lineWidth = 0.6 + rng() * 1.6; q.strokeStyle = 'rgba(175,175,175,0.5)'; q.lineWidth = 1.2;
    for (const ctx of [g, q]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(an + bend) * len * 0.5, y + Math.sin(an + bend) * len * 0.5, x + Math.cos(an) * len, y + Math.sin(an) * len); ctx.stroke(); }
  }
  for (let i = 0; i < 26; i++) {
    const x = rng() * W * 0.9, y = rng() * H, an = rng() * TAU, len = 30 + rng() * 60, gap = 4 + rng() * 4, n = 3 + Math.floor(rng() * 3);
    g.strokeStyle = `rgba(200,206,212,${0.2 + rng() * 0.25})`; g.lineWidth = 1.1;
    for (let k = 0; k < n; k++) { const ox = -Math.sin(an) * gap * k, oy = Math.cos(an) * gap * k; g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(an) * len, y + oy + Math.sin(an) * len); g.stroke(); }
  }
  for (let i = 0; i < 120; i++) {
    const x = rng() * W * 0.34, y = rng() * H, r = 2.5 + rng() * 6;
    g.strokeStyle = `rgba(196,202,208,${0.22 + rng() * 0.3})`; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, r * 1.6, r, 0, 0, TAU); g.stroke();
    q.strokeStyle = 'rgba(60,60,60,0.6)'; q.lineWidth = 1.5; q.beginPath(); q.ellipse(x, y, r * 1.6, r, 0, 0, TAU); q.stroke();
  }
  // the blowhole, to the left of the brow, and the dark of the tail stock
  g.fillStyle = 'rgba(8,10,12,0.9)'; g.beginPath(); g.ellipse(W * 0.035, H * 0.5 + 34, 12, 4, 0.5, 0, TAU); g.fill();
  q.fillStyle = 'rgba(20,20,20,0.9)'; q.beginPath(); q.ellipse(W * 0.035, H * 0.5 + 34, 12, 4, 0.5, 0, TAU); q.fill();
  const tailShade = g.createLinearGradient(W * 0.82, 0, W, 0); tailShade.addColorStop(0, 'rgba(30,34,40,0)'); tailShade.addColorStop(1, 'rgba(30,34,40,0.75)');
  g.fillStyle = tailShade; g.fillRect(W * 0.82, 0, W * 0.18, H);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(b);
  return { map, bump };
}

function buildWhale(rng) {
  const group = new THREE.Group(), L = WL;
  const KS = [0, 0.06, 0.16, 0.30, 0.45, 0.60, 0.75, 0.88, 0.96, 1];
  const fw = spline(KS, [1.12, 1.25, 1.38, 1.52, 1.58, 1.30, 0.80, 0.36, 0.17, 0.10]);
  const ft = spline(KS, [1.55, 1.76, 1.90, 1.95, 1.90, 1.60, 1.15, 0.70, 0.36, 0.22]);
  const fb = spline(KS, [1.10, 1.28, 1.42, 1.66, 1.85, 1.50, 1.00, 0.60, 0.32, 0.20]);
  const NS = 84, NT = 48;
  const prof = (s) => {
    const cap = s < 0.05 ? Math.sqrt(Math.max(0, 1 - (1 - s / 0.05) ** 2)) : s > 0.985 ? Math.sqrt(Math.max(0, (1 - s) / 0.015)) : 1;
    let bump = 0.32 * Math.exp(-(((s - 0.635) / 0.035) ** 2));                      // the hump
    for (let k = 0; k < 5; k++) bump += (0.13 - k * 0.015) * Math.exp(-(((s - 0.72 - k * 0.043) / 0.011) ** 2));   // the knuckles behind it
    return { w: fw(s) * cap, ht: ft(s) * cap, hb: fb(s) * cap, n: 3.3 - 1.3 * sm(0.18, 0.5, s), yc: 0.22 * (1 - sm(0, 0.4, s)), z: L / 2 - s * L, bump: bump * cap };
  };
  const bodyGeo = loft(prof, NS, NT), base = bodyGeo.attributes.position.array.slice();
  const hide = paintHide(rng);
  const skin = new THREE.MeshStandardMaterial({ map: hide.map, bumpMap: hide.bump, bumpScale: 2.2, roughness: 0.42, metalness: 0.0 });
  const body = new THREE.Mesh(bodyGeo, skin); body.frustumCulled = false; group.add(body);
  const dark = new THREE.MeshStandardMaterial({ color: '#333a43', roughness: 0.5 });
  const pale = new THREE.MeshStandardMaterial({ color: '#cfccc2', roughness: 0.6 });

  // ---- the narrow lower jaw, hinged under the eye; s runs from the tip back to the hinge
  const JL = 4.5, hingeS = 0.275, jaw = new THREE.Group();
  jaw.position.set(0, prof(hingeS).yc - fb(hingeS) + 0.3, L / 2 - hingeS * L);
  const jawGeo = loft((s) => { const cap = s < 0.08 ? Math.sqrt(1 - (1 - s / 0.08) ** 2) : 1; return { w: mix(0.2, 0.55, s) * cap, ht: 0.16 * cap, hb: mix(0.2, 0.42, s) * cap, n: 2.6, yc: mix(0.5, 0, s), z: JL * (1 - s) }; }, 24, 20);
  jaw.add(new THREE.Mesh(jawGeo, pale));
  const tooth = new THREE.ConeGeometry(0.05, 0.19, 7), teeth = new THREE.InstancedMesh(tooth, new THREE.MeshStandardMaterial({ color: '#f1ecd9', roughness: 0.35 }), 44);
  { const m = new THREE.Matrix4(), qd = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 44; i++) { const side = i % 2 ? 1 : -1, t = Math.floor(i / 2) / 21, s = 0.06 + t * 0.62;
      v.set(side * mix(0.2, 0.55, s) * 0.62, mix(0.5, 0, s) + 0.2, JL * (1 - s)); e.set(-0.25, 0, -side * 0.18); qd.setFromEuler(e); one.setScalar(0.8 + 0.4 * Math.sin(i * 1.7) ** 2);
      teeth.setMatrixAt(i, m.compose(v, qd, one)); } }
  jaw.add(teeth); group.add(jaw);

  // ---- the eyes, small and low on the side behind the jaw's corner, each in a wrinkled lid
  const eyeGeo = new THREE.SphereGeometry(0.105, 16, 12), eyeMat = new THREE.MeshStandardMaterial({ color: '#07090c', roughness: 0.08, metalness: 0.2 });
  const lidGeo = new THREE.TorusGeometry(0.15, 0.05, 8, 20);
  for (const sd of [-1, 1]) {
    const s = 0.305, p = prof(s), y = p.yc - 0.52, x = sd * p.w * Math.pow(Math.cos(Math.asin(Math.min(0.99, Math.abs(y - p.yc) / p.hb))), 2 / p.n) * 0.985;
    const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.set(x, y, L / 2 - s * L); group.add(e);
    for (let k = 0; k < 2; k++) { const lid = new THREE.Mesh(lidGeo, dark); lid.position.copy(e.position); lid.position.x -= sd * 0.035 * (k + 1); lid.rotation.y = Math.PI / 2; lid.scale.set(1.25 + k * 0.5, 1 + k * 0.35, 1); group.add(lid); }
  }

  // ---- the flippers: short broad paddles
  const flipGeo = new THREE.SphereGeometry(1, 20, 12); flipGeo.scale(0.5, 0.075, 0.95); flipGeo.translate(0, 0, -0.85);
  { const p = flipGeo.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), t = sm(0, -1.8, z); p.setX(i, p.getX(i) * (0.75 + 0.55 * Math.sin(t * 2.6))); } flipGeo.computeVertexNormals(); }
  const flips = [];
  for (const sd of [-1, 1]) { const s = 0.37, p = prof(s), f = new THREE.Group(); f.position.set(sd * p.w * 0.86, -p.hb * 0.62, L / 2 - s * L); const m = new THREE.Mesh(flipGeo, dark); f.add(m); f.userData.sd = sd; group.add(f); flips.push(f); }

  // ---- the flukes: two swept lobes with a notch between, a lens in section, bent every frame
  const NA = 40, NC = 10, SPAN = 2.55, fl = { n: (NA + 1) * (NC + 1) };
  const fpos = new Float32Array(fl.n * 2 * 3), fidx = [], fa = new Float32Array(fl.n * 2), fbase = new Float32Array(fl.n * 2 * 3);
  for (let sideK = 0; sideK < 2; sideK++) for (let i = 0; i <= NA; i++) for (let j = 0; j <= NC; j++) {
    const a = i / NA * 2 - 1, cc = j / NC, aa = Math.abs(a), k = sideK * fl.n + i * (NC + 1) + j;
    const le = -Math.pow(aa, 1.35) * 1.55, ch = (1.75 * Math.pow(1 - aa, 0.72) + 0.1) * (1 - 0.3 * Math.exp(-((a / 0.13) ** 2)));
    const th = 0.2 * Math.pow(1 - aa, 0.55) * Math.pow(4 * cc * (1 - cc), 0.6) * (1 - 0.45 * cc);
    fpos[k * 3] = a * SPAN; fpos[k * 3 + 1] = (sideK ? -1 : 1) * th * 0.5; fpos[k * 3 + 2] = 0.55 + le - cc * ch; fa[k] = aa;
  }
  for (let sideK = 0; sideK < 2; sideK++) for (let i = 0; i < NA; i++) for (let j = 0; j < NC; j++) { const a = sideK * fl.n + i * (NC + 1) + j, b = a + 1, c = a + NC + 1, d = c + 1; if (sideK) fidx.push(a, b, c, b, d, c); else fidx.push(a, c, b, b, c, d); }
  fbase.set(fpos);
  const flukeGeo = new THREE.BufferGeometry(); flukeGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); flukeGeo.setIndex(fidx); flukeGeo.computeVertexNormals();
  const flukeMat = new THREE.MeshStandardMaterial({ color: '#2f363f', roughness: 0.45 });
  const flukes = new THREE.Group(), flukeMesh = new THREE.Mesh(flukeGeo, flukeMat); flukeMesh.frustumCulled = false; flukes.add(flukeMesh);
  const tailY = prof(0.99).yc; flukes.position.set(0, tailY, -L / 2 + 0.3); group.add(flukes);

  const S0 = 0.5, BEND = 2.3;
  function update(time) {
    // the slow stroke of the tail: the after half of the body bends, the flukes follow it a beat behind and their tips behind them
    const A = Math.sin(time * 0.85) * 0.55, p = bodyGeo.attributes.position.array;
    for (let i = Math.floor(NS * S0); i <= NS; i++) { const k = (i / NS - S0) / (1 - S0), dy = A * k * k * BEND; for (let j = 0; j <= NT; j++) { const o = (i * (NT + 1) + j) * 3 + 1; p[o] = base[o] + dy; } }
    bodyGeo.attributes.position.needsUpdate = true; bodyGeo.computeVertexNormals(); weldSeam(bodyGeo, NS, NT);
    flukes.position.y = tailY + A * BEND;
    flukes.rotation.x = Math.atan(A * BEND * 2 / ((1 - S0) * L)) + 0.4 * Math.sin(time * 0.85 - 1.0);
    const tip = Math.sin(time * 0.85 - 1.7) * 0.5;
    for (let k = 0; k < fl.n * 2; k++) fpos[k * 3 + 1] = fbase[k * 3 + 1] + tip * fa[k] * fa[k] * SPAN * 0.5 - 0.1 * fa[k] * fa[k];
    flukeGeo.attributes.position.needsUpdate = true; flukeGeo.computeVertexNormals();
    for (const f of flips) { const sd = f.userData.sd; f.rotation.set(0.25 * Math.sin(time * 1.3 + sd), sd * (0.75 + 0.2 * Math.sin(time * 0.9)), sd * (0.5 + 0.35 * Math.sin(time * 1.3 + sd * 0.8))); }
    jaw.rotation.x = 0.05 + 0.2 * Math.max(0, Math.sin(time * 0.55)) ** 2;      // it is working out what to call things
  }
  // places on the back where the vapour leaves it (local)
  const vents = []; for (let i = 0; i < 40; i++) { const s = 0.04 + rng() * 0.9, p = prof(s); vents.push(new THREE.Vector3((rng() - 0.5) * p.w * 1.4, p.yc + p.ht * 0.8, L / 2 - s * L)); }
  return { group, update, vents, dispose() { hide.map.dispose(); hide.bump.dispose(); } };
}

// ---------- the bowl of petunias ----------
function petuniaGeo(rim, throat, star) {
  const NS = 16, NT = 40, pos = [], col = [], idx = [], c = new THREE.Color(), cr = new THREE.Color(rim), ct = new THREE.Color(throat), cs = new THREE.Color(star), cy = new THREE.Color('#e9e07a');
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= NT; j++) {
    const t = i / NS, th = j / NT * TAU, flare = sm(0.42, 1, t), lobe = Math.cos(5 * th);
    const r = 0.009 + 0.007 * t + Math.pow(flare, 1.5) * 0.052 * (1 + 0.14 * lobe);
    const y = 0.08 * sm(0, 0.72, t) + 0.016 * flare * (1 - flare) - 0.014 * flare ** 3 + 0.0045 * Math.sin(10 * th + 1) * flare * flare;
    pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
    const vein = Math.pow(Math.abs(Math.cos(2.5 * th)), 12);
    c.copy(cy).lerp(ct, sm(0.25, 0.5, t)).lerp(cr, sm(0.5, 0.82, t)).lerp(cs, vein * 0.75 * sm(0.4, 0.6, t) * (1 - 0.6 * sm(0.85, 1, t)));
    c.offsetHSL(0, 0, 0.06 * sm(0.9, 1, t));
    col.push(c.r, c.g, c.b);
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + 1, d = a + NT + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function leafGeo() {
  const NU = 6, NV = 10, pos = [], idx = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
    const v = j / NV, a = i / NU * 2 - 1, w = 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.8)), 0.75) + 0.01;
    pos.push(a * w, 0.1 * Math.abs(a) * w * 2.2 - 0.28 * v * v + 0.05 * Math.sin(v * 9) * Math.abs(a), v);
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function buildPetunias(rng) {
  const g = new THREE.Group(), toDispose = [];
  // the bowl: a foot, a full belly, a rolled rim, glazed inside; painted with a band of cream chevrons
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x2 = cv.getContext('2d');
  x2.fillStyle = '#b4603a'; x2.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 2600; i++) { x2.fillStyle = rng() < 0.5 ? `rgba(90,40,20,${rng() * 0.16})` : `rgba(235,170,120,${rng() * 0.14})`; x2.fillRect(rng() * 512, rng() * 128, 1 + rng() * 3, 1 + rng() * 2); }
  x2.fillStyle = 'rgba(70,28,14,0.35)'; x2.fillRect(0, 78, 512, 5); x2.fillRect(0, 44, 512, 3);
  x2.strokeStyle = '#ead9b0'; x2.lineWidth = 3.5; x2.beginPath(); for (let i = 0; i <= 32; i++) { const x = i * 16, y = i % 2 ? 50 : 74; if (!i) x2.moveTo(x, y); else x2.lineTo(x, y); } x2.stroke();
  x2.fillStyle = '#ead9b0'; for (let i = 0; i < 16; i++) { x2.beginPath(); x2.arc(i * 32 + 16, 56, 2.6, 0, TAU); x2.fill(); }
  for (let i = 0; i < 9; i++) { x2.fillStyle = `rgba(60,36,24,${0.08 + rng() * 0.1})`; x2.fillRect(rng() * 512, 84 + rng() * 10, 6 + rng() * 14, 44); }      // where watering has run down
  const pot = new THREE.CanvasTexture(cv); pot.colorSpace = THREE.SRGBColorSpace; pot.wrapS = THREE.RepeatWrapping; toDispose.push(pot);
  const prof = [[0.0, 0.012], [0.115, 0.012], [0.125, 0.0], [0.14, 0.0], [0.145, 0.02], [0.2, 0.07], [0.255, 0.14], [0.282, 0.2], [0.292, 0.226], [0.286, 0.238], [0.272, 0.236], [0.262, 0.215], [0.24, 0.17], [0, 0.165]];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), 48), new THREE.MeshStandardMaterial({ map: pot, roughness: 0.78, side: THREE.DoubleSide }));
  g.add(bowl);
  const soilMat = new THREE.MeshStandardMaterial({ color: '#2e2118', roughness: 1 });
  const soil = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 8, 0, TAU, 0, Math.PI / 2), soilMat); soil.scale.y = 0.14; soil.position.y = 0.17; g.add(soil);
  const crumbGeo = new THREE.DodecahedronGeometry(1, 0), crumbs = new THREE.InstancedMesh(crumbGeo, soilMat, 60);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), D = new THREE.Vector3();
  for (let i = 0; i < 60; i++) { const a = rng() * TAU, r = Math.sqrt(rng()) * 0.23; V.set(Math.cos(a) * r, 0.185 + rng() * 0.02, Math.sin(a) * r); E.set(rng() * 6, rng() * 6, rng() * 6); Q.setFromEuler(E); SC.setScalar(0.006 + rng() * 0.012); crumbs.setMatrixAt(i, M.compose(V, Q, SC)); }
  g.add(crumbs);
  // stems, leaves, flowers, buds
  const stemMat = new THREE.MeshStandardMaterial({ color: '#4c7f3c', roughness: 0.8 });
  const leaves = new THREE.InstancedMesh(leafGeo(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide }), 150);
  let nLeaf = 0; const lc = new THREE.Color();
  const addLeaf = (at, dir, size) => {
    if (nLeaf >= 150) return;
    D.copy(dir).normalize(); Q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), D); E.set(0, 0, rng() * TAU); Q.multiply(new THREE.Quaternion().setFromEuler(E));
    SC.set(size * (0.8 + rng() * 0.4), size, size); leaves.setMatrixAt(nLeaf, M.compose(at, Q, SC));
    lc.setHSL(0.28 + rng() * 0.06, 0.45 + rng() * 0.2, 0.2 + rng() * 0.13); leaves.setColorAt(nLeaf, lc); nLeaf++;
  };
  const kinds = [petuniaGeo('#d6399a', '#5a0f52', '#7a1466'), petuniaGeo('#7c3fd0', '#2a0f5e', '#3a1680'), petuniaGeo('#f4eef6', '#7b3fb0', '#8a3fc4'), petuniaGeo('#f06ab8', '#7a1850', '#ffffff')];
  const petalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
  const calyxGeo = new THREE.ConeGeometry(0.016, 0.035, 7), budGeo = new THREE.SphereGeometry(1, 10, 8), anther = new THREE.SphereGeometry(0.006, 6, 5), antherMat = new THREE.MeshStandardMaterial({ color: '#f2e27a', roughness: 0.6 });
  const NF = 19;
  for (let i = 0; i < NF; i++) {
    const az = i * 2.399 + rng() * 0.5, pol = i < 3 ? rng() * 0.25 : 0.25 + Math.sqrt((i - 2) / NF) * 1.2, len = (pol > 1.1 ? 0.3 : 0.17) + rng() * 0.1;
    const root = new THREE.Vector3(Math.cos(az) * 0.07 * (1 + pol), 0.185, Math.sin(az) * 0.07 * (1 + pol));
    D.set(Math.cos(az) * Math.sin(pol), Math.cos(pol), Math.sin(az) * Math.sin(pol));
    const head = root.clone().addScaledVector(D, len); if (pol > 1.1) head.y -= 0.06 * (pol - 1.1) * 4 * len;      // the trailing ones hang over the rim
    const mid = root.clone().lerp(head, 0.5); mid.y += 0.035;
    const curve = new THREE.QuadraticBezierCurve3(root, mid, head);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.0045, 5), stemMat));
    for (let k = 0; k < 6; k++) { const t = 0.12 + k * 0.15 + rng() * 0.05, at = curve.getPoint(t), tg = curve.getTangent(t); V.set(rng() - 0.5, rng() * 0.6, rng() - 0.5).addScaledVector(tg, 0.4); addLeaf(at, V, 0.055 + rng() * 0.045); }
    const tg = curve.getTangent(1), face = tg.clone().lerp(UP, 0.35).normalize();
    if (i % 6 === 5) {      // a bud
      const b = new THREE.Mesh(budGeo, new THREE.MeshStandardMaterial({ color: i % 2 ? '#8d4aa8' : '#c2569a', roughness: 0.6 })); b.scale.set(0.013, 0.034, 0.013); b.position.copy(head).addScaledVector(face, 0.03); b.quaternion.setFromUnitVectors(UP, face); g.add(b);
    } else {
      const f = new THREE.Mesh(kinds[i % kinds.length], petalMat); f.position.copy(head); f.quaternion.setFromUnitVectors(UP, face); f.scale.setScalar(0.95 + rng() * 0.5); g.add(f);
      for (let k = 0; k < 4; k++) { const a = new THREE.Mesh(anther, antherMat); a.position.copy(head).addScaledVector(face, 0.066 * f.scale.x); a.position.x += (rng() - 0.5) * 0.012; a.position.z += (rng() - 0.5) * 0.012; g.add(a); }
    }
    const cx = new THREE.Mesh(calyxGeo, stemMat); cx.position.copy(head).addScaledVector(face, 0.012); cx.quaternion.setFromUnitVectors(UP, face.clone().negate()); g.add(cx);
  }
  for (let i = 0; i < 40; i++) { const a = rng() * TAU, r = 0.1 + rng() * 0.17; V.set(Math.cos(a) * r, 0.2 + rng() * 0.05, Math.sin(a) * r); D.set(Math.cos(a), 0.5 + rng(), Math.sin(a)); addLeaf(V.clone(), D, 0.05 + rng() * 0.05); }
  leaves.count = nLeaf; leaves.instanceMatrix.needsUpdate = true; if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true; g.add(leaves);
  // what the fall has shaken loose: crumbs of soil, a torn petal or two, left behind above the bowl as it drops
  const loose = [];
  const petalBit = new THREE.CircleGeometry(0.022, 7), bitMats = ['#d6399a', '#7c3fd0', '#f4eef6'].map((cl) => new THREE.MeshStandardMaterial({ color: cl, roughness: 0.6, side: THREE.DoubleSide }));
  for (let i = 0; i < 26; i++) {
    const petal = i < 9, m = new THREE.Mesh(petal ? petalBit : crumbGeo, petal ? bitMats[i % 3] : soilMat); if (!petal) m.scale.setScalar(0.005 + rng() * 0.009);
    m.userData = { ph: rng(), x: (rng() - 0.5) * 0.5, z: (rng() - 0.5) * 0.5, sp: 0.5 + rng(), rate: petal ? 0.16 : 0.3 + rng() * 0.2 }; g.add(m); loose.push(m);
  }
  function update(time) {
    for (const m of loose) { const d = m.userData, age = (time * d.rate + d.ph) % 1; m.position.set(d.x * (0.4 + age) + Math.sin(time * d.sp + d.ph * 9) * 0.05, 0.25 + age * 2.6, d.z * (0.4 + age) + Math.cos(time * d.sp * 1.3) * 0.05); m.rotation.set(time * d.sp * 2, time * d.sp, d.ph * 6); m.visible = age > 0.02; }
  }
  return { group: g, update, dispose() { toDispose.forEach((t) => t.dispose()); } };
}

// ---------- shaders ----------
const NOISE = /* glsl */`
float h12(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h12(i), h12(i + vec2(1.0, 0.0)), f.x), mix(h12(i + vec2(0.0, 1.0)), h12(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 17.3; a *= 0.5; } return s / 0.9375; }
float ridge(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { float v = 1.0 - abs(vn(p) * 2.0 - 1.0); s += a * v * v; p = p * 2.1 + 9.1; a *= 0.5; } return s; }
`;
const WORLD_VERT = /* glsl */`
varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
`;
const SKY_FRAG = /* glsl */`
uniform vec3 uSun1, uSun2, uSunC1, uSunC2, uHaze;
varying vec3 vW;
${NOISE}
void main(){
  vec3 d = normalize(vW - cameraPosition);
  float e = d.y;
  vec3 zen = vec3(0.012, 0.018, 0.05), mid = vec3(0.10, 0.14, 0.30), hor = vec3(0.95, 0.62, 0.36);
  vec3 col = mix(mid, zen, smoothstep(0.08, 0.6, e));
  vec2 dz = normalize(d.xz + 1e-5);
  float toward1 = pow(max(dot(dz, normalize(uSun1.xz)), 0.0), 3.0), toward2 = pow(max(dot(dz, normalize(uSun2.xz)), 0.0), 5.0);
  // the limb's glow: a band of lit dust on the horizon, brightest under the suns
  float band = exp(-abs(e) * 13.0), wide = exp(-max(e, 0.0) * 4.5);
  col = mix(col, hor * (0.45 + 1.3 * toward1) + uSunC2 * 0.25 * toward2, band * 0.9);
  col += hor * wide * 0.16 * (0.4 + toward1);
  col = mix(col, uHaze, smoothstep(0.0, -0.06, e));
  // stars, where the sky is dark enough
  vec3 q = d * 210.0; vec3 id = floor(q); float hs = h12(id.xy + id.z * 37.0);
  float st = step(0.9972, hs) * smoothstep(0.42, 0.0, length(fract(q) - 0.5));
  col += vec3(0.8, 0.86, 1.0) * st * 1.6 * smoothstep(0.12, 0.45, e);
  // the two suns
  float c1 = max(dot(d, uSun1), 0.0), c2 = max(dot(d, uSun2), 0.0);
  col += uSunC1 * (smoothstep(0.99975, 0.99990, c1) * 14.0 + pow(c1, 900.0) * 2.2 + pow(c1, 60.0) * 0.55 + pow(c1, 8.0) * 0.16);
  col += uSunC2 * (smoothstep(0.99990, 0.99996, c2) * 12.0 + pow(c2, 1600.0) * 1.8 + pow(c2, 90.0) * 0.4 + pow(c2, 10.0) * 0.1);
  gl_FragColor = vec4(col, 1.0);
}
`;
const GROUND_FRAG = /* glsl */`
uniform vec3 uSun1, uSun2, uSunC1, uSunC2, uHaze;
uniform vec2 uField, uFieldRot, uShDir;
uniform vec4 uSh[12];
uniform float uFog, uTime;
varying vec3 vW;
${NOISE}
float crater(vec2 p, float cell, float seed, float dens){
  vec2 g = p / cell, id = floor(g); float h = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = id + vec2(float(i), float(j)); vec2 r = h22(c + seed);
    float has = step(1.0 - dens, h12(c * 1.7 + seed + 3.1));
    float rad = 0.16 + 0.27 * h12(c + seed + 9.7), d = length(g - (c + 0.5 + (r - 0.5) * 0.55)) / rad;
    float bowl = d < 1.0 ? -(1.0 - d * d) * 0.34 : 0.0;
    float rim = exp(-(d - 1.0) * (d - 1.0) / 0.022) * 0.14 + exp(-max(d - 1.0, 0.0) * 2.6) * 0.05 * step(1.0, d);
    float peak = exp(-d * d / 0.012) * 0.1 * step(0.36, rad);
    h += has * (bowl + rim + peak) * rad;
  }
  return h * cell;
}
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
const vec2 PAD1 = vec2(-250.0, 930.0), PAD2 = vec2(450.0, -930.0);
float fieldD(vec2 q){
  float d = sdBox(q, vec2(700.0, 430.0)) - 60.0;
  d = min(d, sdBox(q - vec2(1650.0, 0.0), vec2(1700.0, 58.0)));
  d = min(d, length(q - PAD1) - 265.0); d = min(d, length(q - PAD2) - 225.0);
  d = min(d, sdBox(q - vec2(-250.0, 560.0), vec2(42.0, 260.0))); d = min(d, sdBox(q - vec2(450.0, -560.0), vec2(42.0, 260.0)));
  return d;
}
vec2 toField(vec2 p){ vec2 v = p - uField; return vec2(v.x * uFieldRot.x + v.y * uFieldRot.y, -v.x * uFieldRot.y + v.y * uFieldRot.x); }
float height(vec2 p, float dist, float belt){
  float h = (fbm(p / 9000.0) - 0.5) * 520.0 + ridge(p / 3400.0 + 2.0) * 300.0 * belt;
  float dn = smoothstep(0.34, 0.66, fbm(p / 6500.0 + 44.0));
  h += crater(p, 2700.0, 1.0, 0.5);
  float m = 1.0 - smoothstep(-60.0, 160.0, fieldD(toField(p)));
  h = mix(h, 30.0, m * 0.95);
  h += crater(p, 830.0, 7.0, mix(0.1, 0.62, dn)) * (1.0 - smoothstep(10000.0, 24000.0, dist));
  if (dist < 8000.0) h += crater(p, 230.0, 13.0, mix(0.05, 0.5, dn)) * (1.0 - smoothstep(3500.0, 8000.0, dist)) * (1.0 - 0.6 * m);
  return h;
}
float bandf(float x, float a, float b){ return smoothstep(a - 1.5, a + 1.5, x) * (1.0 - smoothstep(b - 1.5, b + 1.5, x)); }
void main(){
  vec2 p = vW.xz; float dist = length(vW - cameraPosition);
  float belt = smoothstep(0.42, 0.68, fbm(p / 15000.0 + 31.0));
  float e = max(5.0, dist * 0.0045);
  float h0 = height(p, dist, belt), hx = height(p + vec2(e, 0.0), dist, belt), hz = height(p + vec2(0.0, e), dist, belt);
  vec3 N = normalize(vec3(-(hx - h0) / e, 1.0, -(hz - h0) / e));
  // the dust
  float n1 = fbm(p / 2300.0 + 5.0), n2 = fbm(p / 330.0), n3 = vn(p / 21.0);
  vec3 grey = vec3(0.23, 0.225, 0.235), ochre = vec3(0.40, 0.25, 0.11), gold = vec3(0.60, 0.43, 0.16);
  vec3 alb = mix(grey, ochre, smoothstep(0.3, 0.68, n1));
  alb = mix(alb, gold, smoothstep(0.5, 0.78, n2) * 0.4 * (0.4 + belt));
  alb *= 0.82 + 0.36 * mix(0.5, n3, 1.0 - smoothstep(600.0, 3000.0, dist));
  alb *= 0.72 + 0.28 * smoothstep(-260.0, 120.0, h0);
  alb = mix(alb, alb * 1.25 + 0.03, smoothstep(0.25, 0.6, 1.0 - N.y) * 0.5);      // bared rock on the steeps
  // the landing field: slabs, joints, cracks, what is left of its paint, and the dust that has drifted over it
  vec2 q = toField(p); float fd = fieldD(q);
  float drift = smoothstep(0.40, 0.66, fbm(p / 430.0 + 3.0));
  float fm = (1.0 - smoothstep(-10.0, 10.0, fd)) * (1.0 - drift * 0.88);
  if (fd < 40.0) {
    vec3 conc = vec3(0.36, 0.345, 0.32) * (0.8 + 0.4 * vn(floor(q / 60.0) * 3.7)) * (0.9 + 0.2 * vn(q / 9.0));
    vec2 jg = (0.5 - abs(fract(q / 60.0) - 0.5)) * 60.0;
    float near = 1.0 - smoothstep(2500.0, 7000.0, dist);
    conc *= 1.0 - 0.45 * (1.0 - smoothstep(1.0, 3.2, min(jg.x, jg.y))) * near;
    conc *= 1.0 - 0.4 * (1.0 - smoothstep(0.0, 0.03, abs(fbm(q / 150.0 + 2.0) - 0.5)));
    float wear = smoothstep(0.34, 0.62, fbm(q / 95.0 + 11.0));
    float r0 = length(q), r1 = length(q - PAD1), r2 = length(q - PAD2);
    float mk = bandf(r0, 300.0, 314.0) + bandf(r0, 120.0, 128.0) + bandf(r1, 236.0, 250.0) + bandf(r1, 96.0, 104.0) + bandf(r2, 196.0, 210.0) + bandf(r2, 80.0, 88.0);
    mk += (1.0 - smoothstep(3.0, 5.0, min(abs(q.x - PAD1.x), abs(q.y - PAD1.y)))) * step(r1, 96.0);
    mk += (1.0 - smoothstep(3.0, 5.0, min(abs(q.x - PAD2.x), abs(q.y - PAD2.y)))) * step(r2, 80.0);
    float ang = atan(q.y, q.x); mk += step(0.93, cos(ang * 12.0)) * bandf(r0, 314.0, 372.0);
    float onStrip = step(760.0, q.x) * step(abs(q.y), 58.0);
    mk += onStrip * ((1.0 - smoothstep(1.6, 3.0, abs(q.y))) * step(0.5, fract(q.x / 130.0)) + (1.0 - smoothstep(1.6, 3.0, abs(abs(q.y) - 49.0))));
    mk += onStrip * step(abs(fract(q.x / 650.0) - 0.5), 0.03) * step(abs(q.y), 40.0) * step(0.4, fract(q.y / 12.0));
    conc = mix(conc, vec3(0.78, 0.66, 0.34), clamp(mk, 0.0, 1.0) * wear * 0.75 * (1.0 - smoothstep(6000.0, 12000.0, dist)));
    alb = mix(alb, conc, fm);
  }
  // light: two low suns, the sky's blue from above; the ruin's long shadows
  float sh = 0.0;
  for (int i = 0; i < 12; i++) {
    vec4 s = uSh[i]; if (s.z <= 0.0) continue;
    vec2 pa = p - s.xy, ba = uShDir * s.z; float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float dd = length(pa - ba * t), wdt = s.w * (1.0 + 0.5 * t);
    sh = max(sh, (1.0 - smoothstep(wdt * 0.75, wdt * 1.25, dd)) * (1.0 - 0.45 * t));
  }
  float d1 = max(dot(N, uSun1), 0.0), d2 = max(dot(N, uSun2), 0.0);
  vec3 light = vec3(0.10, 0.12, 0.20) * (0.6 + 0.4 * N.y) + uSunC1 * pow(d1, 0.9) * 3.1 * (1.0 - 0.9 * sh) + uSunC2 * d2 * 1.5 * (1.0 - 0.6 * sh);
  vec3 col = alb * light;
  float f = dist * uFog; f = 1.0 - exp(-f * f);
  col = mix(col, uHaze, clamp(f + 0.06 * smoothstep(2000.0, 12000.0, dist), 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}
`;
const DECK_FRAG = /* glsl */`
uniform vec3 uSun1, uHaze, uLit, uShade;
uniform float uY, uTime, uCov, uSeed, uFog;
varying vec3 vW;
${NOISE}
void main(){
  vec2 p = vW.xz; float dist = length(vW - cameraPosition);
  vec2 w = p / 2500.0 + uSeed + vec2(uTime * 0.006, uTime * 0.002);
  vec2 ww = w + 0.55 * vec2(fbm(w * 1.6 + 3.0), fbm(w * 1.6 + 8.0));
  float n = fbm(ww) * 0.8 + 0.2 * fbm(ww * 4.3);
  float a = smoothstep(uCov, uCov + 0.2, n);
  if (a < 0.004) discard;
  float ns = fbm(ww + normalize(uSun1.xz) * 0.09);
  float lit = clamp(0.55 + (n - ns) * 5.0, 0.0, 1.0);
  vec3 col = mix(uShade, uLit, lit) * (0.75 + 0.5 * smoothstep(uCov, uCov + 0.4, n));
  float below = step(cameraPosition.y, uY);
  col = mix(col, uShade * 0.75 + uLit * 0.12, below * 0.6);
  a *= mix(0.86, 0.6, below);
  a *= smoothstep(8.0, 170.0, abs(cameraPosition.y - uY));       // the sheet thins to nothing as the eye goes through it
  a *= 1.0 - smoothstep(30000.0, 46000.0, dist);
  float f = dist * uFog; f = 1.0 - exp(-f * f);
  col = mix(col, uHaze, f);
  gl_FragColor = vec4(col, a);
}
`;

function softTexture(blobs, rng) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < blobs; i++) {
    const x = blobs === 1 ? 64 : 34 + rng() * 60, y = blobs === 1 ? 64 : 48 + rng() * 34, r = blobs === 1 ? 64 : 18 + rng() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default {
  id: 'whale-and-petunias',
  name: 'A Whale and a Bowl of Petunias',
  category: 'books',
  placeKind: 'sky',
  book: "The Hitchhiker's Guide to the Galaxy",
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.85,
  media: ['air'],
  async build(ctx) {
    const { rng } = ctx, detail = ctx.quality?.detail ?? 1;
    const R2 = (label) => (rng.fork ? rng.fork(label) : rng);
    const scene = new THREE.Scene();
    const HAZE = new THREE.Color('#a57c55');
    scene.background = new THREE.Color('#05070f');
    scene.fog = new THREE.FogExp2(HAZE, FOG);

    // ---- the road: a little over one right-hand turn, 3,000 m down to 700 m, level at both ends ----
    const R = 1100, CX = R, TURN = 6.6, Y0 = 3000, Y1 = 700, pts = [[0, Y0, 260]];
    for (let i = 0; i <= 16; i++) { const s = i / 16, a = s * TURN, ease = mix(s, sm(0, 1, s), 0.4); pts.push([CX - R * Math.cos(a), Y0 - (Y1 - 0 > 0 ? (Y0 - Y1) : 0) * ease, -R * Math.sin(a)]); }
    const endDir = new THREE.Vector3(Math.sin(TURN), 0, -Math.cos(TURN));
    { const l = pts[pts.length - 1]; pts.push([l[0] + endDir.x * 170, Y1, l[2] + endDir.z * 170], [l[0] + endDir.x * 340, Y1, l[2] + endDir.z * 340]); }
    const path = makePath(pts), LEN = path.length;
    const END = path.end.clone();
    await ctx.yield();

    // ---- the suns: the greater one ahead and to the left at mid flight (the whale wears its light as a rim), behind us at the end ----
    const dirOf = (az, el) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const az1 = 0.5 + (rng() - 0.5) * 0.3, SUN1 = dirOf(az1, 0.155), SUN2 = dirOf(az1 + (rng() < 0.5 ? -1 : 1) * (0.38 + rng() * 0.12), 0.085);
    const SUNC1 = new THREE.Color(1.0, 0.82, 0.58), SUNC2 = new THREE.Color(1.0, 0.42, 0.26);
    const U = { uSun1: { value: SUN1 }, uSun2: { value: SUN2 }, uSunC1: { value: SUNC1 }, uSunC2: { value: SUNC2 }, uHaze: { value: HAZE }, uFog: { value: FOG }, uTime: { value: 0 } };

    const skyGeo = new THREE.SphereGeometry(40000, 40, 24);
    const sky = new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: WORLD_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false }));
    sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

    scene.add(new THREE.HemisphereLight(new THREE.Color('#9fb0e0'), new THREE.Color('#b08458'), Math.PI * 0.85));
    const mkDir = (col, k, dir) => { const d = new THREE.DirectionalLight(col, Math.PI * k); d.position.copy(dir).multiplyScalar(1000); scene.add(d, d.target); return d; };
    mkDir(new THREE.Color('#ffdcae'), 1.25, SUN1); mkDir(new THREE.Color('#ff8a5e'), 0.5, SUN2);
    mkDir(new THREE.Color('#c9a27a'), 0.22, new THREE.Vector3(-SUN1.x, -0.6, -SUN1.z));      // the lit dust below, shining up under the belly
    await ctx.yield();

    // ---- the ground and the ruined field, 1.9 km on past the exit ----
    const FIELD = new THREE.Vector2(END.x + endDir.x * 1900, END.z + endDir.z * 1900), fAng = Math.atan2(endDir.z, endDir.x) + 0.35;
    const fc = Math.cos(fAng), fs = Math.sin(fAng);
    const fieldToWorld = (qx, qy) => [FIELD.x + qx * fc - qy * fs, FIELD.y + qx * fs + qy * fc];
    const shadows = []; for (let i = 0; i < 12; i++) shadows.push(new THREE.Vector4(0, 0, 0, 0));
    const shDir = new THREE.Vector2(-SUN1.x, -SUN1.z).normalize(), shLen = 1 / Math.tan(0.155);
    const GU = { ...U, uField: { value: FIELD }, uFieldRot: { value: new THREE.Vector2(fc, fs) }, uSh: { value: shadows }, uShDir: { value: shDir } };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(150000, 150000, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: GU, vertexShader: WORLD_VERT, fragmentShader: GROUND_FRAG, fog: false }));
    ground.position.set(CX, 0, 0); ground.renderOrder = -5; ground.frustumCulled = false; scene.add(ground);
    await ctx.yield();

    // the ruin itself: a leaning tower, hangar vaults half drifted over, gantries standing and fallen, a hull on its pad,
    // and the broken cradle ring of something much larger that was once built here
    const ruin = new THREE.Group(); scene.add(ruin);
    const RR = R2('ruin');
    const stone = new THREE.MeshStandardMaterial({ color: '#8d8272', roughness: 0.95 }), rust = new THREE.MeshStandardMaterial({ color: '#6b5646', roughness: 0.9 }), shell = new THREE.MeshStandardMaterial({ color: '#7f7668', roughness: 0.9, side: THREE.DoubleSide });
    let nSh = 0; const cast = (x, z, h, w) => { if (nSh < 12) shadows[nSh++].set(x, z, h * shLen, w); };
    const at = (obj, qx, qy, y = 0) => { const w = fieldToWorld(qx, qy); obj.position.set(w[0], y + 30, w[1]); ruin.add(obj); return w; };
    { const tower = new THREE.Mesh(new THREE.CylinderGeometry(15, 26, 290, 14), stone); tower.rotation.set(0.06, 0, -0.08); const w = at(tower, -520, -250, 140); cast(w[0], w[1], 290, 24);
      const cab = new THREE.Mesh(new THREE.CylinderGeometry(34, 22, 30, 12), rust); cab.rotation.set(0.3, 0, -0.25); at(cab, -532, -262, 292);
      const beaconTex = softTexture(1, rng), beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: beaconTex, color: new THREE.Color(4, 0.5, 0.3), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); beacon.scale.setScalar(70); at(beacon, -536, -266, 320); ruin.userData.beacon = beacon; ruin.userData.beaconTex = beaconTex; }
    for (let i = 0; i < 6; i++) {      // the hangar vaults
      const len = 260 * (i === 2 ? 0.45 : i === 4 ? 0.7 : 1), v = new THREE.Mesh(new THREE.CylinderGeometry(88, 88, len, 20, 1, true, 0, Math.PI), shell);
      v.rotation.set(0, -fAng + Math.PI / 2, Math.PI / 2); const w = at(v, -560 + i * 215, 560 + (260 - len) * 0.5, -6 - RR() * 14); if (i % 2 === 0) cast(w[0], w[1], 80, 120);
    }
    for (let i = 0; i < 9; i++) {      // gantries along the strip
      const h = 150 + RR() * 110, fallen = RR() < 0.4, g = new THREE.Mesh(new THREE.BoxGeometry(11, h, 11), rust);
      const qx = 900 + i * 300 + RR() * 80, qy = (i % 2 ? 1 : -1) * (120 + RR() * 40);
      if (fallen) { g.rotation.set(Math.PI / 2 - 0.06, RR() * 3, 0); at(g, qx, qy, 8); } else { g.rotation.set((RR() - 0.5) * 0.12, RR(), (RR() - 0.5) * 0.12); const w = at(g, qx, qy, h / 2); cast(w[0], w[1], h, 9);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(70, 7, 7), rust); arm.rotation.y = RR() * 3; at(arm, qx, qy, h * 0.86); }
    }
    { const hull = new THREE.Mesh(new THREE.CapsuleGeometry(34, 250, 8, 18), stone); hull.rotation.set(0, -fAng + 0.6, Math.PI / 2 - 0.05); const w = at(hull, 450, -930, 26); cast(w[0], w[1], 62, 130);
      for (let k = 0; k < 3; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(6, 70, 46), rust); fin.rotation.set(k * 2.1, -fAng + 0.6, 0); at(fin, 450 - 110 * Math.cos(0.6), -930 + 110 * Math.sin(0.6), 30); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(430, 17, 10, 60, Math.PI * 0.83), stone); ring.rotation.set(0, -fAng + 1.1, 0); const w2 = at(ring, -250, 930, -40); cast(w2[0], w2[1], 380, 150);
      const stub = new THREE.Mesh(new THREE.TorusGeometry(430, 17, 10, 14, Math.PI * 0.12), stone); stub.rotation.set(Math.PI / 2, 0, 0.4); at(stub, 40, 1180, 6); }
    { const junk = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), rust, 150), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3();
      for (let i = 0; i < 150; i++) { const w = fieldToWorld((RR() - 0.35) * 3200, (RR() - 0.5) * 2100); V.set(w[0], 30 + RR() * 6, w[1]); E.set(RR() * 0.6, RR() * 6, RR() * 0.6); Q.setFromEuler(E); SC.set(6 + RR() * 40, 4 + RR() * 22, 6 + RR() * 30); junk.setMatrixAt(i, M.compose(V, Q, SC)); }
      ruin.add(junk); }
    await ctx.yield();

    // ---- four thin decks of cloud, each a sheet we fall through, with heaped tops standing on them ----
    const DECKS = [2520, 1930, 1380, 930], deckMats = [];
    const LIT = new THREE.Color(1.08, 0.86, 0.64), SHADE = new THREE.Color(0.26, 0.23, 0.33);
    DECKS.forEach((y, i) => {
      const m = new THREE.ShaderMaterial({ uniforms: { ...U, uY: { value: y }, uCov: { value: [0.54, 0.5, 0.56, 0.52][i] + (rng() - 0.5) * 0.04 }, uSeed: { value: 10 + i * 37.3 + rng() * 9 }, uLit: { value: LIT }, uShade: { value: SHADE } },
        vertexShader: WORLD_VERT, fragmentShader: DECK_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const d = new THREE.Mesh(new THREE.PlaneGeometry(100000, 100000).rotateX(-Math.PI / 2), m); d.position.set(CX, y, 0); d.frustumCulled = false; d.renderOrder = 2 + i; scene.add(d); deckMats.push(m);
    });
    const puffTex = softTexture(7, R2('puff')), puffTex2 = softTexture(5, R2('puff2')), wispTex = softTexture(1, rng);
    const puffMats = [puffTex, puffTex2].map((t) => new THREE.SpriteMaterial({ map: t, color: new THREE.Color(1.0, 0.84, 0.66), transparent: true, opacity: 0.5, depthWrite: false }));
    { const CR = R2('clouds'), n = Math.round(240 * Math.min(1.3, Math.max(0.5, detail)));
      for (let i = 0; i < n; i++) {
        const a = CR() * TAU, r = 300 + Math.sqrt(CR()) * 7500, w = 280 + CR() * 760, h = w * (0.28 + CR() * 0.2), y = DECKS[i % 4] + h * 0.25 + CR() * 40;
        const x = CX + Math.cos(a) * r, z = Math.sin(a) * r;
        if (path.distanceTo(x, y, z) < w * 0.5 + 110) continue;
        const s = new THREE.Sprite(puffMats[i % 2]); s.position.set(x, y, z); s.scale.set(w, h, 1); s.renderOrder = 6; scene.add(s);
      } }
    // the veil: what the eye is inside of for the second it takes to drop through a deck
    const veil = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.86, 0.7), transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false }));
    veil.renderOrder = 50; veil.frustumCulled = false; scene.add(veil);
    await ctx.yield();

    // ---- the air going up past us: fine streaks, and rags of vapour ----
    const WR = R2('wind'), NSTR = Math.round(650 * Math.min(1.4, Math.max(0.5, detail))), SB = 55;
    const sRel = new Float32Array(NSTR * 3), sLen = new Float32Array(NSTR), sPos = new Float32Array(NSTR * 6);
    for (let i = 0; i < NSTR; i++) { sRel[i * 3] = (WR() * 2 - 1) * SB; sRel[i * 3 + 1] = (WR() * 2 - 1) * SB; sRel[i * 3 + 2] = (WR() * 2 - 1) * SB; sLen[i] = 0.8 + WR() * 2.2; }
    const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    const streaks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(1.2, 1.05, 0.9), transparent: true, opacity: 0.11, depthWrite: false, fog: false }));
    streaks.frustumCulled = false; streaks.renderOrder = 20; scene.add(streaks);
    const NW = 30, WB = 110, wisps = [];
    for (let i = 0; i < NW; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 2 ? puffTex : wispTex, color: new THREE.Color(1.1, 0.95, 0.8), transparent: true, opacity: 0, depthWrite: false, fog: false }));
      s.userData = { r: new THREE.Vector3((WR() * 2 - 1) * WB, (WR() * 2 - 1) * WB, (WR() * 2 - 1) * WB), k: 0.06 + WR() * 0.09, sz: 16 + WR() * 34 }; s.scale.set(s.userData.sz * 1.6, s.userData.sz, 1); s.renderOrder = 21; scene.add(s); wisps.push(s); }

    // ---- the two who fall ----
    const whale = buildWhale(R2('whale')); whale.group.scale.set(1.28, 1.3, 1.14); scene.add(whale.group);
    const bowl = buildPetunias(R2('petunias')); bowl.group.scale.setScalar(1.55); scene.add(bowl.group);
    // the whale's breath and the damp of its hide, torn off upward
    const NV = 34, vap = [];
    for (let i = 0; i < NV; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 3 ? wispTex : puffTex, color: new THREE.Color(1.15, 1.0, 0.86), transparent: true, opacity: 0, depthWrite: false, fog: false }));
      s.userData = { ph: i / NV + WR() * 0.03, vent: whale.vents[i % whale.vents.length], rate: 0.35 + WR() * 0.2, w: new THREE.Vector3() }; s.renderOrder = 22; scene.add(s); vap.push(s); }
    await ctx.yield();

    // ---- where they are, by the road's own point for this u ----
    const P = new THREE.Vector3(), T = new THREE.Vector3(), Th = new THREE.Vector3(), Rt = new THREE.Vector3(), eye = new THREE.Vector3(), wind = new THREE.Vector3(), wn = new THREE.Vector3();
    const frame = (u) => { const d = Math.min(1, Math.max(0, u)) * LEN; path.posAtDist(d, P); path.tangentAtDist(d, T); Th.set(T.x, 0, T.z); if (Th.lengthSq() < 1e-6) Th.set(0, 0, -1); Th.normalize(); Rt.set(-Th.z, 0, Th.x); };
    const put = (out, ahead, side, drop) => { out.copy(P).addScaledVector(Th, ahead).addScaledVector(Rt, side); out.y += drop; return out; };
    const whaleAt = (u, out) => { frame(u); const late = sm(0.66, 0.96, u);
      return put(out, 92 - 67 * sm(0.02, 0.32, u) + 62 * late, 22 - 15 * sm(0.05, 0.35, u) + 42 * late, -15 + 8 * sm(0.05, 0.35, u) - 46 * late); };
    const bowlAt = (u, out) => { frame(u); const pass = sm(0.72, 0.9, u);
      return put(out, 27 - 20.5 * sm(0.28, 0.58, u) - 15 * pass, -5 + 2.6 * sm(0.28, 0.58, u) + 0.85 * pass, -2.4 - 0.3 * sm(0.28, 0.58, u) + 1.9 * pass); };
    const WP = new THREE.Vector3(), BP = new THREE.Vector3(), g1 = new THREE.Vector3(), g2 = new THREE.Vector3(), g3 = new THREE.Vector3();
    const pois = [
      { at: (time, u) => { frame(u); return put(g1, 2500, 0, -260); }, from: -0.6, to: 1.6, fade: 0.2, weight: 0.5, steady: true },
      { at: (time, u) => whaleAt(u, g2), from: 0.03, to: 0.76, fade: 0.3, weight: 0.5 },
      { at: (time, u) => bowlAt(u, g3), from: 0.5, to: 0.8, fade: 0.35, weight: 0.32 },
    ];

    let lastT = 0;
    function update(dt, time, camera, u) {
      const uu = Math.min(1, Math.max(0, u || 0)); U.uTime.value = time;
      camera.getWorldPosition(eye); sky.position.copy(eye);
      const through = !!ctx.through;
      // the whale: heading across our bows and a little down, rolling slowly, never still
      whaleAt(uu, WP); whale.group.position.copy(WP);
      const yawF = Math.atan2(Th.x, Th.z);
      whale.group.rotation.order = 'YXZ';
      whale.group.rotation.set(0.2 + 0.14 * Math.sin(time * 0.21) + 0.55 * sm(0.66, 0.96, uu), yawF + 1.3 + 0.22 * Math.sin(time * 0.13 + 1) - 0.7 * (uu - 0.5), 0.28 * Math.sin(time * 0.17 + 2) + 0.22);
      whale.update(time);
      // the bowl: upright, more or less, turning
      bowlAt(uu, BP); bowl.group.position.copy(BP);
      bowl.group.rotation.set(0.32 * Math.sin(time * 0.5), time * 0.45, 0.28 * Math.cos(time * 0.41) + 0.12);
      bowl.update(time);
      // vapour off the whale's back
      whale.group.updateMatrixWorld();
      for (const s of vap) { const d = s.userData, age = (time * d.rate + d.ph) % 1;
        if (age < 0.04 || d.w.lengthSq() === 0) d.w.copy(d.vent).applyMatrix4(whale.group.matrixWorld);
        else { d.w.x += (WP.x - (d.px ?? WP.x)); d.w.z += (WP.z - (d.pz ?? WP.z)); d.w.y += (WP.y - (d.py ?? WP.y)); }      // it goes with the whale across the sky and is left behind only upward
        d.px = WP.x; d.py = WP.y; d.pz = WP.z;
        s.position.copy(d.w); s.position.y += age * 30; s.position.addScaledVector(Th, -age * 9);
        const sz = 1.6 + age * 11; s.scale.set(sz, sz, 1); s.material.opacity = through ? 0 : 0.26 * sm(0, 0.12, age) * (1 - age) * (1 - age); }
      // the air: up and a little aft
      const step = Math.min(0.1, Math.max(0, time - lastT)); lastT = time;
      wind.set(-Th.x * 22, 58, -Th.z * 22); wn.copy(wind).normalize();
      for (let i = 0; i < NSTR; i++) { const o = i * 3;
        let x = sRel[o] + wind.x * step, y = sRel[o + 1] + wind.y * step, z = sRel[o + 2] + wind.z * step;
        if (x > SB) x -= 2 * SB; else if (x < -SB) x += 2 * SB; if (y > SB) y -= 2 * SB; else if (y < -SB) y += 2 * SB; if (z > SB) z -= 2 * SB; else if (z < -SB) z += 2 * SB;
        sRel[o] = x; sRel[o + 1] = y; sRel[o + 2] = z; const p = i * 6, l = sLen[i];
        sPos[p] = eye.x + x; sPos[p + 1] = eye.y + y; sPos[p + 2] = eye.z + z; sPos[p + 3] = eye.x + x - wn.x * l; sPos[p + 4] = eye.y + y - wn.y * l; sPos[p + 5] = eye.z + z - wn.z * l; }
      sGeo.attributes.position.needsUpdate = true; streaks.visible = !through;
      for (const s of wisps) { const d = s.userData, r = d.r; r.addScaledVector(wind, step * 0.85);
        if (r.x > WB) r.x -= 2 * WB; else if (r.x < -WB) r.x += 2 * WB; if (r.y > WB) r.y -= 2 * WB; else if (r.y < -WB) r.y += 2 * WB; if (r.z > WB) r.z -= 2 * WB; else if (r.z < -WB) r.z += 2 * WB;
        s.position.copy(eye).add(r); const dist = r.length(); s.material.opacity = through ? 0 : d.k * sm(9, 34, dist) * (1 - sm(WB * 0.7, WB, dist)); }
      // the decks, as the eye goes through each
      let v = 0; for (const y of DECKS) { const dy = (eye.y - y) / 55; v = Math.max(v, Math.exp(-dy * dy)); }
      veil.position.copy(eye); veil.material.opacity = through ? 0 : v * 0.5; veil.visible = v > 0.01 && !through;
      const bc = ruin.userData.beacon; if (bc) bc.material.opacity = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(time * 1.4)), 12);
    }

    return {
      scene, path, duration: DUR,
      camera: { fov: 62, near: 0.3, far: 60000, lookAhead: 34, sway: 0.12, bank: 0.14 },
      pois,
      portal: { shape: 'circle', radius: 9, color: '#ffe6c0', glow: 0.4 },
      post: { exposure: 1.05, bloom: { strength: 0.42, radius: 0.85, threshold: 0.95 },
        grade: { saturation: 1.06, contrast: 1.06, vignette: 0.24, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() {
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose()); });
        whale.dispose(); bowl.dispose(); puffTex.dispose(); puffTex2.dispose(); wispTex.dispose(); if (ruin.userData.beaconTex) ruin.userData.beaconTex.dispose();
      },
    };
  },
};
