// Vice Cover — boot + screenshot modes.
// Normal mode: editor with the demo scene loaded.
// ?shot=editor — editor, demo loaded, __shotReady after render.
// ?shot=cover  — cover only, centred on a theme gradient, controls hidden.
//   &theme=neon|golden &size=1080x1080|1080x1350|1920x1080 &seed=N

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot'); // 'editor' | 'cover' | null
const state = defaultState();
if (params.get('theme') && THEMES[params.get('theme')]) state.theme = params.get('theme');
if (params.get('size') && SIZES[params.get('size')]) state.size = params.get('size');
if (params.get('layout') && (params.get('layout') === 'hero-grid' || params.get('layout') === 'hero-strip')) state.layout = params.get('layout');
if (params.get('seed')) {
  const s = parseInt(params.get('seed'), 10);
  if (Number.isFinite(s)) state.seed = s;
}
if (params.get('caption')) state.caption = params.get('caption').toUpperCase().slice(0, 24);
if (params.get('subcaption') !== null) state.subcaption = (params.get('subcaption') || '').toUpperCase().slice(0, 40);

state.photos.push(makeDemoPhoto(state.theme, state.seed));

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
let rafPending = false;

function render() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const { w, h } = SIZES[state.size];
    canvas.width = w;
    canvas.height = h;
    renderCover(ctx, w, h, state);
  });
}

// Expose for debugging and for the shot driver.
window.__vice = { state, render };

function markReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

if (shotMode === 'cover') {
  document.body.classList.add('shot-cover');
  const theme = THEMES[state.theme];
  // Full-bleed theme gradient behind the centred cover.
  const bg = document.getElementById('shot-bg');
  bg.style.background = `linear-gradient(135deg, ${theme.sky[0]}, ${theme.sky[2]} 45%, ${theme.sky[4]})`;
  render();
  markReady();
} else {
  bindUI(state, render, {});
  // Keep the caption inputs in sync with the state (demo defaults).
  document.getElementById('caption').value = state.caption;
  document.getElementById('subcaption').value = state.subcaption;
  render();
  if (shotMode === 'editor') markReady();
}
