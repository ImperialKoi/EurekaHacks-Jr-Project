const MANIFEST_URL = "/assets/atlas.json";

export const A = {
  sheets: {},
  font: null,
  bgs: [],
  floes: [],
  surface: 100,
  world: { w: 960, h: 270 },
  ready: false,
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load " + src));
    img.src = src;
  });
}

export async function loadAssets() {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error("Could not load atlas.json (" + res.status + ")");
  const man = await res.json();

  const sheets = await Promise.all(
    Object.entries(man.sheets).map(async ([key, spec]) => [
      key,
      { ...spec, img: await loadImage("/assets/" + spec.file) },
    ])
  );
  A.sheets = Object.fromEntries(sheets);
  A.bgs = await Promise.all(man.backgrounds.map((f) => loadImage("/assets/" + f)));
  A.floes = await Promise.all(
    man.floes.map(async (f) => ({ ...f, img: await loadImage("/assets/" + f.file) }))
  );
  A.font = { ...man.font, img: await loadImage("/assets/" + man.font.file) };
  A.surface = man.surface;
  A.world = man.world;
  A.ready = true;
}

export function drawFrame(ctx, name, index, x, y, flip = false) {
  const s = A.sheets[name];
  const col = index % s.cols;
  const row = Math.floor(index / s.cols);
  if (!flip) {
    ctx.drawImage(s.img, col * s.fw, row * s.fh, s.fw, s.fh, Math.round(x), Math.round(y), s.fw, s.fh);
  } else {
    ctx.save();
    ctx.translate(Math.round(x) + s.fw, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(s.img, col * s.fw, row * s.fh, s.fw, s.fh, 0, 0, s.fw, s.fh);
    ctx.restore();
  }
}

export function drawFrameScaled(ctx, name, index, cx, cy, scale, flip = false) {
  const s = A.sheets[name];
  const col = index % s.cols;
  const row = Math.floor(index / s.cols);
  const w = s.fw * scale;
  const h = s.fh * scale;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(s.img, col * s.fw, row * s.fh, s.fw, s.fh, -w / 2, -h / 2, w, h);
  ctx.restore();
}
