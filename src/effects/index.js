// Every effect module in this folder, flattened into one playlist of presets (effect x variant).
const modules = import.meta.glob(['./*.js', '!./index.js'], { eager: true, import: 'default' });

export const EFFECTS = Object.values(modules).sort((a, b) => a.name.localeCompare(b.name));

export const PRESETS = EFFECTS.flatMap((effect) =>
  effect.variants.map((variant, i) => ({
    id: `${effect.id}-${i + 1}`,
    name: variant.name && variant.name !== 'Classic' ? `${effect.name} · ${variant.name}` : effect.name,
    effect,
    variant,
  })),
);
