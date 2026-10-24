// Usage: node engine/core/pacing.mjs <spec.(json|mjs)> [--strict]
// Measures the rhythm of a spec and compares it with the target in meta.pacing ('calm' | 'standard' | 'fast').
// Reference numbers (measured on public reels with tools/study/motion-profile.mjs, 2026-10-24):
//   calm      ~4 s per shot, 8-22 cuts/min   (thebranx case digests)
//   standard  ~2.4 s per shot, ~25 cuts/min  (zypsy reel)
//   fast      ~1.2 s per shot, ~52 cuts/min  (Landor sizzle)
//   bursts    0.1-0.2 s per shot for ~1.4 s, then ~3.5 s of hold (Wolff Olins loops)
// Entrance motions in the references are 0.17-0.6 s (median); a motion longer than 1.0 s is flagged as slow.
// Advisory by default (exit 0). --strict exits 1 on any warning.
import {compile, loadSpec} from './compile.mjs';
import {fileURLToPath} from 'node:url';

const TARGETS = {calm: [3, 6], standard: [1.8, 3.2], fast: [0.8, 1.6]};
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

export function pacing(compiled) {
  const {meta, root} = compiled;
  const shots = [];
  let burstItems = 0;
  const scenes = root.children.filter(c => c.scene && !c.scene.layer);
  for (const s of scenes) {
    const flickers = [];
    (function walk(n) { if (n.shots) flickers.push(n); (n.children || []).forEach(walk); })(s);
    if (flickers.length) {
      // A flicker burst counts as ONE rhythmic event (its total length), so it does not drag the median shot length down.
      for (const f of flickers) { burstItems += f.shots.length; shots.push(f.shots.at(-1).end - f.shots[0].start); }
      const covered = flickers.reduce((a, f) => a + (f.shots.at(-1).end - f.shots[0].start), 0);
      const rest = (s.scene.end - s.scene.start) - covered;
      if (rest > 0.05) shots.push(rest);
    } else shots.push(s.scene.end - s.scene.start);
  }
  const med = median(shots);
  const cutsPerMin = (shots.length - 1) / meta.duration * 60;
  const burst = burstItems;
  // entrance motion lengths: first move of each node (first two keyframes of a translate/scale/rotation track)
  const entries = [];
  (function walk(n) {
    for (const f of ['TRANSLATION_X', 'TRANSLATION_Y', 'ROTATION', 'SCALE_X', 'SCALE_Y']) {
      const k = n.tracks?.[f]; if (k && k.length >= 2 && !n.scene) entries.push(k[1].t - k[0].t);
    }
    (n.children || []).forEach(walk);
  })(root);
  const moves = entries.filter(d => d > 0.02);
  const slow = moves.filter(d => d > 1.0 && d < meta.duration * 0.5).length;
  const warnings = [];
  const target = meta.pacing && TARGETS[meta.pacing];
  if (target && med !== null && (med < target[0] || med > target[1])) warnings.push(`median shot ${med.toFixed(2)}s is outside the '${meta.pacing}' range ${target[0]}-${target[1]}s`);
  if (meta.pacing && !target) warnings.push(`unknown meta.pacing '${meta.pacing}' (use calm | standard | fast)`);
  const shortHold = shots.filter(x => x < 0.5 && x > 0.25).length;
  if (shortHold > 0) warnings.push(`${shortHold} shot(s) of 0.25-0.5 s: too short to read, too long to feel like a burst. Make them <=0.2 s (flicker) or >=0.8 s`);
  const mdn = median(moves);
  if (mdn !== null && mdn > 0.8) warnings.push(`median motion length ${mdn.toFixed(2)}s > 0.8s (references: 0.17-0.6s)`);
  return {
    duration: meta.duration, shots: shots.length, medianShot: med === null ? null : +med.toFixed(2),
    shortest: +Math.min(...shots).toFixed(2), longest: +Math.max(...shots).toFixed(2), cutsPerMin: +cutsPerMin.toFixed(1),
    burstShots: burst, motions: moves.length, medianMotion: mdn === null ? null : +mdn.toFixed(2), slowMotions: slow,
    target: meta.pacing || null, warnings,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = pacing(compile(await loadSpec(process.argv[2])));
  console.log(JSON.stringify(r));
  for (const w of r.warnings) console.log('WARN ' + w);
  process.exit(process.argv.includes('--strict') && r.warnings.length ? 1 : 0);
}
