import { gradient, mix, clamp, hex, WHITE } from '../core.js';

// Corrupted signal: slices tear sideways, RGB channels split and datamosh
// blocks smear across the text until the stream stabilizes.
export default {
  id: 'glitch',
  name: 'Glitch',
  palette: { final: ['F8FAFC', 'C4B5FD', '818CF8'], red: ['FF2A6D'], cyan: ['05D9E8'], noise: ['01012B', '005678', 'D1F7FF', 'FF2A6D'] },
  grad: 'vertical',
  variants: [
    { name: 'Datamosh', blocks: 1.6 },
    { name: 'Signal Loss', tear: 2.2, blocks: 0.5, palette: { final: ['E2E8F0', '94A3B8', '64748B'], red: ['F43F5E'], cyan: ['38BDF8'], noise: ['0F172A', '334155', 'CBD5E1', 'FFFFFF'] } },
    { name: 'Chromatic', split: 2.5, blocks: 0.6, palette: { final: ['FF71CE', 'B967FF', '01CDFE'], red: ['FF006E'], cyan: ['00F5FF'], noise: ['10002B', '7B2CBF', 'FF71CE', '01CDFE'] } },
    { name: 'Corrupted Boot', glyphs: '01░▒▓$#%&@', dur: 420, palette: { final: ['86EFAC', '22C55E', '15803D'], red: ['FACC15'], cyan: ['4ADE80'], noise: ['052E16', '166534', '4ADE80', 'DCFCE7'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const red = hex(P.red[0]), cyan = hex(P.cyan[0]);
    const ng = gradient(P.noise);
    const glyphs = [...(p.glyphs || '▓▒░█▀▄■□▪▚▞#%&$@!?<>/\\')];
    const T = p.dur || 360;
    const tear = p.tear || 1;
    const split = p.split || 1;
    const blocks = p.blocks || 1;
    const bursts = [];
    for (const c of s.chars) {
      c.vis = false;
      c.d.on = r.int(10, T * 0.55);
    }
    let t = 0;
    return {
      tick() {
        t++;
        if (t >= T) {
          s.finishAll();
          return true;
        }
        const I = 1 - (t / T) ** 1.6; // corruption intensity
        if (r.chance(0.25 * I + 0.02)) {
          const h = r.int(1, Math.max(1, Math.round(b.h / 3)));
          bursts.push({ y0: r.int(b.y0 - 1, b.y1), h, dx: Math.round(r.gauss() * 10 * I * tear), ttl: r.int(3, 14), mode: r.pick(['shift', 'shift', 'corrupt', 'flash']) });
        }
        const rowShift = new Map();
        const rowMode = new Map();
        for (let i = bursts.length - 1; i >= 0; i--) {
          const bu = bursts[i];
          if (--bu.ttl <= 0) {
            bursts.splice(i, 1);
            continue;
          }
          for (let y = bu.y0; y < bu.y0 + bu.h; y++) {
            rowShift.set(y, (rowShift.get(y) || 0) + bu.dx);
            rowMode.set(y, bu.mode);
          }
        }
        // datamosh blocks
        if (r.chance(0.35 * I * blocks)) {
          const w = r.int(3, 18), h = r.int(1, 4);
          const x0 = r.int(b.x0 - 10, b.x1), y0 = r.int(b.y0 - 3, b.y1 + 1);
          const col = ng(r.float());
          const sym = r.pick(['█', '▓', '▒', '░']);
          for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) s.put(x, y, sym, col, 0.35 + 0.5 * I);
        }
        // scanline noise
        if (r.chance(0.15 * I)) {
          const y = r.int(0, s.rows - 1);
          for (let x = 0; x < s.cols; x += r.int(1, 3)) s.putUnder(x, y, '─', ng(r.float()), 0.25 * I);
        }
        const sp = Math.round(split * I * (r.chance(0.3) ? 2 : 1));
        for (const c of s.chars) {
          if (t < c.d.on) {
            // flicker in early as fragments
            c.vis = r.chance(0.04 * I);
            if (!c.vis) continue;
          } else c.vis = true;
          const dx = rowShift.get(c.hy) || 0;
          const mode = rowMode.get(c.hy);
          c.x = c.hx + dx;
          c.sym = mode === 'corrupt' && r.chance(0.6) ? r.pick(glyphs) : r.chance(0.02 * I) ? r.pick(glyphs) : c.ch;
          c.col = mode === 'flash' ? WHITE : mode === 'corrupt' ? ng(r.float()) : mix(c.fc, WHITE, r.chance(0.05) ? 0.6 : 0);
          c.a = r.chance(0.04 * I) ? 0.3 : 1;
          if (sp > 0 && c.vis) {
            s.putUnder(c.x - sp, c.y, c.sym, red, 0.55);
            s.putUnder(c.x + sp, c.y, c.sym, cyan, 0.55);
          }
        }
        return false;
      },
    };
  },
};
