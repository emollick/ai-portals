// INFINITE IMPROBABILITY. A straight transit down a tunnel of soft pastel light while the ship's drive is on, and the scenery
// keeps being things it has no business being: a length of English seaside promenade, a flock of weightless penguins, a
// flowered sofa and a standard lamp, a rain of fried eggs, doors that open on nothing, and the odds against all of it counting
// down in great lit numerals until they read 1:1 and everything settles into a plain white ship's corridor.
// Everything wobbles in size (it is not sure of itself) until normality is restored at about 0.85 of the flight.
import * as THREE from 'three';
import { makePath } from '../kit/core.js';

const DUR = 45;
const PTS = [[0, 0, 0], [0, 0, -200], [2, 1, -500], [-2, 0, -800], [0, 0, -1100], [0, 0, -1250], [0, 0, -1400]];
const TUNNEL_R = 95;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// seven segments: a top, b top right, c bottom right, d bottom, e bottom left, f top left, g middle
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const SEG_AT = { a: [0, 1, 1, 0], b: [0.5, 0.5, 0, 1], c: [0.5, -0.5, 0, 1], d: [0, -1, 1, 0], e: [-0.5, -0.5, 0, 1], f: [-0.5, 0.5, 0, 1], g: [0, 0, 1, 0] };   // x, y (in half heights), horizontal?, vertical?

function stripeTexture(a, b) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 8, 0, 8, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
}
function flowerTexture(rng) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, 256, 256);
  const cols = ['#c8324a', '#d9628a', '#7a4fa0', '#e0a030', '#b02a60'];
  for (let i = 0; i < 46; i++) {
    const x = rng() * 256, y = rng() * 256, r = 7 + rng() * 9; g.fillStyle = '#4f7a3a';
    g.beginPath(); g.ellipse(x + r, y + r * 0.8, r * 0.9, r * 0.35, 0.6, 0, 6.3); g.fill();
    g.fillStyle = rng.pick(cols);
    for (let p = 0; p < 5; p++) { const a = p * 1.2566 + i; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, r * 0.5, 0, 0, 6.3); g.fill(); }
    g.fillStyle = '#f6e27a'; g.beginPath(); g.arc(x, y, r * 0.3, 0, 6.3); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export default {
  id: 'infinite-improbability',
  name: 'Infinite Improbability',
  category: 'books',
  placeKind: 'bizarre',
  book: "The Hitchhiker's Guide to the Galaxy",
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 1,
  async build(ctx) {
    const { rng } = ctx;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e8d6ea');
    scene.fog = new THREE.Fog(new THREE.Color('#ecd9ee'), 260, 1500);
    const path = makePath(PTS);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf0c8e0, Math.PI * 0.85));
    const sun = new THREE.DirectionalLight(0xfff4e0, Math.PI * 0.8); sun.position.set(300, 500, 200); scene.add(sun, sun.target);
    const disposables = [];
    const std = (o) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, ...o }); disposables.push(m); return m; };
    const geo = (g) => { disposables.push(g); return g; };
    const BOX = geo(new THREE.BoxGeometry(1, 1, 1));
    const box = (parent, mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(BOX, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m; };
    const wobblers = [];      // { obj, f, ph, amp, spin }
    const wob = (obj, amp = 0.12, spin = 0) => { wobblers.push({ obj, f: rng.range(0.7, 1.9), ph: rng() * 6.28, amp, spin, base: obj.scale.clone() }); return obj; };

    // ---- the tunnel: a back-side cylinder with drifting pastel bands, and motes streaming past
    const tunU = { uTime: { value: 0 }, uCalm: { value: 0 } };
    const tunGeo = geo(new THREE.CylinderGeometry(TUNNEL_R, TUNNEL_R, 1900, 48, 60, true)); tunGeo.rotateX(Math.PI / 2);
    const tunMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, fog: false, uniforms: tunU,
      vertexShader: /* glsl */`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uTime; uniform float uCalm; varying vec3 vP;
        void main(){
          float z = vP.z * 0.01, a = atan(vP.y, vP.x), t = uTime;
          vec3 c1 = vec3(1.0, 0.74, 0.84), c2 = vec3(0.70, 0.84, 1.0), c3 = vec3(0.76, 1.0, 0.84), c4 = vec3(1.0, 0.93, 0.70);
          float s1 = sin(z * 6.0 + t * 1.3 + sin(a * 3.0 + t * 0.4) * 1.5);
          float s2 = sin(a * 5.0 - z * 2.0 + t * 0.7);
          vec3 col = mix(c1, c2, s1 * 0.5 + 0.5);
          col = mix(col, mix(c3, c4, s2 * 0.5 + 0.5), 0.5 + 0.5 * sin(z * 1.7 - t * 0.5));
          float ring = smoothstep(0.92, 1.0, sin(z * 14.0 + t * 3.0));
          col += ring * 0.10 * (1.0 - uCalm);
          col = mix(col, vec3(0.93, 0.94, 0.96), uCalm);
          gl_FragColor = vec4(col * 0.74, 1.0);
        }`,
    });
    disposables.push(tunMat);
    const tunnel = new THREE.Mesh(tunGeo, tunMat); tunnel.position.z = -700; scene.add(tunnel);

    const motes = (() => {
      const N = 4200, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const r = rng.range(9, TUNNEL_R - 6), a = rng() * 6.283;
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r; pos[i * 3 + 2] = rng.range(60, -1260);
        c.setHSL(rng(), 0.7, 0.75); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      const g = geo(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false });
      disposables.push(m);
      const p = new THREE.Points(g, m); scene.add(p); return p;
    })();
    await ctx.yield();

    // ---- station 1: a stretch of English seaside promenade, afloat (z -110 to -270), to the left of and below the road
    const prom = new THREE.Group(); prom.position.set(-13, -8, -190); scene.add(prom);
    {
      const plank = std({ color: '#b9a488', roughness: 0.9 }), iron = std({ color: '#2f6f6a', roughness: 0.5, metalness: 0.3 }), white = std({ color: '#f4f1e8' });
      const glow = std({ color: '#fff3c8', emissive: '#ffe9a0', emissiveIntensity: 1.6 });
      box(prom, plank, 14, 0.6, 160, 0, 0, 0);
      box(prom, std({ color: '#8d8d86', roughness: 1 }), 14.6, 2.4, 160.6, 0, -1.5, 0);      // the sea wall under it
      // railings on the seaward (road) side: posts and two rails
      const posts = new THREE.InstancedMesh(BOX, iron, 81), M = new THREE.Matrix4();
      for (let i = 0; i <= 80; i++) { M.makeScale(0.12, 1.2, 0.12).setPosition(6.7, 0.9, -80 + i * 2); posts.setMatrixAt(i, M); }
      prom.add(posts);
      box(prom, iron, 0.1, 0.1, 160, 6.7, 1.5, 0); box(prom, iron, 0.08, 0.08, 160, 6.7, 0.95, 0);
      // lamp posts with a string of bulbs between them
      for (let i = 0; i < 7; i++) {
        const z = -72 + i * 24;
        box(prom, iron, 0.22, 6.5, 0.22, -5.6, 3.5, z); box(prom, iron, 1.4, 0.14, 0.14, -5.0, 6.7, z);
        const globe = new THREE.Mesh(geo(new THREE.SphereGeometry(0.42, 12, 8)), glow); globe.position.set(-4.3, 6.4, z); prom.add(globe);
      }
      const bulbs = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.11, 6, 5)), glow, 6 * 14);
      let b = 0;
      for (let i = 0; i < 6; i++) for (let k = 0; k < 14; k++) { const t = (k + 0.5) / 14; M.makeTranslation(-5.6, 6.6 - Math.sin(t * Math.PI) * 1.1, -72 + (i + t) * 24); bulbs.setMatrixAt(b++, M); }
      prom.add(bulbs);
      // striped deckchairs facing the void
      const stripes = [std({ map: stripeTexture('#d8323c', '#f6f2e6') }), std({ map: stripeTexture('#2a62b8', '#f6f2e6') }), std({ map: stripeTexture('#e0a82a', '#f6f2e6') })];
      const wood = std({ color: '#a0703c' });
      for (let i = 0; i < 22; i++) {
        const ch = new THREE.Group(); ch.position.set(rng.range(1.5, 5.2), 0.3, -74 + i * 6.8 + rng.range(-1, 1)); ch.rotation.y = rng.range(-0.3, 0.3);
        const sling = box(ch, rng.pick(stripes), 0.02, 1.5, 0.75, -0.25, 0.6, 0); sling.rotation.z = -0.75;
        const l1 = box(ch, wood, 0.05, 1.7, 0.05, -0.25, 0.6, 0.4); l1.rotation.z = -0.75; const l2 = box(ch, wood, 0.05, 1.7, 0.05, -0.25, 0.6, -0.4); l2.rotation.z = -0.75;
        const l3 = box(ch, wood, 0.05, 1.2, 0.05, -0.3, 0.45, 0.42); l3.rotation.z = 0.6; const l4 = box(ch, wood, 0.05, 1.2, 0.05, -0.3, 0.45, -0.42); l4.rotation.z = 0.6;
        prom.add(ch);
      }
      // the pier: out to the left on legs, with a little pavilion at its head
      box(prom, plank, 70, 0.5, 7, -42, 0, 20);
      const legs = new THREE.InstancedMesh(BOX, iron, 28);
      for (let i = 0; i < 14; i++) for (let s = 0; s < 2; s++) { M.makeScale(0.3, 9, 0.3).setPosition(-10 - i * 5, -4.6, 20 + (s ? 3 : -3)); legs.setMatrixAt(i * 2 + s, M); }
      prom.add(legs);
      box(prom, white, 12, 5, 9, -72, 2.7, 20);
      const roof = new THREE.Mesh(geo(new THREE.ConeGeometry(8.5, 4, 4)), std({ color: '#c8323c' })); roof.position.set(-72, 7.2, 20); roof.rotation.y = Math.PI / 4; prom.add(roof);
      // a beach hut row
      const hutCols = ['#f2c8d8', '#bfe0f2', '#f6e8a8', '#c8ecd0'];
      for (let i = 0; i < 9; i++) { const z = -70 + i * 4.2; box(prom, std({ color: rng.pick(hutCols) }), 2.6, 2.6, 3.2, -3.2 + 6.2 * 0, 1.6, z + 100 > 0 ? z - 0 : z).position.x = -2.6; }
    }
    wob(prom, 0.05);
    await ctx.yield();

    // ---- station 2: two hundred penguins, weightless (z -330 to -540)
    const NP = 200, peng = [];
    const bodyGeo = geo(THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.34, 0.5, 4, 10) : new THREE.SphereGeometry(0.5, 10, 8));
    const pBody = new THREE.InstancedMesh(bodyGeo, std({ color: '#15171c', roughness: 0.5 }), NP);
    const pBelly = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.3, 10, 8)), std({ color: '#f7f5ee', roughness: 0.6 }), NP);
    const pBeak = new THREE.InstancedMesh(geo(new THREE.ConeGeometry(0.07, 0.24, 6)), std({ color: '#f08a1c', roughness: 0.5 }), NP);
    const pWing = new THREE.InstancedMesh(BOX, std({ color: '#15171c', roughness: 0.5 }), NP * 2);
    for (let i = 0; i < NP; i++) {
      const r = rng.range(8, 42), a = rng() * 6.283;
      peng.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8, z: rng.range(-330, -540), s: rng.range(1.2, 2.6),
        ax: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), w: rng.range(0.15, 0.7), ph: rng() * 6.28, f: rng.range(0.8, 2), dr: rng.range(-0.6, 0.6) });
    }
    scene.add(pBody, pBelly, pBeak, pWing);
    for (const m of [pBody, pBelly, pBeak, pWing]) m.frustumCulled = false;
    await ctx.yield();

    // ---- station 3: a flowered sofa and a standard lamp (z about -610)
    const sofa = new THREE.Group(); sofa.position.set(10, -2.5, -615); sofa.rotation.set(0.2, -0.7, 0.15); scene.add(sofa);
    {
      const chintz = std({ map: flowerTexture(rng), roughness: 0.95 }), leg = std({ color: '#4a2f1c' });
      box(sofa, chintz, 5.2, 0.9, 2.2, 0, 0.75, 0); box(sofa, chintz, 5.2, 1.7, 0.6, 0, 1.75, -0.9);
      box(sofa, chintz, 0.7, 1.4, 2.2, -2.6, 1.2, 0); box(sofa, chintz, 0.7, 1.4, 2.2, 2.6, 1.2, 0);
      for (let i = 0; i < 3; i++) box(sofa, chintz, 1.5, 0.35, 1.6, -1.6 + i * 1.6, 1.35, 0.15);
      for (const [x, z] of [[-2.5, 0.9], [2.5, 0.9], [-2.5, -0.9], [2.5, -0.9]]) box(sofa, leg, 0.2, 0.4, 0.2, x, 0.15, z);
      const cush = new THREE.Mesh(geo(new THREE.SphereGeometry(0.55, 10, 8)), std({ color: '#c8324a' })); cush.scale.set(1, 0.6, 1); cush.position.set(-1.9, 1.75, 0.1); sofa.add(cush);
    }
    sofa.scale.setScalar(1.7); wob(sofa, 0.14, 0.11);
    const lamp = new THREE.Group(); lamp.position.set(-9.5, -5, -640); lamp.rotation.set(-0.15, 0, 0.25); scene.add(lamp);
    {
      const brass = std({ color: '#b08a3a', metalness: 0.7, roughness: 0.35 });
      const base = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.7, 0.8, 0.15, 16)), brass); lamp.add(base);
      const pole = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.06, 0.06, 5, 8)), brass); pole.position.y = 2.5; lamp.add(pole);
      const shade = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.55, 1.1, 1.2, 20, 1, true)), std({ color: '#ffe2a8', emissive: '#ffcf80', emissiveIntensity: 1.3, side: THREE.DoubleSide })); shade.position.y = 5.2; lamp.add(shade);
      const tass = new THREE.InstancedMesh(BOX, std({ color: '#c8324a' }), 20), M = new THREE.Matrix4();
      for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; M.makeScale(0.05, 0.28, 0.05).setPosition(Math.cos(a) * 1.1, 4.5, Math.sin(a) * 1.1); tass.setMatrixAt(i, M); }
      lamp.add(tass);
      const pl = new THREE.PointLight(0xffd090, 60, 40, 2); pl.position.y = 5; lamp.add(pl);
    }
    lamp.scale.setScalar(1.6); wob(lamp, 0.14, -0.08);
    await ctx.yield();

    // ---- station 4: a rain of three hundred fried eggs (z -690 to -870)
    const NE = 300, eggs = [];
    const eWhite = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.9, 1.0, 0.08, 14)), std({ color: '#fbf8ee', roughness: 0.35 }), NE);
    const eYolk = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(0.36, 12, 8)), std({ color: '#f4b21a', roughness: 0.25, emissive: '#7a4a00', emissiveIntensity: 0.35 }), NE);
    for (let i = 0; i < NE; i++) {
      let x = rng.range(-48, 48); if (Math.abs(x) < 8) x = 8 * Math.sign(x || 1) + x;
      eggs.push({ x, z: rng.range(-690, -870), y0: rng.range(0, 110), v: rng.range(5, 12), s: rng.range(0.8, 1.9), tilt: rng.range(-0.5, 0.5), w: rng.range(-1.2, 1.2), ph: rng() * 6.28, f: rng.range(0.8, 2) });
    }
    eWhite.frustumCulled = eYolk.frustumCulled = false; scene.add(eWhite, eYolk);
    await ctx.yield();

    // ---- station 5: doors that open on nothing (z -900 to -985)
    const doors = [];
    {
      const frameM = std({ color: '#f1ede2' }), cols = ['#c8323c', '#2a62b8', '#2f7a4a', '#e0a82a', '#6a3f8a', '#1c1c22', '#e87a9a', '#3aa0a0'], knob = std({ color: '#d8b04a', metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1, g = new THREE.Group();
        g.position.set(side * rng.range(9, 20), rng.range(-9, 5), -900 - i * 12 + rng.range(-3, 3)); g.rotation.set(rng.range(-0.2, 0.2), -side * rng.range(0.2, 0.7), rng.range(-0.25, 0.25));
        box(g, frameM, 0.3, 6.6, 0.4, -1.75, 3.3, 0); box(g, frameM, 0.3, 6.6, 0.4, 1.75, 3.3, 0); box(g, frameM, 3.8, 0.3, 0.4, 0, 6.75, 0); box(g, frameM, 3.8, 0.12, 0.6, 0, 0.06, 0);
        const hinge = new THREE.Group(); hinge.position.set(-1.6, 0, 0); g.add(hinge);
        const leafM = std({ color: cols[i] });
        box(hinge, leafM, 3.2, 6.4, 0.14, 1.6, 3.3, 0);
        box(hinge, leafM, 2.4, 2.2, 0.2, 1.6, 4.8, 0); box(hinge, leafM, 2.4, 2.2, 0.2, 1.6, 1.8, 0);
        const k = new THREE.Mesh(geo(new THREE.SphereGeometry(0.14, 8, 6)), knob); k.position.set(2.9, 3.2, 0.18); hinge.add(k);
        g.scale.setScalar(rng.range(1.3, 2.1)); scene.add(g); wob(g, 0.1);
        doors.push({ hinge, ph: rng() * 6.28, f: rng.range(0.4, 0.9), max: rng.range(1.2, 2.0) });
      }
    }
    await ctx.yield();

    // ---- station 6: the odds against, counting down to one to one (z -1010 to -1215)
    const ODDS = ['276709:1', '100000:1', '25967:1', '4096:1', '8:1', '2:1', '1:1'];
    const digitMats = [];
    ODDS.forEach((str, n) => {
      const H = n === ODDS.length - 1 ? 9 : 6, W = H * 0.5, T = H * 0.1, GAP = W * 1.45;
      let strokes = 0; for (const ch of str) strokes += ch === ':' ? 2 : SEG[ch].length;
      const calm = n === ODDS.length - 1;
      const mat = std({ color: calm ? '#ffffff' : '#fff0c0', emissive: calm ? '#ffffff' : new THREE.Color().setHSL(n / 7, 0.8, 0.55), emissiveIntensity: 1.5, roughness: 0.4 });
      digitMats.push({ mat, calm, ph: rng() * 6.28 });
      const im = new THREE.InstancedMesh(BOX, mat, strokes), M = new THREE.Matrix4();
      let k = 0, x = -(str.length - 1) * GAP / 2;
      for (const ch of str) {
        if (ch === ':') { for (const dy of [-0.45, 0.45]) { M.makeScale(T * 1.2, T * 1.2, T).setPosition(x, dy * H * 0.5, 0); im.setMatrixAt(k++, M); } }
        else for (const s of SEG[ch]) { const [sx, sy, hz] = SEG_AT[s]; M.makeScale(hz ? W - T * 0.4 : T, hz ? T : H * 0.5 - T * 0.4, T).setPosition(x + sx * W, sy * H * 0.5, 0); im.setMatrixAt(k++, M); }
        x += GAP;
      }
      const g = new THREE.Group(); g.add(im);
      // reads left to right for an eye looking down -Z; set to one side and above the road, the last dead ahead over the corridor's mouth
      if (calm) g.position.set(0, 17, -1240); else { const side = n % 2 ? 1 : -1; g.position.set(side * rng.range(16, 24), rng.range(8, 16), -1010 - n * 34); g.rotation.set(0, -side * 0.35, side * rng.range(-0.12, 0.12)); }
      scene.add(g); if (!calm) wob(g, 0.16);
    });
    await ctx.yield();

    // ---- station 7: normality, a plain white ship's corridor (z -1245 to -1420); inner width 14, floor 6.5 under the road
    {
      const hull = std({ color: '#f3f4f6', roughness: 0.45 }), trim = std({ color: '#c9ced6', roughness: 0.4, metalness: 0.3 }), strip = std({ color: '#ffffff', emissive: '#eaf4ff', emissiveIntensity: 1.2 });
      const cor = new THREE.Group(); cor.position.set(0, 0, -1332); scene.add(cor);
      const L = 176;
      box(cor, hull, 15, 0.5, L, 0, -6.75, 0); box(cor, hull, 15, 0.5, L, 0, 7.75, 0);
      box(cor, hull, 0.5, 15, L, -7.25, 0.5, 0); box(cor, hull, 0.5, 15, L, 7.25, 0.5, 0);
      box(cor, strip, 0.5, 0.1, L, -4.5, 7.45, 0); box(cor, strip, 0.5, 0.1, L, 4.5, 7.45, 0);
      box(cor, trim, 0.1, 0.5, L, -6.95, -2.5, 0); box(cor, trim, 0.1, 0.5, L, 6.95, -2.5, 0);
      const ribs = new THREE.InstancedMesh(BOX, trim, 15 * 3), M = new THREE.Matrix4();
      for (let i = 0; i < 15; i++) { const z = -L / 2 + 2 + i * 12;
        M.makeScale(0.35, 14, 0.8).setPosition(-6.85, 0.5, z); ribs.setMatrixAt(i * 3, M);
        M.makeScale(0.35, 14, 0.8).setPosition(6.85, 0.5, z); ribs.setMatrixAt(i * 3 + 1, M);
        M.makeScale(14, 0.35, 0.8).setPosition(0, 7.35, z); ribs.setMatrixAt(i * 3 + 2, M); }
      cor.add(ribs);
      // a few doors along it, all properly shut, and one cup of something almost entirely unlike tea on a ledge
      for (let i = 0; i < 5; i++) { const z = -L / 2 + 20 + i * 30, s = i % 2 ? 1 : -1; box(cor, trim, 0.12, 7, 3.6, s * 6.95, -3, z); box(cor, strip, 0.14, 0.25, 1.2, s * 6.92, 1.0, z); }
      const cup = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.22, 0.16, 0.3, 12)), std({ color: '#ffffff' })); cup.position.set(-6.6, -2.1, 40); cor.add(cup);
      const pl = new THREE.PointLight(0xeaf4ff, 90, 120, 2); pl.position.set(0, 5, 20); cor.add(pl);
    }
    await ctx.yield();

    // ---- the clock
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler(), O = new THREE.Vector3();
    const X = new THREE.Vector3(1, 0, 0);
    function update(dt, time, camera, u = 0) {
      const wild = 1 - ss(0.85, 0.93, u);      // 1 while improbable, 0 once normality is restored
      tunU.uTime.value = time; tunU.uCalm.value = ss(0.8, 0.95, u);
      motes.rotation.z = time * 0.05; motes.material.opacity = 0.25 + 0.55 * wild;
      for (const w of wobblers) {
        const k = 1 + w.amp * wild * Math.sin(time * w.f * 2.2 + w.ph), k2 = 1 + w.amp * wild * Math.sin(time * w.f * 1.7 + w.ph + 2.1);
        w.obj.scale.set(w.base.x * k, w.base.y * k2, w.base.z * k);
        if (w.spin) w.obj.rotation.y += w.spin * dt * wild;
      }
      // penguins: a slow tumble, a drift round the road, and an unsure size
      for (let i = 0; i < NP; i++) {
        const p = peng[i], k = p.s * (1 + 0.18 * wild * Math.sin(time * p.f * 2 + p.ph));
        Q.setFromAxisAngle(p.ax, time * p.w + p.ph);
        const a = time * 0.03 * p.dr, cx = p.x * Math.cos(a) - p.y * Math.sin(a), cy = p.x * Math.sin(a) + p.y * Math.cos(a) + Math.sin(time * 0.4 + p.ph) * 0.8;
        P.set(cx, cy, p.z); S.setScalar(k); M.compose(P, Q, S); pBody.setMatrixAt(i, M);
        O.set(0, -0.05, 0.14).multiplyScalar(k).applyQuaternion(Q).add(P); S.set(k * 0.95, k * 1.25, k * 0.9); M.compose(O, Q, S); pBelly.setMatrixAt(i, M);
        Q2.setFromAxisAngle(X, Math.PI / 2).premultiply(Q); O.set(0, 0.42, 0.34).multiplyScalar(k).applyQuaternion(Q).add(P); S.setScalar(k); M.compose(O, Q2, S); pBeak.setMatrixAt(i, M);
        const flap = 0.35 + 0.3 * Math.sin(time * 3 * p.f + p.ph);
        for (let s = 0; s < 2; s++) { const sg = s ? 1 : -1; E.set(0, 0, sg * flap); Q2.setFromEuler(E).premultiply(Q);
          O.set(sg * 0.4, 0.05, 0).multiplyScalar(k).applyQuaternion(Q).add(P); S.set(k * 0.08, k * 0.62, k * 0.26); M.compose(O, Q2, S); pWing.setMatrixAt(i * 2 + s, M); }
      }
      pBody.instanceMatrix.needsUpdate = pBelly.instanceMatrix.needsUpdate = pBeak.instanceMatrix.needsUpdate = pWing.instanceMatrix.needsUpdate = true;
      // eggs: falling sunny side up, round and round the tunnel's height
      for (let i = 0; i < NE; i++) {
        const e = eggs[i], y = 55 - ((e.y0 + time * e.v) % 110), k = e.s * (1 + 0.2 * wild * Math.sin(time * e.f * 2 + e.ph));
        E.set(e.tilt + Math.sin(time * 0.9 + e.ph) * 0.25, time * e.w, e.tilt * 0.6); Q.setFromEuler(E);
        P.set(e.x, y, e.z); S.setScalar(k); M.compose(P, Q, S); eWhite.setMatrixAt(i, M);
        O.set(0.15, 0.1, 0.1).multiplyScalar(k).applyQuaternion(Q).add(P); S.set(k, k * 0.6, k); M.compose(O, Q, S); eYolk.setMatrixAt(i, M);
      }
      eWhite.instanceMatrix.needsUpdate = eYolk.instanceMatrix.needsUpdate = true;
      // doors swing open and shut on nothing
      for (const d of doors) d.hinge.rotation.y = -d.max * (0.5 + 0.5 * Math.sin(time * d.f + d.ph));
      // the numerals flicker until the last, which is steady
      for (const d of digitMats) d.mat.emissiveIntensity = d.calm ? 1.2 : 1.2 + 0.6 * Math.sin(time * 7 + d.ph) * wild;
    }
    update(0, 0, null, 0);

    return {
      scene, path, duration: DUR,
      camera: { fov: 62, near: 0.3, far: 6000, lookAhead: 30, sway: 0.4, bank: 0.15 },
      pois: [],
      portal: { shape: 'rect', width: 8, height: 11, color: '#ffffff', glow: 0.4 },
      post: { exposure: 1.05, bloom: { strength: 0.5, radius: 0.8, threshold: 0.9 }, grade: { saturation: 1.15, contrast: 1.03, vignette: 0.25, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() { for (const d of disposables) d.dispose?.(); },
    };
  },
};
