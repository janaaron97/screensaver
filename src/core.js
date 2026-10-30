// Core toolkit shared by every effect: RNG, color, easing, motion and the Stage.
// Effects run on a fixed 60 ticks/second clock, in terminal cell coordinates.

export const TPS = 60;

// ---------------------------------------------------------------- random

export class Rng {
  constructor(seed = (Math.random() * 2 ** 32) >>> 0) {
    this.s = seed >>> 0;
  }
  float() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) {
    return a + (b - a) * this.float();
  }
  int(a, b) {
    return a + Math.floor(this.float() * (b - a + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.float() * arr.length)];
  }
  chance(p) {
    return this.float() < p;
  }
  sign() {
    return this.float() < 0.5 ? -1 : 1;
  }
  gauss() {
    let u = 0;
    for (let i = 0; i < 6; i++) u += this.float();
    return u / 3 - 1;
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ---------------------------------------------------------------- math

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, (y2 - y1) * 2); // cells are ~2:1
export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- color (rgb arrays [r,g,b] 0..255)

export function hex(s) {
  if (Array.isArray(s)) return s;
  s = s.replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const scale = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const WHITE = [255, 255, 255];
export const BLACK = [0, 0, 0];

// Multi-stop gradient: returns f(t) -> rgb for t in 0..1 (wraps if loop=true).
export function gradient(stops, loop = false) {
  const cs = stops.map(hex);
  if (loop) cs.push(cs[0]);
  if (cs.length === 1) return () => cs[0];
  return (t) => {
    t = loop ? ((t % 1) + 1) % 1 : clamp(t);
    const f = t * (cs.length - 1);
    const i = Math.min(Math.floor(f), cs.length - 2);
    return mix(cs[i], cs[i + 1], f - i);
  };
}

// n discrete colors sampled along stops (like tte's Gradient(steps=n)).
export function gradSteps(stops, n) {
  const g = gradient(stops);
  return Array.from({ length: n }, (_, i) => g(n === 1 ? 1 : i / (n - 1)));
}

export function hsl(h, s, l) {
  h = ((h % 1) + 1) % 1;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

// ---------------------------------------------------------------- easing

const { sin, cos, pow, sqrt, PI } = Math;
export const ease = {
  linear: (t) => t,
  inSine: (t) => 1 - cos((t * PI) / 2),
  outSine: (t) => sin((t * PI) / 2),
  inOutSine: (t) => -(cos(PI * t) - 1) / 2,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2),
  inQuart: (t) => t ** 4,
  outQuart: (t) => 1 - pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - pow(-2 * t + 2, 4) / 2),
  inExpo: (t) => (t === 0 ? 0 : pow(2, 10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? pow(2, 20 * t - 10) / 2 : (2 - pow(2, -20 * t + 10)) / 2,
  inCirc: (t) => 1 - sqrt(1 - t * t),
  outCirc: (t) => sqrt(1 - pow(t - 1, 2)),
  inOutCirc: (t) => (t < 0.5 ? (1 - sqrt(1 - (2 * t) ** 2)) / 2 : (sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2),
  inBack: (t) => 2.70158 * t ** 3 - 1.70158 * t * t,
  outBack: (t) => 1 + 2.70158 * pow(t - 1, 3) + 1.70158 * pow(t - 1, 2),
  inOutBack: (t) => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },
  outElastic: (t) => (t === 0 || t === 1 ? t : pow(2, -10 * t) * sin((t * 10 - 0.75) * ((2 * PI) / 3)) + 1),
  outBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

// ---------------------------------------------------------------- glyph sets

export const GLYPHS = {
  blocks: '█▓▒░',
  shades: '░▒▓█',
  binary: '01',
  hex: '0123456789ABCDEF',
  ascii: '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
  katakana: 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ',
  matrix: 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ012345789Z:.=*+-<>¦|',
  dots: '·•●',
  stars: '·✦✧*+✶✷✸',
  sparks: '*+x×·•',
  braille: '⠁⠂⠄⡀⢀⠠⠐⠈⠃⠅⠆⠉⠊⠌⠑⠒⠔⠘⠡⠢⠤⠨⠰⡁⡂⡄⡈⡐⡠⢁⢂⢄⢈⢐⢠⣀⠿⣿',
  box: '─│┌┐└┘├┤┬┴┼',
  smoke: '░▒▓▒░',
  fire: '·:░▒▓█',
  drops: '|¦:.',
};

// ---------------------------------------------------------------- per-character motion & scenes

// Start moving c from its current position to (tx, ty) over n ticks.
// Optional control point (cx, cy) makes a quadratic bezier arc.
export function moveTo(c, tx, ty, n, e = ease.linear, cx, cy) {
  c.m = { sx: c.x, sy: c.y, tx, ty, t: 0, n: Math.max(1, Math.round(n)), e, cx, cy };
}

// Advance c's current move by one tick. Returns true when there is no move left.
export function stepMove(c) {
  const m = c.m;
  if (!m) return true;
  m.t++;
  const k = m.e(Math.min(1, m.t / m.n));
  if (m.cx !== undefined) {
    const u = 1 - k;
    c.x = u * u * m.sx + 2 * u * k * m.cx + k * k * m.tx;
    c.y = u * u * m.sy + 2 * u * k * m.cy + k * k * m.ty;
  } else {
    c.x = m.sx + (m.tx - m.sx) * k;
    c.y = m.sy + (m.ty - m.sy) * k;
  }
  if (m.t >= m.n) {
    c.x = m.tx;
    c.y = m.ty;
    c.m = null;
    return true;
  }
  return false;
}

// Play a sequence of frames on c: [{sym?, col?, a?, n}] (n = ticks to hold the frame).
export function playSeq(c, frames, loop = false) {
  c.q = { f: frames, i: 0, t: 0, loop };
  applyFrame(c, frames[0]);
}

function applyFrame(c, f) {
  if (!f) return;
  if (f.sym !== undefined) c.sym = f.sym;
  if (f.col !== undefined) c.col = f.col;
  if (f.a !== undefined) c.a = f.a;
}

// Advance c's sequence one tick. Returns true when the sequence is finished (or absent).
export function stepSeq(c) {
  const q = c.q;
  if (!q) return true;
  q.t++;
  if (q.t >= (q.f[q.i].n || 1)) {
    q.t = 0;
    q.i++;
    if (q.i >= q.f.length) {
      if (!q.loop) {
        c.q = null;
        return true;
      }
      q.i = 0;
    }
    applyFrame(c, q.f[q.i]);
  }
  return false;
}

// Frames fading the color from a to b over `steps` frames, each held `hold` ticks.
export function fadeFrames(a, b, steps = 8, hold = 2, sym) {
  const out = [];
  for (let i = 0; i <= steps; i++) out.push({ col: mix(a, b, i / steps), n: hold, sym });
  return out;
}

// Frames walking through a gradient list of colors.
export function gradFrames(cols, hold = 2, sym) {
  return cols.map((col) => ({ col, n: hold, sym }));
}

// ---------------------------------------------------------------- the stage

export class Stage {
  constructor({ cols, rows, art, rng, theme, dy = 0 }) {
    this.cols = cols;
    this.rows = rows;
    this.rng = rng || new Rng();
    this.theme = theme || null;
    this.over = []; // overlay glyphs drawn above text this tick: [x, y, sym, col, a]
    this.under = []; // glyphs drawn below text this tick
    this.t = 0;

    const lines = art.lines;
    const w = Math.max(...lines.map((l) => [...l].length));
    const h = lines.length;
    const ox = Math.floor((cols - w) / 2);
    const oy = Math.floor((rows - h) / 2) + dy;
    this.chars = [];
    lines.forEach((line, y) => {
      [...line].forEach((ch, x) => {
        if (ch === ' ') return;
        this.chars.push(new Char(ch, ox + x, oy + y));
      });
    });
    // Bounds of the text block, in cells.
    this.bounds = { x0: ox, y0: oy, x1: ox + w - 1, y1: oy + h - 1, w, h, cx: ox + (w - 1) / 2, cy: oy + (h - 1) / 2 };
  }

  // Resolve an effect's palette against the active theme. Every role is a list of hex stops.
  palette(defaults) {
    const th = this.theme;
    if (!th) return defaults;
    const out = {};
    let k = 0;
    for (const [role, stops] of Object.entries(defaults)) {
      if (role === 'final') out[role] = th.final;
      else {
        out[role] = stops.map((_, i) => th.accents[(k + i) % th.accents.length]);
        k += 1;
      }
    }
    return out;
  }

  // Assign each char its final color c.fc from a gradient across the text block.
  // dir: 'vertical' | 'horizontal' | 'diagonal' | 'antidiagonal' | 'radial' | number (angle in degrees)
  setFinal(stops, dir = 'vertical') {
    const g = gradient(stops);
    const b = this.bounds;
    const maxR = Math.hypot(b.w / 2, b.h) || 1;
    for (const c of this.chars) {
      const u = b.w > 1 ? (c.hx - b.x0) / (b.w - 1) : 0;
      const v = b.h > 1 ? (c.hy - b.y0) / (b.h - 1) : 0;
      let t;
      if (dir === 'vertical') t = v;
      else if (dir === 'horizontal') t = u;
      else if (dir === 'diagonal') t = (u + v) / 2;
      else if (dir === 'antidiagonal') t = (1 - u + v) / 2;
      else if (dir === 'radial') t = Math.hypot(c.hx - b.cx, (c.hy - b.cy) * 2) / maxR;
      else {
        const a = (dir * Math.PI) / 180;
        t = ((u - 0.5) * Math.cos(a) + (v - 0.5) * Math.sin(a)) / (Math.abs(Math.cos(a)) / 2 + Math.abs(Math.sin(a)) / 2) / 2 + 0.5;
      }
      c.fc = g(clamp(t));
    }
  }

  // Overlay drawing for particles that are not text characters (cleared every tick).
  put(x, y, sym, col, a = 1) {
    this.over.push([x, y, sym, col, a]);
  }
  putUnder(x, y, sym, col, a = 1) {
    this.under.push([x, y, sym, col, a]);
  }

  hideAll() {
    for (const c of this.chars) c.vis = false;
  }

  // Snap every char to its finished state.
  finishAll() {
    for (const c of this.chars) c.finish();
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  // Grouping helpers. Each returns an array of arrays of chars.
  rowsOf() {
    return groupBy(this.chars, (c) => c.hy);
  }
  colsOf() {
    return groupBy(this.chars, (c) => c.hx);
  }
  diagonalsOf() {
    return groupBy(this.chars, (c) => c.hx + c.hy);
  }
  // Chars sorted by distance from (x, y), defaulting to the text center.
  byDistance(x = this.bounds.cx, y = this.bounds.cy) {
    return [...this.chars].sort((a, b) => dist(a.hx, a.hy, x, y) - dist(b.hx, b.hy, x, y));
  }
  // A random point anywhere on the canvas / just outside its edges.
  randomPoint() {
    return [this.rng.range(0, this.cols - 1), this.rng.range(0, this.rows - 1)];
  }
  offscreenPoint() {
    const r = this.rng;
    switch (r.int(0, 3)) {
      case 0: return [r.range(-2, this.cols + 1), -2];
      case 1: return [r.range(-2, this.cols + 1), this.rows + 1];
      case 2: return [-3, r.range(-2, this.rows + 1)];
      default: return [this.cols + 2, r.range(-2, this.rows + 1)];
    }
  }
  beginTick() {
    this.over.length = 0;
    this.under.length = 0;
    this.t++;
  }
}

function groupBy(arr, key) {
  const m = new Map();
  for (const c of arr) {
    const k = key(c);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(c);
  }
  return [...m.keys()].sort((a, b) => a - b).map((k) => m.get(k));
}

export class Char {
  constructor(ch, hx, hy) {
    this.ch = ch; // final symbol
    this.hx = hx; // home column
    this.hy = hy; // home row
    this.x = hx; // current position (float cells)
    this.y = hy;
    this.sym = ch; // displayed symbol
    this.col = [255, 255, 255]; // displayed color
    this.fc = [255, 255, 255]; // final color (set by Stage.setFinal)
    this.a = 1; // opacity
    this.vis = true; // drawn at all?
    this.m = null; // active move
    this.q = null; // active frame sequence
    this.d = {}; // free per-effect scratch space
  }
  finish() {
    this.x = this.hx;
    this.y = this.hy;
    this.sym = this.ch;
    this.col = this.fc;
    this.a = 1;
    this.vis = true;
    this.m = null;
    this.q = null;
  }
  get home() {
    return this.x === this.hx && this.y === this.hy;
  }
}

// Instantiate one variant of an effect on a stage: resolves palette, final colors, then create().
export function startEffect(effect, variant, stage) {
  const P = stage.palette({ ...effect.palette, ...(variant.palette || {}) });
  stage.setFinal(P.final, variant.grad || effect.grad || 'vertical');
  return effect.create(stage, variant, P);
}
