import { A } from "./assets.js";

const tintCache = new Map();

function tinted(color) {
  if (tintCache.has(color)) return tintCache.get(color);
  const img = A.font.img;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  tintCache.set(color, c);
  return c;
}

export function textWidth(str, scale = 1) {
  const n = String(str).length;
  return n === 0 ? 0 : n * 6 * scale - scale;
}

function run(ctx, img, str, x, y, scale) {
  const { cw, ch, cols, chars } = A.font;
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < str.length; i++) {
    const idx = chars.indexOf(str[i]);
    if (idx < 0) continue;
    const sx = (idx % cols) * cw;
    const sy = Math.floor(idx / cols) * ch;
    ctx.drawImage(img, sx, sy, 5, 7, x + i * 6 * scale, y, 5 * scale, 7 * scale);
  }
}

export function text(ctx, str, x, y, opts = {}) {
  const { scale = 1, color = "#e3f4fb", align = "left", shadow = "#08141c" } = opts;
  const s = String(str).toUpperCase();
  const w = textWidth(s, scale);
  let dx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  dx = Math.round(dx);
  const dy = Math.round(y);
  if (shadow) run(ctx, tinted(shadow), s, dx + Math.max(1, scale), dy + Math.max(1, scale), scale);
  run(ctx, tinted(color), s, dx, dy, scale);
}

export function panel(ctx, x, y, w, h, opts = {}) {
  const {
    fill = "rgba(8,20,28,0.84)",
    border = "rgba(143,178,198,0.55)",
    accent = null,
  } = opts;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  if (accent) {
    ctx.fillStyle = accent;
    ctx.fillRect(x + 2, y + 2, w - 4, 1);
  }
}

export function bar(ctx, x, y, w, h, frac, color, bg = "rgba(0,0,0,0.45)") {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(w, Math.round(w * frac))), h);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x, y, Math.max(0, Math.min(w, Math.round(w * frac))), 1);
}

export function icon(ctx, kindIndex, x, y, scale = 1) {
  const s = A.sheets.icons;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s.img, kindIndex * s.fw, 0, s.fw, s.fh, Math.round(x), Math.round(y), s.fw * scale, s.fh * scale);
}
