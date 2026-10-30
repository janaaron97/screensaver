import { gradSteps, mix, WHITE, ease, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// Characters rain down as glowing balls that bounce into place and
// then open up into the text.
export default {
  id: 'bouncyballs',
  name: 'Bouncy Balls',
  palette: { final: ['F8FFAE', '43C6AC'], balls: ['D1F4FA', 'E3A6F5', 'B2FFA1', 'FFB5A7', 'A9DEF9'] },
  grad: 'diagonal',
  variants: [
    { name: 'Playground' },
    { name: 'Rubber', e: 'outElastic', sym: '●', palette: { final: ['FF61D2', 'FE9090'], balls: ['FF61D2', 'FFC3A0', 'FFAFCC', 'CDB4DB'] } },
    { name: 'Hailstorm', order: 'random', fast: true, sym: '•', palette: { final: ['E0FBFC', '9BB1FF', '788BFF'], balls: ['FFFFFF', 'E2EAFC', 'B6CCFE', 'ABC4FF'] } },
    { name: 'Lava Drops', order: 'top', sym: 'O', palette: { final: ['F9D423', 'FF4E50'], balls: ['FFF3B0', 'FFB703', 'FB8500', 'E63946'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const ballCols = P.balls.map((h) => gradSteps([h], 1)[0]);
    const e = ease[p.e || 'outBounce'];
    const syms = p.sym ? [p.sym] : ['o', 'O', '●', '◉', '*'];
    let groups;
    if (p.order === 'random') groups = r.shuffle([...s.chars]).map((c) => [c]);
    else {
      groups = s.rowsOf();
      if (p.order !== 'top') groups.reverse();
    }
    const total = s.chars.length;
    const window = p.fast ? 140 : 210;
    s.hideAll();
    let launched = 0, gi = 0, t = 0;

    const drop = (c) => {
      c.vis = true;
      c.x = c.hx + r.range(-1, 1);
      c.y = -r.int(1, 12);
      c.sym = r.pick(syms);
      const col = r.pick(ballCols);
      c.col = col;
      const n = r.int(60, 100) * (p.fast ? 0.75 : 1);
      moveTo(c, c.hx, c.hy, n, e);
      c.d.land = [
        { col: mix(col, WHITE, 0.5), n: 3 },
        { sym: c.ch, col: WHITE, n: 3 },
        ...[0.2, 0.4, 0.6, 0.8, 1].map((k) => ({ col: mix(WHITE, c.fc, k), n: 3 })),
      ];
    };

    return {
      tick() {
        t++;
        const target = Math.min(total, Math.ceil((t / window) * total));
        while (launched < target && gi < groups.length) {
          const g = groups[gi];
          if (g.d === undefined) g.d = 0;
          drop(g[g.d++]);
          launched++;
          if (g.d >= g.length) gi++;
        }
        let busy = launched < total;
        for (const c of s.chars) {
          if (!c.vis) continue;
          if (c.m) {
            stepMove(c);
            if (!c.m) playSeq(c, c.d.land);
            busy = true;
          } else if (!stepSeq(c)) busy = true;
        }
        return !busy;
      },
    };
  },
};
