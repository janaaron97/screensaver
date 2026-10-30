// Draws a Stage onto a canvas as a terminal-style character grid.
// Block elements and box drawing are painted as geometry so they tile seamlessly.

export const CELL_RATIO = 2.1; // cell height / width, like a typical terminal font
const cl = (v) => (v > 255 ? 255 : v > 0 ? v | 0 : 0);

// Block elements: list of [x, y, w, h, alpha] rects in unit-cell space.
const BLOCKS = {
  '█': [[0, 0, 1, 1]],
  '▀': [[0, 0, 1, 0.5]],
  '▄': [[0, 0.5, 1, 0.5]],
  '▌': [[0, 0, 0.5, 1]],
  '▐': [[0.5, 0, 0.5, 1]],
  '▔': [[0, 0, 1, 0.125]],
  '▕': [[0.875, 0, 0.125, 1]],
  '░': [[0, 0, 1, 1, 0.25]],
  '▒': [[0, 0, 1, 1, 0.5]],
  '▓': [[0, 0, 1, 1, 0.75]],
  '▖': [[0, 0.5, 0.5, 0.5]],
  '▗': [[0.5, 0.5, 0.5, 0.5]],
  '▘': [[0, 0, 0.5, 0.5]],
  '▝': [[0.5, 0, 0.5, 0.5]],
  '▙': [[0, 0, 0.5, 1], [0.5, 0.5, 0.5, 0.5]],
  '▛': [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.5]],
  '▜': [[0, 0, 1, 0.5], [0.5, 0.5, 0.5, 0.5]],
  '▟': [[0.5, 0, 0.5, 1], [0, 0.5, 0.5, 0.5]],
  '▚': [[0, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
  '▞': [[0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5]],
};
'▁▂▃▅▆▇'.split('').forEach((ch, i) => {
  const h = [1, 2, 3, 5, 6, 7][i] / 8;
  BLOCKS[ch] = [[0, 1 - h, 1, h]];
});
'▏▎▍▋▊▉'.split('').forEach((ch, i) => {
  BLOCKS[ch] = [[0, 0, [1, 2, 3, 5, 6, 7][i] / 8, 1]];
});

// Box drawing: arms [up, right, down, left], 1 = light, 2 = double, 3 = heavy.
const BOX = {};
const def = (chars, arms) => [...chars].forEach((c, i) => (BOX[c] = arms[i]));
def('─│┌┐└┘├┤┬┴┼', [[0,1,0,1],[1,0,1,0],[0,1,1,0],[0,0,1,1],[1,1,0,0],[1,0,0,1],[1,1,1,0],[1,0,1,1],[0,1,1,1],[1,1,0,1],[1,1,1,1]]);
def('━┃┏┓┗┛┣┫┳┻╋', [[0,3,0,3],[3,0,3,0],[0,3,3,0],[0,0,3,3],[3,3,0,0],[3,0,0,3],[3,3,3,0],[3,0,3,3],[0,3,3,3],[3,3,0,3],[3,3,3,3]]);
def('═║╔╗╚╝╠╣╦╩╬', [[0,2,0,2],[2,0,2,0],[0,2,2,0],[0,0,2,2],[2,2,0,0],[2,0,0,2],[2,2,2,0],[2,0,2,2],[0,2,2,2],[2,2,0,2],[2,2,2,2]]);
def('╭╮╰╯', [[0,1,1,0],[0,0,1,1],[1,1,0,0],[1,0,0,1]]);

export class Renderer {
  constructor(canvas, glow) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.glow = glow;
    this.gctx = glow.getContext('2d');
    this.snap = true;
    this.colorCache = new Map();
  }

  // Size the grid. `cellCss` is the desired cell width in CSS pixels.
  resize(cssW, cssH, cellCss) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(cssW * dpr);
    const H = Math.round(cssH * dpr);
    this.canvas.width = W;
    this.canvas.height = H;
    this.cw = Math.max(3, Math.round(cellCss * dpr));
    this.ch = Math.max(6, Math.round(this.cw * CELL_RATIO));
    this.cols = Math.floor(W / this.cw);
    this.rows = Math.floor(H / this.ch);
    this.ox = Math.floor((W - this.cols * this.cw) / 2);
    this.oy = Math.floor((H - this.rows * this.ch) / 2);
    this.font = `500 ${Math.round(this.cw / 0.6)}px "JetBrains Mono", ui-monospace, monospace`;
    this.glow.width = Math.max(1, Math.round(cssW / 3));
    this.glow.height = Math.max(1, Math.round(cssH / 3));
  }

  // Grid metrics for a given viewport and cell width, without resizing anything.
  static gridFor(cssW, cssH, cellCss) {
    return { cols: Math.floor(cssW / cellCss), rows: Math.floor(cssH / (cellCss * CELL_RATIO)) };
  }

  rgb(c) {
    const r = cl(c[0]), g = cl(c[1]), b = cl(c[2]);
    const k = (r << 16) | (g << 8) | b;
    let s = this.colorCache.get(k);
    if (!s) {
      s = `rgb(${r},${g},${b})`;
      if (this.colorCache.size > 20000) this.colorCache.clear();
      this.colorCache.set(k, s);
    }
    return s;
  }

  draw(stage, { glow = true, fade = 1 } = {}) {
    const ctx = this.ctx;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (stage) {
      ctx.font = this.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const o of stage.under) this.glyph(o[0], o[1], o[2], o[3], o[4] * fade);
      for (const c of stage.chars) if (c.vis && c.a > 0) this.glyph(c.x, c.y, c.sym, c.col, c.a * fade);
      for (const o of stage.over) this.glyph(o[0], o[1], o[2], o[3], o[4] * fade);
    }
    ctx.globalAlpha = 1;
    const g = this.gctx;
    g.clearRect(0, 0, this.glow.width, this.glow.height);
    if (glow) g.drawImage(this.canvas, 0, 0, this.glow.width, this.glow.height);
  }

  glyph(x, y, sym, col, a) {
    if (a <= 0.004 || sym === ' ' || sym === undefined) return;
    if (this.snap) {
      x = Math.round(x);
      y = Math.round(y);
    }
    if (x < -1 || y < -1 || x > this.cols || y > this.rows) return;
    const ctx = this.ctx;
    const px = this.ox + x * this.cw;
    const py = this.oy + y * this.ch;
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.fillStyle = this.rgb(col);
    const b = BLOCKS[sym];
    if (b) {
      const cw = this.cw, ch = this.ch;
      for (const r of b) {
        if (r[4]) ctx.globalAlpha = a * r[4];
        // Round edges to device pixels so adjacent cells meet without seams.
        const x0 = Math.round(px + r[0] * cw), y0 = Math.round(py + r[1] * ch);
        const x1 = Math.round(px + (r[0] + r[2]) * cw), y1 = Math.round(py + (r[1] + r[3]) * ch);
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
      return;
    }
    const box = BOX[sym];
    if (box) return this.box(px, py, box);
    ctx.fillText(sym, px + this.cw / 2, py + this.ch / 2);
  }

  box(px, py, arms) {
    const ctx = this.ctx;
    const cw = this.cw, ch = this.ch;
    const cx = px + cw / 2, cy = py + ch / 2;
    const t = Math.max(1, Math.round(cw * 0.14));
    const g = Math.max(1, Math.round(cw * 0.2)); // half-gap between double lines
    const [u, r, d, l] = arms;
    const hline = (x0, x1, y, w) => ctx.fillRect(Math.round(x0), Math.round(y - w / 2), Math.round(x1 - x0), w);
    const vline = (y0, y1, x, w) => ctx.fillRect(Math.round(x - w / 2), Math.round(y0), w, Math.round(y1 - y0));
    const arm = (kind, draw) => {
      if (!kind) return;
      if (kind === 2) {
        draw(-g, t);
        draw(g, t);
      } else draw(0, kind === 3 ? t * 2 : t);
    };
    const reachH = u === 2 || d === 2 ? g + t / 2 : t / 2;
    const reachV = l === 2 || r === 2 ? g + t / 2 : t / 2;
    arm(l, (o, w) => hline(px, cx + reachH, cy + o, w));
    arm(r, (o, w) => hline(cx - reachH, px + cw, cy + o, w));
    arm(u, (o, w) => vline(py, cy + reachV, cx + o, w));
    arm(d, (o, w) => vline(cy - reachV, py + ch, cx + o, w));
  }
}
