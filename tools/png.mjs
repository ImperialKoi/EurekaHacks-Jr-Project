import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

export function hex(s) {
  const v = s.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

export const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const shade = (c, f) => [
  Math.max(0, Math.min(255, c[0] * f)),
  Math.max(0, Math.min(255, c[1] * f)),
  Math.max(0, Math.min(255, c[2] * f)),
];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

export class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
  }

  px(x, y, c, alpha = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (typeof c === "string") c = hex(c);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
    if (alpha >= 1) {
      d[i] = cl(c[0]);
      d[i + 1] = cl(c[1]);
      d[i + 2] = cl(c[2]);
      d[i + 3] = 255;
      return;
    }
    const a = Math.max(0, Math.min(1, alpha));
    const da = d[i + 3] / 255;
    const out = a + da * (1 - a);
    if (out <= 0) return;
    d[i] = cl((c[0] * a + d[i] * da * (1 - a)) / out);
    d[i + 1] = cl((c[1] * a + d[i + 1] * da * (1 - a)) / out);
    d[i + 2] = cl((c[2] * a + d[i + 2] * da * (1 - a)) / out);
    d[i + 3] = out * 255;
  }

  get(x, y) {
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  rect(x, y, w, h, c, a = 1) {
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) this.px(x + xx, y + yy, c, a);
  }

  hline(x, y, w, c, a = 1) {
    for (let i = 0; i < w; i++) this.px(x + i, y, c, a);
  }

  vline(x, y, h, c, a = 1) {
    for (let i = 0; i < h; i++) this.px(x, y + i, c, a);
  }

  ell(cx, cy, rx, ry, c, a = 1) {
    if (rx <= 0 || ry <= 0) return;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c, a);
      }
    }
  }

  ellRing(cx, cy, rx, ry, thick, c, a = 1) {
    const ro = 1;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        const inner = (rx - thick) / rx;
        const innerY = (ry - thick) / ry;
        const di = (x + 0.5 - cx) / (rx * inner);
        const dj = (y + 0.5 - cy) / (ry * innerY);
        if (d <= ro && di * di + dj * dj > 1) this.px(x, y, c, a);
      }
    }
  }

  ring(cx, cy, r, thick, c, a = 1) {
    this.ellRing(cx, cy, r, r, thick, c, a);
  }

  line(x0, y0, x1, y1, c, a = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      this.px(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  poly(pts, c, a = 1) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a1 = pts[i];
        const b1 = pts[(i + 1) % pts.length];
        if ((a1[1] <= y && b1[1] > y) || (b1[1] <= y && a1[1] > y)) {
          const t = (y - a1[1]) / (b1[1] - a1[1]);
          xs.push(a1[0] + t * (b1[0] - a1[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.floor(xs[i]); x <= Math.ceil(xs[i + 1]); x++) this.px(x, y, c, a);
      }
    }
  }

  // Vertical gradient with ordered dithering for a clean retro banding.
  gradV(x, y, w, h, top, bot, levels = 8) {
    const step = 255 / (levels - 1);
    for (let yy = 0; yy < h; yy++) {
      const t = h <= 1 ? 0 : yy / (h - 1);
      const col = mix(top, bot, t);
      for (let xx = 0; xx < w; xx++) {
        const d = BAYER[(yy & 3) * 4 + (xx & 3)];
        const q = (v) => Math.max(0, Math.min(255, Math.round(v)));
        this.px(x + xx, y + yy, [
          q(((col[0] / 255) * (levels - 1) + d) / (levels - 1) * 255),
          q(((col[1] / 255) * (levels - 1) + d) / (levels - 1) * 255),
          q(((col[2] / 255) * (levels - 1) + d) / (levels - 1) * 255),
        ]);
      }
    }
  }

  dither(x, y, w, h, c, prob) {
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++)
        if (((xx + yy) & 1) === 0 && Math.random() < prob) this.px(x + xx, y + yy, c);
  }

  checkers(x, y, w, h, c) {
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) if (((xx + yy) & 1) === 0) this.px(x + xx, y + yy, c);
  }

  outline(c) {
    const src = new Uint8Array(this.data);
    const alphaAt = (x, y) =>
      x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : src[(y * this.w + x) * 4 + 3];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (alphaAt(x, y) > 0) continue;
        if (
          alphaAt(x - 1, y) > 0 ||
          alphaAt(x + 1, y) > 0 ||
          alphaAt(x, y - 1) > 0 ||
          alphaAt(x, y + 1) > 0
        ) {
          const i = (y * this.w + x) * 4;
          this.data[i] = c[0];
          this.data[i + 1] = c[1];
          this.data[i + 2] = c[2];
          this.data[i + 3] = 255;
        }
      }
    }
    return this;
  }

  blit(src, ox, oy) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.data[i + 3] === 0) continue;
        const a = src.data[i + 3] / 255;
        this.px(
          ox + x,
          oy + y,
          [src.data[i], src.data[i + 1], src.data[i + 2]],
          a
        );
      }
    }
  }

  scale(n) {
    const out = new Canvas(this.w * n, this.h * n);
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) {
        const i = (Math.floor(y / n) * this.w + Math.floor(x / n)) * 4;
        const j = (y * out.w + x) * 4;
        out.data[j] = this.data[i];
        out.data[j + 1] = this.data[i + 1];
        out.data[j + 2] = this.data[i + 2];
        out.data[j + 3] = this.data[i + 3];
      }
    }
    return out;
  }

  save(path) {
    const { w, h } = this;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (w * 4 + 1)] = 0;
      for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = this.data[y * w * 4 + x];
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    const png = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, png);
    return png.length;
  }
}

export function writePNG(path, canvas) {
  return canvas.save(path);
}
