import { hex, mix, WHITE, TAU, ease, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// Shells streak up from the ground and burst into showers of sparks,
// which drift down and settle into the text.
export default {
  id: 'fireworks',
  name: 'Fireworks',
  palette: { final: ['FFFFFF', 'FFD6A5'], shells: ['88F7E2', '44D492', 'F5EB67', 'FFA15C', 'FA233E'] },
  grad: 'vertical',
  variants: [
    { name: 'Fourth of July' },
    { name: 'Grand Finale', gap: 6, size: 30, palette: { final: ['FFD700', 'FF6F61', 'C71585'], shells: ['FFD700', 'FF6F61', 'FF1493', '00E5FF', 'ADFF2F'] } },
    { name: 'Willow', willow: true, size: 40, palette: { final: ['FFE8A3', 'F2B134', 'C47F00'], shells: ['FFF1B5', 'FFD36E', 'F2B134'] } },
    { name: 'Neon Night', size: 18, palette: { final: ['00F5FF', 'BD00FF'], shells: ['00F5FF', 'FF00E5', 'BD00FF', '39FF14'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const shellCols = P.shells.map(hex);
    const size = p.size || 22;
    const sorted = [...s.chars].sort((a, b) => a.hx - b.hx + r.range(-3, 3));
    const shells = [];
    for (let i = 0; i < sorted.length; i += size) shells.push({ chars: sorted.slice(i, i + size) });
    r.shuffle(shells);
    const gap = p.gap ? Math.max(2, Math.min(p.gap * 2, 220 / shells.length)) : Math.max(3, Math.min(30, 360 / shells.length));
    const sparks = [];
    s.hideAll();
    shells.forEach((sh, i) => {
      sh.start = Math.round(i * gap) + r.int(0, 6);
      const ax = sh.chars.reduce((a, c) => a + c.hx, 0) / sh.chars.length;
      sh.x = Math.max(4, Math.min(s.cols - 5, ax + r.range(-10, 10)));
      sh.apex = r.range(2, Math.max(4, s.bounds.y0 - 1));
      sh.col = r.pick(shellCols);
      sh.y = s.rows;
      sh.state = 'wait';
      sh.rise = r.int(35, 55);
      sh.t = 0;
    });
    let t = 0;

    return {
      tick() {
        t++;
        let busy = false;
        for (const sh of shells) {
          if (sh.state === 'wait') {
            busy = true;
            if (t >= sh.start) sh.state = 'rise';
          } else if (sh.state === 'rise') {
            busy = true;
            sh.t++;
            const k = ease.outQuad(sh.t / sh.rise);
            const y = s.rows + (sh.apex - s.rows) * k;
            s.put(sh.x, y, '▲', WHITE, 1);
            for (let j = 1; j < 6; j++) s.put(sh.x + r.range(-0.4, 0.4), y + j * 0.8, j < 2 ? '|' : '·', mix(sh.col, WHITE, 0.4), 1 - j / 6);
            if (sh.t >= sh.rise) {
              sh.state = 'burst';
              sh.t = 0;
              const rad = Math.max(6, Math.sqrt(sh.chars.length) * 3.2);
              for (let j = 0; j < 40; j++) {
                const a = r.range(0, TAU), v = r.range(0.3, 1.2);
                sparks.push({ x: sh.x, y: sh.apex, vx: Math.cos(a) * v * 1.6, vy: Math.sin(a) * v * 0.8, life: r.int(25, 50), max: 50, col: sh.col });
              }
              for (const c of sh.chars) {
                c.vis = true;
                c.x = sh.x;
                c.y = sh.apex;
                c.sym = r.pick(['*', '+', '✦', '•', 'o']);
                const a = r.range(0, TAU), d = rad * Math.sqrt(r.range(0.2, 1));
                const bx = sh.x + Math.cos(a) * d, by = sh.apex + (Math.sin(a) * d) / 2;
                moveTo(c, bx, by, r.int(18, 28), ease.outExpo);
                c.d.fall = r.int(p.willow ? 110 : 70, p.willow ? 150 : 100);
                playSeq(c, [{ col: WHITE, n: 4 }, { col: mix(WHITE, sh.col, 0.5), n: 5 }, { col: sh.col, n: 400 }]);
              }
            }
          } else if (sh.state === 'burst') {
            busy = true;
            sh.t++;
            for (const c of sh.chars) {
              if (c.d.falling) {
                stepMove(c);
                stepSeq(c);
                if (r.chance(p.willow ? 0.35 : 0.12)) s.put(c.x + r.range(-0.3, 0.3), c.y - 0.6, '·', sh.col, 0.5);
              } else if (stepMove(c)) {
                c.d.falling = true;
                const ctrlX = c.x + (c.x - sh.x) * 0.6;
                const ctrlY = Math.max(c.y, c.hy) + (p.willow ? 10 : 5);
                moveTo(c, c.hx, c.hy, c.d.fall, ease.inOutSine, ctrlX, ctrlY);
                const fr = [];
                for (let k = 0; k < 8; k++) fr.push({ col: mix(sh.col, c.fc, k / 8), n: Math.round(c.d.fall / 10) });
                fr.push({ sym: c.ch, col: WHITE, n: 4 });
                fr.push(...[0.25, 0.5, 0.75, 1].map((k) => ({ col: mix(WHITE, c.fc, k), n: 4 })));
                playSeq(c, fr);
              }
            }
            if (sh.chars.every((c) => c.d.falling && !c.m && !c.q)) sh.state = 'done';
          }
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const sp = sparks[i];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.025;
          sp.vx *= 0.96;
          sp.life--;
          const k = sp.life / sp.max;
          s.put(sp.x, sp.y, k > 0.6 ? '*' : k > 0.3 ? '+' : '·', mix(sp.col, WHITE, k * 0.5), k);
          if (sp.life <= 0) sparks.splice(i, 1);
        }
        return !busy && !sparks.length && s.chars.every((c) => !c.q);
      },
    };
  },
};
