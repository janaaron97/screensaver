import { ease, gradient, mix, WHITE, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// Characters pour in from one edge, stacking up row by row like liquid filling a mold.
export default {
  id: 'pour',
  name: 'Pour',
  palette: { final: ['FFFFFF', '00D1FF', '8A008A'], pour: ['FFFFFF', '00D1FF'] },
  grad: 'vertical',
  variants: [
    { name: 'Waterfall', from: 'top', palette: { final: ['CAF0F8', '48CAE4', '0077B6'], pour: ['FFFFFF', '90E0EF'] } },
    { name: 'Molten Rise', from: 'bottom', palette: { final: ['FFBA08', 'F48C06', 'D00000'], pour: ['FFFFFF', 'FFBA08'] } },
    { name: 'Sidewind', from: 'left', palette: { final: ['B9FBC0', '98F5E1', '8EECF5', 'A3C4F3'], pour: ['FFFFFF', '98F5E1'] }, grad: 'horizontal' },
    { name: 'Honey Drip', from: 'right', slow: true, palette: { final: ['FFE5A0', 'F9B208', 'B86F00'], pour: ['FFF6D6', 'F9B208'] }, grad: 'horizontal' },
  ],
  create(s, p, P) {
    const r = s.rng;
    const from = p.from || 'top';
    const pc = gradient(P.pour);
    const vert = from === 'top' || from === 'bottom';
    let groups = vert ? s.rowsOf() : s.colsOf();
    if (from === 'top' || from === 'left') groups.reverse();
    const order = [];
    groups.forEach((g, i) => {
      g.sort((a, b) => (vert ? a.hx - b.hx : a.hy - b.hy));
      if (i % 2) g.reverse();
      order.push(...g);
    });
    s.hideAll();
    const rate = Math.max(1, Math.ceil(order.length / (p.slow ? 330 : 240)));
    let next = 0;
    const live = new Set();
    return {
      tick() {
        for (let k = 0; k < rate && next < order.length; k++) {
          const c = order[next++];
          c.vis = true;
          if (from === 'top') c.y = -1, c.x = c.hx;
          else if (from === 'bottom') c.y = s.rows, c.x = c.hx;
          else if (from === 'left') c.x = -1, c.y = c.hy;
          else c.x = s.cols, c.y = c.hy;
          const d = vert ? Math.abs(c.hy - c.y) : Math.abs(c.hx - c.x) / 2;
          moveTo(c, c.hx, c.hy, (p.slow ? 14 : 9) + d * (p.slow ? 1.4 : 0.9), ease.inQuad);
          c.col = pc(r.float());
          c.sym = vert ? '│' : '─';
          live.add(c);
        }
        for (const c of live) {
          const px = c.x, py = c.y;
          if (stepMove(c)) {
            live.delete(c);
            c.sym = c.ch;
            playSeq(c, [{ col: WHITE, n: 2 }, ...[0.2, 0.4, 0.6, 0.8, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 3 }))]);
          } else {
            s.put(px, py, '·', c.col, 0.4);
            s.put(px - (c.x - px), py - (c.y - py), '·', c.col, 0.2);
          }
        }
        let done = next >= order.length && live.size === 0;
        for (const c of s.chars) if (!stepSeq(c)) done = false;
        return done;
      },
    };
  },
};
