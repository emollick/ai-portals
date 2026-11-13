// THE DAY OF THE ANSWER. Golden hour on the great square before Deep Thought, seven and a half million years after the
// question was put. The whole city has come: the square is packed to its edges and the crowd goes up and down in waves,
// the balconies are full, bunting is strung across every street, balloons and airships hang over the roofs and confetti
// comes down through the low sun. We fly low over the crowd, between the colossi and in at the open bronze doors of the
// monolith, down the dark vaulted hall of columns, tape reels, valve banks and slow indicator panels, under the catwalks
// where the technicians have stopped work to watch, and out into the chamber where Deep Thought stands: a stepped console
// the height of a cathedral, two small robed figures at a desk before one great amber panel. The panel is the way out.
//
// Layout: flight along -Z, +X to the right. The square runs z 100..-700 and x -262..262. The building's front is at z -720;
// the hall is x -30..30 and 90 m high from there to z -1290, where it opens into the chamber (x -70..70, 115 m high) whose
// far end is the console; the amber panel stands at z -1385 on the hall's axis, 20 m up.
import * as THREE from 'three';
import { makePath } from '../kit/core.js';

const HALL_W = 30, HALL_H = 90, FRONT_Z = -720, CH_Z = -1290, CH_W = 70, CH_H = 115, FACE_Z = -1386.5, BACK_Z = -1500, DOOR_H = 70;
const SQ_X = 262, SQ_Z0 = 110, SQ_Z1 = -694;
const PTS = [[0, 40, 60], [0, 34, -100], [20, 24, -300], [-10, 21, -520], [0, 24, -680], [0, 26, -760], [0, 24, -1000], [0, 20, -1250], [0, 20, -1385]];

// ---------- small helpers ----------
function mergeGeos(geos) {
  const P = [], N = [], UV = [];
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const v of g.attributes.position.array) P.push(v);
    for (const v of g.attributes.normal.array) N.push(v);
    for (const v of g.attributes.uv.array) UV.push(v);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  return g;
}

// a banner's cloth, drawn once: a border and a column (or a row) of made-up glyphs
function glyphTexture(rng, w, h, bg, fg, n) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.fillStyle = fg; g.lineCap = 'round'; g.lineJoin = 'round';
  const m = Math.min(w, h);
  g.lineWidth = m * 0.045; g.strokeRect(m * 0.07, m * 0.07, w - m * 0.14, h - m * 0.14);
  g.lineWidth = m * 0.02; g.strokeRect(m * 0.13, m * 0.13, w - m * 0.26, h - m * 0.26);
  const tall = h >= w, cell = (tall ? h : w) * 0.78 / n, r = Math.min(cell, m * 0.62) * 0.36;
  for (let k = 0; k < n; k++) {
    const along = (tall ? h : w) * 0.11 + cell * (k + 0.5), cx = tall ? w / 2 : along, cy = tall ? along : h / 2;
    g.lineWidth = r * 0.2;
    const strokes = rng.int(3, 5);
    for (let s = 0; s < strokes; s++) {
      const kind = rng.int(0, 4);
      g.beginPath();
      if (kind === 0) { g.arc(cx, cy, r * rng.range(0.45, 1), rng.range(0, 6.28), rng.range(0, 6.28) + rng.range(1.5, 4.5)); g.stroke(); }
      else if (kind === 1) { const a = rng.int(0, 3) * Math.PI / 4; g.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); }
      else if (kind === 2) { g.arc(cx + rng.range(-0.6, 0.6) * r, cy + rng.range(-0.6, 0.6) * r, r * 0.16, 0, 6.3); g.fill(); }
      else if (kind === 3) { g.moveTo(cx - r, cy + rng.range(-0.8, 0.8) * r); g.quadraticCurveTo(cx, cy + rng.range(-1.4, 1.4) * r, cx + r, cy + rng.range(-0.8, 0.8) * r); g.stroke(); }
      else { const q = r * rng.range(0.4, 0.9); g.rect(cx - q, cy - q, q * 2, q * 2); g.stroke(); }
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function cloudTexture(rng) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 46; i++) {
    const x = 128 + rng.gauss() * 52, y = 74 + rng.gauss() * 13 - Math.abs(x - 128) * 0.05, r = rng.range(12, 34) * (1 - Math.abs(x - 128) / 190);
    if (r < 4) continue;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.34)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default {
  id: 'the-day-of-the-answer',
  name: 'The Day of the Answer',
  category: 'books',
  placeKind: 'city',
  book: "The Hitchhiker's Guide to the Galaxy",
  author: 'Douglas Adams, 1952 to 2001',
  weirdness: 0.6,
  async build(ctx) {
    const { rng } = ctx, detail = Math.min(1.2, Math.max(0.45, ctx.quality?.detail ?? 1));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9b98a');
    scene.fog = new THREE.FogExp2(new THREE.Color('#e2ad84'), 0.00042);
    const path = makePath(PTS);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const U = { uTime: { value: 0 }, uScale: { value: 540 } };
    const disposables = [];
    const keep = (o) => { disposables.push(o); return o; };
    const UNIT = keep(new THREE.BoxGeometry(1, 1, 1));

    const box = (x0, x1, y0, y1, z0, z1, mat, parent) => {
      const m = new THREE.Mesh(UNIT, mat);
      m.scale.set(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); (parent || scene).add(m); return m;
    };
    // items: { p:[x,y,z], s:number|[sx,sy,sz], r:[rx,ry,rz], c:colour }
    const instanced = (geo, mat, items, opts = {}) => {
      if (!items.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, items.length), anyC = items.some((it) => it.c !== undefined);
      for (let i = 0; i < items.length; i++) {
        const it = items[i], s = it.s ?? 1, r = it.r;
        dummy.position.set(it.p[0], it.p[1], it.p[2]);
        if (typeof s === 'number') dummy.scale.set(s, s, s); else dummy.scale.set(s[0], s[1], s[2]);
        if (r) dummy.rotation.set(r[0], r[1], r[2]); else dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        if (anyC) im.setColorAt(i, col.set(it.c ?? '#ffffff'));
      }
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      if (opts.noCull) im.frustumCulled = false;
      (opts.parent || scene).add(im); return im;
    };
    const hsl = (h, s, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l).getHex();
    const FESTIVE = [0.0, 0.03, 0.08, 0.13, 0.33, 0.52, 0.6, 0.78, 0.9];

    // =====================================================================================================
    // THE SKY: a dome graded from a hot horizon to evening blue, the low sun behind us, lit clouds
    // =====================================================================================================
    {
      const g = keep(new THREE.SphereGeometry(7000, 40, 24)), c = [];
      const lo = new THREE.Color('#ffca8c'), mid = new THREE.Color('#ec9f7c'), hi = new THREE.Color('#35589a'), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const h = Math.max(0, p.getY(i) / 7000), sunSide = Math.max(0, p.getZ(i) / 7000);
        col.copy(lo).lerp(mid, Math.min(1, h * 3)).lerp(hi, Math.min(1, Math.max(0, h - 0.1) * 1.55));
        col.r += sunSide * 0.14 * (1 - h); col.g += sunSide * 0.09 * (1 - h);
        c.push(col.r, col.g, col.b);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      scene.add(new THREE.Mesh(g, keep(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))));
      const sun = new THREE.Mesh(keep(new THREE.SphereGeometry(170, 20, 12)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.4, 1.4), fog: false })));
      sun.position.set(-2300, 900, 5600); scene.add(sun);
      // clouds: soft sprites, gold underneath where they face the sun, rose and grey away from it
      const tex = keep(cloudTexture(rng.fork('clouds')));
      for (let i = 0; i < 46; i++) {
        const az = rng.range(0, Math.PI * 2), d = rng.range(2400, 5200), y = rng.range(500, 2300) * (d / 5200) + 250;
        const toSun = Math.max(0, Math.cos(az - Math.atan2(-2300, 5600)));
        const m = keep(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true, opacity: rng.range(0.55, 0.95),
          color: new THREE.Color().setRGB(1.0 + 0.25 * toSun, 0.72 + 0.2 * toSun, 0.62 + 0.05 * toSun) }));
        const s = new THREE.Sprite(m), w = rng.range(900, 2400);
        s.position.set(Math.sin(az) * d, y, Math.cos(az) * d - 600); s.scale.set(w, w * rng.range(0.28, 0.42), 1); scene.add(s);
      }
    }
    const hemi = new THREE.HemisphereLight(0xffe2c0, 0x6a4a38, 1.6); scene.add(hemi);
    const sunL = new THREE.DirectionalLight(0xffc47a, Math.PI * 0.95); sunL.position.set(-420, 300, 800); scene.add(sunL, sunL.target);
    const fill = new THREE.DirectionalLight(0x8fa8e0, Math.PI * 0.18); fill.position.set(500, 400, -300); scene.add(fill, fill.target);

    // ---- the square's floor: pale paving in great squares, a darker processional way with a gold edge
    {
      const stoneG = keep(new THREE.MeshStandardMaterial({ color: '#b89a7c', roughness: 0.95 }));
      const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(7000, 7000)), stoneG);
      ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -600); scene.add(ground);
      const way = new THREE.Mesh(keep(new THREE.PlaneGeometry(64, 800)), keep(new THREE.MeshStandardMaterial({ color: '#8a6a55', roughness: 0.9 })));
      way.rotation.x = -Math.PI / 2; way.position.set(0, 0, -320); scene.add(way);
      const lines = [];
      for (let x = -260; x <= 260; x += 40) lines.push({ p: [x, 0.01, -300], s: [0.7, 0.02, 820] });
      for (let z = 100; z >= -700; z -= 40) lines.push({ p: [0, 0.01, z], s: [540, 0.02, 0.7] });
      for (const s of [-1, 1]) lines.push({ p: [s * 33, 0.02, -320], s: [1.4, 0.03, 800], c: '#c9a050' });
      instanced(UNIT, keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 })), lines.map((l) => ({ c: '#9a7c62', ...l })));
    }
    await ctx.yield();

    // =====================================================================================================
    // THE MONOLITH: a stepped mass 310 m tall, carved, its bronze doors standing open, two colossi at the door
    // =====================================================================================================
    const stone = keep(new THREE.MeshStandardMaterial({ color: '#b6a287', roughness: 0.92 }));
    const stoneDark = keep(new THREE.MeshStandardMaterial({ color: '#8f7d68', roughness: 0.95 }));
    const stonePale = keep(new THREE.MeshStandardMaterial({ color: '#cdbb9f', roughness: 0.9 }));
    const gold = keep(new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: 0.4, metalness: 0.25, emissive: '#5a3505', emissiveIntensity: 0.6 }));
    const bronze = keep(new THREE.MeshStandardMaterial({ color: '#8a5a2c', roughness: 0.5, metalness: 0.2 }));
    const bronzeLit = keep(new THREE.MeshStandardMaterial({ color: '#b07a3a', roughness: 0.45, metalness: 0.2 }));
    {
      box(-200, -HALL_W, 0, 120, FRONT_Z, BACK_Z, stone); box(HALL_W, 200, 0, 120, FRONT_Z, BACK_Z, stone);      // tier 1, either side of the hall
      box(-HALL_W, HALL_W, HALL_H, 120, FRONT_Z, CH_Z, stone);                                                     // over the hall
      box(-HALL_W, HALL_W, CH_H + 0.6, 120, CH_Z, BACK_Z, stone);                                                  // over the chamber
      box(-HALL_W, HALL_W, DOOR_H, HALL_H, FRONT_Z, FRONT_Z - 26, stone);                                         // the lintel
      box(-150, 150, 120, 200, FRONT_Z - 40, BACK_Z + 40, stone);
      box(-100, 100, 200, 270, FRONT_Z - 80, BACK_Z + 80, stone);
      box(-52, 52, 270, 310, FRONT_Z - 130, BACK_Z + 130, stoneDark);
      box(-24, 24, 310, 326, FRONT_Z - 170, BACK_Z + 170, stoneDark);
      // the terraces either side of the door, the door's jambs
      for (const s of [-1, 1]) {
        box(s * 38, s * 244, 0, 4, FRONT_Z + 22, FRONT_Z, stoneDark); box(s * 44, s * 238, 4, 7, FRONT_Z + 15, FRONT_Z, stoneDark);
        box(s * HALL_W, s * (HALL_W + 8), 0, DOOR_H + 16, FRONT_Z + 4, FRONT_Z, stoneDark);
        box(s * 200, s * 214, 0, 96, FRONT_Z + 6, FRONT_Z - 30, stoneDark);      // corner piers
        box(s * 197, s * 217, 96, 104, FRONT_Z + 9, FRONT_Z - 33, stonePale);
      }
      box(-HALL_W - 12, HALL_W + 12, DOOR_H + 16, DOOR_H + 22, FRONT_Z + 6, FRONT_Z, stonePale);      // the door's cornice
      const blocks = [];
      // ribs up the front and the tiers' faces: the building reads as one cut block
      for (let x = 44; x <= 196; x += 14) for (const s of [-1, 1]) blocks.push({ p: [s * x, 62, FRONT_Z + 3], s: [5, 116, 6] });
      for (let x = -144; x <= 144; x += 16) blocks.push({ p: [x, 160, FRONT_Z - 37], s: [5, 80, 6] });
      for (let x = -96; x <= 96; x += 16) blocks.push({ p: [x, 235, FRONT_Z - 77], s: [5, 70, 6] });
      for (let x = -46; x <= 46; x += 11.5) blocks.push({ p: [x, 290, FRONT_Z - 128], s: [3.5, 40, 4] });
      // parapets: crenellations along each tier's front and sides
      for (let x = -198; x <= 198; x += 6) blocks.push({ p: [x, 121.6, FRONT_Z - 1.5], s: [3.4, 3.2, 3] });
      for (let x = -148; x <= 148; x += 6) blocks.push({ p: [x, 201.6, FRONT_Z - 41.5], s: [3.4, 3.2, 3] });
      for (let x = -98; x <= 98; x += 6) blocks.push({ p: [x, 271.6, FRONT_Z - 81.5], s: [3.4, 3.2, 3] });
      for (let z = FRONT_Z - 6; z > BACK_Z; z -= 6) for (const s of [-1, 1]) blocks.push({ p: [s * 198.5, 121.6, z], s: [3, 3.2, 3.4] });
      // buttresses down the long sides
      for (let z = FRONT_Z - 60; z > BACK_Z + 20; z -= 62) for (const s of [-1, 1]) { blocks.push({ p: [s * 206, 46, z], s: [14, 92, 16] }); blocks.push({ p: [s * 203, 100, z], s: [8, 22, 12] }); }
      // a frieze of carved panels under the first parapet, and relief blocks up the door's jambs
      for (let x = -192; x <= 192; x += 8) if (Math.abs(x) > 44) blocks.push({ p: [x, 113 + (Math.round(x / 8) % 2) * 1.2, FRONT_Z + 6.4], s: [4.6, 5.5 - (Math.round(x / 8) % 3), 1.4] });
      for (const s of [-1, 1]) for (let y = 6; y < DOOR_H + 12; y += 7) { blocks.push({ p: [s * (HALL_W + 4), y, FRONT_Z + 4.5], s: [5, 4.2, 1.2] }); blocks.push({ p: [s * (HALL_W + 4), y + 2.9, FRONT_Z + 4.8], s: [2.2, 1.2, 1.4] }); }
      instanced(UNIT, stoneDark, blocks);
      // the carved eye over the door: three gold rings and a boss
      for (const [r, t] of [[21, 1.5], [14.5, 1.2], [8, 1.0]]) {
        const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(r, t, 8, 40)), gold); ring.position.set(0, 97, FRONT_Z + 0.6); ring.scale.z = 0.5; scene.add(ring);
      }
      const boss = new THREE.Mesh(keep(new THREE.SphereGeometry(3.6, 16, 10)), gold); boss.position.set(0, 97, FRONT_Z + 0.4); boss.scale.z = 0.4; scene.add(boss);
      const rays = [];
      for (let a = 0; a < 16; a++) { const th = a / 16 * Math.PI * 2; rays.push({ p: [Math.cos(th) * 11.2, 97 + Math.sin(th) * 11.2, FRONT_Z + 0.5], s: [0.7, 5.4, 0.6], r: [0, 0, th - Math.PI / 2] }); }
      instanced(UNIT, gold, rays);
      // amber slits high on the tiers: the machine is awake
      const slits = [];
      for (let i = 0; i < 18; i++) slits.push({ p: [-136 + i * 16, 164, FRONT_Z - 39.6], s: [3, 22, 0.2] });
      for (let i = 0; i < 12; i++) slits.push({ p: [-88 + i * 16, 238, FRONT_Z - 79.6], s: [2.6, 18, 0.2] });
      for (let i = 0; i < 7; i++) slits.push({ p: [-34.5 + i * 11.5, 292, FRONT_Z - 129.8], s: [2, 14, 0.2] });
      instanced(UNIT, keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.3, 0.45) })), slits);
      // the lantern on the summit and its beam
      const lantern = new THREE.Mesh(keep(new THREE.CylinderGeometry(7, 9, 16, 8)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.6) })));
      lantern.position.set(0, 334, (FRONT_Z + BACK_Z) / 2); scene.add(lantern);
      const beam = new THREE.Mesh(keep(new THREE.CylinderGeometry(26, 5, 1400, 16, 1, true)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.33, 0.12), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
      beam.position.set(0, 342 + 700, (FRONT_Z + BACK_Z) / 2); scene.add(beam);
    }
    await ctx.yield();
    // ---- the doors: two bronze leaves 68 m tall, standing open into the square
    for (const s of [-1, 1]) {
      const leaf = new THREE.Group(); leaf.position.set(s * 31.6, 0, FRONT_Z + 4); leaf.rotation.y = s * 0.2; scene.add(leaf);
      box(-1.4, 1.4, 0, 68, 0, 27, bronze, leaf);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 3; c++) {
        box(-s * 1.4, -s * 2.0, 3 + r * 8.2, 9.4 + r * 8.2, 1.6 + c * 8.5, 8.4 + c * 8.5, bronzeLit, leaf);
        box(-s * 2.0, -s * 2.5, 5 + r * 8.2, 7.4 + r * 8.2, 3.6 + c * 8.5, 6.4 + c * 8.5, gold, leaf);
      }
    }
    // ---- the colossi: two robed thinkers 95 m tall on the terraces, each holding a gold orb
    const statue = (x, z, h, mat, y0 = 0) => {
      const g = new THREE.Group(); g.position.set(x, y0, z); scene.add(g);
      const add = (geo, m, px, py, pz, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => { const o = new THREE.Mesh(keep(geo), m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rz); g.add(o); return o; };
      add(new THREE.BoxGeometry(h * 0.3, h * 0.1, h * 0.26), stoneDark, 0, h * 0.05, 0);
      add(new THREE.BoxGeometry(h * 0.25, h * 0.03, h * 0.22), stonePale, 0, h * 0.115, 0);
      add(new THREE.CylinderGeometry(h * 0.075, h * 0.115, h * 0.5, 10), mat, 0, h * 0.38, 0, 1, 1, 0.8);          // the robe
      for (let k = 0; k < 7; k++) add(new THREE.BoxGeometry(h * 0.012, h * 0.46, h * 0.012), stoneDark, (k - 3) * h * 0.026, h * 0.37, h * 0.073 - Math.abs(k - 3) * h * 0.006);      // its folds
      add(new THREE.BoxGeometry(h * 0.2, h * 0.17, h * 0.105), mat, 0, h * 0.7, 0);                                 // the chest
      add(new THREE.CylinderGeometry(h * 0.03, h * 0.035, h * 0.05, 8), mat, 0, h * 0.8, 0);
      add(new THREE.SphereGeometry(h * 0.058, 14, 10), mat, 0, h * 0.86, 0, 0.9, 1.1, 1);                          // the head
      add(new THREE.BoxGeometry(h * 0.13, h * 0.018, h * 0.13), stoneDark, 0, h * 0.925, 0);                       // a flat cap
      for (const s of [-1, 1]) {
        add(new THREE.BoxGeometry(h * 0.05, h * 0.2, h * 0.055), mat, s * h * 0.118, h * 0.67, h * 0.01, 1, 1, 1, -0.25, s * 0.08);       // upper arm
        add(new THREE.BoxGeometry(h * 0.042, h * 0.15, h * 0.045), mat, s * h * 0.085, h * 0.585, h * 0.075, 1, 1, 1, -1.25, -s * 0.55);  // forearm, brought in
      }
      add(new THREE.SphereGeometry(h * 0.05, 16, 12), gold, 0, h * 0.6, h * 0.12);
    };
    statue(-96, FRONT_Z + 10, 95, stonePale, 7); statue(96, FRONT_Z + 10, 95, stonePale, 7);
    for (const s of [-1, 1]) { statue(s * 172, FRONT_Z - 16, 42, stoneDark, 120); statue(s * 128, FRONT_Z - 58, 36, stoneDark, 200); }      // lesser ones on the tiers
    await ctx.yield();

    // ---- the great banners down the front, four made-up glyphs each
    {
      const R = rng.fork('banners');
      const cloths = [['#8e1b1b', '#f3d489'], ['#1d3a7a', '#f1e3b0'], ['#f0c24a', '#5a1c14'], ['#0f5a4a', '#f3e2a0']];
      const texs = cloths.map(([bg, fg]) => keep(glyphTexture(R, 128, 512, bg, fg, 4)));
      const g = keep(new THREE.PlaneGeometry(13, 62));
      [-172, -130, -60, 60, 130, 172].forEach((x, i) => {
        const m = new THREE.Mesh(g, keep(new THREE.MeshStandardMaterial({ map: texs[i % texs.length], roughness: 0.85, side: THREE.DoubleSide })));
        m.position.set(x, 70, FRONT_Z + 6.7); scene.add(m);
        box(x - 7.5, x + 7.5, 101, 102.2, FRONT_Z + 6.2, FRONT_Z + 7.4, gold);
      });
    }

    // =====================================================================================================
    // THE CITY round the square: towers of several kinds, window bands, balconies, flags, bunting, stalls
    // =====================================================================================================
    const towers = [], figs = [], still = [];      // figs: the people who ripple with the wave; still: those who only stand
    const addFig = (list, x, y, z, o = {}) => list.push({ x, y, z, s: o.s ?? rng.range(0.85, 1.15), yaw: o.yaw ?? rng.range(-0.5, 0.5), c: o.c ?? hsl(rng(), rng.range(0.55, 0.95), rng.range(0.42, 0.62)), arms: o.arms ?? rng() < 0.3, skin: o.skin });
    {
      const R = rng.fork('city');
      const spots = [];
      for (let z = 120; z > -700; z -= R.range(62, 86)) for (const s of [-1, 1]) spots.push([s * R.range(312, 338), z + R.range(-8, 8), true]);
      for (let z = 160; z > -1500; z -= R.range(50, 80)) for (const s of [-1, 1]) { spots.push([s * R.range(420, 520), z + R.range(-20, 20), false]); spots.push([s * R.range(600, 900), z + R.range(-30, 30), false]); if (R() < 0.6) spots.push([s * R.range(950, 1500), z + R.range(-30, 30), false]); }
      for (let x = -900; x <= 900; x += R.range(55, 90)) { if (Math.abs(x) > 70) spots.push([x, R.range(190, 260), false]); spots.push([x + R.range(-20, 20), R.range(330, 520), false]); spots.push([x + R.range(-20, 20), R.range(-1620, -1900), false]); }
      const B = [], C = [], K = [], D = [], bandB = [], bandC = [], balcony = [], rails = [];
      const stoneCol = () => hsl(R.range(0.05, 0.1), R.range(0.16, 0.36), R.range(0.5, 0.7));
      const bandCol = () => (R() < 0.25 ? '#e0a860' : R() < 0.55 ? '#7d7468' : '#6a6672');
      const boxPart = (x, z, w, d, y0, y1, c) => { B.push({ p: [x, (y0 + y1) / 2, z], s: [w, y1 - y0, d], c }); for (let y = y0 + 6; y < y1 - 3; y += 7.5) bandB.push({ p: [x, y, z], s: [w + 0.4, 1.3, d + 0.4], c: bandCol() }); };
      const cylPart = (x, z, w, y0, y1, c) => { C.push({ p: [x, (y0 + y1) / 2, z], s: [w, y1 - y0, w], c }); for (let y = y0 + 6; y < y1 - 3; y += 7.5) bandC.push({ p: [x, y, z], s: [w + 0.4, 1.3, w + 0.4], c: bandCol() }); };
      for (const [x, z, inner] of spots) {
        const far = Math.hypot(x, z + 300) > 700, kind = inner ? R.pick(['slab', 'slab', 'stepped']) : R.pick(['slab', 'stepped', 'stepped', 'round', 'round', 'spire']);
        const w = inner ? R.range(30, 44) : R.range(26, 56), d = inner ? R.range(40, 58) : R.range(26, 56), h = R.range(70, 190) * (far ? R.range(0.9, 1.7) : 1), c = stoneCol();
        let top = h;
        if (kind === 'slab') {
          boxPart(x, z, w, d, 0, h, c); const h2 = R.range(10, 40); boxPart(x, z, w * 0.55, d * 0.55, h, h + h2, c); top = h + h2;
          B.push({ p: [x, h + 0.8, z], s: [w + 2, 1.6, d + 2], c: '#8f7d68' });
        } else if (kind === 'stepped') {
          const n = R.int(3, 5); let y = 0, ww = w, dd = d;
          for (let k = 0; k < n; k++) { const hh = h / n * R.range(0.8, 1.2); boxPart(x, z, ww, dd, y, y + hh, c); B.push({ p: [x, y + hh + 0.6, z], s: [ww + 1.6, 1.2, dd + 1.6], c: '#9c8870' }); y += hh; ww *= 0.74; dd *= 0.74; }
          K.push({ p: [x, y + 9, z], s: [ww * 0.9, 18, dd * 0.9], c: '#a04a32' }); top = y + 18;
        } else if (kind === 'round') {
          cylPart(x, z, w * 0.8, 0, h, c); D.push({ p: [x, h, z], s: [w * 0.8, w * 0.8, w * 0.8], c: R.pick(['#c9a050', '#4a8a8a', '#a04a32', '#d8c9b0']) });
          K.push({ p: [x, h + w * 0.4 + 7, z], s: [3, 16, 3], c: '#c9a050' }); top = h + w * 0.4 + 15;
        } else {
          cylPart(x, z, w * 0.6, 0, h, c); C.push({ p: [x, h + 2, z], s: [w * 0.72, 4, w * 0.72], c: '#9c8870' });
          K.push({ p: [x, h + 4 + h * 0.18, z], s: [w * 0.62, h * 0.36, w * 0.62], c: R.pick(['#a04a32', '#4a6a9a', '#c9a050']) }); top = h + 4 + h * 0.36;
        }
        towers.push({ x, z, top, w, d, inner, kind });
        // balconies on the towers that look onto the square, every one of them full
        if (inner) {
          const s = Math.sign(x), xin = x - s * w / 2, len = d * 0.78;
          for (let y = 14; y < Math.min(h - 8, 78); y += 11) {
            balcony.push({ p: [xin - s * 1.7, y, z], s: [3.4, 0.5, len], c: '#9c8870' });
            rails.push({ p: [xin - s * 3.3, y + 1.0, z], s: [0.16, 0.14, len] }, { p: [xin - s * 3.3, y + 0.55, z], s: [0.1, 0.9, len], c: '#6a5a4a' });
            for (let k = 0, n = Math.floor(len / 1.25); k < n; k++) if (R() < 0.85) addFig(figs, xin - s * R.range(0.6, 2.8), y + 0.25, z - len / 2 + (k + 0.5) * len / n);
            if (R() < 0.6) balcony.push({ p: [xin - s * 3.5, y - 2.2, z + R.range(-len / 3, len / 3)], s: [0.15, 4.6, 3.2], c: hsl(R.pick(FESTIVE), 0.9, 0.5) });      // a cloth hung over the rail
          }
          // and people along the roof's edge
          for (let k = 0, n = Math.floor(d / 1.6); k < n; k++) if (R() < 0.7) addFig(figs, xin + s * R.range(0.8, 2.5), h + 1.6, z - d / 2 + (k + 0.5) * d / n);
        }
      }
      const white = keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
      const glass = keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.1 }));
      instanced(UNIT, white, B); instanced(keep(new THREE.CylinderGeometry(0.5, 0.5, 1, 16)), white, C);
      instanced(keep(new THREE.ConeGeometry(0.5, 1, 10)), white, K); instanced(keep(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), white, D);
      instanced(UNIT, glass, bandB); instanced(keep(new THREE.CylinderGeometry(0.5, 0.5, 1, 16)), glass, bandC);
      instanced(UNIT, white, balcony); instanced(UNIT, keep(new THREE.MeshStandardMaterial({ color: '#c9a050', roughness: 0.5 })), rails);
    }
    await ctx.yield();

    // ---- cloth that moves: one wind for every flag in the city
    const windy = (mat, amp = 0.5) => {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = U.uTime;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float wph = 0.0;
          #ifdef USE_INSTANCING
            wph = instanceMatrix[3][0] * 0.31 + instanceMatrix[3][2] * 0.17;
          #endif
          transformed.z += sin(position.x * 0.9 - uTime * 4.6 + wph) * ${amp.toFixed(2)} * clamp(position.x * 0.2, 0.0, 1.0);
          transformed.y += sin(position.x * 0.6 - uTime * 3.1 + wph) * ${(amp * 0.3).toFixed(2)} * clamp(position.x * 0.2, 0.0, 1.0);`);
      };
      return mat;
    };
    {
      // a flag on every roof
      const poles = [], flags = [];
      for (const t of towers) {
        const ph = t.kind === 'round' || t.kind === 'spire' ? 10 : 16;
        poles.push({ p: [t.x, t.top + ph / 2, t.z], s: [0.35, ph, 0.35] });
        flags.push({ p: [t.x, t.top + ph - 2.6, t.z], r: [0, 0.5 + rng.range(-0.2, 0.2), 0], s: t.inner ? 1 : 1.5, c: hsl(rng.pick(FESTIVE), 0.9, 0.52) });
      }
      // and along the monolith's parapets
      for (let x = -190; x <= 190; x += 38) { poles.push({ p: [x, 131, FRONT_Z - 3], s: [0.35, 20, 0.35] }); flags.push({ p: [x, 138, FRONT_Z - 3], r: [0, 0.5, 0], s: 1.3, c: hsl(rng.pick(FESTIVE), 0.9, 0.52) }); }
      for (let x = -140; x <= 140; x += 40) { poles.push({ p: [x, 211, FRONT_Z - 43], s: [0.35, 20, 0.35] }); flags.push({ p: [x, 218, FRONT_Z - 43], r: [0, 0.5, 0], s: 1.3, c: hsl(rng.pick(FESTIVE), 0.9, 0.52) }); }
      instanced(keep(new THREE.CylinderGeometry(0.5, 0.5, 1, 6)), keep(new THREE.MeshStandardMaterial({ color: '#4a3a30', roughness: 0.7 })), poles);
      instanced(keep(new THREE.PlaneGeometry(8, 4.6, 10, 1).translate(4, 0, 0)), windy(keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide })), 0.7), flags, { noCull: true });
    }

    // ---- bunting: strings of pennants across the square between the towers (never lower than 70 m over the flight), and
    // lower strings from tower to tower along both sides
    {
      const seg = [], pens = [];
      const string = (a, b, sag, every, size) => {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(6, Math.round(L / every)), yaw = Math.atan2(b[0] - a[0], b[2] - a[2]) + Math.PI / 2;
        let prev = null;
        for (let k = 0; k <= n; k++) {
          const t = k / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
          if (prev) seg.push(prev[0], prev[1], prev[2], p[0], p[1], p[2]);
          if (k > 0 && k < n) pens.push({ p: [p[0], p[1] - size * 0.62, p[2]], r: [0, yaw, 0], s: size, c: hsl((k * 0.137) % 1, 0.95, 0.55) });
          prev = p;
        }
      };
      const L = towers.filter((t) => t.inner && t.x < 0), Rr = towers.filter((t) => t.inner && t.x > 0);
      for (let i = 0; i < Math.min(L.length, Rr.length); i++) {
        const a = L[i], b = Rr[(i + (i % 2)) % Rr.length], ya = Math.max(100, a.top * 0.8), yb = Math.max(100, b.top * 0.8);
        string([a.x + a.w / 2, ya, a.z], [b.x - b.w / 2, yb, b.z], Math.min(ya, yb) - 74, 9, 2.6);
        // and from each of these towers to the monolith's corner piers, a long fan of them
        if (i % 3 === 0) { string([a.x + a.w / 2, ya, a.z], [-205, 104, FRONT_Z + 4], 14, 9, 2.6); string([b.x - b.w / 2, yb, b.z], [205, 104, FRONT_Z + 4], 14, 9, 2.6); }
      }
      for (const side of [L, Rr]) for (let i = 0; i + 1 < side.length; i++) {
        const a = side[i], b = side[i + 1], s = Math.sign(a.x), x = a.x - s * a.w / 2 - s * 3.6, x2 = b.x - s * b.w / 2 - s * 3.6;
        string([x, 34, a.z - a.d / 2], [x2, 34, b.z + b.d / 2], 5, 2.6, 1.3); string([x, 56, a.z - a.d / 2], [x2, 56, b.z + b.d / 2], 6, 2.6, 1.3);
        // across the street mouth, out to the next row of towers
        string([a.x + s * a.w / 2, 40, a.z - a.d / 2 - 6], [a.x + s * (a.w / 2 + 90), 44, a.z - a.d / 2 - 6], 9, 3, 1.5);
      }
      const lg = keep(new THREE.BufferGeometry()); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      scene.add(new THREE.LineSegments(lg, keep(new THREE.LineBasicMaterial({ color: '#4a3a30' }))));
      const tri = keep(new THREE.BufferGeometry());
      tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.42, 0.62, 0, 0.42, 0.62, 0, 0, -0.62, 0], 3)); tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
      instanced(tri, keep(new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide })), pens, { noCull: true });
    }
    await ctx.yield();

    // ---- stalls along the square's edges, and the grandstands either side of the door
    const inStand = (x, z) => Math.abs(x) > 211 && z < -510 && z > -690;
    {
      const R = rng.fork('stalls'), counters = [], awn = [], posts = [];
      const stall = (x, z, yaw) => {
        const c1 = hsl(R.pick(FESTIVE), 0.85, 0.5);
        counters.push({ p: [x, 0.6, z], s: [5.2, 1.2, 2.6], r: [0, yaw, 0], c: '#7a5a40' }, { p: [x - Math.sin(yaw) * -1.8, 1.7, z - Math.cos(yaw) * -1.8], s: [5.2, 3.4, 0.2], r: [0, yaw, 0], c: '#8f7d68' });
        for (let k = 0; k < 5; k++) { const o = (k - 2) * 1.12; awn.push({ p: [x + Math.cos(yaw) * o, 3.5, z - Math.sin(yaw) * o], s: [1.12, 0.12, 4.2], r: [0.22, yaw, 0], c: k % 2 ? '#f4ead4' : c1 }); }
        for (const o of [-2.5, 2.5]) posts.push({ p: [x + Math.cos(yaw) * o - Math.sin(yaw) * 1.9, 1.5, z - Math.sin(yaw) * o - Math.cos(yaw) * 1.9], s: [0.14, 3, 0.14] });
        for (let k = 0; k < 6; k++) counters.push({ p: [x + Math.cos(yaw) * R.range(-2.2, 2.2), 1.35, z - Math.sin(yaw) * R.range(-2.2, 2.2)], s: [0.5, 0.35, 0.5], c: hsl(R(), 0.8, 0.55) });      // wares
      };
      for (let z = 100; z > -505; z -= 8.5) { if (R() < 0.85) stall(-271, z, Math.PI / 2); if (R() < 0.85) stall(271, z, -Math.PI / 2); }
      for (let x = -250; x <= 250; x += 8.5) if (Math.abs(x) > 44 && R() < 0.85) stall(x, 119, Math.PI);
      const white = keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }));
      instanced(UNIT, white, counters); instanced(UNIT, white, awn); instanced(UNIT, keep(new THREE.MeshStandardMaterial({ color: '#4a3a30', roughness: 0.8 })), posts);
      // the grandstands: twelve tiers a side under a striped canopy, every seat taken
      const steps = [], canopy = [], cpost = [];
      for (const s of [-1, 1]) {
        for (let i = 0; i < 12; i++) {
          steps.push({ p: [s * (214 + i * 4 + (262 - 214 - i * 4) / 2), i * 1.3 + 0.65, -600], s: [262 - 214 - i * 4, 1.3, 172], c: i % 2 ? '#a08a70' : '#b09a7e' });
          for (let z = -686 + 0.6; z < -514; z += 1.15) if (R() < 0.93) addFig(figs, s * (215.2 + i * 4 + R.range(0, 2.2)), (i + 1) * 1.3, z);
        }
        for (let k = 0; k < 16; k++) canopy.push({ p: [s * 240, 27.5, -686 + (k + 0.5) * 10.75], s: [54, 0.3, 10.75], r: [0, 0, s * 0.13], c: k % 2 ? '#f4ead4' : '#b0282a' });
        for (let z = -686; z <= -514; z += 43) { cpost.push({ p: [s * 263, 15.6, z], s: [0.7, 31.2, 0.7] }); cpost.push({ p: [s * 216, 12, z], s: [0.5, 24, 0.5] }); }
        steps.push({ p: [s * 264.5, 8, -600], s: [3, 16, 172], c: '#8f7d68' });
      }
      instanced(UNIT, white, steps); instanced(UNIT, white, canopy); instanced(UNIT, keep(new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.8 })), cpost);
    }
    // the watchers on the monolith's own terraces
    for (let x = -196; x <= 196; x += 1.4) if (rng() < 0.75) addFig(figs, x, 120, FRONT_Z - 4.5 - rng.range(0, 2));
    for (let x = -146; x <= 146; x += 1.6) if (rng() < 0.6) addFig(figs, x, 200, FRONT_Z - 44.5 - rng.range(0, 2));
    for (const s of [-1, 1]) for (let x = 46; x <= 236; x += 1.3) if (rng() < 0.8 && Math.abs(x - 96) > 16) addFig(figs, s * x, 7, FRONT_Z + rng.range(1.5, 13));
    await ctx.yield();

    // =====================================================================================================
    // THE CROWD: bodies, heads and raised arms; a wave goes up the square toward the doors, again and again
    // =====================================================================================================
    const CROWD_CHUNK = `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 ip = instanceMatrix[3].xz; float ph = ip.x * 1.7 + ip.y * 2.3;
        float wv = pow(max(0.0, sin(ip.y * 0.017 + ip.x * 0.004 * sin(ip.y * 0.003) + uTime * 1.25)), 5.0);
        float cheer = step(0.72, fract(ph * 0.37)) * (0.5 + 0.5 * sin(uTime * 4.0 + ph));
        #ifdef ARMS
          transformed.y *= mix(0.1, 1.0, max(wv, cheer));
          transformed.x *= mix(0.45, 1.0, max(wv, cheer));
        #endif
        transformed.y += abs(sin(uTime * (2.2 + fract(ph) * 1.6) + ph)) * 0.16 + wv * 0.5;
      #endif`;
    const crowdMat = (arms) => {
      const m = keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }));
      if (arms) m.defines = { ...(m.defines || {}), ARMS: '' };
      m.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', CROWD_CHUNK); };
      return m;
    };
    const bodyG = keep(new THREE.CylinderGeometry(0.24, 0.4, 1.45, 6, 1)), headG = keep(new THREE.IcosahedronGeometry(0.29, 0));
    const armsG = keep(mergeGeos([new THREE.BoxGeometry(0.13, 0.85, 0.13).translate(0, 0.42, 0).rotateZ(-0.38).translate(0.3, 0, 0), new THREE.BoxGeometry(0.13, 0.85, 0.13).translate(0, 0.42, 0).rotateZ(0.38).translate(-0.3, 0, 0)]));
    const SKINS = ['#e8c4a0', '#c99670', '#8a5a3c', '#f1d6bc', '#a9744e', '#9fc7a8', '#b9a4dc'];
    const buildFigures = async (list, wave) => {
      const n = list.length; if (!n) return;
      const mb = wave ? crowdMat(false) : keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }));
      const bodies = new THREE.InstancedMesh(bodyG, mb, n), heads = new THREE.InstancedMesh(headG, mb, n);
      const armed = list.filter((f) => f.arms), arms = armed.length ? new THREE.InstancedMesh(armsG, wave ? crowdMat(true) : mb, armed.length) : null;
      let a = 0;
      for (let i = 0; i < n; i++) {
        const f = list[i], s = f.s;
        dummy.rotation.set(0, f.yaw, 0); dummy.scale.set(s, s, s);
        dummy.position.set(f.x, f.y + 0.72 * s, f.z); dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix); bodies.setColorAt(i, col.set(f.c));
        dummy.position.set(f.x, f.y + 1.7 * s, f.z); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix); heads.setColorAt(i, col.set(f.skin ?? rng.pick(SKINS)));
        if (f.arms) { dummy.position.set(f.x, f.y + 1.28 * s, f.z); dummy.updateMatrix(); arms.setMatrixAt(a, dummy.matrix); arms.setColorAt(a++, col.set(f.c)); }
        if (i % 14000 === 13999) await ctx.yield();
      }
      for (const m of [bodies, heads, arms]) if (m) { m.instanceColor.needsUpdate = true; m.frustumCulled = false; scene.add(m); }
    };
    {
      const N = Math.round(68000 * detail);
      for (let i = 0; i < N; i++) {
        // thickest along the processional way and toward the doors; nobody in the stands' footprint or under the door's leaves
        let x, z, tries = 0;
        do { x = rng.gauss() * 135; z = SQ_Z1 + (SQ_Z0 - SQ_Z1) * (1 - Math.pow(rng(), 0.8)); tries++; }
        while (tries < 20 && (Math.abs(x) > SQ_X || inStand(x, z) || (Math.abs(x) > 24 && Math.abs(x) < 42 && z < -686)));
        addFig(figs, x, 0, z, { arms: rng() < 0.42 });
      }
      await buildFigures(figs, true);
    }
    await ctx.yield();

    // ---- banners on poles in the crowd, each a strip of glyphs, kept off the flight's own corridor
    {
      const R = rng.fork('poles'), N = 170, poles = [], cloth = [];
      const tex = keep(glyphTexture(R, 64, 256, '#ffffff', '#2a1a12', 3));
      for (let i = 0; i < N; i++) {
        let x, z; do { x = R.range(-250, 250); z = R.range(-690, 100); } while (path.nearestXZ(x, z).dist < 26 || inStand(x, z));
        const h = R.range(9, 14);
        poles.push({ p: [x, h / 2, z], s: [0.14, h, 0.14] }, { p: [x + 1.2, h - 0.2, z], s: [2.8, 0.1, 0.1] });
        cloth.push({ p: [x + 1.3, h - 3.5, z], r: [0, R.range(-0.4, 0.4), R.range(-0.05, 0.05)], c: hsl(R.pick(FESTIVE), 0.85, 0.6) });
      }
      instanced(UNIT, keep(new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.8 })), poles);
      instanced(keep(new THREE.PlaneGeometry(2.4, 6.5)), keep(new THREE.MeshStandardMaterial({ color: '#ffffff', map: tex, roughness: 0.8, side: THREE.DoubleSide })), cloth);
    }

    // ---- confetti, coming down over the whole square
    {
      const N = Math.round(18000 * detail), P = new Float32Array(N * 3), C = new Float32Array(N * 3), PH = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        P[i * 3] = rng.range(-270, 270); P[i * 3 + 1] = rng.range(0, 96); P[i * 3 + 2] = rng.range(SQ_Z1 - 10, SQ_Z0 + 20);
        col.setHSL(rng.pick(FESTIVE), 0.95, 0.6); if (rng() < 0.25) col.set('#fff6dc');
        C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b; PH[i] = rng();
      }
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(C, 3)); g.setAttribute('aPhase', new THREE.BufferAttribute(PH, 1));
      const m = keep(new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale },
        vertexShader: /* glsl */`
          attribute vec3 aCol; attribute float aPhase; uniform float uTime, uScale; varying vec3 vC;
          void main() {
            vec3 p = position; float sp = 2.0 + fract(aPhase * 5.3) * 3.2;
            p.y = mod(position.y - uTime * sp, 96.0) + 1.0;
            p.x += sin(uTime * 1.3 + aPhase * 40.0) * 1.6; p.z += cos(uTime * 1.1 + aPhase * 31.0) * 1.6;
            vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
            float tw = 0.55 + 0.45 * sin(uTime * 9.0 + aPhase * 90.0);
            gl_PointSize = clamp(0.26 * uScale / max(1.0, -mv.z), 1.0, 9.0) * (0.55 + 0.45 * tw);
            vC = aCol * (0.75 + 0.55 * tw);
          }`,
        fragmentShader: /* glsl */`varying vec3 vC; void main() { gl_FragColor = vec4(vC, 1.0); }` }));
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
    }
    await ctx.yield();

    // =====================================================================================================
    // THE AIR: hot-air balloons at rest over the roofs, three airships under way, each towing a banner
    // =====================================================================================================
    const balloons = [], airships = [];
    {
      const R = rng.fork('air');
      const prof = []; for (let k = 0; k <= 14; k++) { const t = k / 14, a = t * Math.PI; prof.push(new THREE.Vector2(Math.max(0.001, Math.sin(a) * (0.62 + 0.38 * t)), -Math.cos(a) * 1.12)); }
      const envGeo = (cA, cB, cC) => {
        const g = new THREE.LatheGeometry(prof, 16).toNonIndexed(), p = g.attributes.position, c = [], A = new THREE.Color(cA), B = new THREE.Color(cB), Cc = new THREE.Color(cC);
        for (let i = 0; i < p.count; i += 3) {
          const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
          const seg = Math.floor((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2) * 16 + 0.001), k = Math.abs(cy) < 0.14 ? Cc : seg % 2 ? A : B;
          for (let j = 0; j < 3; j++) c.push(k.r, k.g, k.b);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals(); return keep(g);
      };
      const envs = [envGeo('#c8262a', '#f6e7c2', '#f0b83a'), envGeo('#1f5fae', '#f0b83a', '#f6e7c2'), envGeo('#f0b83a', '#b43a8a', '#2a2a5a'), envGeo('#1e8a6a', '#f6e7c2', '#c8262a'), envGeo('#e8672a', '#2a3f8a', '#f6e7c2')];
      const envMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })), basketMat = keep(new THREE.MeshStandardMaterial({ color: '#7a5230', roughness: 0.9 }));
      const flame = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5) })), flameG = keep(new THREE.SphereGeometry(0.6, 8, 6)), ropeMat = keep(new THREE.LineBasicMaterial({ color: '#3a2a20' }));
      const nB = Math.round(22 * Math.max(0.6, detail));
      for (let i = 0; i < nB; i++) {
        const g = new THREE.Group(), r = R.range(11, 18), s = R.sign();
        const x = i < 6 ? s * R.range(120, 250) : s * R.range(150, 900), y = i < 6 ? R.range(150, 260) : R.range(110, 520), z = R.range(250, -1250);
        const env = new THREE.Mesh(R.pick(envs), envMat); env.scale.setScalar(r); g.add(env);
        box(-r * 0.12, r * 0.12, -r * 1.78, -r * 1.58, -r * 0.12, r * 0.12, basketMat, g);
        const fl = new THREE.Mesh(flameG, flame); fl.position.y = -r * 1.3; fl.scale.setScalar(r * 0.09); g.add(fl);
        const rp = []; for (const [ax, az] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) rp.push(ax * r * 0.11, -r * 1.58, az * r * 0.11, ax * r * 0.3, -r * 1.02, az * r * 0.3);
        const rg = keep(new THREE.BufferGeometry()); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); g.add(new THREE.LineSegments(rg, ropeMat));
        g.position.set(x, y, z); g.rotation.y = R.range(0, 6.28); scene.add(g);
        balloons.push({ g, y, ph: R.range(0, 6.28), fl, r });
      }
      // airships: a banded hull, four fins, a gondola with lit windows, a long banner of glyphs astern
      const hullG = (() => {
        const g = new THREE.SphereGeometry(1, 24, 14), p = g.attributes.position, c = [], A = new THREE.Color('#e9dfc8'), B = new THREE.Color('#b0282a'), D = new THREE.Color('#c9a050');
        for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = Math.abs(y) > 0.86 ? D : Math.abs(y) > 0.62 ? B : Math.abs(Math.abs(y) - 0.25) < 0.05 ? B : A; c.push(k.r, k.g, k.b); }
        g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.rotateX(Math.PI / 2); return keep(g);
      })();
      const bannerG = keep(new THREE.PlaneGeometry(70, 10, 28, 1).translate(35, 0, 0));
      const defs = [{ p: [-520, 215, -250], dir: 1, v: 7, bg: '#f0c24a', fg: '#5a1c14' }, { p: [620, 330, -520], dir: -1, v: 5.5, bg: '#1d3a7a', fg: '#f1e3b0' }, { p: [-250, 420, 260], dir: 1, v: 4.5, bg: '#8e1b1b', fg: '#f3d489' }];
      for (const d of defs) {
        const g = new THREE.Group(), L = 52;
        const hull = new THREE.Mesh(hullG, envMat); hull.scale.set(12, 12, L); g.add(hull);
        for (let k = 0; k < 4; k++) { const fin = new THREE.Group(); fin.rotation.z = k * Math.PI / 2; box(-0.4, 0.4, 5, 19, L * 0.62, L * 0.92, keep(new THREE.MeshStandardMaterial({ color: '#b0282a', roughness: 0.8 })), fin); g.add(fin); }
        box(-3, 3, -15.5, -11.5, -14, 6, basketMat, g);
        box(-3.1, 3.1, -14.2, -13, -12, 4, keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.2, 0.5) })), g);
        for (const s of [-1, 1]) box(s * 9, s * 12, -9, -6.5, 2, 9, basketMat, g);
        const ban = new THREE.Mesh(bannerG, windy(keep(new THREE.MeshStandardMaterial({ map: keep(glyphTexture(R, 512, 64, d.bg, d.fg, 7)), roughness: 0.85, side: THREE.DoubleSide })), 1.6));
        ban.rotation.y = -Math.PI / 2; ban.position.set(0, -4, L + 6); g.add(ban);      // streams out astern (+z of the ship)
        const lg = keep(new THREE.BufferGeometry()); lg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, L * 0.98, 0, 1, L + 6, 0, 0, L * 0.98, 0, -9, L + 6], 3)); g.add(new THREE.LineSegments(lg, ropeMat));
        g.position.set(d.p[0], d.p[1], d.p[2]); g.rotation.y = d.dir > 0 ? -Math.PI / 2 : Math.PI / 2;      // nose (-z of the ship) toward its heading along x
        scene.add(g); airships.push({ g, x0: d.p[0], v: d.v * d.dir, y: d.p[1], ph: R.range(0, 6.28) });
      }
    }
    await ctx.yield();

    // =====================================================================================================
    // THE HALL: a dark lining, a polished floor, two rows of columns under a ribbed vault
    // =====================================================================================================
    const dark = keep(new THREE.MeshStandardMaterial({ color: '#0e1016', roughness: 0.55, metalness: 0.3 }));
    const darker = keep(new THREE.MeshStandardMaterial({ color: '#07080b', roughness: 0.3, metalness: 0.5 }));
    const steel = keep(new THREE.MeshStandardMaterial({ color: '#2a2e38', roughness: 0.5, metalness: 0.4 }));
    const panelMat = keep(new THREE.MeshStandardMaterial({ color: '#181b24', roughness: 0.6, metalness: 0.3 }));
    const COLZ = []; for (let z = FRONT_Z - 50; z > CH_Z + 5; z -= 42) COLZ.push(z);
    {
      for (const s of [-1, 1]) box(s * (HALL_W - 1.2), s * (HALL_W - 0.4), 0, HALL_H, FRONT_Z - 27, CH_Z, dark);
      box(-HALL_W, HALL_W, HALL_H - 1.2, HALL_H - 0.4, FRONT_Z - 27, CH_Z, dark);
      box(-HALL_W, HALL_W, 0, 0.3, FRONT_Z - 2, CH_Z, darker);
      const colsI = [], capsI = [], flutes = [];
      for (const z of COLZ) for (const s of [-1, 1]) {
        colsI.push({ p: [s * 20, HALL_H / 2, z] });
        capsI.push({ p: [s * 20, 1.5, z], s: [11, 3, 11] }, { p: [s * 20, 4, z], s: [9.6, 2, 9.6] }, { p: [s * 20, HALL_H - 2.5, z], s: [12, 3, 12] }, { p: [s * 20, HALL_H - 5.2, z], s: [10, 2.4, 10] }, { p: [s * 20, 64, z], s: [9.8, 1.4, 9.8] });
        for (let a = 0; a < 12; a++) { const th = a / 12 * Math.PI * 2; flutes.push({ p: [s * 20 + Math.cos(th) * 4.25, 34, z + Math.sin(th) * 4.25], s: [0.5, 58, 0.5], r: [0, -th, 0] }); }
      }
      instanced(keep(new THREE.CylinderGeometry(4, 4.5, HALL_H, 14, 1)), dark, colsI); instanced(UNIT, darker, capsI); instanced(UNIT, steel, flutes);
      // the vault: a great rib across the nave at every pair of columns, lesser ribs over the aisles, a ridge along the crown
      const ribs = COLZ.map((z) => ({ p: [0, 66, z] })), half = [];
      for (const z of COLZ) for (const s of [-1, 1]) half.push({ p: [s * 25, 78, z], r: [0, 0, 0] });
      instanced(keep(new THREE.TorusGeometry(20, 1.15, 6, 20, Math.PI)), steel, ribs); instanced(keep(new THREE.TorusGeometry(5, 0.7, 5, 12, Math.PI)), steel, half);
      // diagonal ribs between the pairs: thin arcs turned 45 degrees, crossing at each bay's crown
      const diag = [];
      for (let i = 0; i + 1 < COLZ.length; i++) for (const s of [-1, 1]) diag.push({ p: [0, 66, COLZ[i] - 21], r: [0, s * Math.atan2(42, 40), 0], s: [1.45, 1, 1] });
      instanced(keep(new THREE.TorusGeometry(20, 0.55, 5, 20, Math.PI)), steel, diag);
      box(-0.9, 0.9, 85.6, 87.4, FRONT_Z - 28, CH_Z, steel);
      for (const s of [-1, 1]) box(s * 19.2, s * 20.8, 86.6, 88.2, FRONT_Z - 28, CH_Z, steel);
    }
    await ctx.yield();

    // ---- the indicator lamps: one shader for every lamp in the machine. Each lamp knows its row, its column and its panel's
    // manner: (0) each to itself, (1) a chase along the rows, (2) binary counters, (3) a bar scanning up, (4) a page rewritten
    // at each tick, (5) steady
    const LP = [], LC = [], LI = [];
    const PAL = [[1.6, 0.95, 0.3], [1.6, 0.95, 0.3], [1.5, 0.55, 0.15], [0.4, 1.4, 0.6], [1.5, 0.25, 0.2], [0.8, 1.0, 1.5], [1.3, 1.3, 1.2]];
    const lamp = (x, y, z, c, row, cl, mode, ph) => { LP.push(x, y, z); LC.push(c[0], c[1], c[2]); LI.push(row, cl, mode, ph); };
    const lampMat = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uScale: U.uScale, uSize: { value: 0.62 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec3 aCol; attribute vec4 aInfo; uniform float uTime, uScale, uSize; varying vec3 vC; varying float vB;
        float hash(float n) { return fract(sin(n * 91.345) * 47453.5453); }
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float row = aInfo.x, cl = aInfo.y, mode = aInfo.z, ph = aInfo.w, b;
          float own = hash(row * 13.1 + cl * 7.7 + ph * 101.0);
          if (mode < 0.5) { b = 0.12 + 0.88 * smoothstep(-0.1, 0.5, sin(uTime * (0.25 + own * 1.1) + own * 6.2831)); }
          else if (mode < 1.5) { b = 0.1 + 0.9 * step(0.7, fract(cl * 0.09 + row * 0.31 - uTime * (0.25 + ph * 0.5) + ph)); }
          else if (mode < 2.5) { float t = floor(uTime * (8.0 + ph * 24.0) + ph * 977.0 + row * 137.0); b = 0.08 + 0.92 * mod(floor(t / exp2(mod(cl, 8.0))), 2.0); }
          else if (mode < 3.5) { float s = fract(uTime * (0.12 + ph * 0.2) + ph) * 34.0 - 4.0; b = 0.1 + 0.9 * smoothstep(2.5, 0.0, abs(s - row)); }
          else if (mode < 4.5) { float t = floor(uTime * (0.6 + ph * 1.5) + ph * 31.0); b = 0.1 + 0.9 * step(0.5, hash(row * 3.7 + cl * 9.1 + t * 1.3)); }
          else { b = 0.9; }
          vB = b; vC = aCol;
          gl_PointSize = clamp(uSize * uScale / max(1.0, -mv.z), 1.2, 15.0);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vC; varying float vB;
        void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = 1.0 - d * 2.0; gl_FragColor = vec4(vC * vB * (0.5 + 1.9 * a * a), 1.0); }`,
    }));
    const MODES = [0, 0, 1, 2, 2, 3, 4, 4];

    // ---- the walls: framed panels of lamps in ranks above the catwalks and below them; cabinets of tape reels at the floor
    const reels = [];      // { p:[x,y,z], axis:'x'|'z', r, v, ph }
    {
      const R = rng.fork('walls'), backs = [], frames = [], cabs = [], trim = [];
      for (let z = FRONT_Z - 40; z > CH_Z + 24; z -= 21) for (const s of [-1, 1]) {
        // the upper panel
        if (R() > 0.12) {
          const y0 = R.range(44, 52), rows = R.int(10, 22), colsN = R.int(9, 14), mode = R.pick(MODES), tone = R() < 0.6 ? R.pick(PAL) : null, ph = R();
          backs.push({ p: [s * (HALL_W - 1.35), y0 + rows * 0.75 - 0.75, z - colsN * 0.6 + 0.6], s: [0.3, rows * 1.5 + 2, colsN * 1.2 + 2] });
          frames.push({ p: [s * (HALL_W - 1.55), y0 + rows * 1.5 + 0.4, z - colsN * 0.6 + 0.6], s: [0.3, 0.35, colsN * 1.2 + 2.6] }, { p: [s * (HALL_W - 1.55), y0 - 1.9, z - colsN * 0.6 + 0.6], s: [0.3, 0.35, colsN * 1.2 + 2.6] });
          for (let r = 0; r < rows; r++) for (let c = 0; c < colsN; c++) if (mode !== 0 || R() < 0.8) lamp(s * (HALL_W - 1.6), y0 + r * 1.5, z - c * 1.2, tone || R.pick(PAL), r, c, mode, ph);
        }
        // the lower panel, between the cabinets' tops and the catwalk
        if (R() > 0.25) {
          const rows = R.int(8, 12), colsN = R.int(10, 14), mode = R.pick(MODES), tone = R() < 0.7 ? R.pick(PAL) : null, ph = R();
          backs.push({ p: [s * (HALL_W - 1.35), 17 + rows * 0.75 - 0.75, z - colsN * 0.6 + 0.6], s: [0.3, rows * 1.5 + 2, colsN * 1.2 + 2] });
          for (let r = 0; r < rows; r++) for (let c = 0; c < colsN; c++) if (mode !== 0 || R() < 0.8) lamp(s * (HALL_W - 1.6), 17 + r * 1.5, z - c * 1.2, tone || R.pick(PAL), r, c, mode, ph);
        }
      }
      // tape cabinets: two reels each, turning at their own speeds, a row of lamps and a pale label
      for (let z = FRONT_Z - 36; z > CH_Z + 8; z -= 8.4) for (const s of [-1, 1]) {
        if (R() < 0.3) continue;
        const x = s * (HALL_W - 3);
        cabs.push({ p: [x, 6.5, z], s: [3.2, 13, 6.6] });
        trim.push({ p: [x - s * 1.65, 12.6, z], s: [0.12, 0.3, 6.2] }, { p: [x - s * 1.65, 2.2, z], s: [0.12, 1.4, 4.4], c: '#c9c2a8' });
        const v = R.range(0.6, 3.2) * R.sign(), ph = R.range(0, 6.28);
        reels.push({ p: [x - s * 1.72, 9.3, z - 1.55], axis: 'x', r: 1.3, v, ph }, { p: [x - s * 1.72, 9.3, z + 1.55], axis: 'x', r: 1.3, v: v * R.range(0.6, 1.1), ph: ph + 1 });
        const tone = R.pick(PAL), mode = R.pick([0, 2, 4]), ph2 = R();
        for (let c = 0; c < 8; c++) for (let r = 0; r < 2; r++) lamp(x - s * 1.75, 5 + r * 0.8, z - 2.45 + c * 0.7, tone, r, c, mode, ph2);
      }
      instanced(UNIT, panelMat, backs); instanced(UNIT, steel, frames); instanced(UNIT, panelMat, cabs);
      instanced(UNIT, keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 })), trim.map((t) => ({ c: '#3a3f4c', ...t })));
    }
    await ctx.yield();

    // ---- valve banks: low racks between the columns, each with two ranks of glowing valves; rings of lamps on the columns
    {
      const R = rng.fork('valves'), racks = [], valves = [], tops = [], grills = [];
      for (let i = 0; i + 1 < COLZ.length; i++) for (const s of [-1, 1]) {
        const z = COLZ[i] - 21;
        racks.push({ p: [s * 20, 2.2, z], s: [2.6, 4.4, 24] }, { p: [s * 20, 4.5, z], s: [3, 0.25, 24.6] });
        for (let k = 0; k < 15; k++) for (const o of [-0.65, 0.65]) { valves.push({ p: [s * 20 + o, 5.45, z - 10.5 + k * 1.5], s: [1, R.range(0.85, 1.2), 1] }); tops.push({ p: [s * 20 + o, 4.8, z - 10.5 + k * 1.5], s: [0.8, 0.4, 0.8] }); }
        for (let k = 0; k < 10; k++) grills.push({ p: [s * 20 - s * 1.33, 2.2, z - 10 + k * 2.2], s: [0.1, 3.2, 1.2] });
        const tone = R.pick(PAL), mode = R.pick([1, 2, 3]), ph = R();
        for (let c = 0; c < 28; c++) for (let r = 0; r < 2; r++) lamp(s * 20 - s * 1.42, 3.4 + r * 0.6, z - 10.8 + c * 0.8, tone, r, c, mode, ph);
      }
      instanced(UNIT, panelMat, racks); instanced(UNIT, steel, grills); instanced(UNIT, steel, tops);
      instanced(keep(new THREE.CapsuleGeometry(0.3, 0.75, 3, 8)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 0.7, 0.2) })), valves);
      for (const z of COLZ) for (const s of [-1, 1]) for (let y = 9; y < 62; y += 8.5) {
        const tone = R.pick(PAL), mode = R.pick([0, 1, 1, 5]), ph = R();
        for (let a = 0; a < 20; a++) { const th = a / 20 * Math.PI * 2; lamp(s * 20 + Math.cos(th) * 4.62, y, z + Math.sin(th) * 4.62, tone, 0, a * 2.2, mode, ph); }
      }
    }

    // ---- cable runs: trays along both walls, fat cables sagging from column to column, bundles dropping to the racks
    {
      const R = rng.fork('cables'), trays = [], cableMat = keep(new THREE.MeshStandardMaterial({ color: '#16181e', roughness: 0.7 }));
      const cables = [keep(new THREE.MeshStandardMaterial({ color: '#3a1614', roughness: 0.7 })), cableMat, keep(new THREE.MeshStandardMaterial({ color: '#1a2a3a', roughness: 0.7 })), keep(new THREE.MeshStandardMaterial({ color: '#3a3018', roughness: 0.7 }))];
      for (const s of [-1, 1]) {
        trays.push({ p: [s * (HALL_W - 2.4), 36.6, (FRONT_Z - 30 + CH_Z) / 2], s: [2.2, 0.3, CH_Z - FRONT_Z + 30] });
        for (let k = 0; k < 4; k++) trays.push({ p: [s * (HALL_W - 3.1 + k * 0.5), 37 + (k % 2) * 0.25, (FRONT_Z - 30 + CH_Z) / 2], s: [0.4, 0.4, Math.abs(CH_Z - FRONT_Z + 30)] });
        for (let z = FRONT_Z - 40; z > CH_Z; z -= 14) trays.push({ p: [s * (HALL_W - 2.4), 35.8, z], s: [2.6, 1.4, 0.3] });
      }
      instanced(UNIT, steel, trays.map((t) => ({ ...t, s: [Math.abs(t.s[0]), Math.abs(t.s[1]), Math.abs(t.s[2])] })));
      const tube = (pts, r, mat) => { const m = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), 20, r, 6)), mat); scene.add(m); };
      for (let i = 0; i + 1 < COLZ.length; i++) for (const s of [-1, 1]) {
        const z0 = COLZ[i], z1 = COLZ[i + 1];
        for (let k = 0; k < 3; k++) { const y = 62 - k * 4.5 + R.range(-1, 1), sag = R.range(3, 8), x = s * (20 + (k - 1) * 2.4); tube([[x, y, z0], [x, y - sag * 0.75, z0 - 10.5], [x, y - sag, z0 - 21], [x, y - sag * 0.75, z0 - 31.5], [x, y, z1]], R.range(0.28, 0.5), R.pick(cables)); }
        if (i % 2 === 0) tube([[s * 20, 52, z0 - 4], [s * 21.5, 30, z0 - 12], [s * 20.6, 12, z0 - 19], [s * 20, 4.6, z0 - 21]], 0.35, R.pick(cables));      // a drop to the rack
        if (i % 3 === 1) tube([[s * 20, 64, z0], [s * 12, 74, z0 - 3], [s * 4, 83, z0 - 5], [0, 85, z0 - 6]], 0.4, R.pick(cables));      // up into the vault
      }
    }
    await ctx.yield();

    // ---- catwalks along both walls at 40 m, two bridges across the nave at 62 m, and the technicians, who have stopped to watch
    {
      const R = rng.fork('catwalks'), deck = [], rail = [], rod = [];
      const coat = () => R.pick(['#e8e6de', '#dcd8cc', '#cfd6dc', '#e8e6de', '#b8c4d0']);
      const zc = (FRONT_Z - 40 + CH_Z) / 2, len = Math.abs(CH_Z - (FRONT_Z - 40));
      for (const s of [-1, 1]) {
        deck.push({ p: [s * 27, 39.8, zc], s: [3.6, 0.35, len] });
        rail.push({ p: [s * 25.3, 41.0, zc], s: [0.12, 0.12, len] }, { p: [s * 25.3, 40.5, zc], s: [0.08, 0.08, len] });
        for (let z = FRONT_Z - 40; z > CH_Z; z -= 3.5) rail.push({ p: [s * 25.3, 40.45, z], s: [0.1, 1.1, 0.1] });
        for (let z = FRONT_Z - 44; z > CH_Z; z -= 10.5) rod.push({ p: [s * 27.9, 38.2, z], s: [2, 0.25, 0.25], r: [0, 0, s * 0.7] });
        for (let z = FRONT_Z - 46; z > CH_Z + 4; z -= R.range(3, 13)) addFig(still, s * R.range(25.9, 27.6), 40, z, { c: coat(), arms: false, yaw: -s * 1.2 + R.range(-0.5, 0.5), s: R.range(0.9, 1.1) });
      }
      for (const z of [COLZ[4] - 21, COLZ[9] - 21]) {
        deck.push({ p: [0, 61.8, z], s: [50.4, 0.35, 4.4] });
        for (const o of [-2.1, 2.1]) { rail.push({ p: [0, 63.0, z + o], s: [50.4, 0.12, 0.12] }, { p: [0, 62.5, z + o], s: [50.4, 0.08, 0.08] }); for (let x = -25; x <= 25; x += 3.57) rail.push({ p: [x, 62.45, z + o], s: [0.1, 1.1, 0.1] }); }
        for (let x = -18; x <= 18; x += 9) for (const o of [-2.1, 2.1]) rod.push({ p: [x, 62 + (86 - 62) / 2 - Math.abs(x) * 0.25, z + o], s: [0.14, 24 - Math.abs(x) * 0.5, 0.14] });
        for (const s of [-1, 1]) deck.push({ p: [s * 26.2, 50.8, z], s: [1.6, 22, 0.3] });      // ladders down to the catwalks
        for (let k = 0; k < 9; k++) addFig(still, R.range(-17, 17), 62, z + R.range(-1.4, 1.4), { c: coat(), arms: false, yaw: R.range(-0.4, 0.4) + Math.PI, s: R.range(0.9, 1.1) });
      }
      // a few on the floor of the aisles, beside their cabinets
      for (let k = 0; k < 46; k++) { const s = R.sign(); addFig(still, s * R.range(24.6, 26.2), 0.3, R.range(FRONT_Z - 40, CH_Z + 10), { c: coat(), arms: false, yaw: -s * 1.4 + R.range(-0.5, 0.5) }); }
      instanced(UNIT, steel, deck); instanced(UNIT, steel, rail); instanced(UNIT, steel, rod);
    }

    // ---- the floor's guide lines, and the dusty light: the door's spill, and shafts from wells in the vault
    const shaftMat = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uCol: { value: new THREE.Color(0.5, 0.34, 0.16) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform vec3 uCol; uniform float uTime; varying vec2 vUv;
        void main() {
          float e = sin(vUv.x * 3.14159); float l = smoothstep(0.0, 0.2, vUv.y) * (0.25 + 0.75 * vUv.y);
          float n = 0.78 + 0.22 * sin(vUv.y * 46.0 + uTime * 0.7 + vUv.x * 9.0) * sin(vUv.x * 23.0 - uTime * 0.4);
          gl_FragColor = vec4(uCol * e * e * l * n, 1.0);
        }` }));
    {
      const strips = [];
      for (const s of [-1, 1]) strips.push({ p: [s * 7, 0.34, (FRONT_Z + CH_Z) / 2 - 20], s: [0.35, 0.06, CH_Z - FRONT_Z - 20] });
      for (const z of COLZ) strips.push({ p: [0, 0.34, z], s: [14, 0.06, 0.3] });
      instanced(UNIT, keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.6, 0.18) })), strips.map((t) => ({ ...t, s: t.s.map(Math.abs) })));
      const spillMat = keep(shaftMat.clone()); spillMat.uniforms.uTime = U.uTime; spillMat.uniforms.uCol.value = new THREE.Color(0.32, 0.2, 0.08);
      const spill = new THREE.Mesh(keep(new THREE.PlaneGeometry(40, 170)), spillMat);      // (its bright end toward the door)
      spill.rotation.x = -Math.PI / 2; spill.rotation.z = -0.16; spill.position.set(8, 0.5, FRONT_Z - 78); scene.add(spill);
      const sg = keep(new THREE.PlaneGeometry(7, 92)), wells = [];
      for (let i = 1; i + 1 < COLZ.length; i += 2) for (const s of [-1, 1]) {
        const g = new THREE.Group(); g.position.set(s * 12.5, 88.5, COLZ[i] - 21); g.rotation.z = s * 0.045; g.rotation.x = -0.1; scene.add(g);
        for (const ry of [0, Math.PI / 2]) { const m = new THREE.Mesh(sg, shaftMat); m.position.y = -46; m.rotation.y = ry; g.add(m); }
        wells.push({ p: [s * 12.5, 88.7, COLZ[i] - 21], s: [5, 0.2, 5] });
      }
      instanced(UNIT, keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.9) })), wells);
    }
    await ctx.yield();

    // =====================================================================================================
    // DEEP THOUGHT: the chamber, and the stepped console that fills its far end
    // =====================================================================================================
    const panelGlow = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.45, 0.5) }));
    const amberDim = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.5, 0.14) }));
    const screenMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1.3, 0.55) }));
    {
      const R = rng.fork('console'), END = FACE_Z - 40;
      // the chamber's shell
      for (const s of [-1, 1]) { box(s * CH_W, s * (CH_W + 0.8), 0, CH_H, CH_Z, END, dark); box(s * HALL_W, s * CH_W, 0, CH_H, CH_Z + 0.4, CH_Z - 0.4, dark); }
      box(-HALL_W, HALL_W, HALL_H - 0.4, CH_H, CH_Z + 0.4, CH_Z - 0.4, dark);
      box(-CH_W, CH_W, CH_H - 0.4, CH_H + 0.4, CH_Z, END, dark); box(-CH_W, CH_W, 0, 0.3, CH_Z, END, darker); box(-CH_W, CH_W, 0, CH_H, END, END - 1, dark);
      // coffers in its ceiling, pilasters up its walls
      const cof = [];
      for (let x = -60; x <= 60; x += 20) cof.push({ p: [x, CH_H - 1.4, (CH_Z + FACE_Z) / 2], s: [1.6, 2, CH_Z - FACE_Z] });
      for (let z = CH_Z - 12; z > FACE_Z; z -= 20) cof.push({ p: [0, CH_H - 1.4, z], s: [CH_W * 2, 2, 1.6] });
      for (const s of [-1, 1]) for (let z = CH_Z - 10; z > FACE_Z - 10; z -= 20) cof.push({ p: [s * (CH_W - 1.2), CH_H / 2, z], s: [2, CH_H, 4] });
      instanced(UNIT, steel, cof.map((t) => ({ ...t, s: t.s.map(Math.abs) })));

      // the console: a central tower with the face panel, three wings a side stepping down and back, each on a sloped desk
      const faces = [];      // { x0, x1, y0, y1, z } : the fronts that carry lamps
      const blk = [], fins = [], grille = [], desks = [], bezels = [], screens = [], dials = [], knobs = [];
      box(-15, 15, 0, 104, FACE_Z, END, panelMat); faces.push({ x0: -15, x1: 15, y0: 36, y1: 92, z: FACE_Z, centre: true });
      box(-17, 17, 0, 6, FACE_Z + 3, FACE_Z, steel);
      for (let x = -14; x <= 14; x += 1.75) fins.push({ p: [x, 108.5, FACE_Z - 12], s: [0.4, 9, 22] });
      for (const s of [-1, 1]) for (let i = 1; i <= 3; i++) {
        const x0 = 15 + (i - 1) * 18, x1 = 15 + i * 18, h = 104 - i * 20, z = FACE_Z - i * 7;
        box(s * x0, s * x1, 0, h, z, END, panelMat); faces.push({ x0: Math.min(s * x0, s * x1), x1: Math.max(s * x0, s * x1), y0: 22, y1: h - 18, z });
        blk.push({ p: [s * (x0 + x1) / 2, h + 0.6, (z + END) / 2], s: [x1 - x0 + 1, 1.2, Math.abs(END - z) + 1] });
        // the wing's shoulder, where it meets its taller neighbour: a return face with a lamp strip
        blk.push({ p: [s * x0, h / 2 + 10, z + 3.5], s: [0.8, h + 20, 7] });
        // ventilation fins along its top, a grille across its brow
        for (let x = x0 + 1.2; x < x1 - 0.5; x += 1.6) fins.push({ p: [s * x, h + 5, z - 11], s: [0.35, 8, 20] });
        for (let x = x0 + 1.4; x < x1 - 1; x += 0.9) grille.push({ p: [s * x, h - 9, z + 0.3], s: [0.3, 13, 0.7] });
        // the sloped desk at its foot, with a bank of keys, a screen above it and a row of dials
        desks.push({ p: [s * (x0 + x1) / 2, 4.2, z + 4.5], s: [x1 - x0 - 1, 1.2, 9.5], r: [0.42, 0, 0] }); blk.push({ p: [s * (x0 + x1) / 2, 2, z + 3], s: [x1 - x0 - 1, 4, 6] });
        for (let kx = x0 + 2; kx < x1 - 1.5; kx += 1.1) for (let kz = 0; kz < 5; kz++) knobs.push({ p: [s * kx, 3.55 + (4 - kz) * 0.66, z + 2.2 + kz * 1.45], s: [0.6, 0.3, 0.6], r: [0.42, 0, 0], c: R() < 0.2 ? '#c9a050' : R() < 0.3 ? '#a02a22' : '#d8d2c0' });
        for (const dx of [-4.2, 4.2]) { bezels.push({ p: [s * ((x0 + x1) / 2 + dx), 12.5, z + 0.3], s: [6.6, 5, 0.6] }); screens.push({ p: [s * ((x0 + x1) / 2 + dx), 12.5, z + 0.65], s: [5.6, 4, 0.1] }); }
        for (let dx = x0 + 2.4; dx < x1 - 1.5; dx += 3.4) dials.push({ p: [s * dx, 18.6, z + 0.3] });
        // two tape reels high on the wing
        const v = R.range(0.8, 2.6) * R.sign();
        for (const dx of [-3.6, 3.6]) reels.push({ p: [s * ((x0 + x1) / 2 + dx), h - 22, z + 0.5], axis: 'z', r: 2.6, v: v * R.range(0.7, 1.1), ph: R.range(0, 6.28) });
        bezels.push({ p: [s * (x0 + x1) / 2, h - 22, z + 0.15], s: [15, 7.5, 0.4] });
      }
      // the outermost corners, either side of the last wings
      for (const s of [-1, 1]) box(s * 69, s * CH_W, 0, 30, FACE_Z - 28, END, panelMat);
      instanced(UNIT, steel, blk.map((t) => ({ ...t, s: t.s.map(Math.abs) }))); instanced(UNIT, steel, fins); instanced(UNIT, steel, grille);
      instanced(UNIT, panelMat, desks); instanced(UNIT, darker, bezels); instanced(UNIT, screenMat, screens);
      instanced(UNIT, keep(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })), knobs);
      instanced(keep(new THREE.TorusGeometry(1.25, 0.16, 6, 18)), steel, dials);
      instanced(keep(new THREE.CircleGeometry(1.15, 18)), amberDim, dials.map((d) => ({ p: [d.p[0], d.p[1], d.p[2] + 0.05] })));
      instanced(UNIT, darker, dials.map((d) => ({ p: [d.p[0], d.p[1] + 0.3, d.p[2] + 0.12], s: [0.1, 1.0, 0.05], r: [0, 0, R.range(-1.1, 1.1)] })));

      // lamps over every face, in blocks, each block with its own manner
      for (const f of faces) {
        const manner = new Map();
        for (let x = f.x0 + 1.4; x <= f.x1 - 1.2; x += 0.95) for (let y = f.y0; y < f.y1; y += 1.25) {
          const bx = Math.floor((x - f.x0) / 5.8), by = Math.floor((y - f.y0) / 9), key = bx + by * 64;
          if (!manner.has(key)) manner.set(key, { mode: R.pick(MODES), tone: R() < 0.55 ? PAL[0] : R.pick(PAL), ph: R(), on: R() > 0.08 });
          const m = manner.get(key); if (!m.on) continue;
          const lx = (x - f.x0) - bx * 5.8, ly = (y - f.y0) - by * 9; if (lx < 0.5 || ly < 1.0) continue;      // gaps between the blocks
          if (f.centre && ((Math.abs(x) < 10.5 && y > 52 && y < 74) || (Math.abs(x) < 11.5 && y < 48.5))) continue;      // (the emblem's place)
          lamp(x, y, f.z + 0.55, m.tone, Math.round(ly / 1.25), Math.round(lx / 0.95), m.mode, m.ph);
        }
      }
      // lamp strips up the wings' shoulders and round the face panel
      for (const s of [-1, 1]) for (let i = 1; i <= 3; i++) for (let y = 8; y < 104 - i * 20 + 16; y += 1.4) lamp(s * (15 + (i - 1) * 18) + s * 0.45, y, FACE_Z - i * 7 + 6.6, PAL[0], y / 1.4, 0, 1, 0.3 + i * 0.1);
      for (let k = 0; k < 60; k++) { const t = k / 60; for (const s of [-1, 1]) lamp(s * 12.6, 6 + t * 28, FACE_Z + 0.6, PAL[0], k, 0, 3, 0.4); }

      // the great amber panel: its glow, its frame, the slats above it, and the emblem higher up
      const back = new THREE.Mesh(keep(new THREE.PlaneGeometry(19, 23)), amberDim); back.position.set(0, 20, FACE_Z + 0.35); scene.add(back);
      for (const [x, y, w, h] of [[0, 31.9, 21.6, 1.3], [0, 8.1, 21.6, 1.3], [-10.2, 20, 1.3, 25], [10.2, 20, 1.3, 25]]) { const f = new THREE.Mesh(UNIT, panelGlow); f.scale.set(w, h, 1.0); f.position.set(x, y, FACE_Z + 0.6); scene.add(f); }
      for (const [x, y, w, h] of [[0, 33.4, 24.6, 0.8], [0, 6.6, 24.6, 0.8], [-11.9, 20, 0.8, 27.6], [11.9, 20, 0.8, 27.6]]) box(x - w / 2, x + w / 2, y - h / 2, y + h / 2, FACE_Z, FACE_Z + 1.3, steel);
      const slats = []; for (let k = 0; k < 15; k++) slats.push({ p: [-9.8 + k * 1.4, 42, FACE_Z + 0.5], s: [0.8, 5 + 4 * Math.sin(k * 0.9) * Math.sin(k * 0.37 + 1), 0.3] });
      instanced(UNIT, panelGlow, slats.map((t) => ({ ...t, s: t.s.map(Math.abs) })));
      for (const [r, t] of [[9, 0.55], [6.2, 0.4], [3.2, 0.3]]) { const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(r, t, 8, 44)), panelGlow); ring.position.set(0, 63, FACE_Z + 0.6); scene.add(ring); }
      const iris = new THREE.Mesh(keep(new THREE.CircleGeometry(2.2, 24)), panelGlow); iris.position.set(0, 63, FACE_Z + 0.5); scene.add(iris);
      const disc = new THREE.Mesh(keep(new THREE.CircleGeometry(9, 40)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.1, 0.03) }))); disc.position.set(0, 63, FACE_Z + 0.4); scene.add(disc);

      // galleries along the chamber's sides, with their own watchers; cables down from the ceiling into the console's top
      const gal = [];
      for (const s of [-1, 1]) {
        gal.push({ p: [s * 66, 39.8, (CH_Z + FACE_Z - 21) / 2], s: [7, 0.4, Math.abs(FACE_Z - 21 - CH_Z)] }, { p: [s * 62.6, 41, (CH_Z + FACE_Z - 21) / 2], s: [0.14, 0.14, Math.abs(FACE_Z - 21 - CH_Z)] });
        for (let z = CH_Z - 4; z > FACE_Z - 18; z -= 3.5) gal.push({ p: [s * 62.6, 40.45, z], s: [0.1, 1.1, 0.1] });
        for (let z = CH_Z - 6; z > FACE_Z - 16; z -= R.range(1.6, 4)) addFig(still, s * R.range(63.4, 67), 40, z, { c: R.pick(['#e8e6de', '#dcd8cc', '#cfd6dc']), arms: false, yaw: -s * 1.3 + R.range(-0.4, 0.4) });
      }
      instanced(UNIT, steel, gal);
      const cableMat = keep(new THREE.MeshStandardMaterial({ color: '#14161c', roughness: 0.7 }));
      for (let k = 0; k < 12; k++) {
        const x = R.range(-62, 62), z0 = R.range(CH_Z - 20, FACE_Z + 20), top = 104 - Math.max(0, Math.ceil((Math.abs(x) - 15) / 18)) * 20;
        const m = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x * 0.9, CH_H - 1, z0), new THREE.Vector3(x * 0.95, (CH_H + top) / 2 + 6, (z0 + FACE_Z - 14) / 2 + 8), new THREE.Vector3(x, top + 8, FACE_Z - 10), new THREE.Vector3(x, top + 1, FACE_Z - 14)]), 18, R.range(0.35, 0.7), 6)), cableMat);
        scene.add(m);
      }

      // the desk and the two who wait
      const wood = keep(new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 0.55 }));
      box(-2.8, 2.8, 1.25, 1.5, -1353.2, -1350.8, wood); for (const [x, z] of [[-2.5, -1353], [2.5, -1353], [-2.5, -1351], [2.5, -1351]]) box(x - 0.12, x + 0.12, 0.3, 1.25, z - 0.12, z + 0.12, wood);
      box(-1.9, -0.5, 1.5, 1.54, -1352.6, -1351.6, keep(new THREE.MeshStandardMaterial({ color: '#e8e0c8', roughness: 0.9 })));
      const deskLamp = new THREE.Mesh(keep(new THREE.SphereGeometry(0.16, 8, 6)), panelGlow); deskLamp.position.set(1.9, 1.95, -1352.4); scene.add(deskLamp);
      box(1.86, 1.94, 1.5, 1.9, -1352.44, -1352.36, steel);
      const robeG = keep(new THREE.CylinderGeometry(0.2, 0.58, 1.75, 10)), hoodG = keep(new THREE.SphereGeometry(0.3, 10, 8)), sleeveG = keep(new THREE.CylinderGeometry(0.1, 0.16, 0.8, 6));
      [[-1.2, '#c8d4e8'], [1.2, '#d8c7a0']].forEach(([x, c], i) => {
        const m = keep(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })), g = new THREE.Group(); g.position.set(x, 0.3, -1348.4); scene.add(g);
        const robe = new THREE.Mesh(robeG, m); robe.position.y = 0.88; g.add(robe);
        const hood = new THREE.Mesh(hoodG, m); hood.position.y = 1.98; hood.scale.set(1, 1.1, 1.1); g.add(hood);
        for (const s of [-1, 1]) { const sl = new THREE.Mesh(sleeveG, m); sl.position.set(s * 0.36, 1.3, -0.12); sl.rotation.set(-0.5 - i * 0.3, 0, s * 0.3); g.add(sl); }
      });
      // a low rail of steps before the console, and the amber pool on the floor
      for (let k = 0; k < 3; k++) box(-34 + k * 3, 34 - k * 3, k * 0.5 + 0.3, k * 0.5 + 0.8, FACE_Z + 22 - k * 3, FACE_Z + 3, darker);
      const pool = new THREE.Mesh(keep(new THREE.CircleGeometry(60, 40)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.26, 0.07), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })));
      pool.rotation.x = -Math.PI / 2; pool.scale.set(0.7, 1, 1); pool.position.set(0, 2.1, FACE_Z + 50); scene.add(pool);
    }
    await ctx.yield();

    // ---- every lamp in one draw; every reel in two (the spool, and the bar across it that shows it turning)
    {
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(LC, 3)); g.setAttribute('aInfo', new THREE.Float32BufferAttribute(LI, 4));
      const pts = new THREE.Points(g, lampMat); pts.frustumCulled = false; scene.add(pts);
    }
    const spools = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(1, 1, 0.22, 20)), keep(new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 0.5 })), reels.length);
    const bars = new THREE.InstancedMesh(mergeGeos([new THREE.BoxGeometry(1.9, 0.3, 0.3), new THREE.BoxGeometry(0.3, 0.3, 1.9), new THREE.CylinderGeometry(0.34, 0.34, 0.34, 10)]), keep(new THREE.MeshStandardMaterial({ color: '#d8d2c0', roughness: 0.4 })), reels.length);
    keep(bars.geometry); spools.frustumCulled = false; bars.frustumCulled = false; scene.add(spools, bars);
    const QX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), QZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const AX = new THREE.Vector3(1, 0, 0), AZ = new THREE.Vector3(0, 0, 1);
    const turnReels = (time) => {
      for (let i = 0; i < reels.length; i++) {
        const r = reels[i];
        dummy.quaternion.setFromAxisAngle(r.axis === 'x' ? AX : AZ, r.ph + time * r.v).multiply(r.axis === 'x' ? QX : QZ);
        dummy.position.set(r.p[0], r.p[1], r.p[2]); dummy.scale.set(r.r, 1, r.r); dummy.updateMatrix(); spools.setMatrixAt(i, dummy.matrix);
        dummy.scale.set(r.r * 0.5, 1.2, r.r * 0.5); dummy.updateMatrix(); bars.setMatrixAt(i, dummy.matrix);
      }
      spools.instanceMatrix.needsUpdate = true; bars.instanceMatrix.needsUpdate = true;
      dummy.quaternion.identity(); dummy.rotation.set(0, 0, 0);
    };
    turnReels(0);
    await buildFigures(still, false);

    // the machine's own light: the panel's amber in the chamber, a second high on the console, cold fills up the hall
    const amber = new THREE.PointLight(0xffb050, 560, 900, 1); amber.position.set(0, 24, FACE_Z + 24); scene.add(amber);
    const amberHi = new THREE.PointLight(0xffa040, 260, 600, 1); amberHi.position.set(0, 70, FACE_Z + 40); scene.add(amberHi);
    const cold1 = new THREE.PointLight(0x7090ff, 80, 500, 1); cold1.position.set(0, 60, -900); scene.add(cold1);
    const cold2 = new THREE.PointLight(0x7090ff, 70, 500, 1); cold2.position.set(0, 60, -1150); scene.add(cold2);

    // ---- dust in the hall's light
    let motes = null;
    {
      const N = Math.round(2600 * detail), P = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { P[i * 3] = rng.range(-28, 28); P[i * 3 + 1] = rng.range(2, 84); P[i * 3 + 2] = rng.range(FRONT_Z - 5, FACE_Z + 10); }
      const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(P, 3));
      motes = new THREE.Points(g, keep(new THREE.PointsMaterial({ color: new THREE.Color(1.0, 0.75, 0.45), size: 0.3, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));
      scene.add(motes);
    }
    await ctx.yield();

    const size = new THREE.Vector2(), eye = new THREE.Vector3();
    const fogOut = new THREE.Color('#e2ad84'), fogIn = new THREE.Color('#1a1410'), bgOut = new THREE.Color('#e9b98a');
    function update(dt, time, camera) {
      U.uTime.value = time;
      if (ctx.renderer) { ctx.renderer.getDrawingBufferSize(size); U.uScale.value = size.y; }
      camera.getWorldPosition(eye);
      // inside the hall the day is left behind: the sky's light and the haze give way to the dark and the panel's amber
      const inside = Math.min(1, Math.max(0, (FRONT_Z + 10 - eye.z) / 100));
      hemi.intensity = 1.6 - 1.44 * inside; sunL.intensity = Math.PI * 0.95 * (1 - 0.95 * inside); fill.intensity = Math.PI * 0.18 * (1 - inside);
      scene.fog.color.copy(fogOut).lerp(fogIn, inside); scene.fog.density = 0.00042 + 0.0005 * inside;
      scene.background.copy(bgOut).lerp(fogIn, inside);
      // the panel breathes
      const breathe = 0.9 + 0.1 * Math.sin(time * 0.8);
      amber.intensity = 560 * breathe; amberHi.intensity = 260 * (1.9 - breathe);
      panelGlow.color.setRGB(2.4 * breathe, 1.45 * breathe, 0.5 * breathe);
      screenMat.color.setRGB(0.25, 1.15 + 0.2 * Math.sin(time * 7.0), 0.55);
      turnReels(time);
      if (motes) motes.position.y = Math.sin(time * 0.15) * 1.5;
      // the air: balloons ride up and down a little on their own breath, the airships go their slow way
      for (const b of balloons) { b.g.position.y = b.y + Math.sin(time * 0.25 + b.ph) * 5; b.fl.scale.setScalar(b.r * (0.07 + 0.05 * Math.max(0, Math.sin(time * 1.7 + b.ph * 3)))); }
      for (const a of airships) { a.g.position.x = a.x0 + a.v * time; a.g.position.y = a.y + Math.sin(time * 0.2 + a.ph) * 3; }
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
