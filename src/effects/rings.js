import { ease, gradient, mix, WHITE, TAU, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// Characters break apart, assemble into concentric spinning rings, then
// scatter and fall back into the message.
export default {
  id: 'rings',
  name: 'Rings',
  palette: { final: ['AB48FF', 'E7B2B2', 'FFFFFF'], ring: ['AB48FF', 'E7B2B2', 'FFFFFF'] },
  grad: 'vertical',
  variants: [
    { name: 'Halo', palette: { final: ['AB48FF', 'E7B2B2', 'FFFFFF'], ring: ['AB48FF', 'E7B2B2', 'FFFFFF'] } },
    { name: 'Counter Spin', alt: true, spin: 1.7, palette: { final: ['00F5D4', '00BBF9', 'FEE440'], ring: ['00F5D4', '00BBF9', '9B5DE5', 'F15BB5', 'FEE440'] }, grad: 'diagonal' },
    { name: 'Saturn', flat: 0.35, palette: { final: ['F6BD60', 'F7EDE2', 'F5CAC3', '84A59D'], ring: ['F6BD60', 'F28482', 'F7EDE2'] } },
    { name: 'Gyroscope', gyro: true, alt: true, palette: { final: ['FF5D8F', 'FF97B7', 'FFE5EC'], ring: ['FF0A54', 'FF5D8F', 'FFE5EC', 'A2D2FF'] }, grad: 'radial' },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const rg = gradient(P.ring);
    const cx = b.cx, cy = b.cy;
    const maxR = Math.min(s.cols / 2 - 2, s.rows - 2);
    // fill rings from inside out
    const order = r.shuffle([...s.chars]);
    const rings = [];
    let rad = 4, i = 0;
    while (i < order.length) {
      const cap = Math.max(6, Math.floor((TAU * rad) / 1.6));
      const members = order.slice(i, i + cap);
      i += cap;
      rings.push({ rad: Math.min(rad, maxR), members, dir: p.alt && rings.length % 2 ? -1 : 1, col: null });
      rad += 3;
    }
    rings.forEach((g, k) => {
      g.col = rg(rings.length > 1 ? k / (rings.length - 1) : 0);
      g.members.forEach((c, j) => { c.d.ring = g; c.d.ang = (j / g.members.length) * TAU; });
    });
    for (const c of s.chars) c.col = mix(c.fc, [0, 0, 0], 0.4);
    const flat = p.flat || 1;
    const spin = (p.spin || 1) * 0.025;
    const pos = (c, t) => {
      const g = c.d.ring;
      const a = c.d.ang + t * spin * g.dir * (6 / g.rad + 0.3);
      let y = Math.sin(a) * g.rad * 0.5 * flat;
      if (p.gyro) y *= Math.cos(t * 0.02 + g.rad * 0.3);
      return [cx + Math.cos(a) * g.rad, cy + y];
    };
    let phase = 0, t = 0, pt = 0, spinT = 0;
    return {
      tick() {
        t++; pt++;
        if (phase === 0 && pt > 30) {
          phase = 1; pt = 0;
          for (const c of s.chars) {
            const [x, y] = s.randomPoint();
            moveTo(c, x, y, r.int(30, 50), ease.outCubic);
            c.col = c.d.ring.col;
            c.sym = '•';
          }
        } else if (phase === 1) {
          for (const c of s.chars) stepMove(c);
          if (pt > 55) {
            phase = 2; pt = 0;
            for (const c of s.chars) { const [x, y] = pos(c, 0); moveTo(c, x, y, r.int(40, 60), ease.inOutSine); }
          }
        } else if (phase === 2) {
          for (const c of s.chars) stepMove(c);
          if (pt > 62) { phase = 3; pt = 0; }
        } else if (phase === 3) {
          spinT++;
          for (const c of s.chars) {
            const [x, y] = pos(c, spinT);
            c.x = x; c.y = y;
            c.sym = c.ch;
            c.col = mix(c.d.ring.col, WHITE, 0.25 + 0.25 * Math.sin(spinT * 0.08 + c.d.ang * 3));
            if (p.gyro || flat < 1) {
              // fade the back half of a tilted ring
              c.a = 0.55 + 0.45 * Math.max(0, Math.sin(c.d.ang + spinT * spin * c.d.ring.dir * (6 / c.d.ring.rad + 0.3)));
            }
          }
          if (pt > 260) {
            phase = 4; pt = 0;
            for (const c of s.chars) {
              c.a = 1;
              const dx = c.x - cx, dy = c.y - cy;
              moveTo(c, c.hx, c.hy, r.int(55, 85), ease.inOutCubic, c.x + dx * 0.8 + dy * 1.5, c.y + dy * 0.8 - dx * 0.4);
            }
          }
        } else if (phase === 4) {
          let done = true;
          for (const c of s.chars) {
            if (c.m) {
              c.col = mix(c.d.ring.col, c.fc, c.m.t / c.m.n);
              if (stepMove(c)) playSeq(c, [{ col: WHITE, n: 2 }, ...[0.33, 0.66, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 3 }))]);
              done = false;
            } else if (!stepSeq(c)) done = false;
          }
          return done;
        }
        return false;
      },
    };
  },
};
