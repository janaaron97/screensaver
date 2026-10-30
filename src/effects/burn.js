import { gradSteps, hex, mix, WHITE, playSeq, stepSeq } from '../core.js';

// Fire creeps through the ash-grey text, consuming each character and
// leaving it glowing in its true colors, with smoke curling upward.
export default {
  id: 'burn',
  name: 'Burn',
  palette: { final: ['00C3FF', 'FFFF1C'], fire: ['FFFFFF', 'FFF75D', 'FE650D', '8A003C', '510100'], ash: ['837373'] },
  grad: 'vertical',
  variants: [
    { name: 'Wildfire' },
    { name: 'Blue Flame', palette: { final: ['E0AAFF', '7B2CBF'], fire: ['FFFFFF', 'A2D2FF', '4361EE', '3A0CA3', '10002B'], ash: ['5C677D'] } },
    { name: 'Inferno', seeds: 6, fast: true, palette: { final: ['FFEA00', 'FF7B00', 'FF0000'], fire: ['FFFFFF', 'FFEA00', 'FF7B00', 'D00000', '370617'], ash: ['6B5E5E'] } },
    { name: 'Ember Fall', from: 'top', palette: { final: ['F72585', 'FFC8DD'], fire: ['FFFFFF', 'FFCAD4', 'F72585', '7A0045', '2B0016'], ash: ['70606A'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const fire = gradSteps(P.fire, 10);
    const ash = hex(P.ash[0]);
    const smokeCols = gradSteps(['808080', '303030'], 6);
    const fireSyms = ["'", '.', '▖', '▙', '█', '▜', '▀', '▝', '.'];
    const key = (x, y) => x * 10000 + y;
    const map = new Map(s.chars.map((c) => [key(c.hx, c.hy), c]));
    const b = s.bounds;
    const speed = p.fast ? 0.6 : 1;
    // Fallback time from rows ensures disconnected glyphs still catch.
    for (const c of s.chars) {
      const rowD = p.from === 'top' ? c.hy - b.y0 : b.y1 - c.hy;
      c.d.at = (rowD * 14 + r.range(0, 30)) * speed;
      c.col = ash;
      c.vis = true;
      c.a = 0;
    }
    // Randomised Dijkstra from seeds.
    let seeds;
    if (p.seeds) seeds = Array.from({ length: p.seeds }, () => r.pick(s.chars));
    else seeds = s.chars.filter((c) => (p.from === 'top' ? c.hy === b.y0 : c.hy >= b.y1 - 1));
    const heap = [];
    const push = (c, d) => {
      if (d >= c.d.at) return;
      c.d.at = d;
      heap.push([d, c]);
      let i = heap.length - 1;
      while (i > 0) {
        const j = (i - 1) >> 1;
        if (heap[j][0] <= heap[i][0]) break;
        [heap[i], heap[j]] = [heap[j], heap[i]];
        i = j;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, rr = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr;
          if (m === i) break;
          [heap[i], heap[m]] = [heap[m], heap[i]];
          i = m;
        }
      }
      return top;
    };
    for (const c of seeds) push(c, r.range(0, 10));
    const up = p.from === 'top' ? 1 : -1;
    while (heap.length) {
      const [d, c] = pop();
      if (d > c.d.at) continue;
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const n = map.get(key(c.hx + dx, c.hy + dy));
          if (!n || n === c) continue;
          const w = (dy === up ? 2.5 : dy === 0 ? 1.6 : 6) * (Math.abs(dx) + 1) * r.range(0.5, 1.6) * speed;
          push(n, d + w);
        }
    }
    // Normalise so the fire takes a consistent time to consume any phrase.
    const raw = Math.max(...s.chars.map((c) => c.d.at)) || 1;
    const span = p.fast ? 200 : 300;
    for (const c of s.chars) c.d.at = (c.d.at / raw) * span;
    const end = span + 40;
    const smoke = [];
    let t = 0;

    return {
      tick() {
        t++;
        let busy = false;
        for (const c of s.chars) {
          if (c.a < 1 && !c.d.lit) c.a = Math.min(0.7, t / 30);
          if (!c.d.lit) {
            busy = true;
            if (t >= c.d.at + 30) {
              c.d.lit = true;
              c.a = 1;
              const frames = fireSyms.map((sym, i) => ({ sym, col: fire[Math.min(9, i)], n: 3 }));
              frames.push({ sym: c.ch, col: fire[2], n: 3 });
              for (let k = 1; k <= 6; k++) frames.push({ col: mix(fire[1], c.fc, k / 6), n: 3 });
              playSeq(c, frames);
              if (r.chance(0.25)) smoke.push({ x: c.hx, y: c.hy - 1, life: r.int(20, 45), max: 45, vx: r.range(-0.15, 0.15), vy: -0.25 });
              if (r.chance(0.12)) smoke.push({ x: c.hx, y: c.hy, life: r.int(15, 30), max: 30, vx: r.range(-0.3, 0.3), vy: -r.range(0.3, 0.6), ember: true });
            }
          } else if (!stepSeq(c)) busy = true;
        }
        for (let i = smoke.length - 1; i >= 0; i--) {
          const sm = smoke[i];
          sm.y += sm.vy;
          sm.x += sm.vx;
          sm.life--;
          const k = 1 - sm.life / sm.max;
          if (sm.ember) s.put(sm.x, sm.y, k < 0.5 ? '•' : '·', fire[1 + Math.floor(k * 3)], 1 - k);
          else s.put(sm.x, sm.y, k < 0.5 ? '▒' : '░', smokeCols[Math.min(5, Math.floor(k * 6))], (1 - k) * 0.6);
          if (sm.life <= 0) smoke.splice(i, 1);
        }
        if (smoke.length) busy = true;
        return !busy && t > end;
      },
    };
  },
};
