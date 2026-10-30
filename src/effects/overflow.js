import { ease, gradSteps, hsl, mix, WHITE, playSeq, stepSeq } from '../core.js';

// Scrambled lines of the message overflow the terminal, scrolling past faster
// and faster until the true text slides in and locks into place.
export default {
  id: 'overflow',
  name: 'Overflow',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], overflow: ['F2EBC0', '8DBFB3', 'F2EBC0'] },
  grad: 'vertical',
  variants: [
    { name: 'Classic', palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], overflow: ['F2EBC0', '8DBFB3', '2A9D8F'] } },
    { name: 'Torrent', lines: 3, dur: 360, palette: { final: ['E63946', 'F1FAEE', 'A8DADC'], overflow: ['457B9D', '1D3557', 'A8DADC'] } },
    { name: 'Rainbow Scroll', rainbow: true, palette: { final: ['FFFFFF', 'FFD6FF', 'C8B6FF'], overflow: ['FFFFFF'] } },
    { name: 'Downfall', dir: -1, palette: { final: ['F4A261', 'E76F51', 'FFE8D6'], overflow: ['264653', '2A9D8F', 'E9C46A'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const h = b.h;
    const dir = p.dir || 1;
    const rowsArt = Array.from({ length: h }, () => []);
    for (const c of s.chars) rowsArt[c.hy - b.y0].push(c);
    const K = Math.round(s.rows * (p.lines || 2));
    const ocols = gradSteps(P.overflow, 8);
    const tape = [];
    for (let i = 0; i < K; i++) {
      let j = r.int(0, h - 1);
      for (let g = 0; g < 4 && !rowsArt[j].length; g++) j = r.int(0, h - 1);
      tape.push({ j, col: p.rainbow ? hsl(i / 23, 0.85, 0.65) : r.pick(ocols), shift: r.chance(0.3) ? r.int(-6, 6) : 0 });
    }
    const end = dir > 0 ? s.rows - b.y0 + K : b.y0 + h + K;
    const N = p.dur || 420;
    let t = 0, landed = false;
    for (const c of s.chars) c.col = mix(c.fc, WHITE, 0.15);
    return {
      tick() {
        if (landed) {
          let done = true;
          for (const c of s.chars) if (!stepSeq(c)) done = false;
          return done;
        }
        t++;
        const k = Math.min(1, t / N);
        // fast in the middle, gentle stop at the end
        const sc = Math.round(end * (k < 0.8 ? ease.inSine(k / 0.8) * 0.85 : 0.85 + 0.15 * ease.outCubic((k - 0.8) / 0.2)));
        const off = dir * (end - sc);
        tape.forEach((row, i) => {
          const idx = dir > 0 ? i - K : h + i;
          const y = b.y0 + idx + off;
          if (y < 0 || y >= s.rows) return;
          for (const c of rowsArt[row.j]) s.put(c.hx + row.shift, y, c.ch, row.col, 0.85);
        });
        for (const c of s.chars) {
          c.y = c.hy + off;
          c.vis = c.y >= 0 && c.y < s.rows;
        }
        if (k >= 1) {
          landed = true;
          for (const c of s.chars) {
            c.finish();
            const d = (c.hy - b.y0) * 2 + r.int(0, 3);
            playSeq(c, [{ col: mix(c.fc, WHITE, 0.15), n: d + 1 }, { col: WHITE, n: 3 }, ...[0.25, 0.5, 0.75, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 3 }))]);
          }
        }
        return false;
      },
    };
  },
};
