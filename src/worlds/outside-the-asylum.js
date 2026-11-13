// OUTSIDE THE ASYLUM. Wonko the Sane's house on a Pacific beach in the gold of late afternoon, built inside out. Its four roofless
// walls carry a home on their OUTER faces: a sitting room with a fire toward the sea, a music room and library on the east, a
// dining room and the inside of the front door on the north, a kitchen on the west, each with its rugs and furniture standing on
// the sand. Within the walls is the house's outside: brick, gutters, drainpipes, window boxes, a mown lawn, flower beds, a garden
// path and the front door, which faces inward. So the whole world is inside the asylum, and the walled lawn is the only place
// outside it. On a table by the surf stand five glass fishbowls, one of them engraved.
// The flight: in low over the surf past the bowls, once round the house reading its rooms, up over the seaward wall into the
// garden, and out by the inward-facing front door, where the portal stands.
// Layout: house at the origin, 40 m square, walls 14 m tall (everything is about three and a half times life size, so the flight
// has room); the sea lies to +Z, the dunes to -Z, the sun is low in the west (-X), a headland stands under it and a pier to the east.
// A wall's own frame (every wall group): x along the wall, y up, +z outward (the "indoor" side), -z into the garden.
import * as THREE from 'three';
import { makePath, makeNoise, smoothstep } from '../kit/core.js';

const HALF = 20, WALL_H = 14, WALL_T = 1, F = WALL_T / 2, SEA_Y = -0.8;
const BOWLS = [27, 52];      // the fishbowl table, on the map
const PTS = [[34, 5, 160], [34, 5, 120], [35, 6.5, 74], [40, 8.5, 44], [45, 10, 12], [40, 11, -28], [6, 12, -45], [-34, 13, -32],
  [-41, 16, 6], [-27, 20, 34], [-8, 19, 23], [0, 10, 7], [0, 4.5, -5], [0, 4.5, -18.4]];

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

const GLSL_COMMON = /* glsl */`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s / 0.9375; }
  vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
  // the sky as a mirror sees it: gold at the horizon, blue above, a glow round the sun
  vec3 skyMirror(vec3 d, vec3 sun) {
    float e = max(d.y, 0.0);
    vec3 c = mix(lin(vec3(0.99, 0.78, 0.55)), lin(vec3(0.42, 0.62, 0.88)), smoothstep(0.0, 0.55, e));
    return c + lin(vec3(1.0, 0.8, 0.5)) * pow(max(dot(normalize(d), sun), 0.0), 12.0) * 0.8;
  }
  // the beach's own slope into the sea (the script's ground(), seaward of the house)
  float beachY(float z) { return -3.2 * smoothstep(60.0, 150.0, z) - 12.0 * smoothstep(150.0, 500.0, z); }`;

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
    const FOG = new THREE.Color('#f2c592');
    scene.background = FOG.clone();
    scene.fog = new THREE.Fog(FOG, 500, 6200);
    const path = makePath(PTS);

    // ---- light: a low gold sun in the west, a cool sky above, warm sand below
    const SUN = new THREE.Vector3(-0.82, 0.24, 0.5).normalize();
    const hemi = new THREE.HemisphereLight('#a9c2ee', '#c08f5c', 1.25);
    const sun = new THREE.DirectionalLight('#ffbf7a', 3.4); sun.position.copy(SUN).multiplyScalar(1000);
    scene.add(hemi, sun, sun.target);
    const TU = { uTime: { value: 0 }, uSun: { value: SUN }, uFog: { value: FOG } };      // shared by every shader of ours

    // ---- the sky: a golden-hour dome with three layers of cloud and the sun's disc
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(7000, 48, 24), new THREE.ShaderMaterial({
      uniforms: TU, side: THREE.BackSide, depthWrite: false,
      vertexShader: /* glsl */`varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); }`,
      fragmentShader: GLSL_COMMON + /* glsl */`
        uniform float uTime; uniform vec3 uSun; uniform vec3 uFog; varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir); float e = d.y, ee = max(e, 0.0), sd = max(dot(d, uSun), 0.0);
          vec3 col = mix(uFog, lin(vec3(0.66, 0.78, 0.90)), smoothstep(0.0, 0.22, ee));
          col = mix(col, lin(vec3(0.20, 0.40, 0.74)), smoothstep(0.15, 0.85, ee));
          float az = max(dot(normalize(d.xz), normalize(uSun.xz)), 0.0);
          col = mix(col, lin(vec3(1.0, 0.70, 0.40)), pow(az, 3.0) * smoothstep(0.4, 0.0, ee) * 0.75);      // the warm band under the sun
          col += lin(vec3(1.0, 0.84, 0.58)) * pow(sd, 20.0) * 0.7;
          if (e > 0.004) {
            vec2 p = d.xz / (e + 0.12);
            float cirrus = smoothstep(0.50, 0.80, fbm(p * vec2(0.45, 1.7) + vec2(uTime * 0.004, 3.0))) * 0.6;
            float banks = smoothstep(0.50, 0.74, fbm(p * 0.8 + vec2(uTime * 0.007, 7.0))) * smoothstep(0.02, 0.10, e) * smoothstep(0.55, 0.22, e);
            float mackerel = smoothstep(0.56, 0.72, fbm(p * 2.7 + 11.0)) * smoothstep(0.25, 0.55, e) * 0.4;
            vec3 lit = mix(lin(vec3(1.0, 0.88, 0.74)), lin(vec3(1.0, 0.60, 0.36)), smoothstep(0.32, 0.0, ee)), shade = lin(vec3(0.50, 0.45, 0.58));
            float toSun = pow(sd, 2.0), fade = smoothstep(0.004, 0.06, e);
            col = mix(col, mix(shade, lit, 0.5 + 0.5 * toSun), clamp(cirrus + mackerel, 0.0, 1.0) * fade * 0.8);
            col = mix(col, mix(shade * 0.9, lit, 0.3 + 0.7 * toSun), banks * fade * 0.92);
          }
          col += vec3(7.0, 5.0, 2.6) * smoothstep(0.99925, 0.99965, dot(d, uSun));
          gl_FragColor = vec4(col, 1.0);
        }`,
    })));
    await ctx.yield();

    // ---- the beach: flat under the house, dunes inland, hills behind, sloping into the sea
    const ground = (x, z) => {
      const d = Math.hypot(x, z);
      const dune = (noise.fbm2(x * 0.011, z * 0.011, 3) * 2.6 + 1.8) * smoothstep(50, 120, d) * smoothstep(40, -70, z);
      const hills = smoothstep(260, 1100, -z) * (55 + 30 * noise.fbm2(x * 0.002, z * 0.002, 3));
      return dune + hills - smoothstep(60, 150, z) * 3.2 - smoothstep(150, 500, z) * 12;
    };
    {
      const sandTex = (rep) => canvasTex(256, 256, (x, w, h) => {
        x.fillStyle = '#f4f0ea'; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) { const v = 200 + Math.floor(rng() * 55); x.fillStyle = `rgba(${v},${v - 8},${v - 22},0.5)`; x.fillRect(rng() * w, rng() * h, 1.5, 1.5); }
        x.strokeStyle = 'rgba(150,120,80,0.16)'; x.lineWidth = 3;      // wind ripples
        for (let j = 0; j < 16; j++) { x.beginPath(); for (let i = 0; i <= 16; i++) { const px = i * 16, py = j * 16 + 6 + Math.sin(i * 0.8 + j * 1.7) * 3; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); }
      }, rep);
      const dry = new THREE.Color('#e7c48c'), pale = new THREE.Color('#f1dcae'), wet = new THREE.Color('#8f6f4c'), grass = new THREE.Color('#a8a165'), c = new THREE.Color();
      const sandMesh = (size, segs, cx, cz, rep, sink) => {
        const g = new THREE.PlaneGeometry(size[0], size[1], segs[0], segs[1]); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
        const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), z = pos.getZ(i), y = ground(x, z);
          pos.setY(i, y - (sink ? sink(x, z) : 0));
          c.copy(dry).lerp(pale, 0.5 + 0.5 * noise.fbm2(x * 0.02, z * 0.02, 2)).multiplyScalar(0.94 + 0.08 * noise.n2(x * 0.11, z * 0.11));
          c.lerp(wet, smoothstep(0.5, -0.9, y) * smoothstep(40, 70, z));
          c.lerp(grass, smoothstep(3, 30, y) * 0.7);
          col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
        scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: sandTex(rep), roughness: 0.95 })));
      };
      sandMesh([800, 800], [170, 170], 0, 40, [200, 200]);      // the near field, finely laid
      await ctx.yield();
      // the far field, coarse, sunk a little under the near one so the two never fight
      sandMesh([9000, 3200], [200, 120], 0, -800, [2250, 800], (x, z) => 0.45 * smoothstep(400, 350, Math.max(Math.abs(x), Math.abs(z - 40))));
    }
    await ctx.yield();

    // ---- the sea: swell, a sun road, foam lines that run in, and a swash that climbs the sand
    {
      const g = new THREE.PlaneGeometry(2, 1, 260, 200);      // one sheet, fine near the shore and abreast of the house, coarse far out
      { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const sx = p.getX(i), t = p.getY(i) + 0.5; p.setXYZ(i, 8000 * (0.04 * sx + 0.96 * sx ** 5), 0, 60 + 7000 * (0.06 * t + 0.94 * t ** 4)); } }
      const sea = new THREE.Mesh(g, new THREE.ShaderMaterial({
        uniforms: TU, side: THREE.DoubleSide,
        vertexShader: /* glsl */`
          uniform float uTime; varying vec3 vW; varying float vH;
          float swell(vec2 p) { return sin(p.y * 0.055 + uTime * 0.9) * 0.45 + sin(p.y * 0.021 - p.x * 0.012 + uTime * 0.55) * 0.55 + sin(p.x * 0.09 + p.y * 0.13 + uTime * 1.6) * 0.12; }
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vH = swell(w.xz) * smoothstep(96.0, 230.0, w.z);
            float near = smoothstep(280.0, 130.0, w.z) * smoothstep(90.0, 104.0, w.z);      // the rollers coming in
            w.y += pow(0.5 + 0.5 * sin(w.z * 0.14 + uTime * 1.1 + sin(w.x * 0.013) * 1.5), 5.0) * 0.42 * near;
            w.y += vH + (sin(uTime * 0.55 + w.x * 0.012) * 0.16 + sin(uTime * 0.31 + w.x * 0.031) * 0.07) * smoothstep(200.0, 100.0, w.z);      // the swash
            vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: GLSL_COMMON + /* glsl */`
          uniform float uTime; uniform vec3 uSun; uniform vec3 uFog; varying vec3 vW; varying float vH;
          void main() {
            float depth = vW.y - beachY(vW.z);
            if (depth < 0.0) discard;
            vec3 V = normalize(cameraPosition - vW);
            float n1 = vnoise(vW.xz * 0.30 + uTime * vec2(0.25, 0.45)), n2 = vnoise(vW.xz * 1.1 - uTime * vec2(0.45, 0.2)), n3 = vnoise(vW.xz * 3.1 + uTime * vec2(0.2, -0.6));
            vec3 N = normalize(vec3((n1 - 0.5) * 0.45 + (n3 - 0.5) * 0.25 + cos(vW.z * 0.055 + uTime * 0.9) * 0.05, 1.0, (n2 - 0.5) * 0.45 + (n3 - 0.5) * 0.2));
            float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
            vec3 deep = lin(vec3(0.04, 0.20, 0.36)), mid = lin(vec3(0.07, 0.40, 0.50)), shallow = lin(vec3(0.42, 0.70, 0.62));
            vec3 col = mix(shallow, mid, smoothstep(0.0, 1.6, depth)); col = mix(col, deep, smoothstep(1.2, 9.0, depth));
            col += lin(vec3(0.2, 0.5, 0.45)) * max(vH, 0.0) * 0.12;
            float near = smoothstep(280.0, 130.0, vW.z) * smoothstep(88.0, 100.0, vW.z);
            float crest = pow(0.5 + 0.5 * sin(vW.z * 0.14 + uTime * 1.1 + sin(vW.x * 0.013) * 1.5 + (n1 - 0.5) * 0.8), 5.0);
            col *= 0.82 + 0.5 * crest * near;      // each roller's face catches the light
            col = mix(col, skyMirror(reflect(-V, N), uSun), 0.06 + fres * 0.5);
            vec3 H = normalize(uSun + V);
            col += lin(vec3(1.0, 0.80, 0.52)) * pow(max(dot(N, H), 0.0), 140.0) * 2.4;
            col += lin(vec3(1.0, 0.90, 0.70)) * pow(max(dot(N, H), 0.0), 600.0) * step(0.5, n3) * 6.0;      // glitter
            // foam: lines that run in and break up, and the lace at the swash's edge
            float foam = smoothstep(0.72, 0.98, crest) * near * smoothstep(0.35, 0.8, n2 * 0.55 + n3 * 0.6);
            foam += smoothstep(0.3, 0.7, crest) * near * smoothstep(0.70, 0.95, n3) * 0.3;      // the lace a roller leaves behind it
            foam += smoothstep(0.6, 0.0, depth) * (0.5 + 0.5 * n3) + smoothstep(0.18, 0.0, depth);
            foam += smoothstep(0.75, 1.0, vH) * smoothstep(0.5, 0.8, n2) * 0.5;      // a whitecap here and there on the swell
            col = mix(col, lin(vec3(1.0, 0.96, 0.90)), clamp(foam, 0.0, 1.0) * 0.92);
            col = mix(col, uFog, smoothstep(500.0, 6200.0, length(cameraPosition - vW)));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }));
      sea.position.set(0, SEA_Y, 0); scene.add(sea);
      // wet sand: a sheet on the beach's own slope, dark where the swash has been and a mirror for the sky at a low angle
      const wg = new THREE.PlaneGeometry(800, 60, 160, 12); wg.rotateX(-Math.PI / 2); wg.translate(0, 0, 80);
      const wp = wg.attributes.position; for (let i = 0; i < wp.count; i++) wp.setY(i, ground(wp.getX(i), wp.getZ(i)) + 0.035);
      scene.add(new THREE.Mesh(wg, new THREE.ShaderMaterial({
        uniforms: TU, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
        vertexShader: /* glsl */`varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: GLSL_COMMON + /* glsl */`
          uniform float uTime; uniform vec3 uSun; varying vec3 vW;
          void main() {
            float n = vnoise(vW.xz * 0.06), edge = 76.0 + n * 7.0 + sin(vW.x * 0.02) * 2.0;
            float wetK = smoothstep(edge, edge + 7.0, vW.z) * smoothstep(400.0, 330.0, abs(vW.x));
            vec3 V = normalize(cameraPosition - vW), N = normalize(vec3((vnoise(vW.xz * 0.9) - 0.5) * 0.06, 1.0, 0.045));
            float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
            vec3 col = mix(lin(vec3(0.40, 0.30, 0.20)), skyMirror(reflect(-V, N), uSun), 0.10 + fres * 0.5);
            col += lin(vec3(1.0, 0.82, 0.55)) * pow(max(dot(N, normalize(uSun + V)), 0.0), 220.0) * 2.0;
            float a = wetK * (0.45 + 0.3 * fres);
            // the last wave's thin film, sliding up and back in step with the sea, with a rim of foam; and the lace older waves left
            float fe = 87.0 - 4.2 * sin(uTime * 0.55 + vW.x * 0.012) - 1.8 * sin(uTime * 0.31 + vW.x * 0.031) + (n - 0.5) * 5.0;
            float film = smoothstep(fe - 0.4, fe + 1.2, vW.z);
            col = mix(col, skyMirror(reflect(-V, N), uSun) * 0.95 + lin(vec3(0.10, 0.20, 0.20)) * 0.3, film * (0.4 + 0.55 * fres)); a = mix(a, 0.9, film);
            float h2 = vnoise(vW.xz * 1.9), rim = smoothstep(1.3, 0.0, abs(vW.z - fe - 0.3)) * (0.55 + 0.45 * h2);
            float lace = smoothstep(0.07, 0.0, abs(fract((vW.z + n * 16.0 + sin(vW.x * 0.07) * 2.0) * 0.14) - 0.5)) * smoothstep(0.45, 0.8, h2) * (1.0 - film) * wetK * 0.6;
            col = mix(col, lin(vec3(1.0, 0.96, 0.90)), clamp(rim + lace, 0.0, 1.0)); a = max(a, clamp(rim + lace, 0.0, 1.0) * wetK);
            col += lin(vec3(1.0, 0.9, 0.7)) * step(0.985, vnoise(vW.xz * 9.0)) * wetK * 0.6;      // grains that catch the sun
            gl_FragColor = vec4(col, a);
          }`,
      })));
    }
    await ctx.yield();

    // ---- textures
    const wallpaper = (a, b, mot) => canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = a; x.fillRect(0, 0, w, h);
      x.fillStyle = b; for (let i = 0; i < 4; i++) { x.fillRect(i * 64 + 4, 0, 24, h); }
      x.strokeStyle = mot; x.lineWidth = 1.5; for (let i = 0; i < 4; i++) { x.strokeRect(i * 64 + 4.5, -2, 24, h + 4); }
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {      // a sprig between the stripes
        const cx = i * 64 + 48, cy = j * 64 + (i % 2) * 32 + 20;
        x.fillStyle = mot; x.beginPath(); x.ellipse(cx, cy, 5, 9, 0, 0, 7); x.fill();
        x.beginPath(); x.ellipse(cx - 7, cy + 10, 3, 7, -0.7, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx + 7, cy + 10, 3, 7, 0.7, 0, 7); x.fill();
        x.fillRect(cx - 1, cy + 6, 2, 20); x.fillStyle = a; x.beginPath(); x.arc(cx, cy, 2, 0, 7); x.fill();
      }
    }, [10, 3.5]);
    const PAPERS = [wallpaper('#eadcc0', '#c2cfa8', '#9c4f3b'), wallpaper('#e8d5c8', '#cfa293', '#52648a'), wallpaper('#e0e4d4', '#a6bcc0', '#a8802f'), wallpaper('#f0e6c0', '#ddc27e', '#5f7d4a')];
    const PANELS = ['#7c8e6c', '#8a5b52', '#4f6a78', '#c9b074'];
    const brick = canvasTex(512, 512, (x, w, h) => {
      x.fillStyle = '#c9c0ae'; x.fillRect(0, 0, w, h);      // mortar
      for (let r = 0; r < 16; r++) for (let c = -1; c < 8; c++) {
        const v = 105 + Math.floor(rng() * 60), k = rng();
        x.fillStyle = k < 0.08 ? `rgb(${Math.floor(v * 0.6)},${Math.floor(v * 0.42)},${Math.floor(v * 0.4)})` : `rgb(${v + 45},${Math.floor(v * 0.56)},${Math.floor(v * 0.42)})`;
        const bx = c * 64 + (r % 2) * 32 + 3, by = r * 32 + 3; x.fillRect(bx, by, 58, 26);
        x.fillStyle = 'rgba(40,20,10,0.18)'; x.fillRect(bx, by + 22, 58, 4); x.fillStyle = 'rgba(255,220,190,0.14)'; x.fillRect(bx, by, 58, 3);
        for (let s = 0; s < 6; s++) { x.fillStyle = `rgba(${rng() < 0.5 ? '30,15,10' : '240,200,170'},0.2)`; x.fillRect(bx + rng() * 54, by + rng() * 22, 3, 2); }
      }
    }, [7, 3.5]);
    const lawnTex = canvasTex(128, 128, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#5c9a3a' : '#72b348'; x.fillRect(i * 16, 0, 16, h); } for (let i = 0; i < 700; i++) { x.fillStyle = rng() < 0.5 ? 'rgba(30,70,20,0.25)' : 'rgba(190,230,120,0.25)'; x.fillRect(rng() * w, rng() * h, 1, 3); } }, [2, 4]);
    const rugTex = (a, b, c2) => canvasTex(256, 128, (x, w, h) => {
      x.fillStyle = a; x.fillRect(0, 0, w, h); x.strokeStyle = b; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20); x.strokeStyle = c2; x.lineWidth = 3; x.strokeRect(24, 24, w - 48, h - 48);
      x.fillStyle = b; for (let i = 0; i < 5; i++) { x.save(); x.translate(48 + i * 40, h / 2); x.rotate(Math.PI / 4); x.fillRect(-11, -11, 22, 22); x.fillStyle = c2; x.fillRect(-5, -5, 10, 10); x.fillStyle = b; x.restore(); }
      for (let i = 0; i < 32; i++) { x.fillStyle = c2; x.fillRect(4 + i * 8, 2, 3, 5); x.fillRect(4 + i * 8, h - 7, 3, 5); }
    });
    const checker = canvasTex(64, 64, (x) => { x.fillStyle = '#f1ead8'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#2f3b3a'; x.fillRect(0, 0, 32, 32); x.fillRect(32, 32, 32, 32); }, [14, 4]);
    const tiles = canvasTex(128, 128, (x) => {
      x.fillStyle = '#b9c0bd'; x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i * 3 + j * 5) % 7 === 0 ? '#5d86a8' : '#f4f1e6'; x.fillRect(i * 32 + 1.5, j * 32 + 1.5, 29, 29); if ((i * 3 + j * 5) % 7 === 0) { x.fillStyle = '#f4f1e6'; x.beginPath(); x.arc(i * 32 + 16, j * 32 + 16, 7, 0, 7); x.fill(); } }
    }, [9, 2]);
    const art = () => canvasTex(128, 96, (x, w, h) => {
      const kind = rng.int(0, 2), sky = rng.pick(['#89b6e0', '#f0b47a', '#c7d7e8', '#e89a8a']), land = rng.pick(['#4f7a4a', '#7a5a3a', '#34587a', '#8a8f4a']);
      x.fillStyle = sky; x.fillRect(0, 0, w, h);
      if (kind === 0) {      // a landscape
        x.fillStyle = '#fff3c4'; x.beginPath(); x.arc(rng.range(20, 108), rng.range(18, 40), 10, 0, 7); x.fill();
        for (let k = 0; k < 3; k++) { x.fillStyle = k === 2 ? land : `rgba(60,80,100,${0.25 + k * 0.2})`; x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= 8; i++) x.lineTo(i * 16, 40 + k * 12 + rng.range(-12, 12)); x.lineTo(w, h); x.fill(); }
      } else if (kind === 1) {      // a portrait
        x.fillStyle = '#3a2d28'; x.fillRect(0, 0, w, h); x.fillStyle = land; x.beginPath(); x.ellipse(64, 100, 42, 44, 0, 0, 7); x.fill();
        x.fillStyle = '#e2b792'; x.beginPath(); x.ellipse(64, 40, 17, 22, 0, 0, 7); x.fill(); x.fillStyle = '#4a3020'; x.beginPath(); x.ellipse(64, 24, 19, 12, 0, 0, 7); x.fill();
      } else {      // a still life of dolphins, more or less
        x.fillStyle = '#2f6f9a'; x.fillRect(0, 56, w, 40);
        for (let k = 0; k < 3; k++) { x.strokeStyle = '#dfeaf2'; x.lineWidth = 5; x.beginPath(); x.arc(28 + k * 36, 60, 16, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
      }
    });
    const text = (w, h, bg, fg, str, font, border) => canvasTex(w, h, (x) => {
      x.fillStyle = bg; x.fillRect(0, 0, w, h); if (border) { x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12); }
      x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(str, w / 2, h / 2 + 3);
    });
    const clockFace = canvasTex(128, 128, (x) => {
      x.fillStyle = '#f6efdc'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#2a2018'; x.lineWidth = 4; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.lineWidth = i % 3 ? 2 : 5; x.beginPath(); x.moveTo(64 + Math.sin(a) * 46, 64 - Math.cos(a) * 46); x.lineTo(64 + Math.sin(a) * 55, 64 - Math.cos(a) * 55); x.stroke(); }
      x.lineWidth = 5; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + 24, 64 + 14); x.stroke(); x.lineWidth = 3; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + 14, 64 - 40); x.stroke();
    });
    const skyPane = canvasTex(32, 128, (x) => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#7fa9dd'); g.addColorStop(0.6, '#c9d8e6'); g.addColorStop(0.82, '#ffd9a6'); g.addColorStop(0.83, '#3f7f96'); g.addColorStop(1, '#d9bd88'); x.fillStyle = g; x.fillRect(0, 0, 32, 128); });
    const glowTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    const blobTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(20,14,30,0.75)'); g.addColorStop(0.6, 'rgba(20,14,30,0.4)'); g.addColorStop(1, 'rgba(20,14,30,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    await ctx.yield();

    // ---- materials and small helpers
    const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
    const wood = M('#6f4828'), darkWood = M('#412816'), paleWood = M('#b98d5a'), cream = M('#f0e7d3'), brass = M('#d6ac50', { metalness: 0.35, roughness: 0.4 }), iron = M('#2f3a36', { metalness: 0.3, roughness: 0.5 });
    const steel = M('#b9c2c6', { metalness: 0.3, roughness: 0.35 }), copper = M('#c0703f', { metalness: 0.35, roughness: 0.4 }), china = M('#f6f4ee', { roughness: 0.3 });
    const lampGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.8, 0.9) }), flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.5, 0.4) });
    const shadeMat = new THREE.MeshStandardMaterial({ color: '#f6e4bd', emissive: '#ffb055', emissiveIntensity: 1.5, side: THREE.DoubleSide });
    const haloMat = new THREE.MeshBasicMaterial({ map: glowTex, color: '#ffb260', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const UNIT = new THREE.BoxGeometry(1, 1, 1);
    const box = (parent, w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(UNIT, mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; };
    const cyl = (parent, rt, rb, h, x, y, z, mat, seg = 14) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); parent.add(m); return m; };
    const ball = (parent, r, x, y, z, mat, seg = 12) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 4)), mat); m.position.set(x, y, z); parent.add(m); return m; };
    const grp = (parent, x, y, z, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; };
    const topTex = (map, side) => { const s = M(side); return [s, s, new THREE.MeshStandardMaterial({ map, roughness: 1 }), s, s, s]; };
    const house = new THREE.Group(); scene.add(house);
    const shadowed = [];      // [object, radius]: each gets a long soft shadow on the ground, away from the sun
    const pendulums = [], flames = [];

    // ---- furniture (each built in its parent's frame; +z is "out from the wall")
    function armchair(parent, x, z, ry, color, wide = 3.6) {
      const g = grp(parent, x, 0.12, z, ry), m = M(color, { roughness: 0.95 }), cush = M(color, { roughness: 1 }); cush.color.multiplyScalar(1.15);
      box(g, wide, 1.0, 3.4, 0, 1.2, 0, m); box(g, wide, 3.2, 0.9, 0, 3.0, -1.5, m); box(g, 0.8, 1.6, 3.4, -wide / 2 - 0.1, 2.2, 0, m); box(g, 0.8, 1.6, 3.4, wide / 2 + 0.1, 2.2, 0, m);
      const n = Math.round(wide / 3.4); for (let i = 0; i < n; i++) { box(g, wide / n - 0.2, 0.5, 2.5, -wide / 2 + (i + 0.5) * wide / n, 1.95, 0.3, cush); box(g, wide / n - 0.3, 1.8, 0.5, -wide / 2 + (i + 0.5) * wide / n, 3.1, -0.9, cush); }
      for (const sx of [-wide / 2 + 0.3, wide / 2 - 0.3]) for (const sz of [-1.4, 1.4]) box(g, 0.3, 0.7, 0.3, sx, 0.35, sz, darkWood);
      shadowed.push([g, wide * 0.6]); return g;
    }
    function chair(parent, x, z, ry, mat = wood) {
      const g = grp(parent, x, 0.12, z, ry);
      box(g, 1.7, 0.2, 1.7, 0, 1.75, 0, mat); box(g, 1.5, 0.25, 1.5, 0, 1.95, 0, M('#a13d38', { roughness: 1 }));
      for (const sx of [-0.75, 0.75]) { box(g, 0.16, 1.75, 0.16, sx, 0.87, 0.75, mat); box(g, 0.16, 4.0, 0.16, sx, 2.0, -0.75, mat); }
      box(g, 1.6, 0.5, 0.12, 0, 3.75, -0.75, mat); box(g, 1.6, 0.3, 0.12, 0, 3.0, -0.75, mat);
      return g;
    }
    function standardLamp(parent, x, z, light) {
      const g = grp(parent, x, 0.12, z);
      cyl(g, 0.12, 0.12, 7, 0, 3.5, 0, brass, 8); cyl(g, 0.9, 1.1, 0.25, 0, 0.12, 0, brass, 16);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.7, 1.8, 20, 1, true), shadeMat); s.position.y = 7.4; g.add(s);
      ball(g, 0.3, 0, 7.2, 0, lampGlow);
      for (let i = 0; i < 16; i++) box(g, 0.05, 0.3, 0.05, Math.cos(i / 16 * 6.283) * 1.7, 6.35, Math.sin(i / 16 * 6.283) * 1.7, brass);      // the fringe
      if (light) { const p = new THREE.PointLight('#ffb060', 70, 45, 2); p.position.y = 6.6; g.add(p); }
      shadowed.push([g, 0.9]); return g;
    }
    function plant(parent, x, z, s = 1) {
      const g = grp(parent, x, 0.12, z); g.scale.setScalar(s);
      cyl(g, 0.9, 0.65, 1.4, 0, 0.7, 0, M('#b0603a'), 14); cyl(g, 0.85, 0.85, 0.08, 0, 1.38, 0, M('#3b2a1c'), 14);
      const leaf = new THREE.SphereGeometry(1, 7, 5), lm = M('#3f7a3a', { roughness: 0.7 });
      for (let i = 0; i < 11; i++) { const l = new THREE.Mesh(leaf, lm), a = i / 11 * 6.283 + rng.range(-0.2, 0.2), t = rng.range(0.25, 0.95); l.scale.set(0.35, 1.5, 0.08); l.position.set(Math.sin(a) * t * 1.2, 2.5 + (1 - t) * 1.2, Math.cos(a) * t * 1.2); l.rotation.set(t * 1.0, a, 0, 'YXZ'); g.add(l); }
      shadowed.push([g, 1.1]); return g;
    }
    function table(parent, x, z, r, h, mat = wood) { const g = grp(parent, x, 0.12, z); cyl(g, r, r, 0.22, 0, h, 0, mat, 28); cyl(g, r * 0.12, r * 0.3, h, 0, h / 2, 0, darkWood, 12); cyl(g, r * 0.55, r * 0.6, 0.15, 0, 0.08, 0, darkWood, 16); shadowed.push([g, r]); return g; }

    // ---- what hangs on a wall
    function bookshelf(g, x, w, h) {
      box(g, w, h, 0.25, x, h / 2 + 0.6, F + 0.12, darkWood);
      box(g, 0.3, h, 1.3, x - w / 2, h / 2 + 0.6, F + 0.65, wood); box(g, 0.3, h, 1.3, x + w / 2, h / 2 + 0.6, F + 0.65, wood);
      box(g, w + 0.8, 0.35, 1.5, x, h + 0.75, F + 0.7, wood);
      const rows = Math.floor(h / 1.9), mats = [], cols = [], dm = new THREE.Object3D(), c = new THREE.Color();
      for (let r = 0; r <= rows; r++) {
        const y = 0.6 + r * (h / rows); box(g, w, 0.2, 1.3, x, y, F + 0.65, wood);
        if (r === rows) break;
        for (let bx = x - w / 2 + 0.35; bx < x + w / 2 - 0.5;) {
          const k = rng();
          if (k < 0.06) { bx += rng.range(0.4, 1.0); continue; }
          if (k < 0.10) { ball(g, 0.42, bx + 0.5, y + 0.55, F + 0.7, rng.chance(0.5) ? china : copper, 10); bx += 1.1; continue; }      // an ornament
          if (k < 0.16) {      // a pile lying flat
            const n = rng.int(2, 4), bl = rng.range(0.95, 1.3);
            for (let s = 0; s < n; s++) { const bh = rng.range(0.16, 0.3); dm.position.set(bx + bl / 2, y + 0.1 + s * 0.26 + 0.13, F + 0.6); dm.rotation.set(0, rng.range(-0.1, 0.1), 0); dm.scale.set(bl, bh, 0.85); dm.updateMatrix(); mats.push(dm.matrix.clone()); cols.push(c.setHSL(rng(), rng.range(0.3, 0.7), rng.range(0.25, 0.55)).clone()); }
            bx += bl + 0.1; continue;
          }
          const bw = rng.range(0.16, 0.4), bh = rng.range(0.95, 1.55), lean = rng.chance(0.07) ? rng.range(-0.2, 0.2) : 0;
          dm.position.set(bx + bw / 2, y + 0.1 + bh / 2, F + 0.6); dm.rotation.set(0, 0, lean); dm.scale.set(bw, bh, rng.range(0.8, 1.0)); dm.updateMatrix();
          mats.push(dm.matrix.clone()); cols.push((rng.chance(0.25) ? c.setHSL(rng.range(0.02, 0.1), 0.5, rng.range(0.15, 0.3)) : c.setHSL(rng(), rng.range(0.3, 0.7), rng.range(0.25, 0.55))).clone()); bx += bw + 0.02;
        }
      }
      const im = new THREE.InstancedMesh(UNIT, M('#ffffff', { roughness: 0.7 }), mats.length);
      mats.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, cols[i]); }); g.add(im);
    }
    function picture(g, x, y, w, h) {
      const fm = rng.chance(0.5) ? brass : darkWood;
      box(g, w + 0.6, h + 0.6, 0.2, x, y, F + 0.1, fm); box(g, w + 0.2, h + 0.2, 0.06, x, y, F + 0.2, cream);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: art(), roughness: 0.6 })); p.position.set(x, y, F + 0.24); g.add(p);
      box(g, 0.04, 11.4 - y - h / 2, 0.04, x, (11.4 + y + h / 2) / 2, F + 0.06, darkWood);      // its wire up to the picture rail
    }
    function sconce(g, x, y) {
      box(g, 0.5, 1.2, 0.12, x, y - 0.4, F + 0.06, brass); box(g, 0.16, 0.16, 0.7, x, y - 0.5, F + 0.35, brass);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, 1.0, 16, 1, true), shadeMat); s.position.set(x, y + 0.3, F + 0.7); g.add(s);
      ball(g, 0.22, x, y + 0.2, F + 0.7, lampGlow, 10);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), haloMat); halo.position.set(x, y + 0.6, F + 0.04); g.add(halo);
    }
    function curtainGeo(w, h, side) {
      const g = new THREE.PlaneGeometry(w, h, 16, 12), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / w + 0.5, v = p.getY(i) / h + 0.5;
        const pinch = 1 - 0.55 * Math.exp(-((v - 0.36) ** 2) / 0.012) - 0.12 * (1 - v), ax = side < 0 ? u : 1 - u;      // gathered at the tie-back
        p.setX(i, side < 0 ? -w / 2 + ax * w * pinch : w / 2 - ax * w * pinch);
        p.setZ(i, Math.sin(u * Math.PI * 6) * 0.17 * (0.6 + 0.4 * pinch) + 0.1);
      }
      g.computeVertexNormals(); return g;
    }
    function windowBoth(g, x, y, fabric) {
      // the "indoor" side: the frame, the sky in its panes, a sill, a rod and a pair of curtains
      box(g, 5.0, 6.0, 0.25, x, y, F + 0.12, cream);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.4), new THREE.MeshBasicMaterial({ map: skyPane })); pane.position.set(x, y, F + 0.26); g.add(pane);
      box(g, 0.14, 5.4, 0.1, x, y, F + 0.3, cream); box(g, 4.4, 0.14, 0.1, x, y + 0.5, F + 0.3, cream);
      box(g, 5.6, 0.25, 0.9, x, y - 3.1, F + 0.45, cream);
      cyl(g, 0.1, 0.1, 8.4, x, y + 3.9, F + 0.5, brass, 8).rotation.z = Math.PI / 2; ball(g, 0.22, x - 4.2, y + 3.9, F + 0.5, brass, 8); ball(g, 0.22, x + 4.2, y + 3.9, F + 0.5, brass, 8);
      const cm = new THREE.MeshStandardMaterial({ color: fabric, roughness: 1, side: THREE.DoubleSide }), ch = 8.6;
      for (const s of [-1, 1]) { const c = new THREE.Mesh(curtainGeo(2.6, ch, s), cm); c.position.set(x + s * 2.9, y + 3.9 - ch / 2, F + 0.4); g.add(c); box(g, 0.5, 0.2, 0.3, x + s * 3.9, y + 3.9 - ch * 0.64, F + 0.5, brass); }
      box(g, 8.6, 0.9, 0.5, x, y + 4.2, F + 0.55, cm);      // the pelmet
      // the garden side: the same window as a house shows it to the street, with a lintel, a sill and a window box
      box(g, 5.0, 6.0, 0.2, x, y, -F - 0.1, cream); box(g, 4.4, 5.4, 0.1, x, y, -F - 0.2, M('#26323d', { roughness: 0.2 }));
      box(g, 1.3, 5.2, 0.05, x - 1.5, y, -F - 0.24, cm); box(g, 1.3, 5.2, 0.05, x + 1.5, y, -F - 0.24, cm);      // the curtains' backs through the glass
      box(g, 0.14, 5.4, 0.12, x, y, -F - 0.3, cream); box(g, 4.4, 0.14, 0.12, x, y + 0.5, -F - 0.3, cream);
      box(g, 5.8, 0.7, 0.25, x, y + 3.35, -F - 0.12, M('#a24c35')); box(g, 5.6, 0.3, 0.7, x, y - 3.1, -F - 0.3, M('#a9a294'));
      box(g, 4.8, 0.7, 0.8, x, y - 3.6, -F - 0.45, M('#7c4a31'));
      for (let i = 0; i < 12; i++) { ball(g, 0.3, x - 2.1 + i * 0.38, y - 3.1 + rng.range(0, 0.35), -F - 0.5, M(rng.pick(['#e2486a', '#f2c040', '#b45ad0', '#f08a3a', '#ffffff'])), 8); if (i % 2) ball(g, 0.34, x - 2.1 + i * 0.38, y - 3.3, -F - 0.75, M('#3f7a3a'), 7); }
    }
    function mantelClock(g, x, y, z) { box(g, 1.6, 1.5, 0.6, x, y + 0.75, z, darkWood); cyl(g, 0.85, 0.85, 0.62, x, y + 1.5, z, darkWood, 20).rotation.x = Math.PI / 2; const f = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), new THREE.MeshBasicMaterial({ map: clockFace })); f.position.set(x, y + 1.5, z + 0.33); g.add(f); }
    function fireplace(g, x) {
      box(g, 7.4, 6, 1.2, x, 3, F + 0.6, cream); box(g, 8.6, 0.4, 1.8, x, 6.2, F + 0.85, wood); box(g, 1.0, 5.6, 0.2, x - 3.0, 2.8, F + 1.25, M('#d9cfb8')); box(g, 1.0, 5.6, 0.2, x + 3.0, 2.8, F + 1.25, M('#d9cfb8'));
      box(g, 4.2, 3.8, 0.3, x, 1.9, F + 1.1, M('#15100c')); box(g, 6.4, 0.2, 2.6, x, 0.2, F + 1.8, M('#5a5550'));      // the hearth stone
      for (let i = 0; i < 3; i++) cyl(g, 0.28, 0.28, 3.2, x, 0.5 + i * 0.3, F + 1.4 + (i % 2) * 0.3, M('#3a2a1c'), 8).rotation.z = Math.PI / 2 + (i - 1) * 0.15;
      for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.5 + (i % 2) * 0.25, 1.6 + (i % 3) * 0.5, 6), flameMat); f.position.set(x - 1.2 + i * 0.6, 1.5, F + 1.5); g.add(f); flames.push([f, i * 1.7, 1]); }
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), haloMat); halo.position.set(x, 2.2, F + 1.3); g.add(halo);
      mantelClock(g, x, 6.4, F + 0.9);
      for (const s of [-2.8, 2.8]) { cyl(g, 0.1, 0.25, 1.2, x + s, 7.0, F + 0.9, brass, 8); cyl(g, 0.09, 0.09, 0.7, x + s, 7.9, F + 0.9, china, 8); const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), flameMat); f.position.set(x + s, 8.45, F + 0.9); g.add(f); flames.push([f, s, 0.4]); }
      box(g, 5.4, 3.4, 0.2, x, 9.3, F + 0.1, brass);      // the mirror over the mantel, which shows the sea
      const mir = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.8), new THREE.MeshBasicMaterial({ map: skyPane })); mir.position.set(x, 9.3, F + 0.22); g.add(mir);
      cyl(g, 0.06, 0.06, 2.6, x + 4.4, 1.3, F + 1.2, iron, 6); cyl(g, 0.06, 0.06, 2.6, x + 4.7, 1.3, F + 1.2, iron, 6).rotation.z = 0.12;      // fire irons
    }
    function grandfatherClock(g, x) {
      const c = grp(g, x, 0, F + 0.75);
      box(c, 2.3, 2.2, 1.4, 0, 1.1, 0, darkWood); box(c, 1.7, 5.0, 1.15, 0, 4.7, 0, wood); box(c, 1.1, 4.2, 0.1, 0, 4.7, 0.56, M('#16110d', { roughness: 0.2 }));
      box(c, 2.4, 2.4, 1.45, 0, 8.4, 0, darkWood); box(c, 2.8, 0.3, 1.7, 0, 9.7, 0, wood); cyl(c, 0.0, 0.5, 0.9, 0, 10.3, 0, brass, 4);
      const f = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), new THREE.MeshBasicMaterial({ map: clockFace })); f.position.set(0, 8.4, 0.74); c.add(f);
      const pv = grp(c, 0, 6.9, 0.62); box(pv, 0.07, 3.2, 0.05, 0, -1.6, 0, brass); cyl(pv, 0.42, 0.42, 0.08, 0, -3.2, 0, brass, 18).rotation.x = Math.PI / 2; pendulums.push(pv);
    }
    function piano(parent, x, z, ry) {
      const g = grp(parent, x, 0.12, z, ry), black = M('#0d0d10', { roughness: 0.22 });
      const s = new THREE.Shape(); s.moveTo(-3, 0); s.lineTo(3, 0); s.lineTo(3, 2.5); s.bezierCurveTo(3, 5.5, 0.5, 5.0, 0.2, 7.5); s.quadraticCurveTo(0, 9, -1.5, 9); s.quadraticCurveTo(-3, 9, -3, 7.5); s.lineTo(-3, 0);
      const body = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: false, curveSegments: 14 }); body.rotateX(-Math.PI / 2);
      const bm = new THREE.Mesh(body, black); bm.position.y = 2.3; g.add(bm);
      const lidG = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false, curveSegments: 14 }); lidG.rotateX(-Math.PI / 2); lidG.translate(3, 0, 0);
      const lp = grp(g, -3, 3.62, 0); lp.rotation.z = 0.5; lp.add(new THREE.Mesh(lidG, black));
      cyl(g, 0.05, 0.05, 2.9, 1.9, 4.9, -2.6, black, 6).rotation.z = -0.1;      // the prop
      box(g, 5.6, 0.04, 6.5, -0.1, 3.5, -4.0, M('#b08a3a', { metalness: 0.3, roughness: 0.5 }));      // the plate and strings, a glint under the lid
      box(g, 6.0, 0.35, 1.2, 0, 2.5, 0.6, black); box(g, 5.5, 0.14, 0.85, 0, 2.74, 0.62, china); box(g, 6.0, 0.9, 0.16, 0, 3.15, 0.05, black);
      const keys = new THREE.InstancedMesh(UNIT, black, 36), dm = new THREE.Object3D(); let k = 0;
      for (let i = 0; i < 52 && k < 36; i++) { if ([1, 4].includes(i % 7)) continue; dm.position.set(-2.7 + i * 0.104, 2.86, 0.42); dm.scale.set(0.06, 0.12, 0.5); dm.updateMatrix(); keys.setMatrixAt(k++, dm.matrix); }
      keys.count = k; g.add(keys);
      const desk = box(g, 3.2, 1.3, 0.08, 0, 4.25, -0.5, black); desk.rotation.x = -0.3; const sheet = box(g, 1.8, 1.0, 0.03, 0, 4.3, -0.42, china); sheet.rotation.x = -0.3;
      for (const [lx, lz] of [[-2.6, -0.4], [2.6, -0.4], [-1.4, -8.2]]) { cyl(g, 0.22, 0.14, 2.3, lx, 1.15, lz, black, 10); cyl(g, 0.16, 0.16, 0.2, lx, 0.1, lz, brass, 10); }
      box(g, 0.5, 1.6, 0.2, 0, 1.2, -0.2, black); box(g, 1.0, 0.1, 0.5, 0, 0.3, 0.1, brass);      // the pedals
      box(g, 2.6, 0.4, 1.5, 0, 1.75, 2.8, M('#3a1f1a', { roughness: 0.6 })); for (const sx of [-1.1, 1.1]) for (const sz of [2.2, 3.4]) box(g, 0.18, 1.6, 0.18, sx, 0.8, sz, black);      // the stool
      shadowed.push([g, 3.6]); return g;
    }

    // ---- the four walls: wallpaper and panelling outward, brick inward
    const brickMat = new THREE.MeshStandardMaterial({ map: brick, bumpMap: brick, bumpScale: 1.2, roughness: 0.95 }), capMat = M('#a69d8b');
    const gutterMat = iron;
    const WALLS = { south: { p: [0, HALF], r: 0 }, east: { p: [HALF, 0], r: Math.PI / 2 }, north: { p: [0, -HALF], r: Math.PI }, west: { p: [-HALF, 0], r: -Math.PI / 2 } };
    Object.keys(WALLS).forEach((name, i) => {
      const w = WALLS[name], g = grp(house, w.p[0], 0, w.p[1], w.r); w.g = g;
      const len = HALF * 2 - WALL_T;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H, WALL_T), [capMat, capMat, capMat, capMat, new THREE.MeshStandardMaterial({ map: PAPERS[i], roughness: 0.9 }), brickMat]); wall.position.y = WALL_H / 2; g.add(wall);
      box(g, len, 0.7, 0.24, 0, 0.35, F + 0.12, cream);                 // skirting board
      if (name !== 'west') {      // panelling to the dado rail
        box(g, len, 3.6, 0.1, 0, 2.5, F + 0.05, M(PANELS[i]));
        const pm = M(PANELS[i]); pm.color.multiplyScalar(1.18);
        const pn = new THREE.InstancedMesh(UNIT, pm, 16), dm = new THREE.Object3D();
        for (let k = 0; k < 16; k++) { dm.position.set(-len / 2 + (k + 0.5) * len / 16, 2.45, F + 0.11); dm.scale.set(len / 16 - 0.5, 2.7, 0.06); dm.updateMatrix(); pn.setMatrixAt(k, dm.matrix); }
        g.add(pn); box(g, len, 0.3, 0.28, 0, 4.4, F + 0.14, cream);      // the dado rail
      }
      box(g, len, 0.22, 0.2, 0, 11.4, F + 0.1, cream);                // picture rail
      box(g, len, 0.7, 0.4, 0, WALL_H - 0.35, F + 0.2, cream); box(g, len, 0.3, 0.7, 0, WALL_H - 0.85, F + 0.2, cream);       // cornice
      // the garden side: a plinth course, the gutter on its brackets, a drainpipe with its shoe
      box(g, len, 1.0, 0.16, 0, 0.5, -F - 0.08, M('#7b3f30'));
      box(g, len - 1, 0.45, 0.6, 0, WALL_H - 0.5, -F - 0.32, gutterMat);
      for (let k = 0; k < 8; k++) box(g, 0.12, 0.5, 0.5, -len / 2 + 2.5 + k * 5, WALL_H - 0.75, -F - 0.25, gutterMat);
      cyl(g, 0.22, 0.22, WALL_H - 1.2, HALF - 2.0, (WALL_H - 1.2) / 2 + 0.4, -F - 0.32, gutterMat, 10);
      for (let k = 0; k < 4; k++) box(g, 0.6, 0.12, 0.3, HALF - 2.0, 2 + k * 3.3, -F - 0.2, gutterMat);
      const shoe = cyl(g, 0.22, 0.22, 0.8, HALF - 2.0, 0.45, -F - 0.6, gutterMat, 10); shoe.rotation.x = -0.9;
    });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(house, 1.7, WALL_H + 0.3, 1.7, sx * HALF, (WALL_H + 0.3) / 2, sz * HALF, cream); box(house, 2.1, 0.5, 2.1, sx * HALF, WALL_H + 0.4, sz * HALF, cream); box(house, 2.1, 0.9, 2.1, sx * HALF, 0.45, sz * HALF, cream); }      // corner pilasters
    await ctx.yield();

    // ---- SOUTH, toward the sea: the sitting room
    {
      const g = WALLS.south.g;
      bookshelf(g, -13.5, 8, 10); windowBoth(g, -3, 7.6, '#9c3a3a'); fireplace(g, 8.5); sconce(g, 2.6, 8.4); sconce(g, 14.4, 8.4); picture(g, 16.9, 8.0, 2.2, 3.0); picture(g, 16.9, 5.6, 2.0, 1.4);
      const rug = new THREE.Mesh(new THREE.BoxGeometry(30, 0.12, 15), topTex(rugTex('#8e2f2c', '#e2c58a', '#23405c'), '#7a2f2a')); rug.position.set(3, 0.07, F + 9.5); g.add(rug);
      armchair(g, 8.5, 13.5, Math.PI, '#5d7a6a', 7.6);      // the sofa, facing the fire
      armchair(g, 0.5, 8, Math.PI * 0.72, '#a0553e'); armchair(g, 16.5, 8, -Math.PI * 0.72, '#c9a24a');
      const ct = grp(g, 8.5, 0.12, 8.5); box(ct, 4.6, 0.25, 2.4, 0, 1.5, 0, wood); for (const sx of [-2, 2]) for (const sz of [-0.9, 0.9]) box(ct, 0.25, 1.4, 0.25, sx, 0.7, sz, darkWood);
      box(ct, 1.3, 0.2, 0.9, -1.2, 1.72, 0.2, M('#27506e')); box(ct, 1.1, 0.18, 0.8, -1.15, 1.9, 0.15, M('#8a2f2f')); cyl(ct, 0.35, 0.25, 0.9, 1.2, 2.1, -0.2, china, 12); ball(ct, 0.5, 1.2, 2.9, -0.2, M('#d85a7a'), 8); shadowed.push([ct, 2.4]);
      const st = table(g, 14.2, 13.8, 1.0, 2.2); cyl(st, 0.3, 0.3, 0.4, 0.2, 2.5, 0, china, 12); box(st, 0.9, 0.12, 0.6, -0.3, 2.37, 0.3, M('#3d5a40'));      // a cup of tea and a paperback
      standardLamp(g, -7.5, 5); plant(g, 18, 3, 1.2); plant(g, -18, 3.2, 1.0);
      const hearth = new THREE.PointLight('#ff9a4a', 80, 42, 2); hearth.position.set(8.5, 2.5, F + 4); g.add(hearth);
    }
    // ---- EAST: the music room and library
    {
      const g = WALLS.east.g;
      bookshelf(g, -13.5, 8, 10.5); bookshelf(g, 13.5, 8, 10.5); windowBoth(g, 0, 7.6, '#3f5f86'); grandfatherClock(g, 6.0); sconce(g, 8.2, 8.4);
      picture(g, -6.6, 9.0, 2.4, 1.8); picture(g, -6.6, 6.3, 2.4, 2.4);
      const rug = new THREE.Mesh(new THREE.BoxGeometry(27, 0.12, 14), topTex(rugTex('#2c4a6a', '#e8d9b0', '#a0553e'), '#23405c')); rug.position.set(0, 0.07, F + 8.5); g.add(rug);
      piano(g, -4, 13.5, Math.PI * 0.08); standardLamp(g, 5.5, 5.5, true); armchair(g, 10, 9.5, Math.PI * 0.82, '#7f8f5a');
      const st = table(g, 6.2, 10.5, 0.9, 2.1); box(st, 1.0, 0.14, 0.7, 0, 2.3, 0, M('#6a2f4a'));
      // a music stand and a cello leaning on its chair
      const ms = grp(g, -10.5, 0.12, 7); cyl(ms, 0.06, 0.06, 4.2, 0, 2.1, 0, iron, 6); const d = box(ms, 1.8, 1.3, 0.06, 0, 4.4, 0.1, iron); d.rotation.x = -0.3; const sh = box(ms, 1.5, 1.1, 0.03, 0, 4.45, 0.16, china); sh.rotation.x = -0.3;
      for (let k = 0; k < 3; k++) { const leg = cyl(ms, 0.05, 0.05, 1.2, Math.cos(k * 2.09) * 0.4, 0.5, Math.sin(k * 2.09) * 0.4, iron, 5); leg.rotation.set(Math.sin(k * 2.09) * 0.7, 0, -Math.cos(k * 2.09) * 0.7); }
      chair(g, -12.5, 5.5, Math.PI * 0.9);
      const cello = grp(g, -14, 0.3, 4.2); cello.rotation.set(-0.25, 0.4, 0.1); const cm = M('#8a4a22', { roughness: 0.35 });
      const b1 = ball(cello, 1, 0, 1.3, 0, cm, 14); b1.scale.set(1.0, 1.1, 0.3); const b2 = ball(cello, 1, 0, 2.7, 0, cm, 14); b2.scale.set(0.8, 0.95, 0.3); box(cello, 0.22, 3.2, 0.14, 0, 4.9, 0.12, darkWood); ball(cello, 0.22, 0, 6.6, 0.12, darkWood, 8);
    }
    await ctx.yield();
    // ---- NORTH: the hall (the inside of the front door) and the dining room
    {
      const g = WALLS.north.g;
      // the front door from within: frame, door, letter flap, chain, the mat, a row of coats, an umbrella stand
      box(g, 0.6, 9.4, 0.5, -3.1, 4.7, F + 0.25, cream); box(g, 0.6, 9.4, 0.5, 3.1, 4.7, F + 0.25, cream); box(g, 6.8, 0.6, 0.5, 0, 9.4, F + 0.25, cream);
      box(g, 5.6, 8.9, 0.16, 0, 4.5, F + 0.12, M('#e9e2d2', { roughness: 0.6 })); for (const [px, py] of [[-1.3, 6.6], [1.3, 6.6], [-1.3, 2.6], [1.3, 2.6]]) box(g, 2.0, 3.1, 0.06, px, py, F + 0.22, M('#ddd5c2'));
      box(g, 1.6, 0.4, 0.1, 0, 4.4, F + 0.24, brass); ball(g, 0.22, 2.2, 4.6, F + 0.36, brass, 10); box(g, 0.8, 0.08, 0.08, 2.4, 6.0, F + 0.3, brass);
      box(g, 5.0, 0.1, 2.6, 0, 0.1, F + 1.8, M('#9a7a48', { roughness: 1 }));
      box(g, 6.4, 0.3, 0.2, 7.0, 8.2, F + 0.12, wood);
      [['#2f4a6a', 3.6], ['#b0903a', 3.0], ['#6a2f2f', 3.9], ['#3f5a3f', 2.6]].forEach(([c, l], k) => { cyl(g, 0.06, 0.06, 0.5, 4.6 + k * 1.6, 8.1, F + 0.4, brass, 6).rotation.x = Math.PI / 2; const coat = box(g, 1.3, l, 0.5, 4.6 + k * 1.6, 8.0 - l / 2, F + 0.5, M(c, { roughness: 1 })); coat.rotation.z = (k - 1.5) * 0.02; });
      ball(g, 0.5, 9.4, 8.6, F + 0.5, M('#3a3028', { roughness: 1 }), 10).scale.set(1.3, 0.5, 1.2);      // a hat on the last hook
      const us = grp(g, 4.2, 0.12, F + 1.0); cyl(us, 0.55, 0.45, 2.2, 0, 1.1, 0, copper, 14); cyl(us, 0.05, 0.05, 3.4, 0.1, 2.2, 0, darkWood, 6).rotation.z = 0.12; cyl(us, 0.07, 0.07, 3.0, -0.15, 2.0, 0.1, M('#22303a'), 6).rotation.z = -0.1;
      windowBoth(g, -11, 7.6, '#5a7a4a'); sconce(g, -5.2, 8.4); sconce(g, -17.2, 8.4);
      // the sideboard, with decanters and a bowl of fruit, a picture over it
      const sb = grp(g, 13.5, 0.12, F + 0.95); box(sb, 8.4, 2.9, 1.7, 0, 1.75, 0, wood); box(sb, 8.8, 0.2, 1.9, 0, 3.25, 0, darkWood); for (let k = 0; k < 4; k++) { box(sb, 1.9, 2.3, 0.06, -3.1 + k * 2.07, 1.75, 0.87, paleWood); ball(sb, 0.09, -3.1 + k * 2.07 + (k % 2 ? -0.7 : 0.7), 1.9, 0.94, brass, 6); } for (const sx of [-3.9, 3.9]) for (const sz of [-0.7, 0.7]) box(sb, 0.3, 0.4, 0.3, sx, 0.2, sz, darkWood);
      for (let k = 0; k < 3; k++) { const gl = new THREE.MeshStandardMaterial({ color: ['#c98a3a', '#7a2a2a', '#d8c070'][k], transparent: true, opacity: 0.75, roughness: 0.1 }); cyl(sb, 0.3, 0.38, 1.0, -3 + k * 1.0, 3.85, 0, gl, 12); cyl(sb, 0.12, 0.18, 0.5, -3 + k * 1.0, 4.55, 0, gl, 10); ball(sb, 0.16, -3 + k * 1.0, 4.9, 0, china, 8); }
      cyl(sb, 0.9, 0.5, 0.5, 2.2, 3.6, 0, china, 16); for (let k = 0; k < 7; k++) ball(sb, 0.3, 2.2 + Math.cos(k) * 0.45, 3.95 + (k % 2) * 0.25, Math.sin(k) * 0.45, M(rng.pick(['#d8402f', '#e8a030', '#8aa83a', '#e8d040'])), 8);
      picture(g, 13.5, 8.0, 5.4, 3.4);
      // the dining table, laid for eight
      const rug = new THREE.Mesh(new THREE.BoxGeometry(22, 0.12, 13), topTex(rugTex('#3f5a3f', '#e8d9b0', '#8e2f2c'), '#33482f')); rug.position.set(0, 0.07, F + 11.5); g.add(rug);
      const dt = grp(g, 0, 0.12, F + 11.5); box(dt, 13, 0.3, 5, 0, 2.85, 0, wood); for (const sx of [-5.8, 5.8]) for (const sz of [-2, 2]) cyl(dt, 0.28, 0.2, 2.7, sx, 1.35, sz, darkWood, 10);
      box(dt, 13.6, 0.06, 2.2, 0, 3.03, 0, M('#f3efe6', { roughness: 1 })); box(dt, 13.62, 0.07, 0.2, 0, 3.03, 0.9, M('#a13d38')); box(dt, 13.62, 0.07, 0.2, 0, 3.03, -0.9, M('#a13d38')); shadowed.push([dt, 6.5]);
      const seats = []; for (let k = 0; k < 3; k++) { seats.push([-4 + k * 4, 1.75, 0], [-4 + k * 4, -1.75, Math.PI]); } seats.push([-5.6, 0, Math.PI / 2], [5.6, 0, -Math.PI / 2]);
      const glass = new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.4, roughness: 0.05 });
      for (const [sx, sz, ry] of seats) {
        const out = Math.abs(sz) > 1 ? [sx, sz + Math.sign(sz) * 1.9] : [sx + Math.sign(sx) * 2.0, 0];
        chair(dt, out[0], out[1], ry + Math.PI);
        const pl = grp(dt, sx, 3.07, sz, ry); cyl(pl, 0.75, 0.5, 0.08, 0, 0, 0, china, 20); cyl(pl, 0.45, 0.4, 0.05, 0, 0.06, 0, M('#d9d2c2'), 16);
        box(pl, 0.08, 0.03, 1.0, -1.0, 0, 0, steel); box(pl, 0.08, 0.03, 1.0, 1.0, 0, 0, steel); box(pl, 0.08, 0.03, 0.8, 1.2, 0, 0, steel);
        cyl(pl, 0.2, 0.12, 0.5, 0.8, 0.6, -0.75, glass, 10); cyl(pl, 0.03, 0.03, 0.4, 0.8, 0.2, -0.75, glass, 6); cyl(pl, 0.16, 0.16, 0.03, 0.8, 0.01, -0.75, glass, 10);
        const nap = box(pl, 0.5, 0.25, 0.5, -1.3, 0.12, -0.5, M('#a13d38', { roughness: 1 })); nap.rotation.y = 0.6;
      }
      for (const cx of [-2.4, 2.4]) {      // two candelabra
        cyl(dt, 0.35, 0.5, 0.2, cx, 3.15, 0, brass, 12); cyl(dt, 0.08, 0.1, 1.5, cx, 3.9, 0, brass, 8); box(dt, 1.6, 0.1, 0.1, cx, 4.5, 0, brass);
        for (const o of [-0.8, 0, 0.8]) { cyl(dt, 0.08, 0.08, 0.7, cx + o, 4.95 + (o === 0 ? 0.25 : 0), 0, china, 8); const f = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 6), flameMat); f.position.set(cx + o, 5.5 + (o === 0 ? 0.25 : 0), 0); dt.add(f); flames.push([f, cx + o, 0.4]); }
      }
      cyl(dt, 1.0, 0.6, 0.6, 0, 3.4, 0, china, 18); cyl(dt, 0.8, 0.9, 0.3, 0, 3.8, 0, china, 18); ball(dt, 0.14, 0, 4.05, 0, brass, 8);      // the tureen
    }
    await ctx.yield();
    // ---- WEST: the kitchen
    {
      const g = WALLS.west.g, cab = M('#6f8f8a', { roughness: 0.6 }), door = M('#7fa09a', { roughness: 0.55 }), top = M('#ece5d2', { roughness: 0.4 });
      const tb = new THREE.Mesh(new THREE.PlaneGeometry(38.6, 6.4), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.3 })); tb.position.set(0, 3.9, F + 0.02); g.add(tb);
      const lino = new THREE.Mesh(new THREE.BoxGeometry(36, 0.1, 11), topTex(checker, '#2f3b3a')); lino.position.set(0, 0.06, F + 5.6); g.add(lino);
      box(g, 27, 2.7, 2.2, -2.5, 1.47, F + 1.1, cab); box(g, 27.4, 0.25, 2.5, -2.5, 2.95, F + 1.2, top); box(g, 27, 0.3, 2.0, -2.5, 0.25, F + 1.0, M('#2a3331'));
      for (let k = 0; k < 13; k++) { const dx = -15 + k * 2.05; if (dx > 2.6 && dx < 7.4) continue; box(g, 1.85, k % 4 === 1 ? 0.6 : 2.1, 0.08, dx, k % 4 === 1 ? 2.35 : 1.5, F + 2.24, door); if (k % 4 === 1) box(g, 1.85, 1.35, 0.08, dx, 1.2, F + 2.24, door); box(g, 0.7, 0.08, 0.1, dx, 2.5, F + 2.32, brass); }
      // the sink under the window, and its tap
      box(g, 3.4, 0.08, 1.7, -4, 3.1, F + 1.25, steel); box(g, 2.6, 0.06, 1.2, -4, 3.13, F + 1.25, M('#7d878c', { roughness: 0.3 }));
      const tap = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 16, Math.PI), steel); tap.position.set(-4, 3.6, F + 0.75); tap.rotation.y = Math.PI / 2; g.add(tap); cyl(g, 0.07, 0.07, 0.6, -4, 3.4, F + 0.3, steel, 8);
      box(g, 1.6, 0.9, 1.0, -1.6, 3.55, F + 1.2, M('#d8d0bc')); for (let k = 0; k < 5; k++) { const p = cyl(g, 0.55, 0.55, 0.05, -2.2 + k * 0.3, 3.75, F + 1.2, china, 14); p.rotation.z = Math.PI / 2 - 0.2; }      // the plate rack
      windowBoth(g, -4, 8.6, '#d8b84a');
      // the range, its hood, a kettle on the boil
      box(g, 4.4, 3.0, 2.4, 5, 1.6, F + 1.2, M('#1f2327', { roughness: 0.4 })); box(g, 1.7, 1.5, 0.08, 3.95, 1.4, F + 2.42, M('#0d0f11', { roughness: 0.15 })); box(g, 1.7, 1.5, 0.08, 6.05, 1.4, F + 2.42, M('#0d0f11', { roughness: 0.15 })); box(g, 4.0, 0.1, 0.14, 5, 2.5, F + 2.5, steel);
      for (const [hx, hz] of [[4, 0.7], [6, 0.7], [4, 1.8], [6, 1.8]]) cyl(g, 0.5, 0.5, 0.06, hx, 3.13, F + hz, hx === 6 && hz === 0.7 ? new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.5, 0.2) }) : M('#0a0a0a'), 16);
      const kt = grp(g, 4, 3.16, F + 0.7); ball(kt, 0.6, 0, 0.45, 0, copper, 14).scale.y = 0.8; const sp = cyl(kt, 0.07, 0.12, 0.7, 0.6, 0.6, 0, copper, 8); sp.rotation.z = -0.9; const kh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 12, Math.PI), iron); kh.position.y = 0.85; kt.add(kh);
      cyl(g, 0.6, 0.55, 0.5, 6, 3.4, F + 1.8, steel, 16); box(g, 1.1, 0.08, 0.14, 7, 3.55, F + 1.8, iron);      // a saucepan
      box(g, 4.6, 1.4, 1.8, 5, 8.2, F + 0.9, steel); box(g, 1.5, 4.4, 1.0, 5, 11.1, F + 0.5, steel);
      // wall cupboards, a rail of copper pans, jars on the worktop, a clock
      for (const [cx, cw] of [[-13, 7], [11.2, 5.2]]) { box(g, cw, 3.2, 1.3, cx, 8.6, F + 0.65, cab); const n = Math.round(cw / 1.75); for (let k = 0; k < n; k++) { box(g, cw / n - 0.15, 2.9, 0.08, cx - cw / 2 + (k + 0.5) * cw / n, 8.6, F + 1.34, door); box(g, 0.08, 0.6, 0.1, cx - cw / 2 + (k + 0.5) * cw / n + 0.5, 7.7, F + 1.42, brass); } }
      cyl(g, 0.05, 0.05, 5, 11.2, 6.4, F + 0.6, iron, 6).rotation.z = Math.PI / 2;
      for (let k = 0; k < 4; k++) { const r = 0.7 - k * 0.1, px = 9.4 + k * 1.25; box(g, 0.08, 1.3, 0.06, px, 5.7, F + 0.6, iron); const p = cyl(g, r, r * 0.9, 0.3, px, 4.9 - r * 0.2, F + 0.55, copper, 16); p.rotation.x = Math.PI / 2; }
      for (let k = 0; k < 7; k++) { const jh = rng.range(0.6, 1.1); cyl(g, 0.3, 0.3, jh, -15.4 + k * 0.85, 3.1 + jh / 2, F + 0.6, M(rng.pick(['#d9b06a', '#8a5a3a', '#e8e0c8', '#a84a3a', '#6a8a4a']), { roughness: 0.4 }), 12); cyl(g, 0.32, 0.32, 0.12, -15.4 + k * 0.85, 3.16 + jh, F + 0.6, iron, 12); }
      cyl(g, 0.95, 0.95, 0.2, 0.9, 9.4, F + 0.1, M('#a13d38'), 22).rotation.x = Math.PI / 2; const cf = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), new THREE.MeshBasicMaterial({ map: clockFace })); cf.position.set(0.9, 9.4, F + 0.22); g.add(cf);
      // the fridge
      box(g, 3.2, 6.8, 2.6, 15.6, 3.5, F + 1.3, M('#e8ecea', { roughness: 0.35 })); box(g, 3.22, 0.06, 2.62, 15.6, 4.9, F + 1.3, M('#b8bcba')); box(g, 0.12, 1.4, 0.16, 14.4, 3.8, F + 2.7, steel); box(g, 0.12, 0.9, 0.16, 14.4, 5.7, F + 2.7, steel);
      for (let k = 0; k < 5; k++) box(g, 0.5, 0.6, 0.03, 15.2 + (k % 3) * 0.6, 5.4 + Math.floor(k / 3) * 0.8, F + 2.62, M(rng.pick(['#f2e36a', '#f6f4ee', '#9fd0e8', '#f0a0a0'])));      // notes under magnets
      // the kitchen table, with a gingham cloth and the tea things
      const kt2 = table(g, -12, 7, 2.2, 2.7, paleWood); cyl(kt2, 2.3, 2.3, 0.06, 0, 2.84, 0, M('#d85a4a', { roughness: 1 }), 28);
      ball(kt2, 0.6, 0, 3.4, 0, M('#3f6a8a', { roughness: 0.3 }), 14); cyl(kt2, 0.08, 0.14, 0.7, 0.65, 3.5, 0, M('#3f6a8a', { roughness: 0.3 }), 8).rotation.z = -0.9; ball(kt2, 0.14, 0, 4.02, 0, M('#3f6a8a'), 8);
      for (const a of [1.2, 3.6]) { cyl(kt2, 0.25, 0.18, 0.35, Math.cos(a) * 1.3, 3.05, Math.sin(a) * 1.3, china, 12); cyl(kt2, 0.42, 0.3, 0.05, Math.cos(a) * 1.3, 2.9, Math.sin(a) * 1.3, china, 14); }
      chair(g, -12, 10.2, Math.PI, paleWood); chair(g, -8.8, 7, -Math.PI / 2, paleWood);
      box(g, 1.4, 1.9, 1.4, 12.2, 1.07, F + 3.4, M('#b03a30', { roughness: 0.5 })); cyl(g, 0.7, 0.7, 0.12, 12.2, 2.08, F + 3.4, M('#8a2a22'), 4).rotation.y = Math.PI / 4;      // the pedal bin
    }
    await ctx.yield();

    // ---- the front door, facing inward on the north wall; the portal stands in it
    let porch;
    {
      const g = WALLS.north.g, zf = -F;
      box(g, 0.7, 9.6, 0.8, -3.15, 4.8, zf - 0.4, cream); box(g, 0.7, 9.6, 0.8, 3.15, 4.8, zf - 0.4, cream); box(g, 8.2, 0.8, 1.0, 0, 9.7, zf - 0.45, cream);
      box(g, 9.4, 0.25, 2.6, 0, 10.3, zf - 1.2, M('#3f4a48')); box(g, 0.2, 0.2, 2.4, -4.4, 9.6, zf - 1.2, iron).rotation.x = 0.5; box(g, 0.2, 0.2, 2.4, 4.4, 9.6, zf - 1.2, iron).rotation.x = 0.5;      // the porch hood on its brackets
      const dm = M('#1d4b3a', { roughness: 0.45 }); box(g, 5.6, 8.9, 0.15, 0, 4.5, zf - 0.08, dm);
      for (const [px, py, ph] of [[-1.3, 6.9, 2.8], [1.3, 6.9, 2.8], [-1.3, 3.3, 3.4], [1.3, 3.3, 3.4]]) box(g, 2.0, ph, 0.06, px, py, zf - 0.18, M('#245a46', { roughness: 0.45 }));
      box(g, 1.7, 0.42, 0.08, 0, 4.9, zf - 0.2, brass); box(g, 1.3, 0.14, 0.1, 0, 4.9, zf - 0.22, M('#1a1a1a'));      // the letterbox
      const kn = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 14), brass); kn.position.set(0, 6.4, zf - 0.24); g.add(kn); ball(g, 0.22, -2.2, 4.4, zf - 0.3, brass, 10);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshStandardMaterial({ map: text(64, 64, '#f6f4ee', '#1d2b3a', '42', 'bold 40px Georgia, serif', true), roughness: 0.4 })); num.rotation.y = Math.PI; num.position.set(-5.6, 6.9, zf - 0.1); g.add(num);
      box(g, 8.6, 0.4, 2.6, 0, 0.2, zf - 1.3, M('#a39c8c'));      // the step
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.9), new THREE.MeshStandardMaterial({ map: text(256, 128, '#9a7a48', '#3a2a1a', 'WELCOME', 'bold 44px Georgia, serif', true), roughness: 1 })); mat.rotation.set(-Math.PI / 2, 0, Math.PI); mat.position.set(0, 0.42, zf - 1.5); g.add(mat);
      const sgn = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), new THREE.MeshStandardMaterial({ map: text(512, 128, '#f2ead6', '#2d3a2c', 'COME OUTSIDE', 'bold 62px Georgia, serif', true), roughness: 0.6 })); sgn.rotation.y = Math.PI; sgn.position.set(0, 11.6, zf - 0.12); g.add(sgn);
      box(g, 3.4, 1.5, 0.08, -5.6, 5.2, zf - 0.06, brass);      // the plate by the door
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.25), new THREE.MeshStandardMaterial({ map: text(512, 200, '#d9b860', '#2a2010', 'THE OUTSIDE OF THE ASYLUM', 'bold 30px Georgia, serif', true), roughness: 0.4 })); plate.rotation.y = Math.PI; plate.position.set(-5.6, 5.2, zf - 0.12); g.add(plate);
      // the porch lantern, lit
      const lx = 4.6; box(g, 0.14, 0.14, 0.9, lx, 8.4, zf - 0.45, iron); box(g, 0.7, 0.1, 0.7, lx, 8.2, zf - 0.9, iron); box(g, 0.7, 0.1, 0.7, lx, 7.1, zf - 0.9, iron); cyl(g, 0.0, 0.5, 0.4, lx, 8.45, zf - 0.9, iron, 4);
      box(g, 0.5, 1.0, 0.5, lx, 7.65, zf - 0.9, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.9) }));
      porch = new THREE.PointLight('#ffc070', 70, 40, 2); porch.position.set(lx, 7.6, zf - 1.6); g.add(porch);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), haloMat); halo.rotation.y = Math.PI; halo.position.set(lx, 7.6, zf - 0.06); g.add(halo);
      for (let k = 0; k < 3; k++) { cyl(g, 0.2, 0.22, 0.75, -3.6 + k * 0.5, 0.8, zf - 0.7 - (k % 2) * 0.4, china, 10); cyl(g, 0.1, 0.18, 0.3, -3.6 + k * 0.5, 1.3, zf - 0.7 - (k % 2) * 0.4, china, 8); }      // three pints of milk
      box(g, 1.2, 0.5, 0.3, 3.4, 0.65, zf - 2.0, iron);      // the boot scraper
    }

    // ---- the garden (the only "outside"): striped lawn, path, beds, bird bath, gnome, bench, water butt, ivy
    {
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 - WALL_T, HALF * 2 - WALL_T), new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.06; house.add(lawn);
      const stone = M('#b8b0a0', { roughness: 0.9 }), dm = new THREE.Object3D(), c = new THREE.Color();
      const pav = new THREE.InstancedMesh(UNIT, stone, 30);
      for (let i = 0; i < 30; i++) { dm.position.set((i % 2 ? 1.0 : -1.0) + rng.range(-0.15, 0.15), 0.12, 16 - Math.floor(i / 2) * 2.3); dm.rotation.set(0, rng.range(-0.15, 0.15), 0); dm.scale.set(1.7, 0.14, 2.0); dm.updateMatrix(); pav.setMatrixAt(i, dm.matrix); }
      house.add(pav);
      // beds along three walls: dark soil, an edging of stones, flowers on stems, a few shrubs
      const soil = M('#3d2a1c', { roughness: 1 }), beds = [[HALF - 2.3, 0, 2.6, 33], [-HALF + 2.3, 0, 2.6, 33], [0, HALF - 2.3, 30, 2.6]];
      for (const [bx, bz, bw, bd] of beds) box(house, bw, 0.3, bd, bx, 0.15, bz, soil);
      const n = Math.round(700 * detail), fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 7, 5), M('#ffffff', { roughness: 0.7 }), n), stems = new THREE.InstancedMesh(UNIT, M('#3f7a3a'), n), edge = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 6, 4), stone, 150);
      for (let i = 0; i < n; i++) {
        const b = beds[i % 3], x = b[0] + rng.range(-0.5, 0.5) * (b[2] - 0.5), z = b[1] + rng.range(-0.5, 0.5) * (b[3] - 0.5), h = rng.range(0.5, 2.0), leafy = rng.chance(0.3);
        dm.position.set(x, 0.3 + h, z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(leafy ? rng.range(1.4, 2.6) : rng.range(0.6, 1.3)); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix);
        fl.setColorAt(i, leafy ? c.setHSL(rng.range(0.25, 0.36), 0.5, rng.range(0.22, 0.36)) : c.set(rng.pick(['#e2486a', '#f2c040', '#b45ad0', '#ffffff', '#f08a3a', '#e84a3a', '#7a8ae8'])));
        dm.position.set(x, 0.3 + h / 2, z); dm.scale.set(0.06, h, 0.06); dm.updateMatrix(); stems.setMatrixAt(i, dm.matrix);
      }
      for (let i = 0; i < 150; i++) { const b = beds[i % 3], t = rng.range(-0.5, 0.5), along = b[3] > b[2]; dm.position.set(along ? b[0] - Math.sign(b[0]) * 1.4 : b[0] + t * b[2], 0.2, along ? b[1] + t * b[3] : b[1] - 1.4); dm.rotation.set(rng(), rng(), rng()); dm.scale.set(rng.range(0.8, 1.5), rng.range(0.6, 1.0), rng.range(0.8, 1.5)); dm.updateMatrix(); edge.setMatrixAt(i, dm.matrix); }
      house.add(fl, stems, edge);
      cyl(house, 0.5, 0.8, 2.6, 9, 1.3, 5, stone, 12); cyl(house, 1.9, 1.0, 0.5, 9, 2.8, 5, stone, 20); cyl(house, 1.65, 1.65, 0.04, 9, 3.04, 5, M('#6fb4d8', { roughness: 0.1 }), 20);      // the bird bath
      const bird = grp(house, 9.9, 3.25, 4.4, 0.8); ball(bird, 0.3, 0, 0.1, 0, M('#6a4a34'), 8).scale.set(0.8, 0.8, 1.3); ball(bird, 0.18, 0, 0.35, 0.3, M('#6a4a34'), 8); const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 5), M('#d8a030')); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.35, 0.52); bird.add(beak);
      // the gnome, fishing in nothing
      const gn = grp(house, 5.2, 0.1, -9.5, -0.6); cyl(gn, 0.45, 0.6, 1.0, 0, 0.5, 0, M('#2f5a9a'), 12); ball(gn, 0.42, 0, 1.3, 0, M('#e8b894'), 10); const hat = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.2, 12), M('#d03a30')); hat.position.y = 2.1; gn.add(hat);
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.8, 10), china); beard.rotation.x = Math.PI; beard.position.set(0, 0.95, 0.25); gn.add(beard); const rod = cyl(gn, 0.03, 0.03, 2.6, 0.5, 1.6, 1.0, darkWood, 5); rod.rotation.x = 1.0;
      // a bench against the west bed, a water butt under the east drainpipe, a watering can
      const bn = grp(house, -13, 0.06, -6, Math.PI / 2); for (let k = 0; k < 4; k++) box(bn, 6, 0.14, 0.45, 0, 1.6, -0.8 + k * 0.5, paleWood); for (let k = 0; k < 3; k++) box(bn, 6, 0.4, 0.12, 0, 2.3 + k * 0.6, -1.1, paleWood); for (const sx of [-2.7, 2.7]) { box(bn, 0.25, 1.6, 2.0, sx, 0.8, 0, iron); box(bn, 0.25, 2.2, 0.25, sx, 2.6, -1.1, iron); }
      const wb = grp(house, HALF - 1.8, 0, -HALF + 2.6); cyl(wb, 1.1, 0.95, 3.0, 0, 1.5, 0, M('#2f5a40', { roughness: 0.6 }), 16); cyl(wb, 1.15, 1.15, 0.15, 0, 3.05, 0, M('#26482f'), 16);
      const wc = grp(house, -6, 0.1, 12, 0.7); cyl(wc, 0.5, 0.5, 0.9, 0, 0.45, 0, M('#5a8a6a', { metalness: 0.2, roughness: 0.5 }), 12); const spout = cyl(wc, 0.06, 0.1, 1.2, 0.8, 0.7, 0, M('#5a8a6a'), 6); spout.rotation.z = -1.0; const wh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 12, Math.PI), M('#5a8a6a')); wh.position.y = 0.9; wc.add(wh);
      // ivy up the inner corner of the west wall
      const iv = Math.round(900 * detail), ivy = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 6, 4), M('#ffffff', { roughness: 0.8 }), iv);
      for (let i = 0; i < iv; i++) { const y = rng.range(0.3, 13) ** 0.9, spread = 2.2 + (13 - y) * 0.55 + noise.n2(y * 0.5, 3) * 1.5, z = HALF - 0.8 - rng() * spread; dm.position.set(-HALF + F + 0.1, y + noise.n2(z, y) * 0.3, z); dm.rotation.set(rng() * 3, rng() * 3, rng() * 3); dm.scale.set(0.35, rng.range(0.9, 1.5), rng.range(0.9, 1.5)); dm.updateMatrix(); ivy.setMatrixAt(i, dm.matrix); ivy.setColorAt(i, c.setHSL(rng.range(0.27, 0.37), rng.range(0.4, 0.6), rng.range(0.16, 0.34))); }
      house.add(ivy);
    }
    await ctx.yield();

    // ---- the five glass fishbowls on their table by the surf, one engraved
    const bowlU = { ...TU, uEngrave: { value: null }, uHas: { value: 0 } };
    {
      const tg = grp(scene, BOWLS[0], 0, BOWLS[1]);
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.1, 40), topTex(rugTex('#d8c9a0', '#27506e', '#8e2f2c'), '#b8a880')); rug.position.y = 0.06; tg.add(rug);
      cyl(tg, 4.2, 4.2, 0.25, 0, 3.0, 0, wood, 36); cyl(tg, 4.3, 4.3, 0.08, 0, 3.14, 0, M('#f3efe6', { roughness: 1 }), 36); cyl(tg, 0.5, 1.2, 3.0, 0, 1.5, 0, darkWood, 14); cyl(tg, 2.2, 2.4, 0.2, 0, 0.2, 0, darkWood, 20);
      shadowed.push([tg, 4.2]);
      const engrave = canvasTex(1024, 256, (x) => {
        x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 256); x.fillStyle = '#fff'; x.font = 'italic 54px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('So long and thanks', 256, 116); x.fillText('for all the fish', 768, 116); x.fillRect(96, 160, 320, 3); x.fillRect(608, 160, 320, 3);
      });
      engrave.colorSpace = THREE.NoColorSpace;
      const bowlMat = (has) => new THREE.ShaderMaterial({
        uniforms: { ...bowlU, uEngrave: { value: engrave }, uHas: { value: has } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: /* glsl */`varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: GLSL_COMMON + /* glsl */`
          uniform vec3 uSun; uniform sampler2D uEngrave; uniform float uHas; uniform float uTime; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
          vec3 world(vec3 d) {      // what a ray leaving the glass meets: the sky, the sea to the south, the sand
            if (d.y > 0.0) return skyMirror(d, uSun);
            vec3 sand = lin(vec3(0.86, 0.72, 0.50)), sea = lin(vec3(0.10, 0.42, 0.52));
            return mix(sand, sea, smoothstep(0.0, 0.5, d.z)) * (0.55 + 0.45 * smoothstep(-0.6, 0.0, d.y));
          }
          void main() {
            vec3 V = normalize(cameraPosition - vW), N = normalize(vN); float face = dot(N, V) < 0.0 ? -1.0 : 1.0; N *= face;
            float nv = max(dot(N, V), 0.0), fres = pow(1.0 - nv, 3.0);
            vec3 through = world(refract(-V, N, 0.72) * vec3(-1.0, -1.0, 1.0));      // a full bowl of glass turns the world over
            vec3 col = mix(through * lin(vec3(0.90, 0.97, 1.0)), skyMirror(reflect(-V, N), uSun), 0.08 + fres * 0.85);
            vec3 H = normalize(uSun + V); float spec = pow(max(dot(N, H), 0.0), 260.0);
            col += lin(vec3(1.0, 0.88, 0.66)) * (spec * 9.0 + pow(max(dot(N, H), 0.0), 30.0) * 0.25);
            col += lin(vec3(1.0, 0.75, 0.45)) * pow(max(dot(-N, uSun), 0.0), 3.0) * (1.0 - nv) * 0.9;      // the sun caught in the far wall
            float frost = texture2D(uEngrave, vUv).r * uHas * step(0.0, face);
            col = mix(col, lin(vec3(0.95, 0.97, 1.0)) * (0.7 + 0.5 * max(dot(N, uSun), 0.0)), frost * 0.8);
            float a = clamp(0.22 + fres * 0.7 + spec * 2.0 + frost * 0.7, 0.0, 1.0);
            gl_FragColor = vec4(col, face > 0.0 ? a : a * 0.45);
          }`,
      });
      const bg = new THREE.SphereGeometry(1.35, 40, 28, 0, Math.PI * 2, 0.55, Math.PI - 0.55), rimR = 1.35 * Math.sin(0.55), rimY = 1.35 * Math.cos(0.55);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + 0.9, bx = Math.cos(a) * 2.5, bz = Math.sin(a) * 2.5, m = bowlMat(i === 0 ? 1 : 0);
        const b = new THREE.Mesh(bg, m); b.position.set(bx, 3.18 + 1.33, bz); b.rotation.y = i === 0 ? 1.9 : rng.range(0, 6); b.renderOrder = 5; tg.add(b);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.06, 8, 32), m); lip.rotation.x = Math.PI / 2; lip.position.set(bx, 3.18 + 1.33 + rimY, bz); lip.renderOrder = 5; tg.add(lip);
        const caustic = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: glowTex, color: '#fff0c8', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); caustic.rotation.x = -Math.PI / 2; caustic.position.set(bx + 0.9, 3.2, bz - 0.55); tg.add(caustic);
      }
    }
    await ctx.yield();

    // ---- shadows: the house's long one, draped on the sand, and a soft one for each piece of furniture
    {
      const off = [-SUN.x / SUN.y * WALL_H, -SUN.z / SUN.y * WALL_H], H = HALF + 0.5;
      const hex = [[-H, H], [H, H], [H + off[0], H + off[1]], [H + off[0], -H + off[1]], [-H + off[0], -H + off[1]], [-H, -H]];
      const g = new THREE.PlaneGeometry(96, 78, 64, 52); g.rotateX(-Math.PI / 2); g.translate(H + off[0] / 2 - 22, 0, off[1] / 2);
      const pos = g.attributes.position, al = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i); let dmin = 1e9;
        for (let k = 0; k < 6; k++) { const a = hex[k], b = hex[(k + 1) % 6], ex = b[0] - a[0], ez = b[1] - a[1]; dmin = Math.min(dmin, -((ex * (z - a[1]) - ez * (x - a[0])) / Math.hypot(ex, ez))); }
        const inside = Math.abs(x) < H - 1 && Math.abs(z) < H - 1;
        al[i] = inside ? 0 : smoothstep(-0.5, 2.5, Math.abs(dmin)) * (dmin > 0 || hexInside(hex, x, z) ? 1 : 0);
        pos.setY(i, ground(x, z) + 0.2);
      }
      function hexInside(h, x, z) { let s = 0; for (let k = 0; k < 6; k++) { const a = h[k], b = h[(k + 1) % 6]; const cr = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]); if (cr > 0) s++; else if (cr < 0) s--; } return Math.abs(s) === 6; }
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); if (!hexInside(hex, x, z)) al[i] = 0; }
      g.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
      scene.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
        vertexShader: /* glsl */`attribute float aAlpha; varying float vA; void main() { vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`varying float vA; void main() { gl_FragColor = vec4(0.035, 0.03, 0.07, vA * 0.5); }` })));
      scene.updateMatrixWorld(true);
      const p = new THREE.Vector3(), dx = -SUN.x / Math.hypot(SUN.x, SUN.z), dz = -SUN.z / Math.hypot(SUN.x, SUN.z), pg = new THREE.PlaneGeometry(1, 1);
      for (const [o, r] of shadowed) {
        o.getWorldPosition(p); const L = r * 3.2, m = new THREE.Mesh(pg, blobMat);
        m.scale.set(L + r * 2.4, r * 2.4, 1); m.rotation.set(-Math.PI / 2, 0, Math.atan2(-dz, dx)); m.position.set(p.x + dx * L * 0.42, ground(p.x, p.z) + 0.26, p.z + dz * L * 0.42); m.renderOrder = 2; scene.add(m);
      }
    }

    // ---- dune grass in tufts, swaying
    {
      const BL = 6, v = [];
      for (let b = 0; b < BL; b++) {      // each blade: a bent ribbon of two quads and a tip, leaning out from the tuft's middle
        const a = b / BL * 6.283 + (b % 2) * 0.5, lean = 0.25 + (b % 3) * 0.2, wdt = 0.07, cx = Math.cos(a), cz = Math.sin(a), px = -cz * wdt, pz = cx * wdt;
        const P = (t) => [cx * lean * t * t + cx * 0.08, t, cz * lean * t * t + cz * 0.08];
        const q = [P(0), P(0.5), P(0.85), P(1)];
        const push = (p, s, k) => v.push(p[0] + px * s * k, p[1], p[2] + pz * s * k);
        push(q[0], -1, 1); push(q[0], 1, 1); push(q[1], 1, 0.8); push(q[0], -1, 1); push(q[1], 1, 0.8); push(q[1], -1, 0.8);
        push(q[1], -1, 0.8); push(q[1], 1, 0.8); push(q[2], 1, 0.5); push(q[1], -1, 0.8); push(q[2], 1, 0.5); push(q[2], -1, 0.5);
        push(q[2], -1, 0.5); push(q[2], 1, 0.5); push(q[3], 0, 0);
      }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
      const nrm = new Float32Array(v.length); for (let i = 0; i < nrm.length; i += 3) { nrm[i] = 0; nrm[i + 1] = 1; nrm[i + 2] = 0; } tg.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      const gm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide });
      gm.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = TU.uTime;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float gph = instanceMatrix[3].x * 0.21 + instanceMatrix[3].z * 0.17, gk = position.y * position.y;
            transformed.x += (sin(uTime * 1.6 + gph) * 0.24 + sin(uTime * 3.7 + gph * 2.3) * 0.07) * gk;
            transformed.z += cos(uTime * 1.3 + gph * 1.4) * 0.13 * gk;
          #endif`);
      };
      const n = Math.round(11000 * detail), im = new THREE.InstancedMesh(tg, gm, n), dm = new THREE.Object3D(), c = new THREE.Color();
      let k = 0;
      for (let t = 0; t < n * 8 && k < n; t++) {
        const x = rng.range(-560, 560), z = rng.range(-560, 64), d = Math.hypot(x, z);
        if (d < 60 || Math.hypot(x - BOWLS[0], z - BOWLS[1]) < 11 || noise.fbm2(x * 0.018 + 9, z * 0.018, 2) < -0.02) continue;
        const cl = rng.int(1, 4);      // a clump of tufts
        for (let j = 0; j < cl && k < n; j++) {
          const cx = x + rng.range(-1.6, 1.6), cz = z + rng.range(-1.6, 1.6), s = rng.range(1.6, 3.8);
          dm.position.set(cx, ground(cx, cz) - 0.15, cz); dm.rotation.set(0, rng.range(0, 6.28), 0); dm.scale.set(s * 0.9, s, s * 0.9); dm.updateMatrix();
          im.setMatrixAt(k, dm.matrix); im.setColorAt(k, c.setHSL(rng.range(0.15, 0.25), rng.range(0.35, 0.6), rng.range(0.46, 0.64))); k++;
        }
      }
      im.count = k; scene.add(im);
    }
    await ctx.yield();

    // ---- on the sand: driftwood, kelp, shells along the wrack line, two lines of footprints
    {
      const dm = new THREE.Object3D(), c = new THREE.Color(), bleached = M('#c4bbab', { roughness: 1 });
      for (let i = 0; i < 9; i++) {
        const x = rng.range(-150, 150), z = rng.range(60, 76); if (Math.hypot(x - BOWLS[0], z - BOWLS[1]) < 14 || Math.abs(x - 35) < 9) continue;
        const g = grp(scene, x, ground(x, z) + 0.3, z, rng.range(0, 3.14)), L = rng.range(4, 11);
        const log = cyl(g, 0.28, 0.5, L, 0, 0, 0, bleached, 7); log.rotation.z = Math.PI / 2 + rng.range(-0.06, 0.06);
        for (let b = 0; b < 3; b++) { const br = cyl(g, 0.06, 0.16, rng.range(1, 2.4), rng.range(-L / 3, L / 3), 0.5, rng.range(-0.3, 0.3), bleached, 5); br.rotation.set(rng.range(-0.8, 0.8), 0, rng.range(-0.8, 0.8)); }
      }
      const shells = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 6, 4), M('#ffffff', { roughness: 0.6 }), Math.round(700 * detail));
      for (let i = 0; i < shells.count; i++) {
        const x = rng.range(-330, 330), z = 70 + noise.n2(x * 0.03, 5) * 5 + rng.gauss() * 2.2, kelp = rng.chance(0.3);
        dm.position.set(x, ground(x, z) + 0.05, z); dm.rotation.set(0, rng() * 6, 0); dm.scale.set(kelp ? rng.range(2, 6) : rng.range(0.5, 1.6), kelp ? 0.25 : 0.5, rng.range(0.5, 1.4)); dm.updateMatrix(); shells.setMatrixAt(i, dm.matrix);
        shells.setColorAt(i, kelp ? c.setHSL(0.2, 0.35, rng.range(0.1, 0.2)) : c.setHSL(rng.range(0.03, 0.12), rng.range(0.1, 0.5), rng.range(0.6, 0.9)));
      }
      scene.add(shells);
      const steps = [], trail = (from, to, n) => { const dx = to[0] - from[0], dz = to[1] - from[1], L = Math.hypot(dx, dz), a = Math.atan2(dx, dz); for (let i = 0; i < n; i++) { const t = i / (n - 1), s = i % 2 ? 0.55 : -0.55, w = Math.sin(t * 9) * 1.2; steps.push([from[0] + dx * t + (dz / L) * (s + w), from[1] + dz * t - (dx / L) * (s + w), a]); } };
      trail([16, 92], [8, 44], 22); trail([-150, 84], [10, 90], 60); trail([BOWLS[0] - 5, BOWLS[1] - 6], [18, 37], 9);
      const fp = new THREE.InstancedMesh(new THREE.CircleGeometry(0.5, 10), new THREE.MeshBasicMaterial({ color: '#6b5236', transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), steps.length);
      steps.forEach(([x, z, a], i) => { dm.position.set(x, ground(x, z) + 0.045, z); dm.rotation.set(-Math.PI / 2, 0, a, 'YXZ'); dm.rotation.y = a; dm.scale.set(0.75, 1.7, 1); dm.updateMatrix(); fp.setMatrixAt(i, dm.matrix); });
      scene.add(fp);
    }

    // ---- far things: a headland with its light under the sun, a pier to the east
    const lighthouse = new THREE.Mesh(new THREE.SphereGeometry(9, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.8), fog: false }));
    {
      const g = new THREE.PlaneGeometry(3000, 2200, 80, 60); g.rotateX(-Math.PI / 2); g.translate(-2900, 0, 300);
      const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), rock = new THREE.Color('#5a4a3c'), turf = new THREE.Color('#6f7448');
      const hl = (x, z) => { const u = (x + 2900) / 1400, w = (z - 300) / 1000, f = smoothstep(1.0, 0.25, Math.hypot(u, w * (w > 0 ? 1.25 : 0.8))); return f * (230 + 110 * noise.fbm2(x * 0.0022, z * 0.0022, 4)) + (f - 0.5) * 30 * noise.ridged2(x * 0.006, z * 0.006, 3) - 12; };
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = hl(x, z); pos.setY(i, y); c.copy(rock).lerp(turf, smoothstep(60, 190, y) * (0.5 + 0.5 * noise.n2(x * 0.004, z * 0.004))); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
      const lx = -2500, lz = 900, ly = hl(lx, lz); const tower = cyl(scene, 9, 14, 90, lx, ly + 40, lz, M('#f1ece0'), 14); cyl(scene, 13, 13, 4, lx, ly + 86, lz, M('#a8382c'), 14); cyl(scene, 0, 11, 12, lx, ly + 106, lz, M('#a8382c'), 12);
      lighthouse.position.set(lx, ly + 95, lz); scene.add(lighthouse); tower.material.color.multiplyScalar(1.0);
      // the pier
      const px = 300, deck = M('#8a765c', { roughness: 1 }), tim = M('#4f4234', { roughness: 1 }), dm = new THREE.Object3D();
      box(scene, 9, 0.5, 420, px, 7, 270, deck); box(scene, 0.25, 0.25, 420, px - 4.4, 8.6, 270, tim); box(scene, 0.25, 0.25, 420, px + 4.4, 8.6, 270, tim);
      const piles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.5, 26, 7), tim, 60), posts = new THREE.InstancedMesh(UNIT, tim, 140);
      for (let i = 0; i < 60; i++) { dm.position.set(px + (i % 2 ? 3.8 : -3.8), -6, 64 + Math.floor(i / 2) * 14.2); dm.rotation.set(0, 0, (i % 2 ? -1 : 1) * 0.05); dm.scale.set(1, 1, 1); dm.updateMatrix(); piles.setMatrixAt(i, dm.matrix); }
      for (let i = 0; i < 140; i++) { dm.position.set(px + (i % 2 ? 4.4 : -4.4), 8.0, 62 + Math.floor(i / 2) * 6); dm.rotation.set(0, 0, 0); dm.scale.set(0.22, 1.5, 0.22); dm.updateMatrix(); posts.setMatrixAt(i, dm.matrix); }
      scene.add(piles, posts);
      box(scene, 22, 0.6, 22, px, 7, 490, deck); box(scene, 12, 6, 10, px, 10.3, 492, M('#e8e0cc')); const roof = cyl(scene, 0, 9.5, 4.5, px, 15.5, 492, M('#a8382c'), 4); roof.rotation.y = Math.PI / 4; box(scene, 2, 3.4, 0.2, px, 9, 486.9, M('#2f4a6a'));
      for (let i = 0; i < 7; i++) { const lz2 = 90 + i * 62; cyl(scene, 0.12, 0.16, 5, px - 4.4, 10.5, lz2, iron, 6); ball(scene, 0.5, px - 4.4, 13.2, lz2, lampGlow, 8); }
    }
    await ctx.yield();

    // ---- gulls: a few wheeling over the surf (well above and seaward of the route), a few standing about
    const gulls = [];
    {
      const wing = (len, back) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -0.34, len, 0, back, 0, 0, 0.42, 0, 0, 0.42, len, 0, back, len, 0, back + 0.4]), 3)); g.computeVertexNormals(); return g; };
      const inner = wing(1.5, -0.1), outer = wing(1.7, 0.45), white = new THREE.MeshStandardMaterial({ color: '#f7f4ec', side: THREE.DoubleSide, roughness: 0.9 }), grey = new THREE.MeshStandardMaterial({ color: '#8f97a3', side: THREE.DoubleSide, roughness: 0.9 }), bill = M('#e8b030');
      const gull = () => {
        const g = new THREE.Group(), wings = [];
        for (const s of [1, -1]) { const a = new THREE.Group(); a.scale.x = s; a.add(new THREE.Mesh(inner, grey)); const b = new THREE.Group(); b.position.set(1.5, 0, -0.1); b.add(new THREE.Mesh(outer, grey)); a.add(b); g.add(a); wings.push([a, b, s]); }
        const body = ball(g, 0.3, 0, -0.05, 0.05, white, 10); body.scale.set(0.9, 0.8, 2.6); ball(g, 0.2, 0, 0.1, -0.85, white, 8); const bk = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 5), bill); bk.rotation.x = -Math.PI / 2; bk.position.set(0, 0.07, -1.15); g.add(bk);
        const tail = box(g, 0.5, 0.04, 0.6, 0, 0, 0.95, white); tail.rotation.x = 0.05;
        return { g, wings };
      };
      for (let i = 0; i < 11; i++) {
        const b = gull(); b.g.scale.setScalar(rng.range(1.0, 1.5)); scene.add(b.g);
        gulls.push({ ...b, cx: rng.range(-190, 190), cz: rng.range(140, 330), r: rng.range(28, 75), y: rng.range(30, 62), w: rng.range(0.12, 0.24) * rng.sign(), ph: rng.range(0, 6.28), flap: rng.range(2.6, 3.6) });
      }
      for (let i = 0; i < 7; i++) {      // standing on the wet sand, wings folded
        const x = rng.range(-120, 0), z = rng.range(76, 84), s = grp(scene, x, ground(x, z), z, rng.range(0, 6));
        const body = ball(s, 0.35, 0, 0.75, 0, white, 10); body.scale.set(0.9, 0.85, 1.9); const back = ball(s, 0.33, 0, 0.86, 0.1, grey, 8); back.scale.set(0.8, 0.5, 1.8); ball(s, 0.2, 0, 1.15, -0.55, white, 8);
        const bk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), bill); bk.rotation.x = -Math.PI / 2; bk.position.set(0, 1.12, -0.85); s.add(bk); box(s, 0.04, 0.5, 0.04, -0.12, 0.25, 0, bill); box(s, 0.04, 0.5, 0.04, 0.12, 0.25, 0, bill);
      }
    }

    function update(dt, time) {
      TU.uTime.value = time;
      for (const b of gulls) {
        const a = b.ph + time * b.w, glide = smoothstep(-0.2, 0.6, Math.sin(time * 0.31 + b.ph * 3));      // they flap, then hold a glide
        b.g.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 2.3) * 2.5, b.cz + Math.sin(a) * b.r);
        b.g.rotation.set(0, -a + (b.w > 0 ? Math.PI : 0), (b.w > 0 ? -1 : 1) * 0.32);
        const f = Math.sin(time * b.flap + b.ph) * (1 - glide * 0.85), up = 0.12 + f * 0.45;
        for (const [inn, out] of b.wings) { inn.rotation.z = up; out.rotation.z = -0.25 + f * 0.5 - up * 0.4; }
      }
      for (const [f, ph, amp] of flames) { f.scale.y = 1 + (Math.sin(time * 9 + ph * 3) * 0.14 + Math.sin(time * 14.3 + ph) * 0.1) * (amp > 0.5 ? 1.6 : 1); f.scale.x = f.scale.z = 1 + Math.sin(time * 11 + ph * 2) * 0.08; f.rotation.y = time * 2 + ph; }
      for (let i = 0; i < pendulums.length; i++) pendulums[i].rotation.z = Math.sin(time * 2.6 + i) * 0.16;
      lighthouse.scale.setScalar(0.5 + 1.5 * Math.pow(Math.max(0, Math.sin(time * 0.9)), 8));
      if (porch) porch.intensity = 70 + Math.sin(time * 13) * 2;
    }

    return {
      scene, path, duration: 45,
      camera: { fov: 62, near: 0.3, far: 9000, lookAhead: 20, sway: 0.3, bank: 0.15 },
      pois: [{ at: [BOWLS[0], 4.5, BOWLS[1]], from: 0.05, to: 0.2, weight: 0.55 }, { at: [0, 6, 0], from: 0.22, to: 0.72, weight: 0.55 }],
      portal: { shape: 'rect', width: 5, height: 8, color: '#fff4d8', glow: 0.4 },
      post: { exposure: 1.05, bloom: { strength: 0.35, radius: 0.8, threshold: 0.92 },
        grade: { saturation: 1.08, contrast: 1.04, vignette: 0.25, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() {},
    };
  },
};
