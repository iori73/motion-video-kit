// Usage: node tools/study/extract.mjs <studyRoot> <video-name-without-.mp4> [more names...]
// Extracts frames using <studyRoot>/research/<name>/profile.json (see motion-profile.mjs):
//   every `interval` seconds, plus every native frame inside `fineWindows`.
// Output: <studyRoot>/screenshots/<name>/screenshot_0001.jpg ... (JPEG, 1280 wide, ~q90) and frames.tsv (index -> time).
// Safety: stops if free disk space is below 8 GB. Never deletes anything; refuses to write into a non-empty folder.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, statfsSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const MIN_FREE = 8 * 1024 ** 3;
const [root, ...names] = process.argv.slice(2);
for (const name of names) {
  const free = (() => { const s = statfsSync(root); return s.bavail * s.bsize; })();
  if (free < MIN_FREE) { console.error(`STOP: free space ${(free / 1024 ** 3).toFixed(1)} GB < 8 GB before ${name}`); process.exit(2); }
  const prof = JSON.parse(readFileSync(resolve(root, 'research', name, 'profile.json'), 'utf8'));
  const out = resolve(root, 'screenshots', name);
  if (existsSync(out) && readdirSync(out).length) { console.error(`SKIP ${name}: ${out} is not empty`); continue; }
  mkdirSync(out, {recursive: true});
  const K = Math.max(1, Math.round(prof.interval * prof.fps));
  const wins = prof.fineWindows.map(w => `between(n\\,${Math.floor(w.from * prof.fps)}\\,${Math.ceil(w.to * prof.fps)})`);
  const sel = ['not(mod(n\\,' + K + '))', ...wins].join('+');
  const vf = `select='${sel}',showinfo,scale=1280:-2`;
  const src = ['.mp4', '.webm', '.mov'].map(e => resolve(root, 'videos', name + e)).find(existsSync);
  if (!src) { console.error(`FAILED ${name}: no videos/${name}.(mp4|webm|mov)`); process.exit(1); }
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', src,'-an', '-vf', vf, '-fps_mode', 'passthrough', '-q:v', '3', resolve(out, 'screenshot_%04d.jpg')], {encoding: 'utf8', maxBuffer: 1 << 28});
  if (r.status !== 0) { console.error(`FAILED ${name}: ${r.stderr.split('\n').slice(-4).join(' | ')}`); process.exit(1); }
  const rows = ['index\ttime_s'];
  let idx = 0;
  for (const line of r.stderr.split('\n')) {
    const m = /pts_time:([0-9.]+)/.exec(line);
    if (m && line.includes('showinfo') && line.includes(' n:')) rows.push(`${++idx}\t${(+m[1]).toFixed(3)}`);
  }
  writeFileSync(resolve(out, 'frames.tsv'), rows.join('\n') + '\n');
  const files = readdirSync(out).filter(f => f.endsWith('.jpg')).length;
  console.log(`${name}: ${files} frames (interval ${prof.interval}s${prof.fineWindows.length ? ` + ${prof.fineWindows.length} fine window(s)` : ''}), index rows ${idx}`);
}
