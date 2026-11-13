// THE DAY OF THE ANSWER. Golden hour on the great square before Deep Thought, seven and a half million years after the
// question was put. The square is packed to its edges, banners up, streamers strung between the towers. We fly low over the
// crowd, in at the tall doorway of the monolith, down the dark hall of columns and slow indicator lights, to the console
// wall where two small figures wait at a desk before one great amber panel. The panel is the way out.
// Layout: flight along -Z. Square z 0..-700, the building's front at z -720, the hall x -30..30 to the console wall at z -1400.
import * as THREE from 'three';
import { makePath } from '../kit/core.js';

const HALL_W = 30, HALL_H = 90, FRONT_Z = -720, WALL_Z = -1400, BACK_Z = -1500, DOOR_H = 70;
const PTS = [[0, 40, 60], [0, 34, -100], [20, 24, -300], [-10, 21, -520], [0, 24, -680], [0, 26, -760], [0, 24, -1000], [0, 20, -1250], [0, 20, -1385]];

export default {
  id: 'the-day-of-the-answer',
  name: 'The Day of the Answer',
  category: 'books',
  placeKind: 'city',
  book: "The Hitchhiker's Guide to the Galaxy",
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.6,
  async build(ctx) {
    const { rng } = ctx, detail = ctx.quality?.detail ?? 1;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9b98a');
    scene.fog = new THREE.FogExp2(new THREE.Color('#e2ad84'), 0.00042);
    const path = makePath(PTS);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const U = { uTime: { value: 0 }, uScale: { value: 540 } };
    const disposables = [];
    const keep = (o) => { disposables.push(o); return o; };

    // ---- sky: a dome graded from a hot horizon to a deep evening blue
    {
      const g = keep(new THREE.SphereGeometry(7000, 32, 20)), c = [];
      const lo = new THREE.Color('#ffc98a'), mid = new THREE.Color('#e8a07a'), hi = new THREE.Color('#3c5c9a'), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const h = Math.max(0, p.getY(i) / 7000), sunSide = Math.max(0, p.getZ(i) / 7000);
        col.copy(lo).lerp(mid, Math.min(1, h * 3)).lerp(hi, Math.min(1, Math.max(0, h - 0.12) * 1.6));
        col.r += sunSide * 0.12 * (1 - h); col.g += sunSide * 0.08 * (1 - h);
        c.push(col.r, col.g, col.b);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      scene.add(new THREE.Mesh(g, keep(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))));
      // the low sun, behind us
      const sun = new THREE.Mesh(keep(new THREE.SphereGeometry(160, 20, 12)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.4, 1.4), fog: false })));
      sun.position.set(-2300, 900, 5600); scene.add(sun);
    }

    // ---- light: a low gold sun over our left shoulder, a warm sky
    const hemi = new THREE.HemisphereLight(0xffe2c0, 0x6a4a38, 1.6); scene.add(hemi);
    const sunL = new THREE.DirectionalLight(0xffc47a, Math.PI * 0.95); sunL.position.set(-420, 300, 800); scene.add(sunL, sunL.target);
    const fill = new THREE.DirectionalLight(0x8fa8e0, Math.PI * 0.18); fill.position.set(500, 400, -300); scene.add(fill, fill.target);

    // ---- the square's floor: pale paving with a darker processional way
    {
      const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(6000, 6000)), keep(new THREE.MeshStandardMaterial({ color: '#b89a7c', roughness: 0.95 })));
      ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -600); scene.add(ground);
      const way = new THREE.Mesh(keep(new THREE.PlaneGeometry(64, 780)), keep(new THREE.MeshStandardMaterial({ color: '#8a6a55', roughness: 0.9 })));
      way.rotation.x = -Math.PI / 2; way.position.set(0, 0, -330); scene.add(way);
    }
    await ctx.yield();

    // ---- the monolith: a stepped mass 310 m tall with one tall doorway; the hall is left open through its first tier
    const stone = keep(new THREE.MeshStandardMaterial({ color: '#b6a287', roughness: 0.92 }));
    const stoneDark = keep(new THREE.MeshStandardMaterial({ color: '#8f7d68', roughness: 0.95 }));
    const box = (x0, x1, y0, y1, z0, z1, mat) => {
      const m = new THREE.Mesh(keep(new THREE.BoxGeometry(Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0))), mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(m); return m;
    };
    box(-200, -HALL_W, 0, 120, FRONT_Z, BACK_Z, stone); box(HALL_W, 200, 0, 120, FRONT_Z, BACK_Z, stone);      // tier 1, either side of the hall
    box(-HALL_W, HALL_W, HALL_H, 120, FRONT_Z, BACK_Z, stone);                                                   // over the hall
    box(-HALL_W, HALL_W, DOOR_H, HALL_H, FRONT_Z, FRONT_Z - 26, stone);                                         // the lintel
    box(-150, 150, 120, 200, FRONT_Z - 40, BACK_Z + 40, stone);
    box(-100, 100, 200, 270, FRONT_Z - 80, BACK_Z + 80, stone);
    box(-52, 52, 270, 310, FRONT_Z - 130, BACK_Z + 130, stoneDark);
    box(-240, 240, 0, 4, FRONT_Z + 22, FRONT_Z, stoneDark); box(-HALL_W - 8, -HALL_W, 0, DOOR_H + 14, FRONT_Z + 4, FRONT_Z, stoneDark); box(HALL_W, HALL_W + 8, 0, DOOR_H + 14, FRONT_Z + 4, FRONT_Z, stoneDark);
    box(-HALL_W, HALL_W, 3.9, 4, FRONT_Z + 22, FRONT_Z, stoneDark);
    {
      // ribs up the front and the tiers' faces: the building reads as one cut block
      const ribs = [];
      for (let x = 44; x <= 196; x += 14) for (const s of [-1, 1]) ribs.push([s * x, 60, FRONT_Z + 3, 5, 120, 6]);
      for (let x = -144; x <= 144; x += 16) ribs.push([x, 160, FRONT_Z - 37, 5, 80, 6]);
      for (let x = -96; x <= 96; x += 16) ribs.push([x, 235, FRONT_Z - 77, 5, 70, 6]);
      const im = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), stoneDark, ribs.length);
      ribs.forEach((r, i) => { dummy.position.set(r[0], r[1], r[2]); dummy.scale.set(r[3], r[4], r[5]); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      scene.add(im);
      // a band of amber slits high on the front: the machine is awake
      const slits = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(3, 22)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.3, 0.45) })), 18);
      for (let i = 0; i < 18; i++) { dummy.position.set(-136 + i * 16, 164, FRONT_Z - 39.6); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); slits.setMatrixAt(i, dummy.matrix); }
      scene.add(slits);
    }
    await ctx.yield();

    // ---- the towers round the square
    const towers = [];
    {
      const spots = [];
      for (let z = 120; z > -700; z -= rng.range(55, 95)) for (const s of [-1, 1]) spots.push([s * rng.range(285, 330), z + rng.range(-15, 15)], [s * rng.range(400, 520), z + rng.range(-30, 30)]);
      for (let x = -520; x <= 520; x += rng.range(60, 100)) if (Math.abs(x) > 60) spots.push([x, rng.range(190, 320)]);
      for (let x = 250; x < 600; x += 80) for (const s of [-1, 1]) spots.push([s * x, rng.range(-760, -1400)]);
      const im = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 })), spots.length * 2);
      let n = 0;
      for (const [x, z] of spots) {
        const w = rng.range(26, 52), h = rng.range(70, 210), d = rng.range(26, 52);
        col.setHSL(rng.range(0.05, 0.1), rng.range(0.18, 0.35), rng.range(0.5, 0.68));
        dummy.rotation.set(0, 0, 0); dummy.position.set(x, h / 2, z); dummy.scale.set(w, h, d); dummy.updateMatrix(); im.setMatrixAt(n, dummy.matrix); im.setColorAt(n++, col);
        const h2 = rng.range(12, 46); col.offsetHSL(0, 0, -0.08);
        dummy.position.set(x, h + h2 / 2, z); dummy.scale.set(w * 0.55, h2, d * 0.55); dummy.updateMatrix(); im.setMatrixAt(n, dummy.matrix); im.setColorAt(n++, col);
        towers.push({ x, z, top: h + h2 });
      }
      im.instanceColor.needsUpdate = true; scene.add(im);
    }
    await ctx.yield();

    // ---- the crowd: bodies and heads, each bobbing on its own beat
    const bob = (mat) => {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = U.uTime;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n#ifdef USE_INSTANCING\n float ph = instanceMatrix[3][0] * 1.7 + instanceMatrix[3][2] * 2.3;\n transformed.y += abs(sin(uTime * (2.2 + fract(ph) * 1.6) + ph)) * 0.22;\n#endif');
      };
      return mat;
    };
    {
      const N = Math.round(52000 * Math.min(1.2, Math.max(0.45, detail)));
      const bodies = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.26, 0.4, 1.45, 5, 1)), bob(keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }))), N);
      const heads = new THREE.InstancedMesh(keep(new THREE.OctahedronGeometry(0.27, 0)), bob(keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }))), N);
      const skins = ['#e8c4a0', '#c99670', '#8a5a3c', '#f1d6bc', '#a9744e', '#9fc7a8', '#b9a4dc'];
      for (let i = 0; i < N; i++) {
        // thickest along the processional way and toward the doors; nobody in the doorway itself
        let x, z;
        do { x = rng.gauss() * 130; z = -690 * Math.pow(rng(), 0.8) + rng.range(-10, 60); } while (Math.abs(x) > 262 || z < -694 || z > 110);
        const s = rng.range(0.85, 1.15), yaw = rng.range(-0.5, 0.5);
        dummy.rotation.set(0, yaw, 0); dummy.scale.set(s, s, s);
        dummy.position.set(x, 0.72 * s, z); dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix);
        col.setHSL(rng(), rng.range(0.55, 0.95), rng.range(0.42, 0.62)); bodies.setColorAt(i, col);
        dummy.position.set(x, 1.68 * s, z); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
        heads.setColorAt(i, col.set(rng.pick(skins)));
        if (i % 13000 === 12999) await ctx.yield();
      }
      bodies.instanceColor.needsUpdate = true; heads.instanceColor.needsUpdate = true;
      bodies.frustumCulled = false; heads.frustumCulled = false;
      scene.add(bodies, heads);
    }
    await ctx.yield();

    // ---- banners on poles, kept off the flight's own corridor
    {
      const N = 150, poles = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.12, 0.16, 1, 5)), keep(new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.8 })), N);
      const flags = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(2.4, 6.5)), keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide })), N);
      for (let i = 0; i < N; i++) {
        let x, z; do { x = rng.range(-250, 250); z = rng.range(-690, 80); } while (path.nearestXZ(x, z).dist < 26);
        const h = rng.range(9, 14);
        dummy.rotation.set(0, 0, 0); dummy.scale.set(1, h, 1); dummy.position.set(x, h / 2, z); dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix);
        dummy.rotation.set(0, rng.range(-0.6, 0.6), rng.range(-0.06, 0.06)); dummy.scale.set(1, 1, 1); dummy.position.set(x + 1.3, h - 3.4, z); dummy.updateMatrix(); flags.setMatrixAt(i, dummy.matrix);
        flags.setColorAt(i, col.setHSL(rng.pick([0.0, 0.08, 0.13, 0.55, 0.6, 0.78, 0.92]), 0.9, 0.5));
      }
      flags.instanceColor.needsUpdate = true; scene.add(poles, flags);
    }

    // ---- streamers: lines of pennants strung across the square between the towers, sagging no lower than 70 m
    {
      const quad = keep(new THREE.PlaneGeometry(1.6, 2.6)), mats = [], cols = [];
      const lineMat = keep(new THREE.LineBasicMaterial({ color: '#4a3a30' }));
      const left = towers.filter((t) => t.x < -270 && t.x > -340 && t.z < 100 && t.z > -700), right = towers.filter((t) => t.x > 270 && t.x < 340 && t.z < 100 && t.z > -700);
      const strings = [];
      for (let i = 0; i < Math.min(left.length, right.length); i++) strings.push([left[i], right[(i + (i % 2)) % right.length]]);
      for (const [a, b] of strings) {
        const ya = Math.max(95, a.top * 0.85), yb = Math.max(95, b.top * 0.85), pts = [];
        const sag = Math.min(ya, yb) - 72;
        for (let k = 0; k <= 60; k++) {
          const t = k / 60, p = new THREE.Vector3(a.x + (b.x - a.x) * t, ya + (yb - ya) * t - Math.max(0, sag) * 4 * t * (1 - t) * 0.8, a.z + (b.z - a.z) * t);
          pts.push(p);
          if (k > 0 && k < 60) { dummy.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2, 0); dummy.scale.set(1, 1, 1); dummy.position.set(p.x, p.y - 1.5, p.z); dummy.updateMatrix(); mats.push(dummy.matrix.clone()); cols.push(new THREE.Color().setHSL((k * 0.137) % 1, 0.95, 0.55)); }
        }
        scene.add(new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(pts)), lineMat));
      }
      if (mats.length) {
        const pen = new THREE.InstancedMesh(quad, keep(new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide })), mats.length);
        mats.forEach((m, i) => { pen.setMatrixAt(i, m); pen.setColorAt(i, cols[i]); });
        pen.instanceColor.needsUpdate = true; scene.add(pen);
      }
    }
    await ctx.yield();

    // ---- the hall: a dark lining, a polished floor, two rows of columns
    const dark = keep(new THREE.MeshStandardMaterial({ color: '#0d0f14', roughness: 0.55, metalness: 0.3 }));
    const darker = keep(new THREE.MeshStandardMaterial({ color: '#07080b', roughness: 0.35, metalness: 0.5 }));
    box(-HALL_W + 0.4, -HALL_W + 1.2, 0, HALL_H, FRONT_Z - 27, WALL_Z, dark); box(HALL_W - 1.2, HALL_W - 0.4, 0, HALL_H, FRONT_Z - 27, WALL_Z, dark);
    box(-HALL_W, HALL_W, HALL_H - 1.2, HALL_H - 0.4, FRONT_Z - 27, WALL_Z, dark);
    box(-HALL_W, HALL_W, 0, 0.3, FRONT_Z - 2, WALL_Z, darker);
    box(-HALL_W, HALL_W, 0, HALL_H, WALL_Z, BACK_Z, dark);      // the console wall's mass
    {
      const zs = []; for (let z = FRONT_Z - 50; z > WALL_Z + 30; z -= 42) zs.push(z);
      const cols2 = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(4, 4.6, HALL_H, 12, 1)), dark, zs.length * 2);
      const caps = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(11, 3, 11)), darker, zs.length * 4);
      let n = 0, m = 0;
      for (const z of zs) for (const s of [-1, 1]) {
        dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.position.set(s * 20, HALL_H / 2, z); dummy.updateMatrix(); cols2.setMatrixAt(n++, dummy.matrix);
        dummy.position.set(s * 20, 1.5, z); dummy.updateMatrix(); caps.setMatrixAt(m++, dummy.matrix);
        dummy.position.set(s * 20, HALL_H - 2.5, z); dummy.updateMatrix(); caps.setMatrixAt(m++, dummy.matrix);
      }
      scene.add(cols2, caps);
    }
    await ctx.yield();

    // ---- the indicator lights: banks on both walls bay by bay, rings on the columns, and the console wall itself
    const lampMat = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uScale: U.uScale, uSize: { value: 0.9 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec3 aCol; attribute float aPhase; uniform float uTime, uScale, uSize; varying vec3 vC; varying float vB;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float rate = 0.25 + fract(aPhase * 7.13) * 1.1;
          float s = sin(uTime * rate + aPhase * 6.2831);
          float steady = step(0.72, fract(aPhase * 3.71));
          vB = mix(0.12 + 0.88 * smoothstep(-0.1, 0.5, s), 0.9, steady);
          gl_PointSize = clamp(uSize * uScale / max(1.0, -mv.z), 1.2, 16.0); vC = aCol;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vC; varying float vB;
        void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = 1.0 - d * 2.0; gl_FragColor = vec4(vC * vB * (0.6 + 1.8 * a * a), 1.0); }`,
    }));
    {
      const P = [], C = [], PH = [];
      const PAL = [[1.6, 0.95, 0.3], [1.6, 0.95, 0.3], [1.5, 0.55, 0.15], [0.4, 1.4, 0.6], [1.5, 0.25, 0.2], [0.8, 1.0, 1.5], [1.3, 1.3, 1.2]];
      const put = (x, y, z, c) => { P.push(x, y, z); const k = c || rng.pick(PAL); C.push(k[0], k[1], k[2]); PH.push(rng()); };
      // the walls: panels of lamps in ranks, some panels dark
      for (let z = FRONT_Z - 40; z > WALL_Z + 12; z -= 21) for (const s of [-1, 1]) {
        if (rng() < 0.18) continue;
        const y0 = rng.range(4, 14), rows = rng.int(10, 26), colsN = rng.int(8, 14), tone = rng() < 0.5 ? rng.pick(PAL) : null;
        for (let r = 0; r < rows; r++) for (let c = 0; c < colsN; c++) if (rng() < 0.8) put(s * (HALL_W - 1.5), y0 + r * 2.4, z - c * 1.3, tone && rng() < 0.8 ? tone : null);
      }
      // rings round each column
      for (let z = FRONT_Z - 50; z > WALL_Z + 30; z -= 42) for (const s of [-1, 1]) for (let y = 8; y < HALL_H - 6; y += 9) {
        const tone = rng.pick(PAL);
        for (let a = 0; a < 18; a++) { const th = a / 18 * Math.PI * 2; put(s * 20 + Math.cos(th) * 4.55, y + (a % 2) * 0.6, z + Math.sin(th) * 4.55, tone); }
      }
      // the console wall: dense ranks either side of and above the great panel
      for (let x = -HALL_W + 2; x <= HALL_W - 2; x += 0.9) for (let y = 2; y < HALL_H - 3; y += 1.25) {
        if (Math.abs(x) < 10.5 && y > 7 && y < 33) continue;
        if (rng() < 0.45) continue;
        put(x, y, WALL_Z + 0.6, rng() < 0.7 ? PAL[0] : null);
      }
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aPhase', new THREE.Float32BufferAttribute(PH, 1));
      const pts = new THREE.Points(g, lampMat); pts.frustumCulled = false; scene.add(pts);
    }
    await ctx.yield();

    // ---- the great panel, its frame, the desk and the two who wait
    const panelGlow = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.45, 0.5) }));
    {
      const back = new THREE.Mesh(keep(new THREE.PlaneGeometry(19, 23)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.5, 0.14) })));
      back.position.set(0, 20, WALL_Z + 0.35); scene.add(back);
      for (const [x, y, w, h] of [[0, 31.8, 21, 1.2], [0, 8.2, 21, 1.2], [-10.1, 20, 1.2, 24.8], [10.1, 20, 1.2, 24.8]]) {
        const f = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, 1.2)), panelGlow); f.position.set(x, y, WALL_Z + 0.9); scene.add(f);
      }
      // wings of the console stepping out toward the floor
      box(-HALL_W + 2, -12, 0, 6, WALL_Z + 14, WALL_Z, darker); box(12, HALL_W - 2, 0, 6, WALL_Z + 14, WALL_Z, darker);
      // the desk and the two programmers
      const wood = keep(new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.6 }));
      const desk = new THREE.Mesh(keep(new THREE.BoxGeometry(5, 1.1, 2)), wood); desk.position.set(0, 0.85, -1352); scene.add(desk);
      const robe = [keep(new THREE.MeshStandardMaterial({ color: '#c8d4e8', roughness: 0.8 })), keep(new THREE.MeshStandardMaterial({ color: '#d8c7a0', roughness: 0.8 }))];
      const bodyG = keep(new THREE.CylinderGeometry(0.28, 0.45, 1.5, 6)), headG = keep(new THREE.SphereGeometry(0.27, 8, 6));
      [-1.1, 1.1].forEach((x, i) => {
        const b = new THREE.Mesh(bodyG, robe[i]); b.position.set(x, 1.05, -1348.6); scene.add(b);
        const h = new THREE.Mesh(headG, robe[i]); h.position.set(x, 2.05, -1348.6); scene.add(h);
      });
      // a pool of amber on the floor before the panel
      const pool = new THREE.Mesh(keep(new THREE.CircleGeometry(46, 32)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.26, 0.07), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })));
      pool.rotation.x = -Math.PI / 2; pool.scale.set(0.6, 1, 1); pool.position.set(0, 0.4, WALL_Z + 44); scene.add(pool);
    }
    // the hall's own light: the panel's amber, and two cold fills far up the hall so the columns keep their edges
    const amber = new THREE.PointLight(0xffb050, 520, 900, 1); amber.position.set(0, 22, WALL_Z + 18); scene.add(amber);
    const cold1 = new THREE.PointLight(0x7090ff, 70, 500, 1); cold1.position.set(0, 70, -900); scene.add(cold1);
    const cold2 = new THREE.PointLight(0x7090ff, 60, 500, 1); cold2.position.set(0, 70, -1150); scene.add(cold2);
    await ctx.yield();

    // ---- dust in the doorway's light
    let motes = null;
    {
      const N = 1400, P = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { P[i * 3] = rng.range(-28, 28); P[i * 3 + 1] = rng.range(2, 80); P[i * 3 + 2] = rng.range(FRONT_Z - 5, FRONT_Z - 330); }
      const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(P, 3));
      motes = new THREE.Points(g, keep(new THREE.PointsMaterial({ color: new THREE.Color(1.0, 0.75, 0.45), size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));
      scene.add(motes);
    }

    const size = new THREE.Vector2(), eye = new THREE.Vector3();
    const fogOut = new THREE.Color('#e2ad84'), fogIn = new THREE.Color('#1a1410'), bgOut = new THREE.Color('#e9b98a');
    function update(dt, time, camera) {
      U.uTime.value = time;
      if (ctx.renderer) { ctx.renderer.getDrawingBufferSize(size); U.uScale.value = size.y; }
      camera.getWorldPosition(eye);
      // inside the hall the day is left behind: the sky's light and the haze give way to the dark and the panel's amber
      const inside = Math.min(1, Math.max(0, (FRONT_Z - eye.z) / 90));
      hemi.intensity = 1.6 - 1.42 * inside; sunL.intensity = Math.PI * 0.95 * (1 - 0.94 * inside); fill.intensity = Math.PI * 0.18 * (1 - inside);
      scene.fog.color.copy(fogOut).lerp(fogIn, inside); scene.fog.density = 0.00042 + 0.0006 * inside;
      scene.background.copy(bgOut).lerp(fogIn, inside);
      // the panel breathes, a little brighter as we come
      const near = Math.min(1, Math.max(0, (eye.z - WALL_Z - 20) / 500)), breathe = 0.9 + 0.1 * Math.sin(time * 0.8);
      amber.intensity = 520 * breathe * (1.15 - 0.3 * near);
      panelGlow.color.setRGB(2.4 * breathe, 1.45 * breathe, 0.5 * breathe);
      if (motes) motes.position.y = Math.sin(time * 0.15) * 1.5;
    }

    return {
      scene, path, duration: 46,
      camera: { fov: 62, near: 0.5, far: 8000, lookAhead: 30, sway: 0.3, bank: 0.1 },
      pois: [],
      portal: { shape: 'rect', width: 14, height: 18, color: '#ffc870', glow: 0.6 },
      post: { exposure: 1.1, bloom: { strength: 0.6, radius: 0.8, threshold: 0.88 },
        grade: { saturation: 1.05, contrast: 1.05, vignette: 0.3, grain: 0.02, aberration: 0 } },
      ride: 'none', style: 'none', companion: 'none',
      update,
      dispose() { for (const d of disposables) d.dispose?.(); },
    };
  },
};
