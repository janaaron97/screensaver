import { gradSteps, hex, mix, WHITE, ease, moveTo, stepMove, playSeq, stepSeq } from '../core.js';

// The text arrives corrupted — scrambled characters blink an alarm color
// until each is plucked out and swapped back into its rightful place.
export default {
  id: 'errorcorrect',
  name: 'Error Correct',
  palette: { final: ['8A008A', '00D1FF', 'FFFFFF'], error: ['E74C3C'], fix: ['45BF55'] },
  grad: 'vertical',
  variants: [
    { name: 'Checksum' },
    { name: 'Heavy Corruption', ratio: 0.4, palette: { final: ['F8F9FA', 'ADB5BD', '6C757D'], error: ['FF0054'], fix: ['00F5D4'] } },
    { name: 'Glitch Swap', ratio: 0.25, fast: true, palette: { final: ['FEE440', 'F15BB5', '9B5DE5'], error: ['FF006E'], fix: ['00BBF9'] } },
    { name: 'Bit Rot', ratio: 0.12, rot: true, palette: { final: ['80FFDB', '48BFE3', '5390D9'], error: ['FF9F1C'], fix: ['CBF3F0'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const err = hex(P.error[0]);
    const fix = hex(P.fix[0]);
    const order = r.shuffle([...s.chars]);
    const nPairs = Math.max(2, Math.floor((order.length * (p.ratio || 0.1)) / 2));
    const pairs = [];
    for (let i = 0; i < nPairs; i++) {
      const a = order[i * 2], b = order[i * 2 + 1];
      if (!a || !b) break;
      a.x = b.hx; a.y = b.hy;
      b.x = a.hx; b.y = a.hy;
      a.d.err = b.d.err = true;
      pairs.push([a, b]);
    }
    for (const c of s.chars) {
      c.col = c.d.err ? err : c.fc;
      c.a = 0;
    }
    const rate = Math.max(1 / 25, pairs.length / (p.fast ? 240 : 380));
    let acc = 0;
    let t = 0, next = 0;
    const blink = ['▓', '▒', '░', '█'];

    return {
      tick() {
        t++;
        const intro = 80;
        for (const c of s.chars) if (c.a < 1) c.a = Math.min(1, t / 25);
        // Corrupted chars blink between glitch blocks and their symbol.
        for (const c of s.chars)
          if (c.d.err && !c.d.fixing) {
            const on = Math.floor((t + c.hx) / 6) % 2;
            c.sym = on ? (p.rot ? r.pick(blink) : blink[0]) : c.ch;
            c.col = on ? err : mix(err, WHITE, 0.3);
          }
        if (t > intro) acc += rate;
        for (; acc >= 1 && next < pairs.length; acc--) {
          for (const c of pairs[next++]) {
            c.d.fixing = true;
            c.sym = c.ch;
            const mx = (c.x + c.hx) / 2, my = Math.min(c.y, c.hy) - 3 - Math.abs(c.x - c.hx) * 0.05;
            moveTo(c, c.hx, c.hy, 30, ease.inOutCubic, mx, my);
            playSeq(c, [
              { col: WHITE, n: 4 },
              { col: fix, n: 26 },
              { col: mix(fix, WHITE, 0.6), n: 3 },
              ...[0.25, 0.5, 0.75, 1].map((k) => ({ col: mix(fix, c.fc, k), n: 4 })),
            ]);
          }
        }
        let busy = next < pairs.length || t <= intro;
        for (const c of s.chars) {
          if (!c.d.fixing) continue;
          if (!stepMove(c)) {
            busy = true;
          }
          if (!stepSeq(c)) busy = true;
        }
        return !busy;
      },
    };
  },
};
