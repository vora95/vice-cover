// Vice Cover — procedural silhouettes, drawn from code only.
// Every coordinate is a fraction of the panel rect (0..1), so the same art
// renders identically at every export size. No assets, no downloads.

// Deterministic seeded PRNG (mulberry32). Render paths never use unseeded randomness.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One palm: curved trunk + 7 arched fronds. (x, y) = base of trunk in rect
// fractions, h = trunk height as a fraction of rect height, lean = -1..1.
function drawPalm(ctx, rect, x, y, h, lean, color) {
  const X = (fx) => rect.x + fx * rect.w;
  const Y = (fy) => rect.y + fy * rect.h;
  const s = Math.min(rect.w, rect.h);
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  // Trunk: quadratic curve leaning with `lean`.
  const topX = x + lean * 0.16;
  const topY = y - h;
  ctx.lineWidth = Math.max(1.5, s * 0.016);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(x), Y(y));
  ctx.quadraticCurveTo(X(x + lean * 0.05), Y(y - h * 0.55), X(topX), Y(topY));
  ctx.stroke();
  // Fronds: 7 arcs fanning from the crown.
  const frondLen = h * 0.52;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84); // fan across the top
    const dx = Math.cos(a) * frondLen;
    const dy = -Math.abs(Math.sin(a)) * frondLen * 0.55 - frondLen * 0.12;
    const cx = X(topX) + dx * 0.55;
    const cy = Y(topY) + dy * 0.45 - s * 0.02;
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(X(topX), Y(topY));
    ctx.quadraticCurveTo(cx, cy, X(topX) + dx, Y(topY) + dy + s * 0.05);
    ctx.stroke();
  }
  // Coconuts: two small dots under the crown.
  ctx.beginPath();
  ctx.arc(X(topX) - s * 0.012, Y(topY) + s * 0.012, s * 0.011, 0, Math.PI * 2);
  ctx.arc(X(topX) + s * 0.014, Y(topY) + s * 0.016, s * 0.01, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Skyline: a row of dark buildings with seeded lit windows along the bottom
// of the rect. baseY = horizon as a fraction of rect height.
function drawSkyline(ctx, rect, baseY, color, windowColor, seed) {
  const rnd = mulberry32(seed);
  const X = (fx) => rect.x + fx * rect.w;
  const Y = (fy) => rect.y + fy * rect.h;
  ctx.save();
  ctx.fillStyle = color;
  let x = 0;
  while (x < 1) {
    const bw = 0.06 + rnd() * 0.09;
    const bh = 0.08 + rnd() * 0.17;
    const bx = x;
    ctx.fillRect(X(bx), Y(baseY - bh), bw * rect.w, bh * rect.h);
    // Antenna on a few towers.
    if (rnd() > 0.72) {
      ctx.fillRect(X(bx + bw * 0.45), Y(baseY - bh - 0.05), rect.w * 0.006, rect.h * 0.05);
    }
    // Lit windows, seeded.
    ctx.fillStyle = windowColor;
    const cols = Math.max(1, Math.floor(bw * 14));
    const rows = Math.max(1, Math.floor(bh * 10));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() > 0.62) {
          ctx.fillRect(
            X(bx + 0.012 + (c + 0.15) * (bw / cols)),
            Y(baseY - bh + 0.015 + (r + 0.2) * (bh / rows)),
            Math.max(1, rect.w * 0.006),
            Math.max(1, rect.h * 0.01),
          );
        }
      }
    }
    ctx.fillStyle = color;
    x += bw + 0.004;
  }
  ctx.restore();
}

// Retro sun: big disc with horizontal slits cut through its lower half.
function drawRetroSun(ctx, rect, cx, cy, r, colors, bgColor) {
  const X = (fx) => rect.x + fx * rect.w;
  const Y = (fy) => rect.y + fy * rect.h;
  const R = r * Math.min(rect.w, rect.h);
  ctx.save();
  const g = ctx.createLinearGradient(0, Y(cy) - R, 0, Y(cy) + R);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(X(cx), Y(cy), R, 0, Math.PI * 2);
  ctx.fill();
  // Slits: bands of the sky colour, widening toward the bottom.
  ctx.fillStyle = bgColor;
  const slits = 5;
  for (let i = 0; i < slits; i++) {
    const fy = cy + (i / slits) * r * 0.9 + r * 0.08;
    const half = Math.sqrt(Math.max(0, r * r - (fy - cy) * (fy - cy))) * Math.min(rect.w, rect.h);
    const thick = (2 + i * 2.2) * (Math.min(rect.w, rect.h) / 300);
    ctx.fillRect(X(cx) - half, Y(fy) - thick / 2, half * 2, thick);
  }
  ctx.restore();
}

// Gulls: pairs of curved strokes.
function drawBirds(ctx, rect, positions, color) {
  const X = (fx) => rect.x + fx * rect.w;
  const Y = (fy) => rect.y + fy * rect.h;
  const s = Math.min(rect.w, rect.h);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.006);
  ctx.lineCap = 'round';
  for (const [bx, by, bs] of positions) {
    const w = bs * s * 0.05;
    const h = bs * s * 0.018;
    ctx.beginPath();
    ctx.moveTo(X(bx) - w, Y(by));
    ctx.quadraticCurveTo(X(bx) - w * 0.4, Y(by) - h, X(bx), Y(by));
    ctx.quadraticCurveTo(X(bx) + w * 0.4, Y(by) - h, X(bx) + w, Y(by));
    ctx.stroke();
  }
  ctx.restore();
}

// A small walking figure silhouette (head + body + legs), for the demo beach.
function drawFigure(ctx, rect, x, y, h, color) {
  const X = (fx) => rect.x + fx * rect.w;
  const Y = (fy) => rect.y + fy * rect.h;
  const s = Math.min(rect.w, rect.h);
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.012);
  ctx.lineCap = 'round';
  // Head.
  ctx.beginPath();
  ctx.arc(X(x), Y(y - h * 0.86), h * s * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.beginPath();
  ctx.moveTo(X(x), Y(y - h * 0.76));
  ctx.lineTo(X(x + 0.01), Y(y - h * 0.42));
  ctx.stroke();
  // Legs, mid-stride.
  ctx.beginPath();
  ctx.moveTo(X(x + 0.01), Y(y - h * 0.42));
  ctx.lineTo(X(x - 0.03), Y(y));
  ctx.moveTo(X(x + 0.01), Y(y - h * 0.42));
  ctx.lineTo(X(x + 0.045), Y(y - h * 0.02));
  ctx.stroke();
  // Arms.
  ctx.beginPath();
  ctx.moveTo(X(x), Y(y - h * 0.68));
  ctx.lineTo(X(x - 0.035), Y(y - h * 0.5));
  ctx.moveTo(X(x), Y(y - h * 0.68));
  ctx.lineTo(X(x + 0.035), Y(y - h * 0.52));
  ctx.stroke();
  ctx.restore();
}

// Vertical sky gradient for a rect, from a theme's sky stops.
function skyGradient(ctx, rect, theme) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  theme.sky.forEach((c, i) => g.addColorStop(theme.skyStops[i], c));
  return g;
}
