// A 12 s brand-reel for a FICTIONAL studio ("Fenwick Lane"). Original words, colours and layout.
// It exercises what the reference study produced: anchor layer, flicker burst, counter + bar in sync,
// push transition, bar wipe, zoom-through, and a logo that starts as a shape.
const W = 1920, H = 1080;
const COBALT = '#1F3BFF';
const words = [['Bold', '#FFD23F', '#16202C'], ['Quiet', '#14213D', '#FFFFFF'], ['Loud', '#E8E6DF', '#16202C'], ['Warm', '#FF6B35', '#16202C'], ['Sharp', '#2EC4B6', '#16202C'], ['Soft', '#C8452D', '#FFFFFF'], ['Fast', '#1D3557', '#FFFFFF'], ['Calm', '#7FF0D4', '#16202C']];
const BAR_W = 1400, S1 = 0.01, S2 = 0.87;

const events = [{t: 1.65, k: 'whoosh'}, {t: 2.0, k: 'thunk'}];
words.forEach((_, i) => events.push({t: 2.0 + i * 0.15, k: 'tick'}));
events.push({t: 3.4, k: 'thunk'}, {t: 6.0, k: 'thunk'}, {t: 7.0, k: 'whoosh'}, {t: 8.3, k: 'whoosh'}, {t: 9.0, k: 'chime'});

export default {
  meta: {title: 'Brand reel 16x9 (play with Motion)', w: W, h: H, fps: 30, duration: 12, pacing: 'standard', background: {base: '#E8E6DF'}},
  tokens: {colors: {cobalt: COBALT, sand: '#E8E6DF', sun: '#FFD23F'}},
  audio: {events},
  scenes: [
    {
      id: 's1', name: 'Shot 1 / Statement on cobalt (0.0-2.0s)', start: 0, end: 2.0, bg: '$cobalt', fade: 'hard',
      children: [
        {type: 'text', name: 'Statement', text: 'We make brands move.', font: 'serif', size: 190, lh: 190, color: '#FFFFFF', align: 'center', w: 1500, x: 210, y: 330,
          motion: [{preset: 'fadeUp', at: 0.1, dur: 0.45, dy: 40}, {preset: 'zoomThrough', at: 1.65, dur: 0.2, to: 10}]},
      ],
    },
    {
      id: 's2', name: 'Shot 2 / Flicker burst (2.0-3.4s)', start: 2.0, end: 3.4, fade: 'hard',
      children: [
        {type: 'flicker', at: 2.0, step: 0.15, until: 3.4,
          items: words.map(([w, bg, fg]) => ({type: 'frame', name: 'Burst / ' + w, w: W, h: H, x: 0, y: 0, fill: bg,
            children: [{type: 'text', name: w, text: w, font: 'serif', size: 330, color: fg, align: 'center', w: W, x: 0, y: 350}]}))},
      ],
    },
    {
      id: 's3', name: 'Shot 3 / Counter and bar in sync (3.4-6.0s)', start: 3.4, end: 6.0, fade: 'hard', bg: '$sand',
      children: [
        {type: 'text', name: 'Label', text: 'People who remembered the brand', size: 44, weight: 'medium', color: '$muted', x: 260, y: 190, motion: [{preset: 'fadeUp', at: 3.45, dur: 0.4, dy: 20}]},
        {type: 'counter', name: 'Counter', from: 3.4, at: 3.6, dur: 1.5, steps: 10, to: 87, decimals: 0, suffix: '%', ease: 'cubic', font: 'serif', size: 330, color: '$navy', y: 250, h: 380},
        {type: 'shape', shape: 'rect', name: 'Bar track', w: BAR_W, h: 36, x: 260, y: 700, radius: 18, fill: '#CFCBC0'},
        {type: 'shape', shape: 'rect', name: 'Bar fill', w: BAR_W, h: 36, x: 260, y: 700, radius: 18, fill: '$navy',
          motion: [{preset: 'keys', tracks: {
            // Same easing and the same time span as the counter, so number and bar stay locked together. Left edge fixed: translate by half the lost width.
            SCALE_X: [[3.6, S1], [5.1, S2, 'EASE_OUT']],
            TRANSLATION_X: [[3.6, -(BAR_W / 2) * (1 - S1)], [5.1, -(BAR_W / 2) * (1 - S2), 'EASE_OUT']],
          }}]},
        {type: 'text', name: 'Disclaimer', text: 'Fictional studio · demo figures', size: 26, color: '$muted', x: 260, y: 960},
      ],
    },
    {
      id: 's4a', name: 'Shot 4a / Strategy, pushed out (6.0-7.25s)', start: 6.0, end: 7.25, fade: 'hard', bg: '#F4F2EC',
      children: [
        {type: 'text', name: 'Word', text: 'Strategy.', font: 'serif', size: 300, color: '$navy', align: 'center', w: W, x: 0, y: 380,
          motion: [{preset: 'slide', at: 7.0, dur: 0.25, toY: -H}]},
      ],
    },
    {
      id: 's4b', name: 'Shot 4b / Identity, pushed in (7.0-8.7s)', start: 7.0, end: 8.7, fade: 'hard', bg: '$sun',
      motion: [{preset: 'slide', at: 7.0, dur: 0.25, fromY: H}],
      children: [
        {type: 'text', name: 'Word', text: 'Identity.', font: 'serif', size: 300, color: '#16202C', align: 'center', w: W, x: 0, y: 380},
      ],
    },
    {
      id: 's5', name: 'Shot 5 / End card (8.7-12.0s)', start: 8.7, end: 12.0, fade: 'hard', bg: '$cobalt',
      children: [
        {type: 'logoReveal', cx: 960, cy: 470, at: 9.0, word: 'Fenwick Lane', size: 150, color: '#FFFFFF', markSize: 120, markFill: {gradient: ['#FFD23F', '#FF6B35']}},
        {type: 'text', name: 'Tagline', text: 'Brands that move.', size: 52, color: '#DCE2FF', align: 'center', w: W, x: 0, y: 640, motion: [{preset: 'fadeUp', at: 9.9, dur: 0.45, dy: 24}]},
        {type: 'text', name: 'Fine print', text: 'Fictional studio · motion study', size: 26, color: '#B8C2FF', align: 'center', w: W, x: 0, y: 980},
      ],
    },
  ],
  layers: [
    {
      id: 'anchor', name: 'Anchor / studio chip (stays across shots 2-4)', start: 2.0, end: 8.3,
      children: [
        {type: 'frame', name: 'Chip', layout: 'h', pad: [12, 24, 12, 24], radius: 999, fill: '#16202C', sizeW: 'hug', x: 80, y: 70,
          children: [{type: 'text', name: 'Chip text', text: 'Fenwick Lane', weight: 'semibold', size: 30, color: '#FFFFFF'}]},
      ],
    },
    {
      id: 'wipe', name: 'Wipe / bars over the cut to the end card (8.3-9.0s)', start: 8.3, end: 9.0, fade: false,
      children: [{type: 'wipeBars', at: 8.3, bars: 6, cover: 0.25, out: 0.25, stagger: 0.03, color: '#14213D'}],
    },
  ],
};
