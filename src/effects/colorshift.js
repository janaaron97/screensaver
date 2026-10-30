import { gradient, mix, clamp, ease } from '../core.js';

// A looping gradient flows through the text, cycling hues before
// easing into the final palette.
export default {
  id: 'colorshift',
  name: 'Color Shift',
  palette: { final: ['E81416', 'FFA500', 'FAEB36', '79C314', '487DE7', '4B369D', '70369D'], cycle: ['E81416', 'FFA500', 'FAEB36', '79C314', '487DE7', '4B369D', '70369D'] },
  grad: 'horizontal',
  variants: [
    { name: 'Spectrum', mode: 'horizontal' },
    { name: 'Pulse', mode: 'radial', grad: 'radial', palette: { final: ['FFFFFF', 'FF4D6D', '590D22'], cycle: ['FFFFFF', 'FF8FA3', 'FF4D6D', 'C9184A', '590D22'] } },
    { name: 'Neon Drive', mode: 'diagonal', grad: 'diagonal', cycles: 4, palette: { final: ['F72585', '7209B7', '3A0CA3', '4CC9F0'], cycle: ['F72585', 'B5179E', '7209B7', '3A0CA3', '4361EE', '4CC9F0'] } },
    { name: 'Aurora Drift', mode: 'wave', grad: 'vertical', palette: { final: ['2EF2B0', '1B98E0', '7F5AF0'], cycle: ['00F5A0', '00D9F5', '7F5AF0', 'C77DFF', '00F5A0'] } },
  ],
  create(s, p, P) {
    const g = gradient(P.cycle, true);
    const b = s.bounds;
    const maxR = Math.hypot(b.w / 2, b.h) || 1;
    const run = 60 * (p.cycles || 3) * 1.4;
    const blend = 70;
    for (const c of s.chars) {
      const u = (c.hx - b.x0) / Math.max(1, b.w - 1);
      const v = (c.hy - b.y0) / Math.max(1, b.h - 1);
      if (p.mode === 'radial') c.d.k = Math.hypot(c.hx - b.cx, (c.hy - b.cy) * 2) / maxR;
      else if (p.mode === 'diagonal') c.d.k = (u + v) / 2;
      else if (p.mode === 'wave') c.d.k = v * 0.5 + Math.sin(u * Math.PI * 3) * 0.15;
      else c.d.k = u;
      c.a = 0;
    }
    let t = 0;
    return {
      tick() {
        t++;
        const phase = (t / 84) * (p.mode === 'radial' ? -1 : 1);
        const fin = clamp((t - run) / blend);
        for (const c of s.chars) {
          let k = c.d.k;
          if (p.mode === 'wave') k += Math.sin(t * 0.03 + c.hx * 0.1) * 0.1;
          const cur = g(k - phase);
          c.col = fin > 0 ? mix(cur, c.fc, ease.inOutSine(fin)) : cur;
          c.a = Math.min(1, t / 30);
        }
        if (t >= run + blend) {
          s.finishAll();
          return true;
        }
        return false;
      },
    };
  },
};
