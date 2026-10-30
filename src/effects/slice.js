import { ease, gradient, mix, WHITE, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// The message is cut in two and the halves glide in from opposite sides,
// meeting with a flash along the seam.
export default {
  id: 'slice',
  name: 'Slice',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], seam: ['FFFFFF', '00D1FF'] },
  grad: 'diagonal',
  variants: [
    { name: 'Vertical Cut', mode: 'vertical', palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], seam: ['FFFFFF', '00D1FF'] } },
    { name: 'Horizon Cut', mode: 'horizontal', palette: { final: ['FF7B00', 'FFB700', 'FFEA00'], seam: ['FFFFFF', 'FFB700'] }, grad: 'horizontal' },
    { name: 'Katana', mode: 'diagonal', palette: { final: ['D90429', 'EF233C', 'EDF2F4'], seam: ['FFFFFF', 'EF233C'] } },
    { name: 'Shredder', mode: 'shred', palette: { final: ['06D6A0', '118AB2', '073B4C', 'FFD166'], seam: ['FFFFFF', '06D6A0'] }, grad: 'vertical' },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const sg = gradient(P.seam);
    const mode = p.mode || 'vertical';
    const N = 130;
    for (const c of s.chars) {
      let side, tx = c.hx, ty = c.hy;
      if (mode === 'vertical') side = c.hx < b.cx ? -1 : 1, ty = c.hy + side * (s.rows + b.h);
      else if (mode === 'horizontal') side = c.hy < b.cy ? -1 : 1, tx = c.hx + side * (s.cols + b.w);
      else if (mode === 'diagonal') {
        side = (c.hx - b.x0) / b.w + (c.hy - b.y0) / b.h < 1 ? -1 : 1;
        tx = c.hx + side * (s.cols * 0.7);
        ty = c.hy + side * (s.rows * 0.7);
      } else {
        side = Math.floor((c.hx - b.x0) / 3) % 2 ? 1 : -1;
        ty = c.hy + side * (s.rows + b.h);
        c.d.delay = Math.floor((c.hx - b.x0) / 3) * 2;
      }
      c.x = tx; c.y = ty;
      c.col = mix(c.fc, sg(1), 0.5);
      c.d.side = side;
    }
    let t = 0, flash = 0;
    const sideDelay = mode === 'shred' ? 0 : 0;
    return {
      tick() {
        t++;
        let done = true, moving = false;
        for (const c of s.chars) {
          if (t === 20 + (c.d.delay || sideDelay)) moveTo(c, c.hx, c.hy, N + (mode === 'shred' ? r.int(0, 10) : 0), ease.outQuart);
          if (c.m) {
            moving = true;
            done = false;
            if (stepMove(c)) playSeq(c, [{ col: WHITE, n: 3 }, ...[0.2, 0.4, 0.6, 0.8, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 3 }))]);
          } else if (t <= 20 + (c.d.delay || 0)) done = false;
          else if (!stepSeq(c)) done = false;
        }
        // seam flash once halves meet
        if (!moving && flash < 50) {
          flash++;
          const a = 1 - flash / 50;
          if (mode === 'vertical') for (let y = 0; y < s.rows; y++) s.put(Math.round(b.cx), y, '│', sg(flash / 50), a * (1 - Math.abs(y - b.cy) / s.rows));
          else if (mode === 'horizontal') for (let x = 0; x < s.cols; x++) s.put(x, Math.round(b.cy), '─', sg(flash / 50), a * (1 - Math.abs(x - b.cx) / s.cols));
          else if (mode === 'diagonal') for (let k = -b.w; k <= b.w * 2; k++) {
            const x = b.x1 - (k / b.w) * b.w, y = b.y0 + (k / b.w) * b.h;
            if (k % 1 === 0) s.put(x, y, '╱', sg(flash / 50), a);
          }
          else for (let x = b.x0; x <= b.x1; x += 3) s.putUnder(x, b.y0 - 1 - flash * 0.3, '·', sg(0.5), a);
          done = false;
        }
        return done;
      },
    };
  },
};
