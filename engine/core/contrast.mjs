// Usage: node engine/core/contrast.mjs <spec.(json|mjs)>
// Measures WCAG contrast of every text node against the nearest ancestor with a solid fill.
// Text at 24px+ (or 19px bold) is "large" (needs 3:1); smaller text needs 4.5:1. Exits 1 if any text fails.
import {compile, loadSpec} from './compile.mjs';
import {fileURLToPath} from 'node:url';

const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lum = h => { const [r, g, b] = rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export function check(compiled) {
  const rows = [];
  (function walk(n, bg, sceneStart) {
    const solid = n.fill && n.fill.color && (n.fill.opacity ?? 1) >= 0.99 ? n.fill.color : (n.fill && n.fill.gradient ? n.fill.gradient[1] : null);
    // A translucent fill (e.g. the caption pill at 88%) is blended onto the background below it.
    let own = solid;
    if (n.fill && n.fill.color && (n.fill.opacity ?? 1) < 0.99 && bg) {
      const a = n.fill.opacity, [r1, g1, b1] = rgb(n.fill.color), [r0, g0, b0] = rgb(bg);
      own = '#' + [r1 * a + r0 * (1 - a), g1 * a + g0 * (1 - a), b1 * a + b0 * (1 - a)].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    }
    const here = own || bg;
    if (n.type === 'text') {
      for (const r of n.text.runs) {
        const big = n.text.size >= 24 || (n.text.size >= 19 && r.weight === 'bold');
        const need = big ? 3 : 4.5, got = ratio(r.color, here);
        rows.push({text: r.t.replace(/\n/g, ' ').slice(0, 36), size: n.text.size, fg: r.color, bg: here, ratio: Math.round(got * 100) / 100, need, ok: got >= need || (n.opacity !== undefined && false)});
      }
    }
    for (const c of n.children || []) walk(c, here, sceneStart);
  })(compiled.root, '#FFFFFF');
  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = check(compile(await loadSpec(process.argv[2])));
  const bad = rows.filter(r => !r.ok);
  for (const r of bad) console.log(`FAIL ${r.ratio}:1 (need ${r.need}) ${r.fg} on ${r.bg}  ${r.size}px  "${r.text}"`);
  console.log(`${rows.length} text runs checked, ${bad.length} below threshold`);
  process.exit(bad.length ? 1 : 0);
}
