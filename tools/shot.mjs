// Renders two stills of each named world from the local server (npm start) into shots/. Usage: node tools/shot.mjs <world-id> ...
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const ids = process.argv.slice(2), out = new URL('../shots/', import.meta.url).pathname;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const id of ids) {
  for (const u of [0.15, 0.55]) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    try {
      await p.goto(`http://127.0.0.1:8000/?world=${id}&freeze&quality=low&pr=1&u=${u}&t=10`);
      await p.waitForFunction('window.__shotReady || window.__shotError || (window.__errors||[]).length', null, { timeout: 150000 });
      const err = await p.evaluate('window.__shotError || (window.__errors||[]).join(";")');
      await p.screenshot({ path: `${out}${id}-${u}.png` });
      console.log(id, u, err ? 'ERROR ' + err : 'ok', errs.slice(0, 3).join(' | ').slice(0, 400));
    } catch (e) { console.log(id, u, 'FAIL', String(e).slice(0, 200), errs.slice(0, 3).join(' | ').slice(0, 400)); }
    await p.close();
  }
}
await b.close();
