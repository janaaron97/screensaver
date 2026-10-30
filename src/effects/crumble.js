import { gradSteps, hex, mix, WHITE, ease, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// The text decays and crumbles into dust piles, is vacuumed up,
// then rebuilt — stronger and brighter than before.
export default {
  id: 'crumble',
  name: 'Crumble',
  palette: { final: ['5CE1E6', '5271FF', 'FF66C4'], dust: ['C2A68C'], strong: ['FFFFFF', 'FFE6A7'] },
  grad: 'diagonal',
  variants: [
    { name: 'Erosion' },
    { name: 'Sandstone', palette: { final: ['E9C46A', 'F4A261', 'E76F51'], dust: ['B08968'], strong: ['FFFFFF', 'FFE8D6'] } },
    { name: 'Snowmelt', fast: true, palette: { final: ['FFFFFF', 'BDE0FE', 'A2D2FF'], dust: ['8EA9C1'], strong: ['FFFFFF', 'E0F7FF'] } },
    { name: 'Ashes to Gold', slow: true, palette: { final: ['FFD700', 'FFB000', 'FF8C00'], dust: ['5A5A5A'], strong: ['FFFFFF', 'FFF3B0'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const dust = hex(P.dust[0]);
    const strong = gradSteps(P.strong, 2);
    const k = p.fast ? 0.7 : p.slow ? 1.3 : 1;
    const order = r.shuffle([...s.chars]);
    const stack = new Array(s.cols + 4).fill(0);
    let phase = 'show', t = 0, pt = 0, fell = 0;
    for (const c of s.chars) {
      c.col = c.fc;
      c.a = 0;
    }
    const rate = order.length / (150 * k);
    let acc = 0;

    return {
      tick() {
        t++;
        pt++;
        let busy = false;
        if (phase === 'show') {
          for (const c of s.chars) c.a = Math.min(1, pt / 30);
          if (pt > 50) { phase = 'fall'; pt = 0; }
          return false;
        }
        if (phase === 'fall') {
          acc += rate;
          for (; acc >= 1 && fell < order.length; acc--) {
            const c = order[fell++];
            c.d.state = 'weak';
            const fr = [];
            for (let i = 1; i <= 8; i++) fr.push({ col: mix(c.fc, dust, i / 8), n: 2, sym: i % 3 === 0 ? '▒' : c.ch });
            playSeq(c, fr);
          }
          for (const c of s.chars) {
            if (c.d.state === 'weak') {
              busy = true;
              if (stepSeq(c)) {
                c.d.state = 'falling';
                const x = Math.max(0, Math.min(s.cols - 1, c.hx));
                const y = s.rows - 1 - stack[x]++;
                moveTo(c, x, Math.max(c.hy, y), r.int(30, 50) * k, ease.inQuad);
              }
            } else if (c.d.state === 'falling') {
              busy = true;
              if (stepMove(c)) {
                c.d.state = 'pile';
                c.sym = r.pick(['.', ',', ':', '·', '░']);
                for (let i = 0; i < 2; i++) s.put(c.x + r.range(-1, 1), c.y - r.range(0, 1), '·', dust, 0.6);
              }
            }
          }
          if (fell >= order.length && !busy) { phase = 'vacuum'; pt = 0; }
          return false;
        }
        if (phase === 'vacuum') {
          if (pt === 30)
            for (const c of s.chars) {
              c.sym = r.pick(['░', '▒', '·']);
              moveTo(c, c.x + r.range(-3, 3), -2, r.int(40, 70) * k, ease.inExpo);
            }
          if (pt > 30) {
            for (const c of s.chars) {
              if (!stepMove(c)) busy = true;
              if (c.m && c.m.t > c.m.n * 0.6) s.put(c.x, c.y + 1, '│', dust, 0.3);
            }
            if (!busy) { phase = 'reform'; pt = 0; }
          }
          return false;
        }
        // reform
        if (pt === 1)
          r.shuffle([...s.chars]).forEach((c, i) => {
            c.d.go = Math.floor((i / s.chars.length) * 90 * k);
          });
        for (const c of s.chars) {
          if (pt === c.d.go + 1) {
            c.x = c.hx + r.range(-2, 2);
            c.y = -1;
            moveTo(c, c.hx, c.hy, r.int(40, 60) * k, ease.outCubic);
            playSeq(c, [
              { sym: c.ch, col: mix(dust, strong[0], 0.5), n: 10 },
              { col: strong[0], n: 15 },
              { col: strong[1], n: 8 },
              ...[0.2, 0.4, 0.6, 0.8, 1].map((q) => ({ col: mix(strong[1], c.fc, q), n: 4 })),
            ]);
          }
          if (pt <= c.d.go) { busy = true; continue; }
          if (!stepMove(c)) busy = true;
          if (!stepSeq(c)) busy = true;
        }
        return !busy;
      },
    };
  },
};
