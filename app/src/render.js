// Vice Cover — cover renderer. One function draws the preview AND the export
// (same code, only the canvas size differs), so preview pixels == export pixels.

const TITLE_FONT = `'Arial Black', Impact, 'Helvetica Neue', Arial, sans-serif`;

// ---- geometry ------------------------------------------------------------

// Returns { title: rect|null, titleOverlay: bool, grid: rect, panels: [...] }.
// Each panel: { x, y, w, h, hero: bool, slot: number }.
function layoutFor(sizeKey, layout) {
  const { w: W, h: H } = SIZES[sizeKey];
  const m = Math.round(W * 0.022); // outer margin
  const g = Math.max(6, Math.round(W * 0.007)); // white gutter
  if (layout === 'hero-strip') return stripLayout(W, H, m, g);
  return gridLayout(W, H, m, g, sizeKey);
}

function gridLayout(W, H, m, g, sizeKey) {
  if (sizeKey === '1920x1080') {
    // Title block on the left, 4x2 grid on the right, hero 2x2 centre-left.
    const title = { x: m, y: H * 0.18, w: 400, h: H * 0.64 };
    const gx = 470, gy = 60, gw = W - 470 - m, gh = H - 120;
    const cw = (gw - 3 * g) / 4, ch = (gh - g) / 2;
    const cell = (c, r) => ({ x: gx + c * (cw + g), y: gy + r * (ch + g), w: cw, h: ch });
    const hero = { x: gx + cw + g, y: gy, w: cw * 2 + g, h: gh, hero: true, slot: -1 };
    const sats = [cell(0, 0), cell(3, 0), cell(0, 1), cell(3, 1)].map((p, i) => ({ ...p, hero: false, slot: i }));
    return { title, titleOverlay: false, grid: { x: gx, y: gy, w: gw, h: gh }, panels: [hero, ...sats] };
  }
  if (sizeKey === '1080x1080') {
    // Square: title overlays the top of the grid over a dark scrim.
    const gx = m, gy = m, gw = W - 2 * m, gh = H - 2 * m;
    const cw = (gw - 2 * g) / 3, ch = (gh - 2 * g) / 3;
    const cell = (c, r) => ({ x: gx + c * (cw + g), y: gy + r * (ch + g), w: cw, h: ch });
    const hero = { x: gx + cw + g, y: gy + ch + g, w: cw * 2 + g, h: ch * 2 + g, hero: true, slot: -1 };
    const sats = [cell(0, 0), cell(1, 0), cell(2, 0), cell(0, 1), cell(0, 2)].map((p, i) => ({ ...p, hero: false, slot: i }));
    const title = { x: m, y: m + 6, w: gw, h: ch * 0.92 };
    return { title, titleOverlay: true, grid: { x: gx, y: gy, w: gw, h: gh }, panels: [hero, ...sats] };
  }
  // Portrait 1080x1350 (default): separate title band, then a 3x3 grid.
  const title = { x: m, y: m, w: W - 2 * m, h: Math.round(H * 0.155) };
  const gx = m, gy = title.y + title.h + g * 2, gw = W - 2 * m, gh = H - gy - m;
  const cw = (gw - 2 * g) / 3, ch = (gh - 2 * g) / 3;
  const cell = (c, r) => ({ x: gx + c * (cw + g), y: gy + r * (ch + g), w: cw, h: ch });
  const hero = { x: gx + cw + g, y: gy + ch + g, w: cw * 2 + g, h: ch * 2 + g, hero: true, slot: -1 };
  const sats = [cell(0, 0), cell(1, 0), cell(2, 0), cell(0, 1), cell(0, 2)].map((p, i) => ({ ...p, hero: false, slot: i }));
  return { title, titleOverlay: false, grid: { x: gx, y: gy, w: gw, h: gh }, panels: [hero, ...sats] };
}

function stripLayout(W, H, m, g) {
  if (W > H) {
    // Landscape: title left, hero right-top, strip of 3 below the hero.
    const title = { x: m, y: H * 0.18, w: 400, h: H * 0.64 };
    const gx = 470, gy = 60, gw = W - 470 - m, gh = H - 120;
    const hero = { x: gx, y: gy, w: gw, h: gh * 0.62, hero: true, slot: -1 };
    const sw = (gw - 2 * g) / 3, sh = gh * 0.38 - g;
    const strip = [0, 1, 2].map((i) => ({ x: gx + i * (sw + g), y: gy + gh * 0.62 + g, w: sw, h: sh, hero: false, slot: i }));
    return { title, titleOverlay: false, grid: { x: gx, y: gy, w: gw, h: gh }, panels: [hero, ...strip] };
  }
  const title = { x: m, y: m, w: W - 2 * m, h: Math.round(H * 0.135) };
  const gx = m, gy = title.y + title.h + g * 2, gw = W - 2 * m, gh = H - gy - m;
  const hero = { x: gx, y: gy, w: gw, h: gh * 0.6, hero: true, slot: -1 };
  const sw = (gw - 2 * g) / 3, sh = gh * 0.4 - g;
  const strip = [0, 1, 2].map((i) => ({ x: gx + i * (sw + g), y: gy + gh * 0.6 + g, w: sw, h: sh, hero: false, slot: i }));
  return { title, titleOverlay: true, grid: { x: gx, y: gy, w: gw, h: gh }, panels: [hero, ...strip] };
}

// ---- photo drawing --------------------------------------------------------

const CROPS = [
  { zoom: 1.7, ox: 0, oy: -0.35 },
  { zoom: 1.8, ox: 0.55, oy: 0.7 }, // sun close-up, top-left of the scene
  { zoom: 2.0, ox: -0.85, oy: 0.35 }, // top-right sky, birds, skyline tops
  { zoom: 2.3, ox: 0.7, oy: -1 }, // figures + beach, bottom-left
  { zoom: 1.9, ox: -0.7, oy: -0.8 }, // boat + water, bottom-right
];

function drawPhotoCover(ctx, rect, img, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale, dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (ox * (dw - rect.w)) / 2;
  const dy = rect.y + (rect.h - dh) / 2 + (oy * (dh - rect.h)) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// ---- procedural art panels ------------------------------------------------

function drawArtPanel(ctx, rect, kind, theme, seed, retro) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = skyGradient(ctx, rect, theme);
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (kind === 'skyline') {
    drawRetroSun(ctx, rect, 0.68, 0.34, 0.3, theme.sun, theme.sky[1]);
    if (retro) halftone(ctx, { x: rect.x, y: rect.y, w: rect.w, h: rect.h * 0.55 }, 'rgba(255,255,255,0.16)', Math.max(7, rect.w * 0.03), Math.max(1, rect.w * 0.008));
    drawSkyline(ctx, rect, 0.86, theme.nearBlack, theme.accent2 === '#19E3D6' ? '#FFD23F' : theme.accent2, seed + 5);
    drawPalm(ctx, rect, 0.06, 1.02, 0.5, -0.5, theme.nearBlack);
    drawBirds(ctx, rect, [[0.3, 0.16, 1], [0.42, 0.1, 0.8]], theme.nearBlack);
  } else {
    // 'palm': two big palms, low sun, birds.
    drawRetroSun(ctx, rect, 0.5, 0.62, 0.26, theme.sun, theme.sky[2]);
    drawPalm(ctx, rect, 0.08, 1.02, 0.72, -0.6, theme.nearBlack);
    drawPalm(ctx, rect, 0.94, 1.02, 0.6, 0.7, theme.nearBlack);
    ctx.fillStyle = theme.nearBlack;
    ctx.fillRect(rect.x, rect.y + rect.h * 0.88, rect.w, rect.h * 0.12);
    drawBirds(ctx, rect, [[0.35, 0.18, 1], [0.5, 0.12, 0.8], [0.62, 0.22, 0.7]], theme.nearBlack);
  }
  ctx.restore();
  applyGrade(ctx, rect, theme, 0.55, retro, seed, 77);
}

// ---- title ----------------------------------------------------------------

function fitFont(ctx, text, maxW, startPx) {
  let px = startPx;
  ctx.font = `900 ${px}px ${TITLE_FONT}`;
  while (px > 12 && ctx.measureText(text).width > maxW) {
    px -= 2;
    ctx.font = `900 ${px}px ${TITLE_FONT}`;
  }
  return px;
}

function drawLetterSpaced(ctx, text, cx, y, spacing) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
}

function drawTitle(ctx, rect, theme, caption, subcaption, twoLines) {
  const cap = (caption || 'VICE CITY').toUpperCase().slice(0, 24);
  const sub = (subcaption || '').toUpperCase().slice(0, 40);
  const lines = twoLines ? cap.split(' ') : [cap];
  const lineH = rect.h / (lines.length + (sub ? 0.55 : 0.1));
  const titlePx = fitFont(ctx, lines.reduce((a, b) => (a.length > b.length ? a : b)), rect.w * 0.98, Math.floor(lineH * 0.92));
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // Sub-caption, letterspaced, above the title.
  if (sub) {
    const subPx = Math.max(10, Math.floor(titlePx * 0.22));
    ctx.font = `700 ${subPx}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.92;
    const cy = rect.y + subPx * 0.9;
    drawLetterSpaced(ctx, sub, rect.x + rect.w / 2, cy, subPx * 0.42);
    ctx.globalAlpha = 1;
  }
  // Title lines: hard magenta shadow, white outline, sunset gradient fill.
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  theme.title.forEach((c, i) => grad.addColorStop(i / (theme.title.length - 1), c));
  const top = rect.y + (sub ? titlePx * 0.42 : 0) + (titlePx * 0.62);
  lines.forEach((line, li) => {
    const y = top + li * titlePx * 1.04;
    ctx.font = `900 ${titlePx}px ${TITLE_FONT}`;
    const w = ctx.measureText(line).width;
    const x = rect.x + (rect.w - w) / 2;
    const sh = Math.max(2, titlePx * 0.045);
    ctx.fillStyle = theme.shadow;
    ctx.fillText(line, x + sh, y + sh);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, titlePx * 0.085);
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeText(line, x, y);
    ctx.fillStyle = grad;
    ctx.fillText(line, x, y);
  });
  ctx.restore();
}

// ---- main render ----------------------------------------------------------

function renderCover(ctx, W, H, state) {
  const theme = THEMES[state.theme] || THEMES.sunset;
  const sizeKey = state.size;
  const lay = layoutFor(sizeKey, state.layout);
  const seed = state.seed;

  // Background: deep theme gradient filling the whole cover.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, theme.bg);
  bg.addColorStop(1, theme.sky[3]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const isStrip = state.layout === 'hero-strip';
  const plan = isStrip ? planStripPanels(state) : planGridPanels(state);
  const photos = state.photos;

  // Panels first (title overlay draws over them where needed).
  for (const p of lay.panels) {
    const rect = { x: p.x, y: p.y, w: p.w, h: p.h };
    if (p.hero) {
      const hero = photos[0];
      if (hero && hero.image) {
        // In the wide strip hero a portrait scene would lose its sun to the
        // vertical centre crop; nudge the demo scene up so the sun stays whole.
        const oy = (isStrip && hero.demo) ? 0.5 : (hero.offsetY || 0);
        drawPhotoCover(ctx, rect, hero.image, hero.zoom || 1.05, hero.offsetX || 0, oy);
      } else {
        drawArtPanel(ctx, rect, 'skyline', theme, seed, state.retro);
      }
      applyGrade(ctx, rect, theme, 1.0, state.retro, seed, 0);
      // Palm silhouette in the hero corner, over the grade — in the theme's
      // own near-black so it stays a silhouette on every theme.
      ctx.save();
      ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
      ctx.globalAlpha = 0.85;
      drawPalm(ctx, { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, 0.03, 1.02, 0.34, -0.4, theme.nearBlack);
      ctx.restore();
      continue;
    }
    const slot = plan[p.slot];
    if (slot === 'art:skyline' || slot === 'art:palm') {
      drawArtPanel(ctx, rect, slot === 'art:skyline' ? 'skyline' : 'palm', theme, seed, state.retro);
    } else if (slot && typeof slot === 'object' && photos[slot.photo] && photos[slot.photo].image) {
      const crop = CROPS[slot.crop % CROPS.length];
      drawPhotoCover(ctx, rect, photos[slot.photo].image, crop.zoom, crop.ox, crop.oy);
      applyGrade(ctx, rect, theme, 0.75, state.retro, seed, p.slot + 1);
    } else if (photos[0] && photos[0].image) {
      const crop = CROPS[p.slot % CROPS.length];
      drawPhotoCover(ctx, rect, photos[0].image, crop.zoom, crop.ox, crop.oy);
      applyGrade(ctx, rect, theme, 0.75, state.retro, seed, p.slot + 1);
    } else {
      drawArtPanel(ctx, rect, p.slot % 2 === 0 ? 'skyline' : 'palm', theme, seed, state.retro);
    }
  }

  // Title: separate band, or overlay with a scrim.
  if (lay.titleOverlay) {
    const scrim = ctx.createLinearGradient(0, lay.title.y - 10, 0, lay.title.y + lay.title.h + 40);
    scrim.addColorStop(0, 'rgba(18,8,46,0.82)');
    scrim.addColorStop(1, 'rgba(18,8,46,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(lay.grid.x, lay.title.y - 10, lay.grid.w, lay.title.h + 50);
  }
  const twoLines = sizeKey === '1920x1080';
  drawTitle(ctx, lay.title, theme, state.caption, state.subcaption, twoLines);
}
