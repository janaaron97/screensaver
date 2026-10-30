import { Stage, Rng, startEffect, TPS, gradient, mix, WHITE, clamp } from './core.js';
import { Renderer, CELL_RATIO } from './render.js';
import { layout, FONTS } from './text.js';
import { THEMES } from './themes.js';
import { PRESETS } from './effects/index.js';

const $ = (s) => document.querySelector(s);
const body = document.body;
const input = $('#text');
const hud = $('#hud');
const renderer = new Renderer($('#screen'), $('#glow'));

// ---------------------------------------------------------------- settings

const OPTIONS = {
  font: FONTS.map((f) => [f.id, f.label]),
  theme: THEMES.map((t) => [t.id, t.label]),
  motion: [['terminal', 'Terminal'], ['smooth', 'Smooth']],
  glow: [['on', 'On'], ['off', 'Off']],
  effect: [['shuffle', `Shuffle ${PRESETS.length}`], ['sequence', 'In order']],
};
const DEFAULTS = { text: '', font: 'omarchy', theme: 'effect', motion: 'terminal', glow: 'on', effect: 'shuffle' };

const settings = { ...DEFAULTS };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('screensaver') || '{}'));
} catch {}
const params = new URLSearchParams(location.search);
for (const k of Object.keys(DEFAULTS)) if (params.has(k)) settings[k] = params.get(k);
if (params.has('t')) settings.text = params.get('t');
for (const [k, opts] of Object.entries(OPTIONS)) if (!opts.some(([id]) => id === settings[k])) settings[k] = DEFAULTS[k];

function save() {
  try {
    localStorage.setItem('screensaver', JSON.stringify(settings));
  } catch {}
}

function syncOptions() {
  for (const btn of document.querySelectorAll('[data-opt]')) {
    const k = btn.dataset.opt;
    btn.querySelector('b').textContent = OPTIONS[k].find(([id]) => id === settings[k])[1];
  }
  renderer.snap = settings.motion === 'terminal';
  body.classList.toggle('no-glow', settings.glow === 'off');
}

function cycle(k, dir = 1) {
  const opts = OPTIONS[k];
  const i = opts.findIndex(([id]) => id === settings[k]);
  settings[k] = opts[(i + dir + opts.length) % opts.length][0];
  syncOptions();
  save();
  if (k === 'font') build();
}

const theme = () => {
  const t = THEMES.find((t) => t.id === settings.theme);
  return t && t.final ? t : null;
};

// ---------------------------------------------------------------- layout

let art = null;
let stage = null;

// Pick the art layout and cell size that best fill the screen, terminal-style.
function build() {
  const W = innerWidth, H = innerHeight;
  const aspect = (H * 0.55) / CELL_RATIO / (W * 0.8);
  art = layout(settings.text || 'hello', settings.font, aspect);
  const cell = clamp(Math.min((W * 0.8) / art.w, (H * 0.55) / (art.h * CELL_RATIO), Math.max(W, H) / 130), 2.5, 48);
  renderer.resize(W, H, cell);
  if (mode === 'play') runPreset(current, false);
  else buildPreview();
}

function buildPreview() {
  const rows = renderer.rows;
  stage = new Stage({ cols: renderer.cols, rows, art, dy: -Math.round(rows * 0.1) });
  const dpr = renderer.canvas.width / innerWidth;
  const bottom = (renderer.oy + (stage.bounds.y1 + 1) * renderer.ch) / dpr;
  $('#ui').style.top = `${Math.min(bottom + 28, innerHeight - 220)}px`;
}

// The setup screen: the phrase shimmers through a slowly drifting gradient.
function paintPreview(time) {
  const th = theme();
  const grad = gradient(th ? th.final : ['8A008A', '00D1FF', 'FFFFFF', '00D1FF'], true);
  const b = stage.bounds;
  const sweep = ((time / 4200) % 1.6) * (b.w + 40) - 20;
  for (const c of stage.chars) {
    const u = (c.hx - b.x0) / Math.max(1, b.w);
    const v = (c.hy - b.y0) / Math.max(1, b.h);
    let col = grad(u * 0.6 + v * 0.15 - time / 9000);
    const d = Math.abs(c.hx - b.x0 + (c.hy - b.y0) * 0.6 - sweep);
    if (d < 6) col = mix(col, WHITE, (1 - d / 6) * 0.65);
    c.col = col;
  }
}

// ---------------------------------------------------------------- playback

let mode = 'setup';
let current = 0;
let order = [];
let past = [];
let inst = null;
let phase = 'run';
let phaseT = 0;
let paused = false;
let hudTimer = 0;
let info = false;
let wakeLock = null;
const HOLD = TPS * 3;
const FADE = 24;

function nextIndex() {
  if (settings.effect === 'sequence') return (current + 1) % PRESETS.length;
  if (!order.length) order = new Rng().shuffle(PRESETS.map((_, i) => i)).filter((i) => i !== current);
  return order.pop();
}

function runPreset(i, announce = info) {
  current = i;
  const p = PRESETS[i];
  stage = new Stage({ cols: renderer.cols, rows: renderer.rows, art, rng: new Rng(), theme: theme() });
  try {
    inst = startEffect(p.effect, p.variant, stage);
  } catch (e) {
    console.error(p.id, e);
    inst = null;
  }
  phase = 'run';
  phaseT = 0;
  if (announce) showHud();
}

function step(dir) {
  if (dir > 0) {
    past.push(current);
    runPreset(nextIndex(), true);
  } else if (past.length) runPreset(past.pop(), true);
  else runPreset((current - 1 + PRESETS.length) % PRESETS.length, true);
}

function showHud(ms = 2600) {
  const p = PRESETS[current];
  hud.innerHTML = `${p.name}<em>${current + 1}/${PRESETS.length}${paused ? ' · paused' : ''}</em>`;
  hud.classList.add('show');
  clearTimeout(hudTimer);
  if (!info || ms === Infinity) hudTimer = setTimeout(() => !info && hud.classList.remove('show'), ms);
}

function tick() {
  stage.beginTick();
  phaseT++;
  if (phase === 'run') {
    let done = true;
    try {
      done = !inst || inst.tick();
    } catch (e) {
      console.error(PRESETS[current].id, e);
    }
    if (done || phaseT > TPS * 45) {
      stage.finishAll();
      phase = 'hold';
      phaseT = 0;
    }
  } else if (phase === 'hold' && phaseT >= HOLD) {
    phase = 'out';
    phaseT = 0;
  } else if (phase === 'out' && phaseT >= FADE) {
    past.push(current);
    if (past.length > 200) past.shift();
    runPreset(nextIndex());
  }
}

async function start() {
  settings.text = input.value.trim();
  save();
  const url = new URL(location.href);
  url.search = '';
  if (settings.text) url.searchParams.set('t', settings.text);
  for (const k of ['font', 'theme']) if (settings[k] !== DEFAULTS[k]) url.searchParams.set(k, settings[k]);
  history.replaceState(null, '', url);
  mode = 'play';
  body.classList.add('playing');
  input.blur();
  paused = false;
  order = [];
  hud.classList.remove('show');
  if (!document.fullscreenElement && document.documentElement.requestFullscreen && !params.has('nofs'))
    document.documentElement.requestFullscreen().catch(() => {});
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {}
  build();
  const pinned = PRESETS.findIndex((p) => p.id === params.get('fx'));
  runPreset(pinned >= 0 ? pinned : settings.effect === 'sequence' ? 0 : nextIndex());
}

function stop() {
  if (mode !== 'play') return;
  mode = 'setup';
  body.classList.remove('playing', 'awake');
  hud.classList.remove('show');
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  build();
  input.focus();
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

// ---------------------------------------------------------------- main loop

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  let fade = 1;
  if (mode === 'play') {
    if (!paused) {
      acc += dt * TPS;
      let n = 0;
      while (acc >= 1 && n++ < 6) {
        tick();
        acc -= 1;
      }
      if (acc > 1) acc = 0;
    }
    if (phase === 'out') fade = 1 - phaseT / FADE;
  } else {
    stage.beginTick();
    paintPreview(now);
  }
  renderer.draw(stage, { glow: settings.glow === 'on', fade });
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- input

$('#prompt').addEventListener('submit', (e) => {
  e.preventDefault();
  start();
});
$('#start').addEventListener('click', start);
$('#exit').addEventListener('click', stop);
input.addEventListener('input', () => {
  settings.text = input.value;
  build();
});
for (const btn of document.querySelectorAll('[data-opt]'))
  btn.addEventListener('click', (e) => cycle(btn.dataset.opt, e.shiftKey ? -1 : 1));

addEventListener('keydown', (e) => {
  if (mode === 'setup') {
    if (e.key === 'Tab' && document.activeElement === input) {
      e.preventDefault();
      cycle('font', e.shiftKey ? -1 : 1);
    }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'escape' || k === 'q') stop();
  else if (k === 'arrowright' || k === 'n') step(1);
  else if (k === 'arrowleft' || k === 'p') step(-1);
  else if (k === ' ') {
    paused = !paused;
    showHud(paused ? Infinity : 1200);
  } else if (k === 'i') {
    info = !info;
    if (info) showHud(Infinity);
    else hud.classList.remove('show');
  } else if (k === 'f') toggleFullscreen();
  else if (k === 'm') cycle('motion');
  else if (k === 'g') cycle('glow');
  else if (k === 'c') {
    cycle('theme');
    runPreset(current, false);
    hud.innerHTML = `colors <em>${OPTIONS.theme.find(([id]) => id === settings.theme)[1]}</em>`;
    hud.classList.add('show');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => !info && hud.classList.remove('show'), 1600);
  } else return;
  e.preventDefault();
});

// Show the cursor and exit button briefly when the mouse moves.
let awakeTimer = 0;
addEventListener('pointermove', (e) => {
  if (mode !== 'play' || e.pointerType === 'touch') return;
  body.classList.add('awake');
  clearTimeout(awakeTimer);
  awakeTimer = setTimeout(() => body.classList.remove('awake'), 2000);
});

// Touch: swipe to browse effects, tap to reveal the exit button.
let touch = null;
addEventListener('pointerdown', (e) => {
  if (mode === 'play' && e.pointerType === 'touch') touch = { x: e.clientX, y: e.clientY };
});
addEventListener('pointerup', (e) => {
  if (!touch || mode !== 'play') return;
  const dx = e.clientX - touch.x;
  touch = null;
  if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
  else {
    body.classList.toggle('awake');
    clearTimeout(awakeTimer);
    awakeTimer = setTimeout(() => body.classList.remove('awake'), 3000);
  }
});
$('#screen').addEventListener('dblclick', () => mode === 'play' && toggleFullscreen());

let resizeTimer = 0;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(build, 120);
});
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && mode === 'play')
    try {
      wakeLock = await navigator.wakeLock?.request('screen');
    } catch {}
});

// ---------------------------------------------------------------- boot

input.value = settings.text;
syncOptions();
build();
requestAnimationFrame(frame);
document.fonts?.ready.then(build);
if (params.has('t')) start();
else input.focus();
