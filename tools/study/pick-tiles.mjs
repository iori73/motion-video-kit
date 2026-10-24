// Usage: node tools/study/pick-tiles.mjs <video.mp4> <profile.json> <outDir> [maxTiles=60]
// Picks one representative frame per shot (just after every hard cut) plus regular samples inside long shots,
// then cuts them from the video (1280 px wide JPEG). For contact sheets / reference libraries (e.g. a Figma file).
// Output: <outDir>/tile_001.jpg ... and tiles.tsv (index, time_s). Deterministic.
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const [video, profilePath, outDir, maxArg] = process.argv.slice(2);
const prof = JSON.parse(readFileSync(profilePath, 'utf8'));
const MAX = parseInt(maxArg || '60', 10);
const dur = prof.duration;
const picks = [Math.min(0.15, dur / 2)];
for (const c of prof.cuts) picks.push(Math.min(dur - 0.05, c + 0.2));
const step = Math.max(1.0, dur / 14);
for (let t = step; t < dur - 0.2; t += step) picks.push(t);
picks.sort((a, b) => a - b);
let tiles = [];
for (const t of picks) if (!tiles.length || t - tiles.at(-1) >= 0.4) tiles.push(+t.toFixed(3));
if (tiles.length > MAX) { const k = tiles.length / MAX; tiles = Array.from({length: MAX}, (_, i) => tiles[Math.floor(i * k)]); }
mkdirSync(outDir, {recursive: true});
const rows = ['index\ttime_s'];
tiles.forEach((t, i) => {
  const n = String(i + 1).padStart(3, '0');
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(t), '-i', video, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', resolve(outDir, `tile_${n}.jpg`)]);
  if (r.status !== 0) { console.error('ffmpeg failed at', t); process.exit(1); }
  rows.push(`${i + 1}\t${t}`);
});
writeFileSync(resolve(outDir, 'tiles.tsv'), rows.join('\n') + '\n');
console.log(`${prof.file}: ${tiles.length} tiles (cuts ${prof.cuts.length}, step ${step.toFixed(2)}s)`);
