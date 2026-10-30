import { gradient, mix, clamp, ease, WHITE, TAU, moveTo, stepMove } from '../core.js';

// The letters are scattered through the arms of a rotating spiral galaxy
// around a blazing core, then fall inward and land in place.
export default {
  id: 'galaxy',
  name: 'Galaxy',
  palette: { final: ['FDE68A', 'F0ABFC', '93C5FD'], core: ['FFFFFF', 'FEF3C7', 'FBBF24'], arm: ['FDE68A', 'C084FC', '3B82F6', '1E1B4B'] },
  grad: 'radial',
  variants: [
    { name: 'Spiral', arms: 2 },
    { name: 'Barred', arms: 2, bar: true, palette: { final: ['FFEDD5', 'FDBA74', 'EA580C'], core: ['FFFFFF', 'FFEDD5', 'FB923C'], arm: ['FED7AA', 'F97316', '9A3412', '1C0A00'] } },
    { name: 'Andromeda', arms: 4, tilt: 0.3, palette: { final: ['FBCFE8', 'C4B5FD', '818CF8'], core: ['FFFFFF', 'FCE7F3', 'F472B6'], arm: ['FBCFE8', 'A78BFA', '4338CA', '0F0A2E'] } },
    { name: 'Supernova', arms: 3, nova: true, palette: { final: ['FFFFFF', '67E8F9', 'A855F7'], core: ['FFFFFF', 'CFFAFE', '22D3EE'], arm: ['A5F3FC', '06B6D4', '7E22CE', '1A0533'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const cg = gradient(P.core), ag = gradient(P.arm);
    const R = Math.min(s.cols * 0.48, s.rows * 1.1, Math.max(b.w * 0.8, 30));
    const arms = p.arms || 2;
    const tilt = p.tilt || 0.45;
    const T1 = 210, coll = 110;
    const place = (o) => {
      o.rr = R * Math.pow(r.float(), 0.7) + 2;
      const arm = r.int(0, arms - 1);
      o.th = (arm / arms) * TAU + o.rr * 0.13 + r.gauss() * 0.35;
      if (p.bar && o.rr < R * 0.3) o.th = (arm / arms) * TAU + r.gauss() * 0.12;
      o.w = 0.9 / Math.sqrt(o.rr + 3);
    };
    const dust = Array.from({ length: 360 }, () => {
      const o = {};
      place(o);
      return o;
    });
    const pos = (o, rot) => [b.cx + Math.cos(o.th + rot * o.w) * o.rr, b.cy + Math.sin(o.th + rot * o.w) * o.rr * tilt];
    for (const c of s.chars) {
      place(c.d);
      c.d.delay = T1 + (p.nova ? 25 : (c.d.rr / R) * 60) + r.range(0, 25);
      c.a = 0;
    }
    let t = 0;
    return {
      tick() {
        t++;
        const rot = t * 0.06;
        const ck = clamp((t - T1) / (coll + 60)); // collapse progress of dust/core
        const nova = p.nova && t > T1 && t < T1 + 40 ? 1 - (t - T1) / 40 : 0;
        // core glow
        const cr = 4 * (1 - ck) + nova * 14 + 1;
        for (let y = -Math.ceil(cr); y <= cr; y++)
          for (let x = -Math.ceil(cr * 2); x <= cr * 2; x++) {
            const d = Math.hypot(x / 2, y) / cr;
            if (d > 1) continue;
            s.putUnder(b.cx + x, b.cy + y, d < 0.3 ? '█' : d < 0.6 ? '▓' : '░', cg(d), (1 - d) * (1 - ck) * 0.9 + nova * (1 - d));
          }
        for (const o of dust) {
          const pull = p.nova ? 1 + ease.outExpo(ck) * 2 : 1 - ease.inCubic(ck);
          const [x, y] = pos(o, rot);
          const fx = b.cx + (x - b.cx) * pull, fy = b.cy + (y - b.cy) * pull;
          s.putUnder(fx, fy, o.rr < R * 0.25 ? '•' : '·', ag(o.rr / R), (1 - ck) * 0.8);
        }
        let done = ck >= 1;
        for (const c of s.chars) {
          const k = t - c.d.delay;
          if (k < 0) {
            const [x, y] = pos(c.d, rot);
            c.x = x;
            c.y = y;
            c.a = clamp(t / 40);
            c.col = ag(c.d.rr / R);
            c.sym = c.d.rr < R * 0.3 ? c.ch : '•';
            done = false;
            continue;
          }
          if (!c.d.go) {
            c.d.go = true;
            if (p.nova) {
              c.x = b.cx;
              c.y = b.cy;
              moveTo(c, c.hx, c.hy, 50 + r.int(0, 25), ease.outExpo);
            } else {
              const [x, y] = pos(c.d, rot + 6);
              moveTo(c, c.hx, c.hy, 55 + r.int(0, 25), ease.inOutCubic, x, y);
            }
            c.d.from = c.col;
          }
          if (!c.m) {
            if (!c.d.ok) c.finish(), (c.d.ok = true);
            continue;
          }
          done = false;
          stepMove(c);
          const q = c.m ? c.m.t / c.m.n : 1;
          c.sym = q > 0.5 ? c.ch : c.sym;
          c.a = 1;
          c.col = q < 0.85 ? mix(c.d.from, WHITE, q / 0.85) : mix(WHITE, c.fc, (q - 0.85) / 0.15);
          if (!c.m) c.finish(), (c.d.ok = true);
        }
        return done;
      },
    };
  },
};
