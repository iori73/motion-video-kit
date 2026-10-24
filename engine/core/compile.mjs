// Spec -> compiled tree of primitives + keyframe tracks.
// Both renderers (HTML and Figma) read this compiled form, so a spec means the same thing in both.
//
// Conventions (spec level):
//   - rotation is degrees, positive = clockwise (CSS-like). The Figma emitter negates it.
//   - TRANSLATION_* and ROTATION are additive on top of the node's rest transform; SCALE_* multiply; OPACITY, BLUR, PATH_TRIM_END are absolute.
//   - Easing names are Figma's public set: LINEAR, EASE_IN, EASE_OUT, EASE_IN_AND_OUT, EASE_OUT_BACK, HOLD.
//   - A keyframe's easing controls the move from the previous keyframe to it. Before the first keyframe the value holds; after the last it holds.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

export const DEFAULT_TOKENS = {
  colors: {
    // `muted` and `tealText` are tuned to pass 4.5:1 on white, panel and paper backgrounds (see engine/core/contrast.mjs).
    paper: '#E9E7E1', navy: '#1D3557', ink: '#16202C', red: '#D9482B', teal: '#2A8F9C', tealText: '#1B6B76', muted: '#4F6068',
    white: '#FFFFFF', dark: '#14213D', amber: '#E0A43A', note: '#F6EFD9', panel: '#FBFAF6',
  },
  fonts: {
    serif: {css: '"Hoefler Text","EB Garamond",Georgia,serif', figma: 'EB Garamond', styles: {regular: 'Regular', medium: 'Medium', semibold: 'SemiBold', bold: 'Bold'}},
    hand: {css: '"Bradley Hand","Caveat","Noteworthy",cursive', figma: 'Caveat', styles: {regular: 'Bold', medium: 'Bold', semibold: 'Bold', bold: 'Bold'}},
    sans: {css: '-apple-system,"Helvetica Neue",Inter,sans-serif', figma: 'Inter', styles: {regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold'}},
    mono: {css: '"Fira Code",Menlo,monospace', figma: 'Fira Code', styles: {regular: 'Regular', medium: 'Medium', semibold: 'SemiBold', bold: 'Bold'}},
  },
};

export async function loadSpec(p) {
  if (p.endsWith('.json')) return JSON.parse(readFileSync(p, 'utf8'));
  const mod = await import(pathToFileURL(resolve(p)).href);
  return mod.default;
}

const norm = keys => keys.map(k => Array.isArray(k) ? {t: k[0], v: k[1], ...(k[2] ? {e: k[2]} : {})} : k);
function addTrack(n, field, keys) {
  const cur = n.tracks[field] || [];
  n.tracks[field] = cur.concat(norm(keys)).sort((a, b) => a.t - b.t);
}

// ---- motion presets (macros that expand to tracks) ----
const PRESETS = {
  // Defaults follow measured references: median motion run 0.37 s (zypsy), 0.6 s (Landor), 0.4-0.63 s (thebranx).
  enterTiltBlur(n, m) {
    const {at, dur = 0.55, dy = 0, dx = 0, rot = 0, blur = 0, fade = 0.6, ease = 'EASE_OUT'} = m;
    if (dy) addTrack(n, 'TRANSLATION_Y', [[at, dy], [at + dur, 0, ease]]);
    if (dx) addTrack(n, 'TRANSLATION_X', [[at, dx], [at + dur, 0, ease]]);
    if (rot) addTrack(n, 'ROTATION', [[at, rot], [at + dur, 0, 'EASE_OUT']]);
    addTrack(n, 'OPACITY', [[at, 0], [at + dur * fade, 1, 'EASE_OUT']]);
    if (blur) addTrack(n, 'BLUR', [[at, blur], [at + dur, 0, 'EASE_OUT']]);
  },
  fadeUp(n, m) {
    const {at, dur = 0.45, dy = 30} = m;
    addTrack(n, 'TRANSLATION_Y', [[at, dy], [at + dur, 0, 'EASE_OUT']]);
    addTrack(n, 'OPACITY', [[at, 0], [at + dur, 1, 'EASE_OUT']]);
  },
  fadeIn(n, m) { addTrack(n, 'OPACITY', [[m.at, 0], [m.at + (m.dur ?? 0.4), 1, 'EASE_OUT']]); },
  // visible between in[0..1] and out[0..1]; in/out optional
  window(n, m) {
    const k = [];
    if (m.in) k.push([m.in[0], 0], [m.in[1], 1, 'EASE_OUT']);
    if (m.out) { if (!m.in) k.push([m.out[0] - 0.01, 1]); k.push([m.out[0], 1], [m.out[1], m.to ?? 0, 'EASE_OUT']); }
    addTrack(n, 'OPACITY', k);
  },
  scale(n, m) {
    const {at, dur, from = 1, to = 1, ease = 'EASE_OUT'} = m;
    for (const f of ['SCALE_X', 'SCALE_Y']) addTrack(n, f, [[at, from], [at + dur, to, ease]]);
  },
  draw(n, m) { addTrack(n, 'PATH_TRIM_END', [[m.at, 0], [m.at + (m.dur ?? 0.8), 1, 'EASE_OUT']]); },
  // Move by (fromX,fromY) -> (toX,toY), additive on the rest position. A "push" transition is two slides in the same window:
  // outgoing shot toY = -height, incoming shot fromY = +height (zypsy column/roll cuts, thebranx roll cut: 0.2-0.3 s).
  slide(n, m) {
    const {at, dur = 0.25, fromX = 0, fromY = 0, toX = 0, toY = 0, ease = 'EASE_IN_AND_OUT'} = m;
    if (fromX !== toX) addTrack(n, 'TRANSLATION_X', [[at, fromX], [at + dur, toX, ease]]);
    if (fromY !== toY) addTrack(n, 'TRANSLATION_Y', [[at, fromY], [at + dur, toY, ease]]);
  },
  // Scale up through the element (zypsy: a headline grows ~10x in 0.17 s and one letter fills the frame), then it disappears.
  zoomThrough(n, m) {
    const {at, dur = 0.2, to = 10} = m;
    for (const f of ['SCALE_X', 'SCALE_Y']) addTrack(n, f, [[at, 1], [at + dur, to, 'EASE_IN']]);
    addTrack(n, 'OPACITY', [[at + dur, 1], [at + dur + 0.01, 0]]);
  },
  // cards that sit in a pile, then spread to their rest (list) positions
  pileToList(n, m) {
    const {enterAt, enterDur = 0.7, holdUntil, spreadDur = 1.2, dx, dy, rot = 0, slide = 220, blur = 8} = m;
    const sp = holdUntil + spreadDur;
    addTrack(n, 'TRANSLATION_X', [[enterAt, dx - slide], [enterAt + enterDur, dx, 'EASE_OUT'], [holdUntil, dx], [sp, 0, 'EASE_IN_AND_OUT']]);
    addTrack(n, 'TRANSLATION_Y', [[enterAt, dy], [enterAt + enterDur, dy], [holdUntil, dy], [sp, 0, 'EASE_IN_AND_OUT']]);
    addTrack(n, 'ROTATION', [[enterAt, rot], [enterAt + enterDur, rot], [holdUntil, rot], [sp, 0, 'EASE_IN_AND_OUT']]);
    addTrack(n, 'OPACITY', [[enterAt, 0], [enterAt + 0.45, 1, 'EASE_OUT']]);
    if (blur) addTrack(n, 'BLUR', [[enterAt, blur], [enterAt + enterDur, 0, 'EASE_OUT']]);
  },
  keys(n, m) { for (const [f, k] of Object.entries(m.tracks)) addTrack(n, f, k); },
};

export function applyMotion(n, motion = []) {
  for (const m of motion) {
    const f = PRESETS[m.preset];
    if (!f) throw new Error(`Unknown motion preset: ${m.preset}`);
    f(n, m);
  }
  return n;
}

// ---- compile ----
export function compile(spec) {
  const tokens = {
    colors: {...DEFAULT_TOKENS.colors, ...(spec.tokens?.colors || {})},
    fonts: {...DEFAULT_TOKENS.fonts, ...(spec.tokens?.fonts || {})},
  };
  const meta = {w: 1920, h: 1080, fps: 30, duration: 10, title: 'Motion', ...spec.meta};
  const C = c => (typeof c === 'string' && c[0] === '$') ? tokens.colors[c.slice(1)] : c;
  const fill = f => {
    if (f == null) return null;
    if (typeof f === 'string') return {color: C(f), opacity: 1};
    if (f.gradient) return {gradient: f.gradient.map(C)};
    return {color: C(f.color), opacity: f.opacity ?? 1};
  };
  const mk = (type, p) => ({type, name: p.name || type, tracks: {}, children: [], ...p});
  const pos = o => {
    const p = {};
    if (o.cx !== undefined) { p.anchor = 'center'; p.cx = o.cx; p.cy = o.cy; }
    else if (o.bcx !== undefined) { p.anchor = 'bc'; p.cx = o.bcx; p.by = o.by; }
    else { p.x = o.x ?? 0; p.y = o.y ?? 0; }
    if (o.rot) p.rot = o.rot;
    if (o.opacity !== undefined) p.opacity = o.opacity;
    return p;
  };
  const stroke = s => s ? {color: C(s.color), weight: s.weight ?? 2, sides: s.sides || 'all'} : null;

  const text = o => mk('text', {
    name: o.name || 'Text',
    text: {
      runs: (o.runs || [{t: o.text}]).map(r => ({t: r.t, font: r.font || o.font || 'sans', weight: r.weight || o.weight || 'regular', color: C(r.color || o.color || '$ink')})),
      size: o.size || 24, lh: o.lh || null, align: o.align || 'left', ls: o.ls || 0,
      w: (o.w && o.w !== 'fill') ? o.w : null, fill: o.w === 'fill',
    },
    ...pos(o),
  });
  const frame = o => mk('frame', {
    name: o.name || 'Frame', w: o.w, h: o.h, fill: fill(o.fill), radius: o.radius || 0, clip: !!o.clip,
    layout: o.layout || null, pad: o.pad || [0, 0, 0, 0], gap: o.gap || 0, align: o.align || 'start',
    sizeW: o.sizeW || (o.layout ? 'fixed' : 'fixed'), sizeH: o.sizeH || (o.layout ? 'hug' : 'fixed'),
    stroke: stroke(o.stroke), shadow: o.shadow || null, blur: o.blur || 0, ...pos(o),
  });
  const rect = o => mk(o.shape === 'ellipse' ? 'ellipse' : 'rect', {
    name: o.name || o.shape || 'Shape', w: o.w, h: o.h, fill: fill(o.fill), radius: o.radius || 0, blur: o.blur || 0, stroke: stroke(o.stroke), ...pos(o),
  });
  const path = o => mk('path', {name: o.name || 'Path', points: o.points, tangents: o.tangents, stroke: {color: C(o.color), weight: o.weight || 4}, ...pos(o)});

  const waveform = () => {
    const f = frame({name: 'Waveform', layout: 'h', gap: 4, align: 'center', sizeW: 'hug'});
    for (let i = 0; i < 30; i++) f.children.push(rect({name: 'bar', w: 5, h: 10 + Math.abs(Math.sin(i * 1.7) * 26), radius: 3, fill: '$teal'}));
    return f;
  };
  const card = o => {
    const v = o.variant || 'message';
    const st = {message: {}, note: {fill: '$note'}, audio: {}, doc: {stroke: {color: '$amber', weight: 8, sides: 'left'}}}[v] || {};
    const big = !!o.big;
    const pv = o.padV ?? 16, ph = o.pad ?? 20;
    const f = frame({
      name: o.name || `Card / ${v}`, layout: 'v', gap: 6, pad: [pv, ph, pv, ph], w: o.w || 380, radius: 16,
      fill: o.fill || st.fill || '$white', stroke: o.stroke || st.stroke, shadow: 'card', cx: o.cx, cy: o.cy, x: o.x, y: o.y, rot: o.rot,
    });
    f.blur = 0;
    const al = o.center ? 'center' : 'left';
    f.children.push(text({name: 'Label', text: o.who, size: o.whoSize || (big ? 70 : 17), weight: big ? 'bold' : 'semibold', color: o.whoColor || (big ? '$navy' : '$muted'), align: al, w: 'fill'}));
    if (v === 'audio') f.children.push(waveform());
    else f.children.push(text({name: 'Body', text: o.text, font: v === 'note' ? 'hand' : 'sans', weight: o.bold ? 'bold' : 'regular', size: v === 'note' ? 32 : (o.size || 25), color: o.textColor || (v === 'note' ? '$navy' : '$ink'), align: al, w: 'fill'}));
    return f;
  };
  const caption = o => {
    const f = frame({name: o.name || 'Caption', layout: 'h', pad: [10, 26, 10, 26], radius: 12, fill: {color: '$navy', opacity: 0.88}, sizeW: 'hug', bcx: meta.w / 2, by: o.by ?? (meta.h - 64)});
    f.children.push(text({name: 'Caption text', text: o.text, weight: 'medium', size: o.size || 34, color: '$white'}));
    return f;
  };
  const counter = o => {
    // Text states stacked on top of each other; each is visible for one step (HOLD-like with 0.01s edges).
    const g = frame({name: o.name || 'Counter', w: meta.w, h: o.h || 400, x: 0, y: o.y ?? 0});
    const steps = o.steps || 8, a = o.at, d = o.dur;
    // 'cubic' matches Figma's EASE_OUT, so a counter and a bar animated with EASE_OUT stay locked together (Landor stat scene).
    const ease = o.ease === 'cubic' ? (x => 1 - Math.pow(1 - x, 3)) : (x => 1 - Math.pow(1 - x, 4));
    const states = [];
    for (let k = 0; k <= steps; k++) states.push({t: k === 0 ? (o.from ?? a) : a + (k / steps) * d, v: (o.to * ease(k / steps)).toFixed(o.decimals ?? 1)});
    states.forEach((s, k) => {
      const t = text({name: `Counter state ${k} (${s.v})`, text: s.v + (o.suffix || ''), font: o.font || 'serif', size: o.size, color: o.color || '$navy', align: 'center', w: meta.w, x: 0, y: 0});
      const e = k < steps ? states[k + 1].t : null, keys = [];
      if (k === 0) keys.push([s.t, 1]); else keys.push([s.t - 0.01, 0], [s.t, 1]);
      if (e !== null) keys.push([e - 0.01, 1], [e, 0]);
      addTrack(t, 'OPACITY', keys);
      g.children.push(t);
    });
    return g;
  };
  const clock = o => {
    const S = o.size || 460, c = S / 2;
    const f = frame({name: o.name || 'Clock', w: S, h: S, cx: o.cx, cy: o.cy});
    f.children.push(rect({shape: 'ellipse', name: 'Face', w: S, h: S, fill: '#F0EEE6'}));
    for (let i = 0; i < 12; i++) {
      const a = i * 30 * Math.PI / 180;
      f.children.push(rect({shape: 'ellipse', name: `Tick ${i + 1}`, w: 14, h: 14, x: c + Math.sin(a) * (c - 30) - 7, y: c - Math.cos(a) * (c - 30) - 7, fill: '$dark'}));
    }
    const hand = (name, len, w, from, to) => {
      const h = frame({name, w: S, h: S, x: 0, y: 0});
      h.children.push(rect({name: 'Hand', w, h: len, radius: w / 2, x: c - w / 2, y: c - len, fill: '$dark'}));
      addTrack(h, 'ROTATION', [[o.at, from], [o.at + o.dur, to, 'EASE_IN_AND_OUT']]);
      return h;
    };
    const m0 = (o.from.min % 60) * 6, m1 = m0 + ((o.to.min - o.from.min) * 6);
    f.children.push(hand('Minute hand', c * 0.8, 9, m0, m1));
    f.children.push(hand('Hour hand', c * 0.52, 14, (o.from.hour % 12) * 30 + o.from.min * 0.5, (o.to.hour % 12) * 30 + o.to.min * 0.5));
    f.children.push(rect({shape: 'ellipse', name: 'Center pin', w: 26, h: 26, x: c - 13, y: c - 13, fill: '$red'}));
    return f;
  };
  const table = o => {
    const style = o.style || 'orders', rv = o.reveal || {};
    const f = frame({name: o.name || 'Table', w: o.w, h: o.h, x: o.x, y: o.y, cx: o.cx, cy: o.cy, radius: style === 'sheet' ? 10 : 22, fill: style === 'sheet' ? '$white' : '$panel', clip: true, shadow: style === 'sheet' ? 'card' : 'panel'});
    if (style === 'sheet') {
      const rh = o.rowH || 104;
      o.rows.forEach((row, r) => {
        f.children.push(rect({name: `Row line ${r + 1}`, w: o.w, h: 1, x: 0, y: r * rh + rh - 1, fill: '#DDDDDD'}));
        row.forEach((cell, c) => {
          const t = text({name: `Cell r${r + 1}c${c + 1}`, text: cell.t ?? cell, size: o.size || 44, color: cell.color || '$ink', x: o.cols[c], y: r * rh + 26});
          const t0 = rv.at + r * (rv.gap ?? 0.17) + c * (rv.cellGap ?? 0.05);
          addTrack(t, 'OPACITY', [[t0, 0], [t0 + 0.12, 1, 'EASE_OUT']]);
          f.children.push(t);
        });
      });
      return f;
    }
    f.children.push(text({name: 'Panel title', text: o.title, weight: 'semibold', size: 30, x: 40, y: 30}));
    o.header.forEach((h, i) => f.children.push(text({name: `Header ${h}`, text: h, size: 17, color: '$muted', ls: 1.4, x: o.cols[i], y: 112})));
    const arr = i => rv.at + i * (rv.gap ?? 0.55), top = o.rowsY ?? 160, rh = o.rowH ?? 64, last = o.cols.length - 1;
    o.rows.forEach((r, i) => {
      const y = top + i * rh, a = arr(i);
      const hl = rect({name: `Row highlight ${i + 1}`, w: o.w - 80, h: rh, x: 40, y, radius: 8, fill: '#7FF0D4', opacity: 0});
      addTrack(hl, 'OPACITY', [[a + 0.44, 0], [a + 0.5, 0.38], [a + 0.95, 0, 'EASE_OUT']]);
      f.children.push(hl);
      f.children.push(rect({name: `Row line ${i + 1}`, w: o.w - 80, h: 1, x: 40, y: y + rh - 1, fill: '#E6E1D3'}));
      r.forEach((cell, j) => {
        const t = text({name: `Row ${i + 1} / ${o.header[j].toLowerCase()}`, text: cell, size: j === 3 ? 19 : 25, color: j === 3 ? '$muted' : '$ink', x: o.cols[j], y: y + (j === 3 ? 21 : 18)});
        addTrack(t, 'OPACITY', [[a, 0], [a + 0.3, 1, 'EASE_OUT']]);
        f.children.push(t);
      });
      const chip = (label, bg, fg, nm) => frame({name: `${nm} ${i + 1}`, layout: 'h', pad: [5, 16, 5, 16], radius: 999, fill: bg, sizeW: 'hug', x: o.cols[last + 0] ?? 692, y: y + 15, children: []});
      const mkChip = (label, bg, fg, nm) => { const c = chip(label, bg, fg, nm); c.x = o.statusX ?? 692; c.children.push(text({name: 'Chip text', text: label, weight: 'semibold', size: 20, color: fg})); return c; };
      const rd = mkChip('Reading…', '#FBE8BF', '#7A520C', 'Chip reading');
      addTrack(rd, 'OPACITY', [[a - 0.05, 0], [a, 1], [a + 0.44, 1], [a + 0.45, 0]]);
      const en = mkChip('✓ Entered', '#D3F3E6', '#12795A', 'Chip entered');
      addTrack(en, 'OPACITY', [[a + 0.44, 0], [a + 0.45, 1]]);
      f.children.push(rd, en);
    });
    const n = o.rows.length, ts = k => k === 0 ? (rv.countFrom ?? rv.at - 1.1) : arr(k - 1) + 0.45;
    for (let k = 0; k <= n; k++) {
      const t = text({name: `Count state ${k}`, text: `${k} of ${n} entered`, weight: 'semibold', size: 21, color: '$tealText', align: 'right', w: 360, x: o.w - 400, y: 38});
      const s = ts(k), e = k < n ? ts(k + 1) : null, keys = [];
      if (k === 0) keys.push([s, 1]); else keys.push([s - 0.01, 0], [s, 1]);
      if (e !== null) keys.push([e - 0.01, 1], [e, 0]);
      addTrack(t, 'OPACITY', keys);
      f.children.push(t);
    }
    return f;
  };

  // ---- macros learned from reference videos (each expands to the primitives above, so both renderers get it) ----
  // flicker: a row of full-frame items cut hard, one every `step` seconds (Wolff Olins ~0.13 s bursts; thebranx ~0.2 s swaps).
  // Visible only in [t0, t1) with instant edges. Never emits two keyframes at the same time (a start at 0 begins at value 1).
  const hardWindow = (t0, t1) => { const k = []; if (t0 > 0.011) k.push([0, 0], [t0 - 0.01, 0], [t0, 1]); else k.push([0, 1]); k.push([t1 - 0.01, 1], [t1, 0]); return k; };
  const flicker = o => {
    const g = frame({name: o.name || 'Flicker burst', w: meta.w, h: meta.h, x: 0, y: 0});
    const step = o.step ?? 0.15, until = o.until;
    g.shots = [];
    (o.items || []).forEach((it, i) => {
      const t0 = o.at + i * step, t1 = (i === o.items.length - 1 && until) ? until : t0 + step;
      const n = expand(it);
      addTrack(n, 'OPACITY', hardWindow(t0, t1));
      g.children.push(n);
      g.shots.push({start: t0, end: t1});
    });
    return g;
  };
  // wipeBars: N vertical bars drop in and out across the frame (zypsy column wipes, Landor shape wipes). Covers the cut at `at + cover`.
  const wipeBars = o => {
    const g = frame({name: o.name || 'Wipe bars', w: meta.w, h: meta.h, x: 0, y: 0});
    const N = o.bars ?? 6, cover = o.cover ?? 0.25, out = o.out ?? 0.25, stag = o.stagger ?? 0.03, bw = Math.ceil(meta.w / N) + 2;
    for (let i = 0; i < N; i++) {
      const b = rect({name: `Bar ${i + 1}`, w: bw, h: meta.h, x: i * (meta.w / N), y: 0, fill: o.color || '$dark'});
      const a = o.at + i * stag, mid = a + cover, end = mid + (o.hold ?? 0) + out;
      addTrack(b, 'TRANSLATION_Y', [[a, -meta.h], [mid, 0, 'EASE_IN_AND_OUT'], [mid + (o.hold ?? 0), 0], [end, meta.h, 'EASE_IN_AND_OUT']]);
      addTrack(b, 'OPACITY', [[0, 0], [Math.max(0.011, a - 0.01), 0], [a, 1], [end, 1], [end + 0.01, 0]]);
      g.children.push(b);
    }
    return g;
  };
  // logoReveal: a simple mark pops in (scale + turn), then the wordmark slides out of it (thebranx, zypsy, Landor end cards).
  const logoReveal = o => {
    const S = o.markSize ?? 110;
    const f = frame({name: o.name || 'Logo reveal', layout: 'h', gap: o.gap ?? 28, align: 'center', sizeW: 'hug', cx: o.cx, cy: o.cy});
    const mark = rect({shape: o.shape || 'rect', name: 'Logo mark', w: S, h: S, radius: o.shape === 'ellipse' ? 0 : (o.markRadius ?? S * 0.27), fill: o.markFill || '$teal'});
    const word = text({name: 'Wordmark', text: o.word, font: o.font || 'serif', size: o.size || 150, color: o.color || '#F0EEE6'});
    const t = o.at;
    for (const fl of ['SCALE_X', 'SCALE_Y']) addTrack(mark, fl, [[t, 0.2], [t + 0.45, 1, 'EASE_OUT_BACK']]);
    addTrack(mark, 'ROTATION', [[t, -90], [t + 0.45, 0, 'EASE_OUT']]);
    addTrack(mark, 'OPACITY', [[t, 0], [t + 0.15, 1]]);
    addTrack(word, 'TRANSLATION_X', [[t + 0.3, -60], [t + 0.8, 0, 'EASE_OUT']]);
    addTrack(word, 'OPACITY', [[t + 0.3, 0], [t + 0.7, 1, 'EASE_OUT']]);
    f.children.push(mark, word);
    return f;
  };

  const BUILD = {text, frame, shape: rect, rect, path, card, caption, counter, clock, table, flicker, wipeBars, logoReveal};
  function expand(o) {
    const b = BUILD[o.type];
    if (!b) throw new Error(`Unknown element type: ${o.type}`);
    const n = b(o);
    if (o.type === 'frame' || o.type === 'group') for (const c of (o.children || [])) n.children.push(expand(c));
    applyMotion(n, o.motion);
    return n;
  }

  // ---- scenes ----
  const scenes = spec.scenes.map(s => {
    const root = frame({name: s.name || s.id, w: meta.w, h: meta.h, x: 0, y: 0, fill: s.bg ? s.bg : null});
    root.scene = {id: s.id, start: s.start, end: s.end};
    for (const c of s.children || []) root.children.push(expand(c));
    applyMotion(root, s.motion);
    if (s.fade !== false) {
      if (s.fade === 'in') addTrack(root, 'OPACITY', [[s.start, 0], [s.start + 0.1, 1]]);
      else if (s.fade === 'hard') addTrack(root, 'OPACITY', hardWindow(s.start, s.end));   // hard cut in and out (no dissolve)
      else addTrack(root, 'OPACITY', [[s.start, 0], [s.start + 0.1, 1], [s.end - 0.08, 1], [s.end, 0]]);
    }
    return root;
  });
  // layers: persistent layers that stay while the shots under them change (thebranx decoration, Wolff Olins label/object, zypsy chips).
  // They are built like scenes, sit on top, and appear/disappear with hard edges unless `fade` says otherwise.
  const layers = (spec.layers || []).map(s => {
    const root = frame({name: s.name || s.id, w: meta.w, h: meta.h, x: 0, y: 0, fill: s.bg ? s.bg : null});
    root.scene = {id: s.id, start: s.start, end: s.end, layer: true};
    for (const c of s.children || []) root.children.push(expand(c));
    applyMotion(root, s.motion);
    if (s.fade !== false) {
      if (s.fade === 'soft') addTrack(root, 'OPACITY', [[s.start, 0], [s.start + 0.15, 1], [s.end - 0.15, 1], [s.end, 0]]);
      else addTrack(root, 'OPACITY', hardWindow(s.start, s.end));
    }
    return root;
  });

  const main = mk('frame', {name: meta.title, w: meta.w, h: meta.h, fill: {color: C(meta.background?.base || '$paper'), opacity: 1}, clip: true, x: 0, y: 0, layout: null, pad: [0, 0, 0, 0], gap: 0, align: 'start', sizeW: 'fixed', sizeH: 'fixed', stroke: null, shadow: null, blur: 0, radius: 0});
  if (meta.background?.kind === 'paper') {
    const paper = frame({name: 'Paper texture', w: meta.w, h: meta.h, x: 0, y: 0, clip: true});
    (meta.background.mottle || [[300, 200, 900, 600, '#D6D3CA', 0.55], [1500, 800, 1000, 700, '#D9D6CE', 0.5], [1600, 150, 700, 500, '#F2F0EA', 0.7], [500, 900, 800, 500, '#F2F0EA', 0.6]])
      .forEach(([x, y, w, h, c, op], i) => paper.children.push(rect({shape: 'ellipse', name: `Mottle ${i + 1}`, w, h, x: x - w / 2, y: y - h / 2, fill: {color: c, opacity: op}, blur: 140})));
    main.children.push(paper);
  }
  main.children.push(...scenes, ...layers);

  const fontSet = new Set();
  (function walk(n) {
    if (n.type === 'text') for (const r of n.text.runs) fontSet.add(`${tokens.fonts[r.font].figma}|${tokens.fonts[r.font].styles[r.weight]}`);
    n.children.forEach(walk);
  })(main);

  return {meta, tokens, root: main, audio: spec.audio || {events: []}, fonts: [...fontSet].map(s => s.split('|'))};
}
