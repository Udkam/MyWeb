import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [appSource, coreSource, stageSource] = await Promise.all(
  ["app", "core", "stage"].map((name) =>
    readFile(new URL(`../src/${name}.js`, import.meta.url), "utf8"),
  ),
);
const coreNames = [
  ...coreSource.matchAll(/^export (?:function|const) (\w+)/gm),
].map((match) => match[1]);
const withoutExports = (source) => source.replace(/^export /gm, "");
// Static imports may span many lines after formatting; remove the whole
// declaration before injecting its dependencies into the browser realm.
const withoutImports = (source) =>
  source.replace(
    /^import\s+(?:[\s\S]*?\s+from\s+)?(["'])[^"'\r\n]+\1\s*;[ \t]*(?:\r?\n|$)/gm,
    "",
  );

/** Executes the real app and stage in one browser realm with a small DOM adapter.
 * Drawing is inert; state transitions, event handlers and save scheduling are real. */
async function openApp({
  loadError = false,
  backup = false,
  deferSave = false,
} = {}) {
  const nodes = new Map(),
    timers = new Map(),
    raf = new Map(),
    writes = [],
    html = [],
    images = [];
  let nextTimer = 0,
    finishSave;
  const context = new Proxy(
    {
      createImageData(w, h) {
        return { data: new Uint8ClampedArray(w * h * 4) };
      },
      putImageData(image) {
        images.push([...image.data]);
      },
    },
    {
      get(target, key) {
        return key in target ? target[key] : () => {};
      },
    },
  );
  class Element {
    constructor(id = "") {
      this.id = id;
      this.children = [];
      this.listeners = new Map();
      this.dataset = {};
      this.style = { setProperty() {} };
      this.value = id === "stage-background" ? "forest" : "";
      this.clientWidth = 640;
      this.clientHeight = 640;
      this.width = 32;
      this.height = 32;
      this.scrollLeft = 0;
      this.textContent = "";
      this.open = false;
      this.captured = new Set();
      this.classes = new Set();
      this.classList = {
        add: (name) => this.classes.add(name),
        remove: (name) => this.classes.delete(name),
        toggle: (name, on) =>
          on ? this.classes.add(name) : this.classes.delete(name),
      };
    }
    set innerHTML(value) {
      html.push(String(value));
      this._html = value;
    }
    get innerHTML() {
      return this._html || "";
    }
    addEventListener(name, fn) {
      const list = this.listeners.get(name) || [];
      list.push(fn);
      this.listeners.set(name, list);
    }
    removeEventListener(name, fn) {
      this.listeners.set(
        name,
        (this.listeners.get(name) || []).filter((f) => f !== fn),
      );
    }
    dispatch(name, values = {}) {
      const event = { target: this, preventDefault() {}, ...values };
      for (const fn of this.listeners.get(name) || []) fn(event);
      this[`on${name}`]?.(event);
    }
    setAttribute(name, value) {
      this[name] = value;
    }
    append(...children) {
      this.children.push(...children);
    }
    replaceChildren(...children) {
      this.children = children;
    }
    getContext() {
      return context;
    }
    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        width: this.width,
        height: this.height,
        right: this.width,
        bottom: this.height,
      };
    }
    setPointerCapture(id) {
      this.captured.add(id);
    }
    hasPointerCapture(id) {
      return this.captured.has(id);
    }
    releasePointerCapture(id) {
      this.captured.delete(id);
      this.dispatch("lostpointercapture", { pointerId: id });
    }
    closest() {
      return null;
    }
    focus() {}
    select() {}
    click() {
      this.dispatch("click");
    }
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
    }
  }
  const get = (id) => {
    if (!nodes.has(id)) nodes.set(id, new Element(id));
    return nodes.get(id);
  };
  const document = new Element("document"),
    window = new Element("window");
  document.visibilityState = "visible";
  document.hidden = false;
  document.getElementById = get;
  document.createElement = () => new Element();
  document.querySelectorAll = (selector) => {
    if (selector === "#palette button") return get("palette").children;
    if (selector === ".frame-tile") return get("frame-strip").children;
    return [];
  };
  document.querySelector = (selector) =>
    selector === "dialog[open]"
      ? [...nodes.values()].find((node) => node.open) || null
      : null;
  const sandbox = vm.createContext({
    document,
    window,
    console: { error() {} },
    Blob,
    matchMedia: () => ({ matches: true }),
    ResizeObserver: class {
      observe() {}
    },
    setTimeout(fn) {
      const id = ++nextTimer;
      timers.set(id, fn);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    requestAnimationFrame(fn) {
      const id = ++nextTimer;
      raf.set(id, fn);
      return id;
    },
    cancelAnimationFrame(id) {
      raf.delete(id);
    },
    async loadLocal(options) {
      if (options?.previous)
        return backup ? sandbox.__makeTemplate("recovered") : null;
      if (loadError) throw new Error("草稿损坏");
      return null;
    },
    async saveLocal(value) {
      writes.push(JSON.parse(JSON.stringify(value)));
      if (deferSave)
        await new Promise((resolve) => {
          finishSave = resolve;
        });
    },
  });
  const code = `
    const { ${coreNames.join(",")} } = (() => { ${withoutExports(coreSource)}; return { ${coreNames.join(",")} }; })();
    const { createStage } = (() => { ${withoutExports(withoutImports(stageSource))}; return { createStage }; })();
    function makeTemplate(name) {
      const p = createProject(4, 4, name);
      p.clips[0].frames.push({ id: uid('frame'), duration: 180, cells: [Array(16).fill(0)] });
      p.clips.push({ id: uid('clip'), name: '第二动作', frames: [{ id: uid('frame'), duration: 140, cells: [Array(16).fill(0)] }] });
      return p;
    }
    globalThis.__makeTemplate = makeTemplate;
    const getTemplates = () => [];
    const projectBlob = value => new Blob([JSON.stringify(validateProject(value))]);
    const readProjectFile = () => {}, loadPNG = () => {}, projectFromSheet = () => {}, frameCanvas = () => {}, pngBlob = () => {}, sheetExport = () => {}, sheetMetadata = () => {}, framesZip = () => {}, downloadBlob = () => {};
    ${withoutImports(appSource)}
    globalThis.__app = {
      get project() { return project; }, get frameIndex() { return frameIndex; }, get previewFrame() { return previewFrame; },
      get stroke() { return stroke; }, get revision() { return revision; }, get savedRevision() { return savedRevision; },
      get history() { return history; }, get selection() { return selection; },
      selectFrame, render, transact, replaceProject, undo, redo, flushSave, setTool, setPlaying,
    };
  `;
  vm.runInContext(code, sandbox, { filename: "app-contract-browser.js" });
  await new Promise((resolve) => setImmediate(resolve));
  return {
    app: sandbox.__app,
    get,
    window,
    document,
    writes,
    timers,
    html,
    images,
    sandbox,
    completeSave() {
      finishSave?.();
    },
    tick(now) {
      assert.equal(raf.size, 1);
      const [id, fn] = raf.entries().next().value;
      raf.delete(id);
      fn(now);
    },
    pointer(name, x = 0, y = 0) {
      const canvas = get("pixel-canvas");
      canvas.dispatch(name, {
        pointerId: 1,
        button: 0,
        clientX: ((x + 0.1) * canvas.width) / 4,
        clientY: ((y + 0.1) * canvas.height) / 4,
      });
    },
    key(key, extra = {}) {
      window.dispatch("keydown", { key, ...extra });
    },
  };
}

test("selecting a frame and ordinary edits retain the preview frame; changing clips resets it", async () => {
  const env = await openApp();
  env.app.selectFrame(1);
  assert.equal(env.app.frameIndex, 1);
  assert.equal(env.app.previewFrame, 1, "selecting frame 2 must show frame 2");
  env.get("project-name").value = "改名";
  env.get("project-name").dispatch("change");
  assert.equal(env.app.previewFrame, 1, "editing must not restart animation");
  env.get("clip-tabs").children[1].click();
  assert.equal(env.app.previewFrame, 0);
  assert.equal(env.app.frameIndex, 0);
});

test("ordinary project edits preserve elapsed animation time", async () => {
  const env = await openApp();
  env.app.setPlaying(true);
  env.tick(0);
  env.tick(100);
  env.get("project-name").value = "播放中改名";
  env.get("project-name").dispatch("change");
  env.tick(139);
  assert.equal(env.app.previewFrame, 0);
  env.tick(140);
  assert.equal(
    env.app.previewFrame,
    1,
    "a 140 ms frame must not restart at the edit",
  );
});

test("keyboard undo and frame duplication cannot redirect an in-progress pointer stroke", async () => {
  const env = await openApp();
  env.pointer("pointerdown", 0, 0);
  env.key("z", { ctrlKey: true });
  env.key("d");
  env.pointer("pointermove", 1, 0);
  env.pointer("pointerup", 1, 0);
  assert.equal(env.app.project.clips[0].frames.length, 2);
  const pixels = env.app.project.clips[0].frames[0].cells[0];
  assert.notEqual(pixels[0], 0);
  assert.notEqual(pixels[1], 0);
  env.app.undo();
  assert.ok(
    env.app.project.clips[0].frames[0].cells[0].every((value) => value === 0),
  );
});

test("losing focus commits a stroke and releases capture before later edits", async () => {
  const env = await openApp();
  env.pointer("pointerdown", 0, 0);
  env.window.dispatch("blur");
  assert.equal(env.app.stroke, null);
  assert.equal(env.get("pixel-canvas").hasPointerCapture(1), false);
  assert.equal(env.app.revision, 1);
  env.app.undo();
  assert.equal(env.app.project.clips[0].frames[0].cells[0][0], 0);
});

test("a second pointer switching frames cannot redirect the first pointer stroke", async () => {
  const env = await openApp();
  env.pointer("pointerdown", 0, 0);
  env.get("frame-strip").children[1].click();
  env.pointer("pointermove", 1, 0);
  env.pointer("pointerup", 1, 0);
  assert.ok(
    env.app.project.clips[0].frames[1].cells[0].every((value) => value === 0),
    "the other frame remains untouched",
  );
});

test("adding an empty frame updates the actual paused preview, not just its label", async () => {
  const env = await openApp();
  env.app.project.clips[0].frames[0].cells[0][15] = 0x123456ff;
  env.app.render();
  assert.deepEqual(env.images.at(-1).slice(-4), [0x12, 0x34, 0x56, 0xff]);
  env.get("add-frame").click();
  assert.equal(env.app.frameIndex, 1);
  assert.equal(env.app.previewFrame, 1);
  assert.ok(
    env.images.at(-1).every((value) => value === 0),
    "the stage must show the new empty frame",
  );
});

test("reordering, deleting and undoing frames keep paused stage pixels synchronized", async () => {
  const env = await openApp();
  env.app.project.clips[0].frames[0].cells[0][15] = 0x123456ff;
  env.app.project.clips[0].frames[1].cells[0][15] = 0xabcdefff;
  env.app.selectFrame(1);
  const checkPreview = () => {
    assert.equal(env.app.previewFrame, env.app.frameIndex);
    const pixel =
      env.app.project.clips[0].frames[env.app.frameIndex].cells[0][15];
    assert.deepEqual(env.images.at(-1).slice(-4), [
      pixel >>> 24,
      (pixel >>> 16) & 255,
      (pixel >>> 8) & 255,
      pixel & 255,
    ]);
  };
  env.get("frame-left").click();
  checkPreview();
  env.get("delete-frame").click();
  checkPreview();
  env.app.undo();
  checkPreview();
  env.app.redo();
  checkPreview();
});

test("a second pointer undo button ends the stroke before applying history", async () => {
  const env = await openApp();
  env.pointer("pointerdown", 0, 0);
  env.get("undo").click();
  env.pointer("pointermove", 1, 0);
  env.pointer("pointerup", 1, 0);
  assert.equal(env.app.stroke, null);
  assert.ok(
    env.app.project.clips[0].frames[0].cells[0].every((pixel) => pixel === 0),
  );
  env.app.redo();
  assert.notEqual(env.app.project.clips[0].frames[0].cells[0][0], 0);
  assert.equal(env.app.project.clips[0].frames[0].cells[0][1], 0);
});

test("clicking the current clip keeps the actual preview and selected frame synchronized", async () => {
  const env = await openApp();
  env.app.project.clips[0].frames[0].cells[0][15] = 0x123456ff;
  env.app.project.clips[0].frames[1].cells[0][15] = 0xabcdefff;
  env.app.selectFrame(1);
  env.get("clip-tabs").children[0].click();
  assert.equal(env.app.frameIndex, env.app.previewFrame);
  const expected =
    env.app.project.clips[0].frames[env.app.frameIndex].cells[0][15];
  assert.deepEqual(env.images.at(-1).slice(-4), [
    expected >>> 24,
    (expected >>> 16) & 255,
    (expected >>> 8) & 255,
    expected & 255,
  ]);
});

test("a failed transaction restores the project and preserves an existing redo branch", async () => {
  const env = await openApp();
  env.get("project-name").value = "可重做的改名";
  env.get("project-name").dispatch("change");
  env.app.undo();
  const before = JSON.stringify(env.app.project),
    revision = env.app.revision;
  assert.equal(env.app.history.canRedo, true);
  try {
    env.app.transact(() => {
      env.app.project.name = "半完成修改";
      throw new Error("模拟操作失败");
    });
  } catch {
    /* Reporting by throw or by notification is acceptable; state must be atomic. */
  }
  assert.equal(JSON.stringify(env.app.project), before);
  assert.equal(env.app.history.canRedo, true);
  assert.equal(env.app.revision, revision);
});

test("project, clip and layer names never enter an HTML sink", async () => {
  const env = await openApp();
  const payload = "<img src=x onerror=globalThis.injected=1>";
  const project = env.sandbox.__makeTemplate(payload);
  project.clips[0].name = payload;
  project.layers[0].name = payload;
  env.app.replaceProject(project);
  assert.equal(env.get("project-name").value, payload);
  assert.equal(
    env.get("clip-tabs").children[0].children[0].textContent,
    payload,
  );
  assert.equal(
    env.get("layer-list").children[0].children[1].children[1].textContent,
    payload,
  );
  assert.ok(env.html.every((value) => !value.includes(payload)));
});

test("a corrupted current draft recovers the previous draft; two failures do not save the example", async () => {
  const recovered = await openApp({ loadError: true, backup: true });
  assert.equal(recovered.app.project.name, "recovered");
  await recovered.app.flushSave();
  assert.equal(recovered.writes[0].name, "recovered");
  const corrupted = await openApp({ loadError: true });
  await corrupted.app.flushSave();
  assert.equal(
    corrupted.writes.length,
    0,
    "opening a damaged draft must not replace it with a demo",
  );
});

test("edits during an in-flight save schedule a new snapshot and cannot be marked saved early", async () => {
  const env = await openApp({ deferSave: true });
  const firstSave = env.app.flushSave();
  env.get("project-name").value = "第二版";
  env.get("project-name").dispatch("change");
  assert.equal(env.writes[0].name, "courier");
  env.completeSave();
  await firstSave;
  assert.notEqual(env.app.savedRevision, env.app.revision);
  const secondSave = env.app.flushSave();
  assert.equal(env.writes[1].name, "第二版");
  env.completeSave();
  await secondSave;
  assert.equal(env.app.savedRevision, env.app.revision);
});
