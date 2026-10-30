import { gradSteps, mix, clamp, playSeq, stepSeq, WHITE } from '../core.js';

// A glowing edge wipes across the canvas, fading characters in behind it.
export default {
  id: 'wipe',
  name: 'Wipe',
  palette: { final: ['833AB4', 'FD1D1D', 'FCB045'], wipe: ['FFFFFF', 'FCB045', '833AB4'] },
  grad: 'diagonal',
  variants: [
    { name: 'Classic', mode: 'diag' },
    { name: 'Curtain', mode: 'center', palette: { final: ['E63946', 'F1FAEE', 'A8DADC'], wipe: ['FFFFFF', 'F1FAEE', 'E63946'] }, grad: 'horizontal' },
    { name: 'Iris', mode: 'iris', palette: { final: ['FFD166', 'EF476F', '118AB2'], wipe: ['FFFFFF', 'FFD166', 'EF476F'] }, grad: 'radial' },
    { name: 'Venetian', mode: 'blinds', palette: { final: ['43AA8B', '90BE6D', 'F9C74F'], wipe: ['FFFFFF', 'F9C74F', '43AA8B'] }, grad: 'vertical' },
  ],
  create(s, p, P) {
    const b = s.bounds;
    const wc = gradSteps(P.wipe, 6);
    const mode = p.mode || 'diag';
    const maxR = Math.hypot(b.w / 2, b.h) + 1;
    const key = (x, y) => {
      const u = (x - b.x0) / Math.max(1, b.w - 1), v = (y - b.y0) / Math.max(1, b.h - 1);
      if (mode === 'diag') return (u + v) / 2;
      if (mode === 'center') return Math.abs(u - 0.5) * 2;
      if (mode === 'iris') return 1 - Math.hypot(x - b.cx, (y - b.cy) * 2) / maxR;
      // Blinds: each slat of 2 rows sweeps independently, alternating direction.
      const slat = Math.floor((y - b.y0) / 2);
      return (slat % 2 ? 1 - u : u) * 0.8 + (slat / Math.max(1, Math.ceil(b.h / 2))) * 0.2;
    };
    for (const c of s.chars) { c.d.k = clamp(key(c.hx, c.hy)); c.vis = false; }
    const T = 170;
    let t = 0;

    const edge = (pos) => {
      for (let y = b.y0 - 1; y <= b.y1 + 1; y++)
        for (let x = b.x0 - 2; x <= b.x1 + 2; x++) {
          const d = key(x, y) - pos;
          if (d > 0 || d < -0.05) continue;
          const f = 1 + d / 0.05;
          s.put(x, y, f > 0.66 ? '█' : f > 0.33 ? '▓' : '░', wc[Math.floor((1 - f) * 5)], 0.5 * f);
        }
    };

    return {
      tick() {
        t++;
        const pos = t / T * 1.06;
        for (const c of s.chars)
          if (!c.vis && c.d.k <= pos) {
            c.vis = true;
            playSeq(c, [{ sym: c.ch, col: WHITE, n: 2 }, ...wc.map((col) => ({ col, n: 2 })), ...[0.25, 0.5, 0.75, 1].map((k) => ({ col: mix(wc[5], c.fc, k), n: 3 }))]);
          }
        if (pos <= 1.06) edge(pos);
        for (const c of s.chars) stepSeq(c);
        return pos > 1.06 && s.chars.every((c) => c.vis && !c.q);
      },
    };
  },
};
