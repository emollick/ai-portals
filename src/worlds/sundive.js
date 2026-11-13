// SUNDIVE. Disaster Area's stuntship: a ship so black it is seen only as a hole in what is behind it, on a programmed
// dive into the sun that Kakrafoon goes round. We come in past the desert planet's night limb, where the concert is
// still going on (a stage the size of a small continent, speaker towers, searchlights and lasers going up into space,
// the audience in concrete bunkers thirty-seven miles off, shock waves going out through the dust and on into space,
// the band in orbit playing by remote control); then we catch the black ship up with the star filling the sky ahead,
// pass it as a flare goes up from the star's limb, and go on toward the star. The portal stands well short of the surface.
//
// The flight runs along -Z. The star is the only lamp: everything is lit from ahead, so everything is a silhouette.
// THE PARTS, in the order they are built:
//   the sky      stars by colour and magnitude, a milky way, soft clouds along it
//   the star     photosphere (granules, mesogranulation, sunspots with umbra and filamented penumbra, faculae, a
//                churning limb, flare ribbons and the wave that runs out from them), a chromosphere shell, spicules
//                on the limb, coronal loops in arcades over the spot groups, prominences, the corona with its
//                streamers and the zodiacal light (one disc through the star's centre), the flare and what it throws
//   the planet   dunes, rock and salt pans, a terminator, thin dusty air, and the concert
//   the ship     a lofted faceted hull, wings, fins, nacelles, probes and greebles, all one black: the panel lines are
//                seen only where the rim light is cut by them; black controls; a heat glow that grows on the nose
//   the lens     ghosts and streaks from the star, a veil of heat shimmer, dust streaming past
import * as THREE from 'three';
import { makePath } from '../kit/core.js';

const DUR = 46;
const SUN_C = new THREE.Vector3(0, -300, -14000), SUN_R = 6000;
const PLANET_C = new THREE.Vector3(-700, -350, -250), PLANET_R = 450;
const PTS = [[0, 0, 1000], [0, 0, 700], [0, 0, 330], [10, 4, 0], [40, 22, -520], [92, 34, -1120], [64, 12, -1720], [10, 0, -2300], [0, 0, -2720]];
const SUN_DIR = SUN_C.clone().normalize();                                   // from the road to the star, near enough for every lit thing here
const NS = 8;                                                                // sunspots the photosphere's shader knows
const FLARE_OFF = 1.0, FLARE_AZ = 0.38;                                      // where the flare goes up: just inside the limb, upper right
const FLARE_DIR = new THREE.Vector3(Math.sin(FLARE_OFF) * Math.cos(FLARE_AZ), Math.sin(FLARE_OFF) * Math.sin(FLARE_AZ), Math.cos(FLARE_OFF));
const FLARE_FROM = 0.40, FLARE_SPAN = 0.42;                                  // the share of the flight it takes
const SITE = new THREE.Vector3(0.6, 0.45, 0.66).normalize();                 // the stage, on the planet's night side, turned to where we come in
const ENTRY = new THREE.Vector3(PTS[0][0], PTS[0][1], PTS[0][2]);

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const flareBump = (f) => (f <= 0 ? 0 : f < 0.08 ? f / 0.08 : Math.exp(-(f - 0.08) * 4.5));

// ---------- shader pieces ----------
const GLSL_N = /* glsl */`
float hash1(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
vec3 hash33(vec3 p){ return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }
float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hash1(i), hash1(i + vec3(1,0,0)), f.x), mix(hash1(i + vec3(0,1,0)), hash1(i + vec3(1,1,0)), f.x), f.y);
  float b = mix(mix(hash1(i + vec3(0,0,1)), hash1(i + vec3(1,0,1)), f.x), mix(hash1(i + vec3(0,1,1)), hash1(i + vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z); }
float fbm3(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s / 0.875; }
float fbm5(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s / 0.96875; }
// nearest and second nearest cell points, the points themselves drifting with time
vec2 worley(vec3 p, float t){ vec3 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(float(x), float(y), float(z)); vec3 o = hash33(i + g); o = 0.5 + 0.42 * sin(t + 6.2831 * o);
    vec3 r = g + o - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; } }
  return sqrt(vec2(d1, d2)); }
`;
const VERT_STD = /* glsl */`
varying vec3 vP; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main(){ vP = position; vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;

// ---------- small textures, drawn once ----------
function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,170,60,0.35)', midAt = 0.25) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(midAt, mid); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function ringTexture() {      // a lens ghost: a faint disc with a brighter edge
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.78, 'rgba(255,255,255,0.16)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function streakTexture() {    // an anamorphic streak: long, thin, brightest at the middle
  const c = document.createElement('canvas'); c.width = 512; c.height = 32;
  const g = c.getContext('2d'), img = g.createImageData(512, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 512; x++) {
    const u = Math.abs(x - 255.5) / 256, v = Math.abs(y - 15.5) / 16, a = Math.pow(1 - u, 3) * Math.exp(-v * v * 9), i = (y * 512 + x) * 4;
    img.data[i] = 255; img.data[i + 1] = 235; img.data[i + 2] = 215; img.data[i + 3] = Math.round(255 * a);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- the sky ----------
function makeSky(rng, detail) {
  const group = new THREE.Group();
  const SPECTRA = [[0.62, 0.72, 1.0], [0.8, 0.86, 1.0], [1.0, 1.0, 1.0], [1.0, 0.95, 0.8], [1.0, 0.82, 0.6], [1.0, 0.62, 0.42]], R = 32000;
  const band = new THREE.Vector3(0.35, 0.86, 0.37).normalize();                 // the milky way's pole
  const bx = new THREE.Vector3(1, 0, 0).cross(band).normalize(), by = band.clone().cross(bx);
  const v = new THREE.Vector3();
  const layer = (n, size, bright, inBand, map) => {
    const P = new Float32Array(n * 3), C = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      if (inBand) { const a = rng.range(0, 6.2832), h = rng.gauss() * 0.11; v.copy(bx).multiplyScalar(Math.cos(a)).addScaledVector(by, Math.sin(a)).addScaledVector(band, h).normalize(); }
      else { const z = rng.range(-1, 1), a = rng.range(0, 6.2832), r = Math.sqrt(1 - z * z); v.set(r * Math.cos(a), z, r * Math.sin(a)); }
      P[i * 3] = v.x * R; P[i * 3 + 1] = v.y * R; P[i * 3 + 2] = v.z * R;
      const s = SPECTRA[Math.min(5, Math.floor(Math.pow(rng(), 0.8) * 6))], b = bright * (0.12 + 0.88 * Math.pow(rng(), 4));
      C[i * 3] = s[0] * b; C[i * 3 + 1] = s[1] * b; C[i * 3 + 2] = s[2] * b;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, map: map || null, blending: THREE.AdditiveBlending }));
    m.frustumCulled = false; group.add(m);
  };
  const dot = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.25)', 0.3);
  layer(Math.round(11000 * detail), 1.5, 0.9, false, null);       // the field
  layer(Math.round(9000 * detail), 1.3, 0.55, true, null);        // the milky way's own stars
  layer(Math.round(260 * detail), 5.0, 1.6, false, dot);          // the bright ones, with a little glow
  // soft clouds along the milky way, and dark lanes are simply where there are none
  const cloud = glowTexture('rgba(190,200,255,0.5)', 'rgba(120,130,200,0.18)', 0.4);
  for (let i = 0; i < 46; i++) {
    const a = rng.range(0, 6.2832), h = rng.gauss() * 0.06;
    v.copy(bx).multiplyScalar(Math.cos(a)).addScaledVector(by, Math.sin(a)).addScaledVector(band, h).normalize().multiplyScalar(R * 0.98);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud, transparent: true, opacity: rng.range(0.05, 0.14), depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color().setRGB(rng.range(0.6, 1), rng.range(0.6, 0.85), 1) }));
    s.position.copy(v); s.scale.set(rng.range(5000, 11000), rng.range(2500, 5000), 1); s.material.rotation = rng.range(0, 3.14); group.add(s);
  }
  return group;
}

// ---------- the star ----------
function makeSun(rng, U, detail) {
  const group = new THREE.Group(); group.position.copy(SUN_C);
  const dirAt = (off, az, out = new THREE.Vector3()) => out.set(Math.sin(off) * Math.cos(az), Math.sin(off) * Math.sin(az), Math.cos(off));

  // the spot groups: a leader and one or two followers each, on the face we see
  const spots = [], regions = [];
  for (let r = 0; r < 3; r++) {
    const off = [0.42, 0.78, 0.6][r] + rng.range(-0.08, 0.08), az = [2.5, 4.6, 0.2][r] + rng.range(-0.3, 0.3), lead = dirAt(off, az);
    const drift = new THREE.Vector3(rng.range(-1, 1), rng.range(-0.3, 0.3), 0).normalize();
    regions.push({ dir: lead.clone(), drift, size: rng.range(0.05, 0.075) });
    spots.push(new THREE.Vector4(lead.x, lead.y, lead.z, regions[r].size));
    const n = r === 0 ? 2 : 1;
    for (let k = 0; k < n && spots.length < NS; k++) { const f = lead.clone().addScaledVector(drift, 0.13 + 0.09 * k).addScaledVector(new THREE.Vector3(0, 1, 0), rng.range(-0.04, 0.04)).normalize(); spots.push(new THREE.Vector4(f.x, f.y, f.z, regions[r].size * rng.range(0.4, 0.62))); }
  }
  // one more by the flare's foot, so the flare has a reason
  { const f = FLARE_DIR.clone().add(new THREE.Vector3(-0.06, -0.05, 0.03)).normalize(); spots.push(new THREE.Vector4(f.x, f.y, f.z, 0.04)); regions.push({ dir: f.clone(), drift: new THREE.Vector3(0.6, 0.8, 0).normalize(), size: 0.04 }); }
  while (spots.length < NS) spots.push(new THREE.Vector4(0, 0, -1, 0.0001));

  const SU = { uTime: U.uTime, uSpots: { value: spots }, uFlareDir: { value: FLARE_DIR.clone() }, uFlare: U.uFlare, uFlareGlow: U.uFlareGlow };
  const surf = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 128, 96), new THREE.ShaderMaterial({
    uniforms: SU, vertexShader: VERT_STD,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec4 uSpots[${NS}]; uniform vec3 uFlareDir; uniform float uFlare; uniform float uFlareGlow;
      varying vec3 vP; varying vec3 vN; varying vec3 vV;
      ${GLSL_N}
      void main(){
        vec3 P = normalize(vP); float t = uTime;
        float mu = max(dot(normalize(vN), normalize(vV)), 0.0);
        // the slow flow that carries the granules about (supergranulation)
        vec3 w = vec3(fbm3(P * 4.0 + vec3(0.0, t * 0.012, 0.0)), fbm3(P * 4.0 + vec3(7.3, 0.0, t * 0.012)), fbm3(P * 4.0 + vec3(-3.1, t * 0.012, 5.0))) - 0.5;
        // granules: bright cell middles, dark lanes between them; a second, larger set under it (mesogranulation)
        vec2 g1 = worley(P * 92.0 + w * 2.4, t * 0.5);
        float lane = smoothstep(0.02, 0.30, g1.y - g1.x), core = 1.0 - smoothstep(0.0, 0.8, g1.x);
        float gran = lane * (0.55 + 0.45 * core);
        gran = mix(0.62, gran, smoothstep(0.08, 0.45, mu));      // toward the limb the granules foreshorten to nothing
        float meso = fbm3(P * 21.0 + w * 1.5 + vec3(0.0, 0.0, t * 0.03));
        vec3 col = mix(vec3(0.92, 0.22, 0.02), vec3(1.0, 0.70, 0.26), gran);
        col += vec3(1.0, 0.92, 0.72) * pow(gran, 5.0) * 0.55;
        col *= 0.74 + 0.52 * meso;
        // sunspots: a dark umbra, a penumbra of filaments combed outward from it, an uneven edge
        float irr = fbm3(P * 34.0) - 0.5, umb = 0.0, pen = 0.0, fil = 0.0, near = 0.0;
        for (int i = 0; i < ${NS}; i++) {
          vec3 d = uSpots[i].xyz; float rad = uSpots[i].w;
          float x = acos(clamp(dot(P, d), -1.0, 1.0)) / rad * (1.0 + irr * 0.5);
          if (x < 5.0) {
            vec3 t1 = normalize(cross(d, vec3(0.0, 1.0, 0.03))), t2 = cross(d, t1);
            float az = atan(dot(P, t2), dot(P, t1));
            float f = vnoise(vec3(cos(az), sin(az), 0.0) * 11.0 + vec3(x * 0.7, float(i) * 3.1, 0.0));
            float u_ = 1.0 - smoothstep(0.36, 0.48, x + (f - 0.5) * 0.06);
            float p_ = (1.0 - smoothstep(0.86, 1.04, x + (f - 0.5) * 0.22)) - u_;
            if (p_ > pen) { pen = p_; fil = f; }
            umb = max(umb, u_); near = max(near, 1.0 - smoothstep(1.0, 4.5, x));
          }
        }
        col = mix(col, col * vec3(0.62, 0.44, 0.30) * (0.45 + 1.0 * fil), clamp(pen, 0.0, 1.0));
        col = mix(col, vec3(0.085, 0.022, 0.006) * (0.7 + 0.6 * fbm3(P * 160.0)), umb);
        // faculae: a bright network round the spot groups, plainest toward the limb
        float fac = smoothstep(0.52, 0.74, fbm5(P * 44.0 + w * 2.0 + vec3(4.0, -t * 0.02, 9.0)));
        col += vec3(1.0, 0.80, 0.48) * fac * (0.10 + 0.5 * near + 0.35 * (1.0 - mu)) * (1.0 - umb) * (1.0 - 0.7 * pen);
        // the flare: two bright ribbons at its foot, and a wave that runs out across the photosphere from it
        float fd = acos(clamp(dot(P, uFlareDir), -1.0, 1.0));
        float rib = exp(-fd * fd / 0.0011) * (0.55 + 0.45 * sin(dot(P, vec3(31.0, -47.0, 12.0)) * 9.0 + t * 3.0));
        col += vec3(3.2, 2.7, 2.0) * rib * uFlareGlow;
        float wave = exp(-pow((fd - uFlare * 0.42) / 0.014, 2.0)) * (1.0 - uFlare) * step(0.001, uFlare);
        col += vec3(1.0, 0.72, 0.42) * wave * 0.9;
        // limb darkening and reddening, and a churn where the line of sight runs along the surface
        col *= 0.26 + 0.74 * pow(mu, 0.55);
        col.gb *= vec2(0.72, 0.6) + vec2(0.28, 0.4) * mu;
        float churn = fbm5(P * 58.0 + vec3(t * 0.11, -t * 0.07, t * 0.05)) - 0.5;
        col *= 1.0 + churn * 1.5 * (1.0 - smoothstep(0.0, 0.32, mu));
        gl_FragColor = vec4(max(col, 0.0) * 0.62, 1.0);
      }`,
  }));
  group.add(surf);

  // the chromosphere: a thin red skin, seen only edge on
  group.add(new THREE.Mesh(new THREE.SphereGeometry(SUN_R * 1.011, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: VERT_STD,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      ${GLSL_N}
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); vec3 P = normalize(vP);
        float n = fbm5(P * 140.0 + vec3(0.0, uTime * 0.25, 0.0));
        gl_FragColor = vec4(vec3(1.0, 0.16, 0.09) * pow(f, 5.0) * (0.4 + 1.6 * n) * 0.7, 1.0); }`,
  })));

  // spicules: thousands of thin jets standing on the limb, leaning and swaying
  {
    const N = Math.round(7000 * detail), geo = new THREE.ConeGeometry(1, 1, 4, 3, true); geo.translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        uniform float uTime; varying float vH; varying float vK;
        void main(){ vec3 p = position; float ph = instanceMatrix[3].x * 0.013 + instanceMatrix[3].y * 0.017;
          p.x += sin(uTime * 0.9 + ph) * p.y * p.y * 0.9; p.z += cos(uTime * 0.7 + ph * 1.3) * p.y * p.y * 0.9;      // the tip sways, the foot stands
          p.y *= 0.75 + 0.35 * sin(uTime * 0.5 + ph * 2.1);                                                          // and each one rises and falls
          vH = position.y; vK = fract(ph * 7.31);
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0); }`,
      fragmentShader: /* glsl */`varying float vH; varying float vK; void main(){ float a = (1.0 - vH); gl_FragColor = vec4(mix(vec3(1.0, 0.22, 0.08), vec3(1.0, 0.62, 0.3), vK) * a * a * (0.2 + 0.3 * vK), 1.0); }`,
    }), N);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), S = new THREE.Vector3(), d = new THREE.Vector3(), Yv = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      dirAt(i % 5 === 0 ? rng.range(0.1, 0.8) : rng.range(0.82, 1.3), rng.range(0, 6.2832), d);
      Q.setFromUnitVectors(Yv, d); ax.set(rng.range(-1, 1), 0, rng.range(-1, 1)).normalize(); Q2.setFromAxisAngle(ax, rng.range(0, 0.4)); Q.multiply(Q2);
      const h = rng.range(70, 300) * (rng.chance(0.06) ? 2.2 : 1); S.set(rng.range(9, 20), h, rng.range(9, 20));
      M.compose(d.multiplyScalar(SUN_R - 4), Q, S); mesh.setMatrixAt(i, M);
    }
    mesh.frustumCulled = false; group.add(mesh);
  }

  // loops and prominences: half hoops, lit along their length, their plasma running from foot to foot
  const arcs = [], Yv = new THREE.Vector3(0, 1, 0), q2 = new THREE.Quaternion();
  const arcMat = (col, gain, rag, k, sp) => new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uCol: { value: col }, uGain: { value: gain }, uRag: { value: rag }, uK: { value: k }, uSp: { value: sp }, uPh: { value: rng.range(0, 6.28) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, vertexShader: VERT_STD,
    fragmentShader: /* glsl */`
      uniform float uTime, uGain, uRag, uK, uSp, uPh; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      ${GLSL_N}
      void main(){ float along = vUv.x, feet = pow(abs(2.0 * along - 1.0), 2.0);
        float flow = 0.55 + 0.45 * sin(along * uK - uTime * uSp + uPh);
        float rag = mix(1.0, smoothstep(0.22, 0.7, fbm3(vec3(along * 13.0, vUv.y * 4.0, uTime * 0.12 + uPh))), uRag);
        float soft = pow(abs(dot(normalize(vN), normalize(vV))), 1.3);
        gl_FragColor = vec4(uCol * (0.35 + 0.65 * feet) * flow * rag * soft * uGain * 0.6, 1.0); }`,
  });
  const addArc = (dir, R, tube, spin, lean, mat, tall = 1) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 7, 56, Math.PI), mat);
    m.quaternion.setFromUnitVectors(Yv, dir); q2.setFromAxisAngle(dir, spin); m.quaternion.premultiply(q2);
    q2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), lean); m.quaternion.multiply(q2);
    m.position.copy(dir).multiplyScalar(SUN_R - tube * 0.6); m.scale.y = tall;
    m.userData = { y: tall, ph: rng.range(0, 6.28), sp: rng.range(0.2, 0.5) }; group.add(m); arcs.push(m); return m;
  };
  // arcades of coronal loops over each spot group: a row of hoops side by side, small to large
  for (const reg of regions) {
    const n = 9, spin = Math.atan2(reg.drift.y, reg.drift.x) + Math.PI / 2, side = reg.drift.clone();
    for (let i = 0; i < n; i++) {
      const d = reg.dir.clone().addScaledVector(side, (i / (n - 1) - 0.3) * 0.2).normalize(), R = rng.range(150, 560);
      addArc(d, R, rng.range(13, 26), spin + rng.range(-0.25, 0.25), rng.range(-0.5, 0.5), arcMat(new THREE.Color().setRGB(1.6, rng.range(0.85, 1.2), rng.range(0.4, 0.7)), rng.range(0.7, 1.2), 0.25, rng.range(18, 40), rng.range(1, 2.4)), rng.range(0.9, 1.5));
    }
  }
  // prominences: big ragged hoops and curtains of cooler red fire, most of them out on the limb
  for (let i = 0; i < 9; i++) {
    const d = dirAt(i < 6 ? rng.range(0.92, 1.3) : rng.range(0.3, 0.8), rng.range(0, 6.2832)), R = rng.range(420, 1150);
    addArc(d, R, R * rng.range(0.05, 0.1), rng.range(0, 6.28), rng.range(-0.3, 0.3), arcMat(new THREE.Color().setRGB(1.7, rng.range(0.34, 0.6), 0.12), rng.range(0.7, 1.1), 0.85, rng.range(8, 16), rng.range(0.3, 0.8)), rng.range(0.7, 2.0));
  }

  // the corona, the streamers and the zodiacal light: one disc through the star's centre, facing the road
  const EXT = 5.4;
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(SUN_R * 2 * EXT, SUN_R * 2 * EXT), new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uFlare: U.uFlare, uFlareAz: { value: FLARE_AZ } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFlare, uFlareAz; varying vec2 vUv;
      ${GLSL_N}
      void main(){
        vec2 p = (vUv - 0.5) * 2.0 * ${EXT.toFixed(2)}; float r = max(length(p), 1.0), a = atan(p.y, p.x);
        vec3 ad = vec3(cos(a), sin(a), 0.0);
        float helm = smoothstep(0.38, 0.78, fbm3(ad * 2.6 + vec3(0.0, 0.0, uTime * 0.008)));            // the broad helmet streamers
        float rays = fbm5(ad * 15.0 + vec3(r * 0.35, 0.0, uTime * 0.02));                              // the fine rays
        float plume = pow(abs(ad.y), 6.0) * (0.5 + 0.5 * sin(a * 46.0 + fbm3(ad * 5.0) * 9.0));        // polar plumes
        float inner = pow(r, -7.0) * 0.5;                                                              // the bright inner corona
        float outer = pow(r, -(4.6 - 2.9 * helm)) * (0.05 + 0.42 * helm);                              // streamers carry further out
        float I = inner * (0.7 + 0.6 * rays) + outer * (0.45 + 1.1 * rays) + pow(r, -4.0) * plume * 0.25;
        vec3 col = mix(vec3(1.0, 0.58, 0.24), vec3(1.0, 0.90, 0.74), helm) * I;
        // the zodiacal light: dust in the plane of the planets, a long faint lens of it either side of the star
        col += vec3(1.0, 0.78, 0.52) * exp(-abs(p.y) * 1.5 - abs(p.x) * 0.42) * 0.045 * (0.8 + 0.4 * fbm3(vec3(p * 1.7, 2.0)));
        // what the flare throws off: a bright arc that swells out through the corona
        float da = atan(sin(a - uFlareAz), cos(a - uFlareAz)), rf = 1.0 + uFlare * 3.2;
        float cme = exp(-pow((r - rf) / (0.08 + 0.22 * uFlare), 2.0)) * exp(-pow(da / (0.28 + 0.4 * uFlare), 2.0)) * (1.0 - uFlare) * step(0.001, uFlare);
        col += vec3(1.0, 0.72, 0.45) * cme * (0.7 + 0.8 * fbm3(vec3(a * 9.0, r * 3.0, uTime * 0.2))) * 0.45;
        col *= 1.0 - smoothstep(${(EXT * 0.62).toFixed(2)}, ${(EXT * 0.97).toFixed(2)}, r);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  group.add(corona);

  // bright knots on the face (plage and small flares that come and go)
  const knotTex = glowTexture('rgba(255,255,240,1)', 'rgba(255,190,90,0.4)'), knots = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: knotTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    const reg = regions[i % regions.length];
    s.position.copy(reg.dir).add(new THREE.Vector3(rng.range(-0.1, 0.1), rng.range(-0.1, 0.1), rng.range(-0.05, 0.05))).normalize().multiplyScalar(SUN_R + 70);
    s.userData = { ph: rng.range(0, 6.28), sp: rng.range(0.4, 1.3), size: rng.range(260, 700) }; group.add(s); knots.push(s);
  }

  // ---- the flare ----
  const flare = {};
  flare.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,1)', 'rgba(255,225,170,0.6)', 0.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  flare.flash.position.copy(FLARE_DIR).multiplyScalar(SUN_R + 120); group.add(flare.flash);
  flare.streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTexture(), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
  flare.streak.position.copy(flare.flash.position); flare.streak.renderOrder = 20; group.add(flare.streak);
  // the eruptive prominence: a hoop torn off its feet, swelling as it goes
  flare.loopMat = arcMat(new THREE.Color().setRGB(2.2, 1.1, 0.4), 1.4, 0.75, 22, 3.0);
  flare.loop = new THREE.Mesh(new THREE.TorusGeometry(260, 34, 7, 64, Math.PI * 1.25), flare.loopMat);
  flare.loop.quaternion.setFromUnitVectors(Yv, FLARE_DIR); q2.setFromAxisAngle(FLARE_DIR, 0.9); flare.loop.quaternion.premultiply(q2); q2.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI * 0.125); flare.loop.quaternion.multiply(q2);
  flare.loop.visible = false; group.add(flare.loop);
  // the spray: bright blobs thrown out along the flare's own direction, the slow ones falling back
  {
    const N = Math.round(4200 * detail), P = new Float32Array(N * 3), V = new Float32Array(N * 3), S = new Float32Array(N), t1 = new THREE.Vector3(0, 1, 0).cross(FLARE_DIR).normalize(), t2 = FLARE_DIR.clone().cross(t1), v = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const a = rng.range(0, 6.2832), sp = Math.pow(rng(), 1.6) * 0.75, sx = Math.cos(a) * sp, sy = Math.sin(a) * sp, speed = Math.pow(rng(), 2.2) * 0.9 + 0.1;
      v.copy(FLARE_DIR).addScaledVector(t1, sx).addScaledVector(t2, sy).normalize().multiplyScalar(speed);
      V[i * 3] = v.x; V[i * 3 + 1] = v.y; V[i * 3 + 2] = v.z; S[i] = rng();
      P[i * 3] = rng.range(-60, 60); P[i * 3 + 1] = rng.range(-60, 60); P[i * 3 + 2] = rng.range(-60, 60);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aVel', new THREE.BufferAttribute(V, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(S, 1));
    flare.spray = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uF: U.uFlare, uDir: { value: FLARE_DIR.clone() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec3 aVel; attribute float aSeed; uniform float uF; uniform vec3 uDir; varying float vA; varying float vS;
        void main(){ float f = uF; vec3 p = position + aVel * (f * 5200.0) - uDir * (f * f * 2600.0 * (1.0 - length(aVel)));      // the slow ones are pulled back down
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          vA = pow(1.0 - f, 1.4) * step(0.001, f) * smoothstep(0.0, 0.04, f); vS = aSeed;
          gl_PointSize = (1.6 + 3.4 * aSeed) * (1.0 - 0.45 * f); }`,
      fragmentShader: /* glsl */`varying float vA; varying float vS; void main(){ vec2 d = gl_PointCoord - 0.5; float k = smoothstep(0.5, 0.1, length(d)); gl_FragColor = vec4(mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.9, 0.7), vS * vA) * k * vA * 1.6, 1.0); }`,
    }));
    flare.spray.position.copy(FLARE_DIR).multiplyScalar(SUN_R + 40); flare.spray.frustumCulled = false; group.add(flare.spray);
  }
  return { group, arcs, knots, flare };
}

// ---------- the black ship ----------
// One closed skin through a row of cross sections, every facet flat.
function loft(secs) {
  const n = secs[0].pts.length, v = [], P = (s, i) => { const p = secs[s].pts[i % n]; return [p[0], p[1], secs[s].z]; };
  for (let s = 0; s < secs.length - 1; s++) for (let i = 0; i < n; i++) { const a = P(s, i), b = P(s, i + 1), c = P(s + 1, i + 1), d = P(s + 1, i); v.push(...a, ...b, ...c, ...a, ...c, ...d); }
  for (const s of [0, secs.length - 1]) { let cx = 0, cy = 0; for (const p of secs[s].pts) { cx += p[0] / n; cy += p[1] / n; } for (let i = 0; i < n; i++) v.push(cx, cy, secs[s].z, ...P(s, i), ...P(s, i + 1)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
}
// the hull's section: a flattened eight-sided lozenge with a sharp chine at the waterline
const oct = (w, ht, hb, yo = 0) => [[w, yo], [w * 0.7, yo + ht * 0.62], [w * 0.3, yo + ht], [-w * 0.3, yo + ht], [-w * 0.7, yo + ht * 0.62], [-w, yo], [-w * 0.58, yo - hb], [w * 0.58, yo - hb]];
const facet = (g) => { const f = g.index ? g.toNonIndexed() : g; f.computeVertexNormals(); return f; };
const TRS = (px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

function makeShip(rng, U) {
  const ship = new THREE.Group();
  // Black. What is seen of it: a rim where the hull turns from the eye, cut by the panel seams; a hard small glint
  // where a panel catches the star; and, later, the sunward faces and the nose beginning to glow.
  const hull = new THREE.ShaderMaterial({
    uniforms: { uSunDir: { value: SUN_DIR.clone() }, uHeat: U.uHeat, uTime: U.uTime }, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      varying vec3 vOP; varying vec3 vON; varying vec3 vWP; varying vec3 vWN;
      void main(){ vec4 lp = vec4(position, 1.0); vec3 ln = normal;
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp; ln = normalize(mat3(instanceMatrix) * ln);
        #endif
        vOP = lp.xyz; vON = ln; vec4 wp = modelMatrix * lp; vWP = wp.xyz; vWN = mat3(modelMatrix) * ln; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSunDir; uniform float uHeat, uTime; varying vec3 vOP; varying vec3 vON; varying vec3 vWP; varying vec3 vWN;
      ${GLSL_N}
      void main(){
        vec3 N = normalize(vWN), ON = normalize(vON); if (!gl_FrontFacing) { N = -N; ON = -ON; }
        vec3 V = normalize(cameraPosition - vWP); float f = 1.0 - abs(dot(N, V));
        // the panels: seams every few metres along and across the hull, each panel with its own finish
        vec2 pc = vec2(vOP.z / 7.5, (abs(vOP.x) + vOP.y * 0.6) / 5.2), cell = floor(pc), fr = fract(pc);
        float seam = 1.0 - smoothstep(0.0, 0.04, min(min(fr.x, 1.0 - fr.x), min(fr.y, 1.0 - fr.y)));
        float fin = hash1(vec3(cell, 3.0));
        float rivet = smoothstep(0.035, 0.02, length(fract(pc * vec2(6.0, 6.0)) - 0.5)) * step(0.82, max(abs(fr.x - 0.5), abs(fr.y - 0.5)) * 2.0);
        float rim = pow(f, 7.0) * (0.07 + 0.17 * fin) * (1.0 - 0.92 * seam) * (1.0 - 0.6 * rivet);
        vec3 H = normalize(V + uSunDir); float spec = pow(max(dot(N, H), 0.0), 140.0 + 400.0 * fin) * 0.14 * (1.0 - seam);
        float lam = max(dot(N, uSunDir), 0.0) * 0.004 * (0.4 + fin);                           // black, but not a hole: the sunward faces are the least bit less black
        vec3 col = vec3(1.0, 0.5, 0.18) * rim + vec3(1.0, 0.85, 0.6) * spec + vec3(1.0, 0.6, 0.3) * lam;
        // the heat: the nose first, then every face that looks at the star, the seams a little ahead of the plates
        float nose = smoothstep(-28.0, -62.0, vOP.z), lead = pow(max(-ON.z, 0.0), 3.0);
        float heat = uHeat * (nose * 1.25 + lead * 0.55) * (0.85 + 0.3 * seam + 0.25 * fbm3(vOP * 0.35 + vec3(0.0, 0.0, uTime * 0.2)));
        col += vec3(1.5, 0.22, 0.03) * heat * heat + vec3(1.0, 0.62, 0.2) * pow(heat, 4.0) * 1.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const part = (geo, m) => { const g = facet(geo); if (m) g.applyMatrix4(m); const mesh = new THREE.Mesh(g, hull); ship.add(mesh); return mesh; };

  // the hull: nose at z = -60, tail at z = +56
  part(loft([{ z: -60, pts: oct(0.6, 0.4, 0.3) }, { z: -46, pts: oct(4, 2.2, 1.6) }, { z: -28, pts: oct(8, 4.2, 3) }, { z: -6, pts: oct(11, 5.5, 4) },
    { z: 14, pts: oct(13, 6, 4.5) }, { z: 34, pts: oct(12, 6.5, 4.5) }, { z: 50, pts: oct(9.5, 5.5, 4) }, { z: 56, pts: oct(7, 4, 3) }]));
  // the bridge hump, and a keel fairing under the belly
  part(loft([{ z: -12, pts: oct(1.5, 0.6, 0.5, 4.2) }, { z: -2, pts: oct(4, 3.6, 0.5, 5) }, { z: 10, pts: oct(4.6, 4.4, 0.5, 5.6) }, { z: 24, pts: oct(3.4, 3, 0.5, 6) }, { z: 36, pts: oct(1.4, 0.8, 0.5, 5.8) }]));
  part(loft([{ z: -20, pts: oct(1.2, 0.4, 1, -3) }, { z: 0, pts: oct(3.2, 0.5, 3.2, -4) }, { z: 30, pts: oct(3.6, 0.5, 3.6, -4.4) }, { z: 48, pts: oct(1.6, 0.4, 1.2, -4) }]));
  // engine nacelles and their bells
  for (const sx of [-1, 1]) {
    part(new THREE.CylinderGeometry(5.2, 6.4, 42, 6), TRS(sx * 15.5, -0.6, 33, Math.PI / 2, 0, 0));
    part(new THREE.CylinderGeometry(3.6, 6.6, 10, 8, 1, true), TRS(sx * 15.5, -0.6, 59, Math.PI / 2, 0, 0));
    part(new THREE.ConeGeometry(5.2, 12, 6), TRS(sx * 15.5, -0.6, 6, -Math.PI / 2, 0, 0));
    part(new THREE.BoxGeometry(6, 2.2, 26), TRS(sx * 11, -0.4, 32));                                      // the pylon
  }
  // wings: swept slabs with a knife edge (drawn in span and chord, laid flat)
  const slab = (pts, depth) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.45, bevelSize: 0.9, bevelSegments: 1, steps: 1 }); };
  const flat = new THREE.Matrix4().makeRotationX(Math.PI / 2);      // shape y becomes z (aft), the thickness goes down
  for (const sx of [-1, 1]) {
    const mir = new THREE.Matrix4().makeScale(sx, 1, 1);
    part(slab([[6, -16], [50, 30], [53, 41], [34, 38], [6, 45]], 1.3), mir.clone().multiply(TRS(0, 0.4, 0)).multiply(flat));              // main wing
    part(slab([[3.5, -45], [17, -31], [17, -26], [3.5, -30]], 0.7), mir.clone().multiply(TRS(0, 0.6, 0)).multiply(flat));                  // canard
    part(slab([[50, 26], [58, 44], [56, 52], [50, 41]], 0.7), mir.clone().multiply(TRS(0, 0.9, 0)).multiply(flat));                        // tip fence, swept on
    // tail fins: twin, canted out; and ventral strakes canted the other way
    const up = new THREE.Matrix4().makeRotationY(-Math.PI / 2);     // shape x becomes z (aft), y stays up
    part(slab([[0, 0], [20, 25], [31, 26], [27, 0]], 0.9), mir.clone().multiply(TRS(9, 4.5, 24, 0, 0, -0.42)).multiply(up));
    part(slab([[0, 0], [13, 12], [20, 12], [18, 0]], 0.7), mir.clone().multiply(TRS(8, -3.6, 32, 0, 0, Math.PI + 0.55)).multiply(up));
    // wing-tip probes, and intake lips on the shoulders
    part(new THREE.CylinderGeometry(0.25, 0.8, 22, 5), mir.clone().multiply(TRS(51.5, 0, 22, Math.PI / 2, 0, 0)));
    part(new THREE.BoxGeometry(5, 3, 12), mir.clone().multiply(TRS(8.5, 4.4, -2, 0, 0, -0.5)));
  }
  // the long aerial forward of the nose, a dorsal blade, a ventral sensor mast
  part(new THREE.CylinderGeometry(0.3, 0.9, 30, 5), TRS(0, 0, -74, -Math.PI / 2, 0, 0));
  part(slab([[0, 0], [9, 13], [14, 13], [15, 0]], 0.5), TRS(0, 9.5, 12).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2)));
  part(new THREE.CylinderGeometry(0.2, 0.6, 12, 5), TRS(0, -11, 18));
  // greebles: hatches, housings, conduits, strewn along the spine and shoulders
  {
    const N = 110, g = new THREE.InstancedMesh(facet(new THREE.BoxGeometry(1, 1, 1)), hull, N), M = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const z = rng.range(-30, 52), w = 4 + 8 * sstep(-60, 0, z), x = rng.range(-w, w), top = rng.chance(0.7);
      const y = top ? 5.6 - Math.abs(x) * 0.32 - (z < -6 ? (-6 - z) * 0.06 : 0) : -4.1;
      M.copy(TRS(x, y, z, 0, 0, top ? -Math.sign(x) * 0.3 : 0, rng.range(0.6, 2.6), rng.range(0.3, 1.1), rng.range(1, 6))); g.setMatrixAt(i, M);
    }
    ship.add(g);
  }
  // the canopy: black glass. Behind it, the controls: black, labelled in black, on a black panel, and when you press one a
  // small black light lights up black to let you know you have done it.
  const glass = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime }, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec3 vWP; varying vec3 vWN; varying vec3 vOP; void main(){ vOP = position; vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vWN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`uniform float uTime; varying vec3 vWP; varying vec3 vWN; varying vec3 vOP;
      void main(){ float f = 1.0 - abs(dot(normalize(vWN), normalize(cameraPosition - vWP)));
        float panes = step(0.08, fract(vOP.x / 2.2)) * step(0.1, fract(vOP.z / 3.0));
        float press = step(0.93, fract(sin(floor(vOP.x * 1.7) * 12.9 + floor(vOP.z * 1.3) * 78.2 + floor(uTime * 1.3)) * 43758.5));     // a black light, lighting up black
        gl_FragColor = vec4(vec3(0.10, 0.03, 0.24) * (0.06 + 0.9 * pow(f, 2.5)) * panes + vec3(0.07, 0.0, 0.16) * press, 1.0); }`,
  });
  { const g = facet(new THREE.BoxGeometry(7.4, 0.3, 11)); g.applyMatrix4(TRS(0, 7.9, -4.2, 0.33, 0, 0)); ship.add(new THREE.Mesh(g, glass)); }
  for (const sx of [-1, 1]) { const g = facet(new THREE.BoxGeometry(0.3, 2.2, 14)); g.applyMatrix4(TRS(sx * 3.9, 8.2, 6, 0, 0, sx * 0.5)); ship.add(new THREE.Mesh(g, glass)); }
  // running lights, also black (the deepest violet the eye will take for a colour)
  {
    const P = []; for (const p of [[53, 0.6, 40], [-53, 0.6, 40], [0, 23, 38], [15.5, -0.6, 64], [-15.5, -0.6, 64], [0, -17, 18], [0, 0, -89]]) P.push(...p);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: true, color: new THREE.Color().setRGB(0.12, 0.015, 0.3), map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.3)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    ship.add(pts); ship.userData.blackLights = pts;
  }
  // inside the bells: nothing burning (the dive is ballistic), only the same black light
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.CircleGeometry(3.4, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.04, 0.0, 0.1) })); m.position.set(sx * 15.5, -0.6, 57); ship.add(m); }
  // the heat on the nose, as a glow in the dust ahead of it
  const noseGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,200,120,1)', 'rgba(255,70,10,0.4)', 0.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  noseGlow.position.set(0, 0, -60); ship.add(noseGlow); ship.userData.noseGlow = noseGlow;
  return ship;
}

// ---------- the concert planet ----------
function makePlanet(rng, U, detail) {
  const group = new THREE.Group(); group.position.copy(PLANET_C);
  const sunDir = SUN_C.clone().sub(PLANET_C).normalize();
  const PU = { uTime: U.uTime, uBeat: U.uBeat, uSunDir: { value: sunDir }, uSite: { value: SITE.clone() } };
  group.add(new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 160, 110), new THREE.ShaderMaterial({
    uniforms: PU,
    vertexShader: /* glsl */`varying vec3 vP; varying vec3 vWN; varying vec3 vWP; void main(){ vP = position; vWN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uBeat; uniform vec3 uSunDir, uSite; varying vec3 vP; varying vec3 vWN; varying vec3 vWP;
      ${GLSL_N}
      vec3 bump(vec3 N, vec3 pos, float h, float k){ vec3 dx = dFdx(pos), dy = dFdy(pos); float hx = dFdx(h), hy = dFdy(h);
        vec3 r1 = cross(dy, N), r2 = cross(N, dx); float det = dot(dx, r1); return normalize(abs(det) * N - k * sign(det) * (hx * r1 + hy * r2)); }
      void main(){
        vec3 P = normalize(vP), N = normalize(vWN);
        // the land: seas of dunes, rock uplands, pale salt pans in the lows
        float lay = fbm5(P * 2.3 + 5.0), erg = smoothstep(0.42, 0.6, lay), pan = smoothstep(0.34, 0.26, lay);
        float wp = fbm3(P * 5.0) * 9.0;
        float d1 = 1.0 - abs(sin(dot(P, vec3(0.3, 0.9, 0.2)) * 150.0 + wp)); d1 = pow(d1, 1.6);       // the long barchan ridges
        float d2 = 1.0 - abs(sin(dot(P, vec3(-0.7, 0.2, 0.6)) * 420.0 + wp * 2.3));                 // ripples across them
        float rock = fbm5(P * 19.0), crag = fbm5(P * 70.0);
        float h = erg * (d1 * 1.0 + d2 * 0.22) + (1.0 - erg) * (rock * 1.6 + crag * 0.5) * (1.0 - pan);
        vec3 Nb = bump(N, vWP, h, 1.5);
        vec3 sand = mix(vec3(0.60, 0.34, 0.16), vec3(0.80, 0.56, 0.30), d1 * 0.7 + 0.3 * fbm3(P * 9.0));
        vec3 stone = mix(vec3(0.30, 0.19, 0.14), vec3(0.50, 0.33, 0.22), rock);
        vec3 alb = mix(stone, sand, erg); alb = mix(alb, vec3(0.86, 0.79, 0.68), pan * 0.85);
        // day, the terminator, night
        float g = dot(N, uSunDir), nl = max(dot(Nb, uSunDir), 0.0), day = smoothstep(-0.06, 0.12, g);
        vec3 sunCol = mix(vec3(1.0, 0.30, 0.07), vec3(1.0, 0.90, 0.74), smoothstep(0.0, 0.4, g));       // low sun is red sun
        vec3 col = alb * sunCol * nl * day * 1.9 + alb * 0.0035;
        // the concert's own light on the ground, and the shock waves going out through the dust
        float ang = acos(clamp(dot(P, uSite), -1.0, 1.0));
        vec3 t1 = normalize(cross(uSite, vec3(0.0, 1.0, 0.0))), t2 = cross(uSite, t1); float az = atan(dot(P, t2), dot(P, t1));
        vec3 wash = 0.55 + 0.45 * cos(vec3(0.0, 2.1, 4.2) + az * 2.0 + uTime * 0.7);                   // the stage's coloured washes going round
        float pool = exp(-ang * ang / 0.016) * (0.5 + 0.9 * uBeat) + exp(-ang / 0.3) * 0.22;
        vec3 Ls = normalize(uSite * 1.07 - P);                                                       // the stage's light comes in low across the dunes
        float ring = pow(0.5 + 0.5 * sin(ang * 46.0 - uTime * 3.4), 10.0) * exp(-ang * 4.5) * smoothstep(0.03, 0.12, ang);
        float dust = fbm3(P * 30.0 + vec3(uTime * 0.05));
        col += alb * mix(vec3(1.0, 0.82, 0.6), wash, 0.55) * pool * (1.0 - day) * 1.3 * (0.2 + 2.6 * max(dot(Nb, Ls), 0.0));
        col += vec3(1.0, 0.66, 0.38) * ring * (0.35 + 0.65 * dust) * (0.14 * (1.0 - day) + 0.06 * day);
        // the bunkers' ring of lamps, thirty-seven miles out, as a faint line of light on the sand
        col += vec3(1.0, 0.7, 0.35) * exp(-pow((ang - 0.62) / 0.012, 2.0)) * 0.02 * (1.0 - day);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })));
  // thin dusty air: a rim, red at the terminator, and the shock fronts seen again in it
  group.add(new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.03, 96, 64), new THREE.ShaderMaterial({
    uniforms: PU, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vW = normalize(mat3(modelMatrix) * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform vec3 uSunDir, uSite; uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float k = smoothstep(0.0, 0.28, f) * (1.0 - smoothstep(0.28, 0.6, f));
        float day = smoothstep(-0.3, 0.3, dot(vW, uSunDir)); vec3 c = mix(vec3(1.0, 0.32, 0.12), vec3(1.0, 0.72, 0.42), day);
        float ang = acos(clamp(dot(normalize(vW), uSite), -1.0, 1.0));
        float ring = pow(0.5 + 0.5 * sin(ang * 46.0 - uTime * 3.4), 10.0) * exp(-ang * 2.0);
        gl_FragColor = vec4(c * k * (0.05 + 0.95 * day) + vec3(1.0, 0.6, 0.3) * ring * k * 0.07, 1.0); }`,
  })));

  // ---- the concert ----
  const e1 = new THREE.Vector3(0, 1, 0).cross(SITE).normalize(), e2 = SITE.clone().cross(e1).normalize();
  const at = (theta, a, r, out) => out.copy(SITE).multiplyScalar(Math.cos(theta)).addScaledVector(e1, Math.sin(theta) * Math.cos(a)).addScaledVector(e2, Math.sin(theta) * Math.sin(a)).multiplyScalar(r);
  const v = new THREE.Vector3(), d = new THREE.Vector3(), Yv = new THREE.Vector3(0, 1, 0), Q = new THREE.Quaternion(), M = new THREE.Matrix4(), S = new THREE.Vector3();
  const pal = [[1, 0.95, 0.8], [1, 0.25, 0.7], [0.3, 0.9, 1], [1, 0.65, 0.15], [0.6, 0.4, 1], [0.3, 1, 0.5]];
  const dot = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.4)');
  // the stage: stands on the site, its open side turned to where we come in
  const stage = new THREE.Group();
  { const sitePos = SITE.clone().multiplyScalar(PLANET_R), toEye = ENTRY.clone().sub(PLANET_C).sub(sitePos); const zAx = toEye.addScaledVector(SITE, -toEye.dot(SITE)).normalize(), xAx = SITE.clone().cross(zAx).normalize();
    stage.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, SITE, zAx)); stage.position.copy(sitePos); }
  group.add(stage);
  const black = new THREE.MeshBasicMaterial({ color: 0x020202 }), dim = new THREE.MeshBasicMaterial({ color: 0x0b0806 });
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(36, 41, 5, 12), dim); deck.position.y = 1.5; stage.add(deck);
  const apron = new THREE.Mesh(new THREE.CylinderGeometry(58, 62, 1.6, 24), black); apron.position.y = 0.2; stage.add(apron);
  const rigP = [], rigC = [];
  for (let k = 0; k < 4; k++) {      // arches of truss over the deck, front to back
    const R = 44 - k * 5, z = 16 - k * 11, arch = new THREE.Mesh(new THREE.TorusGeometry(R, 1.5, 5, 30, Math.PI), black); arch.position.set(0, 3, z); stage.add(arch);
    for (let i = 0; i <= 26; i++) { const a = (i / 26) * Math.PI, c = pal[(i + k) % pal.length], b = rng.range(0.8, 1.8); rigP.push(Math.cos(a) * R, 3 + Math.sin(a) * R - 1.2, z); rigC.push(c[0] * b, c[1] * b, c[2] * b); }
  }
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(5, 46 - k * 8, 5), black); t.position.set(sx * (48 + k * 7), 20 - k * 4, 10 - k * 9); stage.add(t); }   // the stacks either side of the stage
  { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(rigP, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(rigC, 3));
    stage.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 3.4, sizeAttenuation: true, vertexColors: true, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); }
  // the wall of light at the back of the stage: level meters the height of hills
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(74, 30), new THREE.ShaderMaterial({
    uniforms: PU, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform float uTime, uBeat; varying vec2 vUv;
      void main(){ float bar = floor(vUv.x * 28.0), fx = fract(vUv.x * 28.0), lvl = 0.25 + 0.75 * abs(sin(uTime * (3.0 + mod(bar, 5.0)) + bar * 1.7)) * (0.5 + 0.5 * uBeat);
        float on = step(vUv.y, lvl) * step(0.15, fx) * step(0.2, fract(vUv.y * 16.0));
        vec3 c = mix(vec3(0.2, 1.0, 0.4), vec3(1.0, 0.15, 0.1), smoothstep(0.45, 0.95, vUv.y)); c = mix(c, vec3(1.0, 0.8, 0.2), smoothstep(0.35, 0.6, vUv.y) * (1.0 - smoothstep(0.6, 0.8, vUv.y)));
        gl_FragColor = vec4(c * on * 1.6 + vec3(0.004), 1.0); }`,
  }));
  wall.position.set(0, 20, -26); stage.add(wall);
  const stageGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  stageGlow.position.set(0, 10, 0); stageGlow.scale.setScalar(80); stage.add(stageGlow);

  // rings of light round the stage: lamp towers, follow spots, the lit edges of the equipment parks
  { const P = [], C = [];
    for (let k = 1; k <= 11; k++) { const theta = 0.03 * k + 0.012, n = 34 + k * 24, pc = pal[k % pal.length];
      for (let i = 0; i < n; i++) { if (rng.chance(0.12)) continue; at(theta + rng.range(-0.003, 0.003), (i / n) * 6.2832, PLANET_R + 1.5, v); P.push(v.x, v.y, v.z); const b = rng.range(0.5, 1.5); C.push(pc[0] * b, pc[1] * b, pc[2] * b); } }
    for (let s = 0; s < 14; s++) { const a = (s / 14) * 6.2832 + rng.range(-0.05, 0.05); for (let i = 0; i < 70; i++) { at(0.05 + i * 0.008, a + Math.sin(i * 0.2) * 0.01, PLANET_R + 1.2, v); P.push(v.x, v.y, v.z); C.push(0.9, 0.6, 0.3); } }   // the service roads, lit all the way out to the bunkers
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    group.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 4.6, sizeAttenuation: true, vertexColors: true, map: dot, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); }
  // speaker towers: black stacks in three rings, each with a red lamp at its head
  { const N = 84, towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), black, N), P = [];
    for (let i = 0; i < N; i++) { const ring = i < 14 ? 0 : i < 40 ? 1 : 2, theta = [0.085, 0.165, 0.265][ring] + rng.range(-0.008, 0.008), h = rng.range(34, 82) * [1.5, 1.15, 0.9][ring];
      at(theta, (i / [14, 26, 44][ring]) * 6.2832 + rng.range(-0.05, 0.05), 1, d); Q.setFromUnitVectors(Yv, d); S.set(rng.range(8, 14), h, rng.range(8, 14));
      v.copy(d).multiplyScalar(PLANET_R + h / 2 - 1); M.compose(v, Q, S); towers.setMatrixAt(i, M); v.copy(d).multiplyScalar(PLANET_R + h + 1.5); P.push(v.x, v.y, v.z); }
    group.add(towers);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    group.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 4, sizeAttenuation: true, color: new THREE.Color().setRGB(1.6, 0.1, 0.05), map: dot, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); }
  // the audience: concrete bunkers thirty-seven miles from the stage, a ring of them, each with its few lamps
  { const N = 52, bunk = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), dim, N), P = [];
    for (let i = 0; i < N; i++) { const theta = 0.62 + rng.range(-0.025, 0.025), a = (i / N) * 6.2832 + rng.range(-0.03, 0.03);
      at(theta, a, 1, d); Q.setFromUnitVectors(Yv, d); S.set(rng.range(8, 13), rng.range(2, 3.4), rng.range(5, 8)); v.copy(d).multiplyScalar(PLANET_R + 1); M.compose(v, Q, S); bunk.setMatrixAt(i, M);
      for (let k = 0; k < 9; k++) { at(theta + rng.range(-0.012, 0.012), a + rng.range(-0.02, 0.02), PLANET_R + 1.6, v); P.push(v.x, v.y, v.z); } }
    group.add(bunk);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    group.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: true, color: new THREE.Color().setRGB(1.0, 0.72, 0.36), map: dot, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }))); }
  // searchlights: long cones of light sweeping up into space
  const beams = [];
  const beamMat = (c) => new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color().setRGB(c[0], c[1], c[2]) }, uGain: { value: 0.2 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, vertexShader: VERT_STD,
    fragmentShader: /* glsl */`uniform vec3 uCol; uniform float uGain; varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ float soft = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = pow(vUv.y, 1.4); gl_FragColor = vec4(uCol * soft * a * uGain, 1.0); }` });
  for (let i = 0; i < 20; i++) {
    const len = rng.range(420, 1150), geo = new THREE.CylinderGeometry(len * 0.022, 0.8, len, 10, 1, true); geo.translate(0, len / 2, 0);
    const bm = new THREE.Mesh(geo, beamMat(pal[i % pal.length])), pivot = new THREE.Group();
    at(i < 8 ? 0.03 : 0.09 + 0.03 * (i % 4), (i / 20) * 6.2832 * (i < 8 ? 2.5 : 1), PLANET_R, v); pivot.position.copy(v); pivot.quaternion.setFromUnitVectors(Yv, d.copy(v).normalize());
    pivot.add(bm); bm.userData = { ph: rng.range(0, 6.28), sp: rng.range(0.25, 0.7), amp: rng.range(0.35, 0.8) }; group.add(pivot); beams.push(bm);
  }
  // lasers: a fan of hard lines from the top of the stage, turning
  const lasers = new THREE.Group();
  { const P = [], C = []; for (let i = 0; i < 36; i++) { const a = (i / 36) * 6.2832, tilt = 0.35 + 0.5 * ((i * 7) % 5) / 5, L = 900, c = i % 3 === 0 ? [0.2, 1.6, 0.4] : i % 3 === 1 ? [1.6, 0.15, 0.9] : [0.3, 0.7, 1.8];
      P.push(0, 40, 0, Math.cos(a) * Math.sin(tilt) * L, 40 + Math.cos(tilt) * L, Math.sin(a) * Math.sin(tilt) * L); C.push(...c, 0, 0, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    lasers.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }))); }
  stage.add(lasers);
  // the band: in orbit over the stage in a heavily insulated ship, playing by remote control down a tight beam
  const band = new THREE.Group();
  { const body = new THREE.Mesh(facet(new THREE.OctahedronGeometry(1, 0)), new THREE.MeshStandardMaterial({ color: 0x9a9aa2, roughness: 0.35, metalness: 0.9 })); body.scale.set(5, 2.2, 11); band.add(body);
    const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color().setRGB(0.6, 0.9, 1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); lamp.scale.setScalar(9); lamp.position.y = -3; band.add(lamp); band.userData.lamp = lamp;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, -3, 0, 0, -262, 0], 3));
    band.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color().setRGB(0.5, 0.8, 1.4), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));
    band.position.set(0, 300, 0); stage.add(band); }
  // shock waves going on out into space from the stage
  const waves = [], wq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), SITE);
  for (let i = 0; i < 7; i++) {
    const w = new THREE.Mesh(new THREE.RingGeometry(0.984, 1, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.0, 0.75, 0.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    w.quaternion.copy(wq); w.userData = { ph: i / 7 }; group.add(w); waves.push(w);
  }
  return { group, stageGlow, beams, lasers, band, waves };
}

// ---------- the lens: ghosts, streaks, a veil of heat ----------
function makeLens(U) {
  const group = new THREE.Group(), ring = ringTexture(), soft = glowTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0.25)', 0.4), streak = streakTexture();
  const ghosts = [];
  const add = (f, size, col, map, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: new THREE.Color().setRGB(col[0], col[1], col[2]), blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
    s.renderOrder = 30; s.frustumCulled = false; s.userData = { f, size, op }; group.add(s); ghosts.push(s); };
  add(-0.35, 0.10, [1.0, 0.55, 0.25], ring, 0.10); add(-0.62, 0.05, [0.5, 0.8, 1.0], soft, 0.10); add(-0.95, 0.19, [1.0, 0.4, 0.3], ring, 0.07);
  add(-1.45, 0.34, [0.6, 0.5, 1.0], ring, 0.05); add(0.42, 0.04, [1.0, 0.85, 0.5], soft, 0.12); add(0.7, 0.07, [0.5, 1.0, 0.7], ring, 0.06);
  const bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: streak, color: new THREE.Color().setRGB(1.0, 0.7, 0.45), blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
  bar.renderOrder = 30; bar.frustumCulled = false; group.add(bar);
  // heat shimmer: a veil of slow rising streaks between the eye and everything, thicker the nearer the star
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uShim: U.uShim, uSun: { value: new THREE.Vector2(0.5, 0.5) } }, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform float uTime, uShim; uniform vec2 uSun; varying vec2 vUv;
      ${GLSL_N}
      void main(){ vec2 p = vUv - uSun; p.x *= 1.78; float r = length(p);
        float n = fbm5(vec3(vUv.x * 7.0 + sin(vUv.y * 9.0 + uTime * 1.3) * 0.25, vUv.y * 2.6 - uTime * 0.55, uTime * 0.2));
        float w = fbm3(vec3(vUv.x * 30.0, vUv.y * 5.0 - uTime * 1.6, uTime * 0.4));
        float I = (smoothstep(0.35, 0.8, n) * 0.6 + smoothstep(0.55, 0.9, w) * 0.4) * exp(-r * 1.3);
        gl_FragColor = vec4(vec3(1.0, 0.55, 0.22) * I * uShim * 0.045 + vec3(1.0, 0.5, 0.2) * exp(-r * 2.2) * uShim * 0.012, 1.0); }`,
  }));
  veil.renderOrder = 29; veil.frustumCulled = false; group.add(veil);
  return { group, ghosts, bar, veil };
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
    const rng = ctx.rng, detail = Math.max(0.4, ctx.quality?.detail ?? 1);
    const R = {}; for (const n of ['sky', 'sun', 'planet', 'ship', 'dust']) R[n] = rng.fork ? rng.fork(n) : rng;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
    const path = makePath(PTS);
    const U = { uTime: { value: 0 }, uFlare: { value: 0 }, uFlareGlow: { value: 0 }, uHeat: { value: 0 }, uBeat: { value: 0 }, uShim: { value: 0 } };

    // the one lamp: the star, ahead. (Our own shaders take its direction themselves; this is for the band's ship.)
    const sunLight = new THREE.DirectionalLight(0xffd9a8, Math.PI * 1.25);
    sunLight.position.copy(SUN_C); sunLight.target.position.set(0, 0, 0); scene.add(sunLight, sunLight.target);
    scene.add(new THREE.HemisphereLight(0x332014, 0x050302, Math.PI * 0.02));

    scene.add(makeSky(R.sky, detail));
    await ctx.yield();
    const sun = makeSun(R.sun, U, detail); scene.add(sun.group);
    await ctx.yield();
    const planet = makePlanet(R.planet, U, detail); scene.add(planet.group);
    await ctx.yield();
    const ship = makeShip(R.ship, U); scene.add(ship);
    await ctx.yield();
    const lens = makeLens(U); scene.add(lens.group);

    // dust and sparks streaming past, sunward to spaceward, so the dive has a speed
    const DN = Math.round(1400 * detail), dP = new Float32Array(DN * 3), rd = R.dust;
    for (let i = 0; i < DN; i++) { dP[i * 3] = rd.range(-260, 260); dP[i * 3 + 1] = rd.range(-160, 160); dP[i * 3 + 2] = rd.range(-700, 100); }
    const dG = new THREE.BufferGeometry(); dG.setAttribute('position', new THREE.BufferAttribute(dP, 3));
    const dust = new THREE.Points(dG, new THREE.PointsMaterial({ size: 0.7, sizeAttenuation: true, map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.3)'), color: new THREE.Color().setRGB(1.0, 0.7, 0.4), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    dust.frustumCulled = false; scene.add(dust);
    await ctx.yield();

    // the ship keeps to the road, to starboard and a little below; we start some 500 m astern of it and are past it by u = 0.85
    const sp = new THREE.Vector3(), st = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), look = new THREE.Vector3(), eye = new THREE.Vector3();
    const SIDE = 62, BELOW = 12;
    const shipAt = (u, time, out) => {
      const s = u + 0.14 * (1 - u / 0.85);
      path.pointAt(s, sp); path.tangentAt(clamp01(s), st); side.crossVectors(st, up).normalize();
      return out.copy(sp).addScaledVector(side, SIDE).addScaledVector(up, -BELOW + Math.sin(time * 0.4) * 2);
    };
    function placeShip(u, time) {
      shipAt(u, time, ship.position);
      look.copy(ship.position).add(st); ship.lookAt(look); ship.rotateY(Math.PI);      // lookAt turns +Z to the target; the nose is -Z
      ship.rotateZ(Math.sin(time * 0.22) * 0.12 + 0.1 + sstep(0.3, 0.8, u) * 0.5);      // it rolls slowly belly-out as we come alongside
    }
    placeShip(0, 0);

    // the gaze: first the concert on the night limb, then the ship as we come up on it
    const sitePos = SITE.clone().multiplyScalar(PLANET_R).add(PLANET_C), poiShip = new THREE.Vector3();
    const pois = [
      { at: [sitePos.x, sitePos.y, sitePos.z], from: -0.12, to: 0.2, weight: 0.8 },
      { at: (time, u) => shipAt(u ?? 0, time ?? 0, poiShip), from: 0.3, to: 0.82, weight: 0.45 },
    ];

    const inv = new THREE.Matrix4(), sc = new THREE.Vector3(), cq = new THREE.Quaternion(), cp = new THREE.Vector3(), tmp = new THREE.Vector3();
    const FL = sun.flare, flareWorld = FLARE_DIR.clone().multiplyScalar(SUN_R + 120).add(SUN_C);

    function update(dt, time, camera, u) {
      const uu = typeof u === 'number' && isFinite(u) ? clamp01(u) : 0;
      U.uTime.value = time;
      placeShip(uu, time);
      // the star's own life
      for (const a of sun.arcs) { const d = a.userData; a.scale.y = d.y * (1 + 0.1 * Math.sin(time * d.sp + d.ph)); }
      for (const k of sun.knots) { const d = k.userData, f = 0.5 + 0.5 * Math.sin(time * d.sp + d.ph); k.scale.setScalar(d.size * (0.5 + f * f)); k.material.opacity = 0.3 + 0.6 * f * f; }
      // the flare: a flash, a streak across the lens, a hoop torn loose, a spray, a wave through the corona
      const f = clamp01((uu - FLARE_FROM) / FLARE_SPAN), bump = flareBump(f);
      U.uFlare.value = f; U.uFlareGlow.value = bump;
      FL.flash.material.opacity = Math.min(1, bump * 1.4); FL.flash.scale.setScalar(300 + 2600 * bump);
      FL.streak.material.opacity = Math.min(1, bump * 1.1); FL.streak.scale.set(600 + 15000 * bump, 90 + 260 * bump, 1);
      FL.loop.visible = f > 0.001 && f < 0.995;
      if (FL.loop.visible) { const s = 1 + f * 7; FL.loop.scale.set(s, s * 1.3, s); FL.loop.position.copy(FLARE_DIR).multiplyScalar(SUN_R + f * 2600); FL.loopMat.uniforms.uGain.value = 1.6 * Math.pow(1 - f, 1.5) * sstep(0, 0.05, f); }
      // the ship's heat, the shimmer
      U.uHeat.value = sstep(0.18, 1.0, uu) * 0.95 + bump * 0.12;
      U.uShim.value = 0.25 + 0.75 * uu + bump * 0.5;
      const ng = ship.userData.noseGlow; ng.material.opacity = U.uHeat.value * 0.75; ng.scale.setScalar(8 + 46 * U.uHeat.value);
      ship.userData.blackLights.material.opacity = 0.55 + 0.45 * Math.sin(time * 2.1);
      // the concert: the stage beats, the beams swing, the lasers turn, the band's lamp blinks, the shock waves go out
      const beat = Math.pow(0.5 + 0.5 * Math.sin(time * 7.3), 6); U.uBeat.value = beat;
      planet.stageGlow.scale.setScalar(70 + 90 * beat);
      for (const b of planet.beams) { const d = b.userData; b.rotation.x = Math.sin(time * d.sp + d.ph) * d.amp; b.rotation.z = Math.cos(time * d.sp * 0.8 + d.ph) * d.amp; b.material.uniforms.uGain.value = 0.12 + 0.2 * beat; }
      planet.lasers.rotation.y = time * 0.35;
      planet.band.userData.lamp.material.opacity = (time * 1.5) % 1 < 0.15 ? 1 : 0.15;
      for (const w of planet.waves) {
        const ph = (time * 0.1 + w.userData.ph) % 1, r = 40 + ph * 1700;
        w.scale.setScalar(r); w.position.copy(SITE).multiplyScalar(PLANET_R + 8 + ph * 600);
        w.material.opacity = 0.2 * (1 - ph) * (1 - ph) * Math.min(1, ph * 12);
      }
      if (!camera) return;
      camera.getWorldPosition(eye);
      // the dust rides with the eye and streams back past it
      const a = dG.attributes.position.array;
      for (let i = 0; i < DN; i++) { let z = a[i * 3 + 2] + dt * 260; if (z > 100) z -= 800; a[i * 3 + 2] = z; }
      dG.attributes.position.needsUpdate = true; dust.position.copy(eye);
      // the lens: where the star stands in the camera's own frame, and the ghosts strung along the line through the middle
      camera.updateMatrixWorld(); inv.copy(camera.matrixWorld).invert(); camera.matrixWorld.decompose(cp, cq, tmp);
      sc.copy(SUN_C).applyMatrix4(inv);
      const D = 30, front = sc.z < 0, tx = front ? sc.x / -sc.z : 0, ty = front ? sc.y / -sc.z : 0;
      const half = Math.tan(((camera.fov || 62) * Math.PI) / 360), asp = camera.aspect || 1.78;
      const inView = front ? sstep(1.6, 0.9, Math.max(Math.abs(tx) / (half * asp), Math.abs(ty) / half)) : 0, gain = inView * (0.35 + 0.65 * uu) * (ctx.through ? 0.4 : 1);
      for (const g of lens.ghosts) { const d = g.userData; g.position.set(tx * d.f * D, ty * d.f * D, -D).applyMatrix4(camera.matrixWorld); g.scale.setScalar(d.size * D * 2 * half); g.material.opacity = d.op * 0.6 * gain * (1 + 2 * bump); }
      lens.bar.position.set(tx * D, ty * D, -D).applyMatrix4(camera.matrixWorld); lens.bar.scale.set(D * half * asp * 3.2, D * half * 0.05, 1); lens.bar.material.opacity = 0.09 * gain;
      lens.veil.position.set(0, 0, -D).applyMatrix4(camera.matrixWorld); lens.veil.quaternion.copy(cq); lens.veil.scale.set(D * half * asp * 2.05, D * half * 2.05, 1);
      lens.veil.material.uniforms.uSun.value.set(0.5 + 0.5 * tx / (half * asp), 0.5 + 0.5 * ty / half);
      lens.veil.visible = !ctx.through;
      // the flare's own streak is brighter the nearer the middle of the frame it stands
      tmp.copy(flareWorld).applyMatrix4(inv); if (tmp.z > 0) FL.streak.material.opacity = 0;
    }

    return {
      scene, path, duration: DUR,
      camera: { fov: 62, near: 0.5, far: 40000, lookAhead: 40, sway: 0.25, bank: 0.15 },
      pois,
      portal: { shape: 'circle', radius: 10, color: '#fff0c0', glow: 0.6 },
      post: { exposure: 1.0, bloom: { strength: 0.42, radius: 0.8, threshold: 0.92 },
        grade: { saturation: 1.1, contrast: 1.06, vignette: 0.3, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() {
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) { (Array.isArray(m) ? m : [m]).forEach((x) => { if (x.map) x.map.dispose(); x.dispose(); }); } });
      },
    };
  },
};
