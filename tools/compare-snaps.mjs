// Usage: node tools/compare-snaps.mjs <dirA> <dirB>
// Regression check for engine changes: compares every snap_*.jpg that exists in both folders (ffmpeg PSNR).
// "inf" = identical. Prints one line per image and a summary; exit 1 if any pair is below 60 dB or a file is missing in B.
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';

const [a, b] = process.argv.slice(2);
const filesA = readdirSync(a).filter(f => /^snap_.*\.jpg$/.test(f)).sort();
let bad = 0;
for (const f of filesA) {
  let exists = true;
  try { readdirSync(b).includes(f) || (exists = false); } catch { exists = false; }
  if (!exists) { console.log(`MISSING in B: ${f}`); bad++; continue; }
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', resolve(a, f), '-i', resolve(b, f), '-lavfi', 'psnr', '-f', 'null', '-'], {encoding: 'utf8'});
  const m = /average:([0-9.]+|inf)/.exec(r.stderr);
  const v = m ? m[1] : 'n/a';
  const ok = v === 'inf' || (v !== 'n/a' && parseFloat(v) >= 60);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'DIFF'} ${f}  psnr=${v}`);
}
console.log(`${filesA.length} images compared, ${bad} differ`);
process.exit(bad ? 1 : 0);
