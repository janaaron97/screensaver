import { gradient, mix, clamp, ease, WHITE } from '../core.js';

// Snow drifts down on the wind; flakes that land on the letters settle,
// pile up and melt into the final colors.
export default {
  id: 'snow',
  name: 'Snowfall',
  palette: { final: ['F8FAFC', 'BAE6FD', '7DD3FC'], flake: ['FFFFFF', 'E0F2FE', '93C5FD'] },
  grad: 'vertical',
  variants: [
    { name: 'First Snow', wind: 0.15, amount: 1 },
    { name: 'Blizzard', wind: 0.9, amount: 2.6, gust: true, palette: { final: ['FFFFFF', 'CBD5E1', '94A3B8'], flake: ['FFFFFF', 'F1F5F9', 'CBD5E1'] } },
    { name: 'Sakura', wind: 0.35, amount: 0.8, syms: '✿❀*·', sway: 2.4, palette: { final: ['FFE4EC', 'FBA1C3', 'F472B6'], flake: ['FFF1F5', 'FBCFE8', 'F472B6'] } },
    { name: 'Ember Ash', wind: -0.25, amount: 1.2, syms: '·•*', palette: { final: ['FED7AA', 'F97316', 'DC2626'], flake: ['FFEDD5', 'FB923C', '78716C'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const fg = gradient(P.flake);
    const syms = [...(p.syms || '·•*❄✻')];
    const wind = p.wind || 0;
    const sway = p.sway || 1;
    const amount = p.amount || 1;
    const flakes = [];
    const span = 360;
    // Each char gets its own flake that lands on it.
    const order = r.shuffle([...s.chars]).sort((a, b) => b.hy - a.hy + r.range(-4, 4));
    order.forEach((c, i) => {
      c.vis = false;
      c.d.start = Math.floor((i / order.length) * span + r.range(0, 30));
      c.d.n = 50 + c.hy * 2.5 + r.range(0, 30);
      c.d.ph = r.range(0, 6.28);
      c.d.sym = r.pick(syms);
    });
    const spawn = (y = -1) => flakes.push({ x: r.range(-20, s.cols + 20), y, v: r.range(0.08, 0.28), ph: r.range(0, 6.28), sym: r.pick(syms), z: r.float() });
    for (let i = 0; i < 60 * amount; i++) spawn(r.range(0, s.rows));
    let t = 0, settled = 0;
    const end = span + 200;
    return {
      tick() {
        t++;
        const gust = p.gust ? 1 + Math.sin(t * 0.02) * 0.8 : 1;
        const falling = t < end - 80;
        const fade = clamp((t - end + 80) / 80);
        if (falling) for (let k = 0; k < 2; k++) if (r.chance(0.5 * amount)) spawn();
        for (let i = flakes.length - 1; i >= 0; i--) {
          const f = flakes[i];
          f.y += f.v * (0.6 + f.z);
          f.x += wind * gust * (0.5 + f.z) + Math.sin(t * 0.04 + f.ph) * 0.12 * sway;
          if (f.y > s.rows + 1 || fade >= 1) {
            flakes.splice(i, 1);
            continue;
          }
          s.putUnder(f.x, f.y, f.z > 0.6 ? f.sym : '·', fg(1 - f.z), (0.35 + f.z * 0.55) * (1 - fade));
        }
        for (const c of s.chars) {
          if (c.d.ok) continue;
          const k = (t - c.d.start) / c.d.n;
          if (k < 0) continue;
          c.vis = true;
          if (k < 1) {
            const e = ease.inOutSine(k);
            const drift = (1 - e) * (wind * c.d.n * 0.9 + Math.sin(t * 0.05 + c.d.ph) * 2 * sway);
            c.x = c.hx - drift;
            c.y = -2 + (c.hy + 2) * e;
            c.sym = c.d.sym;
            c.col = fg(0);
            c.a = clamp(k * 5);
            continue;
          }
          const m = clamp((t - c.d.start - c.d.n) / 60);
          c.x = c.hx;
          c.y = c.hy;
          c.a = 1;
          c.sym = m < 0.15 ? '•' : c.ch;
          c.col = mix(WHITE, c.fc, ease.inQuad(m));
          if (m >= 1) {
            c.finish();
            c.d.ok = true;
            settled++;
          }
        }
        return settled === s.chars.length && (fade >= 1 || !flakes.length);
      },
    };
  },
};
