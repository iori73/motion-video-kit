// Usage: node tools/study/motion-profile.mjs <video.mp4> [outDir]
// Measures how fast things move BEFORE anyone looks at the frames, then decides the extraction interval.
//   1. decode at native fps, grayscale, 160px wide
//   2. d[i] = mean |frame_i - frame_{i-1}|  (0..255)
//   3. hard cuts (single-frame spikes), motion runs (consecutive elevated frames) and their durations
//   4. interval rule: runs shorter than 0.3 s -> native fps inside those windows; otherwise 0.1 s; all runs >= 1 s -> 0.2 s
// Writes <outDir>/profile.json and prints a summary. Deterministic: no AI involved.
import {spawn, spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {basename} from 'node:path';

const [video, outDirArg] = process.argv.slice(2);
if (!video) { console.error('usage: motion-profile.mjs <video> [outDir]'); process.exit(1); }
const outDir = outDirArg || '.';
mkdirSync(outDir, {recursive: true});

const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration', '-of', 'json', video], {encoding: 'utf8'});
const st = JSON.parse(probe.stdout).streams[0];
const [fn, fd] = st.r_frame_rate.split('/').map(Number);
const fps = fn / fd;
const W = 160, H = Math.max(2, Math.round(W * st.height / st.width / 2) * 2);
const FRAME = W * H;

const diffs = [];
let prev = null, buf = Buffer.alloc(0);
await new Promise((resolve, reject) => {
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${W}:${H},format=gray`, '-an', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
  ff.stdout.on('data', chunk => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= FRAME) {
      const cur = buf.subarray(0, FRAME);
      if (prev) { let s = 0; for (let i = 0; i < FRAME; i++) s += Math.abs(cur[i] - prev[i]); diffs.push(s / FRAME); }
      prev = Buffer.from(cur);
      buf = buf.subarray(FRAME);
    }
  });
  ff.on('error', reject);
  ff.on('close', resolve);
});
// diffs[k] is the change from frame k to frame k+1 -> belongs to frame k+1
const d = [0, ...diffs];
const n = d.length;
const sorted = [...d].sort((a, b) => a - b);
const q = p => sorted[Math.min(n - 1, Math.floor(p * (n - 1)))];
const med = q(0.5);
const mad = [...d.map(x => Math.abs(x - med))].sort((a, b) => a - b)[Math.floor(n / 2)];

// hard cuts: sharp isolated spikes
const cutThr = Math.max(18, med + 8 * Math.max(mad, 0.5));
const cuts = [];
for (let i = 1; i < n - 1; i++) {
  if (d[i] > cutThr && d[i] > 3 * Math.max(d[i - 1], d[i + 1], 0.5)) cuts.push(i);
}
// motion runs: consecutive elevated frames (a 1-frame gap is bridged)
const motThr = Math.max(med * 1.5, med + 3 * mad, 0.8);
const runs = [];
let start = -1, last = -1;
for (let i = 1; i < n; i++) {
  const on = d[i] > motThr && !cuts.includes(i);
  if (on) { if (start < 0) start = i; last = i; }
  else if (start >= 0 && i - last > 2) { runs.push([start, last]); start = -1; }
}
if (start >= 0) runs.push([start, last]);
const runInfo = runs.map(([a, b]) => {
  let peak = 0, sum = 0; for (let i = a; i <= b; i++) { peak = Math.max(peak, d[i]); sum += d[i]; }
  return {from: +(a / fps).toFixed(3), to: +((b + 1) / fps).toFixed(3), dur: +((b - a + 1) / fps).toFixed(3), peak: +peak.toFixed(2), mean: +(sum / (b - a + 1)).toFixed(2)};
}).filter(r => r.dur >= 2 / fps);
const peaks = runInfo.map(r => r.peak).sort((a, b) => a - b);
const significant = runInfo.filter(r => r.peak >= (peaks[Math.floor(peaks.length / 2)] || 0));
const durs = significant.map(r => r.dur).sort((a, b) => a - b);
const pick = p => durs.length ? durs[Math.min(durs.length - 1, Math.floor(p * (durs.length - 1)))] : null;
const p10 = pick(0.1), p50 = pick(0.5), shortest = durs[0] ?? null;

let interval = 0.1, fine = [], reason;
if (shortest !== null && p10 < 0.3) {
  fine = significant.filter(r => r.dur < 0.3).map(r => ({from: +Math.max(0, r.from - 0.15).toFixed(3), to: +Math.min(n / fps, r.to + 0.15).toFixed(3)}));
  fine = fine.reduce((acc, w) => { const l = acc[acc.length - 1]; if (l && w.from <= l.to) l.to = Math.max(l.to, w.to); else acc.push({...w}); return acc; }, []);
  reason = `fast moves: 10th-percentile run ${p10}s < 0.3s -> native fps (${(1 / fps).toFixed(3)}s) inside ${fine.length} window(s), 0.1s elsewhere`;
} else if (shortest !== null && durs[0] >= 1.0) {
  interval = 0.2; reason = `slow: every significant run >= 1.0s (shortest ${shortest}s) -> 0.2s`;
} else {
  reason = `normal: 10th-percentile run ${p10 ?? 'n/a'}s -> 0.1s`;
}
// Dense hard cuts: with a shot shorter than ~0.6 s, 0.2 s sampling gives fewer than 3 frames per shot. Use 0.1 s.
const gaps = cuts.slice(1).map((c, i) => (c - cuts[i]) / fps).sort((a, b) => a - b);
const medianCutGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
if (interval > 0.1 && medianCutGap !== null && medianCutGap < 0.6) {
  interval = 0.1;
  reason += `; but median shot length ${medianCutGap.toFixed(2)}s < 0.6s (dense cuts) -> 0.1s`;
}
const profile = {
  medianShotLength: medianCutGap === null ? null : +medianCutGap.toFixed(3),
  file: basename(video), width: st.width, height: st.height, fps, frames: n, duration: +(n / fps).toFixed(3),
  diff: {median: +med.toFixed(3), mad: +mad.toFixed(3), cutThreshold: +cutThr.toFixed(2), motionThreshold: +motThr.toFixed(2)},
  cuts: cuts.map(i => +(i / fps).toFixed(3)),
  cutsPerMinute: +(cuts.length / (n / fps) * 60).toFixed(1),
  runs: runInfo.length, runDuration: {shortest, p10, median: p50},
  interval, fineWindows: fine, reason,
  estimatedFrames: Math.round(n / fps / interval) + fine.reduce((s, w) => s + Math.round((w.to - w.from) * fps), 0),
};
writeFileSync(`${outDir}/profile.json`, JSON.stringify({...profile, runList: runInfo}, null, 2));
console.log(JSON.stringify(profile));
