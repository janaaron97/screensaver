import { gradSteps, mix, scale, clamp, ease, hex, WHITE, TAU } from '../core.js';

// Spotlights search the darkened text, then converge on the center and
// bloom outward until the whole message is lit.
export default {
  id: 'spotlights',
  name: 'Spotlights',
  palette: { final: ['AB48FF', 'E7B2B2', 'FFFFFF'], beam: ['FFF4D6', 'FFD27F'] },
  grad: 'diagonal',
  variants: [
    { name: 'Classic', lights: 3 },
    { name: 'Searchlights', lights: 5, radius: 0.7, fast: true, palette: { final: ['4CC9F0', '4361EE', 'F72585'], beam: ['E0F7FF', '90E0EF'] } },
    { name: 'Lighthouse', lights: 1, orbit: true, radius: 1.5, palette: { final: ['FFB703', 'FB8500', 'FFE8A3'], beam: ['FFF8E1', 'FFD166'] } },
    { name: 'Disco', lights: 4, tinted: true, fast: true, palette: { final: ['FF0A54', 'FF85A1', 'FFF0F3'], beam: ['FF006E', '3A86FF', '8338EC', 'FFBE0B'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const beam = gradSteps(P.beam, Math.max(2, P.beam.length));
    const baseR = Math.max(6, Math.min(b.w * 0.18, 22)) * (p.radius || 1);
    const maxR = Math.hypot(b.w, b.h * 2) * 0.6 + 4;
    const n = p.lights || 3;
    const searchT = p.fast ? 260 : 340;
    const lights = Array.from({ length: n }, (_, i) => ({
      x: r.range(b.x0, b.x1), y: r.range(b.y0, b.y1), tx: 0, ty: 0, sx: 0, sy: 0, k: 1, dur: 1,
      rad: baseR * r.range(0.8, 1.2), tint: p.tinted ? beam[i % beam.length] : beam[0], phase: (i / n) * TAU,
    }));
    const retarget = (L) => {
      L.sx = L.x; L.sy = L.y;
      L.tx = r.range(b.x0 - 4, b.x1 + 4); L.ty = r.range(b.y0 - 2, b.y1 + 2);
      L.k = 0; L.dur = r.int(p.fast ? 40 : 60, p.fast ? 80 : 120);
    };
    lights.forEach(retarget);
    for (const c of s.chars) c.col = scale(c.fc, 0.06);
    let t = 0;
    let phase = 'search';
    let pt = 0;
    const cx = b.cx, cy = b.cy;

    return {
      tick() {
        t++; pt++;
        if (phase === 'search') {
          for (const L of lights) {
            if (p.orbit) {
              const a = t * 0.025 + L.phase;
              L.x = cx + Math.cos(a) * b.w * 0.42;
              L.y = cy + Math.sin(a * 1.3) * b.h * 0.45;
            } else {
              L.k++;
              const e = ease.inOutSine(clamp(L.k / L.dur));
              L.x = L.sx + (L.tx - L.sx) * e; L.y = L.sy + (L.ty - L.sy) * e;
              if (L.k >= L.dur) retarget(L);
            }
          }
          if (pt >= searchT) { phase = 'converge'; pt = 0; for (const L of lights) { L.sx = L.x; L.sy = L.y; } }
        } else if (phase === 'converge') {
          const e = ease.inOutCubic(clamp(pt / 60));
          for (const L of lights) { L.x = L.sx + (cx - L.sx) * e; L.y = L.sy + (cy - L.sy) * e; }
          if (pt >= 60) { phase = 'expand'; pt = 0; for (const L of lights) L.r0 = L.rad; }
        } else if (phase === 'expand') {
          const e = ease.inQuad(clamp(pt / 90));
          for (const L of lights) L.rad = L.r0 + (maxR - L.r0) * e;
          if (pt >= 110) { for (const c of s.chars) c.finish(); return true; }
        }
        // Light the characters.
        const expanding = phase === 'expand';
        for (const c of s.chars) {
          let best = 0, tint = null;
          for (const L of lights) {
            const d = Math.hypot(c.hx - L.x, (c.hy - L.y) * 2) / L.rad;
            const v = clamp(1 - d * d);
            if (v > best) { best = v; tint = L.tint; }
          }
          const base = expanding ? mix(scale(c.fc, 0.06), c.fc, clamp(pt / 100)) : scale(c.fc, 0.06);
          let col = mix(base, c.fc, best);
          if (best > 0.6 && !expanding) col = mix(col, p.tinted ? tint : WHITE, (best - 0.6) * (p.tinted ? 1.4 : 1.2));
          if (expanding && best > 0.95) col = mix(col, c.fc, clamp(pt / 100));
          c.col = col;
        }
        // Soft halo on the empty floor beneath each light.
        if (phase !== 'expand' || pt < 60) {
          const fade = phase === 'expand' ? 1 - pt / 60 : 1;
          for (const L of lights) {
            const R = L.rad, ry = R / 2;
            for (let y = Math.floor(L.y - ry); y <= L.y + ry; y++)
              for (let x = Math.floor(L.x - R); x <= L.x + R; x++) {
                if (!s.inBounds(x, y)) continue;
                const d = Math.hypot(x - L.x, (y - L.y) * 2) / R;
                if (d > 1) continue;
                s.putUnder(x, y, d < 0.35 ? '▓' : d < 0.7 ? '▒' : '░', L.tint, 0.12 * (1 - d) * fade);
              }
          }
        }
        return false;
      },
    };
  },
};
