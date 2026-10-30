import { ease, gradient, mix, WHITE, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// The whole message is compressed into a single glowing point, unfurls into
// one line through the middle, then blooms out to its full shape.
export default {
  id: 'middleout',
  name: 'Middle Out',
  palette: { final: ['FFB102', 'F9F871', 'FFFFFF'], start: ['FFFFFF', 'FFE29A'] },
  grad: 'vertical',
  variants: [
    { name: 'Horizon', axis: 'row', palette: { final: ['FF6B6B', 'FFD93D', 'FFF5E1'], start: ['FFFFFF', 'FFC6A5'] } },
    { name: 'Pillar', axis: 'col', palette: { final: ['4CC9F0', '4361EE', '7209B7'], start: ['FFFFFF', 'A0E7FF'] }, grad: 'horizontal' },
    { name: 'Elastic Bloom', axis: 'row', e1: 'outElastic', e2: 'outBack', palette: { final: ['F72585', 'B5179E', '4CC9F0'], start: ['FFFFFF', 'FFB3E6'] }, grad: 'diagonal' },
    { name: 'Supernova', axis: 'point', palette: { final: ['FFF3B0', 'E09F3E', '9E2A2B'], start: ['FFFFFF', 'FFF3B0'] }, grad: 'radial' },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const px = Math.round(b.cx), py = Math.round(b.cy);
    const startCol = gradient(P.start);
    const e1 = ease[p.e1 || 'inOutCubic'], e2 = ease[p.e2 || 'outCubic'];
    const n1 = p.axis === 'point' ? 0 : 75, n2 = p.axis === 'point' ? 120 : 85;
    for (const c of s.chars) {
      c.x = px; c.y = py; c.vis = true; c.sym = c.ch;
      c.col = startCol(r.float());
      c.d.sc = c.col;
    }
    let t = 0, phase = 0;
    const charge = 80;
    return {
      tick() {
        t++;
        if (phase === 0) {
          // A pulsing seed of light.
          const k = t / charge;
          const rad = 1 + Math.sin(k * Math.PI * 4) * 0.5 + k * 2;
          for (let a = 0; a < 16; a++) {
            const ang = (a / 16) * Math.PI * 2 + t * 0.1;
            s.put(px + Math.cos(ang) * rad * 2, py + Math.sin(ang) * rad, '·', mix(P.start.length ? startCol(1) : WHITE, WHITE, 0.3), 0.7 * (1 - k * 0.3));
          }
          s.put(px, py, '█', WHITE, 1);
          if (t >= charge) {
            phase = 1;
            for (const c of s.chars) {
              if (p.axis === 'point') {
                const delay = r.int(0, 25);
                c.d.delay = delay;
                moveTo(c, c.hx, c.hy, n2 + r.int(-10, 10), e2);
              } else if (p.axis === 'col') moveTo(c, px, c.hy, n1, e1);
              else moveTo(c, c.hx, py, n1, e1);
            }
            if (p.axis === 'point') phase = 2;
            t = 0;
          }
          return false;
        }
        if (phase === 1) {
          for (const c of s.chars) stepMove(c);
          // glowing line through the middle
          if (p.axis === 'col') for (let y = b.y0 - 1; y <= b.y1 + 1; y++) s.putUnder(px, y, '│', startCol(1), 0.25);
          else for (let x = b.x0 - 2; x <= b.x1 + 2; x++) s.putUnder(x, py, '─', startCol(1), 0.25);
          if (t >= n1 + 10) {
            phase = 2;
            t = 0;
            for (const c of s.chars) moveTo(c, c.hx, c.hy, n2 + r.int(-8, 8), e2);
          }
          return false;
        }
        let done = true;
        for (const c of s.chars) {
          if (c.d.delay > 0) { c.d.delay--; done = false; continue; }
          if (c.m) {
            const k = c.m.t / c.m.n;
            c.col = mix(c.d.sc, c.fc, Math.min(1, k * 1.2));
            if (stepMove(c)) playSeq(c, [{ col: WHITE, n: 2 }, ...[0.33, 0.66, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 3 }))]);
            done = false;
          } else if (!stepSeq(c)) done = false;
        }
        return done;
      },
    };
  },
};
