// Writes music/tracks.json, the list the broadcast's music reads (src/core/music.js), from the audio files in music/.
// Usage: npm run tracks      Titles and start times already set by hand in the list are kept.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'music'), out = path.join(dir, 'tracks.json');
if (!fs.existsSync(dir)) { console.error('there is no folder named music yet: make one at the top of the repository and put the songs in it'); process.exit(1); }
let old = []; try { const d = JSON.parse(fs.readFileSync(out, 'utf8')); old = (Array.isArray(d) ? d : d.tracks || []).map((t) => (typeof t === 'string' ? { file: t } : t)); } catch (e) {}
const walk = (d, rel = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), rel + e.name + '/') : [rel + e.name]));
const files = walk(dir).filter((f) => /\.(mp3|m4a|ogg|wav|flac)$/i.test(f)).sort((a, b) => a.localeCompare(b));
const title = (f) => f.split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
const enc = (f) => f.split('/').map(encodeURIComponent).join('/');
const tracks = files.map((f) => { const was = old.find((t) => t.file === enc(f) || t.file === f) || {}; return { ...was, file: enc(f), title: was.title || title(f) }; });
fs.writeFileSync(out, JSON.stringify({ tracks }, null, 2) + '\n');
console.log(tracks.length + ' tracks listed in music/tracks.json' + (tracks.length ? '' : ' (no audio files were found in music/)'));
