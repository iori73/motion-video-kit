// Averages 4 sub-frames per frame (motion blur), synthesizes a soundtrack from the spec's audio events, and muxes an MP4.
// Usage: node engine/html/build.mjs <framesDir> <out.mp4> [--no-audio]
import {spawnSync} from 'node:child_process';
import {readFileSync, mkdirSync} from 'node:fs';

const [dir, out] = process.argv.slice(2);
const noAudio = process.argv.includes('--no-audio');
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, 'utf8'));
const events = JSON.parse(readFileSync(`${dir}/events.json`, 'utf8'));
const {fps, from, to} = meta, dur = to - from;

const run = args => {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {stdio: 'inherit'});
  if (r.status !== 0) { console.error('ffmpeg failed:', args.slice(0, 8).join(' ')); process.exit(1); }
};
const video = ['-framerate', String(fps * meta.sub), '-i', `${dir}/%05d.jpg`];
const vf = `tmix=frames=${meta.sub},select='eq(mod(n\\,${meta.sub})\\,${meta.sub - 1})',setpts=N/(${fps}*TB)`;
const venc = ['-r', String(fps), '-c:v', 'libx264', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

if (noAudio) {
  run([...video, '-vf', vf, ...venc, '-t', String(dur), out]);
} else {
  const snd = `${dir}/snd`; mkdirSync(snd, {recursive: true});
  run(['-f', 'lavfi', '-i', 'sine=f=1320:d=0.12', '-af', 'afade=t=out:d=0.12,volume=0.9', `${snd}/tick.wav`]);
  run(['-f', 'lavfi', '-i', 'sine=f=150:d=0.2', '-af', 'afade=t=out:d=0.2,volume=1.0', `${snd}/thunk.wav`]);
  run(['-f', 'lavfi', '-i', 'anoisesrc=d=1.0:c=pink', '-af', 'bandpass=f=1800:w=900,afade=t=in:d=0.4,afade=t=out:st=0.4:d=0.6,volume=1.2', `${snd}/whoosh.wav`]);
  run(['-f', 'lavfi', '-i', 'sine=f=880:d=1.6', '-af', 'afade=t=out:d=1.6,volume=0.8', `${snd}/chime.wav`]);
  run(['-f', 'lavfi', '-i', `sine=f=110:d=${dur}`, '-f', 'lavfi', '-i', `sine=f=165:d=${dur}`, '-f', 'lavfi', '-i', `sine=f=220:d=${dur}`,
    '-filter_complex', `[0][1][2]amix=inputs=3:normalize=0,tremolo=f=0.15:d=0.4,lowpass=f=600,volume=0.10,afade=t=in:d=2,afade=t=out:st=${Math.max(0, dur - 3)}:d=3`, `${snd}/pad.wav`]);
  const gain = {tick: 0.18, thunk: 0.3, whoosh: 0.2, chime: 0.18};
  const inputs = [...video, '-i', `${snd}/pad.wav`];
  let fc = '[1:a]anull[pad];';
  const labels = ['[pad]'];
  const ev = events.filter(e => e.t >= from && e.t < to);
  ev.forEach((e, i) => {
    inputs.push('-i', `${snd}/${e.k}.wav`);
    const ms = Math.round((e.t - from) * 1000);
    fc += `[${i + 2}:a]volume=${gain[e.k] ?? 0.18},adelay=${ms}|${ms}[e${i}];`;
    labels.push(`[e${i}]`);
  });
  fc += `${labels.join('')}amix=inputs=${labels.length}:normalize=0,volume=15dB,alimiter=limit=0.9[aud];[0:v]${vf}[vid]`;
  run([...inputs, '-filter_complex', fc, '-map', '[vid]', '-map', '[aud]', ...venc, '-c:a', 'aac', '-b:a', '192k', '-t', String(dur), out]);
}
console.log('built', out);
