import { gradSteps, mix, ease, moveTo, stepMove, WHITE } from '../core.js';

// Characters gather into swarms that roam the canvas before peeling off
// one swarm at a time and settling into place.
export default {
  id: 'swarm',
  name: 'Swarm',
  palette: { final: ['FFD000', 'FF8800', 'FFFFFF'], swarm: ['31A0D4', 'F2FF00', 'FF8800'] },
  grad: 'horizontal',
  variants: [
    { name: 'Hive' },
    { name: 'Fireflies', spread: 9, flicker: true, palette: { final: ['B7FF3C', '3CFFB0', 'F5FFE0'], swarm: ['0A3D00', 'C6FF00', 'FFFF8D'] } },
    { name: 'Murmuration', groups: 1, legs: 4, spread: 18, palette: { final: ['E0E1DD', '778DA9', 'FFFFFF'], swarm: ['0D1B2A', '415A77', 'E0E1DD'] } },
    { name: 'Piranhas', groups: 12, legs: 2, fast: true, spread: 4, palette: { final: ['FF0A54', 'FF5C8A', 'FFFFFF'], swarm: ['590D22', 'C9184A', 'FF4D6D'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const cols = gradSteps(P.swarm, 12);
    const nG = p.groups || 8;
    const order = r.shuffle([...s.chars]);
    const size = Math.ceil(order.length / nG);
    const swarms = [];
    for (let i = 0; i < order.length; i += size) swarms.push({ chars: order.slice(i, i + size), leg: -1, k: 0, dur: 1, released: false });
    const legs = p.legs || 3;
    const spread = p.spread || 7;
    const legT = p.fast ? 45 : 70;
    s.hideAll();
    let t = 0, next = 0, done = 0;

    const fly = (sw) => {
      sw.leg++;
      sw.k = 0;
      if (sw.leg >= legs) {
        for (const c of sw.chars) {
          moveTo(c, c.hx, c.hy, r.int(45, 80), ease.inOutQuad);
          c.d.settle = true;
        }
        sw.dur = 90;
        return;
      }
      const [tx, ty] = s.randomPoint();
      sw.dur = legT + r.int(0, 20);
      for (const c of sw.chars)
        moveTo(c, tx + r.gauss() * spread, ty + r.gauss() * spread / 2, sw.dur * r.range(0.75, 1), ease.inOutSine,
          (c.x + tx) / 2 + r.gauss() * spread * 2, (c.y + ty) / 2 + r.gauss() * spread);
    };

    return {
      tick() {
        t++;
        if (next < swarms.length && t >= next * (p.groups === 1 ? 0 : 38)) {
          const sw = swarms[next++];
          const [ox, oy] = s.offscreenPoint();
          for (const c of sw.chars) { c.vis = true; c.x = ox + r.gauss() * 2; c.y = oy + r.gauss(); c.col = cols[0]; c.sym = c.ch; }
          fly(sw);
        }
        for (const sw of swarms) {
          if (sw.leg < 0 || sw.done) continue;
          sw.k++;
          let arrived = true;
          for (const c of sw.chars) {
            if (!stepMove(c)) arrived = false;
            if (c.d.settle) {
              c.a = 1;
              if (!c.m) {
                c.d.land = (c.d.land || 0) + 1;
                c.col = mix(WHITE, c.fc, Math.min(1, c.d.land / 12));
              } else c.col = mix(cols[11], c.fc, sw.k / 80);
            } else {
              const ph = (sw.k / sw.dur + c.hx * 0.01) % 1;
              c.col = cols[Math.floor((sw.leg / legs + ph / legs) * 11)];
              if (p.flicker) c.a = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.2 + c.hx * 1.7 + c.hy));
            }
          }
          if (arrived && sw.k >= 1) {
            if (sw.leg >= legs) {
              if (sw.chars.every((c) => c.d.land >= 12)) { for (const c of sw.chars) c.finish(); sw.done = true; done++; }
            } else fly(sw);
          }
        }
        return done === swarms.length;
      },
    };
  },
};
