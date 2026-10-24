// Usage: node engine/figma/emit.mjs <spec.(json|mjs)> <outDir> [--page "Page name"]
// Writes chunk-00.js, chunk-01.js, ... Each chunk is a self-contained script for the Figma `use_figma` tool (<= 45k chars).
// Run them in order: chunk-00 creates the main frame (+paper texture); each later chunk adds a scene (or part of one).
// Keyframes are applied with Figma Motion (applyManualKeyframeTrack).
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compile, loadSpec} from '../core/compile.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MAX = 45000;

const round = v => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
function strip(n) {
  const o = {};
  for (const [k, v] of Object.entries(n)) {
    if (v === null || v === undefined || v === false || v === 0 && k !== 'x' && k !== 'y') continue;
    if (k === 'tracks') { if (!Object.keys(v).length) continue; o.tracks = Object.fromEntries(Object.entries(v).map(([f, ks]) => [f, ks.map(({t, v, e}) => ({t: round(t), v: round(v), ...(e ? {e} : {})}))])); continue; }
    if (k === 'children') { if (v.length) o.children = v.map(strip); continue; }
    if (k === 'pad' && v.every(x => x === 0)) continue;
    if ((k === 'gap' || k === 'radius' || k === 'blur') && !v) continue;
    if (k === 'align' && v === 'start') continue;
    if (k === 'sizeW' && v === 'fixed') continue;
    if (k === 'sizeH' && v === 'fixed') continue;
    o[k] = Array.isArray(v) ? v.map(x => Array.isArray(x) ? x.map(round) : round(x)) : round(v);
  }
  return o;
}
const interp = readFileSync(resolve(here, 'interp.js'), 'utf8');
const sizeOf = o => JSON.stringify(o).length;

export function emit(compiled, {page = null} = {}) {
  const {meta, tokens, root, fonts} = compiled;
  const scenes = root.children.filter(c => c.scene);
  const base = root.children.filter(c => !c.scene);
  const mainStripped = strip({...root, children: base});
  const common = {tokens, page, duration: meta.duration, mainName: root.name};
  const wrap = data => `const FONTS=${JSON.stringify(fonts)};\nconst DATA=${JSON.stringify({...common, ...data})};\n${interp}`;
  const budget = MAX - interp.length - 4000;
  // Greedy packing: the first chunk holds the main frame and as many scenes as fit; later chunks hold more scenes.
  const chunks = [];
  let cur = {mode: 'main', main: mainStripped, scenes: [], size: sizeOf(mainStripped), labels: ['main frame + paper texture']};
  const closeCur = () => { chunks.push({label: cur.labels.join(' | '), code: wrap({mode: cur.mode, ...(cur.mode === 'main' ? {main: cur.main} : {}), scenes: cur.scenes})}); };
  const startNew = () => { cur = {mode: 'scenes', scenes: [], size: 0, labels: []}; };
  for (const s of scenes) {
    const st = strip(s), size = sizeOf(st);
    if (size > budget) {
      // A single scene too big for one chunk: create its root, then add children in groups.
      const {children, ...rootOnly} = st;
      if (cur.scenes.length || cur.mode === 'main') { closeCur(); startNew(); }
      chunks.push({label: s.name + ' (root)', code: wrap({mode: 'scenes', scenes: [rootOnly]})});
      let group = [], gsize = 0;
      const flush = () => { if (group.length) chunks.push({label: s.name + ' (children)', code: wrap({mode: 'children', sceneName: s.name, children: group})}); group = []; gsize = 0; };
      for (const c of children || []) { const cs = sizeOf(c); if (gsize + cs > budget) flush(); group.push(c); gsize += cs; }
      flush();
      continue;
    }
    if (cur.size + size > budget && (cur.scenes.length || cur.mode === 'main')) { closeCur(); startNew(); }
    cur.scenes.push(st); cur.size += size; cur.labels.push(s.name);
  }
  if (cur.scenes.length || cur.mode === 'main') closeCur();
  return chunks;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const [specPath, outDir] = args;
  const pi = args.indexOf('--page');
  const compiled = compile(await loadSpec(specPath));
  const chunks = emit(compiled, {page: pi >= 0 ? args[pi + 1] : null});
  mkdirSync(outDir, {recursive: true});
  chunks.forEach((c, i) => {
    const f = `${outDir}/chunk-${String(i).padStart(2, '0')}.js`;
    writeFileSync(f, c.code);
    console.log(`${f}  ${c.code.length} chars  ${c.label}`);
  });
}
