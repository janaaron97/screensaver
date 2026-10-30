import { gradSteps, mix, WHITE, playSeq, stepSeq } from '../core.js';

// Each character travels in as a stream of its own binary code along a
// right-angled circuit path, then crystallises into place.
export default {
  id: 'binarypath',
  name: 'Binary Path',
  palette: { final: ['00D500', 'F8FF9B'], bits: ['044E29', '157E38', '45BF55', '95ED87'] },
  grad: 'radial',
  variants: [
    { name: 'Classic' },
    { name: 'Hex Circuit', base: 16, palette: { final: ['00F0FF', 'B388FF'], bits: ['0B1A3A', '1F4E9C', '3A9BDC', 'A0E9FF'] } },
    { name: 'Overclock', speed: 1.8, window: 150, palette: { final: ['FF2E63', 'FFD166'], bits: ['3B0A1E', '8C1C3E', 'FF5E7E', 'FFE3A3'] } },
    { name: 'Long Haul', speed: 0.8, turns: 6, trail: 14, palette: { final: ['F9C80E', 'F86624', 'EA3546'], bits: ['2A1B05', '7A4A0C', 'E39A16', 'FFE7A0'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const speed = p.speed || 1;
    const bitCols = gradSteps(P.bits, 8);
    const trailLen = p.trail || 9;
    const order = r.shuffle([...s.chars]);
    s.hideAll();
    const runners = [];
    let next = 0;
    let t = 0;
    const rate = s.chars.length / (p.window || 170);
    let acc = 0;

    const launch = (c) => {
      const code = c.ch.codePointAt(0).toString(p.base || 2);
      const bits = [...code.padStart(p.base === 16 ? 4 : 8, '0')];
      const [sx, sy] = s.offscreenPoint();
      const pts = [[Math.round(sx), Math.round(sy)]];
      const turns = p.turns || 3;
      let x = pts[0][0], y = pts[0][1];
      for (let i = 1; i < turns; i++) {
        const k = i / turns;
        if (i % 2) x = Math.round(x + (c.hx - x) * r.range(k, 1));
        else y = Math.round(y + (c.hy - y) * r.range(k, 1));
        pts.push([x, y]);
      }
      pts.push([c.hx, y], [c.hx, c.hy]);
      // Expand to unit steps.
      const cells = [];
      for (let i = 1; i < pts.length; i++) {
        let [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        while (ax !== bx || ay !== by) {
          if (ax !== bx) ax += Math.sign(bx - ax);
          else ay += Math.sign(by - ay);
          cells.push([ax, ay]);
        }
      }
      runners.push({ c, cells, pos: 0, bits, v: r.range(0.8, 1.6) * speed });
    };

    return {
      tick() {
        t++;
        acc += rate;
        for (; acc >= 1 && next < order.length; acc--) launch(order[next++]);
        // Shorten trails when many runners are in flight to bound per-tick cost.
        const tl = Math.max(3, Math.min(trailLen, Math.floor(6000 / Math.max(1, runners.length))));
        for (let i = runners.length - 1; i >= 0; i--) {
          const R = runners[i];
          R.pos += R.v;
          const head = Math.min(Math.floor(R.pos), R.cells.length - 1);
          for (let j = 0; j < tl; j++) {
            const k = head - j;
            if (k < 0) break;
            const [x, y] = R.cells[k];
            const col = j === 0 ? WHITE : bitCols[Math.max(0, 7 - Math.floor((j / tl) * 8))];
            s.put(x, y, R.bits[(k + R.bits.length) % R.bits.length], col, 1 - j / tl);
          }
          if (R.pos >= R.cells.length - 1) {
            const c = R.c;
            c.vis = true;
            playSeq(c, [
              { sym: c.ch, col: WHITE, n: 4 },
              ...[0.15, 0.3, 0.5, 0.7, 0.85, 1].map((k) => ({ col: mix(WHITE, c.fc, k), n: 3 })),
            ]);
            runners.splice(i, 1);
          }
        }
        for (const c of s.chars) stepSeq(c);
        return next >= order.length && !runners.length && s.chars.every((c) => c.vis && !c.q);
      },
    };
  },
};
