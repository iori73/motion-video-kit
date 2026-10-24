// Usage: node tools/study/profile-all.mjs <studyRoot> <video1.mp4> [video2.mp4 ...]
// Runs motion-profile.mjs on each video (names relative to <studyRoot>/videos) and writes <studyRoot>/research/<name>/profile.json.
// Prints one summary line per video. A video that fails is reported, not skipped silently.
import {spawnSync} from 'node:child_process';
import {dirname, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [root, ...files] = process.argv.slice(2);
const rows = [];
for (const f of files) {
  const name = basename(f, '.mp4');
  const r = spawnSync('node', [resolve(here, 'motion-profile.mjs'), resolve(root, 'videos', f), resolve(root, 'research', name)], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) { rows.push(`FAILED ${f}: ${(r.stderr || '').trim().split('\n').pop()}`); continue; }
  const p = JSON.parse(r.stdout.trim().split('\n').pop());
  rows.push([name, `${p.width}x${p.height}@${p.fps}`, `${p.duration}s`, `cuts=${p.cuts.length} (${p.cutsPerMinute}/min)`, `runs=${p.runs}`, `fastest=${p.runDuration.shortest}s p10=${p.runDuration.p10}s med=${p.runDuration.median}s`, `interval=${p.interval}s`, `fine=${p.fineWindows.length}`, `~${p.estimatedFrames} frames`].join('  '));
}
console.log(rows.join('\n'));
