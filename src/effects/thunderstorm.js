import { gradSteps, mix, scale, clamp, WHITE } from '../core.js';

// A storm rolls over the darkened text: rain lashes the canvas, lightning
// forks down and flashes the message, then the sky clears and it glows.
export default {
  id: 'thunderstorm',
  name: 'Thunderstorm',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], rain: ['4A5A80', '9AB0DD'], bolt: ['FFFFFF', 'E3F2FF', '68A3E8'] },
  grad: 'vertical',
  variants: [
    { name: 'Classic', rain: 1, bolts: 1 },
    { name: 'Monsoon', rain: 2.4, slant: 0.5, bolts: 0.7, palette: { final: ['48CAE4', '00B4D8', 'CAF0F8'], rain: ['1D3557', '6C9BCF'], bolt: ['FFFFFF', 'DFF6FF', '00B4D8'] } },
    { name: 'Dry Lightning', rain: 0, bolts: 2.6, palette: { final: ['C77DFF', 'E0AAFF', 'FFFFFF'], rain: ['3C096C', '7B2CBF'], bolt: ['FFFFFF', 'F3D9FF', '9D4EDD'] } },
    { name: 'Blizzard', snow: true, rain: 1.6, slant: -0.25, bolts: 0.4, palette: { final: ['A9D6E5', 'E2F4FB', 'FFFFFF'], rain: ['89A7C2', 'FFFFFF'], bolt: ['FFFFFF', 'EAF6FF', 'B9E2FF'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const W = s.cols, H = s.rows;
    const rainC = gradSteps(P.rain, 6);
    const boltC = gradSteps(P.bolt, 6);
    const STORM = 420, CLEAR = 90;
    const drops = [];
    const bolts = [];
    let flash = 0, t = 0;
    const slant = p.slant || (p.snow ? 0 : 0.15);
    for (const c of s.chars) { c.vis = true; c.col = scale(c.fc, 0.12); }

    const strike = () => {
      let x = r.range(W * 0.15, W * 0.85), y = 0;
      const pts = [];
      const targetY = r.chance(0.6) ? r.range(s.bounds.y0, s.bounds.y1) : H - 1;
      while (y < targetY) {
        pts.push([Math.round(x), Math.round(y), x]);
        const dx = r.gauss() * 1.6;
        x += dx; y += 1;
        if (r.chance(0.08)) { // fork
          let fx = x, fy = y;
          const dir = r.sign();
          for (let k = 0; k < r.int(4, 10); k++) { fx += dir * r.range(0.5, 2); fy += 1; pts.push([Math.round(fx), Math.round(fy), fx]); }
        }
      }
      bolts.push({ pts, life: r.int(14, 22), age: 0 });
      flash = 1;
      for (const c of s.chars) {
        const near = pts.some(([px, py]) => Math.abs(px - c.hx) < 6 && Math.abs(py - c.hy) < 3);
        if (near) c.d.zap = 1;
      }
    };

    return {
      tick() {
        t++;
        const storming = t < STORM;
        const intensity = storming ? clamp(t / 60) : 1 - clamp((t - STORM) / CLEAR);
        const fadeOut = storming ? 1 : 1 - clamp((t - STORM) / CLEAR);
        // Rain / snow.
        const rate = (p.rain || 0) * W * 0.05 * intensity;
        for (let i = 0; i < rate; i++) drops.push({ x: r.range(-10, W + 10), y: -1, v: p.snow ? r.range(0.15, 0.4) : r.range(0.9, 1.6), drift: r.range(0, 6.28) });
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.y += d.v;
          d.x += p.snow ? slant + Math.sin(t * 0.05 + d.drift) * 0.25 : slant * d.v;
          if (d.y >= H) {
            if (!p.snow && r.chance(0.5)) s.put(d.x, H - 1, r.pick('.,·'), rainC[5], 0.6);
            drops.splice(i, 1);
            continue;
          }
          if (p.snow) s.putUnder(d.x, d.y, r.chance(0.05) ? '*' : d.v > 0.3 ? '•' : '·', rainC[5], 0.8 * fadeOut);
          else {
            const sym = slant > 0.3 ? '/' : slant < -0.3 ? '\\' : '│';
            s.putUnder(d.x, d.y, sym, rainC[Math.min(5, Math.floor(d.v * 3))], 0.55 * fadeOut);
            s.putUnder(d.x - slant, d.y - 1, sym, rainC[1], 0.25 * fadeOut);
          }
        }
        // Lightning.
        if (storming && t > 40 && r.chance(0.012 * (p.bolts || 1))) strike();
        for (let i = bolts.length - 1; i >= 0; i--) {
          const bo = bolts[i];
          bo.age++;
          const on = bo.age < 4 || (bo.age > 6 && bo.age < 9) || (bo.age > 12 && r.chance(0.5));
          if (on)
            for (const [x, y, fx] of bo.pts) {
              const frac = fx - Math.floor(fx);
              s.put(x, y, frac < 0.33 ? '\\' : frac > 0.66 ? '/' : '│', boltC[0], 1);
              s.putUnder(x - 1, y, '░', boltC[5], 0.5);
              s.putUnder(x + 1, y, '░', boltC[5], 0.5);
            }
          if (bo.age >= bo.life) bolts.splice(i, 1);
        }
        // Sky glow on flash.
        if (flash > 0.4) for (let x = 0; x < W; x += 1) s.putUnder(x, 0, '▀', boltC[4], (flash - 0.4) * 0.6);
        flash *= 0.88;
        // Text lighting.
        const clear = storming ? 0 : clamp((t - STORM) / CLEAR);
        for (const c of s.chars) {
          c.d.zap = (c.d.zap || 0) * 0.9;
          const base = mix(scale(c.fc, 0.12), c.fc, clear);
          c.col = mix(mix(base, c.fc, flash * 0.9), WHITE, Math.max(c.d.zap, flash * 0.3));
        }
        if (!storming && t >= STORM + CLEAR && !bolts.length) {
          for (const c of s.chars) c.finish();
          return true;
        }
        return false;
      },
    };
  },
};
