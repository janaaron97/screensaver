import { gradient, mix, clamp, ease, WHITE, TAU } from '../core.js';

// Raindrops strike a dark pond; expanding rings reveal the letters,
// lifting them gently as each wave rolls through.
export default {
  id: 'ripple',
  name: 'Ripple',
  palette: { final: ['BAE6FD', '38BDF8', '0284C7'], ring: ['FFFFFF', '7DD3FC', '0369A1', '082F49'] },
  grad: 'radial',
  variants: [
    { name: 'Rainfall', reach: 8, rate: 0.07 },
    { name: 'Single Stone', stone: true, palette: { final: ['F5F5F4', 'D6D3D1', 'A8A29E'], ring: ['FFFFFF', 'E7E5E4', '78716C', '1C1917'] } },
    { name: 'Monsoon', rate: 0.16, life: 55, reach: 5, palette: { final: ['99F6E4', '2DD4BF', '0F766E'], ring: ['FFFFFF', '5EEAD4', '115E59', '042F2E'] } },
    { name: 'Moonlit Pond', rate: 0.06, life: 120, v: 0.35, reach: 14, palette: { final: ['E9D5FF', 'C4B5FD', '818CF8'], ring: ['FFFFFF', 'DDD6FE', '4C1D95', '1E1B4B'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const rg = gradient(P.ring);
    const drops = [];
    const v = p.v || 0.5;
    const life = p.life || 80;
    s.hideAll();
    let t = 0;
    let hidden = s.chars.length;
    const drop = (x, y, big) => drops.push({ x, y, t0: t, big, life: big ? 300 : life * r.range(0.8, 1.2), v: big ? 0.32 : v * r.range(0.8, 1.2) });
    if (p.stone) drop(b.cx, b.cy, true);
    const rate = p.rate || 0.15;
    return {
      tick() {
        t++;
        const spawning = hidden > 0 && (!p.stone || t > 90);
        if (spawning && r.chance(rate)) {
          // aim near characters still under water
          const pool = s.chars.filter((c) => !c.vis);
          const c = pool.length && r.chance(0.7) ? r.pick(pool) : null;
          const [x, y] = c ? [c.hx + r.range(-6, 6), c.hy + r.range(-2, 2)] : [r.range(b.x0 - 15, b.x1 + 15), r.range(b.y0 - 6, b.y1 + 6)];
          drop(x, y, false);
        } else if (!p.stone && spawning && r.chance(0.04)) drop(...s.randomPoint(), false);
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          const age = t - d.t0;
          if (age > d.life) {
            drops.splice(i, 1);
            continue;
          }
          const fade = 1 - age / d.life;
          if (age < 6) s.put(d.x, d.y, age < 3 ? '✦' : '*', WHITE, 1 - age / 6);
          for (let k = 0; k < (d.big ? 3 : 2); k++) {
            const rr = age * d.v - k * 3;
            if (rr <= 0) continue;
            const n = Math.ceil(rr * 6.5);
            const col = rg(clamp(1 - fade + k * 0.2));
            for (let j = 0; j < n; j++) {
              const a = (j / n) * TAU;
              s.putUnder(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * 0.5, k ? '·' : '◦', col, fade * (k ? 0.45 : 0.8));
            }
          }
          // reveal / lift chars on the leading ring
          const rr = age * d.v;
          for (const c of s.chars) {
            const dd = Math.hypot(c.hx - d.x, (c.hy - d.y) * 2);
            if (Math.abs(dd - rr) > d.v + 0.01) continue;
            if (!c.vis && (d.big || rr < (p.reach || 10))) {
              c.vis = true;
              hidden--;
              c.d.t0 = t;
              c.d.flash = 1;
            } else if (spawning && fade > 0.4) c.d.bob = t;
          }
        }
        for (const c of s.chars) {
          if (!c.vis) continue;
          const age = t - c.d.t0;
          const k = clamp(age / 50);
          const lift = c.d.bob !== undefined && t - c.d.bob < 16 ? Math.sin(((t - c.d.bob) / 16) * Math.PI) * 0.6 : 0;
          const rise = age < 20 ? Math.sin((age / 20) * Math.PI) * 1 : 0;
          c.y = c.hy - Math.max(lift, rise);
          c.col = mix(age < 6 ? WHITE : rg(0.3), c.fc, ease.outQuad(k));
          if (lift > 0) c.col = mix(c.col, WHITE, lift * 0.5);
        }
        if (hidden === 0 && !drops.length) {
          s.finishAll();
          return true;
        }
        return false;
      },
    };
  },
};
