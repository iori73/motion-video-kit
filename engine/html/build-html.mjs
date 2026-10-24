// Usage: node engine/html/build-html.mjs <spec.(json|mjs)> <out.html>
// Compiles the spec and writes a single self-contained HTML page (runtime + compiled spec inlined).
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compile, loadSpec} from '../core/compile.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export function pageFor(compiled) {
  const runtime = readFileSync(resolve(here, 'runtime.js'), 'utf8');
  const {w, h} = compiled.meta;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${compiled.meta.title}</title>
<style>*{margin:0}html,body{width:${w}px;height:${h}px;overflow:hidden;background:${compiled.root.fill?.color || '#fff'}}#stage{position:absolute;inset:0}</style></head>
<body><div id="stage"></div><script>window.__SPEC__=${JSON.stringify(compiled).replace(/</g, '\\u003c')};</script><script>${runtime}</script></body></html>`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [specPath, out] = process.argv.slice(2);
  const compiled = compile(await loadSpec(specPath));
  mkdirSync(dirname(resolve(out)), {recursive: true});
  writeFileSync(out, pageFor(compiled));
  writeFileSync(out.replace(/\.html$/, '.compiled.json'), JSON.stringify(compiled));
  console.log('wrote', out, `(${compiled.meta.w}x${compiled.meta.h}, ${compiled.meta.duration}s)`);
}
