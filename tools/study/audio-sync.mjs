// Usage: node tools/study/audio-sync.mjs <video.mp4> <profile.json>
// Does the picture cut ON the music? Measures it instead of guessing.
//   1. decode audio to mono 8 kHz, energy per 10 ms hop (20 ms window), onset = positive jump of log-energy
//   2. peak-pick onsets, estimate tempo from the autocorrelation of the onset strength (60-180 BPM)
//   3. for every hard cut in profile.json: distance to the nearest onset; share within +-60 ms
//   4. chance level: the same share after shifting all cuts by several offsets -> "lift" over chance
// Prints one JSON line. Deterministic.
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';

const [video, profilePath] = process.argv.slice(2);
const prof = JSON.parse(readFileSync(profilePath, 'utf8'));
const SR = 8000, HOP = 80, WIN = 160;

const chunks = [];
await new Promise((res, rej) => {
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vn', '-ac', '1', '-ar', String(SR), '-f', 's16le', '-']);
  ff.stdout.on('data', c => chunks.push(c));
  ff.on('error', rej); ff.on('close', res);
});
const buf = Buffer.concat(chunks);
const n = Math.floor(buf.length / 2);
if (n < SR) { console.log(JSON.stringify({file: prof.file, error: 'no audio'})); process.exit(0); }
const x = new Float32Array(n);
for (let i = 0; i < n; i++) x[i] = buf.readInt16LE(i * 2) / 32768;

const frames = Math.floor((n - WIN) / HOP);
const logE = new Float32Array(frames);
for (let f = 0; f < frames; f++) {
  let e = 0; const o = f * HOP;
  for (let i = 0; i < WIN; i++) e += x[o + i] * x[o + i];
  logE[f] = Math.log(e / WIN + 1e-9);
}
// onset strength: positive change of log energy vs the max of the previous 3 frames (suppresses slow swells)
const on = new Float32Array(frames);
for (let f = 3; f < frames; f++) on[f] = Math.max(0, logE[f] - Math.max(logE[f - 1], logE[f - 2], logE[f - 3]));
const mean = on.reduce((a, b) => a + b, 0) / frames;
const sd = Math.sqrt(on.reduce((a, b) => a + (b - mean) ** 2, 0) / frames);
const thr = mean + 1.5 * sd;
const onsets = [];
for (let f = 5; f < frames - 5; f++) {
  if (on[f] < thr) continue;
  let ok = true; for (let k = -5; k <= 5; k++) if (on[f + k] > on[f]) { ok = false; break; }
  if (ok) onsets.push(+((f * HOP + WIN / 2) / SR).toFixed(3));
}
// tempo
let bestLag = 0, best = -1;
const minLag = Math.round(60 / 180 * 100), maxLag = Math.round(60 / 60 * 100);
for (let lag = minLag; lag <= maxLag; lag++) {
  let s = 0; for (let f = lag; f < frames; f++) s += on[f] * on[f - lag];
  s /= (frames - lag);
  if (s > best) { best = s; bestLag = lag; }
}
const bpm = bestLag ? +(60 / (bestLag / 100)).toFixed(1) : null;

const cuts = prof.cuts;
const near = (t, list) => { let d = 1e9; for (const o of list) { const a = Math.abs(o - t); if (a < d) d = a; else if (o > t) break; } return d; };
const share = (cs, tol) => cs.length ? cs.filter(c => near(c, onsets) <= tol).length / cs.length : null;
const tol = 0.06;
const actual = share(cuts, tol);
const offsets = [0.11, 0.17, 0.23, 0.29, 0.37, 0.43, 0.53, 0.61];
const chance = offsets.map(o => share(cuts.map(c => c + o), tol)).filter(v => v !== null);
const chanceMean = chance.length ? chance.reduce((a, b) => a + b, 0) / chance.length : null;
// Beat-grid alignment: phase of every cut within one beat (and half / double beat), as a circular statistic.
// R in 0..1 (1 = every cut on the same phase). Rayleigh test: p ~ exp(-N R^2); small p = not chance.
function grid(period) {
  if (!period || cuts.length < 5) return null;
  let c = 0, s = 0;
  for (const t of cuts) { const a = 2 * Math.PI * ((t / period) % 1); c += Math.cos(a); s += Math.sin(a); }
  const R = Math.hypot(c, s) / cuts.length;
  return {R: +R.toFixed(2), p: +Math.exp(-cuts.length * R * R).toFixed(3), phaseMs: Math.round(((Math.atan2(s, c) / (2 * Math.PI) + 1) % 1) * period * 1000)};
}
const beat = bpm ? 60 / bpm : null;
const gridResult = beat ? {beat: grid(beat), halfBeat: grid(beat / 2), twoBeats: grid(beat * 2), fourBeats: grid(beat * 4)} : null;
console.log(JSON.stringify({
  grid: gridResult,
  file: prof.file, seconds: +(n / SR).toFixed(1), onsets: onsets.length, onsetsPerSec: +(onsets.length / (n / SR)).toFixed(2), bpm,
  cuts: cuts.length, cutsOnOnset: actual === null ? null : +actual.toFixed(2), chance: chanceMean === null ? null : +chanceMean.toFixed(2),
  lift: actual !== null && chanceMean ? +(actual / chanceMean).toFixed(2) : null,
  medianDistanceMs: cuts.length ? Math.round(cuts.map(c => near(c, onsets)).sort((a, b) => a - b)[Math.floor(cuts.length / 2)] * 1000) : null,
}));
