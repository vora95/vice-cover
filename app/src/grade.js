// Vice Cover — per-panel grade: sunset overlay, duotone, vignette, grain.
// Fixed order, fixed seed: the same panel always grades to the same pixels.

const TILE = 128;
const noiseTiles = new Map();

// Seeded noise tile (black/white speckle), generated once per seed and tiled.
function noiseTile(seed) {
  let tile = noiseTiles.get(seed);
  if (tile) return tile;
  const rnd = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  const g = c.getContext('2d');
  const img = g.createImageData(TILE, TILE);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseTiles.set(seed, c);
  return c;
}

// Grade a photo panel. Assumes the photo is already drawn, clipped to rect.
// intensity: 1.0 = hero strength, ~0.75 = satellite strength.
function applyGrade(ctx, rect, theme, intensity, retro, seed, panelIndex) {
  const { x, y, w, h } = rect;
  ctx.save();
  // 1. Sunset overlay, vertical, 'overlay' blend.
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, theme.gradeTop);
  grad.addColorStop(1, theme.gradeBottom);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = theme.gradeHero * intensity;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  // 2. Light duotone, 'soft-light'.
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.duotone;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // 3. Vignette: darkened edges.
  const vg = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.42,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(10,4,24,0)');
  vg.addColorStop(1, 'rgba(10,4,24,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);
  // 4. Film grain, seeded (panel index shifts the seed so panels differ).
  if (retro) {
    const tile = noiseTile(seed + panelIndex * 101);
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = pat;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
  // 5. White panel border + soft inner shadow.
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2, w * 0.007);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.strokeStyle = 'rgba(10,4,24,0.35)';
  ctx.lineWidth = Math.max(1, w * 0.003);
  ctx.strokeRect(x + w * 0.004, y + h * 0.004, w - w * 0.008, h - h * 0.008);
  ctx.restore();
}

// Halftone dots over a sky area: radius from the dot's row, fully
// deterministic from coordinates (no randomness at all).
function halftone(ctx, rect, color, spacing, maxR) {
  ctx.save();
  ctx.fillStyle = color;
  for (let gy = rect.y + spacing / 2; gy < rect.y + rect.h; gy += spacing) {
    const t = (gy - rect.y) / rect.h; // 0 top -> 1 bottom
    const r = maxR * (0.25 + 0.75 * t);
    for (let gx = rect.x + spacing / 2; gx < rect.x + rect.w; gx += spacing) {
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
