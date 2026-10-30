import { gradSteps, mix, WHITE, BLACK, GLYPHS, playSeq, stepSeq } from '../core.js';

// Characters materialize one by one in random order.
export default {
  id: 'randomsequence',
  name: 'Random Sequence',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], start: ['000000'] },
  grad: 'vertical',
  variants: [
    { name: 'Fade In', mode: 'fade', palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], start: ['000000'] } },
    { name: 'Sparkle', mode: 'sparkle', palette: { final: ['FFD6FF', 'E7C6FF', 'C8B6FF', 'B8C0FF'], start: ['FFFFFF', 'FFF3B0'] }, grad: 'diagonal' },
    { name: 'Static', mode: 'static', palette: { final: ['F8F9FA', 'ADB5BD', '6C757D'], start: ['495057', 'ADB5BD', 'F8F9FA'] } },
    { name: 'Embers', mode: 'ember', palette: { final: ['FFBA08', 'E85D04', '9D0208'], start: ['370617', '9D0208', 'F48C06', 'FFBA08'] }, grad: 'vertical' },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const sc = gradSteps(P.start, 6);
    const order = r.shuffle([...s.chars]);
    s.hideAll();
    const rate = order.length / (p.mode === 'static' ? 300 : 240);
    let acc = 0, next = 0, t = 0;
    const show = (c) => {
      c.vis = true;
      const f = [];
      if (p.mode === 'fade') {
        for (let i = 0; i <= 12; i++) f.push({ sym: c.ch, col: mix(BLACK, c.fc, i / 12), n: 3 });
      } else if (p.mode === 'sparkle') {
        f.push({ sym: '·', col: sc[0], n: 3 }, { sym: '✦', col: WHITE, n: 4 }, { sym: '✧', col: sc[5], n: 3 });
        f.push({ sym: c.ch, col: WHITE, n: 2 });
        for (let i = 1; i <= 5; i++) f.push({ col: mix(WHITE, c.fc, i / 5), n: 3 });
      } else if (p.mode === 'static') {
        for (let i = 0; i < 6; i++) f.push({ sym: r.pick(GLYPHS.blocks), col: r.pick(sc), n: 2 });
        f.push({ sym: c.ch, col: WHITE, n: 2 });
        for (let i = 1; i <= 5; i++) f.push({ col: mix(WHITE, c.fc, i / 5), n: 3 });
      } else {
        ['·', '•', '●'].forEach((sym, i) => f.push({ sym, col: sc[Math.min(5, i * 2 + 1)], n: 5 }));
        f.push({ sym: c.ch, col: sc[5], n: 3 });
        for (let i = 1; i <= 6; i++) f.push({ col: mix(sc[5], c.fc, i / 6), n: 4 });
      }
      playSeq(c, f);
    };
    return {
      tick() {
        t++;
        acc += rate;
        while (acc >= 1 && next < order.length) { acc--; show(order[next++]); }
        if (p.mode === 'static') {
          // TV snow over the text block fading as the picture tunes in
          const k = 1 - next / order.length;
          const n = Math.round(b.w * b.h * 0.35 * k);
          for (let i = 0; i < n; i++) s.putUnder(r.int(b.x0 - 2, b.x1 + 2), r.int(b.y0 - 1, b.y1 + 1), r.pick(['░', '▒', '·', '▓']), r.pick(sc), 0.5 * k);
        }
        if (p.mode === 'ember' && next < order.length)
          for (let i = 0; i < 3; i++) s.put(r.range(b.x0, b.x1), b.y1 - r.range(0, b.h + 6) , '·', r.pick(sc), r.range(0.3, 0.9));
        let done = next >= order.length;
        for (const c of s.chars) if (!stepSeq(c)) done = false;
        return done;
      },
    };
  },
};
