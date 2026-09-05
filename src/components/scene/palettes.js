/**
 * The site's colour schemes.
 *
 * A palette is not just the scene's light — it also carries the ground it sits
 * on. A warm light over a cold black reads as two unrelated decisions, so each
 * scheme owns its own near-black ramp, its own text greys, and its own accent,
 * and they are applied together or not at all.
 *
 * `sections` gives every section a pair of hues. They are eased between as you
 * scroll, so the page reads as one light source changing rather than a set of
 * unrelated scenes.
 *
 * Switch with `?palette=<key>` for a quick look; change DEFAULT_PALETTE to
 * commit to one.
 */

export const PALETTES = {
  /* Almost no saturation — the colour of real deep-space photography, where
     what you notice is temperature rather than hue. */
  starlight: {
    label: 'Cold Starlight',
    sections: {
      hero: [0xdbe9ff, 0x9fc0e8],
      about: [0xb9d4f5, 0xdbe9ff],
      jobs: [0x9fc0e8, 0xc8d8ee],
      projects: [0xaec6e0, 0xdbe9ff],
      contact: [0xdbe9ff, 0xb9d4f5],
    },
    stars: { glow: 0xcfe0ff, glowAlt: 0xffd9b8 },
    core: 0xf4f9ff,
    css: {
      '--dark-navy': '#04070c',
      '--navy': '#0a0e14',
      '--light-navy': '#141b23',
      '--lightest-navy': '#232d38',
      '--navy-shadow': 'rgba(0, 3, 10, 0.7)',
      '--dark-slate': '#4c5866',
      '--slate': '#8492a3',
      '--light-slate': '#a8b5c4',
      '--lightest-slate': '#ccd7e4',
      '--white': '#eef4fb',
      '--green': '#cfe3ff',
      '--green-tint': 'rgba(207, 227, 255, 0.1)',
      '--pink': '#b9c9e0',
      '--blue': '#9fc0e8',
      '--scrim-rgb': '10, 14, 20',
      '--matte-lift': '30, 42, 56',
      '--matte-deep': '2, 4, 8',
    },
  },

  /* A star up close: the warmest scheme, and the highest contrast against a
     black ground. */
  ember: {
    label: 'Ember / Solar',
    sections: {
      hero: [0xffb347, 0xff8f4d],
      about: [0xff8f4d, 0xffc978],
      jobs: [0xffc978, 0xffb347],
      projects: [0xffa236, 0xf5713f],
      contact: [0xffb347, 0xffc978],
    },
    stars: { glow: 0xffd0a0, glowAlt: 0xa8c4ff },
    core: 0xfff6ea,
    css: {
      '--dark-navy': '#070503',
      '--navy': '#0f0c09',
      '--light-navy': '#1b1712',
      '--lightest-navy': '#2c261f',
      '--navy-shadow': 'rgba(8, 4, 0, 0.7)',
      '--dark-slate': '#635a4e',
      '--slate': '#9c9384',
      '--light-slate': '#c0b6a6',
      '--lightest-slate': '#ded7cc',
      '--white': '#faf5ee',
      '--green': '#ffb347',
      '--green-tint': 'rgba(255, 179, 71, 0.12)',
      '--pink': '#f5713f',
      '--blue': '#ffc978',
      '--scrim-rgb': '15, 12, 9',
      '--matte-lift': '48, 38, 28',
      '--matte-deep': '5, 3, 1',
    },
  },

  /* The telescope-plate palette: gold and rose set against deep teal, warm and
     cool in the same frame. */
  nebula: {
    label: 'Hubble Nebula',
    sections: {
      hero: [0xf2c078, 0x6fb3ad],
      about: [0xe8836b, 0xf2c078],
      jobs: [0x6fb3ad, 0xd97b8a],
      projects: [0xe0a05c, 0x6fb3ad],
      contact: [0xf2c078, 0xe8836b],
    },
    stars: { glow: 0xffd9a8, glowAlt: 0x9fd4d0 },
    core: 0xfff4e6,
    css: {
      '--dark-navy': '#06050a',
      '--navy': '#0d0b11',
      '--light-navy': '#191620',
      '--lightest-navy': '#2a2533',
      '--navy-shadow': 'rgba(4, 2, 10, 0.7)',
      '--dark-slate': '#5c5566',
      '--slate': '#968ea3',
      '--light-slate': '#bab2c4',
      '--lightest-slate': '#dcd6e2',
      '--white': '#f6f2f8',
      '--green': '#f2c078',
      '--green-tint': 'rgba(242, 192, 120, 0.12)',
      '--pink': '#d97b8a',
      '--blue': '#6fb3ad',
      '--scrim-rgb': '13, 11, 17',
      '--matte-lift': '42, 34, 52',
      '--matte-deep': '4, 2, 8',
    },
  },

  /* Two colours only, alternating section by section — the most graphic of the
     four, and the one with the strongest rhythm as you scroll. */
  rust: {
    label: 'Rust & Ice',
    sections: {
      hero: [0xd9744a, 0xa8cfe0],
      about: [0xa8cfe0, 0xd9744a],
      jobs: [0xd9744a, 0xa8cfe0],
      projects: [0xd9744a, 0xa8cfe0],
      contact: [0xa8cfe0, 0xd9744a],
    },
    stars: { glow: 0xe8a07a, glowAlt: 0xa8cfe0 },
    core: 0xfdf3ec,
    css: {
      '--dark-navy': '#070505',
      '--navy': '#0e0c0c',
      '--light-navy': '#1a1716',
      '--lightest-navy': '#2b2724',
      '--navy-shadow': 'rgba(6, 2, 0, 0.7)',
      '--dark-slate': '#5e564f',
      '--slate': '#9a9089',
      '--light-slate': '#bdb4ad',
      '--lightest-slate': '#ddd6d0',
      '--white': '#f7f3ef',
      '--green': '#d9744a',
      '--green-tint': 'rgba(217, 116, 74, 0.13)',
      '--pink': '#d9744a',
      '--blue': '#a8cfe0',
      '--scrim-rgb': '14, 12, 12',
      '--matte-lift': '46, 36, 30',
      '--matte-deep': '5, 3, 2',
    },
  },
};

export const DEFAULT_PALETTE = 'starlight';

/** The palette in force, honouring a `?palette=` override during review. */
export const getActivePalette = () => {
  let key = DEFAULT_PALETTE;
  if (typeof window !== 'undefined') {
    const requested = new URLSearchParams(window.location.search).get('palette');
    if (requested && PALETTES[requested]) {
      key = requested;
    }
  }
  return PALETTES[key];
};

/**
 * Writes a palette's colours onto the document root. The stylesheet ships the
 * default palette's values, so this only ever has work to do when one is being
 * previewed — no flash on a normal load.
 */
export const applyPaletteVariables = palette => {
  if (typeof document === 'undefined') {
    return;
  }
  Object.entries(palette.css).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, value);
  });
};
