import { GLYPHS, gradSteps, mix, WHITE, playSeq, stepSeq } from '../core.js';

// Movie-style decryption: ciphertext is typed out, churns, then each character
// cracks into place with a flash.
export default {
  id: 'decrypt',
  name: 'Decrypt',
  palette: { final: ['EDA000', 'FFD772'], cipher: ['008000', '00CB00', '00FF00'] },
  grad: 'vertical',
  variants: [
    { name: 'Classic' },
    { name: 'Hex Dump', glyphs: GLYPHS.hex, palette: { final: ['00F5D4', '00BBF9'], cipher: ['1B3B6F', '21295C', '3A86FF'] } },
    { name: 'Blocks', glyphs: '░▒▓█▚▞▙▛▜▟', palette: { final: ['FF006E', 'FB5607', 'FFBE0B'], cipher: ['3A0CA3', '7209B7', 'B5179E'] } },
    { name: 'Binary Crack', glyphs: '01', fast: true, palette: { final: ['E0FBFC', '98C1D9', '3D5A80'], cipher: ['293241', '3D5A80', 'EE6C4D'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const glyphs = [...(p.glyphs || GLYPHS.ascii + GLYPHS.blocks + GLYPHS.katakana)];
    const cipher = gradSteps(P.cipher, 6);
    const order = r.shuffle([...s.chars]);
    s.hideAll();
    let typed = 0;
    let t = 0;
    const typeRate = Math.max(1, Math.ceil(s.chars.length / (p.fast ? 50 : 110)));

    const churn = (c) => {
      const frames = [];
      const n = r.int(20, 60);
      for (let i = 0; i < n; i++) frames.push({ sym: r.pick(glyphs), col: r.pick(cipher), n: r.int(1, 4) });
      return frames;
    };

    for (const c of order) c.d.unlock = r.int(p.fast ? 40 : 70, p.fast ? 200 : 360);

    return {
      tick() {
        t++;
        // Phase 1: type out ciphertext.
        for (let i = 0; i < typeRate && typed < order.length; i++) {
          const c = order[typed++];
          c.vis = true;
          playSeq(c, churn(c), true);
          c.d.start = t;
        }
        let done = true;
        for (const c of s.chars) {
          if (!c.vis) {
            done = false;
            continue;
          }
          if (c.d.state !== 'open' && typed >= order.length && t - c.d.start > c.d.unlock) {
            c.d.state = 'open';
            playSeq(c, [
              { sym: c.ch, col: WHITE, n: 3 },
              ...[0.2, 0.4, 0.6, 0.8, 1].map((k) => ({ col: mix(WHITE, c.fc, k), n: 3 })),
            ]);
          }
          stepSeq(c);
          if (c.d.state !== 'open' || c.q) done = false;
        }
        return done;
      },
    };
  },
};
