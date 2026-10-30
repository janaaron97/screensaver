import { gradient, mix, clamp, WHITE } from '../core.js';

// Waves of bar glyphs roll across the text block, leaving the characters
// behind as they pass.
const BARS = '▁▂▃▄▅▆▇█▇▆▅▄▃▂▁';

export default {
  id: 'waves',
  name: 'Waves',
  palette: { final: ['FFB102', '31A0D4', 'F0FF65'], wave: ['F0FF65', 'FFB102', '31A0D4', 'F0FF65'] },
  grad: 'diagonal',
  variants: [
    { name: 'Classic', mode: 'ltr', count: 7 },
    { name: 'Tide', mode: 'rtl', count: 4, slow: true, palette: { final: ['0077B6', '00B4D8', 'CAF0F8'], wave: ['03045E', '0077B6', '90E0EF', 'CAF0F8'] } },
    { name: 'Ripple', mode: 'radial', count: 6, palette: { final: ['B5179E', '7209B7', '4CC9F0'], wave: ['4CC9F0', '4361EE', 'B5179E', 'F72585'] }, grad: 'radial' },
    { name: 'Rogue Wave', mode: 'diag', count: 10, fast: true, palette: { final: ['2EC4B6', 'CBF3F0', 'FFFFFF'], wave: ['011627', '2EC4B6', 'FFFFFF', 'FF9F1C'] } },
  ],
  create(s, p, P) {
    const b = s.bounds;
    const wave = gradient(P.wave, true);
    const mode = p.mode || 'ltr';
    const count = p.count || 7;
    const key = (x, y) => {
      const u = (x - b.x0) / Math.max(1, b.w - 1), v = (y - b.y0) / Math.max(1, b.h - 1);
      if (mode === 'ltr') return u;
      if (mode === 'rtl') return 1 - u;
      if (mode === 'diag') return (u + v) / 2;
      return Math.hypot(x - b.cx, (y - b.cy) * 2) / Math.hypot(b.w / 2, b.h);
    };
    const cycleT = p.fast ? 26 : p.slow ? 48 : 36; // ticks per wave pass of one char
    const spanT = p.fast ? 110 : p.slow ? 220 : 160; // delay across the block
    const life = cycleT * count / 2;
    for (const c of s.chars) { c.d.k = key(c.hx, c.hy); c.vis = false; }
    // Empty cells inside the block also carry the swell, faintly.
    const blanks = [];
    const occ = new Set(s.chars.map((c) => c.hx + ',' + c.hy));
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0 - 4; x <= b.x1 + 4; x++) if (!occ.has(x + ',' + y)) blanks.push([x, y, key(x, y)]);
    let t = 0;
    const total = spanT + life + 30;

    const at = (k, tt) => {
      const local = tt - k * spanT;
      if (local < 0) return null;
      if (local >= life) return { done: true, after: local - life };
      const ph = local / life * count;
      const idx = Math.floor((ph % 1) * BARS.length);
      return { sym: BARS[idx], col: wave((ph / count + k) % 1), env: Math.sin(Math.PI * local / life) };
    };

    return {
      tick() {
        t++;
        for (const c of s.chars) {
          const w = at(c.d.k, t);
          if (!w) continue;
          c.vis = true;
          if (w.done) { c.sym = c.ch; c.col = mix(WHITE, c.fc, clamp(w.after / 15)); }
          else { c.sym = w.sym; c.col = w.col; }
        }
        for (const [x, y, k] of blanks) {
          const w = at(clamp(k), t);
          if (w && !w.done) s.putUnder(x, y, w.sym, w.col, 0.28 * w.env);
        }
        if (t >= total) { for (const c of s.chars) c.finish(); return true; }
        return false;
      },
    };
  },
};
