// THE WAY BRICKS DON'T. A Thursday lunchtime over the English West Country: a patchwork of hedged fields with sheep in
// them, a village with terraced cottages, a church, a pub and a green with a cricket match stopped on it, and one house
// at the edge of it with a yellow bulldozer at its gate, a man lying in the mud in front of the bulldozer, and another
// man standing over him with a towel. And in the sky, in ranks to the horizon, hanging through the cloud, huge
// slab-sided yellow ships that hang in the air exactly the way bricks don't. We fly up the lane, over the roofs, and
// then climb to a bay under the nearest ship, where the way out is.
//
// Everything is plain three.js: instanced boxes, cylinders and spheres, three small canvas textures (hull plates with
// rust, a soft cloud, a round light), one height law for the land that the lane, the houses and the route all ask.
import * as THREE from 'three';
import { makePath, makeNoise } from '../kit/core.js';

const DUR = 45;
const SHIP0 = { x: 0, y: 520, z: -1500, L: 760, W: 260, H: 100 };      // the nearest ship (the exit is under it)
const POD = { w: 64, h: 60, z0: -1426, z1: -1640 };                    // the block slung under it; the portal stands at its face
const FX = 180, FZ = 140;                                              // a field's size on the map
const GREEN = { x: -125, z: -600, r: 52 };                             // the village green
const CHURCH = { x: 96, z: -560 };
const ARTHUR = { x: -36, z: -430 };                                    // the house in the way

export default {
  id: 'the-way-bricks-dont',
  name: "The Way Bricks Don't",
  category: 'books',
  placeKind: 'sky',
  book: "The Hitchhiker's Guide to the Galaxy",
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.6,
  async build(ctx) {
    const rng = ctx.rng, detail = ctx.quality?.detail ?? 1;
    const noise = makeNoise(Math.floor(rng() * 1e9));
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const PI = Math.PI;

    const scene = new THREE.Scene();
    const HAZE = new THREE.Color('#c3ccc9');
    scene.background = HAZE.clone();
    scene.fog = new THREE.Fog(HAZE.clone(), 450, 8500);
    const hemi = new THREE.HemisphereLight('#d2dbde', '#2a3322', 2.4);
    const sun = new THREE.DirectionalLight('#fff0d0', 1.4);
    sun.position.set(-600, 900, 500);
    scene.add(hemi, sun, sun.target);

    // ---------------------------------------------------------------- shared pieces
    const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 14), SPH = new THREE.SphereGeometry(0.5, 10, 7);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    // an instanced mesh from a list of [x, y, z, sx, sy, sz, colour, ry, rx, rz]
    const inst = (geo, mat, list) => {
      const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
      m.count = list.length;
      for (let k = 0; k < list.length; k++) {
        const b = list[k];
        dummy.position.set(b[0], b[1], b[2]); dummy.scale.set(b[3], b[4], b[5]); dummy.rotation.set(b[8] || 0, b[7] || 0, b[9] || 0); dummy.updateMatrix();
        m.setMatrixAt(k, dummy.matrix); m.setColorAt(k, col.set(b[6] || '#ffffff'));
      }
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.frustumCulled = false; scene.add(m); return m;
    };
    const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

    // ---------------------------------------------------------------- the ground: one height law
    const ground = (x, z) => {
      const m = 0.22 + 0.78 * ss(40, 520, Math.abs(x));      // the lane runs up a broad shallow valley
      return (noise.fbm2(x * 0.0011, z * 0.0011, 4) * 40 + noise.fbm2(x * 0.005, z * 0.005, 2) * 5) * m;
    };
    const inGreen = (x, z, pad = 0) => Math.hypot(x - GREEN.x, z - GREEN.z) < GREEN.r + pad;
    const inYard = (x, z, pad = 0) => Math.abs(x - CHURCH.x) < 36 + pad && Math.abs(z - CHURCH.z) < 46 + pad;
    const inVillage = (x, z) => (Math.abs(x) < 200 && z < -370 && z > -730) || inGreen(x, z, 20);

    // ---------------------------------------------------------------- the fleet, dealt first (the land is shaded under it)
    const ships = [];
    for (let j = -2; j <= 4; j++) for (let i = -4; i <= 4; i++) {
      if (i === 0 && j === 0) { ships.push({ ...SHIP0, near: true, i, j }); continue; }
      ships.push({
        x: i * 1400 + rng.range(-120, 120), y: 430 + rng.range(0, 190) + Math.abs(i) * 25 + Math.max(0, j) * 30,
        z: -1500 - j * 1500 + (i === 0 ? 0 : rng.range(-160, 160)),
        L: rng.range(320, 900), W: rng.range(130, 300), H: rng.range(60, 140), near: false, i, j,
      });
    }
    // the gloom under every ship: a soft dark patch on the land, pushed a little down-sun
    const shadeAt = (x, z) => {
      let s = 1;
      for (let k = 0; k < ships.length; k++) {
        const S = ships[k], h = S.y - S.H * 0.5, dx = Math.abs(x - (S.x + h * 0.22)) - S.W * 0.5, dz = Math.abs(z - (S.z - h * 0.18)) - S.L * 0.5;
        if (dx > 90 || dz > 90) continue;
        const v = 0.46 + 0.54 * ss(-30, 80, Math.max(dx, dz)); if (v < s) s = v;
      }
      return s;
    };
    await ctx.yield();

    // ---------------------------------------------------------------- the land: a patchwork of fields in its vertex colours
    const FIELDS = ['#5f9a3c', '#6aa544', '#4f8a36', '#7bb04a', '#88a84c', '#c9c14a', '#7a6a46', '#5a9440', '#93b85a', '#d6c85a', '#6b5a3c', '#4c8a44'].map((c) => new THREE.Color(c));
    const fieldHash = (cx, cz) => Math.abs(Math.sin(cx * 127.1 + cz * 311.7) * 43758.5453) % 1;
    const landColour = (x, z, out) => {
      const cx = Math.floor((x - 90) / FX), cz = Math.floor(z / FZ), h = fieldHash(cx, cz);
      out.copy(FIELDS[Math.floor(h * FIELDS.length)]);
      // ploughed and mown fields carry their furrows; the rest a soft mottle
      const fur = h > 0.5 ? 0.06 * Math.sin((h > 0.75 ? x : z) * 0.9) : 0;
      out.multiplyScalar(0.86 + fur + 0.14 * noise.n2(x * 0.02, z * 0.02));
      if (inVillage(x, z) && !inGreen(x, z)) out.lerp(col.set('#5e8f42'), 0.7);      // gardens and verges
      return out.multiplyScalar(shadeAt(x, z));
    };
    const landMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    const PATCH = { x: 400, z0: 500, z1: -1300 };      // a finer piece of land under the lane and the village
    {
      const SIZE = 18000, SEG = 300, c = new THREE.Color();
      const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-PI / 2);
      const tp = tg.attributes.position, tc = new Float32Array(tp.count * 3);
      for (let i = 0; i < tp.count; i++) {
        const x = tp.getX(i), z = tp.getZ(i);
        const under = Math.abs(x) < PATCH.x - 70 && z < PATCH.z0 - 70 && z > PATCH.z1 + 70;      // sunk out of the way where the fine piece lies over it
        tp.setY(i, ground(x, z) - (under ? 4 : 0));
        landColour(x, z, c); tc[i * 3] = c.r; tc[i * 3 + 1] = c.g; tc[i * 3 + 2] = c.b;
        if ((i & 8191) === 0) await ctx.yield();
      }
      tg.setAttribute('color', new THREE.BufferAttribute(tc, 3)); tg.computeVertexNormals();
      scene.add(new THREE.Mesh(tg, landMat));
      await ctx.yield();
      const fg = new THREE.PlaneGeometry(PATCH.x * 2, PATCH.z0 - PATCH.z1, 80, 180); fg.rotateX(-PI / 2); fg.translate(0, 0, (PATCH.z0 + PATCH.z1) / 2);
      const fp = fg.attributes.position, fc = new Float32Array(fp.count * 3);
      for (let i = 0; i < fp.count; i++) {
        const x = fp.getX(i), z = fp.getZ(i);
        fp.setY(i, ground(x, z) + 0.12);
        landColour(x, z, c); fc[i * 3] = c.r; fc[i * 3 + 1] = c.g; fc[i * 3 + 2] = c.b;
        if ((i & 4095) === 0) await ctx.yield();
      }
      fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.computeVertexNormals();
      scene.add(new THREE.Mesh(fg, landMat));
    }
    await ctx.yield();

    // ---------------------------------------------------------------- the lane, and the green with its cricket square
    const overlay = (color) => new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    {
      const pos = [], idx = [];
      let n = 0;
      for (let z = 480; z >= -1250; z -= 10, n++) { const y = ground(0, z) + 0.4; pos.push(-3.2, y, z, 3.2, y, z); if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, overlay('#8d8a80')));
      // the green: a disc laid on the land, mown paler, with a paler square in the middle
      const disc = (cx, cz, R, lift, color, RN = 8, SN = 36) => {
        const p = [cx, ground(cx, cz) + lift, cz], ix = [];
        for (let r = 1; r <= RN; r++) for (let s = 0; s < SN; s++) { const a = s / SN * PI * 2, x = cx + Math.cos(a) * R * r / RN, z = cz + Math.sin(a) * R * r / RN; p.push(x, ground(x, z) + lift, z); }
        for (let s = 0; s < SN; s++) ix.push(0, 1 + (s + 1) % SN, 1 + s);
        for (let r = 1; r < RN; r++) for (let s = 0; s < SN; s++) { const a = 1 + (r - 1) * SN + s, b = 1 + (r - 1) * SN + (s + 1) % SN, c = a + SN, d = b + SN; ix.push(a, b, c, b, d, c); }
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); gg.setIndex(ix); gg.computeVertexNormals();
        scene.add(new THREE.Mesh(gg, overlay(color)));
      };
      disc(GREEN.x, GREEN.z, GREEN.r, 0.3, '#74b04c');
      disc(GREEN.x, GREEN.z, 14, 0.42, '#8cc060', 3, 4);
    }
    await ctx.yield();

    // ---------------------------------------------------------------- lists the village and the country are gathered into
    const vb = [], vr = [], vc = [], vs = [];      // boxes, roofs, cylinders, spheres
    const smokeSrc = [];
    const gAt = (x, z) => ground(x, z);
    // a point of a house's own plan (lx along its ridge, lz across it) on the map
    const loc = (h, lx, lz) => [h.x + lx * Math.cos(h.ry) + lz * Math.sin(h.ry), h.z - lx * Math.sin(h.ry) + lz * Math.cos(h.ry)];
    const WALLS = ['#d9cdb4', '#c9b79a', '#e6e0d2', '#b9a68a', '#c7b8a6', '#ddd3c0', '#b79f86'], ROOFS = ['#6e4a3a', '#59483f', '#7b5a44', '#4f4b4a', '#5d5148', '#8a5b44'];
    const DOORS = ['#2f4d6b', '#7a2222', '#254d33', '#3a3a3a', '#c9a227', '#1f2f4a'];
    const SKIN = '#e0b79a';
    const fig = (x, z, coat, legs = '#33363c', s = 1) => {      // a standing figure, 1.8 m
      const g = gAt(x, z);
      vb.push([x, g + 0.42 * s, z, 0.4 * s, 0.84 * s, 0.26 * s, legs, rng() * 6.28]);
      vb.push([x, g + 1.2 * s, z, 0.52 * s, 0.75 * s, 0.3 * s, coat, rng() * 6.28]);
      vs.push([x, g + 1.74 * s, z, 0.3 * s, 0.32 * s, 0.3 * s, SKIN]);
    };
    const wall = (xa, za, xb, zb, hgt = 1.1, color = '#8f8a7c', gap = 0) => {      // a stone wall in 5 m lengths
      const L = Math.hypot(xb - xa, zb - za), n = Math.max(1, Math.round(L / 5)), th = Math.atan2(-(zb - za), xb - xa);
      for (let k = 0; k < n; k++) {
        if (gap && rng() < gap) continue;
        const t = (k + 0.5) / n, x = xa + (xb - xa) * t, z = za + (zb - za) * t;
        vb.push([x, gAt(x, z) + hgt / 2 - 0.3, z, L / n + 0.1, hgt + 0.6, 0.55, color, th]);
      }
    };
    const houses = [];
    const addHouse = (h) => {
      houses.push(h);
      const g = gAt(h.x, h.z), rh = h.rh || Math.min(4.6, h.d * 0.46);
      vb.push([h.x, g + h.h / 2 - 1, h.z, h.w, h.h + 2, h.d, h.wall, h.ry]);
      vr.push([h.x, g + h.h, h.z, h.w * 1.03, rh, h.d * 1.12, h.roof, h.ry]);
      // a chimney at one end of the ridge, and some of them smoking
      const [cx, cz] = loc(h, (h.chim ?? 1) * (h.w / 2 - 1.1), 0);
      vb.push([cx, g + h.h + rh * 0.7 + 0.8, cz, 1.0, 2.8, 1.0, '#7a5140', h.ry]);
      vb.push([cx, g + h.h + rh * 0.7 + 2.35, cz, 0.6, 0.5, 0.6, '#b0683f', h.ry]);
      if (smokeSrc.length < 18 && rng() < 0.45) smokeSrc.push([cx, g + h.h + rh * 0.7 + 2.9, cz]);
      // windows under both eaves, a door on one side
      const nW = Math.max(2, Math.floor(h.w / 3.4)), doorAt = h.door ?? rng.int(0, nW - 1), doorSide = h.doorSide ?? 1;
      for (const sd of [-1, 1]) for (let i = 0; i < nW; i++) {
        const lx = (i + 0.5) / nW * h.w - h.w / 2, [wx, wz] = loc(h, lx, sd * (h.d / 2 + 0.06));
        if (sd === doorSide && i === doorAt) { vb.push([wx, g + 1.0, wz, 1.0, 2.0, 0.16, rng.pick(DOORS), h.ry]); vb.push([wx, g + 2.7, wz, 0.9, 0.9, 0.14, '#27323c', h.ry]); continue; }
        vb.push([wx, g + 1.3, wz, 1.15, 1.25, 0.14, '#27323c', h.ry]);
        if (h.h > 4.6) vb.push([wx, g + h.h - 1.3, wz, 1.05, 1.15, 0.14, '#2b3640', h.ry]);
        vb.push([wx, g + 0.58, wz, 1.35, 0.12, 0.3, '#e8e4da', h.ry]);      // the sill
      }
    };

    // ---- the terraces either side of the lane (ridges along the lane, doors to it)
    for (let i = 0; i < 8; i++) addHouse({ x: -31, z: -500 - i * 8, w: 8, d: 9, h: 5.6, ry: PI / 2, wall: WALLS[(i * 3) % WALLS.length], roof: '#5d5148', doorSide: 1, door: 1, chim: i % 2 ? 1 : -1 });
    for (let i = 0; i < 7; i++) addHouse({ x: 31, z: -420 - i * 8, w: 8, d: 9, h: 5.6, ry: PI / 2, wall: WALLS[(i * 2 + 1) % WALLS.length], roof: '#6e4a3a', doorSide: -1, door: 0, chim: i % 2 ? 1 : -1 });
    for (let i = 0; i < 5; i++) addHouse({ x: -31, z: -640 - i * 8, w: 8, d: 9, h: 5.2, ry: PI / 2, wall: '#e6e0d2', roof: '#4f4b4a', doorSide: 1, door: 1, chim: i % 2 ? 1 : -1 });
    // ---- the house in the way, alone at the near end of the village; and the pub, and the cricket pavilion
    addHouse({ x: ARTHUR.x, z: ARTHUR.z, w: 13, d: 9, h: 6, ry: PI / 2, wall: '#d9cdb4', roof: '#7b5a44', doorSide: 1, door: 1 });
    addHouse({ x: 34, z: -612, w: 22, d: 11, h: 7, ry: PI / 2, wall: '#efe9d8', roof: '#59483f', doorSide: -1, door: 3, pub: true });
    addHouse({ x: GREEN.x - 40, z: GREEN.z - 62, w: 14, d: 7, h: 3.6, ry: 0.5, wall: '#f2f0e8', roof: '#3f5a46', doorSide: 1 });
    // ---- detached houses and farms scattered behind
    for (let k = 0; k < 90 && houses.length < 62; k++) {
      const x = rng.sign() * rng.range(52, 190), z = rng.range(-720, -385), w = rng.range(9, 16), d = rng.range(7, 10);
      if (inGreen(x, z, 22) || inYard(x, z, 14) || (Math.abs(x - 34) < 26 && Math.abs(z + 612) < 26) || (Math.abs(x - ARTHUR.x) < 30 && Math.abs(z - ARTHUR.z) < 34)) continue;
      if (houses.some((h) => Math.abs(h.x - x) < 22 && Math.abs(h.z - z) < 20)) continue;
      addHouse({ x, z, w, d, h: rng.range(5, 7), ry: rng.chance(0.5) ? 0 : PI / 2, wall: rng.pick(WALLS), roof: rng.pick(ROOFS) });
      if (rng() < 0.5) { const hx = x + rng.sign() * (w / 2 + 6), hz = z + rng.range(-5, 5); vb.push([hx, gAt(hx, hz) + 1.3, hz, 4, 3.2, 5, '#6b5d4c', 0]); vr.push([hx, gAt(hx, hz) + 2.9, hz, 4.4, 1.6, 5.6, '#4a4540', 0]); }      // a shed
    }
    await ctx.yield();

    // ---- the church: nave, chancel, a square tower with battlements, the yard with its wall, its stones and a yew
    {
      const { x, z } = CHURCH, g = gAt(x, z), stone = '#a9a393', slate = '#4c4f55';
      vb.push([x, g + 4, z + 4, 13, 12, 30, stone, 0]); vr.push([x, g + 10, z + 4, 31, 7, 14.4, slate, PI / 2]);
      vb.push([x, g + 3, z + 24, 9, 9, 11, stone, 0]); vr.push([x, g + 7.5, z + 24, 11.4, 5, 10, slate, PI / 2]);
      vb.push([x, g + 11, z - 15, 9, 26, 9, stone, 0]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) vb.push([x + sx * 3.9, g + 25, z - 15 + sz * 3.9, 1.3, 2.4, 1.3, stone, 0]);
      for (const sx of [-1, 0, 1]) for (const sz of [-1, 0, 1]) if (sx === 0 !== (sz === 0)) vb.push([x + sx * 4.2, g + 24.5, z - 15 + sz * 4.2, sx ? 0.8 : 2.2, 1.2, sz ? 0.8 : 2.2, stone, 0]);
      vb.push([x, g + 27.5, z - 15, 0.25, 6, 0.25, '#2b2b2b', 0]); vb.push([x + 0.9, g + 29.6, z - 15, 1.8, 1.1, 0.06, '#b82020', 0]);      // the flagpole and its flag
      vb.push([x, g + 16, z - 19.6, 2.2, 2.2, 0.2, '#e8e2c8', 0]);      // the clock
      for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) vb.push([x + sx * 6.56, g + 5, z - 6 + i * 6.5, 0.14, 4.4, 1.5, '#27323c', 0]);      // the nave's windows
      vb.push([x, g + 1.5, z - 19.6, 2.2, 3.6, 0.3, '#3b2b20', 0]);      // the west door
      wall(x - 34, z - 44, x + 34, z - 44); wall(x + 34, z - 44, x + 34, z + 44); wall(x + 34, z + 44, x - 34, z + 44); wall(x - 34, z + 44, x - 34, z + 6); wall(x - 34, z - 6, x - 34, z - 44);
      vb.push([x - 34, g + 1.6, z + 6.4, 0.5, 3.2, 0.5, '#3b2b20', 0]); vb.push([x - 34, g + 1.6, z - 6.4, 0.5, 3.2, 0.5, '#3b2b20', 0]); vr.push([x - 34, g + 3.1, z, 14, 1.6, 3, '#5d5148', PI / 2]);      // the lych gate
      for (let k = 0; k < 70; k++) {
        const sx = x + rng.range(-31, 31), sz = z + rng.range(-41, 41);
        if (Math.abs(sx - x) < 9 && sz > z - 22 && sz < z + 31) continue;
        vb.push([sx, gAt(sx, sz) + 0.45, sz, 0.55, rng.range(0.7, 1.2), 0.14, rng.pick(['#8e8a80', '#a09a8c', '#777268']), rng.range(-0.2, 0.2), 0, rng.range(-0.12, 0.12)]);
      }
      vc.push([x + 22, g + 2, z - 30, 1.2, 4, 1.2, '#4a3a2a']); vs.push([x + 22, g + 6.5, z - 30, 11, 9, 11, '#1f3b22']);      // the yew
    }

    // ---- the pub: its sign on a post by the lane, benches outside, and the red phone box and the post box beside it
    {
      const g = gAt(12, -604);
      vb.push([12, g + 2.6, -604, 0.3, 5.2, 0.3, '#2b2622', 0]); vb.push([12, g + 5.0, -604, 0.2, 0.2, 2.4, '#2b2622', 0]); vb.push([12, g + 4.0, -603.2, 0.14, 1.6, 1.4, '#7a1f1f', 0]); vb.push([12.08, g + 4.0, -603.2, 0.06, 1.0, 0.9, '#d9b84a', 0]);
      for (let i = 0; i < 4; i++) { const bz = -602 - i * 5.5, bg = gAt(21, bz); vb.push([21, bg + 0.75, bz, 0.9, 0.1, 2.0, '#7a5a3c', 0]); vb.push([20.2, bg + 0.45, bz, 0.4, 0.08, 2.0, '#7a5a3c', 0]); vb.push([21.8, bg + 0.45, bz, 0.4, 0.08, 2.0, '#7a5a3c', 0]); vb.push([21, bg + 0.35, bz, 0.7, 0.7, 0.12, '#5a4230', 0]); }
      vb.push([28.4, gAt(28.4, -612) + 3.9, -612, 0.2, 0.9, 9, '#1f3b22', 0]);      // the name board over the door
      const pg = gAt(9, -592); vb.push([9, pg + 1.25, -592, 0.95, 2.5, 0.95, '#c0181c', 0]); vb.push([9, pg + 1.3, -592, 0.99, 1.5, 0.7, '#2a3238', 0]); vb.push([9, pg + 1.3, -592, 0.7, 1.5, 0.99, '#2a3238', 0]); vb.push([9, pg + 2.56, -592, 1.05, 0.14, 1.05, '#a01216', 0]);
      vc.push([9, gAt(9, -587) + 0.8, -587, 0.5, 1.6, 0.5, '#c0181c']); vc.push([9, gAt(9, -587) + 1.66, -587, 0.56, 0.14, 0.56, '#a01216']);
    }

    // ---- walls along the lane through the village (with gateways), garden walls behind the terraces, washing on the lines
    for (const sx of [-1, 1]) for (let z = -392; z > -724; z -= 40) { if (sx < 0 && z === -392) { wall(sx * 8.5, -392, sx * 8.5, -418); wall(sx * 8.5, -442, sx * 8.5, -472); z -= 40; continue; } wall(sx * 8.5, z, sx * 8.5, z - 40, 1.1, '#8f8a7c', 0.18); }
    for (let i = 0; i < 8; i++) { const z = -496 - i * 8; wall(-36, z, -56, z, 1.0, '#99937f'); }
    wall(-56, -496, -56, -560, 1.0, '#99937f');
    for (let i = 0; i < 7; i++) { const z = -416 - i * 8; wall(36, z, 54, z, 1.0, '#99937f'); }
    wall(54, -416, 54, -472, 1.0, '#99937f');
    {
      const CLOTH = ['#f2f0ea', '#f2f0ea', '#d94c4c', '#4c7bd9', '#e9c84a', '#f2f0ea', '#7fc28a', '#e59ab8'];
      const line = (x, z) => {
        const g = gAt(x, z);
        vb.push([x, g + 1.1, z - 2.8, 0.12, 2.2, 0.12, '#5a4a3a', 0]); vb.push([x, g + 1.1, z + 2.8, 0.12, 2.2, 0.12, '#5a4a3a', 0]); vb.push([x, g + 2.12, z, 0.03, 0.03, 5.6, '#d8d8d8', 0]);
        for (let k = 0; k < 6; k++) { const hh = rng.range(0.5, 1.1); vb.push([x, g + 2.1 - hh / 2, z - 2.2 + k * 0.88, 0.04, hh, rng.range(0.4, 0.8), rng.pick(CLOTH), 0, 0, rng.range(-0.15, 0.15)]); }
      };
      for (let i = 0; i < 8; i += 1) if (rng() < 0.75) line(-47, -500 - i * 8);
      for (let i = 0; i < 7; i += 1) if (rng() < 0.75) line(46, -420 - i * 8);
    }

    // ---- parked cars, and the village out in the lane looking up
    {
      const CARS = ['#b02a2a', '#2a4f8f', '#e8e4d8', '#3d6b3d', '#c9a227', '#6b6f75', '#7a3a1e', '#1f1f22', '#9fb4c2'];
      const car = (x, z, ry = 0) => { const g = gAt(x, z), c = rng.pick(CARS); vb.push([x, g + 0.72, z, 1.75, 0.62, 4.1, c, ry]); const dx = Math.sin(ry) * -0.25, dz = Math.cos(ry) * -0.25; vb.push([x + dx, g + 1.3, z + dz, 1.6, 0.58, 2.2, '#20262c', ry]); vb.push([x + dx, g + 1.62, z + dz, 1.62, 0.08, 2.1, c, ry]); vb.push([x, g + 0.34, z, 1.8, 0.5, 3.0, '#16171a', ry]); };
      for (const [x, z] of [[5.6, -452], [-5.6, -522], [5.6, -574], [-5.6, -636], [5.6, -498], [-5.6, -668], [5.6, -690], [-5.6, -586]]) car(x, z + rng.range(-3, 3), rng.range(-0.04, 0.04));
      car(22, -640, PI / 2); car(22, -646, PI / 2 + 0.05); car(-64, -470, 0.4);
      const COATS = ['#5a4d7a', '#8a3b3b', '#3b5d8a', '#6d6a4a', '#2f3a33', '#b08a5a', '#a04a6a', '#44505c', '#c2c2b8'];
      for (let k = 0; k < 46; k++) { const x = rng.sign() * rng.range(1.5, 26), z = rng.range(-720, -400); if (houses.some((h) => Math.abs(h.x - x) < 8 && Math.abs(h.z - z) < 8)) continue; fig(x, z, rng.pick(COATS)); }
      for (let k = 0; k < 9; k++) fig(21 + rng.range(-3, 3), -610 + rng.range(-12, 12), rng.pick(COATS));      // the pub has emptied onto its yard
    }

    // ---- the cricket: stumps, the players in white where the game stopped, a roller, deckchairs, the boundary's flags
    {
      const { x, z } = GREEN, g = gAt(x, z);
      vb.push([x, g + 0.5, z, 3, 0.12, 20, '#c9c08a', 0.3]);
      for (const e of [-1, 1]) for (const s of [-0.22, 0, 0.22]) { const sx = x + Math.sin(0.3) * e * 10 + Math.cos(0.3) * s, sz = z + Math.cos(0.3) * e * 10 - Math.sin(0.3) * s; vb.push([sx, gAt(sx, sz) + 0.82, sz, 0.05, 0.75, 0.05, '#e9dfc2', 0]); }
      for (let k = 0; k < 13; k++) { const a = k / 13 * PI * 2 + 0.4, r = k < 3 ? 9 : rng.range(18, 44); fig(x + Math.cos(a) * r, z + Math.sin(a) * r, '#f4f2ea', '#f1eee4'); }
      for (let k = 0; k < 20; k++) { const a = k / 20 * PI * 2, fx = x + Math.cos(a) * (GREEN.r - 1), fz = z + Math.sin(a) * (GREEN.r - 1); vb.push([fx, gAt(fx, fz) + 0.6, fz, 0.05, 0.9, 0.05, '#e8e8e8', 0]); vb.push([fx + 0.2, gAt(fx, fz) + 0.95, fz, 0.4, 0.25, 0.03, k % 2 ? '#c0181c' : '#f0f0f0', 0]); }
      vc.push([x + 30, g + 0.6, z + 36, 1.1, 1.8, 1.1, '#5d6066', 0, 0, PI / 2]); vb.push([x + 30, g + 0.9, z + 37.4, 0.08, 0.08, 2.4, '#3a3a3a', 0]);      // the roller
      for (let k = 0; k < 8; k++) { const dx = x - 30 + k * 2.2, dz = z - 55; vb.push([dx, gAt(dx, dz) + 0.5, dz, 0.7, 0.06, 1.1, k % 2 ? '#d94c4c' : '#4c7bd9', 0, 0.5]); }
      vb.push([x - 52, gAt(x - 52, z - 50) + 1.6, z - 50, 2.6, 1.8, 0.2, '#1c1c1c', 0.5]);      // the scoreboard
    }

    // ---- the bulldozer at the gate, the man lying in front of it, the man with the towel, and the man from the council
    {
      const bx = -16.5, bz = ARTHUR.z, g = gAt(bx, bz);
      const yel = new THREE.MeshStandardMaterial({ color: '#f1c40f', roughness: 0.55 }), dark = new THREE.MeshStandardMaterial({ color: '#25272a', roughness: 0.9 }), glass = new THREE.MeshStandardMaterial({ color: '#2c3a44', roughness: 0.2, metalness: 0.4 });
      const dz = new THREE.Group(); dz.position.set(bx, g, bz); dz.rotation.y = -PI / 2;      // its blade toward the house
      const add = (m, sx, sy, sz, x, y, z, rx = 0) => { const mesh = new THREE.Mesh(BOX, m); mesh.scale.set(sx, sy, sz); mesh.position.set(x, y, z); mesh.rotation.x = rx; dz.add(mesh); return mesh; };
      add(yel, 3, 1.5, 4.6, 0, 1.75, 0); add(yel, 2.6, 0.9, 2.0, 0, 2.6, 1.2);      // the body and the bonnet
      add(yel, 2.4, 1.9, 1.9, 0, 3.45, -1.0); add(glass, 2.45, 1.0, 1.5, 0, 3.7, -1.0); add(glass, 2.0, 1.0, 1.95, 0, 3.7, -1.0); add(yel, 2.6, 0.14, 2.1, 0, 4.45, -1.0);      // the cab
      add(yel, 4.6, 1.7, 0.3, 0, 1.05, 3.5, -0.12); add(dark, 4.6, 0.2, 0.36, 0, 0.22, 3.6); add(yel, 0.25, 0.3, 2.2, -1.9, 1.2, 2.4); add(yel, 0.25, 0.3, 2.2, 1.9, 1.2, 2.4);      // the blade and its arms
      add(dark, 0.85, 1.15, 5.2, -1.75, 0.58, 0); add(dark, 0.85, 1.15, 5.2, 1.75, 0.58, 0);      // the tracks
      for (let i = 0; i < 5; i++) { add(yel, 0.9, 0.5, 0.5, -1.75, 0.58, -2 + i); add(yel, 0.9, 0.5, 0.5, 1.75, 0.58, -2 + i); }
      add(dark, 0.22, 1.5, 0.22, 0.9, 3.6, 1.6); add(dark, 0.9, 0.5, 0.3, 0, 1.2, -2.5);      // the stack and the hitch
      dz.scale.setScalar(1.3); scene.add(dz);
      smokeSrc.push([bx - 2.1, g + 5.9, bz - 1.2]);      // its engine is running
      // the mud it has pushed up, and the ruts behind it
      const mud = new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 1 });
      for (const [mx, mz, r] of [[-24.5, bz, 2.6], [-23, bz + 2.4, 1.8], [-23.4, bz - 2.6, 1.9], [-20.6, bz + 1, 2.2]]) { const m = new THREE.Mesh(SPH, mud); m.scale.set(r * 2, r * 0.5, r * 2); m.position.set(mx, gAt(mx, mz) + 0.12, mz); scene.add(m); }
      vb.push([-10.5, gAt(-10.5, bz - 2.3) + 0.16, bz - 2.3, 9, 0.1, 1.0, '#4d3c2a', 0]); vb.push([-10.5, gAt(-10.5, bz + 2.3) + 0.16, bz + 2.3, 9, 0.1, 1.0, '#4d3c2a', 0]);
      // the man lying in the mud in his dressing gown, between the blade and his house
      const ax = -24.6, az = bz - 0.3, ag = gAt(ax, az) + 0.75;
      vb.push([ax, ag + 0.2, az, 0.6, 0.36, 1.1, '#6f5d86', 0]); vb.push([ax, ag + 0.16, az + 1.2, 0.5, 0.26, 1.3, '#c9c2ae', 0]); vb.push([ax, ag + 0.2, az + 1.95, 0.46, 0.34, 0.2, '#5a4a3a', 0]);
      vs.push([ax, ag + 0.2, az - 0.78, 0.32, 0.32, 0.34, SKIN]); vb.push([ax - 0.5, ag + 0.12, az - 0.5, 0.7, 0.2, 0.22, '#6f5d86', 0, 0, 0.3]); vb.push([ax + 0.5, ag + 0.12, az - 0.5, 0.7, 0.2, 0.22, '#6f5d86', 0, 0, -0.3]);
      // the man standing over him with a towel over his shoulder and a satchel
      const fx = -26.6, fz = bz - 1.4, fg = gAt(fx, fz);
      vb.push([fx, fg + 0.42, fz, 0.4, 0.84, 0.26, '#3a3a44', 0.6]); vb.push([fx, fg + 1.2, fz, 0.52, 0.75, 0.3, '#7a4a2a', 0.6]); vs.push([fx, fg + 1.74, fz, 0.3, 0.32, 0.3, SKIN]);
      vb.push([fx + 0.2, fg + 1.36, fz - 0.05, 0.24, 0.62, 0.36, '#f0ead2', 0.6]); vb.push([fx + 0.2, fg + 1.2, fz - 0.05, 0.26, 0.08, 0.38, '#5f8fd0', 0.6]); vb.push([fx - 0.36, fg + 0.85, fz + 0.1, 0.16, 0.36, 0.44, '#4a3524', 0.6]);
      // the man from the council by the bulldozer, with a clipboard and a fur hat, and the driver looking up
      const px = -19.5, pz = bz + 4.2, pg = gAt(px, pz);
      vb.push([px, pg + 0.42, pz, 0.46, 0.84, 0.3, '#2e2e33', 2.4]); vb.push([px, pg + 1.2, pz, 0.66, 0.8, 0.42, '#6b6f4a', 2.4]); vs.push([px, pg + 1.76, pz, 0.32, 0.32, 0.32, SKIN]); vb.push([px, pg + 1.96, pz, 0.36, 0.14, 0.36, '#4a3a2e', 2.4]); vb.push([px - 0.3, pg + 1.2, pz - 0.26, 0.3, 0.4, 0.04, '#eeeeea', 2.4]);
      fig(-13.5, bz + 3.6, '#e8a21c', '#2b3a55'); fig(-12.2, bz + 5.2, '#e8a21c', '#2b3a55');
      // his garden: a low wall with the gateway the bulldozer stands in, a path, a few shrubs
      wall(-27.5, bz - 12, -27.5, bz - 4.5, 0.9); wall(-27.5, bz + 4.5, -27.5, bz + 12, 0.9); wall(-27.5, bz - 12, -44, bz - 12, 0.9); wall(-27.5, bz + 12, -44, bz + 12, 0.9);
      for (let k = 0; k < 9; k++) { const sx = -29 - rng() * 12, sz = bz + rng.sign() * rng.range(5, 10.5); vs.push([sx, gAt(sx, sz) + 0.7, sz, rng.range(1.2, 2.2), rng.range(1.1, 1.8), rng.range(1.2, 2.2), rng.pick(['#2f6a2c', '#3d7a34', '#8a3b5a', '#d9b84a'])]); }
    }
    await ctx.yield();

    // ---------------------------------------------------------------- the country: hedges, trees, sheep
    const tCan = [], tTrunk = [];
    {
      const segs = [], R = 2700, hb = [];
      for (let x = -R + 90; x <= R; x += FX) for (let z = -R - 900; z < R - 900; z += 35) {      // hedges running along z
        if (rng() < 0.15 || inVillage(x, z + 17.5)) continue; segs.push([x, z + 17.5, 3.4, 36]);
      }
      for (let z = -R - 900; z <= R - 900; z += FZ) for (let x = -R; x < R; x += 36) {      // hedges running along x
        const mx = x + 18; if (rng() < 0.15 || Math.abs(mx) < 24 || inVillage(mx, z)) continue; segs.push([mx, z, 36.5, 3.4]);
      }
      for (let z = 470; z > -1240; z -= 30) for (const sx of [-1, 1]) { if (inVillage(sx * 9, z - 15) || rng() < 0.12) continue; segs.push([sx * 9.5, z - 15, 3, 30.5]); }      // the lane's own hedges
      const HED = ['#2f5a26', '#2a5222', '#35622b', '#3b6a2e'];
      for (const s of segs) hb.push([s[0], ground(s[0], s[1]) + 1.0, s[1], s[2], rng.range(4.6, 6), s[3], rng.pick(HED)]);
      inst(BOX, new THREE.MeshStandardMaterial({ roughness: 1 }), hb);
      const TREE = ['#33642a', '#2c5a26', '#3e7030', '#476f2c', '#2a4f2a'];
      const tree = (x, z, r) => {
        if (Math.abs(x) < 26 + r * 2 || inGreen(x, z, 6) || houses.some((h) => Math.abs(h.x - x) < 12 && Math.abs(h.z - z) < 12)) return;
        const g = ground(x, z), c = rng.pick(TREE);
        tTrunk.push([x, g + r * 0.5, z, r * 0.16, r * 1.1, r * 0.16, '#4a3a2a']);
        tCan.push([x, g + r * 1.35, z, r * 2, r * rng.range(1.7, 2.3), r * 2, c, rng() * 6.28]);
        if (rng() < 0.6) tCan.push([x + rng.range(-0.5, 0.5) * r, g + r * rng.range(1.7, 2.1), z + rng.range(-0.5, 0.5) * r, r * 1.3, r * 1.3, r * 1.3, c, rng() * 6.28]);
      };
      const nT = Math.round(900 * detail);
      for (let k = 0; k < nT; k++) { const s = segs[Math.floor(rng() * segs.length)]; tree(s[0] + rng.range(-12, 12), s[1] + rng.range(-12, 12), rng.range(4, 8.5)); }
      for (let k = 0; k < 60; k++) tree(rng.sign() * rng.range(40, 195), rng.range(-725, -380), rng.range(3, 6));      // garden and village trees
      for (let c = 0; c < 14; c++) { const cx = rng.sign() * rng.range(500, 2600), cz = rng.range(-3400, 1400), n = rng.int(18, 40); for (let k = 0; k < n; k++) tree(cx + rng.gauss() * 55, cz + rng.gauss() * 45, rng.range(5, 9)); }      // copses
      inst(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), tCan);
      inst(CYL, new THREE.MeshStandardMaterial({ roughness: 1 }), tTrunk);
      // sheep, a flock to a field
      const wool = [], heads = [];
      for (let f = 0; f < 14; f++) {
        const cx = rng.sign() * rng.int(1, 6), cz = rng.int(-9, 3), x0 = cx * FX + 90, z0 = cz * FZ;
        if (inVillage(x0 + FX / 2, z0 + FZ / 2)) continue;
        const n = rng.int(16, 36), hx = x0 + rng.range(40, FX - 40), hz = z0 + rng.range(30, FZ - 30);
        for (let k = 0; k < n; k++) {
          const x = Math.min(x0 + FX - 10, Math.max(x0 + 10, hx + rng.gauss() * 26)), z = Math.min(z0 + FZ - 10, Math.max(z0 + 10, hz + rng.gauss() * 20)), g = ground(x, z), a = rng() * 6.28;
          wool.push([x, g + 0.62, z, 0.75, 0.8, 1.3, '#e9e6dc', a]); heads.push([x + Math.sin(a) * 0.72, g + 0.78, z + Math.cos(a) * 0.72, 0.34, 0.36, 0.42, '#2b2622', a]);
        }
      }
      inst(SPH, new THREE.MeshStandardMaterial({ roughness: 1 }), wool); inst(SPH, new THREE.MeshStandardMaterial({ roughness: 1 }), heads);
      // a few cows too, and a tractor stopped in a field
      const cows = [];
      for (let k = 0; k < 26; k++) { const x = 280 + rng.gauss() * 40, z = -250 + rng.gauss() * 30, g = ground(x, z), a = rng() * 6.28; cows.push([x, g + 1.0, z, 0.8, 0.9, 2.1, rng.pick(['#2a2622', '#f0ece2', '#6b3f26']), a]); cows.push([x + Math.sin(a) * 1.2, g + 1.3, z + Math.cos(a) * 1.2, 0.45, 0.5, 0.7, '#2a2622', a]); }
      inst(BOX, new THREE.MeshStandardMaterial({ roughness: 1 }), cows);
      const tx = -260, tz = -120, tgd = ground(tx, tz); vb.push([tx, tgd + 1.3, tz, 1.6, 1.2, 3.2, '#b02a2a', 0.7]); vb.push([tx - 0.5, tgd + 2.4, tz - 0.6, 1.5, 1.4, 1.4, '#20262c', 0.7]); vc.push([tx + 0.3, tgd + 0.9, tz - 1.3, 1.8, 0.5, 1.8, '#16171a', 0.7, 0, PI / 2]); vc.push([tx - 1.3, tgd + 0.9, tz + 0.2, 1.8, 0.5, 1.8, '#16171a', 0.7, 0, PI / 2]);
    }
    await ctx.yield();

    // ---- the village's lists become four meshes
    const roofGeo = (() => {      // a gable roof: ridge along X, eaves on the two Z sides, one unit each way
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 1, 0, 0.5, 1, 0], 3));
      g.setIndex([3, 2, 5, 3, 5, 4, 1, 0, 4, 1, 4, 5, 0, 3, 4, 2, 1, 5]);
      const n = g.toNonIndexed(); n.computeVertexNormals(); return n;
    })();
    inst(BOX, new THREE.MeshStandardMaterial({ roughness: 0.92 }), vb);
    inst(roofGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), vr);
    inst(CYL, new THREE.MeshStandardMaterial({ roughness: 0.8 }), vc);
    inst(SPH, new THREE.MeshStandardMaterial({ roughness: 0.95 }), vs);
    await ctx.yield();

    // ---------------------------------------------------------------- the ships
    const hullTex = canvas(512, 512, (g, w, h) => {
      g.fillStyle = '#e4e1d6'; g.fillRect(0, 0, w, h);
      // plates: a staggered course of them, each a shade of its own, with a dark seam and a line of rivets
      const rows = 8;
      for (let r = 0; r < rows; r++) {
        const y = r * h / rows, off = (r % 2) * 37; let x = -off;
        while (x < w) {
          const pw = 40 + Math.random() * 90, v = 205 + Math.floor(Math.random() * 40);
          g.fillStyle = `rgb(${v},${v - 3},${v - 12})`; g.fillRect(x + 1, y + 1, pw - 2, h / rows - 2);
          g.fillStyle = 'rgba(40,36,24,0.55)'; g.fillRect(x, y, 2, h / rows);
          g.fillStyle = 'rgba(60,54,40,0.5)'; for (let k = 6; k < pw - 4; k += 9) g.fillRect(x + k, y + 5, 2, 2);
          x += pw;
        }
        g.fillStyle = 'rgba(30,27,18,0.7)'; g.fillRect(0, y, w, 3);
        g.fillStyle = 'rgba(255,255,240,0.25)'; g.fillRect(0, y + 3, w, 2);
      }
      // ribs: darker bands up the plating
      for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(50,44,28,0.35)'; g.fillRect(x + 28, 0, 8, h); g.fillStyle = 'rgba(255,250,230,0.18)'; g.fillRect(x + 26, 0, 2, h); }
      // rust and soot: streaks running down from the seams
      for (let k = 0; k < 150; k++) {
        const x = Math.random() * w, y = Math.floor(Math.random() * rows) * h / rows, len = 30 + Math.random() * 170, wd = 2 + Math.random() * 9;
        const gr = g.createLinearGradient(0, y, 0, y + len), rust = Math.random() < 0.7;
        gr.addColorStop(0, rust ? 'rgba(120,62,24,0.55)' : 'rgba(30,28,24,0.5)'); gr.addColorStop(1, 'rgba(120,62,24,0)');
        g.fillStyle = gr; g.fillRect(x, y, wd, len); g.fillRect(x - w, y, wd, len); if (y + len > h) g.fillRect(x, y - h, wd, len);
      }
      // patches, hatches and a stencilled number or two
      for (let k = 0; k < 22; k++) { const x = Math.random() * (w - 40), y = Math.random() * (h - 30), v = 120 + Math.random() * 60; g.fillStyle = `rgba(${v},${v * 0.9},${v * 0.6},0.5)`; g.fillRect(x, y, 14 + Math.random() * 30, 10 + Math.random() * 22); g.strokeStyle = 'rgba(30,26,16,0.6)'; g.strokeRect(x, y, 14 + Math.random() * 30, 10 + Math.random() * 22); }
      g.fillStyle = 'rgba(30,28,22,0.6)'; g.font = 'bold 34px sans-serif'; g.fillText('B-42', 300, 300); g.fillText('7G', 60, 120);
      for (let k = 0; k < 10; k++) { g.fillStyle = k % 2 ? 'rgba(20,20,20,0.6)' : 'rgba(230,200,40,0.0)'; g.fillRect(380 + k * 12, 460, 12, 14); }
    });
    hullTex.wrapS = hullTex.wrapT = THREE.RepeatWrapping; hullTex.repeat.set(2, 2); hullTex.anisotropy = 4;

    const hull = [], gre = [], glow = [], tur = [], lit = [], strobe = [], beams = [];      // textured slabs, plain greebles, lit strips, cylinders, steady lights [x,y,z,r,g,b], strobes, beam sources
    const YEL = ['#b89a2a', '#c2a233', '#a88d2c', '#b3962f', '#c9a93a', '#9c842a', '#b7a04a'];
    const DARK = '#3a3626', DARK2 = '#2c2a20', IRON = '#55503c', LAMP = '#ffe2a0';
    const buildShip = (S) => {
      const c = rng.pick(YEL), c2 = rng.pick(YEL), cd = new THREE.Color(c).multiplyScalar(0.72).getStyle();
      const top = S.y + S.H / 2, bot = S.y - S.H / 2, x0 = S.x - S.W / 2, x1 = S.x + S.W / 2, z0 = S.z - S.L / 2, z1 = S.z + S.L / 2;
      // ---- the slab itself, a blunt stepped bow, and the engine block astern
      hull.push([S.x, S.y, S.z, S.W, S.H, S.L, c]);
      const bl = S.L * rng.range(0.05, 0.11), bw = rng.range(0.7, 0.88);
      hull.push([S.x, S.y - S.H * 0.07, z1 + bl / 2, S.W * bw, S.H * 0.78, bl, c2]);
      hull.push([S.x, S.y - S.H * 0.16, z1 + bl + bl * 0.3, S.W * bw * 0.7, S.H * 0.5, bl * 0.6, c]);
      glow.push([S.x, S.y + S.H * 0.12, z1 + bl + 0.4, S.W * bw * 0.5, 2.2, 0.6, LAMP]);      // the bridge's strip of windows
      glow.push([S.x, S.y - S.H * 0.02, z1 + bl * 1.6 + 0.4, S.W * bw * 0.4, 1.4, 0.6, '#cfe6ff']);
      const el = S.L * rng.range(0.07, 0.13);
      hull.push([S.x, S.y, z0 - el / 2, S.W * 0.9, S.H * 0.86, el, IRON]);
      const nz = rng.int(2, 4), nr = Math.min(S.H * 0.3, S.W * 0.8 / nz * 0.42);
      for (let k = 0; k < nz; k++) {
        const nx = S.x + ((k + 0.5) / nz - 0.5) * S.W * 0.78;
        tur.push([nx, S.y, z0 - el - 10, nr * 2, 22, nr * 2, DARK2, 0, PI / 2]); tur.push([nx, S.y, z0 - el - 2, nr * 2.3, 6, nr * 2.3, IRON, 0, PI / 2]);
        glow.push([nx, S.y, z0 - el - 20, nr * 1.3, nr * 1.3, 2, '#ff8a3a']);
        for (let f = 0; f < 4; f++) gre.push([nx, S.y, z0 - el - 8, nr * 2.5, 1.2, 12, DARK, 0, 0, f * PI / 4]);      // cooling fins round each nozzle
      }
      // ---- the belly: a dark plate, transverse ribs, twin keels, pipe runs
      gre.push([S.x, bot - 2.5, S.z, S.W * 0.94, 5, S.L * 0.96, DARK]);
      const rs = rng.range(32, 58);
      for (let z = z0 + rs * 0.6; z < z1 - 10; z += rs) gre.push([S.x, bot - 6.4, z, S.W * 0.9, 3.4, rng.range(4, 7), DARK2]);
      for (const sd of [-1, 1]) { gre.push([S.x + sd * S.W * 0.3, bot - 7.5, S.z, 9, 6, S.L * 0.82, DARK]); tur.push([S.x + sd * S.W * 0.4, bot - 6.5, S.z, 3.4, S.L * 0.9, 3.4, IRON, 0, PI / 2]); tur.push([S.x + sd * S.W * 0.17, bot - 6.2, S.z, 2.2, S.L * 0.7, 2.2, '#6a5a34', 0, PI / 2]); }
      // ---- the sides: ribs up them, strakes along them, hangar slots lit from inside, sponsons, a dark waterline
      const ss2 = rng.range(26, 46);
      for (let z = z0 + ss2 * 0.5; z < z1; z += ss2) for (const sd of [-1, 1]) gre.push([S.x + sd * (S.W / 2 + 1.2), S.y, z, 2.6, S.H * 0.94, 3.6, cd]);
      for (const sd of [-1, 1]) {
        const sx = S.x + sd * (S.W / 2 + 1);
        gre.push([sx, S.y + S.H * 0.22, S.z, 2.6, 3.6, S.L * 0.985, cd]); gre.push([sx, S.y - S.H * 0.3, S.z, 2.6, 5, S.L * 0.985, DARK]); gre.push([sx, top - 1.5, S.z, 3.4, 3, S.L, cd]);
        const nh = rng.int(1, 3);
        for (let k = 0; k < nh; k++) {
          const hz = S.z + ((k + 0.5) / nh - 0.5) * S.L * 0.8 + rng.range(-20, 20), hl = S.L * rng.range(0.07, 0.13), hh = S.H * rng.range(0.2, 0.3), hy = S.y - S.H * rng.range(0.02, 0.12);
          gre.push([sx - sd * 0.3, hy, hz, 2.4, hh, hl, '#17150f']);
          glow.push([sx + sd * 1.0, hy - hh / 2 + 0.9, hz, 0.7, 1.1, hl * 0.94, LAMP]); glow.push([sx + sd * 1.0, hy + hh / 2 - 0.6, hz, 0.7, 0.6, hl * 0.94, '#ffb060']);
          for (const e of [-1, 1]) gre.push([sx + sd * 1.4, hy, hz + e * (hl / 2 + 1.5), 3.6, hh + 4, 3, cd]);
        }
        if (rng() < 0.7) { const w = S.W * rng.range(0.1, 0.2), l = S.L * rng.range(0.25, 0.6), h = S.H * rng.range(0.35, 0.7), pz = S.z + rng.range(-0.15, 0.15) * S.L, py = S.y + rng.range(-0.18, 0.1) * S.H; hull.push([S.x + sd * (S.W / 2 + w / 2), py, pz, w, h, l, rng.pick(YEL)]); gre.push([S.x + sd * (S.W / 2 + w / 2), py - h / 2 - 1.5, pz, w * 0.9, 3, l * 0.96, DARK]); glow.push([S.x + sd * (S.W / 2 + w + 0.4), py + h * 0.15, pz, 0.6, 1.4, l * 0.6, LAMP]); }
        // rows of small lit ports
        const pn = Math.floor(S.L / 26);
        for (let k = 0; k < pn; k++) if (rng() < 0.55) glow.push([sx + sd * 0.5, S.y + S.H * 0.34, z0 + (k + 0.5) * S.L / pn, 0.5, 1.0, 3.2, rng() < 0.8 ? LAMP : '#bfe0ff']);
        // running lights along the lower edge: red to port, green to starboard
        const rn = Math.max(4, Math.floor(S.L / 70));
        for (let k = 0; k <= rn; k++) lit.push(S.x + sd * (S.W / 2 + 3), bot - 1, z0 + k * S.L / rn, sd < 0 ? 1 : 0.15, sd < 0 ? 0.12 : 1, 0.15);
      }
      // ---- the back of it: superstructure blocks, a bridge tower, turrets, tanks, masts with strobes
      const nb = rng.int(2, 5);
      for (let k = 0; k < nb; k++) {
        const w = S.W * rng.range(0.25, 0.6), l = S.L * rng.range(0.1, 0.3), h = S.H * rng.range(0.22, 0.6), bx = S.x + rng.range(-0.2, 0.2) * S.W, bz = S.z + rng.range(-0.36, 0.36) * S.L;
        hull.push([bx, top + h / 2, bz, w, h, l, rng.pick(YEL)]);
        if (rng() < 0.6) { hull.push([bx, top + h + h * 0.25, bz, w * 0.55, h * 0.5, l * 0.5, c2]); glow.push([bx, top + h + h * 0.3, bz + l * 0.25 + 0.4, w * 0.45, 1.6, 0.5, LAMP]); }
        glow.push([bx, top + h * 0.6, bz + l / 2 + 0.4, w * 0.7, 1.2, 0.5, LAMP]);
      }
      const nt = rng.int(2, 5);
      for (let k = 0; k < nt; k++) {
        const tx = S.x + rng.range(-0.4, 0.4) * S.W, tz = S.z + rng.range(-0.42, 0.42) * S.L, r = rng.range(8, 14);
        tur.push([tx, top + 2.5, tz, r * 2, 5, r * 2, cd]); tur.push([tx, top + 6.5, tz, r * 1.3, 4, r * 1.3, c]);
        for (const e of [-0.3, 0.3]) gre.push([tx + e * r, top + 6.5, tz + r * 1.3, 1.6, 1.6, r * 2.4, DARK2, 0, -0.12]);
      }
      const nk = rng.int(0, 3);
      for (let k = 0; k < nk; k++) { const tx = S.x + rng.range(-0.35, 0.35) * S.W, tz = S.z + rng.range(-0.4, 0.4) * S.L, r = rng.range(10, 20); tur.push([tx, top + r * 0.5, tz, r, rng.range(30, 70), r, '#8a8266', 0, PI / 2]); }      // tanks lying on the back
      const nm = rng.int(2, 5);
      for (let k = 0; k < nm; k++) {
        const mx = S.x + rng.range(-0.44, 0.44) * S.W, mz = S.z + rng.range(-0.46, 0.46) * S.L, mh = rng.range(30, 95);
        gre.push([mx, top + mh / 2, mz, 1.6, mh, 1.6, DARK2]); gre.push([mx, top + mh * 0.7, mz, 14, 0.9, 0.9, DARK2]); gre.push([mx, top + mh * 0.45, mz, 0.9, 0.9, 9, DARK2]);
        if (rng() < 0.5) tur.push([mx, top + mh * 0.85, mz, 9, 1.2, 9, IRON, 0, PI / 2 * 0.8]);      // a dish
        strobe.push(mx, top + mh + 1, mz);
      }
      // ---- under it: turrets, slung blocks and a belly hangar (the nearest ship keeps its middle clear for the way in)
      const nu = rng.int(2, 5);
      for (let k = 0; k < nu; k++) {
        const ux = S.x + rng.sign() * rng.range(S.near ? 0.3 : 0.05, 0.42) * S.W, uz = S.z + rng.range(-0.42, 0.42) * S.L, r = rng.range(7, 11);
        tur.push([ux, bot - 9, uz, r * 2, 8, r * 2, DARK]); tur.push([ux, bot - 14, uz, r * 1.2, 4, r * 1.2, IRON]);
        gre.push([ux, bot - 15, uz + r, 1.4, 1.4, r * 2.2, DARK2, 0, 0.25]);
      }
      if (!S.near) {
        const ns = rng.int(0, 2);
        for (let k = 0; k < ns; k++) { const w = S.W * rng.range(0.2, 0.42), l = S.L * rng.range(0.12, 0.28), h = S.H * rng.range(0.22, 0.45), ux = S.x + rng.range(-0.2, 0.2) * S.W, uz = S.z + rng.range(-0.3, 0.3) * S.L; hull.push([ux, bot - 5 - h / 2, uz, w, h, l, IRON]); glow.push([ux, bot - 5 - h * 0.5, uz + l / 2 + 0.4, w * 0.6, 1.4, 0.5, LAMP]); }
        const hw = S.W * 0.3, hl = S.L * 0.16, hz = S.z + rng.range(-0.25, 0.25) * S.L;
        gre.push([S.x, bot - 5.3, hz, hw, 0.8, hl, '#12110d']);
        for (const e of [-1, 1]) { glow.push([S.x + e * hw / 2, bot - 5.9, hz, 1.2, 0.6, hl, LAMP]); glow.push([S.x, bot - 5.9, hz + e * hl / 2, hw, 0.6, 1.2, LAMP]); }
        if (S.z < 600 && (Math.abs(S.x) > 900 || S.z < -2400) && beams.length < 9 && rng() < 0.4) beams.push([S.x + rng.range(-0.2, 0.2) * S.W, bot - 6, hz]);
      }
      // ---- white lamps scattered over the belly, strobes at the four lower corners
      const nl = Math.round((S.near ? 70 : 16) * detail);
      for (let k = 0; k < nl; k++) lit.push(S.x + rng.range(-0.45, 0.45) * S.W, bot - 5.6, S.z + rng.range(-0.47, 0.47) * S.L, 1, 0.9, 0.62);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) strobe.push(S.x + sx * (S.W / 2 + 2), bot - 3, S.z + sz * (S.L / 2 + 2));
    };
    for (const S of ships) buildShip(S);
    await ctx.yield();
    // ---- the nearest ship's slung block and the bay in its forward face, where the way out stands
    const under = SHIP0.y - SHIP0.H * 0.5, yP = under - POD.h * 0.5;
    {
      const pz = (POD.z0 + POD.z1) * 0.5, pl = POD.z0 - POD.z1;
      hull.push([0, yP, pz, POD.w, POD.h, pl, '#8f7a28']);
      gre.push([0, under - POD.h - 1.5, pz, POD.w * 0.92, 3, pl * 0.96, DARK]);
      for (let z = POD.z0 - 14; z > POD.z1; z -= 26) for (const sd of [-1, 1]) gre.push([sd * (POD.w / 2 + 1), yP, z, 2.4, POD.h * 0.94, 3.4, '#6f5f22']);
      gre.push([0, yP, POD.z0 + 1.2, 24, 28, 2.2, '#1c1a13']);      // the bay's dark surround
      for (const e of [-1, 1]) { gre.push([e * 13.5, yP, POD.z0 + 2.6, 3, 31, 3, '#6f5f22']); glow.push([e * 10.6, yP, POD.z0 + 2.5, 0.7, 24, 0.5, LAMP]); gre.push([0, yP + e * 15, POD.z0 + 2.6, 30, 3, 3, '#6f5f22']); }
      glow.push([0, yP + 12.6, POD.z0 + 2.5, 20, 0.7, 0.5, LAMP]);
      for (let k = 0; k < 9; k++) gre.push([-11 + k * 2.75, yP - 12.8, POD.z0 + 2.6, 1.4, 1.2, 0.6, k % 2 ? '#1a1a1a' : '#e0b820']);      // hazard stripes on the sill
      // two lines of lamps along the belly, leading in
      for (let z = POD.z0 + 24; z < SHIP0.z + SHIP0.L / 2 - 10; z += 22) for (const e of [-1, 1]) { glow.push([e * 30, under - 6.2, z, 2.2, 0.5, 2.2, '#bfe6ff']); lit.push(e * 30, under - 6.8, z, 0.75, 0.9, 1); }
      for (const e of [-1, 1]) { gre.push([e * (POD.w / 2 - 6), yP + 6, POD.z0 + 5, 1.2, 1.2, 10, DARK2]); strobe.push(e * (POD.w / 2 + 2), under - POD.h - 2, POD.z0 + 2); }
    }
    inst(BOX, new THREE.MeshStandardMaterial({ map: hullTex, roughness: 0.86, metalness: 0.12 }), hull);
    inst(BOX, new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.1 }), gre);
    inst(CYL, new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.2 }), tur);
    inst(BOX, new THREE.MeshBasicMaterial({ toneMapped: false }), glow);
    await ctx.yield();

    // ---- lamps: steady ones in their colours, and strobes that all flash together (a fleet keeps time)
    const dotTex = canvas(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    const lampMat = (size, vc2) => new THREE.PointsMaterial({ map: dotTex, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: vc2, color: vc2 ? '#ffffff' : '#ffffff', fog: true, toneMapped: false });
    {
      const n = lit.length / 6, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { p[k * 3] = lit[k * 6]; p[k * 3 + 1] = lit[k * 6 + 1]; p[k * 3 + 2] = lit[k * 6 + 2]; c[k * 3] = lit[k * 6 + 3]; c[k * 3 + 1] = lit[k * 6 + 4]; c[k * 3 + 2] = lit[k * 6 + 5]; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      const pts = new THREE.Points(g, lampMat(11, true)); pts.frustumCulled = false; scene.add(pts);
    }
    const strobeMat = lampMat(22, false);
    { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(strobe, 3)); const pts = new THREE.Points(g, strobeMat); pts.frustumCulled = false; scene.add(pts); }

    // ---- a few searchlights down through the haze from ships further off, each with its pool on the land
    const beamRigs = [];
    {
      const coneMat = new THREE.MeshBasicMaterial({ color: '#fff0c0', transparent: true, opacity: 0.085, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const poolMat = new THREE.MeshBasicMaterial({ color: '#fff0c0', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
      const poolGeo = new THREE.CircleGeometry(1, 28); poolGeo.rotateX(-PI / 2);
      for (const b of beams) {
        const h = b[1] - ground(b[0], b[2]) - 4, rig = new THREE.Group(); rig.position.set(b[0], b[1], b[2]);
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(5, 70, h, 24, 1, true), coneMat); cone.position.y = -h / 2; rig.add(cone);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 34, h, 16, 1, true), coneMat); core.position.y = -h / 2; rig.add(core);
        const pool = new THREE.Mesh(poolGeo, poolMat); pool.scale.setScalar(70); pool.position.y = -h + 2; rig.add(pool);
        scene.add(rig); beamRigs.push({ rig, ph: rng() * 6.28, sp: rng.range(0.12, 0.3) });
      }
    }
    await ctx.yield();

    // ---------------------------------------------------------------- the cloud the fleet hangs through
    const cloudTex = canvas(256, 256, (g) => {
      for (let k = 0; k < 46; k++) { const x = 128 + (Math.random() - 0.5) * 150, y = 128 + (Math.random() - 0.5) * 150, r = 22 + Math.random() * 46, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
      const ed = g.createRadialGradient(128, 128, 60, 128, 128, 128); ed.addColorStop(0, 'rgba(0,0,0,0)'); ed.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = ed; g.fillRect(0, 0, 256, 256);
    });
    const cloudGeo = new THREE.PlaneGeometry(1, 1); cloudGeo.rotateX(-PI / 2);
    const cloudList = [];
    { const n = Math.round(300 * detail); for (let k = 0; k < n; k++) cloudList.push([rng.range(-9500, 9500), 590 + rng() * rng() * 240, rng.range(-9800, 3000), rng.range(900, 2600), 1, rng.range(700, 2000), rng.pick(['#eef1ee', '#dfe4e2', '#cdd3d1', '#f6f7f4']), rng() * 6.28]); }
    cloudList.sort((a, b) => b[1] - a[1]);      // drawn from the top down, as they are seen from below
    const clouds = inst(cloudGeo, new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide, fog: true }), cloudList);
    clouds.renderOrder = 2;
    // wisps lower down, between the land and the ships
    const wispList = [];
    { const n = Math.round(40 * detail); for (let k = 0; k < n; k++) { const x = rng.sign() * rng.range(500, 7000); wispList.push([x, rng.range(250, 420), rng.range(-8000, 1500), rng.range(500, 1400), 1, rng.range(300, 800), '#e6eae8', rng() * 6.28]); } }
    const wisps = inst(cloudGeo, new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: true }), wispList);
    wisps.renderOrder = 1;
    await ctx.yield();

    // ---------------------------------------------------------------- what moves: chimney smoke, and the birds going up off the fields
    const PUFFS = 6, smoke = new THREE.InstancedMesh(SPH, new THREE.MeshBasicMaterial({ color: '#b9bdbb', transparent: true, opacity: 0.3, depthWrite: false, fog: true }), Math.max(1, smokeSrc.length * PUFFS));
    smoke.frustumCulled = false; scene.add(smoke);
    const birdGeo = new THREE.BufferGeometry();
    birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5, -1, 0.12, -0.45, 0, 0, -0.1, 0, 0, 0.5, 0, 0, -0.1, 1, 0.12, -0.45], 3)); birdGeo.computeVertexNormals();
    const NB = Math.round(150 * detail), birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshBasicMaterial({ color: '#1c1d1f', side: THREE.DoubleSide, fog: true }), Math.max(1, NB));
    birds.frustumCulled = false; scene.add(birds);
    const flocks = [[190, -330], [-240, -520], [260, -700], [-200, -160], [330, -40], [-330, -820]], bd = [];
    for (let k = 0; k < NB; k++) {
      const f = flocks[k % flocks.length], out = f[0] > 0 ? 0 : PI;
      bd.push({ ox: f[0] + rng.gauss() * 14, oz: f[1] + rng.gauss() * 14, a: out + rng.range(-1.15, 1.15), sp: rng.range(8, 15), ph: (k % flocks.length) * 6.1 + rng.range(0, 3), turn: rng.range(-0.02, 0.02), climb: rng.range(2.2, 4.2), top: rng.range(35, 110), s: rng.range(0.8, 1.3) });
    }
    const BT = 38;      // a flock's round, seconds: up off the field, away, and gone into the haze
    const moving = (time) => {
      let n = 0;
      for (let s = 0; s < smokeSrc.length; s++) for (let k = 0; k < PUFFS; k++, n++) {
        const t = (time * 0.11 + k / PUFFS + s * 0.37) % 1, src = smokeSrc[s], sc = (0.7 + t * 4.2) * (1 - ss(0.75, 1, t));
        dummy.position.set(src[0] + t * t * 16 + Math.sin(time * 0.7 + k + s) * 0.5 * t, src[1] + t * 15, src[2] + t * 5); dummy.scale.set(sc, sc * 0.85, sc); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); smoke.setMatrixAt(n, dummy.matrix);
      }
      smoke.instanceMatrix.needsUpdate = true;
      for (let k = 0; k < NB; k++) {
        const b = bd[k], t = (time + b.ph) % BT, a = b.a + t * b.turn, r = 4 + b.sp * t;
        const x = b.ox + Math.cos(a) * r, z = b.oz + Math.sin(a) * r, y = ground(x, z) + 2 + Math.min(b.top, t * b.climb) + Math.sin(t * 1.3 + k) * 1.5;
        dummy.position.set(x, y, z); dummy.rotation.set(0, Math.atan2(Math.cos(a), Math.sin(a)), Math.sin(time * 9 + k) * 0.5);
        const sc = b.s * 1.1 * ss(0, 0.6, t) * (1 - ss(BT - 3, BT, t)); dummy.scale.set(sc, sc * (1 + 2.5 * Math.sin(time * 11 + k * 1.7)), sc); dummy.updateMatrix(); birds.setMatrixAt(k, dummy.matrix);
      }
      birds.instanceMatrix.needsUpdate = true;
    };
    moving(0);

    // ---------------------------------------------------------------- the route: up the lane, over the roofs, then the climb to the bay
    const low = (x, z, h) => [x, ground(x, z) + h, z];
    const path = makePath([
      low(0, 260, 17), low(0, 120, 17), low(6, -80, 18), low(-8, -260, 22), low(-4, -440, 30), low(8, -600, 34),
      [20, 80, -800], [22, 170, -960], [14, 290, -1110], [4, 392, -1230], [0, yP, -1335], [0, yP, POD.z0 + 6],
    ]);

    return {
      scene, path, duration: DUR,
      camera: { fov: 62, near: 0.5, far: 20000, lookAhead: 30, sway: 0.3, bank: 0.15 },
      pois: [
        { at: [-22, ground(-22, ARTHUR.z) + 2, ARTHUR.z], from: 0.1, to: 0.3, weight: 0.5 },      // the bulldozer, the two men and the house
        { at: [0, SHIP0.y - 40, SHIP0.z + 200], from: 0.36, to: 0.8, weight: 0.5 },      // the ship overhead
      ],
      portal: { shape: 'rect', width: 14, height: 18, color: '#fff2b0', glow: 0.4 },
      post: { exposure: 1.0, bloom: { strength: 0.3, radius: 0.8, threshold: 0.95 },
        grade: { saturation: 1.05, contrast: 1.05, vignette: 0.25, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update(dt, time, camera, u) {
        moving(time);
        const f = (time * 0.8) % 1; strobeMat.opacity = f < 0.07 || (f > 0.16 && f < 0.22) ? 1 : 0.04;      // a double flash, the whole fleet together
        for (const b of beamRigs) { b.rig.rotation.x = Math.sin(time * b.sp + b.ph) * 0.07; b.rig.rotation.z = Math.cos(time * b.sp * 0.8 + b.ph * 1.7) * 0.06; }
        clouds.position.x = (time * 2.5) % 400; wisps.position.x = (time * 6) % 600;
      },
      dispose() { hullTex.dispose(); dotTex.dispose(); cloudTex.dispose(); },
    };
  },
};
