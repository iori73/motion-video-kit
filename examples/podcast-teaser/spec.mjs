// Vertical 9:16 teaser for a podcast episode (editorial / literary genre, no product UI).
// Quote: Okakura Kakuzo, The Book of Tea (1906), public domain.
export default {
  meta: {title: 'Podcast teaser 9x16 (play with Motion)', w: 1080, h: 1920, fps: 30, duration: 15, background: {kind: 'paper', mottle: [[200, 300, 700, 900, '#D6D3CA', 0.55], [900, 1500, 800, 1000, '#D9D6CE', 0.5], [900, 200, 600, 700, '#F2F0EA', 0.7]]}},
  tokens: {colors: {accent: '#C8452D'}},
  audio: {events: [
    {t: 0.6, k: 'tick'}, {t: 1.2, k: 'tick'}, {t: 1.8, k: 'tick'},
    {t: 3.8, k: 'whoosh'}, {t: 5.0, k: 'thunk'}, {t: 6.2, k: 'thunk'},
    {t: 7.5, k: 'tick'}, {t: 8.6, k: 'tick'}, {t: 12.1, k: 'chime'},
  ]},
  scenes: [
    {
      id: 's1', name: 'Scene 1 / Quote (0.0-3.8s)', start: 0, end: 3.8,
      children: [
        {type: 'text', name: 'Label', text: 'BILINGUAL BOOKS', weight: 'semibold', size: 30, ls: 6, color: '$muted', x: 80, y: 150, motion: [{preset: 'fadeIn', at: 0.2, dur: 0.5}]},
        {type: 'text', name: 'Quote', text: 'Teaism is a cult founded on the adoration of the beautiful among the sordid facts of everyday existence.', font: 'serif', size: 92, lh: 108, color: '$navy', w: 920, x: 80, y: 480, motion: [{preset: 'fadeUp', at: 0.5, dur: 0.9, dy: 50}]},
        {type: 'path', name: 'Rule', points: [[0, 0], [360, 0]], tangents: [[120, 6, -120, -6]], x: 80, y: 1180, color: '$accent', weight: 6, motion: [{preset: 'draw', at: 1.8, dur: 0.8}]},
        {type: 'text', name: 'Attribution', text: 'Okakura Kakuzō, The Book of Tea (1906)', size: 32, color: '$muted', x: 80, y: 1230, motion: [{preset: 'fadeIn', at: 2.3, dur: 0.5}]},
      ],
    },
    {id: 's2a', name: 'Scene 2a / Read (3.8-5.0s)', start: 3.8, end: 5.0, children: [
      {type: 'text', text: 'Read.', font: 'serif', size: 300, color: '$navy', align: 'center', w: 1080, x: 0, y: 760, motion: [{preset: 'scale', at: 3.8, dur: 1.0, from: 1.12, to: 1}]}]},
    {id: 's2b', name: 'Scene 2b / Listen (5.0-6.2s)', start: 5.0, end: 6.2, bg: '$dark', children: [
      {type: 'text', text: 'Listen.', font: 'serif', size: 300, color: '#F0EEE6', align: 'center', w: 1080, x: 0, y: 760, motion: [{preset: 'scale', at: 5.0, dur: 1.0, from: 1.12, to: 1}]}]},
    {id: 's2c', name: 'Scene 2c / Both (6.2-7.4s)', start: 6.2, end: 7.4, bg: '$accent', children: [
      {type: 'text', text: 'Both.', font: 'serif', size: 300, color: '#FFFFFF', align: 'center', w: 1080, x: 0, y: 760, motion: [{preset: 'scale', at: 6.2, dur: 1.0, from: 1.12, to: 1}]}]},
    {
      id: 's3', name: 'Scene 3 / Cards (7.4-12.0s)', start: 7.4, end: 12.0,
      children: [
        {type: 'text', name: 'Headline', text: 'English and Japanese,\nside by side.', font: 'serif', size: 84, lh: 96, color: '$navy', x: 80, y: 220, motion: [{preset: 'fadeUp', at: 7.5, dur: 0.7, dy: 40}]},
        {type: 'card', name: 'Audio card', variant: 'audio', who: 'Chapter audio · 12:40', whoSize: 30, pad: 40, padV: 34, w: 880, cx: 540, cy: 820, rot: -2, motion: [{preset: 'enterTiltBlur', at: 7.7, dur: 0.9, dy: 600, rot: 12, blur: 10}]},
        {type: 'card', name: 'Note card', variant: 'note', who: 'Reading note', whoSize: 30, text: 'adoration of the beautiful', size: 60, pad: 40, padV: 34, w: 880, cx: 540, cy: 1090, rot: 2, motion: [{preset: 'enterTiltBlur', at: 8.1, dur: 0.9, dy: 600, rot: -12, blur: 10}]},
        {type: 'card', name: 'Source card', variant: 'doc', who: 'Source', whoSize: 30, text: 'The Book of Tea, 1906 (public domain)', size: 40, pad: 40, padV: 34, w: 880, cx: 540, cy: 1340, rot: -1, motion: [{preset: 'enterTiltBlur', at: 8.5, dur: 0.9, dy: 600, rot: 10, blur: 10}]},
      ],
    },
    {
      id: 's4', name: 'Scene 4 / End card (12.0-15.0s)', start: 12.0, end: 15.0, bg: '$dark', fade: 'in',
      children: [
        {type: 'frame', name: 'End card content', layout: 'v', gap: 18, align: 'center', sizeW: 'hug', cx: 540, cy: 900,
          motion: [{preset: 'fadeUp', at: 12.1, dur: 0.9, dy: 30}, {preset: 'scale', at: 12.0, dur: 3.0, from: 1, to: 1.04, ease: 'LINEAR'}],
          children: [
            {type: 'text', name: 'Wordmark', text: 'Bilingual\nBooks', font: 'serif', size: 170, lh: 176, color: '#F0EEE6', align: 'center'},
            {type: 'text', name: 'Subtitle', text: 'Podcast · Season 1', size: 44, color: '#F0EEE6', opacity: 0.85},
          ]},
        {type: 'caption', text: 'Listen on Spotify', by: 1640, motion: [{preset: 'window', in: [12.8, 13.2]}]},
      ],
    },
  ],
};
