// Browser runtime. Inlined into the generated scene.html together with the compiled spec (window.__SPEC__).
// seek(t) is a pure function of time: it sets every node's transform/opacity/blur from its keyframe tracks.
(function () {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const EASE = {
    LINEAR: x => x,
    EASE_IN: x => x * x * x,
    EASE_OUT: x => 1 - Math.pow(1 - x, 3),
    EASE_IN_AND_OUT: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    EASE_OUT_BACK: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    HOLD: () => 0,
  };
  function evalTrack(keys, t, rest) {
    if (!keys || !keys.length) return rest;
    if (t <= keys[0].t) return keys[0].v;
    const last = keys[keys.length - 1];
    if (t >= last.t) return last.v;
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i].t) {
        const a = keys[i - 1], b = keys[i];
        const x = (t - a.t) / (b.t - a.t || 1e-9);
        const f = (EASE[b.e || 'LINEAR'] || EASE.LINEAR)(x);
        return a.v + (b.v - a.v) * f;
      }
    }
    return last.v;
  }

  const spec = window.__SPEC__;
  const tokens = spec.tokens;
  const SHADOW = {card: '0 10px 30px rgba(40,40,30,.22)', panel: '0 30px 70px rgba(40,40,30,.35)'};
  const WEIGHT = {regular: 400, medium: 500, semibold: 600, bold: 700};
  const refs = [];

  function paint(f) {
    if (!f) return 'transparent';
    if (f.gradient) return `linear-gradient(135deg,${f.gradient[0]},${f.gradient[1]})`;
    const c = f.color.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${f.opacity ?? 1})`;
  }
  const px = v => v + 'px';

  function build(n, parent, parentLayout) {
    let el;
    if (n.type === 'path') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      el.setAttribute('width', 1); el.setAttribute('height', 1); el.style.overflow = 'visible';
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let d = `M ${n.points[0][0]} ${n.points[0][1]}`;
      for (let i = 1; i < n.points.length; i++) {
        const [x0, y0] = n.points[i - 1], [x1, y1] = n.points[i], [a, b, c, e] = n.tangents[i - 1];
        d += ` C ${x0 + a} ${y0 + b} ${x1 + c} ${y1 + e} ${x1} ${y1}`;
      }
      p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', n.stroke.color);
      p.setAttribute('stroke-width', n.stroke.weight); p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('pathLength', 1); p.setAttribute('stroke-dasharray', 1); p.setAttribute('stroke-dashoffset', 0);
      el.appendChild(p);
      n._path = p;
    } else {
      el = document.createElement('div');
    }
    const s = el.style;
    if (!parentLayout) s.position = 'absolute';
    s.boxSizing = 'border-box'; s.transformOrigin = '50% 50%';
    if (n.opacity !== undefined) s.opacity = n.opacity;
    if (n.type === 'text') {
      const t = n.text;
      s.fontSize = px(t.size); s.whiteSpace = 'pre-wrap'; s.textAlign = t.align; s.lineHeight = t.lh ? px(t.lh) : 'normal';
      if (t.ls) s.letterSpacing = px(t.ls);
      if (t.w) s.width = px(t.w);
      if (t.fill) { s.alignSelf = 'stretch'; if (!parentLayout) s.width = '100%'; }
      for (const r of t.runs) {
        const span = document.createElement('span');
        span.textContent = r.t;
        span.style.fontFamily = tokens.fonts[r.font].css;
        span.style.fontWeight = r.font === 'hand' ? 700 : WEIGHT[r.weight];
        span.style.color = r.color;
        el.appendChild(span);
      }
    } else if (n.type === 'frame' || n.type === 'rect' || n.type === 'ellipse') {
      if (n.w != null) s.width = px(n.w);
      if (n.h != null) s.height = px(n.h);
      s.background = paint(n.fill);
      if (n.type === 'ellipse') s.borderRadius = '50%'; else if (n.radius) s.borderRadius = px(n.radius);
      if (n.stroke) {
        if (n.stroke.sides === 'left') s.borderLeft = `${n.stroke.weight}px solid ${n.stroke.color}`;
        else s.border = `${n.stroke.weight}px solid ${n.stroke.color}`;
      }
      if (n.shadow) s.boxShadow = SHADOW[n.shadow];
      if (n.clip) s.overflow = 'hidden';
      if (n.layout) {
        s.display = 'flex'; s.flexDirection = n.layout === 'v' ? 'column' : 'row';
        s.padding = n.pad.map(px).join(' '); s.gap = px(n.gap);
        s.alignItems = n.align === 'center' ? 'center' : (n.layout === 'v' ? 'stretch' : 'flex-start');
        if (n.sizeW === 'hug') s.width = 'max-content';
        if (n.sizeH === 'hug') s.height = 'auto';
      }
    }
    if (n.type === 'rect' || n.type === 'ellipse' || (parentLayout && n.type !== 'text')) s.flexShrink = '0';
    if (n.type === 'text' && parentLayout) s.flexShrink = '0';
    parent.appendChild(el);
    const ref = {n, el, rest: {rot: n.rot || 0}};
    refs.push(ref);
    for (const c of n.children || []) build(c, el, !!n.layout);
    return ref;
  }

  const stage = document.getElementById('stage');
  const rootRef = build(spec.root, stage, false);
  rootRef.el.style.left = '0px'; rootRef.el.style.top = '0px';

  // Anchored nodes need their own size, so place them after layout.
  for (const r of refs) {
    const n = r.n;
    if (n === spec.root) continue;
    const parentIsLayout = r.el.parentElement && r.el.parentElement.style.display === 'flex';
    if (parentIsLayout) continue;
    if (n.type === 'path') { r.el.style.left = px(n.x); r.el.style.top = px(n.y); continue; }
    const w = r.el.offsetWidth, h = r.el.offsetHeight;
    if (n.anchor === 'center') { r.el.style.left = px(n.cx - w / 2); r.el.style.top = px(n.cy - h / 2); }
    else if (n.anchor === 'bc') { r.el.style.left = px(n.cx - w / 2); r.el.style.top = px(n.by - h); }
    else { r.el.style.left = px(n.x || 0); r.el.style.top = px(n.y || 0); }
  }

  function seek(t) {
    for (const r of refs) {
      const tr = r.n.tracks;
      const has = Object.keys(tr).length;
      const tx = has ? evalTrack(tr.TRANSLATION_X, t, 0) : 0, ty = has ? evalTrack(tr.TRANSLATION_Y, t, 0) : 0;
      const rot = r.rest.rot + (has ? evalTrack(tr.ROTATION, t, 0) : 0);
      const sx = has ? evalTrack(tr.SCALE_X, t, 1) : 1, sy = has ? evalTrack(tr.SCALE_Y, t, 1) : 1;
      if (has || r.rest.rot) r.el.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sx},${sy})`;
      if (tr.OPACITY) r.el.style.opacity = evalTrack(tr.OPACITY, t, r.n.opacity ?? 1);
      const blur = tr.BLUR ? evalTrack(tr.BLUR, t, 0) : (r.n.blur || 0);
      if (blur > 0.05 || tr.BLUR || r.n.blur) r.el.style.filter = blur > 0.05 ? `blur(${blur / 2}px)` : 'none';
      if (r.n._path && tr.PATH_TRIM_END) r.n._path.setAttribute('stroke-dashoffset', 1 - evalTrack(tr.PATH_TRIM_END, t, 1));
    }
  }
  window.seek = seek;
  window.EVENTS = (spec.audio && spec.audio.events) || [];
  seek(0);
})();
