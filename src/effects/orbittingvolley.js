import { ease, gradient, mix, WHITE, moveTo, stepMove, playSeq, stepSeq, dist } from '../core.js';

// Launchers orbit the edge of the screen firing volleys of characters inward,
// building the message from the center out.
export default {
  id: 'orbittingvolley',
  name: 'Orbiting Volley',
  palette: { final: ['FFA15C', '44D492'], launcher: ['FFFFFF', 'FFA15C', '44D492', '88F7E2'] },
  grad: 'diagonal',
  variants: [
    { name: 'Four Corners', launchers: 4, palette: { final: ['FFA15C', '44D492', '88F7E2'], launcher: ['FFFFFF', 'FFA15C', '44D492', '88F7E2'] } },
    { name: 'Rapid Fire', launchers: 4, volley: 3, orbit: 0.006, palette: { final: ['FF006E', 'FFBE0B'], launcher: ['FB5607', 'FF006E', '8338EC', '3A86FF'] } },
    { name: 'Twin Comets', launchers: 2, orbit: 0.005, palette: { final: ['A2D2FF', 'CDB4DB', 'FFC8DD'], launcher: ['FFFFFF', 'A2D2FF'] }, grad: 'horizontal' },
    { name: 'Spiral Barrage', launchers: 6, curve: true, orbit: 0.004, palette: { final: ['00F5D4', '9B5DE5', 'F15BB5'], launcher: ['00F5D4', '00BBF9', '9B5DE5', 'F15BB5', 'FEE440', 'FFFFFF'] }, grad: 'radial' },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const L = p.launchers || 4;
    const lcol = gradient(P.launcher);
    const order = s.byDistance();
    s.hideAll();
    const every = p.volley ? 2 : 4;
    const perVolley = Math.max(1, Math.ceil(order.length / ((L * 320) / every)));
    // perimeter point at u in [0,1)
    const W = s.cols - 1, H = s.rows - 1, per = 2 * (W + H);
    const edge = (u) => {
      let d = (((u % 1) + 1) % 1) * per;
      if (d < W) return [d, 0];
      d -= W;
      if (d < H) return [W, d];
      d -= H;
      if (d < W) return [W - d, H];
      d -= W;
      return [0, H - d];
    };
    const ls = Array.from({ length: L }, (_, i) => ({ u: i / L, col: lcol(L > 1 ? i / (L - 1) : 0), trail: [] }));
    let next = 0, t = 0;
    const flying = new Set();
    return {
      tick() {
        t++;
        for (const l of ls) {
          l.u += p.orbit || 0.003;
          const [x, y] = edge(l.u);
          l.trail.unshift([x, y]);
          if (l.trail.length > 14) l.trail.pop();
          l.trail.forEach(([tx, ty], i) => s.put(tx, ty, i === 0 ? '█' : '▓▒░·'[Math.min(3, i >> 2)], mix(l.col, WHITE, i === 0 ? 0.5 : 0), 1 - i / 14));
        }
        if (t % every === 0)
          for (const l of ls) {
            const [x, y] = edge(l.u);
            for (let k = 0; k < perVolley && next < order.length; k++) {
              const c = order[next++];
              c.x = x; c.y = y; c.vis = true; c.d.lc = l.col;
              c.col = l.col;
              const n = 25 + dist(x, y, c.hx, c.hy) * 0.35;
              if (p.curve) moveTo(c, c.hx, c.hy, n, ease.outSine, b.cx + (y - b.cy) * 1.2, b.cy - (x - b.cx) * 0.3);
              else moveTo(c, c.hx, c.hy, n, ease.outSine);
              flying.add(c);
            }
          }
        for (const c of flying) {
          const k = c.m ? c.m.t / c.m.n : 1;
          c.sym = k < 0.85 ? '•' : c.ch;
          c.col = mix(c.d.lc, c.fc, k * 0.5);
          if (c.m) s.put(c.x - (c.m.tx - c.x) * 0.06, c.y - (c.m.ty - c.y) * 0.06, '·', c.d.lc, 0.5);
          if (stepMove(c)) {
            flying.delete(c);
            c.sym = c.ch;
            playSeq(c, [{ col: WHITE, n: 3 }, ...[0.25, 0.5, 0.75, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 3 }))]);
          }
        }
        let done = next >= order.length && flying.size === 0;
        for (const c of s.chars) if (!stepSeq(c)) done = false;
        return done;
      },
    };
  },
};
