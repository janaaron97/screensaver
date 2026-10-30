import { GLYPHS, gradSteps, mix, playSeq, stepSeq } from '../core.js';

// Digital rain pours down the screen; streams that cross the text lock
// characters in place until the message emerges from the code.
export default {
  id: 'matrix',
  name: 'Matrix',
  palette: { final: ['389C38', '6FD06F'], rain: ['92BE92', '185318'], head: ['DBFFDB'] },
  grad: 'vertical',
  variants: [
    { name: 'Classic' },
    { name: 'Red Pill', palette: { final: ['FF2A2A', 'FF8A8A'], rain: ['FF6B6B', '4A0000'], head: ['FFE3E3'] } },
    { name: 'Cyber Blue', glyphs: GLYPHS.hex + '<>/\\', palette: { final: ['00B4D8', 'CAF0F8'], rain: ['90E0EF', '03045E'], head: ['FFFFFF'] } },
    { name: 'Gold Rain', dense: true, palette: { final: ['FFB703', 'FFF1C1'], rain: ['FFD166', '3D2B00'], head: ['FFFBEA'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    const glyphs = [...(p.glyphs || GLYPHS.matrix)];
    const rainCols = gradSteps(P.rain, 12);
    const head = gradSteps(P.head, 1)[0];
    const streams = [];
    const byCol = new Map();
    for (const c of s.chars) {
      c.vis = false;
      if (!byCol.has(c.hx)) byCol.set(c.hx, []);
      byCol.get(c.hx).push(c);
    }
    let pending = s.chars.length;
    let t = 0;
    const rainTicks = 120;

    const spawn = (x) => {
      const len = r.int(6, Math.max(8, Math.floor(s.rows * 0.8)));
      streams.push({ x, y: -r.int(0, s.rows), v: r.range(0.25, 0.75), len, syms: Array.from({ length: len }, () => r.pick(glyphs)) });
    };
    const density = p.dense ? 0.12 : 0.06;

    return {
      tick() {
        t++;
        const raining = pending > 0;
        if (raining) {
          for (let x = 0; x < s.cols; x++) if (r.chance(density / 6)) spawn(x);
          // Once the opening rain has played, feed extra streams into columns still hiding text.
          if (t > rainTicks) for (const [x, cs] of byCol) if (r.chance(0.03) && cs.some((c) => !c.vis)) spawn(x);
        }
        for (let i = streams.length - 1; i >= 0; i--) {
          const st = streams[i];
          const prev = Math.floor(st.y);
          st.y += st.v;
          const hy = Math.floor(st.y);
          if (r.chance(0.3)) st.syms[r.int(0, st.len - 1)] = r.pick(glyphs);
          for (let j = 0; j < st.len; j++) {
            const y = hy - j;
            if (y < 0 || y >= s.rows) continue;
            const col = j === 0 ? head : rainCols[Math.min(11, Math.floor((j / st.len) * 12))];
            s.putUnder(st.x, y, st.syms[j], col, 1 - j / st.len);
          }
          // Lock text characters the head passes (after the opening rain).
          if (t > rainTicks && hy > prev && byCol.has(st.x))
            for (const c of byCol.get(st.x))
              if (!c.vis && c.hy <= hy && c.hy > prev - 1) {
                c.vis = true;
                pending--;
                const frames = [];
                for (let k = 0; k < r.int(6, 20); k++) frames.push({ sym: r.pick(glyphs), col: head, n: r.int(2, 5) });
                frames.push({ sym: c.ch, col: head, n: 4 });
                for (let k = 1; k <= 8; k++) frames.push({ col: mix(head, c.fc, k / 8), n: 3 });
                playSeq(c, frames);
              }
          if (hy - st.len > s.rows) streams.splice(i, 1);
        }
        for (const c of s.chars) if (c.vis) stepSeq(c);
        return pending === 0 && streams.length === 0 && s.chars.every((c) => !c.q);
      },
    };
  },
};
