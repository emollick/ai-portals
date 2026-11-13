// LETTERS OF FIRE. God's Final Message to His Creation, in letters of fire along the foot of a red mountain wall at dusk.
// We fly level along the plain and read it one letter at a time: WE APOLOGISE FOR THE INCONVENIENCE.
// The wall stands on the LEFT of the flight (-X): a wall on the left is read in order as we pass (on the right its far end
// would come first), and each letter's columns advance down the flight (-Z), so nothing is mirrored from the plain.
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
const CELL = 6.4;            // one dot of the 5 by 7 font, metres: a letter stands 45 m tall
const ADV = 80;              // from one letter to the next along the flight
const TEXT_X = -150;         // the line the letters stand on, at the wall's foot
const TEXT_Z0 = -80;         // the first letter's leading edge
const END_Z = TEXT_Z0 - (MESSAGE.length - 1) * ADV - 5 * CELL;
const PTS = [[0, 24, 150], [0, 24, 0], [-10, 26, -700], [5, 23, -1500], [-8, 26, -2300], [-20, 24, END_Z - 20], [-20, 24, END_Z - 160]];

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
    const noise = makeNoise(Math.floor(rng() * 1e9));
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a0c24');
    scene.fog = new THREE.FogExp2(new THREE.Color('#5a2838'), 0.00030);
    const path = makePath(PTS), LEN = path.length;

    // ---- the land: a dune plain under the flight, and a ridged red wall rising to the left of it
    const height = (x, z) => {
      const dunes = 3.5 * noise.fbm2(x * 0.006, z * 0.006, 3) + 1.2 * Math.sin(x * 0.05 + 2.0 * noise.n2(x * 0.004, z * 0.004));
      const m = ss(80, 420, -x);
      const ridge = noise.ridged2(x * 0.0016 + 3.1, z * 0.0016, 5);
      const wall = m * (70 + 300 * ridge) + m * 18 * noise.fbm2(x * 0.012, z * 0.012, 3);
      const far = ss(150, 320, x) * 60 * (0.4 + noise.ridged2(x * 0.002, z * 0.002 + 9, 4));   // low hills far to the right
      return dunes * (1 - 0.7 * m) + wall + far;
    };

    // where each letter stands
    const letters = [];
    for (let i = 0; i < MESSAGE.length; i++) {
      const ch = MESSAGE[i]; if (ch === ' ') continue;
      const z0 = TEXT_Z0 - i * ADV, zc = z0 - 2 * CELL;
      let base = 1e9; for (let c = 0; c < 5; c++) base = Math.min(base, height(TEXT_X, z0 - c * CELL));
      letters.push({ ch, i, z0, zc, base: base + 1.5, phase: rng() * 100, rate: rng.range(0.7, 1.4) });
    }
    await ctx.yield();

    const W = 1100, L = Math.abs(END_Z) + 900, SX = 110, SZ = Math.round(L / 10);
    const geo = new THREE.PlaneGeometry(W, L, SX, SZ);
    geo.rotateX(-Math.PI / 2); geo.translate(-250, 0, 300 - L / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const cSand = new THREE.Color('#8a3a22'), cRock = new THREE.Color('#3a1512'), cHigh = new THREE.Color('#5a2620'), cGlow = new THREE.Color(1.6, 0.55, 0.12), c = new THREE.Color();
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v), z = pos.getZ(v), y = height(x, z);
      pos.setY(v, y);
      const m = ss(80, 300, -x), g = 0.5 + 0.5 * noise.fbm2(x * 0.02, z * 0.02, 3);
      c.copy(cSand).lerp(cRock, m).lerp(cHigh, ss(200, 380, y) * 0.7).multiplyScalar(0.75 + 0.5 * g);
      // the letters' own light on the rock and sand about them (laid into the ground, so it costs nothing each frame)
      const k = (TEXT_Z0 - z) / ADV, near = Math.round(k);
      let glow = 0;
      for (let j = near - 1; j <= near + 1; j++) {
        if (j < 0 || j >= MESSAGE.length || MESSAGE[j] === ' ') continue;
        const dz = z - (TEXT_Z0 - j * ADV - 2 * CELL), dx = x - TEXT_X, d2 = dx * dx * (dx > 0 ? 0.5 : 1.6) + dz * dz;
        glow += 1 / (1 + d2 / 900);
      }
      c.r += cGlow.r * glow * 0.55; c.g += cGlow.g * glow * 0.55; c.b += cGlow.b * glow * 0.55;
      col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
      if ((v & 8191) === 0) await ctx.yield();
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const landMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    scene.add(new THREE.Mesh(geo, landMat));
    await ctx.yield();

    // ---- the sky: violet above, an orange band low ahead where the sun has gone, and the first stars
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: new THREE.Vector3(-0.25, 0.02, -1).normalize() } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vDir; uniform vec3 uSun;
        void main(){ vec3 d = normalize(vDir); float h = clamp(d.y, -0.2, 1.0);
          vec3 top = vec3(0.035, 0.02, 0.09), mid = vec3(0.30, 0.10, 0.30), low = vec3(0.95, 0.40, 0.16);
          vec3 c = mix(mid, top, smoothstep(0.08, 0.6, h));
          float s = max(dot(d, uSun), 0.0);
          float band = (1.0 - smoothstep(0.0, 0.22, h)) * (0.35 + 0.65 * pow(s, 3.0));
          c = mix(c, low, band);
          c += vec3(1.4, 0.6, 0.2) * pow(s, 40.0) * 0.5;
          c = mix(c, vec3(0.35, 0.16, 0.2), smoothstep(0.0, -0.1, d.y));
          gl_FragColor = vec4(c, 1.0); }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), skyMat); sky.renderOrder = -10; sky.frustumCulled = false;
    scene.add(sky);
    const NS = Math.round(900 * detail), sp = new Float32Array(NS * 3);
    for (let i = 0; i < NS; i++) {
      const a = rng() * Math.PI * 2, e = Math.asin(rng.range(0.18, 1)), r = 8500;
      sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const starMat = new THREE.PointsMaterial({ color: '#ffe8d8', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false, fog: false });
    const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; stars.renderOrder = -9;
    scene.add(stars);

    const hemi = new THREE.HemisphereLight(new THREE.Color('#5a3a78'), new THREE.Color('#5a2010'), Math.PI * 0.55);
    const sun = new THREE.DirectionalLight(new THREE.Color('#ff8a48'), Math.PI * 0.7);
    sun.position.set(-250, 90, -1000);
    scene.add(hemi, sun, sun.target);
    await ctx.yield();

    // ---- the letters: every dot of the font a block of fire, thin toward the plain, facing it
    const strokes = [];
    for (let li = 0; li < letters.length; li++) {
      const Lt = letters[li], rows = FONT[Lt.ch];
      for (let r = 0; r < 7; r++) for (let cI = 0; cI < 5; cI++) {
        if (rows[r][cI] !== '1') continue;
        strokes.push({ li, x: TEXT_X, y: Lt.base + (6 - r + 0.5) * CELL, z: Lt.z0 - (cI + 0.5) * CELL, row: r });
      }
    }
    const box = new THREE.BoxGeometry(CELL * 0.45, CELL * 0.94, CELL * 0.94);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    const fire = new THREE.InstancedMesh(box, fireMat, strokes.length);
    const coreBox = new THREE.BoxGeometry(CELL * 0.2, CELL * 1.5, CELL * 1.5);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const halo = new THREE.InstancedMesh(coreBox, haloMat, strokes.length);
    const M = new THREE.Matrix4(), fc = new THREE.Color();
    for (let s = 0; s < strokes.length; s++) {
      const k = strokes[s];
      M.makeTranslation(k.x, k.y, k.z); fire.setMatrixAt(s, M);
      M.makeTranslation(k.x + CELL * 0.4, k.y, k.z); halo.setMatrixAt(s, M);
      fire.setColorAt(s, fc.setRGB(2.2, 0.8, 0.2)); halo.setColorAt(s, fc.setRGB(1.5, 0.5, 0.1));
    }
    fire.frustumCulled = false; halo.frustumCulled = false;
    scene.add(fire, halo);
    await ctx.yield();

    // ---- embers going up off every letter
    const NE = Math.round(4200 * detail), ep = new Float32Array(NE * 3), eSeed = new Float32Array(NE * 5);
    for (let i = 0; i < NE; i++) {
      const k = strokes[Math.floor(rng() * strokes.length)];
      eSeed[i * 5] = k.x + rng.range(-2, 6); eSeed[i * 5 + 1] = k.y; eSeed[i * 5 + 2] = k.z + rng.range(-3, 3);
      eSeed[i * 5 + 3] = rng() * 100; eSeed[i * 5 + 4] = rng.range(5, 13);
      ep[i * 3] = eSeed[i * 5]; ep[i * 3 + 1] = k.y; ep[i * 3 + 2] = eSeed[i * 5 + 2];
    }
    const emberGeo = new THREE.BufferGeometry(); emberGeo.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    const emberMat = new THREE.PointsMaterial({ color: new THREE.Color(2.4, 1.0, 0.3), size: 1.5, sizeAttenuation: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const embers = new THREE.Points(emberGeo, emberMat); embers.frustumCulled = false;
    scene.add(embers);
    await ctx.yield();

    // ---- the gaze leans to each word as it comes up
    const uOfZ = (z) => Math.min(1, Math.max(0, path.nearestXZ(0, z).u));
    const pois = [];
    { let start = -1;
      for (let i = 0; i <= MESSAGE.length; i++) {
        const sp2 = i === MESSAGE.length || MESSAGE[i] === ' ';
        if (!sp2 && start < 0) start = i;
        if (sp2 && start >= 0) {
          const zA = TEXT_Z0 - start * ADV, zB = TEXT_Z0 - (i - 1) * ADV - 5 * CELL, zc = (zA + zB) / 2;
          const from = uOfZ(zA + 330), to = uOfZ(zB + 60);
          if (to > from + 0.01) pois.push({ at: [TEXT_X, height(TEXT_X, zc) + 24, zc - 60], from, to, weight: 0.42 });
          start = -1;
        }
      } }

    const LIFE = 70;
    function update(dt, time, camera) {
      sky.position.copy(camera.position); stars.position.copy(camera.position);
      // the flicker: each letter breathes on its own, each block gutters a little, the feet burn hotter than the heads
      for (let s = 0; s < strokes.length; s++) {
        const k = strokes[s], Lt = letters[k.li];
        const a = 0.82 + 0.18 * noise.n2(time * 1.3 * Lt.rate + Lt.phase, 0.5);
        const b = 0.85 + 0.15 * noise.n2(time * 4.0 + s * 3.7, Lt.phase);
        const f = a * b, hot = 0.75 + 0.25 * (k.row / 6);
        fire.setColorAt(s, fc.setRGB(2.5 * f, (0.72 + 0.45 * hot) * f * f, 0.16 + 0.3 * hot * f * f * f));
        halo.setColorAt(s, fc.setRGB(1.6 * f, 0.5 * f * f, 0.1));
      }
      fire.instanceColor.needsUpdate = true; halo.instanceColor.needsUpdate = true;
      const p = emberGeo.attributes.position.array;
      for (let i = 0; i < NE; i++) {
        const j = i * 5, t = (time * eSeed[j + 4] + eSeed[j + 3] * 7) % LIFE;
        p[i * 3] = eSeed[j] + Math.sin(time * 0.6 + eSeed[j + 3]) * (1 + t * 0.12) + t * 0.15;
        p[i * 3 + 1] = eSeed[j + 1] + t;
        p[i * 3 + 2] = eSeed[j + 2] + Math.cos(time * 0.5 + eSeed[j + 3] * 1.7) * (1 + t * 0.1) - t * 0.1;
      }
      emberGeo.attributes.position.needsUpdate = true;
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
      dispose() {
        for (const g of [geo, sky.geometry, starGeo, box, coreBox, emberGeo]) g.dispose();
        for (const m of [landMat, skyMat, starMat, fireMat, haloMat, emberMat]) m.dispose();
      },
    };
  },
};
