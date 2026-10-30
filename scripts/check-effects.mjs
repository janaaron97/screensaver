// Headless sanity check for effects: runs every variant to completion on a fake stage.
// Usage: node scripts/check-effects.mjs [effect-id ...]
import { readdirSync } from 'node:fs';
import { Stage, Rng, startEffect, TPS } from '../src/core.js';

const ART = [
  '   ▄████████ ▀█████████▄   ▄████████    ▄█   █▄    ',
  '  ███    ███   ███    ███ ███    ███  ███   ███   ',
  '  ███    ███   ███    ███ ███    █▀   ███   ███   ',
  '  ███    ███  ▄███▄▄▄██▀  ███        ▄███▄▄▄███▄  ',
  '▀███████████ ▀▀███▀▀▀██▄  ███       ▀▀███▀▀▀███   ',
  '  ███    ███   ███    ██▄ ███    █▄   ███   ███   ',
  '  ███    ███   ███    ███ ███    ███  ███   ███   ',
  '  ███    █▀  ▄█████████▀  ████████▀   ███   █▀    ',
];
const only = process.argv.slice(2);
const dir = new URL('../src/effects/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'index.js').sort();
const ids = new Set();
let total = 0, bad = 0;
for (const f of files) {
  const effect = (await import(new URL(f, dir))).default;
  if (only.length && !only.includes(effect.id)) continue;
  if (ids.has(effect.id)) console.log(`!! duplicate id ${effect.id}`);
  ids.add(effect.id);
  if (effect.variants.length !== 4) console.log(`!! ${effect.id} has ${effect.variants.length} variants (want 4)`);
  for (const v of effect.variants) {
    total++;
    for (const [cols, rows] of [[140, 45], [80, 30]]) {
      const stage = new Stage({ cols, rows, art: { lines: ART }, rng: new Rng(7) });
      let ticks = 0, err = null, done = false, overMax = 0;
      const t0 = performance.now();
      try {
        const inst = startEffect(effect, v, stage);
        while (!done && ticks < TPS * 40) {
          stage.beginTick();
          done = inst.tick();
          ticks++;
          overMax = Math.max(overMax, stage.over.length + stage.under.length);
          for (const c of stage.chars) if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) throw new Error('NaN position');
          for (const o of [...stage.over, ...stage.under]) if (!Array.isArray(o[3]) || o[3].some((n) => !Number.isFinite(n))) throw new Error('bad overlay color');
        }
      } catch (e) {
        err = e;
      }
      const ms = (performance.now() - t0) / Math.max(1, ticks);
      const off = stage.chars.filter((c) => !c.vis || c.a < 0.99 || c.sym !== c.ch || Math.abs(c.x - c.hx) > 0.01 || Math.abs(c.y - c.hy) > 0.01).length;
      const colOff = stage.chars.filter((c) => c.col.some((n, i) => Math.abs(n - c.fc[i]) > 8)).length;
      const ok = !err && done && off === 0 && colOff === 0 && ticks > TPS * 2.5 && ticks < TPS * 30;
      if (!ok) bad++;
      if (!ok || cols === 140)
        console.log(
          `${ok ? 'ok ' : 'XX '} ${effect.id.padEnd(16)} ${v.name.padEnd(18)} ${cols}x${rows} ${(ticks / TPS).toFixed(1).padStart(5)}s ` +
            `${ms.toFixed(2)}ms/tick overlay<=${overMax}` +
            (done ? '' : ' NOT-DONE') + (off ? ` off-home=${off}` : '') + (colOff ? ` wrong-color=${colOff}` : '') + (err ? ` ERROR ${err.stack}` : ''),
        );
    }
  }
}
console.log(`\n${ids.size} effects, ${total} variants, ${bad} failing runs`);
process.exit(bad ? 1 : 0);
