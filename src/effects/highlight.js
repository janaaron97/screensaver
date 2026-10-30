import { mix, clamp, WHITE, ease, hex } from '../core.js';

// A specular glint sweeps across polished text like light over chrome.
export default {
  id: 'highlight',
  name: 'Highlight',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], shine: ['FFFFFF'] },
  grad: 'horizontal',
  variants: [
    { name: 'Chrome', mode: 'diagonal', passes: 2 },
    { name: 'Scanner', mode: 'vertical', passes: 3, width: 0.12, palette: { final: ['FF0844', 'FFB199'], shine: ['FFF0F0'] } },
    { name: 'Twin Glint', mode: 'anti', passes: 2, twin: true, grad: 'diagonal', palette: { final: ['C9D6FF', 'E2E2E2', '8E9EAB'], shine: ['FFFFFF'] } },
    { name: 'Halo', mode: 'radial', passes: 2, width: 0.18, grad: 'radial', palette: { final: ['FDFC47', '24FE41'], shine: ['F4FFF0'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const shine = hex(P.shine[0]);
    const b = s.bounds;
    const maxR = Math.hypot(b.w / 2, b.h) || 1;
    for (const c of s.chars) {
      const u = (c.hx - b.x0) / Math.max(1, b.w - 1);
      const v = (c.hy - b.y0) / Math.max(1, b.h - 1);
      c.d.k = p.mode === 'vertical' ? v : p.mode === 'radial' ? Math.hypot(c.hx - b.cx, (c.hy - b.cy) * 2) / maxR : p.mode === 'anti' ? (1 - u) * 0.7 + v * 0.3 : u * 0.7 + v * 0.3;
      c.a = 0;
      c.col = mix(c.fc, [0, 0, 0], 0.4);
    }
    const fade = 45;
    const pass = 130;
    const w = p.width || 0.09;
    const total = fade + pass * p.passes + 20;
    let t = 0;

    return {
      tick() {
        t++;
        const fk = clamp(t / fade);
        const pt = t - fade;
        const pi = Math.floor(pt / pass);
        let pos = -1;
        if (pt >= 0 && pi < p.passes) {
          pos = ease.inOutSine((pt % pass) / pass) * (1 + 4 * w) - 2 * w;
          if (p.mode === 'vertical' && pi % 2) pos = 1 - pos;
        }
        const base = 0.6 + 0.4 * clamp(pt / (pass * p.passes));
        for (const c of s.chars) {
          c.a = fk;
          let br = 0;
          if (pos > -1) {
            br = Math.exp(-(((c.d.k - pos) / w) ** 2));
            if (p.twin) br = Math.max(br, 0.7 * Math.exp(-(((c.d.k - pos + 3 * w) / (w * 0.6)) ** 2)));
          }
          c.col = mix(mix(c.fc, [0, 0, 0], 1 - base), shine, br * 0.9);
          if (br > 0.92 && r.chance(0.03)) s.put(c.hx, c.hy, '✦', WHITE, 1);
        }
        if (t >= total) {
          s.finishAll();
          return true;
        }
        return false;
      },
    };
  },
};
