import { gradient, mix, clamp, ease, WHITE, moveTo, stepMove } from '../core.js';

// Grains of sand stream down and pile up, filling the letters row by row
// from the bottom like an hourglass.
export default {
  id: 'sand',
  name: 'Sand',
  palette: { final: ['FDE68A', 'F59E0B', 'B45309'], grain: ['FEF3C7', 'FCD34D', 'D97706', '92400E'] },
  grad: 'vertical',
  variants: [
    { name: 'Hourglass', mode: 'nozzle' },
    { name: 'Desert Wind', mode: 'wind', palette: { final: ['FED7AA', 'FB923C', 'C2410C'], grain: ['FFEDD5', 'FDBA74', 'EA580C', '7C2D12'] } },
    { name: 'Sandfall', mode: 'columns', palette: { final: ['E7E5E4', 'D6D3D1', 'A8A29E'], grain: ['FAFAF9', 'D6D3D1', '78716C', '44403C'] } },
    { name: 'Gold Dust', mode: 'nozzle', glitter: true, palette: { final: ['FFF7D6', 'FFD700', 'C9A227'], grain: ['FFFFFF', 'FFE873', 'E0B000', '8A6A00'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const gg = gradient(P.grain);
    const order = [...s.chars].sort((a, c) => c.hy - a.hy || Math.abs(a.hx - b.cx) - Math.abs(c.hx - b.cx) + r.range(-6, 6));
    const span = 330;
    order.forEach((c, i) => {
      c.vis = false;
      c.d.start = Math.floor((i / order.length) * span);
      c.d.tint = gg(r.range(0.1, 0.9));
    });
    const nozzle = [b.cx, Math.max(0, b.y0 - 10)];
    const stream = [];
    let t = 0, idx = 0, landed = 0;
    return {
      tick() {
        t++;
        while (idx < order.length && order[idx].d.start <= t) {
          const c = order[idx++];
          c.vis = true;
          c.sym = '•';
          c.col = c.d.tint;
          const fall = c.hy + 2;
          if (p.mode === 'nozzle') {
            c.x = nozzle[0];
            c.y = nozzle[1];
            moveTo(c, c.hx, c.hy, 20 + fall * 0.9 + Math.abs(c.hx - b.cx) * 0.25, ease.inQuad, nozzle[0], c.hy);
          } else if (p.mode === 'wind') {
            c.x = c.hx - fall * 1.6 - r.range(0, 10);
            c.y = -1;
            moveTo(c, c.hx, c.hy, 30 + fall * 1.1, ease.inQuad, c.hx - fall * 0.2, c.hy * 0.4);
          } else {
            c.x = c.hx;
            c.y = -1 - r.range(0, 3);
            moveTo(c, c.hx, c.hy, 18 + fall * 1.1, ease.inQuad);
          }
        }
        // decorative stream
        const live = idx < order.length;
        if (live && p.mode === 'nozzle')
          for (let y = 0; y <= nozzle[1] + 1; y++) s.putUnder(nozzle[0] + r.range(-0.4, 0.4), y, r.pick(['·', '•', ':']), gg(r.float()), 0.8);
        if (live)
          for (let k = 0; k < 3; k++) {
            const x = p.mode === 'nozzle' ? nozzle[0] + r.gauss() * 1.5 : r.range(b.x0 - 5, b.x1 + 5);
            stream.push({ x, y: p.mode === 'nozzle' ? nozzle[1] : -1, vx: p.mode === 'wind' ? 0.8 : r.gauss() * 0.1, vy: r.range(0.3, 0.7), life: r.int(15, 50) });
          }
        for (let i = stream.length - 1; i >= 0; i--) {
          const g = stream[i];
          g.x += g.vx;
          g.y += g.vy;
          g.vy += 0.04;
          if (--g.life <= 0 || g.y > s.rows) {
            stream.splice(i, 1);
            continue;
          }
          s.putUnder(g.x, g.y, '·', gg(r.float()), 0.5);
        }
        for (const c of s.chars) {
          if (!c.vis || c.d.ok) continue;
          if (c.m) {
            if (stepMove(c)) {
              c.d.land = t;
              c.sym = c.ch;
            }
            continue;
          }
          const k = clamp((t - c.d.land) / 50);
          c.col = mix(k < 0.1 ? WHITE : c.d.tint, c.fc, ease.inOutSine(k));
          if (p.glitter && r.chance(0.04 * (1 - k))) s.put(c.hx, c.hy - 1, r.pick(['✦', '·', '*']), WHITE, 0.9);
          if (k >= 1) {
            c.finish();
            c.d.ok = true;
            landed++;
          }
        }
        return landed === s.chars.length && !stream.length;
      },
    };
  },
};
