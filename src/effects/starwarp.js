import { gradient, mix, ease, clamp, WHITE, TAU } from '../core.js';

// Hyperspace: star streaks stretch out from the center, the jump decelerates
// and the text drops out of warp with a flash.
export default {
  id: 'starwarp',
  name: 'Star Warp',
  palette: { final: ['E0F2FE', '7DD3FC', '6366F1'], streak: ['FFFFFF', 'A5B4FC', '4F46E5', '1E1B4B'] },
  grad: 'radial',
  variants: [
    { name: 'Lightspeed' },
    { name: 'Hyperdrive', stars: 320, warp: 130, palette: { final: ['FFF7ED', 'FDBA74', 'EF4444'], streak: ['FFFFFF', 'FDE68A', 'F97316', '450A0A'] } },
    { name: 'Slipstream', inward: true, warp: 170, palette: { final: ['F0ABFC', 'A78BFA', '38BDF8'], streak: ['FFFFFF', 'F0ABFC', '7C3AED', '0F172A'] } },
    { name: 'Jump Gate', stagger: 70, stars: 200, palette: { final: ['D9F99D', '34D399', '0D9488'], streak: ['FFFFFF', '6EE7B7', '0F766E', '042F2E'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const sg = gradient(P.streak);
    const R = Math.hypot(s.cols / 2, s.rows) + 6;
    const warpT = p.warp || 150;
    const decelT = 80;
    const stagger = p.stagger || 30;
    const mk = () => ({ a: r.range(0, TAU), d: r.range(0.5, 6), v: r.range(0.05, 0.25) });
    const stars = Array.from({ length: p.stars || 260 }, () => {
      const st = mk();
      st.d = r.range(0.5, R);
      return st;
    });
    s.hideAll();
    const maxR = Math.hypot(b.w / 2, b.h) || 1;
    for (const c of s.chars) c.d.delay = warpT + decelT * 0.6 + (Math.hypot(c.hx - b.cx, (c.hy - b.cy) * 2) / maxR) * stagger + r.range(0, 8);
    let t = 0;
    let flash = -1;
    return {
      tick() {
        t++;
        // warp factor: ramps up, holds, then decays
        const warp = t < warpT ? 0.3 + 0.7 * ease.inQuad(clamp(t / 60)) : 1 - ease.outCubic(clamp((t - warpT) / decelT)) * 0.97;
        const fade = clamp((t - warpT - decelT - stagger) / 50);
        for (const st of stars) {
          st.v = Math.min(st.v * (1 + 0.04 * warp), 3);
          st.d += st.v * warp * 1.5 + 0.02;
          if (st.d > R) {
            if (t > warpT + decelT * 0.5) {
              st.dead = true;
              continue;
            }
            Object.assign(st, mk());
          }
          if (st.dead) continue;
          const len = Math.max(1, Math.min(st.d, st.v * warp * 9));
          const ca = Math.cos(st.a), sa = Math.sin(st.a);
          for (let j = 0; j < len; j++) {
            const dd = st.d - j;
            const k = j / len;
            s.putUnder(b.cx + ca * dd, b.cy + sa * dd * 0.5, j === 0 ? (warp > 0.4 ? '•' : '·') : Math.abs(ca) > 0.85 ? '─' : '·', sg(k * 0.9 + (1 - warp) * 0.1), (1 - fade) * (1 - k) * clamp(st.d / 6));
          }
        }
        let done = fade >= 1;
        for (const c of s.chars) {
          const k = (t - c.d.delay) / 45;
          if (k < 0) {
            done = false;
            continue;
          }
          if (flash < 0) flash = t;
          if (k >= 1) {
            if (!c.d.ok) c.finish(), (c.d.ok = true);
            continue;
          }
          done = false;
          c.vis = true;
          const e = ease.outExpo(k);
          const sc = p.inward ? 4 - 3 * e : 0.04 + 0.96 * e;
          c.x = b.cx + (c.hx - b.cx) * sc;
          c.y = b.cy + (c.hy - b.cy) * sc;
          c.col = k < 0.35 ? WHITE : mix(WHITE, c.fc, (k - 0.35) / 0.65);
          c.a = clamp(k * 6);
          // streak trail behind the arriving char
          if (k < 0.5) {
            const dx = (c.hx - b.cx) * 0.15, dy = (c.hy - b.cy) * 0.15;
            for (let j = 1; j < 4; j++) s.put(c.x - dx * j * (p.inward ? -1 : 1), c.y - dy * j * (p.inward ? -1 : 1), '·', sg(j / 4), (1 - k * 2) * (1 - j / 4));
          }
        }
        // drop-out flash ring
        if (flash > 0 && t - flash < 30) {
          const fk = (t - flash) / 30;
          const rr = 2 + fk * maxR * 1.6;
          const n = Math.ceil(rr * 5);
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            s.put(b.cx + Math.cos(a) * rr, b.cy + Math.sin(a) * rr * 0.5, '░', WHITE, (1 - fk) * 0.6);
          }
        }
        return done;
      },
    };
  },
};
