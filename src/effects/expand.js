import { gradSteps, mix, WHITE, ease, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// Every character bursts outward from a single point of light and
// glides into formation.
export default {
  id: 'expand',
  name: 'Expand',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], glow: ['FFFFFF', 'FFF5B7', '00D1FF'] },
  grad: 'radial',
  variants: [
    { name: 'Big Bang', e: 'inOutQuart', n: 190 },
    { name: 'Left Bloom', origin: 'left', e: 'outExpo', n: 180, grad: 'horizontal', palette: { final: ['F9D423', 'FF4E50', 'C2185B'], glow: ['FFFFFF', 'FFE29F', 'FF4E50'] } },
    { name: 'Elastic', e: 'outElastic', n: 200, palette: { final: ['43E97B', '38F9D7', '0BA360'], glow: ['FFFFFF', 'C1FFD7', '38F9D7'] } },
    { name: 'Shockwave', stagger: true, e: 'outBack', n: 110, palette: { final: ['FF61D8', 'A06CD5', '6247AA'], glow: ['FFFFFF', 'FFC6FF', 'A06CD5'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const glow = gradSteps(P.glow, 6);
    const ox = p.origin === 'left' ? b.x0 - 4 : b.cx;
    const oy = b.cy;
    const e = ease[p.e];
    const maxD = Math.max(...s.chars.map((c) => Math.hypot(c.hx - ox, (c.hy - oy) * 2))) || 1;
    for (const c of s.chars) {
      c.x = ox;
      c.y = oy;
      c.vis = false;
      c.d.wait = p.stagger ? Math.floor((Math.hypot(c.hx - ox, (c.hy - oy) * 2) / maxD) * 150) : r.int(0, 25);
    }
    let t = 0;
    const lead = 60;

    return {
      tick() {
        t++;
        let busy = false;
        // Pulsing core of light before release.
        if (t < lead + 20) {
          const k = Math.min(1, t / lead);
          const rad = 1 + k * 2 + Math.sin(t * 0.4) * 0.5;
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2 + t * 0.1;
            s.put(ox + Math.cos(a) * rad * 2, oy + Math.sin(a) * rad, i % 2 ? '·' : '*', glow[i % 3], k * (t < lead ? 1 : 1 - (t - lead) / 20));
          }
          s.put(ox, oy, '█', WHITE, k);
        }
        for (const c of s.chars) {
          const go = lead + c.d.wait;
          if (t < go) { busy = true; continue; }
          if (t === go) {
            c.vis = true;
            moveTo(c, c.hx, c.hy, p.n + r.int(-10, 10), e);
            const fr = glow.map((col) => ({ col, n: Math.round(p.n / 12) }));
            fr.push(...[0.2, 0.4, 0.6, 0.8, 1].map((k) => ({ col: mix(glow[5], c.fc, k), n: Math.round(p.n / 12) })));
            playSeq(c, fr);
          }
          if (!stepMove(c)) busy = true;
          if (!stepSeq(c)) busy = true;
        }
        return !busy;
      },
    };
  },
};
