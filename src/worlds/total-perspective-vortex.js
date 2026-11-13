// The Total Perspective Vortex. We start beside a small steel box on a dead grey plain (a piece of fairy cake stands
// on a plinth beside it, wired in: the Vortex extrapolates the whole of creation from it) and fly straight on through
// that whole, laid out along -Z at faked scales: a blue planet and its cratered moon, a sun with its planets, belt and
// comet, a barred spiral galaxy with its dust lanes, clusters and dwarfs, and then the cosmic web, a thousand galaxies
// strung on filaments round empty voids. In the web one tiny dot wears a circle, tick marks and a label: you are here.
import * as THREE from 'three';
import { makePath, makeNoise } from '../kit/core.js';

const PTS = [
  [0, 4, 0], [0, 4, -120], [0, 40, -360], [-20, 220, -820], [40, 400, -1500], [110, 560, -2400],
  [20, 800, -3600], [-100, 930, -4800], [0, 840, -6200], [60, 870, -7800], [0, 900, -9400], [-40, 900, -10600], [-40, 900, -11200],
];
const SUN = new THREE.Vector3(560, 330, -2500);
const GAL = new THREE.Vector3(60, 560, -5400);
const HERE = new THREE.Vector3(40, 915, -10480);

const GLSL_N = /* glsl */`
float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
float cell(vec3 p){ vec3 i = floor(p), f = fract(p); float d = 1.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(float(x), float(y), float(z)); vec3 o = vec3(h31(i + g), h31(i + g + 7.1), h31(i + g + 13.3)); d = min(d, length(g + o - f)); }
  return d; }
`;
const BODY_VERT = /* glsl */`
varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){ vL = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
`;

// ---- points: soft round dots, each with its own size and colour
function makePoints(pos, col, size, o = {}) {
  const n = pos.length / 3, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos instanceof Float32Array ? pos : new Float32Array(pos), 3));
  geo.setAttribute('aCol', new THREE.BufferAttribute(col instanceof Float32Array ? col : new Float32Array(col), 3));
  let sz = size; if (typeof size === 'number') { sz = new Float32Array(n).fill(size); } else if (!(size instanceof Float32Array)) sz = new Float32Array(size);
  geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 600 }, uOpacity: { value: o.opacity ?? 1 }, uNear: { value: o.near ?? 0 }, uMax: { value: o.max ?? 96 }, uFlat: { value: o.flat ? 1 : 0 }, uSharp: { value: o.sharp ?? 3.5 } },
    vertexShader: /* glsl */`
      attribute vec3 aCol; attribute float aSize; uniform float uScale, uNear, uMax, uFlat; varying vec3 vCol; varying float vFade;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = max(-mv.z, 0.001); vCol = aCol;
        float ps = uFlat > 0.5 ? aSize : aSize * uScale / d;
        vFade = clamp(ps * ps / 1.7, 0.2, 1.0); if (uNear > 0.0) vFade *= smoothstep(uNear * 0.2, uNear, d);
        gl_PointSize = clamp(ps, 1.3, uMax); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      uniform float uOpacity, uSharp; varying vec3 vCol; varying float vFade;
      void main(){ vec2 c = gl_PointCoord - 0.5; float r2 = dot(c, c) * 4.0; if (r2 > 1.0) discard;
        float a = exp(-r2 * uSharp) * (1.0 - r2); gl_FragColor = vec4(vCol, a * vFade * uOpacity); }`,
    transparent: true, depthWrite: false, blending: o.dark ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; if (o.order != null) p.renderOrder = o.order; return p;
}

function circlePts(r, n = 96, a0 = 0, a1 = Math.PI * 2) { const a = []; for (let k = 0; k <= n; k++) { const t = a0 + (a1 - a0) * k / n; a.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0)); } return a; }
function bandTexture(rng, stops, turb = 0.5) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d'), A = new THREE.Color(), B = new THREE.Color();
  let y = 0, i = 0;
  while (y < 256) { const hgt = 4 + Math.floor(rng() * 26); A.set(stops[i % stops.length]); B.set(stops[(i + 1) % stops.length]); A.lerp(B, rng() * turb);
    g.fillStyle = '#' + A.getHexString(); g.fillRect(0, y, 8, hgt); y += hgt; i += 1 + Math.floor(rng() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function labelTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 128); g.font = '600 64px Georgia, serif'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,244,200,1)'; g.fillText(text, 8, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default {
  id: 'total-perspective-vortex',
  name: 'The Total Perspective Vortex',
  category: 'books',
  placeKind: 'sky',
  book: 'The Restaurant at the End of the Universe',
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.9,
  media: ['space'],
  async build(ctx) {
    const rng = ctx.rng, detail = ctx.quality?.detail ?? 1;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
    const path = makePath(PTS);
    const noise = makeNoise(Math.floor(rng() * 1e9));
    const C = new THREE.Color(), C2 = new THREE.Color();
    const pointLayers = [], timed = [], billboards = [];
    const addPoints = (parent, ...a) => { const p = makePoints(...a); parent.add(p); pointLayers.push(p); return p; };
    const uSun = { value: SUN.clone() }, uTime = { value: 0 };

    // ---- light: the sun down the road is the one lamp for everything solid
    scene.add(new THREE.AmbientLight(0x7888a8, 0.22));
    const key = new THREE.PointLight(0xfff0d8, Math.PI * 0.95, 0, 0); key.position.copy(SUN); scene.add(key);
    scene.add(new THREE.HemisphereLight(0x1a2030, 0x0a0806, Math.PI * 0.12));

    // =====================================================================================================
    // THE DEAD PLAIN
    // =====================================================================================================
    const CRATERS = []; for (let i = 0; i < 14; i++) { let x = rng.range(-520, 520); if (Math.abs(x) < 60) x += x < 0 ? -70 : 70; CRATERS.push([x, rng.range(-900, 150), rng.range(14, 55)]); }
    const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const ground = (x, z) => {
      const ax = Math.abs(x), lane = sstep(7, 60, ax);
      let h = 0.35 * noise.fbm2(x * 0.09, z * 0.09, 3) + lane * (3.2 * noise.fbm2(x * 0.012, z * 0.012, 4) + 1.1 * noise.fbm2(x * 0.05, z * 0.05, 3));
      const far = sstep(330, 820, Math.hypot(x, z + 250)) * sstep(60, 240, ax);
      h += far * (22 + 60 * noise.ridged2(x * 0.0035 + 4, z * 0.0035, 4));
      for (const c of CRATERS) { const d = Math.hypot(x - c[0], z - c[1]) / c[2]; if (d < 1.5) h += c[2] * (-0.2 * (1 - sstep(0, 1, d)) + 0.07 * Math.exp(-((d - 1) * (d - 1)) * 22)); }
      return h;
    };
    {
      const g = new THREE.PlaneGeometry(1900, 1900, 190, 190); g.rotateX(-Math.PI / 2); g.translate(0, 0, -420);
      const p = g.attributes.position, cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), h = ground(x, z); p.setY(i, h);
        const k = 0.34 + 0.1 * noise.fbm2(x * 0.02 + 9, z * 0.02, 3) + 0.05 * noise.n2(x * 0.3, z * 0.3) + Math.min(0.12, Math.max(-0.08, h * 0.004));
        cols[i * 3] = k * 1.0; cols[i * 3 + 1] = k * 0.98; cols[i * 3 + 2] = k * 1.04;
        if ((i & 8191) === 0) await ctx.yield();
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, vertexColors: true })));
      // stones and boulders
      const sg = new THREE.DodecahedronGeometry(1, 0), sm = new THREE.MeshStandardMaterial({ color: 0x77777f, roughness: 1, flatShading: true });
      const n = Math.round(900 * detail), stones = new THREE.InstancedMesh(sg, sm, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        let x = rng.gauss() * 190, z = rng.range(-760, 60); if (Math.abs(x) < 6.5) x += x < 0 ? -8 : 8;
        const big = rng() < 0.06 && Math.abs(x) > 26, r = big ? rng.range(3, 8) : rng.range(0.2, 1.7);
        e.set(rng() * 6, rng() * 6, rng() * 6); q.setFromEuler(e);
        m.compose(v.set(x, ground(x, z) + r * 0.25, z), q, s.set(r, r * rng.range(0.45, 0.85), r * rng.range(0.7, 1.2))); stones.setMatrixAt(i, m);
        C.setScalar(rng.range(0.55, 1.05)); stones.setColorAt(i, C);
      }
      scene.add(stones);
      // the ruins on the horizon: a dead city's stumps, leaning
      const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0);
      const bm = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.95 }), nT = 150, towers = new THREE.InstancedMesh(bg, bm, nT);
      for (let i = 0; i < nT; i++) {
        const a = rng() * Math.PI * 2, r = rng.range(330, 800); let x = Math.cos(a) * r, z = Math.sin(a) * r - 250; if (Math.abs(x) < 130) x += x < 0 ? -150 : 150;
        const w = rng.range(8, 26), hgt = rng.range(14, 95) * (rng() < 0.2 ? 1.6 : 1);
        e.set(rng.gauss() * 0.06, rng() * 3, rng.gauss() * 0.08); q.setFromEuler(e);
        m.compose(v.set(x, ground(x, z) - 4, z), q, s.set(w, hgt, w * rng.range(0.6, 1.3))); towers.setMatrixAt(i, m);
        C.setScalar(rng.range(0.6, 1.1)); towers.setColorAt(i, C);
      }
      scene.add(towers);
      // low dust lying over the plain
      const nd = Math.round(1400 * detail), dp = new Float32Array(nd * 3), dc = new Float32Array(nd * 3);
      for (let i = 0; i < nd; i++) { const x = rng.gauss() * 260, z = rng.range(-900, 40); dp[i * 3] = x; dp[i * 3 + 1] = ground(x, z) + rng.range(0.3, 9); dp[i * 3 + 2] = z; const k = rng.range(0.02, 0.06); dc[i * 3] = k; dc[i * 3 + 1] = k; dc[i * 3 + 2] = k * 1.1; }
      addPoints(scene, dp, dc, 26, { near: 60, max: 90, sharp: 1.6 });
    }
    await ctx.yield();

    // =====================================================================================================
    // THE VORTEX: a steel box, its one door, its plant, and the fairy cake it reads the universe from
    // =====================================================================================================
    let lamp = null, slit = null;
    {
      const steel = new THREE.MeshStandardMaterial({ color: 0xb4bcc6, roughness: 0.42, metalness: 0.45 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.6, metalness: 0.4 });
      const rubber = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.9 });
      const box = new THREE.Group(), add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); box.add(o); return o; };
      add(new THREE.BoxGeometry(7.4, 0.5, 7.4), dark, 0, 0.25, 0);                       // the footing
      add(new THREE.BoxGeometry(6, 8, 6), steel, 0, 4.5, 0);                             // the box
      add(new THREE.BoxGeometry(6.5, 0.4, 6.5), dark, 0, 8.7, 0);                        // the cap
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.35, 8, 0.35), dark, sx * 3.02, 4.5, sz * 3.02);      // corner straps
      for (const y of [2.6, 6.4]) { add(new THREE.BoxGeometry(6.12, 0.22, 6.12), dark, 0, y, 0); }      // bands
      // rivets on the front and the two sides
      const rv = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), dark, 3 * 2 * 14), mm = new THREE.Matrix4(); let ri = 0;
      for (const face of [0, 1, 2]) for (const y of [2.9, 6.1]) for (let k = 0; k < 14; k++) {
        const t = -2.7 + k * 5.4 / 13; if (face === 0) mm.makeTranslation(t, y, 3.03); else mm.makeTranslation(face === 1 ? 3.03 : -3.03, y, t); rv.setMatrixAt(ri++, mm); }
      box.add(rv);
      // the door: a frame, the leaf a hand ajar, and the light inside
      add(new THREE.BoxGeometry(2.9, 5.4, 0.2), dark, 0, 3.2, 3.02);
      slit = add(new THREE.PlaneGeometry(2.3, 4.8), new THREE.MeshBasicMaterial({ color: 0xbfe0ff }), 0, 3.2, 3.13);
      const leaf = add(new THREE.BoxGeometry(2.3, 4.8, 0.14), steel, -0.28, 3.2, 3.42, 0, -0.34, 0);
      add(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12), dark, 0.35, 3.2, 3.62, Math.PI / 2, -0.34, 0);      // the wheel on the door
      leaf.castShadow = false;
      for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(3.6 - k * 0.3, 0.3, 1.1), dark, 0, 0.65 - k * 0.3 + 0.3, 3.9 + k * 0.9);      // steps (lowest furthest)
      lamp = add(new THREE.SphereGeometry(0.24, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff5a30 }), 0, 6.5, 3.12);
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), dark, 0, 6.5, 3.05, Math.PI / 2);
      // the roof: a dish, three rods, a vent
      const dish = add(new THREE.SphereGeometry(1.5, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), steel, -1.2, 11.4, -0.8, Math.PI, 0, 0.5); dish.material = steel.clone(); dish.material.side = THREE.DoubleSide;
      add(new THREE.CylinderGeometry(0.1, 0.14, 2.2, 8), dark, -1.2, 9.9, -0.8);
      for (let k = 0; k < 3; k++) { const hgt = 3 + k * 1.6; add(new THREE.CylinderGeometry(0.04, 0.06, hgt, 6), dark, 1.6 + k * 0.5, 8.9 + hgt / 2, 1.8 - k * 1.4); add(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9fd0ff }), 1.6 + k * 0.5, 8.9 + hgt, 1.8 - k * 1.4); }
      add(new THREE.BoxGeometry(1.6, 0.7, 1.2), dark, 1.6, 9.2, -1.6);
      // the plant beside it: a console on a post and two drums
      add(new THREE.CylinderGeometry(0.16, 0.2, 2.4, 8), dark, 5.4, 1.2, 3.4);
      add(new THREE.BoxGeometry(1.5, 0.9, 0.5), steel, 5.4, 2.7, 3.4, -0.5);
      for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: [0xff4030, 0x40ff80, 0xffd040][k % 3] }), 4.95 + (k % 3) * 0.45, 2.82 + Math.floor(k / 3) * 0.24, 3.62 - Math.floor(k / 3) * 0.12);
      for (const dx of [-5.2, -6.9]) { add(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 16), steel, dx, 1.1, -1.4); add(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 16), dark, dx, 1.6, -1.4); add(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 16), dark, dx, 0.6, -1.4); }
      box.position.set(11, 0, -52); box.rotation.y = -0.62; scene.add(box);
      // the fairy cake on its plinth, by the road
      const cake = new THREE.Group(), cadd = (geo, mat, y, sy = 1) => { const o = new THREE.Mesh(geo, mat); o.position.y = y; o.scale.y = sy; cake.add(o); return o; };
      const stone = new THREE.MeshStandardMaterial({ color: 0x8d8d95, roughness: 0.9 });
      cadd(new THREE.CylinderGeometry(1.0, 1.15, 0.3, 8), stone, 0.15); cadd(new THREE.CylinderGeometry(0.62, 0.72, 2.7, 8), stone, 1.65); cadd(new THREE.CylinderGeometry(0.95, 0.7, 0.24, 8), stone, 3.12);
      cadd(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0xe9e9ef, roughness: 0.3, metalness: 0.2 }), 3.27);      // a saucer
      const cup = new THREE.CylinderGeometry(0.4, 0.27, 0.36, 20, 1, true); { const p = cup.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + 0.07 * Math.cos(a * 20); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } cup.computeVertexNormals(); }
      cadd(cup, new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), 3.48);
      cadd(new THREE.SphereGeometry(0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd9a55c, roughness: 0.9 }), 3.64, 0.55);
      cadd(new THREE.SphereGeometry(0.33, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff9fc4, roughness: 0.35 }), 3.72, 0.6);
      cadd(new THREE.SphereGeometry(0.085, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.25 }), 3.95);
      // the two probes that read it, and a glass bell over it
      for (const sx of [-1, 1]) { const pr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), dark); pr.position.set(sx * 0.42, 3.75, 0); pr.rotation.z = sx * 0.9; cake.add(pr); }
      cadd(new THREE.SphereGeometry(0.66, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.16, depthWrite: false }), 3.3, 1.25);
      cake.position.set(-5.2, ground(-5.2, -36), -36); scene.add(cake);
      // cables: cake to box, box to console and drums, and one running off over the plain
      const tube = (pts, r = 0.1) => { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], ground(p[0], p[2]) + (p[1] || 0.1), p[2]))), 40, r, 6); scene.add(new THREE.Mesh(g, rubber)); };
      tube([[-5.2, 0.2, -36.6], [-3.5, 0.1, -40], [1, 0.1, -43], [5, 0.1, -47], [8.6, 0.3, -49.6]], 0.09);
      tube([[13, 0.2, -55], [20, 0.1, -62], [34, 0.1, -66], [60, 0.1, -90], [110, 0.1, -160], [150, 0.1, -260]], 0.13);
      tube([[9, 0.2, -55], [4, 0.1, -64], [-8, 0.1, -72], [-30, 0.1, -110], [-70, 0.1, -210]], 0.11);
    }
    await ctx.yield();

    // =====================================================================================================
    // FAR STARS, with the band of the galaxy we stand in
    // =====================================================================================================
    {
      const n = Math.round(9000 * detail), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n), R = 19000;
      const bandN = new THREE.Vector3(0.35, 0.8, 0.48).normalize(), v = new THREE.Vector3(), t1 = new THREE.Vector3(1, 0, 0).cross(bandN).normalize(), t2 = bandN.clone().cross(t1);
      for (let i = 0; i < n; i++) {
        if (i < n * 0.45) { const a = rng() * Math.PI * 2, o = rng.gauss() * 0.09; v.copy(t1).multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a)).addScaledVector(bandN, o).normalize(); }
        else { const u = rng() * 2 - 1, a = rng() * Math.PI * 2, s = Math.sqrt(1 - u * u); v.set(Math.cos(a) * s, u, Math.sin(a) * s); }
        pos[i * 3] = v.x * R; pos[i * 3 + 1] = v.y * R + 600; pos[i * 3 + 2] = v.z * R - 5600;
        const k = 0.2 + 0.8 * Math.pow(rng(), 4); C.setHSL(rng() < 0.25 ? rng.range(0.04, 0.12) : rng.range(0.55, 0.68), 0.45 * rng(), 0.62).multiplyScalar(k);
        col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b; sz[i] = 1.4 + 2.6 * Math.pow(rng(), 6);
      }
      addPoints(scene, pos, col, sz, { flat: true });
    }

    // =====================================================================================================
    // A PLANET AND ITS MOON
    // =====================================================================================================
    const planet = new THREE.Group(); planet.position.set(-270, 250, -930); planet.rotation.z = 0.41; scene.add(planet);
    let clouds;
    {
      const R = 120, seed = rng() * 50;
      const surf = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.ShaderMaterial({
        uniforms: { uSun, uTime, uSeed: { value: seed } }, vertexShader: BODY_VERT,
        fragmentShader: GLSL_N + /* glsl */`
          uniform vec3 uSun; uniform float uSeed; varying vec3 vN; varying vec3 vW; varying vec3 vL;
          void main(){ vec3 p = normalize(vL); vec3 q = p * 2.1 + uSeed; q += 0.5 * vec3(fbm(q * 1.3 + 3.0), fbm(q * 1.3 + 11.0), fbm(q * 1.3 + 19.0));
            float h = fbm(q) + 0.35 * fbm(q * 4.0) - 0.62; float lat = abs(p.y);
            vec3 sea = mix(vec3(0.015, 0.07, 0.22), vec3(0.04, 0.24, 0.42), smoothstep(-0.25, 0.0, h));
            vec3 land = mix(vec3(0.13, 0.27, 0.09), vec3(0.42, 0.34, 0.2), smoothstep(0.02, 0.2, h + 0.25 * (1.0 - lat) * fbm(q * 3.0)));
            land = mix(land, vec3(0.5, 0.48, 0.46), smoothstep(0.2, 0.32, h));
            float isLand = smoothstep(0.0, 0.012, h); vec3 col = mix(sea, land, isLand);
            float ice = smoothstep(0.78, 0.86, lat + 0.1 * fbm(q * 5.0)); col = mix(col, vec3(0.92, 0.95, 1.0), ice);
            vec3 L = normalize(uSun - vW), V = normalize(cameraPosition - vW); float nl = dot(vN, L); float day = smoothstep(-0.08, 0.25, nl);
            vec3 Hh = normalize(L + V); float spec = pow(max(dot(vN, Hh), 0.0), 60.0) * (1.0 - isLand) * (1.0 - ice);
            vec3 lit = col * (0.02 + 1.15 * max(nl, 0.0)) + vec3(1.0, 0.9, 0.7) * spec * 0.9;
            float city = isLand * (1.0 - ice) * smoothstep(0.62, 0.8, vn(p * 60.0 + uSeed)) * smoothstep(0.45, 0.7, fbm(q * 6.0));
            lit += (1.0 - day) * city * vec3(1.0, 0.72, 0.35) * 0.9;
            float rim = pow(1.0 - max(dot(vN, V), 0.0), 3.0); lit += vec3(0.25, 0.5, 1.0) * rim * (0.15 + 0.85 * day) * 0.7;
            gl_FragColor = vec4(lit, 1.0); }`,
      })); planet.add(surf);
      clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 64), new THREE.ShaderMaterial({
        uniforms: { uSun, uTime, uSeed: { value: seed + 7 } }, vertexShader: BODY_VERT, transparent: true, depthWrite: false,
        fragmentShader: GLSL_N + /* glsl */`
          uniform vec3 uSun; uniform float uSeed, uTime; varying vec3 vN; varying vec3 vW; varying vec3 vL;
          void main(){ vec3 p = normalize(vL); vec3 q = vec3(p.x * 3.0, p.y * 6.0, p.z * 3.0) + uSeed; q += 0.9 * vec3(fbm(q + 2.0), 0.0, fbm(q + 9.0));
            float c = smoothstep(0.5, 0.74, fbm(q) + 0.25 * fbm(q * 5.0 + uTime * 0.01)); float nl = dot(vN, normalize(uSun - vW));
            gl_FragColor = vec4(vec3(1.0) * (0.03 + 1.1 * max(nl, 0.0)), c * 0.92); }`,
      })); planet.add(clouds);
      const air = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 64, 40), new THREE.ShaderMaterial({
        uniforms: { uSun }, vertexShader: BODY_VERT, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
        fragmentShader: /* glsl */`uniform vec3 uSun; varying vec3 vN; varying vec3 vW; varying vec3 vL;
          void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(max(dot(-vN, V), 0.0), 2.2) ; float edge = smoothstep(0.0, 0.25, f) * (1.0 - smoothstep(0.25, 0.75, f));
            float day = smoothstep(-0.35, 0.4, dot(vN, normalize(uSun - vW))); gl_FragColor = vec4(vec3(0.3, 0.58, 1.0) * edge * day * 1.3, 1.0); }`,
      })); planet.add(air);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 40), new THREE.ShaderMaterial({
        uniforms: { uSun, uSeed: { value: rng() * 30 } }, vertexShader: BODY_VERT,
        fragmentShader: GLSL_N + /* glsl */`
          uniform vec3 uSun; uniform float uSeed; varying vec3 vN; varying vec3 vW; varying vec3 vL;
          void main(){ vec3 p = normalize(vL); float a = 0.42 + 0.22 * fbm(p * 3.0 + uSeed); a -= 0.14 * smoothstep(0.5, 0.62, fbm(p * 1.4 + uSeed + 5.0));
            float sh = 0.0;
            for (int i = 0; i < 3; i++) { float s = 2.4 * pow(2.3, float(i)); float d = cell(p * s + uSeed + float(i) * 17.0); float w = 0.33;
              a -= 0.1 * (1.0 - smoothstep(0.0, w, d)); a += 0.12 * smoothstep(w - 0.07, w, d) * (1.0 - smoothstep(w, w + 0.07, d)); sh += d; }
            a += 0.05 * (vn(p * 70.0) - 0.5);
            float nl = max(dot(vN, normalize(uSun - vW)), 0.0); gl_FragColor = vec4(vec3(a, a * 0.98, a * 0.94) * (0.012 + 1.2 * nl), 1.0); }`,
      })); moon.position.set(170, 400, -1220); scene.add(moon); timed.push((t) => { moon.rotation.y = t * 0.01; });
    }
    await ctx.yield();

    // =====================================================================================================
    // THE SUN AND ITS SYSTEM
    // =====================================================================================================
    const system = new THREE.Group(); system.position.copy(SUN); system.rotation.set(0.12, 0, 0.2); scene.add(system);
    const orbiters = [];
    {
      const sun = new THREE.Mesh(new THREE.SphereGeometry(150, 96, 64), new THREE.ShaderMaterial({
        uniforms: { uTime }, vertexShader: BODY_VERT,
        fragmentShader: GLSL_N + /* glsl */`
          uniform float uTime; varying vec3 vN; varying vec3 vW; varying vec3 vL;
          void main(){ vec3 p = normalize(vL); float t = uTime * 0.05;
            float g = cell(p * 26.0 + vec3(0.0, t, 0.0)); float gran = smoothstep(0.05, 0.5, g);
            float big = fbm(p * 4.0 + t * 0.4); float spot = smoothstep(0.7, 0.78, fbm(p * 2.6 + 40.0 - t * 0.1));
            float fac = smoothstep(0.62, 0.8, fbm(p * 7.0 + 9.0 + t));
            float mu = max(dot(vN, normalize(cameraPosition - vW)), 0.0); float limb = 0.35 + 0.65 * pow(mu, 0.55);
            vec3 col = mix(vec3(1.0, 0.55, 0.12), vec3(1.0, 0.93, 0.7), gran * (0.55 + 0.45 * big));
            col = mix(col, vec3(0.25, 0.08, 0.02), spot * 0.85); col += vec3(1.0, 0.95, 0.8) * fac * 0.35;
            col *= limb * 2.1; col = mix(col, vec3(1.0, 0.4, 0.08) * 1.3, pow(1.0 - mu, 3.0) * 0.7);
            gl_FragColor = vec4(col, 1.0); }`,
      })); sun.position.copy(SUN); scene.add(sun); timed.push((t) => { sun.rotation.y = t * 0.012; });
      const corona = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.ShaderMaterial({
        uniforms: { uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: GLSL_N + /* glsl */`
          uniform float uTime; varying vec2 vUv;
          void main(){ float r = length(vUv) * 5.0; if (r > 5.0) discard; float a = atan(vUv.y, vUv.x);
            vec3 d = vec3(cos(a), sin(a), 0.0); float rays = fbm(d * 3.0 + vec3(0.0, 0.0, uTime * 0.03 + r * 0.12)); float fine = fbm(d * 14.0 + vec3(0.0, 0.0, r * 0.4 - uTime * 0.05));
            float fall = exp(-(r - 1.0) * 1.7); float glow = fall * (0.35 + 1.5 * pow(rays, 2.0) + 0.5 * fine * fall);
            glow += 0.25 * exp(-(r - 1.0) * 0.55) * rays; glow *= smoothstep(0.92, 1.02, r) * (1.0 - smoothstep(4.0, 5.0, r));
            gl_FragColor = vec4(vec3(1.0, 0.72, 0.38) * glow, 1.0); }`,
      })); corona.position.copy(SUN); scene.add(corona); billboards.push(corona);

      const ringMat = (inner, outer, c1, c2, seed) => new THREE.ShaderMaterial({
        uniforms: { uIn: { value: inner }, uOut: { value: outer }, uA: { value: new THREE.Color(c1) }, uB: { value: new THREE.Color(c2) }, uSeed: { value: seed } },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: /* glsl */`varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`uniform float uIn, uOut, uSeed; uniform vec3 uA, uB; varying vec3 vL;
          float h1(float x){ return fract(sin(x * 91.7 + uSeed) * 43758.5); }
          void main(){ float t = (length(vL.xy) - uIn) / (uOut - uIn); float b = floor(t * 46.0); float k = h1(b); float k2 = h1(floor(t * 9.0) + 50.0);
            float a = (0.25 + 0.75 * k) * (0.35 + 0.65 * k2) * smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.96, 1.0, t)); if (k2 < 0.14) a *= 0.08;
            gl_FragColor = vec4(mix(uA, uB, k) * 0.9, a * 0.85); }`,
      });
      const DEFS = [
        { r: 300, pr: 6, color: 0x9a8f86, w: 0.09 },
        { r: 390, pr: 10, bands: ['#e8d2a0', '#d9b878', '#f0e0b8'], w: 0.07 },
        { r: 500, pr: 11, color: 0x3f78c8, w: 0.055, moons: 1, blue: true },
        { r: 610, pr: 8, color: 0xb8553a, w: 0.045, moons: 2 },
        { r: 860, pr: 30, bands: ['#d8b890', '#b98a60', '#e8d8c0', '#a8704a', '#d0a878'], w: 0.028, moons: 4 },
        { r: 1040, pr: 24, bands: ['#e6d6a8', '#d2bd88', '#efe2bc'], w: 0.02, ring: [1.35, 2.3, 0xe8dcb8, 0x9a8a68], moons: 3 },
        { r: 1190, pr: 16, bands: ['#a8dce0', '#90ccd4', '#b8e6ea'], w: 0.015, ring: [1.6, 1.9, 0xcfe8f0, 0x7090a0], tilt: 1.4, moons: 2 },
        { r: 1290, pr: 15, bands: ['#3c62d0', '#3050b8', '#5078e0'], w: 0.012, moons: 1 },
      ];
      for (const d of DEFS) {
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts(d.r, 220).map((p) => new THREE.Vector3(p.x, 0, p.y))), new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
        system.add(ring);
        const g = new THREE.Group(), mat = d.bands ? new THREE.MeshStandardMaterial({ map: bandTexture(rng, d.bands), roughness: 0.9 }) : new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.95, flatShading: false });
        const body = new THREE.Mesh(new THREE.SphereGeometry(d.pr, 40, 24), mat); body.rotation.z = d.tilt ?? rng.range(0, 0.45); g.add(body);
        if (d.blue) { const halo = new THREE.Mesh(new THREE.SphereGeometry(d.pr * 1.08, 24, 16), new THREE.MeshBasicMaterial({ color: 0x5aa0ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false })); g.add(halo); }
        if (d.ring) { const rm = new THREE.Mesh(new THREE.RingGeometry(d.pr * d.ring[0], d.pr * d.ring[1], 96, 1), ringMat(d.pr * d.ring[0], d.pr * d.ring[1], d.ring[2], d.ring[3], rng() * 20)); rm.rotation.x = Math.PI / 2 + (d.tilt ?? 0.42); rm.rotation.y = 0.2; g.add(rm); }
        const moons = [];
        for (let k = 0; k < (d.moons || 0); k++) { const mr = d.pr * rng.range(0.07, 0.2), mo = new THREE.Mesh(new THREE.SphereGeometry(mr, 14, 10), new THREE.MeshStandardMaterial({ color: C.setHSL(rng.range(0.05, 0.12), 0.15, rng.range(0.45, 0.7)).getHex(), roughness: 1 })); g.add(mo); moons.push({ mo, r: d.pr * (2.6 + k * 0.9 + rng()), a0: rng() * 6.283, w: 0.5 / (1 + k * 0.6), inc: rng.gauss() * 0.2 }); }
        system.add(g); orbiters.push({ g, body, moons, r: d.r, a0: rng() * Math.PI * 2, w: d.w, spin: rng.range(0.1, 0.5) });
      }
      // the belt between the fourth world and the fifth
      const belt = new THREE.Group(); system.add(belt);
      { const n = Math.round(2600 * detail), ag = new THREE.DodecahedronGeometry(1, 0), am = new THREE.MeshStandardMaterial({ color: 0x8a8078, roughness: 1, flatShading: true }), im = new THREE.InstancedMesh(ag, am, n);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();
        for (let i = 0; i < n; i++) { const a = rng() * Math.PI * 2, r = 725 + rng.gauss() * 26, sc = 0.5 + 2.6 * Math.pow(rng(), 5); e.set(rng() * 6, rng() * 6, rng() * 6); q.setFromEuler(e);
          m.compose(v.set(Math.cos(a) * r, rng.gauss() * 7, Math.sin(a) * r), q, s.set(sc, sc * rng.range(0.5, 1), sc * rng.range(0.6, 1.2))); im.setMatrixAt(i, m); C.setScalar(rng.range(0.5, 1.1)); im.setColorAt(i, C); }
        im.frustumCulled = false; belt.add(im);
        const nd = 5000, dp = new Float32Array(nd * 3), dc = new Float32Array(nd * 3);
        for (let i = 0; i < nd; i++) { const a = rng() * Math.PI * 2, r = 725 + rng.gauss() * 34; dp[i * 3] = Math.cos(a) * r; dp[i * 3 + 1] = rng.gauss() * 9; dp[i * 3 + 2] = Math.sin(a) * r; const k = rng.range(0.08, 0.3); dc[i * 3] = k; dc[i * 3 + 1] = k * 0.9; dc[i * 3 + 2] = k * 0.75; }
        addPoints(belt, dp, dc, 2.2, { max: 6 }); timed.push((t) => { belt.rotation.y = -t * 0.006; }); }
      // a comet, inbound: its head, its dust tail blown from the sun and a straighter blue one
      { const head = new THREE.Vector3(-430, 60, 360), away = head.clone().normalize(), side = new THREE.Vector3(0.5, 0.1, 0.85).normalize(), n = 6000, cp = new Float32Array(n * 3), cc = new Float32Array(n * 3), cs = new Float32Array(n);
        for (let i = 0; i < n; i++) { const ion = i < n * 0.35, t = Math.pow(rng(), 1.6), len = (ion ? 520 : 380) * t, sp = (ion ? 3 : 10) + len * (ion ? 0.02 : 0.11);
          const bx = ion ? 0 : t * t * 150; cp[i * 3] = head.x + away.x * len + side.x * bx + rng.gauss() * sp; cp[i * 3 + 1] = head.y + away.y * len + side.y * bx + rng.gauss() * sp * 0.6; cp[i * 3 + 2] = head.z + away.z * len + side.z * bx + rng.gauss() * sp;
          const k = (1 - t) * (ion ? 0.5 : 0.35) + 0.03; if (ion) C.setRGB(0.35, 0.6, 1.0); else C.setRGB(1.0, 0.9, 0.72); cc[i * 3] = C.r * k; cc[i * 3 + 1] = C.g * k; cc[i * 3 + 2] = C.b * k; cs[i] = 5 + 12 * t; }
        addPoints(system, cp, cc, cs, { max: 40 });
        addPoints(system, new Float32Array([head.x, head.y, head.z, head.x, head.y, head.z]), new Float32Array([0.9, 1, 1, 0.3, 0.6, 0.7]), new Float32Array([22, 70]), { max: 120 }); }
    }
    await ctx.yield();

    // =====================================================================================================
    // THE GALAXY: bulge and bar, two great arms and their spurs, dust lanes, pink knots, clusters, dwarfs
    // =====================================================================================================
    const galaxy = new THREE.Group(), spin = new THREE.Group(); galaxy.add(spin); galaxy.position.copy(GAL); galaxy.rotation.set(0.42, 0, -0.18); scene.add(galaxy);
    {
      const R = 1750, BAR = 330, PITCH = 3.1, n = Math.round(110000 * Math.max(0.35, detail));
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n);
      const warm = new THREE.Color(1.0, 0.76, 0.46), white = new THREE.Color(0.9, 0.9, 1.0), blue = new THREE.Color(0.4, 0.58, 1.0);
      const armAngle = (r, arm) => arm * Math.PI + Math.log(Math.max(r, BAR) / BAR) * PITCH + 0.25;
      const dustP = [], dustC = [], dustS = [], hiiP = [], hiiC = [], hiiS = [];
      for (let i = 0; i < n; i++) {
        const u = i / n; let x, y, z, k;
        if (u < 0.14) {            // the bulge
          const r = Math.abs(rng.gauss()) * 120, a = rng() * Math.PI * 2, b = (rng() * 2 - 1); x = Math.cos(a) * r; z = Math.sin(a) * r; y = b * 80 * Math.exp(-r / 240) * rng();
          C.copy(warm).multiplyScalar(0.2 + 0.4 * rng()); sz[i] = 11;
        } else if (u < 0.24) {     // the bar
          const t = rng.gauss() * 0.5; x = t * BAR; z = rng.gauss() * 46 * (1 - 0.4 * Math.abs(t)); y = rng.gauss() * 22; const c = Math.cos(0.25), s = Math.sin(0.25), x2 = x * c - z * s; z = x * s + z * c; x = x2;
          C.copy(warm).lerp(white, 0.2 * rng()).multiplyScalar(0.16 + 0.34 * rng()); sz[i] = 11;
        } else if (u < 0.36) {     // the old smooth disc
          const r = -Math.log(1 - rng() * 0.97) * 420, a = rng() * Math.PI * 2; x = Math.cos(a) * r; z = Math.sin(a) * r; y = rng.gauss() * 26;
          C.copy(warm).lerp(white, 0.4).multiplyScalar(0.05 + 0.12 * rng()); sz[i] = 12;
        } else {                   // the arms: two great ones, and (a fifth of the stars) two fainter spurs between
          const spur = rng() < 0.2, t = Math.pow(rng(), 0.75), r = BAR * 0.9 + t * (R - BAR), arm = Math.floor(rng() * 2) + (spur ? 0.5 : 0);
          const wdt = (spur ? 0.11 : 0.085) + 0.07 * t, off = rng.gauss() * wdt, a = armAngle(r, arm) + off;
          x = Math.cos(a) * r + rng.gauss() * 14; z = Math.sin(a) * r + rng.gauss() * 14; y = rng.gauss() * (10 + 16 * (1 - t));
          k = (spur ? 0.6 : 1) * (0.1 + 0.42 * rng() * (1 - 0.55 * t)); const young = off < 0 ? 1 : 0.55;
          C.copy(warm).lerp(blue, Math.min(1, (0.3 + 0.9 * t) * young)); if (rng() < 0.012) { C.copy(white); k = 0.9; } C.multiplyScalar(k); sz[i] = 9 + 5 * rng();
          // on the inner edge of an arm: the dust lane; just outside it: the pink knots where stars are being made
          if (!spur && rng() < 0.05 * detail) { const ad = armAngle(r, arm) - wdt * 1.25 + rng.gauss() * 0.03; dustP.push(Math.cos(ad) * r, rng.gauss() * 5, Math.sin(ad) * r); const dk = rng.range(0.01, 0.035); dustC.push(dk * 1.6, dk, dk * 0.6); dustS.push(rng.range(40, 95)); }
          if (!spur && rng() < 0.0045 && t > 0.08) { const ah = armAngle(r, arm) - wdt * 0.5 + rng.gauss() * 0.03, m = 3 + Math.floor(rng() * 7);
            for (let j = 0; j < m; j++) { hiiP.push(Math.cos(ah) * r + rng.gauss() * 16, rng.gauss() * 6, Math.sin(ah) * r + rng.gauss() * 16); const hk = rng.range(0.25, 0.7); hiiC.push(hk, hk * 0.32, hk * 0.5); hiiS.push(rng.range(14, 40)); } }
        }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b;
        if ((i & 16383) === 0) await ctx.yield();
      }
      addPoints(spin, pos, col, sz, { near: 70, max: 26, order: 1 });
      // the bar's own dust: two straight lanes along its leading edges
      for (let i = 0; i < 260 * detail; i++) { const t = rng.range(-1, 1), c = Math.cos(0.25), s = Math.sin(0.25), bx = t * BAR * 0.95, bz = (t > 0 ? 1 : -1) * (14 + 22 * Math.abs(t)) + rng.gauss() * 5; dustP.push(bx * c - bz * s, rng.gauss() * 4, bx * s + bz * c); const dk = rng.range(0.012, 0.03); dustC.push(dk * 1.7, dk, dk * 0.6); dustS.push(rng.range(26, 54)); }
      addPoints(spin, dustP, dustC, dustS, { dark: true, opacity: 0.5, near: 260, max: 70, sharp: 1.4, order: 2 });
      addPoints(spin, hiiP, hiiC, hiiS, { near: 90, max: 60, sharp: 2.2, order: 3 });
      // the core's glow, and the halo of light the whole disc stands in
      addPoints(spin, new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), new Float32Array([1, 0.86, 0.6, 0.5, 0.4, 0.26, 0.1, 0.09, 0.09]), new Float32Array([150, 520, 1900]), { max: 900, sharp: 2.4, order: 0 });
      // globular clusters: tight old balls in a round halo
      { const gp = [], gc = [], gs = [];
        for (let k = 0; k < 70; k++) { const u = rng() * 2 - 1, a = rng() * 6.283, s = Math.sqrt(1 - u * u), r = 240 + Math.abs(rng.gauss()) * 760, cx = Math.cos(a) * s * r, cy = u * r * 0.8, cz = Math.sin(a) * s * r, m = 26 + Math.floor(rng() * 40);
          gp.push(cx, cy, cz); gc.push(0.5, 0.42, 0.28); gs.push(30);
          for (let j = 0; j < m; j++) { const rr = Math.abs(rng.gauss()) * 7; const uu = rng() * 2 - 1, aa = rng() * 6.283, ss = Math.sqrt(1 - uu * uu); gp.push(cx + Math.cos(aa) * ss * rr, cy + uu * rr, cz + Math.sin(aa) * ss * rr); const gk = rng.range(0.15, 0.5); gc.push(gk, gk * 0.86, gk * 0.6); gs.push(3.5); } }
        addPoints(spin, gp, gc, gs, { near: 50, max: 40, order: 1 }); }
      // satellite dwarfs: two ragged clouds and a small round one, off the disc, with a faint stream between
      { const sp = [], sc = [], ss = [], spots = [[-2350, -520, 700, 260, 0], [2100, 380, 1500, 190, 0], [900, 640, -1900, 110, 1], [-1500, 420, -1700, 90, 1]];
        const w = new THREE.Vector3();
        for (const [sx, sy, sz2, rad, round] of spots) {
          galaxy.localToWorld(w.set(sx, sy, sz2)); galaxy.updateMatrixWorld();
          const blobs = round ? [[0, 0, 0, 1]] : Array.from({ length: 6 }, () => [rng.gauss() * rad * 0.6, rng.gauss() * rad * 0.25, rng.gauss() * rad * 0.6, rng.range(0.3, 0.8)]);
          const m = Math.round((round ? 900 : 2600) * detail);
          for (let j = 0; j < m; j++) { const b = blobs[Math.floor(rng() * blobs.length)], s = rad * b[3] * (round ? 0.45 : 0.4); sp.push(sx + b[0] + rng.gauss() * s, sy + b[1] + rng.gauss() * s * (round ? 1 : 0.5), sz2 + b[2] + rng.gauss() * s);
            const k = rng.range(0.07, 0.3); if (round) C.copy(warm); else C.copy(blue).lerp(white, rng()); if (!round && rng() < 0.03) C.setRGB(1, 0.4, 0.55); sc.push(C.r * k, C.g * k, C.b * k); ss.push(8 + 4 * rng()); }
        }
        for (let j = 0; j < 1500 * detail; j++) { const t = rng(), a = 2.9 + t * 1.5, r = 2420 - t * 700; sp.push(Math.cos(a) * r + rng.gauss() * 60, -520 + t * 420 + rng.gauss() * 40, Math.sin(a) * r * 0.5 + 700 * (1 - t) + rng.gauss() * 60); const k = rng.range(0.02, 0.08); sc.push(k * 0.7, k * 0.8, k); ss.push(10); }
        addPoints(galaxy, sp, sc, ss, { near: 80, max: 22 }); }
    }
    await ctx.yield();

    // =====================================================================================================
    // THE COSMIC WEB: clusters at the knots, filaments between them, voids left empty; every galaxy a small
    // oriented disc with its own shape (spirals in the filaments, ellipticals crowding the knots, some barred)
    // =====================================================================================================
    {
      const NODES = 64, nodes = [], BOX = { x: 2900, y0: -900, y1: 2700, z0: -13200, z1: -7100 };
      for (let tries = 0; nodes.length < NODES && tries < 4000; tries++) {
        const p = new THREE.Vector3(rng.range(-BOX.x, BOX.x), rng.range(BOX.y0, BOX.y1), rng.range(BOX.z1, BOX.z0));
        if (nodes.every((q) => q.distanceTo(p) > 620) && path.distanceTo(p.x, p.y, p.z) > 230) nodes.push(p);
      }
      const G = [];      // every galaxy: [x, y, z, size, type]
      const D = [], Dc = [], Ds = [];
      const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
      const put = (c, spread, type, size) => { const x = c.x + rng.gauss() * spread, y = c.y + rng.gauss() * spread, z = c.z + rng.gauss() * spread; if (path.distanceTo(x, y, z) > 26 + size * 0.7) G.push([x, y, z, size, type]); };
      const dust = (c, spread, n) => { for (let i = 0; i < n; i++) { const x = c.x + rng.gauss() * spread, y = c.y + rng.gauss() * spread, z = c.z + rng.gauss() * spread; if (path.distanceTo(x, y, z) < 30) continue; D.push(x, y, z); const k = rng.range(0.1, 0.42); C.setHSL(rng() < 0.4 ? rng.range(0.05, 0.11) : rng.range(0.57, 0.66), 0.5, 0.6); Dc.push(C.r * k, C.g * k, C.b * k); Ds.push(rng.range(5, 13)); } };
      const edges = new Set();
      for (let i = 0; i < nodes.length; i++) {
        const rich = rng.range(0.5, 1.5), m = Math.round(22 * rich);
        for (let j = 0; j < m; j++) put(nodes[i], 70 * rich, rng() < 0.7 ? 1 : rng() < 0.5 ? 0 : 2, j < 2 ? rng.range(46, 78) : rng.range(14, 38));
        dust(nodes[i], 95 * rich, Math.round(150 * rich * detail));
        nodes.map((p, j) => [p.distanceTo(nodes[i]), j]).filter((e) => e[1] !== i && e[0] < 2200).sort((a, b) => a[0] - b[0]).slice(0, 3).forEach(([, j]) => edges.add(Math.min(i, j) + ':' + Math.max(i, j)));
        if ((i & 7) === 0) await ctx.yield();
      }
      let ei = 0;
      for (const e of edges) {
        const [i, j] = e.split(':').map(Number), a = nodes[i], b = nodes[j], d = a.distanceTo(b), steps = Math.max(5, Math.round(d / 62));
        // a filament sags and wanders a little between its two knots
        tmp2.set(rng.gauss(), rng.gauss(), rng.gauss()).multiplyScalar(d * 0.07);
        for (let s = 1; s < steps; s++) { const t = s / steps, bow = Math.sin(t * Math.PI); tmp.lerpVectors(a, b, t).addScaledVector(tmp2, bow);
          if (rng() < 0.75) put(tmp, 20 + 12 * bow, rng() < 0.62 ? 0 : rng() < 0.5 ? 2 : 1, rng.range(13, 40)); dust(tmp, 30 + 16 * bow, Math.round(10 * detail)); }
        if ((++ei & 15) === 0) await ctx.yield();
      }
      // a few strays in the voids, so that they read as nearly empty and not as holes in the picture
      for (let i = 0; i < 60; i++) { tmp.set(rng.range(-BOX.x, BOX.x), rng.range(BOX.y0, BOX.y1), rng.range(BOX.z1, BOX.z0)); put(tmp, 1, rng() < 0.5 ? 0 : 2, rng.range(10, 22)); }
      // our own filament: it runs past the road, and our galaxy is one small spiral on it
      for (let s = 0; s < 34; s++) { tmp.set(HERE.x + (s - 17) * 44 + rng.gauss() * 12, HERE.y + Math.sin(s * 0.42) * 46 + 26 + (s - 17) * 3, HERE.z + (s - 17) * 24); if (tmp.distanceTo(HERE) < 60) continue; put(tmp, 20, rng() < 0.6 ? 0 : 2, rng.range(12, 34)); dust(tmp, 30, 10); }
      G.push([HERE.x, HERE.y, HERE.z, 15, 0]);

      const n = G.length, quad = new THREE.PlaneGeometry(2, 2), im = new THREE.InstancedMesh(quad, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: /* glsl */`attribute vec3 aCol; attribute vec3 aParm; varying vec2 vUv; varying vec3 vCol; varying vec3 vParm; varying float vFade;
          void main(){ vUv = uv * 2.0 - 1.0; vCol = aCol; vParm = aParm; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vFade = smoothstep(14.0, 90.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */`varying vec2 vUv; varying vec3 vCol; varying vec3 vParm; varying float vFade;
          float hh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)) + vParm.y) * 43758.5); }
          void main(){ float r = length(vUv); if (r > 1.0) discard; float a = atan(vUv.y, vUv.x); float I; vec3 col = vCol; vec3 core = vec3(1.0, 0.86, 0.62);
            float sp = log(r + 0.03) * vParm.z; float knots = 0.6 + 0.8 * hh(floor(vec2(a * 9.0 - sp * 4.0, r * 14.0)));
            if (vParm.x < 0.5) { float arms = pow(0.5 + 0.5 * cos(2.0 * a - sp + vParm.y), 2.2); float lane = pow(0.5 + 0.5 * cos(2.0 * a - sp + vParm.y + 0.9), 6.0);
              I = exp(-r * 3.4) * (0.22 + 2.0 * arms * knots) * (1.0 - 0.6 * lane) + 1.7 * exp(-r * r * 90.0); col = mix(core, vCol, smoothstep(0.04, 0.3, r)); }
            else if (vParm.x < 1.5) { I = 1.5 * exp(-r * 5.5) + 1.1 * exp(-r * r * 46.0) + 0.12 * exp(-r * 2.0); col = mix(vec3(1.0, 0.95, 0.85), vCol, smoothstep(0.0, 0.4, r)); }
            else { float bar = exp(-abs(vUv.y) * 16.0 - abs(vUv.x) * 4.5); float arms = pow(0.5 + 0.5 * cos(2.0 * a - sp * step(0.3, r) + vParm.y * 0.0), 3.0) * smoothstep(0.22, 0.34, r);
              I = bar * 1.4 + exp(-r * 3.2) * (0.15 + 1.7 * arms * knots) + 1.4 * exp(-r * r * 110.0); col = mix(core, vCol, smoothstep(0.1, 0.4, r)); }
            I *= 1.0 - smoothstep(0.72, 1.0, r); gl_FragColor = vec4(col * I, vFade); }`,
      }), n);
      const aCol = new Float32Array(n * 3), aParm = new Float32Array(n * 3), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        const g = G[i], type = g[4], mine = i === n - 1;
        e.set(rng() * 6.283, rng() * 6.283, rng() * 6.283); if (mine) e.set(-0.9, 0.4, 0.3); q.setFromEuler(e);
        const el = type === 1 ? rng.range(0.55, 1) : 1; m.compose(v.set(g[0], g[1], g[2]), q, s.set(g[3], g[3] * el, g[3])); im.setMatrixAt(i, m);
        if (type === 1) C.setHSL(rng.range(0.06, 0.11), 0.6, 0.6); else C.setHSL(rng.range(0.56, 0.66), 0.65, 0.62).lerp(C2.setRGB(1, 0.6, 0.7), rng() * 0.25);
        const k = mine ? 1.2 : rng.range(0.55, 1.15); aCol[i * 3] = C.r * k; aCol[i * 3 + 1] = C.g * k; aCol[i * 3 + 2] = C.b * k;
        aParm[i * 3] = type; aParm[i * 3 + 1] = rng() * 6.283; aParm[i * 3 + 2] = rng.range(2.2, 4.6) * (rng() < 0.5 ? -1 : 1);
      }
      quad.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3)); quad.setAttribute('aParm', new THREE.InstancedBufferAttribute(aParm, 3));
      im.frustumCulled = false; scene.add(im);
      addPoints(scene, D, Dc, Ds, { near: 40, max: 18 });
      // very far galaxies, beyond the web we fly: the same web again, too small to resolve
      { const nf = Math.round(7000 * detail), fp = new Float32Array(nf * 3), fc = new Float32Array(nf * 3);
        for (let i = 0; i < nf; i++) { const a = rng() * 6.283, u = rng() * 2 - 1, sN = Math.sqrt(1 - u * u), r = rng.range(5200, 9500), kx = Math.cos(a) * sN, kz = Math.sin(a) * sN;
          const cl = noise.n3(kx * 4, u * 4, kz * 4) + 0.5 * noise.n3(kx * 9, u * 9, kz * 9); if (cl < 0.12 && rng() < 0.85) { fp[i * 3 + 1] = 1e7; continue; }
          fp[i * 3] = kx * r; fp[i * 3 + 1] = 900 + u * r; fp[i * 3 + 2] = -10200 + kz * r; const k = rng.range(0.06, 0.26); C.setHSL(rng.range(0.55, 0.7), 0.4, 0.62); fc[i * 3] = C.r * k; fc[i * 3 + 1] = C.g * k; fc[i * 3 + 2] = C.b * k; }
        addPoints(scene, fp, fc, 2.4, { flat: true }); }
    }
    await ctx.yield();

    // =====================================================================================================
    // YOU ARE HERE: the dot, a circle with tick marks, a leader, the words
    // =====================================================================================================
    const marker = new THREE.Group(); marker.position.copy(HERE); marker.renderOrder = 20; scene.add(marker);
    {
      const lm = new THREE.LineBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false });
      const faint = new THREE.LineBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.45, depthWrite: false, depthTest: false });
      const line = (pts, mat = lm) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); l.renderOrder = 20; marker.add(l); return l; };
      line(circlePts(9, 72)); line(circlePts(9.5, 72));
      for (let k = 0; k < 4; k++) line(circlePts(12.5, 16, k * Math.PI / 2 + 0.25, (k + 1) * Math.PI / 2 - 0.25), faint);      // a broken outer ring
      const seg = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r0 = 9.5, r1 = k % 6 === 0 ? 15.5 : k % 2 === 0 ? 11.6 : 10.6; seg.push(new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0, 0), new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, 0)); }
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; seg.push(new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0), new THREE.Vector3(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 0)); }      // the cross-hairs, open at the middle
      const ls = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), lm); ls.renderOrder = 20; marker.add(ls);
      line([new THREE.Vector3(6.9, 6.9, 0), new THREE.Vector3(24, 24, 0), new THREE.Vector3(98, 24, 0)]);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture('you are here'), transparent: true, depthTest: false, depthWrite: false })); label.center.set(0, 0); label.position.set(26, 25.5, 0); label.scale.set(72, 18, 1); label.renderOrder = 21; marker.add(label);
      const hd = addPoints(scene, new Float32Array([HERE.x, HERE.y, HERE.z, HERE.x, HERE.y, HERE.z]), new Float32Array([1, 1, 1, 0.5, 0.45, 0.3]), new Float32Array([5, 16]), { flat: true }); hd.renderOrder = 22; hd.material.depthTest = false;
    }

    const camPos = new THREE.Vector3(), size = new THREE.Vector2(1280, 720);
    function update(dt, time, camera) {
      uTime.value = time;
      if (ctx.renderer) { ctx.renderer.getDrawingBufferSize(size); const sc = size.y * 0.83; for (const p of pointLayers) p.material.uniforms.uScale.value = sc; }
      spin.rotation.y = time * 0.012;
      planet.rotation.y = time * 0.02; clouds.rotation.y = time * 0.006;
      for (const o of orbiters) { const a = o.a0 + time * o.w; o.g.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r); o.body.rotation.y = time * o.spin;
        for (const mn of o.moons) { const b = mn.a0 + time * mn.w; mn.mo.position.set(Math.cos(b) * mn.r, Math.sin(b) * mn.r * mn.inc, Math.sin(b) * mn.r); } }
      for (const f of timed) f(time);
      if (lamp) lamp.material.color.setRGB(1, 0.35, 0.19).multiplyScalar(0.5 + 0.5 * Math.sin(time * 3));
      if (slit) slit.material.color.setRGB(0.75, 0.88, 1).multiplyScalar(0.85 + 0.15 * Math.sin(time * 11) * Math.sin(time * 1.7));
      if (camera) {
        camera.getWorldPosition(camPos);
        for (const b of billboards) b.quaternion.copy(camera.quaternion);
        marker.quaternion.copy(camera.quaternion); marker.scale.setScalar(Math.max(0.5, camPos.distanceTo(HERE) / 420));
      }
    }

    return {
      scene, path, duration: 52,
      pace: (u) => (u < 0.05 ? 0.4 : u < 0.2 ? 0.8 : u < 0.86 ? 1.25 : 0.7),
      camera: { fov: 62, near: 0.5, far: 30000, lookAhead: 40, sway: 0.2, bank: 0.1 },
      pois: [
        { at: [planet.position.x, planet.position.y, planet.position.z], from: 0.035, to: 0.085, weight: 0.4 },
        { at: [SUN.x, SUN.y, SUN.z], from: 0.1, to: 0.21, weight: 0.5 },
        { at: [GAL.x, GAL.y, GAL.z], from: 0.25, to: 0.42, weight: 0.4 },
        { at: [HERE.x, HERE.y, HERE.z], from: 0.8, to: 0.935, weight: 0.55 },
      ],
      portal: { shape: 'circle', radius: 10, color: '#cfe0ff', glow: 0.5 },
      post: { exposure: 1.0, bloom: { strength: 0.7, radius: 0.8, threshold: 0.8 }, grade: { saturation: 1.1, contrast: 1.05, vignette: 0.3, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() {},
    };
  },
};
