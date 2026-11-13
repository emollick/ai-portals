// The Total Perspective Vortex. We start beside a small steel box on a dead grey plain and fly straight on through
// the whole of creation, laid out along -Z at faked scales: a planet and its moon, a sun with its planets on thin
// orbit rings, a spiral galaxy, and then the cosmic web, hundreds of galaxies strung on filaments. In the web a tiny
// bright dot wears a thin circle and a line: you are here.
import * as THREE from 'three';
import { makePath } from '../kit/core.js';

const PTS = [
  [0, 4, 0], [0, 4, -120], [0, 40, -360], [-20, 220, -820], [40, 400, -1500], [110, 560, -2400],
  [20, 800, -3600], [-100, 930, -4800], [0, 840, -6200], [60, 870, -7800], [0, 900, -9400], [-40, 900, -10600], [-40, 900, -11200],
];

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function pointsOf(pos, col, size, map, opacity = 1) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map, vertexColors: true, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; return p;
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
    const dot = dotTexture();
    const disposables = [dot];
    const C = new THREE.Color();

    // ---- lights: the sun down the road lights the plain, the box, the planet and the moon
    const SUN = new THREE.Vector3(430, 480, -2400);
    scene.add(new THREE.AmbientLight(0x8090b0, 0.25));
    const sunLight = new THREE.DirectionalLight(0xfff0d8, Math.PI * 0.9);
    sunLight.position.copy(SUN); sunLight.target.position.set(0, 0, 0); scene.add(sunLight, sunLight.target);

    // ---- the dead plain and the box
    {
      const g = new THREE.CircleGeometry(900, 96, 0, Math.PI * 2); g.rotateX(-Math.PI / 2);
      const p = g.attributes.position, cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const k = 0.2 + 0.06 * rng(); cols[i * 3] = k; cols[i * 3 + 1] = k; cols[i * 3 + 2] = k * 1.05; }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const plain = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9a9aa2, roughness: 1, metalness: 0, vertexColors: true }));
      plain.position.set(0, 0, -300); scene.add(plain);
      // a scatter of stones
      const sg = new THREE.DodecahedronGeometry(1, 0), sm = new THREE.MeshStandardMaterial({ color: 0x6c6c74, roughness: 1, flatShading: true });
      const n = Math.round(260 * detail), stones = new THREE.InstancedMesh(sg, sm, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        let x = rng.range(-320, 320), z = rng.range(-620, 20); if (Math.abs(x) < 7) x += x < 0 ? -9 : 9;
        const r = rng.range(0.3, 2.2); e.set(rng() * 6, rng() * 6, rng() * 6); q.setFromEuler(e);
        m.compose(v.set(x, r * 0.3, z), q, s.set(r, r * rng.range(0.4, 0.8), r)); stones.setMatrixAt(i, m);
      }
      scene.add(stones);
      // the Vortex: a small steel box with one door and a cable
      const steel = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.32, metalness: 0.9 });
      const box = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 5), steel); body.position.y = 3.5; box.add(body);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(2, 4.4), new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.5, metalness: 0.6 }));
      door.position.set(0, 2.3, 2.51); box.add(door);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff5a30 })); lamp.position.set(1.5, 5.6, 2.55); box.add(lamp);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 30, 6), new THREE.MeshStandardMaterial({ color: 0x303236, roughness: 0.8 }));
      cable.rotation.z = Math.PI / 2; cable.position.set(17, 0.15, -1); box.add(cable);
      box.position.set(11, 0, -46); box.rotation.y = -0.5; scene.add(box);
      scene.userData.lamp = lamp;
      disposables.push(g, sg, sm, steel);
    }
    await ctx.yield();

    // ---- far stars: a shell round the whole road
    {
      const n = Math.round(5000 * detail), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const u = rng() * 2 - 1, a = rng() * Math.PI * 2, r = 19000, s = Math.sqrt(1 - u * u);
        pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = u * r + 600; pos[i * 3 + 2] = Math.sin(a) * s * r - 5600;
        const k = 0.25 + 0.75 * Math.pow(rng(), 3); C.setHSL(rng.range(0.55, 0.7), 0.3 * rng(), 0.6).multiplyScalar(k);
        col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b;
      }
      const stars = pointsOf(pos, col, 2.2, dot); stars.material.sizeAttenuation = false; scene.add(stars);
    }

    // ---- a planet and its moon
    const planet = new THREE.Mesh(new THREE.SphereGeometry(120, 64, 40), new THREE.MeshStandardMaterial({ color: 0x3b6ea8, roughness: 0.85 }));
    {
      const p = planet.geometry.attributes.position, cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) / 120, y = p.getY(i) / 120, z = p.getZ(i) / 120;
        const n = Math.sin(x * 5.1 + Math.sin(y * 4.3) * 1.7) * Math.cos(z * 4.7 + Math.sin(x * 3.1) * 1.3) + 0.4 * Math.sin(y * 11 + x * 7);
        if (Math.abs(y) > 0.9) C.setRGB(0.9, 0.93, 0.97); else if (n > 0.25) C.setRGB(0.28, 0.42, 0.2).lerp(new THREE.Color(0.55, 0.46, 0.3), Math.min(1, (n - 0.25) * 2)); else C.setRGB(0.1, 0.25, 0.55);
        cols[i * 3] = C.r; cols[i * 3 + 1] = C.g; cols[i * 3 + 2] = C.b;
      }
      planet.geometry.setAttribute('color', new THREE.BufferAttribute(cols, 3)); planet.material.vertexColors = true; planet.material.color.set(0xffffff);
      planet.position.set(-270, 250, -930); planet.rotation.z = 0.4; scene.add(planet);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(126, 48, 32), new THREE.MeshBasicMaterial({ color: 0x4a8cff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false }));
      halo.position.copy(planet.position); scene.add(halo);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 20), new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 1 }));
      moon.position.set(170, 400, -1220); scene.add(moon);
    }
    await ctx.yield();

    // ---- a sun, and its planets on thin orbit rings
    const system = new THREE.Group(); system.position.copy(SUN); system.rotation.set(0.5, 0, 0.25); scene.add(system);
    const orbiters = [];
    {
      const sun = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 32), new THREE.MeshBasicMaterial({ color: 0xfff2c0 })); system.add(sun);
      for (const [r, o] of [[175, 0.35], [230, 0.14], [340, 0.05]]) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: o, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false })); system.add(h);
      }
      const hues = [0xb0a090, 0xe0c080, 0x4a80d0, 0xc06040, 0xd8b080, 0x90c0d0];
      [330, 440, 580, 760, 1000, 1280].forEach((r, i) => {
        const pts = []; for (let k = 0; k <= 160; k++) { const a = k / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
        system.add(ring);
        const pr = [7, 11, 12, 9, 26, 20][i];
        const pl = new THREE.Mesh(new THREE.SphereGeometry(pr, 24, 16), new THREE.MeshBasicMaterial({ color: hues[i] }));
        const a0 = rng() * Math.PI * 2; system.add(pl); orbiters.push({ pl, r, a0, w: 0.25 / Math.pow(r / 330, 1.5) });
      });
    }
    await ctx.yield();

    // ---- the galaxy: log-spiral arms, a warm core, blue arms
    const galaxy = new THREE.Group(), spin = new THREE.Group(); galaxy.add(spin);
    galaxy.position.set(60, 560, -5400); galaxy.rotation.set(0.42, 0, -0.18); scene.add(galaxy);
    {
      const n = Math.round(60000 * Math.max(0.4, detail)), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), R = 1700, ARMS = 4;
      const warm = new THREE.Color(1.0, 0.78, 0.5), blue = new THREE.Color(0.45, 0.62, 1.0), pink = new THREE.Color(1.0, 0.45, 0.6);
      for (let i = 0; i < n; i++) {
        let x, y, z, k;
        if (i < n * 0.22) { // the bulge
          const r = Math.abs(rng.gauss()) * 150, a = rng() * Math.PI * 2;
          x = Math.cos(a) * r; z = Math.sin(a) * r; y = rng.gauss() * 60 * Math.exp(-r / 260);
          C.copy(warm).multiplyScalar(0.35 + 0.5 * rng());
        } else {
          const t = Math.pow(rng(), 0.7), r = 120 + t * R, arm = Math.floor(rng() * ARMS);
          const a = arm / ARMS * Math.PI * 2 + Math.log(r / 120) * 2.6 + rng.gauss() * (0.16 + 0.1 * t);
          x = Math.cos(a) * r + rng.gauss() * 18; z = Math.sin(a) * r + rng.gauss() * 18; y = rng.gauss() * (14 + 22 * (1 - t));
          k = 0.18 + 0.5 * rng() * (1 - 0.6 * t);
          C.copy(warm).lerp(blue, Math.min(1, 0.25 + t * 1.1)); if (rng() < 0.035) C.copy(pink); C.multiplyScalar(k);
        }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b;
        if ((i & 16383) === 0) await ctx.yield();
      }
      spin.add(pointsOf(pos, col, 13, dot, 0.9));
      const core = pointsOf(new Float32Array([0, 0, 0]), new Float32Array([1, 0.85, 0.6]), 520, dot, 0.9); spin.add(core);
    }
    await ctx.yield();

    // ---- the cosmic web: nodes, filaments between near neighbours, galaxies strung along them
    const HERE = new THREE.Vector3(40, 915, -10480);
    {
      const NODES = 46, nodes = [];
      for (let i = 0; i < NODES; i++) nodes.push(new THREE.Vector3(rng.range(-2600, 2600), rng.range(-700, 2500), rng.range(-12800, -7000)));
      const P = [], Cc = [], D = [], Dc = [];
      const put = (x, y, z, big) => {
        if (path.distanceTo(x, y, z) < 55) return;
        const k = big ? 0.45 + 0.55 * rng() : 0.12 + 0.2 * rng();
        C.setHSL(rng() < 0.3 ? rng.range(0.05, 0.12) : rng.range(0.56, 0.68), 0.55, 0.62).multiplyScalar(k);
        (big ? P : D).push(x, y, z); (big ? Cc : Dc).push(C.r, C.g, C.b);
      };
      const strew = (c, spread, nBig, nDust) => {
        for (let i = 0; i < nBig; i++) put(c.x + rng.gauss() * spread, c.y + rng.gauss() * spread, c.z + rng.gauss() * spread, true);
        for (let i = 0; i < nDust; i++) put(c.x + rng.gauss() * spread * 1.6, c.y + rng.gauss() * spread * 1.6, c.z + rng.gauss() * spread * 1.6, false);
      };
      const tmp = new THREE.Vector3();
      for (let i = 0; i < NODES; i++) {
        strew(nodes[i], 110, 16, Math.round(70 * detail));
        const near = nodes.map((p, j) => [p.distanceTo(nodes[i]), j]).filter((e) => e[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 3);
        for (const [d, j] of near) {
          if (j < i && rng() < 0.5) continue;
          const steps = Math.max(6, Math.round(d / 90));
          for (let s = 1; s < steps; s++) { tmp.lerpVectors(nodes[i], nodes[j], s / steps); strew(tmp, 34, 1, Math.round(9 * detail)); }
        }
        if ((i & 7) === 0) await ctx.yield();
      }
      // a filament of our own, so the marked dot is not alone
      for (let s = 0; s < 26; s++) { tmp.set(HERE.x + (s - 13) * 46 + rng.gauss() * 20, HERE.y + Math.sin(s * 0.5) * 40 + 30, HERE.z + (s - 13) * 20); strew(tmp, 30, 1, 8); }
      scene.add(pointsOf(new Float32Array(D), new Float32Array(Dc), 16, dot, 0.8));
      scene.add(pointsOf(new Float32Array(P), new Float32Array(Cc), 46, dot, 1));
    }
    await ctx.yield();

    // ---- you are here: a tiny bright dot, a thin circle round it, a line and a tick
    const marker = new THREE.Group(); marker.position.copy(HERE); scene.add(marker);
    const hereDot = pointsOf(new Float32Array([HERE.x, HERE.y, HERE.z]), new Float32Array([1, 1, 1]), 5, dot, 1); hereDot.material.sizeAttenuation = false; scene.add(hereDot);
    {
      const lm = new THREE.LineBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false });
      const circ = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2; circ.push(new THREE.Vector3(Math.cos(a) * 9, Math.sin(a) * 9, 0)); }
      marker.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circ), lm));
      marker.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(6.4, 6.4, 0), new THREE.Vector3(22, 22, 0), new THREE.Vector3(40, 22, 0)]), lm));
      marker.renderOrder = 10;
    }

    const lamp = scene.userData.lamp, camPos = new THREE.Vector3();
    function update(dt, time, camera) {
      spin.rotation.y = time * 0.02;
      planet.rotation.y = time * 0.03;
      for (const o of orbiters) { const a = o.a0 + time * o.w; o.pl.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r); }
      if (lamp) lamp.material.color.setRGB(1, 0.35, 0.19).multiplyScalar(0.55 + 0.45 * Math.sin(time * 3));
      if (camera) { camera.getWorldPosition(camPos); marker.lookAt(camPos); const d = camPos.distanceTo(HERE); marker.scale.setScalar(Math.max(0.6, d / 420)); }
    }

    return {
      scene, path, duration: 48,
      pace: (u) => (u < 0.06 ? 0.45 : u < 0.2 ? 0.8 : u < 0.86 ? 1.25 : 0.7),
      camera: { fov: 62, near: 0.5, far: 30000, lookAhead: 40, sway: 0.2, bank: 0.1 },
      pois: [{ at: [HERE.x, HERE.y, HERE.z], from: 0.8, to: 0.93, weight: 0.5 }],
      portal: { shape: 'circle', radius: 10, color: '#cfe0ff', glow: 0.5 },
      post: { exposure: 1.0, bloom: { strength: 0.7, radius: 0.8, threshold: 0.8 }, grade: { saturation: 1.1, contrast: 1.05, vignette: 0.3, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() { for (const d of disposables) d.dispose?.(); },
    };
  },
};
