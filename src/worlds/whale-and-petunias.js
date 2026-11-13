// A Whale and a Bowl of Petunias. High over a dead grey-gold planet with two suns low on its limb, a sperm whale that
// was not there a moment ago is falling through thin cloud, slowly turning, and not far from it a bowl of petunias is
// falling too. We go down beside them in one wide turn of a spiral, from three kilometres to six hundred metres.
// An original place imagined from The Hitchhiker's Guide to the Galaxy; nothing here is copied from a picture of it.
import * as THREE from 'three';
import { makePath, makeNoise } from '../kit/core.js';

const DUR = 44;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function blobTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.45, outer); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildWhale() {
  const whale = new THREE.Group();
  // the body: a lathe from the tail stock (y = 0) to the blunt head (y = 18), laid along +Z
  const prof = [[0.12, 0], [0.38, 1.2], [0.7, 3], [1.15, 5.5], [1.7, 8.5], [2.05, 11.5], [2.2, 14], [2.2, 16], [2.05, 17.2], [1.55, 17.85], [0.7, 18], [0, 18]];
  const body = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), 28);
  body.rotateX(Math.PI / 2); body.translate(0, 0, -9); body.scale(0.86, 1, 1);
  const pos = body.attributes.position, col = new Float32Array(pos.count * 3);
  const top = new THREE.Color('#4a525c'), belly = new THREE.Color('#c9c4b6'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i);
    const k = smooth(-1.6, -0.4, y) * (0.85 + 0.15 * Math.sin(z * 2.3 + y * 3.1));
    c.copy(belly).lerp(top, Math.min(1, Math.max(0, k)));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  body.setAttribute('color', new THREE.BufferAttribute(col, 3)); body.computeVertexNormals();
  const skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: '#434a54', roughness: 0.6 });
  const pale = new THREE.MeshStandardMaterial({ color: '#bdb8aa', roughness: 0.7 });
  whale.add(new THREE.Mesh(body, skin));
  const ball = new THREE.SphereGeometry(1, 18, 12);
  const part = (mat, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(ball, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); whale.add(m); return m; };
  // flukes (two lobes, swept back), kept in a group that beats slowly
  const tail = new THREE.Group(); tail.position.set(0, 0, -8.8); whale.add(tail);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(ball, dark); f.scale.set(2.0, 0.14, 0.95); f.position.set(s * 1.7, 0, -0.5); f.rotation.y = s * 0.45; tail.add(f); }
  // flippers, the narrow lower jaw, the hump and the knuckles behind it, the eyes
  const flips = [part(dark, 0.95, 0.12, 0.5, -1.95, -1.0, 3.2, 0, 0.5, 0.55), part(dark, 0.95, 0.12, 0.5, 1.95, -1.0, 3.2, 0, -0.5, -0.55)];
  const jaw = part(pale, 0.42, 0.26, 3.1, 0, -1.95, 5.0, 0.06);
  part(dark, 0.3, 0.42, 1.2, 0, 1.75, -3.0);
  for (let i = 0; i < 4; i++) part(dark, 0.18, 0.2, 0.5, 0, 1.35 - i * 0.2, -4.6 - i * 1.0);
  for (const s of [-1, 1]) part(new THREE.MeshStandardMaterial({ color: '#0b0d10', roughness: 0.2 }), 0.11, 0.11, 0.11, s * 1.72, -0.75, 4.6);
  return { group: whale, tail, flips, jaw };
}

function buildPetunias(rng) {
  const g = new THREE.Group();
  const bowlProf = [[0.0, 0], [0.24, 0], [0.34, 0.1], [0.44, 0.3], [0.47, 0.36], [0.43, 0.36], [0.4, 0.3]];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProf.map((p) => new THREE.Vector2(p[0], p[1])), 24),
    new THREE.MeshStandardMaterial({ color: '#b5603a', roughness: 0.85, side: THREE.DoubleSide }));
  g.add(bowl);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.41, 20), new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 1 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.31; g.add(soil);
  const leafGeo = new THREE.SphereGeometry(1, 10, 8), leafMat = new THREE.MeshStandardMaterial({ color: '#3f7d3a', roughness: 0.8 });
  const cone = new THREE.ConeGeometry(0.13, 0.17, 12, 1, true); cone.rotateX(Math.PI); cone.translate(0, 0.085, 0);   // the wide mouth upward
  const hues = ['#d94fa6', '#8e44c9', '#f07ac0', '#6a3fd0', '#ff9ad5'];
  const eye = new THREE.SphereGeometry(0.03, 8, 6), eyeMat = new THREE.MeshStandardMaterial({ color: '#ffe27a', emissive: '#6a5200', roughness: 0.6 });
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.36, h = 0.34 + rng() * 0.22;
    const lf = new THREE.Mesh(leafGeo, leafMat); lf.scale.set(0.12, 0.03, 0.07); lf.position.set(Math.cos(a) * r, h - 0.06, Math.sin(a) * r); lf.rotation.set(rng() * 0.8 - 0.4, a, rng() * 0.8 - 0.4); g.add(lf);
  }
  for (let i = 0; i < 11; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.34, h = 0.4 + rng() * 0.22;
    const f = new THREE.Mesh(cone, new THREE.MeshStandardMaterial({ color: hues[i % hues.length], roughness: 0.6, side: THREE.DoubleSide, emissive: hues[i % hues.length], emissiveIntensity: 0.12 }));
    f.position.set(Math.cos(a) * r, h, Math.sin(a) * r); f.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(f);
    const e = new THREE.Mesh(eye, eyeMat); e.position.copy(f.position); e.position.y += 0.05; g.add(e);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, h - 0.3, 5), leafMat); stem.position.set(f.position.x, 0.3 + (h - 0.3) / 2, f.position.z); g.add(stem);
  }
  return g;
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
    const noise = makeNoise(Math.floor(rng() * 1e9));
    const scene = new THREE.Scene();
    const HAZE = new THREE.Color('#c9a680');
    scene.background = new THREE.Color('#1a2038');
    scene.fog = new THREE.FogExp2(HAZE, 0.000055);

    // ---- the road: one wide right-hand turn of a spiral, level at both ends ----
    const R = 520, C = [R, 0, 0], TURN = Math.PI * 1.55, pts = [[0, 3000, 160]];
    for (let i = 0; i <= 12; i++) {
      const s = i / 12, a = s * TURN, y = 3000 - 2400 * smooth(0.04, 0.96, s);
      pts.push([C[0] - R * Math.cos(a), y, C[2] - R * Math.sin(a)]);
    }
    { const a = TURN, last = pts[pts.length - 1]; pts.push([last[0] + Math.sin(a) * 150, 600, last[2] - Math.cos(a) * 150]); }
    const path = makePath(pts), LEN = path.length;
    await ctx.yield();

    // ---- the sky: a shell that goes with the eye, two suns low on the limb, a few stars overhead ----
    const sky = new THREE.Group(); scene.add(sky);
    {
      const geo = new THREE.SphereGeometry(26000, 32, 24), p = geo.attributes.position, col = new Float32Array(p.count * 3);
      const zen = new THREE.Color('#141a33'), mid = new THREE.Color('#5a6690'), hor = new THREE.Color('#f0c090'), low = new THREE.Color('#b8946e'), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const e = p.getY(i) / 26000;
        if (e < 0) c.copy(hor).lerp(low, smooth(0, -0.25, e)); else if (e < 0.18) c.copy(hor).lerp(mid, smooth(0, 0.18, e)); else c.copy(mid).lerp(zen, smooth(0.18, 0.75, e));
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
      m.renderOrder = -10; sky.add(m);
      const sp = new Float32Array(500 * 3);
      for (let i = 0; i < 500; i++) { const a = rng() * Math.PI * 2, e = 0.3 + rng() * 1.25, r = 24000; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      sky.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#dfe6ff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.6, fog: false, depthWrite: false })));
    }
    const sunAz = rng.range(-0.5, 0.3), SUN = new THREE.Vector3(Math.cos(sunAz) * Math.cos(0.13), Math.sin(0.13), -Math.sin(sunAz + 1.2) * Math.cos(0.13)).normalize();
    const SUN2 = new THREE.Vector3(SUN.x * Math.cos(0.2) - SUN.z * Math.sin(0.2), SUN.y * 0.55, SUN.x * Math.sin(0.2) + SUN.z * Math.cos(0.2)).normalize();
    const glowA = blobTexture('rgba(255,250,235,1)', 'rgba(255,205,130,0.35)'), glowB = blobTexture('rgba(255,225,205,1)', 'rgba(255,120,80,0.3)');
    const sunSprite = (tex, dir, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, fog: false, depthWrite: false, transparent: true })); s.position.copy(dir).multiplyScalar(23000); s.scale.set(size, size, 1); sky.add(s); return s; };
    sunSprite(glowA, SUN, 7500); sunSprite(glowA, SUN, 2200); sunSprite(glowB, SUN2, 4200); sunSprite(glowB, SUN2, 1200);

    scene.add(new THREE.HemisphereLight(new THREE.Color('#9fb0e0'), new THREE.Color('#a8845c'), Math.PI * 0.55));
    const d1 = new THREE.DirectionalLight(new THREE.Color('#ffe2b0'), Math.PI * 1.0); d1.position.copy(SUN).multiplyScalar(1000); scene.add(d1, d1.target);
    const d2 = new THREE.DirectionalLight(new THREE.Color('#ff9a70'), Math.PI * 0.35); d2.position.copy(SUN2).multiplyScalar(1000); scene.add(d2, d2.target);
    await ctx.yield();

    // ---- the ground far below: a dead plain, cratered, ochre and grey ----
    {
      const SIZE = 44000, SEG = Math.round(150 * Math.min(1.2, Math.max(0.6, detail)));
      const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position, col = new Float32Array(p.count * 3);
      const craters = []; for (let i = 0; i < 46; i++) craters.push([rng.range(-0.45, 0.45) * SIZE, rng.range(-0.45, 0.45) * SIZE, rng.range(300, 2200)]);
      const ochre = new THREE.Color('#b08a52'), grey = new THREE.Color('#7d7a78'), gold = new THREE.Color('#d2b070'), darkc = new THREE.Color('#4e463f'), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        let h = noise.fbm2(x * 0.00012, z * 0.00012, 5) * 420 + noise.fbm2(x * 0.0009 + 7, z * 0.0009, 3) * 60, pit = 0;
        for (let k = 0; k < craters.length; k++) {
          const cr = craters[k], d = Math.hypot(x - cr[0], z - cr[1]) / cr[2];
          if (d < 1.5) { const depth = cr[2] * 0.16; if (d < 1) { h -= depth * (1 - d * d); pit = Math.max(pit, 1 - d); } h += depth * 0.35 * Math.exp(-((d - 1) * (d - 1)) / 0.03); }
        }
        p.setY(i, h);
        const n = noise.fbm2(x * 0.0003 + 31, z * 0.0003 - 12, 4) * 0.5 + 0.5;
        c.copy(grey).lerp(ochre, smooth(0.3, 0.7, n)).lerp(gold, smooth(0.62, 0.9, n) * 0.6).lerp(darkc, pit * 0.55);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        if ((i & 4095) === 0) await ctx.yield();
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
      const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
      ground.position.set(C[0], -200, C[2]); scene.add(ground);
    }
    await ctx.yield();

    // ---- thin cloud in four decks, kept out of the road ----
    const cloudTex = blobTexture('rgba(255,248,238,0.9)', 'rgba(255,236,214,0.35)');
    const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.34, depthWrite: false, color: '#fff2e2' });
    const clouds = new THREE.Group(); scene.add(clouds);
    {
      const decks = [2650, 2050, 1450, 950], n = Math.round(230 * detail);
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2, r = 150 + Math.sqrt(rng()) * 4200, y = decks[i % 4] + rng.gauss() * 45;
        const x = C[0] + Math.cos(a) * r, z = C[2] + Math.sin(a) * r, size = rng.range(260, 820);
        if (path.distanceTo(x, y, z) < size * 0.5 + 70) continue;
        const s = new THREE.Sprite(cloudMat); s.position.set(x, y, z); s.scale.set(size, size * rng.range(0.22, 0.4), 1); clouds.add(s);
      }
    }
    await ctx.yield();

    // ---- the air rushing up past the eye: streaks carried round the camera ----
    const NS = Math.round(1400 * detail), BOX = 160, sOff = new Float32Array(NS * 3);
    for (let i = 0; i < NS; i++) { sOff[i * 3] = rng.range(-BOX, BOX); sOff[i * 3 + 1] = rng.range(-BOX, BOX); sOff[i * 3 + 2] = rng.range(-BOX, BOX); }
    const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sOff, 3));
    const streaks = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: '#fff4e4', size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false, map: cloudTex }));
    streaks.frustumCulled = false; scene.add(streaks);

    // ---- the two who fall ----
    const W = buildWhale(); scene.add(W.group);
    const bowl = buildPetunias(rng.fork ? rng.fork('petunias') : rng); bowl.scale.setScalar(3.2); scene.add(bowl);
    await ctx.yield();

    const P = new THREE.Vector3(), T = new THREE.Vector3(), Rt = new THREE.Vector3(), eye = new THREE.Vector3();
    const place = (obj, dist, side, drop) => {
      path.posAtDist(dist, P); path.tangentAtDist(Math.min(LEN, Math.max(0, dist)), T);
      Rt.set(-T.z, 0, T.x); if (Rt.lengthSq() < 1e-6) Rt.set(1, 0, 0); Rt.normalize();
      obj.position.copy(P).addScaledVector(Rt, side); obj.position.y += drop;
    };

    function update(dt, time, camera, u) {
      const uu = Math.min(1, Math.max(0, u || 0)), d = uu * LEN;
      camera.getWorldPosition(eye);
      sky.position.copy(eye);
      // the whale: ahead and to the inside of the turn, drawing off a little toward the end so the exit stands clear
      place(W.group, d + 62 - 20 * smooth(0.8, 1, uu), 40 + 34 * smooth(0.7, 1, uu), -9 - 14 * smooth(0.75, 1, uu));
      W.group.rotation.set(0.55 + Math.sin(time * 0.23) * 0.4, time * 0.16, Math.sin(time * 0.19 + 1) * 0.5);
      W.tail.rotation.x = Math.sin(time * 1.1) * 0.35;
      W.flips[0].rotation.z = 0.55 + Math.sin(time * 1.6) * 0.3; W.flips[1].rotation.z = -0.55 - Math.sin(time * 1.6 + 0.6) * 0.3;
      W.jaw.rotation.x = 0.06 + (Math.sin(time * 0.7) * 0.5 + 0.5) * 0.12;
      // the bowl of petunias: first a speck ahead on the outside, then close by, then behind us
      place(bowl, d + 75 - 95 * smooth(0.4, 0.82, uu), -7 - 5 * (1 - smooth(0.3, 0.6, uu)), -2.5);
      bowl.rotation.set(Math.sin(time * 0.5) * 0.35, time * 0.6, Math.cos(time * 0.43) * 0.3);
      // the air
      const a = sGeo.attributes.position.array, rise = 75 * dt;
      for (let i = 1; i < a.length; i += 3) { a[i] += rise; if (a[i] > BOX) a[i] -= 2 * BOX; }
      sGeo.attributes.position.needsUpdate = true;
      streaks.position.copy(eye);
      streaks.visible = !ctx.through;
    }

    return {
      scene, path, duration: DUR,
      camera: { fov: 62, near: 0.5, far: 30000, lookAhead: 30, sway: 0.3, bank: 0.15 },
      pois: [],
      portal: { shape: 'circle', radius: 9, color: '#ffe6c0', glow: 0.4 },
      post: { exposure: 1.05, bloom: { strength: 0.4, radius: 0.8, threshold: 0.9 },
        grade: { saturation: 1.05, contrast: 1.05, vignette: 0.25, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() {
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose()); });
        cloudTex.dispose(); glowA.dispose(); glowB.dispose();
      },
    };
  },
};
