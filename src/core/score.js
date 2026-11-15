// The score: a piece of music written afresh for every world, in place of the old held chord and stray bells (audio.js keeps those
// for the antechamber, and for anyone who asks for them with createAudio({ classic: true })).
//
// What it is made of, all in the world's own key and scale (c.sc, c.hz):
//   a pad of four voices that moves through a chord progression, each voice gliding to the nearest note of the next chord;
//   a bass under it that swells on each change of chord;
//   a lead that plays a motif made from the world's seed, coming back changed (moved onto the chord, turned upside down, thinned);
//   a soft plucked arpeggio of the chord, which comes in as the flight gets going;
//   a few high glass notes, a strum to greet each world, and a rising wash of air as the portal comes near.
// The kind of place sets the tempo, the progression and the lead's voice (CHAR); how light and how warm the world looks (its
// registry `tone`, [light, warm]) sets the register and the brightness; a calm world plays slower and thinner. How far through the
// world the flight is (0 to 1) shapes the piece: sparse on arrival, full in the middle, swelling into the portal, quiet on a pause.
import { mulberry } from './sound-layers.js';

// One character per kind of place. prog: chords as scale degrees (0 is the world's root). lead: the voice of the melody.
// energy: how busy the arpeggio and the melody get at their fullest (0 to 1).
const CHAR = {
  wilderness: { bpm: 66, energy: 0.55, lead: 'flute', prog: [0, 3, 5, 4] },
  ocean: { bpm: 58, energy: 0.4, lead: 'glass', prog: [0, 4, 5, 3] },
  sky: { bpm: 62, energy: 0.5, lead: 'choir', prog: [0, 1, 4, 3] },        // lydian: the raised fourth's chord on degree 1 is the lift
  city: { bpm: 76, energy: 0.7, lead: 'reed', prog: [0, 3, 1, 4] },
  interior: { bpm: 64, energy: 0.4, lead: 'glass', prog: [0, 5, 3, 4] },
  domestic: { bpm: 68, energy: 0.45, lead: 'flute', prog: [0, 3, 4, 0] },
  alien: { bpm: 54, energy: 0.45, lead: 'choir', prog: [0, 2, 4, 1] },
  bizarre: { bpm: 72, energy: 0.6, lead: 'glass', prog: [0, 3, 6, 2] },
  prehistoric: { bpm: 52, energy: 0.5, lead: 'reed', prog: [0, 3, 2, 0] },
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pc = (s) => ((s % 12) + 12) % 12;
// a pitch glide as a held value and a straight ramp from it (the score uses no setTargetAtTime: chains of it, and a first one
// on a node made after the context has been running, are misread by at least one Web Audio implementation; ramps are read alike by all)
const glide = (param, from, to, t, secs) => { param.setValueAtTime(from, t); param.linearRampToValueAtTime(to, t + secs); };
// the same for the slow moves of filters and levels: each param remembers where its last ramp ended
const mover = () => { const last = new Map(); return (param, to, t, secs) => { const from = last.has(param) ? last.get(param) : param.value; last.set(param, to); glide(param, from, to, t, secs); }; };

// G: the world's group (sound-layers.js). c: its tuning from audio.js config(). ctx: { progress(now) -> 0..1 or null,
// paused() -> bool, manual: true to leave the clock to the caller (the test renderer calls tick itself) }.
export function score(G, c, ctx = {}) {
  const has = (p) => !ctx.parts || ctx.parts.includes(p);   // the test renderer listens to one part at a time
  const move = mover(), ac = G.ac, sc = c.sc, L = sc.length, ch = CHAR[c.kind] || CHAR.wilderness;
  const rnd = mulberry(((c.seed >>> 0) ^ 0x5bd1e995) >>> 0), pick = (a) => a[Math.floor(rnd() * a.length)];
  const gn = Math.pow(10, (c.gain || 0) / 20), light = c.light ?? 0.5, warm = c.warm ?? 0;
  const energy = clamp(ch.energy - (c.calm ? 0.15 : 0) + 0.1 * (c.weird || 0), 0.15, 0.9);
  const bpm = ch.bpm * (0.94 + 0.12 * rnd()) * (c.calm ? 0.92 : 1), step = 30 / bpm;   // one step is an eighth note
  const barsPer = bpm < 60 ? 1 : 2, chordSteps = 8 * barsPer;
  // the progression: the kind's, with its middle two chords swapped in about half the worlds
  const prog = ch.prog.slice(); if (rnd() < 0.5 && prog.length > 3) [prog[1], prog[2]] = [prog[2], prog[1]];
  const semi = (n) => sc[((n % L) + L) % L] + 12 * Math.floor(n / L);   // scale index -> semitones above the root
  const chordOf = (deg) => [deg, deg + 2, deg + 4].map(semi);

  // ---- the pad: four voices, two soft reeds each, gliding from chord to chord ----
  const padLp = G.filter('lowpass', 500 + 1700 * c.bright, 0.5), padO = G.gain(0.11 * gn);
  G.mod(G.osc('sine', 0.045 + 0.03 * rnd()), 120 + 400 * c.bright, padLp.frequency);
  const voices = [0, -0.4, 0.4, 0.2].map((pan, i) => {
    const v = G.gain(0.5), a = G.osc(c.wave || 'triangle', c.hz(12)), b = G.osc(c.wave || 'triangle', c.hz(12));
    G.chain(a, v); G.chain(b, v); G.chain(v, G.pan(pan), padLp); G.mod(G.osc('sine', 0.03 + 0.05 * rnd()), 0.16, v.gain);
    return { a, b, semi: null, df: 0.12 + 0.08 * i };
  });
  G.chain(padLp, padO); if (has('pad')) G.out(padO, 0.45);
  function voiceTo(tones, t, first) {
    const used = new Set(), start = [12, 16, 19, 24];
    voices.forEach((v, i) => {
      const want = v.semi ?? start[i]; let best = want, bd = Infinity;
      for (const tone of tones) for (let k = 0; k <= 3; k++) {
        const s = pc(tone) + 12 * k; if (s < 7 || s > 31) continue;
        const d = Math.abs(s - want) + (i < 3 && used.has(pc(s)) ? 24 : 0);   // the first three voices take three different notes of the chord
        if (d < bd) { bd = d; best = s; }
      }
      const from = v.semi ?? best; used.add(pc(best)); v.semi = best;
      for (const [o, df] of [[v.a, 0], [v.b, v.df]]) glide(o.frequency, c.hz(from) + df, c.hz(best) + df, t, first ? 0.01 : 0.9);
    });
  }

  // ---- the bass: a low sine and its octave (for speakers with no low end), re-sounded at each chord ----
  const bassA = G.osc('sine', c.hz(-12)), bassB = G.osc('sine', c.hz(0)), bassE = G.gain(0), bassO = G.gain(0.11 * gn);
  G.chain(bassA, bassE); G.chain(bassB, G.gain(0.35), bassE); G.chain(bassE, bassO); if (has('bass')) G.out(bassO, 0.1);
  let bassAt = null;
  function bassTo(root, t, I, first) {
    let s = pc(root); if (s > 7) s -= 12;
    const from = bassAt ?? s; bassAt = s;
    for (const [o, k] of [[bassA, -12], [bassB, 0]]) glide(o.frequency, c.hz(from + k), c.hz(s + k), t, first ? 0.01 : 0.15);
    const peak = 0.35 + 0.65 * I; move(bassE.gain, peak, t, 0.15); move(bassE.gain, peak * 0.6, t + 0.6, 1.8);
  }

  // ---- the lead's voices ----
  const leadO = G.gain(0.15 * gn); if (has('lead')) G.out(leadO, 0.8);
  const leadLp = G.filter('lowpass', 2600 + 2400 * light - 900 * warm, 0.4); G.chain(leadLp, leadO);
  function note(kind, semiTone, t, dur, vel, dest = leadLp) {
    const f = c.hz(semiTone), e = G.env(), p = G.spot((rnd() - 0.5) * 0.6); G.chain(e, p, dest);
    const all = [e, p], tail = kind === 'glass' ? 2.6 : kind === 'choir' ? 1.4 : 0.6, end = t + dur + tail;
    const keep = (...n) => (all.push(...n), n[0]);
    if (kind === 'glass') {   // a struck glass: a sine moved by another at 3.5 times its pitch, the movement dying away first
      const car = keep(G.tone('sine', f, t, end)), mod = keep(G.tone('sine', f * 3.5, t, end)), mg = keep(G.env(0));
      mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.6); G.chain(mod, mg, car.frequency); car.connect(e);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel, t + 0.006); e.gain.exponentialRampToValueAtTime(0.0005, end - 0.05);
    } else {
      const vib = keep(G.tone('sine', 4.6 + rnd(), t, end)), vg = keep(G.env(0));
      vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(kind === 'choir' ? 6 : 11, t + Math.min(0.6, dur * 0.7)); vib.connect(vg);   // the vibrato comes in late, in cents
      const oscs = [];
      if (kind === 'flute') {
        oscs.push([keep(G.tone('sine', f, t, end)), 1], [keep(G.tone('sine', f * 2, t, end)), 0.14], [keep(G.tone('sine', f * 3, t, end)), 0.04]);
        const br = keep(ac.createBufferSource()), bp = keep(G.env(0)), bf = keep(ac.createBiquadFilter());   // the breath on the front of the note
        br.buffer = G.K.buf('pink'); bf.type = 'bandpass'; bf.frequency.value = f * 2; bf.Q.value = 1.2;
        bp.gain.setValueAtTime(0.3 * vel, t); bp.gain.exponentialRampToValueAtTime(0.001, t + 0.18); br.start(t, rnd() * 4, 0.25); G.chain(br, bf, bp, e);
      } else if (kind === 'reed') {
        const o = keep(G.tone('sine', f, t, end)); if (c.wave) o.setPeriodicWave(c.wave); oscs.push([o, 1]);
      } else {   // choir: three saws a few cents apart, heard through the two formants of an open "ah"
        for (const d of [-7, 0, 7]) { const o = keep(G.tone('sawtooth', f, t, end)); o.detune.value = d; oscs.push([o, 0.33]); }
      }
      for (const [o, a] of oscs) {
        vg.connect(o.detune);
        if (kind === 'choir') { for (const [ff, q, fa] of [[700, 5, 1], [1150, 6, 0.6]]) { const bf = keep(ac.createBiquadFilter()), g = keep(G.env(a * fa * 2.2)); bf.type = 'bandpass'; bf.frequency.value = ff; bf.Q.value = q; G.chain(o, bf, g, e); } }
        else { const g = keep(G.env(a)); G.chain(o, g, e); }
      }
      const att = kind === 'choir' ? 0.35 : kind === 'reed' ? 0.05 : 0.08;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel, t + att); e.gain.linearRampToValueAtTime(vel * 0.75, t + Math.max(att + 0.02, dur));
      e.gain.exponentialRampToValueAtTime(0.0005, t + dur + tail * 0.85);
    }
    G.shot(end, ...all);
  }
  // the plucked arpeggio: a triangle and its octave, quick to die, through a filter that opens as the world fills
  const arpO = G.gain(0.14 * gn), arpLp = G.filter('lowpass', 900, 0.7); G.chain(arpLp, arpO); if (has('arp')) G.out(arpO, 0.5);
  function pluck(semiTone, t, vel) {
    const f = c.hz(semiTone), a = G.tone('triangle', f, t, t + 1.2), b = G.tone('sine', f * 2, t, t + 1.2), bg = G.env(0.25), e = G.env(0), p = G.spot((rnd() - 0.5) * 0.8);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vel, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0005, t + 1.1);
    a.connect(e); G.chain(b, bg, e); G.chain(e, p, arpLp); G.shot(t + 1.2, a, b, bg, e, p);
  }
  // the air before the portal: noise through a band that climbs as the opening comes near
  const riseBp = G.filter('bandpass', 300, 1.4), riseO = G.gain(0); G.chain(G.noise('pink'), riseBp, riseO); if (has('rise')) G.out(riseO, 0.7);

  // ---- the motif: four to seven notes from the seed, at most two bars ----
  const motif = []; { let pos = 0, deg = 0; const n = 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < n && pos < 13; i++) { const len = pick([1, 2, 2, 2, 3, 4]); motif.push({ at: pos, deg, len }); pos += len; deg = clamp(deg + pick([-2, -1, -1, 1, 1, 2, 0, 3, -3]), -4, 6); }
    motif[motif.length - 1].len += 2; }
  const lift = Math.round((light - 0.5) * L);   // light worlds sing higher, dark ones lower
  let phrase = null, restUntil = 2 * 8, takes = 0;   // the melody waits two bars on arrival
  function newPhrase(s0, chordDeg) {
    const turn = takes > 0 && rnd() < 0.3, thin = rnd() < 0.25 * (1 - energy), base = 2 * L + lift + chordDeg; takes++;
    const ev = motif.filter((m, i) => !thin || i % 2 === 0 || i === motif.length - 1).map((m) => ({ at: s0 + m.at, semi: semi(base + (turn ? -m.deg : m.deg)), len: m.len }));
    if (takes > 1 && rnd() < 0.35) { const lastN = ev[ev.length - 1], tones = chordOf(chordDeg).map((s) => s + 24 + 12 * Math.round((light - 0.5))); lastN.semi = tones.reduce((a, b) => (Math.abs(b - lastN.semi) < Math.abs(a - lastN.semi) ? b : a)); }   // land on the chord
    const endAt = ev[ev.length - 1].at + ev[ev.length - 1].len; return { ev, endAt };
  }

  // ---- the clock ----
  const t0 = ac.currentTime + 0.12, dur = c.duration || 45, arpPat = pick([[0, 1, 2, 3], [0, 2, 1, 3], [0, 1, 2, 1], [0, 2, 3, 2]]);
  let next = t0, s = 0, I = 0.15, tones = chordOf(prog[0]), chordDeg = prog[0];
  const progress = (now) => { const p = ctx.progress && ctx.progress(); return p == null || !isFinite(p) ? clamp((now - t0) / dur, 0, 1) : clamp(p, 0, 1); };
  function doStep(t, u, paused) {
    const want = paused ? 0.05 : 0.15 + 0.85 * smooth(0.03, 0.55, u), swell = paused ? 0 : smooth(0.8, 0.985, u);
    I += (want - I) * 0.12;
    const bar8 = s % 8, Iarp = I * (0.4 + energy), Imel = I * (0.6 + 0.6 * energy);
    if (s % chordSteps === 0) {
      chordDeg = prog[Math.floor(s / chordSteps) % prog.length]; tones = chordOf(chordDeg);
      voiceTo(tones, t, s === 0); bassTo(tones[0], t, I, s === 0);
      move(padLp.frequency, (500 + 1700 * c.bright) * (0.8 + 0.6 * I + 0.5 * swell), t, 3);
      move(arpLp.frequency, (700 + 2600 * Iarp + 1500 * swell) * (1 - 0.2 * warm), t, 2);
      move(padO.gain, 0.11 * gn * (0.85 + 0.25 * swell), t, 3);
      if (I > 0.5 && rnd() < 0.35) note('glass', pick(tones) + 36, t + step * (2 + Math.floor(rnd() * 4)), 0.1, 0.25);   // a high glass note now and then
    }
    if (s % 4 === 0) { move(riseO.gain, 0.09 * gn * swell * swell, t, step * 4); move(riseBp.frequency, 300 + 3200 * swell, t, step * 4); }
    // arpeggio: eighths when busy, quarters when calm, thinning out at random as the intensity drops
    if (Iarp > 0.35 && (energy >= 0.45 || bar8 % 2 === 0) && rnd() < Iarp) {
      const i = arpPat[s % arpPat.length], reg = 12 + 12 * Math.round(light);
      pluck((i === 3 ? tones[0] + 12 : tones[i]) + reg, t, (bar8 === 0 ? 0.9 : bar8 % 2 ? 0.45 : 0.65) * (0.7 + 0.3 * rnd()));
    }
    // melody: a phrase starts on a bar's first step, then a rest of one or two bars
    if (!phrase && s >= restUntil && bar8 === 0 && Imel > 0.3 && rnd() < 0.5 + 0.5 * Imel) phrase = newPhrase(s, chordDeg);
    if (phrase) {
      for (const e of phrase.ev) if (e.at === s) note(ch.lead, e.semi, t, e.len * step * 0.95, 0.6 + 0.3 * rnd());
      if (s >= phrase.endAt) { phrase = null; restUntil = s + 8 * (1 + Math.floor(rnd() * 2)) * (u > 0.85 ? 4 : 1); }   // little new melody in the swell
    }
    s++;
  }
  // a strum to greet the world: its first chord, low to high, spread over half a second
  if (ctx.welcome !== false) chordOf(prog[0]).concat(chordOf(prog[0]).map((x) => x + 12)).forEach((x, i) => note('glass', x + 12 + 12 * Math.round(light), t0 + 0.4 + i * 0.09, 0.1, 0.28 - i * 0.02));
  const tick = (now = ac.currentTime) => { const look = ctx.lookahead ?? 1.2, u = progress(now), paused = !!(ctx.paused && ctx.paused()); while (next < now + look) { doStep(next, u, paused); next += step; } };
  if (!ctx.manual) G.every(0.1, 0.1, () => tick(), 0.01);
  return { tick, bpm, prog, motif };
}
