# Screensaver

The [Omarchy](https://omarchy.org) screensaver, in the browser, for any word or phrase.

Type something, hit <kbd>Enter</kbd>, and it goes fullscreen and plays one animation after another, the same way `omarchy-screensaver` loops `ttfx --random-effect` over the Omarchy logo. There are 200 animations: 50 effects with 4 variants each. 37 of the effects recreate the [terminaltexteffects](https://github.com/ChrisBuilds/terminaltexteffects) set that Omarchy uses (beams, decrypt, matrix, fireworks, synthgrid, …). The other 13 are new (vortex, starwarp, dna, plasma, galaxy, neon, crt, life, aurora, …).

Text is rendered with FIGlet. The default font is *Delta Corps Priest 1*, the font the Omarchy logo is drawn in, with added digits and punctuation in the same style.

## Controls

| Key | Action |
| --- | --- |
| <kbd>Enter</kbd> | Start |
| <kbd>Tab</kbd> | Cycle font (while typing) |
| <kbd>←</kbd> / <kbd>→</kbd> | Previous / next animation |
| <kbd>Space</kbd> | Pause |
| <kbd>i</kbd> | Show the current animation's name |
| <kbd>c</kbd> | Cycle color theme |
| <kbd>m</kbd> | Switch between terminal-grid and smooth motion |
| <kbd>g</kbd> | Toggle glow |
| <kbd>f</kbd> / double-click | Fullscreen |
| <kbd>Esc</kbd> / <kbd>q</kbd> | Exit |

On touch screens, swipe to browse and tap to show the exit button.

## Shareable links

`/?t=your+phrase` starts playing right away. Optional parameters:

- `font`: one of `omarchy`, `shadow`, `ansi`, `bloody`, `electronic`, `subzero`, `money`, `larry`
- `theme`: one of `effect`, `tokyo-night`, `catppuccin`, `gruvbox`, `nord`, `rose-pine`, `everforest`, `kanagawa`, `osaka-jade`, `ristretto`, `matte-black`, `synthwave`
- `fx`: start on a specific animation, for example `fx=beams-1` or `fx=galaxy-3`

## Development

```sh
npm install
npm run dev      # local dev server
npm run check    # run every animation headlessly and verify it lands cleanly
npm run build    # production build in dist/
```

Netlify picks up `netlify.toml`: build command `npm run build`, publish directory `dist`.

### Adding an effect

Drop a module in `src/effects/`. It's picked up automatically. See `beams.js` for the shape:

```js
export default {
  id: 'myeffect',
  name: 'My Effect',
  palette: { final: ['ff0080', '00d1ff'], spark: ['ffffff'] }, // hex gradient stops per role
  grad: 'diagonal',                                            // final-color gradient direction
  variants: [{ name: 'Classic' }, { name: 'Fast', speed: 2 }, /* … 4 total */],
  create(stage, params, palette) {
    // set up stage.chars (x, y, sym, col, a, vis); use moveTo/stepMove, playSeq/stepSeq from core.js
    return { tick() { /* advance one 1/60s step; return true when finished */ } };
  },
};
```
