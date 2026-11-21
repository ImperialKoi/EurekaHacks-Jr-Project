import { loadAssets } from "./assets.js";
import { Input } from "./input.js";
import { App } from "./app.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
const boot = document.getElementById("boot");

async function start() {
  try {
    await loadAssets();
  } catch (err) {
    boot.textContent = "ASSETS FAILED TO LOAD — RUN: npm run assets";
    console.error(err);
    return;
  }

  ctx.imageSmoothingEnabled = false;
  const input = new Input(canvas);
  const app = new App(canvas, input);
  window.__thinice = app;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    app.update(dt);
    ctx.imageSmoothingEnabled = false;
    app.draw(ctx);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  boot.classList.add("hide");
}

start();
