import test from "node:test";
import assert from "node:assert/strict";
import { advanceAnimation, advancePhysics, createStage } from "../src/stage.js";
import {
  getTemplates,
  makeTemplate,
  TEMPLATE_PROVENANCE,
} from "../src/templates.js";
import { validateProject, compositeFrame } from "../src/core.js";

test("each original template validates, stays editable, and has distinct poses", () => {
  const templates = getTemplates();
  assert.deepEqual(
    templates.map((t) => t.id),
    ["courier", "slime", "spark"],
  );
  assert.match(TEMPLATE_PROVENANCE, /原创/);
  for (const entry of templates) {
    const project = validateProject(makeTemplate(entry.id));
    assert.equal(project.width, 32);
    assert.equal(project.height, 32);
    assert.equal(project.layers.length, 2);
    const firstClip = project.clips[0];
    assert.equal(firstClip.frames.length, 4);
    const rendered = firstClip.frames.map((f) => compositeFrame(project, f));
    assert.equal(
      new Set(rendered.map((pixels) => JSON.stringify(pixels))).size,
      4,
    );
    for (const pixels of rendered) {
      const painted = pixels.filter(Boolean).length;
      assert.ok(
        painted > 100 && painted < 800,
        `${entry.id}: recognizable transparent silhouette`,
      );
      assert.ok(pixels.some((p) => p === 0));
    }
    const other = makeTemplate(entry.id);
    project.clips[0].frames[0].cells[0][0] = 0xffffffff;
    assert.equal(other.clips[0].frames[0].cells[0][0], 0);
    assert.equal(entry.thumbnailProject.clips[0].frames[0].cells[0][0], 0);
  }
  assert.equal(makeTemplate("courier").clips[1].frames.length, 2);
  assert.throws(() => makeTemplate("unknown"), /素材/);
});

test("timeline uses per-frame holds and crosses the loop without drift", () => {
  const frames = [{ duration: 100 }, { duration: 300 }, { duration: 50 }];
  assert.deepEqual(advanceAnimation(frames, 0, 0, 99), {
    index: 0,
    elapsed: 99,
  });
  assert.deepEqual(advanceAnimation(frames, 0, 99, 1), {
    index: 1,
    elapsed: 0,
  });
  assert.deepEqual(advanceAnimation(frames, 1, 0, 299), {
    index: 1,
    elapsed: 299,
  });
  assert.deepEqual(advanceAnimation(frames, 1, 299, 51), {
    index: 0,
    elapsed: 0,
  });
  assert.deepEqual(advanceAnimation(frames, 2, 20, 450000 + 40), {
    index: 0,
    elapsed: 10,
  });
  assert.deepEqual(advanceAnimation([], 0, 0, 100), { index: 0, elapsed: 0 });
});

test("jump follows a bounded ballistic arc and lands exactly on the baseline", () => {
  let state = { x: 320, lift: 0, velocity: 345 };
  let highest = 0;
  for (let i = 0; i < 120; i++) {
    state = advancePhysics(state, 1 / 120, 1);
    highest = Math.max(highest, state.lift);
    assert.ok(state.lift >= 0);
  }
  assert.ok(highest > 58 && highest < 61);
  assert.equal(state.lift, 0);
  assert.equal(state.velocity, 0);
  assert.ok(Math.abs(state.x - 430) < 0.001);
  assert.equal(advancePhysics({ x: 575, lift: 0, velocity: 0 }, 0.1, 1).x, 576);
});

function mockBrowser() {
  const queue = new Map(),
    listeners = new Map(),
    images = [],
    draws = [];
  let id = 0;
  const context = {
    imageSmoothingEnabled: true,
    clearRect() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    drawImage(...args) {
      draws.push(args);
    },
    putImageData(image) {
      images.push([...image.data]);
    },
    createImageData(w, h) {
      return { data: new Uint8ClampedArray(w * h * 4) };
    },
  };
  const canvas = () => ({
    style: {},
    getContext() {
      return context;
    },
  });
  const saved = {
    document: globalThis.document,
    raf: globalThis.requestAnimationFrame,
    cancel: globalThis.cancelAnimationFrame,
  };
  globalThis.document = {
    visibilityState: "visible",
    createElement: canvas,
    addEventListener(name, fn) {
      listeners.set(name, fn);
    },
    removeEventListener(name, fn) {
      if (listeners.get(name) === fn) listeners.delete(name);
    },
  };
  globalThis.requestAnimationFrame = (fn) => {
    queue.set(++id, fn);
    return id;
  };
  globalThis.cancelAnimationFrame = (key) => queue.delete(key);
  return {
    canvas,
    queue,
    listeners,
    images,
    draws,
    tick(now) {
      assert.equal(queue.size, 1, "at most one active RAF");
      const [key, fn] = queue.entries().next().value;
      queue.delete(key);
      fn(now);
    },
    hide(hidden) {
      document.visibilityState = hidden ? "hidden" : "visible";
      listeners.get("visibilitychange")?.();
    },
    restore() {
      globalThis.document = saved.document;
      globalThis.requestAnimationFrame = saved.raf;
      globalThis.cancelAnimationFrame = saved.cancel;
    },
  };
}

test("stage preserves frames on edits, honors speed, and releases RAF on pause/hide/dispose", () => {
  const env = mockBrowser();
  try {
    const canvas = env.canvas(),
      stage = createStage(canvas),
      seen = [];
    const project = makeTemplate("courier");
    stage.setProject(project);
    stage.setOnFrame((index) => seen.push(index));
    assert.equal(canvas.width, 640);
    assert.equal(canvas.height, 360);
    assert.equal(canvas.style.imageRendering, "pixelated");
    assert.equal(env.queue.size, 0);
    stage.setFrame(2);
    const beforeEdit = env.images.length;
    const beforeDraw = env.draws.length;
    project.clips[0].frames[2].cells[0][0] = 0x12ab34ff;
    stage.setProject(project);
    assert.equal(
      env.images.length,
      beforeEdit + 1,
      "paused edit recomposites immediately",
    );
    assert.deepEqual(env.images.at(-1).slice(0, 4), [0x12, 0xab, 0x34, 0xff]);
    assert.ok(
      env.draws.length > beforeDraw,
      "paused edit actually redraws the visible canvas",
    );
    assert.equal(
      env.queue.size,
      0,
      "a paused redraw does not leave a RAF running",
    );
    stage.setPlaying(true);
    env.tick(0);
    env.tick(139);
    assert.equal(
      env.images.length,
      beforeEdit + 1,
      "held frames reuse their composed pixels",
    );
    assert.equal(seen.at(-1), 2);
    env.tick(140);
    assert.equal(seen.at(-1), 3);
    stage.setSpeed(2);
    env.tick(190);
    assert.equal(seen.at(-1), 0);
    env.hide(true);
    assert.equal(env.queue.size, 0);
    env.hide(false);
    env.tick(50000);
    assert.equal(seen.at(-1), 0, "hidden time does not advance the timeline");
    env.tick(50069);
    assert.equal(seen.at(-1), 0);
    env.tick(50070);
    assert.equal(seen.at(-1), 1);
    stage.setPlaying(false);
    assert.equal(env.queue.size, 0);
    stage.step(-1);
    assert.equal(seen.at(-1), 0);
    stage.setClip(1);
    assert.equal(seen.at(-1), 0);
    stage.setMode("run");
    stage.jump();
    assert.equal(env.queue.size, 1);
    for (let i = 0; i < 50 && env.queue.size; i++) env.tick(60000 + i * 20);
    assert.equal(
      env.queue.size,
      0,
      "a completed jump without playback releases RAF",
    );
    stage.move(1);
    assert.equal(env.queue.size, 1);
    stage.move(0);
    assert.equal(env.queue.size, 0);
    stage.setPlaying(true);
    stage.dispose();
    stage.dispose();
    assert.equal(env.queue.size, 0);
    assert.equal(env.listeners.size, 0);
  } finally {
    env.restore();
  }
});
