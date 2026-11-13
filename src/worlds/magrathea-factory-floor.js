// THE FACTORY FLOOR OF MAGRATHEA. A hall so large it has its own haze, lit from roof lamps and skylight shafts, its walls
// lined with lit galleries. In the middle bay, in a ring of scaffold towers and cranes, hangs a half-built Earth: the near
// side finished (ocean, continents, cloud, a rim of air), the far side still open ribs and lattice round a glowing core,
// with a ragged edge of plating where the welders are. On the finished side a team is laying a coastline of fjords.
// Down both sides of the hall stand the catalogue: gold, platinum, ringed, a soft pink one in fluffy cloud, each on its
// cradle in a painted bay. We fly in level along a gantry straight at the Earth, past a floating sales kiosk, bank round
// to the unbuilt side, and leave by the portal.
import * as THREE from 'three';
import { makePath, makeNoise } from '../kit/core.js';

const R = 400, C = new THREE.Vector3(0, 40, -1000), FLOOR = -470, ROOF = 1000;
const HALL = { x0: -3800, x1: 3800, z0: -5600, z1: 2400 };
const PTS = [[-150, 30, 700], [-150, 30, 500], [-220, 60, 100], [-420, 140, -350], [-640, 240, -850], [-560, 300, -1400],
  [-100, 320, -1680], [420, 260, -1560], [700, 180, -1150], [760, 150, -800], [780, 150, -600]];
const FOG_DEN = 0.0002;

const GLSL_COMMON = /* glsl */`
  uniform vec3 uAxis; uniform vec3 uFogCol; uniform float uFogDen; uniform float uTime;
  varying vec3 vLocal; varying vec3 vWorld; varying vec3 vView;
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
  // the plating: panels on a grid of longitude and latitude; a panel is hung or it is not
  vec2 panelGrid(vec3 d){ return vec2(atan(d.z, d.x) / 6.2831853 * 56.0, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 * 30.0); }
  float edgeVal(vec3 d){ vec2 cell = floor(panelGrid(d)), cc = cell + 0.5; float lo = cc.x / 56.0 * 6.2831853, la = cc.y / 30.0 * 3.14159265;
    vec3 cd = vec3(cos(la) * cos(lo), sin(la), cos(la) * sin(lo));
    return dot(cd, uAxis) + 0.30 * (h3(vec3(cell, 3.0)) - 0.5) + 0.35 * (vnoise(cd * 2.3 + 7.0) - 0.5); }
  vec3 fogged(vec3 c){ float d = length(vView); return mix(uFogCol, c, exp(-uFogDen * uFogDen * d * d)); }
`;
const SHELL_VERT = /* glsl */`
  varying vec3 vLocal; varying vec3 vWorld; varying vec3 vView;
  void main(){ vLocal = position; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vec4 mv = viewMatrix * w; vView = mv.xyz; gl_Position = projectionMatrix * mv; }
`;

export default {
  id: 'magrathea-factory-floor',
  name: 'The Factory Floor of Magrathea',
  category: 'books',
  placeKind: 'interior',
  book: "The Hitchhiker's Guide to the Galaxy",
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.7,
  media: ['interior'],
  async build(ctx) {
    const rng = ctx.rng, detail = ctx.quality?.detail ?? 1;
    const noise = makeNoise(Math.floor(rng() * 1e9));
    const scene = new THREE.Scene();
    const HAZE = new THREE.Color('#6b5038');
    scene.background = HAZE.clone();
    scene.fog = new THREE.FogExp2(HAZE.clone(), FOG_DEN);
    const path = makePath(PTS);
    const disposables = [];
    const keep = (o) => { disposables.push(o); return o; };
    const UP = new THREE.Vector3(0, 1, 0);
    const SHARED = { uAxis: { value: new THREE.Vector3(0.25, 0.3, -0.9).normalize() }, uFogCol: { value: HAZE.clone() }, uFogDen: { value: FOG_DEN }, uTime: { value: 0 } };
    const AXIS = SHARED.uAxis.value;

    // ---- light
    const KEY_DIR = new THREE.Vector3(-0.35, 0.8, 0.5).normalize();
    const hemi = new THREE.HemisphereLight(new THREE.Color('#ffe6c4'), new THREE.Color('#6a4526'), 1.35);
    const key = new THREE.DirectionalLight(new THREE.Color('#fff0d4'), 2.5);
    key.position.copy(C).addScaledVector(KEY_DIR, 2000); key.target.position.copy(C);
    const rim = new THREE.DirectionalLight(new THREE.Color('#8fb0e8'), 1.1);
    rim.position.set(900, 100, -2600); rim.target.position.copy(C);
    const coreLight = new THREE.PointLight(new THREE.Color('#ff7a22'), 2600, 1500, 1.1); coreLight.position.copy(C);
    scene.add(hemi, key, key.target, rim, rim.target, coreLight);

    // ---- everything boxy in the hall goes into three instanced meshes, by paint
    const BOXES = { steel: [], yellow: [], dark: [], white: [] };
    const lamps = [], workers = [];
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
    const beam = (ax, ay, az, bx, by, bz, t, kind = 'steel') => {
      _a.set(ax, ay, az); _b.set(bx, by, bz); const len = _a.distanceTo(_b); if (len < 0.01) return;
      const mid = _a.clone().add(_b).multiplyScalar(0.5), dir = _b.clone().sub(_a).normalize();
      _q.setFromUnitVectors(UP, dir); _s.set(t, len, t); BOXES[kind].push(new THREE.Matrix4().compose(mid, _q, _s));
    };
    const slab = (x, y, z, sx, sy, sz, ry = 0, kind = 'steel') => {
      _q.setFromEuler(_e.set(0, ry, 0)); BOXES[kind].push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(sx, sy, sz)));
    };
    const lamp = (x, y, z) => { if (path.distanceTo(x, y, z) > 12) lamps.push(x, y, z); };
    const clear = (x, y, z, r = 0) => path.distanceTo(x, y, z) > r + 20;
    const crew = (x, y, z, n, spread) => { for (let i = 0; i < n; i++) workers.push(x + rng.range(-spread, spread), y + 1.6, z + rng.range(-spread, spread)); };
    // a lattice tower: four legs, rings and cross braces
    const tower = (x, z, w, y0, y1, step, t = 2.4) => {
      const h = w / 2, cs = [[-h, -h], [h, -h], [h, h], [-h, h]];
      for (const c of cs) beam(x + c[0], y0, z + c[1], x + c[0], y1, z + c[1], t);
      let flip = 0;
      for (let y = y0; y < y1 - 1; y += step) {
        const yt = Math.min(y1, y + step);
        for (let k = 0; k < 4; k++) { const p = cs[k], q = cs[(k + 1) % 4];
          beam(x + p[0], yt, z + p[1], x + q[0], yt, z + q[1], t * 0.55);
          if ((k + flip) % 2 === 0) beam(x + p[0], y, z + p[1], x + q[0], yt, z + q[1], t * 0.45); else beam(x + q[0], y, z + q[1], x + p[0], yt, z + p[1], t * 0.45); }
        flip++;
      }
    };

    // =====================================================================================================
    // THE EARTH
    // =====================================================================================================
    const FJ = new THREE.Vector3(-0.3, -0.02, 0.95).normalize();      // where the fjords are being laid (faces the way we fly in)
    const earthU = { ...SHARED, uKey: { value: KEY_DIR }, uRim: { value: new THREE.Vector3(0.3, 0.05, -0.95).normalize() }, uFjord: { value: FJ }, uSeed: { value: new THREE.Vector3(rng.range(0, 40), rng.range(0, 40), rng.range(0, 40)) } };
    const earthMat = keep(new THREE.ShaderMaterial({
      uniforms: earthU, side: THREE.DoubleSide, vertexShader: SHELL_VERT,
      fragmentShader: GLSL_COMMON + /* glsl */`
        uniform vec3 uKey; uniform vec3 uRim; uniform vec3 uFjord; uniform vec3 uSeed;
        void main(){
          vec3 d = normalize(vLocal);
          float ev = edgeVal(d);
          if (ev > 0.1) discard;
          vec2 g = panelGrid(d), f = fract(g); float seam = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
          vec3 col;
          if (!gl_FrontFacing) {      // the back of the plating: dark metal in the core's glow, ribbed
            float rib = step(0.42, abs(f.x - 0.5)) + step(0.42, abs(f.y - 0.5));
            col = vec3(0.13, 0.09, 0.07) + vec3(0.55, 0.19, 0.04) * (0.5 + 0.3 * rib);
          } else {
            float fj = smoothstep(0.42, 0.0, distance(d, uFjord));
            float n = fbm(d * 1.75 + uSeed) + 0.16 * fj;
            n += (fbm(d * 14.0 + uSeed) - 0.5) * (0.035 + 0.12 * fj);      // a crinkled coast, most of all where the fjords are
            float land = smoothstep(0.515, 0.525, n);
            float hgt = clamp((n - 0.52) / 0.2, 0.0, 1.0), lat = abs(d.y);
            float dry = fbm(d * 3.1 - uSeed.zxy);
            vec3 green = mix(vec3(0.10, 0.30, 0.09), vec3(0.24, 0.42, 0.14), dry);
            vec3 sand = vec3(0.70, 0.58, 0.36), rock = vec3(0.40, 0.34, 0.28);
            vec3 lc = mix(green, sand, smoothstep(0.50, 0.66, dry + 0.25 * (1.0 - lat) - 0.2 * lat));
            lc = mix(lc, rock, smoothstep(0.45, 0.9, hgt));
            lc = mix(lc, vec3(0.95), smoothstep(0.8, 1.0, hgt + lat * 0.5));
            vec3 oc = mix(vec3(0.015, 0.09, 0.30), vec3(0.06, 0.38, 0.55), smoothstep(0.40, 0.52, n));
            vec3 base = mix(oc, lc, land);
            float ice = smoothstep(0.84, 0.90, lat + (n - 0.5) * 0.25); base = mix(base, vec3(0.93, 0.96, 1.0), ice);
            vec3 V = normalize(cameraPosition - vWorld);
            float dif = max(dot(d, uKey), 0.0), back = max(dot(d, uRim), 0.0);
            float spec = pow(max(dot(d, normalize(uKey + V)), 0.0), 70.0) * (1.0 - land) * (1.0 - ice);
            col = base * (0.30 + 0.80 * dif + 0.2 * back * vec3(0.6, 0.75, 1.0)) + vec3(1.0, 0.9, 0.7) * spec * 0.8;
            col *= 1.0 - 0.22 * smoothstep(0.035, 0.0, seam) * smoothstep(-0.5, 0.1, ev);      // seams show near the working edge
            col = mix(col, vec3(0.75, 0.5, 0.3), 0.35 * smoothstep(-0.02, 0.1, ev));               // the newest panels are still in primer
            col += vec3(0.2, 0.4, 0.8) * pow(1.0 - max(dot(d, V), 0.0), 3.0) * 0.3;
          }
          gl_FragColor = vec4(fogged(col), 1.0);
        }`,
    }));
    const earth = new THREE.Mesh(keep(new THREE.SphereGeometry(R, 128, 96)), earthMat); earth.position.copy(C); scene.add(earth);
    // cloud, over the finished plating only
    const cloudMat = keep(new THREE.ShaderMaterial({
      uniforms: { ...SHARED, uKey: { value: KEY_DIR } }, transparent: true, depthWrite: false, vertexShader: SHELL_VERT,
      fragmentShader: GLSL_COMMON + /* glsl */`
        uniform vec3 uKey;
        void main(){ vec3 d = normalize(vLocal); float ev = edgeVal(d); if (ev > -0.06) discard;
          vec3 p = d * 3.2 + vec3(uTime * 0.004, 0.0, uTime * 0.002);
          float c = fbm(p + 0.6 * vec3(fbm(p * 2.0), fbm(p * 2.0 + 5.0), 0.0));
          float a = smoothstep(0.56, 0.74, c) * 0.85 * smoothstep(-0.06, -0.3, ev);
          vec3 col = vec3(1.0, 0.98, 0.95) * (0.38 + 0.55 * max(dot(d, uKey), 0.0));
          gl_FragColor = vec4(fogged(col), a); }`,
    }));
    const clouds = new THREE.Mesh(keep(new THREE.SphereGeometry(R + 7, 96, 64)), cloudMat); clouds.position.copy(C); clouds.renderOrder = 2; scene.add(clouds);
    // a rim of air
    const airMat = keep(new THREE.ShaderMaterial({
      uniforms: SHARED, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: SHELL_VERT,
      fragmentShader: GLSL_COMMON + /* glsl */`
        void main(){ vec3 d = normalize(vLocal); vec3 V = normalize(cameraPosition - vWorld);
          float rimv = pow(1.0 - max(dot(d, V), 0.0), 2.6) * smoothstep(0.02, 0.35, dot(d, V));
          float m = smoothstep(0.25, -0.25, dot(d, uAxis));
          float fd = length(vView); gl_FragColor = vec4(vec3(0.35, 0.62, 1.0) * rimv * m * 0.6 * exp(-uFogDen * uFogDen * fd * fd), 1.0); }`,
    }));
    const air = new THREE.Mesh(keep(new THREE.SphereGeometry(R + 26, 64, 48)), airMat); air.position.copy(C); air.renderOrder = 3; scene.add(air);
    await ctx.yield();

    // the ribs under the plating, the inner lattice, and the core
    const ribMat = keep(new THREE.MeshStandardMaterial({ color: '#8a6a52', roughness: 0.5, metalness: 0.55, emissive: '#5a1c04', emissiveIntensity: 0.9 }));
    const RR = R - 12, ribGeo = keep(new THREE.TorusGeometry(1, 3.6 / RR, 5, 96));
    for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(ribGeo, ribMat); m.scale.setScalar(RR); m.rotation.y = i / 28 * Math.PI; m.position.copy(C); scene.add(m); }
    for (let k = -7; k <= 7; k++) { const la = k / 8 * Math.PI / 2, r = RR * Math.cos(la), m = new THREE.Mesh(ribGeo, ribMat); m.scale.set(r, r, RR); m.rotation.x = Math.PI / 2; m.position.set(C.x, C.y + RR * Math.sin(la), C.z); scene.add(m); }
    const lat1 = new THREE.LineSegments(keep(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R - 80, 7))), keep(new THREE.LineBasicMaterial({ color: new THREE.Color(1.3, 0.62, 0.22), transparent: true, opacity: 0.75 })));
    lat1.position.copy(C); lat1.rotation.set(0.3, 0.2, 0.1); scene.add(lat1);
    const lat2 = new THREE.LineSegments(keep(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R - 150, 4))), keep(new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 0.8, 0.3), transparent: true, opacity: 0.8 })));
    lat2.position.copy(C); scene.add(lat2);
    // struts from the core out to the ribs
    for (let i = 0; i < 46; i++) {
      const d = new THREE.Vector3(rng.gauss(), rng.gauss(), rng.gauss()).normalize(); if (d.dot(AXIS) < -0.1) continue;
      beam(C.x + d.x * 190, C.y + d.y * 190, C.z + d.z * 190, C.x + d.x * (RR - 2), C.y + d.y * (RR - 2), C.z + d.z * (RR - 2), 3.2);
    }
    const coreMat = keep(new THREE.ShaderMaterial({
      uniforms: SHARED, vertexShader: SHELL_VERT,
      fragmentShader: GLSL_COMMON + /* glsl */`
        void main(){ vec3 d = normalize(vLocal); vec3 V = normalize(cameraPosition - vWorld);
          vec3 p = d * 3.0 + vec3(0.0, uTime * 0.03, 0.0);
          float n = fbm(p + 0.8 * vec3(fbm(p * 1.7 + uTime * 0.02), fbm(p * 1.7 + 9.0), fbm(p * 1.7 - 4.0)));
          float crack = smoothstep(0.42, 0.62, n);
          vec3 col = mix(vec3(0.45, 0.05, 0.0), vec3(2.6, 1.15, 0.22), crack) + vec3(1.6, 1.2, 0.6) * pow(crack, 4.0);
          col *= 0.75 + 0.5 * pow(max(dot(d, V), 0.0), 0.8);
          gl_FragColor = vec4(fogged(col), 1.0); }`,
    }));
    const core = new THREE.Mesh(keep(new THREE.SphereGeometry(R - 215, 48, 32)), coreMat); core.position.copy(C); scene.add(core);
    const dot = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,235,200,0.75)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return keep(new THREE.CanvasTexture(cv)); })();
    const coreGlow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(1.0, 0.36, 0.08), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 })));
    coreGlow.position.copy(C); coreGlow.scale.setScalar(760); scene.add(coreGlow);
    await ctx.yield();

    // ---- the Earth's cradle and its cage of level walkways
    const cageMat = keep(new THREE.MeshStandardMaterial({ color: '#7d7062', roughness: 0.55, metalness: 0.6 }));
    const RC = R + 30, ringGeo = keep(new THREE.TorusGeometry(1, 1.8 / RC, 6, 160));
    for (const dy of [-320, -180, 0, 180, 320]) {
      const r = Math.sqrt(RC * RC - dy * dy), m = new THREE.Mesh(ringGeo, cageMat);
      m.scale.set(r, r, RC); m.rotation.x = Math.PI / 2; m.position.set(C.x, C.y + dy, C.z); scene.add(m);
      const n = Math.round(r / 14); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; lamp(C.x + Math.cos(a) * (r + 3), C.y + dy + 3, C.z + Math.sin(a) * (r + 3)); }
    }
    for (let i = 0; i < 10; i++) {      // the cradle: ten great legs and a collar under the south pole
      const a = i / 10 * Math.PI * 2, x = C.x + Math.cos(a) * 300, z = C.z + Math.sin(a) * 300, x2 = C.x + Math.cos(a) * 190, z2 = C.z + Math.sin(a) * 190;
      beam(x, FLOOR, z, x2, C.y - 345, z2, 16); beam(x, FLOOR, z, x, FLOOR + 14, z, 40, 'yellow'); lamp(x, FLOOR + 24, z);
    }
    { const m = new THREE.Mesh(ringGeo, cageMat); m.scale.set(200, 200, 2000); m.rotation.x = Math.PI / 2; m.position.set(C.x, C.y - 348, C.z); scene.add(m); }

    // ---- scaffold towers round the planet, with decks, bridges in to the surface, crews and lamps
    const NT = 14;
    for (let i = 0; i < NT; i++) {
      const a = (i + 0.5) / NT * Math.PI * 2, rT = R + 78, x = C.x + Math.cos(a) * rT, z = C.z + Math.sin(a) * rT, top = C.y + rng.range(140, 400);
      let ok = true; for (let y = FLOOR; y <= top; y += 50) if (!clear(x, y, z, 26)) ok = false;
      if (!ok) continue;
      tower(x, z, 30, FLOOR, top, 44);
      for (let y = FLOOR + 88; y <= top; y += 88) {
        slab(x, y, z, 44, 1.6, 44, -a, 'yellow'); crew(x, y + 0.8, z, 2 + Math.floor(rng() * 4), 16);
        for (const s of [-20, 20]) lamp(x + s, y + 5, z + s);
        const dy = y - C.y; if (Math.abs(dy) < R - 20) { const rs = Math.sqrt(R * R - dy * dy) + 4; beam(x, y, z, C.x + Math.cos(a) * rs, y, C.z + Math.sin(a) * rs, 3, 'yellow'); }
      }
      lamp(x, top + 8, z);
    }
    await ctx.yield();

    // ---- tower cranes: trolleys run the jibs with plates of planet on the hook
    const craneMat = keep(new THREE.MeshStandardMaterial({ color: '#e0a21c', roughness: 0.5, metalness: 0.3 }));
    const plateMat = keep(new THREE.MeshStandardMaterial({ color: '#3d7f9a', roughness: 0.4, metalness: 0.2 }));
    const boxGeo = keep(new THREE.BoxGeometry(1, 1, 1)), cableMat = keep(new THREE.MeshBasicMaterial({ color: '#15100c' }));
    const cranes = [];
    for (let i = 0; i < 12; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(R + 110, R + 160), x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r, top = C.y + rng.range(430, 560);
      const jx = C.x + Math.cos(a) * (r - 260), jz = C.z + Math.sin(a) * (r - 260), kx = C.x + Math.cos(a) * (r + 55), kz = C.z + Math.sin(a) * (r + 55);
      let ok = true; for (let y = FLOOR; y <= top; y += 40) if (!clear(x, y, z, 14)) ok = false;
      for (let t = -0.25; t <= 1; t += 0.08) if (!clear(x + (jx - x) * t, top, z + (jz - z) * t, 10)) ok = false;
      if (!ok) continue;
      tower(x, z, 14, FLOOR, top, 28, 1.8);
      beam(kx, top, kz, jx, top, jz, 5, 'yellow'); beam(kx, top + 7, kz, jx, top + 7, jz, 1.4, 'yellow');
      for (let t = 0; t <= 1.001; t += 0.05) { const px = kx + (jx - kx) * t, pz = kz + (jz - kz) * t; beam(px, top, pz, px, top + 7, pz, 1); }
      beam(x, top, z, x, top + 46, z, 5, 'yellow'); beam(x, top + 46, z, jx, top + 7, jz, 0.9, 'dark'); beam(x, top + 46, z, kx, top + 7, kz, 0.9, 'dark');
      slab(kx, top - 9, kz, 22, 16, 16, -a, 'dark'); slab(x + 9, top + 6, z, 9, 8, 9, -a, 'white');
      lamp(x, top + 52, z); lamp(jx, top + 10, jz); lamp(kx, top + 10, kz);
      const trolley = new THREE.Mesh(boxGeo, craneMat); trolley.scale.set(9, 4, 9);
      const cable = new THREE.Mesh(boxGeo, cableMat), load = new THREE.Mesh(boxGeo, plateMat); load.scale.set(34, 2.5, 24); load.rotation.y = -a;
      scene.add(trolley, cable, load);
      cranes.push({ x, z, jx, jz, top, trolley, cable, load, ph: rng.range(0, 6.28), sp: rng.range(0.06, 0.14), drop: rng.range(60, 190) });
    }

    // ---- hoses up from tankers on the floor to the working edge
    const E1 = new THREE.Vector3().crossVectors(AXIS, UP).normalize(), E2 = new THREE.Vector3().crossVectors(AXIS, E1).normalize();
    const edgeDir = (t, lift = 0.1) => new THREE.Vector3().copy(AXIS).multiplyScalar(lift).addScaledVector(E1, Math.cos(t) * Math.sqrt(1 - lift * lift)).addScaledVector(E2, Math.sin(t) * Math.sqrt(1 - lift * lift)).normalize();
    const hoseCols = ['#d8b020', '#2f6fb0', '#b03a2a', '#d8d2c4'];
    for (let i = 0; i < 8; i++) {
      const d = edgeDir(rng.range(0, Math.PI * 2), 0.14); if (d.y > 0.35) d.y -= 0.6, d.normalize();
      const end = C.clone().addScaledVector(d, R - 6), base = new THREE.Vector3(C.x + d.x * 760 + rng.range(-80, 80), FLOOR + 8, C.z + d.z * 760 + rng.range(-80, 80));
      const mid = base.clone().lerp(end, 0.55); mid.y = Math.min(base.y, end.y) + (Math.abs(end.y - base.y)) * 0.15 - 30; mid.x += rng.range(-40, 40);
      const up = base.clone().lerp(end, 0.85); up.addScaledVector(d, 60);
      let ok = true; for (const p of [mid, up, end]) if (!clear(p.x, p.y, p.z, 10)) ok = false;
      if (!ok) continue;
      const tube = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, mid, up, end]), 40, 3.2, 6)), keep(new THREE.MeshStandardMaterial({ color: hoseCols[i % 4], roughness: 0.7 })));
      scene.add(tube);
      slab(base.x, FLOOR + 9, base.z, 60, 18, 22, rng.range(0, 3), 'white'); slab(base.x, FLOOR + 3, base.z, 70, 6, 26, 0, 'dark'); lamp(base.x, FLOOR + 24, base.z);
    }
    await ctx.yield();

    // ---- welders on the ragged edge
    const welds = [];
    const weldMat = keep(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(2.5, 3.6, 6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    for (let i = 0; i < 18; i++) {
      const d = edgeDir(i / 18 * Math.PI * 2 + rng.range(-0.1, 0.1), rng.range(0.02, 0.2)), p = C.clone().addScaledVector(d, R - 3);
      const s = new THREE.Sprite(weldMat); s.position.copy(p); scene.add(s);
      slab(p.x + d.x * 6, p.y - 4, p.z + d.z * 6, 14, 1, 14, 0, 'yellow'); workers.push(p.x + d.x * 6, p.y - 1.8, p.z + d.z * 6);
      welds.push({ s, p, d, ph: rng.range(0, 100), rate: rng.range(0.25, 0.6) });
    }

    // ---- the fjord team: a cantilever off the cage, a carving head, the line already cut glowing as it cools
    const SP = C.clone().addScaledVector(FJ, R + 1.5);
    const T1 = new THREE.Vector3().crossVectors(FJ, UP).normalize(), T2 = new THREE.Vector3().crossVectors(FJ, T1).normalize();
    const fjordAt = (s, out) => {      // a coast in and out of long inlets
      const w1 = (s - 0.5) * 150, w2 = Math.sin(s * 60) * 14 * (0.5 + 0.5 * Math.sin(s * 9.0)) + Math.sin(s * 23) * 7 + 30 * Math.sin(s * 4.0);
      return out.copy(SP).addScaledVector(T1, w1).addScaledVector(T2, w2).sub(C).setLength(R + 1.5).add(C);
    };
    const NF = 400, fPos = new Float32Array(NF * 3), fT = new Float32Array(NF);
    for (let i = 0; i < NF; i++) { fjordAt(i / (NF - 1), _a); fPos[i * 3] = _a.x; fPos[i * 3 + 1] = _a.y; fPos[i * 3 + 2] = _a.z; fT[i] = i / (NF - 1); }
    const fGeo = keep(new THREE.BufferGeometry()); fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3)); fGeo.setAttribute('aT', new THREE.BufferAttribute(fT, 1));
    const fjordMat = keep(new THREE.ShaderMaterial({ uniforms: { uHead: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uHead; varying float vT; void main(){ if (vT > uHead) discard; float k = exp(-(uHead - vT) * 9.0); gl_FragColor = vec4(mix(vec3(0.5, 0.9, 1.3), vec3(3.0, 3.4, 4.0), k) * (0.35 + 0.65 * k), 1.0); }' }));
    scene.add(new THREE.Line(fGeo, fjordMat));
    const sparkLight = new THREE.PointLight(new THREE.Color('#bfe2ff'), 500, 500, 1.2); scene.add(sparkLight);
    const spark = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(3, 4.2, 6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))); scene.add(spark);
    const rig = new THREE.Group();
    { const arm = new THREE.Mesh(boxGeo, craneMat); arm.scale.set(3, 44, 3); arm.position.y = 25; const head = new THREE.Mesh(boxGeo, craneMat); head.scale.set(10, 7, 10); head.position.y = 6;
      const boom = new THREE.Mesh(boxGeo, craneMat); boom.scale.set(60, 3, 3); boom.position.set(28, 46, 0); rig.add(arm, head, boom); }
    rig.quaternion.setFromUnitVectors(UP, FJ); scene.add(rig);
    { // the team's platform, hung off the cage a little below the work
      const pc = SP.clone().addScaledVector(FJ, 34).addScaledVector(UP, -46), ry = Math.atan2(FJ.x, FJ.z);
      slab(pc.x, pc.y, pc.z, 150, 2, 34, ry, 'yellow'); slab(pc.x, pc.y + 5, pc.z, 150, 0.8, 0.8, ry, 'white');
      for (let k = -2; k <= 2; k++) { const q = pc.clone().addScaledVector(T1, k * 34); beam(q.x, q.y, q.z, q.x - FJ.x * 40, q.y - 30, q.z - FJ.z * 40, 2); lamp(q.x + FJ.x * 14, q.y + 7, q.z + FJ.z * 14); crew(q.x, q.y + 1, q.z, 3, 9); }
      slab(pc.x + T1.x * 50, pc.y + 8, pc.z + T1.z * 50, 18, 12, 12, ry, 'white');      // the site hut
    }

    // ---- the embers of all the hot work: one cloud
    const SITES = [null].concat(welds);
    const NE = Math.round(420 * detail), ePos = new Float32Array(NE * 3), eSeed = new Float32Array(NE * 4);
    for (let i = 0; i < NE; i++) { eSeed[i * 4] = rng(); eSeed[i * 4 + 1] = rng.range(-1, 1); eSeed[i * 4 + 2] = rng.range(-1, 1); eSeed[i * 4 + 3] = rng.range(0.5, 1.4); }
    const eGeo = keep(new THREE.BufferGeometry()); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    const embers = new THREE.Points(eGeo, keep(new THREE.PointsMaterial({ map: dot, color: new THREE.Color(2.4, 1.6, 0.7), size: 5, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    embers.frustumCulled = false; scene.add(embers);
    await ctx.yield();

    // =====================================================================================================
    // THE HALL
    // =====================================================================================================
    const HW = HALL.x1 - HALL.x0, HD = HALL.z1 - HALL.z0, HCX = (HALL.x0 + HALL.x1) / 2, HCZ = (HALL.z0 + HALL.z1) / 2;
    const canvasTex = (w, h, draw, rx, ry) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
      const t = keep(new THREE.CanvasTexture(cv)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    // floor: plates on a grid, painted lanes, hazard hatching
    const floorTex = canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#6a5d4f'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 88 + Math.floor(rng() * 34); g.fillStyle = `rgb(${v + 14},${v + 2},${v - 12})`; g.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
        if (rng() < 0.12) { g.fillStyle = 'rgba(20,14,10,0.35)'; g.beginPath(); g.ellipse(x * 128 + rng() * 128, y * 128 + rng() * 128, 20 + rng() * 30, 10 + rng() * 20, rng() * 3, 0, 6.3); g.fill(); } }
      g.strokeStyle = '#2a221b'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); }
      g.fillStyle = '#e8c23a'; g.fillRect(500, 0, 10, h); g.fillRect(514, 0, 10, h);      // a double lane line
      g.fillStyle = '#efe6d2'; for (let y = 0; y < h; y += 128) g.fillRect(250, y + 20, 8, 70);      // a broken white one
      g.fillRect(0, 760, w, 8);
      g.save(); g.beginPath(); g.rect(700, 0, 60, h); g.clip(); g.fillStyle = '#d9b02e'; g.fillRect(700, 0, 60, h); g.strokeStyle = '#1c1712'; g.lineWidth = 14; for (let y = -80; y < h + 80; y += 44) { g.beginPath(); g.moveTo(690, y); g.lineTo(770, y + 60); g.stroke(); } g.restore();
    }, 24000 / 520, 24000 / 520);
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(24000, 24000)), keep(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.78, metalness: 0.15 })));
    floor.rotation.x = -Math.PI / 2; floor.position.set(HCX, FLOOR, HCZ); scene.add(floor);
    // walls: ribbed panels and three levels of lit gallery
    const wallDraw = (g, w, h) => {
      g.fillStyle = '#4a3b2d'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) { g.fillStyle = '#3a2d22'; g.fillRect(x, 0, 10, h); g.fillStyle = '#5a4838'; g.fillRect(x + 10, 0, 3, h); }
      for (const y of [70, 240, 410]) {
        g.fillStyle = '#2a2018'; g.fillRect(0, y - 8, w, 62); g.fillStyle = '#6d5a46'; g.fillRect(0, y + 54, w, 6);
        for (let x = 4; x < w; x += 16) { if (rng() < 0.78) { const k = rng(); g.fillStyle = k < 0.7 ? '#ffd58a' : k < 0.9 ? '#fff3cf' : '#9fd8ff'; g.fillRect(x, y, 10, 30 + (rng() < 0.2 ? 14 : 0)); } }
      }
      g.fillStyle = '#7a6046'; g.fillRect(0, 180, w, 7); g.fillRect(0, 350, w, 5); g.fillStyle = '#d9b02e'; g.fillRect(0, 498, w, 8);
    };
    const wallMatFor = (len) => keep(new THREE.MeshBasicMaterial({ map: canvasTex(512, 512, wallDraw, len / 900, 2), color: new THREE.Color(1.5, 1.5, 1.5) }));
    const HH = ROOF + 70 - FLOOR, wallY = FLOOR + HH / 2;
    const wall = (x, z, len, ry) => { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, HH)), wallMatFor(len)); m.position.set(x, wallY, z); m.rotation.y = ry; scene.add(m); };
    wall(HCX, HALL.z0, HW, 0); wall(HCX, HALL.z1, HW, Math.PI); wall(HALL.x0, HCZ, HD, Math.PI / 2); wall(HALL.x1, HCZ, HD, -Math.PI / 2);
    // buttress columns up the walls
    for (let z = HALL.z0 + 400; z < HALL.z1; z += 800) for (const x of [HALL.x0 + 30, HALL.x1 - 30]) { slab(x, wallY, z, 60, HH, 50, 0, 'dark'); lamps.push(x + (x < 0 ? 40 : -40), FLOOR + 400, z, x + (x < 0 ? 40 : -40), FLOOR + 900, z); }
    for (let x = HALL.x0 + 400; x < HALL.x1; x += 800) { slab(x, wallY, HALL.z0 + 30, 50, HH, 60, 0, 'dark'); lamps.push(x, FLOOR + 400, HALL.z0 + 70, x, FLOOR + 900, HALL.z0 + 70); }
    // roof: a dark deck, trusses, rows of lamps, crane rails
    { const roof = new THREE.Mesh(keep(new THREE.PlaneGeometry(HW, HD)), keep(new THREE.MeshBasicMaterial({ color: '#2a2018' }))); roof.rotation.x = Math.PI / 2; roof.position.set(HCX, ROOF + 70, HCZ); scene.add(roof); }
    const strips = [];
    for (let x = HALL.x0 + 300; x < HALL.x1; x += 600) for (let z = HALL.z0 + 200; z < HALL.z1; z += 400) strips.push(new THREE.Matrix4().compose(new THREE.Vector3(x, ROOF + 20, z), _q.identity(), new THREE.Vector3(280, 5, 16)));
    { const sm = new THREE.InstancedMesh(boxGeo, keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.2) })), strips.length); strips.forEach((m, i) => sm.setMatrixAt(i, m)); sm.frustumCulled = false; scene.add(sm); }
    for (let x = HALL.x0; x <= HALL.x1; x += 600) slab(x, ROOF + 45, HCZ, 22, 40, HD, 0, 'dark');
    for (let z = HALL.z0; z <= HALL.z1; z += 800) slab(HCX, ROOF + 50, z, HW, 26, 16, 0, 'dark');
    const RAILS = [-3000, -1800, -600, 600, 1800, 3000];
    for (const x of RAILS) slab(x, ROOF - 30, HCZ, 14, 18, HD, 0, 'steel');
    // travelling gantry cranes on the roof rails
    const bridges = [];
    for (let i = 0; i < RAILS.length - 1; i++) for (let k = 0; k < 2; k++) {
      const g = new THREE.Group(), x0 = RAILS[i], x1 = RAILS[i + 1];
      const girder = new THREE.Mesh(boxGeo, craneMat); girder.scale.set(x1 - x0, 22, 30); girder.position.set((x0 + x1) / 2, ROOF - 50, 0);
      const hx = x0 + (x1 - x0) * rng.range(0.25, 0.75), len = rng.range(120, 340);
      const hoist = new THREE.Mesh(boxGeo, craneMat); hoist.scale.set(40, 20, 40); hoist.position.set(hx, ROOF - 68, 0);
      const cab = new THREE.Mesh(boxGeo, cableMat); cab.scale.set(1.6, len, 1.6); cab.position.set(hx, ROOF - 68 - len / 2, 0);
      const kind = rng.int(0, 2), ld = new THREE.Mesh(kind === 0 ? keep(new THREE.SphereGeometry(46, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5)) : boxGeo, kind === 1 ? plateMat : cageMat);
      if (kind !== 0) ld.scale.set(90, 10, 60); ld.position.set(hx, ROOF - 68 - len - (kind === 0 ? 0 : 6), 0); if (kind === 0) ld.rotation.x = Math.PI;
      g.add(girder, hoist, cab, ld); scene.add(g);
      bridges.push({ g, z0: HALL.z0 + 500 + k * HD * 0.45, span: HD * 0.4, ph: rng.range(0, 6.28), sp: rng.range(0.012, 0.03) });
    }
    await ctx.yield();

    // shafts of light down through the haze from skylights
    const shaftMat = keep(new THREE.ShaderMaterial({
      uniforms: SHARED, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vH; void main(){ vH = uv.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uFogDen; varying vec3 vN; varying vec3 vV; varying float vH; void main(){ float f = pow(abs(dot(normalize(vN), normalize(-vV))), 2.2); float d = length(vV); float a = f * (0.25 + 0.75 * vH) * 0.10 * exp(-uFogDen * uFogDen * d * d * 0.6) * smoothstep(60.0, 400.0, d); gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * a, 1.0); }',
    }));
    const shaftGeo = keep(new THREE.CylinderGeometry(70, 190, ROOF - FLOOR, 24, 1, true));
    for (let x = HALL.x0 + 550; x < HALL.x1; x += 1100) for (let z = HALL.z0 + 500; z < HALL.z1; z += 1000) {
      const sx = x + rng.range(-150, 150), sz = z + rng.range(-150, 150);
      if (path.nearestXZ(sx, sz).dist < 320 || Math.hypot(sx - C.x, sz - C.z) < 520) continue;
      const m = new THREE.Mesh(shaftGeo, shaftMat); m.position.set(sx, (ROOF + FLOOR) / 2, sz); m.rotation.z = rng.range(-0.06, 0.06); m.renderOrder = 5; scene.add(m);
      // the skylight itself and its pool of light on the floor
      BOXES.white.push(new THREE.Matrix4().compose(new THREE.Vector3(sx, ROOF + 60, sz), _q.identity(), new THREE.Vector3(150, 4, 150)));
    }

    // ---- the gantry we fly in along: a walkway 22 m under the road, on lattice legs, running on to the cage
    const G = [[-150, 8, 900], [-150, 8, 500], [-220, 38, 100], [-330, 60, -300], [-240, 70, -640]];
    for (let i = 0; i < G.length - 1; i++) {
      const p = G[i], q = G[i + 1], dx = q[0] - p[0], dz = q[2] - p[2], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
      for (const s of [-8, 8]) { beam(p[0] + nx * s, p[1], p[2] + nz * s, q[0] + nx * s, q[1], q[2] + nz * s, 2.4, 'yellow'); beam(p[0] + nx * s, p[1] + 3.4, p[2] + nz * s, q[0] + nx * s, q[1] + 3.4, q[2] + nz * s, 0.5, 'white'); }
      beam(p[0], p[1] - 0.6, p[2], q[0], q[1] - 0.6, q[2], 1.2); slab((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 1.2, (p[2] + q[2]) / 2, 15, 0.5, L, Math.atan2(dx, dz), 'steel');
      const n = Math.ceil(L / 16);
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = p[0] + dx * t, y = p[1] + (q[1] - p[1]) * t, z = p[2] + dz * t;
        if (k % 2 === 0) for (const s of [-8.4, 8.4]) { beam(x + nx * s, y, z + nz * s, x + nx * s, y + 6, z + nz * s, 0.4); lamp(x + nx * s, y + 6.6, z + nz * s); }
        if (k % 7 === 3) { tower(x, z, 16, FLOOR, y - 2, 36, 1.6); if (rng() < 0.6) crew(x, y, z, 2, 5); }
      }
    }

    // =====================================================================================================
    // THE CATALOGUE: planets on cradles in painted bays, in rows down the hall
    // =====================================================================================================
    const bandTex = (cols, wob) => canvasTex(256, 256, (g, w, h) => {
      const cs = cols.map((c) => new THREE.Color(c)), c = new THREE.Color();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x += 4) {
        const v = (y / h * (cs.length - 1) * 2.0 + wob * noise.fbm2(x / w * 6, y / h * 9, 4)) % (cs.length - 1), i = Math.floor(Math.abs(v)), f = Math.abs(v) - i;
        c.copy(cs[i % cs.length]).lerp(cs[(i + 1) % cs.length], f); g.fillStyle = '#' + c.getHexString(); g.fillRect(x, y, 4, 1);
      } }, 1, 1);
    const sph = keep(new THREE.SphereGeometry(1, 56, 40)), frameGeo = keep(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1, 6)));
    const std = (o) => keep(new THREE.MeshStandardMaterial(o));
    const MATS = {
      gold: std({ color: '#f0b93a', roughness: 0.3, metalness: 0.55, emissive: '#7a4a08', emissiveIntensity: 0.9 }),
      platinum: std({ color: '#dfe3ea', roughness: 0.22, metalness: 0.6, emissive: '#3a3f4a', emissiveIntensity: 0.8 }),
      ringed: std({ map: bandTex(['#d9b98a', '#b98f5e', '#e8d6b0', '#a57848', '#dcc49a'], 0.5), roughness: 0.8 }),
      pink: std({ color: '#f3a6c0', roughness: 0.9, emissive: '#5a2034', emissiveIntensity: 0.5 }),
      red: std({ map: bandTex(['#a8492c', '#7d2f1c', '#c66a3a', '#8d3a22'], 2.4), roughness: 0.85 }),
      ice: std({ map: bandTex(['#cfe4ee', '#9fc4da', '#f2f8fb', '#b8d6e6'], 2.0), roughness: 0.3, metalness: 0.1 }),
      jade: std({ map: bandTex(['#2f8a5c', '#1c5f44', '#7ac79a', '#256f50', '#b8e4c4'], 3.0), roughness: 0.35 }),
      violet: std({ map: bandTex(['#5a3a9a', '#8a5fd0', '#3a2470', '#b79ae8'], 0.7), roughness: 0.7 }),
    };
    const KINDS = ['gold', 'ringed', 'pink', 'platinum', 'frame', 'jade', 'red', 'ice', 'violet'];
    const frameMat = keep(new THREE.LineBasicMaterial({ color: new THREE.Color(1.2, 0.8, 0.4), transparent: true, opacity: 0.8 }));
    const ringMat = keep(new THREE.MeshBasicMaterial({ map: bandTex(['#d8c39a', '#8a7658', '#f0e2c0', '#6a5a44', '#cdb891'], 0.1), side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    const bayMat = keep(new THREE.MeshBasicMaterial({ color: '#e8c23a' })), puffs = [];
    const spots = [];
    for (const x of [-2850, -1500, 1500, 2850]) for (let z = 1500; z >= -4700; z -= 1240) spots.push([x, z]);
    spots.push([0, -2500], [0, -3800], [0, -5000], [300, 1700]);
    let ki = Math.floor(rng() * 9);
    for (const [x, z] of spots) {
      const kind = KINDS[ki++ % KINDS.length], r = rng.range(230, 330), y = FLOOR + 100 + r;
      if (path.nearestXZ(x, z).dist < r + 120) continue;
      if (kind === 'frame') { const l = new THREE.LineSegments(frameGeo, frameMat); l.position.set(x, y, z); l.scale.setScalar(r); scene.add(l);
        const cm = new THREE.Mesh(sph, MATS.gold); cm.position.set(x, y, z); cm.scale.setScalar(r * 0.35); scene.add(cm); }
      else { const m = new THREE.Mesh(sph, MATS[kind]); m.position.set(x, y, z); m.scale.setScalar(r); m.rotation.set(rng.range(-0.3, 0.3), rng.range(0, 6), rng.range(-0.3, 0.3)); scene.add(m); }
      if (kind === 'ringed') { const rg = new THREE.Mesh(keep(new THREE.RingGeometry(r * 1.3, r * 2.0, 96, 1)), ringMat); rg.position.set(x, y, z); rg.rotation.set(-Math.PI / 2 + 0.3, 0, 0.18); scene.add(rg); }
      if (kind === 'pink') for (let i = 0; i < 150; i++) { const d = new THREE.Vector3(rng.gauss(), rng.gauss() * 0.6, rng.gauss()).normalize(), s = rng.range(18, 56);
        puffs.push(new THREE.Matrix4().compose(new THREE.Vector3(x + d.x * (r + s * 0.4), y + d.y * (r + s * 0.4), z + d.z * (r + s * 0.4)), _q.identity(), new THREE.Vector3(s * rng.range(1, 1.8), s * 0.7, s * rng.range(1, 1.8)))); }
      // the cradle, the bay, the lamps, a scaffold tower beside it with a crew
      const cg = new THREE.Mesh(ringGeo, cageMat); cg.scale.set(r * 0.82, r * 0.82, 4000); cg.rotation.x = Math.PI / 2; cg.position.set(x, y - r * 0.6, z); scene.add(cg);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, cx = x + Math.cos(a) * r * 0.95, cz = z + Math.sin(a) * r * 0.95; beam(cx, FLOOR, cz, x + Math.cos(a) * r * 0.8, y - r * 0.6, z + Math.sin(a) * r * 0.8, 11); lamps.push(cx, FLOOR + 16, cz); }
      const bay = new THREE.Mesh(keep(new THREE.RingGeometry(r + 70, r + 84, 72)), bayMat); bay.rotation.x = -Math.PI / 2; bay.position.set(x, FLOOR + 0.6, z); scene.add(bay);
      const n = 40; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; lamps.push(x + Math.cos(a) * (r + 77), FLOOR + 5, z + Math.sin(a) * (r + 77)); }
      const ta = rng.range(0, 6.28), tx = x + Math.cos(ta) * (r + 40), tz = z + Math.sin(ta) * (r + 40), tt = y + rng.range(-0.2, 0.8) * r;
      tower(tx, tz, 26, FLOOR, tt, 52, 2.2); for (let yy = FLOOR + 104; yy <= tt; yy += 104) { slab(tx, yy, tz, 38, 1.5, 38, 0, 'yellow'); lamps.push(tx + 17, yy + 5, tz + 17); crew(tx, yy + 0.8, tz, 2, 12); }
      // a price board on a mast at the bay's edge
      const ba = ta + 2.2, bx = x + Math.cos(ba) * (r + 110), bz = z + Math.sin(ba) * (r + 110); beam(bx, FLOOR, bz, bx, FLOOR + 90, bz, 4); slab(bx, FLOOR + 100, bz, 70, 30, 3, rng.range(0, 3), 'white'); lamps.push(bx, FLOOR + 120, bz);
    }
    if (puffs.length) { const pm = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(1, 2)), std({ color: '#fff0f4', roughness: 1, emissive: '#6a3a48', emissiveIntensity: 0.45 }), puffs.length); puffs.forEach((m, i) => pm.setMatrixAt(i, m)); pm.frustumCulled = false; scene.add(pm); }
    await ctx.yield();

    // ---- parked machines on the floor: crawlers, transporters, tankers
    for (let i = 0; i < 260; i++) {
      const x = rng.range(HALL.x0 + 200, HALL.x1 - 200), z = rng.range(HALL.z0 + 200, HALL.z1 - 200);
      if (Math.hypot(x - C.x, z - C.z) < 330) continue;
      let ok = true; for (const s of spots) if (Math.hypot(x - s[0], z - s[1]) < 440) ok = false; if (!ok) continue;
      const L = rng.range(40, 110), W = rng.range(18, 34), Hh = rng.range(10, 20), ry = rng.pick([0, Math.PI / 2]) + rng.range(-0.08, 0.08), k = rng();
      slab(x, FLOOR + Hh / 2 + 4, z, W, Hh, L, ry, k < 0.55 ? 'yellow' : k < 0.8 ? 'white' : 'steel'); slab(x, FLOOR + 3, z, W + 4, 6, L * 0.9, ry, 'dark');
      slab(x + Math.sin(ry) * L * 0.38, FLOOR + Hh + 9, z + Math.cos(ry) * L * 0.38, W * 0.7, 10, L * 0.18, ry, 'dark');
      lamps.push(x + Math.sin(ry) * L * 0.5, FLOOR + Hh, z + Math.cos(ry) * L * 0.5);
      if (rng() < 0.3) beam(x, FLOOR + Hh, z, x + Math.sin(ry) * L * 0.9, FLOOR + Hh + rng.range(60, 160), z + Math.cos(ry) * L * 0.9, 3.5, 'yellow');      // a boom
    }
    // stacks of plating waiting to be hung, near the Earth
    for (let i = 0; i < 40; i++) { const a = rng.range(0, 6.28), r = rng.range(700, 1000), x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r, n = rng.int(2, 7);
      for (let k = 0; k < n; k++) BOXES.steel.push(new THREE.Matrix4().compose(new THREE.Vector3(x, FLOOR + 2 + k * 4, z), _q.setFromEuler(_e.set(0, a + k * 0.03, 0)), new THREE.Vector3(40, 3, 28))); }

    // ---- the floating sales kiosk
    const kiosk = new THREE.Group(), KPOS = new THREE.Vector3(60, 15, -200);
    {
      const body = new THREE.Mesh(keep(new THREE.CylinderGeometry(24, 15, 8, 20)), std({ color: '#d8d2c4', roughness: 0.4, metalness: 0.5 })); body.position.y = -4;
      const booth = new THREE.Mesh(boxGeo, std({ color: '#1f8f8a', roughness: 0.6, emissive: '#0a3a38', emissiveIntensity: 0.6 })); booth.scale.set(30, 13, 18); booth.position.y = 6.5;
      const win = new THREE.Mesh(boxGeo, keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.9) }))); win.scale.set(22, 6, 18.4); win.position.y = 8;
      const awn = new THREE.Mesh(keep(new THREE.CylinderGeometry(4, 27, 9, 12)), std({ color: '#e24a7a', roughness: 0.7, emissive: '#4a0f22', emissiveIntensity: 0.6 })); awn.position.y = 17.5;
      const signTex = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#1a0f22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd36a'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
        g.fillStyle = '#ffe9a8'; g.textAlign = 'center'; g.font = 'bold 96px Georgia, serif'; g.fillText('PLANETS MADE TO ORDER', w / 2, 120); g.font = '48px Georgia, serif'; g.fillStyle = '#7fe6ff'; g.fillText('coastlines a speciality  ·  enquire within', w / 2, 200); }, 1, 1);
      const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(64, 16)), keep(new THREE.MeshBasicMaterial({ map: signTex, color: new THREE.Color(1.5, 1.5, 1.5), side: THREE.DoubleSide }))); sign.position.y = 33;
      const mast1 = new THREE.Mesh(boxGeo, cageMat); mast1.scale.set(1, 12, 1); mast1.position.set(-24, 24, 0); const mast2 = mast1.clone(); mast2.position.x = 24;
      const under = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(0.5, 1.6, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))); under.scale.setScalar(70); under.position.y = -12;
      // sample globes on stalks along the counter
      const cols = ['#f0b93a', '#f3a6c0', '#3d7f9a', '#dfe3ea', '#2f8a5c'];
      for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(sph, std({ color: cols[i], roughness: 0.4, emissive: cols[i], emissiveIntensity: 0.35 })); s.scale.setScalar(2.6); s.position.set(-12 + i * 6, 15.5, 10.5); kiosk.add(s); }
      kiosk.add(body, booth, win, awn, sign, mast1, mast2, under);
      kiosk.position.copy(KPOS); kiosk.rotation.y = Math.atan2(-150 - KPOS.x, 500 - KPOS.z); scene.add(kiosk);
      const kl = new THREE.PointLight(new THREE.Color('#ffd9a0'), 300, 300, 1.2); kl.position.set(0, 10, 16); kiosk.add(kl);
    }
    await ctx.yield();

    // ---- build the instanced boxes, the crews and the lamp cloud
    const PAINT = { steel: std({ color: '#5a5048', roughness: 0.6, metalness: 0.55 }), yellow: std({ color: '#e0a21c', roughness: 0.55, metalness: 0.25 }), dark: std({ color: '#2c2620', roughness: 0.7, metalness: 0.4 }), white: std({ color: '#e6dfd0', roughness: 0.6, emissive: '#5a5040', emissiveIntensity: 0.5 }) };
    for (const k of Object.keys(BOXES)) { const list = BOXES[k]; if (!list.length) continue; const im = new THREE.InstancedMesh(boxGeo, PAINT[k], list.length); list.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; scene.add(im); }
    { // crews: small figures in hi-vis, each with a helmet lamp
      const n = workers.length / 3, wm = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.9, 2.0, 2, 6)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.0, 0.15) })), Math.max(1, n));
      const m = new THREE.Matrix4(), hl = [];
      for (let i = 0; i < n; i++) { m.makeTranslation(workers[i * 3], workers[i * 3 + 1], workers[i * 3 + 2]); wm.setMatrixAt(i, m); hl.push(workers[i * 3], workers[i * 3 + 1] + 2.2, workers[i * 3 + 2]); }
      wm.count = n; wm.frustumCulled = false; scene.add(wm);
      const hg = keep(new THREE.BufferGeometry()); hg.setAttribute('position', new THREE.Float32BufferAttribute(hl, 3));
      const hp = new THREE.Points(hg, keep(new THREE.PointsMaterial({ map: dot, color: new THREE.Color(1.6, 1.8, 2.2), size: 4, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); hp.frustumCulled = false; scene.add(hp);
    }
    for (let x = HALL.x0 + 300; x < HALL.x1; x += 300) for (let z = HALL.z0 + 300; z < HALL.z1; z += 300) if (rng() < 0.5) lamps.push(x + rng.range(-40, 40), FLOOR + 30, z + rng.range(-40, 40));
    const lampGeo = keep(new THREE.BufferGeometry()); lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
    const lampPts = new THREE.Points(lampGeo, keep(new THREE.PointsMaterial({ map: dot, color: new THREE.Color(1.25, 0.95, 0.5), size: 9, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    lampPts.frustumCulled = false; scene.add(lampPts);
    await ctx.yield();

    // =====================================================================================================
    const sNow = new THREE.Vector3(), cp = new THREE.Vector3();
    const hashT = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };
    function update(dt, time) {
      SHARED.uTime.value = time;
      // the carving head walks the coast and starts again
      const head = (time * 0.022 + 0.35) % 1; fjordMat.uniforms.uHead.value = head;
      fjordAt(head, sNow);
      const fl = 0.7 + 0.3 * Math.sin(time * 47) * Math.sin(time * 31.7);
      spark.position.copy(sNow).addScaledVector(FJ, 3); spark.scale.setScalar(26 + 14 * fl);
      sparkLight.position.copy(sNow).addScaledVector(FJ, 10); sparkLight.intensity = 500 * fl;
      rig.position.copy(sNow);
      // welders strike and stop
      for (const w of welds) { const slot = Math.floor(time * w.rate + w.ph), on = hashT(slot + w.ph) < 0.6; w.on = on;
        w.s.scale.setScalar(on ? 10 + 16 * hashT(Math.floor(time * 30) + w.ph) : 0.001); }
      for (let i = 0; i < NE; i++) {
        const site = SITES[i % SITES.length], o = site ? site.p : sNow, nrm = site ? site.d : FJ, live = site ? site.on : true;
        const life = (time * eSeed[i * 4 + 3] * 0.9 + eSeed[i * 4]) % 1, v = (site ? 26 : 46) * eSeed[i * 4 + 3], k = live ? life * 1.6 : 0;
        ePos[i * 3] = o.x + (nrm.x * 0.7 + eSeed[i * 4 + 1] * 0.8) * v * k;
        ePos[i * 3 + 1] = o.y + (nrm.y * 0.7 + eSeed[i * 4 + 2] * 0.6) * v * k - 34 * k * k - (live ? 0 : 5000);
        ePos[i * 3 + 2] = o.z + (nrm.z * 0.7 - eSeed[i * 4 + 1] * eSeed[i * 4 + 2] * 0.8) * v * k;
      }
      eGeo.attributes.position.needsUpdate = true;
      // cranes: trolleys out and back, loads on their cables
      for (const c of cranes) {
        const s = 0.2 + 0.75 * (0.5 + 0.5 * Math.sin(time * c.sp + c.ph)), x = c.x + (c.jx - c.x) * s, z = c.z + (c.jz - c.z) * s;
        const drop = c.drop * (0.6 + 0.4 * Math.sin(time * c.sp * 1.7 + c.ph * 2));
        c.trolley.position.set(x, c.top - 4, z); c.cable.position.set(x, c.top - 6 - drop / 2, z); c.cable.scale.set(0.8, drop, 0.8); c.load.position.set(x, c.top - 6 - drop, z);
      }
      for (const b of bridges) b.g.position.z = b.z0 + b.span * (0.5 + 0.5 * Math.sin(time * b.sp + b.ph));
      kiosk.position.y = KPOS.y + Math.sin(time * 0.7) * 2.5; kiosk.rotation.z = Math.sin(time * 0.5) * 0.02;
      lat1.rotation.y = 0.2 + time * 0.006; lat2.rotation.y = -time * 0.012;
      coreLight.intensity = 2600 * (0.9 + 0.1 * Math.sin(time * 1.3));
      clouds.rotation.y = time * 0.0015;
    }
    update(0, 0);

    return {
      scene, path, duration: 48,
      camera: { fov: 62, near: 0.5, far: 14000, lookAhead: 30, sway: 0.3, bank: 0.12 },
      pois: [
        { at: [C.x, C.y + 20, C.z], from: 0.0, to: 0.2, weight: 0.8 },
        { at: [SP.x, SP.y + 40, SP.z], from: 0.2, to: 0.34, weight: 0.7 },
        { at: [C.x, C.y, C.z], from: 0.34, to: 0.86, weight: 0.85 },
      ],
      portal: { shape: 'circle', radius: 9, color: '#ffd9a0', glow: 0.4 },
      post: { exposure: 1.0, bloom: { strength: 0.32, radius: 0.8, threshold: 0.95 }, grade: { saturation: 1.08, contrast: 1.06, vignette: 0.28, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() { for (const d of disposables) d.dispose?.(); },
    };
  },
};
