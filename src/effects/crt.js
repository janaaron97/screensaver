import { gradient, mix, clamp, ease, scale, WHITE } from '../core.js';

// An old CRT powers on: a dot, a line, then the raster blooms open with
// rolling scanlines and phosphor glow before the image settles.
export default {
  id: 'crt',
  name: 'CRT',
  palette: { final: ['B8FFC8', '4ADE80', '16A34A'], phosphor: ['FFFFFF', 'D1FAE5', '34D399'] },
  grad: 'vertical',
  variants: [
    { name: 'Power On' },
    { name: 'Off and On', cycle: true, palette: { final: ['E0F2FE', '93C5FD', '6366F1'], phosphor: ['FFFFFF', 'E0E7FF', '818CF8'] } },
    { name: 'Amber Monitor', slow: true, roll: 2, palette: { final: ['FFD58A', 'FFB000', 'D97706'], phosphor: ['FFFBEB', 'FDE68A', 'F59E0B'] } },
    { name: 'Trinitron', fast: true, rgb: true, palette: { final: ['F9A8D4', 'C4B5FD', '67E8F9'], phosphor: ['FFFFFF', 'FCE7F3', 'A5F3FC'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const pg = gradient(P.phosphor);
    const cy = (s.rows - 1) / 2, cx = (s.cols - 1) / 2;
    const sp = p.fast ? 0.85 : p.slow ? 1.4 : 1;
    const off = p.cycle ? 110 : 0; // power-off phase length
    const T = { dot: off + 10 * sp, line: off + 26 * sp, open: off + 60 * sp, settle: off + 300 * sp };
    const roll = p.roll || 1;
    let t = 0;
    if (!p.cycle) s.hideAll();
    else s.finishAll();
    return {
      tick() {
        t++;
        // ---- optional power-off: collapse to a line, then a dot, then dark
        if (t <= off) {
          const k = t / (off * 0.6);
          const hv = 1 - ease.inQuart(clamp(k)); // vertical extent
          const hw = 1 - ease.inCubic(clamp((t - off * 0.6) / (off * 0.25)));
          for (const c of s.chars) {
            c.y = cy + (c.hy - cy) * hv;
            c.x = cx + (c.hx - cx) * hw;
            c.col = mix(c.fc, WHITE, clamp(k));
            c.vis = hw > 0.02;
            if (hv < 0.15) c.sym = '━';
          }
          if (hw <= 0.02 && t < off * 0.95) s.put(cx, cy, '●', WHITE, 1 - (t - off * 0.85) / (off * 0.1));
          return false;
        }
        const tt = t - off;
        // ---- power-on dot
        if (t <= T.dot) {
          s.put(cx, cy, tt < 4 ? '·' : '●', WHITE, tt / 10);
          return false;
        }
        // ---- horizontal line
        if (t <= T.line) {
          const k = ease.outExpo((t - T.dot) / (T.line - T.dot));
          const hw = (s.cols / 2) * k;
          for (let x = Math.floor(cx - hw); x <= cx + hw; x++) s.put(x, cy, '━', pg(Math.abs(x - cx) / (hw + 1)), 1);
          return false;
        }
        // ---- raster opens vertically
        const ok = ease.outCubic(clamp((t - T.line) / (T.open - T.line)));
        const hh = (s.rows / 2 + 1) * ok;
        const glare = 1 - ok; // brightness of the fill while opening
        const top = cy - hh, bot = cy + hh;
        if (ok < 1) {
          for (let x = 0; x < s.cols; x++) {
            s.put(x, top, '▄', pg(0.2), 0.9 * glare + 0.1);
            s.put(x, bot, '▀', pg(0.2), 0.9 * glare + 0.1);
          }
          for (let y = Math.ceil(top) + 1; y < bot; y += 2) for (let x = 0; x < s.cols; x++) s.putUnder(x, y, '█', pg(0.5), glare * 0.35);
        }
        // rolling scan bar and faint scanlines while settling
        const sk = clamp((t - T.open) / (T.settle - T.open));
        const settle = ease.inOutSine(sk);
        if (ok >= 1 && sk < 1) {
          const bar = ((t * 0.35 * roll) % (s.rows + 8)) - 4;
          for (let j = 0; j < 4; j++) for (let x = 0; x < s.cols; x += 1) s.putUnder(x, bar - j, '▀', pg(0.6), (1 - settle) * 0.12 * (1 - j / 4));
          for (let y = 0; y < s.rows; y += 2) for (let x = (y / 2) % 3; x < s.cols; x += 3) s.putUnder(x, y, '·', pg(0.8), (1 - settle) * 0.08);
        }
        const jit = (1 - settle) * 1.5;
        for (const c of s.chars) {
          c.vis = c.hy >= top && c.hy <= bot;
          if (!c.vis) continue;
          c.sym = c.ch;
          c.y = c.hy;
          c.x = c.hx + (r.chance(0.08 * jit) ? Math.round(Math.sin(t * 0.7 + c.hy * 1.3) * jit) : 0);
          let base = mix(pg(0), c.fc, settle);
          if (p.rgb && sk < 0.7) base = mix([[255, 70, 90], [80, 255, 120], [90, 140, 255]][(c.hx + t) % 3], base, settle * 1.4);
          c.col = mix(base, WHITE, glare * 0.8);
          c.a = 0.75 + 0.25 * settle;
        }
        if (sk >= 1) {
          s.finishAll();
          return true;
        }
        return false;
      },
    };
  },
};
