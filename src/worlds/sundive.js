// SUNDIVE. Disaster Area's stuntship: a ship so black it is seen only as a hole in what is behind it, on a programmed
// dive into the sun that Kakrafoon goes round. We leave the desert planet's night limb (the concert is still going on
// down there: rings of stage lights, speaker towers, shock waves going out into space), catch the black ship up with
// the star filling the sky ahead, pass it, and go on toward the star; the portal stands well short of the surface.
// The flight runs along -Z. The star is the only lamp: everything is lit from ahead, so everything is a silhouette.
import * as THREE from 'three';
import { makePath } from '../kit/core.js';

const DUR = 44;
const SUN_C = new THREE.Vector3(0, -300, -14000), SUN_R = 6000;
const PLANET_C = new THREE.Vector3(-700, -350, -250), PLANET_R = 450;
const PTS = [[0, 0, 320], [0, 0, 0], [40, 22, -520], [92, 34, -1120], [64, 12, -1720], [10, 0, -2300], [0, 0, -2720]];

const GLSL_N = /* glsl */`
float hash3(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y);
  float b = mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,170,60,0.35)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.25, mid); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- the star ----------
function makeSun(rng, U) {
  const group = new THREE.Group(); group.position.copy(SUN_C);
  const surf = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 96, 64), new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){ vP = normalize(position); vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      ${GLSL_N}
      void main(){
        float t = uTime * 0.06;
        vec3 p = vP * 13.0;
        float flow = fbm(p + vec3(0.0, t, 0.0));                       // the slow weather of the photosphere
        float g = fbm(p * 6.5 + flow * 2.2 + vec3(t * 1.7, 0.0, -t));  // granulation: bright cells, dark lanes
        float cell = smoothstep(0.34, 0.66, g);
        vec3 col = mix(vec3(1.0, 0.30, 0.04), vec3(1.0, 0.74, 0.30), cell);
        col += vec3(1.0, 0.95, 0.8) * pow(cell, 5.0) * 0.7;
        float fac = smoothstep(0.58, 0.74, fbm(p * 0.9 + vec3(4.0, -t * 0.3, 9.0)));   // faculae: brighter fields
        col += vec3(1.0, 0.7, 0.35) * fac * 0.35;
        float spot = smoothstep(0.70, 0.78, fbm(p * 0.55 + 21.0));     // a few sunspot groups
        col *= 1.0 - 0.8 * spot;
        float mu = max(dot(normalize(vN), normalize(vV)), 0.0);
        col *= 0.30 + 0.70 * pow(mu, 0.55);                            // limb darkening
        col.gb *= 0.75 + 0.25 * mu;                                    // and reddening toward the limb
        gl_FragColor = vec4(col * 1.7, 1.0);
      }`,
  }));
  group.add(surf);
  // the corona: a shell seen from inside out, brightest where the line of sight grazes the surface
  const corona = new THREE.Mesh(new THREE.SphereGeometry(SUN_R * 1.32, 64, 40), new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){ vP = normalize(position); vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      ${GLSL_N}
      void main(){
        float f = abs(dot(normalize(vN), normalize(vV)));
        float k = smoothstep(0.0, 0.66, f); k = k * k * k;
        float streak = 0.65 + 0.7 * fbm(vP * 9.0 + vec3(0.0, uTime * 0.03, 0.0));   // streamers
        gl_FragColor = vec4(vec3(1.0, 0.55, 0.18) * k * streak * 0.9, 1.0);
      }`,
  }));
  group.add(corona);
  // the wide halo: a sprite through the star's centre, its middle hidden by the star itself
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,220,150,1)', 'rgba(255,120,30,0.5)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
  halo.scale.setScalar(SUN_R * 4.2); group.add(halo);

  // prominences: half hoops of fire standing on the limb and on the near face
  const proms = [], Y = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q2 = new THREE.Quaternion();
  for (let i = 0; i < 9; i++) {
    // directions on the hemisphere that faces the flight (+Z of the star), most of them out toward the limb
    const az = rng.range(0, Math.PI * 2), off = i < 6 ? rng.range(0.95, 1.45) : rng.range(0.25, 0.8);
    dir.set(Math.sin(off) * Math.cos(az), Math.sin(off) * Math.sin(az), Math.cos(off));
    const R = rng.range(380, 950), tube = R * rng.range(0.05, 0.09);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.6, rng.range(0.42, 0.7), 0.12), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 8, 48, Math.PI), mat);
    m.quaternion.setFromUnitVectors(Y, dir); q2.setFromAxisAngle(dir, rng.range(0, Math.PI * 2)); m.quaternion.premultiply(q2);
    m.position.copy(dir).multiplyScalar(SUN_R - tube * 0.5);
    m.scale.y = rng.range(0.8, 1.9);
    m.userData = { ph: rng.range(0, 6.28), sp: rng.range(0.25, 0.6), y: m.scale.y };
    group.add(m); proms.push(m);
  }
  // flare knots: bright spots on the near face
  const knotTex = glowTexture('rgba(255,255,240,1)', 'rgba(255,190,90,0.4)'), knots = [];
  for (let i = 0; i < 7; i++) {
    const az = rng.range(0, Math.PI * 2), off = rng.range(0.1, 0.9);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: knotTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.set(Math.sin(off) * Math.cos(az), Math.sin(off) * Math.sin(az), Math.cos(off)).multiplyScalar(SUN_R + 60);
    s.userData = { ph: rng.range(0, 6.28), sp: rng.range(0.4, 1.3), size: rng.range(350, 900) };
    group.add(s); knots.push(s);
  }
  return { group, proms, knots };
}

// ---------- the black ship ----------
function makeShip() {
  const ship = new THREE.Group();
  // black, with only the faintest rim where the hull turns away from the eye
  const hull = new THREE.ShaderMaterial({
    vertexShader: /* glsl */`varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(vec3(1.0, 0.42, 0.12) * pow(f, 5.0) * 0.22, 1.0); }`,
  });
  const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, hull); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); ship.add(m); return m; };
  // the nose points down -Z; 120 m from nose to engine bells
  add(new THREE.BoxGeometry(16, 9, 70), 0, 0, 6);                                    // spine
  add(new THREE.ConeGeometry(10.5, 44, 4, 1), 0, 0, -50, -Math.PI / 2, Math.PI / 4, 0).scale.set(1, 1, 0.6);   // the nose, a flattened pyramid
  add(new THREE.BoxGeometry(26, 6, 34), 0, -1, 26);                                  // shoulders
  add(new THREE.BoxGeometry(11, 14, 22), 0, 5, 30);                                  // the bridge hump
  add(new THREE.CylinderGeometry(6.5, 9, 16, 6), -9, 0, 52, Math.PI / 2, 0, 0);      // engine bells
  add(new THREE.CylinderGeometry(6.5, 9, 16, 6), 9, 0, 52, Math.PI / 2, 0, 0);
  // fins: swept slabs, two big ones flat, one dorsal, two ventral
  const fin = (w, l) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, l * 0.72); s.lineTo(w, l); s.lineTo(0, l * 0.55); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: false }); };
  for (const sx of [-1, 1]) {
    const wing = add(fin(34, 62), sx * 8, -0.8, -14, Math.PI / 2, 0, 0); wing.scale.x = sx;      // lies in XZ, swept back
    const vent = add(fin(15, 30), sx * 6, -3, 14, Math.PI / 2, 0, sx * -0.9); vent.scale.x = sx;
  }
  const dorsal = add(fin(22, 44), 0.8, 4, 4, Math.PI / 2, 0, -Math.PI / 2);
  dorsal.scale.z = 1;
  // a long spike of an aerial forward of the nose, because it is that kind of ship
  add(new THREE.CylinderGeometry(0.35, 0.9, 26, 5), 0, 0, -78, Math.PI / 2, 0, 0);
  return ship;
}

// ---------- the concert planet ----------
function makePlanet(rng) {
  const group = new THREE.Group(); group.position.copy(PLANET_C);
  const geo = new THREE.SphereGeometry(PLANET_R, 96, 64), pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / PLANET_R, y = pos.getY(i) / PLANET_R, z = pos.getZ(i) / PLANET_R;
    const b = 0.5 + 0.5 * Math.sin(y * 9 + Math.sin(x * 5 + z * 3) * 1.6) * Math.cos(z * 4 + x * 2.3);   // dune seas and pans
    c.setRGB(0.62 + 0.2 * b, 0.4 + 0.14 * b, 0.2 + 0.06 * b);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })));
  // a thin dusty air, seen as a rim
  group.add(new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.035, 64, 40), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vW = normalize(mat3(modelMatrix) * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float k = smoothstep(0.0, 0.3, f) * (1.0 - smoothstep(0.3, 0.55, f)); float day = smoothstep(-0.25, 0.35, -vW.z); gl_FragColor = vec4(vec3(1.0, 0.6, 0.3) * k * (0.08 + 0.9 * day), 1.0); }`,
  })));

  // the concert, on the night side, turned toward where we come in
  const site = new THREE.Vector3(0.6, 0.45, 0.66).normalize();
  const e1 = new THREE.Vector3(0, 1, 0).cross(site).normalize(), e2 = site.clone().cross(e1).normalize();
  const at = (theta, a, r, out) => out.copy(site).multiplyScalar(Math.cos(theta)).addScaledVector(e1, Math.sin(theta) * Math.cos(a)).addScaledVector(e2, Math.sin(theta) * Math.sin(a)).multiplyScalar(r);
  // rings of stage lights
  const P = [], C = [], v = new THREE.Vector3(), pal = [[1, 0.95, 0.8], [1, 0.25, 0.7], [0.3, 0.9, 1], [1, 0.65, 0.15], [0.6, 0.4, 1]];
  for (let k = 1; k <= 9; k++) {
    const theta = 0.035 * k + 0.01, n = 30 + k * 26, pc = pal[k % pal.length];
    for (let i = 0; i < n; i++) { at(theta + rng.range(-0.003, 0.003), (i / n) * Math.PI * 2, PLANET_R + 1.5, v); P.push(v.x, v.y, v.z); const b = rng.range(0.6, 1.5); C.push(pc[0] * b, pc[1] * b, pc[2] * b); }
  }
  for (let i = 0; i < 500; i++) { at(rng.range(0, 0.36) * Math.sqrt(rng()), rng.range(0, 6.283), PLANET_R + 1.5, v); P.push(v.x, v.y, v.z); C.push(1, 0.85, 0.55); }   // the crowd's own lights
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  const lights = new THREE.Points(lg, new THREE.PointsMaterial({ size: 5.5, sizeAttenuation: true, vertexColors: true, map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.4)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(lights);
  // speaker stacks: black towers standing out of the lights (monstrous ones: the band plays from orbit, the crowd keeps its distance)
  const N = 54, towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x000000 }), N), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Yv = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const ring = i < 10 ? 1 : i < 28 ? 3 : 5, theta = 0.035 * ring + 0.028, h = rng.range(30, 78) * (ring === 1 ? 1.4 : 1);
    at(theta, rng.range(0, 6.283), 1, d); Q.setFromUnitVectors(Yv, d); S.set(rng.range(7, 13), h, rng.range(7, 13));
    v.copy(d).multiplyScalar(PLANET_R + h / 2 - 1); M.compose(v, Q, S); towers.setMatrixAt(i, M);
  }
  group.add(towers);
  // the stage: one hard white light at the centre, and beams standing up from it
  const stage = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  stage.position.copy(site).multiplyScalar(PLANET_R + 6); stage.scale.setScalar(70); group.add(stage);
  const beams = [];
  for (let i = 0; i < 10; i++) {
    const len = rng.range(260, 520), bm = new THREE.Mesh(new THREE.CylinderGeometry(len * 0.03, 0.6, len, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(...pal[i % pal.length]), transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    bm.geometry.translate(0, len / 2, 0);
    const pivot = new THREE.Group(); at(0.035 * (1 + (i % 3)), (i / 10) * 6.283, PLANET_R, v); pivot.position.copy(v); pivot.quaternion.setFromUnitVectors(Yv, d.copy(v).normalize());
    pivot.add(bm); bm.userData = { ph: rng.range(0, 6.28), sp: rng.range(0.3, 0.8) }; group.add(pivot); beams.push(bm);
  }
  // shock waves going out from the stage into space
  const waves = [], wq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), site);
  for (let i = 0; i < 6; i++) {
    const w = new THREE.Mesh(new THREE.RingGeometry(0.965, 1, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.0, 0.75, 0.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    w.quaternion.copy(wq); w.userData = { ph: i / 6 }; group.add(w); waves.push(w);
  }
  return { group, site, stage, beams, waves };
}

function makeStars(rng) {
  const N = 7000, P = new Float32Array(N * 3), C = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const z = rng.range(-1, 1), a = rng.range(0, 6.283), r = Math.sqrt(1 - z * z), R = 32000;
    P[i * 3] = r * Math.cos(a) * R; P[i * 3 + 1] = z * R; P[i * 3 + 2] = r * Math.sin(a) * R;
    const b = Math.pow(rng(), 3) * 0.9 + 0.1, w = rng();
    C[i * 3] = b * (0.8 + 0.2 * w); C[i * 3 + 1] = b * 0.85; C[i * 3 + 2] = b * (1 - 0.25 * w);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }));
}

export default {
  id: 'sundive',
  name: 'Sundive',
  category: 'books',
  placeKind: 'sky',
  book: 'The Restaurant at the End of the Universe',
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.7,
  media: ['space'],
  async build(ctx) {
    const rng = ctx.rng;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
    const path = makePath(PTS);
    const U = { uTime: { value: 0 } };

    // the one lamp: the star, ahead. A breath of fill so the planet's night side is a shape and not a hole.
    const sunLight = new THREE.DirectionalLight(0xffd9a8, Math.PI * 1.25);
    sunLight.position.copy(SUN_C); sunLight.target.position.set(0, 0, 0); scene.add(sunLight, sunLight.target);
    scene.add(new THREE.HemisphereLight(0x332014, 0x050302, Math.PI * 0.02));

    scene.add(makeStars(rng.fork ? rng.fork('stars') : rng));
    await ctx.yield();
    const sun = makeSun(rng, U); scene.add(sun.group);
    await ctx.yield();
    const planet = makePlanet(rng); scene.add(planet.group);
    await ctx.yield();
    const ship = makeShip(); scene.add(ship);
    await ctx.yield();

    // dust and sparks streaming past, sunward to spaceward, so the dive has a speed
    const DN = 900, dP = new Float32Array(DN * 3);
    for (let i = 0; i < DN; i++) { dP[i * 3] = rng.range(-260, 260); dP[i * 3 + 1] = rng.range(-160, 160); dP[i * 3 + 2] = rng.range(-700, 100); }
    const dG = new THREE.BufferGeometry(); dG.setAttribute('position', new THREE.BufferAttribute(dP, 3));
    const dust = new THREE.Points(dG, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: true, color: new THREE.Color().setRGB(1.0, 0.7, 0.4), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    dust.frustumCulled = false; scene.add(dust);

    // the ship keeps to the road, to starboard and a little below; we start 360 m astern of it and are past it by u = 0.75
    const sp = new THREE.Vector3(), st = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), look = new THREE.Vector3(), eye = new THREE.Vector3();
    const SIDE = 62, BELOW = 12;
    function placeShip(u, time) {
      const s = u + 0.12 * (1 - u / 0.75);
      path.pointAt(s, sp); path.tangentAt(Math.min(1, Math.max(0, s)), st);
      side.crossVectors(st, up).normalize();
      ship.position.copy(sp).addScaledVector(side, SIDE).addScaledVector(up, -BELOW + Math.sin(time * 0.4) * 2);
      look.copy(ship.position).add(st); ship.lookAt(look); ship.rotateY(Math.PI);      // lookAt turns +Z to the target; the nose is -Z
      ship.rotateZ(Math.sin(time * 0.22) * 0.12 + 0.1);
    }
    placeShip(0, 0);

    function update(dt, time, camera, u) {
      const uu = typeof u === 'number' && isFinite(u) ? u : 0;
      U.uTime.value = time;
      placeShip(uu, time);
      for (const p of sun.proms) { const d = p.userData; p.scale.y = d.y * (1 + 0.14 * Math.sin(time * d.sp + d.ph)); p.material.opacity = 0.55 + 0.3 * Math.sin(time * d.sp * 1.7 + d.ph); }
      for (const k of sun.knots) { const d = k.userData, f = 0.5 + 0.5 * Math.sin(time * d.sp + d.ph); k.scale.setScalar(d.size * (0.5 + f * f)); k.material.opacity = 0.35 + 0.65 * f * f; }
      // the concert: the stage beats, the beams swing, the shock waves go out
      const beat = Math.pow(0.5 + 0.5 * Math.sin(time * 7.3), 6);
      planet.stage.scale.setScalar(60 + 70 * beat);
      for (const b of planet.beams) { const d = b.userData; b.rotation.x = Math.sin(time * d.sp + d.ph) * 0.7; b.rotation.z = Math.cos(time * d.sp * 0.8 + d.ph) * 0.7; b.material.opacity = 0.07 + 0.12 * beat; }
      for (const w of planet.waves) {
        const ph = (time * 0.11 + w.userData.ph) % 1, r = 40 + ph * 1500;
        w.scale.setScalar(r); w.position.copy(planet.site).multiplyScalar(PLANET_R + 8 + ph * 520);
        w.material.opacity = 0.55 * (1 - ph) * (1 - ph) * Math.min(1, ph * 12);
      }
      // the dust rides with the eye and streams back past it
      if (camera) {
        camera.getWorldPosition(eye);
        const a = dG.attributes.position.array;
        for (let i = 0; i < DN; i++) { let z = a[i * 3 + 2] + dt * 240; if (z > 100) z -= 800; a[i * 3 + 2] = z; }
        dG.attributes.position.needsUpdate = true; dust.position.copy(eye);
      }
    }

    return {
      scene, path, duration: DUR,
      camera: { fov: 62, near: 0.5, far: 40000, lookAhead: 40, sway: 0.25, bank: 0.15 },
      pois: [],
      portal: { shape: 'circle', radius: 10, color: '#fff0c0', glow: 0.6 },
      post: { exposure: 1.0, bloom: { strength: 0.9, radius: 0.85, threshold: 0.8 },
        grade: { saturation: 1.1, contrast: 1.06, vignette: 0.3, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() {
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) { (Array.isArray(m) ? m : [m]).forEach((x) => { if (x.map) x.map.dispose(); x.dispose(); }); } });
      },
    };
  },
};
