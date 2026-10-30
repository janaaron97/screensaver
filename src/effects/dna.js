import { gradient, mix, clamp, WHITE } from '../core.js';

// A rotating double helix spans the text; a zipper point travels along it,
// the strands peel apart and letters are left behind where it unzips.
export default {
  id: 'dna',
  name: 'Double Helix',
  palette: { final: ['22D3EE', 'A78BFA', 'F472B6'], a: ['0E7490', '22D3EE', 'CFFAFE'], b: ['831843', 'F472B6', 'FCE7F3'], rung: ['334155', '94A3B8'] },
  grad: 'horizontal',
  variants: [
    { name: 'Genome' },
    { name: 'Reverse Transcription', reverse: true, palette: { final: ['FDE047', 'F97316', 'DC2626'], a: ['7C2D12', 'F97316', 'FFEDD5'], b: ['713F12', 'FDE047', 'FEFCE8'], rung: ['44403C', 'A8A29E'] } },
    { name: 'Twin Spiral', freq: 0.32, spin: 0.14, palette: { final: ['4ADE80', '2DD4BF', '60A5FA'], a: ['14532D', '4ADE80', 'DCFCE7'], b: ['1E3A8A', '60A5FA', 'DBEAFE'], rung: ['1E293B', '64748B'] } },
    { name: 'Mutation', mutate: true, palette: { final: ['E879F9', 'FB7185', 'FBBF24'], a: ['581C87', 'E879F9', 'FAE8FF'], b: ['7F1D1D', 'FB7185', 'FFE4E6'], rung: ['3F3F46', 'A1A1AA'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const ga = gradient(P.a), gb = gradient(P.b), gr = gradient(P.rung);
    const freq = p.freq || 0.22;
    const spin = p.spin || 0.09;
    const A = b.h / 2 + 1.5;
    const x0 = b.x0 - 8, x1 = b.x1 + 8;
    const travel = clamp((x1 - x0) * 3.2, 220, 520);
    const intro = 40;
    const dir = p.reverse ? -1 : 1;
    const bases = 'ACGT';
    s.hideAll();
    let t = 0, phase = 0;
    return {
      tick() {
        t++;
        phase += spin;
        const k = clamp((t - intro) / travel);
        const zx = dir > 0 ? x0 + (x1 - x0) * k : x1 - (x1 - x0) * k;
        const alphaIn = clamp(t / intro);
        for (let x = Math.floor(x0); x <= x1; x++) {
          const behind = (zx - x) * dir; // >0 means already unzipped
          const sep = behind > 0 ? behind * 0.9 : 0;
          const fa = alphaIn * (behind > 0 ? clamp(1 - behind / 18) : 1);
          if (fa <= 0.01) continue;
          const th = phase + x * freq;
          const z1 = Math.cos(th);
          const y1 = b.cy + (A + sep) * Math.sin(th) - (behind > 0 ? sep * 0.3 : 0);
          const y2 = b.cy + (A + sep) * Math.sin(th + Math.PI) + (behind > 0 ? sep * 0.3 : 0);
          const d1 = (z1 + 1) / 2, d2 = 1 - d1;
          const strand = (y, d, g) => {
            const sym = d > 0.66 ? '●' : d > 0.33 ? '•' : '·';
            (d > 0.5 ? s.put : s.putUnder).call(s, x, y, sym, g(d), fa * (0.35 + 0.65 * d));
          };
          strand(y1, d1, ga);
          strand(y2, d2, gb);
          if (behind <= 0 && x % 3 === 0 && Math.abs(Math.sin(th)) > 0.25) {
            const lo = Math.min(y1, y2) + 1, hi = Math.max(y1, y2) - 1;
            for (let y = Math.ceil(lo); y <= hi; y++) s.putUnder(x, y, '┊', gr((y - lo) / (hi - lo + 1)), fa * 0.45);
          }
          if (behind > 0 && behind < 3) s.put(x, b.cy, '✦', WHITE, (1 - behind / 3) * fa);
        }
        let done = k >= 1;
        for (const c of s.chars) {
          const passed = (zx - c.hx) * dir;
          if (passed < 0) {
            done = false;
            continue;
          }
          if (!c.vis) {
            c.vis = true;
            c.d.t0 = t;
          }
          const age = t - c.d.t0;
          const n = p.mutate ? 70 : 40;
          if (age >= n) {
            if (!c.d.ok) c.finish(), (c.d.ok = true);
            continue;
          }
          done = false;
          const q = age / n;
          c.sym = q < 0.45 ? (p.mutate ? r.pick(bases + '█▓▒░') : bases[(c.hx + c.hy) % 4]) : c.ch;
          c.col = q < 0.2 ? WHITE : mix(mix(ga(1), gb(1), (c.hy - b.y0) / Math.max(1, b.h - 1)), c.fc, (q - 0.2) / 0.8);
        }
        return done && t > intro + travel + 30;
      },
    };
  },
};
