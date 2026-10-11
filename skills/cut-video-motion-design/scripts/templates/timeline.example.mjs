// Edit decisions for one video. Copy to timeline.mjs and replace the example times, texts and rects.
// Every time is a SOURCE time (seconds in the raw recording, from build/cuts.json words[].src) wrapped in at(),
// so the plan survives re-cutting. Rects are screen-crop pixels; x/y of callouts and B-roll are frame pixels.
// Field reference: references/timeline.md. Design rules: references/design.md.
export default ({ at, sites }) => {
  const SCREEN = { w: 1728, h: 1020 };                       // = project.screen w/h
  const CAM = { cx: 1554.7, cy: 842, r: 146 };               // webcam bubble centre in SCREEN coords (project.cam minus screen.x/y)
  const plate = { x: 200, y: 60, w: 1520, h: 1520 * SCREEN.h / SCREEN.w };
  const s0 = plate.w / SCREEN.w;
  const FULL = { cx: SCREEN.w / 2, cy: SCREEN.h / 2, w: SCREEN.w };
  const span = (a, b, extra = {}) => ({ t0: at(a), t1: at(b), ...extra });

  return {
    layout: {
      plate,
      camMain: { cx: plate.x + CAM.cx * s0, cy: plate.y + CAM.cy * s0, r: CAM.r * s0 },
      camIntro: { cx: 540, cy: 470, r: 250 },
      // no camOutro: the round webcam bubble leaves when the outro starts (the end card stays clean)
    },
    introEnd: at(8.9),            // the word where the actual topic starts
    outroStart: at(175.0),        // the word where the goodbye starts
    dissolve: 0.12,

    intro: {
      x: 900, y: 255, w: 940, eyebrow: 'Video tutorial',
      lines: ['Headline in', 'two short lines.'],
      lead: 'One sentence of promise.',
      tag: { x: 330, y: 770, who: 'Speaker name', role: 'Role · Company' },
      brand: { x: 80, y: 56, text: 'example.com' },
    },
    outro: {
      x: 900, y: 290, w: 940, eyebrow: 'Thanks for watching',
      lines: ['Closing line.', 'Soft second line.'],
      buttons: [{ text: 'example.com', style: 'light', arrow: true }, { text: 'Links in the description', style: 'glass' }],
      brand: { x: 80, y: 56, text: 'example.com' },
    },

    chapters: [
      { t: at(8.9), title: 'First step' },
      { t: at(40.0), title: 'Second step' },
      { t: at(120.0), title: 'Third step' },
    ],

    camera: [
      { t: at(18.2), dur: 0.9, rect: { cx: 830, cy: 640, w: 1100 } },     // zoom to what is being clicked
      { t: at(24.0), dur: 0.8, rect: FULL },                               // back to full before the next big change
    ],

    spots: [
      { ...span(18.6, 23.8), rect: { x: 372, y: 620, w: 910, h: 104 }, label: 'Click here' },
    ],

    callouts: [
      { kind: 'card', ...span(10.2, 13.3), anchor: 'tr', logo: 'visual-studio-code', eyebrow: 'Free download', title: 'Product name', sub: 'example.com', sfx: 'pop' },
      { kind: 'chip', ...span(14.0, 17.5), anchor: 'tr', icon: 'sparkle', text: 'A one-line side note' },
      { kind: 'keys', ...span(26.0, 30.0), anchor: 'tr', eyebrow: 'Shortcut', keys: ['File', 'Open Folder…'], hint: 'Ctrl + K  Ctrl + O' },
      { kind: 'stat', ...span(60.0, 64.0), anchor: 'tr', eyebrow: 'Takes about', valueHtml: '≈ 8<small>min</small>', label: 'for a 60-second video' },
      { kind: 'list', ...span(70.0, 78.0), anchor: 'c', w: 720, focus: true, eyebrow: 'Licences', titleHtml: 'Open source <b>only</b>', sfx: 'whoosh',
        rows: [
          { label: 'CC0 · public domain', meta: 'use freely', ok: true, at: at(71.0) },
          { label: 'MIT · Apache-2.0', meta: 'keep the licence file', ok: true, at: at(72.0) },
          { label: 'NC / "all rights reserved"', meta: 'not allowed', ok: false, at: at(74.0) },
        ] },
      { kind: 'prompt', ...span(90.0, 96.0), anchor: 'tr', w: 640, eyebrow: 'Then type', text: '@recording.mp4 cut out the pauses and add captions',
        typeFrom: at(90.4), typeTo: at(94.5), model: 'Model · effort' },
      { kind: 'steps', ...span(100.0, 110.0), anchor: 'c', w: 1080, focus: true, eyebrow: 'Workflow', heading: ['Check the frames first.', 'Then render.'],
        steps: [
          { n: '01', title: 'Preview frames', sub: 'fast stills', at: at(101.0) },
          { n: '02', title: 'Review', sub: 'fix what looks off', at: at(103.0) },
          { n: '03', title: 'Render the MP4', sub: 'takes the longest', at: at(105.0) },
        ] },
      { kind: 'wave', ...span(112.0, 117.0), anchor: 'c', w: 1040, h: 150, focus: true, eyebrow: 'Pause cutting', titleHtml: 'Cut out the <b>pauses</b>',
        waveFrom: 0, waveTo: 60, collapseAt: at(114.0), collapseDur: 1.3 },
      // after capturing the reference site: show what was extracted
      // { kind: 'tokens', ...span(130, 134), anchor: 'c', w: 760, focus: true, eyebrow: 'Extracted with Playwright', titleHtml: 'example.com <b>style</b>', typeAt: at(131),
      //   colors: [{ name: 'ink', hex: '#111318' }, { name: 'accent', hex: '#2b59c3' }], font: 'Inter', fontMeta: 'Light 300 · tight tracking' },
    ],

    broll: [
      { kind: 'carousel', ...span(80.0, 88.0), sfx: 'whoosh', cx: 960, cy: 470, cw: 1180, ch: 738, gap: 640, labelY: 826,
        items: [
          { img: sites('pexels-videos'), url: 'pexels.com/videos', name: 'Pexels', lic: 'Pexels License', logo: 'pexels' },
          { img: sites('pixabay-music'), url: 'pixabay.com/music', name: 'Pixabay Music', lic: 'Pixabay License', logo: 'pixabay' },
        ],
        steps: [{ t: at(80.0), index: 0 }, { t: at(84.0), index: 1 }] },
      { kind: 'browser', ...span(140.0, 145.0), sfx: 'whoosh', x: 290, y: 90, w: 1340, h: 800, img: sites('example', 'scroll'), url: 'example.com',
        scroll: { t0: at(140.5), t1: at(144.5), from: 0, to: 2000 }, tag: { text: 'Your website → style', lic: 'example.com' } },
    ],

    holds: [],
  };
};
