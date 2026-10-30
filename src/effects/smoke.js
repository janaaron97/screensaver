import { gradSteps, mix, WHITE, playSeq, stepSeq } from '../core.js';

// Smoke rolls across the screen; every character it touches blooms into color.
export default {
  id: 'smoke',
  name: 'Smoke',
  palette: { final: ['FFFFFF', 'BB86FC', '6200EE'], smoke: ['242424', 'FFFFFF'], start: ['7A7A7A'] },
  grad: 'vertical',
  variants: [
    { name: 'Rising Smoke', src: 'bottom', palette: { final: ['FFFFFF', 'BB86FC', '6200EE'], smoke: ['242424', '9E9E9E', 'FFFFFF'], start: ['5A5A5A'] } },
    { name: 'Fog Bank', src: 'left', palette: { final: ['E3F2FD', '90CAF9', '1E88E5'], smoke: ['263238', '78909C', 'ECEFF1'], start: ['4A5560'] }, grad: 'horizontal' },
    { name: 'Incense', src: 'point', palette: { final: ['FFD6A5', 'FFADAD', 'BDB2FF'], smoke: ['2B1B3D', '9D8CC2', 'F2E9FF'], start: ['554A63'] }, grad: 'radial' },
    { name: 'Toxic Cloud', src: 'multi', palette: { final: ['D9ED92', '76C893', '1A759F'], smoke: ['0B2B0B', '38B000', 'CCFF33'], start: ['3D4F3D'] }, grad: 'diagonal' },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const sm = gradSteps(P.smoke, 8);
    const start = gradSteps(P.start, 1)[0];
    const seeds = [];
    if (p.src === 'left') seeds.push([-8, null]);
    else if (p.src === 'point') seeds.push([r.range(b.x0, b.x1), b.y1 + 3]);
    else if (p.src === 'multi') for (let i = 0; i < 3; i++) seeds.push(s.randomPoint());
    else seeds.push([b.cx, s.rows + 2]);
    const ph = [r.range(0, 9), r.range(0, 9), r.range(0, 9)];
    const noise = (x, y) =>
      Math.sin(x * 0.11 + ph[0]) * 3 + Math.sin(y * 0.37 + x * 0.05 + ph[1]) * 3 + Math.sin((x + y) * 0.21 + ph[2]) * 2;
    // arrival time (ticks) of the smoke front at each cell
    const arr = new Float32Array(s.cols * s.rows);
    let maxA = 0;
    const speed = p.src === 'multi' ? 0.5 : 0.7;
    for (let y = 0; y < s.rows; y++)
      for (let x = 0; x < s.cols; x++) {
        let d = Infinity;
        for (const [sx, sy] of seeds) {
          const dd = sy === null ? x - sx : Math.hypot(x - sx, (y - sy) * 2);
          d = Math.min(d, dd);
        }
        const a = (d + noise(x, y) * 1.5) / speed + 10;
        arr[y * s.cols + x] = a;
        maxA = Math.max(maxA, a);
      }
    const life = 60;
    const glyph = ['░', '▒', '▓', '▒', '░', '·'];
    for (const c of s.chars) {
      c.col = start;
      c.d.arr = arr[c.hy * s.cols + c.hx];
      c.d.lit = false;
    }
    let t = 0;
    return {
      tick() {
        t++;
        for (let y = 0; y < s.rows; y++)
          for (let x = 0; x < s.cols; x++) {
            const k = (t - arr[y * s.cols + x]) / life;
            if (k < 0 || k > 1) continue;
            const g = glyph[Math.min(glyph.length - 1, Math.floor(k * glyph.length))];
            const col = sm[Math.min(7, Math.floor((1 - Math.abs(k - 0.3)) * 8))];
            s.putUnder(x, y, g, col, 0.55 * Math.sin(k * Math.PI));
          }
        let done = t > maxA + life;
        for (const c of s.chars) {
          if (!c.d.lit && t >= c.d.arr + 6) {
            c.d.lit = true;
            playSeq(c, [{ col: mix(start, WHITE, 0.6), n: 3 }, { col: WHITE, n: 2 }, ...[0.2, 0.4, 0.6, 0.8, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 4 }))]);
          }
          if (!c.d.lit || !stepSeq(c)) done = false;
        }
        return done;
      },
    };
  },
};
