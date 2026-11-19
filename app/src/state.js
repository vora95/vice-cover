// Vice Cover — state, palettes and themes.
// One shared state object; every control only mutates state and re-renders.
// No network, no randomness here: the render seed is fixed (7).
// Plain classic scripts (no modules) so the app also opens from file://.

const SEED = 7;

const SIZES = {
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape 1920 × 1080' },
};

const LAYOUTS = {
  'hero-grid': 'Hero grid',
  'hero-strip': 'Hero strip',
};

// Locked sunset palette (see design notes): warm coastal sunset.
const PALETTE = {
  sunsetTop: '#FF9A3D',
  sunsetMid: '#FF5E7A',
  sunsetPurple: '#C44DFF',
  navy: '#2B1B5E',
  nearBlack: '#12082E',
  neonPink: '#FF2E88',
  neonTeal: '#19E3D6',
  neonYellow: '#FFD23F',
  panelLine: '#FFFFFF',
  darkText: '#1A0B2E',
};

// One render function, three constant sets. A theme only swaps these values.
const THEMES = {
  sunset: {
    name: 'Sunset',
    sky: ['#FF9A3D', '#FF5E7A', '#C44DFF', '#2B1B5E', '#12082E'],
    skyStops: [0, 0.34, 0.62, 0.85, 1],
    sun: ['#FFD23F', '#FF7A4D'],
    gradeTop: '#FF9A3D',
    gradeBottom: '#C44DFF',
    gradeHero: 0.4,
    gradeSat: 0.3,
    duotone: '#2B1B5E',
    title: ['#FFD23F', '#FF9A3D', '#FF5E7A', '#C44DFF'],
    shadow: '#FF2E88',
    accent: '#FF2E88',
    accent2: '#19E3D6',
    bg: '#12082E',
    nearBlack: '#12082E',
    water: ['#FF5E7A', '#2B1B5E'],
    sand: ['#3A2060', '#12082E'],
  },
  neon: {
    name: 'Neon Night',
    sky: ['#241258', '#4520A0', '#7A1FA2', '#FF2E88', '#12082E'],
    skyStops: [0, 0.3, 0.58, 0.82, 1],
    sun: ['#FF2E88', '#19E3D6'],
    gradeTop: '#FF2E88',
    gradeBottom: '#1B3A8F',
    gradeHero: 0.46,
    gradeSat: 0.34,
    duotone: '#0E1B4D',
    title: ['#19E3D6', '#FF2E88', '#FF7AD9', '#C44DFF'],
    shadow: '#19E3D6',
    accent: '#19E3D6',
    accent2: '#FF2E88',
    bg: '#0A0618',
    nearBlack: '#0A0618',
    water: ['#7A1FA2', '#0A0618'],
    sand: ['#241145', '#0A0618'],
  },
  golden: {
    name: 'Golden Hour',
    sky: ['#FFC53D', '#FF9A3D', '#FF6B4A', '#7A2E4D', '#1A0B2E'],
    skyStops: [0, 0.32, 0.6, 0.84, 1],
    sun: ['#FFF3B0', '#FF9A3D'],
    gradeTop: '#FFC53D',
    gradeBottom: '#FF6B4A',
    gradeHero: 0.38,
    gradeSat: 0.28,
    duotone: '#5E2A1A',
    title: ['#FFF3B0', '#FFC53D', '#FF9A3D', '#FF5E3D'],
    shadow: '#FF6B4A',
    accent: '#FFD23F',
    accent2: '#FF9A3D',
    bg: '#1A0B2E',
    nearBlack: '#1A0B2E',
    water: ['#FF9A3D', '#1A0B2E'],
    sand: ['#4A2A3A', '#1A0B2E'],
  },
};

const DEFAULT_CAPTION = 'VICE CITY';
const DEFAULT_SUBCAPTION = 'WELCOME TO';

function defaultState() {
  return {
    // photos: [{id, name, image, zoom, offsetX, offsetY, demo}] — memory only.
    photos: [],
    // Which photo (by index) fills each satellite slot, or 'art:skyline' / 'art:palm'.
    layout: 'hero-grid',
    theme: 'sunset',
    caption: DEFAULT_CAPTION,
    subcaption: DEFAULT_SUBCAPTION,
    size: '1080x1350',
    retro: true,
    seed: SEED,
    // Panel assignment overrides: panel index -> photo index or 'art:skyline'|'art:palm'.
    panelPick: {},
  };
}

// Panel content plan for a 3x3 hero grid (hero spans the centre 2x2, 5 satellites).
// With fewer photos than slots, satellites reuse alternate crops of photo 0,
// and two corners stay procedural art so the grid is never empty or black.
function planGridPanels(state) {
  const n = state.photos.length;
  const pick = (i) => state.panelPick[i];
  const slots = [];
  for (let i = 0; i < 5; i++) {
    const p = pick(i);
    if (p !== undefined) { slots.push(p); continue; }
    if (i === 0) { slots.push('art:skyline'); continue; }
    if (i === 4) { slots.push('art:palm'); continue; }
    if (n === 0) { slots.push('demo'); continue; }
    // Cycle photos 1..n-1, then alternate crops of photo 0.
    const idx = (i - 1) % Math.max(1, n);
    slots.push({ photo: idx, crop: i });
  }
  return slots;
}

// Panel content plan for the hero strip (hero + 3 small panels).
function planStripPanels(state) {
  const n = state.photos.length;
  const slots = [];
  for (let i = 0; i < 3; i++) {
    const p = state.panelPick['s' + i];
    if (p !== undefined) { slots.push(p); continue; }
    if (i === 2) { slots.push('art:palm'); continue; }
    if (n <= 1) { slots.push(i === 0 ? 'art:skyline' : { photo: 0, crop: i + 2 }); continue; }
    slots.push({ photo: i % n, crop: i + 1 });
  }
  return slots;
}
