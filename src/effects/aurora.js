import { gradient, mix, clamp, ease, WHITE } from '../core.js';

// Shimmering northern-lights curtains ripple across the sky; as they sweep
// over the text the letters catch their light and keep it.
export default {
  id: 'aurora',
  name: 'Aurora',
  palette: { final: ['A7F3D0', '34D399', '22D3EE', '818CF8'], sky: ['10B981', '34D399', '22D3EE', 'A78BFA', 'F0ABFC'] },
  grad: 'horizontal',
  variants: [
    { name: 'Borealis' },
    { name: 'Australis', palette: { final: ['FBCFE8', 'F472B6', 'C084FC', '818CF8'], sky: ['DB2777', 'F472B6', 'C084FC', '6366F1', '38BDF8'] } },
    { name: 'Solar Storm', speed: 1.7, bands: 4, palette: { final: ['FDE68A', '4ADE80', 'F43F5E'], sky: ['DC2626', 'F97316', '4ADE80', '22C55E', 'FDE68A'] } },
    { name: 'Polar Night', speed: 0.7, reverse: true, palette: { final: ['F1F5F9', 'BAE6FD', '93C5FD', 'A5B4FC'], sky: ['1E3A8A', '3B82F6', '93C5FD', 'E0F2FE', 'FFFFFF'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const sg = gradient(P.sky);
    const speed = p.speed || 1;
    const nb = p.bands || 3;
    const bands = Array.from({ length: nb }, (_, i) => ({
      base: b.y0 - 6 + i * 2 + r.range(-2, 2),
      f1: r.range(0.03, 0.07), f2: r.range(0.08, 0.15), w: r.range(0.02, 0.05) * speed,
      len: b.h + 10 + r.int(0, 6), amp: r.range(2, 4), hue: i / nb, ph: r.range(0, 6),
    }));
    const travel = Math.round(380 / speed);
    const x0 = -30, x1 = s.cols + 30;
    const dir = p.reverse ? -1 : 1;
    const strokes = ['│', '┃', '╎', '¦', '|'];
    for (const c of s.chars) {
      c.vis = false;
      c.d.j = r.range(-4, 4);
    }
    let t = 0, painted = 0;
    return {
      tick() {
        t++;
        const k = clamp(t / travel);
        const front = dir > 0 ? x0 + (x1 - x0) * k : x1 - (x1 - x0) * k;
        const fade = clamp((t - travel) / 70);
        for (const bd of bands) {
          for (let x = 0; x < s.cols; x++) {
            const ahead = (x - front) * dir; // >0: not yet reached
            const env = ahead > 0 ? clamp(1 - ahead / 12) : clamp(1 - -ahead / 70) * 0.65 + 0.15;
            const a0 = env * (1 - fade);
            if (a0 < 0.03) continue;
            const shimmer = 0.55 + 0.45 * Math.sin(x * bd.f2 * 3 + t * 0.11 * speed + bd.ph);
            if (shimmer < 0.2) continue;
            const y0 = bd.base + bd.amp * Math.sin(x * bd.f1 + t * bd.w) + Math.sin(x * bd.f2 - t * bd.w * 1.7) * 1.2;
            const col = sg((bd.hue + x / s.cols * 0.6 + t * 0.002) % 1);
            const sym = strokes[(x + bd.base) % strokes.length | 0] || '│';
            for (let j = 0; j < bd.len; j += 1) {
              const fall = j / bd.len;
              const a = a0 * shimmer * (fall < 0.15 ? fall / 0.15 : 1 - (fall - 0.15) / 0.85) * 0.5;
              if (a < 0.04) continue;
              s.putUnder(x, y0 + j, j % 2 ? sym : '·', mix(col, WHITE, (1 - fall) * 0.25 * shimmer), a);
            }
          }
        }
        for (const c of s.chars) {
          if (c.d.ok) continue;
          if (!c.vis) {
            if ((front - c.hx - c.d.j) * dir < 0) continue;
            c.vis = true;
            c.d.t0 = t;
            c.d.from = sg((c.hx / s.cols * 0.6 + c.hy / s.rows * 0.4) % 1);
          }
          const q = clamp((t - c.d.t0) / 90);
          c.col = q < 0.1 ? mix(WHITE, c.d.from, q * 10) : mix(c.d.from, c.fc, ease.inOutSine((q - 0.1) / 0.9));
          c.a = clamp(q * 4);
          if (q >= 1) {
            c.finish();
            c.d.ok = true;
            painted++;
          }
        }
        return painted === s.chars.length && fade >= 1;
      },
    };
  },
};
