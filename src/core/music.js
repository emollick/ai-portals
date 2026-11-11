// Music from files, for a broadcast of the flight: one track per world, crossed at every portal (the page's wiring calls world()
// where it calls the generated sound's). Asked for in the link (?stream=1 or ?music=1) and not loaded otherwise. The tracks are
// listed in music/tracks.json, or in the list a link names (?music=https://.../tracks.json: the files are found beside that list).
//   { "tracks": [ "night-drive.mp3", { "file": "chrome-sunset.mp3", "title": "Chrome Sunset", "start": 20 } ] }
// A world lasts 40 to 50 seconds and a song a few minutes, so a track does not begin at its first bar: it comes in somewhere in
// its first half (or at its own "start", in seconds), and fades out at the next portal. Every track is played once before any
// comes round again. The volume is set on the audio elements themselves, so files on another host need no CORS headers.
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nameOf = (file) => decodeURIComponent(String(file).split(/[?#]/)[0].split('/').pop()).replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();

export async function createMusic(opt = {}) {
  const listUrl = new URL(opt.list || './music/tracks.json', location.href);
  const res = await fetch(listUrl, { cache: 'no-cache' });
  if (!res.ok) throw new Error('no track list at ' + listUrl + ' (' + res.status + ')');
  const data = await res.json();
  const tracks = (Array.isArray(data) ? data : data.tracks || []).map((t) => (typeof t === 'string' ? { file: t } : t)).filter((t) => t && t.file)
    .map((t) => ({ ...t, src: new URL(t.file, listUrl).href, title: t.title || nameOf(t.file) }));
  if (!tracks.length) throw new Error('the track list at ' + listUrl + ' is empty');
  const FADE = opt.fade ?? 4, VOL = Math.min(1, Math.max(0, opt.volume ?? 0.85)), intro = opt.intro === true;   // intro: every track from its first bar

  let bag = [], last = null, cur = null, seen = null, failed = 0, waiting = false;
  const draw = () => {
    if (!bag.length) { bag = shuffle(tracks.slice()); if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop()); }   // the same song never twice running
    return (last = bag.pop());
  };
  // equal power, as the generated sound crosses: the old track falls as a cosine while the new one rises as a sine
  const ramp = (p, to, secs, then) => {
    clearInterval(p.timer); const from = p.el.volume, t0 = performance.now();
    p.timer = setInterval(() => {
      const x = Math.min(1, (performance.now() - t0) / (secs * 1000)), k = to > from ? Math.sin(x * Math.PI / 2) : 1 - Math.cos(x * Math.PI / 2);
      p.el.volume = Math.min(1, Math.max(0, from + (to - from) * k));
      if (x >= 1) { clearInterval(p.timer); if (then) then(); }
    }, 40);
  };
  const live = new Set();   // the tracks that can be heard: the one playing, and any still fading out
  const drop = (p) => { live.delete(p); clearInterval(p.timer); p.el.pause(); p.el.removeAttribute('src'); p.el.load(); };
  // a track made ready: its file is asked for and its place found now, so that it can start on the beat of the crossing
  function make(track) {
    const el = new Audio(), p = { el, track, timer: 0, top: false };
    el.preload = 'auto'; el.volume = 0; el.src = track.src;
    el.addEventListener('loadedmetadata', () => {
      const d = el.duration; if (p.top || intro || !Number.isFinite(d)) return;
      const at = typeof track.start === 'number' ? track.start : d > 90 ? d * (0.12 + 0.4 * Math.random()) : 0;
      if (at > 0 && at < d - 20) el.currentTime = at;
    }, { once: true });
    // a song that ends inside a world (a slow pace, a long wait at a portal): the next one, from its top
    el.addEventListener('ended', () => { const mine = cur === p; drop(p); if (mine) { const n = take(); n.top = true; try { n.el.currentTime = 0; } catch (e) {} start(n); } });
    el.addEventListener('error', () => {
      if (ready === p) { ready = null; return drop(p); }
      if (cur !== p) return;
      drop(p); if (++failed < tracks.length) { console.warn('music: could not play ' + track.src); start(make(draw())); }
    });
    return p;
  }
  let ready = null;   // the track for the next world, loading while this one plays
  const take = () => { const p = ready || make(draw()); ready = null; return p; };
  function start(p) {
    const before = cur; cur = p;
    p.el.play().then(() => {
      failed = 0; waiting = false;
      if (cur !== p) return drop(p);   // the next portal came before this one could start
      // everything that was sounding goes out as this comes in (whatever started and was passed over meanwhile included)
      const others = [...live]; live.add(p);
      ramp(p, VOL, others.length ? FADE : 1.5);
      for (const o of others) ramp(o, 0, FADE, () => drop(o));
      if (!ready) ready = make(draw());
    }).catch((e) => {
      const mine = cur === p; drop(p);
      // the browser plays nothing until the page has been clicked (a capture browser is started with autoplay allowed): the
      // first click or key starts it. The track that was playing, if any, plays on meanwhile.
      if (mine && e && e.name === 'NotAllowedError') { waiting = true; cur = before && live.has(before) ? before : null; bag.push(p.track); console.warn('music: waiting for a click (autoplay is not allowed in this browser)'); }
    });
    return p.track;
  }
  const unlock = () => { if (waiting && seen) { waiting = false; start(take()); } };
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

  return {
    tracks,
    get now() { return cur ? cur.track : null; },
    // called at every world: the same world twice changes nothing. Returns the track that is starting.
    world(W) { if (!W || W === seen) return cur ? cur.track : null; seen = W; return start(take()); },
    stop() { cur = null; for (const p of [...live]) ramp(p, 0, 0.6, () => drop(p)); },
  };
}
