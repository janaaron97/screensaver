import { gradSteps, mix, ease, moveTo, stepMove, clamp, WHITE, TAU } from '../core.js';

// Characters spawn jumbled and grow unstable, explode to the edges of the
// canvas, then reassemble in the correct layout.
export default {
  id: 'unstable',
  name: 'Unstable',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], unstable: ['FF9200', 'FF2E00'] },
  grad: 'diagonal',
  variants: [
    { name: 'Classic' },
    { name: 'Meltdown', shake: 1.6, unstableT: 200, palette: { final: ['70E000', '38B000', 'CCFF33'], unstable: ['CCFF33', '007200'] } },
    { name: 'Implosion', implode: true, palette: { final: ['F15BB5', '9B5DE5', '00BBF9'], unstable: ['FEE440', 'F15BB5'] }, grad: 'radial' },
    { name: 'Shatter', shards: true, palette: { final: ['CAF0F8', '90E0EF', 'FFFFFF'], unstable: ['FFFFFF', '48CAE4'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const unst = gradSteps(P.unstable, 8);
    const homes = r.shuffle(s.chars.map((c) => [c.hx, c.hy]));
    s.chars.forEach((c, i) => { c.x = homes[i][0]; c.y = homes[i][1]; c.d.bx = c.x; c.d.by = c.y; c.col = mix(c.fc, unst[0], 0.3); });
    const UT = p.unstableT || 140;
    const shake = p.shake || 1;
    let t = 0, phase = 'shake', pt = 0;

    return {
      tick() {
        t++; pt++;
        if (phase === 'shake') {
          const k = clamp(pt / UT);
          for (const c of s.chars) {
            const amp = k * k * 0.9 * shake;
            c.x = c.d.bx + r.gauss() * amp;
            c.y = c.d.by + r.gauss() * amp * 0.5;
            c.col = mix(mix(c.fc, unst[0], 0.3), unst[Math.min(7, Math.floor(k * 8 + r.range(-1, 1)))] || unst[0], k);
            if (p.shards && k > 0.6 && r.chance(0.05)) c.sym = r.pick('◢◣◤◥▲▼');
          }
          if (pt >= UT) {
            phase = 'explode'; pt = 0;
            for (const c of s.chars) {
              let tx, ty;
              if (p.implode) { tx = b.cx + r.gauss() * 2; ty = b.cy + r.gauss(); }
              else {
                const a = Math.atan2((c.y - b.cy) * 2, c.x - b.cx) + r.gauss() * 0.3;
                const R = Math.max(s.cols, s.rows * 2);
                tx = clamp(b.cx + Math.cos(a) * R, 0, s.cols - 1);
                ty = clamp(b.cy + Math.sin(a) * R / 2, 0, s.rows - 1);
                if (shake > 1 && r.chance(0.5)) { tx = r.range(0, s.cols - 1); ty = r.range(0, s.rows - 1); }
              }
              moveTo(c, tx, ty, r.int(20, 40), p.implode ? ease.inExpo : ease.outExpo);
              c.col = WHITE;
              if (p.shards) c.sym = r.pick('◢◣◤◥/\\╱╲');
            }
          }
        } else if (phase === 'explode') {
          let all = true;
          for (const c of s.chars) {
            if (!stepMove(c)) all = false;
            c.col = mix(WHITE, unst[7], clamp(pt / 30));
          }
          if (p.implode && pt < 50) for (let i = 0; i < 12; i++) {
            const a = r.range(0, TAU), d = r.range(0, 6) * clamp(pt / 30);
            s.put(b.cx + Math.cos(a) * d * 2, b.cy + Math.sin(a) * d, r.pick('*·+'), r.pick(unst), 0.8);
          }
          if (all && pt > (p.implode ? 50 : 35)) {
            phase = 'reform'; pt = 0;
            for (const c of s.chars) {
              if (p.implode) { const a = r.range(0, TAU); c.x += Math.cos(a) * 0.01; }
              moveTo(c, c.hx, c.hy, r.int(55, 90), p.implode ? ease.outBack : ease.inOutExpo);
              c.d.from = c.col;
            }
          }
        } else {
          let all = true;
          for (const c of s.chars) {
            const arrived = stepMove(c);
            if (!arrived) all = false;
            c.col = mix(c.d.from, c.fc, clamp(pt / 80));
            if (arrived) c.sym = c.ch;
          }
          if (all && pt >= 80) { for (const c of s.chars) c.finish(); return true; }
        }
        return false;
      },
    };
  },
};
