import { gradSteps, mix, scale, clamp, WHITE } from '../core.js';

// The message plays back on a worn VHS tape: lines jitter, colors split,
// tracking noise rolls through, then the picture redraws clean.
export default {
  id: 'vhstape',
  name: 'VHS Tape',
  palette: { final: ['AB48FF', 'E7B2B2', 'FFFFFF'], glitch: ['FF0040', '00E5FF', 'FFFFFF'], noise: ['1A1A1A', '6B6B6B', 'D0D0D0'] },
  grad: 'vertical',
  variants: [
    { name: 'Classic', glitch: 1, split: 1, bars: 1 },
    { name: 'Tracking Error', glitch: 0.7, split: 0.6, bars: 3, palette: { final: ['F4A261', 'E9C46A', 'FFF3D6'], glitch: ['E76F51', '2A9D8F', 'FFFFFF'], noise: ['202020', '808080', 'F0F0F0'] } },
    { name: 'Chromatic', glitch: 1.4, split: 3, bars: 0.4, palette: { final: ['FF4D6D', 'C77DFF', '4CC9F0'], glitch: ['FF0000', '00FF66', '0066FF'], noise: ['150020', '5A189A', 'E0AAFF'] } },
    { name: 'Paused', glitch: 0.5, split: 0.8, bars: 0.6, vjit: true, palette: { final: ['80FFDB', '72EFDD', 'E0FFF8'], glitch: ['FF00A0', '00FFD5', 'FFFFFF'], noise: ['002020', '3A6B6B', 'C8FFF4'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const W = s.cols;
    const g = gradSteps(P.glitch, 3);
    const noise = gradSteps(P.noise, 4);
    const rows = s.rowsOf();
    const PLAY = 330;
    const off = new Map(); // row -> {dx, life}
    const bars = [];
    let t = 0, redraw = -1;
    for (const c of s.chars) { c.col = mix(c.fc, WHITE, 0.15); c.vis = r.chance(0.9); }

    return {
      tick() {
        t++;
        if (t <= PLAY) {
          // Fade in from static.
          if (t < 40) for (const c of s.chars) if (!c.vis && r.chance(0.08)) c.vis = true;
          // Start horizontal glitches on random rows (often a contiguous band).
          if (r.chance(0.08 * p.glitch)) {
            const y0 = r.int(b.y0, b.y1), h = r.int(1, 3), dx = r.sign() * r.int(1, 8);
            for (let y = y0; y < y0 + h; y++) off.set(y, { dx: dx + r.int(-1, 1), life: r.int(4, 14) });
          }
          if (r.chance(0.008 * p.bars)) bars.push({ y: -3, h: r.int(2, 5), v: r.range(0.3, 0.8) });
          for (const row of rows) {
            const y = row[0].hy;
            const o = off.get(y);
            for (const c of row) {
              c.x = c.hx + (o ? o.dx : 0);
              c.y = c.hy + (p.vjit && r.chance(0.02) ? r.sign() : 0);
              const degraded = o && r.chance(0.35);
              c.sym = degraded ? r.pick('▓▒░█▀▄') : c.ch;
              c.col = o ? r.pick(g) : mix(c.fc, WHITE, 0.15 + 0.1 * Math.sin(t * 0.3 + y));
              // Chromatic ghosts.
              const sp = Math.round(p.split * (o ? 2 : 1) * (0.6 + 0.4 * Math.sin(t * 0.07)));
              if (sp && c.vis) {
                s.putUnder(c.x - sp, c.y, c.sym, g[0], 0.35);
                s.putUnder(c.x + sp, c.y, c.sym, g[1], 0.35);
              }
            }
            if (o && --o.life <= 0) off.delete(y);
          }
        } else {
          // Final redraw: a white scan head descends, rows snap clean behind it.
          if (redraw < 0) { redraw = 0; for (const c of s.chars) { c.x = c.hx; c.y = c.hy; c.vis = false; } }
          redraw++;
          const head = b.y0 - 1 + redraw * 0.25;
          for (const c of s.chars) {
            if (c.hy <= head) {
              if (!c.vis) { c.vis = true; c.sym = c.ch; c.d.k = 0; }
              c.d.k++;
              c.col = mix(WHITE, c.fc, clamp(c.d.k / 18));
            }
          }
          if (head < b.y1 + 1) for (let x = 0; x < W; x++) s.put(x, Math.round(head) + 1, '▁', WHITE, 0.5 + 0.3 * r.float());
        }
        // Rolling tracking bars across the whole screen.
        for (let i = bars.length - 1; i >= 0; i--) {
          const bar = bars[i];
          bar.y += bar.v;
          for (let y = Math.round(bar.y); y < bar.y + bar.h; y++)
            for (let x = 0; x < W; x++) if (r.chance(0.45)) s.put(x, y, r.pick('░▒▓▔▁'), r.pick(noise), r.range(0.2, 0.7));
          if (bar.y > s.rows) bars.splice(i, 1);
        }
        // Sprinkled snow.
        if (t <= PLAY) for (let i = 0; i < 25; i++) s.putUnder(r.int(0, W - 1), r.int(0, s.rows - 1), r.pick('·.'), noise[r.int(1, 3)], r.range(0.2, 0.5));
        if (redraw > 0 && s.chars.every((c) => c.vis && c.d.k >= 18) && !bars.length) {
          for (const c of s.chars) c.finish();
          return true;
        }
        return false;
      },
    };
  },
};
