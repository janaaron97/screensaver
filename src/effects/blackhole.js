import { gradSteps, mix, WHITE, TAU, ease, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// A starfield is devoured by a spinning black hole, which collapses and
// detonates — scattering matter that settles back into the text.
export default {
  id: 'blackhole',
  name: 'Black Hole',
  palette: {
    final: ['8A008A', '00D1FF', 'FFFFFF'],
    ring: ['FFFFFF', 'FFD700', 'FF6A00'],
    stars: ['FFFFFF', 'FFE2A8', 'A0C4FF', 'FFB3C6', 'BDB2FF'],
    blast: ['FFFFFF', 'FFF3B0', 'FF9F1C', 'E71D36', '6A0572'],
  },
  grad: 'diagonal',
  variants: [
    { name: 'Event Horizon' },
    { name: 'Quasar', radius: 1.4, palette: { final: ['3A0CA3', '4361EE', '4CC9F0'], ring: ['FFFFFF', '4CC9F0', '7209B7'], stars: ['FFFFFF', 'CAF0F8', '90E0EF', 'B8C0FF'], blast: ['FFFFFF', 'CAF0F8', '4CC9F0', '4361EE', '3A0CA3'] } },
    { name: 'Supernova', spin: 2, palette: { final: ['FF006E', 'FB5607', 'FFBE0B'], ring: ['FFFFFF', 'FFBE0B', 'FF006E'], stars: ['FFFFFF', 'FFD6A5', 'FFADAD', 'FDFFB6'], blast: ['FFFFFF', 'FFFDE4', 'FFBE0B', 'FB5607', 'FF006E'] } },
    { name: 'Dark Matter', radius: 0.7, slow: true, palette: { final: ['B8F2E6', 'AED9E0', '5E6472'], ring: ['E0E0E0', '9D4EDD', '3C096C'], stars: ['C8B6FF', 'E7C6FF', 'FFFFFF'], blast: ['FFFFFF', 'E0AAFF', '9D4EDD', '5A189A', '240046'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const b = s.bounds;
    const cx = b.cx, cy = b.cy;
    const R = Math.max(4, Math.min(b.w / 2.5, b.h * 1.6, s.rows) * (p.radius || 1));
    const ringCols = gradSteps(P.ring, 6);
    const blast = gradSteps(P.blast, 10);
    const starCols = P.stars.map((h) => gradSteps([h], 1)[0]);
    const slow = p.slow ? 1.4 : 1;
    const spin = (p.spin || 1) * 0.03;
    const ringN = Math.floor(R * 2.6);
    const order = r.shuffle([...s.chars]);
    for (const c of s.chars) {
      const [x, y] = s.randomPoint();
      c.x = x;
      c.y = y;
      c.sym = r.pick(['*', '·', '✦', '+', '.']);
      c.col = r.pick(starCols);
      c.a = 0;
      c.d.tw = r.range(0, TAU);
    }
    let phase = 'form';
    let t = 0, pt = 0, eaten = 0, ang = 0, ringR = R;

    const drawRing = (rad, alpha) => {
      for (let i = 0; i < ringN; i++) {
        const a = ang + (i / ringN) * TAU;
        const x = cx + Math.cos(a) * rad, y = cy + (Math.sin(a) * rad) / 2;
        s.put(x, y, i % 3 ? '*' : '✦', ringCols[(i + Math.floor(t / 3)) % ringCols.length], alpha);
      }
      // accretion glow
      for (let i = 0; i < ringN / 2; i++) {
        const a = -ang * 1.7 + (i / (ringN / 2)) * TAU;
        const rr = rad * 0.6;
        s.put(cx + Math.cos(a) * rr, cy + (Math.sin(a) * rr) / 2, '·', ringCols[3], alpha * 0.5);
      }
    };

    return {
      tick() {
        t++;
        pt++;
        ang += spin;
        if (phase === 'form') {
          for (const c of s.chars) {
            c.a = Math.min(1, pt / 40) * (0.6 + 0.4 * Math.sin(c.d.tw + t * 0.1));
          }
          drawRing(ringR * Math.min(1, pt / 50), Math.min(1, pt / 50));
          if (pt > 70) { phase = 'eat'; pt = 0; }
        } else if (phase === 'eat') {
          drawRing(ringR, 1);
          const rate = Math.max(1, Math.ceil(order.length / (100 * slow)));
          for (let i = 0; i < rate && eaten < order.length; i++) {
            const c = order[eaten++];
            c.a = 1;
            const a0 = Math.atan2((c.y - cy) * 2, c.x - cx) + Math.PI / 2;
            const d = Math.hypot(c.x - cx, (c.y - cy) * 2) * 0.6;
            moveTo(c, cx, cy, r.int(40, 70) * slow, ease.inExpo, cx + Math.cos(a0) * d, cy + (Math.sin(a0) * d) / 2);
          }
          let moving = false;
          for (const c of s.chars) {
            if (c.m) {
              stepMove(c);
              if (!c.m) c.vis = false;
              else moving = true;
            } else if (c.vis) c.a = 0.6 + 0.4 * Math.sin(c.d.tw + t * 0.1);
          }
          if (eaten >= order.length && !moving) { phase = 'collapse'; pt = 0; }
        } else if (phase === 'collapse') {
          ringR = R * ease.inBack(1 - Math.min(1, pt / 40));
          if (ringR > 0.3) drawRing(Math.max(0.3, ringR), 1);
          if (pt >= 40) {
            for (let i = 0; i < 14; i++) s.put(cx + r.range(-2, 2), cy + r.range(-1, 1), '█', WHITE, 1);
            phase = 'explode';
            pt = 0;
            for (const c of s.chars) {
              c.vis = true;
              c.a = 1;
              c.x = cx; c.y = cy;
              const a = r.range(0, TAU), d = r.range(0.3, 1) * Math.max(s.cols, s.rows * 2) * 0.55;
              moveTo(c, cx + Math.cos(a) * d, cy + (Math.sin(a) * d) / 2, r.int(35, 60), ease.outExpo);
              c.sym = r.pick(['*', '✸', '✦', '•', '+']);
              const fr = blast.map((col) => ({ col, n: 5 }));
              playSeq(c, fr);
            }
          }
        } else if (phase === 'explode') {
          if (pt < 8) for (let i = 0; i < 30; i++) {
            const a = r.range(0, TAU), d = pt * 1.5 + r.range(0, 2);
            s.put(cx + Math.cos(a) * d * 2, cy + Math.sin(a) * d, '░▒▓█'[r.int(0, 3)], blast[Math.min(9, pt)], 1 - pt / 8);
          }
          let busy = false;
          for (const c of s.chars) { if (!stepMove(c)) busy = true; stepSeq(c); }
          if (!busy && pt > 30) {
            phase = 'home';
            pt = 0;
            for (const c of s.chars) {
              moveTo(c, c.hx, c.hy, r.int(50, 90) * slow, ease.inOutCubic);
              const from = c.col;
              playSeq(c, [
                ...[0, 0.2, 0.4, 0.6, 0.8].map((k) => ({ col: mix(from, WHITE, k * 0.4), n: 6 })),
                { sym: c.ch, col: WHITE, n: 4 },
                ...[0.25, 0.5, 0.75, 1].map((k) => ({ col: mix(WHITE, c.fc, k), n: 4 })),
              ]);
            }
          }
        } else {
          let busy = false;
          for (const c of s.chars) {
            if (!stepMove(c)) busy = true;
            if (!stepSeq(c)) busy = true;
          }
          if (!busy) { s.finishAll(); return true; }
        }
        return false;
      },
    };
  },
};
