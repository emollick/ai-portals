// THE SKY OVER KRIKKIT. Night on a gentle farming planet whose sky has never held a single light: black from rim to rim.
// The whole village has climbed its hill with lanterns, because somebody has built a ship in a shed. We fly up the lane
// over the river, the bridge and the green, see the ship heave itself off its timber gantry, follow its fire up through the
// dust cloud that has always wrapped this world, and come out on top of the cloud into everything there is.
// An original place, imagined from Douglas Adams's Life, the Universe and Everything.
//
// HOW IT IS MADE
//  - the land: a fine patch (the valley, the village, the hill) that takes the lamps' light from one baked map, and a coarse
//    country round it; a river whose water reads the same map, so every lantern on a bank lies in the water too
//  - the village: houses of four kinds set along real lanes and facing them, each with its garden, fence and windows
//  - the ship and its trail are placed by the flight's own share u: it leaves as we cross the village and leads us up
//  - the dust: one instanced field of soft billows lit by the ship's fire as it passes, and from above by the stars
//  - the sky: a painted dome (the galaxy's band, its dust lanes, nebulae, a spiral neighbour) and eighty thousand stars
import * as THREE from 'three';
import { makePath, makeNoise } from '../kit/core.js';

const DUR = 52;
const VC = [60, -360];                       // the village's middle
const GREEN = [100, -395], GREEN_R = 56;
const HILL = [0, -1050], HILL_H = 96, HILL_R = 235;
const KNOLL = [-340, -700], KNOLL_H = 40, KNOLL_R = 120;
const PAD = [26, -1050];
const CLOUD_LO = 520, CLOUD_HI = 1380;       // the dust cloud's underside and its top, metres
const TOP_Y = 1730;
// the ship's timetable, in shares of the flight
const U_L = 0.10, U_J = 0.30, U_E = 0.87, UA = 0.36, UT = 0.92, Q1 = 0.14;
// the lamps' map: its rectangle on the ground and its grain
const LX0 = -700, LZ0 = -1400, LW = 1400, LD = 1700, TEX = 2, LNX = LW / TEX, LNZ = LD / TEX;

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- small geometry helpers ----------
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const M = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(_e.set(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
// a unit box stretched from a to b (a beam)
function beam(a, b, th) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  return new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_up, d.normalize()), new THREE.Vector3(th, len, th));
}
// parts: [geometry, colour, matrix]: one non-indexed geometry with vertex colours
function mergeGeo(parts) {
  let n = 0;
  const list = parts.map(([g, c, m]) => { const k = g.index ? g.toNonIndexed() : g.clone(); if (m) k.applyMatrix4(m); if (!k.attributes.normal) k.computeVertexNormals(); n += k.attributes.position.count; return [k, new THREE.Color(c)]; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const [k, c] of list) {
    const cnt = k.attributes.position.count;
    pos.set(k.attributes.position.array.subarray(0, cnt * 3), o * 3); nor.set(k.attributes.normal.array.subarray(0, cnt * 3), o * 3);
    for (let i = 0; i < cnt; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += cnt; k.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
// a gable roof: 1 wide (x), 1 high, 1 long (z, the ridge)
function prismGeo() {
  const A = [-.5, 0, -.5], B = [.5, 0, -.5], C = [0, 1, -.5], D = [-.5, 0, .5], E = [.5, 0, .5], F = [0, 1, .5];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([].concat(D, E, F, B, A, C, A, D, F, A, F, C, E, B, C, E, C, F), 3));
  g.computeVertexNormals(); return g;
}
// a strip laid along a line of [x, z] points
function ribbonGeo(pts, half, yAt, lift = 0.15) {
  const n = pts.length, pos = new Float32Array(n * 6), nor = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const h = typeof half === 'function' ? half(i / (n - 1)) : half;
    for (let s = 0; s < 2; s++) {
      const x = pts[i][0] + (s ? 1 : -1) * -tz * h, z = pts[i][1] + (s ? 1 : -1) * tx * h, o = (i * 2 + s) * 3;
      pos[o] = x; pos[o + 1] = yAt(x, z) + lift; pos[o + 2] = z; nor[o + 1] = 1;
      uv[(i * 2 + s) * 2] = (x - LX0) / LW; uv[(i * 2 + s) * 2 + 1] = (z - LZ0) / LD;
    }
    if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  for (const name of ['uv', 'uv1', 'uv2']) g.setAttribute(name, new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); return g;
}
function softTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [t, col] of stops) gr.addColorStop(t, col);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// one billow of dust: alpha is how much dust, red is how its lumps catch light from above
function puffTexture(rng) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  for (let i = 0; i < 40; i++) {
    const a = rng() * 6.283, d = Math.sqrt(rng()) * S * 0.27, x = S / 2 + Math.cos(a) * d * 1.15, y = S / 2 + Math.sin(a) * d * 0.8, r = S * (0.09 + rng() * 0.15);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(120,120,120,0.34)'); gr.addColorStop(0.6, 'rgba(120,120,120,0.16)'); gr.addColorStop(1, 'rgba(120,120,120,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
  }
  g.globalCompositeOperation = 'source-atop';
  const lg = g.createLinearGradient(0, S * 0.2, 0, S * 0.8);
  lg.addColorStop(0, 'rgba(255,255,255,0.75)'); lg.addColorStop(0.55, 'rgba(110,110,110,0.2)'); lg.addColorStop(1, 'rgba(0,0,0,0.8)');
  g.fillStyle = lg; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 22; i++) {      // the lumps
    const x = S * (0.2 + rng() * 0.6), y = S * (0.22 + rng() * 0.5), r = S * (0.04 + rng() * 0.08);
    const gr = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    const g2 = g.createRadialGradient(x, y + r * 0.9, 0, x, y + r * 0.9, r * 0.9);
    g2.addColorStop(0, 'rgba(0,0,0,0.3)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = g2; g.fillRect(x - r, y, r * 2, r * 2);
  }
  return new THREE.CanvasTexture(c);
}

// ---------- shaders ----------
const GLOW_VERT = /* glsl */`
attribute vec3 aCol; attribute float aSize; attribute float aPh;
uniform float uTime, uPx, uMax, uMin, fogDensity, uGain;
varying vec3 vC; varying float vS;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = max(0.5, -mv.z);
  float raw = aSize * uPx / d, sz = min(max(raw, uMin), uMax);
  gl_PointSize = sz; vS = smoothstep(2.5, 7.0, sz);
  float dim = uMin > 0.5 ? clamp(raw / uMin, 0.45, 1.0) : clamp(raw / 1.3, 0.0, 1.0);      // a far lamp stays a dot; a far mote goes out
  float fl = 1.0 + 0.09 * sin(uTime * (5.0 + aPh * 7.0) + aPh * 40.0) * sin(uTime * 2.3 + aPh * 11.0);
  vC = aCol * fl * uGain * dim * exp(-fogDensity * fogDensity * d * d);
  gl_Position = projectionMatrix * mv;
}`;
const GLOW_FRAG = /* glsl */`
varying vec3 vC; varying float vS;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = (exp(-r * r * 11.0) * 1.7 + exp(-r * r * 2.6) * 0.22) * smoothstep(1.0, 0.75, r);
  gl_FragColor = vec4(vC * mix(0.8, a, vS), 1.0);
}`;
const STAR_VERT = /* glsl */`
attribute vec3 aCol; attribute float aSize;
uniform float uPx, uShow;
varying vec3 vC; varying float vBig, vS;
void main() {
  float s = aSize * uPx;
  gl_PointSize = max(1.6, s); vS = smoothstep(2.0, 5.0, s);
  vC = aCol * uShow * min(1.0, s * s / 2.56 + 0.3); vBig = step(7.0, s);
  gl_Position = projectionMatrix * viewMatrix * vec4(cameraPosition + position, 1.0);
}`;
const STAR_FRAG = /* glsl */`
varying vec3 vC; varying float vBig, vS;
void main() {
  vec2 p = (gl_PointCoord - 0.5) * 2.0; float r = length(p);
  float a = mix(0.85, exp(-r * r * 5.0) * 1.5 * smoothstep(1.0, 0.6, r), vS);
  float sp = (exp(-abs(p.x) * 26.0) + exp(-abs(p.y) * 26.0)) * exp(-r * 3.2) * 0.9;      // the bright ones wear a cross
  a = mix(a, exp(-r * r * 60.0) * 2.4 + exp(-r * r * 9.0) * 0.35 + sp, vBig);
  gl_FragColor = vec4(vC * a, 1.0);
}`;
const GLSL_N3 = /* glsl */`
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
`;
const DOME_VERT = /* glsl */`
varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * viewMatrix * vec4(cameraPosition + position, 1.0); }`;
const DOME_FRAG = /* glsl */`
varying vec3 vDir;
uniform float uShow; uniform vec3 uPole, uBu, uBv, uG0, uGx, uGy, uC0;
${GLSL_N3}
void main() {
  vec3 d = normalize(vDir);
  float lat = dot(d, uPole), cx = dot(d, uBu), cy = dot(d, uBv), lon = atan(cy, cx);
  float centre = 0.5 + 0.5 * cx;
  float width = mix(0.085, 0.21, centre * centre);
  float n1 = fbm(d * 3.5 + 2.0), n2 = fbm(d * 9.0 + 7.0), n3 = fbm(d * 26.0);
  float band = exp(-pow(lat / width, 2.0)) * (0.3 + 1.0 * n1) * mix(0.3, 1.3, pow(centre, 1.5));
  float bulge = exp(-(lat * lat * 16.0 + (1.0 - cx) * (1.0 - cx) * 6.0)) * 1.25;
  // the dust lanes: a dark river down the middle of the band, forked and torn
  float lw = lat + 0.035 * sin(lon * 3.0 + 1.0) + 0.05 * (n1 - 0.5);
  float lane = smoothstep(0.40, 0.60, fbm(d * 6.5 + vec3(4.0, 1.0, 8.0) + 0.4 * n2)) * exp(-pow(lw / (width * 0.5), 2.0));
  float lane2 = smoothstep(0.5, 0.72, n2) * exp(-pow(lat / (width * 0.95), 2.0)) * 0.55;
  float dark = clamp(1.0 - 0.93 * lane - lane2, 0.04, 1.0);
  vec3 cool = vec3(0.52, 0.66, 1.0), warm = vec3(1.0, 0.80, 0.56);
  vec3 col = mix(cool, warm, clamp(centre * centre * 1.1 + bulge * 0.5, 0.0, 1.0)) * (band * 0.17 + bulge * 0.22) * dark;
  col += vec3(1.0, 0.85, 0.7) * band * pow(n3, 3.0) * dark * 0.45;      // the grain of stars too many to draw
  // nebulae: red knots where the lanes fray, teal veils beside the band, a violet haze at high latitude
  float k1 = pow(smoothstep(0.55, 0.85, fbm(d * 5.0 + vec3(11.0, 3.0, 5.0))), 2.0) * exp(-pow(lat / (width * 1.3), 2.0));
  col += vec3(1.0, 0.20, 0.34) * k1 * 0.42 * (0.5 + n2);
  float k2 = pow(smoothstep(0.58, 0.88, fbm(d * 4.0 + vec3(2.0, 17.0, 9.0))), 2.0) * exp(-pow(lat / (width * 2.4), 2.0));
  col += vec3(0.12, 0.50, 0.72) * k2 * 0.26;
  float k3 = pow(smoothstep(0.60, 0.9, fbm(d * 2.6 + vec3(21.0, 7.0, 1.0))), 2.0);
  col += vec3(0.30, 0.18, 0.58) * k3 * 0.09;
  // the spiral neighbour
  float gz = dot(d, uG0);
  if (gz > 0.45) {
    vec2 p = vec2(dot(d, uGx), dot(d, uGy)) / gz; p.y /= 0.44;
    float r = length(p) / 0.27, th = atan(p.y, p.x);
    float arms = 0.5 + 0.5 * cos(2.0 * (th - 2.7 * log(r + 0.04)));
    float gn = fbm(vec3(p * 15.0, 3.0));
    float disc = exp(-r * 3.3) * (0.22 + 1.25 * pow(arms, 2.5) * smoothstep(0.05, 0.35, r)) * (0.55 + 0.9 * gn);
    float core = exp(-r * r * 75.0) * 1.7 + exp(-r * 9.0) * 0.55;
    float knots = pow(arms, 6.0) * smoothstep(0.5, 0.8, gn) * exp(-r * 2.4);
    float dl = 1.0 - 0.65 * pow(1.0 - arms, 3.0) * smoothstep(0.1, 0.5, r);
    col += (vec3(0.58, 0.72, 1.0) * disc * dl + vec3(1.0, 0.86, 0.62) * core + vec3(1.0, 0.28, 0.44) * knots) * 0.8 * smoothstep(1.7, 0.9, r);
  }
  // its ragged little companion
  float cz = dot(d, uC0);
  if (cz > 0.9) { float a = acos(min(1.0, cz)); col += vec3(0.6, 0.75, 1.0) * exp(-a * a * 190.0) * (0.25 + 0.9 * fbm(d * 40.0)) * 0.55; }
  gl_FragColor = vec4(col * uShow, 1.0);
}`;
const PUFF_VERT = /* glsl */`
attribute vec3 iPos; attribute vec2 iSize; attribute float iSeed; attribute vec2 iTrail; attribute float iKind;
uniform vec3 uShip; uniform float uFlame, uShipQ, uScale, uLitR;
varying vec2 vUv; varying float vDepth, vLit, vKind, vSeed;
void main() {
  vUv = uv; vKind = iKind; vSeed = iSeed;
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  float a = iSeed * 6.283, c = cos(a), s = sin(a);
  vec2 p = position.xy * iSize * uScale;
  p = mix(vec2(c * p.x - s * p.y, s * p.x + c * p.y), p, step(0.5, iKind));      // the billows of the top stay upright
  mv.xy += p;
  vDepth = -mv.z;
  float ds = distance(iPos, uShip);
  float after = step(iTrail.x, uShipQ) * exp(-(uShipQ - iTrail.x) * 5.0) / (1.0 + iTrail.y * iTrail.y / (110.0 * 110.0));
  vLit = uFlame * 1.25 / (1.0 + ds * ds / (uLitR * uLitR)) + 0.5 * after;
  gl_Position = projectionMatrix * mv;
}`;
const PUFF_FRAG = /* glsl */`
uniform sampler2D uTex; uniform vec3 fogColor; uniform float fogDensity, uOpacity, uStar, uAbove, uNear, uInside, uWarm;
varying vec2 vUv; varying float vDepth, vLit, vKind, vSeed;
void main() {
  vec2 uv = vUv; if (vSeed > 0.5) uv.x = 1.0 - uv.x;
  vec4 t = texture2D(uTex, uv);
  float a = t.a * uOpacity * smoothstep(uNear * 0.2, uNear, vDepth) * clamp(vLit * 6.0 + uInside, 0.0, 1.0);
  if (a < 0.004) discard;
  vec3 dust = mix(vec3(0.020, 0.017, 0.024), vec3(0.060, 0.052, 0.066), t.r);
  vec3 warm = vec3(1.0, 0.50, 0.19) * vLit * uWarm * (0.2 + 0.8 * t.r);
  vec3 star = vec3(0.060, 0.080, 0.135) * vKind * uStar * (0.06 + 0.94 * t.r * t.r);
  vec3 col = dust * (1.0 - vKind * 0.5) + warm + star;
  float f = 1.0 - exp(-fogDensity * fogDensity * vDepth * vDepth);
  col = mix(col, fogColor, f * (1.0 - vKind * uAbove));
  // from above, far billows sink into the haze of the cloud's horizon
  col = mix(col, vec3(0.012, 0.016, 0.03) * uStar, vKind * uAbove * (1.0 - exp(-vDepth * 0.00016)));
  gl_FragColor = vec4(col, a);
}`;
const TRAIL_VERT = /* glsl */`
attribute vec3 aTan; attribute float aSide; attribute float aQ;
uniform float uShipQ, fogDensity;
varying float vSide, vAge, vFog, vQ;
void main() {
  vec3 wp = position;
  vec3 side = normalize(cross(aTan, normalize(cameraPosition - wp)));
  float age = max(0.0, uShipQ - aQ);
  float w = (1.1 + 24.0 * pow(age, 0.8)) * (0.8 + 0.3 * sin(aQ * 310.0) * sin(aQ * 97.0 + 1.0));
  wp += side * aSide * w;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vSide = aSide; vAge = age; vQ = aQ; vFog = exp(-fogDensity * fogDensity * mv.z * mv.z * 0.35);
  gl_Position = projectionMatrix * mv;
}`;
const TRAIL_FRAG = /* glsl */`
uniform float uShipQ, uFlame;
varying float vSide, vAge, vFog, vQ;
void main() {
  if (vQ > uShipQ) discard;
  float x = abs(vSide), w = 1.1 + 24.0 * pow(vAge, 0.8);
  float core = exp(-x * x * w * w * 0.5);                 // a hot thread about a metre wide whatever the smoke has spread to
  float hot = exp(-vAge * 26.0);
  vec3 col = vec3(1.0, 0.93, 0.80) * core * (0.55 + 3.2 * hot * uFlame);
  col += vec3(1.0, 0.50, 0.16) * exp(-x * x * 5.0) * exp(-vAge * 9.0) * 0.3 * uFlame;
  col += vec3(0.30, 0.25, 0.24) * exp(-x * x * 3.0) * (1.0 - x) * 0.045 * smoothstep(0.0, 0.02, vAge);      // the smoke it leaves, lit by its own thread
  gl_FragColor = vec4(col * vFog, 1.0);
}`;
const WATER_VERT = /* glsl */`
varying vec3 vW; varying float vDepth;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`;
const WATER_FRAG = /* glsl */`
uniform sampler2D uLamps; uniform vec4 uRect; uniform float uTime, uFlame, fogDensity; uniform vec3 fogColor, uShip;
varying vec3 vW; varying float vDepth;
${GLSL_N3}
void main() {
  vec2 p = vW.xz;
  float r1 = vnoise(vec3(p.x * 0.55 + uTime * 0.5, p.y * 1.4, uTime * 0.35)), r2 = vnoise(vec3(p.x * 1.7 - uTime * 0.9, p.y * 3.1, uTime * 0.6));
  float rip = r1 * 0.65 + r2 * 0.35;
  vec2 uv = (p - uRect.xy) / uRect.zw;
  vec3 L = vec3(0.0);
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
    vec2 off = vec2(rip - 0.5, r2 - 0.5) * 0.012;
    L = texture2D(uLamps, uv + off).rgb * 0.7 + texture2D(uLamps, uv + off * 3.0 + vec2(0.0, 0.004)).rgb * 0.5;
  }
  vec3 col = vec3(0.006, 0.012, 0.022) + vec3(0.012, 0.02, 0.032) * rip;
  col += L * (0.10 + 1.5 * pow(rip, 3.0));                  // lamplight lying broken on the water
  vec3 toShip = uShip - vW; float ds = length(toShip);
  col += vec3(1.0, 0.6, 0.28) * uFlame * pow(rip, 4.0) * 26000.0 / (ds * ds + 20000.0) * 0.5;
  float f = 1.0 - exp(-fogDensity * fogDensity * vDepth * vDepth);
  gl_FragColor = vec4(mix(col, fogColor, f), 1.0);
}`;
const DECK_VERT = /* glsl */`
varying vec3 vW; varying float vDepth;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
const DECK_FRAG = /* glsl */`
uniform float uStar; uniform vec2 uLdir; varying vec3 vW; varying float vDepth;
${GLSL_N3}
float H(vec2 p) { return fbm(vec3(p * 0.0009, 1.0)) * 0.60 + fbm(vec3(p * 0.0037 + 9.0, 4.0)) * 0.30 + vnoise(vec3(p * 0.015, 2.0)) * 0.10; }
void main() {
  vec2 p = vW.xz; float h = H(p), h2 = H(p + uLdir * 150.0);
  float sh = clamp(0.5 + (h2 - h) * -7.0, 0.0, 1.0), crest = smoothstep(0.34, 0.72, h);      // the slopes that face the galaxy's heart take its light
  vec3 col = mix(vec3(0.003, 0.004, 0.008), vec3(0.036, 0.048, 0.082), crest * 0.45 + sh * 0.6 * (0.3 + crest)) * uStar;
  col += vec3(0.030, 0.022, 0.012) * sh * crest * uStar;
  col = mix(col, vec3(0.010, 0.014, 0.027) * uStar, 1.0 - exp(-vDepth * 0.00014));
  gl_FragColor = vec4(col, 1.0);
}`;

export default {
  id: 'the-sky-over-krikkit',
  name: 'The Sky over Krikkit',
  category: 'books',
  placeKind: 'sky',
  book: 'Life, the Universe and Everything',
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.6,
  async build(ctx) {
    const rng = ctx.rng, D = Math.min(1.25, Math.max(0.5, ctx.quality?.detail ?? 1));
    const R = {}; for (const k of ['land', 'houses', 'trees', 'people', 'site', 'cloud', 'stars', 'misc', 'far']) R[k] = rng.fork(k);
    const noise = makeNoise(Math.floor(rng() * 1e9));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');
    const fogLow = new THREE.Color(0.006, 0.010, 0.018), fogDust = new THREE.Color(0.030, 0.026, 0.036), fogWarm = new THREE.Color(0.115, 0.055, 0.022);
    scene.fog = new THREE.FogExp2(fogLow.clone(), 0.00055);
    const trash = []; const keep = (o) => { trash.push(o); return o; };
    const FOGU = () => THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
    const SKY_BU = new THREE.Vector3(-0.24, 0.40, -0.88).normalize();      // toward the galaxy's heart: ahead of us, a hand above the cloud
    const uTime = { value: 0 }, uPx = { value: 450 }, uShip = { value: new THREE.Vector3() }, uFlame = { value: 0 }, uShipQ = { value: 0 }, uStar = { value: 0 }, uAbove = { value: 0 };

    // =====================================================================================================
    // THE LAND'S SHAPE
    // =====================================================================================================
    const riverZ = (x) => -165 + 52 * Math.sin(x * 0.0052 + 0.6) + 26 * Math.sin(x * 0.0131 + 2.1) + 0.09 * x;
    const riverDz = (x) => 52 * 0.0052 * Math.cos(x * 0.0052 + 0.6) + 26 * 0.0131 * Math.cos(x * 0.0131 + 2.1) + 0.09;
    const riverDist = (x, z) => Math.abs(z - riverZ(x)) / Math.sqrt(1 + riverDz(x) ** 2);
    const waterY = (x) => 2.5 - 0.0035 * x;
    const rawHeight = (x, z) => {
      const dv = Math.hypot(x - VC[0], z - VC[1]);
      let h = 9 + noise.fbm2(x * 0.0015, z * 0.0015, 4) * 17 * (0.4 + 0.6 * ss(180, 800, dv)) + noise.fbm2(x * 0.009 + 7, z * 0.009 - 3, 3) * 1.6;
      const dh = Math.hypot(x - HILL[0], z - HILL[1]);
      h += HILL_H * Math.exp(-Math.pow(Math.max(0, dh - 34) / HILL_R, 2)) * (1 + 0.09 * noise.n2(x * 0.004 + 2, z * 0.004) * ss(40, 160, dh));
      if (dh < 520) h += (3.2 * noise.fbm2(x * 0.017 + 4, z * 0.017, 3) + 1.3 * Math.sin(h * 0.42)) * ss(44, 130, dh) * (1 - ss(300, 520, dh));      // gullies, and the old plough terraces round it
      const dk = Math.hypot(x - KNOLL[0], z - KNOLL[1]); h += KNOLL_H * Math.exp(-(dk * dk) / (KNOLL_R * KNOLL_R));
      const r = Math.hypot(x, z + 500);
      if (r > 1400) h += ss(1400, 3600, r) * (120 + 130 * noise.ridged2(x * 0.0006 + 4, z * 0.0006 + 1, 4));
      const d = riverDist(x, z), t = Math.exp(-(d * d) / (30 * 30));
      return h + (waterY(x) - 2.4 - h) * t;
    };
    const GREEN_Y = rawHeight(GREEN[0], GREEN[1]);
    const height = (x, z) => {
      const h = rawHeight(x, z), dg = Math.hypot(x - GREEN[0], z - GREEN[1]);
      return dg > GREEN_R * 1.6 ? h : h + (GREEN_Y - h) * (1 - ss(GREEN_R * 0.85, GREEN_R * 1.6, dg));
    };
    const PAD_Y = height(PAD[0], PAD[1]);

    // ---- the road of the flight ----
    const gy = (x, z, up) => height(x, z) + up;
    const PTS = [[-40, gy(-40, 140, 34), 140], [-30, gy(-30, 0, 32), 0], [-14, gy(-14, -165, 30) + 7, -165], [34, gy(34, -330, 32), -330], [12, gy(12, -500, 34), -500],
      [-10, gy(-10, -680, 36), -680], [0, gy(0, -860, 40), -860], [0, PAD_Y + 56, -1010], [0, 330, -1160], [0, 640, -1330], [0, 1000, -1520], [0, 1340, -1720],
      [0, 1590, -1930], [0, 1700, -2160], [0, TOP_Y, -2400], [0, TOP_Y, -2640]];
    const path = makePath(PTS), LEN = path.length;
    const clearOfRoad = (x, z, top) => { const n = path.nearestXZ(x, z); return n.dist > 20 || n.y - top > 11; };

    // ---- the ship's road: straight up off the pad, then over onto a line beside ours ----
    const TRAIL_OFF = new THREE.Vector3(20, -3, 0);
    const padTop = new THREE.Vector3(PAD[0], PAD_Y + 1.2, PAD[1]);
    const J = path.pointAt(UA).add(TRAIL_OFF), JT = path.tangentAt(UA);
    const B1 = padTop.clone().add(new THREE.Vector3(0, 95, 0)), B2 = J.clone().addScaledVector(JT, -85);
    function trailPoint(q, out) {
      if (q < Q1) {
        const t = q / Q1, a = (1 - t) ** 3, b = 3 * (1 - t) * (1 - t) * t, c = 3 * (1 - t) * t * t, d = t ** 3;
        return out.set(a * padTop.x + b * B1.x + c * B2.x + d * J.x, a * padTop.y + b * B1.y + c * B2.y + d * J.y, a * padTop.z + b * B1.z + c * B2.z + d * J.z);
      }
      return path.pointAt(UA + (UT - UA) * (q - Q1) / (1 - Q1), out).add(TRAIL_OFF);
    }
    const shipQ = (u) => {
      if (!(u > U_L)) return 0;
      if (u < U_J) { const t = (u - U_L) / (U_J - U_L); return Q1 * Math.pow(t, 1.8); }
      if (u < U_E) return Q1 + (1 - Q1) * (u - U_J) / (U_E - U_J);
      return 1;
    };
    await ctx.yield();

    // =====================================================================================================
    // THE LAMPS' MAP (every light that falls on the ground is stamped here; the land and the water read it)
    // =====================================================================================================
    const LMAP = new Float32Array(LNX * LNZ * 3);
    function stamp(x, z, r, c, k = 1) {
      const cx = (x - LX0) / TEX, cz = (z - LZ0) / TEX, rr = r / TEX, Rr = Math.ceil(rr * 2.3);
      const i0 = Math.max(0, Math.floor(cx - Rr)), i1 = Math.min(LNX - 1, Math.ceil(cx + Rr)), j0 = Math.max(0, Math.floor(cz - Rr)), j1 = Math.min(LNZ - 1, Math.ceil(cz + Rr));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const d2 = ((i + 0.5 - cx) ** 2 + (j + 0.5 - cz) ** 2) / (rr * rr); if (d2 > 5.3) continue;
        const w = k * Math.exp(-d2 * 1.15), o = (j * LNX + i) * 3; LMAP[o] += c[0] * w; LMAP[o + 1] += c[1] * w; LMAP[o + 2] += c[2] * w;
      }
    }
    const lampAt = (x, z) => {
      const i = Math.floor((x - LX0) / TEX), j = Math.floor((z - LZ0) / TEX);
      if (i < 0 || j < 0 || i >= LNX || j >= LNZ) return 0;
      const o = (j * LNX + i) * 3; return (LMAP[o] + LMAP[o + 1] + LMAP[o + 2]) / 3;
    };
    const WARM = [1.0, 0.62, 0.26], AMBER = [1.0, 0.5, 0.16], CANDLE = [1.0, 0.72, 0.38];
    // every small light in the world is a point in one of these lists: x, y, z, r, g, b, size (m), phase
    const glowList = [];
    const glow = (x, y, z, c, size, gain = 1) => glowList.push(x, y, z, c[0] * gain, c[1] * gain, c[2] * gain, size, R.misc());
    // a lamp: its point of light and its pool on the ground
    const lamp = (x, y, z, c = WARM, size = 2.4, pool = 10, k = 1) => { glow(x, y, z, c, size, 2.2 * k); stamp(x, z, pool, c, 0.9 * k); };

    // =====================================================================================================
    // LANES
    // =====================================================================================================
    const laneX = (z) => 22 * Math.sin(z * 0.0075 + 0.4) - 6;
    const lanes = {};
    lanes.main = []; for (let z = 300; z >= -820; z -= 8) lanes.main.push([laneX(z), z]);
    lanes.hill = []; { const x0 = laneX(-820); for (let i = 0; i <= 48; i++) { const t = i / 48; lanes.hill.push([lerp(x0, 4, t) + 62 * Math.sin(t * Math.PI * 2) * (1 - t * 0.85), -820 - 196 * t]); } }
    lanes.south = []; for (let x = -430; x <= 450; x += 8) lanes.south.push([x, riverZ(x) + 31]);
    lanes.north = []; for (let x = -270; x <= 180; x += 8) lanes.north.push([x, riverZ(x) - 31]);
    lanes.east = []; for (let x = laneX(-300); x <= 450; x += 8) lanes.east.push([x, -300 - 0.06 * x + 14 * Math.sin(x * 0.012)]);
    lanes.ring = []; for (let i = 0; i <= 44; i++) { const a = i / 44 * 6.2832; lanes.ring.push([GREEN[0] + Math.cos(a) * (GREEN_R + 12), GREEN[1] + Math.sin(a) * (GREEN_R + 12)]); }
    lanes.link = []; for (let i = 0; i <= 8; i++) lanes.link.push([lerp(laneX(-395), GREEN[0] - GREEN_R - 12, i / 8), -395]);
    lanes.west = []; { const x0 = laneX(-470); for (let i = 0; i <= 44; i++) { const t = i / 44; lanes.west.push([lerp(x0, KNOLL[0] + 26, t), lerp(-470, KNOLL[1] + 34, t) + 46 * Math.sin(t * Math.PI)]); } }
    lanes.ne = []; for (let i = 0; i <= 36; i++) { const t = i / 36; lanes.ne.push([lerp(GREEN[0] + 20, 330, t) + 30 * Math.sin(t * 3.0), lerp(GREEN[1] - GREEN_R - 12, -760, t)]); }
    const laneSamples = []; for (const k in lanes) for (const p of lanes[k]) laneSamples.push(p);
    const laneDist = (x, z) => { let b = 1e9; for (let i = 0; i < laneSamples.length; i++) { const dx = laneSamples[i][0] - x, dz = laneSamples[i][1] - z, d = dx * dx + dz * dz; if (d < b) b = d; } return Math.sqrt(b); };
    // the bridge: where the main lane meets the river
    let BZ = -170; for (let i = 0; i < 12; i++) BZ = riverZ(laneX(BZ));
    const BX = laneX(BZ), BRIDGE_Y = waterY(BX) + 4.6;
    const bridgeTop = (d) => (d <= 30 ? BRIDGE_Y + 1.5 * (1 - (d / 30) ** 2) : BRIDGE_Y - (d - 30) * 0.3);
    const laneY = (x, z) => { const d = Math.hypot(x - BX, z - BZ); return d < 46 ? Math.max(height(x, z), bridgeTop(d)) : height(x, z); };
    // walk a lane: points every `step` metres with the lane's direction
    function walk(poly, step, fn) {
      let carry = 0;
      for (let i = 0; i < poly.length - 1; i++) {
        const a = poly[i], b = poly[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / l, tz = (b[1] - a[1]) / l;
        for (let s = carry; s < l; s += step) fn(a[0] + tx * s, a[1] + tz * s, tx, tz);
        carry = (carry + Math.ceil((l - carry) / step) * step) - l;
      }
    }
    await ctx.yield();

    // =====================================================================================================
    // THE VILLAGE: houses along the lanes
    // =====================================================================================================
    const BOX = keep(new THREE.BoxGeometry(1, 1, 1)), PRISM = keep(prismGeo());
    // four kinds: w, h, d, roof height, wall colour, roof colour, storeys
    const KINDS = [
      { w: 9, h: 3.1, d: 6, rh: 3.3, wall: '#e2ddcf', roof: '#5a4a31', st: 1 },      // thatched cottage
      { w: 14, h: 3.5, d: 6.4, rh: 3.3, wall: '#d6d2c8', roof: '#30333c', st: 1 },   // long farmhouse, slate
      { w: 8.6, h: 6.0, d: 7, rh: 3.6, wall: '#e6e1d6', roof: '#6a3527', st: 2 },    // two storeys, red tile
      { w: 15, h: 5.2, d: 9, rh: 4.6, wall: '#4a3d30', roof: '#2e2a26', st: 0 },     // timber barn
    ];
    const houseGeo = KINDS.map((k, i) => {
      const parts = [[BOX, k.wall, M(0, k.h / 2 - 0.4, 0, k.w, k.h + 0.8, k.d)],
        [PRISM, k.roof, M(0, k.h, 0, k.d * 1.14, k.rh, k.w * 1.07, Math.PI / 2)],
        [BOX, '#6f6a63', M(0, k.h - 0.05, 0, k.w * 1.08, 0.18, k.d * 1.16)]];      // the eaves' shadow line
      if (i !== 3) {
        parts.push([BOX, '#77706a', M(k.w * 0.34, k.h + k.rh * 0.8, 0, 1.0, k.rh * 0.9 + 1.4, 1.0)], [BOX, '#3a3530', M(k.w * 0.34, k.h + k.rh * 1.25 + 0.75, 0, 1.2, 0.2, 1.2)]);
        parts.push([BOX, '#3b2a1e', M(i === 1 ? -k.w * 0.1 : 0, 1.0, k.d / 2 + 0.04, 1.1, 2.1, 0.1)], [BOX, '#8a857c', M(i === 1 ? -k.w * 0.1 : 0, 0.1, k.d / 2 + 0.5, 1.8, 0.2, 0.9)]);
        if (i === 1) parts.push([BOX, k.wall, M(-k.w * 0.5 - 1.6, 1.3, -0.6, 3.2, 2.6, 4.2)], [PRISM, k.roof, M(-k.w * 0.5 - 1.6, 2.6, -0.6, 4.6, 1.6, 3.5, Math.PI / 2)]);      // a lean-to dairy
        if (i === 2) parts.push([BOX, '#77706a', M(-k.w * 0.34, k.h + k.rh * 0.8, 0, 0.9, k.rh * 0.9 + 1.2, 0.9)]);
      } else parts.push([BOX, '#2a2019', M(0, 1.9, k.d / 2 + 0.05, 4.2, 3.8, 0.12)], [BOX, '#2a2019', M(0, k.h + 0.9, k.d / 2 + 0.05, 1.2, 1.2, 0.1)]);
      return keep(mergeGeo(parts));
    });
    const HALL = [GREEN[0] - GREEN_R - 42, GREEN[1] + 44], MILL = [-196, riverZ(-196) - 21];
    const blocks = [{ x: HALL[0], z: HALL[1], r: 15 }, { x: MILL[0], z: MILL[1], r: 13 }];      // ground kept for the hall and the mill
    const houses = [], winM = [], winC = [], RH = R.houses;
    const _m = new THREE.Matrix4(), _c = new THREE.Color();
    const WINCOL = [[2.6, 1.6, 0.62], [2.8, 1.35, 0.42], [2.3, 1.75, 0.9], [2.9, 1.9, 0.7], [1.5, 1.7, 2.0]];
    function addHouse(x, z, ry, kind, sc = 1, far = false) {
      const k = KINDS[kind], y = height(x, z), cs = Math.cos(ry), sn = Math.sin(ry);
      const W = (lx, ly, lz) => [x + (lx * cs + lz * sn) * sc, y + ly * sc, z + (-lx * sn + lz * cs) * sc];
      const h = { x, z, y, ry, kind, sc, r: 0.62 * Math.max(k.w, k.d) * sc, W, k, lit: kind !== 3 && RH() < 0.9 };
      houses.push(h);
      // windows: the front and back in pairs, one in each gable; an upper row on two storeys
      const rows = k.st === 2 ? [0.3, 0.76] : [0.56];
      const wc = WINCOL[RH() < 0.08 ? 4 : Math.floor(RH() * 4)];
      const win = (lx, ly, lz, turn, on) => {
        if (!on) return;
        const p = W(lx, ly, lz); _q.setFromAxisAngle(_up, ry + turn);
        winM.push(new THREE.Matrix4().compose(_p.set(p[0], p[1], p[2]), _q, _s.set(1.0 * sc, 1.15 * sc, 0.1)));
        const g = 0.55 + RH() * 0.75; winC.push(wc[0] * g, wc[1] * g, wc[2] * g);
      };
      if (h.lit) {
        for (const ry_ of rows) {
          const yy = k.h * ry_ + (k.st === 2 ? 0.2 : 0);
          for (const sx of [-0.3, 0.3]) { win(k.w * sx, yy, k.d / 2 + 0.06, 0, RH() < 0.85); win(k.w * sx, yy, -k.d / 2 - 0.06, 0, RH() < 0.6); }
          if (kind === 1) win(k.w * 0.08, yy, k.d / 2 + 0.06, 0, true);
          win(k.w / 2 + 0.06, yy, 0, Math.PI / 2, RH() < 0.5); win(-k.w / 2 - 0.06, yy, 0, Math.PI / 2, RH() < 0.4 && kind !== 1);
        }
        const c = [wc[0] / 2.6, wc[1] / 2.6, wc[2] / 2.6];
        if (!far) {
          const f = W(0, 0, k.d / 2 + 3.6), b = W(0, 0, -k.d / 2 - 3.2);
          stamp(f[0], f[2], 7.5, c, 0.85); stamp(b[0], b[2], 6, c, 0.4);
          const dl = W(kind === 1 ? -k.w * 0.1 + 1.3 : 1.3, 2.3, k.d / 2 + 0.4);      // the lantern by the door
          lamp(dl[0], dl[1], dl[2], AMBER, 1.5, 5.5, 0.8);
        } else { const f = W(0, 2.0, k.d / 2 + 0.6); glow(f[0], f[1], f[2], WARM, 2.6, 1.6); }
      }
      return h;
    }
    const houseOK = (x, z, r, top) => {
      if (riverDist(x, z) < 27 + r * 0.4) return false;
      if (Math.hypot(x - HILL[0], z - HILL[1]) < 215 || Math.hypot(x - KNOLL[0], z - KNOLL[1]) < 44) return false;
      if (Math.hypot(x - GREEN[0], z - GREEN[1]) < GREEN_R + 15 + r * 0.3) return false;
      for (const b of blocks) if (Math.hypot(b.x - x, b.z - z) < b.r + r) return false;
      if (!clearOfRoad(x, z, height(x, z) + top)) return false;
      for (const h of houses) if (Math.hypot(h.x - x, h.z - z) < h.r + r + 2.5) return false;
      return true;
    };
    function settle(poly, step, sides, share, kinds) {
      walk(poly, step, (x, z, tx, tz) => {
        for (const s of sides) {
          if (RH() > share) continue;
          const kind = kinds[Math.floor(RH() * kinds.length)], k = KINDS[kind], sc = 0.9 + RH() * 0.22;
          const off = k.d * sc / 2 + 5 + RH() * 5, jx = (RH() - 0.5) * 6;
          const hx = x - tz * s * off + tx * jx, hz = z + tx * s * off + tz * jx;
          if (!houseOK(hx, hz, 0.62 * Math.max(k.w, k.d) * sc, k.h + k.rh + 2)) continue;
          if (laneDist(hx, hz) < k.d * sc / 2 + 3.2) continue;
          addHouse(hx, hz, Math.atan2(tz * s, -tx * s) + (RH() - 0.5) * 0.12, kind, sc);
        }
      });
    }
    settle(lanes.main.filter((p) => p[1] > -770), 19, [1, -1], 0.86, [0, 0, 1, 2, 0, 2]);
    settle(lanes.ring, 19, [-1], 0.95, [2, 2, 0, 1]);      // outward of the ring: the houses face the green
    settle(lanes.south, 21, [1, -1], 0.7, [0, 1, 0, 3]);
    settle(lanes.north, 22, [-1], 0.7, [0, 1, 2]);
    settle(lanes.east, 22, [1, -1], 0.75, [0, 1, 2, 0, 3]);
    settle(lanes.ne, 24, [1, -1], 0.6, [0, 1, 3]);
    settle(lanes.west.slice(0, 34), 24, [1, -1], 0.6, [0, 1, 3, 0]);
    settle(lanes.link, 20, [1, -1], 0.8, [0, 2]);
    const nVillage = houses.length;
    await ctx.yield();
    // farms and hamlets out in the dark country: each a window or two, seen from far off
    {
      const RF = R.far, hamlets = [];
      for (let i = 0; i < 16; i++) { const a = RF() * 6.283, r = 800 + RF() * 2100; hamlets.push([Math.cos(a) * r, -500 + Math.sin(a) * r, 4 + Math.floor(RF() * 9)]); }
      for (let i = 0; i < 90; i++) { const a = RF() * 6.283, r = 620 + RF() * 2500; hamlets.push([Math.cos(a) * r, -500 + Math.sin(a) * r, 1]); }
      for (const [hx, hz, n] of hamlets) for (let i = 0; i < n; i++) {
        const x = hx + (n > 1 ? RF.gauss() * 46 : 0), z = hz + (n > 1 ? RF.gauss() * 46 : 0);
        if (x > LX0 + 40 && x < LX0 + LW - 40 && z > LZ0 + 40 && z < LZ0 + LD - 40 && Math.hypot(x - VC[0], z - VC[1]) < 620) continue;
        if (riverDist(x, z) < 34 || Math.hypot(x - HILL[0], z - HILL[1]) < 330) continue;
        if (houses.some((h, j) => j >= nVillage && Math.hypot(h.x - x, h.z - z) < 20)) continue;
        addHouse(x, z, RF() * 6.283, RF() < 0.75 ? Math.floor(RF() * 2) : 3, 1, true);
      }
    }
    await ctx.yield();

    // ---- gardens behind the village houses: a fence, rows of vegetables, sometimes a shed ----
    const fenceM = [], rowM = [], shedM = [], gardens = [];
    for (let i = 0; i < nVillage; i++) {
      const h = houses[i], k = h.k; if (h.kind === 3 || RH() < 0.12) continue;
      const gw = k.w + 5 + RH() * 4, gd = 10 + RH() * 6, z0 = -k.d / 2 - 0.8, z1 = z0 - gd;
      const c = h.W(0, 0, (z0 + z1) / 2); if (laneDist(c[0], c[2]) < gd / 2 + 2 || riverDist(c[0], c[2]) < 22) continue;
      gardens.push({ h, gw, gd, z0, z1 });
      const edge = (ax, az, bx, bz) => {
        const a = h.W(ax, 0, az), b = h.W(bx, 0, bz), ya = height(a[0], a[2]), yb = height(b[0], b[2]);
        for (const up of [0.45, 0.95]) fenceM.push(beam(new THREE.Vector3(a[0], ya + up, a[2]), new THREE.Vector3(b[0], yb + up, b[2]), 0.09));
        const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2.4));
        for (let j = 0; j <= n; j++) { const x = lerp(a[0], b[0], j / n), z = lerp(a[2], b[2], j / n); fenceM.push(M(x, height(x, z) + 0.55, z, 0.12, 1.15, 0.12)); }
      };
      edge(-gw / 2, z0, -gw / 2, z1); edge(gw / 2, z0, gw / 2, z1); edge(-gw / 2, z1, gw / 2, z1);
      const nr = 3 + Math.floor(RH() * 3);
      for (let r = 0; r < nr; r++) { const lz = lerp(z0 - 2, z1 + 1.5, r / (nr - 1)), p = h.W(-gw * 0.12, 0, lz); rowM.push(M(p[0], height(p[0], p[2]) + 0.2, p[2], gw * 0.62, 0.42, 0.75, h.ry)); }
      if (RH() < 0.4) { const p = h.W(gw / 2 - 2.2, 0, z1 + 2.4); shedM.push(M(p[0], height(p[0], p[2]), p[2], 1, 1, 1, h.ry + Math.PI / 2)); }
    }
    await ctx.yield();

    // =====================================================================================================
    // SET PIECES (each one merged mesh): bridge, pavilion and green, meeting hall, mill, windmill
    // =====================================================================================================
    const setMat = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const addSet = (parts, x, y, z, ry = 0, tint = null) => {
      const mesh = new THREE.Mesh(keep(mergeGeo(parts)), tint ? keep(new THREE.MeshLambertMaterial({ vertexColors: true, color: tint })) : setMat);
      mesh.position.set(x, y, z); mesh.rotation.y = ry; scene.add(mesh); return mesh;
    };
    const local = (x, z, ry) => { const cs = Math.cos(ry), sn = Math.sin(ry); return (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs]; };
    const CYL = keep(new THREE.CylinderGeometry(1, 1, 1, 10)), CONE = keep(new THREE.ConeGeometry(1, 1, 8));
    // the bridge: a stone hump with parapets, two piers, a lamp at each corner
    {
      const ry = Math.atan2(laneX(BZ - 4) - laneX(BZ + 4), -8), parts = [];
      for (let i = -7; i <= 7; i++) { const zz = i * 4, hump = 1.5 * (1 - (zz / 30) ** 2); parts.push([BOX, '#7d776d', M(0, hump - 0.75, zz, 6.4, 1.5, 4.3)]);
        for (const sx of [-1, 1]) parts.push([BOX, '#8a847a', M(sx * 3.0, hump + 0.45, zz, 0.5, 1.0, 4.3)]); }
      for (const pz of [-9, 0, 9]) parts.push([BOX, '#6a655d', M(0, -3.0, pz, 6.0, 7.0, 2.2)]);
      addSet(parts, BX, BRIDGE_Y, BZ, ry, new THREE.Color(1.5, 1.25, 1.0));
      const L = local(BX, BZ, ry);
      for (const [lx, lz] of [[-3, -27], [3, -27], [-3, 27], [3, 27], [-3, -9], [3, 9]]) { const p = L(lx, lz); lamp(p[0], bridgeTop(Math.abs(lz)) + 1.9, p[1], WARM, 2.6, 9, 1.1); }
    }
    // the green: a pavilion on its north side, a pole in the middle with strings of lights out to a ring of poles
    const poleM = [];
    {
      const px = GREEN[0], pz = GREEN[1] - GREEN_R + 4, parts = [];
      parts.push([BOX, '#8d877c', M(0, 0.25, 0, 20, 0.5, 9.5)], [BOX, '#ecebe4', M(0, 2.3, -1.2, 16, 3.6, 5.4)], [PRISM, '#6d3023', M(0, 4.1, -1.2, 7.4, 3.0, 17.4, Math.PI / 2)],
        [BOX, '#5d2a20', M(0, 3.75, 2.6, 17.6, 0.22, 3.4, 0, 0.16)], [PRISM, '#ecebe4', M(0, 4.6, 0.9, 4.2, 2.6, 3.0)], [PRISM, '#6d3023', M(0, 4.75, 0.95, 4.8, 2.8, 3.1)],
        [BOX, '#2f241b', M(0, 1.6, 1.52, 1.6, 2.3, 0.1)], [BOX, '#8d877c', M(0, 0.12, 5.4, 6, 0.25, 1.4)]);
      for (let i = 0; i < 7; i++) parts.push([BOX, '#f1efe8', M(-8.4 + i * 2.8, 2.0, 4.1, 0.22, 3.2, 0.22)]);
      for (let i = 0; i < 6; i++) parts.push([BOX, '#f1efe8', M(-7 + i * 2.8, 1.25, 4.1, 2.6, 0.1, 0.1)]);
      addSet(parts, px, GREEN_Y, pz, 0, new THREE.Color(1.7, 1.45, 1.1));
      for (const lx of [-5.6, -2.8, 2.8, 5.6]) { winM.push(M(px + lx, GREEN_Y + 2.3, pz + 1.56, 1.3, 1.5, 0.1)); winC.push(2.8, 1.8, 0.7); }
      winM.push(M(px, GREEN_Y + 5.5, pz + 2.46, 0.9, 0.9, 0.1)); winC.push(2.4, 2.2, 1.6);      // the clock
      stamp(px, pz + 8, 15, WARM, 1.5); for (const lx of [-8.4, 0, 8.4]) lamp(px + lx, GREEN_Y + 3.3, pz + 4.4, WARM, 2.2, 8, 1);
      // the pole and its strings
      const TOPY = GREEN_Y + 13;
      poleM.push(M(GREEN[0], GREEN_Y + 6.5, GREEN[1], 0.3, 13, 0.3));
      const NP = 10, COLS = [CANDLE, CANDLE, [1.0, 0.35, 0.25], CANDLE, [0.45, 0.8, 1.0], CANDLE, [0.55, 1.0, 0.5], CANDLE, [1.0, 0.8, 0.3]];
      for (let i = 0; i < NP; i++) {
        const a = i / NP * 6.283 + 0.3, ex = GREEN[0] + Math.cos(a) * (GREEN_R - 5), ez = GREEN[1] + Math.sin(a) * (GREEN_R - 5), ey = GREEN_Y + 5.2;
        poleM.push(M(ex, GREEN_Y + 2.6, ez, 0.2, 5.2, 0.2));
        const n = 22; for (let j = 1; j < n; j++) { const t = j / n, sag = 4.2 * Math.sin(t * Math.PI); glow(lerp(GREEN[0], ex, t), lerp(TOPY, ey, t) - sag, lerp(GREEN[1], ez, t), COLS[(i + j) % COLS.length], 0.75, 2.0); }
        lamp(ex, ey + 0.3, ez, WARM, 2.2, 9, 0.9);
      }
      stamp(GREEN[0], GREEN[1], GREEN_R * 0.75, CANDLE, 0.55); glow(GREEN[0], TOPY + 0.5, GREEN[1], WARM, 3.2, 2.6);
    }
    // the meeting hall with its bell tower, west of the green
    {
      const x = HALL[0], z = HALL[1], y = height(x, z), parts = [];
      parts.push([BOX, '#d9d5ca', M(0, 3.4, 0, 9, 7.6, 18)], [PRISM, '#2c3038', M(0, 7.2, 0, 10.2, 4.6, 19)], [BOX, '#d2cec3', M(0, 7.5, 11.2, 5.2, 15.8, 5.2)],
        [BOX, '#3a3f49', M(0, 15.6, 11.2, 5.9, 0.3, 5.9)], [CONE, '#2c3038', M(0, 18.6, 11.2, 4.0, 6.0, 4.0, Math.PI / 4)], [BOX, '#2f241b', M(0, 1.5, 13.84, 2.0, 3.0, 0.12)]);
      {
        addSet(parts, x, y, z, 0, new THREE.Color(1.35, 1.2, 1.0));
        for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { winM.push(M(x + sx * 4.56, y + 3.9, z - 6 + i * 4, 0.1, 3.0, 1.1)); winC.push(2.9, 1.9, 0.75); stamp(x + sx * 8, z - 6 + i * 4, 6, WARM, 0.6); }
        for (const [dx, dz, tw] of [[0, 2.66, 0], [2.66, 0, 1], [-2.66, 0, 1]]) { winM.push(M(x + dx, y + 13.2, z + 11.2 + dz, tw ? 0.1 : 1.2, 1.8, tw ? 1.2 : 0.1)); winC.push(2.6, 1.7, 0.7); }
        lamp(x + 1.8, y + 3.4, z + 14.3, WARM, 2.4, 9, 1.1);
      }
    }
    // the mill on the north bank, its wheel in the water
    let wheel = null;
    {
      const x = MILL[0], z = MILL[1], y = height(x, z), wy = waterY(x), parts = [];
      parts.push([BOX, '#9a9388', M(0, 3.8, 0, 11, 8.6, 9)], [PRISM, '#3a2f26', M(0, 8.0, 0, 10.2, 4.2, 12, Math.PI / 2)], [BOX, '#6b655c', M(0, 0.6, 7, 3, 2.4, 6)]);
      addSet(parts, x, y, z, 0, new THREE.Color(1.3, 1.15, 1.0));
      const wp = [[CYL, '#3a2c20', M(0, 0, 0, 0.5, 2.6, 0.5, 0, 0, Math.PI / 2)]];
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; wp.push([BOX, '#4a3828', M(0, Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0.16, 4.8, 0.16, 0, a)], [BOX, '#5a4634', M(0, Math.cos(a) * 4.6, Math.sin(a) * 4.6, 2.2, 0.12, 1.3, 0, a)]); }
      for (const sx of [-1, 1]) wp.push([keep(new THREE.TorusGeometry(4.7, 0.14, 5, 28)), '#4a3828', M(sx * 1.0, 0, 0, 1, 1, 1, Math.PI / 2)]);
      wheel = addSet(wp, x, Math.max(wy + 3.6, y - 1), z + 10.4, 0, new THREE.Color(1.4, 1.2, 1.0));
      for (const [lx, ly] of [[-3, 3.2], [3, 3.2], [-3, 6.4], [3, 6.4]]) { winM.push(M(x + lx, y + ly, z + 4.56, 1.0, 1.2, 0.1)); winC.push(2.5, 1.5, 0.6); }
      stamp(x, z + 8, 9, WARM, 1.0); lamp(x + 6.5, y + 3.2, z + 5, WARM, 2.4, 9, 1.0);
    }
    // the windmill on its knoll
    let sails = null;
    {
      const x = KNOLL[0], z = KNOLL[1], y = height(x, z), parts = [];
      parts.push([keep(new THREE.CylinderGeometry(2.6, 4.4, 15, 10)), '#d8d3c7', M(0, 7.5, 0)], [CONE, '#3b3028', M(0, 17, 0, 3.2, 4.2, 3.2)], [BOX, '#3b2a1e', M(0, 1.3, 4.3, 1.4, 2.6, 0.3)],
        [keep(new THREE.CylinderGeometry(6, 6, 0.3, 14)), '#5d5144', M(0, 5.0, 0)]);
      addSet(parts, x, y, z, 0.5, new THREE.Color(1.3, 1.2, 1.05));
      const sp = [[CYL, '#3a2c20', M(0, 0, 0, 0.35, 2.0, 0.35, 0, Math.PI / 2)]];
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; sp.push([BOX, '#d9d2c2', M(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0.5, 11, 0.25, 0.12, 0, 0, a)], [BOX, '#cfc8b6', M(Math.cos(a) * 7.2 - Math.sin(a) * 1.1, Math.sin(a) * 7.2 + Math.cos(a) * 1.1, 0.45, 9, 1.9, 0.05, 0, 0, a)]); }
      sails = addSet(sp, x + Math.sin(0.5) * 3.4, y + 15.2, z + Math.cos(0.5) * 3.4, 0.5, new THREE.Color(1.2, 1.15, 1.1));
      for (const ly of [4, 9]) { const p = local(x, z, 0.5)(0, 3.5 - ly * 0.1); winM.push(M(p[0], y + ly, p[1], 0.9, 1.1, 0.1, 0.5)); winC.push(2.6, 1.6, 0.6); }
      lamp(x + 3, y + 2.8, z + 5.2, WARM, 2.6, 10, 1.1);
    }
    await ctx.yield();

    // ---- street lamps along the lanes, lanterns on the banks ----
    const postM = [];
    const streetLamp = (x, z, k = 1) => { const y = laneY(x, z); postM.push(M(x, y + 1.7, z, 0.14, 3.4, 0.14)); lamp(x, y + 3.5, z, WARM, 2.3, 10.5, k); };
    walk(lanes.main.filter((p) => p[1] > -800), 30, (x, z, tx, tz) => { if (Math.hypot(x - BX, z - BZ) > 24) streetLamp(x - tz * 4.2, z + tx * 4.2); });
    walk(lanes.south, 38, (x, z, tx, tz) => streetLamp(x - tz * -4, z + tx * -4, 0.9));
    walk(lanes.north, 44, (x, z, tx, tz) => streetLamp(x - tz * 4, z + tx * 4, 0.8));
    walk(lanes.east, 40, (x, z, tx, tz) => streetLamp(x - tz * 4, z + tx * 4, 0.9));
    walk(lanes.ne, 46, (x, z, tx, tz) => streetLamp(x - tz * 4, z + tx * 4, 0.8));
    walk(lanes.west, 52, (x, z, tx, tz) => streetLamp(x - tz * 4, z + tx * 4, 0.8));
    // moored boats with a lantern at the bow
    const boatM = [];
    for (let i = 0; i < 16; i++) {
      const x = -330 + R.misc() * 700, s = R.misc() < 0.5 ? 1 : -1, z = riverZ(x) + s * (8.5 + R.misc() * 2); if (Math.abs(x - BX) < 16) continue;
      boatM.push(M(x, waterY(x) + 0.25, z, 1.5, 0.7, 4.6, Math.atan(-riverDz(x)) + Math.PI / 2 + (R.misc() - 0.5) * 0.3));
      if (R.misc() < 0.7) lamp(x + 1.6, waterY(x) + 1.3, z, CANDLE, 1.3, 7, 0.8);
    }
    await ctx.yield();

    // =====================================================================================================
    // THE LAUNCH SITE on the hilltop, and the people
    // =====================================================================================================
    const RS = R.site, GX = PAD[0] + 7.5, GZ = PAD[1];      // the gantry stands beside the pad
    {
      const parts = [], T = '#8f7a5c', T2 = '#7a6548', v = (x, y, z) => new THREE.Vector3(x, y, z), GH = 31, HW = 2.6;
      parts.push([keep(new THREE.CylinderGeometry(8.5, 9.2, 1.2, 20)), '#5d5850', M(PAD[0] - GX, 0.3, 0)], [keep(new THREE.CylinderGeometry(4.6, 4.6, 0.2, 16)), '#1c1917', M(PAD[0] - GX, 1.0, 0)]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push([BOX, T, beam(v(sx * HW, 0, sz * HW), v(sx * HW * 0.8, GH, sz * HW * 0.8), 0.42)]);
      for (let b = 0; b < 5; b++) {
        const y0 = b * 6.2, y1 = y0 + 6.2, w0 = HW * (1 - 0.2 * y0 / GH), w1 = HW * (1 - 0.2 * y1 / GH);
        for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
          parts.push([BOX, T2, beam(v(ax * w0, y0, az * w0), v(bx * w1, y1, bz * w1), 0.2)], [BOX, T2, beam(v(bx * w0, y0, bz * w0), v(ax * w1, y1, az * w1), 0.2)], [BOX, T, beam(v(ax * w1, y1, az * w1), v(bx * w1, y1, bz * w1), 0.28)]);
        }
        parts.push([BOX, '#6b5a43', M(0, y1 + 0.1, 0, w1 * 2 + 1.6, 0.16, w1 * 2 + 1.6)]);
        if (b > 0 && b < 4) parts.push([BOX, T, beam(v(-w1, y1 - 2.4, 0), v(PAD[0] - GX + 1.9, y1 - 2.0, 0), 0.26)]);      // the arms that held her, swung back
      }
      for (let r = 0; r < 44; r++) parts.push([BOX, T, M(HW + 0.5, 0.5 + r * 0.7, 0, 0.1, 0.1, 1.0)]);      // the ladder
      for (const sz of [-0.5, 0.5]) parts.push([BOX, T, beam(v(HW + 0.5, 0, sz), v(HW * 0.8 + 0.5, GH, sz), 0.12)]);
      parts.push([BOX, T, beam(v(0, GH, 0), v(PAD[0] - GX - 1, GH + 3.5, 0), 0.3)], [BOX, T, beam(v(0, GH + 5, 0), v(PAD[0] - GX - 1, GH + 3.5, 0), 0.14)], [BOX, T, beam(v(0, GH, 0), v(0, GH + 5, 0), 0.3)]);
      // the workshop it was built in, a fuel tank on trestles, barrels, a cart
      parts.push([BOX, '#5a4a39', M(15, 2.4, -13, 12, 4.8, 8)], [PRISM, '#3a3029', M(15, 4.8, -13, 9.4, 3.4, 13, Math.PI / 2)], [BOX, '#1d1712', M(15, 2.0, -8.96, 4.6, 4.0, 0.1)],
        [CYL, '#8b8f94', M(13, 2.6, 11, 1.5, 6.5, 1.5, 0.4, 0, Math.PI / 2)], [BOX, T2, M(11, 0.9, 10, 0.3, 1.8, 3.2, 0.4)], [BOX, T2, M(15, 0.9, 12, 0.3, 1.8, 3.2, 0.4)],
        [BOX, '#6b5a43', M(-12, 1.0, 12, 4.4, 0.3, 2.2, 0.7)], [BOX, '#6b5a43', M(-12, 1.6, 12, 4.4, 0.9, 0.12, 0.7)]);
      for (let i = 0; i < 14; i++) { const a = RS() * 6.283, r = 13 + RS() * 9; parts.push([CYL, RS() < 0.5 ? '#6a4f35' : '#55606a', M(Math.cos(a) * r, 0.65, Math.sin(a) * r, 0.5, 1.3, 0.5)]); }
      addSet(parts, GX, PAD_Y, GZ, 0, new THREE.Color(1.25, 1.1, 0.95));
      winM.push(M(GX + 15, PAD_Y + 2.0, GZ - 8.9, 4.2, 3.6, 0.1)); winC.push(2.4, 1.5, 0.6); stamp(GX + 15, GZ - 3, 10, WARM, 1.2);      // the workshop door stands open
      for (let b = 0; b < 5; b++) glow(GX, PAD_Y + 6.5 + b * 6.2, GZ + 2.4, AMBER, 1.3, 1.5);      // work lamps up the gantry
      stamp(PAD[0], PAD[1], 26, AMBER, 0.9);
      // strings of little lights from the gantry's head down to a ring of poles: it is the biggest night the village has had
      const BCOL = [CANDLE, [1.0, 0.35, 0.25], CANDLE, [0.45, 0.8, 1.0], CANDLE, [0.55, 1.0, 0.5]];
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * 6.283 + 0.45, ex = PAD[0] + Math.cos(a) * 31, ez = PAD[1] + Math.sin(a) * 31, ey = height(ex, ez) + 7;
        poleM.push(M(ex, ey - 3.5, ez, 0.2, 7, 0.2));
        if (Math.abs(ex - GX) < 8 && ez > GZ) continue;
        for (let j = 1; j < 26; j++) { const t = j / 26; glow(lerp(GX, ex, t), lerp(PAD_Y + 31, ey, t) - 5 * Math.sin(t * Math.PI), lerp(GZ, ez, t), BCOL[(i + j) % BCOL.length], 0.7, 1.8); }
      }
      // a rope ring keeps the crowd back: posts, every third with a lantern
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, x = PAD[0] + Math.cos(a) * 36, z = PAD[1] + Math.sin(a) * 36; postM.push(M(x, height(x, z) + 0.7, z, 0.12, 1.4, 0.12)); if (i % 3 === 0) lamp(x, height(x, z) + 1.6, z, AMBER, 1.5, 6, 0.9); }
    }
    // the people: almost everyone is on the hill; a line of them still climbing; a few left in the village
    const people = [], RP = R.people, CLOTH = [[0.75, 0.7, 0.6], [0.5, 0.42, 0.34], [0.36, 0.42, 0.55], [0.6, 0.3, 0.26], [0.42, 0.5, 0.36], [0.8, 0.78, 0.74]];
    const person = (x, z, face, lantern) => {
      const y = laneY(x, z), sc = RP() < 0.16 ? 0.62 + RP() * 0.2 : 0.92 + RP() * 0.16;
      people.push({ x, y, z, face, sc, c: CLOTH[Math.floor(RP() * CLOTH.length)] });
      if (lantern) lamp(x + Math.cos(face) * 0.35, y + 1.15 * sc + (RP() < 0.3 ? 0.9 : 0), z - Math.sin(face) * 0.35, RP() < 0.8 ? AMBER : CANDLE, 1.25, 4.6, 0.8);
    };
    {
      const nHill = Math.round(1000 * D);
      for (let i = 0, tries = 0; i < nHill && tries < nHill * 8; tries++) {
        // thickest on the side the village climbed, thinning down the slope; small knots of people, not an even scatter
        const a = RP() * 6.283, bias = 0.55 + 0.45 * Math.cos(a - Math.PI / 2), r = 40 + Math.pow(RP(), 1.5) * 150;
        if (RP() > bias) continue;
        const x = PAD[0] + Math.cos(a) * r + RP.gauss() * 2, z = PAD[1] + Math.sin(a) * r + RP.gauss() * 2;
        if (noise.n2(x * 0.03, z * 0.03) < -0.25 && RP() < 0.8) continue;
        person(x, z, Math.atan2(-(PAD[1] - z), PAD[0] - x) + Math.PI / 2 + (RP() - 0.5) * 0.3, RP() < 0.36); i++;
      }
      walk(lanes.hill, 2.6, (x, z, tx, tz) => { if (RP() < 0.8) person(x + (RP() - 0.5) * 3.4, z + (RP() - 0.5) * 3.4, Math.atan2(-tz, tx) + Math.PI / 2, RP() < 0.5); });
      walk(lanes.main.filter((p) => p[1] < -560), 7, (x, z, tx, tz) => { if (RP() < 0.6) person(x + (RP() - 0.5) * 3, z + (RP() - 0.5) * 3, Math.atan2(-tz, tx) + Math.PI / 2, RP() < 0.5); });
      for (let i = 0; i < 70; i++) { const a = RP() * 6.283, r = 6 + RP() * (GREEN_R - 12); person(GREEN[0] + Math.cos(a) * r, GREEN[1] + Math.sin(a) * r, RP() * 6.283, RP() < 0.3); }
      for (let i = 0; i < 14; i++) person(BX + (RP() - 0.5) * 4.4, BZ + (RP() - 0.5) * 26, RP() * 6.283, RP() < 0.5);
      for (let i = 0; i < nVillage; i++) if (RP() < 0.3) { const h = houses[i], p = h.W((RP() - 0.5) * 4, 0, h.k.d / 2 + 2 + RP() * 2); person(p[0], p[2], h.ry, RP() < 0.3); }
    }
    await ctx.yield();

    // ---- the lamps' map goes to the card ----
    let lampTex;
    {
      const data = new Uint16Array(LNX * LNZ * 4), h = THREE.DataUtils.toHalfFloat;
      for (let i = 0, n = LNX * LNZ; i < n; i++) { data[i * 4] = h(Math.min(60, LMAP[i * 3])); data[i * 4 + 1] = h(Math.min(60, LMAP[i * 3 + 1])); data[i * 4 + 2] = h(Math.min(60, LMAP[i * 3 + 2])); data[i * 4 + 3] = h(1); }
      lampTex = keep(new THREE.DataTexture(data, LNX, LNZ, THREE.RGBAFormat, THREE.HalfFloatType));
      lampTex.magFilter = lampTex.minFilter = THREE.LinearFilter; lampTex.wrapS = lampTex.wrapT = THREE.ClampToEdgeWrapping; lampTex.needsUpdate = true;
    }
    const LAMP_GAIN = 9;
    // what a standing thing takes from the lamps round it: a tint over its own colour
    const tintAt = (x, z, base = 1, k = 4.2) => { const l = Math.min(1.4, lampAt(x, z)); return _c.setRGB(base * (1 + l * k * 1.25), base * (1 + l * k * 0.85), base * (1 + l * k * 0.4)); };
    await ctx.yield();

    // =====================================================================================================
    // THE LAND ITSELF
    // =====================================================================================================
    const fieldOf = (x, z) => {      // a patchwork of fields: which one, how near its hedge, and where in it
      const wx = x + 40 * noise.n2(x * 0.002, z * 0.002), wz = z + 40 * noise.n2(x * 0.002 + 9, z * 0.002);
      const u = (wx * 0.8 + wz * 0.6) / 96, v = (-wx * 0.6 + wz * 0.8) / 74, iu = Math.floor(u), iv = Math.floor(v);
      const hsh = Math.abs(Math.sin(iu * 127.1 + iv * 311.7) * 43758.5453) % 1;
      return { kind: hsh, edge: Math.min((u - iu) * 96, (1 - u + iu) * 96, (v - iv) * 74, (1 - v + iv) * 74), u, v, dir: (hsh * 7.3) % 1 > 0.5 };
    };
    // the land's own colour at a point. fine: with what only the painted map can hold (crop rows, grain, thin hedges, tracks)
    const landColour = (x, z, y, out, fine) => {
      const n = 0.5 + 0.5 * noise.fbm2(x * 0.006 + 9, z * 0.006 - 4, 3), f = fieldOf(x, z);
      let r = 0.066 + 0.034 * n, g = 0.142 + 0.07 * n, b = 0.080 + 0.03 * n, rows = 0;      // meadow
      if (f.kind < 0.22) { r = 0.105; g = 0.086; b = 0.064; rows = 1; }                    // plough
      else if (f.kind < 0.40) { r = 0.155; g = 0.142; b = 0.072; rows = 0.5; }             // stubble
      else if (f.kind < 0.56) { r = 0.042; g = 0.125; b = 0.068; rows = 0.8; }             // a dark crop
      else if (f.kind > 0.88) { r = 0.09; g = 0.165; b = 0.07; rows = 0.25; }              // hay, mown in swathes
      if (fine) {
        if (rows) { const k = 1 + 0.24 * rows * Math.sin((f.dir ? f.u * 96 : f.v * 74) * 6.2832 / 5.6); r *= k; g *= k; b *= k; }
        const gr = 1 + 0.17 * noise.n2(x * 0.31, z * 0.31) + 0.13 * noise.n2(x * 0.07 + 3, z * 0.07); r *= gr; g *= gr; b *= gr;
        if (f.edge < 2.4) { const m = 1 - ss(1.2, 2.4, f.edge); r = lerp(r, 0.018, m); g = lerp(g, 0.042, m); b = lerp(b, 0.028, m); }      // the hedge
        else if (f.edge < 4.5) { r *= 1.12; g *= 1.08; }      // the headland, left rough
      } else if (f.edge < 6) { r *= 0.5; g *= 0.6; b *= 0.55; }
      const dh = Math.hypot(x - HILL[0], z - HILL[1]), hill = 1 - ss(170, 300, dh);
      if (hill > 0) {      // the hill is rough grass, bracken in its hollows, grey rock showing through, sheep tracks along its contours
        let hr = 0.082 + 0.03 * n, hg = 0.125 + 0.05 * n, hb = 0.066 + 0.025 * n;
        if (fine) {
          const br = noise.fbm2(x * 0.011 + 31, z * 0.011, 3), rk = noise.ridged2(x * 0.02 + 5, z * 0.02, 3), gr = 1 + 0.2 * noise.n2(x * 0.3, z * 0.3);
          if (br > 0.12) { const m = ss(0.12, 0.3, br); hr = lerp(hr, 0.105, m); hg = lerp(hg, 0.082, m); hb = lerp(hb, 0.045, m); }
          if (rk > 0.62) { const m = ss(0.62, 0.72, rk); hr = lerp(hr, 0.15, m); hg = lerp(hg, 0.15, m); hb = lerp(hb, 0.15, m); }
          const tr = Math.sin(dh * 0.55 + 4 * noise.n2(x * 0.01, z * 0.01)); if (tr > 0.9) { hr *= 1.3; hg *= 1.22; hb *= 1.1; }
          hr *= gr; hg *= gr; hb *= gr;
        }
        r = lerp(r, hr, hill); g = lerp(g, hg, hill); b = lerp(b, hb, hill);
      }
      const dg = Math.hypot(x - GREEN[0], z - GREEN[1]);
      if (dg < GREEN_R + 6) { const m = 1 - ss(GREEN_R, GREEN_R + 6, dg), mow = fine ? 1 + 0.1 * Math.sign(Math.sin(x * 0.9)) : 1; r = lerp(r, 0.06 * mow, m); g = lerp(g, 0.21 * mow, m); b = lerp(b, 0.10 * mow, m);
        if (Math.abs(x - GREEN[0]) < 1.6 && Math.abs(z - GREEN[1] - 14) < 11) { r = 0.3; g = 0.31; b = 0.19; }      // the pitch, rolled pale
        if (fine && Math.abs(dg - 38) < 0.5) { r = 0.4; g = 0.42; b = 0.36; } }      // and its boundary, chalked
      const rd = riverDist(x, z); if (rd < 30) { const m = 1 - ss(13, 30, rd); r = lerp(r, 0.05, m); g = lerp(g, 0.085, m); b = lerp(b, 0.06, m); }      // reeds and mud
      const dp = Math.hypot(x - PAD[0], z - PAD[1]); if (dp < 40) { const m = 1 - ss(10, 40, dp); r = lerp(r, 0.085, m); g = lerp(g, 0.07, m); b = lerp(b, 0.055, m); }      // trodden and scorched
      if (y > 150) { const m = ss(150, 300, y); r = lerp(r, 0.10, m); g = lerp(g, 0.11, m); b = lerp(b, 0.12, m); }
      out[0] = r; out[1] = g; out[2] = b;
    };
    // the fine patch's colours go into one painted map (a vertex every few metres could not hold a hedge or a furrow)
    const ATEX = D < 0.7 ? 2.0 : 1.4, ANX = Math.round(LW / ATEX), ANZ = Math.round(LD / ATEX);
    let landTex;
    {
      const data = new Uint8Array(ANX * ANZ * 4), c = [0, 0, 0], enc = (v) => Math.min(255, Math.round(255 * Math.pow(Math.max(0, v), 1 / 2.2)));
      for (let j = 0; j < ANZ; j++) {
        const z = LZ0 + (j + 0.5) * ATEX;
        for (let i = 0; i < ANX; i++) { landColour(LX0 + (i + 0.5) * ATEX, z, 0, c, true); const o = (j * ANX + i) * 4; data[o] = enc(c[0]); data[o + 1] = enc(c[1]); data[o + 2] = enc(c[2]); data[o + 3] = 255; }
        if (j % 60 === 59) await ctx.yield();
      }
      landTex = keep(new THREE.DataTexture(data, ANX, ANZ, THREE.RGBAFormat, THREE.UnsignedByteType));
      landTex.colorSpace = THREE.SRGBColorSpace; landTex.magFilter = THREE.LinearFilter; landTex.minFilter = THREE.LinearMipmapLinearFilter; landTex.generateMipmaps = true; landTex.anisotropy = 4; landTex.needsUpdate = true;
    }
    function gridGeo(x0, z0, w, d, nx, nz, drop, white) {
      const pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = new Float32Array(pos.length), uv = new Float32Array((nx + 1) * (nz + 1) * 2), c = [0, 0, 0];
      for (let j = 0, o = 0; j <= nz; j++) for (let i = 0; i <= nx; i++, o++) {
        const x = x0 + w * i / nx, z = z0 + d * j / nz, y = height(x, z);
        pos[o * 3] = x; pos[o * 3 + 1] = y - (drop ? drop(x, z) : 0); pos[o * 3 + 2] = z;
        if (white) c[0] = c[1] = c[2] = 1; else landColour(x, z, y, c, false); col[o * 3] = c[0]; col[o * 3 + 1] = c[1]; col[o * 3 + 2] = c[2];
        uv[o * 2] = (x - LX0) / LW; uv[o * 2 + 1] = (z - LZ0) / LD;
      }
      const idx = new Uint32Array(nx * nz * 6); let k = 0;
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, cc = a + nx + 1, dd = cc + 1; idx[k++] = a; idx[k++] = cc; idx[k++] = b; idx[k++] = b; idx[k++] = cc; idx[k++] = dd; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      for (const name of ['uv', 'uv1', 'uv2']) g.setAttribute(name, new THREE.BufferAttribute(uv, 2));
      g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals(); return g;
    }
    {
      const cell = D < 0.7 ? 6 : 4;
      const inner = new THREE.Mesh(keep(gridGeo(LX0, LZ0, LW, LD, Math.round(LW / cell), Math.round(LD / cell), null, true)), keep(new THREE.MeshLambertMaterial({ map: landTex, lightMap: lampTex, lightMapIntensity: LAMP_GAIN })));
      scene.add(inner);
      await ctx.yield();
      // the country round it: coarse, sunk a little under the fine patch so the two never fight
      const inside = (x, z) => (x > LX0 + 1 && x < LX0 + LW - 1 && z > LZ0 + 1 && z < LZ0 + LD - 1 ? 5 : 0);
      scene.add(new THREE.Mesh(keep(gridGeo(-7000, -7500, 14000, 14000, 140, 140, inside)), keep(new THREE.MeshLambertMaterial({ vertexColors: true }))));
    }
    await ctx.yield();
    // the lanes: pale earth, lit by the same map
    {
      const mat = keep(new THREE.MeshLambertMaterial({ color: '#5c5344', lightMap: lampTex, lightMapIntensity: LAMP_GAIN, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      for (const k in lanes) scene.add(new THREE.Mesh(keep(ribbonGeo(lanes[k], k === 'main' ? 3.1 : k === 'hill' ? 1.7 : 2.3, laneY, 0.16)), mat));
    }
    // the river
    const waterU = { ...FOGU(), uLamps: { value: lampTex }, uRect: { value: new THREE.Vector4(LX0, LZ0, LW, LD) }, uTime, uFlame, uShip };
    {
      const pts = []; for (let x = -3400; x <= 3400; x += 7) pts.push([x, riverZ(x)]);
      const geo = keep(ribbonGeo(pts, (t) => 14.5 + 3 * Math.sin(t * 60), (x) => waterY(x), 0));
      scene.add(new THREE.Mesh(geo, keep(new THREE.ShaderMaterial({ uniforms: waterU, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, fog: true, side: THREE.DoubleSide }))));
    }
    await ctx.yield();

    // =====================================================================================================
    // EVERYTHING THAT STANDS ON THE LAND, as instances
    // =====================================================================================================
    const lit = keep(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const flat = keep(new THREE.MeshLambertMaterial({}));
    function instances(geo, mat, mats, tintFn) {
      if (!mats.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, mats.length);
      for (let i = 0; i < mats.length; i++) { im.setMatrixAt(i, mats[i]); if (tintFn) im.setColorAt(i, tintFn(mats[i], i)); }
      im.frustumCulled = false; scene.add(im); return im;
    }
    const tintOfMatrix = (base, k) => (m) => tintAt(m.elements[12], m.elements[14], base, k);
    // houses
    for (let kind = 0; kind < 4; kind++) {
      const list = houses.filter((h) => h.kind === kind);
      const mats = list.map((h) => new THREE.Matrix4().compose(_p.set(h.x, h.y, h.z), _q.setFromAxisAngle(_up, h.ry), _s.setScalar(h.sc)).clone());
      instances(houseGeo[kind], lit, mats, (m, i) => { const h = list[i], f = h.W(0, 0, h.k.d / 2 + 2.5); return tintAt(f[0], f[2], 0.86 + 0.2 * ((i * 7) % 5) / 5, 2.0); });
    }
    // windows: bright panes, each its own shade of lamplight
    { const im = instances(BOX, keep(new THREE.MeshBasicMaterial({ color: 0xffffff })), winM, null); for (let i = 0; i < winM.length; i++) im.setColorAt(i, _c.setRGB(winC[i * 3], winC[i * 3 + 1], winC[i * 3 + 2])); }
    // fences, vegetable rows, sheds, posts, poles, boats
    instances(BOX, keep(new THREE.MeshLambertMaterial({ color: '#8f8571' })), fenceM, tintOfMatrix(1, 3));
    instances(BOX, keep(new THREE.MeshLambertMaterial({ color: '#27402a' })), rowM, tintOfMatrix(1, 3));
    instances(keep(mergeGeo([[BOX, '#6a5a47', M(0, 1.1, 0, 2.6, 2.2, 2.2)], [PRISM, '#3a3029', M(0, 2.2, 0, 2.7, 1.0, 3.0, Math.PI / 2)]])), lit, shedM, tintOfMatrix(1, 3));
    instances(BOX, keep(new THREE.MeshLambertMaterial({ color: '#3a3632' })), postM, tintOfMatrix(1.2, 3));
    instances(BOX, keep(new THREE.MeshLambertMaterial({ color: '#d8d2c4' })), poleM, tintOfMatrix(1.2, 2));
    { const hull = keep(new THREE.SphereGeometry(1, 10, 6, 0, 6.283, Math.PI / 2, Math.PI / 2)); instances(hull, keep(new THREE.MeshLambertMaterial({ color: '#7b6a55', side: THREE.DoubleSide })), boatM, tintOfMatrix(1, 3)); }
    // people
    {
      const geo = keep(mergeGeo([[BOX, '#39342f', M(0, 0.42, 0, 0.36, 0.84, 0.24)], [keep(new THREE.CylinderGeometry(0.19, 0.28, 0.8, 6)), '#ffffff', M(0, 1.2, 0)], [keep(new THREE.IcosahedronGeometry(0.16, 1)), '#e6b594', M(0, 1.74, 0)],
        [BOX, '#ffffff', M(0.3, 1.25, 0.08, 0.1, 0.55, 0.1, 0, -0.5)], [BOX, '#ffffff', M(-0.3, 1.2, 0, 0.1, 0.6, 0.1)]]));
      const mats = people.map((p) => M(p.x, p.y, p.z, p.sc, p.sc, p.sc, p.face));
      instances(geo, lit, mats, (m, i) => { const p = people[i]; tintAt(p.x, p.z, 1, 3.4); return _c.setRGB(_c.r * p.c[0], _c.g * p.c[1], _c.b * p.c[2]); });
    }
    await ctx.yield();
    // haystacks in the fields near the village
    {
      const prof = [[0, 0], [1.9, 0], [2.1, 1.2], [1.8, 2.4], [1.0, 3.4], [0, 3.9]].map((p) => new THREE.Vector2(p[0], p[1]));
      const mats = [];
      for (let i = 0; i < 400 && mats.length < 90; i++) {
        const x = VC[0] + R.misc.gauss() * 330, z = VC[1] + R.misc.gauss() * 330, f = fieldOf(x, z);
        if (f.kind < 0.22 || f.kind > 0.4 || f.edge < 9 || riverDist(x, z) < 30 || laneDist(x, z) < 8 || houses.some((h) => Math.hypot(h.x - x, h.z - z) < h.r + 4)) continue;
        const s = 0.8 + R.misc() * 0.5; mats.push(M(x, height(x, z) - 0.1, z, s, s, s, R.misc() * 6));
      }
      instances(keep(new THREE.LatheGeometry(prof, 10)), keep(new THREE.MeshLambertMaterial({ color: '#6f6038' })), mats, tintOfMatrix(1, 3));
    }
    // the hill's furniture: grey rocks, gorse, a dry-stone wall round its foot with a gap where the path goes through
    {
      const RM = R.misc, rock = new THREE.IcosahedronGeometry(1, 0), rp = rock.attributes.position;
      for (let i = 0; i < rp.count; i++) { const k = 0.75 + 0.5 * Math.abs(Math.sin(rp.getX(i) * 9.1 + rp.getY(i) * 5.3 + rp.getZ(i) * 7.7)); rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k * 0.7, rp.getZ(i) * k); }
      rock.computeVertexNormals(); keep(rock);
      const rocks = [], gorse = [], wall = [];
      for (let i = 0; i < 900 && rocks.length < 260; i++) {
        const a = RM() * 6.283, r = 46 + RM() * 250, x = HILL[0] + Math.cos(a) * r, z = HILL[1] + Math.sin(a) * r;
        if (noise.ridged2(x * 0.02 + 5, z * 0.02, 3) < 0.6 || laneDist(x, z) < 5) continue;
        const s = 0.7 + RM() * RM() * 3.2; rocks.push(M(x, height(x, z) + s * 0.15, z, s * (0.8 + RM() * 0.6), s, s * (0.8 + RM() * 0.6), RM() * 6.283, (RM() - 0.5) * 0.5));
      }
      for (let i = 0; i < 2600 && gorse.length < 620; i++) {
        const a = RM() * 6.283, r = 60 + RM() * 250, x = HILL[0] + Math.cos(a) * r, z = HILL[1] + Math.sin(a) * r;
        if (noise.fbm2(x * 0.011 + 31, z * 0.011, 3) < 0.1 || laneDist(x, z) < 5) continue;
        const s = 0.8 + RM() * 1.3; gorse.push(M(x, height(x, z) + s * 0.25, z, s * 1.4, s * 0.8, s * 1.4, RM() * 6.283));
      }
      for (let i = 0; i < 470; i++) {
        const a = i / 470 * 6.283, r = 212 + 14 * Math.sin(a * 3 + 1) + 5 * Math.sin(a * 11), x = HILL[0] + Math.cos(a) * r, z = HILL[1] + Math.sin(a) * r;
        if (laneDist(x, z) < 4.5) continue;
        wall.push(M(x, height(x, z) + 0.5, z, 0.7, 1.15 + 0.2 * Math.sin(i * 7.3), 3.0, -a));
      }
      instances(rock, keep(new THREE.MeshLambertMaterial({ color: '#77756f', flatShading: true })), rocks, tintOfMatrix(1, 3));
      instances(keep(new THREE.IcosahedronGeometry(1, 1)), keep(new THREE.MeshLambertMaterial({ color: '#1d3a1f', flatShading: true })), gorse, tintOfMatrix(1, 3));
      instances(BOX, keep(new THREE.MeshLambertMaterial({ color: '#6d6a63' })), wall, tintOfMatrix(1, 3));
    }
    // trees: a broadleaf, a poplar, a willow, a fir
    {
      const RT = R.trees, blob = (r, det = 1) => { const g = new THREE.IcosahedronGeometry(r, det), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.22 * Math.sin(p.getX(i) * 5.1 + p.getY(i) * 3.3) * Math.cos(p.getZ(i) * 4.7); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.9, p.getZ(i) * k); } return g; };
      const B = blob(1), trunk = keep(new THREE.CylinderGeometry(0.16, 0.26, 1, 6));
      const TREES = [
        keep(mergeGeo([[trunk, '#3a2c22', M(0, 2.0, 0, 1.2, 4, 1.2)], [B, '#1c4a2c', M(0, 5.6, 0, 3.0, 2.6, 3.0)], [B, '#245a33', M(1.5, 6.6, 0.6, 2.0, 1.8, 2.0)], [B, '#163d25', M(-1.6, 5.0, -0.8, 2.2, 1.9, 2.2)], [B, '#2a6639', M(0.2, 7.6, -0.6, 1.7, 1.5, 1.7)]])),
        keep(mergeGeo([[trunk, '#3a2c22', M(0, 1.5, 0, 0.9, 3, 0.9)], [B, '#1f5230', M(0, 7.5, 0, 1.5, 6.4, 1.5)], [B, '#2a6639', M(0.2, 11.5, 0, 1.0, 3.2, 1.0)]])),
        keep(mergeGeo([[trunk, '#40342a', M(0, 1.6, 0, 1.6, 3.2, 1.6)], [B, '#2a5a3a', M(0, 4.4, 0, 4.2, 2.4, 4.2)], [B, '#234d33', M(2.2, 3.0, 0, 2.2, 2.6, 2.4)], [B, '#234d33', M(-2.2, 3.0, 0.4, 2.2, 2.6, 2.4)], [B, '#2f6642', M(0, 3.1, 2.3, 2.3, 2.5, 2.0)]])),
        keep(mergeGeo([[trunk, '#33271f', M(0, 1.2, 0, 1, 2.4, 1)], [CONE, '#123526', M(0, 4.0, 0, 2.6, 4.4, 2.6)], [CONE, '#174030', M(0, 6.6, 0, 2.0, 3.8, 2.0)], [CONE, '#1c4a38', M(0, 9.0, 0, 1.3, 3.2, 1.3)]])),
      ];
      B.dispose();
      const lists = [[], [], [], []];
      const ok = (x, z, r, top) => riverDist(x, z) > 15 && laneDist(x, z) > 4.2 + r * 0.3 && Math.hypot(x - GREEN[0], z - GREEN[1]) > GREEN_R + 2 && Math.hypot(x - PAD[0], z - PAD[1]) > 185
        && Math.hypot(x - KNOLL[0], z - KNOLL[1]) > 16 && clearOfRoad(x, z, height(x, z) + top) && !houses.some((h) => Math.hypot(h.x - x, h.z - z) < h.r + r * 0.4);
      const put = (kind, x, z, s) => { const top = [9, 14, 7, 11][kind] * s; if (!ok(x, z, 3 * s, top)) return; lists[kind].push(M(x, height(x, z) - 0.2, z, s, s * (0.85 + RT() * 0.35), s, RT() * 6.283)); };
      // an orchard tree or two in the gardens
      for (const g of gardens) for (let i = 0; i < 2; i++) if (RT() < 0.6) { const p = g.h.W((RT() - 0.5) * g.gw * 0.7, 0, lerp(g.z0 - 3, g.z1 + 2, RT())); put(0, p[0], p[2], 0.5 + RT() * 0.25); }
      // along the lanes, poplars in ones and rows
      walk(lanes.main, 26, (x, z, tx, tz) => { if (RT() < 0.5) put(1, x - tz * -6.5, z + tx * -6.5, 0.8 + RT() * 0.4); });
      walk(lanes.east, 20, (x, z, tx, tz) => { if (RT() < 0.6) put(1, x - tz * -6, z + tx * -6, 0.8 + RT() * 0.4); });
      walk(lanes.west, 24, (x, z, tx, tz) => { if (RT() < 0.6) put(RT() < 0.5 ? 0 : 1, x - tz * 7, z + tx * 7, 0.8 + RT() * 0.5); });
      // willows on the banks
      for (let x = -700; x < 700; x += 13) { if (RT() < 0.55) { const s = RT() < 0.5 ? 1 : -1; put(2, x + RT() * 8, riverZ(x) + s * (17 + RT() * 6), 0.8 + RT() * 0.6); } }
      // hedgerow trees and copses in the valley
      for (let i = 0, n = Math.round(2600 * D); i < n; i++) {
        const x = LX0 + RT() * LW, z = LZ0 + RT() * LD, f = fieldOf(x, z), copse = noise.fbm2(x * 0.004 + 3, z * 0.004, 3);
        if (f.edge < 3.2 && RT() < 0.75) put(RT() < 0.8 ? 0 : 1, x, z, 0.7 + RT() * 0.6);
        else if (copse > 0.3 && RT() < 0.8) put(RT() < 0.75 ? 0 : 3, x, z, 0.8 + RT() * 0.7);
      }
      // woods on the far country, firs on the high ground
      for (let i = 0, n = Math.round(2200 * D); i < n; i++) {
        const a = RT() * 6.283, r = 700 + RT() * 2600, x = Math.cos(a) * r, z = -500 + Math.sin(a) * r; if (x > LX0 && x < LX0 + LW && z > LZ0 && z < LZ0 + LD) continue;
        if (noise.fbm2(x * 0.0022 + 3, z * 0.0022, 3) > 0.05) put(height(x, z) > 60 || RT() < 0.4 ? 3 : 0, x, z, 1 + RT() * 0.9);
      }
      for (let k = 0; k < 4; k++) instances(TREES[k], lit, lists[k], tintOfMatrix(1, 3.0));
    }
    await ctx.yield();

    // ---- light: no moon, no stars; a faint airglow so the land reads at all, and the ship's fire ----
    scene.add(new THREE.HemisphereLight(new THREE.Color(0.30, 0.40, 0.60), new THREE.Color(0.07, 0.09, 0.09), Math.PI * 0.62));
    const fill = new THREE.DirectionalLight(new THREE.Color('#7f92c0'), 0.45); fill.position.set(-300, 600, 400); scene.add(fill);
    const fire = new THREE.PointLight(new THREE.Color(1.0, 0.62, 0.3), 0, 0, 2); scene.add(fire);

    // ---- all the small lights, in one draw ----
    const glowU = { ...FOGU(), uTime, uPx, uMax: { value: 72 }, uMin: { value: 2 }, uGain: { value: 1 } };
    {
      const n = glowList.length / 8, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n);
      for (let i = 0; i < n; i++) { pos.set(glowList.slice(i * 8, i * 8 + 3), i * 3); col.set(glowList.slice(i * 8 + 3, i * 8 + 6), i * 3); size[i] = glowList[i * 8 + 6]; ph[i] = glowList[i * 8 + 7]; }
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
      const pts = new THREE.Points(g, keep(new THREE.ShaderMaterial({ uniforms: glowU, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
    }
    // candle boats set on the river, going down with the current (the clock moves them)
    const NF = 110, floatPos = new Float32Array(NF * 3), floatSeed = [];
    let floats;
    {
      const col = new Float32Array(NF * 3), size = new Float32Array(NF), ph = new Float32Array(NF);
      for (let i = 0; i < NF; i++) { floatSeed.push([R.misc(), (R.misc() - 0.5) * 17, 2.2 + R.misc() * 1.6]); const c = R.misc() < 0.8 ? CANDLE : [1.0, 0.45, 0.3]; col.set([c[0] * 2.2, c[1] * 2.2, c[2] * 2.2], i * 3); size[i] = 1.15; ph[i] = R.misc(); }
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(floatPos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
      floats = new THREE.Points(g, keep(new THREE.ShaderMaterial({ uniforms: glowU, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      floats.frustumCulled = false; floats.renderOrder = 6; scene.add(floats);
    }
    await ctx.yield();

    // =====================================================================================================
    // THE SHIP, ITS FIRE AND ITS TRAIL
    // =====================================================================================================
    const ship = new THREE.Group(); scene.add(ship);
    const flame = new THREE.Group(); ship.add(flame);
    {
      const W1 = '#f4f2ec', W2 = '#dcd8cc', parts = [];
      parts.push([keep(new THREE.CylinderGeometry(1.55, 1.8, 8.4, 14)), W1, M(0, 6.6, 0)], [keep(new THREE.ConeGeometry(1.55, 4.2, 14)), W1, M(0, 12.9, 0)], [keep(new THREE.CylinderGeometry(1.2, 1.9, 1.6, 12)), '#55504a', M(0, 1.7, 0)],
        [keep(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 4)), '#c9c4b8', M(0, 16.2, 0)]);
      for (const y of [3.4, 6.2, 9.4]) parts.push([keep(new THREE.CylinderGeometry(1.84, 1.84, 0.22, 14)), '#8d8a84', M(0, y, 0, 1 - (y - 3.4) * 0.018, 1, 1 - (y - 3.4) * 0.018)]);
      for (let i = 0; i < 7; i++) { const a = RS() * 6.283, y = 3.6 + RS() * 6; parts.push([BOX, W2, M(Math.cos(a) * 1.68, y, Math.sin(a) * 1.68, 1.0 + RS(), 0.9 + RS(), 0.08, -a + Math.PI / 2)]); }      // patches: it was built from what there was
      for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.4; parts.push([BOX, W2, M(Math.cos(a) * 2.5, 2.6, Math.sin(a) * 2.5, 2.2, 3.4, 0.14, -a, 0, 0)], [BOX, W2, M(Math.cos(a) * 3.2, 1.4, Math.sin(a) * 3.2, 1.3, 1.6, 0.14, -a, 0, 0)]); }
      const hull = new THREE.Mesh(keep(mergeGeo(parts)), keep(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(0.10, 0.09, 0.08) })));
      ship.add(hull);
      for (const a of [0.9, 3.4]) { const pw = new THREE.Mesh(keep(new THREE.CircleGeometry(0.42, 12)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 0.9), side: THREE.DoubleSide }))); pw.position.set(Math.cos(a) * 1.66, 8.6, Math.sin(a) * 1.66); pw.rotation.y = -a + Math.PI / 2; ship.add(pw); }
      const fl1 = new THREE.Mesh(keep(new THREE.ConeGeometry(1.25, 9, 12, 1, true)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, 0.7), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
      fl1.rotation.x = Math.PI; fl1.position.y = -3.6; flame.add(fl1);
      const fl2 = new THREE.Mesh(keep(new THREE.ConeGeometry(0.6, 5, 10, 1, true)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.6, 3.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
      fl2.rotation.x = Math.PI; fl2.position.y = -1.6; flame.add(fl2);
    }
    // the fire's own glare: one big soft point that goes with the ship
    const flareU = { ...FOGU(), uTime, uPx, uMax: { value: 700 }, uMin: { value: 2 }, uGain: { value: 0 } };
    const flarePos = new Float32Array(6);
    let flareGeo;
    {
      const g = flareGeo = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(flarePos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array([2.4, 1.5, 0.7, 0.5, 0.24, 0.08]), 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array([26, 95]), 1)); g.setAttribute('aPh', new THREE.BufferAttribute(new Float32Array([0.2, 0.7]), 1));
      const pts = new THREE.Points(g, keep(new THREE.ShaderMaterial({ uniforms: flareU, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      pts.frustumCulled = false; pts.renderOrder = 8; scene.add(pts);
    }
    // the trail: a ribbon turned to the eye, drawn only as far as the ship has got
    const trailU = { ...FOGU(), uShipQ, uFlame };
    const TN = 900, trailQD = new Float32Array((TN + 1) * 4);      // q, x, y, z of each sample (the dust asks how near the trail it is)
    {
      const pos = new Float32Array((TN + 1) * 6), tan = new Float32Array((TN + 1) * 6), side = new Float32Array((TN + 1) * 2), aq = new Float32Array((TN + 1) * 2), idx = [];
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      for (let i = 0; i <= TN; i++) {
        const q = i / TN; trailPoint(q, a); trailPoint(Math.min(1, q + 0.002), b); b.sub(a); if (b.lengthSq() < 1e-8) trailPoint(q - 0.002, b).sub(a).negate(); b.normalize();
        trailQD.set([q, a.x, a.y, a.z], i * 4);
        for (let s = 0; s < 2; s++) { const o = (i * 2 + s) * 3; pos[o] = a.x; pos[o + 1] = a.y; pos[o + 2] = a.z; tan[o] = b.x; tan[o + 1] = b.y; tan[o + 2] = b.z; side[i * 2 + s] = s ? 1 : -1; aq[i * 2 + s] = q; }
        if (i < TN) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aTan', new THREE.BufferAttribute(tan, 3)); g.setAttribute('aSide', new THREE.BufferAttribute(side, 1)); g.setAttribute('aQ', new THREE.BufferAttribute(aq, 1)); g.setIndex(idx);
      const mesh = new THREE.Mesh(g, keep(new THREE.ShaderMaterial({ uniforms: trailU, vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
      mesh.frustumCulled = false; mesh.renderOrder = 7; scene.add(mesh);
    }
    const nearTrail = (x, y, z) => { let b = 1e12, bq = 0; for (let i = 0; i <= TN; i += 6) { const dx = trailQD[i * 4 + 1] - x, dy = trailQD[i * 4 + 2] - y, dz = trailQD[i * 4 + 3] - z, d = dx * dx + dy * dy + dz * dz; if (d < b) { b = d; bq = trailQD[i * 4]; } } return [bq, Math.sqrt(b)]; };
    await ctx.yield();

    // =====================================================================================================
    // THE DUST CLOUD
    // =====================================================================================================
    const puffTex = keep(puffTexture(R.cloud));
    const QUAD = keep(new THREE.PlaneGeometry(1, 1));
    function puffField(list, extra) {      // list of [x, y, z, w, h, kind]
      const n = list.length, g = keep(new THREE.InstancedBufferGeometry());
      g.index = QUAD.index; g.setAttribute('position', QUAD.attributes.position); g.setAttribute('uv', QUAD.attributes.uv);
      const iPos = new Float32Array(n * 3), iSize = new Float32Array(n * 2), iSeed = new Float32Array(n), iTrail = new Float32Array(n * 2), iKind = new Float32Array(n);
      list.forEach((p, i) => { iPos.set([p[0], p[1], p[2]], i * 3); iSize.set([p[3], p[4]], i * 2); iSeed[i] = R.cloud(); iKind[i] = p[5]; iTrail.set(nearTrail(p[0], p[1], p[2]), i * 2); });
      g.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 3)); g.setAttribute('iSize', new THREE.InstancedBufferAttribute(iSize, 2)); g.setAttribute('iSeed', new THREE.InstancedBufferAttribute(iSeed, 1));
      g.setAttribute('iTrail', new THREE.InstancedBufferAttribute(iTrail, 2)); g.setAttribute('iKind', new THREE.InstancedBufferAttribute(iKind, 1)); g.instanceCount = n;
      const uniforms = { ...FOGU(), uTex: { value: puffTex }, uShip, uFlame, uShipQ, uStar, uAbove, uScale: { value: 1 }, uOpacity: { value: 1 }, uInside: { value: 1 }, uWarm: { value: 0.3 }, uNear: { value: 150 }, uLitR: { value: 140 }, ...extra };
      const mesh = new THREE.Mesh(g, keep(new THREE.ShaderMaterial({ uniforms, vertexShader: PUFF_VERT, fragmentShader: PUFF_FRAG, fog: true, transparent: true, depthWrite: false })));
      mesh.frustumCulled = false; scene.add(mesh); return { mesh, uniforms };
    }
    const RC = R.cloud, v3 = new THREE.Vector3();
    let dustIn, dustTop, padSmoke, motes;
    {
      // inside: billows all about the road through the layer, far ones first (we look up the road)
      const list = [], n = Math.round(1150 * D);
      for (let i = 0; i < n; i++) {
        const u = 0.30 + RC() * 0.52; path.pointAt(u, v3); if (v3.y < CLOUD_LO - 90 || v3.y > CLOUD_HI + 30) continue;
        const a = RC() * 6.283, r = 28 + Math.pow(RC(), 0.7) * 520, s = 150 + RC() * 300;
        const y = Math.min(CLOUD_HI - 30, Math.max(CLOUD_LO - 30, v3.y + RC.gauss() * 130));
        list.push([v3.x + Math.cos(a) * r, y, v3.z + Math.sin(a) * r * 0.8, s * 1.4, s * (0.7 + RC() * 0.5), 0, u]);
      }
      // the underside: a wide ragged ceiling that only the fire ever shows
      for (let i = 0, m = Math.round(420 * D); i < m; i++) { const a = RC() * 6.283, r = Math.sqrt(RC()) * 2600, s = 380 + RC() * 520; list.push([Math.cos(a) * r, CLOUD_LO + RC() * 110, -1250 + Math.sin(a) * r, s * 1.5, s * 0.55, 0, 0.3 + RC() * 0.05]); }
      list.sort((p, q) => q[1] - p[1]);
      dustIn = puffField(list, {}); dustIn.mesh.renderOrder = 2;
      // the top: a country of dark billows under the stars, with towers standing out of it
      const tops = [];
      for (let i = 0, m = Math.round(2600 * D); i < m && tops.length < 760 * D; i++) {
        const a = RC() * 6.283, r = 260 + Math.pow(RC(), 1.3) * 8200, x = Math.cos(a) * r, z = -2150 + Math.sin(a) * r;
        const massif = noise.fbm2(x * 0.00042 + 5, z * 0.00042, 3); if (massif < 0.02 && RC() < 0.9) continue;      // they stand in ranges, with open deck between
        const near = path.nearestXZ(x, z).dist, s = (150 + RC() * 330) * (1 + r * 0.00012), tall = massif > 0.22 && RC() < 0.5 ? 1.2 + RC() * 1.6 : 0.5 + RC() * 0.45;
        if (near < 260 + s) continue;      // nothing stands in our road
        const w = s * (tall > 1 ? 0.9 : 1.7), h = s * tall;
        tops.push([x, CLOUD_HI - 62 + h * 0.36, z, w, h, 1]);
        if (tall > 1) for (let k = 0; k < 3; k++) { const s2 = s * (0.5 + RC() * 0.4); tops.push([x + RC.gauss() * s * 0.5, CLOUD_HI - 62 + s2 * 0.3, z + RC.gauss() * s * 0.5, s2 * 1.6, s2 * 0.8, 1]); }      // its shoulders
      }
      tops.sort((p, q) => p[2] - q[2]);
      dustTop = puffField(tops, { uNear: { value: 130 } }); dustTop.mesh.renderOrder = 1;
      // the pad's own smoke: it grows from the moment she lights
      const sm = []; for (let i = 0; i < 54; i++) { const a = RC() * 6.283, r = 3 + RC() * 22; sm.push([PAD[0] + Math.cos(a) * r, PAD_Y + 1.5 + RC() * 3.5 + r * 0.08, PAD[1] + Math.sin(a) * r, 13 + RC() * 10, 7 + RC() * 6, 0]); }
      padSmoke = puffField(sm, { uNear: { value: 18 }, uLitR: { value: 60 }, uWarm: { value: 0.55 } }); padSmoke.mesh.renderOrder = 3;
    }
    // the deck under the billows: seen only from above (its face is up); it hides the land for good
    const deck = new THREE.Mesh(keep(new THREE.CircleGeometry(30000, 64)), keep(new THREE.ShaderMaterial({ uniforms: { uStar, uLdir: { value: new THREE.Vector2(SKY_BU.x, SKY_BU.z).normalize() } }, vertexShader: DECK_VERT, fragmentShader: DECK_FRAG })));
    deck.rotation.x = -Math.PI / 2; deck.position.set(0, CLOUD_HI - 55, -2000); scene.add(deck);
    // motes in the murk, to show our speed
    {
      const n = Math.round(7000 * D), a = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n);
      for (let i = 0; i < n; i++) { path.pointAt(0.36 + RC() * 0.42, v3); a.set([v3.x + RC.gauss() * 45, v3.y + RC.gauss() * 45, v3.z + RC.gauss() * 45], i * 3); col.set([0.5, 0.42, 0.38], i * 3); size[i] = 0.35 + RC() * 0.3; ph[i] = RC(); }
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
      const pts = new THREE.Points(g, keep(new THREE.ShaderMaterial({ uniforms: { ...FOGU(), uTime, uPx, uMax: { value: 10 }, uMin: { value: 0 }, uGain: { value: 0.5 } }, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts); motes = pts;
    }
    await ctx.yield();

    // =====================================================================================================
    // THE UNIVERSE (carried round the eye; nothing of it exists below the cloud's top)
    // =====================================================================================================
    const sky = new THREE.Group(); sky.visible = false; scene.add(sky);
    const uShow = { value: 0 }, uPxS = { value: 1 };
    {
      const RST = R.stars, SR = 14000;
      const bu = SKY_BU;
      const pole = new THREE.Vector3().crossVectors(bu, new THREE.Vector3(0.80, 0.55, 0.22).normalize()).normalize();
      const bv = new THREE.Vector3().crossVectors(pole, bu).normalize();
      const dirOf = (lon, lat, out) => out.copy(bu).multiplyScalar(Math.cos(lon) * Math.cos(lat)).addScaledVector(bv, Math.sin(lon) * Math.cos(lat)).addScaledVector(pole, Math.sin(lat));
      // the neighbour: off the band, well up, ahead
      const g0 = new THREE.Vector3(); let best = -1e9; const t = new THREE.Vector3();
      for (const lat of [0.46, -0.46]) for (const lon of [0.6, -0.6, 0.9, -0.9]) { dirOf(lon, lat, t); const sc = -t.z - 2.2 * Math.abs(t.y - 0.40) - 0.3 * Math.abs(t.x); if (sc > best) { best = sc; g0.copy(t); } }
      const gx = new THREE.Vector3().crossVectors(_up, g0).normalize().applyAxisAngle(g0, 0.5), gyv = new THREE.Vector3().crossVectors(g0, gx).normalize();
      const c0 = g0.clone().addScaledVector(gx, 0.34).addScaledVector(gyv, 0.2).normalize();
      const dome = new THREE.Mesh(keep(new THREE.SphereGeometry(1, 48, 32)), keep(new THREE.ShaderMaterial({ uniforms: { uShow, uPole: { value: pole }, uBu: { value: bu }, uBv: { value: bv }, uG0: { value: g0 }, uGx: { value: gx }, uGy: { value: gyv }, uC0: { value: c0 } },
        vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false })));
      dome.scale.setScalar(SR); dome.frustumCulled = false; dome.renderOrder = -10; sky.add(dome);
      await ctx.yield();
      const PAL = [[0.62, 0.74, 1.0], [0.8, 0.88, 1.0], [1, 1, 1], [1, 0.96, 0.84], [1, 0.84, 0.6], [1, 0.66, 0.44], [1, 0.5, 0.36]];
      const nField = Math.round(52000 * Math.max(0.6, D)), nBand = Math.round(30000 * Math.max(0.6, D)), nClus = 11, perClus = 420, nBright = 420;
      const N = nField + nBand + nClus * perClus + nBright;
      const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), d = new THREE.Vector3(); let o = 0;
      const star = (dir, c, k, s) => { pos.set([dir.x * SR, dir.y * SR, dir.z * SR], o * 3); col.set([c[0] * k, c[1] * k, c[2] * k], o * 3); size[o] = s; o++; };
      for (let i = 0; i < nField; i++) { d.set(RST.gauss(), RST.gauss(), RST.gauss()).normalize(); const m = Math.pow(RST(), 7); star(d, PAL[Math.floor(RST() * PAL.length)], 0.22 + 1.6 * m, 1.3 + 2.2 * m); }
      for (let i = 0; i < nBand; i++) {      // crowded to the band, thickest toward the heart
        const lon = RST.gauss() * 1.25, w = 0.05 + 0.10 * Math.exp(-lon * lon * 0.6); dirOf(lon, RST.gauss() * w, d); const m = Math.pow(RST(), 8);
        star(d, PAL[Math.min(PAL.length - 1, 2 + Math.floor(RST() * 4.2))], 0.16 + 1.2 * m, 1.2 + 1.8 * m);
      }
      for (let c = 0; c < nClus; c++) {      // clusters: tight warm balls off the band, loose blue ones on it
        const glob = c % 2 === 0, cd = dirOf((RST() - 0.5) * 4.4, glob ? (RST() - 0.5) * 1.5 : RST.gauss() * 0.06, new THREE.Vector3()), rad = glob ? 0.012 + RST() * 0.012 : 0.03 + RST() * 0.03;
        if (cd.y < 0.02) cd.y = 0.05 + RST() * 0.4, cd.normalize();
        for (let i = 0; i < perClus; i++) { const rr = glob ? Math.abs(RST.gauss()) * rad * (RST() < 0.3 ? 2.2 : 0.8) : Math.sqrt(RST()) * rad; d.set(RST.gauss(), RST.gauss(), RST.gauss()).normalize().multiplyScalar(rr).add(cd).normalize();
          const m = Math.pow(RST(), 5); star(d, glob ? PAL[3 + Math.floor(RST() * 2.5)] : PAL[Math.floor(RST() * 2.4)], 0.3 + 1.3 * m, 1.3 + 2.0 * m); }
      }
      for (let i = 0; i < nBright; i++) { d.set(RST.gauss(), RST.gauss(), RST.gauss()).normalize(); const big = i < 46; star(d, PAL[Math.floor(RST() * PAL.length)], big ? 2.4 + RST() * 2.2 : 1.6 + RST() * 1.4, big ? 13 + RST() * 12 : 3.6 + RST() * 2.4); }
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      const pts = new THREE.Points(g, keep(new THREE.ShaderMaterial({ uniforms: { uShow, uPx: uPxS }, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      pts.frustumCulled = false; pts.renderOrder = -5; sky.add(pts);
    }
    await ctx.yield();

    // =====================================================================================================
    // EVERY FRAME
    // =====================================================================================================
    const eye = new THREE.Vector3(), shipPos = new THREE.Vector3(), shipTan = new THREE.Vector3(), buf = new THREE.Vector2(), fogC = new THREE.Color();
    const shipAt = (u, out) => trailPoint(shipQ(u), out);
    const flameAt = (u) => (u < U_L ? 0.07 + 0.08 * ss(0.04, U_L, u) : u < U_E ? ss(U_L, U_L + 0.025, u) * 0.75 + 0.25 : 1 - ss(U_E, U_E + 0.02, u));
    function update(dt, time, camera, u = 0) {
      uTime.value = time;
      if (ctx.renderer) { ctx.renderer.getDrawingBufferSize(buf); uPx.value = buf.y / (2 * Math.tan((camera.fov || 62) * Math.PI / 360)); uPxS.value = buf.y / 760; }
      camera.getWorldPosition(eye);
      const y = eye.y;
      // the ship
      const q = shipQ(u); trailPoint(q, shipPos); trailPoint(Math.min(1, q + 0.004), shipTan).sub(shipPos);
      if (shipTan.lengthSq() < 1e-6) shipTan.set(0.15, 1, -0.5); shipTan.normalize();
      if (q <= 0) shipTan.set(0, 1, 0);
      const fl = flameAt(u), flick = 0.86 + 0.14 * Math.sin(time * 31) * Math.sin(time * 17.3) + 0.06 * Math.sin(time * 71);
      const shake = fl > 0.2 && q < 0.02 ? 0.06 : 0;
      ship.position.copy(shipPos).addScaledVector(shipTan, -1.2); ship.position.x += Math.sin(time * 43) * shake; ship.position.z += Math.cos(time * 37) * shake;
      ship.quaternion.setFromUnitVectors(_up, shipTan);
      if (u >= U_E) ship.rotateZ(0.5 * ss(U_E, 1, u) + 0.05 * Math.sin(time * 0.5));      // spent, she lies over and stops, and so do they
      flame.visible = fl > 0.02; flame.scale.set(0.6 + 0.6 * fl, (0.25 + 1.5 * fl) * flick, 0.6 + 0.6 * fl);
      uShip.value.copy(shipPos); uShipQ.value = q; uFlame.value = fl * flick;
      fire.position.copy(shipPos); fire.position.y += 3; fire.intensity = 30000 * fl * flick;
      flarePos.set([shipPos.x - shipTan.x * 3, shipPos.y - shipTan.y * 3, shipPos.z - shipTan.z * 3, shipPos.x - shipTan.x * 6, shipPos.y - shipTan.y * 6, shipPos.z - shipTan.z * 6]);
      flareGeo.attributes.position.needsUpdate = true; flareU.uGain.value = fl * flick * 1.5;
      // the air: clear night below, dust in the cloud, nothing above it
      const inDust = ss(CLOUD_LO - 140, CLOUD_LO + 160, y) * (1 - ss(CLOUD_HI - 190, CLOUD_HI + 30, y)), above = ss(CLOUD_HI - 70, CLOUD_HI + 110, y);
      scene.fog.density = lerp(lerp(0.00055, 0.0033, inDust), 0.00002, above);
      const near = fl / (1 + eye.distanceToSquared(shipPos) / (420 * 420));
      fogC.copy(fogLow).lerp(fogDust, ss(CLOUD_LO - 260, CLOUD_LO + 60, y)).lerp(fogWarm, Math.min(0.7, near * 0.9) * inDust);
      scene.fog.color.copy(fogC); scene.background.copy(fogC).multiplyScalar(inDust);
      // the stars: none at all until the top of the cloud
      const show = ss(CLOUD_HI - 120, CLOUD_HI + 200, y);
      sky.visible = show > 0.001; uShow.value = show; uStar.value = show; uAbove.value = above;
      dustIn.mesh.visible = y < CLOUD_HI + 260; dustIn.uniforms.uInside.value = ss(CLOUD_LO - 260, CLOUD_LO - 40, y); deck.visible = y > CLOUD_HI - 55;
      dustIn.uniforms.uOpacity.value = 0.9; dustTop.uniforms.uOpacity.value = 0.96;
      // the pad's smoke swells and thins
      const since = Math.max(0, u - U_L + 0.012);
      padSmoke.uniforms.uScale.value = 0.55 + 1.5 * ss(0, 0.12, since) + 0.9 * ss(0.1, 0.5, since);
      padSmoke.uniforms.uOpacity.value = 0.5 * ss(0, 0.02, since) * (1 - ss(0.2, 0.5, since)) + 0.1;
      padSmoke.mesh.visible = y < CLOUD_LO + 200; motes.visible = y > CLOUD_LO - 220 && y < CLOUD_HI + 150;
      // the wheel, the sails, the candle boats
      if (wheel) wheel.rotation.x = time * 0.5;
      if (sails) sails.rotateZ(dt * 0.22);
      for (let i = 0; i < NF; i++) { const s = floatSeed[i], x = -620 + ((s[0] * 1300 + time * s[2]) % 1300), z = riverZ(x) + s[1] * 0.62 + Math.sin(time * 0.3 + i) * 0.5; floatPos[i * 3] = x; floatPos[i * 3 + 1] = waterY(x) + 0.35; floatPos[i * 3 + 2] = z; }
      floats.geometry.attributes.position.needsUpdate = true; floats.visible = y < CLOUD_LO;
    }

    // slow over the village, quick up the fire's road, slow again under the stars
    const pace = (u) => 0.72 + 0.62 * ss(0.27, 0.40, u) - 0.74 * ss(0.72, 0.82, u);

    return {
      scene, path, duration: DUR, pace,
      camera: { fov: 62, near: 0.5, far: 60000, lookAhead: 34, sway: 0.25, bank: 0.1 },
      pois: [{ at: (time, u) => shipAt(u, _p), from: 0.05, to: 0.9, weight: 0.42, fade: 0.2 }],
      portal: { shape: 'circle', radius: 9, color: '#dfe8ff', glow: 0.5 },
      post: { exposure: 1.12, bloom: { strength: 0.62, radius: 0.85, threshold: 0.9 },
        grade: { saturation: 1.06, contrast: 1.05, vignette: 0.28, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() { for (const d of trash) { try { d.dispose?.(); } catch (e) {} } },
    };
  },
};
