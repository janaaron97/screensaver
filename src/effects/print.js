import { ease, gradient, mix, WHITE, GLYPHS, playSeq, stepSeq } from '../core.js';

// A print head sweeps each line, stamping characters onto the page, then
// carriage-returns and feeds to the next line.
export default {
  id: 'print',
  name: 'Print',
  palette: { final: ['02B8BD', 'C1F0E3', '00FFA0'], head: ['FFFFFF', '02B8BD'] },
  grad: 'diagonal',
  variants: [
    { name: 'Typewriter', speed: 1.2, head: '▌', palette: { final: ['F4F1DE', 'E07A5F', '3D405B'], head: ['FFFFFF', 'E07A5F'] }, grad: 'vertical' },
    { name: 'Dot Matrix', speed: 1.6, boustro: true, head: '▓', palette: { final: ['02B8BD', 'C1F0E3', '00FFA0'], head: ['FFFFFF', '00FFA0'] } },
    { name: 'Laser Printer', speed: 3, head: '█', beam: true, palette: { final: ['FF0A54', 'FF85A1', 'FBB1BD'], head: ['FFFFFF', 'FF0A54'] }, grad: 'horizontal' },
    { name: 'Teletype', speed: 1, head: '▒', garble: true, palette: { final: ['FFD166', 'EF476F', '118AB2'], head: ['FFFFFF', 'FFD166'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const hc = gradient(P.head);
    const rows = s.rowsOf().map((g) => g.sort((a, c) => a.hx - c.hx));
    s.hideAll();
    const glyphs = [...GLYPHS.ascii];
    let ri = 0, x = b.x0 - 1, dirx = 1, state = 'print', ret = 0, t = 0;
    const speed = (p.speed || 1.5) * Math.max(1, (b.w * b.h) / 900);
    const stamp = (c) => {
      c.vis = true;
      const f = [];
      if (p.garble) for (let i = 0; i < 4; i++) f.push({ sym: r.pick(glyphs), col: hc(0.5), n: 2 });
      f.push({ sym: c.ch, col: WHITE, n: 3 });
      for (let i = 1; i <= 6; i++) f.push({ col: mix(hc(1), c.fc, i / 6), n: 3 });
      playSeq(c, f);
    };
    return {
      tick() {
        t++;
        if (ri < rows.length) {
          const row = rows[ri];
          const y = row[0].hy;
          if (state === 'print') {
            x += speed * dirx;
            for (const c of row) if (!c.vis && (dirx > 0 ? c.hx <= x : c.hx >= x)) stamp(c);
            for (let j = 0; j < 4; j++) s.put(x - dirx * j, y, j ? '░' : p.head || '█', hc(j / 4), 1 - j * 0.22);
            if (p.beam) for (let yy = 0; yy < s.rows; yy++) if (yy !== y) s.putUnder(x, yy, '│', hc(0.6), 0.12 / (1 + Math.abs(yy - y) * 0.2));
            if (dirx > 0 ? x > b.x1 + 1 : x < b.x0 - 1) {
              ri++;
              if (p.boustro) dirx = -dirx;
              else { state = 'return'; ret = 0; }
            }
          } else {
            // carriage return: a quick eased swoop back to the left margin with a feed
            ret++;
            const k = ease.inOutCubic(Math.min(1, ret / 12));
            const from = b.x1 + 1;
            x = from + (b.x0 - 1 - from) * k;
            const yy = rows[Math.min(ri, rows.length - 1)][0].hy;
            for (let j = 0; j < 6; j++) s.put(x + j * 2, yy, '▁', hc(0.3), 0.6 - j * 0.1);
            if (ret >= 12) { state = 'print'; x = b.x0 - 1; }
          }
        }
        let done = ri >= rows.length;
        for (const c of s.chars) if (!stepSeq(c)) done = false;
        return done;
      },
    };
  },
};
