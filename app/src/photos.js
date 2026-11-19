// Vice Cover — photos: upload, downscale, and the procedural demo scene.
// Photos live in memory only; nothing is ever sent anywhere.

const MAX_PHOTOS = 4;
const MAX_SIDE = 2048;

// Downscale a loaded image to a max side of 2048 px (keeps render fast;
// export sizes top out at 1920 px, so nothing is lost).
function downscaleImage(img) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (Math.max(iw, ih) <= MAX_SIDE) return img;
  const scale = MAX_SIDE / Math.max(iw, ih);
  const c = document.createElement('canvas');
  c.width = Math.round(iw * scale);
  c.height = Math.round(ih * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// Load one File into a photo entry. Rejects (with a message) on bad files.
function loadPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('Not an image file.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({
        id: 'p-' + (file.name || 'photo').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 24) + '-' + file.size,
        name: file.name || 'photo',
        image: downscaleImage(img),
        zoom: 1.05,
        offsetX: 0,
        offsetY: 0,
        demo: false,
      });
      img.onerror = () => reject(new Error('That file did not load as an image.'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---- demo scene -----------------------------------------------------------
// A fully procedural sunset-beach scene drawn with canvas paths — the default
// "photo" before the user uploads anything, and the fallback for empty panels.
// Same seed (7) every time, so the demo cover is pixel-identical on every run.

function makeDemoScene(themeKey, seed) {
  const theme = THEMES[themeKey] || THEMES.sunset;
  const W = 1200, H = 1500;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rect = { x: 0, y: 0, w: W, h: H };
  const rnd = mulberry32(seed);

  // Sky.
  ctx.fillStyle = skyGradient(ctx, rect, theme);
  ctx.fillRect(0, 0, W, H);
  // Retro sun with slits, upper-left so right-side crops stay sun-free.
  drawRetroSun(ctx, rect, 0.38, 0.28, 0.17, theme.sun, theme.sky[1]);
  // Soft clouds.
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  for (let i = 0; i < 4; i++) {
    const cx = 0.12 + rnd() * 0.76;
    const cy = 0.12 + rnd() * 0.22;
    const cw = 90 + rnd() * 160;
    ctx.beginPath();
    ctx.ellipse(cx * W, cy * H, cw, cw * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawBirds(ctx, rect, [[0.24, 0.14, 1], [0.36, 0.1, 0.8], [0.68, 0.18, 0.9]], theme.nearBlack);
  // Skyline on the horizon.
  drawSkyline(ctx, rect, 0.62, theme.nearBlack, '#FFD23F', seed + 11);
  // Water: sunset gradient + sun reflection streak.
  const water = ctx.createLinearGradient(0, H * 0.62, 0, H * 0.86);
  water.addColorStop(0, theme.water[0]);
  water.addColorStop(1, theme.water[1]);
  ctx.fillStyle = water;
  ctx.fillRect(0, H * 0.62, W, H * 0.24);
  ctx.fillStyle = 'rgba(255,210,63,0.55)';
  for (let i = 0; i < 14; i++) {
    const y = H * (0.64 + i * 0.015);
    const ww = (30 + rnd() * 120) * (1 + i * 0.12);
    ctx.fillRect(W * 0.38 - ww / 2, y, ww, 3 + rnd() * 3);
  }
  // Speedboat silhouette with a wake, mid-water.
  ctx.fillStyle = theme.nearBlack;
  ctx.beginPath();
  ctx.moveTo(W * 0.68, H * 0.74);
  ctx.lineTo(W * 0.86, H * 0.74);
  ctx.lineTo(W * 0.82, H * 0.765);
  ctx.lineTo(W * 0.71, H * 0.765);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(W * 0.76, H * 0.715, W * 0.02, H * 0.028);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W * 0.68, H * 0.765);
  ctx.lineTo(W * 0.56, H * 0.775);
  ctx.moveTo(W * 0.86, H * 0.765);
  ctx.lineTo(W * 0.95, H * 0.772);
  ctx.stroke();
  // Sand.
  const sand = ctx.createLinearGradient(0, H * 0.86, 0, H);
  sand.addColorStop(0, theme.sand[0]);
  sand.addColorStop(1, theme.sand[1]);
  ctx.fillStyle = sand;
  ctx.fillRect(0, H * 0.86, W, H * 0.14);
  // Two figures walking on the beach — the human anchor of the scene.
  drawFigure(ctx, rect, 0.36, 0.985, 0.21, theme.nearBlack);
  drawFigure(ctx, rect, 0.45, 0.99, 0.17, theme.nearBlack);
  // Framing palms.
  drawPalm(ctx, rect, 0.02, 1.02, 0.42, -0.5, theme.nearBlack);
  drawPalm(ctx, rect, 0.99, 1.02, 0.36, 0.6, theme.nearBlack);
  // Halftone in the sky for the retro-print feel.
  halftone(ctx, { x: 0, y: 0, w: W, h: H * 0.3 }, 'rgba(255,255,255,0.10)', 14, 2.5);
  return c;
}

function makeDemoPhoto(themeKey, seed) {
  return {
    id: 'demo',
    name: 'Demo scene',
    image: makeDemoScene(themeKey, seed),
    zoom: 1.0,
    offsetX: 0,
    offsetY: 0,
    demo: true,
  };
}
