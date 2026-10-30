import { gradSteps, scale, mix, playSeq, stepSeq, WHITE } from '../core.js';

// Beams of light race across rows and columns, leaving dimmed text behind,
// then a diagonal wipe brings everything to full color.
export default {
  id: 'beams',
  name: 'Beams',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], beam: ['FFFFFF', '00D1FF', '8A008A'] },
  grad: 'diagonal',
  variants: [
    { name: 'Classic' },
    { name: 'Rows Only', rows: true, cols: false },
    { name: 'Columns', rows: false, cols: true, palette: { final: ['F72585', '7209B7', '4CC9F0'], beam: ['FFFFFF', '4CC9F0', 'F72585'] } },
    { name: 'Solar Flare', speed: 1.6, palette: { final: ['FF4E00', 'FFB000', 'FFF2C2'], beam: ['FFFFFF', 'FFD000', 'FF3D00'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const speed = p.speed || 1;
    const beamCols = gradSteps(P.beam, 10);
    const groups = [];
    if (p.rows !== false)
      for (const row of s.rowsOf()) {
        const dir = r.sign();
        row.sort((a, b) => (a.hx - b.hx) * dir);
        groups.push({ chars: row, horiz: true, dir, y: row[0].hy, pos: dir > 0 ? -1 : s.cols, v: r.range(0.7, 1.8) * speed });
      }
    if (p.cols !== false)
      for (const col of s.colsOf()) {
        const dir = r.sign();
        col.sort((a, b) => (a.hy - b.hy) * dir);
        groups.push({ chars: col, horiz: false, dir, x: col[0].hx, pos: dir > 0 ? -1 : s.rows, v: r.range(0.25, 0.6) * speed });
      }
    r.shuffle(groups);
    s.hideAll();

    const active = [];
    let next = 0;
    let wipe = null;
    let t = 0;

    const light = (c, horiz) => {
      c.vis = true;
      const sym = horiz ? '▂' : '▌';
      const frames = beamCols.map((col, i) => ({ sym: i < 4 ? sym : c.ch, col, n: 2 }));
      const dim = scale(c.fc, 0.35);
      for (let i = 1; i <= 6; i++) frames.push({ sym: c.ch, col: mix(beamCols[9], dim, i / 6), n: 2 });
      playSeq(c, frames);
    };

    return {
      tick() {
        t++;
        if (next < groups.length && t % Math.max(1, Math.round(3 / speed)) === 0) active.push(groups[next++]);
        for (let i = active.length - 1; i >= 0; i--) {
          const g = active[i];
          g.pos += g.v * g.dir;
          // Light every char the head has passed.
          while (g.chars.length) {
            const c = g.chars[0];
            const k = g.horiz ? c.hx : c.hy;
            if ((g.dir > 0 && k <= g.pos) || (g.dir < 0 && k >= g.pos)) light(g.chars.shift(), g.horiz);
            else break;
          }
          // Draw the beam head + trail across the whole canvas.
          const len = g.horiz ? 10 : 5;
          for (let j = 0; j < len; j++) {
            const k = Math.round(g.pos - j * g.dir);
            const col = beamCols[Math.min(9, Math.floor((j / len) * 10))];
            if (g.horiz) s.put(k, g.y, j === 0 ? '█' : '▂', col, 1 - j / len);
            else s.put(g.x, k, j === 0 ? '█' : '▌', col, 1 - j / len);
          }
          const end = g.horiz ? s.cols : s.rows;
          if (!g.chars.length && (g.pos < -len || g.pos > end + len)) active.splice(i, 1);
        }
        for (const c of s.chars) stepSeq(c);

        if (next >= groups.length && !active.length && !wipe) wipe = { groups: s.diagonalsOf(), i: 0 };
        if (wipe) {
          for (let n = 0; n < 2 && wipe.i < wipe.groups.length; n++, wipe.i++)
            for (const c of wipe.groups[wipe.i]) {
              const dim = scale(c.fc, 0.35);
              playSeq(c, [
                { sym: c.ch, col: mix(dim, WHITE, 0.8), n: 3 },
                ...[0.25, 0.5, 0.75, 1].map((k) => ({ col: mix(WHITE, c.fc, k), n: 3 })),
              ]);
            }
          return wipe.i >= wipe.groups.length && s.chars.every((c) => !c.q);
        }
        return false;
      },
    };
  },
};
