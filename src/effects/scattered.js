import { ease, gradient, mix, WHITE, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// The message is strewn across the screen, then every character finds its way home.
export default {
  id: 'scattered',
  name: 'Scattered',
  palette: { final: ['FF9048', 'AB9DFF', 'BDFFEA'], start: ['FF9048', 'AB9DFF', 'BDFFEA'] },
  grad: 'vertical',
  variants: [
    { name: 'Gather', e: 'inOutBack', palette: { final: ['FF9048', 'AB9DFF', 'BDFFEA'], start: ['FF9048', 'AB9DFF', 'BDFFEA'] } },
    { name: 'Gravity Well', from: 'off', e: 'outExpo', palette: { final: ['E0AAFF', '9D4EDD', '5A189A'], start: ['FFFFFF', 'C77DFF', '3C096C'] }, grad: 'radial' },
    { name: 'Whirlpool', swirl: true, e: 'inOutCubic', palette: { final: ['00B4D8', '90E0EF', 'CAF0F8'], start: ['03045E', '0077B6', '00B4D8'] }, grad: 'diagonal' },
    { name: 'Fireflies', drift: true, e: 'inOutSine', palette: { final: ['FFF3B0', 'E9FF70', 'A7C957'], start: ['FFFFFF', 'FFF3B0', 'E9FF70'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const sg = gradient(P.start);
    const e = ease[p.e || 'inOutBack'];
    for (const c of s.chars) {
      const [x, y] = p.from === 'off' ? s.offscreenPoint() : s.randomPoint();
      c.x = x; c.y = y;
      c.d.sc = sg(r.float());
      c.col = c.d.sc;
      c.d.ph = r.range(0, 6.28);
      c.d.delay = p.drift ? r.int(0, 120) : r.int(0, 30);
    }
    let t = 0;
    const hold = 75;
    return {
      tick() {
        t++;
        let done = true;
        for (const c of s.chars) {
          if (t < hold + c.d.delay) {
            done = false;
            if (p.drift) {
              c.x += Math.cos(c.d.ph + t * 0.05) * 0.15;
              c.y += Math.sin(c.d.ph * 1.3 + t * 0.04) * 0.08;
              c.a = 0.5 + 0.5 * Math.sin(c.d.ph + t * 0.15);
            }
            continue;
          }
          if (!c.d.go) {
            c.d.go = true;
            c.a = 1;
            const n = p.drift ? r.int(110, 170) : r.int(70, 120);
            if (p.swirl) {
              const dx = c.x - b.cx, dy = c.y - b.cy;
              moveTo(c, c.hx, c.hy, n, e, b.cx - dy * 2, b.cy + dx * 0.5);
            } else moveTo(c, c.hx, c.hy, n, e);
          }
          if (c.m) {
            c.col = mix(c.d.sc, c.fc, c.m.t / c.m.n);
            if (stepMove(c)) playSeq(c, [{ col: WHITE, n: 2 }, ...[0.33, 0.66, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 3 }))]);
            done = false;
          } else if (!stepSeq(c)) done = false;
        }
        return done;
      },
    };
  },
};
