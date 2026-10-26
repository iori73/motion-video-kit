// Slow push-in detector. For each shot (between cuts from profile.json) of >= MIN seconds: take a frame near the start and one near the end
// (gray 160x90), search the scale s (about the frame centre, 0.97..1.12) that best maps start -> end, and report s, rate per second and how much
// the residual drops vs no scaling. A shot counts as "push-in" when s>=1.01 and the residual drops by >= 30%. Cards (flat frames) are skipped.
// Usage: node tools/study/pushin.mjs <studyRoot> <video-name> [minShot=0.7] [v]   (v = print every shot as JSON)
// Checked with a positive control: a real frame zoomed by a known factor is recovered (true 1.03 -> 1.030, 1.06 -> 1.062, 1.10 -> 1.098; residual drop 0.65-0.82).
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
const [ROOT_ARG, ...REST] = process.argv.slice(2); const R = ROOT_ARG.replace(/\/?$/, '/');
const name = REST[0], MIN = +(REST[1] || 0.7);
const video = ['.mp4', '.webm'].map(e => `${R}videos/${name}${e}`).find(existsSync);
const prof = JSON.parse(readFileSync(`${R}research/${name}/profile.json`, 'utf8'));
const W = 160, H = 90;
const frame = t => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf', `scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], {maxBuffer: 1 << 22});
  return r.stdout.length === W * H ? r.stdout : null;
};
const samp = (img, x, y) => { x = Math.max(0, Math.min(W - 1.001, x)); y = Math.max(0, Math.min(H - 1.001, y)); const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
  return img[y0 * W + x0] * (1 - fx) * (1 - fy) + img[y0 * W + x0 + 1] * fx * (1 - fy) + img[(y0 + 1) * W + x0] * (1 - fx) * fy + img[(y0 + 1) * W + x0 + 1] * fx * fy; };
// error between end frame and start frame scaled by s about the centre (central 70% only)
const err = (a, b, s) => { let e = 0, n = 0; const cx = W / 2, cy = H / 2;
  for (let y = Math.round(H * 0.15); y < H * 0.85; y++) for (let x = Math.round(W * 0.15); x < W * 0.85; x++) { e += Math.abs(b[y * W + x] - samp(a, cx + (x - cx) / s, cy + (y - cy) / s)); n++; } return e / n; };
const cuts = [0, ...prof.cuts, prof.duration];
const out = [];
for (let i = 0; i < cuts.length - 1; i++) {
  const t0 = cuts[i], t1 = cuts[i + 1], len = t1 - t0;
  if (len < MIN) continue;
  const a = frame(t0 + 0.1), b = frame(t1 - 0.1);
  if (!a || !b) continue;
  let mean = 0; for (const v of a) mean += v; mean /= a.length; let vr = 0; for (const v of a) vr += (v - mean) ** 2; if (Math.sqrt(vr / a.length) < 8) continue;   // flat card
  const e0 = err(a, b, 1); let best = 1, be = e0;
  for (let s = 0.97; s <= 1.12; s += 0.002) { const e = err(a, b, s); if (e < be) { be = e; best = s; } }
  const drop = (e0 - be) / e0, dt = len - 0.2;
  out.push({t0: +t0.toFixed(2), len: +len.toFixed(2), s: +best.toFixed(3), rate: +((best - 1) / dt).toFixed(3), drop: +drop.toFixed(2), push: best >= 1.01 && drop >= 0.3});
}
const pushes = out.filter(o => o.push);
console.log(name.padEnd(34), 'shots>=' + MIN + 's', String(out.length).padStart(3), 'push-in', String(pushes.length).padStart(3),
  pushes.length ? 'rate/s median ' + pushes.map(p => p.rate).sort((x, y) => x - y)[Math.floor(pushes.length / 2)] + ' (total scale ' + pushes.map(p => p.s).sort((x, y) => x - y)[Math.floor(pushes.length / 2)] + ')' : '');
if (REST[2] === 'v') console.log(JSON.stringify(out));
