import { ease, gradient, mix, WHITE, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// Rows, columns or diagonals of text slide in from beyond the screen edge
// one group after another, with motion-blur trails.
export default {
  id: 'slide',
  name: 'Slide',
  palette: { final: ['833AB4', 'FD1D1D', 'FCB045'], trail: ['FFFFFF', 'FCB045'] },
  grad: 'horizontal',
  variants: [
    { name: 'Rows', group: 'row', palette: { final: ['833AB4', 'FD1D1D', 'FCB045'], trail: ['FFFFFF', 'FCB045'] } },
    { name: 'Merge', group: 'row', merge: true, palette: { final: ['12C2E9', 'C471ED', 'F64F59'], trail: ['FFFFFF', 'C471ED'] } },
    { name: 'Curtain Drop', group: 'col', palette: { final: ['F8B195', 'F67280', 'C06C84', '6C5B7B'], trail: ['FFFFFF', 'F67280'] }, grad: 'vertical' },
    { name: 'Diagonal Rush', group: 'diag', palette: { final: ['43E97B', '38F9D7', '4FACFE'], trail: ['FFFFFF', '38F9D7'] }, grad: 'diagonal' },
  ],
  create(s, p, P) {
    const tg = gradient(P.trail);
    const groups = p.group === 'col' ? s.colsOf() : p.group === 'diag' ? s.diagonalsOf() : s.rowsOf();
    const gap = Math.max(2, Math.round(200 / groups.length));
    groups.forEach((g, i) => {
      for (const c of g) {
        c.d.start = i * gap;
        let sx = c.hx, sy = c.hy;
        if (p.group === 'col') sy = c.hy - s.rows - 2;
        else if (p.group === 'diag') sx = c.hx - s.cols - 4, sy = c.hy - Math.round(s.rows * 0.5);
        else sx = p.merge && i % 2 ? c.hx + s.cols + 2 : c.hx - s.cols - 2;
        c.d.sx = sx; c.d.sy = sy;
        c.vis = false;
      }
    });
    let t = 0;
    return {
      tick() {
        t++;
        let done = true;
        for (const c of s.chars) {
          if (t < c.d.start) { done = false; continue; }
          if (!c.d.go) {
            c.d.go = true;
            c.vis = true;
            c.x = c.d.sx; c.y = c.d.sy;
            moveTo(c, c.hx, c.hy, 90, ease.inOutQuart);
          }
          if (c.m) {
            done = false;
            const px = c.x, py = c.y;
            const k = c.m.t / c.m.n;
            c.col = mix(tg(1), c.fc, k);
            if (stepMove(c)) playSeq(c, [{ col: WHITE, n: 2 }, ...[0.33, 0.66, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 3 }))]);
            else {
              const dx = c.x - px, dy = c.y - py;
              for (let j = 1; j <= 3; j++) s.put(c.x - dx * j * 0.8, c.y - dy * j * 0.8, c.ch, tg(j / 3), 0.35 / j);
            }
          } else if (!stepSeq(c)) done = false;
        }
        return done;
      },
    };
  },
};
