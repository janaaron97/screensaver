import { gradient, mix, clamp, ease, TAU } from '../core.js';

// A flowing plasma field fills the screen; it slowly condenses onto the
// text, leaving the letters glowing in their final colors.
export default {
  id: 'plasma',
  name: 'Plasma',
  palette: { final: ['FF9E00', 'FF0054', '9E0059'], field: ['390099', '9E0059', 'FF0054', 'FF5400', 'FFBD00'] },
  grad: 'horizontal',
  variants: [
    { name: 'Lava Lamp', speed: 0.6, zoom: 0.07 },
    { name: 'Electric', speed: 1.8, zoom: 0.16, palette: { final: ['E0E7FF', '818CF8', '22D3EE'], field: ['020617', '312E81', '6366F1', '22D3EE', 'F0F9FF'] } },
    { name: 'Acid Trip', speed: 1.1, zoom: 0.11, hue: true, palette: { final: ['F0ABFC', '67E8F9', 'BEF264'], field: ['FF00C8', 'FFEA00', '00FF9D', '00B3FF', 'B400FF'] } },
    { name: 'Deep Ocean', speed: 0.8, zoom: 0.09, palette: { final: ['A5F3FC', '22D3EE', '0EA5E9'], field: ['020617', '0C4A6E', '0369A1', '06B6D4', 'A5F3FC'] } },
  ],
  create(s, p, P) {
    const g = gradient(P.field, true);
    const b = s.bounds;
    const sp = p.speed || 1;
    const z = p.zoom || 0.1;
    const syms = ['░', '░', '▒', '▓'];
    const T1 = 200, T2 = 220;
    const maxD = Math.hypot(s.cols, s.rows * 2) / 2;
    // Radial distance is static, so precompute it; the rest is a cheap sin sum.
    const rad = new Float32Array(s.cols * s.rows);
    for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) rad[y * s.cols + x] = Math.hypot(x - s.cols / 2, (y - s.rows / 2) * 2) * z * 1.3;
    const field = (x, y, t) => {
      const v = Math.sin(x * z + t) + Math.sin((y * 2 * z + t) * 0.8) + Math.sin((x * z + y * 2 * z + t) * 0.6) + Math.sin(rad[y * s.cols + x] - t * 1.2);
      return (v + 4) / 8;
    };
    for (const c of s.chars) c.a = 0;
    const cache = [];
    let t = 0;
    return {
      tick() {
        t++;
        const tt = t * 0.03 * sp;
        const shift = p.hue ? t * 0.004 : 0;
        // condense: field recedes from the edges toward the text
        const ck = ease.inOutSine(clamp((t - T1) / T2));
        const reach = maxD * (1 - ck);
        const alpha = clamp(t / 40) * (1 - ck * 0.6);
        // The field is recomputed every other tick; in between, the cached cells are redrawn.
        if (t % 2 === 0) {
          for (const e of cache) s.under.push(e);
        } else {
          cache.length = 0;
          for (let y = 0; y < s.rows; y++)
            for (let x = 0; x < s.cols; x++) {
              const dx = x < b.x0 ? b.x0 - x : x > b.x1 ? x - b.x1 : 0;
              const dy = y < b.y0 ? b.y0 - y : y > b.y1 ? y - b.y1 : 0;
              const d = Math.hypot(dx, dy * 2);
              if (d > reach) continue;
              const v = field(x, y, tt);
              if (v < 0.42) continue;
              const edge = clamp((reach - d) / 8);
              s.putUnder(x, y, syms[Math.min(3, Math.floor((v - 0.42) * 7))], g(v + shift), alpha * edge * (v - 0.3) * 0.9);
              cache.push(s.under[s.under.length - 1]);
            }
        }
        const ek = clamp((t - T1 - T2 * 0.5) / (T2 * 0.6));
        for (const c of s.chars) {
          c.a = Math.min(1, clamp((t - 30) / 80));
          c.col = mix(g(field(c.hx, c.hy, tt) + shift), c.fc, ease.inOutQuad(ek));
        }
        if (ek >= 1 && ck >= 1) {
          s.finishAll();
          return true;
        }
        return false;
      },
    };
  },
};
