// Generates every pixel-art asset used by THIN ICE.
// Run with: npm run assets
import { Canvas, hex, mix, shade } from "./png.mjs";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const OUT = "public/assets";
const PREVIEW = "tools/preview";
const SURFACE = 100;
const W = 960;
const H = 270;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIEW, { recursive: true });

const rngFrom = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const INK = hex("#0b1620");
const WHITE = hex("#ffffff");
const P = {
  sealBody: hex("#4a5b67"),
  sealLight: hex("#627888"),
  sealBelly: hex("#d3e4ea"),
  sealSpot: hex("#3a4852"),
  sealMuzzle: hex("#93aab6"),
  wood: hex("#7d5734"),
  woodDark: hex("#54371d"),
  woodLight: hex("#ad7f48"),
  coat: hex("#d9a33f"),
  coatDark: hex("#a87a27"),
  skin: hex("#e8bb92"),
  hat: hex("#c8503c"),
  hatDark: hex("#8f3527"),
  beard: hex("#4b4740"),
  metal: hex("#586b75"),
  metalLight: hex("#93a9b3"),
  fishSilver: hex("#a9c3cd"),
  fishSilverLight: hex("#e3f1f6"),
  fishOrange: hex("#d97b4c"),
  fishYellow: hex("#d6bf55"),
  iceTop: hex("#f2fbff"),
  iceMid: hex("#c3dde8"),
  iceDeep: hex("#8fb3c4"),
  iceEdge: hex("#5c8497"),
  iceShadow: hex("#3f6c80"),
  net: hex("#c9a86b"),
  netDark: hex("#8a6f42"),
  fire: hex("#f0763a"),
  spark: hex("#ffd66b"),
};

// ---------------------------------------------------------------- seal
const SEAL_W = 32;
const SEAL_H = 24;

function sealCell(pose) {
  const c = new Canvas(SEAL_W, SEAL_H);
  const bob = pose.bob || 0;
  const tail = pose.tail || 0;
  const flip = pose.flip || 0;
  const cy = 13 + bob;
  const cx = 13;

  // tail flukes
  c.poly(
    [
      [6, cy + 1],
      [1.5, cy - 4 + tail],
      [3.5, cy + 2],
    ],
    P.sealLight
  );
  c.poly(
    [
      [6, cy + 2],
      [1.5, cy + 8 - tail],
      [3.5, cy + 3],
    ],
    P.sealBody
  );

  // body
  c.ell(cx, cy, 10, 5.0, P.sealBody);
  c.ell(cx - 0.5, cy - 1.6, 8.8, 2.9, P.sealLight);
  c.ell(cx - 0.8, cy + 2.6, 8.0, 2.6, P.sealBelly);
  c.ell(cx - 1.2, cy + 2.1, 6.4, 1.3, mix(P.sealBelly, WHITE, 0.65));
  // belly furrows
  c.px(cx - 5, cy + 2.4, mix(P.sealBelly, P.sealLight, 0.55));
  c.px(cx - 3, cy + 2.9, mix(P.sealBelly, P.sealLight, 0.55));
  c.px(cx - 1, cy + 3.1, mix(P.sealBelly, P.sealLight, 0.55));
  // spots
  c.px(9, cy - 2, P.sealSpot);
  c.px(10, cy - 2, P.sealSpot);
  c.px(12, cy - 3, P.sealSpot);
  c.px(7, cy - 1, P.sealSpot);
  c.px(14, cy - 2, P.sealSpot);
  c.px(16, cy - 1, P.sealSpot);

  // neck + raised head
  c.ell(19.6, cy - 1.6, 3.8, 3.6, P.sealBody);
  const hx = 22.6;
  const hy = cy - 3.2;
  c.ell(hx, hy, 4.6, 4.0, P.sealBody);
  c.ell(hx - 0.3, hy - 1.4, 3.7, 2.3, P.sealLight);
  c.px(hx - 2, hy - 3.6, P.sealLight);
  // muzzle
  c.ell(hx + 3.2, hy + 1.3, 2.0, 1.7, P.sealMuzzle);
  c.ell(hx + 4.1, hy + 1.0, 1.3, 1.1, mix(P.sealMuzzle, WHITE, 0.4));
  c.px(hx - 1.5, hy - 2.6, P.sealSpot);
  // nose
  c.px(hx + 5.3, hy + 0.7, INK);
  c.px(hx + 5.3, hy + 1.5, INK);
  c.px(hx + 4.6, hy + 1.1, INK);
  // eye
  if (pose.hurt) {
    c.line(hx + 0.4, hy - 1.2, hx + 1.8, hy + 0.2, INK);
    c.line(hx + 0.4, hy + 0.2, hx + 1.8, hy - 1.2, INK);
  } else {
    c.px(hx + 0.4, hy - 0.6, INK);
    c.px(hx + 1.3, hy - 0.6, INK);
    c.px(hx + 0.4, hy + 0.3, INK);
    c.px(hx + 1.3, hy + 0.3, INK);
    c.px(hx + 0.2, hy - 1.2, WHITE);
  }
  // whiskers + mouth
  c.px(hx + 4.0, hy + 2.5, P.sealMuzzle);
  c.px(hx + 4.9, hy + 3.1, P.sealMuzzle);
  c.line(hx + 2.6, hy + 2.6, hx + 3.8, hy + 2.9, mix(P.sealMuzzle, INK, 0.35));

  // flippers
  c.ell(9, cy + 4.4, 2.8, 1.3, P.sealBody);
  c.ell(16.2, cy + 4.7 - flip, 3.8, 1.6, P.sealBody);
  c.ell(16.2, cy + 4.4 - flip, 2.8, 1.0, P.sealLight);
  c.px(18.6, cy + 5.2 - flip, P.sealBelly);
  c.px(18.0, cy + 5.4 - flip, P.sealBelly);

  if (pose.hurt) {
    c.px(25.5, cy - 7.5, P.sealBelly);
    c.px(27.5, cy - 6.6, P.sealBelly);
    c.px(26.5, cy - 8.6, P.sealBelly);
  }
  c.outline(INK);
  return c;
}

function makeSealSheet() {
  const poses = [
    { bob: 0, tail: 0, flip: 0 },
    { bob: -1, tail: -1, flip: -1 },
    { bob: 0, tail: 1, flip: 1 },
    { bob: 1, tail: 0, flip: 2 },
    { bob: -2, tail: -2, flip: 1 },
    { bob: 0, tail: 0, flip: 0, hurt: true },
  ];
  const sheet = new Canvas(SEAL_W * poses.length, SEAL_H);
  poses.forEach((p, i) => sheet.blit(sealCell(p), i * SEAL_W, 0));
  return sheet;
}

// ---------------------------------------------------------------- boat
const BOAT_W = 46;
const BOAT_H = 36;

function boatCell(pose) {
  const c = new Canvas(BOAT_W, BOAT_H);
  const y = pose.bob || 0;

  const hull = [
    [4, 25 + y],
    [13, 21 + y],
    [34, 21 + y],
    [42, 25 + y],
    [37, 32 + y],
    [12, 33 + y],
    [5, 30 + y],
  ];
  c.poly(hull, P.woodDark);
  c.poly(
    [
      [5, 23 + y],
      [13, 20 + y],
      [34, 20 + y],
      [41, 24 + y],
      [36, 30 + y],
      [12, 31 + y],
      [6, 28 + y],
    ],
    P.wood
  );
  c.rect(9, 21 + y, 25, 3, P.woodDark);
  c.hline(9, 21 + y, 25, P.woodLight);
  c.hline(9, 26 + y, 25, mix(P.woodDark, INK, 0.35));
  c.hline(10, 28 + y, 23, mix(P.woodDark, INK, 0.35));
  c.line(36, 21 + y, 40, 25 + y, P.woodLight);
  c.line(40, 25 + y, 36, 29 + y, P.wood);
  c.px(41, 24 + y, P.woodLight);

  if (!pose.aim) {
    const ang = pose.oar === undefined ? 0 : pose.oar;
    const ox = 18 + ang;
    c.line(17, 18 + y, ox - 4, 28 + y, P.woodLight);
    c.ell(ox - 6, 30 + y, 3.4, 1.6, P.wood);
    c.ell(ox - 6, 30 + y, 1.5, 0.7, P.woodDark);
  }

  const lean = pose.hurt ? -2 : 0;
  const fx = 24 + lean;
  c.rect(fx - 4, 18 + y, 3, 4, P.coatDark);
  c.rect(fx + 1, 18 + y, 3, 4, P.coatDark);
  c.rect(fx - 5, 11 + y, 10, 8, P.coat);
  c.ell(fx, 11 + y, 5.2, 2.6, P.coat);
  c.vline(fx - 2, 12 + y, 6, P.coatDark);
  c.vline(fx + 2, 12 + y, 6, P.coatDark);
  c.px(fx, 12 + y, P.coatDark);
  c.hline(fx - 2, 11 + y, 5, P.coatDark);
  // head
  c.ell(fx, 7.4 + y, 3.2, 3.2, P.skin);
  c.ell(fx - 1, 6.4 + y, 2.2, 1.6, P.skin);
  c.rect(fx - 3, 8.4 + y, 6, 2, P.beard);
  c.px(fx - 3, 8 + y, P.beard);
  c.px(fx - 2, 8 + y, P.beard);
  c.px(fx + 1, 6, INK);
  c.px(fx + 2, 6, INK);
  if (pose.hurt) {
    c.px(fx + 1, 6, P.skin);
    c.px(fx + 2, 6, P.skin);
    c.line(fx + 1, 5, fx + 2, 6, INK);
    c.line(fx + 1, 6, fx + 2, 5, INK);
  }
  // beanie
  c.ell(fx, 4.2 + y, 3.6, 2.2, P.hat);
  c.rect(fx - 4, 4.8 + y, 8, 1, P.hatDark);
  c.px(fx, 2.2 + y, P.hat);
  c.px(fx + 1, 2.2 + y, P.hatDark);

  if (pose.aim) {
    c.line(fx + 2, 12 + y, fx + 6, 13 + y, P.coat);
    c.line(fx + 4, 13 + y, fx + 8, 13 + y, P.coatDark);
    c.rect(fx + 7, 12 + y, 12, 3, P.metal);
    c.hline(fx + 7, 12 + y, 12, P.metalLight);
    c.px(fx + 18, 13 + y, P.metalLight);
    c.rect(fx + 8, 15 + y, 2, 2, P.woodDark);
  } else if (pose.throw) {
    c.line(fx + 2, 12 + y, fx + 5, 7 + y, P.coat);
    c.line(fx + 5, 7 + y, fx + 6, 4 + y, P.coatDark);
    c.px(fx + 6, 3 + y, P.skin);
  } else if (pose.hurt) {
    c.line(fx - 3, 12 + y, fx - 7, 8 + y, P.coat);
    c.line(fx + 4, 12 + y, fx + 8, 8 + y, P.coat);
    c.px(fx - 8, 7 + y, P.skin);
    c.px(fx + 9, 7 + y, P.skin);
  } else {
    c.line(fx + 3, 12 + y, fx + 6, 15 + y, P.coat);
    c.px(fx + 6, 16 + y, P.skin);
    c.line(fx - 3, 12 + y, fx - 6, 15 + y, P.coat);
  }

  c.outline(INK);
  return c;
}

function makeBoatSheet() {
  const poses = [
    { bob: 0 },
    { bob: 1 },
    { oar: -3, bob: 0 },
    { oar: 4, bob: -1 },
    { aim: true, bob: 0 },
    { throw: true, bob: -1 },
    { hurt: true, bob: 1 },
  ];
  const sheet = new Canvas(BOAT_W * poses.length, BOAT_H);
  poses.forEach((p, i) => sheet.blit(boatCell(p), i * BOAT_W, 0));
  return sheet;
}

// ---------------------------------------------------------------- orca
const ORCA_W = 76;
const ORCA_H = 40;

function orcaCell(pose) {
  const c = new Canvas(ORCA_W, ORCA_H);
  const black = hex("#1c2a36");
  const blackLight = hex("#2d4150");
  const belly = hex("#dcebf1");
  const white = hex("#f2fcff");
  const cy = 24;
  const tail = pose.tail || 0;

  // tail flukes
  c.poly(
    [
      [14, cy - 1],
      [2, cy - 9 + tail * 3],
      [10, cy + 1],
    ],
    black
  );
  c.poly(
    [
      [14, cy + 2],
      [3, cy + 9 - tail * 3],
      [11, cy + 2],
    ],
    blackLight
  );

  // body and head
  c.ell(38, cy, 26, 8.8, black);
  c.ell(58, cy + 0.5, 14, 8.2, black);
  c.ell(68, cy + 2.5, 5.5, 3.6, black);
  // back highlight
  c.ell(37, cy - 2.6, 23, 4.0, blackLight);
  c.ell(57, cy - 2.2, 12, 3.0, blackLight);
  // white belly
  c.ell(44, cy + 6.4, 20, 3.0, belly);
  c.ell(62, cy + 6.2, 8, 2.4, belly);

  // dorsal fin
  c.poly(
    [
      [33, cy - 5],
      [40, cy - 21],
      [47, cy - 5],
    ],
    black
  );
  c.poly(
    [
      [38, cy - 8],
      [41, cy - 19],
      [43, cy - 8],
    ],
    blackLight
  );
  // pectoral fin
  c.ell(50, cy + 7.5, 8, 2.6, black);
  c.ell(52, cy + 8, 5, 1.4, blackLight);
  // saddle patch
  c.ell(46, cy - 3.5, 7, 2.2, hex("#4d636f"), 0.7);

  // white eye patch
  c.ell(58.5, cy - 2.4, 5.4, 2.0, white);
  c.ell(61, cy - 1.5, 3.0, 1.5, white);
  c.px(61, cy + 0.6, INK);
  c.px(62, cy + 0.6, INK);

  if (pose.open) {
    c.poly(
      [
        [67, cy + 2.6],
        [73, cy + 3.6],
        [66, cy + 5.6],
      ],
      hex("#3a1f22")
    );
    c.px(68, cy + 3.4, white);
    c.px(70, cy + 3.8, white);
  } else {
    c.line(64, cy + 4.5, 70, cy + 4.1, mix(black, INK, 0.55));
  }
  c.px(30, cy + 2, blackLight);
  c.outline(hex("#081019"));
  return c;
}

function makeOrcaSheet() {
  const poses = [{ tail: 0 }, { tail: -2 }, { tail: 2 }, { tail: -1, open: true }];
  const sheet = new Canvas(ORCA_W * poses.length, ORCA_H);
  poses.forEach((p, i) => sheet.blit(orcaCell(p), i * ORCA_W, 0));
  return sheet;
}

// ---------------------------------------------------------------- marine debris
const DEBRIS_W = 26;
const DEBRIS_H = 22;

function debrisCell(kind) {
  const c = new Canvas(DEBRIS_W, DEBRIS_H);
  if (kind === 0) {
    // ghost net tangle
    const rope = hex("#c9b591");
    const ropeDark = hex("#8f7c58");
    c.ellRing(12, 12, 9, 7, 1.4, rope, 0.95);
    for (let i = 0; i < 4; i++) c.line(6 + i * 4, 6, 4 + i * 4, 18, ropeDark, 0.7);
    for (let y = 7; y < 18; y += 4) c.line(5, y, 20, y + 1, ropeDark, 0.6);
    c.ell(17, 5, 2.6, 2.6, hex("#e2604a"));
    c.px(17, 3.4, hex("#f39a83"));
  } else if (kind === 1) {
    // six pack rings
    const plastic = hex("#cfe6ee");
    c.ellRing(8, 9, 5, 4, 1.4, plastic);
    c.ellRing(16, 8, 5, 4, 1.4, plastic);
    c.ellRing(12, 15, 5, 4, 1.4, plastic);
    c.px(8, 5, WHITE);
    c.px(16, 4, WHITE);
  } else {
    // torn net with a float
    const net = hex("#b8a887");
    const netDark = hex("#7f7154");
    c.rect(4, 6, 18, 10, net, 0.35);
    for (let x = 4; x <= 22; x += 3) c.vline(x, 6 + (x % 2), 10, netDark, 0.8);
    for (let y = 6; y <= 16; y += 3) c.hline(4, y, 19, netDark, 0.8);
    c.ell(20, 4, 3, 2.4, hex("#dce8ee"));
    c.px(6, 18, netDark);
    c.px(9, 19, netDark);
    c.px(13, 17, netDark);
  }
  c.outline(mix(INK, hex("#4a5b67"), 0.2));
  return c;
}

function makeDebrisSheet() {
  const sheet = new Canvas(DEBRIS_W * 3, DEBRIS_H);
  for (let i = 0; i < 3; i++) sheet.blit(debrisCell(i), i * DEBRIS_W, 0);
  return sheet;
}

// ---------------------------------------------------------------- ice shards
const SHARD_W = 20;
const SHARD_H = 20;

function shardCell(i) {
  const c = new Canvas(SHARD_W, SHARD_H);
  const top = hex("#eaf8fd");
  const mid = hex("#bcd8e6");
  const low = hex("#7fa9bf");
  const shapes = [
    [
      [4, 2],
      [14, 4],
      [17, 12],
      [10, 18],
      [3, 13],
    ],
    [
      [6, 1],
      [16, 7],
      [13, 17],
      [4, 15],
    ],
    [
      [2, 6],
      [12, 2],
      [18, 10],
      [9, 17],
      [3, 14],
    ],
  ];
  const pts = shapes[i % 3];
  c.poly(pts, mid);
  c.poly(
    pts.slice(0, 3).map(([x, y]) => [x, y - 1]),
    top
  );
  c.line(5, 6, 11, 15, low);
  c.line(12, 7, 8, 14, low, 0.6);
  c.outline(hex("#4a7386"));
  return c;
}

function makeShardSheet() {
  const sheet = new Canvas(SHARD_W * 3, SHARD_H);
  for (let i = 0; i < 3; i++) sheet.blit(shardCell(i), i * SHARD_W, 0);
  return sheet;
}

// ---------------------------------------------------------------- fish
const FISH_W = 14;
const FISH_H = 10;
const fishPalettes = [
  [P.fishSilver, P.fishSilverLight],
  [P.fishOrange, hex("#f0b48a")],
  [P.fishYellow, hex("#f0e6a8")],
];

function fishCell(variant, frame) {
  const c = new Canvas(FISH_W, FISH_H);
  const [body, light] = fishPalettes[variant];
  const t = frame === 0 ? 0 : 1;
  c.poly(
    [
      [4.5, 5],
      [0.5, 2 + t],
      [1.5, 5],
      [0.5, 8 - t],
    ],
    body
  );
  c.ell(1.5, 5, 1.4, 1.4, body);
  c.ell(7.5, 5, 4.6, 2.7, body);
  c.ell(7.5, 5.9, 4.0, 1.7, light);
  c.ell(7.8, 3.9, 3.4, 1.2, mix(body, WHITE, 0.25));
  c.px(7, 2.2, light);
  c.px(8, 2.2, light);
  c.px(7.6, 7.8, mix(body, INK, 0.2));
  c.px(8.6, 7.6, mix(body, INK, 0.2));
  c.px(10.5, 4.4, INK);
  c.px(10.9, 4.2, WHITE);
  c.px(12.2, 5.4, mix(body, INK, 0.35));
  c.outline(INK);
  return c;
}

function makeFishSheet() {
  const sheet = new Canvas(FISH_W * 6, FISH_H);
  for (let v = 0; v < 3; v++)
    for (let f = 0; f < 2; f++) sheet.blit(fishCell(v, f), (v * 2 + f) * FISH_W, 0);
  return sheet;
}

// ---------------------------------------------------------------- icons
const ICON = 10;

function iconCell(kind) {
  const c = new Canvas(ICON, ICON);
  if (kind === "heart") {
    c.ell(3, 3.4, 2.6, 2.4, hex("#e2604a"));
    c.ell(6.6, 3.4, 2.6, 2.4, hex("#e2604a"));
    c.poly(
      [
        [0.6, 4],
        [9.4, 4],
        [5, 9],
      ],
      hex("#e2604a")
    );
    c.px(3, 2.6, hex("#f39a83"));
    c.px(2.4, 3.4, hex("#f39a83"));
  } else if (kind === "spear") {
    c.line(1, 8.5, 7.5, 2, P.woodLight);
    c.line(2, 9, 8.5, 2.5, P.woodDark);
    c.poly(
      [
        [8, 0.5],
        [9.6, 2.4],
        [6.6, 3.4],
      ],
      P.metalLight
    );
    c.px(8.4, 1.6, P.metal);
    c.line(0.5, 9.4, 3, 7, P.net);
  } else if (kind === "bomb") {
    c.ell(5, 6, 3.6, 3.4, hex("#26313a"));
    c.ell(3.8, 4.4, 1.4, 1.2, hex("#4a5b67"));
    c.px(6.5, 2.4, P.wood);
    c.px(7.2, 1.6, P.wood);
    c.px(7.8, 0.9, P.fire);
    c.px(7.2, 0.6, P.spark);
    c.rect(4, 5, 4, 1, hex("#26313a"));
  } else if (kind === "net") {
    c.vline(2, 2, 7, P.net);
    c.vline(7, 2, 7, P.net);
    for (let y = 2; y < 9; y += 2) c.hline(2, y, 6, P.netDark);
    for (let x = 2; x < 8; x += 2) c.vline(x, 2, 7, P.netDark);
    c.ell(4.5, 0.8, 2.4, 1.4, hex("#dce8ee"));
  } else if (kind === "bait") {
    c.ell(5.5, 6, 3, 2, P.fishSilver);
    c.poly(
      [
        [2.6, 6],
        [0.6, 4.4],
        [0.8, 7.6],
      ],
      P.fishSilver
    );
    c.px(7.4, 5.4, INK);
    c.line(5, 4.6, 5, 1.4, P.metalLight);
    c.line(5, 1.4, 7.4, 1.4, P.metalLight);
  } else if (kind === "fish") {
    c.ell(4.4, 5.6, 3, 2, P.fishSilver);
    c.poly(
      [
        [1.6, 5.6],
        [0.2, 3.8],
        [0.4, 7.4],
      ],
      P.fishSilver
    );
    c.ell(4.6, 6.2, 2, 0.9, P.fishSilverLight);
    c.px(6, 5, INK);
  } else if (kind === "clock") {
    c.ring(5, 5, 4.4, 1.2, hex("#dce8ee"));
    c.vline(5, 2.4, 3, hex("#dce8ee"));
    c.hline(5, 5, 2.4, hex("#dce8ee"));
    c.px(5, 5, P.hat);
  } else if (kind === "star") {
    c.poly(
      [
        [5, 0.4],
        [6.2, 3.6],
        [9.6, 3.8],
        [7, 6],
        [7.9, 9.4],
        [5, 7.4],
        [2.1, 9.4],
        [3, 6],
        [0.4, 3.8],
        [3.8, 3.6],
      ],
      hex("#f2c14e")
    );
    c.px(5, 4, hex("#fdf0c4"));
  } else if (kind === "splash") {
    c.ell(5, 8.4, 3.4, 1.4, hex("#9fd4e6"));
    c.px(2, 5, hex("#dce8ee"));
    c.px(4, 3.4, hex("#dce8ee"));
    c.px(5.5, 1.8, hex("#dce8ee"));
    c.px(7, 3.6, hex("#dce8ee"));
    c.px(8.4, 5.4, hex("#dce8ee"));
    c.px(3, 7, hex("#8fb2c2"));
    c.px(6.6, 7, hex("#8fb2c2"));
  } else if (kind === "dash") {
    c.ell(6, 5, 3, 3.4, hex("#9fd4e6"));
    c.px(7, 4, INK);
    c.line(0.4, 3, 2.4, 3, hex("#8fb2c2"));
    c.line(0.2, 5, 2, 5, hex("#8fb2c2"));
    c.line(0.8, 7, 2.6, 7, hex("#8fb2c2"));
  }
  c.outline(INK);
  return c;
}

function makeIconSheet() {
  const kinds = ["heart", "spear", "bomb", "net", "bait", "fish", "clock", "star", "splash", "dash"];
  const sheet = new Canvas(ICON * kinds.length, ICON);
  kinds.forEach((k, i) => sheet.blit(iconCell(k), i * ICON, 0));
  return sheet;
}

// ---------------------------------------------------------------- explosion
const BOOM = 36;

function boomCell(frame) {
  const c = new Canvas(BOOM, BOOM);
  const cx = 18;
  const cy = 18;
  if (frame === 0) {
    c.ell(cx, cy, 6, 6, hex("#fff6d8"));
    c.ell(cx, cy, 4, 4, WHITE);
    c.ell(cx + 4, cy - 3, 3, 3, hex("#ffd66b"), 0.9);
  } else if (frame === 1) {
    c.ell(cx, cy, 12, 11, hex("#f0763a"), 0.95);
    c.ell(cx, cy, 8, 8, hex("#ffb347"));
    c.ell(cx - 1, cy - 1, 4, 4, hex("#fff6d8"));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      c.px(cx + Math.cos(a) * 14, cy + Math.sin(a) * 13, hex("#ffd66b"));
    }
  } else if (frame === 2) {
    c.ell(cx, cy, 15, 13, hex("#6a6258"), 0.7);
    c.ell(cx - 2, cy - 2, 10, 8, hex("#8a7f6d"), 0.8);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 11 + (i % 3) * 2;
      c.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, hex("#f0763a"));
    }
    c.ell(cx, cy, 5, 4, hex("#c9bda6"), 0.6);
  } else {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 12 + (i % 4) * 2;
      c.ell(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.4, 2, hex("#8fa2ad"), 0.5);
    }
    c.ring(cx, cy, 16, 2, hex("#dce8ee"), 0.25);
  }
  return c;
}

function makeBoomSheet() {
  const sheet = new Canvas(BOOM * 4, BOOM);
  for (let i = 0; i < 4; i++) sheet.blit(boomCell(i), i * BOOM, 0);
  return sheet;
}

// ---------------------------------------------------------------- font
const FONT_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!?'-+/()<>%*#";
const GLYPHS = {
  " ": "00000 00000 00000 00000 00000 00000 00000",
  A: "01110 10001 10001 11111 10001 10001 10001",
  B: "11110 10001 10001 11110 10001 10001 11110",
  C: "01110 10001 10000 10000 10000 10001 01110",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01111",
  H: "10001 10001 10001 11111 10001 10001 10001",
  I: "01110 00100 00100 00100 00100 00100 01110",
  J: "00111 00010 00010 00010 00010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001",
  L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001",
  N: "10001 11001 10101 10011 10001 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 11011 10001",
  X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100",
  Z: "11111 00001 00010 00100 01000 10000 11111",
  0: "01110 10001 10011 10101 11001 10001 01110",
  1: "00100 01100 00100 00100 00100 00100 01110",
  2: "01110 10001 00001 00010 00100 01000 11111",
  3: "11111 00010 00100 00010 00001 10001 01110",
  4: "00010 00110 01010 10010 11111 00010 00010",
  5: "11111 10000 11110 00001 00001 10001 01110",
  6: "00110 01000 10000 11110 10001 10001 01110",
  7: "11111 00001 00010 00100 01000 01000 01000",
  8: "01110 10001 10001 01110 10001 10001 01110",
  9: "01110 10001 10001 01111 00001 00010 01100",
  ".": "00000 00000 00000 00000 00000 01100 01100",
  ",": "00000 00000 00000 00000 00110 00110 01100",
  ":": "00000 01100 01100 00000 01100 01100 00000",
  "!": "00100 00100 00100 00100 00100 00000 00100",
  "?": "01110 10001 00001 00010 00100 00000 00100",
  "'": "00100 00100 00000 00000 00000 00000 00000",
  "-": "00000 00000 00000 11111 00000 00000 00000",
  "+": "00000 00100 00100 11111 00100 00100 00000",
  "/": "00001 00010 00010 00100 01000 01000 10000",
  "(": "00010 00100 01000 01000 01000 00100 00010",
  ")": "01000 00100 00010 00010 00010 00100 01000",
  "<": "00010 00100 01000 10000 01000 00100 00010",
  ">": "10000 01000 00100 00010 00100 01000 10000",
  "%": "11001 11010 00010 00100 01000 01011 10011",
  "*": "00000 10101 01110 11111 01110 10101 00000",
  "#": "01010 11111 01010 01010 11111 01010 00000",
};

function makeFont() {
  const cols = 16;
  const cw = 6;
  const ch = 8;
  const rows = Math.ceil(FONT_CHARS.length / cols);
  const c = new Canvas(cols * cw, rows * ch);
  [...FONT_CHARS].forEach((chr, i) => {
    const g = GLYPHS[chr];
    if (!g) return;
    const ox = (i % cols) * cw;
    const oy = Math.floor(i / cols) * ch;
    g.split(" ").forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit === "1") c.px(ox + rx, oy + ry, WHITE);
      });
    });
  });
  return c;
}

// ---------------------------------------------------------------- floes
function makeFloe(w, h, seed, melt) {
  const c = new Canvas(w, h);
  const rng = rngFrom(seed);
  const waterY = Math.round(h * 0.55);
  const left = 2;
  const right = w - 3;
  const levels = [4, 6, 3, 5, 7, 4, 5];
  const notchAt = left + (right - left) * (0.3 + rng() * 0.4);

  // angular, chunky top profile
  const topAt = (x) => {
    const t = Math.max(0, Math.min(1, (x - left) / (right - left)));
    const step = Math.min(levels.length - 1, Math.floor(t * levels.length));
    let y = levels[step];
    y += Math.pow(Math.abs(t - 0.5) * 2, 5) * 9;
    const d = Math.abs(x - notchAt);
    if (d < 5) y += (5 - d) * 0.8;
    return y;
  };

  // underwater keel
  const keelDepth = Math.max(4, h - waterY - 3);
  for (let x = left + 2; x <= right - 2; x++) {
    const t = (x - left) / (right - left);
    const shape = Math.sin(t * Math.PI);
    const bottom = waterY + 2 + keelDepth * (0.25 + 0.75 * shape) * (0.7 + rng() * 0.3);
    for (let y = waterY + 1; y <= bottom; y++) {
      const f = (y - waterY) / Math.max(1, bottom - waterY);
      c.px(x, y, mix(P.iceDeep, P.iceShadow, 0.35 + f * 0.65));
    }
  }
  // keel rim light
  for (let x = left + 3; x <= right - 3; x++) c.px(x, waterY + 2, mix(P.iceMid, P.iceDeep, 0.5));

  // slab
  const pts = [];
  for (let x = left; x <= right; x++) pts.push([x, topAt(x)]);
  pts.push([right, waterY + 1]);
  pts.push([left, waterY + 1]);
  c.poly(pts, P.iceMid);

  // snow on top
  for (let x = left; x <= right; x++) {
    const ty = Math.round(topAt(x));
    const depth = 3 + Math.round(Math.abs(Math.sin(x * 0.1 + seed)) * 2);
    c.vline(x, ty, depth, P.iceTop);
  }
  // side shading
  for (let x = left; x <= right; x++) {
    const t = (x - left) / (right - left);
    if (t < 0.18 || t > 0.82) {
      const ty = Math.round(topAt(x));
      c.vline(x, ty + 1, waterY - ty, P.iceDeep, 0.8);
    }
  }
  // waterline
  for (let x = left; x <= right; x++) {
    c.px(x, waterY, P.iceDeep);
    c.px(x, waterY + 1, P.iceEdge);
  }

  // cracks
  const cracks = 2 + Math.round(melt * 2);
  for (let i = 0; i < cracks; i++) {
    let x = left + 8 + rng() * Math.max(2, right - left - 16);
    let y = topAt(x) + 3;
    const len = 3 + rng() * Math.max(2, waterY - y);
    const dir = rng() < 0.5 ? -1 : 1;
    for (let s = 0; s < len; s++) {
      c.px(x, y, P.iceEdge, 0.85);
      x += dir * (rng() < 0.5 ? 1 : 0);
      y += 1;
      if (y >= waterY) break;
    }
  }
  // melt holes / worn edges
  if (melt > 0.4) {
    const holes = melt > 0.85 ? 2 : 1;
    for (let i = 0; i < holes; i++) {
      const hx = left + 10 + rng() * Math.max(2, right - left - 22);
      const hy = topAt(hx) + 5 + rng() * Math.max(1, waterY - topAt(hx) - 9);
      const r = 1.6 + rng() * 1.8;
      c.ell(hx, hy, r + 1, r + 1, P.iceEdge);
      for (let yy = -r; yy <= r; yy++) {
        for (let xx = -r; xx <= r; xx++) {
          if ((xx * xx + yy * yy) / (r * r) <= 1) {
            const i2 = (Math.round(hy + yy) * c.w + Math.round(hx + xx)) * 4;
            if (i2 >= 0 && i2 < c.data.length) c.data[i2 + 3] = 0;
          }
        }
      }
    }
  }
  // broken chunks along the edge for very melted floes
  if (melt > 0.9) {
    for (let i = 0; i < 3; i++) {
      const x = left + rng() * (right - left);
      const ty = topAt(x);
      c.px(x, ty - 1, P.iceEdge);
      c.px(x + 1, ty - 1, P.iceEdge);
      c.px(x, ty - 2, P.iceTop);
    }
  }
  c.outline(mix(P.iceShadow, INK, 0.2));
  return c;
}

// ---------------------------------------------------------------- backgrounds
const LEVELS = [
  {
    skyA: "#a8cadb",
    skyB: "#dcecf3",
    waterA: "#4f93a7",
    waterB: "#0c2a37",
    sun: "#fbf6dc",
    sunX: 760,
    sunY: 30,
    sunR: 16,
    ridge: 1.0,
    ridgeColor: "#a3c2d1",
    ridgeColor2: "#bcd7e2",
    bergs: [
      [-50, 300, 92],
      [250, 210, 74],
      [440, 280, 100],
      [710, 230, 80],
      [910, 210, 66],
    ],
    haze: 0.5,
    glints: 1,
    shafts: 0.5,
    melt: 0.1,
    floes: 9,
  },
  {
    skyA: "#9cc3d7",
    skyB: "#d3e8f1",
    waterA: "#4a8ea2",
    waterB: "#0b2531",
    sun: "#fdf7e2",
    sunX: 690,
    sunY: 34,
    sunR: 15,
    ridge: 0.85,
    ridgeColor: "#96b6c6",
    ridgeColor2: "#b1ccda",
    bergs: [
      [-40, 230, 76],
      [250, 160, 58],
      [430, 210, 84],
      [660, 170, 62],
      [860, 190, 70],
    ],
    haze: 0.55,
    glints: 1,
    shafts: 0.55,
    melt: 0.2,
    floes: 7,
  },
  {
    skyA: "#90b9d1",
    skyB: "#cae4ee",
    waterA: "#428499",
    waterB: "#0a212c",
    sun: "#fbf2dc",
    sunX: 300,
    sunY: 40,
    sunR: 14,
    ridge: 0.65,
    ridgeColor: "#89aabc",
    ridgeColor2: "#a7c4d3",
    bergs: [
      [-60, 170, 58],
      [210, 120, 44],
      [380, 160, 66],
      [610, 110, 42],
      [790, 150, 58],
      [940, 120, 44],
    ],
    haze: 0.58,
    glints: 1.2,
    shafts: 0.7,
    melt: 0.45,
    floes: 5,
  },
  {
    skyA: "#84afc9",
    skyB: "#c1deea",
    waterA: "#377a92",
    waterB: "#081e29",
    sun: "#f9eed8",
    sunX: 520,
    sunY: 46,
    sunR: 13,
    ridge: 0.42,
    ridgeColor: "#7b9caf",
    ridgeColor2: "#99b8c9",
    bergs: [
      [-70, 120, 38],
      [230, 90, 28],
      [420, 130, 44],
      [650, 70, 22],
      [830, 110, 36],
    ],
    haze: 0.62,
    glints: 1.4,
    shafts: 0.85,
    melt: 0.7,
    floes: 3,
  },
  {
    skyA: "#79a6c4",
    skyB: "#b8d8e7",
    waterA: "#2d6e87",
    waterB: "#05171f",
    sun: "#f8e2c2",
    sunX: 400,
    sunY: 52,
    sunR: 12,
    ridge: 0.22,
    ridgeColor: "#6f90a4",
    ridgeColor2: "#8dafc2",
    bergs: [
      [-80, 66, 20],
      [300, 50, 15],
      [560, 66, 18],
      [760, 44, 12],
    ],
    haze: 0.68,
    glints: 1.7,
    shafts: 1,
    melt: 1,
    floes: 2,
  },
];

function drawCloud(c, x, y, w, rng) {
  const puffs = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < puffs; i++) {
    c.ell(x + rng() * w, y + rng() * 5, 6 + rng() * w * 0.35, 2 + rng() * 2.5, WHITE, 0.4);
  }
}

function ridgeTopAt(x, strength, phases) {
  const baseY = SURFACE + 2;
  const amps = [26 * strength, 14 * strength, 7 * strength];
  let y = baseY - (14 + 12 * strength);
  for (let i = 0; i < 3; i++) {
    y -= Math.abs(Math.sin(x * (0.004 + i * 0.006) + phases[i])) * amps[i];
  }
  return y;
}

function drawRidge(c, pal, rng, strength) {
  const baseY = SURFACE + 3;
  const phases = [rng() * 6, rng() * 6, rng() * 6];
  const far = [];
  for (let x = 0; x <= W; x += 3) far.push([x, ridgeTopAt(x + 180, strength, phases) + 4]);
  c.poly([...far, [W, baseY], [0, baseY]], pal.ridgeColor2, 0.9);
  const near = [];
  for (let x = 0; x <= W; x += 3) near.push([x, ridgeTopAt(x, strength, phases) + 8]);
  c.poly([...near, [W, baseY], [0, baseY]], pal.ridgeColor);
  for (let x = 0; x < W; x += 2) {
    if (rng() < 0.14) {
      const y = ridgeTopAt(x, strength, phases) + 9 + rng() * 6;
      c.px(x, y, "#e9f6fb", 0.55);
      c.px(x + 1, y + 1, "#e9f6fb", 0.3);
    }
  }
}

function drawBerg(c, x, w, h, rng) {
  if (h < 8 || w < 8) return;
  const n = Math.max(5, Math.round(w / 26));
  const heights = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const dome = Math.pow(Math.sin(t * Math.PI), 0.75);
    heights.push(h * (0.22 + 0.78 * dome) * (0.82 + rng() * 0.36));
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < n; i++) heights[i] = (heights[i - 1] + heights[i] * 2 + heights[i + 1]) / 4;
  }
  heights[0] = h * 0.14;
  heights[n] = h * 0.1;
  const topAt = (t) => {
    const idx = Math.min(n - 1, Math.max(0, Math.floor(t * n)));
    const f = t * n - idx;
    return SURFACE - (heights[idx] + (heights[idx + 1] - heights[idx]) * f);
  };

  const pts = [];
  for (let i = 0; i <= n * 5; i++) {
    const t = i / (n * 5);
    pts.push([x + t * w, topAt(t)]);
  }
  c.poly([...pts, [x + w, SURFACE + 2], [x, SURFACE + 2]], mix(hex("#a9c7d5"), WHITE, 0.18));

  // faceted faces
  const facets = Math.max(3, Math.round(w / 34));
  for (let f = 0; f < facets; f++) {
    const t0 = f / facets;
    const t1 = f === facets - 1 ? 1 : (f + 1) / facets;
    const tone = (f % 3 + (f % 2)) % 3;
    const col = tone === 0 ? hex("#cfe4ee") : tone === 1 ? hex("#a9c7d5") : hex("#c2dbe7");
    const fp = [];
    for (let i = 0; i <= 3; i++) {
      const t = t0 + ((t1 - t0) * i) / 3;
      fp.push([x + t * w, topAt(t)]);
    }
    fp.push([x + t1 * w + 1, SURFACE]);
    fp.push([x + t0 * w, SURFACE]);
    c.poly(fp, col, 0.75);
  }

  // snow cap
  for (let i = 0; i <= n * 5; i++) {
    const t = i / (n * 5);
    const px_ = x + t * w;
    const py = topAt(t) + 1;
    const depth = 3 + Math.round(Math.abs(Math.sin(t * 9)) * 2);
    c.vline(px_, py, depth, "#f0fbff", 0.95);
  }
  // crevasses
  const cr = Math.max(2, Math.round(w / 55));
  for (let i = 0; i < cr; i++) {
    const t = 0.12 + rng() * 0.76;
    const py = topAt(t) + 4;
    const len = Math.max(2, (SURFACE - py) * (0.25 + rng() * 0.5));
    const col = rng() < 0.5 ? "#7ea3b6" : "#e2f4fc";
    let cx = x + t * w;
    for (let s = 0; s < len; s++) {
      c.px(cx, py + s, col, 0.8);
      if (rng() < 0.2) cx += rng() < 0.5 ? 1 : -1;
    }
  }

  // soft underwater mass - no hard polygon edge
  const depthH = h * 0.85;
  const shadeCol = mix(hex("#2c6479"), hex("#04161f"), 0.35);
  for (let i = 0; i < depthH; i++) {
    const y = SURFACE + 1 + i;
    const t = i / depthH;
    const inset = w * 0.08 + t * w * 0.32;
    const alpha = 0.3 * Math.pow(1 - t, 1.3);
    if (alpha < 0.01) continue;
    for (let xx = Math.floor(x + inset); xx <= Math.ceil(x + w - inset); xx++) {
      c.px(xx, y, shadeCol, alpha);
    }
  }
  for (let i = 0; i < 6; i++) {
    const t = 0.15 + rng() * 0.7;
    c.vline(x + t * w, SURFACE + 6, depthH * (0.25 + rng() * 0.4), hex("#3b7c92"), 0.18);
  }
  for (let i = 0; i < w; i++) c.px(x + i, SURFACE - 1, "#7ea6b9", 0.55);
}

function makeBackground(levelIndex) {
  const pal = LEVELS[levelIndex];
  const rng = rngFrom(900 + levelIndex * 37);
  const c = new Canvas(W, H);
  c.gradV(0, 0, W, SURFACE + 6, hex(pal.skyA), hex(pal.skyB), 10);

  const sunC = hex(pal.sun);
  for (let r = pal.sunR + 18; r > pal.sunR; r -= 3) {
    c.ell(pal.sunX, pal.sunY, r, r, sunC, 0.035);
  }
  c.ell(pal.sunX, pal.sunY, pal.sunR, pal.sunR, sunC, 0.6);
  c.ell(pal.sunX, pal.sunY, pal.sunR - 4, pal.sunR - 4, mix(sunC, WHITE, 0.55), 0.5);

  for (let i = 0; i < 4; i++) {
    drawCloud(c, rng() * (W - 160), 12 + rng() * 48, 60 + rng() * 90, rng);
  }

  drawRidge(c, pal, rng, pal.ridge);

  // water
  c.gradV(0, SURFACE, W, H - SURFACE, hex(pal.waterA), hex(pal.waterB), 12);

  // deep shadows
  for (let i = 0; i < 22; i++) {
    const y = SURFACE + 50 + rng() * (H - SURFACE - 60);
    const t = (y - SURFACE) / (H - SURFACE);
    c.ell(rng() * W, y, 14 + rng() * 44, 3 + rng() * 6, "#03151d", 0.12 * t);
  }

  // light shafts
  for (let i = 0; i < 5; i++) {
    const sx = pal.sunX + (rng() - 0.5) * 240;
    const w = 8 + rng() * 18;
    for (let y = SURFACE; y < SURFACE + 116; y++) {
      const t = (y - SURFACE) / 116;
      const off = (y - SURFACE) * 0.32;
      for (let x = 0; x < w; x++) {
        if ((x + y) % 3 !== 0) continue;
        c.px(sx + off + x - w / 2, y, "#d8f0fa", 0.1 * (1 - t) * pal.shafts);
      }
    }
  }

  // icebergs sit in the water: draw them after the water so their keels show
  pal.bergs.forEach(([x, w, h]) => drawBerg(c, x, w, h, rng));

  // horizon haze that fades in both directions
  for (let y = SURFACE - 20; y <= SURFACE + 3; y++) {
    const t = Math.max(0, 1 - Math.abs(y - (SURFACE - 7)) / 16);
    c.hline(0, y, W, mix(hex(pal.skyB), hex(pal.waterA), 0.3), t * t * pal.haze * 0.5);
  }

  // swell dashes
  for (let y = SURFACE + 8; y < H; y += 10) {
    const t = (y - SURFACE) / (H - SURFACE);
    for (let x = Math.floor(rng() * 20); x < W; x += 16 + rng() * 26) {
      const len = 4 + rng() * 18;
      for (let i = 0; i < len; i++) c.px(x + i, y, "#d9eff8", 0.05 + 0.07 * pal.glints * (1 - t));
      for (let i = 1; i < len - 1; i++)
        c.px(x + i, y + 1, "#d9eff8", (0.05 + 0.07 * pal.glints * (1 - t)) * 0.5);
    }
  }

  // surface sparkle
  for (let x = 0; x < W; x += 2) {
    if (rng() < 0.4) {
      c.px(x, SURFACE + 2 + rng() * 3, "#eafaff", 0.24 * pal.glints);
      if (rng() < 0.3) c.px(x + 1, SURFACE + 1, WHITE, 0.3 * pal.glints);
    }
  }
  // surface line
  for (let x = 0; x < W; x++) {
    c.px(x, SURFACE, "#dff3fa", 0.35);
    c.px(x, SURFACE + 1, "#b6dcea", 0.3);
  }

  // meltwater slicks
  for (let i = 0; i < Math.round(4 + pal.melt * 10); i++) {
    const y = SURFACE + 6 + rng() * 60;
    const x = rng() * W;
    c.ell(x, y, 20 + rng() * 50, 2 + rng() * 4, "#cfeaf3", 0.05 + pal.melt * 0.05);
  }

  // ambient specks
  for (let i = 0; i < 90; i++) {
    const y = SURFACE + 4 + rng() * (H - SURFACE - 4);
    c.px(rng() * W, y, "#dff4ff", 0.06 + rng() * 0.12);
  }

  // bottom fade
  for (let y = H - 30; y < H; y++) {
    c.hline(0, y, W, "#03121a", ((y - (H - 30)) / 30) * 0.28);
  }
  return c;
}

// ---------------------------------------------------------------- build
function build() {
  const seal = makeSealSheet();
  seal.save(`${OUT}/seal.png`);
  const boat = makeBoatSheet();
  boat.save(`${OUT}/boat.png`);
  const fish = makeFishSheet();
  fish.save(`${OUT}/fish.png`);
  const icons = makeIconSheet();
  icons.save(`${OUT}/icons.png`);
  const boom = makeBoomSheet();
  boom.save(`${OUT}/boom.png`);
  const orca = makeOrcaSheet();
  orca.save(`${OUT}/orca.png`);
  const debris = makeDebrisSheet();
  debris.save(`${OUT}/debris.png`);
  const shard = makeShardSheet();
  shard.save(`${OUT}/shard.png`);
  const font = makeFont();
  font.save(`${OUT}/font.png`);

  const floeSizes = [
    [124, 44],
    [100, 36],
    [78, 30],
    [58, 24],
    [40, 18],
  ];
  const floeManifest = [];
  let fi = 0;
  floeSizes.forEach(([w, h], si) => {
    for (let v = 0; v < 2; v++) {
      const melt = v === 1 ? 0.85 : 0.2;
      const img = makeFloe(w, h, 3000 + fi * 17, melt + si * 0.04);
      const name = `floe${fi}.png`;
      img.save(`${OUT}/${name}`);
              floeManifest.push({ file: name, w, h, level: si, waterline: 0.55 });
      fi++;
    }
  });

  const bgManifest = [];
  const bgArt = [];
  LEVELS.forEach((_, i) => {
    const bg = makeBackground(i);
    bgArt.push(bg);
    const name = `bg${i + 1}.png`;
    bg.save(`${OUT}/${name}`);
    bgManifest.push(name);
  });

  writeFileSync(
    `${OUT}/atlas.json`,
    JSON.stringify(
      {
        sheets: {
          seal: { file: "seal.png", fw: SEAL_W, fh: SEAL_H, cols: 6, frames: 6 },
          boat: { file: "boat.png", fw: BOAT_W, fh: BOAT_H, cols: 7, frames: 7 },
          fish: { file: "fish.png", fw: FISH_W, fh: FISH_H, cols: 6, frames: 6 },
          icons: { file: "icons.png", fw: ICON, fh: ICON, cols: 10, frames: 10 },
          boom: { file: "boom.png", fw: BOOM, fh: BOOM, cols: 4, frames: 4 },
          orca: { file: "orca.png", fw: ORCA_W, fh: ORCA_H, cols: 4, frames: 4 },
          debris: { file: "debris.png", fw: DEBRIS_W, fh: DEBRIS_H, cols: 3, frames: 3 },
          shard: { file: "shard.png", fw: SHARD_W, fh: SHARD_H, cols: 3, frames: 3 },
        },
        font: { file: "font.png", cw: 6, ch: 8, cols: 16, chars: FONT_CHARS },
        backgrounds: bgManifest,
        floes: floeManifest,
        surface: SURFACE,
        world: { w: W, h: H },
      },
      null,
      2
    )
  );

  // contact sheet previews
  const pv = new Canvas(700, 320);
  pv.rect(0, 0, 700, 320, hex("#132029"));
  pv.blit(seal.scale(4), 8, 8);
  pv.blit(boat.scale(2), 8, 120);
  pv.blit(fish.scale(4), 220, 8);
  pv.blit(icons.scale(4), 220, 60);
  pv.blit(boom.scale(2), 500, 8);
  pv.blit(font.scale(2), 220, 120);
  pv.blit(orca.scale(2), 430, 190);
  pv.blit(debris.scale(3), 440, 120);
  pv.blit(shard.scale(3), 540, 120);
  pv.save(`${PREVIEW}/sprites.png`);

  const fp = new Canvas(680, 240);
  fp.rect(0, 0, 680, 240, hex("#2a6478"));
  let fx = 10;
  let fy = 12;
  floeManifest.forEach((f, i) => {
    const art = makeFloe(f.w, f.h, 3000 + i * 17, 0.2 + f.level * 0.18);
    if (fx + f.w > 670) {
      fx = 10;
      fy += 52;
    }
    fp.blit(art, fx, fy);
    fx += f.w + 10;
  });
  fp.save(`${PREVIEW}/floes.png`);

  // in-game composition check at 2x
  const scene = new Canvas(480, 270);
  scene.blit(bgArt[0], 0, 0);
  const fl1 = makeFloe(124, 44, 3000, 0.2);
  scene.blit(fl1, 300, SURFACE - 24);
  const fl2 = makeFloe(78, 30, 3040, 0.2);
  scene.blit(fl2, 60, SURFACE - 16);
  scene.blit(sealCell({ bob: 0 }), 240, 150);
  scene.blit(boatCell({ bob: 0 }), 120, SURFACE - 27);
  scene.blit(boatCell({ aim: true }), 250, SURFACE - 27);
  scene.scale(2).save(`${PREVIEW}/scene.png`);

  console.log(`assets written to ${OUT}`);
}

build();
