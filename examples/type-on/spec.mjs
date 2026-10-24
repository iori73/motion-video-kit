// A 4 s test for `typeOn` (text typed one character at a time), for a FICTIONAL studio ("Fenwick Lane"). Original words and layout.
// Shot 1: a search field is typed (about 9 characters/s, the speed seen in a product reel). Hard cut.
// Shot 2: a wordmark is typed on a brand colour card (about 6 characters/s, the speed seen in a brand reel).
const W = 1920, H = 1080;
const events = [];
for (let k = 0; k < 24; k++) events.push({t: 0.4 + k / 9, k: 'tick'});
events.push({t: 2.0, k: 'thunk'});
for (let k = 0; k < 7; k++) events.push({t: 2.3 + k / 6, k: 'tick'});

export default {
  meta: {title: 'Type on 16x9 (play with Motion)', w: W, h: H, fps: 30, duration: 4, pacing: 'standard', background: {base: '#FFFFFF'}},
  tokens: {colors: {cobalt: '#1F3BFF'}},
  audio: {events},
  scenes: [
    {
      id: 's1', name: 'Shot 1 / Search field typed (0.0-2.0s)', start: 0, end: 2.0, bg: '#FFFFFF', fade: 'hard',
      children: [
        {type: 'frame', name: 'Search field', w: 1400, h: 150, x: 260, y: 465, radius: 75, fill: '#F1F3F8', stroke: {color: '#C9CFDD', weight: 3},
          children: [
            {type: 'typeOn', name: 'Query', text: 'quiet places to work', at: 0.4, cps: 9, size: 64, color: '#16202C', x: 70, y: 38, h: 120, font: 'sans'},
          ]},
      ],
    },
    {
      id: 's2', name: 'Shot 2 / Wordmark typed on colour (2.0-4.0s)', start: 2.0, end: 4.0, bg: '$cobalt', fade: 'hard',
      children: [
        {type: 'typeOn', name: 'Wordmark', text: 'Fenwick', at: 2.3, cps: 6, size: 260, color: '#FFFFFF', caretColor: '#FFD23F', x: 540, y: 350, h: 340, font: 'serif'},
      ],
    },
  ],
};
