import { gradient, mix, clamp, WHITE } from '../core.js';

// Conway's Game of Life seethes across the screen; generation by generation
// the colony is coaxed into the shape of the text.
export default {
  id: 'life',
  name: 'Game of Life',
  palette: { final: ['A7F3D0', '34D399', '0EA5E9'], cell: ['FFFFFF', '6EE7B7', '0D9488', '134E4A'] },
  grad: 'diagonal',
  variants: [
    { name: 'Primordial Soup', density: 0.32 },
    { name: 'Glider Storm', gliders: 70, density: 0.04, palette: { final: ['FEF08A', 'FACC15', 'F97316'], cell: ['FFFFFF', 'FDE047', 'EA580C', '431407'] } },
    { name: 'HighLife', born: [3, 6], density: 0.28, palette: { final: ['F5D0FE', 'E879F9', '8B5CF6'], cell: ['FFFFFF', 'F0ABFC', '7E22CE', '2E1065'] } },
    { name: 'Coral Reef', born: [3], survive: [1, 2, 3, 4, 5], density: 0.05, seedText: true, palette: { final: ['FECDD3', 'FB7185', 'F97316'], cell: ['FFF1F2', 'FDA4AF', 'E11D48', '4C0519'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const W = s.cols, H = s.rows;
    const cg = gradient(P.cell);
    const born = new Set(p.born || [3]);
    const surv = new Set(p.survive || [2, 3]);
    let grid = new Uint8Array(W * H);
    let age = new Uint16Array(W * H);
    const target = new Uint8Array(W * H);
    const charAt = new Map();
    for (const c of s.chars) {
      const i = c.hy * W + c.hx;
      if (c.hx >= 0 && c.hx < W && c.hy >= 0 && c.hy < H) target[i] = 1, charAt.set(i, c);
      c.vis = false;
    }
    for (let i = 0; i < W * H; i++) grid[i] = r.chance(p.density) ? 1 : 0;
    if (p.seedText) for (const i of charAt.keys()) if (r.chance(0.15)) grid[i] = 1;
    for (let g = 0; g < (p.gliders || 0); g++) {
      const x0 = r.int(2, W - 5), y0 = r.int(2, H - 5);
      const sx = r.sign(), sy = r.sign();
      for (const [dx, dy] of [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]]) grid[(y0 + 1 + (dy - 1) * sy) * W + x0 + 1 + (dx - 1) * sx] = 1;
    }
    const GT = 3; // ticks per generation
    const free = 40, conv = 70; // generations
    let gen = 0, t = 0, revealed = 0;
    const step = () => {
      gen++;
      const k = clamp((gen - free) / conv); // convergence strength
      const next = new Uint8Array(W * H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const yy = (y + dy + H) % H;
            for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += grid[yy * W + ((x + dx + W) % W)];
          }
          const i = y * W + x;
          let v = grid[i] ? (surv.has(n) ? 1 : 0) : born.has(n) ? 1 : 0;
          if (k > 0) {
            if (target[i]) {
              if (!v && r.chance(k * k * 0.5)) v = 1;
            } else if (v && r.chance(k * k * 0.6 + 0.02 * k)) v = 0;
          }
          if (k >= 1) v = target[i];
          next[i] = v;
          age[i] = v ? (grid[i] ? Math.min(age[i] + 1, 60) : 0) : 0;
        }
      grid = next;
      // pin living text cells once convergence begins
      if (k > 0.15)
        for (const [i, c] of charAt)
          if (grid[i] && !c.vis) {
            c.vis = true;
            c.d.t0 = t;
            revealed++;
          }
    };
    return {
      tick() {
        t++;
        if (t % GT === 0 && gen < free + conv + 1) step();
        for (let i = 0; i < W * H; i++) {
          if (!grid[i]) continue;
          const c = charAt.get(i);
          if (c && c.vis) continue;
          s.putUnder(i % W, (i / W) | 0, age[i] < 2 ? '■' : '▪', cg(Math.min(1, age[i] / 20)), age[i] < 1 ? 1 : 0.75);
        }
        for (const c of s.chars) {
          if (!c.vis) continue;
          const k = clamp((t - c.d.t0) / 45);
          c.sym = k < 0.2 ? '■' : c.ch;
          c.col = mix(k < 0.2 ? WHITE : cg(0.1), c.fc, k);
        }
        if (gen > free + conv && revealed === s.chars.length && s.chars.every((c) => t - c.d.t0 >= 45)) {
          s.finishAll();
          return true;
        }
        if (gen > free + conv && revealed < s.chars.length)
          for (const c of s.chars) if (!c.vis) (c.vis = true), (c.d.t0 = t), revealed++;
        return false;
      },
    };
  },
};
