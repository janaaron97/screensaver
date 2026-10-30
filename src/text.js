// Turns a phrase into block-letter ASCII art using FIGlet fonts.
import figlet from 'figlet';
import deltaCorps from 'figlet/importable-fonts/Delta Corps Priest 1.js';
import ansiShadow from 'figlet/importable-fonts/ANSI Shadow.js';
import ansiRegular from 'figlet/importable-fonts/ANSI Regular.js';
import bloody from 'figlet/importable-fonts/Bloody.js';
import electronic from 'figlet/importable-fonts/Electronic.js';
import subZero from 'figlet/importable-fonts/Sub-Zero.js';
import bigMoney from 'figlet/importable-fonts/Big Money-ne.js';
import larry3d from 'figlet/importable-fonts/Larry 3D.js';

// Delta Corps Priest 1 (the font the Omarchy logo is drawn in) only ships letters.
// These glyphs fill in digits and common punctuation in the same chunky style.
const EXTRA = {
  0: [' ▄██████▄ ', '███    ███', '███   ▄███', '███  ▄█▀██', '██▀▄█▀ ███', '███▀   ███', '███    ███', ' ▀██████▀ ', ''],
  1: ['   ▄██ ', ' ▄████ ', '   ███ ', '   ███ ', '   ███ ', '   ███ ', '   ███ ', ' ▄█████▄', ''],
  2: [' ▄██████▄ ', '███    ███', '       ███', '  ▄▄▄▄███▀', '▄██▀▀▀▀▀  ', '███       ', '███    ▄█ ', '█████████▀', ''],
  3: [' ▄██████▄ ', '███    ███', '       ███', '   ▄▄▄██▀ ', '   ▀▀▀██▄ ', '       ███', '███    ███', ' ▀██████▀ ', ''],
  4: ['   ▄█  ▄█ ', '  ███  ███', ' ███   ███', '▄███▄▄▄███▄', '▀▀▀▀▀▀▀███▀', '       ███', '       ███', '       █▀ ', ''],
  5: ['█████████▄', '███       ', '███       ', '███▄▄▄▄▄  ', '▀▀▀▀▀▀███▄', '       ███', '███    ███', ' ▀██████▀ ', ''],
  6: [' ▄██████▄ ', '███    ███', '███       ', '███▄▄▄▄▄  ', '███▀▀▀▀██▄', '███    ███', '███    ███', ' ▀██████▀ ', ''],
  7: ['▀█████████', '       ███', '      ▄██▀', '     ▄██▀ ', '   ▄███▀  ', '  ███▀    ', ' ███      ', ' █▀       ', ''],
  8: [' ▄██████▄ ', '███    ███', '███    ███', ' ▀██▄▄██▀ ', ' ▄██▀▀██▄ ', '███    ███', '███    ███', ' ▀██████▀ ', ''],
  9: [' ▄██████▄ ', '███    ███', '███    ███', ' ▀███▄▄███', '       ███', '       ███', '███    ███', ' ▀██████▀ ', ''],
  '!': ['▄█▄', '███', '███', '███', '▀█▀', '   ', '▄█▄', '▀█▀', ''],
  '?': [' ▄██████▄ ', '███    ███', '      ▄██▀', '    ▄██▀  ', '   ███    ', '   ▀▀▀    ', '   ▄█▄    ', '   ▀█▀    ', ''],
  '.': ['', '', '', '', '', '', '▄█▄', '▀█▀', ''],
  ',': ['', '', '', '', '', '', '▄█▄', '▀██', ' █▀'],
  "'": ['▄█▄', '▀██', ' █▀', '', '', '', '', '', ''],
  '"': ['▄█▄ ▄█▄', '▀██ ▀██', ' █▀  █▀', '', '', '', '', '', ''],
  ':': ['', '', '▄█▄', '▀█▀', '', '▄█▄', '▀█▀', '', ''],
  ';': ['', '', '▄█▄', '▀█▀', '', '▄█▄', '▀██', ' █▀', ''],
  '-': ['', '', '', '▄▄▄▄▄▄▄', '▀▀▀▀▀▀▀', '', '', '', ''],
  '+': ['', '   ▄    ', '   ███  ', '▄▄▄███▄▄', '▀▀▀███▀▀', '   ███  ', '   ▀    ', '', ''],
  '=': ['', '', '▄▄▄▄▄▄▄▄', '▀▀▀▀▀▀▀▀', '▄▄▄▄▄▄▄▄', '▀▀▀▀▀▀▀▀', '', '', ''],
  '_': ['', '', '', '', '', '', '', '▄▄▄▄▄▄▄▄', '▀▀▀▀▀▀▀▀'],
  '/': ['      ▄█', '     ███', '    ███ ', '   ███  ', '  ███   ', ' ███    ', '███     ', '█▀      ', ''],
  '#': ['  ▄█  ▄█  ', ' ███  ███ ', '▄███▄▄███▄', '▀███▀▀███▀', '▄███▄▄███▄', '▀███▀▀███▀', ' ███  ███ ', ' █▀   █▀  ', ''],
  '&': [' ▄█████▄  ', '███   ███ ', '▀███▄██▀  ', ' ▄████▀ ▄ ', '███▀▀██▄██', '███   ███▀', '███   ▀██▄', ' ▀████▀▀██', ''],
  '@': [' ▄███████▄ ', '███     ███', '███ ▄██▄ ██', '███ █▀ █ ██', '███ ▀██▀██▀', '███        ', '███     ▄█ ', ' ▀███████▀ ', ''],
  '(': ['  ▄██', ' ███ ', '███  ', '███  ', '███  ', '███  ', ' ███ ', '  ▀██', ''],
  ')': ['██▄  ', ' ███ ', '  ███', '  ███', '  ███', '  ███', ' ███ ', '██▀  ', ''],
  '<': ['', '    ▄██', '  ▄██▀ ', '▄██▀   ', '▀██▄   ', '  ▀██▄ ', '    ▀██', '', ''],
  '>': ['', '██▄    ', ' ▀██▄  ', '   ▀██▄', '   ▄██▀', ' ▄██▀  ', '██▀    ', '', ''],
  '*': ['', '▄  █  ▄', ' ▀███▀ ', '▄█████▄', ' ▄███▄ ', '▀  █  ▀', '', '', ''],
  '$': ['   ▄█▄   ', ' ▄█████▄ ', '███ █  ▀ ', ' ▀████▄▄ ', '   █ ▀███', '▄  █  ███', ' ▀█████▀ ', '   ▀█▀   ', ''],
  '%': ['▄██▄    ▄█', '▀██▀   ██▀', '      ██▀ ', '    ▄██▀  ', '  ▄██▀    ', ' ██▀  ▄██▄', '██▀   ▀██▀', '', ''],
};

function patchDeltaCorps(data) {
  const lines = data.split('\n');
  const [, height, , , , comments] = lines[0].split(' ').map(Number);
  for (const [ch, rows] of Object.entries(EXTRA)) {
    // Pad with a trailing hardblank ($) so kerning keeps a one-column gap after the glyph.
    const w = Math.max(...rows.map((r) => [...r].length)) + 1;
    const start = 1 + comments + (ch.charCodeAt(0) - 32) * height;
    for (let i = 0; i < height; i++) {
      const row = (rows[i] || '').padEnd(w - 1, ' ') + '$';
      lines[start + i] = row + (i === height - 1 ? '@@' : '@');
    }
  }
  return lines.join('\n');
}

export const FONTS = [
  { id: 'omarchy', label: 'Omarchy', name: 'Delta Corps Priest 1', data: patchDeltaCorps(deltaCorps) },
  { id: 'shadow', label: 'ANSI Shadow', name: 'ANSI Shadow', data: ansiShadow },
  { id: 'ansi', label: 'ANSI', name: 'ANSI Regular', data: ansiRegular },
  { id: 'bloody', label: 'Bloody', name: 'Bloody', data: bloody },
  { id: 'electronic', label: 'Electronic', name: 'Electronic', data: electronic },
  { id: 'subzero', label: 'Sub-Zero', name: 'Sub-Zero', data: subZero },
  { id: 'money', label: 'Big Money', name: 'Big Money-ne', data: bigMoney },
  { id: 'larry', label: 'Larry 3D', name: 'Larry 3D', data: larry3d },
];
for (const f of FONTS) figlet.parseFont(f.name, f.data);

const clean = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function render(text, font) {
  const out = figlet.textSync(text, { font: font.name, horizontalLayout: 'default' });
  return trim(out.split('\n'));
}

// Strip blank rows at the ends and shared leading whitespace / trailing whitespace.
function trim(lines) {
  lines = lines.map((l) => l.replace(/\s+$/, ''));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const lead = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(lead));
}

const width = (lines) => Math.max(0, ...lines.map((l) => [...l].length));

// Stack rendered lines, each centered, with a one-row gap.
function stack(blocks) {
  const w = Math.max(...blocks.map(width));
  const out = [];
  blocks.forEach((b, i) => {
    if (i) out.push('');
    const pad = Math.floor((w - width(b)) / 2);
    for (const l of b) out.push(' '.repeat(pad) + l);
  });
  return out;
}

// Greedy word wrap into roughly `k` lines of balanced width.
function wrap(words, k, font) {
  const full = width(render(words.join(' '), font));
  const target = full / k;
  const lines = [];
  let cur = [];
  for (const w of words) {
    const next = [...cur, w];
    if (cur.length && width(render(next.join(' '), font)) > target * 1.08) {
      lines.push(cur);
      cur = [w];
    } else cur = next;
  }
  if (cur.length) lines.push(cur);
  return lines.map((l) => render(l.join(' '), font));
}

// Lay out `text` to best fill a viewport of aspect `aspect` (cols per row, in cells).
// Returns { lines } where lines are strings of the art.
export function layout(text, fontId, aspect) {
  const font = FONTS.find((f) => f.id === fontId) || FONTS[0];
  const t = clean(text) || 'hello';
  const words = t.split(' ');
  let best = null;
  for (let k = 1; k <= Math.min(words.length, 6); k++) {
    const lines = stack(wrap(words, k, font));
    const w = width(lines);
    const h = lines.length;
    // How big can a cell be for this layout? Larger is better.
    const fit = Math.min(1 / w, aspect / h);
    if (!best || fit > best.fit * 1.02) best = { lines, fit, w, h };
  }
  return { lines: best.lines, w: best.w, h: best.h };
}
