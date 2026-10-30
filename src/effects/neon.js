import { gradient, mix, clamp, scale, hex, WHITE } from '../core.js';

// A neon sign warms up: each glass tube buzzes, flickers and catches,
// with sparks at ignition and the odd stubborn tube dropping out.
export default {
  id: 'neon',
  name: 'Neon Sign',
  palette: { final: ['FF2E97', 'B537F2', '3CB9FC'] },
  grad: 'horizontal',
  variants: [
    { name: 'Motel', order: 'ltr', palette: { final: ['FF2E97', 'FF77C6', '3CB9FC'] } },
    { name: 'Dive Bar', order: 'random', flaky: 2.2, palette: { final: ['FF3B30', 'FF9500', 'FFCC00'] } },
    { name: 'Vegas', order: 'ltr', fast: true, multi: ['FF2E97', 'FFE600', '00F0FF', '7CFF4F', 'B537F2', 'FF7A00'] },
    { name: 'Tokyo Night', order: 'random', slow: true, palette: { final: ['7AA2F7', 'BB9AF7', '7DCFFF'] } },
  ],
  create(s, p, P) {
    const r = s.rng;
    // Tubes are connected components of characters.
    const at = new Map(s.chars.map((c) => [c.hx + ',' + c.hy, c]));
    const seen = new Set();
    const tubes = [];
    for (const c of s.chars) {
      if (seen.has(c)) continue;
      const comp = [];
      const stack = [c];
      seen.add(c);
      while (stack.length) {
        const q = stack.pop();
        comp.push(q);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const n = at.get(q.hx + dx + ',' + (q.hy + dy));
            if (n && !seen.has(n)) seen.add(n), stack.push(n);
          }
      }
      tubes.push(comp);
    }
    tubes.forEach((tb) => (tb.mx = Math.min(...tb.map((c) => c.hx))));
    if (p.order === 'ltr') tubes.sort((a, b) => a.mx - b.mx);
    else r.shuffle(tubes);
    const gap = (p.fast ? 140 : p.slow ? 300 : 230) / Math.max(1, tubes.length);
    const flaky = p.flaky || 1;
    tubes.forEach((tb, i) => {
      if (p.multi && !s.theme) {
        const col = hex(p.multi[i % p.multi.length]);
        for (const c of tb) c.fc = col;
      }
      tb.start = Math.round(20 + i * gap + r.range(0, gap));
      // flicker schedule: list of [tick, on]
      const ev = [];
      let at2 = tb.start;
      const n = r.int(2, Math.round(4 * flaky));
      for (let k = 0; k < n; k++) {
        ev.push([at2, true]);
        at2 += r.int(2, 8);
        ev.push([at2, false]);
        at2 += r.int(3, p.slow ? 30 : 16);
      }
      ev.push([at2, true]);
      tb.lit = at2;
      // a late dropout or two
      if (r.chance(0.35 * flaky)) {
        const d = at2 + r.int(30, 90);
        ev.push([d, false], [d + r.int(3, 10), true]);
        if (r.chance(0.5)) ev.push([d + 14, false], [d + r.int(18, 26), true]);
      }
      tb.ev = ev;
      tb.end = ev[ev.length - 1][0] + 30;
    });
    const end = Math.max(...tubes.map((tb) => tb.end)) + 10;
    for (const c of s.chars) c.col = scale(c.fc, 0.1);
    const sparks = [];
    let t = 0;
    return {
      tick() {
        t++;
        for (const tb of tubes) {
          let on = false;
          for (const [et, v] of tb.ev) if (t >= et) on = v;
          const fresh = tb.ev.some(([et, v]) => v && et === t);
          if (fresh)
            for (let k = 0; k < 4; k++) {
              const c = r.pick(tb);
              sparks.push({ x: c.hx, y: c.hy, vx: r.range(-0.8, 0.8), vy: r.range(-0.6, 0.2), life: r.int(8, 18), age: 0 });
            }
          const warm = clamp((t - tb.lit) / 40);
          for (const c of tb) {
            if (!on) {
              c.col = scale(c.fc, 0.1 + (t > tb.start ? 0.08 : 0));
              continue;
            }
            const buzz = warm < 1 ? 0.85 + 0.15 * Math.sin(t * 1.7 + c.hx) : 1;
            c.col = scale(mix(mix(c.fc, WHITE, 0.55), c.fc, warm), buzz);
            // soft halo
            if (warm > 0 || on) {
              const h = scale(c.fc, 1);
              s.putUnder(c.hx, c.hy - 1, '░', h, 0.18);
              s.putUnder(c.hx, c.hy + 1, '░', h, 0.18);
              s.putUnder(c.hx - 1, c.hy, '░', h, 0.12);
              s.putUnder(c.hx + 1, c.hy, '░', h, 0.12);
            }
          }
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const sp = sparks[i];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.06;
          if (++sp.age > sp.life) {
            sparks.splice(i, 1);
            continue;
          }
          s.put(sp.x, sp.y, sp.age < 4 ? '*' : '·', mix(WHITE, [255, 200, 120], sp.age / sp.life), 1 - sp.age / sp.life);
        }
        if (t >= end) {
          s.finishAll();
          return true;
        }
        return false;
      },
    };
  },
};
