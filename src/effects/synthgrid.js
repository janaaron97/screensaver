import { gradient, gradSteps, mix, clamp, ease, playSeq, stepSeq, WHITE } from '../core.js';

// A neon grid draws itself across the whole canvas, characters dissolve
// into the cells, then the grid fades away.
export default {
  id: 'synthgrid',
  name: 'Synthgrid',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], grid: ['CC00CC', 'FFFFFF'], text: ['8A008A', '00D1FF', 'FFFFFF'] },
  grad: 'diagonal',
  variants: [
    { name: 'Classic', gx: 10, gy: 5 },
    { name: 'Outrun', outrun: true, palette: { final: ['FF2A6D', 'FFB86C', 'FFF5CC'], grid: ['FF2A6D', '05D9E8'], text: ['01012B', 'D1F7FF', 'FF2A6D'], sun: ['FFE66D', 'FF6B6B', 'C1121F'] } },
    { name: 'Blueprint', gx: 6, gy: 3, palette: { final: ['E0F2FF', 'FFFFFF'], grid: ['1B4F9C', '5FA8FF'], text: ['0B3D91', '5FA8FF', 'FFFFFF'] } },
    { name: 'Tron', gx: 16, gy: 8, pulse: true, palette: { final: ['00F0FF', 'B8FBFF', 'FFFFFF'], grid: ['005F73', '00F0FF'], text: ['001219', '0A9396', '94D2BD'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const W = s.cols, H = s.rows;
    const gcol = gradient(P.grid);
    const tcols = gradSteps(P.text, 6);
    const gx = p.gx || 10, gy = p.gy || 5;
    const order = r.shuffle([...s.chars]);
    s.hideAll();
    const BUILD = 80, FILL = 260, FADE = 60;
    let t = 0, shown = 0;
    const horizon = Math.round(H * 0.58);
    const sun = p.outrun ? gradient(P.sun) : null;

    const drawFlat = (prog, alpha) => {
      // Horizontal lines grow left->right, vertical lines grow top->bottom.
      const hx = prog * W, vy = prog * H;
      for (let y = 0; y < H; y += gy)
        for (let x = 0; x < hx; x++) {
          const onV = x % gx === 0;
          const pulse = p.pulse ? 0.55 + 0.45 * Math.sin(x * 0.15 - t * 0.12) : 1;
          s.putUnder(x, y, onV && y < vy ? '┼' : '─', gcol((x / W + y / H) / 2), alpha * pulse * (x > hx - 3 ? 1 : 0.65));
        }
      for (let x = 0; x < W; x += gx)
        for (let y = 0; y < vy; y++) {
          if (y % gy === 0) continue;
          const pulse = p.pulse ? 0.55 + 0.45 * Math.sin(y * 0.3 - t * 0.12) : 1;
          s.putUnder(x, y, '│', gcol((x / W + y / H) / 2), alpha * pulse * (y > vy - 2 ? 1 : 0.65));
        }
    };

    const drawOutrun = (prog, alpha) => {
      // Sun rising behind the text.
      const R = Math.min(H * 0.32, W * 0.18) * ease.outCubic(prog);
      const scx = W / 2, scy = horizon;
      for (let y = Math.floor(scy - R / 2); y < scy; y++) {
        const v = (y - (scy - R / 2)) / (R / 2);
        if (v > 0.45 && Math.floor(y) % 2 === 0) continue; // stripes
        const half = Math.sqrt(Math.max(0, 1 - ((scy - y) / (R / 2)) ** 2)) * R;
        for (let x = Math.floor(scx - half); x <= scx + half; x++) s.putUnder(x, y, '█', sun(clamp(v)), alpha * 0.55);
      }
      // Perspective floor.
      const depth = H - horizon;
      for (let i = -14; i <= 14; i++) {
        const bx = W / 2 + i * W * 0.09;
        for (let y = horizon; y < H; y++) {
          const f = (y - horizon) / depth;
          if (f > prog * 1.2) break;
          const x = W / 2 + (bx - W / 2) * f;
          const slope = (bx - W / 2) / depth;
          s.putUnder(x, y, Math.abs(slope) < 0.5 ? '│' : slope > 0 ? '╲' : '╱', gcol(f), alpha * (0.3 + 0.7 * f));
        }
      }
      for (let k = 0; k < 9; k++) {
        const f = ((k + (t * 0.03) % 1) / 9) ** 2;
        const y = Math.round(horizon + f * depth);
        if (f > prog) continue;
        for (let x = 0; x < W; x++) s.putUnder(x, y, '─', gcol(f), alpha * (0.25 + 0.75 * f));
      }
      for (let x = 0; x < W * prog; x++) s.putUnder(x, horizon, '━', gcol(0), alpha);
    };

    return {
      tick() {
        t++;
        const prog = ease.outQuad(clamp(t / BUILD));
        const alpha = t < BUILD + FILL ? 1 : 1 - clamp((t - BUILD - FILL) / FADE);
        if (alpha > 0) (p.outrun ? drawOutrun : drawFlat)(prog, alpha);
        if (t > BUILD * 0.6) {
          const target = Math.ceil(order.length * clamp((t - BUILD * 0.6) / (FILL * 0.75)));
          while (shown < target) {
            const c = order[shown++];
            c.vis = true;
            const frames = [];
            const n = r.int(6, 16);
            for (let i = 0; i < n; i++) frames.push({ sym: '░▒▓█▓▒'[i % 6], col: tcols[Math.floor((i / n) * 6)], n: r.int(2, 4) });
            frames.push({ sym: c.ch, col: WHITE, n: 3 });
            for (let i = 1; i <= 5; i++) frames.push({ col: mix(WHITE, c.fc, i / 5), n: 3 });
            playSeq(c, frames);
          }
        }
        for (const c of s.chars) stepSeq(c);
        return alpha <= 0 && shown === order.length && s.chars.every((c) => !c.q);
      },
    };
  },
};
