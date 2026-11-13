// THE WAY BRICKS DON'T. A Thursday lunchtime over the English West Country: fields, hedges, a village with a church
// and a pub, one yellow bulldozer in front of one house. And in the sky, in ranks to the horizon, huge slab-sided
// yellow ships that hang in the air exactly the way bricks don't. We fly up the lane, over the village, and then
// climb to the underside of the nearest ship, where the way out is.
import * as THREE from 'three';
import { makePath, makeNoise } from '../kit/core.js';

const DUR = 45;
const SHIP0 = { x: 0, y: 520, z: -1500, L: 760, W: 260, H: 100 };      // the nearest ship (the exit is under it)
const POD = { w: 64, h: 60, z0: -1426, z1: -1640 };                    // the block slung under it; the portal stands at its face

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

    const scene = new THREE.Scene();
    const HAZE = new THREE.Color('#c3ccc9');
    scene.background = HAZE.clone();
    scene.fog = new THREE.Fog(HAZE.clone(), 500, 8500);
    const hemi = new THREE.HemisphereLight('#cfd9dc', '#2c3524', 2.3);
    const sun = new THREE.DirectionalLight('#fff0d0', 1.7);
    sun.position.set(-600, 900, 500);
    scene.add(hemi, sun, sun.target);

    // ---- the ground: one height law for the land, the lane, the houses and the route
    const ground = (x, z) => {
      const m = 0.22 + 0.78 * ss(40, 520, Math.abs(x));      // the lane runs up a broad shallow valley
      return (noise.fbm2(x * 0.0011, z * 0.0011, 4) * 40 + noise.fbm2(x * 0.005, z * 0.005, 2) * 5) * m;
    };

    // ---- the fleet, dealt first (the land is shaded under it)
    const ships = [];      // { x, y, z, L, W, H }
    for (let j = -2; j <= 4; j++) for (let i = -4; i <= 4; i++) {
      if (i === 0 && j === 0) { ships.push({ ...SHIP0 }); continue; }
      ships.push({
        x: i * 1400 + rng.range(-120, 120), y: 430 + rng.range(0, 190) + Math.abs(i) * 25 + Math.max(0, j) * 30,
        z: -1500 - j * 1500 + (i === 0 ? 0 : rng.range(-160, 160)),
        L: rng.range(320, 900), W: rng.range(130, 300), H: rng.range(60, 140),
      });
    }
    await ctx.yield();

    // ---- terrain with a patchwork of fields in its vertex colours
    const SIZE = 18000, SEG = 300;
    const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position, tc = new Float32Array(tp.count * 3);
    const FIELDS = ['#5f9a3c', '#6aa544', '#4f8a36', '#7bb04a', '#88a84c', '#c9c14a', '#7a6a46', '#5a9440'].map((c) => new THREE.Color(c));
    const FX = 180, FZ = 140, col = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i);
      tp.setY(i, ground(x, z));
      const cx = Math.floor((x - 90) / FX), cz = Math.floor(z / FZ);
      const h = Math.abs(Math.sin(cx * 127.1 + cz * 311.7) * 43758.5453) % 1;
      col.copy(FIELDS[Math.floor(h * FIELDS.length)]);
      col.multiplyScalar(0.86 + 0.14 * noise.n2(x * 0.02, z * 0.02));
      let shade = 1;      // the gloom under each ship
      for (let s = 0; s < ships.length; s++) { const S = ships[s]; if (Math.abs(x - S.x - 60) < S.W * 0.5 + 30 && Math.abs(z - S.z + 90) < S.L * 0.5 + 30) { shade = 0.5; break; } }
      tc[i * 3] = col.r * shade; tc[i * 3 + 1] = col.g * shade; tc[i * 3 + 2] = col.b * shade;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(tc, 3)); tg.computeVertexNormals();
    scene.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })));
    await ctx.yield();

    const dummy = new THREE.Object3D();
    const put = (mesh, k, x, y, z, sx, sy, sz, ry = 0) => { dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, ry, 0); dummy.updateMatrix(); mesh.setMatrixAt(k, dummy.matrix); };
    const inVillage = (x, z) => Math.abs(x) < 190 && z < -380 && z > -720;

    // ---- the lane
    {
      const pos = [], idx = [];
      let n = 0;
      for (let z = 400; z >= -1100; z -= 15, n++) { const y = ground(0, z) + 0.7; pos.push(-3.2, y, z, 3.2, y, z); if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#8d8a80', roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    }

    // ---- hedgerows along the field edges, and hedgerow trees
    {
      const segs = [], R = 2600;
      for (let x = -R + 90; x <= R; x += FX) for (let z = -R - 900; z < R - 900; z += 35) {      // hedges running along z
        if (rng() < 0.2 || inVillage(x, z)) continue; segs.push([x, z + 17.5, 3.2, 36]);
      }
      for (let z = -R - 900; z <= R - 900; z += FZ) for (let x = -R; x < R; x += 36) {      // hedges running along x
        const mx = x + 18; if (rng() < 0.2 || Math.abs(mx) < 24 || inVillage(mx, z)) continue; segs.push([mx, z, 36.5, 3.2]);
      }
      const hm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#2f5a26', roughness: 1 }), segs.length);
      segs.forEach((s, k) => put(hm, k, s[0], ground(s[0], s[1]) + 1.2, s[1], s[2], 5, s[3]));
      scene.add(hm);
      const nT = Math.round(700 * detail), tm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#33642a', roughness: 1, flatShading: true }), nT);
      for (let k = 0; k < nT; k++) {
        const s = segs[Math.floor(rng() * segs.length)], x = s[0] + rng.range(-12, 12), z = s[1] + rng.range(-12, 12), r = rng.range(5, 10);
        if (Math.abs(x) < 26) { put(tm, k, 0, -100, 0, 1, 1, 1); continue; }
        put(tm, k, x, ground(x, z) + r * 0.95, z, r, r * rng.range(0.9, 1.3), r, rng() * 6.28);
      }
      scene.add(tm);
    }
    await ctx.yield();

    // ---- the village: houses either side of the lane, a church, a pub, and one house with a bulldozer at its gate
    {
      const WALLS = ['#d9cdb4', '#c9b79a', '#e6e0d2', '#b9a68a', '#c7b8a6'], ROOFS = ['#6e4a3a', '#59483f', '#7b5a44', '#4f4b4a'];
      const houses = [];
      for (let k = 0; k < 46; k++) {
        const side = rng.sign(), x = side * rng.range(26, 170), z = rng.range(-700, -400);
        if (houses.some((h) => Math.abs(h.x - x) < 22 && Math.abs(h.z - z) < 20)) continue;
        if (Math.abs(x - 96) < 34 && Math.abs(z + 560) < 44) continue;      // the churchyard
        houses.push({ x, z, w: rng.range(9, 15), d: rng.range(7, 10), h: rng.range(5, 7), ry: rng.chance(0.5) ? 0 : Math.PI / 2 });
      }
      houses.push({ x: -30, z: -470, w: 13, d: 9, h: 6, ry: 0, arthur: true });      // the house in the way
      houses.push({ x: 34, z: -610, w: 22, d: 11, h: 7, ry: Math.PI / 2, pub: true });
      const wm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95 }), houses.length);
      const rg = new THREE.ConeGeometry(0.7071, 1, 4, 1); rg.rotateY(Math.PI / 4);
      const rm = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), houses.length);
      houses.forEach((h, k) => {
        const g = ground(h.x, h.z);
        put(wm, k, h.x, g + h.h / 2 - 1, h.z, h.w, h.h + 2, h.d, h.ry); wm.setColorAt(k, col.set(h.pub ? '#efe9d8' : rng.pick(WALLS)));
        put(rm, k, h.x, g + h.h + 2, h.z, h.w * 1.08, 4.2, h.d * 1.12, h.ry); rm.setColorAt(k, col.set(rng.pick(ROOFS)));
      });
      wm.instanceColor.needsUpdate = true; rm.instanceColor.needsUpdate = true;
      scene.add(wm, rm);
      // the church
      const stone = new THREE.MeshStandardMaterial({ color: '#a9a393', roughness: 1 }), slate = new THREE.MeshStandardMaterial({ color: '#4c4f55', roughness: 0.9, flatShading: true });
      const cg = ground(96, -560), church = new THREE.Group(); church.position.set(96, cg, -560);
      const nave = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 30), stone); nave.position.set(0, 4, 4);
      const nroof = new THREE.Mesh(rg, slate); nroof.scale.set(13, 6, 31); nroof.position.set(0, 12, 4);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(8, 22, 8), stone); tower.position.set(0, 10, -15);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(5, 16, 4), slate); spire.rotation.y = Math.PI / 4; spire.position.set(0, 29, -15);
      church.add(nave, nroof, tower, spire); scene.add(church);
      // the pub's sign on its post by the lane
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), new THREE.MeshStandardMaterial({ color: '#2b2622' })); post.position.set(12, ground(12, -604) + 2.5, -604);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.15), new THREE.MeshStandardMaterial({ color: '#7a1f1f' })); sign.position.set(12, ground(12, -604) + 4.6, -604.3);
      scene.add(post, sign);
      // the bulldozer: yellow, facing the house, with a small mound of mud in front of it
      const yel = new THREE.MeshStandardMaterial({ color: '#f1c40f', roughness: 0.6 }), dark = new THREE.MeshStandardMaterial({ color: '#25272a', roughness: 0.9 });
      const dz = new THREE.Group(), bx = -14, bz = -468; dz.position.set(bx, ground(bx, bz), bz); dz.rotation.y = Math.PI / 2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 4.6), yel); body.position.y = 1.7;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 2), yel); cab.position.set(0, 3.3, -0.9);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 0.35), yel); blade.position.set(0, 1.0, 3.1);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 5), dark); tl.position.set(-1.7, 0.55, 0); const tr = tl.clone(); tr.position.x = 1.7;
      dz.add(body, cab, blade, tl, tr); dz.scale.setScalar(1.25); scene.add(dz);
      const mud = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 5), new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 1 })); mud.scale.y = 0.35; mud.position.set(bx - 6, ground(bx - 6, bz) + 0.1, bz); scene.add(mud);
    }
    await ctx.yield();

    // ---- the ships: each a slab with a few more slabs on it, a dark belly, and small lights underneath
    {
      const boxes = [], lights = [];      // box: [x,y,z,sx,sy,sz,colour]
      const YEL = ['#b89a2a', '#c2a233', '#a88d2c', '#b3962f'], DARK = '#3a3626';
      for (const S of ships) {
        const c = rng.pick(YEL), near = S === ships.find((q) => q.x === 0 && q.z === SHIP0.z);
        boxes.push([S.x, S.y, S.z, S.W, S.H, S.L, c]);
        boxes.push([S.x, S.y - S.H * 0.5 - 2, S.z, S.W * 0.94, 5, S.L * 0.96, DARK]);      // the belly
        const n = rng.int(3, 5);
        for (let k = 0; k < n; k++) {
          const t = rng();
          if (t < 0.35) { const w = S.W * rng.range(0.3, 0.6), l = S.L * rng.range(0.15, 0.35), h = S.H * rng.range(0.3, 0.7); boxes.push([S.x + rng.range(-0.2, 0.2) * S.W, S.y + S.H * 0.5 + h * 0.5, S.z + rng.range(-0.3, 0.3) * S.L, w, h, l, c]); }      // a block on the back
          else if (t < 0.7) { const sd = rng.sign(), w = S.W * rng.range(0.12, 0.25), l = S.L * rng.range(0.3, 0.7), h = S.H * rng.range(0.4, 0.8); boxes.push([S.x + sd * (S.W * 0.5 + w * 0.5), S.y + rng.range(-0.15, 0.15) * S.H, S.z + rng.range(-0.15, 0.15) * S.L, w, h, l, rng.pick(YEL)]); }      // a sponson
          else if (!near) { const w = S.W * rng.range(0.2, 0.45), l = S.L * rng.range(0.15, 0.3), h = S.H * rng.range(0.25, 0.5); boxes.push([S.x + rng.range(-0.2, 0.2) * S.W, S.y - S.H * 0.5 - h * 0.5, S.z + rng.range(-0.3, 0.3) * S.L, w, h, l, DARK]); }      // something slung below
          else { const w = S.W * 0.3, l = S.L * 0.2, h = S.H * 0.5; boxes.push([S.x, S.y + S.H * 0.5 + h * 0.5, S.z - S.L * 0.3, w, h, l, c]); }
        }
        const nl = Math.round((near ? 60 : 14) * detail);
        for (let k = 0; k < nl; k++) lights.push(S.x + rng.range(-0.46, 0.46) * S.W, S.y - S.H * 0.5 - 5, S.z + rng.range(-0.47, 0.47) * S.L);
      }
      // the nearest ship's slung block, whose forward face the way out stands at
      const under = SHIP0.y - SHIP0.H * 0.5;
      boxes.push([0, under - POD.h * 0.5, (POD.z0 + POD.z1) * 0.5, POD.w, POD.h, POD.z0 - POD.z1, '#8f7a28']);
      boxes.push([0, under - POD.h * 0.5, POD.z0 + 1.2, 22, 26, 2, '#2a271c']);      // the bay's dark surround
      const sm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.1 }), boxes.length);
      boxes.forEach((b, k) => { put(sm, k, b[0], b[1], b[2], b[3], b[4], b[5]); sm.setColorAt(k, col.set(b[6])); });
      sm.instanceColor.needsUpdate = true; sm.frustumCulled = false; scene.add(sm);
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
      const lp = new THREE.Points(lg, new THREE.PointsMaterial({ color: '#ffe9a8', size: 7, sizeAttenuation: true, fog: true })); lp.frustumCulled = false; scene.add(lp);
    }
    await ctx.yield();

    // ---- the route: up the lane, over the roofs, then the climb to the bay under the nearest ship
    const yP = SHIP0.y - SHIP0.H * 0.5 - POD.h * 0.5;      // the bay's centre height
    const low = (x, z, h) => [x, ground(x, z) + h, z];
    const path = makePath([
      low(0, 260, 17), low(0, 120, 17), low(6, -80, 18), low(-8, -260, 22), low(-4, -440, 30), low(8, -600, 34),
      [20, 80, -800], [22, 170, -960], [14, 290, -1110], [4, 392, -1230], [0, yP, -1335], [0, yP, POD.z0 + 6],
    ]);

    return {
      scene, path, duration: DUR,
      camera: { fov: 62, near: 0.5, far: 20000, lookAhead: 30, sway: 0.3, bank: 0.15 },
      pois: [
        { at: [-14, ground(-14, -468) + 2, -468], from: 0.12, to: 0.3, weight: 0.45 },      // the bulldozer and the house
        { at: [0, SHIP0.y - 40, SHIP0.z + 200], from: 0.34, to: 0.8, weight: 0.5 },      // the ship overhead
      ],
      portal: { shape: 'rect', width: 14, height: 18, color: '#fff2b0', glow: 0.4 },
      post: { exposure: 1.0, bloom: { strength: 0.3, radius: 0.8, threshold: 0.95 },
        grade: { saturation: 1.05, contrast: 1.05, vignette: 0.25, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update(dt, time, camera, u) {},      // nothing moves: the ships hang
      dispose() {},
    };
  },
};
