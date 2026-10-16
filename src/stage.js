import { compositeFrame } from "./core.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const durationOf = (frame) => Math.max(1, Number(frame?.duration) || 140);

/** Pure timeline step; preserves every frame's duration, including long holds. */
export function advanceAnimation(frames, index, elapsed, delta) {
  if (!frames.length) return { index: 0, elapsed: 0 };
  index = clamp(Math.trunc(index), 0, frames.length - 1);
  let time = Math.max(0, elapsed) + Math.max(0, delta);
  const cycle = frames.reduce((sum, frame) => sum + durationOf(frame), 0);
  if (time >= cycle) time %= cycle;
  while (time >= durationOf(frames[index])) {
    time -= durationOf(frames[index]);
    index = (index + 1) % frames.length;
  }
  return { index, elapsed: time };
}

/** Physics uses wall seconds; playback speed never changes movement or gravity. */
export function advancePhysics(
  state,
  seconds,
  direction,
  width = 640,
  margin = 64,
) {
  const dt = Math.max(0, Math.min(seconds, 0.1));
  const next = { ...state };
  next.x = clamp(next.x + direction * 110 * dt, margin, width - margin);
  if (next.lift > 0 || next.velocity > 0) {
    next.lift += next.velocity * dt - 0.5 * 1000 * dt * dt;
    next.velocity -= 1000 * dt;
    if (next.lift <= 0) {
      next.lift = 0;
      next.velocity = 0;
    }
  }
  return next;
}

function pixelRect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function tree(ctx, x, ground, scale, dark, mid, light) {
  pixelRect(
    ctx,
    dark,
    x + 13 * scale,
    ground - 42 * scale,
    5 * scale,
    42 * scale,
  );
  [
    [7, -76, 18, 10],
    [3, -68, 26, 12],
    [0, -59, 32, 14],
    [4, -47, 24, 12],
  ].forEach(([a, b, w, h], i) => {
    pixelRect(
      ctx,
      mid,
      x + a * scale,
      ground + b * scale,
      w * scale,
      h * scale,
    );
    if (i < 3)
      pixelRect(
        ctx,
        light,
        x + (a + 2) * scale,
        ground + b * scale,
        (w - 8) * scale,
        3 * scale,
      );
  });
}

function drawScene(ctx, background, ground) {
  ctx.clearRect(0, 0, 640, 360);
  if (background === "forest") {
    pixelRect(ctx, "#d9e5bc", 0, 0, 640, 360);
    pixelRect(ctx, "#f6ebbd", 478, 36, 38, 38);
    pixelRect(ctx, "#e7edce", 30, 52, 110, 12);
    pixelRect(ctx, "#e7edce", 48, 42, 58, 12);
    tree(ctx, 18, ground - 24, 2.3, "#7d9b73", "#abc092", "#bed0a1");
    tree(ctx, 502, ground - 24, 2.1, "#7d9b73", "#abc092", "#bed0a1");
    tree(ctx, 110, ground - 12, 1.4, "#6e8664", "#8eaa78", "#a7be87");
    tree(ctx, 440, ground - 9, 1.2, "#6e8664", "#8eaa78", "#a7be87");
    pixelRect(ctx, "#adbb89", 0, ground - 10, 640, 14);
    pixelRect(ctx, "#6f8c5b", 0, ground, 640, 5);
    pixelRect(ctx, "#91a56d", 0, ground + 5, 640, 55);
    pixelRect(ctx, "#b8bb82", 170, ground + 5, 300, 55);
    pixelRect(ctx, "#c7c38e", 186, ground + 12, 268, 8);
    for (let i = 0; i < 12; i++) {
      const x = (i * 73 + 17) % 640;
      if (x > 160 && x < 480) continue;
      pixelRect(ctx, "#5d7a50", x, ground - 5, 3, 8);
      pixelRect(ctx, "#5d7a50", x - 3, ground - 2, 9, 3);
      if (i % 3 === 0) pixelRect(ctx, "#e8d597", x, ground - 8, 4, 4);
    }
  } else if (background === "night") {
    pixelRect(ctx, "#202938", 0, 0, 640, 360);
    for (let i = 0; i < 35; i++) {
      const x = (i * 97 + 31) % 640,
        y = (i * 43 + 22) % 184;
      pixelRect(
        ctx,
        i % 4 ? "#717e8c" : "#c6d3c2",
        x,
        y,
        i % 5 ? 2 : 3,
        i % 5 ? 2 : 3,
      );
    }
    pixelRect(ctx, "#e1dfb1", 502, 38, 24, 24);
    pixelRect(ctx, "#202938", 510, 32, 22, 22);
    tree(ctx, 22, ground - 10, 2.1, "#273c43", "#30474a", "#3d5856");
    tree(ctx, 508, ground - 6, 2.2, "#273c43", "#30474a", "#3d5856");
    pixelRect(ctx, "#3a5054", 0, ground - 5, 640, 8);
    pixelRect(ctx, "#293e46", 0, ground + 3, 640, 65);
    for (let i = 0; i < 11; i++)
      pixelRect(ctx, "#3b5257", i * 61 + 11, ground + 20 + (i % 3) * 9, 14, 3);
    // A small warm lamp keeps the dark scene grounded, away from the artwork.
    pixelRect(ctx, "#52605d", 92, ground - 51, 4, 51);
    pixelRect(ctx, "#dbad65", 87, ground - 57, 14, 14);
    pixelRect(ctx, "#ffdfa2", 90, ground - 54, 8, 8);
    pixelRect(ctx, "#63706c", 85, ground - 60, 18, 3);
  } else {
    pixelRect(ctx, "#e9ede5", 0, 0, 640, 360);
    ctx.strokeStyle = "#dce2d8";
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, ground);
      ctx.stroke();
    }
    for (let y = 0; y < ground; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(640, y + 0.5);
      ctx.stroke();
    }
    pixelRect(ctx, "#bcc8b8", 0, ground, 640, 2);
    pixelRect(ctx, "#d9e0d4", 0, ground + 2, 640, 68);
    pixelRect(ctx, "#c6d0c0", 32, ground + 24, 576, 1);
    for (let x = 32; x < 640; x += 32)
      pixelRect(ctx, "#bcc8b8", x, ground + 20, 1, 9);
  }
}

export function createStage(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法打开动画预览");
  canvas.width = 640;
  canvas.height = 360;
  canvas.style.imageRendering = "pixelated";
  ctx.imageSmoothingEnabled = false;
  const sprite = document.createElement("canvas");
  const spriteCtx = sprite.getContext("2d");
  const scenery = document.createElement("canvas");
  scenery.width = 640;
  scenery.height = 360;
  const sceneryCtx = scenery.getContext("2d");
  let project = null,
    clipIndex = 0,
    frameIndex = 0,
    elapsed = 0;
  let playing = false,
    speed = 1,
    mode = "preview",
    background = "forest",
    scale = 4;
  let facing = 1,
    direction = 0,
    onFrame = null,
    rafId = null,
    lastTime = null,
    disposed = false;
  let spriteDirty = true,
    sceneryDirty = true;
  let physics = { x: 320, lift: 0, velocity: 0 };
  const ground = 292;
  const frames = () => project?.clips?.[clipIndex]?.frames || [];
  const visible = () => document.visibilityState !== "hidden";
  const emitFrame = () => {
    if (onFrame) onFrame(frameIndex);
  };

  function draw() {
    if (disposed) return;
    if (sceneryDirty) {
      drawScene(sceneryCtx, background, ground);
      sceneryDirty = false;
    }
    ctx.drawImage(scenery, 0, 0);
    const frame = frames()[frameIndex];
    if (!project || !frame) return;
    if (spriteDirty) {
      if (sprite.width !== project.width) sprite.width = project.width;
      if (sprite.height !== project.height) sprite.height = project.height;
      const image = spriteCtx.createImageData(project.width, project.height);
      const pixels = compositeFrame(project, frame);
      for (let i = 0; i < pixels.length; i++) {
        const value = pixels[i] >>> 0;
        image.data[i * 4] = value >>> 24;
        image.data[i * 4 + 1] = (value >>> 16) & 255;
        image.data[i * 4 + 2] = (value >>> 8) & 255;
        image.data[i * 4 + 3] = value & 255;
      }
      spriteCtx.putImageData(image, 0, 0);
      spriteDirty = false;
    }
    const fitScale = Math.max(
      1,
      Math.min(
        scale,
        Math.floor(236 / project.height),
        Math.floor(320 / project.width),
      ),
    );
    const x = mode === "run" ? physics.x : 320;
    const lift = mode === "run" ? physics.lift : 0;
    const shadowWidth = Math.max(
      12,
      Math.round(project.width * fitScale * 0.5 * (1 - lift / 300)),
    );
    pixelRect(
      ctx,
      background === "night" ? "#182b34" : "#78896a",
      x - shadowWidth / 2,
      ground + 2,
      shadowWidth,
      4,
    );
    const drawWidth = project.width * fitScale,
      drawHeight = project.height * fitScale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(ground - lift));
    ctx.scale(mode === "run" ? facing : 1, 1);
    ctx.drawImage(
      sprite,
      Math.round(-drawWidth / 2),
      -drawHeight,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
  }

  function active() {
    return (
      !disposed &&
      visible() &&
      project &&
      ((playing && frames().length > 1) ||
        (mode === "run" &&
          (direction !== 0 || physics.lift > 0 || physics.velocity > 0)))
    );
  }
  function schedule() {
    if (active()) {
      if (rafId === null) rafId = requestAnimationFrame(tick);
    } else {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = null;
    }
  }
  function tick(now) {
    rafId = null;
    if (!active()) {
      lastTime = null;
      return;
    }
    const delta = lastTime === null ? 0 : Math.max(0, now - lastTime);
    lastTime = now;
    let needsDraw = false;
    if (playing) {
      const next = advanceAnimation(
        frames(),
        frameIndex,
        elapsed,
        delta * speed,
      );
      const changed = frameIndex !== next.index;
      frameIndex = next.index;
      elapsed = next.elapsed;
      if (changed) {
        spriteDirty = true;
        needsDraw = true;
        emitFrame();
      }
    }
    if (mode === "run") {
      const margin = Math.max(
        40,
        Math.min(160, (project.width * scale) / 2 + 8),
      );
      physics = advancePhysics(physics, delta / 1000, direction, 640, margin);
      needsDraw = true;
    }
    if (needsDraw) draw();
    schedule();
  }
  function refresh() {
    draw();
    schedule();
  }
  function onVisibility() {
    lastTime = null;
    if (!visible()) direction = 0;
    schedule();
    if (visible()) draw();
  }
  document.addEventListener("visibilitychange", onVisibility);
  draw();

  return {
    setProject(value) {
      project = value;
      spriteDirty = true;
      if (!project?.clips?.length) {
        clipIndex = 0;
        frameIndex = 0;
        elapsed = 0;
      } else {
        if (clipIndex >= project.clips.length) {
          clipIndex = 0;
          frameIndex = 0;
          elapsed = 0;
        }
        if (frameIndex >= frames().length) {
          frameIndex = 0;
          elapsed = 0;
        }
      }
      refresh();
    },
    setClip(index) {
      if (!project?.clips?.length) return;
      clipIndex = clamp(
        Math.trunc(Number(index) || 0),
        0,
        project.clips.length - 1,
      );
      frameIndex = 0;
      elapsed = 0;
      lastTime = null;
      spriteDirty = true;
      emitFrame();
      refresh();
    },
    setPlaying(value) {
      const next = Boolean(value);
      if (next === playing) return;
      playing = next;
      lastTime = null;
      schedule();
    },
    setSpeed(value) {
      if (Number.isFinite(value)) speed = clamp(value, 0.25, 2);
    },
    setMode(value) {
      if ((value !== "preview" && value !== "run") || value === mode) return;
      mode = value;
      direction = 0;
      physics = { x: 320, lift: 0, velocity: 0 };
      lastTime = null;
      refresh();
    },
    setBackground(value) {
      if (
        ["studio", "forest", "night"].includes(value) &&
        background !== value
      ) {
        background = value;
        sceneryDirty = true;
        draw();
      }
    },
    setScale(value) {
      if (Number.isFinite(value)) {
        scale = clamp(Math.round(value), 1, 8);
        draw();
      }
    },
    setOnFrame(fn) {
      onFrame = typeof fn === "function" ? fn : null;
    },
    step(delta = 1) {
      if (!frames().length) return;
      playing = false;
      const offset = Number.isFinite(delta) ? Math.trunc(delta) : 1;
      frameIndex =
        (((frameIndex + offset) % frames().length) + frames().length) %
        frames().length;
      spriteDirty = true;
      elapsed = 0;
      lastTime = null;
      emitFrame();
      refresh();
    },
    setFrame(index) {
      if (!frames().length) return;
      const next = clamp(
        Math.trunc(Number(index) || 0),
        0,
        frames().length - 1,
      );
      if (next === frameIndex) return;
      frameIndex = next;
      spriteDirty = true;
      elapsed = 0;
      lastTime = null;
      emitFrame();
      refresh();
    },
    jump() {
      if (
        mode !== "run" ||
        !project ||
        physics.lift > 0 ||
        physics.velocity > 0
      )
        return;
      physics.velocity = 345;
      lastTime = null;
      schedule();
    },
    move(value) {
      direction = mode === "run" ? Math.sign(Number(value) || 0) : 0;
      if (direction) facing = direction;
      refresh();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = null;
      onFrame = null;
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
