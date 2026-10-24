// Renders a built scene.html to JPEG sub-frames (4 per output frame, 180-degree shutter) for real motion blur.
// Usage: node engine/html/render.mjs <scene.html> <outDir> [--from <sec>] [--to <sec>]
// Writes <outDir>/00000.jpg ..., events.json and meta.json (fps, duration, range).
import puppeteer from 'puppeteer-core';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const [html, out] = args;
const opt = n => { const i = args.indexOf(n); return i >= 0 ? parseFloat(args[i + 1]) : undefined; };
const SUB = 4, SHUTTER = 0.5, WORKERS = 4;
mkdirSync(out, {recursive: true});

const b = await puppeteer.launch({executablePath: CHROME, headless: true, defaultViewport: {width: 1920, height: 1080}});
const first = await b.newPage();
await first.goto('file://' + resolve(html));
const info = await first.evaluate(() => ({meta: window.__SPEC__.meta, events: window.EVENTS}));
const {w, h, fps, duration} = info.meta;
const from = opt('--from') ?? 0, to = opt('--to') ?? duration;
const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
writeFileSync(`${out}/events.json`, JSON.stringify(info.events));
writeFileSync(`${out}/meta.json`, JSON.stringify({fps, duration, from, to, w, h, sub: SUB}));
await first.close();

const total = (f1 - f0) * SUB;
async function worker(k) {
  const p = await b.newPage();
  await p.setViewport({width: w, height: h});
  await p.goto('file://' + resolve(html));
  for (let n = k; n < total; n += WORKERS) {
    const f = f0 + Math.floor(n / SUB), s = n % SUB;
    const t = (f + (s - (SUB - 1) / 2) * (SHUTTER / SUB)) / fps;
    await p.evaluate(x => seek(x), Math.max(0, t));
    await p.screenshot({path: `${out}/${String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92});
  }
}
await Promise.all(Array.from({length: WORKERS}, (_, k) => worker(k)));
await b.close();
console.log('sub-frames', total, `(${from}s-${to}s @ ${fps}fps)`);
