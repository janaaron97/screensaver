import { gradSteps, mix, ease, moveTo, stepMove, WHITE, GLYPHS } from '../core.js';

// Characters are sprayed from a single nozzle and arc into place.
export default {
  id: 'spray',
  name: 'Spray',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], spray: ['FFFFFF', 'FF6EC7', '8A008A'] },
  grad: 'horizontal',
  variants: [
    { name: 'Garden Hose', from: 'east' },
    { name: 'Fountain', from: 'south', arc: 1.4, palette: { final: ['48CAE4', '0077B6', 'CAF0F8'], spray: ['FFFFFF', '90E0EF', '0096C7'] } },
    { name: 'Graffiti', from: 'west', fast: true, palette: { final: ['FF006E', 'FFBE0B', '3A86FF'], spray: ['FFFFFF', 'FFBE0B', 'FB5607'] } },
    { name: 'Supernova', from: 'center', palette: { final: ['FFD60A', 'FF5400', '9D0208'], spray: ['FFFFFF', 'FFEA00', 'FF7B00'] }, grad: 'radial' },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const spray = gradSteps(P.spray, 8);
    const src = {
      east: [s.cols - 1, b.cy], west: [0, b.cy], south: [b.cx, s.rows - 1], center: [b.cx, b.cy],
    }[p.from || 'east'];
    const order = r.shuffle([...s.chars]);
    s.hideAll();
    const flying = new Set();
    let launched = 0, t = 0;
    const per = order.length / (p.fast ? 140 : 210);

    return {
      tick() {
        t++;
        // Launch at a wavering rate, like a nozzle pulsing.
        const n = Math.max(0, Math.round(per * (1 + Math.sin(t * 0.15) * 0.8) * r.range(0.4, 1.6)));
        for (let i = 0; i < n && launched < order.length; i++) {
          const c = order[launched++];
          c.vis = true;
          c.x = src[0]; c.y = src[1];
          const dur = r.int(p.fast ? 25 : 40, p.fast ? 55 : 85);
          let cx, cy;
          if (p.arc) { cx = (src[0] + c.hx) / 2 + r.gauss() * 6; cy = Math.min(src[1], c.hy) - b.h * p.arc - r.range(0, 6); }
          else if (p.from === 'center') { const a = r.range(0, 6.283); cx = c.hx + Math.cos(a) * 12; cy = c.hy + Math.sin(a) * 6; }
          else { cx = (src[0] + c.hx) / 2 + r.gauss() * 4; cy = (src[1] + c.hy) / 2 + r.gauss() * 8; }
          moveTo(c, c.hx, c.hy, dur, p.from === 'center' ? ease.outCubic : ease.outExpo, cx, cy);
          c.d.dur = dur; c.d.k = 0;
          flying.add(c);
        }
        for (const c of flying) {
          c.d.k++;
          const k = c.d.k / c.d.dur;
          c.sym = k < 0.6 ? r.pick(GLYPHS.sparks) : c.ch;
          c.col = k < 0.7 ? spray[Math.min(7, Math.floor(k / 0.7 * 8))] : mix(spray[7], c.fc, (k - 0.7) / 0.3);
          if (stepMove(c)) {
            c.d.land = (c.d.land || 0) + 1;
            c.sym = c.ch;
            c.col = mix(WHITE, c.fc, Math.min(1, c.d.land / 10));
            if (c.d.land >= 10) { c.finish(); flying.delete(c); }
          }
        }
        // Nozzle glow + mist.
        if (launched < order.length) {
          s.put(Math.round(src[0]), Math.round(src[1]), '✸', WHITE, 1);
          for (let i = 0; i < 6; i++) s.put(src[0] + r.gauss() * 3, src[1] + r.gauss() * 1.5, r.pick('·•*'), r.pick(spray), r.range(0.3, 0.8));
        }
        return launched >= order.length && flying.size === 0;
      },
    };
  },
};
