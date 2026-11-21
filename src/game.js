import { A, drawFrame, drawFrameScaled } from "./assets.js";
import { text, textWidth, panel, bar, icon } from "./render.js";

const VW = 480;
const VH = 270;
const WORLD_W = 960;
const WORLD_H = 270;
const SURFACE = 100;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sgn = (v) => (v < 0 ? -1 : 1);
const fmtTime = (s) => {
  const v = Math.max(0, Math.ceil(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};

const ICE = "#e3f4fb";
const DIM = "#8fb2c6";
const GOLD = "#f2c14e";
const RED = "#e2604a";
const GREEN = "#8fe0b0";
const CYAN = "#8fd8ea";

export class Round {
  constructor({ level, levelIndex, role, input }) {
    this.level = level;
    this.levelIndex = levelIndex;
    this.role = role;
    this.input = input;
    this.motes = [];
    this.reset();
  }

  reset() {
    this.t = 0;
    this.timeLeft = this.level.time;
    this.finishTime = 0;
    this.status = "playing";
    this.result = null;
    this.reason = "";
    this.done = false;
    this.endTimer = 1.1;
    this.camX = 0;
    this.shake = 0;
    this.flash = 0;
    this.flashColor = "226,96,74";
    this.hint = 7;
    this.spawnTimer = 0;

    this.boat = {
      x: 150,
      y: SURFACE,
      vx: 0,
      hp: 100,
      maxHp: 100,
      facing: 1,
      stun: 0,
      dash: 0,
      shot: 0,
      hurt: 0,
      aim: 0.55,
      cd: { fire: 0, bomb: 0, net: 0, bait: 0, dash: 0 },
      telegraph: 0,
      topX: 640,
      topY: 180,
      lastSeen: { x: 640, y: 180 },
      lost: 0,
    };
    this.seal = {
      x: 700,
      y: 185,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      breath: 100,
      stun: 0,
      hurt: 0,
      dash: 0,
      dashDir: { x: 0, y: 1 },
      facing: 1,
      cd: { splash: 0, check: 0 },
      aiThink: 0,
      aiTarget: { x: 700, y: 185 },
      aiEvade: 0,
      surfacing: false,
      anim: 0,
      underwater: false,
    };

    this.harpoons = [];
    this.bombs = [];
    this.nets = [];
    this.baits = [];
    this.fish = [];
    this.particles = [];
    this.rings = [];
    this.booms = [];
    this.floats = [];
    this.motes = Array.from({ length: 70 }, () => ({
      x: rand(0, WORLD_W),
      y: rand(SURFACE + 8, WORLD_H - 8),
      v: rand(4, 14),
      p: rand(0, TAU),
      s: Math.random() < 0.2 ? 2 : 1,
    }));

    this.seal.iframe = 0;
    if (this.role === "seal") {
      Object.assign(this.boat.cd, { fire: 1.8, bomb: 5.5, net: 7.5, bait: 9.5 });
      this.seal.maxHp = 120;
      this.seal.hp = 120;
    }
    this.sealKilledBy = null;
    const baseHunter = this.level.ai.hunter;
    this.aiHunter =
      this.role === "seal"
        ? {
            ...baseHunter,
            fireDelay: baseHunter.fireDelay * 1.95,
            spread: baseHunter.spread * 1.28,
            bombEvery: baseHunter.bombEvery * 1.4,
            netEvery: baseHunter.netEvery * 1.4,
            baitEvery: baseHunter.baitEvery * 1.4,
          }
        : baseHunter;
    // the seal's own round: the hunter hits softer, as its cadence is already slowed
    this.hunterDmg = this.role === "seal" ? 0.78 : 1;

    this.hz = { calve: 0, orcas: 0, orcaSpeed: 112, debris: 0, ...(this.level.hazards || {}) };
    this.calveTimer = rand(3, 8);
    this.calves = [];
    this.spouts = [];
    this.shards = [];
    this.orcas = [];
    this.debris = [];
    for (let i = 0; i < this.hz.orcas; i++) {
      this.orcas.push({
        x: i % 2 ? WORLD_W - 90 : 90,
        y: rand(160, 210),
        vx: 0,
        vy: 0,
        tx: rand(120, WORLD_W - 120),
        wait: 5 + i * 3,
        phase: rand(0, TAU),
        facing: i % 2 ? -1 : 1,
        anim: rand(0, 10),
      });
    }
    for (let i = 0; i < this.hz.debris; i++) this.spawnDebris(true);

    this.stats = { spears: 0, hits: 0, fish: 0, bombs: 0, nets: 0, splashes: 0, checks: 0, eaten: 0 };

    this.buildFloes();
    this.buildFish();
    this.camX = clamp(this.focusX() - VW / 2, 0, WORLD_W - VW);
    this.burst(this.boat.x, SURFACE + 4, 8, "175,225,240", 20);
  }

  focusX() {
    return this.role === "hunter" ? this.boat.x : this.seal.x;
  }

  buildFloes() {
    const [lo, hi] = this.level.floeTiers;
    const pool = A.floes.filter((f) => f.level >= lo && f.level <= hi);
    const placed = [];
    let guard = 0;
    while (placed.length < this.level.floes && guard++ < 300) {
      const art = pick(pool);
      const x = rand(56, WORLD_W - 56);
      if (Math.abs(x - 150) < 95) continue;
      if (placed.some((p) => Math.abs(p.x - x) < (p.w + art.w) * 0.3)) continue;
      placed.push({
        x,
        w: art.w,
        h: art.h,
        waterline: art.waterline,
        img: art.img,
        phase: rand(0, TAU),
      });
    }
    this.floes = placed;
  }

  buildFish() {
    for (let i = 0; i < this.level.fish; i++) {
      this.fish.push(this.newFish(true));
    }
  }

  newFish(anywhere) {
    let x;
    if (anywhere) x = rand(50, WORLD_W - 50);
    else x = Math.random() < 0.5 ? rand(10, 90) : rand(WORLD_W - 90, WORLD_W - 10);
    return {
      x,
      y: rand(SURFACE + 40, WORLD_H - 20),
      vx: rand(-20, 20),
      vy: rand(-8, 8),
      variant: Math.floor(rand(0, 3)),
      phase: rand(0, TAU),
      turn: rand(0.6, 2.4),
      alive: true,
    };
  }

  // ------------------------------------------------------------ helpers
  gunPos() {
    const b = this.boat;
    return { x: b.x + b.facing * 13, y: SURFACE + 3 };
  }

  isSealHidden() {
    const s = this.seal;
    if (s.y > SURFACE + 50) return false;
    return this.floes.some((f) => Math.abs(s.x - f.x) < f.w * 0.42);
  }

  addParticles(x, y, n, color, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(opts.min ?? 20, opts.max ?? 90);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.25, opts.life ?? 0.8),
        max: 0.8,
        color,
        size: Math.random() < 0.3 ? 2 : 1,
        grav: opts.grav ?? 60,
      });
    }
  }

  burst(x, y, up, color, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + rand(-6, 6),
        y,
        vx: rand(-40, 40),
        vy: rand(-90, -30),
        life: rand(0.4, 0.9),
        max: 0.9,
        color,
        size: Math.random() < 0.4 ? 2 : 1,
        grav: 140,
      });
    }
  }

  splashParticles(x, y, n) {
    this.addParticles(x, y, n, "215,240,250", { min: 40, max: 150, life: 0.9, grav: 190 });
    this.addParticles(x, y, Math.floor(n / 2), "150,200,220", { min: 10, max: 60, life: 1.1, grav: 120 });
  }

  float(x, y, str, color = ICE) {
    this.floats.push({ x, y, str, color, life: 1.1, max: 1.1, vy: -24 });
  }

  ripple(x, y, r, maxR) {
    this.rings.push({ x, y, r, vr: (maxR - r) / 0.5, life: 0.5, max: 0.5, color: "215,240,250" });
  }

  bubble(x, y) {
    this.particles.push({
      x: x + rand(-6, 6),
      y,
      vx: rand(-6, 6),
      vy: rand(-34, -14),
      life: rand(0.5, 1.1),
      max: 1.1,
      color: "190,230,245",
      size: 1,
      grav: -20,
    });
  }

  // ------------------------------------------------------------ update
  update(dt) {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 16);
    this.flash = Math.max(0, this.flash - dt * 2.4);

    for (const m of this.motes) {
      m.y -= m.v * dt * 0.4;
      m.x += Math.sin(this.t * 0.6 + m.p) * dt * 4;
      if (m.y < SURFACE + 4) {
        m.y = WORLD_H - 8;
        m.x = rand(0, WORLD_W);
      }
    }

    if (this.status !== "playing") {
      this.endTimer -= dt;
      this.updateEffects(dt);
      if (this.endTimer <= 0 && (this.input.hit("Space", "Enter") || this.input.clicked)) {
        this.done = true;
      }
      return;
    }

    this.hint -= dt;
    this.timeLeft -= dt;
    this.spawnTimer -= dt;

    const b = this.boat;
    const s = this.seal;
    for (const k of Object.keys(b.cd)) b.cd[k] = Math.max(0, b.cd[k] - dt);
    for (const k of Object.keys(s.cd)) s.cd[k] = Math.max(0, s.cd[k] - dt);
    if (b.stun > 0) b.stun = Math.max(0, b.stun - dt);
    if (s.stun > 0) s.stun = Math.max(0, s.stun - dt);
    if (b.dash > 0) b.dash = Math.max(0, b.dash - dt);
    if (b.shot > 0) b.shot = Math.max(0, b.shot - dt);
    if (b.hurt > 0) b.hurt = Math.max(0, b.hurt - dt);
    if (s.hurt > 0) s.hurt = Math.max(0, s.hurt - dt);
    if (s.iframe > 0) s.iframe = Math.max(0, s.iframe - dt);

    if (this.role === "hunter") {
      this.updateHunterPlayer(dt);
      this.updateSealAI(dt);
    } else {
      this.updateSealPlayer(dt);
      this.updateHunterAI(dt);
    }

    this.moveBoat(dt);
    this.moveSeal(dt);
    this.updateHazards(dt);
    this.updateFish(dt);
    this.updateHarpoons(dt);
    this.updateBombs(dt);
    this.updateNets(dt);
    this.updateBaits(dt);
    this.updateEffects(dt);
    this.updateCamera(dt);
    this.checkEnd();
  }

  updateCamera(dt) {
    const target = clamp(this.focusX() - VW / 2, 0, WORLD_W - VW);
    this.camX = lerp(this.camX, target, Math.min(1, dt * 6));
  }

  aimFromMouse() {
    const b = this.boat;
    const wx = this.input.mx + this.camX;
    const dx = wx - b.x;
    b.facing = dx < 0 ? -1 : 1;
    b.aim = clamp(Math.atan2(this.input.my - (SURFACE + 3), Math.abs(dx)), 0.05, 1.5);
  }

  updateHunterPlayer(dt) {
    const b = this.boat;
    const i = this.input;
    this.aimFromMouse();
    if (b.stun > 0) {
      b.vx *= 1 - Math.min(1, dt * 3);
      return;
    }
    let dir = 0;
    if (i.down("KeyA", "ArrowLeft")) dir -= 1;
    if (i.down("KeyD", "ArrowRight")) dir += 1;
    if (i.hit("ShiftLeft", "ShiftRight") && b.cd.dash <= 0) {
      b.dash = 0.4;
      b.cd.dash = 3.2;
      b.vx = (dir || b.facing) * 300;
      this.burst(b.x - b.facing * 10, SURFACE + 4, 1, "205,235,245", 10);
      this.shake = Math.max(this.shake, 2);
    }
    if (b.dash <= 0) {
      b.vx = lerp(b.vx, dir * 140, Math.min(1, dt * 7));
    } else {
      b.vx *= 1 - Math.min(1, dt * 1.6);
    }
    if ((i.clicked || i.hit("Space")) && b.cd.fire <= 0) this.fireSpear();
    if (i.hit("Digit2", "KeyE") && b.cd.bomb <= 0) this.throwBomb();
    if (i.hit("Digit3", "KeyQ") && b.cd.net <= 0) this.dropNet();
    if (i.hit("Digit4", "KeyF") && b.cd.bait <= 0) this.dropBait();
  }

  fireSpear() {
    const b = this.boat;
    const { x: gx, y: gy } = this.gunPos();
    const vx = Math.cos(b.aim) * b.facing * 360;
    const vy = Math.sin(b.aim) * 360;
    this.harpoons.push({ x: gx, y: gy, vx, vy, life: 1.35 });
    b.cd.fire = 0.6;
    b.shot = 0.14;
    this.stats.spears++;
    this.burst(gx, gy, 1, "225,245,252", 5);
  }

  throwBomb() {
    const b = this.boat;
    const tx = clamp(this.input.mx + this.camX, 24, WORLD_W - 24);
    const ty = clamp(this.input.my, SURFACE + 26, WORLD_H - 18);
    const dx = tx - b.x;
    const dy = ty - (SURFACE + 2);
    const T = 0.78;
    const G = 250;
    this.bombs.push({
      x: b.x,
      y: SURFACE - 4,
      vx: dx / T,
      vy: (dy - 0.5 * G * T * T) / T,
      fuse: 2.35,
      t: 0,
    });
    b.cd.bomb = 3.1;
    this.stats.bombs++;
    b.shot = 0.2;
  }

  dropNet() {
    const b = this.boat;
    const x = clamp(clamp(this.input.mx + this.camX, b.x - 190, b.x + 190), 18, WORLD_W - 18);
    const depth = clamp(this.input.my, SURFACE + 40, WORLD_H - 16);
    if (this.nets.length >= 3) this.nets.shift();
    this.nets.push({ x, depth, life: 14, max: 14, armed: 0.4, phase: rand(0, TAU) });
    b.cd.net = 4.8;
    this.stats.nets++;
    this.burst(x, SURFACE + 2, 1, "200,170,110", 5);
  }

  dropBait() {
    const b = this.boat;
    const x = clamp(clamp(this.input.mx + this.camX, b.x - 190, b.x + 190), 18, WORLD_W - 18);
    const y = clamp(this.input.my, SURFACE + 30, WORLD_H - 26);
    if (this.baits.length >= 3) this.baits.shift();
    this.baits.push({ x, y, ty: y, vy: 0, life: 16, max: 16, phase: rand(0, TAU), eaten: false });
    b.cd.bait = 5.5;
    this.burst(x, SURFACE + 2, 1, "220,240,246", 4);
  }

  updateSealPlayer(dt) {
          const s = this.seal;
      const i = this.input;
      if (s.stun > 0) {
        s.vx *= 1 - Math.min(1, dt * 2.5);
        s.vy *= 1 - Math.min(1, dt * 2.5);
        return;
      }
    let ax = 0;
    let ay = 0;
    if (i.down("KeyA", "ArrowLeft")) ax -= 1;
    if (i.down("KeyD", "ArrowRight")) ax += 1;
    if (i.down("KeyW", "ArrowUp")) ay -= 1;
    if (i.down("KeyS", "ArrowDown")) ay += 1;
    if (ax || ay) {
      const m = Math.hypot(ax, ay);
      ax /= m;
      ay /= m;
      if (ax !== 0) s.facing = ax < 0 ? -1 : 1;
    }
    if (s.dash <= 0) {
      const k = Math.min(1, dt * 7);
      s.vx = lerp(s.vx, ax * 166, k);
      s.vy = lerp(s.vy, ay * 166, k);
    }
    if (i.hit("Space") && s.cd.splash <= 0) this.sealSplash();
    if ((i.hit("ShiftLeft", "ShiftRight") || i.clicked) && s.cd.check <= 0) this.sealCheck();
  }

  sealSplash() {
    const s = this.seal;
    const b = this.boat;
    if (s.y > SURFACE + 46) {
      s.cd.splash = 0.6;
      this.float(s.x, s.y - 20, "SURFACE FIRST", DIM);
      return;
    }
    s.cd.splash = 4.2;
    this.stats.splashes++;
    this.rings.push({ x: s.x, y: SURFACE + 1, r: 8, vr: 170, life: 0.55, max: 0.55, color: "215,240,250" });
    this.rings.push({ x: s.x, y: SURFACE + 1, r: 2, vr: 120, life: 0.4, max: 0.4, color: "255,255,255" });
    this.splashParticles(s.x, SURFACE + 2, 26);
    this.shake = Math.max(this.shake, 3);
    if (Math.abs(b.x - s.x) < 98) {
      b.stun = 1.5;
      b.vx += sgn(b.x - s.x) * 120;
      this.float(b.x, SURFACE - 38, "SOAKED!", GOLD);
      this.shake = 6;
      this.stats.splashHits = (this.stats.splashHits || 0) + 1;
    }
  }

  sealCheck() {
    const s = this.seal;
    const wx = this.input.mx + this.camX;
    const wx2 = wx;
    const wy = this.input.my;
    let dx = wx2 - s.x;
    let dy = wy - s.y;
    const m = Math.hypot(dx, dy) || 1;
    dx /= m;
    dy /= m;
    s.dash = 0.26;
    s.dashDir = { x: dx, y: dy };
    s.facing = dx < 0 ? -1 : 1;
    s.cd.check = 4.6;
    this.burst(s.x, s.y, 1, "200,230,240", 8);
  }

  moveBoat(dt) {
    const b = this.boat;
    b.x += b.vx * dt;
    b.x = clamp(b.x, 26, WORLD_W - 26);
    if (Math.abs(b.vx) > 30 && Math.random() < 0.4) {
      this.particles.push({
        x: b.x - sgn(b.vx) * 18,
        y: SURFACE + rand(2, 7),
        vx: -sgn(b.vx) * rand(10, 40),
        vy: rand(-20, 0),
        life: rand(0.3, 0.7),
        max: 0.7,
        color: "205,238,248",
        size: 1,
        grav: 30,
      });
    }
  }

  moveSeal(dt) {
    const s = this.seal;
    const b = this.boat;

    if (s.dash > 0) {
      s.dash -= dt;
      s.x += s.dashDir.x * 520 * dt;
      s.y += s.dashDir.y * 520 * dt;
      this.bubble(s.x, s.y);
      if (Math.abs(s.x - b.x) < 28 && s.y < SURFACE + 30 && s.y > SURFACE - 34) {
        // body check connects
        b.hp = Math.max(0, b.hp - 22);
        b.stun = 1.05;
        b.vx += sgn(b.x - s.x) * 110;
        b.hurt = 0.5;
        s.dash = 0;
        s.vx = -s.dashDir.x * 130;
        s.vy = 110;
        this.stats.checks++;
        this.float(b.x, SURFACE - 40, "BODY CHECK!", GOLD);
        this.addParticles(b.x, SURFACE + 8, 18, "230,200,150", { max: 130, grav: 120 });
        this.shake = Math.max(this.shake, 6);
        this.flash = 0.5;
        this.flashColor = "242,193,78";
      }
    } else {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }

    const minY = s.dash > 0 ? SURFACE - 22 : SURFACE + 12;
    s.x = clamp(s.x, 22, WORLD_W - 22);
    s.y = clamp(s.y, minY, WORLD_H - 16);
    if (s.dash <= 0) {
      s.vx *= 1 - Math.min(1, dt * 1.5);
      s.vy *= 1 - Math.min(1, dt * 1.5);
    }

    // air supply
    const atSurface = s.y < SURFACE + 20;
    s.underwater = !atSurface;
    if (atSurface) s.breath = Math.min(100, s.breath + 62 * dt);
    else s.breath = Math.max(0, s.breath - 3.5 * dt);
    if (s.breath <= 0) {
      s.hp = Math.max(0, s.hp - 9 * dt);
      s.hurt = Math.max(s.hurt, 0.12);
      if (Math.random() < 0.2) this.flash = Math.max(this.flash, 0.18);
    }

    if (s.stun <= 0 && s.dash <= 0 && Math.random() < (s.underwater ? 0.08 : 0.02)) {
      this.bubble(s.x + rand(-8, 8), s.y);
    }
  }

  updateFish(dt) {
    const s = this.seal;
    for (const f of this.fish) {
      if (!f.alive) continue;
      f.turn -= dt;
      if (f.turn <= 0) {
        f.turn = rand(0.8, 2.6);
        f.vx = rand(-26, 26);
        f.vy = rand(-12, 12);
      }
      const d = Math.hypot(s.x - f.x, s.y - f.y);
      if (d < 52 && s.dash <= 0) {
        const k = 70 / (d || 1);
        f.vx -= (s.x - f.x) * k * dt * 2.4;
        f.vy -= (s.y - f.y) * k * dt * 2.4;
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= 1 - Math.min(1, dt * 0.8);
      f.vy *= 1 - Math.min(1, dt * 0.8);
      if (f.x < 16) f.vx = Math.abs(f.vx) + 6;
      if (f.x > WORLD_W - 16) f.vx = -Math.abs(f.vx) - 6;
      if (f.y < SURFACE + 26) f.vy = Math.abs(f.vy) + 4;
      if (f.y > WORLD_H - 14) f.vy = -Math.abs(f.vy) - 4;
      f.y = clamp(f.y, SURFACE + 22, WORLD_H - 12);

      if (d < 18) this.eatFish(f);
    }

    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.4;
      const alive = this.fish.filter((f) => f.alive).length;
      if (alive < this.level.fish) this.fish.push(this.newFish(false));
      this.fish = this.fish.filter((f) => f.alive);
    }
  }

  eatFish(f) {
    const s = this.seal;
    f.alive = false;
    this.stats.fish++;
    this.stats.eaten++;
    this.addParticles(f.x, f.y, 8, "230,245,250", { max: 60, grav: -10 });
    if (this.role === "hunter") {
      s.hp = Math.min(s.maxHp, s.hp + 3);
      this.float(f.x, f.y - 12, "+3", GREEN);
    } else {
      s.hp = Math.min(s.maxHp, s.hp + 14);
      this.float(f.x, f.y - 12, "+1 FISH +14", GREEN);
      this.flash = Math.max(this.flash, 0.12);
      this.flashColor = "143,224,176";
    }
  }

  updateHarpoons(dt) {
    const s = this.seal;
    for (const h of this.harpoons) {
      h.life -= dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.vy += 55 * dt;
      h.vx *= 1 - Math.min(1, dt * 0.6);
      if (Math.hypot(h.x - s.x, h.y - s.y) < 15) {
        this.hitSeal(Math.round(34 * this.hunterDmg));
        h.life = 0;
        this.addParticles(h.x, h.y, 14, "226,96,74", { max: 110, grav: 40 });
      }
    }
    this.harpoons = this.harpoons.filter(
      (h) => h.life > 0 && h.x > -40 && h.x < WORLD_W + 40 && h.y < WORLD_H + 20
    );
  }

  hitSeal(dmg, cause = "hunter") {
    const s = this.seal;
    if (s.iframe > 0) return;
    s.iframe = 0.7;
    s.hp = Math.max(0, s.hp - dmg);
    if (s.hp <= 0) this.sealKilledBy = cause;
    s.hurt = 0.45;
    s.stun = Math.max(s.stun, 0.22);
    s.breath = Math.max(0, s.breath - 8);
    this.stats.hits++;
    this.shake = Math.max(this.shake, 4);
    this.flash = Math.max(this.flash, 0.45);
    this.flashColor = "226,96,74";
    this.float(s.x, s.y - 22, `-${dmg}`, RED);
  }

  updateBombs(dt) {
    const s = this.seal;
    const b = this.boat;
    for (const bomb of this.bombs) {
      bomb.t += dt;
      bomb.fuse -= dt;
      bomb.x += bomb.vx * dt;
      bomb.y += bomb.vy * dt;
      if (bomb.y > SURFACE) {
        bomb.vy += 46 * dt;
        bomb.vx *= 1 - Math.min(1, dt * 0.7);
        bomb.vy *= 1 - Math.min(1, dt * 0.2);
        bomb.x = clamp(bomb.x, 10, WORLD_W - 10);
        if (bomb.y > WORLD_H - 14) {
          bomb.y = WORLD_H - 14;
          bomb.vy = 0;
        }
      } else {
        bomb.vy += 250 * dt;
      }
      if (bomb.fuse <= 0) {
        bomb.exploded = true;
        this.explode(bomb.x, bomb.y);
      }
      if (bomb.fuse < 0.9 && Math.random() < 0.35) {
        this.particles.push({
          x: bomb.x + rand(-2, 2),
          y: bomb.y - 4,
          vx: rand(-6, 6),
          vy: rand(-20, -6),
          life: 0.3,
          max: 0.3,
          color: "255,190,90",
          size: 1,
          grav: -20,
        });
      }
    }
    this.bombs = this.bombs.filter((bomb) => !bomb.exploded);

    // bait eaten check for the player seal
    if (this.role === "seal") {
      for (const bait of this.baits) {
        if (bait.eaten) continue;
        if (Math.hypot(bait.x - s.x, bait.y - s.y) < 17) {
          bait.eaten = true;
          this.stats.fish++;
          this.stats.eaten++;
          this.addParticles(bait.x, bait.y, 8, "230,245,250", { max: 60, grav: -10 });
          this.float(bait.x, bait.y - 12, "+1 FISH", GREEN);
        }
      }
      this.baits = this.baits.filter((bait) => !bait.eaten && bait.life > 0);
    }
  }

  explode(x, y) {
    this.booms.push({ x, y, age: 0 });
    this.rings.push({ x, y, r: 6, vr: 210, life: 0.4, max: 0.4, color: "255,214,120" });
    this.addParticles(x, y, 26, "240,140,70", { max: 200, life: 1, grav: 100 });
    this.addParticles(x, y, 14, "90,90,90", { max: 120, life: 1.6, grav: -40 });
    this.shake = Math.max(this.shake, 7);
    this.flash = Math.max(this.flash, 0.3);
    this.flashColor = "255,190,110";
    const s = this.seal;
    const d = Math.hypot(x - s.x, y - s.y);
    if (d < 68) {
      this.hitSeal(Math.round((d < 40 ? 40 : 26) * this.hunterDmg));
      const a = Math.atan2(s.y - y, s.x - x);
      s.vx += Math.cos(a) * 120;
      s.vy += Math.sin(a) * 100;
    }
    this.scatterFish(x, y, 90, 120, 80);
  }

  updateNets(dt) {
    const s = this.seal;
    const b = this.boat;
    for (const n of this.nets) {
      n.life -= dt;
      if (n.armed > 0) {
        n.armed -= dt;
        continue;
      }
      const nearX = Math.abs(n.x - s.x) < 15;
      const inDepth = s.y < n.depth + 8 && s.y > SURFACE - 4;
      if (nearX && inDepth && s.dash <= 0) {
        n.life = 0;
        this.hitSeal(Math.round(25 * this.hunterDmg));
        s.stun = this.role === "seal" ? 0.8 : 1.0;
        s.vx *= 0.2;
        s.vy *= 0.2;
        this.float(s.x, s.y - 24, "TANGLED!", RED);
        this.addParticles(n.x, s.y, 16, "200,170,110", { max: 80, grav: 90 });
      }
    }
    this.nets = this.nets.filter((n) => n.life > 0);
  }

  updateBaits(dt) {
    for (const bt of this.baits) {
      bt.life -= dt;
      bt.y = lerp(bt.y, bt.ty, Math.min(1, dt * 2.4));
      bt.x += Math.sin(this.t * 1.4 + bt.phase) * dt * 4;
    }
    this.baits = this.baits.filter((bt) => bt.life > 0 && !bt.eaten);

    // the NPC seal is drawn to bait
    if (this.role === "hunter") {
      const s = this.seal;
      const live = this.baits.filter((bt) => !bt.eaten);
      if (live.length) {
        let closest = null;
        let cd = 1e9;
        for (const bt of live) {
          const d = Math.hypot(bt.x - s.x, bt.y - s.y);
          if (d < cd) {
            cd = d;
            closest = bt;
          }
        }
        if (closest && cd < 22) {
          closest.eaten = true;
          s.hp = Math.min(s.maxHp, s.hp + 4);
          this.addParticles(closest.x, closest.y, 6, "220,240,246", { max: 50, grav: -10 });
        }
      }
    }
  }

  updateEffects(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt * 0.5;
      p.vx *= 1 - Math.min(1, dt * 1.2);
      if (p.y < SURFACE - 30) p.vy += 60 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      r.r += r.vr * dt;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const f of this.floats) {
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= 0.97;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
    for (const bm of this.booms) bm.age += dt;
    this.booms = this.booms.filter((bm) => bm.age < 0.55);
  }

  // ------------------------------------------------------------ hazards
  updateHazards(dt) {
    const hz = this.hz;

    // calved ice drifts, then crumbles
    for (const f of this.floes) {
      if (f.temp === undefined) continue;
      f.temp -= dt;
      f.x = clamp(f.x + (f.vx || 0) * dt, 30, WORLD_W - 30);
      if (f.temp <= 0) this.addParticles(f.x, SURFACE, 8, "205,235,245", { max: 40, life: 0.6 });
    }
    this.floes = this.floes.filter((f) => f.temp === undefined || f.temp > 0);

    // the glacier calving
    if (hz.calve) {
      this.calveTimer -= dt;
      if (this.calveTimer <= 0) {
        this.calveTimer = hz.calve * rand(0.8, 1.25) * (this.role === "seal" ? 0.85 : 1);
        const x = clamp(this.focusX() + rand(-180, 180), 50, WORLD_W - 50);
        this.calves.push({ x, t: 0, warn: 1.25 });
      }
    }
    for (const c of this.calves) c.t += dt;
    for (const c of this.calves.filter((c) => c.t >= c.warn)) this.calveImpact(c.x);
    this.calves = this.calves.filter((c) => c.t < c.warn);

    for (const sp of this.spouts) sp.t += dt;
    this.spouts = this.spouts.filter((sp) => sp.t < 0.55);

    for (const sh of this.shards) {
      sh.t += dt;
      sh.vy += 640 * dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
    }
    this.shards = this.shards.filter((sh) => sh.t < 1.3 && sh.y < WORLD_H + 24);

    this.updateOrcas(dt);
    this.updateDebris(dt);
  }

  calveImpact(x) {
    this.spouts.push({ x, t: 0 });
    this.rings.push({ x, y: SURFACE + 1, r: 8, vr: 230, life: 0.6, max: 0.6, color: "225,245,252" });
    this.addParticles(x, SURFACE, 34, "230,248,253", { min: 60, max: 210, life: 1.1, grav: 230 });
    this.addParticles(x, SURFACE, 12, "150,200,220", { min: 20, max: 90, life: 1.3, grav: 160 });
    this.shake = Math.max(this.shake, 8);
    this.flash = Math.max(this.flash, 0.2);
    this.flashColor = "220,245,252";
    for (let i = 0; i < 4; i++) {
      this.shards.push({
        x: x + rand(-14, 14),
        y: SURFACE - 6,
        vx: rand(-110, 110),
        vy: rand(-250, -120),
        t: 0,
        frame: Math.floor(rand(0, 3)),
      });
    }
    const s = this.seal;
    if (Math.abs(s.x - x) < 66 && s.y < SURFACE + 96) {
      this.hitSeal(18, "ice");
      s.stun = Math.max(s.stun, 0.45);
      s.vy += 40;
    }
    const b = this.boat;
    if (Math.abs(b.x - x) < 52) {
      b.stun = Math.max(b.stun, 0.85);
      b.vx += sgn(b.x - x) * 60;
    }
    const pool = A.floes.filter((f) => f.level >= 3);
    for (let i = 0; i < 2 && pool.length; i++) {
      const art = pick(pool);
      this.floes.push({
        x: clamp(x + rand(-40, 40), 40, WORLD_W - 40),
        w: art.w,
        h: art.h,
        waterline: art.waterline,
        img: art.img,
        phase: rand(0, TAU),
        temp: rand(9, 13),
        vx: rand(-6, 6),
      });
    }
    this.scatterFish(x, SURFACE, 120, 90, 60);
  }

  scatterFish(x, y, radius, kx, ky) {
    for (const f of this.fish) {
      if (!f.alive || Math.hypot(f.x - x, f.y - y) >= radius) continue;
      const a = Math.atan2(f.y - y, f.x - x);
      f.vx += Math.cos(a) * kx;
      f.vy += Math.sin(a) * ky;
    }
  }

  updateOrcas(dt) {
    if (!this.orcas.length) return;
    const s = this.seal;
    const hidden = this.isSealHidden();
    for (const o of this.orcas) {
      o.wait = Math.max(0, o.wait - dt);
      o.anim += dt;
      const dist = Math.hypot(s.x - o.x, s.y - o.y);
      const hunting = o.wait <= 0 && !hidden && dist < 320;
      let tx;
      let ty;
      if (hunting) {
        tx = s.x + s.vx * 0.22;
        ty = s.y + s.vy * 0.16;
        if (dist < 40) {
          this.hitSeal(20, "orca");
          const a = Math.atan2(s.y - o.y, s.x - o.x);
          s.vx += Math.cos(a) * 190;
          s.vy += Math.sin(a) * 140;
          s.stun = Math.max(s.stun, 0.5);
          this.float(o.x, o.y - 26, "ORCA BITE!", RED);
          this.shake = Math.max(this.shake, 7);
          this.addParticles(s.x, s.y, 14, "226,96,74", { max: 120, grav: 20 });
          o.wait = 3.4;
          o.vx *= -0.5;
          o.vy *= -0.4;
        }
      } else {
        if (Math.abs(o.x - o.tx) < 60 || Math.random() < dt * 0.25) o.tx = rand(100, WORLD_W - 100);
        tx = o.tx;
        ty = 176 + Math.sin(this.t * 0.45 + o.phase) * 26;
      }
      const dx = tx - o.x;
      const dy = ty - o.y;
      const m = Math.hypot(dx, dy) || 1;
      const speed = hunting ? this.hz.orcaSpeed : 54;
      const k = Math.min(1, dt * (hunting ? 2 : 1.2));
      o.vx = lerp(o.vx, (dx / m) * speed, k);
      o.vy = lerp(o.vy, (dy / m) * speed * 0.75, k);
      o.x = clamp(o.x + o.vx * dt, 34, WORLD_W - 34);
      o.y = clamp(o.y + o.vy * dt, SURFACE + 38, WORLD_H - 26);
      if (Math.abs(o.vx) > 8) o.facing = o.vx < 0 ? -1 : 1;
      if (o.y < SURFACE + 62 && Math.random() < 0.15) this.bubble(o.x, SURFACE + 5);
    }
  }

  updateDebris(dt) {
    const s = this.seal;
    for (const d of this.debris) {
      d.x += d.vx * dt;
      if (d.x < -30 || d.x > WORLD_W + 30) d.alive = false;
      const bob = Math.sin(this.t * 1.2 + d.phase) * 6;
      if (s.dash <= 0 && Math.hypot(s.x - d.x, s.y - (d.y + bob)) < 21) {
        this.hitSeal(12, "debris");
        s.stun = Math.max(s.stun, 0.9);
        this.float(d.x, d.y - 24, "ENTANGLED!", RED);
        this.addParticles(d.x, d.y, 12, "200,190,160", { max: 70, grav: 40 });
        d.alive = false;
      }
    }
    this.debris = this.debris.filter((d) => d.alive);
    if (this.debris.length < this.hz.debris && Math.random() < dt * 0.35) this.spawnDebris(false);
  }

  spawnDebris(anywhere) {
    const fromLeft = Math.random() < 0.5;
    this.debris.push({
      x: anywhere ? rand(60, WORLD_W - 60) : fromLeft ? -24 : WORLD_W + 24,
      y: rand(SURFACE + 55, WORLD_H - 46),
      vx: anywhere ? rand(-16, 16) : fromLeft ? rand(12, 26) : -rand(12, 26),
      variant: Math.floor(rand(0, 3)),
      phase: rand(0, TAU),
      alive: true,
    });
  }

  // ------------------------------------------------------------ NPC seal
  updateSealAI(dt) {
    const s = this.seal;
    const b = this.boat;
    const ai = this.level.ai.seal;
    if (s.stun > 0) {
      s.vx *= 1 - Math.min(1, dt * 3);
      s.vy *= 1 - Math.min(1, dt * 3);
      return;
    }
    if (s.dash > 0) return;

    const approaching = (h) => {
      const dx = s.x - h.x;
      const dy = s.y - h.y;
      return Math.hypot(dx, dy) < 110 && h.vx * dx + h.vy * dy > 0;
    };
    const harpoonNear = this.harpoons.some(approaching);
    const bombNear = this.bombs.find((bm) => Math.hypot(bm.x - s.x, bm.y - s.y) < 96);
    const netNear = this.nets.find((n) => Math.abs(n.x - s.x) < 46 && s.y < n.depth + 26);
    const orcaNear = this.orcas.find((o) => Math.hypot(o.x - s.x, o.y - s.y) < 190) || null;
    const dist = Math.abs(s.x - b.x);

    s.aiThink -= dt;
    if (s.aiThink <= 0) {
      s.aiThink = 0.16;
      let tx = s.x;
      let ty = s.y;
      let surfacing = false;

      if (s.breath < 34) {
        surfacing = true;
        ty = SURFACE + 13;
        tx = s.x + (s.x > b.x ? 70 : -70);
      } else if (orcaNear || harpoonNear || bombNear || netNear || dist < 105) {
        tx = s.x + sgn(s.x - b.x || 1) * 160;
        ty = clamp(s.y + 60, SURFACE + 55, WORLD_H - 26);
        if (orcaNear) {
          // an orca cannot follow a seal up into the shallows
          tx = s.x + sgn(s.x - orcaNear.x || 1) * 150;
          ty = clamp(s.y - 70, SURFACE + 32, WORLD_H - 26);
        }
        if (bombNear) {
          tx = s.x - sgn(bombNear.x - s.x) * 90;
          ty = clamp(s.y + (s.y > bombNear.y ? 55 : -25), SURFACE + 45, WORLD_H - 26);
        }
        if (netNear) tx = netNear.x + sgn(s.x - netNear.x) * 80;
      } else {
        let prey = null;
        let best = 300;
        for (const bt of this.baits) {
          const d = Math.hypot(bt.x - s.x, bt.y - s.y);
          if (!bt.eaten && d < best) {
            best = d;
            prey = bt;
          }
        }
        if (!prey) {
          best = 260;
          for (const f of this.fish) {
            if (!f.alive) continue;
            const d = Math.hypot(f.x - s.x, f.y - s.y);
            if (d < best) {
              best = d;
              prey = f;
            }
          }
        }
        if (prey) {
          tx = prey.x;
          ty = prey.y;
        } else {
          tx = s.x + rand(-90, 90);
          ty = rand(SURFACE + 60, WORLD_H - 30);
        }
      }
      s.surfacing = surfacing;
      s.aiTarget = {
        x: clamp(tx, 26, WORLD_W - 26),
        y: clamp(ty, SURFACE + 12, WORLD_H - 22),
      };
    }

    const dx = s.aiTarget.x - s.x;
    const dy = s.aiTarget.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    let speed = ai.speed;
    if (s.surfacing) speed *= 0.56;
    if (dist < 150) speed *= 1.1;
    const k = Math.min(1, dt * 4.5);
    s.vx = lerp(s.vx, (dx / d) * speed, k);
    s.vy = lerp(s.vy, (dy / d) * speed * 0.92, k);
    if (Math.abs(dx) > 8) s.facing = dx < 0 ? -1 : 1;

    s.aiEvade -= dt;
    if (harpoonNear && s.aiEvade <= 0 && Math.random() < ai.evade * dt * 28) {
      const side = Math.random() < 0.5 ? -1 : 1;
      s.vx = sgn(s.vx || 1) * speed * 0.6;
      s.vy = side * speed * 1.8;
      s.aiEvade = 1.5;
      this.bubble(s.x, s.y);
    }

    if (s.surfacing && s.y < SURFACE + 24 && Math.random() < 0.25) {
      this.ripple(s.x, SURFACE + 1, 3, 22);
    }
  }

  // ------------------------------------------------------------ NPC hunter
  updateHunterAI(dt) {
    const b = this.boat;
    const s = this.seal;
    const hidden = this.isSealHidden();

    if (hidden) {
      b.lost = Math.min(1, b.lost + dt * 2);
    } else {
      b.lost = Math.max(0, b.lost - dt * 2);
      b.lastSeen.x = s.x;
      b.lastSeen.y = s.y;
    }

    if (b.stun > 0) {
      b.vx *= 1 - Math.min(1, dt * 3);
      b.telegraph = 0;
      return;
    }

    const ai = this.aiHunter;
    const targetX = hidden ? b.lastSeen.x : s.x;
    const d = targetX - b.x;
    let dir = 0;
    if (Math.abs(d) > 175) dir = sgn(d);
    else if (Math.abs(d) < 110) dir = -sgn(d || 1);
    else dir = Math.sin(this.t * 0.7) > 0 ? 0.5 : -0.5;
    b.vx = lerp(b.vx, dir * ai.speed, Math.min(1, dt * 4));
    b.facing = targetX < b.x ? -1 : 1;

    const lead = hidden ? 0 : 0.26;
    const px = (hidden ? b.lastSeen.x : s.x + s.vx * lead) + rand(-6, 6);
    const py = (hidden ? b.lastSeen.y : s.y + s.vy * 0.18) + rand(-6, 6);
    b.topX = px;
    b.topY = py;
    const dx = px - b.x;
    const dy = py - (SURFACE + 3);
    b.aim = clamp(Math.atan2(dy, Math.abs(dx)), 0.05, 1.5);

    if (b.cd.fire <= 0) {
      b.telegraph += dt;
      if (b.telegraph > 0.62) {
        b.telegraph = 0;
        this.aiFire(ai.spread * (hidden ? 1.7 : 1));
        b.cd.fire = ai.fireDelay * rand(0.85, 1.2);
        b.shot = 0.15;
        this.stats.spears++;
      }
    } else {
      b.telegraph = Math.max(0, b.telegraph - dt * 2);
    }

    const wantBomb = hidden ? Math.random() < 0.004 : Math.hypot(s.x - b.x, s.y - b.y) < 260;
    if (b.cd.bomb <= 0 && wantBomb) {
      b.cd.bomb = ai.bombEvery * rand(0.8, 1.2);
      this.aiBomb(hidden ? 40 : 22);
    }

    if (b.cd.net <= 0) {
      b.cd.net = ai.netEvery * rand(0.85, 1.2);
      this.aiNet();
    }

    if (b.cd.bait <= 0) {
      b.cd.bait = ai.baitEvery * rand(0.8, 1.2);
      this.aiBait();
    }
    b.cd.bait = Math.max(0, b.cd.bait);
  }

  aiFire(spread) {
    const b = this.boat;
    const tx = b.topX + rand(-spread, spread);
    const ty = clamp(b.topY + rand(-spread, spread), SURFACE + 18, WORLD_H - 10);
    const dx = tx - b.x;
    const dy = ty - (SURFACE + 3);
    const face = dx < 0 ? -1 : 1;
    const ang = clamp(Math.atan2(dy, Math.abs(dx)), 0.05, 1.5);
    this.harpoons.push({
      x: b.x + face * 13,
      y: SURFACE + 3,
      vx: Math.cos(ang) * face * 340,
      vy: Math.sin(ang) * 340,
      life: 1.4,
    });
    b.facing = face;
    b.aim = ang;
    this.burst(b.x + face * 16, SURFACE + 4, 1, "225,245,252", 5);
  }

  aiBomb(spread) {
    const b = this.boat;
    const s = this.seal;
    const hidden = this.isSealHidden();
    const tx = clamp((hidden ? b.lastSeen.x : s.x + s.vx * 0.5) + rand(-spread, spread), 20, WORLD_W - 20);
    const ty = clamp((hidden ? b.lastSeen.y : s.y) + rand(-spread * 0.6, spread * 0.6), SURFACE + 34, WORLD_H - 20);
    const dx = tx - b.x;
    const dy = ty - (SURFACE + 2);
    const T = 0.8;
    const G = 250;
    this.bombs.push({
      x: b.x,
      y: SURFACE - 4,
      vx: dx / T,
      vy: (dy - 0.5 * G * T * T) / T,
      fuse: 2.5,
      t: 0,
    });
    this.stats.bombs++;
  }

  aiNet() {
    const b = this.boat;
    const s = this.seal;
    const hide = this.isSealHidden();
    const x = clamp((hide ? b.lastSeen.x : s.x + s.vx * 0.6) + rand(-24, 24), 20, WORLD_W - 20);
    const depth = clamp((hide ? b.lastSeen.y : s.y + s.vy * 0.4) + rand(-14, 22), SURFACE + 40, WORLD_H - 16);
    if (this.nets.length >= 3) this.nets.shift();
    this.nets.push({ x, depth, life: 13, max: 13, armed: 0.45, phase: rand(0, TAU), hostile: true });
    this.stats.nets++;
  }

  aiBait() {
    const b = this.boat;
    const s = this.seal;
    const x = clamp(s.x + rand(-80, 80), 24, WORLD_W - 24);
    const y = clamp(s.y + rand(-30, 20), SURFACE + 40, WORLD_H - 30);
    if (this.baits.length >= 3) this.baits.shift();
    this.baits.push({ x, y, ty: y, vy: 0, life: 18, max: 18, phase: rand(0, TAU), eaten: false });
  }

  checkEnd() {
    if (this.role === "hunter") {
      if (this.seal.hp <= 0) {
        if (this.sealKilledBy === "orca") this.finish("lost", "THE POD GOT THERE FIRST");
        else if (this.sealKilledBy === "ice") this.finish("lost", "THE GLACIER TOOK IT");
        else this.finish("won", "THE SEAL IS YOURS");
      } else if (this.timeLeft <= 0) {
        this.finish("lost", "IT SLIPPED AWAY");
      }
    } else if (this.seal.hp <= 0) {
      const by = this.sealKilledBy;
      this.finish(
        "lost",
        by === "orca"
          ? "TAKEN BY THE POD"
          : by === "ice"
            ? "CRUSHED BY THE GLACIER"
            : by === "debris"
              ? "TANGLED IN GHOST GEAR"
              : "CAUGHT IN THE NETS"
      );
    } else if (this.boat.hp <= 0) this.finish("won", "HUNTER DRIVEN OFF");
    else if (this.stats.fish >= this.level.fishGoal) this.finish("won", "BELLY FULL");
    else if (this.timeLeft <= 0) this.finish("lost", "STILL HUNGRY");
  }

  finish(result, reason) {
    if (this.status !== "playing") return;
    this.status = result;
    this.result = result;
    this.reason = reason;
    this.finishTime = this.level.time - Math.max(0, this.timeLeft);
    this.endTimer = 1;
    this.shake = Math.max(this.shake, 4);
    this.flash = 0.35;
    this.flashColor = result === "won" ? "143,224,176" : "226,96,74";
    if (result === "won") {
      this.addParticles(this.seal.x, this.seal.y, 20, "143,224,176", { max: 140, grav: -30 });
    }
  }

  // ------------------------------------------------------------ draw
  draw(ctx) {
    const sh = this.shake;
    const ox = sh > 0 ? rand(-sh, sh) : 0;
    const oy = sh > 0 ? rand(-sh, sh) : 0;
    ctx.save();
    ctx.translate(Math.round(-this.camX + ox), Math.round(oy));
    ctx.drawImage(A.bgs[this.levelIndex], 0, 0);
    this.drawAmbient(ctx);
    this.drawFloes(ctx);
    this.drawSurface(ctx);
    this.drawFish(ctx);
    this.drawBaits(ctx);
    this.drawNets(ctx);
    this.drawHazards(ctx);
    this.drawSeal(ctx);
    this.drawHarpoons(ctx);
    this.drawBombs(ctx);
    this.drawBoat(ctx);
    this.drawEffects(ctx);
    ctx.restore();

    this.drawFlash(ctx);
    this.drawHUD(ctx);
    if (this.status !== "playing") this.drawEnd(ctx);
  }

  drawAmbient(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#d8f0fa";
    for (let i = 0; i < 4; i++) {
      const bx = 140 + i * 260 + Math.sin(this.t * 0.28 + i) * 30;
      ctx.beginPath();
      ctx.moveTo(bx, SURFACE);
      ctx.lineTo(bx + 34, SURFACE);
      ctx.lineTo(bx + 104, WORLD_H);
      ctx.lineTo(bx + 34, WORLD_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = "rgba(216,240,250,0.16)";
    for (const m of this.motes) {
      ctx.fillRect(Math.round(m.x), Math.round(m.y), m.s, m.s);
    }
  }

  drawSurface(ctx) {
    for (let x = 0; x < WORLD_W; x += 3) {
      const y = SURFACE + Math.sin(x * 0.055 + this.t * 2.1) * 1.4;
      ctx.fillStyle = "rgba(227,244,251,0.55)";
      ctx.fillRect(x, Math.round(y), 3, 1);
      ctx.fillStyle = "rgba(20,60,78,0.35)";
      ctx.fillRect(x, Math.round(y) + 2, 3, 1);
    }
  }

  drawFloes(ctx) {
    for (const f of this.floes) {
      const bob = Math.sin(this.t * 1.1 + f.phase) * 0.9;
      const y = SURFACE - f.h * f.waterline + bob;
      ctx.drawImage(f.img, Math.round(f.x - f.w / 2), Math.round(y));
      ctx.fillStyle = "rgba(227,244,251,0.35)";
      const wy = Math.round(SURFACE + bob) - 1;
      ctx.fillRect(Math.round(f.x - f.w / 2) + 3, wy, Math.max(1, f.w - 6), 1);
    }
  }

  drawFish(ctx) {
    for (const f of this.fish) {
      if (!f.alive) continue;
      const frame = f.variant * 2 + (Math.floor(this.t * 3 + f.phase) % 2);
      const flip = f.vx < 0;
      drawFrame(ctx, "fish", frame, f.x - 7, f.y - 5, flip);
    }
  }

  drawBaits(ctx) {
    for (const bt of this.baits) {
      if (bt.eaten) continue;
      const sway = Math.sin(this.t * 1.6 + bt.phase) * 2;
      ctx.strokeStyle = "rgba(200,230,240,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bt.x, SURFACE);
      ctx.lineTo(bt.x + sway, bt.y - 6);
      ctx.stroke();
      drawFrame(ctx, "fish", Math.floor(this.t * 3) % 2, bt.x - 7 + sway, bt.y - 5, false);
      ctx.fillStyle = "rgba(220,240,248,0.5)";
      ctx.fillRect(Math.round(bt.x) - 1, SURFACE, 2, 2);
    }
  }

  drawNets(ctx) {
    for (const n of this.nets) {
      const armed = n.armed > 0;
      ctx.strokeStyle = armed ? "rgba(201,168,107,0.35)" : "rgba(201,168,107,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(n.x, SURFACE);
      ctx.lineTo(n.x, n.depth);
      ctx.stroke();
      ctx.fillStyle = "rgba(220,240,248,0.85)";
      ctx.fillRect(Math.round(n.x) - 3, SURFACE - 2, 6, 3);
      ctx.fillStyle = "rgba(226,96,74,0.8)";
      ctx.fillRect(Math.round(n.x) - 1, SURFACE - 4, 2, 2);
      for (let y = SURFACE + 6; y < n.depth; y += 6) {
        const w = 12 + Math.sin(y * 0.4 + n.phase) * 2;
        ctx.fillStyle = "rgba(201,168,107,0.55)";
        ctx.fillRect(Math.round(n.x - w / 2), Math.round(y), Math.round(w), 1);
        ctx.fillStyle = "rgba(201,168,107,0.28)";
        ctx.fillRect(Math.round(n.x + Math.sin(y * 0.5) * 3), Math.round(y), 1, 6);
      }
      ctx.fillStyle = "rgba(180,190,190,0.8)";
      ctx.fillRect(Math.round(n.x) - 2, Math.round(n.depth) - 2, 5, 3);
    }
  }

  drawIceChunk(ctx, x, y, w, h) {
    const steps = 3;
    for (let i = 0; i < steps; i++) {
      const ww = w - i * 4;
      ctx.fillStyle = i === 0 ? "#eaf8fd" : i === 1 ? "#c9e2ee" : "#a9c9d8";
      ctx.fillRect(Math.round(x - ww / 2), Math.round(y + (h / steps) * i), Math.round(ww), Math.ceil(h / steps));
    }
  }

  drawHazards(ctx) {
    for (const d of this.debris) {
      const bob = Math.sin(this.t * 1.2 + d.phase) * 6;
      ctx.globalAlpha = 0.85;
      drawFrame(ctx, "debris", d.variant, d.x - 13, d.y + bob - 11);
      ctx.globalAlpha = 1;
    }

    for (const o of this.orcas) {
      const frame = Math.floor(o.anim * 5) % 4;
      drawFrame(ctx, "orca", frame, o.x - A.sheets.orca.fw / 2, o.y - A.sheets.orca.fh / 2, o.facing < 0);
      if (o.y < SURFACE + 66) {
        const sx = Math.round(o.x);
        ctx.fillStyle = "#1b2430";
        ctx.beginPath();
        ctx.moveTo(sx - 10, SURFACE + 2);
        ctx.lineTo(sx + 1, SURFACE - 14);
        ctx.lineTo(sx + 10, SURFACE + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(220,245,255,0.45)";
        ctx.fillRect(sx - 13, SURFACE, 26, 1);
      }
    }

    for (const c of this.calves) {
      const sx = Math.round(c.x);
      if (sx < -60 || sx > VW + 60) continue;
      const p = Math.min(1, c.t / c.warn);
      ctx.fillStyle = `rgba(226,96,74,${0.1 + p * 0.16})`;
      ctx.fillRect(sx - 30, SURFACE, 60, 8);
      ctx.globalAlpha = 0.35 + Math.sin(this.t * 22) * 0.3;
      ctx.fillStyle = RED;
      ctx.fillRect(sx - 30, SURFACE - 34, 2, 34);
      ctx.fillRect(sx + 28, SURFACE - 34, 2, 34);
      for (let i = 0; i < 5; i++) ctx.fillRect(sx - 26 + i * 12, SURFACE - 40, 7, 2);
      ctx.globalAlpha = 1;
      const drop = c.t - (c.warn - 0.5);
      if (drop > 0) {
        const k = Math.min(1, drop / 0.5);
        const by = -34 + (SURFACE - 16 + 34) * k * k;
        ctx.fillStyle = "rgba(4,20,28,0.25)";
        ctx.beginPath();
        ctx.ellipse(sx, SURFACE + 2, 24 + k * 12, 4, 0, 0, TAU);
        ctx.fill();
        this.drawIceChunk(ctx, sx, by, 30 + k * 10, 24);
      }
      text(ctx, "!", sx, SURFACE - 62, { align: "center", color: RED, scale: 2, shadow: "#08141c" });
    }

    for (const sp of this.spouts) {
      const sx = Math.round(sp.x);
      const rise = Math.min(1, sp.t / 0.08);
      const fade = Math.max(0, 1 - sp.t / 0.55);
      ctx.globalAlpha = fade;
      for (let i = 0; i < 5; i++) {
        const w = Math.round((44 - i * 8) * (0.55 + rise * 0.45));
        ctx.fillStyle = i % 2 ? "#f2fdff" : "#d3ecf6";
        ctx.fillRect(sx - w / 2 + Math.round(Math.sin(i * 1.9) * 4), SURFACE - 3 - i * 5, w, 6);
      }
      for (let i = 0; i < 7; i++) {
        const x = sx + Math.round(Math.sin(i * 2.7 + sp.t * 3) * 22);
        const y = SURFACE - 16 - i * 6 - sp.t * 40;
        ctx.fillStyle = "#eafaff";
        ctx.fillRect(x, Math.round(y), 2, 4);
      }
      ctx.globalAlpha = 1;
    }

    for (const sh of this.shards) {
      ctx.save();
      ctx.translate(Math.round(sh.x), Math.round(sh.y));
      ctx.rotate(sh.t * 5 + sh.frame);
      drawFrame(ctx, "shard", sh.frame, -10, -10);
      ctx.restore();
    }
  }

  drawSeal(ctx) {
    const s = this.seal;
    const hidden = this.isSealHidden();
    let frame = 0;
    if (s.hurt > 0.12) frame = 5;
    else if (s.dash > 0) frame = 4;
    else if (Math.abs(s.vx) + Math.abs(s.vy) > 12) frame = 1 + (Math.floor(this.t * 7 + s.anim) % 3);
    ctx.save();
    if (hidden) ctx.globalAlpha = 0.5;
    else if (s.stun > 0) ctx.globalAlpha = 0.65 + Math.sin(this.t * 26) * 0.2;
    if (this.role === "seal") {
      ctx.strokeStyle = "rgba(190,240,255,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 23, 17, 0, 0, TAU);
      ctx.stroke();
    }
    drawFrame(ctx, "seal", frame, s.x - 16, s.y - 12, s.facing < 0);
    ctx.restore();

    if (hidden) {
      text(ctx, "HIDDEN", s.x, s.y - 26, { align: "center", scale: 1, color: CYAN });
    }
    if (s.breath < 26 && this.role === "seal") {
      text(ctx, "AIR!", s.x, s.y - 28, { align: "center", scale: 1, color: RED });
    }
  }

  drawBoat(ctx) {
    const b = this.boat;
    const bob = Math.sin(this.t * 2.3) * 1.1 + (b.stun > 0 ? Math.sin(this.t * 20) * 1.4 : 0);
    ctx.fillStyle = "rgba(4,20,28,0.4)";
    ctx.beginPath();
    ctx.ellipse(b.x, SURFACE + 6 + bob, 23, 3, 0, 0, TAU);
    ctx.fill();

    let frame = 0;
    if (b.stun > 0) frame = 6;
    else if (b.hurt > 0.2) frame = 6;
    else if (b.shot > 0.03 || b.telegraph > 0.1) frame = 4;
    else if (Math.abs(b.vx) > 16) frame = Math.floor(this.t * 8) % 2 ? 2 : 3;
    else frame = Math.floor(this.t * 2) % 2;

    if (this.role === "hunter") {
      const { x: gx, y: gy } = this.gunPos();
      const len = 190;
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = "rgba(227,244,251,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(b.aim) * b.facing * len, gy + Math.sin(b.aim) * len);
      ctx.stroke();
      if (b.cd.fire > 0) {
        ctx.strokeStyle = "rgba(242,193,78,0.35)";
        ctx.beginPath();
        ctx.moveTo(gx + Math.cos(b.aim) * b.facing * 12, gy + Math.sin(b.aim) * 12);
        ctx.lineTo(gx + Math.cos(b.aim) * b.facing * 22, gy + Math.sin(b.aim) * 22);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else if (b.telegraph > 0.1) {
      const { x: gx, y: gy } = this.gunPos();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "rgba(226,96,74,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(b.topX, b.topY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(226,96,74,0.6)";
      ctx.fillRect(Math.round(b.topX) - 2, Math.round(b.topY) - 2, 4, 4);
    }

    drawFrame(ctx, "boat", frame, b.x - 23, SURFACE - 27 + bob, b.facing < 0);

    if (b.stun > 0) {
      const a = this.t * 6;
      ctx.fillStyle = GOLD;
      for (let i = 0; i < 3; i++) {
        const ang = a + (i / 3) * TAU;
        ctx.fillRect(Math.round(b.x + Math.cos(ang) * 15), Math.round(SURFACE - 34 + Math.sin(ang) * 5), 2, 2);
      }
    }
    if (this.role === "seal" && b.lost > 0.5) {
      text(ctx, "?", b.x, SURFACE - 44, { align: "center", scale: 1, color: DIM });
    }
  }

  drawHarpoons(ctx) {
    const gun = this.gunPos();
    for (const h of this.harpoons) {
      const m = Math.hypot(h.vx, h.vy) || 1;
      const nx = h.vx / m;
      const ny = h.vy / m;
      ctx.strokeStyle = "rgba(210,235,245,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gun.x, gun.y);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
      ctx.strokeStyle = "#e9f6fc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.x - nx * 8, h.y - ny * 8);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(150,190,210,0.9)";
      ctx.beginPath();
      ctx.moveTo(h.x - nx * 3 - ny * 3, h.y - ny * 3 + nx * 3);
      ctx.lineTo(h.x - nx * 3 + ny * 3, h.y - ny * 3 - nx * 3);
      ctx.stroke();
    }
  }

  drawBombs(ctx) {
    for (const bm of this.bombs) {
      const hot = bm.fuse < 0.9;
      if (hot) {
        const p = (Math.sin(this.t * 22) + 1) / 2;
        ctx.strokeStyle = `rgba(226,96,74,${0.2 + p * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, 8 + p * 3, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = "#1d2730";
      ctx.beginPath();
      ctx.arc(bm.x, bm.y, 5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#3d4b56";
      ctx.fillRect(Math.round(bm.x) - 3, Math.round(bm.y) - 3, 2, 2);
      ctx.strokeStyle = "#a5763f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bm.x + 2, bm.y - 4);
      ctx.lineTo(bm.x + 4, bm.y - 8);
      ctx.stroke();
      ctx.fillStyle = hot ? "#ffd66b" : "#f0763a";
      ctx.fillRect(Math.round(bm.x + 4), Math.round(bm.y - 9), 1, 2);
      ctx.fillStyle = "rgba(4,20,28,0.35)";
      ctx.fillRect(Math.round(bm.x) - 6, Math.round(bm.y) + 6, 12, 1);
    }
  }

  drawEffects(ctx) {
    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.max);
      ctx.strokeStyle = `rgba(${r.color},${a * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.6, 0, 0, TAU);
      ctx.stroke();
    }
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    for (const bm of this.booms) {
      const f = Math.min(3, Math.floor(bm.age / 0.09));
      drawFrameScaled(ctx, "boom", f, bm.x, bm.y, 2);
    }
    for (const f of this.floats) {
      const a = Math.min(1, f.life / f.max + 0.2);
      ctx.globalAlpha = a;
      text(ctx, f.str, f.x, f.y, { align: "center", scale: 1, color: f.color });
      ctx.globalAlpha = 1;
    }
  }

  drawFlash(ctx) {
    if (this.flash <= 0) return;
    ctx.fillStyle = `rgba(${this.flashColor},${this.flash * 0.35})`;
    ctx.fillRect(0, 0, VW, VH);
    if (this.flash > 0.2) {
      ctx.fillStyle = `rgba(${this.flashColor},${(this.flash - 0.2) * 0.25})`;
      ctx.fillRect(0, 0, 12, VH);
      ctx.fillRect(VW - 12, 0, 12, VH);
    }
  }

  // ------------------------------------------------------------ HUD
  drawHUD(ctx) {
    const tsec = Math.max(0, this.timeLeft);
    const low = tsec < 15;
    text(ctx, `L${this.levelIndex + 1}  ${this.level.name}`, 10, 8, { color: DIM, scale: 1 });
    const roleLabel = this.role === "hunter" ? "HUNTER" : "SEAL";
    const roleColor = this.role === "hunter" ? GOLD : CYAN;
    text(ctx, `ROUND ${this.role === "hunter" ? 1 : 2} - ${roleLabel}`, 10, 18, { color: roleColor, scale: 1 });

    icon(ctx, 6, 192, 7, 1);
    text(ctx, fmtTime(tsec), 240, 5, {
      align: "center",
      scale: 2,
      color: low ? RED : ICE,
      shadow: "#08141c",
    });
    if (low) {
      ctx.fillStyle = `rgba(226,96,74,${0.18 + Math.sin(this.t * 9) * 0.1})`;
      ctx.fillRect(170, 3, 140, 22);
    }

    if (this.role === "hunter") {
      text(ctx, `SPEAR THE SEAL  ${this.stats.hits} HITS`, 240, 25, {
        align: "center",
        color: DIM,
      });
      text(ctx, "SEAL", 398, 8, { color: DIM });
      bar(ctx, 398, 17, 72, 5, this.seal.hp / this.seal.maxHp, "#e2604a");
      const pips = Math.ceil(this.seal.hp / 34);
      for (let i = 0; i < 3; i++) {
        if (i < pips) icon(ctx, 0, 398 + i * 12, 26, 1);
      }
      if (this.seal.breath < 55) {
        text(ctx, "AIR", 398, 40, { color: this.seal.breath < 30 ? CYAN : DIM });
        bar(ctx, 424, 43, 46, 4, this.seal.breath / 100, "#8fd8ea");
      }
    } else {
      const maxHearts = Math.ceil(this.seal.maxHp / 30);
      const hearts = Math.ceil(this.seal.hp / 30);
      for (let i = 0; i < maxHearts; i++) {
        if (i < hearts) icon(ctx, 0, 382 + i * 12, 7, 1);
        else {
          ctx.fillStyle = "rgba(226,96,74,0.22)";
          ctx.fillRect(382 + i * 12, 8, 10, 9);
        }
      }
      icon(ctx, 5, 396, 20, 1);
      text(ctx, `${Math.min(this.stats.fish, this.level.fishGoal)}/${this.level.fishGoal}`, 410, 22, {
        color: this.stats.fish >= this.level.fishGoal ? GREEN : ICE,
      });
      text(ctx, "AIR", 442, 8, { color: this.seal.breath < 30 ? RED : DIM });
      bar(ctx, 442, 18, 28, 4, this.seal.breath / 100, this.seal.breath < 30 ? RED : "#8fd8ea");
    }

    let warn = "";
    if (this.orcas.some((o) => Math.hypot(o.x - this.seal.x, o.y - this.seal.y) < 230)) warn = "ORCA!";
    else if (this.calves.length) warn = "CALVING!";
    if (warn) {
      ctx.globalAlpha = 0.55 + Math.sin(this.t * 10) * 0.35;
      text(ctx, warn, 240, 36, { align: "center", color: RED, shadow: "#08141c" });
      ctx.globalAlpha = 1;
    }

    this.drawToolbar(ctx);
    text(ctx, "ESC PAUSE", 470, 261, { align: "right", color: "rgba(143,178,198,0.5)" });

    const targetX = this.role === "hunter" ? this.seal.x : this.boat.x;
    const sx = targetX - this.camX;
    if (sx < 0 || sx > VW) {
      const left = sx < 0;
      const x = left ? 10 : VW - 10;
      const y = 128;
      ctx.fillStyle = this.role === "hunter" ? "rgba(226,96,74,0.9)" : "rgba(242,193,78,0.9)";
      ctx.beginPath();
      if (left) {
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 5, y - 6);
        ctx.lineTo(x + 5, y + 6);
      } else {
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x - 5, y - 6);
        ctx.lineTo(x - 5, y + 6);
      }
      ctx.closePath();
      ctx.fill();
      text(ctx, left ? "<" : ">", x + (left ? 8 : -8), y - 3, {
        align: left ? "left" : "right",
        color: DIM,
      });
    }

    if (this.hint > 0 && this.t < 6) {
      const msg =
        this.role === "hunter"
          ? "THE SEAL MUST SURFACE FOR AIR - WAIT FOR IT"
          : this.hz.orcas
            ? "HIDE UNDER A FLOE - THE POD CANNOT REACH YOU"
            : "EAT FISH. SURFACE FOR AIR. HIDE UNDER THE ICE.";
      ctx.globalAlpha = Math.min(1, this.hint);
      panel(ctx, 88, 206, 304, 16, { fill: "rgba(8,20,28,0.72)" });
      text(ctx, msg, 240, 210, { align: "center", color: ICE });
      ctx.globalAlpha = 1;
    }
  }

  drawToolbar(ctx) {
    const b = this.boat;
    const s = this.seal;
    const y = 232;
    if (this.role === "hunter") {
      const tools = [
        { icon: 1, key: "1", cd: b.cd.fire, max: 0.6 },
        { icon: 2, key: "2", cd: b.cd.bomb, max: 3.1 },
        { icon: 3, key: "3", cd: b.cd.net, max: 4.8 },
        { icon: 4, key: "4", cd: b.cd.bait, max: 5.5 },
      ];
      tools.forEach((t, i) => {
        const x = 10 + i * 30;
        panel(ctx, x, y, 26, 26, { fill: "rgba(8,20,28,0.8)" });
        icon(ctx, t.icon, x + 8, y + 3, 1);
        if (t.cd > 0) {
          const frac = Math.min(1, t.cd / t.max);
          ctx.fillStyle = "rgba(4,12,18,0.72)";
          ctx.fillRect(x + 1, y + 1 + Math.round((25) * (1 - frac)), 24, Math.round(25 * frac));
        }
        text(ctx, t.key, x + 3, y + 17, { color: GOLD, shadow: "#08141c" });
      });
      const dashX = 10 + 4 * 30;
      panel(ctx, dashX, y, 26, 26, { fill: "rgba(8,20,28,0.8)" });
      icon(ctx, 9, dashX + 8, y + 3, 1);
      text(ctx, "SH", dashX + 3, y + 17, { color: GOLD });
      if (b.cd.dash > 0) {
        const frac = b.cd.dash / 3.2;
        ctx.fillStyle = "rgba(4,12,18,0.72)";
        ctx.fillRect(dashX + 1, y + 1 + Math.round(25 * (1 - frac)), 24, Math.round(25 * frac));
      }
    } else {
      const tools = [
        { icon: 8, key: "SP", cd: s.cd.splash, max: 4.2 },
        { icon: 9, key: "SH", cd: s.cd.check, max: 4.6 },
      ];
      tools.forEach((t, i) => {
        const x = 10 + i * 30;
        panel(ctx, x, y, 26, 26, { fill: "rgba(8,20,28,0.8)" });
        icon(ctx, t.icon, x + 8, y + 3, 1);
        if (t.cd > 0) {
          const frac = Math.min(1, t.cd / t.max);
          ctx.fillStyle = "rgba(4,12,18,0.72)";
          ctx.fillRect(x + 1, y + 1 + Math.round(25 * (1 - frac)), 24, Math.round(25 * frac));
        }
        text(ctx, t.key, x + 3, y + 17, { color: GOLD, shadow: "#08141c" });
      });
    }
  }

  drawEnd(ctx) {
    const won = this.result === "won";
    ctx.fillStyle = "rgba(4,12,18,0.45)";
    ctx.fillRect(0, 0, VW, VH);
    panel(ctx, 84, 62, 312, 142, { accent: won ? "rgba(143,224,176,0.6)" : "rgba(226,96,74,0.6)" });
    text(ctx, won ? "ROUND WON" : "ROUND LOST", 240, 76, {
      align: "center",
      scale: 2,
      color: won ? GREEN : RED,
    });
    text(ctx, this.reason, 240, 102, { align: "center", color: ICE });
    ctx.fillStyle = "rgba(143,178,198,0.25)";
    ctx.fillRect(104, 116, 272, 1);
    if (this.role === "hunter") {
      text(ctx, `TIME  ${fmtTime(this.finishTime)}`, 104, 124, { color: DIM });
      text(ctx, `SPEARS THROWN  ${this.stats.spears}`, 104, 136, { color: DIM });
      text(ctx, `HITS LANDED  ${this.stats.hits}`, 104, 148, { color: DIM });
      text(ctx, `BOMBS  ${this.stats.bombs}   NETS  ${this.stats.nets}`, 104, 160, { color: DIM });
    } else {
      text(ctx, `FISH EATEN  ${this.stats.fish} / ${this.level.fishGoal}`, 104, 124, { color: DIM });
      text(ctx, `HITS TAKEN  ${this.stats.hits}`, 104, 136, { color: DIM });
      text(ctx, `SPLASHES  ${this.stats.splashes}   CHECKS  ${this.stats.checks}`, 104, 148, { color: DIM });
      text(ctx, `HUNTER LEFT  ${Math.round(this.boat.hp)}%`, 104, 160, { color: DIM });
    }
    if (this.endTimer <= 0) {
      const a = 0.6 + Math.sin(this.t * 6) * 0.3;
      ctx.globalAlpha = a;
      text(ctx, "PRESS SPACE", 240, 182, { align: "center", color: GOLD });
      ctx.globalAlpha = 1;
    }
  }
}
