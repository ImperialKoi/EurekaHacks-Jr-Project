import { A, drawFrame } from "./assets.js";
import { text, textWidth, panel, bar, icon } from "./render.js";
import { LEVELS, ROLE_INFO } from "./levels.js";
import { Round } from "./game.js";

const VW = 480;
const VH = 270;
const SURFACE = 100;

const ICE = "#e3f4fb";
const DIM = "#8fb2c6";
const GOLD = "#f2c14e";
const RED = "#e2604a";
const GREEN = "#8fe0b0";
const CYAN_ICE = "#8fd8ea";

const CLEAR_LINES = [
  "THE SOUND IS QUIET. THE SHELF IS NOT.",
  "THE CRACKS GREW WIDER OVERNIGHT.",
  "THE BAY IS SLUSHY AND WIDE OPEN.",
  "ONLY SHARDS LEFT TO HIDE BEHIND.",
  "THE ICE IS GONE. THE HUNT IS NOT.",
];

const wrap = (str, n) => {
  const words = str.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > n) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
};

export class App {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.input = input;
    this.t = 0;
    this.round = null;
    this.sel = 0;
    this.session = null;
    this.progress = this.load();
    this.gotoTitle();
  }

  load() {
    try {
      const raw = localStorage.getItem("thinice.progress");
      if (raw) {
        const p = JSON.parse(raw);
        return {
          unlocked: Math.max(1, Math.min(5, Number(p.unlocked) || 1)),
          cleared: Array.isArray(p.cleared) ? p.cleared : [],
        };
      }
    } catch (e) {
      /* ignore */
    }
    return { unlocked: 1, cleared: [] };
  }

  save() {
    try {
      localStorage.setItem("thinice.progress", JSON.stringify(this.progress));
    } catch (e) {
      /* ignore */
    }
  }

  update(dt) {
    this.t += dt;
    const before = this.scene;
    this.scene.update(dt);
    if (before !== this.scene) this.input.endFrame();
  }

  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    this.scene.draw(ctx);
  }

  backdrop(ctx, index, offset, dark = 0.45) {
    const img = A.bgs[index] || A.bgs[0];
    ctx.fillStyle = "#061118";
    ctx.fillRect(0, 0, VW, VH);
    ctx.drawImage(img, 0, 0, img.width, img.height, -offset, 0, 960, 270);
    ctx.fillStyle = `rgba(5,14,20,${dark})`;
    ctx.fillRect(0, 0, VW, VH);
  }

  // ------------------------------------------------------------- title
  gotoTitle() {
    const self = this;
    this.scene = {
      update() {
        if (self.input.hit("Space", "Enter") || self.input.clicked) self.gotoSelect();
      },
      draw(ctx) {
        const off = 220 + Math.sin(self.t * 0.18) * 40;
        self.backdrop(ctx, 0, off, 0.3);
        drawFrame(ctx, "boat", 0, 386, SURFACE - 27, false);
        drawFrame(ctx, "seal", Math.floor(self.t * 4) % 4, 120, 168, false);
        drawFrame(ctx, "fish", Math.floor(self.t * 3) % 2, 300, 200, true);

        ctx.fillStyle = "rgba(4,12,18,0.45)";
        ctx.fillRect(0, 0, VW, 118);
        ctx.fillStyle = "rgba(4,12,18,0.35)";
        ctx.fillRect(0, 214, VW, 56);

        text(ctx, "THIN ICE", 240, 26, { align: "center", scale: 4, color: ICE });
        text(ctx, "A MARINE CONSERVATION STORY", 240, 64, { align: "center", color: GOLD });
        ctx.fillStyle = "rgba(242,193,78,0.85)";
        ctx.fillRect(146, 78, 188, 1);
        text(ctx, "THE ICE IS MELTING. BOTH SIDES FEEL IT.", 240, 86, {
          align: "center",
          color: ICE,
        });
        text(ctx, "ROUND 1: HUNTER   ROUND 2: SEAL", 240, 102, {
          align: "center",
          color: DIM,
        });

        const blink = 0.55 + Math.sin(self.t * 4) * 0.45;
        ctx.globalAlpha = blink;
        text(ctx, "PRESS SPACE OR CLICK", 240, 226, { align: "center", scale: 1, color: ICE });
        ctx.globalAlpha = 1;
        text(ctx, `LEVEL ${self.progress.unlocked} OF 5 UNLOCKED`, 240, 242, {
          align: "center",
          color: DIM,
        });
        text(ctx, "5 MAPS   -   10 ROUNDS   -   THE ICE KEEPS MELTING", 240, 256, {
          align: "center",
          color: "rgba(143,178,198,0.55)",
        });
      },
    };
  }

  // ------------------------------------------------------------- select
  cardRect(i) {
    return { x: 6 + i * 94, y: 84, w: 90, h: 122 };
  }

  gotoSelect() {
    const self = this;
    const inp = this.input;
    this.sel = Math.min(this.progress.unlocked - 1, 4);
    this.scene = {
      update() {
        if (inp.hit("KeyA", "ArrowLeft")) self.sel = (self.sel + 4) % 5;
        if (inp.hit("KeyD", "ArrowRight")) self.sel = (self.sel + 1) % 5;
        for (let i = 0; i < 5; i++) if (inp.hit("Digit" + (i + 1))) self.sel = i;
        if (inp.hit("Escape")) return self.gotoTitle();
        if (inp.hit("Space", "Enter")) {
          if (self.sel < self.progress.unlocked) return self.startLevel(self.sel);
          return;
        }
        if (inp.clicked) {
          for (let i = 0; i < 5; i++) {
            const r = self.cardRect(i);
            if (inp.mx >= r.x && inp.mx <= r.x + r.w && inp.my >= r.y && inp.my <= r.y + r.h) {
              self.sel = i;
              if (i < self.progress.unlocked) return self.startLevel(i);
            }
          }
        }
      },
      draw(ctx) {
        self.backdrop(ctx, Math.min(self.sel, 4), 180, 0.72);
        text(ctx, "THE MELTING EDGE", 240, 22, { align: "center", scale: 2, color: ICE });
        text(ctx, "WIN BOTH ROUNDS TO CLEAR A MAP AND OPEN THE NEXT", 240, 42, {
          align: "center",
          color: DIM,
        });

        for (let i = 0; i < 5; i++) {
          const r = self.cardRect(i);
          const locked = i >= self.progress.unlocked;
          const cleared = self.progress.cleared.includes(i);
          const sel = self.sel === i;
          panel(ctx, r.x, r.y, r.w, r.h, {
            fill: sel ? "rgba(12,32,42,0.94)" : "rgba(8,20,28,0.82)",
            border: sel ? "rgba(242,193,78,0.9)" : "rgba(143,178,198,0.35)",
            accent: sel ? "rgba(242,193,78,0.5)" : null,
          });
          const img = A.bgs[i];
          ctx.drawImage(img, 110, 26, 260, 120, r.x + 3, r.y + 3, r.w - 6, 38);
          if (locked) {
            ctx.fillStyle = "rgba(4,12,18,0.78)";
            ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, 38);
            text(ctx, "LOCKED", r.x + r.w / 2, r.y + 16, { align: "center", color: DIM });
          }
          text(ctx, `LEVEL ${i + 1}`, r.x + 4, r.y + 46, { color: sel ? GOLD : DIM });
          wrap(LEVELS[i].name, 13)
            .slice(0, 2)
            .forEach((ln, k) => text(ctx, ln, r.x + 4, r.y + 56 + k * 8, { color: ICE }));
          text(ctx, `ICE ${LEVELS[i].ice}%`, r.x + 4, r.y + 74, { color: "rgba(143,178,198,0.6)" });
          wrap(LEVELS[i].threat, 13)
            .slice(0, 2)
            .forEach((ln, k) =>
              text(ctx, ln, r.x + 4, r.y + 86 + k * 8, {
                color: i === 0 ? "rgba(143,178,198,0.7)" : "rgba(226,96,74,0.9)",
              })
            );
          if (cleared) {
            icon(ctx, 7, r.x + 4, r.y + r.h - 17, 1);
            text(ctx, "CLEARED", r.x + 17, r.y + r.h - 15, { color: GREEN });
          } else if (!locked) {
            text(ctx, "READY", r.x + 4, r.y + r.h - 15, { color: sel ? GOLD : DIM });
          } else {
            text(ctx, "LOCKED", r.x + 4, r.y + r.h - 15, { color: "rgba(143,178,198,0.55)" });
          }
        }

        const lockedSel = self.sel >= self.progress.unlocked;
        text(
          ctx,
          lockedSel ? "LOCKED - CLEAR THE PREVIOUS MAP FIRST" : "A / D SELECT    SPACE START",
          240,
          226,
          { align: "center", color: lockedSel ? RED : ICE }
        );
        text(ctx, "ESC TITLE      1-5 QUICK PICK", 240, 242, { align: "center", color: DIM });
        text(ctx, "CLICK A CARD TO DEPLOY", 240, 256, {
          align: "center",
          color: "rgba(143,178,198,0.55)",
        });
      },
    };
  }

  // ------------------------------------------------------------- flow
  startLevel(index) {
    this.session = { level: index, round: 0, won: [false, false] };
    this.gotoBrief();
  }

  gotoBrief() {
    const self = this;
    const inp = this.input;
    const levelIndex = this.session.level;
    const roundIndex = this.session.round;
    const level = LEVELS[levelIndex];
    const info = ROLE_INFO[roundIndex];
    this.scene = {
      update() {
        if (inp.hit("Escape")) return self.gotoSelect();
        if (inp.hit("Space", "Enter") || inp.clicked) return self.startRound();
      },
      draw(ctx) {
        self.backdrop(ctx, levelIndex, 240 + roundIndex * 60, 0.55);
        panel(ctx, 54, 16, 372, 248, { fill: "rgba(7,18,25,0.92)", accent: "rgba(143,178,198,0.35)" });

        text(ctx, `LEVEL ${levelIndex + 1}  -  ${level.name}`, 70, 26, { color: DIM });
        text(ctx, info.tag + ": " + info.role, 70, 38, { scale: 2, color: info.color });
        ctx.fillStyle = "rgba(143,178,198,0.22)";
        ctx.fillRect(70, 58, 340, 1);
        text(ctx, "OBJECTIVE: " + info.objective, 70, 64, { color: GOLD });
        info.lines.forEach((ln, i) => text(ctx, ln, 70, 76 + i * 9, { color: ICE }));

        ctx.fillStyle = "rgba(143,178,198,0.22)";
        ctx.fillRect(70, 106, 340, 1);
        text(ctx, "FIELD NOTE", 70, 112, { color: DIM });
        wrap(level.fieldNote, 54)
          .slice(0, 2)
          .forEach((ln, i) => text(ctx, ln, 70, 122 + i * 8, { color: ICE }));
        text(ctx, "NEW THREAT", 70, 142, { color: RED });
        wrap(level.threatLine, 52)
          .slice(0, 2)
          .forEach((ln, i) => text(ctx, ln, 70, 152 + i * 8, { color: "rgba(226,96,74,0.9)" }));

        ctx.fillStyle = "rgba(143,178,198,0.22)";
        ctx.fillRect(70, 172, 340, 1);
        text(ctx, "CONTROLS", 70, 178, { color: DIM });
        info.controls.forEach(([key, desc], i) => {
          const col = i < 4 ? 0 : 1;
          const row = col === 0 ? i : i - 4;
          const x = 70 + col * 176;
          const y = 190 + row * 10;
          text(ctx, key, x, y, { color: info.color });
          text(ctx, desc, x + 62, y, { color: ICE });
        });

        ctx.fillStyle = "rgba(143,178,198,0.22)";
        ctx.fillRect(70, 230, 340, 1);
        text(
          ctx,
          roundIndex === 0 ? "ROUND 1 OF 2  -  YOU HUNT" : "ROUND 2 OF 2  -  YOU ARE THE SEAL",
          70,
          236,
          { color: info.color }
        );
        text(ctx, `ICE LEFT: ${level.ice}%`, 410, 236, { align: "right", color: DIM });

        const blink = 0.6 + Math.sin(self.t * 4) * 0.4;
        ctx.globalAlpha = blink;
        text(ctx, "PRESS SPACE TO BEGIN", 240, 250, { align: "center", color: GOLD });
        ctx.globalAlpha = 1;
      },
    };
  }

  startRound() {
    const self = this;
    const inp = this.input;
    const levelIndex = this.session.level;
    const roundIndex = this.session.round;
    const round = new Round({
      level: LEVELS[levelIndex],
      levelIndex,
      role: roundIndex === 0 ? "hunter" : "seal",
      input: inp,
    });
    this.round = round;
    let paused = false;
    this.scene = {
      update(dt) {
        if (inp.hit("Escape")) paused = !paused;
        if (paused) {
          if (inp.hit("Backspace")) return self.gotoSelect();
          return;
        }
        round.update(dt);
        if (round.done) self.finishRound(round);
      },
      draw(ctx) {
        round.draw(ctx);
        if (paused) self.drawPause(ctx);
      },
    };
  }

  finishRound(round) {
    if (round.result === "won") {
      this.session.won[this.session.round] = true;
      if (this.session.round === 0) {
        this.session.round = 1;
        this.gotoBrief();
      } else {
        this.clearLevel();
      }
    } else {
      this.gotoBrief();
    }
  }

  clearLevel() {
    const index = this.session.level;
    if (!this.progress.cleared.includes(index)) this.progress.cleared.push(index);
    this.progress.unlocked = Math.max(this.progress.unlocked, Math.min(5, index + 2));
    this.save();
    this.gotoLevelClear(index);
  }

  gotoLevelClear(index) {
    const self = this;
    const inp = this.input;
    this.scene = {
      update() {
        if (inp.hit("Space", "Enter") || inp.clicked) {
          if (index >= 4) self.gotoEnding();
          else self.gotoSelect();
        }
      },
      draw(ctx) {
        self.backdrop(ctx, index, 200 + Math.sin(self.t * 0.2) * 30, 0.55);
        panel(ctx, 76, 54, 328, 162, { accent: "rgba(143,224,176,0.7)" });
        text(ctx, "MAP CLEARED", 240, 68, { align: "center", scale: 3, color: GREEN });
        text(ctx, `LEVEL ${index + 1}  -  ${LEVELS[index].name}`, 240, 104, {
          align: "center",
          color: ICE,
        });
        text(ctx, "BOTH ROUNDS WON", 240, 118, { align: "center", color: DIM });
        ctx.fillStyle = "rgba(143,178,198,0.22)";
        ctx.fillRect(100, 130, 280, 1);
        wrap(CLEAR_LINES[index], 44).forEach((ln, i) =>
          text(ctx, ln, 240, 138 + i * 10, { align: "center", color: GOLD })
        );
        text(ctx, `ICE LEFT HERE: ${LEVELS[index].ice}%`, 240, 164, {
          align: "center",
          color: LEVELS[index].ice < 30 ? RED : CYAN_ICE,
        });
        text(
          ctx,
          LEVELS[index].ice >= 60
            ? "THE SHELF IS STILL HOLDING - FOR NOW."
            : "THE POD AND THE GLACIER GOT CLOSER.",
          240,
          176,
          { align: "center", color: DIM }
        );
        text(
          ctx,
          index >= 4 ? "THAT IS THE LAST OF THE ICE." : `LEVEL ${index + 2} UNLOCKED`,
          240,
          190,
          { align: "center", color: ICE }
        );
        const blink = 0.6 + Math.sin(self.t * 4) * 0.4;
        ctx.globalAlpha = blink;
        text(ctx, index >= 4 ? "PRESS SPACE" : "PRESS SPACE FOR THE MAP", 240, 204, {
          align: "center",
          color: DIM,
        });
        ctx.globalAlpha = 1;
      },
    };
  }

  gotoEnding() {
    const self = this;
    const inp = this.input;
    this.scene = {
      update() {
        if (inp.hit("Space", "Enter") || inp.clicked) self.gotoTitle();
      },
      draw(ctx) {
        self.backdrop(ctx, 4, 240 + Math.sin(self.t * 0.15) * 40, 0.45);
        ctx.fillStyle = "rgba(4,12,18,0.34)";
        ctx.fillRect(0, 0, VW, VH);
        text(ctx, "THE ICE IS GONE", 240, 30, { align: "center", scale: 3, color: ICE });
        text(ctx, "FIVE MAPS. TEN ROUNDS. LESS COVER EVERY TIME.", 240, 70, {
          align: "center",
          color: GOLD,
        });
        panel(ctx, 42, 84, 396, 108, {
          fill: "rgba(7,18,25,0.9)",
          accent: "rgba(143,224,176,0.6)",
        });
        text(ctx, "WHAT KEEPS THE ICE", 240, 92, { align: "center", color: GREEN });
        [
          "CUT EMISSIONS - THE SHELF NEEDS COLD WINTERS",
          "REPORT AND RETRIEVE LOST FISHING GEAR",
          "GIVE SEALS ON THE ICE ROOM TO REST",
          "PROTECT THE NURSERY FLOES, NOT THE HARVEST",
        ].forEach((ln, i) => text(ctx, "- " + ln, 70, 108 + i * 12, { color: ICE }));
        text(ctx, "THE HUNTER AND THE SEAL STILL SHARE ONE SEA.", 240, 164, {
          align: "center",
          color: DIM,
        });
        text(ctx, "ONLY THE ICE IS LEAVING.", 240, 178, { align: "center", color: DIM });
        text(ctx, "THANKS FOR PLAYING", 240, 226, { align: "center", color: ICE });
        const blink = 0.6 + Math.sin(self.t * 4) * 0.4;
        ctx.globalAlpha = blink;
        text(ctx, "PRESS SPACE FOR THE TITLE", 240, 242, { align: "center", color: DIM });
        ctx.globalAlpha = 1;
      },
    };
  }

  drawPause(ctx) {
    ctx.fillStyle = "rgba(4,12,18,0.66)";
    ctx.fillRect(0, 0, VW, VH);
    panel(ctx, 128, 80, 224, 110);
    text(ctx, "PAUSED", 240, 96, { align: "center", scale: 2, color: ICE });
    text(ctx, "ESC  RESUME", 240, 128, { align: "center", color: GOLD });
    text(ctx, "BACKSPACE  QUIT TO MAP", 240, 144, { align: "center", color: DIM });
    text(ctx, "THE CLOCK IS STOPPED", 240, 164, { align: "center", color: "rgba(143,178,198,0.6)" });
  }
}
