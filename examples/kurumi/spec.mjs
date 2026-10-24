// Kurumi v2: a fictional bakery-wholesale order-entry service. Original work; no third-party footage, script or people.
const cards1 = [
  ['message', 'Maya · chat', 'Two trays of croissants for Friday 🙏', 1060, 300, -5],
  ['note', 'Photo of a note', '12 sourdough loaves — Fri', 1440, 250, 4],
  ['audio', 'Voice message · 0:14', '', 1560, 540, -3],
  ['doc', 'Email · Harbor Café', 'Weekend order: rye x4 for Saturday', 1130, 610, 3],
  ['message', 'Priya · chat', 'Add 3 focaccia slabs Sat?', 760, 820, -4],
  ['doc', 'Email · PO #2041', '30 pain au chocolat, due Tuesday', 1480, 850, 5],
];
const cards2 = [
  ['message', 'Maya · chat', 'Two trays of croissants for Friday 🙏'],
  ['note', 'Photo of a note', '12 sourdough loaves — Fri'],
  ['audio', 'Voice message · 0:14', ''],
  ['doc', 'Email · Harbor Café', 'Weekend order: rye x4 for Saturday'],
];
const sheetRows = [['croissants', {t: '48?', color: '$red'}, 'Fri'], ['sourdough', '12', 'Fri'], ['baguettes', '6', 'Fri'], ['rye', '4', 'Sat'], ['cinnamon', '24', 'Sat'], ['focaccia', '3', 'Sat']];
const orders = [['Croissant trays', '48', 'Fri', 'Chat'], ['Sourdough loaves', '12', 'Fri', 'Photo'], ['Baguettes', '6', 'Fri', 'Chat'], ['Rye loaves', '4', 'Sat', 'Email'], ['Cinnamon rolls', '24', 'Sat', 'Voice'], ['Focaccia slabs', '3', 'Sat', 'Chat'], ['Brioche buns', '48', 'Mon', 'Chat'], ['Olive loaves', '8', 'Mon', 'Photo'], ['Pain au chocolat', '30', 'Tue', 'Email']];

const events = [];
for (let i = 0; i < 6; i++) events.push({t: 0.55 + i * 0.12, k: 'tick'});
events.push({t: 5.9, k: 'whoosh'});
for (const t of [8.6, 9.8, 11.0, 12.2]) events.push({t, k: 'thunk'});
for (const t of [13.2, 16.0, 18.1, 20.3]) events.push({t, k: 'tick'});
events.push({t: 22.5, k: 'whoosh'});
for (let i = 0; i < 9; i++) events.push({t: 23.6 + i * 0.55, k: 'tick'});
events.push({t: 32.6, k: 'whoosh'}, {t: 38.8, k: 'chime'});

export default {
  meta: {title: 'Kurumi v2 (play with Motion)', w: 1920, h: 1080, fps: 30, duration: 45, background: {kind: 'paper'}},
  audio: {events},
  scenes: [
    {
      id: 's1', name: 'Scene 1 / Orders arrive all night (0.0-4.2s)', start: 0, end: 4.2,
      children: [
        {type: 'text', name: 'Headline', text: 'Orders arrive\nall night.', font: 'serif', size: 128, lh: 131, color: '$navy', x: 120, y: 170, motion: [{preset: 'fadeUp', at: 0.1, dur: 0.8, dy: 40}]},
        ...cards1.map(([variant, who, text, cx, cy, rot], i) => ({
          type: 'card', variant, who, text, cx, cy, rot,
          motion: [{preset: 'enterTiltBlur', at: 0.35 + i * 0.12, dur: 0.85, dy: 520, rot: 22, blur: 9}],
        })),
        {type: 'caption', text: 'Chat, photo, voice, email.', motion: [{preset: 'window', in: [1.2, 1.6], out: [3.7, 4.1]}]},
      ],
    },
    {
      id: 's2', name: 'Scene 2 / Then someone retypes (4.2-8.6s)', start: 4.2, end: 8.6,
      children: [
        {type: 'text', name: 'Headline', runs: [{t: 'Then someone '}, {t: 'retypes', font: 'hand', color: '$red'}, {t: '\nevery one.'}], font: 'serif', size: 92, lh: 96, color: '$navy', x: 120, y: 90, motion: [{preset: 'fadeUp', at: 4.3, dur: 0.5, dy: 30}]},
        {type: 'path', name: 'Scribble underline', points: [[0, 22], [180, 18], [356, 12]], tangents: [[60, -16, -60, 18], [60, -18, -56, 8]], x: 700, y: 190, color: '$red', weight: 5, motion: [{preset: 'draw', at: 6.6, dur: 0.9}]},
        ...cards2.map(([variant, who, text], i) => {
          const cy = 360 + i * 150;
          return {
            type: 'card', variant, who, text, w: 500, cx: 1230, cy, name: `List card ${i + 1} / ${variant}`,
            motion: [{preset: 'pileToList', enterAt: 4.2 + i * 0.1, holdUntil: 5.9, spreadDur: 1.2, dx: 900 + i * 8 - 1230, dy: 640 - i * 30 - cy, rot: (i % 2 ? 8 : -8) + i * 2}],
          };
        }),
      ],
    },
    {
      id: 's3a', name: 'Scene 3a / 5:40 am (8.6-9.8s)', start: 8.6, end: 9.8, bg: '$dark',
      children: [
        {type: 'clock', cx: 960, cy: 360, size: 460, from: {hour: 5, min: 0}, to: {hour: 5, min: 40}, at: 8.6, dur: 1.1, motion: [{preset: 'scale', at: 8.6, dur: 1.2, from: 1.12, to: 1, ease: 'LINEAR'}]},
        {type: 'text', name: 'Time label', text: '5:40 am', font: 'serif', size: 130, color: '#F0EEE6', align: 'center', w: 1920, x: 0, y: 690},
      ],
    },
    {
      id: 's3b', name: 'Scene 3b / Retype retype retype (9.8-11.0s)', start: 9.8, end: 11.0,
      children: [
        {type: 'table', style: 'sheet', name: 'Spreadsheet', x: 300, y: 150, w: 1320, h: 624, rowH: 104, cols: [30, 840, 1080], rows: sheetRows, reveal: {at: 9.85, gap: 0.17, cellGap: 0.05}, motion: [{preset: 'scale', at: 9.8, dur: 1.2, from: 1.05, to: 1}]},
        {type: 'text', name: 'Handwritten note', text: 'retype. retype. retype.', font: 'hand', size: 76, color: '$red', align: 'center', w: 1920, x: 0, y: 880, motion: [{preset: 'window', in: [10.2, 10.6]}]},
      ],
    },
    {
      id: 's3c', name: 'Scene 3c / Which tray (11.0-12.2s)', start: 11.0, end: 12.2,
      children: [
        {type: 'text', name: 'Big question', text: 'Which tray?', font: 'serif', size: 190, color: '$navy', align: 'center', w: 1920, x: 0, y: 380, motion: [{preset: 'scale', at: 11.0, dur: 0.9, from: 1.1, to: 1}]},
        {type: 'path', name: 'Scribble underline', points: [[0, 40], [1030, 38]], tangents: [[200, 30, -530, -28]], x: 440, y: 620, color: '$red', weight: 7, motion: [{preset: 'draw', at: 11.3, dur: 0.65}]},
      ],
    },
    {
      id: 's4', name: 'Scene 4 / Two trays, of what size (12.2-22.5s)', start: 12.2, end: 22.5,
      motion: [{preset: 'scale', at: 12.2, dur: 10.3, from: 1, to: 1.06, ease: 'LINEAR'}],
      children: [
        {type: 'text', name: 'Headline', text: 'Two trays. Of what size?', font: 'serif', size: 96, color: '$navy', align: 'center', w: 1920, x: 0, y: 80, motion: [{preset: 'fadeUp', at: 13.2, dur: 0.7, dy: 30}]},
        {type: 'card', name: 'Chat card / Maya', variant: 'message', w: 520, who: 'Maya · chat', text: 'Two trays of croissants for Friday.', size: 32, cx: 560, cy: 540, rot: -2, motion: [{preset: 'enterTiltBlur', at: 12.3, dur: 0.8, dy: 60, rot: 6, blur: 8}]},
        {type: 'card', name: 'Option card / 12 per tray', variant: 'message', w: 340, pad: 26, padV: 26, center: true, big: true, who: '12', text: 'per tray', size: 30, cx: 1180, cy: 520, rot: -3, motion: [{preset: 'enterTiltBlur', at: 16.0, dur: 0.9, dy: 320, rot: -8, blur: 10}, {preset: 'window', out: [18.6, 19.2], to: 0.25}]},
        {type: 'card', name: 'Option card / 24 per tray', variant: 'message', w: 340, pad: 26, padV: 26, center: true, big: true, who: '24', text: 'per tray', size: 30, cx: 1450, cy: 520, rot: 3, motion: [{preset: 'enterTiltBlur', at: 16.2, dur: 0.9, dy: 320, rot: 8, blur: 10}, {preset: 'scale', at: 18.3, dur: 0.6, from: 1, to: 1.08}]},
        {type: 'card', name: 'Kurumi card', variant: 'message', w: 600, fill: '$navy', who: 'Kurumi', whoColor: '#9FC0E6', text: "Past orders say Maya's trays hold 24.", textColor: '$white', size: 28, cx: 1200, cy: 780, motion: [{preset: 'enterTiltBlur', at: 18.1, dur: 0.8, dy: 320, rot: 4, ease: 'EASE_OUT_BACK'}]},
        {type: 'card', name: 'Result card / Entered', variant: 'message', w: 560, stroke: {color: '#5FB89A', weight: 3}, who: 'Entered', text: 'Croissants × 48 · Fri 7:00 ✓', bold: true, size: 34, cx: 960, cy: 930, motion: [{preset: 'enterTiltBlur', at: 20.3, dur: 0.8, dy: 190, ease: 'EASE_OUT_BACK'}]},
        {type: 'path', name: 'Connector', points: [[0, 88], [190, 0]], tangents: [[0, -38, -10, 60]], x: 1260, y: 640, color: '$navy', weight: 4, motion: [{preset: 'draw', at: 18.7, dur: 0.7}]},
      ],
    },
    {
      id: 's5', name: 'Scene 5 / Orders enter the table (22.5-32.5s)', start: 22.5, end: 32.5,
      children: [
        {type: 'table', style: 'orders', name: "Panel / Today's orders", x: 480, y: 150, w: 960, h: 780, title: "Today's orders", header: ['ITEM', 'QTY', 'DUE', 'SOURCE', 'STATUS'], cols: [52, 352, 452, 552, 692], statusX: 692, rows: orders, reveal: {at: 23.6, gap: 0.55, countFrom: 22.5},
          motion: [{preset: 'keys', tracks: {TRANSLATION_Y: [[22.5, 260], [23.4, 0, 'EASE_OUT']], OPACITY: [[22.5, 0], [23.2, 1, 'EASE_OUT']]}}, {preset: 'scale', at: 22.5, dur: 10, from: 1, to: 1.03, ease: 'LINEAR'}]},
        {type: 'caption', name: 'Caption 1', text: 'Kurumi reads every message', motion: [{preset: 'window', in: [22.9, 23.3], out: [27.1, 27.5]}]},
        {type: 'caption', name: 'Caption 2', text: 'and does the rest.', motion: [{preset: 'window', in: [27.9, 28.3], out: [32.0, 32.4]}]},
      ],
    },
    {
      id: 's6', name: 'Scene 6 / 6.5 hrs handed back (32.5-38.5s)', start: 32.5, end: 38.5,
      children: [
        {type: 'text', name: 'Handwritten label', text: 'every week', font: 'hand', size: 70, color: '$red', align: 'center', w: 1920, x: 0, y: 150, motion: [{preset: 'fadeIn', at: 32.7, dur: 0.5}]},
        {type: 'counter', name: 'Counter', from: 32.5, at: 33.0, dur: 2.5, steps: 8, to: 6.5, decimals: 1, suffix: ' hrs', font: 'serif', size: 360, color: '$navy', y: 260, h: 400, motion: [{preset: 'scale', at: 32.5, dur: 1.2, from: 0.95, to: 1}]},
        {type: 'text', name: 'Subline', text: 'of retyping, handed back.', size: 54, color: '$ink', align: 'center', w: 1920, x: 0, y: 700},
        {type: 'text', name: 'Disclaimer', text: 'Fictional product · demo figures', size: 22, color: '$muted', align: 'center', w: 1920, x: 0, y: 1000},
      ],
    },
    {
      id: 's7', name: 'Scene 7 / Kurumi end card (38.5-45.0s)', start: 38.5, end: 45, bg: '$dark', fade: 'in',
      children: [
        {type: 'frame', name: 'End card content', layout: 'v', gap: 16, align: 'center', sizeW: 'hug', cx: 960, cy: 540,
          motion: [{preset: 'fadeUp', at: 38.7, dur: 0.9, dy: 24}, {preset: 'scale', at: 38.5, dur: 6.5, from: 1, to: 1.04, ease: 'LINEAR'}],
          children: [
            {type: 'shape', shape: 'rect', name: 'Logo mark', w: 110, h: 110, radius: 30, fill: {gradient: ['#7FF0D4', '#2A8F9C']}},
            {type: 'text', name: 'Wordmark', text: 'Kurumi', font: 'serif', size: 190, color: '#F0EEE6'},
            {type: 'text', name: 'Tagline', text: 'Every message, handled.', size: 48, color: '#F0EEE6', opacity: 0.85},
            {type: 'text', name: 'Fine print', text: 'Fictional product · motion study', size: 22, color: '#F0EEE6', opacity: 0.5},
          ]},
      ],
    },
  ],
};
