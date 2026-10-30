import { gradient, mix, ease, clamp, WHITE, TAU } from '../core.js';

// A whirlpool of dust spins around the text; characters spiral inward
// from the rim and settle into place.
export default {
  id: 'vortex',
  name: 'Vortex',
  palette: { final: ['5EEAD4', '3B82F6', 'A855F7'], swirl: ['0B1E5B', '2563EB', '67E8F9', 'FFFFFF'] },
  grad: 'radial',
  variants: [
    { name: 'Whirlpool' },
    { name: 'Maelstrom', turns: 5, dur: 110, outer: true, dust: 420, palette: { final: ['F43F5E', 'FB923C', 'FDE68A'], swirl: ['3B0412', 'BE123C', 'FB923C', 'FFFBEB'] } },
    { name: 'Counterflow', alt: true, turns: 2.5, palette: { final: ['A3E635', '22D3EE', '818CF8'], swirl: ['052E16', '15803D', '22D3EE', 'F0FDFA'] } },
    { name: 'Gentle Eddy', turns: 1.5, dur: 200, spread: 140, e: 'inOutSine', dust: 180, palette: { final: ['F5D0FE', 'C084FC', '7C3AED'], swirl: ['1E1B4B', '6D28D9', 'E9D5FF', 'FFFFFF'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const turns = p.turns || 3;
    const dur = p.dur || 150;
    const spread = p.spread || 180;
    const fn = ease[p.e || 'inOutCubic'];
    const sw = gradient(P.swirl);
    const R = Math.hypot(s.cols / 2, s.rows) + 4;
    const order = s.byDistance();
    if (p.outer) order.reverse();
    order.forEach((c, i) => {
      c.vis = false;
      c.d.delay = Math.floor((i / order.length) * spread + r.range(0, 20));
      c.d.th = r.range(0, TAU);
      c.d.n = dur * r.range(0.8, 1.2);
      c.d.dir = p.alt ? (c.hy % 2 ? 1 : -1) : 1;
    });
    const dust = Array.from({ length: p.dust || 260 }, () => ({ a: r.range(0, TAU), rr: r.range(2, R), v: r.range(0.5, 1.5) }));
    const end = spread + 20 + dur * 1.2;
    let t = 0;
    return {
      tick() {
        t++;
        const fade = clamp((t - end * 0.75) / 60);
        for (const d of dust) {
          d.a += 0.025 * d.v * Math.min(3, R / (d.rr + 6));
          d.rr -= 0.08 * d.v;
          if (d.rr < 1) d.rr = R;
          const k = d.rr / R;
          s.putUnder(b.cx + Math.cos(d.a) * d.rr, b.cy + Math.sin(d.a) * d.rr * 0.5, k < 0.3 ? '•' : '·', sw(1 - k), (1 - fade) * (0.25 + 0.6 * (1 - k)));
        }
        let done = fade >= 1;
        for (const c of s.chars) {
          const k = (t - c.d.delay) / c.d.n;
          if (k < 0) {
            done = false;
            continue;
          }
          if (k >= 1) {
            if (c.d.state !== 1) c.finish(), (c.d.state = 1);
            continue;
          }
          done = false;
          c.vis = true;
          const e = fn(k);
          const rad = R * (1 - e);
          const th = c.d.th + c.d.dir * turns * TAU * (1 - e);
          c.x = c.hx + Math.cos(th) * rad;
          c.y = c.hy + Math.sin(th) * rad * 0.5;
          c.sym = k < 0.35 ? '·' : k < 0.6 ? '•' : c.ch;
          c.col = k < 0.8 ? sw(k / 0.8) : mix(WHITE, c.fc, (k - 0.8) / 0.2);
          c.a = clamp(k * 5);
        }
        return done;
      },
    };
  },
};
