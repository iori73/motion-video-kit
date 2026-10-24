// Interpreter that runs INSIDE the Figma `use_figma` tool. emit.mjs prepends `const FONTS=...; const DATA=...;`.
// It builds editable layers from the compiled tree and applies the keyframe tracks with Figma Motion.
const C = h => { h = h.replace('#', ''); return {r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255}; };
const solid = (c, o = 1) => ({type: 'SOLID', color: C(c), opacity: o});
await Promise.all(FONTS.map(([family, style]) => figma.loadFontAsync({family, style})));
const TOK = DATA.tokens;
const SHADOWS = {
  card: {type: 'DROP_SHADOW', color: {r: 0.16, g: 0.16, b: 0.12, a: 0.22}, offset: {x: 0, y: 10}, radius: 30, spread: 0, visible: true, blendMode: 'NORMAL'},
  panel: {type: 'DROP_SHADOW', color: {r: 0.16, g: 0.16, b: 0.12, a: 0.35}, offset: {x: 0, y: 30}, radius: 70, spread: 0, visible: true, blendMode: 'NORMAL'},
};
let PAGE = figma.currentPage;
if (DATA.page) {
  PAGE = figma.root.children.find(x => x.name === DATA.page) || (() => { const p = figma.createPage(); p.name = DATA.page; return p; })();
  await figma.setCurrentPageAsync(PAGE);
}
const created = [];
const pending = [];
const fontOf = r => ({family: TOK.fonts[r.font].figma, style: TOK.fonts[r.font].styles[r.weight]});
const fillOf = f => {
  if (!f) return [];
  if (f.gradient) return [{type: 'GRADIENT_LINEAR', gradientTransform: [[0.7071, 0.7071, -0.2071], [-0.7071, 0.7071, 0.5]], gradientStops: [{position: 0, color: {...C(f.gradient[0]), a: 1}}, {position: 1, color: {...C(f.gradient[1]), a: 1}}]}];
  return [solid(f.color, f.opacity ?? 1)];
};
function styleCommon(node, n) {
  // Frames get a white fill by default in Figma, so always set fills (empty when the spec has none).
  if ('fills' in node && n.type !== 'text' && n.type !== 'path') node.fills = fillOf(n.fill);
  if (n.radius && 'cornerRadius' in node) node.cornerRadius = n.radius;
  if (n.stroke && 'strokes' in node) {
    node.strokes = [solid(n.stroke.color)];
    if (n.stroke.sides === 'left') { node.strokeTopWeight = 0; node.strokeBottomWeight = 0; node.strokeRightWeight = 0; node.strokeLeftWeight = n.stroke.weight; }
    else node.strokeWeight = n.stroke.weight;
  }
  const fx = [];
  if ((n.blur && n.blur > 0) || (n.tracks && n.tracks.BLUR)) fx.push({type: 'LAYER_BLUR', blurType: 'NORMAL', radius: n.blur || 0, visible: true});
  if (n.shadow) fx.push(SHADOWS[n.shadow]);
  if (fx.length && 'effects' in node) node.effects = fx;
  if (n.opacity !== undefined) node.opacity = n.opacity;
}
function mkText(n, parent, inLayout) {
  const t = figma.createText(), T = n.text;
  t.fontName = fontOf(T.runs[0]); t.fontSize = T.size;
  t.characters = T.runs.map(r => r.t).join('');
  let i = 0;
  for (const r of T.runs) { const j = i + r.t.length; if (j > i) { t.setRangeFontName(i, j, fontOf(r)); t.setRangeFills(i, j, [solid(r.color)]); } i = j; }
  if (T.lh) t.lineHeight = {unit: 'PIXELS', value: T.lh};
  if (T.ls) t.letterSpacing = {unit: 'PIXELS', value: T.ls};
  t.textAlignHorizontal = {left: 'LEFT', center: 'CENTER', right: 'RIGHT'}[T.align] || 'LEFT';
  parent.appendChild(t);
  if (T.w) { t.textAutoResize = 'HEIGHT'; t.resize(T.w, t.height); }
  else if (T.fill) { t.textAutoResize = 'HEIGHT'; if (inLayout) t.layoutSizingHorizontal = 'FILL'; else t.resize(parent.width, t.height); }
  return t;
}
function mkFrame(n, parent) {
  const f = n.layout ? figma.createAutoLayout(n.layout === 'v' ? 'VERTICAL' : 'HORIZONTAL') : figma.createFrame();
  parent.appendChild(f);
  if (n.layout) {
    f.itemSpacing = n.gap || 0;
    const p = n.pad || [0, 0, 0, 0];
    f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3];
    f.counterAxisAlignItems = n.align === 'center' ? 'CENTER' : 'MIN';
    if (n.sizeW !== 'hug' && n.w != null) f.resize(n.w, f.height);
    if (n.sizeH !== 'hug' && n.h != null) f.resize(f.width, n.h);
    f.layoutSizingHorizontal = (n.sizeW === 'hug' || n.w == null) ? 'HUG' : 'FIXED';
    f.layoutSizingVertical = (n.sizeH === 'hug' || n.h == null) ? 'HUG' : 'FIXED';
  } else {
    f.resize(n.w, n.h);
  }
  f.clipsContent = !!n.clip;
  return f;
}
function mkPath(n, parent) {
  const v = figma.createVector();
  parent.appendChild(v);
  return v;
}
async function finishPath(v, n) {
  const verts = n.points.map(([x, y]) => ({x, y}));
  const segs = n.points.slice(1).map((_, i) => ({start: i, end: i + 1, tangentStart: {x: n.tangents[i][0], y: n.tangents[i][1]}, tangentEnd: {x: n.tangents[i][2], y: n.tangents[i][3]}}));
  await v.setVectorNetworkAsync({vertices: verts, segments: segs});
  v.strokes = [solid(n.stroke.color)]; v.strokeWeight = n.stroke.weight; v.strokeCap = 'ROUND'; v.fills = [];
  v.x = n.x + Math.min(...verts.map(p => p.x)); v.y = n.y + Math.min(...verts.map(p => p.y));
}
async function build(n, parent, inLayout) {
  let node;
  if (n.type === 'frame') node = mkFrame(n, parent);
  else if (n.type === 'text') node = mkText(n, parent, inLayout);
  else if (n.type === 'rect') { node = figma.createRectangle(); parent.appendChild(node); node.resize(n.w, n.h); }
  else if (n.type === 'ellipse') { node = figma.createEllipse(); parent.appendChild(node); node.resize(n.w, n.h); }
  else if (n.type === 'path') node = mkPath(n, parent);
  node.name = n.name || n.type;
  styleCommon(node, n);
  for (const c of (n.children || [])) await build(c, node, !!n.layout);
  if (n.type === 'path') await finishPath(node, n);
  else if (!inLayout) {
    const w = node.width, h = node.height;
    if (n.anchor === 'center') { node.x = n.cx - w / 2; node.y = n.cy - h / 2; }
    else if (n.anchor === 'bc') { node.x = n.cx - w / 2; node.y = n.by - h; }
    else { node.x = n.x || 0; node.y = n.y || 0; }
    if (n.rot) {
      const a = n.rot * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), cx = node.x + w / 2, cy = node.y + h / 2;
      node.relativeTransform = [[cs, -sn, cx - (cs * w / 2 - sn * h / 2)], [sn, cs, cy - (sn * w / 2 + cs * h / 2)]];
    }
  }
  created.push(node.id);
  if (n.tracks && Object.keys(n.tracks).length) pending.push([node, n.tracks]);
  return node;
}
const kfs = (keys, sign = 1) => keys.map(k => ({timelinePosition: k.t, value: {type: 'FLOAT', value: sign * k.v}, ...(k.e ? {easing: {type: k.e}} : {})}));
function applyTracks() {
  let count = 0;
  for (const [node, tr] of pending) {
    for (const [field, keys] of Object.entries(tr)) {
      if (field === 'BLUR') node.applyManualKeyframeTrack({type: 'INDEXED_ITEM', collection: 'effects', index: 0, field: 'RADIUS'}, {keyframes: kfs(keys)});
      else node.applyManualKeyframeTrack({type: 'PROPERTY', name: field}, {keyframes: kfs(keys, field === 'ROTATION' ? -1 : 1)});
      count++;
    }
  }
  return count;
}
function ensureTimeline(node) {
  const [tl] = node.timelines;
  if (tl && tl.duration < DATA.duration) node.setTimelineDuration(tl.id, DATA.duration);
}

let main;
if (DATA.mode === 'main') {
  if (PAGE.children.find(c => c.name === DATA.main.name)) return {error: 'A top-level node named "' + DATA.main.name + '" already exists on this page. Rename or remove it first.'};
  let maxX = 0; for (const c of PAGE.children) maxX = Math.max(maxX, c.x + c.width);
  main = await build(DATA.main, PAGE, false);
  if (PAGE.children.length > 1) main.x = maxX + 200;
  main.y = 0;
} else {
  main = PAGE.children.find(c => c.name === DATA.mainName);
  if (!main) return {error: 'Main frame "' + DATA.mainName + '" not found on page. Run chunk 0 first.'};
}
let scene = null;
for (const s of (DATA.scenes || [])) scene = await build(s, main, false);
if (DATA.mode === 'children') {
  scene = main.children.find(c => c.name === DATA.sceneName);
  if (!scene) return {error: 'Scene "' + DATA.sceneName + '" not found.'};
  for (const c of DATA.children) await build(c, scene, false);
}
const tracks = applyTracks();
let tlNode = scene || main.children[0];
if (tlNode) ensureTimeline(tlNode);
const sceneIds = (DATA.scenes || []).length ? main.children.slice(-DATA.scenes.length).map(c => c.id) : [];
return {mode: DATA.mode, mainId: main.id, sceneIds, createdCount: created.length, trackCount: tracks, timelines: tlNode ? tlNode.timelines : null};
