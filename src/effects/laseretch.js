import { gradSteps, mix, WHITE, playSeq, stepSeq } from '../core.js';

// A laser sweeps over the canvas burning each character into place,
// throwing off sparks as the etched glyphs cool to their final color.
export default {
  id: 'laseretch',
  name: 'Laser Etch',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], laser: ['6A0000', 'FF0000', 'FF8080', 'FFFFFF'], heat: ['FFFFFF', 'FFF200', 'FF8C00', 'FF2D00'] },
  grad: 'diagonal',
  variants: [
    { name: 'Engraver', order: 'snake' },
    { name: 'Plasma Cutter', order: 'cols', palette: { final: ['00F5FF', '0080FF', 'FFFFFF'], laser: ['001A4D', '0066FF', '80D4FF', 'FFFFFF'], heat: ['FFFFFF', 'BFF7FF', '00C8FF', '0047FF'] } },
    { name: 'Scatter Burn', order: 'random', emit: 'corner', palette: { final: ['F0F0F0', 'B8B8B8', '7A7A7A'], laser: ['002B0F', '00FF66', 'A6FFC9', 'FFFFFF'], heat: ['FFFFFF', 'D9FFE6', '00FF66', '00A040'] } },
    { name: 'Diamond Cut', order: 'diag', emit: 'low', palette: { final: ['FFB3F2', 'C780FA', '7B5CFA'], laser: ['3D0066', 'D100FF', 'F0A6FF', 'FFFFFF'], heat: ['FFFFFF', 'FFD1FF', 'E14CFF', '8A00D4'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const laser = gradSteps(P.laser, 8);
    const heat = gradSteps(P.heat, 6);
    let order;
    if (p.order === 'cols') order = s.colsOf().flatMap((g, i) => (i % 2 ? g.reverse() : g));
    else if (p.order === 'random') order = r.shuffle([...s.chars]);
    else if (p.order === 'diag') order = s.diagonalsOf().flat();
    else order = s.rowsOf().flatMap((g, i) => (i % 2 ? g.sort((a, c) => c.hx - a.hx) : g.sort((a, c) => a.hx - c.hx)));
    s.hideAll();
    const em = p.emit === 'corner' ? [s.cols - 2, 0] : p.emit === 'low' ? [b.cx, s.rows - 1] : [b.cx, 0];
    const rate = order.length / 260;
    let acc = 0, i = 0, t = 0;
    const sparks = [];
    let target = null;

    const beam = (tx, ty) => {
      const dx = tx - em[0], dy = ty - em[1];
      const n = Math.max(Math.abs(dx), Math.abs(dy));
      const sym = Math.abs(dx) < Math.abs(dy) * 0.5 ? '|' : Math.abs(dy) < Math.abs(dx) * 0.25 ? '─' : dx * dy > 0 ? '\\' : '/';
      for (let j = 0; j <= n; j++) {
        const k = j / n;
        const col = laser[Math.min(7, Math.floor(k * 8))];
        s.put(em[0] + dx * k, em[1] + dy * k, sym, col, 0.35 + 0.65 * k * (0.8 + 0.2 * r.float()));
      }
      s.put(tx, ty, '█', WHITE, 1);
    };

    return {
      tick() {
        t++;
        acc += rate;
        for (; acc >= 1 && i < order.length; acc--) {
          const c = order[i++];
          target = c;
          c.vis = true;
          const fr = [{ sym: '█', col: WHITE, n: 2 }, { sym: '▓', col: heat[1], n: 2 }];
          fr.push(...heat.map((col) => ({ sym: c.ch, col, n: 4 })));
          fr.push(...[0.2, 0.4, 0.6, 0.8, 1].map((k) => ({ col: mix(heat[5], c.fc, k), n: 4 })));
          playSeq(c, fr);
          if (r.chance(0.5)) sparks.push({ x: c.hx, y: c.hy, vx: r.range(-0.6, 0.6), vy: r.range(-0.5, 0.1), life: r.int(15, 35), max: 35 });
        }
        if (target && i <= order.length && (i < order.length || t % 2)) beam(target.hx, target.hy);
        if (i >= order.length && target && target.q === null) target = null;
        for (let k = sparks.length - 1; k >= 0; k--) {
          const sp = sparks[k];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.04;
          sp.life--;
          const q = sp.life / sp.max;
          s.put(sp.x, sp.y, q > 0.5 ? '*' : '·', heat[Math.min(5, Math.floor((1 - q) * 6))], q);
          if (sp.life <= 0 || sp.y > s.rows) sparks.splice(k, 1);
        }
        let busy = i < order.length || sparks.length > 0;
        for (const c of s.chars) if (!stepSeq(c)) busy = true;
        return !busy;
      },
    };
  },
};
