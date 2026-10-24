// Usage: node engine/html/snap.mjs <scene.html> <outDir> <t1> <t2> ...
// Screenshots a built scene at the given times (seconds). Uses the system Chrome via puppeteer-core.
import puppeteer from 'puppeteer-core';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [html, out, ...ts] = process.argv.slice(2);
mkdirSync(out, {recursive: true});
const b = await puppeteer.launch({executablePath: CHROME, headless: true, defaultViewport: {width: 1920, height: 1080}});
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('file://' + resolve(html));
const size = await p.evaluate(() => [window.__SPEC__.meta.w, window.__SPEC__.meta.h]);
await p.setViewport({width: size[0], height: size[1]});
for (const t of ts) {
  await p.evaluate(x => seek(x), parseFloat(t));
  await p.screenshot({path: `${out}/snap_${t}.jpg`, type: 'jpeg', quality: 90});
}
await b.close();
