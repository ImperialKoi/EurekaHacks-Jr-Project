const VIEW_W = 480;
const VIEW_H = 270;

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.hits = new Set();
    this.mouseDown = false;
    this.clicked = false;
    this.mx = VIEW_W / 2;
    this.my = VIEW_H / 2;

    window.addEventListener("keydown", (e) => {
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)
      ) {
        e.preventDefault();
      }
      if (!e.repeat) this.hits.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());

    canvas.addEventListener("pointermove", (e) => this.track(e));
    canvas.addEventListener("pointerdown", (e) => {
      this.track(e);
      this.mouseDown = true;
      this.clicked = true;
      canvas.setPointerCapture?.(e.pointerId);
    });
    window.addEventListener("pointerup", () => (this.mouseDown = false));
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  track(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / VIEW_W, rect.height / VIEW_H) || 1;
    const dx = (rect.width - VIEW_W * scale) / 2;
    const dy = (rect.height - VIEW_H * scale) / 2;
    this.mx = (e.clientX - rect.left - dx) / scale;
    this.my = (e.clientY - rect.top - dy) / scale;
  }

  down(...codes) {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  hit(...codes) {
    for (const c of codes) if (this.hits.has(c)) return true;
    return false;
  }

  endFrame() {
    this.hits.clear();
    this.clicked = false;
  }
}
