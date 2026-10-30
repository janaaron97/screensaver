import { gradSteps, mix, WHITE, TAU, ease, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// Characters gather into iridescent bubbles that drift down the screen,
// wobble, and pop — scattering the letters home.
export default {
  id: 'bubbles',
  name: 'Bubbles',
  palette: { final: ['D33AFF', '7395C4', '43C2A7', '02FF7F'], bubble: ['F5F5F5', 'A0E7E5', 'B4F8C8', 'FBE7C6', 'FFAEBC'], pop: ['FFFFFF', 'D7FFFE'] },
  grad: 'diagonal',
  variants: [
    { name: 'Soap' },
    { name: 'Champagne', small: true, palette: { final: ['FFE5B4', 'F4C430', 'C9A227'], bubble: ['FFFDF0', 'FFF1C1', 'FFE08A'], pop: ['FFFFFF', 'FFF8DC'] } },
    { name: 'Deep Sea', rise: true, palette: { final: ['00B4D8', '0077B6', '90E0EF'], bubble: ['CAF0F8', 'ADE8F4', '48CAE4'], pop: ['FFFFFF', 'CAF0F8'] } },
    { name: 'Lava Lamp', big: true, slow: true, palette: { final: ['FF0A54', 'FF5C8A', 'FF99AC'], bubble: ['FF477E', 'FF7096', 'FF85A1', 'FBB1BD'], pop: ['FFFFFF', 'FFD6E0'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const bubbleCols = P.bubble.map((h) => gradSteps([h], 1)[0]);
    const popCol = gradSteps(P.pop, 1)[0];
    const per = p.small ? [5, 12] : p.big ? [25, 45] : [12, 25];
    const order = r.shuffle([...s.chars]).sort((a, b) => a.hx - b.hx + r.range(-6, 6));
    const bubbles = [];
    for (let i = 0; i < order.length; ) {
      const n = r.int(per[0], per[1]);
      bubbles.push({ chars: order.slice(i, i + n) });
      i += n;
    }
    const slow = p.slow ? 1.35 : 1;
    s.hideAll();
    bubbles.forEach((bb, i) => {
      bb.rad = Math.max(1.5, Math.sqrt(bb.chars.length) * 1.1);
      const avgX = bb.chars.reduce((a, c) => a + c.hx, 0) / bb.chars.length;
      bb.x = Math.min(s.cols - bb.rad * 2, Math.max(bb.rad * 2, avgX + r.range(-8, 8)));
      bb.y = p.rise ? s.rows + bb.rad : -bb.rad;
      bb.ty = r.range(s.rows * 0.2, s.rows * 0.8);
      bb.start = Math.floor((i / bubbles.length) * 200 * slow) + r.int(0, 20);
      bb.n = r.int(110, 170) * slow;
      bb.t = 0;
      bb.wob = r.range(0, TAU);
      bb.state = 'wait';
      bb.chars.forEach((c, j) => (c.d.ang = (j / bb.chars.length) * TAU));
    });
    let t = 0;

    return {
      tick() {
        t++;
        let busy = false;
        for (const bb of bubbles) {
          if (bb.state === 'wait') {
            busy = true;
            if (t >= bb.start) {
              bb.state = 'float';
              for (const c of bb.chars) {
                c.vis = true;
                c.sym = r.pick(['o', '°', '·', 'o', 'O']);
                c.col = r.pick(bubbleCols);
              }
            }
          } else if (bb.state === 'float') {
            busy = true;
            bb.t++;
            const k = ease.outSine(Math.min(1, bb.t / bb.n));
            const y0 = p.rise ? s.rows + bb.rad : -bb.rad;
            const y = y0 + (bb.ty - y0) * k;
            const x = bb.x + Math.sin(bb.wob + bb.t * 0.05) * 2;
            const sq = 1 + Math.sin(bb.t * 0.15) * 0.08;
            for (const c of bb.chars) {
              const a = c.d.ang + bb.t * 0.02;
              c.x = x + Math.cos(a) * bb.rad * 2 * sq;
              c.y = y + Math.sin(a) * bb.rad / sq;
              if (r.chance(0.05)) c.col = r.pick(bubbleCols);
            }
            s.put(x - bb.rad * 0.8, y - bb.rad * 0.5, '◦', WHITE, 0.7);
            if (bb.t >= bb.n) {
              bb.state = 'pop';
              bb.px = x;
              bb.py = y;
              bb.pt = 0;
              for (const c of bb.chars) {
                c.sym = '*';
                moveTo(c, c.hx, c.hy, r.int(40, 70), ease.outExpo);
                playSeq(c, [
                  { col: popCol, n: 4 },
                  { sym: c.ch, col: WHITE, n: 4 },
                  ...[0.2, 0.4, 0.6, 0.8, 1].map((k) => ({ col: mix(WHITE, c.fc, k), n: 4 })),
                ]);
              }
            }
          } else if (bb.state === 'pop') {
            bb.pt++;
            if (bb.pt < 14) {
              const k = bb.pt / 14;
              const rr = bb.rad * (1.2 + k * 1.8);
              for (let i = 0; i < 16; i++) {
                const a = (i / 16) * TAU + bb.wob;
                s.put(bb.px + Math.cos(a) * rr * 2, bb.py + Math.sin(a) * rr, k < 0.5 ? '*' : '·', popCol, 1 - k);
              }
            }
            let any = false;
            for (const c of bb.chars) {
              if (!stepMove(c)) any = true;
              if (!stepSeq(c)) any = true;
            }
            if (any) busy = true;
            else bb.state = 'done';
          }
        }
        return !busy;
      },
    };
  },
};
