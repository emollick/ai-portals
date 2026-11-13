// LETTERS OF FIRE. God's Final Message to His Creation, in letters of fire along the foot of a red mountain wall at dusk.
// We fly level along the plain and read it one letter at a time: WE APOLOGISE FOR THE INCONVENIENCE.
//
// THE LAYOUT. The flight goes down -Z over a dune plain. The wall stands on the LEFT (-X): a wall on the left is read in
// order as we pass (on the right its far end would come first), and each letter's columns advance down the flight, so
// nothing is mirrored from the plain. Between the flight and the letters runs the pilgrims' road, with a souvenir stall
// where it starts and a small limping robot near the last word. To the right: big dunes, a dry riverbed, bones, mesas.
//
// THE FIRE. Every dot of a 5 by 7 font is a block of burning stuff (a shader of rising noise), with a tongue of flame
// off it (tall where nothing burns above it), sparks, a wavering column of hot air and a smoke plume leaning downwind
// (ahead and toward the wall, so it never crosses the road we fly). The rock under each letter is scorched black and
// glows; the light on the cliff is laid into the ground's colours, with one lamp per word for the things that stand.
import * as THREE from 'three';
import { makePath, makeNoise } from '../kit/core.js';

const MESSAGE = 'WE APOLOGISE FOR THE INCONVENIENCE';
const FONT = {
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
};

const DUR = 48;
const CELL = 6.4;            // one dot of the font, metres: a letter stands 45 m tall
const ADV = 80;              // from one letter to the next along the flight
const TEXT_X = -150;         // the line the letters stand on, at the wall's foot
const TEXT_Z0 = -80;         // the first letter's leading edge
const END_Z = TEXT_Z0 - (MESSAGE.length - 1) * ADV - 5 * CELL;
const PTS = [[0, 24, 150], [0, 24, 0], [-10, 26, -700], [5, 23.5, -1500], [-8, 26, -2300], [-20, 24, END_Z - 20], [-20, 24, END_Z - 160]];
const WIND = new THREE.Vector3(-0.38, 0, -0.925);      // downwind: ahead and toward the wall

const GLSL_N = /* glsl */`
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; } return s; }
`;

export default {
  id: 'letters-of-fire',
  name: 'Letters of Fire',
  category: 'books',
  placeKind: 'wilderness',
  book: 'So Long, and Thanks for All the Fish',
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.7,
  async build(ctx) {
    const rng = ctx.rng, detail = ctx.quality?.detail ?? 1;
    const R = { land: rng.fork('land'), rocks: rng.fork('rocks'), fire: rng.fork('fire'), sky: rng.fork('sky'), folk: rng.fork('folk'), bones: rng.fork('bones'), scrub: rng.fork('scrub') };
    const noise = makeNoise(Math.floor(R.land() * 1e9));
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const U = { uTime: { value: 0 } };
    const disposables = [];
    const keep = (o) => { disposables.push(o); return o; };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#150a20');
    scene.fog = new THREE.FogExp2(new THREE.Color('#5a2838'), 0.00027);
    const path = makePath(PTS), LEN = path.length;

    // =====================================================================================================
    // THE LAND
    // =====================================================================================================
    const roadX = (z) => (z >= -80 ? lerp(-28, -100, ss(150, -80, z)) : -100 + 7 * Math.sin((z + 80) * 0.004));
    const riverX = (z) => 112 + 46 * Math.sin(z * 0.0021 + 1.0) + 19 * Math.sin(z * 0.0053 + 0.4);
    const parts = (x, z) => {
      const m = ss(85, 430, -x);                                   // 0 on the plain, 1 deep in the wall
      const road = 1 - ss(3.5, 9, Math.abs(x - roadX(z)));
      const river = (1 - ss(9, 24, Math.abs(x - riverX(z)))) * (1 - m);
      // the plain: soft swells, and long crested dunes that grow to the right of the flight
      const dn = noise.n2(x * 0.0045 + z * 0.002, z * 0.0016 + 5);
      const crest = Math.pow(1 - Math.abs(dn), 3);
      let dunes = 3.6 * noise.fbm2(x * 0.005, z * 0.005, 3) + (5 + 9 * ss(40, 220, x)) * crest * ss(-60, 60, x);
      dunes += 1.1 * Math.sin(x * 0.05 + 2.0 * noise.n2(x * 0.004, z * 0.004));
      // the wall: ridged rock, cut by slot canyons that run back into it, stepped into strata
      const ridge = noise.ridged2(x * 0.0016 + 3.1, z * 0.0016, 5);
      const canyon = Math.pow(1 - Math.abs(noise.n2(z * 0.0013 + x * 0.0003, 7.3)), 8) * ss(110, 260, -x);
      let wall = m * (60 + 310 * ridge) * (1 - 0.8 * canyon);
      { const t = wall / 24, f = t - Math.floor(t), terr = (Math.floor(t) + ss(0.5, 0.92, f)) * 24; wall = lerp(wall, terr, 0.55 * ss(20, 80, wall)); }
      wall += m * 14 * noise.fbm2(x * 0.013, z * 0.013, 3);
      // scree fans at the wall's foot, heaped where the canyons open
      const scree = (6 + 9 * canyon) * ss(60, 130, -x) * (1 - ss(130, 250, -x)) * (0.5 + 0.5 * noise.n2(z * 0.01, 3));
      // mesas far to the right: flat tops, stepped sides
      const pl = ss(0.02, 0.2, noise.fbm2(x * 0.0015 + 20, z * 0.0015, 3));
      let mesa = ss(230, 330, x) * (pl * 95 + 10 * noise.ridged2(x * 0.004, z * 0.004 + 9, 3));
      { const t = mesa / 19, f = t - Math.floor(t); mesa = lerp(mesa, (Math.floor(t) + ss(0.45, 0.9, f)) * 19, 0.7); }
      const y = dunes * (1 - 0.75 * m) * (1 - 0.85 * road) * (1 - 0.6 * river) - river * 3.6 + wall + scree + mesa;
      return { y, m, road, river, canyon, crest, wall, mesa };
    };
    const height = (x, z) => parts(x, z).y;

    // where each letter stands
    const letters = [];
    for (let i = 0; i < MESSAGE.length; i++) {
      const ch = MESSAGE[i]; if (ch === ' ') continue;
      const z0 = TEXT_Z0 - i * ADV, zc = z0 - 2.5 * CELL;
      let base = 1e9; for (let c = 0; c < 5; c++) base = Math.min(base, height(TEXT_X, z0 - (c + 0.5) * CELL));
      letters.push({ ch, i, z0, zc, base: base + 1.2, phase: R.fire() * 100, rate: R.fire.range(0.7, 1.4) });
    }
    const letterAt = new Array(MESSAGE.length).fill(null); for (const Lt of letters) letterAt[Lt.i] = Lt;
    // the words: [first index, last index]
    const words = []; { let s = -1; for (let i = 0; i <= MESSAGE.length; i++) { const gap = i === MESSAGE.length || MESSAGE[i] === ' '; if (!gap && s < 0) s = i; if (gap && s >= 0) { words.push([s, i - 1]); s = -1; } } }
    await ctx.yield();

    // ---- a ripple map for the sand and the rock's grain (drawn here: no image is loaded)
    let ripple = null;
    if (typeof document !== 'undefined') {
      const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
      const g = cv.getContext('2d'), img = g.createImageData(S, S), TAU = Math.PI * 2;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const wob = 5 * Math.sin(x / S * TAU * 2) + 3 * Math.sin(x / S * TAU * 5 + 1.3);
        let v = 0.80 + 0.10 * Math.sin((y + wob) / S * TAU * 14) + 0.04 * Math.sin((y - wob) / S * TAU * 31 + x / S * TAU * 3);
        v += (R.land() - 0.5) * 0.10;
        const b = Math.max(0, Math.min(255, Math.round(v * 255))), k = (y * S + x) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = b; img.data[k + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      ripple = keep(new THREE.CanvasTexture(cv)); ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping; ripple.anisotropy = 4;
    }

    const X0 = -900, X1 = 620, Z1 = 330, Z0 = END_Z - 620;
    const SX = Math.round(152 * Math.min(1.2, Math.max(0.7, detail))), SZ = Math.round((Z1 - Z0) / 9.5 * Math.min(1.2, Math.max(0.7, detail)));
    const NX = SX + 1, NZ = SZ + 1, NV = NX * NZ;
    const pos = new Float32Array(NV * 3), col = new Float32Array(NV * 3), uv = new Float32Array(NV * 2), info = new Float32Array(NV * 4);
    for (let iz = 0; iz < NZ; iz++) {
      const z = lerp(Z1, Z0, iz / SZ);
      for (let ix = 0; ix < NX; ix++) {
        // columns crowd toward the letters' line and the flight, and thin toward the far edges
        const tx = ix / SX, x = lerp(X0, X1, tx + 0.11 * Math.sin(tx * Math.PI * 2) * 0.5);
        const v = iz * NX + ix, p = parts(x, z);
        pos[v * 3] = x; pos[v * 3 + 1] = p.y; pos[v * 3 + 2] = z;
        uv[v * 2] = x / 46; uv[v * 2 + 1] = z / 46;
        info[v * 4] = p.m; info[v * 4 + 1] = p.road; info[v * 4 + 2] = p.river; info[v * 4 + 3] = p.mesa;
      }
      if ((iz % 24) === 0) await ctx.yield();
    }
    // colours: by height (strata), by slope (bare rock on the steep, sand and scree on the flat), by what lies there
    const STRATA = ['#4a1a14', '#6a2a1a', '#3a1412', '#7a3a22', '#55201a', '#8a4a2c', '#40181a', '#6a3020'].map((h) => new THREE.Color(h));
    const cSand = new THREE.Color('#9a4526'), cSandHi = new THREE.Color('#c0683a'), cScree = new THREE.Color('#5a2a20'), cRoad = new THREE.Color('#b47a52'), cBed = new THREE.Color('#b89070'), cBedDark = new THREE.Color('#6a4a3a'), cChar = new THREE.Color('#0c0606');
    const c = new THREE.Color(), c2 = new THREE.Color();
    for (let iz = 0; iz < NZ; iz++) {
      for (let ix = 0; ix < NX; ix++) {
        const v = iz * NX + ix, x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
        const xa = Math.max(0, ix - 1), xb = Math.min(SX, ix + 1), za = Math.max(0, iz - 1), zb = Math.min(SZ, iz + 1);
        const dyx = (pos[(iz * NX + xb) * 3 + 1] - pos[(iz * NX + xa) * 3 + 1]) / Math.max(1e-3, pos[(iz * NX + xb) * 3] - pos[(iz * NX + xa) * 3]);
        const dyz = (pos[(zb * NX + ix) * 3 + 1] - pos[(za * NX + ix) * 3 + 1]) / Math.max(1e-3, Math.abs(pos[(zb * NX + ix) * 3 + 2] - pos[(za * NX + ix) * 3 + 2]));
        const slope = Math.sqrt(dyx * dyx + dyz * dyz);
        const m = info[v * 4], road = info[v * 4 + 1], river = info[v * 4 + 2], mesa = info[v * 4 + 3];
        const g = 0.5 + 0.5 * noise.fbm2(x * 0.02, z * 0.02, 3);
        // sand: lit crests, darker hollows
        c.copy(cSand).lerp(cSandHi, ss(2, 12, y) * (1 - m)).multiplyScalar(0.72 + 0.5 * g);
        // rock strata, a band every dozen metres, the bands warped a little so they are not ruled lines
        const band = (y + 7 * noise.n2(x * 0.004, z * 0.004)) / 12, bi = ((Math.floor(band) % STRATA.length) + STRATA.length) % STRATA.length;
        c2.copy(STRATA[bi]).lerp(STRATA[(bi + 1) % STRATA.length], ss(0.7, 1, band - Math.floor(band))).multiplyScalar(0.8 + 0.4 * g);
        const rocky = Math.max(ss(0.3, 0.75, slope), ss(0.5, 0.9, m), ss(8, 30, mesa) * ss(0.25, 0.6, slope));
        c.lerp(c2, rocky);
        c.lerp(cScree, ss(0.05, 0.4, m) * (1 - ss(0.3, 0.7, slope)) * 0.7);                       // scree and the wall's flat ledges
        if (mesa > 30 && slope < 0.2) c.lerp(STRATA[5], 0.5);                                       // a mesa's cap
        c.lerp(cRoad, road * 0.75);                                                                 // the trodden road
        if (river > 0) { const crack = Math.abs(noise.n2(x * 0.09, z * 0.09)); c.lerp(c2.copy(cBed).lerp(cBedDark, ss(0.12, 0.0, crack)), river * 0.85); }
        // the light of the last sun: the wall's face looks back at it a little, far heights catch it
        c.multiplyScalar(0.85 + 0.25 * ss(120, 380, y));
        // THE LETTERS ON THE GROUND: scorched black where they stand, glowing at their feet, their light thrown up the cliff
        const k = Math.round((TEXT_Z0 - z) / ADV - 0.2);
        let glow = 0, scorch = 0, ember = 0;
        for (let j = k - 1; j <= k + 1; j++) {
          const Lt = j >= 0 && j < MESSAGE.length ? letterAt[j] : null; if (!Lt) continue;
          const dz = z - Lt.zc, dx = x - TEXT_X, dy = y - (Lt.base + 20);
          const d2 = dx * dx * (dx > 0 ? 0.55 : 0.28) + dz * dz + dy * dy * 0.15;      // the light reaches further up the wall than out on the plain
          glow += 1 / (1 + d2 / 1500);
          const fd = Math.hypot(dx * 0.9, Math.max(0, Math.abs(dz) - 2.2 * CELL));      // distance from the letter's footprint
          scorch = Math.max(scorch, 1 - ss(6, 34, fd));
          ember = Math.max(ember, (1 - ss(1, 13, fd)) * (0.4 + 0.6 * ss(0.35, 0.7, 0.5 + 0.5 * noise.n2(x * 0.13, z * 0.13))));
        }
        c.lerp(cChar, scorch * 0.82);
        const facing = dyx < 0 || x > TEXT_X ? 1 : 0.45;                                  // ground that slopes away behind the letters takes less
        c.r += 1.75 * glow * 0.6 * facing + 2.6 * ember; c.g += 0.56 * glow * 0.6 * facing + 0.55 * ember; c.b += 0.12 * glow * 0.6 * facing + 0.05 * ember;
        col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
      }
      if ((iz % 30) === 0) await ctx.yield();
    }
    const idx = new Uint32Array(SX * SZ * 6);
    { let q = 0; for (let iz = 0; iz < SZ; iz++) for (let ix = 0; ix < SX; ix++) { const a = iz * NX + ix, b = a + 1, d = a + NX, e = d + 1; idx[q++] = a; idx[q++] = d; idx[q++] = b; idx[q++] = b; idx[q++] = d; idx[q++] = e; } }
    const landGeo = keep(new THREE.BufferGeometry());
    landGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); landGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); landGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    landGeo.setIndex(new THREE.BufferAttribute(idx, 1)); landGeo.computeVertexNormals();
    // (the triangles are wound for a plane whose rows go down -Z; if the normals came out pointing down, turn them)
    { const nrm = landGeo.attributes.normal; let up = 0; for (let i = 0; i < nrm.count; i += 97) up += nrm.getY(i); if (up < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } landGeo.index.needsUpdate = true; landGeo.computeVertexNormals(); } }
    const landMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, map: ripple, bumpMap: ripple, bumpScale: 0.9 }));
    scene.add(new THREE.Mesh(landGeo, landMat));
    await ctx.yield();

    // =====================================================================================================
    // THE SKY: a dusk dome, two small moons, thin lit bars of cloud, the first stars
    // =====================================================================================================
    const SUN = new THREE.Vector3(-0.28, -0.03, -1).normalize();
    const skyMat = keep(new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTime: U.uTime, uSun: { value: SUN },
        uMoonA: { value: new THREE.Vector3(0.42, 0.36, -1).normalize() }, uMoonB: { value: new THREE.Vector3(-0.08, 0.52, -1).normalize() } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: GLSL_N + /* glsl */`
        varying vec3 vDir; uniform vec3 uSun, uMoonA, uMoonB; uniform float uTime;
        vec3 moon(vec3 d, vec3 m, float r, vec3 tint, vec3 base){
          float ang = acos(clamp(dot(d, m), -1.0, 1.0));
          vec3 halo = tint * 0.10 * (1.0 - smoothstep(r, r * 7.0, ang));
          if (ang > r * 1.02) return base + halo;
          vec3 a = normalize(cross(m, vec3(0.0, 1.0, 0.0))), b = cross(a, m);
          vec2 q = vec2(dot(d, a), dot(d, b)) / sin(r);
          float rr = min(dot(q, q), 1.0);
          vec3 n = normalize(q.x * a + q.y * b - sqrt(1.0 - rr) * m);
          float lit = smoothstep(-0.05, 0.25, dot(n, uSun));
          float seas = 0.72 + 0.28 * fbm(q * 3.0 + tint.xy * 9.0);
          vec3 c = tint * (0.035 + 1.25 * lit) * seas + base * 0.35 * (1.0 - lit);
          return mix(base + halo, c, smoothstep(1.0, 0.86, rr));
        }
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec3 top = vec3(0.028, 0.018, 0.085), mid = vec3(0.26, 0.085, 0.29), rose = vec3(0.78, 0.22, 0.26), low = vec3(1.25, 0.50, 0.16);
          float s = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0);
          vec3 c = mix(mid, top, smoothstep(0.06, 0.62, h));
          c = mix(c, rose, (1.0 - smoothstep(0.0, 0.30, h)) * (0.25 + 0.75 * s * s));
          c = mix(c, low, (1.0 - smoothstep(-0.02, 0.13, h)) * (0.2 + 0.8 * pow(s, 3.0)));
          c += vec3(1.6, 0.7, 0.22) * pow(max(dot(d, uSun), 0.0), 60.0) * 0.6;
          // the moons (behind the cloud bars)
          c = moon(d, uMoonA, 0.021, vec3(1.0, 0.82, 0.66), c);
          c = moon(d, uMoonB, 0.011, vec3(0.70, 0.86, 1.0), c);
          // thin bars of cloud low in the sky, lit from under where they lie toward the gone sun
          vec2 cp = vec2(atan(d.x, -d.z) * 2.6, h * 34.0);
          float cl = fbm(cp + vec2(uTime * 0.004, 0.0)) * 0.7 + fbm(cp * vec2(2.3, 1.6) + 7.0) * 0.3;
          float bars = smoothstep(0.50, 0.68, cl) * smoothstep(0.015, 0.06, h) * (1.0 - smoothstep(0.17, 0.33, h));
          float under = pow(s, 2.0) * (1.0 - smoothstep(0.03, 0.24, h));
          vec3 cc = mix(vec3(0.17, 0.065, 0.16), vec3(1.7, 0.62, 0.24), under);
          cc = mix(cc, vec3(1.9, 0.9, 0.5), under * smoothstep(0.62, 0.5, cl) * 0.6);      // a bright rim on a bar's thin edge
          c = mix(c, cc, bars * 0.88);
          // a wisp or two of high cirrus, pink
          float ci = fbm(vec2(atan(d.x, -d.z) * 5.0 + h * 3.0, h * 9.0) + 31.0);
          c += vec3(0.30, 0.10, 0.14) * smoothstep(0.58, 0.8, ci) * smoothstep(0.25, 0.45, h) * (1.0 - smoothstep(0.6, 0.9, h));
          c = mix(c, vec3(0.34, 0.15, 0.19), smoothstep(0.0, -0.08, h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(9000, 48, 24)), skyMat); sky.renderOrder = -10; sky.frustumCulled = false;
    scene.add(sky);
    // the first stars: few and faint low down, more overhead and behind us where the sky is darker
    const starSets = [];
    for (const [n, size, op] of [[Math.round(1100 * detail), 1.6, 0.7], [Math.round(160 * detail), 2.8, 0.95]]) {
      const sp = new Float32Array(n * 3), sc = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        let a, e; do { a = R.sky() * Math.PI * 2; e = Math.asin(R.sky.range(0.12, 1)); } while (Math.sin(e) < 0.45 && Math.cos(a - Math.atan2(SUN.z, SUN.x)) > 0.2 && R.sky() < 0.8);
        const r = 8600; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
        const w = R.sky(), b = R.sky.range(0.45, 1); sc[i * 3] = b * (0.85 + 0.15 * w); sc[i * 3 + 1] = b * 0.88; sc[i * 3 + 2] = b * (1 - 0.2 * w);
      }
      const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(sp, 3)); g.setAttribute('color', new THREE.BufferAttribute(sc, 3));
      const mt = keep(new THREE.PointsMaterial({ vertexColors: true, size, sizeAttenuation: false, transparent: true, opacity: op, depthWrite: false, fog: false }));
      const st = new THREE.Points(g, mt); st.frustumCulled = false; st.renderOrder = -9; scene.add(st); starSets.push(st);
    }

    // ---- the lights: the sky's violet from above and the ground's red from below, the last of the sun raking in low from ahead-left,
    // a cool breath from the larger moon, and one fire-lamp for each word
    const hemi = new THREE.HemisphereLight(new THREE.Color('#5c3c80'), new THREE.Color('#5a2010'), Math.PI * 0.5);
    const sun = new THREE.DirectionalLight(new THREE.Color('#ff8444'), Math.PI * 0.62); sun.position.set(-280, 95, -1000);
    const moonL = new THREE.DirectionalLight(new THREE.Color('#8ea0d8'), Math.PI * 0.10); moonL.position.set(420, 360, -1000);
    scene.add(hemi, sun, sun.target, moonL, moonL.target);
    const wordLamps = [];
    for (const [a, b] of words) {
      const zc = (TEXT_Z0 - a * ADV + TEXT_Z0 - b * ADV - 5 * CELL) / 2;
      const L = new THREE.PointLight(new THREE.Color('#ff7a28'), 110, 650, 1); L.position.set(TEXT_X + 30, height(TEXT_X, zc) + 30, zc);
      scene.add(L); wordLamps.push({ L, ph: R.fire() * 50 });
    }
    await ctx.yield();

    // =====================================================================================================
    // THE LETTERS
    // =====================================================================================================
    const strokes = [];
    for (let li = 0; li < letters.length; li++) {
      const Lt = letters[li], rows = FONT[Lt.ch];
      for (let r = 0; r < 7; r++) for (let cI = 0; cI < 5; cI++) {
        if (rows[r][cI] !== '1') continue;
        const open = r === 0 || rows[r - 1][cI] !== '1';      // nothing burns above this dot: its flame stands tall
        strokes.push({ li, x: TEXT_X, y: Lt.base + (6 - r + 0.5) * CELL, z: Lt.z0 - (cI + 0.5) * CELL, row: r, open, ph: R.fire() });
      }
    }
    const NSK = strokes.length, M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), E = new THREE.Euler();
    const seedAttr = (fn, n = NSK) => { const a = new Float32Array(n * 3); for (let s = 0; s < n; s++) { const o = fn(s); a[s * 3] = o[0]; a[s * 3 + 1] = o[1]; a[s * 3 + 2] = o[2]; } return new THREE.InstancedBufferAttribute(a, 3); };

    // (1) the burning blocks: slightly irregular, so a letter is a stack of coals and not a sign
    const blockGeo = keep(new THREE.BoxGeometry(CELL * 0.5, CELL * 0.98, CELL * 0.98, 1, 3, 3));
    { const p = blockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.07 * CELL * Math.sin(p.getY(i) * 3.1 + p.getZ(i) * 2.3); p.setX(i, p.getX(i) + (p.getX(i) > 0 ? k : 0)); } }
    blockGeo.setAttribute('aSeed', seedAttr((s) => [strokes[s].ph, strokes[s].row / 6, letters[strokes[s].li].rate + letters[strokes[s].li].phase]));
    const blockMat = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime }, fog: false,
      vertexShader: /* glsl */`attribute vec3 aSeed; varying vec3 vW; varying vec3 vSeed; varying vec3 vN;
        void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; vSeed = aSeed; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: GLSL_N + /* glsl */`uniform float uTime; varying vec3 vW; varying vec3 vSeed; varying vec3 vN;
        void main(){
          float n = fbm(vec2(vW.z * 0.33 + vSeed.x, vW.y * 0.27 - uTime * 2.1));
          float n2 = fbm(vec2(vW.z * 0.95, vW.y * 0.75 - uTime * 4.2 + vSeed.x * 3.0));
          float flick = 0.84 + 0.16 * sin(uTime * 2.3 * fract(vSeed.z) * 2.0 + vSeed.z * 40.0) * sin(uTime * 5.1 + vSeed.x * 9.0);
          float heat = clamp(0.5 + 0.7 * n + 0.3 * n2 - 0.16 * vSeed.y, 0.0, 1.5) * flick;
          vec3 c = mix(vec3(1.5, 0.20, 0.03), vec3(2.6, 1.05, 0.22), smoothstep(0.5, 0.95, heat));
          c = mix(c, vec3(3.1, 2.4, 1.3), smoothstep(0.98, 1.3, heat));
          c *= 0.42 + 0.58 * smoothstep(0.22, 0.5, n);                     // dark veins of coal crawling up through it
          c *= 0.75 + 0.25 * abs(vN.x);                                    // the faces toward the plain burn brightest
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    const blocks = new THREE.InstancedMesh(blockGeo, blockMat, NSK);
    for (let s = 0; s < NSK; s++) { const k = strokes[s]; M.makeTranslation(k.x, k.y, k.z); blocks.setMatrixAt(s, M); }
    blocks.frustumCulled = false; scene.add(blocks);

    // (2) tongues of flame off every block: three crossed sheets each, tall on the open tops
    const flameMat = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uGain: { value: 0.85 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: /* glsl */`attribute vec3 aSeed; uniform float uTime; varying vec2 vUv; varying vec3 vSeed;
        void main(){ vUv = uv; vSeed = aSeed; vec3 p = position; p.y *= aSeed.y;
          float sway = sin(uTime * 2.6 + aSeed.x * 6.283 + uv.y * 3.0) * 0.55 + sin(uTime * 4.3 + aSeed.x * 11.0) * 0.3;
          float k = uv.y * uv.y * aSeed.y;
          p.z += (sway - 1.3) * k * 2.2;                 // leaning downwind, more the higher it goes
          p.x += (sin(uTime * 3.1 + aSeed.x * 17.0) * 0.6 - 0.5) * k * 1.4;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0); }`,
      fragmentShader: GLSL_N + /* glsl */`uniform float uTime, uGain; varying vec2 vUv; varying vec3 vSeed;
        void main(){ float x = (vUv.x - 0.5) * 2.0;
          float n = fbm(vec2(vUv.x * 2.2 + vSeed.x * 10.0, vUv.y * 2.6 * vSeed.y - uTime * 2.5 - vSeed.x * 5.0));
          float n2 = fbm(vec2(vUv.x * 5.0 + vSeed.x * 3.0, vUv.y * 6.0 * vSeed.y - uTime * 4.6));
          float f = (1.0 - abs(x) * (0.9 + vUv.y * 0.7)) + (n - 0.5) * 1.15 + (n2 - 0.5) * 0.45 - vUv.y * 1.12;
          f = smoothstep(0.0, 0.5, f) * smoothstep(0.0, 0.07, vUv.y);
          vec3 c = mix(vec3(1.3, 0.16, 0.02), vec3(2.4, 0.92, 0.18), smoothstep(0.2, 0.7, f));
          c = mix(c, vec3(2.9, 2.1, 1.0), smoothstep(0.78, 1.0, f));
          gl_FragColor = vec4(c * uGain * vSeed.z, f); }`,
    }));
    const flameSets = [];
    for (let sheet = 0; sheet < 3; sheet++) {
      const g = keep(new THREE.PlaneGeometry(CELL * 1.5, CELL * 3.3, 2, 8));
      g.translate(0, CELL * 1.65, 0); g.rotateY(Math.PI / 2 + (sheet - 1) * 0.9);
      g.setAttribute('aSeed', seedAttr((s) => [strokes[s].ph + sheet * 0.37, strokes[s].open ? (strokes[s].row === 0 ? 1.25 : 0.95) : 0.42, sheet === 1 ? 1 : 0.6]));
      const fm = new THREE.InstancedMesh(g, flameMat, NSK);
      for (let s = 0; s < NSK; s++) { const k = strokes[s]; M.makeTranslation(k.x + CELL * 0.16, k.y - CELL * 0.45, k.z); fm.setMatrixAt(s, M); }
      fm.frustumCulled = false; fm.renderOrder = 3; scene.add(fm); flameSets.push(fm);
    }
    await ctx.yield();

    // (3) the bed each letter stands in: cracked coals and slag heaped at its foot
    { const n = letters.length * 16, g = keep(new THREE.IcosahedronGeometry(1, 0)), mt = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
      const coals = new THREE.InstancedMesh(g, mt, n), cc = new THREE.Color(); let q = 0;
      for (const Lt of letters) for (let j = 0; j < 16; j++) {
        const z = Lt.zc + R.rocks.range(-2.9, 2.9) * CELL, x = TEXT_X + R.rocks.range(-7, 12), s = R.rocks.range(0.8, 3.0);
        E.set(R.rocks() * 6, R.rocks() * 6, R.rocks() * 6); Q.setFromEuler(E);
        M.compose(V.set(x, height(x, z) + s * 0.25, z), Q, SC.set(s * R.rocks.range(0.8, 1.5), s * R.rocks.range(0.45, 0.9), s * R.rocks.range(0.8, 1.5))); coals.setMatrixAt(q, M);
        const hot = R.rocks(); coals.setColorAt(q, hot < 0.45 ? cc.setRGB(0.04, 0.02, 0.02) : cc.setRGB(0.5 + 2.2 * hot, 0.08 + 0.7 * hot * hot, 0.02 + 0.1 * hot)); q++;
      }
      coals.frustumCulled = false; scene.add(coals); }

    // (4) hot air: a wavering, barely-there column over each letter
    { const g = keep(new THREE.PlaneGeometry(CELL * 6.4, 95, 1, 1)); g.translate(0, 47.5, 0); g.rotateY(Math.PI / 2);
      g.setAttribute('aSeed', seedAttr((s) => [letters[s].phase, 1, letters[s].rate], letters.length));
      const mt = keep(new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
        vertexShader: /* glsl */`attribute vec3 aSeed; varying vec2 vUv; varying vec3 vSeed; void main(){ vUv = uv; vSeed = aSeed; vec3 p = position; p.z -= uv.y * uv.y * 26.0; p.x -= uv.y * uv.y * 9.0;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0); }`,
        fragmentShader: GLSL_N + /* glsl */`uniform float uTime; varying vec2 vUv; varying vec3 vSeed;
          void main(){ float w = fbm(vec2(vUv.x * 7.0 + sin(vUv.y * 9.0 - uTime * 1.6 + vSeed.x) * 0.5, vUv.y * 5.0 - uTime * 0.9 + vSeed.x));
            float streak = smoothstep(0.45, 0.75, w) * (1.0 - smoothstep(0.25, 1.0, vUv.y)) * smoothstep(0.0, 0.1, vUv.y) * (1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0));
            gl_FragColor = vec4(vec3(1.0, 0.36, 0.10) * 0.22, streak); }` }));
      const haze = new THREE.InstancedMesh(g, mt, letters.length);
      for (let s = 0; s < letters.length; s++) { M.makeTranslation(TEXT_X + CELL * 0.6, letters[s].base + 6.4 * CELL, letters[s].zc); haze.setMatrixAt(s, M); }
      haze.frustumCulled = false; haze.renderOrder = 2; scene.add(haze); }

    // (5) sparks: flung up off the blocks, carried downwind, dying from yellow to red
    { const n = Math.round(9000 * detail), g = keep(new THREE.BufferGeometry()), p = new Float32Array(n * 3), sd = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const k = strokes[Math.floor(R.fire() * NSK)];
        p[i * 3] = k.x + R.fire.range(-1, 5); p[i * 3 + 1] = k.y + R.fire.range(-3, 3); p[i * 3 + 2] = k.z + R.fire.range(-3, 3);
        sd[i * 3] = R.fire(); sd[i * 3 + 1] = R.fire.range(0.07, 0.2); sd[i * 3 + 2] = R.fire.range(0.4, 1.6); }
      g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 3));
      const mt = keep(new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime, uWind: { value: WIND } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
        vertexShader: /* glsl */`attribute vec3 aSeed; uniform float uTime; uniform vec3 uWind; varying float vT; varying float vK;
          void main(){ float t = fract(uTime * aSeed.y + aSeed.x); vT = t; vK = aSeed.z;
            vec3 p = position + vec3(0.0, t * (55.0 + 50.0 * aSeed.z), 0.0) + uWind * (t * t * 95.0 * aSeed.z + t * 12.0);
            p.x += sin(t * 9.0 + aSeed.x * 60.0) * 3.5 * t * aSeed.z; p.z += cos(t * 7.0 + aSeed.x * 37.0) * 3.5 * t;
            vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
            gl_PointSize = clamp(780.0 * (0.55 + 0.5 * aSeed.z) * (1.0 - 0.6 * t) / max(1.0, -mv.z), 1.0, 9.0); }`,
        fragmentShader: /* glsl */`varying float vT; varying float vK;
          void main(){ vec2 q = gl_PointCoord - 0.5; float r = 1.0 - smoothstep(0.1, 0.5, length(q));
            float a = r * (1.0 - vT) * smoothstep(0.0, 0.04, vT) * (0.6 + 0.4 * sin(vT * 90.0 * vK));
            gl_FragColor = vec4(mix(vec3(2.8, 1.7, 0.5), vec3(1.6, 0.22, 0.03), smoothstep(0.1, 0.8, vT)), a); }` }));
      const sparks = new THREE.Points(g, mt); sparks.frustumCulled = false; sparks.renderOrder = 4; scene.add(sparks); }
    await ctx.yield();

    // (6) smoke: a plume off each letter, lit orange from under, going grey-violet as it leans away downwind
    { const per = Math.max(8, Math.round(18 * detail)), n = letters.length * per, g = keep(new THREE.PlaneGeometry(1, 1));
      const base = new Float32Array(n * 3), sd = new Float32Array(n * 4);
      for (let l = 0; l < letters.length; l++) for (let j = 0; j < per; j++) { const q = l * per + j, Lt = letters[l];
        base[q * 3] = TEXT_X - 2 + R.fire.range(-3, 3); base[q * 3 + 1] = Lt.base + 6.2 * CELL; base[q * 3 + 2] = Lt.zc + R.fire.range(-2, 2) * CELL;
        sd[q * 4] = (j + R.fire()) / per; sd[q * 4 + 1] = R.fire.range(0.8, 1.2); sd[q * 4 + 2] = R.fire.range(0.75, 1.35); sd[q * 4 + 3] = R.fire(); }
      g.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3)); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 4));
      const mt = keep(new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime, uWind: { value: WIND } }, transparent: true, depthWrite: false, fog: false,
        vertexShader: /* glsl */`attribute vec3 aBase; attribute vec4 aSeed; uniform float uTime; uniform vec3 uWind; varying vec2 vUv; varying float vT; varying float vS;
          void main(){ float t = fract(uTime * 0.028 * aSeed.y + aSeed.x); vT = t; vS = aSeed.w; vUv = uv;
            vec3 c = aBase + vec3(0.0, 12.0 + 250.0 * pow(t, 0.72), 0.0) + uWind * (t * t * 520.0 + t * 70.0);
            c.x += sin(aSeed.w * 40.0 + t * 5.0) * 22.0 * t; c.z += cos(aSeed.w * 23.0 + t * 4.0) * 22.0 * t;
            float size = aSeed.z * (20.0 + 170.0 * t);
            float rot = aSeed.w * 6.283 + t * 1.5; vec2 o = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * position.xy;
            vec4 mv = viewMatrix * vec4(c, 1.0); mv.xy += o * size; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: GLSL_N + /* glsl */`varying vec2 vUv; varying float vT; varying float vS;
          void main(){ vec2 q = (vUv - 0.5) * 2.0; float r = length(q);
            float n = fbm(q * 1.7 + vS * 31.0 + vec2(0.0, vT * 2.0));
            float a = (1.0 - smoothstep(0.25, 1.0, r + (n - 0.5) * 0.7)) * pow(1.0 - vT, 1.3) * smoothstep(0.0, 0.07, vT) * 0.46;
            vec3 c = mix(vec3(1.25, 0.40, 0.10), vec3(0.085, 0.05, 0.08), smoothstep(0.0, 0.26, vT));
            c += vec3(0.30, 0.10, 0.09) * smoothstep(0.3, 1.0, vT) * (0.5 + 0.5 * q.y);      // the top of the plume catches the last of the sky
            gl_FragColor = vec4(c, a); }` }));
      const smoke = new THREE.InstancedMesh(g, mt, n); smoke.frustumCulled = false; smoke.renderOrder = 1; scene.add(smoke); }
    await ctx.yield();

    // =====================================================================================================
    // WHAT LIES ON THE PLAIN: boulders, scrub, bones
    // =====================================================================================================
    { const n = Math.round(900 * detail), g = keep(new THREE.DodecahedronGeometry(1, 0)), mt = keep(new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }));
      const rocks = new THREE.InstancedMesh(g, mt, n), cc = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const kind = R.rocks(), z = R.rocks.range(Z0 + 150, 300);
        let x = kind < 0.45 ? R.rocks.range(-330, -105) : kind < 0.7 ? riverX(z) + R.rocks.range(-28, 28) : R.rocks.range(-95, 260);
        if (Math.abs(x - roadX(z)) < 8) x += 16;
        const big = kind < 0.45 ? R.rocks.range(1, 6.5) * (R.rocks() < 0.08 ? 2.2 : 1) : kind < 0.7 ? R.rocks.range(0.5, 2.2) : R.rocks.range(0.5, 3.6);
        E.set(R.rocks() * 6, R.rocks() * 6, R.rocks() * 6); Q.setFromEuler(E);
        M.compose(V.set(x, height(x, z) + big * 0.2, z), Q, SC.set(big * R.rocks.range(0.7, 1.4), big * R.rocks.range(0.5, 1), big * R.rocks.range(0.7, 1.4))); rocks.setMatrixAt(i, M);
        const sh = R.rocks.range(0.6, 1.1); rocks.setColorAt(i, kind < 0.7 && kind >= 0.45 ? cc.setRGB(0.5 * sh, 0.36 * sh, 0.28 * sh) : cc.setRGB(0.36 * sh, 0.14 * sh, 0.1 * sh));
      }
      rocks.frustumCulled = false; scene.add(rocks); }
    await ctx.yield();
    { // scrub: dry thorn in clumps of spikes, thicker along the riverbed, none in the scorched ground
      const shrubs = Math.round(620 * detail), per = 4, g = keep(new THREE.ConeGeometry(0.5, 1, 5)), mt = keep(new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }));
      g.translate(0, 0.5, 0);
      const scrub = new THREE.InstancedMesh(g, mt, shrubs * per), cc = new THREE.Color(); let q = 0;
      for (let i = 0; i < shrubs; i++) {
        const z = R.scrub.range(Z0 + 150, 300); let x = R.scrub() < 0.4 ? riverX(z) + R.scrub.sign() * R.scrub.range(18, 42) : R.scrub.range(-90, 250);
        if (Math.abs(x - roadX(z)) < 7) x += 14;
        const y = height(x, z), s = R.scrub.range(0.7, 2.2), dry = R.scrub();
        for (let j = 0; j < per; j++) {
          E.set(R.scrub.range(-0.7, 0.7), R.scrub() * 6, R.scrub.range(-0.7, 0.7)); Q.setFromEuler(E);
          M.compose(V.set(x + R.scrub.range(-0.5, 0.5) * s, y - 0.1, z + R.scrub.range(-0.5, 0.5) * s), Q, SC.set(s * 0.8, s * R.scrub.range(0.8, 1.6), s * 0.8)); scrub.setMatrixAt(q, M);
          scrub.setColorAt(q, cc.setRGB(0.20 + 0.16 * dry, 0.17 + 0.05 * dry, 0.09)); q++;
        }
      }
      scrub.frustumCulled = false; scene.add(scrub); }
    { // bones: the ribs, spine and skull of a few very large things that came to read the message and stayed
      const NSKEL = 5, RIBS = 9, ribG = keep(new THREE.TorusGeometry(1, 0.075, 5, 14, Math.PI)), boneM = keep(new THREE.MeshStandardMaterial({ color: '#d9c6a8', roughness: 0.9 }));
      const ribs = new THREE.InstancedMesh(ribG, boneM, NSKEL * RIBS), spineG = keep(new THREE.CylinderGeometry(0.5, 0.35, 1, 6)), spines = new THREE.InstancedMesh(spineG, boneM, NSKEL * 2);
      const skullG = keep(new THREE.IcosahedronGeometry(1, 1)), skulls = new THREE.InstancedMesh(skullG, boneM, NSKEL);
      const yawQ = new THREE.Quaternion(), tiltQ = new THREE.Quaternion(), YA = new THREE.Vector3(0, 1, 0), XA = new THREE.Vector3(1, 0, 0), fwd = new THREE.Vector3();
      for (let k = 0; k < NSKEL; k++) {
        const z = lerp(-150, END_Z + 100, (k + R.bones.range(0.1, 0.9)) / NSKEL), x = k % 2 ? riverX(z) + R.bones.range(-10, 10) : R.bones.range(28, 80);
        const yaw = R.bones.range(-0.6, 0.6), S = R.bones.range(5, 9.5), gap = S * 0.42; yawQ.setFromAxisAngle(YA, yaw); fwd.set(0, 0, -1).applyQuaternion(yawQ);
        for (let r = 0; r < RIBS; r++) {
          const t = r / (RIBS - 1), s = S * (0.45 + 0.6 * Math.sin(Math.PI * (0.15 + 0.8 * t))), px = x + fwd.x * gap * r, pz = z + fwd.z * gap * r;
          tiltQ.setFromAxisAngle(XA, R.bones.range(-0.12, 0.12) - 0.15); Q.copy(yawQ).multiply(tiltQ);
          M.compose(V.set(px, height(px, pz) - s * 0.12, pz), Q, SC.set(s, s * R.bones.range(0.92, 1.08), s)); ribs.setMatrixAt(k * RIBS + r, M);
        }
        const len = gap * (RIBS - 1), mx = x + fwd.x * len * 0.5, mz = z + fwd.z * len * 0.5;
        tiltQ.setFromAxisAngle(XA, Math.PI / 2); Q.copy(yawQ).multiply(tiltQ);
        M.compose(V.set(mx, height(mx, mz) + S * 0.86, mz), Q, SC.set(S * 0.2, len * 1.1, S * 0.2)); spines.setMatrixAt(k * 2, M);
        const tx = x - fwd.x * len * 0.5, tz = z - fwd.z * len * 0.5;                                    // the tail, lying on the sand
        M.compose(V.set(tx, height(tx, tz) + S * 0.2, tz), Q, SC.set(S * 0.1, len * 0.9, S * 0.1)); spines.setMatrixAt(k * 2 + 1, M);
        const hx = x + fwd.x * (len + S * 0.9), hz = z + fwd.z * (len + S * 0.9);
        M.compose(V.set(hx, height(hx, hz) + S * 0.3, hz), yawQ, SC.set(S * 0.42, S * 0.36, S * 0.7)); skulls.setMatrixAt(k, M);
      }
      for (const o of [ribs, spines, skulls]) { o.frustumCulled = false; scene.add(o); } }
    await ctx.yield();

    // =====================================================================================================
    // THE ROAD'S PEOPLE: a souvenir stall where the road sets out, pilgrims in a long line, a small limping robot
    // =====================================================================================================
    const std = (color, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }));
    const lit = (r, g, b) => keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false }));
    const unitBox = keep(new THREE.BoxGeometry(1, 1, 1)), unitCyl = keep(new THREE.CylinderGeometry(0.5, 0.5, 1, 10)), unitSph = keep(new THREE.SphereGeometry(0.5, 14, 10));
    const put = (parent, geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); parent.add(m); return m; };

    // ---- the stall: a counter under a striped awning, shelves of tiny burning letters, a lantern, a keeper
    { const stall = new THREE.Group(), zS = -22, xS = roadX(zS) + 8.5;
      stall.position.set(xS, height(xS, zS), zS); stall.rotation.y = -Math.PI / 2 + 0.25; stall.scale.setScalar(1.7);      // its counter faces the road
      const wood = std('#5a3a22'), dark = std('#2c1c12'), cream = std('#e8d8b8'), red = std('#b02c20'), cloth = std('#3a5a78');
      put(stall, unitBox, wood, 0, 0.55, 0.7, 3.6, 1.1, 0.7);                                               // the counter
      put(stall, unitBox, cloth, 0, 0.62, 1.06, 3.7, 0.9, 0.04);                                            // its cloth front
      for (const sx of [-1.75, 1.75]) for (const sz of [-0.9, 1.0]) put(stall, unitCyl, dark, sx, 1.35, sz, 0.09, 2.7, 0.09);      // four posts
      for (let i = 0; i < 9; i++) put(stall, unitBox, i % 2 ? cream : red, -1.8 + i * 0.45, 2.78 - 0.0, 0.25, 0.45, 0.05, 2.9, -0.2, 0, 0);      // the awning, striped
      for (let i = 0; i < 9; i++) put(stall, unitBox, i % 2 ? red : cream, -1.8 + i * 0.45, 2.38, 1.66, 0.45, 0.3, 0.04);                       // its scalloped front edge
      put(stall, unitBox, dark, 0, 1.5, -0.95, 3.6, 2.6, 0.08);                                             // the back board
      for (const sy of [1.2, 1.75, 2.3]) put(stall, unitBox, wood, 0, sy, -0.75, 3.3, 0.05, 0.35);          // shelves
      const tiny = lit(2.6, 1.0, 0.25), tiny2 = lit(2.2, 0.5, 0.1);                                          // souvenirs: little letters of fire
      for (const sy of [1.2, 1.75, 2.3]) for (let i = 0; i < 11; i++) if (R.folk() < 0.8) put(stall, unitBox, R.folk() < 0.5 ? tiny : tiny2, -1.5 + i * 0.3, sy + 0.15, -0.75, 0.1, 0.2 + R.folk() * 0.12, 0.06);
      for (let i = 0; i < 6; i++) put(stall, unitBox, R.folk() < 0.5 ? tiny : tiny2, -1.3 + i * 0.5, 1.2, 0.7, 0.12, 0.22, 0.07);
      put(stall, unitBox, cream, 0, 3.35, 1.0, 2.6, 0.55, 0.06, -0.1);                                       // the sign board
      for (let i = 0; i < 7; i++) put(stall, unitBox, dark, -0.95 + i * 0.32, 3.36, 1.04, 0.2, 0.09 + 0.2 * R.folk(), 0.02, -0.1);      // its lettering, too small to read from the air
      put(stall, unitCyl, dark, 1.75, 2.45, 1.35, 0.03, 0.5, 0.03); put(stall, unitSph, lit(3.0, 1.9, 0.8), 1.75, 2.12, 1.35, 0.3, 0.36, 0.3);      // the lantern
      const lamp = new THREE.PointLight(new THREE.Color('#ffb060'), 26, 60, 1); lamp.position.set(1.75, 2.1, 1.6); stall.add(lamp);
      put(stall, unitCyl, std('#6a4a8a'), 0.3, 0.85, -0.1, 0.75, 1.7, 0.75).geometry; put(stall, unitSph, std('#c89a78'), 0.3, 1.95, -0.1, 0.42, 0.46, 0.42);      // the keeper
      put(stall, unitCyl, std('#8a6a3a'), 0.3, 2.2, -0.1, 0.85, 0.06, 0.85);                                 // in a wide hat
      for (let i = 0; i < 10; i++) { const fl = put(stall, unitBox, [red, cream, cloth][i % 3], -2.6 - i * 0.42, 2.3 - Math.sin(i / 9 * Math.PI) * 0.35, 1.0, 0.26, 0.3, 0.02); fl.rotation.z = 0.1; }      // bunting out to a pole
      put(stall, unitCyl, dark, -6.6, 1.3, 1.0, 0.07, 2.6, 0.07);
      put(stall, unitBox, wood, 2.9, 0.3, 0.9, 0.9, 0.6, 0.7); put(stall, unitBox, wood, 3.4, 0.25, 0.1, 0.7, 0.5, 0.7); put(stall, unitCyl, std('#7a5a3a'), -2.7, 0.4, -0.5, 0.7, 0.8, 0.7);      // crates and a barrel
      scene.add(stall); }

    // ---- the pilgrims: robed walkers in ones and twos, a few tall long-necked ones, a few beasts with packs; one in three carries a light
    const NP = Math.round(84 * Math.min(1.3, Math.max(0.6, detail)));
    const robeG = keep(new THREE.CylinderGeometry(0.16, 0.48, 1.5, 7)); robeG.translate(0, 0.75, 0);
    const pilM = keep(new THREE.MeshStandardMaterial({ roughness: 0.95 })), headM = keep(new THREE.MeshStandardMaterial({ roughness: 0.8 }));
    const robes = new THREE.InstancedMesh(robeG, pilM, NP), heads = new THREE.InstancedMesh(unitSph, headM, NP), lamps = new THREE.InstancedMesh(unitSph, lit(3.0, 1.6, 0.5), NP);
    const beastG = keep(new THREE.SphereGeometry(0.5, 10, 8)), packs = new THREE.InstancedMesh(unitBox, std('#7a5a3a'), NP);
    const ROBES = ['#8a2a1a', '#c8a050', '#3a4a7a', '#e0d8c8', '#5a2a5a', '#2a5a4a', '#a85a2a', '#383038'].map((h) => new THREE.Color(h));
    const pilgrims = [];
    { const cc = new THREE.Color(), zA = 140, zB = END_Z - 60, span = zA - zB;
      for (let i = 0; i < NP; i++) {
        // they bunch: more near the start of the road and in front of each word, where they stop and stare
        let z0 = zA - R.folk() * span; if (R.folk() < 0.35) z0 = zA - R.folk() * 260;
        const kind = R.folk() < 0.1 ? 2 : R.folk() < 0.14 ? 1 : 0;      // 0 walker, 1 tall one, 2 beast
        const stopped = kind === 0 && R.folk() < 0.22 && z0 < -60;
        pilgrims.push({ z0, off: R.folk.range(-2.6, 2.6), sp: stopped ? 0 : R.folk.range(0.55, 1.05) * (kind === 2 ? 0.8 : 1), ph: R.folk() * 9, kind, h: kind === 1 ? R.folk.range(1.7, 2.1) : kind === 2 ? 1.25 : R.folk.range(0.9, 1.25), lamp: kind !== 2 && R.folk() < 0.34, stopped, span });
        robes.setColorAt(i, kind === 2 ? cc.setRGB(0.32, 0.22, 0.16) : cc.copy(ROBES[Math.floor(R.folk() * ROBES.length)]).multiplyScalar(R.folk.range(0.6, 1)));
        heads.setColorAt(i, kind === 1 ? cc.setRGB(0.5, 0.62, 0.5) : kind === 2 ? cc.setRGB(0.3, 0.2, 0.15) : cc.setRGB(0.62, 0.45, 0.34).multiplyScalar(R.folk.range(0.6, 1.1)));
      } }
    for (const o of [robes, heads, lamps, packs]) { o.frustumCulled = false; scene.add(o); }
    const ZERO = new THREE.Matrix4().makeScale(0, 0, 0), QI = new THREE.Quaternion();
    function movePilgrims(time) {
      const zA = 140, zB = END_Z - 60, span = zA - zB;
      for (let i = 0; i < NP; i++) {
        const P = pilgrims[i]; let z = P.z0 - P.sp * time; z = zA - ((((zA - z) % span) + span) % span);
        const x = roadX(z) + P.off + (P.stopped ? -5 : 0), y = height(x, z), step = P.sp > 0 ? Math.abs(Math.sin(time * 3.1 + P.ph)) * 0.1 : 0, s = 1.9 * P.h;
        if (P.kind === 2) {      // a pack beast: a barrel body on the road, a low head, a load
          E.set(0, 0, 0); M.compose(V.set(x, y + 1.0 + step, z), QI, SC.set(1.5, 1.5, 3.1)); robes.setMatrixAt(i, ZERO);
          heads.setMatrixAt(i, M.compose(V.set(x, y + 1.05 + step, z), QI, SC.set(1.5, 1.4, 3.0)));
          packs.setMatrixAt(i, M.compose(V.set(x, y + 1.95 + step, z + 0.2), QI, SC.set(1.7, 0.8, 1.5))); lamps.setMatrixAt(i, ZERO);
          continue;
        }
        const lean = P.stopped ? -0.12 : 0.06; E.set(lean, 0, Math.sin(time * 3.1 + P.ph) * 0.04 * (P.sp > 0 ? 1 : 0)); Q.setFromEuler(E);
        robes.setMatrixAt(i, M.compose(V.set(x, y + step, z), Q, SC.set(s * (P.kind === 1 ? 0.7 : 1), s, s * (P.kind === 1 ? 0.7 : 1))));
        heads.setMatrixAt(i, M.compose(V.set(x, y + step + s * 1.62, z - lean * 2), QI, SC.set(s * 0.42, s * (P.kind === 1 ? 0.6 : 0.45), s * 0.42)));
        packs.setMatrixAt(i, ZERO);
        if (P.lamp) lamps.setMatrixAt(i, M.compose(V.set(x + 0.9, y + step + s * 1.0 + Math.sin(time * 3.1 + P.ph) * 0.06, z - 0.5), QI, SC.set(0.34, 0.42, 0.34))); else lamps.setMatrixAt(i, ZERO);
      }
      robes.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = packs.instanceMatrix.needsUpdate = true;
    }
    movePilgrims(0);
    await ctx.yield();

    // ---- the robot: small, pale, a head too big for it, hung low; one leg that does not work. It has come a very long way.
    const robot = new THREE.Group(), rb = { hips: new THREE.Group(), head: new THREE.Group(), legL: new THREE.Group(), legR: new THREE.Group(), armL: new THREE.Group(), armR: new THREE.Group() };
    { const shell = std('#cfd2cc', { roughness: 0.45, metalness: 0.3 }), joint = std('#3c4044', { roughness: 0.6, metalness: 0.5 }), eye = lit(0.5, 2.2, 1.1);
      robot.add(rb.hips); rb.hips.position.y = 1.05;
      put(rb.hips, unitBox, shell, 0, 0.42, 0, 0.72, 0.8, 0.5); put(rb.hips, unitCyl, joint, 0, 0.0, 0, 0.5, 0.14, 0.4); put(rb.hips, unitBox, joint, 0, 0.5, 0.26, 0.3, 0.3, 0.03);
      rb.head.position.set(0, 0.9, 0.05); rb.hips.add(rb.head);
      put(rb.head, unitCyl, joint, 0, 0.02, 0, 0.16, 0.14, 0.16); put(rb.head, unitSph, shell, 0, 0.5, 0.08, 1.15, 0.95, 1.05);      // the great round head
      put(rb.head, unitBox, joint, 0, 0.42, 0.56, 0.62, 0.16, 0.08); put(rb.head, unitBox, eye, -0.16, 0.42, 0.6, 0.13, 0.05, 0.03); put(rb.head, unitBox, eye, 0.16, 0.42, 0.6, 0.13, 0.05, 0.03);
      for (const [g, sx] of [[rb.armL, -0.47], [rb.armR, 0.47]]) { g.position.set(sx, 0.72, 0); rb.hips.add(g); put(g, unitSph, joint, 0, 0, 0, 0.2, 0.2, 0.2); put(g, unitBox, shell, 0, -0.38, 0, 0.14, 0.66, 0.16); put(g, unitBox, joint, 0, -0.78, 0.03, 0.16, 0.18, 0.2); }
      for (const [g, sx] of [[rb.legL, -0.2], [rb.legR, 0.2]]) { g.position.set(sx, 1.0, 0); robot.add(g); put(g, unitBox, shell, 0, -0.26, 0, 0.2, 0.5, 0.22); put(g, unitSph, joint, 0, -0.52, 0, 0.2, 0.2, 0.2); put(g, unitBox, shell, 0, -0.76, 0, 0.17, 0.44, 0.19); put(g, unitBox, joint, 0, -0.97, 0.08, 0.24, 0.1, 0.42); }
      robot.scale.setScalar(2.1); scene.add(robot); }
    const ROBOT_Z0 = END_Z + 190;
    function moveRobot(time) {
      // a step, a drag, a pause: the good leg swings, the other is brought up stiff behind it
      const ph = time * 1.7, swing = Math.sin(ph), z = ROBOT_Z0 - 0.5 * time - 0.18 * Math.sin(ph), x = roadX(z) + 9;
      robot.position.set(x, height(x, z) + Math.max(0, swing) * 0.16, z); robot.rotation.set(0, Math.PI + 0.12 * Math.sin(ph * 0.5), 0.07 + 0.08 * swing);
      rb.legL.rotation.x = 0.5 * swing; rb.legR.rotation.x = -0.12 * swing - 0.1; rb.legR.rotation.z = -0.12;
      rb.armL.rotation.x = -0.35 * swing; rb.armR.rotation.x = 0.2 * swing; rb.armL.rotation.z = -0.06; rb.armR.rotation.z = 0.06;
      rb.hips.rotation.x = 0.16; rb.head.rotation.x = 0.42 + 0.04 * Math.sin(ph * 2); rb.head.rotation.y = 0.5 + 0.22 * Math.sin(time * 0.31);      // head down, turned to the letters
    }
    moveRobot(0);
    await ctx.yield();

    // =====================================================================================================
    // THE GAZE: it leans to each word as it comes up, and at the last to the small figure on the road
    // =====================================================================================================
    const uOfZ = (z) => Math.min(1, Math.max(0, path.nearestXZ(0, z).u));
    const pois = [];
    for (const [a, b] of words) {
      const zA = TEXT_Z0 - a * ADV, zB = TEXT_Z0 - b * ADV - 5 * CELL, zc = (zA + zB) / 2, from = uOfZ(zA + 340), to = uOfZ(zB + 70);
      if (to > from + 0.01) pois.push({ at: [TEXT_X, height(TEXT_X, zc) + 24, Math.min(zc, zA - 120) - 40], from, to, weight: 0.42 });
    }

    function update(dt, time, camera) {
      U.uTime.value = time;
      sky.position.copy(camera.position); for (const st of starSets) st.position.copy(camera.position);
      for (const w of wordLamps) w.L.intensity = 110 * (0.84 + 0.16 * noise.n2(time * 1.4 + w.ph, 0.5) + 0.06 * Math.sin(time * 11 + w.ph));
      movePilgrims(time); moveRobot(time);
    }

    return {
      scene, path, duration: DUR,
      camera: { fov: 62, near: 0.5, far: 12000, lookAhead: 40, sway: 0.3, bank: 0.1 },
      pois,
      portal: { shape: 'arch', width: 14, height: 20, color: '#ffb060', glow: 0.5, revealDistance: Math.min(LEN, 900) },
      post: { exposure: 1.05, bloom: { strength: 0.8, radius: 0.8, threshold: 0.85 },
        grade: { saturation: 1.1, contrast: 1.06, vignette: 0.3, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() { for (const o of disposables) { try { o.dispose(); } catch (e) {} } },
    };
  },
};
