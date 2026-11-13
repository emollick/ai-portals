// THE FACTORY FLOOR OF MAGRATHEA. A hangar so large its far wall is lost in its own haze, and in it, hung in scaffolding,
// a half-built Earth: one side finished ocean and continent, the other still bare lattice over a dull red core. Other
// commissions stand in rows in the gloom (a gold one, a ringed one). On the finished side a spark of light is carving a
// coastline of fjords. We fly in level along a gantry, bank round the Earth past the unbuilt side, and leave by the portal.
import * as THREE from 'three';
import { makePath, makeNoise } from '../kit/core.js';

const R = 400, C = new THREE.Vector3(0, 0, -900), FLOOR = -520, ROOF = 1100;
const PTS = [[-900, 40, 500], [-800, 40, 300], [-640, 60, -200], [-560, 120, -700], [-380, 220, -1250], [100, 260, -1420],
  [520, 200, -1200], [640, 120, -800], [700, 110, -500], [740, 110, -300]];

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
    const HAZE = new THREE.Color('#1b130c');
    scene.background = HAZE.clone();
    scene.fog = new THREE.FogExp2(HAZE.clone(), 0.00032);
    const path = makePath(PTS);
    const disposables = [];
    const keep = (o) => { disposables.push(o); return o; };

    // ---- light: a warm key from the roof lamps, a dim bounce off the floor
    const hemi = new THREE.HemisphereLight(new THREE.Color('#ffd9a8'), new THREE.Color('#2a1608'), 1.1);
    const key = new THREE.DirectionalLight(new THREE.Color('#ffe2b8'), 3.0);
    key.position.set(-500, 900, 400); key.target.position.copy(C);
    const rim = new THREE.DirectionalLight(new THREE.Color('#6f8fd0'), 0.7);
    rim.position.set(600, -200, -1500); rim.target.position.copy(C);
    scene.add(hemi, key, key.target, rim, rim.target);

    // ---- the Earth: plated in panels; the panels on the unbuilt side are not yet hung
    const AXIS = new THREE.Vector3(0.6, 0.3, -0.7).normalize();      // the unbuilt side faces this way
    const W = 96, H = 64, CW = 48, CH = 32;
    const eg = keep(new THREE.SphereGeometry(R, W, H));
    {
      const pos = eg.attributes.position, uv = eg.attributes.uv, col = new Float32Array(pos.count * 3);
      const c = new THREE.Color(), deep = new THREE.Color('#0b2f6e'), shelf = new THREE.Color('#2f7fb8'), green = new THREE.Color('#3f7a35'),
        tan = new THREE.Color('#b59a62'), rock = new THREE.Color('#6d6252'), ice = new THREE.Color('#eef4f8');
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / R, y = pos.getY(i) / R, z = pos.getZ(i) / R;
        const n = noise.fbm3(x * 1.5 + 3.1, y * 1.5, z * 1.5 - 1.7, 5), dry = noise.fbm3(x * 2.3 - 8, y * 2.3 + 4, z * 2.3, 3);
        const lat = Math.abs(y);
        if (n > 0.04) { const h = (n - 0.04) / 0.5; c.copy(green).lerp(tan, THREE.MathUtils.clamp(dry * 0.9 + 0.45 - lat * 0.3, 0, 1)).lerp(rock, THREE.MathUtils.clamp(h * 1.6 - 0.5, 0, 1)); }
        else c.copy(deep).lerp(shelf, THREE.MathUtils.clamp(1 + (n - 0.04) * 7, 0, 1));
        if (lat + n * 0.12 > 0.86) c.lerp(ice, THREE.MathUtils.clamp((lat + n * 0.12 - 0.86) * 12, 0, 1));
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      eg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      // which panels are hung
      const hung = new Uint8Array(CW * CH), d = new THREE.Vector3();
      for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
        const u = (cx + 0.5) / CW * Math.PI * 2, v = (cy + 0.5) / CH * Math.PI;
        d.set(-Math.cos(u) * Math.sin(v), Math.cos(v), Math.sin(u) * Math.sin(v));
        const edge = d.dot(AXIS) + 0.22 * noise.n3(d.x * 2.4, d.y * 2.4, d.z * 2.4);
        hung[cy * CW + cx] = edge < 0.12 || (edge < 0.4 && rng() < 0.18) ? 1 : 0;      // a few panels already up, ahead of the rest
      }
      const src = eg.index.array, out = [];
      for (let t = 0; t < src.length; t += 3) {
        const a = src[t], b = src[t + 1], e = src[t + 2];
        const u = (uv.getX(a) + uv.getX(b) + uv.getX(e)) / 3, v = 1 - (uv.getY(a) + uv.getY(b) + uv.getY(e)) / 3;
        const cx = Math.min(CW - 1, Math.floor(u * CW)), cy = Math.min(CH - 1, Math.floor(v * CH));
        if (hung[cy * CW + cx]) out.push(a, b, e);
      }
      eg.setIndex(out);
    }
    const earthMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide }));
    const earth = new THREE.Mesh(eg, earthMat); earth.position.copy(C); scene.add(earth);
    await ctx.yield();

    // the bare lattice under the plating, and the dull red core seen through it
    const lg = keep(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R - 6, 9)));
    const lattice = new THREE.LineSegments(lg, keep(new THREE.LineBasicMaterial({ color: '#d39a55', transparent: true, opacity: 0.6 })));
    lattice.position.copy(C); scene.add(lattice);
    const lg2 = keep(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R - 60, 4)));
    const lattice2 = new THREE.LineSegments(lg2, keep(new THREE.LineBasicMaterial({ color: '#8a5a2c', transparent: true, opacity: 0.5 })));
    lattice2.position.copy(C); lattice2.rotation.set(0.4, 0.7, 0.1); scene.add(lattice2);
    const coreMat = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uTime; varying vec3 vN; varying vec3 vP; void main(){ float f = pow(max(vN.z, 0.0), 1.5); float s = 0.5 + 0.5 * sin(vP.x * 0.05 + sin(vP.y * 0.04 + uTime * 0.3) * 2.0) * sin(vP.z * 0.045 - uTime * 0.2); vec3 c = mix(vec3(0.10, 0.02, 0.005), vec3(1.25, 0.42, 0.08), f * (0.35 + 0.65 * s)); gl_FragColor = vec4(c, 1.0); }',
    }));
    const core = new THREE.Mesh(keep(new THREE.SphereGeometry(R - 110, 48, 32)), coreMat); core.position.copy(C); scene.add(core);
    await ctx.yield();

    // ---- girders: one instanced box for every beam in the hall
    const beams = [], lamps = [], _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
    const beam = (ax, ay, az, bx, by, bz, t) => {
      _a.set(ax, ay, az); _b.set(bx, by, bz); const len = _a.distanceTo(_b); if (len < 0.01) return;
      const mid = _a.clone().add(_b).multiplyScalar(0.5), dir = _b.clone().sub(_a).normalize();
      _q.setFromUnitVectors(UP, dir); _s.set(t, len, t); beams.push(new THREE.Matrix4().compose(mid, _q, _s));
    };
    const lamp = (x, y, z) => { if (path.distanceTo(x, y, z) > 12) lamps.push(x, y, z); };
    const clear = (x, y, z, r = 0) => path.distanceTo(x, y, z) > r + 18;

    // the cage round the Earth: level decks and meridians of tube, lamps along them
    const cageMat = keep(new THREE.MeshStandardMaterial({ color: '#5b5148', roughness: 0.55, metalness: 0.7 }));
    const RC = R + 30, ringGeo = keep(new THREE.TorusGeometry(1, 2.4 / RC, 6, 140));
    for (const y of [-300, -150, 0, 150, 300]) {
      const r = Math.sqrt(RC * RC - y * y), m = new THREE.Mesh(ringGeo, cageMat);
      m.scale.set(r, r, RC); m.rotation.x = Math.PI / 2; m.position.set(C.x, C.y + y, C.z); scene.add(m);
      const n = Math.round(r / 9); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; lamp(C.x + Math.cos(a) * (r + 3), C.y + y + 4, C.z + Math.sin(a) * (r + 3)); }
    }
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(ringGeo, cageMat); m.scale.setScalar(RC); m.rotation.y = i / 12 * Math.PI; m.position.copy(C); scene.add(m);
    }
    // columns from the floor up to the cage, cross-braced
    const NC = 28;
    for (let i = 0; i < NC; i++) {
      const a = i / NC * Math.PI * 2, a2 = (i + 1) / NC * Math.PI * 2, r = R + 48, x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r, x2 = C.x + Math.cos(a2) * r, z2 = C.z + Math.sin(a2) * r;
      const top = rng.range(60, 330);
      if (!clear(x, top, z, 6) || !clear(x, 0, z, 6)) continue;
      beam(x, FLOOR, z, x, top, z, 7);
      for (let y = FLOOR + 80; y < top - 40; y += 120) { beam(x, y, z, x2, y + 60, z2, 2.5); beam(x, y + 60, z, x2, y, z2, 2.5); lamp(x, y, z); }
      // a strut in to the cage
      const yi = Math.min(top, 280), ri = Math.sqrt(RC * RC - yi * yi); beam(x, yi, z, C.x + Math.cos(a) * ri, yi, C.z + Math.sin(a) * ri, 3);
      lamp(x, top + 5, z);
    }
    // tower cranes, their jibs reaching in over the planet
    for (let i = 0; i < 9; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(R + 70, R + 150), x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r, top = rng.range(420, 560);
      let ok = true; for (let y = FLOOR; y <= top; y += 40) if (!clear(x, y, z, 10)) ok = false;
      const jx = C.x + Math.cos(a) * (r - 190), jz = C.z + Math.sin(a) * (r - 190), kx = C.x + Math.cos(a) * (r + 60), kz = C.z + Math.sin(a) * (r + 60);
      for (let t = 0; t <= 1; t += 0.1) if (!clear(x + (jx - x) * t, top, z + (jz - z) * t, 8)) ok = false;
      if (!ok) continue;
      beam(x, FLOOR, z, x, top + 30, z, 9); beam(kx, top, kz, jx, top, jz, 5); beam(x, top + 30, z, jx, top, jz, 1.5); beam(x, top + 30, z, kx, top, kz, 1.5);
      beam(kx, top - 14, kz, kx, top, kz, 14);      // the counterweight
      const hx = x + (jx - x) * rng.range(0.5, 0.95), hz = z + (jz - z) * rng.range(0.5, 0.95); beam(hx, top - rng.range(20, 60), hz, hx, top, hz, 0.8);
      lamp(x, top + 36, z); lamp(jx, top + 4, jz); lamp(kx, top + 4, kz);
    }
    await ctx.yield();

    // the gantry we fly in along: a walkway 22 m under the road, on legs, running on to the cage
    const G = [[-940, 18, 580], [-900, 18, 500], [-800, 18, 300], [-640, 38, -200], [-432, 60, -760]];
    for (let i = 0; i < G.length - 1; i++) {
      const p = G[i], q = G[i + 1], dx = q[0] - p[0], dz = q[2] - p[2], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
      for (const s of [-7, 7]) { beam(p[0] + nx * s, p[1], p[2] + nz * s, q[0] + nx * s, q[1], q[2] + nz * s, 2.2); beam(p[0] + nx * s, p[1] + 3.2, p[2] + nz * s, q[0] + nx * s, q[1] + 3.2, q[2] + nz * s, 0.5); }
      const n = Math.ceil(L / 14);
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = p[0] + dx * t, y = p[1] + (q[1] - p[1]) * t, z = p[2] + dz * t;
        beam(x - nx * 7, y, z - nz * 7, x + nx * 7, y, z + nz * 7, 1.2);
        if (k % 2 === 0) { for (const s of [-7.4, 7.4]) { beam(x + nx * s, y, z + nz * s, x + nx * s, y + 5.5, z + nz * s, 0.4); lamp(x + nx * s, y + 6, z + nz * s); } }
        if (k % 6 === 0) { beam(x, FLOOR, z, x, y, z, 5); beam(x - 40, FLOOR, z, x, y - 60, z, 2); beam(x + 40, FLOOR, z, x, y - 60, z, 2); }
      }
    }
    const beamMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), keep(new THREE.MeshStandardMaterial({ color: '#4c4138', roughness: 0.6, metalness: 0.65 })), beams.length);
    beams.forEach((m, i) => beamMesh.setMatrixAt(i, m)); beamMesh.instanceMatrix.needsUpdate = true; beamMesh.frustumCulled = false; scene.add(beamMesh);
    await ctx.yield();

    // ---- the hall: floor, roof lamps in rows going off into the haze
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(24000, 24000)), keep(new THREE.MeshStandardMaterial({ color: '#15110d', roughness: 0.85, metalness: 0.2 })));
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; scene.add(floor);
    {
      const strips = []; _q.identity();
      for (let x = -7200; x <= 7200; x += 600) for (let z = -8400; z <= 4200; z += 420) strips.push(new THREE.Matrix4().compose(new THREE.Vector3(x, ROOF, z), _q, new THREE.Vector3(260, 5, 14)));
      const sm = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.95) })), strips.length);
      strips.forEach((m, i) => sm.setMatrixAt(i, m)); sm.frustumCulled = false; scene.add(sm);
      // roof trusses between the rows
      const tr = []; for (let x = -7500; x <= 7500; x += 600) tr.push(new THREE.Matrix4().compose(new THREE.Vector3(x, ROOF + 40, -2100), _q, new THREE.Vector3(18, 30, 13000)));
      const tm = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), keep(new THREE.MeshBasicMaterial({ color: '#0a0705' })), tr.length);
      tr.forEach((m, i) => tm.setMatrixAt(i, m)); tm.frustumCulled = false; scene.add(tm);
      for (let x = -6000; x <= 6000; x += 300) for (let z = -7000; z <= 3000; z += 300) if (rng() < 0.55) lamps.push(x + rng.range(-30, 30), FLOOR + 6, z + rng.range(-30, 30));
    }

    // ---- the other commissions, in rows in the gloom
    const others = [
      { p: [-1900, -40, -1150], r: 300, kind: 'gold' }, { p: [1950, 80, -650], r: 260, kind: 'ringed' }, { p: [0, 90, -2800], r: 330, kind: 'red' },
      { p: [-1900, 20, -2950], r: 280, kind: 'ice' }, { p: [1900, -40, -2800], r: 310, kind: 'frame' }, { p: [3750, 0, -1300], r: 300, kind: 'gold' },
      { p: [-3750, 60, -1500], r: 320, kind: 'ringed' }, { p: [1750, 40, 1150], r: 270, kind: 'frame' }, { p: [-2050, 0, 1350], r: 290, kind: 'red' },
      { p: [3800, 30, -3300], r: 300, kind: 'ice' }, { p: [-3800, 0, -3500], r: 300, kind: 'frame' },
    ];
    const sph = keep(new THREE.SphereGeometry(1, 40, 28)), frameGeo = keep(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1, 5)));
    const MATS = {
      gold: keep(new THREE.MeshStandardMaterial({ color: '#e0a83a', roughness: 0.28, metalness: 1, emissive: '#3a2204', emissiveIntensity: 0.6 })),
      ringed: keep(new THREE.MeshStandardMaterial({ color: '#c9a876', roughness: 0.8 })),
      red: keep(new THREE.MeshStandardMaterial({ color: '#a8492c', roughness: 0.85 })),
      ice: keep(new THREE.MeshStandardMaterial({ color: '#cfe4ee', roughness: 0.35, metalness: 0.1 })),
    };
    const frameMat = keep(new THREE.LineBasicMaterial({ color: '#c98f52', transparent: true, opacity: 0.7 }));
    const ringMat = keep(new THREE.MeshBasicMaterial({ color: '#d8c39a', side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
    for (const o of others) {
      const [x, y, z] = o.p;
      if (o.kind === 'frame') { const l = new THREE.LineSegments(frameGeo, frameMat); l.position.set(x, y, z); l.scale.setScalar(o.r); scene.add(l); }
      else { const m = new THREE.Mesh(sph, MATS[o.kind]); m.position.set(x, y, z); m.scale.setScalar(o.r); scene.add(m); }
      if (o.kind === 'ringed') { const rg = new THREE.Mesh(keep(new THREE.RingGeometry(o.r * 1.35, o.r * 2.1, 96)), ringMat); rg.position.set(x, y, z); rg.rotation.set(-Math.PI / 2 + 0.35, 0, 0.2); scene.add(rg); }
      const cg = new THREE.Mesh(ringGeo, cageMat); cg.scale.setScalar(o.r + 25); cg.rotation.x = Math.PI / 2; cg.position.set(x, y, z); scene.add(cg);
      // its cradle and its lamps
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, cx = x + Math.cos(a) * (o.r + 30), cz = z + Math.sin(a) * (o.r + 30); beam(cx, FLOOR, cz, cx, y, cz, 8); }
      const n = Math.round(60 * detail); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; lamps.push(x + Math.cos(a) * (o.r + 28), y + 5, z + Math.sin(a) * (o.r + 28)); }
    }
    // (the cradles were added after the first girder mesh was made: a second mesh for them)
    {
      const extra = beams.slice(beamMesh.count), em = new THREE.InstancedMesh(beamMesh.geometry, beamMesh.material, Math.max(1, extra.length));
      extra.forEach((m, i) => em.setMatrixAt(i, m)); em.count = extra.length; em.frustumCulled = false; scene.add(em);
    }
    await ctx.yield();

    // ---- the work lamps: one cloud of warm points
    const dot = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,220,160,0.8)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return keep(new THREE.CanvasTexture(cv)); })();
    const lampGeo = keep(new THREE.BufferGeometry()); lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
    const lampPts = new THREE.Points(lampGeo, keep(new THREE.PointsMaterial({ map: dot, color: new THREE.Color(1.6, 1.15, 0.6), size: 16, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    lampPts.frustumCulled = false; scene.add(lampPts);

    // ---- the fjords being carved: a rig on the finished side, a blue-white spark, a fan of embers
    const SD = new THREE.Vector3(-0.8, 0.25, 0.45).normalize(), SP = C.clone().addScaledVector(SD, R + 1.5);
    const T1 = new THREE.Vector3().crossVectors(SD, UP).normalize(), T2 = new THREE.Vector3().crossVectors(SD, T1).normalize();
    const sparkLight = new THREE.PointLight(new THREE.Color('#bfe2ff'), 400, 420, 1.2); sparkLight.position.copy(SP).addScaledVector(SD, 6); scene.add(sparkLight);
    const spark = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(3, 4, 6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })));
    spark.scale.setScalar(26); scene.add(spark);
    const rig = new THREE.Group();
    { const arm = new THREE.Mesh(keep(new THREE.BoxGeometry(3, 46, 3)), cageMat); arm.position.y = 26; const head = new THREE.Mesh(keep(new THREE.BoxGeometry(9, 7, 9)), cageMat); head.position.y = 6; rig.add(arm, head); }
    rig.quaternion.setFromUnitVectors(UP, SD); scene.add(rig);
    const NE = Math.round(140 * detail), ePos = new Float32Array(NE * 3), eSeed = new Float32Array(NE * 4);
    for (let i = 0; i < NE; i++) { eSeed[i * 4] = rng(); eSeed[i * 4 + 1] = rng.range(-1, 1); eSeed[i * 4 + 2] = rng.range(-1, 1); eSeed[i * 4 + 3] = rng.range(0.5, 1.4); }
    const eGeo = keep(new THREE.BufferGeometry()); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    const embers = new THREE.Points(eGeo, keep(new THREE.PointsMaterial({ map: dot, color: new THREE.Color(2.2, 1.5, 0.7), size: 5, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    embers.frustumCulled = false; scene.add(embers);
    const sNow = new THREE.Vector3();

    function update(dt, time) {
      coreMat.uniforms.uTime.value = time;
      // the spark walks a fjord's zigzag line along the coast
      const w1 = Math.sin(time * 0.35) * 30 + Math.sin(time * 2.1) * 4, w2 = Math.sin(time * 0.23 + 1.3) * 18 + Math.sin(time * 3.3) * 3;
      sNow.copy(SP).addScaledVector(T1, w1).addScaledVector(T2, w2).sub(C).setLength(R + 1.5).add(C);
      const fl = 0.7 + 0.3 * Math.sin(time * 47) * Math.sin(time * 31.7);
      spark.position.copy(sNow); spark.scale.setScalar(22 + 10 * fl);
      sparkLight.position.copy(sNow).addScaledVector(SD, 8); sparkLight.intensity = 400 * fl;
      rig.position.copy(sNow);
      for (let i = 0; i < NE; i++) {
        const life = (time * eSeed[i * 4 + 3] * 0.9 + eSeed[i * 4]) % 1, v = 46 * eSeed[i * 4 + 3], k = life * 1.6;
        ePos[i * 3] = sNow.x + (SD.x * v * 0.7 + T1.x * eSeed[i * 4 + 1] * v + T2.x * eSeed[i * 4 + 2] * v) * k;
        ePos[i * 3 + 1] = sNow.y + (SD.y * v * 0.7 + T1.y * eSeed[i * 4 + 1] * v + T2.y * eSeed[i * 4 + 2] * v) * k - 30 * k * k;
        ePos[i * 3 + 2] = sNow.z + (SD.z * v * 0.7 + T1.z * eSeed[i * 4 + 1] * v + T2.z * eSeed[i * 4 + 2] * v) * k;
      }
      eGeo.attributes.position.needsUpdate = true;
      lattice2.rotation.y = 0.7 + time * 0.01;
    }
    update(0, 0);

    return {
      scene, path, duration: 45,
      camera: { fov: 62, near: 0.5, far: 9000, lookAhead: 30, sway: 0.3, bank: 0.15 },
      pois: [
        { at: [C.x, C.y + 40, C.z], from: 0.03, to: 0.28, weight: 0.5 },
        { at: [SP.x, SP.y, SP.z], from: 0.28, to: 0.5, weight: 0.55 },
        { at: [C.x, C.y, C.z], from: 0.52, to: 0.85, weight: 0.45 },
      ],
      portal: { shape: 'circle', radius: 9, color: '#ffd9a0', glow: 0.4 },
      post: { exposure: 1.1, bloom: { strength: 0.5, radius: 0.8, threshold: 0.9 }, grade: { saturation: 1.05, contrast: 1.05, vignette: 0.3, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() { for (const d of disposables) d.dispose?.(); },
    };
  },
};
