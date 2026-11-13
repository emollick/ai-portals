// INFINITE IMPROBABILITY. A straight transit down a tunnel of soft pastel light while the ship's drive is on, and the scenery
// keeps being things it has no business being. In order down the road:
//   1 an English seafront (promenade, huts, bunting, a pier with a helter-skelter and a big wheel, gulls, a sea that slopes off into the tunnel)
//   2 two hundred weightless penguins, and forty-two towels
//   3 somebody's sitting room (flowered sofa, standard lamp, rug, television, three plaster ducks on the wall)
//   4 a rain of teacups and saucers, with ribbons of spilt tea, sugar and spoons, and one very large teapot
//   5 a hillside field of doors that open on other skies
//   6 a yellow rubber-duck planet with a ring of bathwater and bubbles, and duckling moons
//   7 melting clocks, and two elephants on legs like stilts
//   8 a staircase with five heads
//   9 far off, a sperm whale and a bowl of petunias, falling
//  10 the ship: its door sighs open, and inside is a plain white corridor, at odds of one to one
// The odds against are shown on lit displays along the way, counting down from two to the power of 276,709 to one.
// Everything wobbles in size (it is not sure of itself) until normality is restored at about 0.86 of the flight.
import * as THREE from 'three';
import { makePath } from '../kit/core.js';

const DUR = 50, LEN = 2160, TUNNEL_R = 140, MOUTH_Z = -1960;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const TAU = Math.PI * 2;

// seven segments: a top, b top right, c bottom right, d bottom, e bottom left, f top left, g middle
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', ' ': '' };
const SEG_AT = { a: [0, 1, 1], b: [0.5, 0.5, 0], c: [0.5, -0.5, 0], d: [0, -1, 1], e: [-0.5, -0.5, 0], f: [-0.5, 0.5, 0], g: [0, 0, 1] };   // x (in widths), y (in half heights), lies level?
const SEG_ORDER = 'abcdefg';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

// many copies of one shape in one draw: add() takes size, place, colour and Euler turn; addQ() takes a quaternion
function batch(geometry, material) {
  const mats = [], cols = [];
  const api = {
    add(sx, sy, sz, x, y, z, col = '#ffffff', rx = 0, ry = 0, rz = 0) { _q.setFromEuler(_e.set(rx, ry, rz)); mats.push(new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz))); cols.push(col); return api; },
    addQ(sx, sy, sz, pos, quat, col = '#ffffff') { mats.push(new THREE.Matrix4().compose(pos, quat, _s.set(sx, sy, sz))); cols.push(col); return api; },
    build(parent) {
      if (!mats.length) return null;
      const im = new THREE.InstancedMesh(geometry, material, mats.length);
      for (let i = 0; i < mats.length; i++) { im.setMatrixAt(i, mats[i]); const c = cols[i]; if (Array.isArray(c)) _c.setRGB(c[0], c[1], c[2]); else _c.set(c); im.setColorAt(i, _c); }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere?.(); parent.add(im); return im;
    },
  };
  return api;
}

// ---------- drawn textures ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const stripeTexture = (a, b) => canvasTex(64, 8, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 8, 0, 8, 8); } });
const spiralTexture = () => canvasTex(128, 128, (g) => { g.fillStyle = '#f6f2e6'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#d8323c'; g.lineWidth = 22; for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(i * 64 - 20, 148); g.lineTo(i * 64 + 148, -20); g.stroke(); } }, [3, 2]);
const flowerTexture = (rng, base = '#e9dcc0', rep) => canvasTex(256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  const cols = ['#c8324a', '#d9628a', '#7a4fa0', '#e0a030', '#b02a60'];
  for (let i = 0; i < 46; i++) {
    const x = rng() * 256, y = rng() * 256, r = 7 + rng() * 9; g.fillStyle = '#4f7a3a';
    g.beginPath(); g.ellipse(x + r, y + r * 0.8, r * 0.9, r * 0.35, 0.6, 0, 6.3); g.fill();
    g.fillStyle = rng.pick(cols);
    for (let p = 0; p < 5; p++) { const a = p * 1.2566 + i; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, 0, 6.3); g.fill(); }
    g.fillStyle = '#f6e27a'; g.beginPath(); g.arc(x, y, r * 0.3, 0, 6.3); g.fill();
  }
}, rep);
const rugTexture = () => canvasTex(256, 176, (g, w, h) => {
  g.fillStyle = '#8c2a2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8d8a8'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
  g.lineWidth = 2; g.strokeStyle = '#2a3a6a'; g.strokeRect(22, 22, w - 44, h - 44);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const x = 48 + i * 40, y = 44 + j * 44; g.fillStyle = (i + j) % 2 ? '#e8d8a8' : '#2a3a6a';
    g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x + 14, y); g.lineTo(x, y + 16); g.lineTo(x - 14, y); g.closePath(); g.fill(); g.fillStyle = '#d8a030'; g.fillRect(x - 3, y - 3, 6, 6); }
});
const textTexture = (lines, w, h, fg, bg, px, font = 'bold') => canvasTex(w, h, (g) => {
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } else g.clearRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${font} ${px}px Helvetica, Arial, sans-serif`;
  lines.forEach((s, i) => g.fillText(s, w / 2, h * (i + 0.5) / lines.length + 2));
});
const clockTexture = (hour, minute) => canvasTex(256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = '#c89a2e'; g.beginPath(); g.arc(128, 128, 126, 0, 6.3); g.fill();
  g.fillStyle = '#f3ead0'; g.beginPath(); g.arc(128, 128, 112, 0, 6.3); g.fill();
  g.fillStyle = '#2a2018'; g.font = 'bold 26px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let n = 1; n <= 12; n++) { const a = n / 12 * TAU - Math.PI / 2; g.fillText(String(n), 128 + Math.cos(a) * 90, 130 + Math.sin(a) * 90); }
  g.strokeStyle = '#2a2018'; g.lineCap = 'round';
  const hand = (a, len, wd) => { g.lineWidth = wd; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a - Math.PI / 2) * len, 128 + Math.sin(a - Math.PI / 2) * len); g.stroke(); };
  hand(hour / 12 * TAU, 52, 9); hand(minute / 60 * TAU, 80, 6);
  g.fillStyle = '#c89a2e'; g.beginPath(); g.arc(128, 128, 9, 0, 6.3); g.fill();
});

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
    scene.fog = new THREE.Fog(new THREE.Color('#ecd9ee'), 320, 1750);
    const path = makePath([[0, 0, 0], [0, 0, -360], [0, 0, -720], [0, 0, -1080], [0, 0, -1440], [0, 0, -1800], [0, 0, -2000], [0, 0, -LEN]]);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf0c8e0, Math.PI * 0.8));
    const sun = new THREE.DirectionalLight(0xfff4e0, Math.PI * 0.85); sun.position.set(300, 500, 200); scene.add(sun, sun.target);

    const disposables = [];
    const keep = (x) => { disposables.push(x); return x; };
    const std = (o) => keep(new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, ...o }));
    const BOX = keep(new THREE.BoxGeometry(1, 1, 1)), CYL = keep(new THREE.CylinderGeometry(0.5, 0.5, 1, 14)), SPH = keep(new THREE.SphereGeometry(0.5, 16, 12));
    const SPH_HI = keep(new THREE.SphereGeometry(0.5, 40, 28)), CONE = keep(new THREE.ConeGeometry(0.5, 1, 14)), CIRCLE = keep(new THREE.CircleGeometry(0.5, 20));
    const PYR = keep(new THREE.ConeGeometry(0.7071, 1, 4)); PYR.rotateY(Math.PI / 4);
    const TRI = keep(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, 0.5, 0), new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0.5, 0.5, 0)])); TRI.computeVertexNormals();
    const WHITE = std({ color: '#ffffff' }), SHINY = std({ color: '#ffffff', roughness: 0.3 }), FLAT2 = std({ color: '#ffffff', side: THREE.DoubleSide });
    const GLOW = keep(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    const mesh = (parent, geometry, material, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geometry, material); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
    const wobblers = [];
    const wob = (obj, amp = 0.12, spin = 0) => { wobblers.push({ obj, f: rng.range(0.7, 1.9), ph: rng() * 6.28, amp, spin, base: obj.scale.clone() }); return obj; };
    const dyn = (im) => { im.frustumCulled = false; return im; };
    const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
    const QX90 = new THREE.Quaternion().setFromAxisAngle(X, Math.PI / 2), QXm90 = new THREE.Quaternion().setFromAxisAngle(X, -Math.PI / 2);
    const BUNT = ['#e23a4a', '#f4c430', '#2a8ad8', '#3ab878', '#f08ac0', '#ffffff'];

    // =====================================================================================================================
    // THE TUNNEL: a back-side cylinder with drifting bands whose four colours are the station's own; motes streaming past
    // =====================================================================================================================
    const PAL = [
      [0.00, ['#bfe3ff', '#fff3d6', '#ffd0e0', '#c8f4e0'], 0.0],      // seaside
      [0.12, ['#bfe3ff', '#fff3d6', '#ffd0e0', '#c8f4e0'], 0.0],
      [0.21, ['#cfeaff', '#ffffff', '#dccbff', '#b8f0f0'], 1.2],      // penguins: ice
      [0.30, ['#ffd9b8', '#ffc4cc', '#cfe6b8', '#fff0d0'], 2.1],      // the sitting room
      [0.37, ['#fff4a8', '#ffc8e0', '#fff8e8', '#dcc8ff'], 3.0],      // tea
      [0.47, ['#d4c0ff', '#a8e8e0', '#ffb8a8', '#fff4dc'], 4.2],      // doors
      [0.555, ['#ffe870', '#a8dcff', '#ffcf8a', '#ffffff'], 5.0],     // the duck
      [0.62, ['#f0d8a0', '#e0b070', '#a8d0f0', '#f0b8b0'], 6.3],      // clocks
      [0.70, ['#c0f0d8', '#d8c8f8', '#ffc8dc', '#e4e8f0'], 7.1],      // stairs
      [0.80, ['#c8dcff', '#f0e0ff', '#ffe8d0', '#d8f4f0'], 8.0],      // the long fall
      [0.90, ['#b4c0d4', '#ccd4e2', '#bcc8dc', '#d6dce8'], 8.0],      // normality
      [1.01, ['#b4c0d4', '#ccd4e2', '#bcc8dc', '#d6dce8'], 8.0],
    ].map(([u, c, st]) => ({ u, c: c.map((h) => new THREE.Color(h)), st }));
    const tunU = { uTime: { value: 0 }, uCalm: { value: 0 }, uStyle: { value: 0 }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uC3: { value: new THREE.Color() }, uC4: { value: new THREE.Color() } };
    const tunGeo = keep(new THREE.CylinderGeometry(TUNNEL_R, TUNNEL_R, 2800, 56, 80, true)); tunGeo.rotateX(Math.PI / 2);
    const tunMat = keep(new THREE.ShaderMaterial({
      side: THREE.BackSide, fog: false, uniforms: tunU,
      vertexShader: /* glsl */`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uCalm, uStyle; uniform vec3 uC1, uC2, uC3, uC4; varying vec3 vP;
        void main(){
          float z = vP.z * 0.01, a = atan(vP.y, vP.x), t = uTime;
          float f1 = 5.0 + 2.0 * sin(uStyle), swirl = 1.2 + 0.7 * cos(uStyle * 1.3);
          float s1 = sin(z * f1 + t * 1.3 + sin(a * 3.0 + t * 0.4) * swirl);
          float s2 = sin(a * 5.0 - z * 2.0 + t * 0.7);
          vec3 col = mix(uC1, uC2, s1 * 0.5 + 0.5);
          col = mix(col, mix(uC3, uC4, s2 * 0.5 + 0.5), 0.5 + 0.5 * sin(z * 1.7 - t * 0.5 + a));
          float ring = smoothstep(0.93, 1.0, sin(z * 14.0 + t * 3.0));
          col += ring * 0.08 * (1.0 - uCalm);
          gl_FragColor = vec4(col * 0.72, 1.0);
        }`,
    }));
    mesh(scene, tunGeo, tunMat, 1, 1, 1, 0, 0, -1050);
    const motes = (() => {
      const N = 6000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const r = rng.range(9, TUNNEL_R - 6), a = rng() * TAU;
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r; pos[i * 3 + 2] = rng.range(80, -1930);
        c.setHSL(rng(), 0.7, 0.75); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const p = new THREE.Points(g, keep(new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
      p.frustumCulled = false; scene.add(p); return p;
    })();
    await ctx.yield();

    // =====================================================================================================================
    // THE ODDS: a lit display, "2 to the power of n : 1", n counting down; several stand along the way and one over the ship's door
    // =====================================================================================================================
    const displays = [];
    const labelTex = keep(textTexture(['IMPROBABILITY  FACTOR'], 512, 48, '#ffd890', '#17140f', 30));
    const againstTex = keep(textTexture(['TO  ONE  AGAINST'], 512, 48, '#ffd890', '#17140f', 30));
    const labelMat = keep(new THREE.MeshBasicMaterial({ map: labelTex })), againstMat = keep(new THREE.MeshBasicMaterial({ map: againstTex }));
    function makeOdds(x, y, z, scale, ry = 0, rz = 0) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0, ry, rz); g.scale.setScalar(scale); scene.add(g);
      const bx = batch(BOX, WHITE), sp = batch(SPH, GLOW);
      bx.add(31, 12, 0.8, 0, 0, -0.5, '#1b1916').add(32.4, 0.7, 1.4, 0, 6.2, -0.4, '#c9ced6').add(32.4, 0.7, 1.4, 0, -6.2, -0.4, '#c9ced6').add(0.7, 13, 1.4, -15.9, 0, -0.4, '#c9ced6').add(0.7, 13, 1.4, 15.9, 0, -0.4, '#c9ced6');
      for (let i = 0; i < 14; i++) sp.add(0.28, 0.28, 0.28, -13 + i * 2, -5.2, 0, i % 3 ? [0.2, 1.4, 0.5] : [1.6, 0.4, 0.3]);
      bx.build(g); sp.build(g);
      mesh(g, BOX, labelMat, 16, 1.3, 0.05, -6.2, 4.8, -0.05); mesh(g, BOX, againstMat, 12, 1.1, 0.05, 8, -3.9, -0.05);
      // slots: [x, y, height]; 0 the base, 1..6 the power, 7 the last "1"
      const slots = [[-12, -0.6, 5.6]]; for (let i = 0; i < 6; i++) slots.push([-8.3 + i * 2.35, 1.3, 3.2]); slots.push([11.6, -0.2, 5.6]);
      const im = new THREE.InstancedMesh(BOX, GLOW, slots.length * 7 + 2), M = new THREE.Matrix4();
      slots.forEach(([sx, sy, H], s) => { const W = H * 0.5, T = H * 0.1;
        for (let k = 0; k < 7; k++) { const [ax, ay, level] = SEG_AT[SEG_ORDER[k]]; M.makeScale(level ? W - T * 0.5 : T, level ? T : H * 0.5 - T * 0.5, 0.2).setPosition(sx + ax * W, sy + ay * H * 0.5, 0); im.setMatrixAt(s * 7 + k, M); } });
      for (let d = 0; d < 2; d++) { M.makeScale(0.6, 0.6, 0.2).setPosition(7.6, -0.2 + (d ? 1.3 : -1.3), 0); im.setMatrixAt(slots.length * 7 + d, M); }
      im.instanceMatrix.needsUpdate = true; g.add(im);
      const d = { g, im, last: -1 }; displays.push(d); return d;
    }
    const ON = new THREE.Color().setRGB(2.4, 1.3, 0.25), OFF = new THREE.Color().setRGB(0.07, 0.04, 0.015), CALM = new THREE.Color().setRGB(0.9, 2.0, 1.3);
    function setOdds(n) {
      for (const d of displays) {
        if (d.last === n) continue; d.last = n;
        const str = n > 0 ? '2' + String(n).padStart(6, ' ') + '1' : '1      1', on = n > 0 ? ON : CALM;
        for (let s = 0; s < 8; s++) { const lit = SEG[str[s]]; for (let k = 0; k < 7; k++) d.im.setColorAt(s * 7 + k, lit.includes(SEG_ORDER[k]) ? on : OFF); }
        d.im.setColorAt(56, on); d.im.setColorAt(57, on); d.im.instanceColor.needsUpdate = true;
      }
    }
    wob(makeOdds(24, 15, -70, 0.9, -0.5, 0.06).g, 0.06); wob(makeOdds(-27, 19, -610, 1, 0.5, -0.08).g, 0.08);
    wob(makeOdds(30, 22, -1120, 1, -0.5, 0.1).g, 0.08); wob(makeOdds(-30, -22, -1590, 1.1, 0.5, 0.2).g, 0.08);
    makeOdds(0, 15, MOUTH_Z + 0.6, 1.2);
    await ctx.yield();

    // =====================================================================================================================
    // 1. THE SEAFRONT (z -100 to -330). Promenade and huts to the left and below, the beach under the road, the sea to the right
    // =====================================================================================================================
    const sea = new THREE.Group(); sea.position.set(0, 0, -215); scene.add(sea);
    const STRIPES = [std({ map: keep(stripeTexture('#d8323c', '#f6f2e6')) }), std({ map: keep(stripeTexture('#2a62b8', '#f6f2e6')) }), std({ map: keep(stripeTexture('#e0a82a', '#f6f2e6')) })];
    let wheel, gondolas; const PZ = -15, WHEEL_AT = [38, 5, PZ - 12];
    {
      const bx = batch(BOX, WHITE), cy = batch(CYL, WHITE), sp = batch(SPH, WHITE), gl = batch(SPH, GLOW), glb = batch(BOX, GLOW), co = batch(CONE, WHITE), py = batch(PYR, WHITE), tri = batch(TRI, FLAT2);
      const slings = STRIPES.map((m) => batch(BOX, m));
      const IRON = '#2f6f6a', PLANK = '#b9a488', WOOD = '#a0703c', LAMP = [2.2, 1.9, 1.2], BULB = [1.9, 1.5, 0.8];
      // the promenade, its sea wall and back wall
      bx.add(14, 0.6, 230, -14, -7.3, 0, PLANK).add(1, 4, 230, -7.3, -9.2, 0, '#a3a39a').add(0.6, 3.4, 230, -21.3, -5.6, 0, '#ddd6c2');
      for (let i = 0; i < 46; i++) bx.add(14, 0.02, 0.08, -14, -6.99, -113 + i * 5, '#9a876c');
      for (let z = -114; z <= 114; z += 2.5) bx.add(0.12, 1.2, 0.12, -7.5, -6.4, z, IRON);
      bx.add(0.1, 0.1, 230, -7.5, -5.8, 0, IRON).add(0.08, 0.08, 230, -7.5, -6.35, 0, IRON);
      // lamp posts, a string of bulbs and a line of bunting between each pair
      for (let i = 0; i < 10; i++) {
        const z = -104 + i * 23;
        cy.add(0.22, 6, 0.22, -9, -4, z, IRON).add(0.5, 0.4, 0.5, -9, -6.8, z, IRON); bx.add(1.2, 0.12, 0.12, -8.5, -1.2, z, IRON);
        gl.add(0.8, 0.8, 0.8, -8.0, -1.6, z, LAMP);
        if (i < 9) for (let k = 0; k < 18; k++) { const t = (k + 0.5) / 18, sag = Math.sin(t * Math.PI);
          gl.add(0.2, 0.2, 0.2, -9, -1.1 - sag, z + t * 23, BULB);
          tri.add(0.6, 0.75, 1, -9.05, -2.3 - sag * 0.9, z + t * 23, BUNT[k % 6], 0, Math.PI / 2, 0); }
        // bunting across to the huts
        for (let k = 0; k < 12; k++) { const t = (k + 0.5) / 12; tri.add(0.6, 0.75, 1, -9 - t * 10, -1.6 - t * 1.2 - Math.sin(t * Math.PI) * 0.8, z, BUNT[(k + i) % 6]); }
      }
      // beach huts with pitched roofs, gable ends to the sea
      const HUT = ['#f2c8d8', '#bfe0f2', '#f6e8a8', '#c8ecd0', '#f4b89a', '#d8c8f0'];
      for (let i = 0; i < 30; i++) {
        const z = -108 + i * 7.3, c = HUT[i % 6], d = BUNT[(i * 3 + 1) % 5];
        bx.add(3.4, 3, 3.2, -19.2, -5.5, z, c);
        bx.add(3.9, 0.14, 2.3, -19.2, -3.28, z + 0.85, d, 0.65, 0, 0).add(3.9, 0.14, 2.3, -19.2, -3.28, z - 0.85, d, -0.65, 0, 0);
        tri.add(3.2, -1.3, 1, -17.48, -3.35, z, c, 0, Math.PI / 2, 0);
        bx.add(0.08, 2.1, 1.1, -17.46, -5.95, z, d).add(0.5, 0.12, 3.2, -17.2, -6.95, z, PLANK);
        sp.add(0.14, 0.14, 0.14, -17.4, -5.9, z + 0.35, '#d8b04a');
      }
      // deckchairs facing the sea
      for (let i = 0; i < 30; i++) {
        const x = -15.5 + rng.range(0, 5), z = -108 + i * 7.4 + rng.range(-1.5, 1.5), y = -7;
        slings[i % 3].add(0.03, 1.5, 0.75, x, y + 0.65, z, '#ffffff', 0, 0, 0.75);
        for (const s of [-0.4, 0.4]) bx.add(0.05, 1.7, 0.05, x, y + 0.65, z + s, WOOD, 0, 0, 0.75).add(0.05, 1.2, 0.05, x - 0.35, y + 0.45, z + s * 1.05, WOOD, 0, 0, -0.6);
      }
      // the ice-cream kiosk, with a cornet on its roof
      bx.add(3, 2.8, 3, -11.5, -5.6, 70, '#fbf6ea').add(3.3, 0.2, 3.3, -11.5, -4.1, 70, '#e23a4a').add(0.1, 1.1, 2.2, -9.95, -5.2, 70, '#3a4a5a');
      for (let k = 0; k < 6; k++) bx.add(1.4, 0.06, 0.5, -9.5, -4.5, 68.75 + k * 0.5, k % 2 ? '#e23a4a' : '#ffffff', 0, 0, -0.35);
      co.add(1.5, 2.8, 1.5, -11.5, -2.5, 70, '#e0b060', Math.PI, 0, 0); sp.add(1.9, 1.7, 1.9, -11.5, -0.7, 70, '#fff4e0').add(1.4, 1.2, 1.4, -11.5, 0.3, 70, '#f8b8cc');
      bx.add(0.25, 1.6, 0.25, -11.0, 0.5, 70.3, '#5a3a22', 0, 0, -0.4);
      // the beach: sand sloping to the water, with parasols, towels, castles and a ball
      bx.add(15, 0.5, 230, 0.2, -10.3, 0, '#cdb67c', 0, 0, -0.15);
      const sandY = (x) => -10.05 - 0.151 * (x - 0.2);
      for (let i = 0; i < 16; i++) { const x = rng.range(-6.2, -3.2), z = -105 + i * 14 + rng.range(-4, 4), ys = sandY(x), c = BUNT[i % 5];
        cy.add(0.08, 2.4, 0.08, x, ys + 1.2, z, '#ffffff'); co.add(3.2, 0.7, 3.2, x, ys + 2.5, z, c);
        bx.add(1, 0.04, 2, x + 1.4, ys + 0.05 - 0.2, z + 0.6, BUNT[(i + 2) % 5], 0, rng.range(-0.4, 0.4), -0.15); }
      for (let i = 0; i < 6; i++) { const x = rng.range(-3, 1), z = -90 + i * 36 + rng.range(-6, 6), ys = sandY(x), S = '#dcc88c';
        cy.add(1.6, 0.6, 1.6, x, ys + 0.3, z, S).add(0.5, 1.1, 0.5, x - 0.6, ys + 0.8, z - 0.6, S).add(0.5, 1.1, 0.5, x + 0.6, ys + 0.8, z + 0.6, S).add(0.7, 1.5, 0.7, x, ys + 1, z, S);
        co.add(0.6, 0.5, 0.6, x - 0.6, ys + 1.6, z - 0.6, S).add(0.6, 0.5, 0.6, x + 0.6, ys + 1.6, z + 0.6, S).add(0.8, 0.6, 0.8, x, ys + 2.05, z, S);
        cy.add(0.5, 0.55, 0.5, x + 1.6, ys + 0.3, z - 1, '#e23a4a'); sp.add(0.9, 0.9, 0.9, x - 1.8, ys + 0.45, z + 1.5, BUNT[i % 5]); }
      // the pier: out over the sea on iron legs, under the road
      bx.add(84, 0.5, 9, 35, -7.25, PZ, '#a89274');
      for (let x = -4; x <= 76; x += 6) for (const s of [-1, 1]) { cy.add(0.35, 14, 0.35, x, -14.4, PZ + s * 3.6, '#3a4a4a'); bx.add(0.14, 8.4, 0.14, x + 3, -12, PZ + s * 3.6, '#3a4a4a', 0, 0, s * 0.78); }
      for (let x = -6; x <= 52; x += 2.5) for (const s of [-1, 1]) bx.add(0.1, 1.1, 0.1, x, -6.45, PZ + s * 4.4, '#f4f1e8');
      for (const s of [-1, 1]) bx.add(60, 0.1, 0.1, 23, -5.9, PZ + s * 4.4, '#f4f1e8');
      for (let x = 12; x <= 50; x += 12.5) for (const s of [-1, 1]) { cy.add(0.16, 4.4, 0.16, x, -4.8, PZ + s * 4.4, IRON); gl.add(0.6, 0.6, 0.6, x, -2.4, PZ + s * 4.4, LAMP); }
      // the pier head, its pavilion and the helter-skelter
      bx.add(36, 0.5, 36, 70, -7.25, PZ, '#a89274').add(18, 0.5, 12, 38, -7.25, PZ - 10.5, '#a89274');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) cy.add(0.4, 14, 0.4, 56 + i * 9.3, -14.4, PZ - 14 + j * 9.3, '#3a4a4a');
      cy.add(14, 6, 14, 80, -4, PZ - 6, '#fbf6ea').add(15, 0.4, 15, 80, -1, PZ - 6, '#e86a8a').add(0.3, 3, 0.3, 80, 5, PZ - 6, '#d8b04a');
      sp.add(14.6, 9, 14.6, 80, -1, PZ - 6, '#e86a8a'); gl.add(0.9, 0.9, 0.9, 80, 6.6, PZ - 6, LAMP);
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; glb.add(0.2, 2.6, 1.5, 80 + Math.cos(a) * 7.02, -4, PZ - 6 + Math.sin(a) * 7.02, [1.6, 1.25, 0.65], 0, -a, 0); }
      const HX = 60, HZ = PZ + 8;
      mesh(sea, keep(new THREE.CylinderGeometry(2.4, 4.2, 20, 28, 1)), std({ map: keep(spiralTexture()) }), 1, 1, 1, HX, 3, HZ);
      for (let k = 0; k < 90; k++) { const t = k / 90, a = t * 5.5 * TAU, y = -6.4 + t * 17.4, r = 5.5 - t * 1.6;
        bx.add(1.7, 0.15, 1.5, HX + Math.cos(a) * r, y, HZ + Math.sin(a) * r, '#f4c430', 0, -a, 0).add(0.12, 0.6, 1.5, HX + Math.cos(a) * (r + 0.85), y + 0.3, HZ + Math.sin(a) * (r + 0.85), '#e23a4a', 0, -a, 0); }
      cy.add(5.6, 0.3, 5.6, HX, 13.2, HZ, '#f4f1e8').add(4, 2.6, 4, HX, 14.6, HZ, '#2a8ad8').add(0.1, 3, 0.1, HX, 20, HZ, '#ffffff'); co.add(5.8, 3, 5.8, HX, 17.4, HZ, '#e23a4a');
      tri.add(1.6, 1, 1, HX + 0.8, 21, HZ, '#f4c430', 0, 0, Math.PI / 2);
      // the big wheel's frame
      for (const s of [-1, 1]) for (const zz of [-1.3, 1.3]) bx.add(0.4, 13, 0.4, WHEEL_AT[0] + s * 2, -1, WHEEL_AT[2] + zz, '#f4f1e8', 0, 0, s * 0.32);
      cy.add(0.8, 3.2, 0.8, WHEEL_AT[0], WHEEL_AT[1], WHEEL_AT[2], '#e23a4a', Math.PI / 2, 0, 0);
      for (const b of [bx, cy, sp, gl, glb, co, py, tri, ...slings]) b.build(sea);
      // the wheel itself turns
      wheel = new THREE.Group(); wheel.position.set(...WHEEL_AT); sea.add(wheel);
      const rimG = keep(new THREE.TorusGeometry(11, 0.16, 6, 64)), wb = batch(BOX, WHITE), wg = batch(SPH, GLOW);
      for (const zz of [-0.9, 0.9]) { mesh(wheel, rimG, WHITE, 1, 1, 1, 0, 0, zz); for (let k = 0; k < 6; k++) wb.add(0.12, 22, 0.12, 0, 0, zz, '#f4f1e8', 0, 0, k * Math.PI / 6); }
      for (let k = 0; k < 36; k++) { const a = k / 36 * TAU; wg.add(0.35, 0.35, 0.35, Math.cos(a) * 11, Math.sin(a) * 11, 1.1, k % 2 ? [2, 1.5, 0.6] : [1.9, 0.6, 0.7]); }
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; wb.add(0.1, 0.1, 1.8, Math.cos(a) * 11, Math.sin(a) * 11, 0, '#3a4a4a'); }
      wb.build(wheel); wg.build(wheel);
      gondolas = dyn(new THREE.InstancedMesh(BOX, WHITE, 24)); for (let k = 0; k < 24; k++) gondolas.setColorAt(k, _c.set(k < 12 ? BUNT[k % 5] : '#fbf6ea')); sea.add(gondolas);
    }
    // the sea: level under the pier, then it slopes away down the tunnel wall and pours off at both ends
    const SEA_NX = 64, SEA_NZ = 56, seaGeo = keep(new THREE.PlaneGeometry(1, 1, SEA_NX, SEA_NZ)), seaBase = new Float32Array((SEA_NX + 1) * (SEA_NZ + 1) * 3);
    {
      const pos = seaGeo.attributes.position, col = new Float32Array(pos.count * 3), deep = new THREE.Color('#2f9fb4'), shallow = new THREE.Color('#8fe0d8'), foam = new THREE.Color('#f4fbff');
      for (let i = 0; i < pos.count; i++) {
        const x = 2 + (pos.getX(i) + 0.5) * 136, z = pos.getY(i) * 300;
        let y = -10.6; const dx = Math.max(0, x - 44) / 92, dz = Math.max(0, Math.abs(z) - 95) / 55;
        y -= dx * dx * 78 + dz * dz * 55;
        seaBase[i * 3] = x; seaBase[i * 3 + 1] = y; seaBase[i * 3 + 2] = z; pos.setXYZ(i, x, y, z);
        const fall = clamp01(dx * dx * 1.4 + dz * dz * 1.4); _c.copy(shallow).lerp(deep, clamp01((x - 2) / 30)).lerp(foam, fall); if (x < 5) _c.lerp(foam, 0.3);
        col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
      }
      seaGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); seaGeo.computeVertexNormals();
    }
    const seaMesh = new THREE.Mesh(seaGeo, std({ vertexColors: true, roughness: 0.22, metalness: 0.1, transparent: true, opacity: 0.93, side: THREE.DoubleSide })); seaMesh.frustumCulled = false; sea.add(seaMesh);
    // gulls wheeling over the pier head
    const NG = 26, gulls = [], gBody = dyn(new THREE.InstancedMesh(SPH, WHITE, NG)), gWing = dyn(new THREE.InstancedMesh(BOX, WHITE, NG * 2)), gHead = dyn(new THREE.InstancedMesh(SPH, WHITE, NG));
    for (let i = 0; i < NG; i++) { gulls.push({ R: rng.range(12, 34), h: rng.range(-6, 12), w: rng.range(0.25, 0.6) * rng.sign(), ph: rng() * TAU, f: rng.range(3, 5) }); gWing.setColorAt(i * 2, _c.set('#c9d0d8')); gWing.setColorAt(i * 2 + 1, _c.set('#c9d0d8')); }
    sea.add(gBody, gWing, gHead);
    wob(sea, 0.02);
    await ctx.yield();

    // =====================================================================================================================
    // 2. PENGUINS (z -360 to -560), weightless, with flippers and feet; and forty-two towels
    // =====================================================================================================================
    const NP = 200, peng = [];
    const BLACK = std({ color: '#15171c', roughness: 0.5 }), ORANGE = std({ color: '#f08a1c', roughness: 0.5 });
    const pBody = dyn(new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.34, 0.5, 4, 12)), BLACK, NP)), pBelly = dyn(new THREE.InstancedMesh(SPH, WHITE, NP)), pHead = dyn(new THREE.InstancedMesh(SPH, BLACK, NP));
    const pFace = dyn(new THREE.InstancedMesh(SPH, WHITE, NP)), pEye = dyn(new THREE.InstancedMesh(SPH, BLACK, NP * 2)), pBeak = dyn(new THREE.InstancedMesh(CONE, ORANGE, NP));
    const pFlip = dyn(new THREE.InstancedMesh(SPH, BLACK, NP * 2)), pFoot = dyn(new THREE.InstancedMesh(SPH, ORANGE, NP * 2));
    for (let i = 0; i < NP; i++) {
      const r = rng.range(8, 58), a = rng() * TAU;
      peng.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.85, z: rng.range(-360, -560), s: rng.range(1.3, 2.8), ax: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), w: rng.range(0.15, 0.7), ph: rng() * TAU, f: rng.range(0.8, 2), dr: rng.range(-0.6, 0.6) });
    }
    scene.add(pBody, pBelly, pHead, pFace, pEye, pBeak, pFlip, pFoot);
    {
      const tg = keep(new THREE.PlaneGeometry(1.5, 2.8, 6, 12)), tp = tg.attributes.position;
      for (let i = 0; i < tp.count; i++) tp.setZ(i, Math.sin(tp.getY(i) * 2.4) * 0.25 + Math.sin(tp.getX(i) * 3) * 0.08);
      tg.computeVertexNormals();
      const towels = new THREE.InstancedMesh(tg, std({ map: keep(stripeTexture('#ffffff', '#d8d8d8')), side: THREE.DoubleSide, roughness: 0.95 }), 42);
      for (let i = 0; i < 42; i++) { const r = rng.range(9, 50), a = rng() * TAU, s = rng.range(1.2, 2.4);
        _q.setFromEuler(_e.set(rng() * 6, rng() * 6, rng() * 6)); _m.compose(_p.set(Math.cos(a) * r, Math.sin(a) * r, rng.range(-340, -600)), _q, _s.setScalar(s)); towels.setMatrixAt(i, _m); towels.setColorAt(i, _c.set(rng.pick(['#f4c8d8', '#bfe0f2', '#f6e8a8', '#c8ecd0', '#f0f0f0', '#e8b0a0']))); }
      towels.frustumCulled = false; scene.add(towels); wobblers.push({ obj: towels, f: 0.6, ph: 0, amp: 0.02, spin: 0, spinZ: 0.03, base: towels.scale.clone() });
    }
    await ctx.yield();

    // =====================================================================================================================
    // 3. THE SITTING ROOM (z about -640): a floor, one wall, and everything on them, turning slowly in the void
    // =====================================================================================================================
    const room = new THREE.Group(); room.position.set(18, -6.5, -645); room.rotation.set(0.28, -0.75, 0.12); scene.add(room);
    let tvMat;
    {
      const chintzT = keep(flowerTexture(rng)), CHINTZ = std({ map: chintzT, roughness: 0.95 }), PAPER = std({ map: keep(flowerTexture(rng, '#cfe0c0', [3, 2])), roughness: 1 });
      const bx = batch(BOX, WHITE), cy = batch(CYL, WHITE), sp = batch(SPH, WHITE), co = batch(CONE, WHITE), ch = batch(BOX, CHINTZ), gl = batch(SPH, GLOW);
      const WOOD = '#6a4428', DARK = '#3a2616';
      bx.add(13, 0.25, 10, 0, -0.13, 0, '#8a6a48'); for (let i = 0; i < 12; i++) bx.add(0.04, 0.02, 10, -6 + i * 1.08, 0.005, 0, '#6e5236');
      mesh(room, BOX, std({ map: keep(rugTexture()), roughness: 1 }), 9, 0.06, 6.2, -0.3, 0.04, 0.4);
      mesh(room, BOX, PAPER, 13, 7, 0.3, 0, 3.5, -5); bx.add(13, 0.5, 0.1, 0, 0.25, -4.82, '#f4efe4').add(13, 0.12, 0.12, 0, 5.3, -4.82, '#f4efe4');
      // a picture, and three plaster ducks going up the wall
      bx.add(2.6, 1.9, 0.1, -3.4, 4, -4.8, '#c89a2e').add(2.2, 1.5, 0.12, -3.4, 4, -4.78, '#7ab0d0').add(2.2, 0.6, 0.13, -3.4, 3.55, -4.78, '#5a8a4a');
      for (let k = 0; k < 3; k++) { const x = 1.2 + k * 1.3, y = 3.3 + k * 0.7, s = 1 - k * 0.18;
        sp.add(0.9 * s, 0.45 * s, 0.2, x, y, -4.78, '#7a5a3a').add(0.34 * s, 0.34 * s, 0.2, x + 0.5 * s, y + 0.2 * s, -4.78, '#2f6a4a').add(0.7 * s, 0.25 * s, 0.22, x - 0.1 * s, y + 0.25 * s, -4.76, '#e8e0d0', 0, 0, 0.5);
        co.add(0.12 * s, 0.3 * s, 0.1, x + 0.78 * s, y + 0.2 * s, -4.78, '#e0a030', 0, 0, -Math.PI / 2); }
      // the sofa, its cushions and a cat
      ch.add(5.4, 0.9, 2.2, 0, 0.75, -3.2).add(5.4, 1.8, 0.6, 0, 1.8, -4.1).add(0.7, 1.4, 2.2, -2.7, 1.2, -3.2).add(0.7, 1.4, 2.2, 2.7, 1.2, -3.2);
      for (let i = 0; i < 3; i++) ch.add(1.55, 0.35, 1.6, -1.65 + i * 1.65, 1.35, -3.05);
      for (const [x, z] of [[-2.6, -2.3], [2.6, -2.3], [-2.6, -4.1], [2.6, -4.1]]) bx.add(0.2, 0.4, 0.2, x, 0.15, z, DARK);
      sp.add(1.1, 0.7, 1.1, -1.9, 1.85, -3.3, '#c8324a', 0.3, 0, 0.2).add(1.1, 0.7, 1.1, 2.0, 1.85, -3.4, '#e0a030', 0.3, 0, -0.3).add(1, 0.6, 1, 1.2, 1.8, -3.5, '#3a6a8a', 0.4, 0, 0.1);
      bx.add(1.2, 0.02, 0.5, 0, 2.72, -4.1, '#f8f4ec');      // antimacassar
      sp.add(1.1, 0.6, 0.8, 0.1, 1.78, -3.0, '#d8843a').add(0.5, 0.45, 0.45, 0.65, 1.95, -2.9, '#d8843a').add(0.9, 0.16, 0.16, -0.5, 1.6, -2.65, '#d8843a');
      co.add(0.16, 0.22, 0.1, 0.55, 2.2, -2.9, '#d8843a').add(0.16, 0.22, 0.1, 0.78, 2.2, -2.9, '#d8843a');
      // an armchair, turned to the television
      const AX = -4.6, AZ = -0.2;
      ch.add(2, 0.8, 2, AX, 0.7, AZ, '#ffffff', 0, 0.9, 0).add(2, 1.7, 0.5, AX - 0.6, 1.7, AZ - 0.5, '#ffffff', 0, 0.9, 0).add(1.3, 0.3, 1.4, AX + 0.05, 1.22, AZ + 0.05, '#ffffff', 0, 0.9, 0);
      // the coffee table, with the tea things and the paper
      bx.add(3, 0.12, 1.5, 0, 0.9, 0.3, WOOD); for (const [x, z] of [[-1.3, -0.3], [1.3, -0.3], [-1.3, 0.9], [1.3, 0.9]]) bx.add(0.1, 0.85, 0.1, x, 0.43, z, WOOD);
      sp.add(0.6, 0.5, 0.6, -0.5, 1.22, 0.3, '#f4f0e8'); co.add(0.14, 0.4, 0.14, -0.9, 1.3, 0.3, '#f4f0e8', 0, 0, 1.0); sp.add(0.14, 0.14, 0.14, -0.5, 1.5, 0.3, '#c8324a');
      cy.add(0.24, 0.2, 0.24, 0.3, 1.07, 0.1, '#f4f0e8').add(0.24, 0.2, 0.24, 0.8, 1.07, 0.6, '#f4f0e8').add(0.4, 0.03, 0.4, 0.3, 0.98, 0.1, '#f4f0e8').add(0.4, 0.03, 0.4, 0.8, 0.98, 0.6, '#f4f0e8');
      bx.add(0.9, 0.03, 0.6, 1.0, 0.98, -0.1, '#e8e4d8', 0, 0.3, 0);
      // the television, on splayed legs, showing two words in large friendly letters
      const tv = new THREE.Group(); tv.position.set(4.4, 0, 1.6); tv.rotation.y = -1.0; room.add(tv);
      const tb = batch(BOX, WHITE), tc = batch(CYL, WHITE);
      tb.add(2, 1.5, 1.2, 0, 1.75, 0, WOOD).add(1.5, 1.15, 0.06, -0.15, 1.78, 0.6, '#1a1a1a').add(0.3, 1.1, 0.04, 0.8, 1.78, 0.61, '#c8b890');
      for (const [x, z, a, b] of [[-0.8, 0.45, -0.15, 0.15], [0.8, 0.45, -0.15, -0.15], [-0.8, -0.45, 0.15, 0.15], [0.8, -0.45, 0.15, -0.15]]) tc.add(0.09, 1.05, 0.09, x, 0.5, z, DARK, a, 0, b);
      tc.add(0.12, 0.05, 0.12, 0.8, 2.05, 0.64, '#2a2a2a', Math.PI / 2, 0, 0).add(0.12, 0.05, 0.12, 0.8, 1.7, 0.64, '#2a2a2a', Math.PI / 2, 0, 0);
      tc.add(0.03, 1.5, 0.03, -0.25, 3.15, 0, '#c9ced6', 0, 0, 0.45).add(0.03, 1.5, 0.03, 0.25, 3.15, 0, '#c9ced6', 0, 0, -0.45);
      tb.build(tv); tc.build(tv);
      tvMat = keep(new THREE.MeshBasicMaterial({ map: keep(canvasTex(256, 192, (g) => { g.fillStyle = '#16264a'; g.fillRect(0, 0, 256, 192); g.fillStyle = '#ffd23a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 58px Helvetica, Arial, sans-serif'; g.fillText("DON'T", 128, 62); g.fillStyle = '#ff5a4a'; g.fillText('PANIC', 128, 130); for (let y = 0; y < 192; y += 4) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y, 256, 1); } })) }));
      mesh(tv, BOX, tvMat, 1.36, 1.02, 0.02, -0.15, 1.78, 0.64);
      const tvLight = new THREE.PointLight(0x9ab8ff, 14, 14, 2); tvLight.position.set(0, 1.8, 1.6); tv.add(tvLight);
      // the standard lamp, with tassels
      const LX = -5.6, LZ = -3.7;
      cy.add(1.3, 0.14, 1.3, LX, 0.07, LZ, '#b08a3a').add(0.1, 5, 0.1, LX, 2.5, LZ, '#b08a3a');
      mesh(room, keep(new THREE.CylinderGeometry(0.55, 1.1, 1.2, 24, 1, true)), std({ color: '#ffe2a8', emissive: '#ffcf80', emissiveIntensity: 1.4, side: THREE.DoubleSide }), 1, 1, 1, LX, 5.2, LZ);
      for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; bx.add(0.05, 0.28, 0.05, LX + Math.cos(a) * 1.1, 4.5, LZ + Math.sin(a) * 1.1, '#c8324a'); }
      const lampLight = new THREE.PointLight(0xffd090, 40, 30, 2); lampLight.position.set(LX, 5, LZ); room.add(lampLight);
      // a bookshelf and an aspidistra
      bx.add(2.6, 4, 0.7, 3.6, 2, -4.5, WOOD); for (let s = 0; s < 4; s++) { bx.add(2.4, 0.06, 0.72, 3.6, 0.4 + s * 0.95, -4.48, DARK); let x = 2.5; while (x < 4.6) { const w = rng.range(0.1, 0.24), h = rng.range(0.55, 0.85); bx.add(w, h, 0.5, x + w / 2, 0.43 + s * 0.95 + h / 2, -4.3, rng.pick(['#8c2a2a', '#2a4a6a', '#3a6a3a', '#c8a030', '#5a3a6a', '#e0d8c0'])); x += w + 0.02; } }
      cy.add(0.9, 0.9, 0.9, 5.7, 0.45, -3.6, '#b8623a');
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; sp.add(0.5, 2.2, 0.12, 5.7 + Math.cos(a) * 0.5, 1.8, -3.6 + Math.sin(a) * 0.5, '#2f6a3a', Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5); }
      // slippers
      sp.add(0.4, 0.2, 0.8, -1.2, 0.15, -1.4, '#7a2a3a', 0, 0.2, 0).add(0.4, 0.2, 0.8, -0.7, 0.15, -1.5, '#7a2a3a', 0, -0.1, 0);
      for (const b of [bx, cy, sp, co, ch, gl]) b.build(room);
    }
    room.scale.setScalar(1.25); wob(room, 0.08, 0.05);
    await ctx.yield();

    // =====================================================================================================================
    // 4. TEA (z -720 to -890): cups and saucers falling, ribbons of spilt tea, sugar, spoons, and one very large teapot
    // =====================================================================================================================
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const cupGeo = keep(new THREE.LatheGeometry([V2(0, 0), V2(0.28, 0), V2(0.34, 0.05), V2(0.5, 0.45), V2(0.52, 0.5), V2(0.48, 0.5), V2(0.3, 0.06), V2(0, 0.06)], 20));
    const saucerGeo = keep(new THREE.LatheGeometry([V2(0, 0), V2(0.3, 0), V2(0.75, 0.1), V2(0.78, 0.13), V2(0.3, 0.05), V2(0, 0.05)], 22));
    const handleGeo = keep(new THREE.TorusGeometry(0.16, 0.035, 6, 14));
    const CHINA = std({ color: '#ffffff', roughness: 0.25, side: THREE.DoubleSide }), TEA = std({ color: '#b8691c', roughness: 0.15, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const NC = 180, cups = [], cCup = dyn(new THREE.InstancedMesh(cupGeo, CHINA, NC)), cSaucer = dyn(new THREE.InstancedMesh(saucerGeo, CHINA, NC)), cHandle = dyn(new THREE.InstancedMesh(handleGeo, CHINA, NC)), cTea = dyn(new THREE.InstancedMesh(CIRCLE, TEA, NC));
    for (let i = 0; i < NC; i++) {
      let x = rng.range(-70, 70); if (Math.abs(x) < 9) x += 9 * Math.sign(x || 1);
      cups.push({ x, z: rng.range(-720, -890), y0: rng.range(0, 150), v: rng.range(4, 10), s: rng.range(1.6, 3.6), ax: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), w: rng.range(0.2, 0.9), ph: rng() * TAU, f: rng.range(0.8, 2) });
      _c.set(rng.pick(['#ffffff', '#ffe4ec', '#e4f0ff', '#fff6d8', '#e6f8ea'])); cCup.setColorAt(i, _c); cSaucer.setColorAt(i, _c); cHandle.setColorAt(i, _c);
    }
    scene.add(cCup, cSaucer, cHandle, cTea);
    const teaStuff = new THREE.Group(); scene.add(teaStuff);
    const ribbons = [];
    {
      const bx = batch(BOX, SHINY), sp = batch(SPH, SHINY);
      for (let i = 0; i < 170; i++) { const r = rng.range(9, 80), a = rng() * TAU, s = rng.range(0.35, 0.7); bx.add(s, s, s, Math.cos(a) * r, Math.sin(a) * r, rng.range(-715, -895), '#ffffff', rng() * 3, rng() * 3, rng() * 3); }
      for (let i = 0; i < 60; i++) { const r = rng.range(9, 70), a = rng() * TAU, x = Math.cos(a) * r, y = Math.sin(a) * r, z = rng.range(-715, -895), rx = rng() * 3, rz = rng() * 3;
        bx.add(0.12, 1.8, 0.05, x, y, z, '#d8dce4', rx, 0, rz); _q.setFromEuler(_e.set(rx, 0, rz)); _p.set(0, 1.1, 0).applyQuaternion(_q); sp.add(0.5, 0.7, 0.16, x + _p.x, y + _p.y, z + _p.z, '#d8dce4', rx, 0, rz); }
      bx.build(teaStuff); sp.build(teaStuff);
      for (let i = 0; i < 16; i++) {
        const pts = [], n = 6; let p = new THREE.Vector3(0, 0, 0);
        for (let k = 0; k < n; k++) { pts.push(p.clone()); p = p.clone().add(new THREE.Vector3(rng.range(-3, 3), rng.range(-5, -1.5), rng.range(-3, 3))); }
        const g = keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, rng.range(0.1, 0.22), 7)), r = rng.range(24, 75), a = rng() * TAU;
        const m = mesh(scene, g, TEA, 1, 1, 1, Math.cos(a) * r, Math.sin(a) * r + 8, rng.range(-725, -885)); m.scale.setScalar(rng.range(1, 1.8)); ribbons.push({ m, w: rng.range(-0.3, 0.3), ph: rng() * TAU }); wob(m, 0.2);
      }
    }
    const teapot = new THREE.Group(); teapot.position.set(-38, 30, -815); teapot.rotation.set(0.2, 0.5, -0.55); scene.add(teapot);
    {
      const POT = std({ color: '#fbf3e4', roughness: 0.2 }), ROSE = std({ color: '#e86a8a', roughness: 0.3 });
      mesh(teapot, SPH_HI, POT, 2.2, 1.8, 2.2, 0, 0, 0); mesh(teapot, SPH_HI, ROSE, 1.3, 0.35, 1.3, 0, 0.85, 0); mesh(teapot, SPH, ROSE, 0.3, 0.3, 0.3, 0, 1.1, 0);
      mesh(teapot, CYL, ROSE, 1.3, 0.12, 1.3, 0, -0.85, 0); mesh(teapot, SPH_HI, ROSE, 2.24, 0.25, 2.24, 0, 0, 0);
      mesh(teapot, keep(new THREE.TorusGeometry(0.6, 0.1, 8, 20)), POT, 1, 1.15, 1, -1.35, 0.05, 0);
      mesh(teapot, keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.9, -0.4, 0), new THREE.Vector3(1.5, -0.1, 0), new THREE.Vector3(1.75, 0.5, 0), new THREE.Vector3(2.15, 0.75, 0)]), 16, 0.16, 10)), POT, 1, 1, 1, 0, 0, 0);
      // what it pours
      mesh(teapot, keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.15, 0.75, 0), new THREE.Vector3(2.9, 0.4, 0.1), new THREE.Vector3(3.6, -1.5, 0.3), new THREE.Vector3(3.2, -4, -0.2), new THREE.Vector3(4.2, -7, 0.4), new THREE.Vector3(3.6, -10, 0)]), 50, 0.12, 8)), TEA, 1, 1, 1, 0, 0, 0);
    }
    teapot.scale.setScalar(8); wob(teapot, 0.07);
    await ctx.yield();

    // =====================================================================================================================
    // 5. A FIELD OF DOORS (z -930 to -1090): a hillside to the left, every door on it opening on a different sky
    // =====================================================================================================================
    const field = new THREE.Group(); field.position.set(-36, -16, -1010); field.rotation.z = -0.6; scene.add(field);
    const ND = 54, fDoors = [], fLeaf = dyn(new THREE.InstancedMesh(BOX, WHITE, ND)), fKnob = dyn(new THREE.InstancedMesh(SPH, std({ color: '#d8b04a', metalness: 0.8, roughness: 0.3 }), ND));
    const LEAF_C = new THREE.Matrix4().makeScale(3.2, 6.4, 0.14).setPosition(1.6, 3.3, 0), KNOB_C = new THREE.Matrix4().makeScale(0.28, 0.28, 0.28).setPosition(2.85, 3.2, 0.2);
    {
      const bx = batch(BOX, WHITE), sp = batch(SPH, WHITE), glb = batch(BOX, GLOW);
      bx.add(58, 0.8, 164, 0, -0.4, 0, '#6fae5a'); for (let i = 0; i < 8; i++) bx.add(58, 0.02, 10, 0, 0.01, -72 + i * 20.5, '#7cbc66');
      for (let i = 0; i < 260; i++) sp.add(0.35, 0.3, 0.35, rng.range(-28, 28), 0.15, rng.range(-80, 80), rng.pick(['#ffe04a', '#ff8ab0', '#ffffff', '#c8a0ff']));
      const SKIES = [[1.5, 0.9, 0.5], [0.5, 1.2, 1.7], [1.6, 0.6, 1.2], [0.7, 1.6, 0.8], [1.7, 1.5, 0.8], [0.4, 0.5, 1.6], [1.8, 0.5, 0.4]];
      const DCOL = ['#c8323c', '#2a62b8', '#2f7a4a', '#e0a82a', '#6a3f8a', '#1c1c22', '#e87a9a', '#3aa0a0', '#f4f1e8'];
      for (let c = 0; c < 6; c++) for (let r = 0; r < 9; r++) {
        const i = c * 9 + r, dx = -24 + c * 9.6 + rng.range(-2.4, 2.4), dz = -72 + r * 17.5 + rng.range(-5, 5), yaw = rng.range(-0.5, 0.5), cs = Math.cos(yaw), sn = Math.sin(yaw);
        const at = (ox, oz) => [dx + ox * cs + oz * sn, dz - ox * sn + oz * cs];
        let p = at(-1.75, 0); bx.add(0.3, 6.8, 0.4, p[0], 3.4, p[1], '#f1ede2', 0, yaw, 0); p = at(1.75, 0); bx.add(0.3, 6.8, 0.4, p[0], 3.4, p[1], '#f1ede2', 0, yaw, 0);
        bx.add(3.8, 0.3, 0.4, dx, 6.85, dz, '#f1ede2', 0, yaw, 0).add(3.8, 0.14, 1.4, dx, 0.07, dz, '#b8b0a0', 0, yaw, 0);
        p = at(0, -0.08); glb.add(3.2, 6.5, 0.04, p[0], 3.35, p[1], rng.pick(SKIES), 0, yaw, 0);
        p = at(0, 1.3); bx.add(1.8, 0.06, 1, p[0], 0.05, p[1], '#8a5a3a', 0, yaw, 0);
        const A = new THREE.Matrix4().makeRotationY(yaw).setPosition(dx, 0, dz).multiply(new THREE.Matrix4().makeTranslation(-1.6, 0, 0));
        fDoors.push({ A, ph: rng() * TAU, f: rng.range(0.35, 0.9), max: rng.range(1.1, 2.0) }); fLeaf.setColorAt(i, _c.set(DCOL[i % DCOL.length]));
      }
      bx.build(field); sp.build(field); glb.build(field); field.add(fLeaf, fKnob);
    }
    // and a few doors loose in the air beside the road
    const doors = [];
    {
      const frameM = std({ color: '#f1ede2' }), cols = ['#c8323c', '#2a62b8', '#2f7a4a', '#e0a82a', '#6a3f8a', '#1c1c22', '#e87a9a', '#3aa0a0'], knob = std({ color: '#d8b04a', metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1, g = new THREE.Group();
        g.position.set(side > 0 ? rng.range(13, 40) : rng.range(-13, -18), side > 0 ? rng.range(-22, 14) : rng.range(8, 30), -935 - i * 19 + rng.range(-3, 3)); g.rotation.set(rng.range(-0.2, 0.2), -side * rng.range(0.1, 0.6), rng.range(-0.3, 0.3));
        mesh(g, BOX, frameM, 0.3, 6.6, 0.4, -1.75, 3.3, 0); mesh(g, BOX, frameM, 0.3, 6.6, 0.4, 1.75, 3.3, 0); mesh(g, BOX, frameM, 3.8, 0.3, 0.4, 0, 6.75, 0); mesh(g, BOX, frameM, 3.8, 0.12, 0.6, 0, 0.06, 0);
        const hinge = new THREE.Group(); hinge.position.set(-1.6, 0, 0); g.add(hinge);
        const leafM = std({ color: cols[i] });
        mesh(hinge, BOX, leafM, 3.2, 6.4, 0.14, 1.6, 3.3, 0); mesh(hinge, BOX, leafM, 2.4, 2.2, 0.2, 1.6, 4.8, 0); mesh(hinge, BOX, leafM, 2.4, 2.2, 0.2, 1.6, 1.8, 0); mesh(hinge, SPH, knob, 0.28, 0.28, 0.28, 2.9, 3.2, 0.18);
        g.scale.setScalar(rng.range(1.2, 1.9)); scene.add(g); wob(g, 0.1);
        doors.push({ hinge, ph: rng() * TAU, f: rng.range(0.4, 0.9), max: rng.range(1.2, 2.0) });
      }
    }
    await ctx.yield();

    // =====================================================================================================================
    // 6. THE RUBBER-DUCK PLANET (z -1200), with a ring of bathwater and bubbles, and duckling moons
    // =====================================================================================================================
    const DUCK_Y = std({ color: '#ffd21a', roughness: 0.22 }), DUCK_O = std({ color: '#f07a12', roughness: 0.3 }), EYE = std({ color: '#111111', roughness: 0.2 });
    function makeDuck(R) {
      const g = new THREE.Group();
      mesh(g, SPH_HI, DUCK_Y, 2 * R, 1.7 * R, 2.3 * R, 0, 0, 0); mesh(g, SPH_HI, DUCK_Y, 1.15 * R, 1.1 * R, 1.15 * R, 0, 0.98 * R, 0.6 * R);
      mesh(g, SPH_HI, DUCK_O, 0.58 * R, 0.16 * R, 0.6 * R, 0, 0.9 * R, 1.2 * R, 0.12, 0, 0); mesh(g, SPH_HI, DUCK_O, 0.46 * R, 0.1 * R, 0.46 * R, 0, 0.8 * R, 1.16 * R, -0.1, 0, 0);
      for (const s of [-1, 1]) { mesh(g, SPH, EYE, 0.15 * R, 0.17 * R, 0.1 * R, s * 0.27 * R, 1.16 * R, 1.06 * R); mesh(g, SPH, GLOW, 0.05 * R, 0.05 * R, 0.04 * R, s * 0.25 * R, 1.2 * R, 1.11 * R);
        mesh(g, SPH_HI, DUCK_Y, 0.3 * R, 0.9 * R, 1.35 * R, s * 0.95 * R, 0.08 * R, -0.12 * R, -0.25, 0, 0); }
      mesh(g, CONE, DUCK_Y, 0.8 * R, 0.9 * R, 0.5 * R, 0, 0.5 * R, -1.08 * R, -0.95, 0, 0);
      return g;
    }
    const duckWorld = new THREE.Group(); duckWorld.position.set(60, -16, -1200); duckWorld.rotation.set(0.1, -0.5, 0.18); scene.add(duckWorld);
    const duck = makeDuck(26); duckWorld.add(duck);
    mesh(duckWorld, SPH_HI, keep(new THREE.MeshBasicMaterial({ color: '#fff4a0', transparent: true, opacity: 0.07, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })), 66, 62, 72, 0, 4, 2);
    const duckRing = new THREE.Group(); duckRing.rotation.set(0.22, 0, -0.12); duckWorld.add(duckRing);
    mesh(duckRing, keep(new THREE.RingGeometry(36, 56, 72, 1)), keep(new THREE.MeshBasicMaterial({ color: '#bfeaff', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })), 1, 1, 1, 0, 0, 0, -Math.PI / 2);
    {
      const bub = batch(SPH, keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45, depthWrite: false })));
      for (let i = 0; i < 260; i++) { const r = rng.range(36, 56), a = rng() * TAU, s = rng.range(0.5, 2.6); bub.add(s, s, s, Math.cos(a) * r, rng.range(-1.5, 2.5), Math.sin(a) * r, rng.pick(['#ffffff', '#e8f8ff', '#ffe8f8', '#f0ffe8'])); }
      bub.build(duckRing);
    }
    const ducklings = [];
    for (let i = 0; i < 10; i++) { const d = makeDuck(rng.range(1.2, 2.4)); duckRing.add(d); ducklings.push({ d, r: rng.range(40, 53), w: rng.range(0.12, 0.3), ph: i / 10 * TAU + rng.range(-0.2, 0.2), bob: rng() * TAU }); }
    wob(duckWorld, 0.05);
    await ctx.yield();

    // =====================================================================================================================
    // 7. MELTING CLOCKS (z -1290 to -1400), each draped over the edge of something; and two elephants on stilts
    // =====================================================================================================================
    function clockGeo(r, stretch) {
      const g = new THREE.PlaneGeometry(2 * r, 2 * r, 22, 22); g.rotateX(-Math.PI / 2);
      const p = g.attributes.position, e = r * 0.1, rho = r * 0.32;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), s = x - e; if (s <= 0) continue;
        let nx, ny; const q = rho * Math.PI / 2;
        if (s < q) { nx = e + rho * Math.sin(s / rho); ny = -(rho - rho * Math.cos(s / rho)); } else { nx = e + rho; ny = -rho - (s - q) * stretch; }
        const sag = Math.sin(z / r * 1.8); ny -= r * 0.22 * sag * sag * clamp01(s / r) + r * 0.1 * Math.sin(z / r * 5 + 1) * clamp01(s / r);
        p.setXYZ(i, nx, ny, z * (1 - 0.18 * clamp01(s / r)));
      }
      g.computeVertexNormals(); return keep(g);
    }
    const drips = [], dripMesh = dyn(new THREE.InstancedMesh(SPH, std({ color: '#d8a838', roughness: 0.2, metalness: 0.6 }), 30));
    {
      const STONE = ['#c8b48a', '#b89a70', '#d8c8a0'];
      for (let i = 0; i < 10; i++) {
        const side = i % 2 ? 1 : -1, r = rng.range(4.5, 8), g = new THREE.Group(), rad = rng.range(20, 38), ang = rng.range(-0.9, 0.9);
        g.position.set(side * rad * Math.cos(ang), rad * Math.sin(ang), -1290 - i * 12 + rng.range(-3, 3)); g.rotation.set(rng.range(-0.25, 0.25), side > 0 ? Math.PI + rng.range(-0.5, 0.5) : rng.range(-0.5, 0.5), rng.range(-0.2, 0.2));
        const stretch = rng.range(1.1, 1.7);
        mesh(g, clockGeo(r, stretch), std({ map: keep(clockTexture(rng.int(1, 12), rng.int(0, 59))), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.35 }), 1, 1, 1, 0, 0.04, 0);
        const kind = i % 3, sb = batch(BOX, WHITE), sc = batch(CYL, WHITE);
        if (kind === 0) sb.add(r * 1.9, r * 0.9, r * 2.6, -r * 0.85, -r * 0.45, 0, STONE[i % 3]);
        else if (kind === 1) { sc.add(r * 0.3, r * 3.4, r * 0.3, -r * 0.2, -0.16 * r, 0, '#5a4630', Math.PI / 2, 0, 0).add(r * 0.5, r * 6, r * 0.5, -r * 0.3, -r * 1.2, -r * 1.9, '#5a4630', 0.1, 0, 0.05).add(r * 0.16, r * 2, r * 0.16, -r * 0.3, r * 1.4, -r * 1.2, '#5a4630', -0.9, 0, 0); }
        else { sb.add(r * 2.6, r * 0.14, r * 2.8, -r * 1.2, -r * 0.08, 0, '#7a5a3a'); for (const [x, z] of [[-2.3, -1.2], [-2.3, 1.2], [-0.1, -1.2], [-0.1, 1.2]]) sb.add(r * 0.14, r * 2.4, r * 0.14, r * x, -r * 1.3, r * z, '#7a5a3a'); }
        sb.build(g); sc.build(g); scene.add(g); g.updateMatrixWorld(true); wob(g, 0.1);
        for (let d = 0; d < 3; d++) drips.push({ at: new THREE.Vector3(r * 0.42, -r * 0.32 - (r * 0.9 - r * 0.5) * stretch, rng.range(-0.5, 0.5) * r).applyMatrix4(g.matrixWorld), ph: rng(), v: rng.range(0.25, 0.5), s: r * 0.1 });
      }
      scene.add(dripMesh);
    }
    function makeElephant(x, y, z, s, ry) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); scene.add(g);
      const sp = batch(SPH, WHITE), cy = batch(CYL, WHITE), bx = batch(BOX, WHITE), co = batch(CONE, WHITE), py = batch(PYR, WHITE), E = '#8a8078', D = '#766c64';
      sp.add(5, 4.4, 7.5, 0, 0, 0, E).add(3.4, 3.4, 3.4, 0, 0.7, 4.3, E).add(0.4, 3.2, 2.6, 2.0, 0.9, 3.7, D, 0, -0.3, 0).add(0.4, 3.2, 2.6, -2.0, 0.9, 3.7, D, 0, 0.3, 0);
      for (const sx of [-1.6, 1.6]) for (const sz of [-2.6, 2.6]) { cy.add(0.3, 34, 0.3, sx, -18.5, sz, E); sp.add(0.7, 0.7, 0.7, sx, -12, sz, D).add(0.7, 0.7, 0.7, sx, -24, sz, D).add(1.1, 0.5, 1.3, sx, -35.5, sz + 0.2, D); }
      co.add(0.3, 2.2, 0.3, 0.9, -0.4, 5.6, '#f4efe0', 2.0, 0, 0).add(0.3, 2.2, 0.3, -0.9, -0.4, 5.6, '#f4efe0', 2.0, 0, 0);
      bx.add(3.6, 0.2, 4, 0, 2.2, 0, '#b8323c').add(1.6, 8, 1.6, 0, 6.2, 0, '#e0d0a8'); py.add(1.6, 1.6, 1.6, 0, 11, 0, '#e0d0a8'); cy.add(0.08, 3, 0.08, 0, -1, -3.9, D, 0.3, 0, 0);
      for (const b of [sp, cy, bx, co, py]) b.build(g);
      mesh(g, keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, 5.7), new THREE.Vector3(0, -1.6, 6.8), new THREE.Vector3(0, -4.4, 7), new THREE.Vector3(0, -6, 6.2), new THREE.Vector3(0, -6.2, 5.2)]), 20, 0.42, 8)), std({ color: E }), 1, 1, 1, 0, 0, 0);
      return wob(g, 0.06);
    }
    makeElephant(-44, -20, -1345, 1.5, 0.5); makeElephant(62, 8, -1395, 1.1, -0.7);
    await ctx.yield();

    // =====================================================================================================================
    // 8. THE FIVE-HEADED STAIRCASE (z -1440 to -1540): one broad flight that divides into five, each going its own way up
    // =====================================================================================================================
    {
      const sb = batch(BOX, WHITE), sg = batch(SPH, GLOW), glb = batch(BOX, GLOW), QR = new THREE.Quaternion().setFromAxisAngle(X, 0.4636), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), mb = new THREE.Matrix4();
      const right = new THREE.Vector3(), back = new THREE.Vector3();
      function flight(pos, fwd, up, n, w, yawR, rollR, carpet) {
        const place = (lx, ly, lf) => new THREE.Vector3().copy(pos).addScaledVector(right, lx).addScaledVector(up, ly).addScaledVector(fwd, lf);
        let k = 0;
        for (; k < n; k++) {
          right.crossVectors(fwd, up).normalize(); back.copy(fwd).negate(); q.setFromRotationMatrix(mb.makeBasis(right, up, back)); q2.multiplyQuaternions(q, QR);
          const rad = Math.hypot(pos.x, pos.y); if (k > 3 && (rad < 13 || rad > 122)) break;
          sb.addQ(w, 0.12, 1.06, place(0, 0, 0.5), q, '#f4efe4').addQ(w, 0.5, 0.08, place(0, -0.25, 0.02), q, '#e4dccc').addQ(w * 0.5, 0.03, 1.06, place(0, 0.075, 0.5), q, carpet);
          for (const s of [-1, 1]) { sb.addQ(0.08, 1.1, 0.08, place(s * (w / 2 - 0.08), 0.6, 0.5), q, '#f4efe4').addQ(0.12, 0.1, 1.14, place(s * (w / 2 - 0.08), 1.42, 0.5), q2, '#6a4428'); }
          pos.addScaledVector(fwd, 1).addScaledVector(up, 0.5); fwd.applyAxisAngle(up, yawR).normalize(); up.applyAxisAngle(fwd, rollR).normalize();
        }
        right.crossVectors(fwd, up).normalize(); back.copy(fwd).negate(); q.setFromRotationMatrix(mb.makeBasis(right, up, back));
        return { place, q: q.clone() };
      }
      const base = new THREE.Vector3(-42, -38, -1452), f0 = new THREE.Vector3(0.35, 0, -1).normalize(), u0 = new THREE.Vector3(0, 1, 0);
      const trunk = flight(base, f0, u0, 30, 6, 0, 0, '#b8323c');
      sb.addQ(8, 0.2, 5, trunk.place(0, -0.05, 2.2), trunk.q, '#f4efe4');
      const YAW0 = [-1.0, -0.5, 0, 0.5, 1.0], YAWR = [0.045, -0.035, 0.012, 0.05, -0.04], ROLLR = [0.03, -0.05, 0.07, -0.02, 0.045], CARPET = ['#2a62b8', '#2f7a4a', '#b8323c', '#e0a82a', '#6a3f8a'];
      for (let h = 0; h < 5; h++) {
        const pos = trunk.place((h - 2) * 1.5, 0, 3.5), fwd = f0.clone().applyAxisAngle(u0, -YAW0[h]), up = u0.clone();
        const end = flight(pos, fwd, up, 46, 2.6, YAWR[h], ROLLR[h], CARPET[h]);
        // each head: a landing, two newels with lit globes, and a door that is ajar
        sb.addQ(4, 0.2, 3.4, end.place(0, -0.05, 1.6), end.q, '#f4efe4');
        for (const s of [-1, 1]) { sb.addQ(0.3, 2.4, 0.3, end.place(s * 1.7, 1.2, 0.3), end.q, '#6a4428'); sg.addQ(1.1, 1.1, 1.1, end.place(s * 1.7, 2.9, 0.3), end.q, [2.2, 1.8, 1.0]);
          sb.addQ(0.25, 5.2, 0.3, end.place(s * 1.25, 2.6, 3), end.q, '#f1ede2'); }
        sb.addQ(2.75, 0.25, 0.3, end.place(0, 5.3, 3), end.q, '#f1ede2'); glb.addQ(2.2, 5, 0.04, end.place(0, 2.6, 3.05), end.q, [[1.5, 0.9, 0.5], [0.5, 1.2, 1.7], [1.6, 0.6, 1.2], [0.7, 1.6, 0.8], [1.7, 1.5, 0.8]][h]);
        sb.addQ(2.2, 5, 0.1, end.place(-0.5, 2.6, 2.4), new THREE.Quaternion().multiplyQuaternions(end.q, new THREE.Quaternion().setFromAxisAngle(Y, 0.9)), CARPET[h]);
      }
      const stairs = new THREE.Group(); scene.add(stairs); sb.build(stairs); sg.build(stairs); glb.build(stairs);
    }
    await ctx.yield();

    // =====================================================================================================================
    // 9. FAR OFF: a sperm whale and a bowl of petunias, falling (z about -1700)
    // =====================================================================================================================
    const whale = new THREE.Group(), petunias = new THREE.Group(); scene.add(whale, petunias);
    {
      const wg = keep(new THREE.LatheGeometry([V2(0, 0), V2(1.2, 0.15), V2(1.9, 1), V2(2.15, 3), V2(2.2, 6), V2(1.9, 9.5), V2(1.25, 13), V2(0.6, 16), V2(0.25, 18)], 24)); wg.translate(0, -9, 0);
      const SKIN = std({ color: '#5c6670', roughness: 0.45 }), PALE = std({ color: '#c9ced0', roughness: 0.5 });
      const body = new THREE.Group(); body.rotation.z = Math.PI / 2; whale.add(body);
      mesh(body, wg, SKIN, 0.86, 1, 1, 0, 0, 0); mesh(body, BOX, PALE, 0.7, 5.6, 0.5, 0, -6, -1.75, 0.08, 0, 0);
      for (const s of [-1, 1]) { mesh(body, SPH, SKIN, 4.6, 2, 0.5, s * 2.1, 9.4, 0, 0, 0, s * 0.5); mesh(body, SPH, SKIN, 0.4, 2.8, 1.2, s * 1.9, -3.6, -1.0, 0, 0, s * 0.5); mesh(body, SPH, EYE, 0.3, 0.3, 0.3, s * 1.78, -4.6, -0.5); }
      whale.scale.setScalar(2.4);
      const bowl = keep(new THREE.LatheGeometry([V2(0, 0), V2(0.7, 0), V2(1.2, 0.9), V2(1.25, 1), V2(1.1, 1), V2(0.65, 0.12), V2(0, 0.12)], 24));
      mesh(petunias, bowl, std({ color: '#b8623a', side: THREE.DoubleSide }), 1, 1, 1, 0, 0, 0); mesh(petunias, CIRCLE, std({ color: '#3a2a1c' }), 2.2, 2.2, 1, 0, 0.9, 0, -Math.PI / 2);
      const sp = batch(SPH, WHITE), co = batch(keep(new THREE.ConeGeometry(0.5, 1, 12, 1, true)), FLAT2);
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, r = rng.range(0.4, 1.1); sp.add(0.5, 0.12, 0.9, Math.cos(a) * r, 1.15, Math.sin(a) * r, '#3a8a3a', 0.3, -a, 0); }
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + 0.3, r = k < 3 ? 0.25 : 0.85, c = rng.pick(['#e83a9a', '#a03ad8', '#f06ac0', '#ffffff', '#7a2ad0']);
        co.add(0.7, 0.6, 0.7, Math.cos(a) * r, 1.75, Math.sin(a) * r, c, Math.PI + Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4); sp.add(0.16, 0.16, 0.16, Math.cos(a) * r, 1.6, Math.sin(a) * r, '#ffe04a'); }
      sp.build(petunias); co.build(petunias); petunias.scale.setScalar(4);
    }
    await ctx.yield();

    // =====================================================================================================================
    // 10. THE SHIP: a white prow across the tunnel, a door that sighs open, and inside a plain white corridor (normality)
    // =====================================================================================================================
    const ship = new THREE.Group(); scene.add(ship);
    const HULL = std({ color: '#e4e8ee', roughness: 0.4 });
    let doorL, doorR, innerL, innerR, doorGlow;
    {
      const bx = batch(BOX, WHITE), cy = batch(CYL, WHITE), glb = batch(BOX, GLOW), gs = batch(SPH, GLOW);
      const W = '#dfe3e9', TRIM = '#b4bcc8', PANEL = '#d2d8e0', LOW = '#b9c6d4', STRIP = [1.05, 1.1, 1.15], CYAN = [0.4, 1.5, 1.7];
      const Z0 = MOUTH_Z, L = 222, ZC = Z0 - 2 - L / 2;
      // the prow: a flat face with the doorway in it, a cone of hull behind, then the hull itself
      bx.add(15, 44, 2, -14.5, 0, Z0 - 1, W).add(15, 44, 2, 14.5, 0, Z0 - 1, W).add(14, 14.5, 2, 0, 14.75, Z0 - 1, W).add(14, 15.5, 2, 0, -14.25, Z0 - 1, W);
      mesh(ship, keep(new THREE.CylinderGeometry(31, 46, 30, 48, 1, true)), HULL, 1, 1, 1, 0, 0, Z0 - 15.5, -Math.PI / 2);
      mesh(ship, keep(new THREE.CylinderGeometry(46, 46, 240, 48, 1, true)), HULL, 1, 1, 1, 0, 0, Z0 - 150, Math.PI / 2);
      const ringG = keep(new THREE.TorusGeometry(46.2, 0.5, 6, 64)); for (let i = 0; i < 4; i++) mesh(ship, ringG, std({ color: TRIM }), 1, 1, 1, 0, 0, Z0 - 31 - i * 40);
      mesh(ship, keep(new THREE.TorusGeometry(31, 0.6, 6, 64)), std({ color: TRIM }), 1, 1, 1, 0, 0, Z0 - 0.4);
      for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; gs.add(0.9, 0.9, 0.9, Math.cos(a) * 38.5, Math.sin(a) * 38.5, Z0 - 15, k % 2 ? [1.8, 0.3, 0.3] : [0.3, 1.8, 0.5]); }
      // the doorway's surround
      bx.add(0.8, 15.6, 0.8, -7.4, 0.5, Z0 + 0.3, TRIM).add(0.8, 15.6, 0.8, 7.4, 0.5, Z0 + 0.3, TRIM).add(15.6, 0.8, 0.8, 0, 7.9, Z0 + 0.3, TRIM).add(15.6, 0.8, 0.8, 0, -6.9, Z0 + 0.3, TRIM);
      for (let k = 0; k < 6; k++) bx.add(1.2, 0.5, 0.3, -11.5, -4 + k * 1.6, Z0 + 0.1, k % 2 ? '#f4c430' : '#2a2a2a', 0, 0, 0.6).add(1.2, 0.5, 0.3, 11.5, -4 + k * 1.6, Z0 + 0.1, k % 2 ? '#f4c430' : '#2a2a2a', 0, 0, -0.6);
      // the corridor: inner half-width 7, floor 6.5 under the road, ceiling 7.5 over it
      bx.add(15, 0.5, L, 0, -6.75, ZC, W).add(15, 0.5, L, 0, 7.75, ZC, W).add(0.5, 15, L, -7.25, 0.5, ZC, W).add(0.5, 15, L, 7.25, 0.5, ZC, W);
      bx.add(5, 0.04, L, 0, -6.48, ZC, '#aab2bc').add(0.3, 0.05, L, -2.8, -6.47, ZC, '#f4c430').add(0.3, 0.05, L, 2.8, -6.47, ZC, '#f4c430');
      glb.add(0.5, 0.08, L, -4.6, 7.46, ZC, STRIP).add(0.5, 0.08, L, 4.6, 7.46, ZC, STRIP);
      const NB = 24, BAY = L / NB;
      for (let i = 0; i <= NB; i++) {
        const z = Z0 - 2 - i * BAY;
        for (const s of [-1, 1]) { bx.add(0.4, 14, 0.9, s * 6.82, 0.5, z, TRIM).add(1.6, 0.35, 0.9, s * 6.2, 6.7, z, TRIM, 0, 0, s * 0.78).add(1.2, 0.3, 0.9, s * 6.4, -6.1, z, TRIM, 0, 0, -s * 0.78); }
        bx.add(14, 0.4, 0.9, 0, 7.32, z, TRIM).add(14, 0.08, 0.5, 0, -6.46, z, TRIM);
        if (i === NB) break;
        const zc = z - BAY / 2;
        for (const s of [-1, 1]) {
          bx.add(0.06, 5.4, BAY - 1.6, s * 6.96, 3.8, zc, PANEL).add(0.06, 4.4, BAY - 1.6, s * 6.96, -3.6, zc, LOW).add(0.08, 0.3, BAY - 1.2, s * 6.95, 0.75, zc, '#8fa0b4');
          for (let k = 0; k < 3; k++) glb.add(0.25, 0.05, 1.1, s * 6.3, -6.46, zc - 3 + k * 3, CYAN);
          if ((i + (s > 0 ? 1 : 0)) % 4 === 1) {      // a cabin door, properly shut, with its light and keypad
            bx.add(0.14, 9.4, 4.6, s * 6.93, -1.8, zc, '#dfe4ea').add(0.16, 9.8, 0.3, s * 6.92, -1.6, zc - 2.45, TRIM).add(0.16, 9.8, 0.3, s * 6.92, -1.6, zc + 2.45, TRIM).add(0.16, 0.3, 5.2, s * 6.92, 3.2, zc, TRIM).add(0.16, 0.5, 4.4, s * 6.9, -1.2, zc, '#8fa0b4');
            cy.add(1.3, 0.1, 1.3, s * 6.88, 1, zc, '#5a6a7a', 0, 0, Math.PI / 2); glb.add(0.1, 0.9, 0.9, s * 6.86, 1, zc, [0.5, 0.9, 1.4]);
            glb.add(0.1, 0.25, 0.6, s * 6.88, 3.8, zc, [0.3, 1.8, 0.6]); bx.add(0.14, 0.9, 0.6, s * 6.9, -0.6, zc + 3.1, '#3a4654'); glb.add(0.16, 0.2, 0.36, s * 6.88, -0.4, zc + 3.1, [1.6, 1.2, 0.4]);
          } else if (i % 4 === 3) { for (let k = 0; k < 6; k++) bx.add(0.1, 0.12, 3.4, s * 6.9, -5.4 + k * 0.32, zc, '#8fa0b4', 0, 0, s * 0.5); }      // a vent
          else if (i % 4 === 0 && s < 0) { cy.add(3, 0.2, 3, s * 6.9, 3.2, zc, TRIM, 0, 0, Math.PI / 2); glb.add(0.1, 2.4, 2.4, s * 6.84, 3.2, zc, [0.9, 0.75, 0.95]); }      // a port
        }
        if (i % 2) glb.add(3.2, 0.08, 5, 0, 7.46, zc, [1.15, 1.18, 1.22]); else gs.add(0.9, 0.2, 0.9, 0, 7.42, zc, [1.2, 1.2, 1.1]);
      }
      // pipes along the upper corners, a handrail each side
      for (const [x, y, r, c] of [[-6.2, 6.3, 0.5, '#e0a82a'], [-5.5, 6.75, 0.3, '#c9ced6'], [6.3, 6.4, 0.42, '#7fb0d0'], [5.6, 6.8, 0.26, '#c9ced6']]) cy.add(r, L, r, x, y, ZC, c, Math.PI / 2, 0, 0);
      for (const s of [-1, 1]) { cy.add(0.14, L, 0.14, s * 6.5, -2.6, ZC, '#8fa0b4', Math.PI / 2, 0, 0); for (let i = 0; i < NB; i++) bx.add(0.4, 0.08, 0.08, s * 6.7, -2.6, Z0 - 2 - (i + 0.5) * BAY, '#8fa0b4'); }
      // a drinks machine, with a cup of something almost, but not quite, entirely unlike tea
      const NZ = Z0 - 2 - 9.5 * BAY;
      bx.add(1.4, 9, 4.4, 6.3, -1.9, NZ, '#e8ecf0').add(0.2, 2.2, 2.2, 5.56, -1.2, NZ, '#2a3440'); glb.add(0.1, 1.2, 3.2, 5.58, 1.4, NZ, [1.4, 0.7, 1.5]).add(0.1, 0.3, 0.3, 5.58, -3.2, NZ - 1, [0.3, 1.8, 0.6]).add(0.1, 0.3, 0.3, 5.58, -3.2, NZ, [1.8, 1.4, 0.3]).add(0.1, 0.3, 0.3, 5.58, -3.2, NZ + 1, [1.8, 0.4, 0.3]);
      cy.add(0.5, 0.6, 0.5, 5.3, -2, NZ, '#ffffff');
      mesh(ship, BOX, keep(new THREE.MeshBasicMaterial({ map: keep(textTexture(['SHARE AND ENJOY'], 256, 40, '#ffffff', '#b04ac0', 24)) })), 0.02, 0.5, 3.2, 5.52, 1.4, NZ, 0, 0, 0);
      for (const [txt, zz, s] of [['DECK 3', Z0 - 30, -1], ["DON'T PANIC", Z0 - 76, 1], ['MIND THE STEP', Z0 - 150, -1], ['THANK YOU FOR MAKING A SIMPLE DOOR VERY HAPPY', Z0 - 8, 1]]) {
        const long = txt.length > 20, m = keep(new THREE.MeshBasicMaterial({ map: keep(textTexture([txt], long ? 1024 : 256, 48, '#3a4654', '#f3f4f6', long ? 30 : 34)), color: '#d0d0d0' }));
        const p = mesh(ship, BOX, m, long ? 9 : 4.4, long ? 0.42 : 0.8, 0.02, s * 6.9, 5.6, zz, 0, -s * Math.PI / 2, 0); p.scale.set(long ? 9 : 4.4, long ? 0.42 : 0.8, 0.02);
      }
      // the far end: a bulkhead with the last doorway in it (the portal stands in it)
      const ZE = -LEN - 0.6; bx.add(3, 15, 0.6, -5.6, 0.5, ZE, W).add(3, 15, 0.6, 5.6, 0.5, ZE, W).add(8.4, 2, 0.6, 0, 6.6, ZE, W).add(8.4, 1.1, 0.6, 0, -6, ZE, W);
      bx.add(0.5, 11.6, 0.9, -4.3, 0, ZE + 0.2, TRIM).add(0.5, 11.6, 0.9, 4.3, 0, ZE + 0.2, TRIM).add(9.1, 0.5, 0.9, 0, 5.8, ZE + 0.2, TRIM).add(9.1, 0.5, 0.9, 0, -5.7, ZE + 0.2, TRIM);
      for (const b of [bx, cy, glb, gs]) b.build(ship);
      // the doors: the outer one in the prow, an inner one a third of the way down
      const leafM = std({ color: '#e9edf2', roughness: 0.35, metalness: 0.2 });
      const leaf = (z) => { const g = new THREE.Group(); mesh(g, BOX, leafM, 7, 14, 0.5, 0, 0, 0); mesh(g, BOX, std({ color: '#8fa0b4' }), 6.2, 0.4, 0.56, 0, 3, 0); mesh(g, BOX, std({ color: '#8fa0b4' }), 6.2, 0.4, 0.56, 0, -3, 0); mesh(g, BOX, std({ color: '#f4c430' }), 0.3, 14, 0.58, 0, 0, 0).position.x = 0; g.position.set(0, 0.5, z); ship.add(g); return g; };
      doorL = leaf(Z0 - 1); doorR = leaf(Z0 - 1); innerL = leaf(Z0 - 2 - 8 * BAY); innerR = leaf(Z0 - 2 - 8 * BAY);
      for (const d of [doorL, innerL]) d.children[3].position.x = 3.35; for (const d of [doorR, innerR]) d.children[3].position.x = -3.35;
      doorGlow = keep(new THREE.MeshBasicMaterial({ color: '#40ff90' })); mesh(ship, BOX, doorGlow, 4, 0.3, 0.3, 0, 8.6, Z0 + 0.5);
      for (const z of [Z0 - 40, Z0 - 110, Z0 - 180]) { const pl = new THREE.PointLight(0xeaf4ff, 14, 90, 2); pl.position.set(0, 5, z); ship.add(pl); }
    }
    await ctx.yield();

    // =====================================================================================================================
    // THE CLOCK
    // =====================================================================================================================
    const M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), Q3 = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), O = new THREE.Vector3(), EYEP = new THREE.Vector3();
    let K = 1;
    const put = (im, i, ox, oy, oz, sx, sy, sz, lq) => { O.set(ox, oy, oz).multiplyScalar(K).applyQuaternion(Q).add(P); S.set(sx * K, sy * K, sz * K); if (lq) M.compose(O, Q3.multiplyQuaternions(Q, lq), S); else M.compose(O, Q, S); im.setMatrixAt(i, M); };
    const flag = (...ims) => { for (const im of ims) im.instanceMatrix.needsUpdate = true; };
    const fogBase = new THREE.Color();
    let seaTick = 0;

    function update(dt, time, camera, u = 0) {
      let uu = u || 0;
      if (camera && !ctx.through) { camera.getWorldPosition(EYEP); uu = clamp01(-EYEP.z / LEN); }
      const wild = 1 - ss(0.84, 0.9, uu);      // 1 while improbable, 0 once normality is restored
      // the tunnel takes the station's colours
      let i0 = 0; while (i0 < PAL.length - 2 && PAL[i0 + 1].u <= uu) i0++;
      const a = PAL[i0], b = PAL[i0 + 1], t = ss(0, 1, (uu - a.u) / (b.u - a.u));
      tunU.uC1.value.copy(a.c[0]).lerp(b.c[0], t); tunU.uC2.value.copy(a.c[1]).lerp(b.c[1], t); tunU.uC3.value.copy(a.c[2]).lerp(b.c[2], t); tunU.uC4.value.copy(a.c[3]).lerp(b.c[3], t);
      tunU.uStyle.value = a.st + (b.st - a.st) * t; tunU.uTime.value = time; tunU.uCalm.value = 1 - wild;
      fogBase.copy(tunU.uC1.value).add(tunU.uC2.value).add(tunU.uC3.value).add(tunU.uC4.value).multiplyScalar(0.25 * 0.72);
      scene.fog.color.copy(fogBase); scene.background.copy(fogBase);
      motes.rotation.z = time * 0.05; motes.material.opacity = 0.2 + 0.6 * wild;
      // the odds
      setOdds(Math.floor(276709 * Math.pow(1 - clamp01(uu / 0.85), 2.2)));
      for (const w of wobblers) {
        const k = 1 + w.amp * wild * Math.sin(time * w.f * 2.2 + w.ph), k2 = 1 + w.amp * wild * Math.sin(time * w.f * 1.7 + w.ph + 2.1);
        w.obj.scale.set(w.base.x * k, w.base.y * k2, w.base.z * k);
        if (w.spin) w.obj.rotation.y += w.spin * dt * wild; if (w.spinZ) w.obj.rotation.z += w.spinZ * dt;
      }

      // ---- 1. the seafront
      if (uu < 0.3) {
        wheel.rotation.z = time * 0.25;
        for (let k = 0; k < 12; k++) { const an = wheel.rotation.z + k / 12 * TAU, gx = WHEEL_AT[0] + Math.cos(an) * 11, gy = WHEEL_AT[1] + Math.sin(an) * 11;
          M.makeScale(1.7, 1.3, 1.5).setPosition(gx, gy - 1.2, WHEEL_AT[2]); gondolas.setMatrixAt(k, M); M.makeScale(2, 0.15, 1.8).setPosition(gx, gy - 0.3, WHEEL_AT[2]); gondolas.setMatrixAt(12 + k, M); }
        flag(gondolas);
        if ((seaTick++ & 1) === 0) {
          const pos = seaGeo.attributes.position;
          for (let i = 0; i < pos.count; i++) { const x = seaBase[i * 3], z = seaBase[i * 3 + 2]; pos.setY(i, seaBase[i * 3 + 1] + Math.sin(x * 0.25 + time * 1.2) * 0.22 + Math.sin(z * 0.18 - time * 0.9 + x * 0.07) * 0.28); }
          pos.needsUpdate = true; seaGeo.computeVertexNormals();
        }
        for (let i = 0; i < NG; i++) {
          const g = gulls[i], th = time * g.w + g.ph, dir = Math.sign(g.w), tx = -Math.sin(th) * dir, tz = Math.cos(th) * dir, flap = Math.sin(time * g.f + g.ph) * 0.6;
          P.set(48 + Math.cos(th) * g.R, 10 + g.h + Math.sin(time * 0.5 + g.ph) * 1.5, PZ + Math.sin(th) * g.R); Q.setFromAxisAngle(Y, Math.atan2(-tz, tx)); K = 1.7;
          put(gBody, i, 0, 0, 0, 1.2, 0.4, 0.45); put(gHead, i, 0.6, 0.12, 0, 0.36, 0.34, 0.34);
          for (let s = 0; s < 2; s++) { const sg = s ? 1 : -1; Q2.setFromAxisAngle(X, -sg * flap); put(gWing, i * 2 + s, 0, 0.05 + Math.abs(Math.sin(flap)) * 0.2 * 0 + sg * 0 , sg * 0.62 * Math.cos(flap), 0.5, 0.04, 1.25, Q2); }
        }
        flag(gBody, gHead, gWing);
      }

      // ---- 2. penguins: a slow tumble, a drift round the road, an unsure size, flippers going
      if (uu < 0.42) {
        for (let i = 0; i < NP; i++) {
          const p = peng[i]; K = p.s * (1 + 0.18 * wild * Math.sin(time * p.f * 2 + p.ph));
          Q.setFromAxisAngle(p.ax, time * p.w + p.ph);
          const an = time * 0.03 * p.dr, cx = p.x * Math.cos(an) - p.y * Math.sin(an), cy = p.x * Math.sin(an) + p.y * Math.cos(an) + Math.sin(time * 0.4 + p.ph) * 0.8;
          P.set(cx, cy, p.z);
          put(pBody, i, 0, 0, 0, 1, 1, 1); put(pBelly, i, 0, -0.06, 0.13, 0.58, 0.8, 0.52); put(pHead, i, 0, 0.56, 0.03, 0.5, 0.48, 0.5); put(pFace, i, 0, 0.53, 0.17, 0.36, 0.3, 0.2);
          put(pBeak, i, 0, 0.5, 0.36, 0.13, 0.26, 0.13, QX90);
          const flap = 0.5 + 0.4 * Math.sin(time * 3 * p.f + p.ph);
          for (let s = 0; s < 2; s++) { const sg = s ? 1 : -1; Q2.setFromAxisAngle(Z, sg * flap);
            put(pEye, i * 2 + s, sg * 0.1, 0.6, 0.24, 0.07, 0.07, 0.05); put(pFlip, i * 2 + s, sg * (0.36 + 0.14 * Math.sin(flap)), 0.08, 0, 0.1, 0.66, 0.3, Q2); put(pFoot, i * 2 + s, sg * 0.15, -0.6, 0.12, 0.2, 0.07, 0.34); }
        }
        flag(pBody, pBelly, pHead, pFace, pBeak, pEye, pFlip, pFoot);
      }
      tvMat.color.setScalar(0.85 + 0.15 * Math.sin(time * 31) * Math.sin(time * 7.3));

      // ---- 4. tea: every cup falls with its saucer a little way under it, round and round the tunnel's height
      if (uu > 0.2 && uu < 0.6) {
        for (let i = 0; i < NC; i++) {
          const c = cups[i]; K = c.s * (1 + 0.16 * wild * Math.sin(time * c.f * 2 + c.ph));
          Q.setFromAxisAngle(c.ax, Math.sin(time * c.w + c.ph) * 0.9);
          P.set(c.x, 75 - ((c.y0 + time * c.v) % 150), c.z);
          const sep = 0.12 + 0.35 * wild * (0.5 + 0.5 * Math.sin(time * c.f + c.ph));
          put(cCup, i, 0, 0, 0, 1, 1, 1); put(cSaucer, i, 0, -0.08 - sep, 0, 1, 1, 1); put(cHandle, i, 0.56, 0.27, 0, 1, 1, 1); put(cTea, i, 0, 0.4, 0, 0.86, 0.86, 0.86, QXm90);
        }
        flag(cCup, cSaucer, cHandle, cTea);
        teaStuff.rotation.z = time * 0.02;
        for (const r of ribbons) { r.m.rotation.y = time * r.w + r.ph; r.m.rotation.z = Math.sin(time * 0.3 + r.ph) * 0.4; }
      }

      // ---- 5. doors swing open and shut
      if (uu > 0.3 && uu < 0.65) {
        for (let i = 0; i < ND; i++) { const d = fDoors[i], ang = d.max * (0.5 + 0.5 * Math.sin(time * d.f + d.ph));
          M2.makeRotationY(-ang).premultiply(d.A); M.multiplyMatrices(M2, LEAF_C); fLeaf.setMatrixAt(i, M); M.multiplyMatrices(M2, KNOB_C); fKnob.setMatrixAt(i, M); }
        flag(fLeaf, fKnob);
        for (const d of doors) d.hinge.rotation.y = -d.max * (0.5 + 0.5 * Math.sin(time * d.f + d.ph));
      }

      // ---- 6. the duck turns, its ring and moons go round
      duck.rotation.y = time * 0.08; duckRing.rotation.y = time * 0.05;
      for (const d of ducklings) { const an = time * d.w + d.ph; d.d.position.set(Math.cos(an) * d.r, 1.2 + Math.sin(time * 1.3 + d.bob) * 0.5, Math.sin(an) * d.r); d.d.rotation.y = -an; }

      // ---- 7. clocks drip
      for (let i = 0; i < drips.length; i++) { const d = drips[i], f = (time * d.v + d.ph) % 1; M.makeScale(d.s * (1 - f * 0.6), d.s * (1.6 - f * 0.6), d.s * (1 - f * 0.6)).setPosition(d.at.x, d.at.y - f * f * 14, d.at.z); dripMesh.setMatrixAt(i, M); }
      flag(dripMesh);

      // ---- 9. the long fall, far off
      const wy = 95 - ((time * 6 + 40) % 190);
      whale.position.set(-92, wy, -1700); whale.rotation.set(time * 0.11, 0.6 + time * 0.05, 0.35 + Math.sin(time * 0.2) * 0.3);
      petunias.position.set(-70, wy + 16, -1672); petunias.rotation.set(time * 0.5, time * 0.3, 0.4);

      // ---- 10. the doors of the ship sigh open as we come, and close behind
      const o1 = ss(0.845, 0.892, uu), o2 = ss(0.915, 0.94, uu);
      doorL.position.x = -3.5 - o1 * 7.3; doorR.position.x = 3.5 + o1 * 7.3; innerL.position.x = -3.5 - o2 * 7.3; innerR.position.x = 3.5 + o2 * 7.3;
      doorGlow.color.setRGB(0.3 + o1 * 0.2, 1.2 + o1 * 0.8, 0.5 + o1 * 0.4);
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
