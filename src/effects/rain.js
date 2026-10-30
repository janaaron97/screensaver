import { ease, gradSteps, mix, WHITE, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// Characters fall from the sky in random order and splash into place.
export default {
  id: 'rain',
  name: 'Rain',
  palette: { final: ['488BFF', 'B2E7DE', '57EAF7'], rain: ['00315C', '004999', '176FFF', '72A1FF', 'BDD7FF'] },
  grad: 'diagonal',
  variants: [
    { name: 'Drizzle', palette: { final: ['488BFF', 'B2E7DE', '57EAF7'], rain: ['00315C', '004999', '176FFF', '72A1FF', 'BDD7FF'] } },
    { name: 'Downpour', heavy: true, rate: 1.8, palette: { final: ['E0E1DD', '778DA9', '415A77'], rain: ['1B263B', '415A77', '778DA9', 'E0E1DD'] }, grad: 'vertical' },
    { name: 'Snowfall', snow: true, palette: { final: ['FFFFFF', 'D6EAF8', 'A9CCE3'], rain: ['FFFFFF', 'E8F6FF', 'B3D9FF'] }, grad: 'vertical' },
    { name: 'Acid Rain', splash: true, rate: 1.3, palette: { final: ['CCFF33', '70E000', '008000'], rain: ['38B000', '70E000', 'CCFF33', 'F0FFB8'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const rc = gradSteps(P.rain, 8);
    const syms = p.snow ? ['*', '·', '❄', '•'] : ['o', '.', ',', '*', '|', '¦'];
    const order = r.shuffle([...s.chars]);
    s.hideAll();
    const rate = (order.length / (p.snow ? 330 : 260)) * (p.rate || 1);
    let acc = 0, next = 0;
    const live = new Set();
    const splashes = [];
    const ambient = [];
    return {
      tick() {
        acc += rate;
        while (acc >= 1 && next < order.length) {
          acc--;
          const c = order[next++];
          c.vis = true;
          c.x = c.hx;
          c.y = -r.int(1, 6);
          c.sym = r.pick(syms);
          c.col = r.pick(rc);
          c.d.ph = r.range(0, 6.28);
          const d = c.hy - c.y;
          moveTo(c, c.hx, c.hy, d * (p.snow ? 3.2 : 1.1) * r.range(0.8, 1.3) + 10, p.snow ? ease.linear : ease.inQuad);
          live.add(c);
        }
        if (p.heavy && next < order.length) for (let i = 0; i < 4; i++) ambient.push({ x: r.int(0, s.cols - 1), y: -1, v: r.range(0.6, 1.2), col: r.pick(rc) });
        for (let i = ambient.length - 1; i >= 0; i--) {
          const a = ambient[i];
          a.y += a.v;
          s.putUnder(a.x, a.y, '|', a.col, 0.35);
          s.putUnder(a.x, a.y - 1, '¦', a.col, 0.15);
          if (a.y > s.rows) ambient.splice(i, 1);
        }
        for (const c of live) {
          const arrived = stepMove(c);
          if (p.snow && !arrived) c.x = c.hx + Math.sin(c.d.ph + c.y * 0.4) * Math.min(1.5, (c.hy - c.y) * 0.3);
          else if (!arrived) s.put(c.x, c.y - 1, '·', c.col, 0.35);
          if (arrived) {
            live.delete(c);
            c.x = c.hx;
            if (p.splash) splashes.push({ x: c.hx, y: c.hy, t: 0, col: c.col });
            playSeq(c, [{ sym: c.ch, col: WHITE, n: 3 }, ...[0.25, 0.5, 0.75, 1].map((q) => ({ col: mix(WHITE, c.fc, q), n: 3 }))]);
          }
        }
        for (let i = splashes.length - 1; i >= 0; i--) {
          const sp = splashes[i];
          sp.t++;
          const k = sp.t / 10;
          s.put(sp.x - 1 - k, sp.y - k, '`', sp.col, 1 - k);
          s.put(sp.x + 1 + k, sp.y - k, '´', sp.col, 1 - k);
          if (sp.t >= 10) splashes.splice(i, 1);
        }
        let done = next >= order.length && live.size === 0 && splashes.length === 0;
        for (const c of s.chars) if (!stepSeq(c)) done = false;
        return done;
      },
    };
  },
};
