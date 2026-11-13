// OUTSIDE THE ASYLUM. Wonko the Sane's house on a Pacific beach in the gold of late afternoon, built inside out: wallpaper,
// bookshelves, pictures, a fireplace and carpets with armchairs are on the OUTSIDE of its four roofless walls, and within them
// are rough brick, gutters, drainpipes, a mown lawn and a garden path to a front door that faces inward. So the whole world is
// inside the asylum, and the little walled lawn is the only place outside it.
// The flight: in low over the surf, once round the house reading its "interior", up over the seaward wall into the "exterior",
// and out by the inward-facing front door, where the portal stands.
// Layout: house at the origin, 40 m square, walls 14 m tall (everything is about three times life size so the flight has room);
// the sea lies to +Z, the dunes to -Z, the sun is low in the west (-X).
import * as THREE from 'three';
import { makePath, makeNoise, smoothstep } from '../kit/core.js';

const HALF = 20, WALL_H = 14, WALL_T = 1, SEA_Y = -0.8;
const PTS = [[30, 5, 230], [30, 5, 170], [48, 7, 86], [42, 9, 22], [38, 10, -26], [4, 12, -44], [-36, 13, -28], [-40, 16, 8],
  [-26, 20, 34], [-8, 19, 23], [0, 10, 7], [0, 4.5, -5], [0, 4.5, -18.4]];

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export default {
  id: 'outside-the-asylum',
  name: 'Outside the Asylum',
  category: 'books',
  placeKind: 'domestic',
  book: 'So Long, and Thanks for All the Fish',
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.65,
  async build(ctx) {
    const { rng } = ctx, detail = ctx.quality?.detail ?? 1;
    const noise = makeNoise(Math.floor(rng() * 1e9));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f3cfa4');
    scene.fog = new THREE.Fog('#f1c79c', 400, 5200);
    const path = makePath(PTS);

    // ---- light: a low warm sun in the west, a cool sky above, warm sand below
    const SUN = new THREE.Vector3(-0.82, 0.27, 0.5).normalize();
    const hemi = new THREE.HemisphereLight('#bcd2f5', '#c99a66', 1.5);
    const sun = new THREE.DirectionalLight('#ffd09a', 3.2); sun.position.copy(SUN).multiplyScalar(1000);
    scene.add(hemi, sun, sun.target);

    // ---- sky: a back-side dome with a gradient, a sun disc and its glow
    {
      const g = new THREE.SphereGeometry(7000, 48, 24), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
      const zen = new THREE.Color('#3f74c4'), mid = new THREE.Color('#9fc0e6'), hor = new THREE.Color('#ffd7a4'), glow = new THREE.Color('#fff0c8'), c = new THREE.Color(), v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).normalize();
        const e = Math.max(0, v.y);
        c.copy(hor).lerp(mid, smoothstep(0, 0.22, e)).lerp(zen, smoothstep(0.18, 0.85, e));
        const near = Math.max(0, v.dot(SUN)); c.lerp(glow, Math.pow(near, 6) * 0.85);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
      const disc = new THREE.Mesh(new THREE.CircleGeometry(170, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.7), fog: false }));
      disc.position.copy(SUN).multiplyScalar(6500); disc.lookAt(0, 0, 0); scene.add(disc);
      // a few long thin clouds lit from below
      const cm = new THREE.MeshBasicMaterial({ color: '#ffe2c0', transparent: true, opacity: 0.55, fog: false, depthWrite: false });
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), cm);
        const a = rng.range(0, Math.PI * 2), r = rng.range(3200, 5200);
        m.position.set(Math.cos(a) * r, rng.range(900, 1700), Math.sin(a) * r); m.scale.set(rng.range(700, 1400), rng.range(30, 60), rng.range(180, 320)); m.rotation.y = rng.range(0, 3);
        scene.add(m);
      }
    }
    await ctx.yield();

    // ---- the beach: flat under the house, dunes inland, sloping into the sea
    const ground = (x, z) => {
      const d = Math.hypot(x, z);
      const dune = (noise.fbm2(x * 0.011, z * 0.011, 3) * 2.6 + 1.8) * smoothstep(50, 120, d) * smoothstep(40, -70, z);
      const hills = smoothstep(260, 1100, -z) * (55 + 30 * noise.fbm2(x * 0.002, z * 0.002, 3));
      const ripple = noise.n2(x * 0.08, z * 0.3) * 0.12 * smoothstep(30, 60, d);
      return dune + hills + ripple - smoothstep(60, 150, z) * 3.2 - smoothstep(150, 500, z) * 12;
    };
    {
      const g = new THREE.PlaneGeometry(2600, 2600, 180, 180); g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
      const dry = new THREE.Color('#e3c48f'), wet = new THREE.Color('#9c7c55'), grass = new THREE.Color('#a9a468'), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), y = ground(x, z); pos.setY(i, y);
        c.copy(dry).multiplyScalar(0.92 + 0.12 * noise.n2(x * 0.05, z * 0.05));
        c.lerp(wet, smoothstep(0.6, -0.9, y) * smoothstep(40, 70, z));
        c.lerp(grass, smoothstep(3, 30, y) * 0.7);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })));
    }
    await ctx.yield();

    // ---- the sea: a long swell, glitter toward the sun, foam lines that run up the sand
    const seaU = { uTime: { value: 0 }, uSun: { value: SUN }, uFog: { value: new THREE.Color('#f1c79c') } };
    {
      const g = new THREE.PlaneGeometry(14000, 7000, 220, 160); g.rotateX(-Math.PI / 2);
      const m = new THREE.ShaderMaterial({
        uniforms: seaU,
        vertexShader: /* glsl */`
          uniform float uTime; varying vec3 vW; varying float vH;
          float swell(vec2 p) { return sin(p.y * 0.055 + uTime * 0.9) * 0.45 + sin(p.y * 0.021 - p.x * 0.012 + uTime * 0.55) * 0.5 + sin(p.x * 0.09 + p.y * 0.13 + uTime * 1.6) * 0.12; }
          void main() { vec4 w = modelMatrix * vec4(position, 1.0); float k = smoothstep(80.0, 200.0, w.z); vH = swell(w.xz) * k; w.y += vH; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */`
          uniform float uTime; uniform vec3 uSun; uniform vec3 uFog; varying vec3 vW; varying float vH;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
          void main() {
            vec3 V = normalize(cameraPosition - vW);
            float n1 = vnoise(vW.xz * 0.35 + uTime * vec2(0.3, 0.5)), n2 = vnoise(vW.xz * 1.3 - uTime * vec2(0.5, 0.2));
            vec3 N = normalize(vec3((n1 - 0.5) * 0.5 + cos(vW.z * 0.055 + uTime * 0.9) * 0.05, 1.0, (n2 - 0.5) * 0.5));
            float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
            vec3 deep = vec3(0.03, 0.18, 0.30), shallow = vec3(0.16, 0.50, 0.52), sky = vec3(0.86, 0.74, 0.62);
            float shore = smoothstep(260.0, 90.0, vW.z);
            vec3 col = mix(deep, shallow, shore * 0.8 + vH * 0.15);
            col = mix(col, sky, fres * 0.75);
            float spec = pow(max(dot(reflect(-uSun, N), V), 0.0), 90.0); col += vec3(1.0, 0.82, 0.55) * spec * 2.2;
            float glit = pow(max(dot(normalize(uSun + V), N), 0.0), 240.0) * step(0.55, n2); col += vec3(1.0, 0.9, 0.7) * glit * 3.0;
            // foam: three lines that run in and die on the sand, and a ragged edge at the shore
            float run = fract(vW.z * 0.022 + uTime * 0.11 + n1 * 0.25);
            float foam = smoothstep(0.86, 1.0, run) * shore * smoothstep(0.25, 0.7, n2 + shore * 0.4);
            foam += smoothstep(112.0, 96.0, vW.z + sin(uTime * 0.6 + vW.x * 0.03) * 6.0 + n1 * 8.0) * 0.9;
            col = mix(col, vec3(1.0, 0.97, 0.92), clamp(foam, 0.0, 1.0));
            float d = length(cameraPosition - vW); col = mix(col, uFog, smoothstep(400.0, 5200.0, d));
            gl_FragColor = vec4(col, 1.0);
          }`,
      });
      const sea = new THREE.Mesh(g, m); sea.position.set(0, SEA_Y, 3560); scene.add(sea);
    }
    await ctx.yield();

    // ---- textures
    const wallpaper = (a, b, dot) => canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = b;
      for (let i = 0; i < 4; i++) x.fillRect(i * 64 + 8, 0, 20, h);
      x.fillStyle = dot;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(i * 64 + 46, j * 64 + (i % 2) * 32 + 16, 6, 0, 7); x.fill(); x.fillRect(i * 64 + 45, j * 64 + (i % 2) * 32 + 20, 2, 16); }
    }, [10, 3.5]);
    const PAPERS = [wallpaper('#e9dcc0', '#b9c7a2', '#a0553e'), wallpaper('#e6d3c4', '#c79a8a', '#5e6f8a'), wallpaper('#dfe3d2', '#9fb4b8', '#b08a3a'), wallpaper('#eadfb5', '#d0b06a', '#6b7f4c')];
    const brick = canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = '#b9ae9c'; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) {
        const v = 110 + Math.floor(rng() * 50); x.fillStyle = `rgb(${v + 40},${Math.floor(v * 0.55)},${Math.floor(v * 0.42)})`;
        x.fillRect(c * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28);
      }
    }, [14, 7]);
    const lawnTex = canvasTex(128, 128, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#5f9a3c' : '#6fae45'; x.fillRect(i * 16, 0, 16, h); } }, [3, 1]);
    const rugTex = (a, b, c2) => canvasTex(256, 128, (x, w, h) => {
      x.fillStyle = a; x.fillRect(0, 0, w, h); x.strokeStyle = b; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20); x.strokeStyle = c2; x.lineWidth = 3; x.strokeRect(24, 24, w - 48, h - 48);
      x.fillStyle = b; for (let i = 0; i < 5; i++) { x.save(); x.translate(48 + i * 40, h / 2); x.rotate(Math.PI / 4); x.fillRect(-11, -11, 22, 22); x.restore(); }
    });
    const art = () => canvasTex(128, 96, (x, w, h) => {
      const sky = rng.pick(['#89b6e0', '#f0b47a', '#c7d7e8', '#e89a8a']), land = rng.pick(['#4f7a4a', '#7a5a3a', '#34587a', '#8a8f4a']);
      x.fillStyle = sky; x.fillRect(0, 0, w, h); x.fillStyle = '#fff3c4'; x.beginPath(); x.arc(rng.range(20, 108), rng.range(18, 40), 10, 0, 7); x.fill();
      x.fillStyle = land; x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= 8; i++) x.lineTo(i * 16, 50 + rng.range(-14, 14)); x.lineTo(w, h); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(0, 70, w, 4);
    });
    const sign = canvasTex(512, 128, (x, w, h) => {
      x.fillStyle = '#f2ead6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2d3a2c'; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12);
      x.fillStyle = '#2d3a2c'; x.font = 'bold 64px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('COME OUTSIDE', w / 2, h / 2 + 4);
    });

    const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
    const wood = M('#6b4526'), darkWood = M('#3f2715'), cream = M('#efe6d2'), brass = M('#c9a24a', { metalness: 0.8, roughness: 0.35 });
    const lampGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.9) });
    const box = (parent, w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
    const house = new THREE.Group(); scene.add(house);

    // ---- decor that hangs on a wall. Local frame of a wall group: x along it, y up, +z outward (the "indoor" side), -z into the yard
    const F = WALL_T / 2;      // the outer face
    function bookshelf(g, x, w, h) {
      box(g, w, h, 0.25, x, h / 2 + 0.6, F + 0.12, darkWood);
      box(g, 0.3, h, 1.3, x - w / 2, h / 2 + 0.6, F + 0.65, wood); box(g, 0.3, h, 1.3, x + w / 2, h / 2 + 0.6, F + 0.65, wood);
      const rows = Math.floor(h / 1.9), mats = [], cols = [], dm = new THREE.Object3D(), c = new THREE.Color();
      for (let r = 0; r <= rows; r++) {
        const y = 0.6 + r * (h / rows); box(g, w, 0.2, 1.3, x, y, F + 0.65, wood);
        if (r === rows) break;
        for (let bx = x - w / 2 + 0.35; bx < x + w / 2 - 0.5;) {
          if (rng.chance(0.08)) { bx += rng.range(0.4, 1.2); continue; }
          const bw = rng.range(0.16, 0.38), bh = rng.range(1.0, 1.55), lean = rng.chance(0.07) ? rng.range(-0.2, 0.2) : 0;
          dm.position.set(bx + bw / 2, y + 0.1 + bh / 2, F + 0.6); dm.rotation.set(0, 0, lean); dm.scale.set(bw, bh, rng.range(0.8, 1.0)); dm.updateMatrix();
          mats.push(dm.matrix.clone()); cols.push(c.setHSL(rng(), rng.range(0.3, 0.7), rng.range(0.25, 0.55)).clone()); bx += bw + 0.02;
        }
      }
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M('#ffffff', { roughness: 0.7 }), mats.length);
      mats.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, cols[i]); }); g.add(im);
    }
    function picture(g, x, y, w, h) {
      box(g, w + 0.5, h + 0.5, 0.2, x, y, F + 0.1, rng.chance(0.5) ? brass : darkWood);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: art(), roughness: 0.6 })); p.position.set(x, y, F + 0.22); g.add(p);
    }
    function sconce(g, x, y) {
      box(g, 0.25, 0.9, 0.5, x, y - 0.5, F + 0.25, brass);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.75, 1.0, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#fff0cf', emissive: '#ffb860', emissiveIntensity: 1.6, side: THREE.DoubleSide })); s.position.set(x, y + 0.3, F + 0.6); g.add(s);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampGlow); b.position.set(x, y + 0.2, F + 0.6); g.add(b);
    }
    function fireplace(g, x) {
      box(g, 7, 6, 1.2, x, 3, F + 0.6, cream); box(g, 8, 0.4, 1.7, x, 6.2, F + 0.8, wood);
      box(g, 4, 3.6, 0.3, x, 1.8, F + 1.1, M('#15100c'));
      const fire = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.2, 0.3) })); fire.position.set(x, 1.3, F + 1.2); g.add(fire);
      const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 20), brass); clock.rotation.x = Math.PI / 2; clock.position.set(x, 7.3, F + 0.8); g.add(clock);
      return fire;
    }
    function windowOut(g, x, y) {      // on the yard side: a window as seen from outside a house, with a flower box
      box(g, 4.6, 5.6, 0.2, x, y, -F - 0.1, cream); box(g, 4, 5, 0.1, x, y, -F - 0.2, M('#27333f', { roughness: 0.15, metalness: 0.4 }));
      box(g, 0.15, 5, 0.15, x, y, -F - 0.28, cream); box(g, 4, 0.15, 0.15, x, y, -F - 0.28, cream);
      box(g, 4.8, 0.7, 0.8, x, y - 3.2, -F - 0.4, M('#8a4f33'));
      for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), M(rng.pick(['#e2486a', '#f2c040', '#b45ad0', '#f08a3a']))); f.position.set(x - 2 + i * 0.5, y - 2.7 + rng.range(0, 0.3), -F - 0.5); g.add(f); }
    }

    // ---- the four walls: wallpaper outward, brick inward
    const brickMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95 }), capMat = M('#9a917f');
    const WALLS = [{ name: 'south', p: [0, HALF], r: 0 }, { name: 'east', p: [HALF, 0], r: Math.PI / 2 }, { name: 'north', p: [0, -HALF], r: Math.PI }, { name: 'west', p: [-HALF, 0], r: -Math.PI / 2 }];
    let fire = null, northG = null;
    WALLS.forEach((w, i) => {
      const g = new THREE.Group(); g.position.set(w.p[0], 0, w.p[1]); g.rotation.y = w.r; house.add(g);
      const paper = new THREE.MeshStandardMaterial({ map: PAPERS[i], roughness: 0.9 });
      const len = HALF * 2 + WALL_T;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H, WALL_T), [capMat, capMat, capMat, capMat, paper, brickMat]); wall.position.y = WALL_H / 2; g.add(wall);
      box(g, len, 0.7, 0.2, 0, 0.35, F + 0.1, cream);                 // skirting board
      box(g, len, 0.25, 0.2, 0, 11.4, F + 0.1, cream);                // picture rail
      box(g, len, 0.6, 0.35, 0, WALL_H - 0.3, F + 0.18, cream);       // cornice
      box(g, len - 2, 0.45, 0.6, 0, WALL_H - 0.5, -F - 0.3, M('#2f3a36', { metalness: 0.5, roughness: 0.5 }));   // guttering, on the yard side
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, WALL_H - 0.6, 10), M('#2f3a36', { metalness: 0.5, roughness: 0.5 })); pipe.position.set(HALF - 1.4, (WALL_H - 0.6) / 2, -F - 0.3); g.add(pipe);
      if (w.name === 'south') {
        bookshelf(g, -12, 9, 10); fire = fireplace(g, 10); picture(g, -1.5, 7.5, 5, 3.6); sconce(g, 3.6, 8); sconce(g, 16.4, 8); picture(g, 10, 10.0, 2.4, 1.8);
        windowOut(g, -9, 7); windowOut(g, 9, 7);
      } else if (w.name === 'north') {
        bookshelf(g, 11, 8, 9); bookshelf(g, -11, 8, 9); picture(g, 0, 7, 6, 4.2); sconce(g, -4.5, 8.5); sconce(g, 4.5, 8.5);
        northG = g;
      } else {
        bookshelf(g, w.name === 'east' ? -11 : 12, 8, 10);
        for (let k = 0; k < 3; k++) picture(g, (w.name === 'east' ? 2 : -14) + k * 5.5, 7 + (k % 2) * 1.2, 3.4, 2.6);
        sconce(g, w.name === 'east' ? 17.5 : -17.5, 8); windowOut(g, 0, 7);
        if (w.name === 'west') { box(g, 4.4, 6.4, 0.2, 5, 6.5, F + 0.1, brass); box(g, 3.8, 5.8, 0.1, 5, 6.5, F + 0.2, M('#cfe0ea', { metalness: 1, roughness: 0.05 })); }   // a mirror
      }
    });
    await ctx.yield();

    // ---- the front door, facing inward on the north wall, with its sign; the portal stands in it
    {
      const g = northG, zf = -F;
      box(g, 0.6, 9.4, 0.7, -3.1, 4.7, zf - 0.35, cream); box(g, 0.6, 9.4, 0.7, 3.1, 4.7, zf - 0.35, cream); box(g, 7.4, 0.7, 0.9, 0, 9.4, zf - 0.4, cream);
      box(g, 5.6, 8.9, 0.15, 0, 4.5, zf - 0.08, M('#1d4b3a', { roughness: 0.5 }));      // the door behind the opening
      box(g, 8, 0.35, 2.4, 0, 0.18, zf - 1.2, M('#a39c8c'));                             // the step
      const s = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 })); s.rotation.y = Math.PI; s.position.set(0, 11, zf - 0.12); g.add(s);
      for (const sx of [-4.2, 4.2]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), lampGlow); l.position.set(sx, 8, zf - 0.6); g.add(l); box(g, 0.2, 0.2, 0.7, sx, 8.4, zf - 0.3, brass); }
    }

    // ---- the yard (the only "outside"): mown lawn, a garden path, flower beds, a bird bath
    {
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 - WALL_T, HALF * 2 - WALL_T), new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.06; house.add(lawn);
      const stone = M('#b8b0a0', { roughness: 0.9 }), dm = new THREE.Object3D();
      const pav = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.14, 1), stone, 26);
      for (let i = 0; i < 26; i++) { dm.position.set((i % 2 ? 0.9 : -0.9) + rng.range(-0.15, 0.15), 0.12, 14 - Math.floor(i / 2) * 2.5); dm.rotation.set(0, rng.range(-0.15, 0.15), 0); dm.scale.set(1.6, 1, 2.0); dm.updateMatrix(); pav.setMatrixAt(i, dm.matrix); }
      house.add(pav);
      const n = Math.round(420 * detail), fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 7, 5), M('#ffffff'), n), c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const side = rng.int(0, 2), t = rng.range(-HALF + 2.5, HALF - 2.5), off = HALF - 1.6 - rng.range(0, 1.6);
        const x = side === 0 ? off : side === 1 ? -off : t, z = side === 2 ? off : t;
        dm.position.set(x, rng.range(0.4, 1.3), z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(rng.range(0.7, 1.4)); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix);
        fl.setColorAt(i, rng.chance(0.4) ? c.set('#4f8a3a') : c.set(rng.pick(['#e2486a', '#f2c040', '#b45ad0', '#ffffff', '#f08a3a'])));
      }
      house.add(fl);
      const bath = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 2.6, 12), stone); bath.position.set(9, 1.3, 5); house.add(bath);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.0, 0.5, 20), stone); bowl.position.set(9, 2.8, 5); house.add(bowl);
      const wtr = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), M('#6fb4d8', { roughness: 0.05, metalness: 0.3 })); wtr.rotation.x = -Math.PI / 2; wtr.position.set(9, 3.06, 5); house.add(wtr);
    }
    await ctx.yield();

    // ---- the "room" laid on the sand: carpets, armchairs, a table with five glass fishbowls, a standard lamp
    function armchair(x, z, ry, color) {
      const g = new THREE.Group(), m = M(color, { roughness: 0.95 });
      box(g, 3.6, 1.2, 3.4, 0, 1.3, 0, m); box(g, 3.6, 3.4, 0.9, 0, 3.0, -1.5, m); box(g, 0.8, 1.5, 3.4, -1.9, 2.3, 0, m); box(g, 0.8, 1.5, 3.4, 1.9, 2.3, 0, m);
      for (const sx of [-1.5, 1.5]) for (const sz of [-1.4, 1.4]) box(g, 0.3, 0.7, 0.3, sx, 0.35, sz, darkWood);
      g.position.set(x, 0.1, z); g.rotation.y = ry; scene.add(g);
    }
    const bowls = [];
    {
      const rugS = new THREE.Mesh(new THREE.BoxGeometry(34, 0.12, 13), [M('#7a2f2a'), M('#7a2f2a'), new THREE.MeshStandardMaterial({ map: rugTex('#8e2f2c', '#e2c58a', '#23405c'), roughness: 1 }), M('#7a2f2a'), M('#7a2f2a'), M('#7a2f2a')]); rugS.position.set(0, 0.07, HALF + 8); scene.add(rugS);
      const rugE = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 26), [M('#23405c'), M('#23405c'), new THREE.MeshStandardMaterial({ map: rugTex('#2c4a6a', '#e8d9b0', '#a0553e'), roughness: 1 }), M('#23405c'), M('#23405c'), M('#23405c')]); rugE.position.set(HALF + 7, 0.07, 0); scene.add(rugE);
      armchair(13, HALF + 9, Math.PI + 0.45, '#7f8f5a'); armchair(4, HALF + 10.5, Math.PI - 0.25, '#a0553e'); armchair(HALF + 7.5, 6, -Math.PI / 2, '#c9a24a');
      // the table and the five bowls
      const top = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.25, 28), wood); top.position.set(-7, 2.9, HALF + 8.5); scene.add(top);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 2.8, 12), darkWood); leg.position.set(-7, 1.4, HALF + 8.5); scene.add(leg);
      const glass = new THREE.MeshStandardMaterial({ color: '#e6f4ff', transparent: true, opacity: 0.32, roughness: 0.03, metalness: 0.1, depthWrite: false });
      const water = new THREE.MeshStandardMaterial({ color: '#8fd0e8', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false });
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + 0.3, bx = -7 + Math.cos(a) * 1.9, bz = HALF + 8.5 + Math.sin(a) * 1.9;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.85, 22, 16, 0, Math.PI * 2, 0.5, Math.PI), glass); b.position.set(bx, 3.86, bz); scene.add(b);
        const wv = new THREE.Mesh(new THREE.SphereGeometry(0.76, 18, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI), water); wv.position.copy(b.position); scene.add(wv);
        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lampGlow); glint.position.set(bx - 0.6, 4.25, bz + 0.35); scene.add(glint); bowls.push(glint);
      }
      // the standard lamp
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 8), brass); pole.position.set(HALF + 10.5, 3.5, -8); scene.add(pole);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.25, 16), brass); foot.position.set(HALF + 10.5, 0.2, -8); scene.add(foot);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.7, 1.8, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#f6e4bd', emissive: '#ffb860', emissiveIntensity: 1.3, side: THREE.DoubleSide })); shade.position.set(HALF + 10.5, 7.4, -8); scene.add(shade);
      const hearth = new THREE.PointLight('#ff9a4a', 60, 40, 2); hearth.position.set(10, 3, HALF + 3); scene.add(hearth);
    }
    await ctx.yield();

    // ---- dune grass
    {
      const n = Math.round(5200 * detail), blade = new THREE.ConeGeometry(0.09, 1, 4); blade.translate(0, 0.5, 0);
      const im = new THREE.InstancedMesh(blade, M('#ffffff', { roughness: 1 }), n), dm = new THREE.Object3D(), c = new THREE.Color();
      let k = 0;
      for (let t = 0; t < n * 6 && k < n; t++) {
        const x = rng.range(-520, 520), z = rng.range(-520, 66), d = Math.hypot(x, z);
        if (d < 58 || noise.fbm2(x * 0.02 + 9, z * 0.02, 2) < 0.05) continue;
        const cx = x + rng.range(-1, 1), cz = z + rng.range(-1, 1);
        dm.position.set(cx, ground(cx, cz) - 0.05, cz); dm.rotation.set(rng.range(-0.35, 0.35), rng.range(0, 6.28), rng.range(-0.35, 0.35)); dm.scale.set(1.6, rng.range(1.4, 3.6), 1.6); dm.updateMatrix();
        im.setMatrixAt(k, dm.matrix); im.setColorAt(k, c.setHSL(rng.range(0.15, 0.24), rng.range(0.3, 0.5), rng.range(0.38, 0.6))); k++;
      }
      im.count = k; scene.add(im);
    }
    await ctx.yield();

    // ---- gulls, wheeling over the surf (well above and seaward of the route)
    const gulls = [];
    {
      const wing = new THREE.BufferGeometry();
      wing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -0.35, 2.6, 0, 0.1, 0, 0, 0.45, 0, 0, -0.35, 0, 0, 0.45, 2.6, 0, 0.1]), 3)); wing.computeVertexNormals();
      const gm = new THREE.MeshStandardMaterial({ color: '#f6f3ea', side: THREE.DoubleSide, roughness: 0.9 });
      for (let i = 0; i < 9; i++) {
        const g = new THREE.Group(), L = new THREE.Mesh(wing, gm), R = new THREE.Mesh(wing, gm); R.scale.x = -1; g.add(L, R);
        box(g, 0.35, 0.3, 1.5, 0, 0, 0, gm);
        scene.add(g);
        gulls.push({ g, L, R, cx: rng.range(-160, 160), cz: rng.range(130, 300), r: rng.range(28, 70), y: rng.range(30, 60), w: rng.range(0.12, 0.25) * rng.sign(), ph: rng.range(0, 6.28) });
      }
    }

    function update(dt, time) {
      seaU.uTime.value = time;
      for (const b of gulls) {
        const a = b.ph + time * b.w;
        b.g.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 2.3) * 2, b.cz + Math.sin(a) * b.r);
        b.g.rotation.set(0, -a + (b.w > 0 ? Math.PI : 0), (b.w > 0 ? -1 : 1) * 0.3);
        const f = Math.sin(time * 3.1 + b.ph) * 0.35 + 0.1; b.L.rotation.z = f; b.R.rotation.z = -f;
      }
      if (fire) { fire.scale.y = 1 + Math.sin(time * 9) * 0.12 + Math.sin(time * 14.3) * 0.08; fire.rotation.y = time * 2; }
      for (let i = 0; i < bowls.length; i++) bowls[i].scale.setScalar(0.8 + 0.5 * Math.abs(Math.sin(time * 1.3 + i * 1.7)));
    }

    return {
      scene, path, duration: 45,
      camera: { fov: 62, near: 0.3, far: 9000, lookAhead: 20, sway: 0.3, bank: 0.15 },
      pois: [{ at: [0, 7, 0], from: 0.1, to: 0.7, weight: 0.5 }],
      portal: { shape: 'rect', width: 5, height: 8, color: '#fff4d8', glow: 0.4 },
      post: { exposure: 1.05, bloom: { strength: 0.35, radius: 0.8, threshold: 0.92 },
        grade: { saturation: 1.08, contrast: 1.04, vignette: 0.25, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() {},
    };
  },
};
