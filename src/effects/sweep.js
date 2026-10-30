import { gradSteps, mix, scale, playSeq, stepSeq, clamp, WHITE } from '../core.js';

// A sweep reveals the text as bare grey glyphs, then a reverse sweep
// floods it with color.
export default {
  id: 'sweep',
  name: 'Sweep',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], sweep: ['835C3B', 'FFFFFF', '00D1FF'] },
  grad: 'horizontal',
  variants: [
    { name: 'Classic', mode: 'h' },
    { name: 'Scanline', mode: 'v', palette: { final: ['06D6A0', '118AB2', 'E0FBFC'], sweep: ['073B4C', 'FFFFFF', '06D6A0'] } },
    { name: 'Diagonal Shine', mode: 'd', palette: { final: ['F9C80E', 'F86624', 'EA3546'], sweep: ['662E9B', 'FFFFFF', 'F9C80E'] }, grad: 'diagonal' },
    { name: 'Radar', mode: 'radar', palette: { final: ['00FF87', '60EFFF', 'FFFFFF'], sweep: ['003B1F', 'B9FFD8', '00FF87'] }, grad: 'radial' },
  ],
  create(s, p, P) {
    const b = s.bounds;
    const sw = gradSteps(P.sweep, 8);
    const mode = p.mode || 'h';
    const key = (x, y) => {
      if (mode === 'h') return (x - b.x0) / Math.max(1, b.w - 1);
      if (mode === 'v') return (y - b.y0) / Math.max(1, b.h - 1);
      if (mode === 'd') return ((x - b.x0) / Math.max(1, b.w - 1) + (y - b.y0) / Math.max(1, b.h - 1)) / 2;
      return ((Math.atan2((y - b.cy) * 2, x - b.cx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
    };
    for (const c of s.chars) { c.d.k = key(c.hx, c.hy); c.vis = false; }
    const grey = [118, 118, 128];
    const T1 = 130, GAP = 25, T2 = 150;
    let t = 0, stage1 = true;

    const band = (pos, dir, col) => {
      if (mode === 'h' || mode === 'd') {
        const width = 6;
        for (let y = b.y0 - 1; y <= b.y1 + 1; y++) {
          const shift = mode === 'd' ? -(y - b.y0) : 0;
          const x0 = b.x0 + pos * (b.w + (mode === 'd' ? b.h : 0)) + shift;
          for (let j = 0; j < width; j++) s.put(Math.round(x0 - j * dir), y, '█▓▒░░░'[j], col, 0.55 * (1 - j / width));
        }
      } else if (mode === 'v') {
        for (let j = 0; j < 3; j++) {
          const y = Math.round(b.y0 + pos * b.h - j * dir);
          for (let x = 0; x < s.cols; x++) s.put(x, y, '▀▔ '[j] || ' ', col, 0.5 * (1 - j / 3) * (0.5 + 0.5 * Math.sin(x * 0.2)));
        }
      } else {
        const a = pos * Math.PI * 2 - Math.PI / 2;
        const R = Math.max(b.w, b.h * 2) * 0.62;
        for (let i = 0; i < R; i += 0.5) {
          for (let j = 0; j < 8; j++) {
            const aa = a - j * 0.04 * dir;
            s.put(b.cx + Math.cos(aa) * i, b.cy + Math.sin(aa) * i / 2, j ? '·' : '•', col, (j ? 0.5 * (1 - j / 8) : 0.9) * (1 - i / R * 0.5));
          }
        }
      }
    };

    return {
      tick() {
        t++;
        if (t <= T1) {
          const pos = t / T1;
          for (const c of s.chars)
            if (!c.vis && c.d.k <= pos) {
              c.vis = true;
              playSeq(c, [...'█▓▒░'].map((sym, i) => ({ sym, col: mix(WHITE, grey, i / 3), n: 3 })).concat([{ sym: c.ch, col: grey, n: 1 }]));
            }
          band(pos * 1.05, 1, sw[1]);
        } else if (t > T1 + GAP) {
          const tt = t - T1 - GAP;
          const pos = 1 - tt / T2;
          for (const c of s.chars)
            if (!c.d.colored && c.d.k >= pos) {
              c.d.colored = true;
              playSeq(c, [...sw.map((col) => ({ col, n: 2 })), ...[0.33, 0.66, 1].map((k) => ({ col: mix(sw[7], c.fc, k), n: 3 }))]);
            }
          if (tt <= T2) band(clamp(pos) - 0.02, -1, sw[6]);
          stage1 = false;
        }
        for (const c of s.chars) stepSeq(c);
        return !stage1 && s.chars.every((c) => c.d.colored && !c.q);
      },
    };
  },
};
