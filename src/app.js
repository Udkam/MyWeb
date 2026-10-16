import {
  LIMITS,
  uid,
  cloneProject,
  createProject,
  validateProject,
  hexToPixel,
  pixelToHex,
  rgba,
  compositeFrame,
  paintLine,
  floodFill,
  drawShape,
  flipPixels,
  movePixels,
  resizeProject,
  createHistory,
} from "./core.js";
import {
  projectBlob,
  readProjectFile,
  loadPNG,
  projectFromSheet,
  frameCanvas,
  pngBlob,
  sheetExport,
  sheetMetadata,
  framesZip,
  downloadBlob,
  saveLocal,
  loadLocal,
} from "./io.js";
import { createStage } from "./stage.js";
import { getTemplates, makeTemplate } from "./templates.js";

const $ = (id) => document.getElementById(id);
const paths = {
  pencil: "m15 4 5 5M4 15 15 4l5 5L9 20H4z",
  eraser: "m5 13 8-9 8 7-9 9H8l-4-4zM9 10l8 7M12 20h9",
  fill: "m4 12 8-8 8 8-8 8zM4 12h16M10 2l4 6M20 16s-3 3-3 4a3 3 0 0 0 6 0c0-1-3-4-3-4",
  picker: "m14 4 6 6M4 20l2-6L16 4l4 4L10 18z",
  line: "M5 19 19 5",
  rect: "M4 5h16v14H4z",
  select: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  move: "M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4",
  mirror: "M12 3v18M8 5l-5 7 5 7zM16 5l5 7-5 7z",
  plus: "M12 4v16M4 12h16",
  undo: "M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12",
  redo: "m16 4 5 5-5 5M21 9H10a6 6 0 0 0 0 12",
  flip: "M12 3v18M8 6l-5 12h5zM16 6l5 12h-5z",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
  onion: "M9 5h9v13H9zM5 9H3v12h10v-2",
  grid: "M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18",
  previous: "M5 5v14M19 5l-10 7 10 7z",
  next: "M19 5v14M5 5l10 7-10 7z",
  play: "m7 4 14 8-14 8z",
  pause: "M8 4v16M16 4v16",
  copy: "M8 8h13v13H8zM4 16H2V2h14v2",
  save: "M4 3h13l4 4v14H3V3zM7 3v6h9V3M7 21v-8h10v8",
  import: "M12 3v12M7 10l5 5 5-5M4 15v6h16v-6",
  export: "M12 16V3M7 8l5-5 5 5M4 15v6h16v-6",
  help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17v.2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  hidden: "M3 3l18 18M9 5c7-2 13 7 13 7l-3 4M6 6l-4 6s6 10 14 6",
  code: "m8 6-6 6 6 6M16 6l6 6-6 6",
  image: "M3 3h18v18H3zM3 17l6-7 5 6 3-3 4 5M15 7h.1",
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.rect}"/></svg>`;
}
document.querySelectorAll("[data-icon]").forEach((node) => {
  node.innerHTML = icon(node.dataset.icon);
});
const palette = [
  "#243c39",
  "#416d58",
  "#7d9c66",
  "#c0cba4",
  "#f4edce",
  "#fff8eb",
  "#944e46",
  "#c7664d",
  "#e78a51",
  "#f1b778",
  "#f2dca2",
  "#d9b27c",
  "#344a67",
  "#527b89",
  "#83afbb",
  "#b5d1ce",
  "#574361",
  "#8b6781",
  "#b78fa1",
  "#e0bfbc",
  "#4d423c",
  "#78684f",
  "#ab9874",
  "#d5c5a0",
];
let project = makeTemplate("courier");
let clipIndex = 0,
  frameIndex = 0,
  layerIndex = 0;
let tool = "pencil",
  color = hexToPixel("#e78a51"),
  brushSize = 1,
  mirror = false,
  onion = true,
  grid = true;
let zoom = 12,
  fitMode = true,
  selection = null,
  stroke = null,
  cursor = null;
let playing = !matchMedia("(prefers-reduced-motion: reduce)").matches,
  mode = "preview",
  previewFrame = 0;
let pendingImage = null,
  replacement = null,
  revision = 0,
  savedRevision = -1,
  saving = false,
  saveTimer = 0,
  toastTimer = 0;
let isReady = false,
  stageClipId = null;
const history = createHistory();
const canvas = $("pixel-canvas"),
  ctx = canvas.getContext("2d", { alpha: false });
const stage = createStage($("stage-canvas"));
const clip = () => project.clips[clipIndex];
const frame = () => clip().frames[frameIndex];
const cells = () => frame().cells[layerIndex];
const text = (id, value) => {
  $(id).textContent = value;
};
const pressed = (id, value) =>
  $(id).setAttribute("aria-pressed", String(value));
function notify(message, error = false) {
  clearTimeout(toastTimer);
  text("toast", message);
  $("toast").classList.toggle("error", error);
  $("toast").hidden = false;
  toastTimer = setTimeout(
    () => {
      $("toast").hidden = true;
    },
    error ? 6500 : 3300,
  );
}
function guarded(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      notify(error?.message || "操作未完成，请重试。", true);
    }
  };
}
function safeName(s) {
  return (
    String(s)
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .replace(/[. ]+$/g, "")
      .slice(0, 80) || "sprite"
  );
}
function downloadProject() {
  downloadBlob(
    projectBlob(project),
    `${safeName(project.name)}.spritelab.json`,
  );
  notify("已下载可编辑项目，可重新导入继续绘制。");
}
function normalizeSelection() {
  clipIndex = Math.min(clipIndex, project.clips.length - 1);
  frameIndex = Math.min(frameIndex, clip().frames.length - 1);
  layerIndex = Math.min(layerIndex, project.layers.length - 1);
  selection = null;
  cursor = null;
}
function pixelBudget(extraFrames = 0, extraLayers = 0) {
  const n = project.clips.reduce((sum, c) => sum + c.frames.length, 0);
  return (
    (n + extraFrames) *
      (project.layers.length + extraLayers) *
      project.width *
      project.height <=
    LIMITS.maxPixels
  );
}
function commitStroke() {
  if (stroke) finishStroke({ pointerId: stroke.id });
}
function syncPreviewToSelection() {
  previewFrame = frameIndex;
  stage.setFrame(frameIndex);
  updatePlayhead();
}
function transact(action, { resetSelection = false, syncFrame = false } = {}) {
  if (!isReady) return false;
  commitStroke();
  const before = cloneProject(project),
    previous = { clipIndex, frameIndex, layerIndex, previewFrame, selection };
  try {
    action();
    if (resetSelection) selection = null;
    normalizeIndexes();
  } catch (error) {
    project = before;
    ({ clipIndex, frameIndex, layerIndex, previewFrame, selection } = previous);
    render();
    notify(error?.message || "操作未完成，已保留修改前的作品。", true);
    return false;
  }
  history.push(before);
  changed();
  if (syncFrame) syncPreviewToSelection();
  return true;
}
function normalizeIndexes() {
  clipIndex = Math.max(0, Math.min(clipIndex, project.clips.length - 1));
  frameIndex = Math.max(0, Math.min(frameIndex, clip().frames.length - 1));
  layerIndex = Math.max(0, Math.min(layerIndex, project.layers.length - 1));
}
function changed() {
  revision++;
  render();
  queueSave();
}
function queueSave() {
  clearTimeout(saveTimer);
  $("save-status").classList.remove("error");
  $("save-status").innerHTML = "<i></i> 正在保存到本机…";
  saveTimer = setTimeout(flushSave, 450);
}
async function flushSave() {
  if (saving || !isReady || savedRevision === revision) return;
  saving = true;
  const rev = revision,
    snapshot = cloneProject(project);
  try {
    await saveLocal(snapshot);
    savedRevision = rev;
    if (rev === revision) {
      $("save-status").classList.remove("error");
      $("save-status").innerHTML = "<i></i> 已保存到本机";
    }
  } catch (error) {
    $("save-status").classList.add("error");
    text("save-status", "本机保存失败，请下载项目备份");
    notify(`本机保存失败：${error.message}。可用「保存项目」下载备份。`, true);
  } finally {
    saving = false;
    if (rev !== revision) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flushSave, 100);
    }
  }
}
function askReplace(
  next,
  message = "新作品将替换当前本机草稿。请先下载需要保留的项目。",
) {
  replacement = next;
  text("confirm-text", message);
  $("confirm-dialog").showModal();
}
function replaceProject(next) {
  const validated = validateProject(next);
  commitStroke();
  project = validated;
  clipIndex = frameIndex = layerIndex = previewFrame = 0;
  selection = null;
  history.clear();
  fitMode = true;
  stageClipId = null;
  revision++;
  render();
  fitCanvas();
  queueSave();
}
function render() {
  normalizeIndexes();
  $("project-name").value = project.name;
  text("project-meta", `${project.width} × ${project.height}`);
  text(
    "canvas-info",
    `${project.width} × ${project.height} · 第 ${frameIndex + 1} 帧`,
  );
  $("undo").disabled = !history.canUndo;
  $("redo").disabled = !history.canRedo;
  $("frame-duration").value = frame().duration;
  $("clip-name").value = clip().name;
  $("layer-name").value = project.layers[layerIndex].name;
  $("layer-opacity").value = Math.round(
    project.layers[layerIndex].opacity * 100,
  );
  text(
    "layer-opacity-value",
    `${Math.round(project.layers[layerIndex].opacity * 100)}%`,
  );
  $("add-layer").disabled =
    project.layers.length >= LIMITS.maxLayers || !pixelBudget(0, 1);
  $("delete-layer").disabled = project.layers.length === 1;
  $("layer-up").disabled = layerIndex === project.layers.length - 1;
  $("layer-down").disabled = layerIndex === 0;
  $("delete-frame").disabled = clip().frames.length === 1;
  $("delete-clip").disabled = project.clips.length === 1;
  $("add-frame").disabled = $("duplicate-frame").disabled =
    clip().frames.length >= LIMITS.maxFramesPerClip || !pixelBudget(1);
  $("add-clip").disabled =
    project.clips.length >= LIMITS.maxClips || !pixelBudget(1);
  $("frame-left").disabled = frameIndex === 0;
  $("frame-right").disabled = frameIndex === clip().frames.length - 1;
  renderClips();
  renderFrames();
  renderLayers();
  drawCanvas();
  stage.setProject(project);
  if (stageClipId !== clip().id) {
    stageClipId = clip().id;
    stage.setClip(clipIndex);
  }
  if (previewFrame >= clip().frames.length) {
    previewFrame = clip().frames.length - 1;
    stage.setFrame(previewFrame);
    updatePlayhead();
  }
  stage.setPlaying(playing);
}
function drawPixels(target, pixels, w, h, z = 1, opacity = 1) {
  target.save();
  target.globalAlpha = opacity;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const value = pixels[y * w + x];
      if (!value) continue;
      const [r, g, b, a] = rgba(value);
      target.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      target.fillRect(x * z, y * z, z, z);
    }
  target.restore();
}
function drawCanvas() {
  const w = project.width,
    h = project.height;
  if (canvas.width !== w * zoom || canvas.height !== h * zoom) {
    canvas.width = w * zoom;
    canvas.height = h * zoom;
    canvas.style.width = `${w * zoom}px`;
    canvas.style.height = `${h * zoom}px`;
  }
  ctx.imageSmoothingEnabled = false;
  const block = Math.max(1, Math.round(8 / zoom));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      ctx.fillStyle =
        (Math.floor(x / block) + Math.floor(y / block)) % 2
          ? "#e3e7db"
          : "#f5f6ec";
      ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
    }
  if (onion && clip().frames.length > 1) {
    const before =
        clip().frames[
          (frameIndex - 1 + clip().frames.length) % clip().frames.length
        ],
      after = clip().frames[(frameIndex + 1) % clip().frames.length];
    drawPixels(ctx, compositeFrame(project, before), w, h, zoom, 0.18);
    if (after !== before)
      drawPixels(ctx, compositeFrame(project, after), w, h, zoom, 0.12);
  }
  drawPixels(ctx, compositeFrame(project, frame()), w, h, zoom);
  if (grid && zoom >= 6) {
    ctx.strokeStyle = "#35523619";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      ctx.moveTo(x * zoom + 0.5, 0);
      ctx.lineTo(x * zoom + 0.5, h * zoom);
    }
    for (let y = 0; y <= h; y++) {
      ctx.moveTo(0, y * zoom + 0.5);
      ctx.lineTo(w * zoom, y * zoom + 0.5);
    }
    ctx.stroke();
  }
  if (selection) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(
      selection.x * zoom + 0.5,
      selection.y * zoom + 0.5,
      selection.w * zoom - 1,
      selection.h * zoom - 1,
    );
    ctx.lineDashOffset = 3.5;
    ctx.strokeStyle = "#243f36";
    ctx.strokeRect(
      selection.x * zoom + 0.5,
      selection.y * zoom + 0.5,
      selection.w * zoom - 1,
      selection.h * zoom - 1,
    );
    ctx.restore();
  }
  if (cursor && !stroke && tool !== "move" && tool !== "select") {
    const s = ["pencil", "eraser"].includes(tool) ? brushSize : 1;
    ctx.save();
    ctx.strokeStyle = "#243f36";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      (cursor.x - Math.floor((s - 1) / 2)) * zoom + 0.5,
      (cursor.y - Math.floor((s - 1) / 2)) * zoom + 0.5,
      s * zoom - 1,
      s * zoom - 1,
    );
    ctx.restore();
  }
  text("zoom-label", `${zoom * 100}%`);
}
function thumb(canvas, pixels, w, h) {
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, w, h);
  c.imageSmoothingEnabled = false;
  drawPixels(c, pixels, w, h);
}
function renderClips() {
  $("clip-tabs").replaceChildren();
  project.clips.forEach((c, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(i === clipIndex));
    button.setAttribute("aria-label", `动作：${c.name}`);
    const label = document.createElement("span");
    label.textContent = c.name;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = c.frames.length;
    button.append(label, count);
    button.onclick = () => {
      commitStroke();
      clipIndex = i;
      frameIndex = previewFrame = 0;
      selection = null;
      render();
      syncPreviewToSelection();
    };
    $("clip-tabs").append(button);
  });
}
function renderFrames() {
  const strip = $("frame-strip"),
    scroll = strip.scrollLeft;
  strip.replaceChildren();
  clip().frames.forEach((f, i) => {
    const button = document.createElement("button");
    button.className = "frame-tile";
    button.type = "button";
    button.draggable = true;
    button.dataset.frame = i;
    button.setAttribute("aria-pressed", String(i === frameIndex));
    button.setAttribute("aria-label", `第 ${i + 1} 帧，${f.duration} 毫秒`);
    const c = document.createElement("canvas");
    thumb(c, compositeFrame(project, f), project.width, project.height);
    const meta = document.createElement("span");
    const index = document.createElement("b");
    index.textContent = String(i + 1).padStart(2, "0");
    const duration = document.createElement("i");
    duration.style.fontStyle = "normal";
    duration.textContent = `${f.duration}ms`;
    meta.append(index, duration);
    button.append(c, meta);
    button.onclick = () => selectFrame(i);
    button.ondragstart = (e) => {
      e.dataTransfer.setData("application/x-spritelab-frame", String(i));
      e.dataTransfer.effectAllowed = "move";
    };
    button.ondragover = (e) => {
      if (e.dataTransfer.types.includes("application/x-spritelab-frame")) {
        e.preventDefault();
        button.classList.add("drag-over");
      }
    };
    button.ondragleave = () => button.classList.remove("drag-over");
    button.ondrop = (e) => {
      e.preventDefault();
      button.classList.remove("drag-over");
      const value = e.dataTransfer.getData("application/x-spritelab-frame");
      if (value === "") return;
      const from = Number(value);
      if (
        Number.isInteger(from) &&
        from >= 0 &&
        from < clip().frames.length &&
        from !== i
      )
        transact(
          () => {
            const [f] = clip().frames.splice(from, 1);
            clip().frames.splice(i, 0, f);
            frameIndex = i;
          },
          { resetSelection: true, syncFrame: true },
        );
    };
    strip.append(button);
  });
  strip.scrollLeft = scroll;
  updatePlayhead();
}
function selectFrame(index) {
  commitStroke();
  frameIndex = index;
  selection = null;
  render();
  syncPreviewToSelection();
}
function renderLayers() {
  $("layer-list").replaceChildren();
  [...project.layers.keys()].reverse().forEach((i) => {
    const layer = project.layers[i],
      row = document.createElement("div");
    row.className = `layer-row${i === layerIndex ? " selected" : ""}`;
    const visible = document.createElement("button");
    visible.className = "layer-visibility";
    visible.type = "button";
    visible.setAttribute(
      "aria-label",
      `${layer.visible ? "隐藏" : "显示"}图层 ${layer.name}`,
    );
    visible.innerHTML = icon(layer.visible ? "eye" : "hidden");
    visible.onclick = () =>
      transact(() => {
        layer.visible = !layer.visible;
      });
    const pick = document.createElement("button");
    pick.className = "layer-select";
    pick.setAttribute("aria-pressed", String(i === layerIndex));
    const c = document.createElement("canvas");
    thumb(c, frame().cells[i], project.width, project.height);
    const name = document.createElement("span");
    name.className = "layer-label";
    name.textContent = layer.name;
    pick.append(c, name);
    pick.onclick = () => {
      commitStroke();
      layerIndex = i;
      selection = null;
      render();
    };
    row.append(visible, pick);
    $("layer-list").append(row);
  });
}
function updatePlayhead() {
  const total = clip().frames.length;
  text(
    "stage-frame",
    `${String(previewFrame + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
  );
  document
    .querySelectorAll(".frame-tile")
    .forEach((node, i) =>
      node.classList.toggle("playhead", i === previewFrame),
    );
}
stage.setOnFrame((i) => {
  previewFrame = i;
  updatePlayhead();
});
function fitCanvas() {
  if (!fitMode) return;
  const shell = $("board-shell");
  zoom = Math.max(
    1,
    Math.min(
      32,
      Math.floor(
        Math.min(
          (shell.clientWidth - 58) / project.width,
          (shell.clientHeight - 58) / project.height,
        ),
      ),
    ),
  );
  drawCanvas();
}
new ResizeObserver(() => fitCanvas()).observe($("board-shell"));
function setTool(value) {
  tool = value;
  document
    .querySelectorAll("[data-tool]")
    .forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.tool === tool)),
    );
  const hints = {
    pencil: "先复制一帧，再改动手脚的位置。打开洋葱皮，前后动作就有了参照。",
    eraser: "橡皮擦回透明，不会涂成背景颜色。透明格不会进入导出的作品。",
    fill: "填充只影响当前层中相连、颜色相同的区域。",
    picker: "点击角色取色。使用画笔时，按住 Alt 也能临时取色。",
    line: "按下并拖到终点，松开画出像素直线。",
    rect: "拖出一个矩形轮廓，可配合填充工具上色。",
    select: "框选后切到「移动」，拖动选区。Delete 清除选区，Esc 取消选区。",
    move: "拖动当前层。已有选区时只移动选区内的像素，移动出画布的部分会被裁掉，可撤销。",
  };
  text("context-tip", hints[tool]);
  canvas.style.cursor =
    tool === "move" ? "move" : tool === "picker" ? "copy" : "crosshair";
  drawCanvas();
}
function setColor(value) {
  color = value >>> 0;
  $("color-picker").value = pixelToHex(color);
  $("color-hex").value = pixelToHex(color);
  $("color-alpha").value = color & 255;
  text("alpha-label", `${Math.round(((color & 255) / 255) * 100)}%`);
  document
    .querySelectorAll("#palette button")
    .forEach((b) =>
      b.classList.toggle("selected", hexToPixel(b.dataset.color) === color),
    );
}
palette.forEach((hex) => {
  const b = document.createElement("button");
  b.type = "button";
  b.style.setProperty("--swatch", hex);
  b.dataset.color = hex;
  b.title = hex;
  b.setAttribute("aria-label", `颜色 ${hex}`);
  b.onclick = () => setColor(hexToPixel(hex));
  $("palette").append(b);
});
document
  .querySelectorAll("[data-tool]")
  .forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
$("color-picker").oninput = (e) => setColor(hexToPixel(e.target.value));
$("color-hex").onchange = guarded((e) => {
  setColor(hexToPixel(e.target.value));
});
$("color-alpha").oninput = (e) =>
  setColor(((color & 0xffffff00) | Number(e.target.value)) >>> 0);
$("brush-size").oninput = (e) => {
  brushSize = Number(e.target.value);
  text("brush-label", `${brushSize} px`);
};
$("mirror-button").onclick = () => {
  mirror = !mirror;
  pressed("mirror-button", mirror);
};
$("onion-toggle").onclick = () => {
  onion = !onion;
  pressed("onion-toggle", onion);
  drawCanvas();
};
$("grid-toggle").onclick = () => {
  grid = !grid;
  pressed("grid-toggle", grid);
  drawCanvas();
};
function point(e, clipBounds = true) {
  const rect = canvas.getBoundingClientRect();
  let x = Math.floor(((e.clientX - rect.left) / rect.width) * project.width),
    y = Math.floor(((e.clientY - rect.top) / rect.height) * project.height);
  if (clipBounds) {
    x = Math.max(0, Math.min(project.width - 1, x));
    y = Math.max(0, Math.min(project.height - 1, y));
  }
  return { x, y };
}
function selectionFrom(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x) + 1,
    h: Math.abs(a.y - b.y) + 1,
  };
}
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => {
  if (!isReady || stroke || e.button > 0) return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  const p = point(e);
  if (e.altKey || tool === "picker") {
    setColor(compositeFrame(project, frame())[p.y * project.width + p.x]);
    return;
  }
  if (
    tool !== "select" &&
    (!project.layers[layerIndex].visible ||
      project.layers[layerIndex].opacity === 0)
  ) {
    notify("当前图层不可见，请先打开图层显示或提高不透明度。");
    return;
  }
  stroke = {
    id: e.pointerId,
    start: p,
    last: p,
    original: cells().slice(),
    tool,
    selection: selection ? { ...selection } : null,
  };
  if (tool === "select") {
    selection = selectionFrom(p, p);
    drawCanvas();
    return;
  }
  history.push(project);
  if (tool === "fill") {
    floodFill(cells(), project.width, project.height, p.x, p.y, color);
  } else if (tool === "pencil" || tool === "eraser") {
    paintLine(
      cells(),
      project.width,
      project.height,
      p.x,
      p.y,
      p.x,
      p.y,
      tool === "eraser" ? 0 : color,
      brushSize,
      mirror,
    );
  } else if (tool === "line" || tool === "rect") {
    drawShape(
      cells(),
      project.width,
      project.height,
      p.x,
      p.y,
      p.x,
      p.y,
      color,
      tool,
    );
  }
  drawCanvas();
});
canvas.addEventListener("pointermove", (e) => {
  const p = point(e, Boolean(stroke));
  cursor = p;
  text("cursor-info", `X ${p.x} · Y ${p.y}`);
  if (!stroke) {
    drawCanvas();
    return;
  }
  if (e.pointerId !== stroke.id) return;
  e.preventDefault();
  const s = stroke;
  if (s.tool === "pencil" || s.tool === "eraser")
    paintLine(
      cells(),
      project.width,
      project.height,
      s.last.x,
      s.last.y,
      p.x,
      p.y,
      s.tool === "eraser" ? 0 : color,
      brushSize,
      mirror,
    );
  else if (s.tool === "fill") return;
  else if (s.tool === "line" || s.tool === "rect") {
    frame().cells[layerIndex] = s.original.slice();
    drawShape(
      cells(),
      project.width,
      project.height,
      s.start.x,
      s.start.y,
      p.x,
      p.y,
      color,
      s.tool,
    );
  } else if (s.tool === "select") selection = selectionFrom(s.start, p);
  else if (s.tool === "move") {
    const dx = p.x - s.start.x,
      dy = p.y - s.start.y;
    frame().cells[layerIndex] = movePixels(
      s.original,
      project.width,
      project.height,
      dx,
      dy,
      s.selection,
    );
    if (s.selection)
      selection = {
        ...s.selection,
        x: s.selection.x + dx,
        y: s.selection.y + dy,
      };
  }
  s.last = p;
  drawCanvas();
});
function finishStroke(e) {
  if (!stroke || e.pointerId !== stroke.id) return;
  const editing = stroke.tool !== "select";
  stroke = null;
  if (canvas.hasPointerCapture(e.pointerId))
    canvas.releasePointerCapture(e.pointerId);
  if (editing) changed();
  else drawCanvas();
}
canvas.addEventListener("pointerup", finishStroke);
canvas.addEventListener("pointercancel", finishStroke);
canvas.addEventListener("lostpointercapture", finishStroke);
canvas.addEventListener("pointerleave", () => {
  cursor = null;
  text("cursor-info", "X — · Y —");
  if (!stroke) drawCanvas();
});
function undo() {
  commitStroke();
  const previous = history.undo(project);
  if (previous) {
    project = previous;
    normalizeSelection();
    changed();
    syncPreviewToSelection();
  }
}
function redo() {
  commitStroke();
  const next = history.redo(project);
  if (next) {
    project = next;
    normalizeSelection();
    changed();
    syncPreviewToSelection();
  }
}
$("undo").onclick = undo;
$("redo").onclick = redo;
function flipSelection() {
  if (!selection) {
    frame().cells[layerIndex] = flipPixels(
      cells(),
      project.width,
      project.height,
      "x",
    );
    return;
  }
  const s = selection,
    original = cells().slice();
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const tx = s.x + x,
        ty = s.y + y,
        sx = s.x + s.w - 1 - x;
      if (
        tx >= 0 &&
        tx < project.width &&
        ty >= 0 &&
        ty < project.height &&
        sx >= 0 &&
        sx < project.width
      )
        cells()[ty * project.width + tx] = original[ty * project.width + sx];
    }
}
$("flip-x").onclick = () => transact(flipSelection);
function clearPixels() {
  if (selection) {
    for (let y = selection.y; y < selection.y + selection.h; y++)
      for (let x = selection.x; x < selection.x + selection.w; x++)
        if (x >= 0 && y >= 0 && x < project.width && y < project.height)
          cells()[y * project.width + x] = 0;
  } else cells().fill(0);
}
$("clear-frame").onclick = () => transact(clearPixels);
function addFrame(copy) {
  if (clip().frames.length >= LIMITS.maxFramesPerClip || !pixelBudget(1))
    return notify("当前项目已达到帧数或像素预算上限。", true);
  transact(
    () => {
      const next = {
        id: uid("frame"),
        duration: frame().duration,
        cells: copy
          ? frame().cells.map((c) => c.slice())
          : project.layers.map(() =>
              Array(project.width * project.height).fill(0),
            ),
      };
      clip().frames.splice(frameIndex + 1, 0, next);
      frameIndex++;
    },
    { resetSelection: true, syncFrame: true },
  );
}
$("duplicate-frame").onclick = () => addFrame(true);
$("add-frame").onclick = () => addFrame(false);
$("delete-frame").onclick = () => {
  if (clip().frames.length > 1)
    transact(
      () => {
        clip().frames.splice(frameIndex, 1);
        frameIndex = Math.max(0, frameIndex - 1);
      },
      { resetSelection: true, syncFrame: true },
    );
};
function reorderFrame(delta) {
  const destination = frameIndex + delta;
  if (destination < 0 || destination >= clip().frames.length) return;
  transact(
    () => {
      const [f] = clip().frames.splice(frameIndex, 1);
      clip().frames.splice(destination, 0, f);
      frameIndex = destination;
    },
    { resetSelection: true, syncFrame: true },
  );
}
$("frame-left").onclick = () => reorderFrame(-1);
$("frame-right").onclick = () => reorderFrame(1);
$("frame-duration").onchange = () => {
  const v = Number($("frame-duration").value);
  if (!Number.isInteger(v) || v < 30 || v > 2000) {
    $("frame-duration").value = frame().duration;
    return notify("每帧停留时间为 30–2000 ms。", true);
  }
  if (v !== frame().duration)
    transact(() => {
      frame().duration = v;
    });
};
$("apply-duration").onclick = () =>
  transact(() => {
    clip().frames.forEach((f) => {
      f.duration = frame().duration;
    });
  });
$("project-name").onchange = () => {
  const name = $("project-name").value.trim();
  if (name && name !== project.name)
    transact(() => {
      project.name = name;
    });
  else $("project-name").value = project.name;
};
$("clip-name").onchange = () => {
  const name = $("clip-name").value.trim();
  if (name && name !== clip().name)
    transact(() => {
      clip().name = name;
    });
  else $("clip-name").value = clip().name;
};
$("add-clip").onclick = () => {
  if (project.clips.length >= LIMITS.maxClips || !pixelBudget(1)) return;
  transact(
    () => {
      project.clips.push({
        id: uid("clip"),
        name: `动作 ${project.clips.length + 1}`,
        frames: [
          {
            id: uid("frame"),
            duration: 140,
            cells: project.layers.map(() =>
              Array(project.width * project.height).fill(0),
            ),
          },
        ],
      });
      clipIndex = project.clips.length - 1;
      frameIndex = previewFrame = 0;
    },
    { resetSelection: true },
  );
  $("clip-name").focus();
  $("clip-name").select();
};
$("delete-clip").onclick = () => {
  if (project.clips.length > 1)
    transact(
      () => {
        project.clips.splice(clipIndex, 1);
        clipIndex = Math.max(0, clipIndex - 1);
        frameIndex = previewFrame = 0;
      },
      { resetSelection: true },
    );
};
$("add-layer").onclick = () => {
  if (project.layers.length >= LIMITS.maxLayers || !pixelBudget(0, 1)) return;
  transact(
    () => {
      project.layers.push({
        id: uid("layer"),
        name: `图层 ${project.layers.length + 1}`,
        visible: true,
        opacity: 1,
      });
      project.clips.forEach((c) =>
        c.frames.forEach((f) =>
          f.cells.push(Array(project.width * project.height).fill(0)),
        ),
      );
      layerIndex = project.layers.length - 1;
    },
    { resetSelection: true },
  );
};
$("delete-layer").onclick = () => {
  if (project.layers.length > 1)
    transact(
      () => {
        project.layers.splice(layerIndex, 1);
        project.clips.forEach((c) =>
          c.frames.forEach((f) => f.cells.splice(layerIndex, 1)),
        );
        layerIndex = Math.max(0, layerIndex - 1);
      },
      { resetSelection: true },
    );
};
$("layer-name").onchange = () => {
  const name = $("layer-name").value.trim();
  if (name && name !== project.layers[layerIndex].name)
    transact(() => {
      project.layers[layerIndex].name = name;
    });
  else $("layer-name").value = project.layers[layerIndex].name;
};
$("layer-opacity").onchange = () => {
  const value = Number($("layer-opacity").value) / 100;
  if (value !== project.layers[layerIndex].opacity)
    transact(() => {
      project.layers[layerIndex].opacity = value;
    });
};
$("layer-opacity").oninput = (e) =>
  text("layer-opacity-value", `${e.target.value}%`);
function reorderLayer(delta) {
  const dest = layerIndex + delta;
  if (dest < 0 || dest >= project.layers.length) return;
  transact(() => {
    [project.layers[layerIndex], project.layers[dest]] = [
      project.layers[dest],
      project.layers[layerIndex],
    ];
    project.clips.forEach((c) =>
      c.frames.forEach((f) => {
        [f.cells[layerIndex], f.cells[dest]] = [
          f.cells[dest],
          f.cells[layerIndex],
        ];
      }),
    );
    layerIndex = dest;
  });
}
$("layer-up").onclick = () => reorderLayer(1);
$("layer-down").onclick = () => reorderLayer(-1);
$("zoom-out").onclick = () => {
  fitMode = false;
  zoom = Math.max(1, zoom - 1);
  drawCanvas();
};
$("zoom-in").onclick = () => {
  fitMode = false;
  zoom = Math.min(40, zoom + 1);
  drawCanvas();
};
$("zoom-fit").onclick = () => {
  fitMode = true;
  fitCanvas();
};
$("resize-button").onclick = () => {
  $("resize-width").value = project.width;
  $("resize-height").value = project.height;
  $("resize-dialog").showModal();
};
$("confirm-resize").onclick = guarded(() => {
  if (
    transact(
      () => {
        project = resizeProject(
          project,
          Number($("resize-width").value),
          Number($("resize-height").value),
        );
        normalizeSelection();
        fitMode = true;
      },
      { resetSelection: true, syncFrame: true },
    )
  ) {
    fitCanvas();
    $("resize-dialog").close();
  }
});
function setPlaying(value) {
  playing = value;
  stage.setPlaying(playing);
  $("play-toggle").innerHTML = icon(playing ? "pause" : "play");
  $("play-toggle").setAttribute(
    "aria-label",
    playing ? "暂停预览" : "播放预览",
  );
  pressed("play-toggle", playing);
}
$("play-toggle").onclick = () => setPlaying(!playing);
$("previous-frame").onclick = () => {
  setPlaying(false);
  stage.step(-1);
};
$("next-frame").onclick = () => {
  setPlaying(false);
  stage.step(1);
};
$("play-speed").onchange = (e) => stage.setSpeed(Number(e.target.value));
function setMode(value) {
  mode = value;
  stage.setMode(mode);
  pressed("mode-preview", mode === "preview");
  pressed("mode-run", mode === "run");
  $("run-controls").hidden = mode !== "run";
}
$("mode-preview").onclick = () => setMode("preview");
$("mode-run").onclick = () => setMode("run");
$("stage-background").onchange = (e) => stage.setBackground(e.target.value);
$("stage-scale").onchange = (e) => stage.setScale(Number(e.target.value));
function movementButton(id, direction) {
  const b = $(id);
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    stage.move(direction);
  };
  const stop = () => stage.move(0);
  b.onpointerup = stop;
  b.onpointercancel = stop;
  b.onlostpointercapture = stop;
}
movementButton("run-left", -1);
movementButton("run-right", 1);
$("run-jump").onclick = () => stage.jump();
$("new-button").onclick = () => $("new-dialog").showModal();
getTemplates().forEach((t) => {
  const b = document.createElement("button");
  b.className = "template-card";
  const sample = t.thumbnailProject || makeTemplate(t.id),
    c = document.createElement("canvas");
  thumb(
    c,
    compositeFrame(sample, sample.clips[0].frames[0]),
    sample.width,
    sample.height,
  );
  const name = document.createElement("strong");
  name.textContent = t.name;
  const desc = document.createElement("small");
  desc.textContent = t.description;
  b.append(c, name, desc);
  b.onclick = () => {
    $("new-dialog").close();
    askReplace(() => makeTemplate(t.id));
  };
  $("template-gallery").append(b);
});
$("new-blank").onclick = () => {
  const size = Number($("new-size").value);
  $("new-dialog").close();
  askReplace(() => createProject(size, size, "未命名作品"));
};
$("confirm-cancel").onclick = () => {
  replacement = null;
  $("confirm-dialog").close();
};
$("confirm-save").onclick = guarded(downloadProject);
$("confirm-yes").onclick = guarded(async () => {
  const action = replacement;
  if (!action) return;
  const next = await action();
  replaceProject(next);
  replacement = null;
  $("confirm-dialog").close();
  notify("新草稿已打开。");
});
$("confirm-dialog").addEventListener("cancel", () => {
  replacement = null;
});
$("save-project").onclick = guarded(downloadProject);
$("export-project").onclick = guarded(downloadProject);
$("export-button").onclick = () => {
  text(
    "export-summary",
    `${project.name} / ${clip().name} · ${clip().frames.length} 帧 · ${project.width} × ${project.height} px`,
  );
  text("export-status", "导出仅包含你的作品，不含棋盘格、网格或洋葱皮。");
  $("export-dialog").showModal();
};
const exportName = () => `${safeName(project.name)}-${safeName(clip().name)}`;
const exportSettings = () => ({
  columns: Number($("export-columns").value),
  scale: Number($("export-scale").value),
});
function exportAction(id, fn) {
  $(id).onclick = async () => {
    const button = $(id);
    button.disabled = true;
    text("export-status", "正在整理作品…");
    try {
      await fn();
      text("export-status", "已生成下载，请在浏览器下载列表中查看。");
    } catch (error) {
      text("export-status", error.message);
      notify(error.message, true);
    } finally {
      button.disabled = false;
    }
  };
}
exportAction("export-sheet", async () => {
  const result = await sheetExport(project, clipIndex, exportSettings());
  downloadBlob(result.blob, `${exportName()}-sheet.png`);
});
exportAction("export-metadata", async () => {
  const metadata = sheetMetadata(project, clipIndex, exportSettings());
  downloadBlob(
    new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }),
    `${exportName()}-timing.json`,
  );
});
exportAction("export-frames", async () =>
  downloadBlob(
    await framesZip(project, clipIndex),
    `${exportName()}-frames.zip`,
  ),
);
exportAction("export-frame", async () =>
  downloadBlob(
    await pngBlob(frameCanvas(project, frame())),
    `${exportName()}-${String(frameIndex + 1).padStart(2, "0")}.png`,
  ),
);
$("import-button").onclick = () => $("file-input").click();
async function importFile(file) {
  if (!file) return;
  if (/\.png$/i.test(file.name) || file.type === "image/png") {
    pendingImage = await loadPNG(file);
    pendingImage.name = file.name.replace(/\.png$/i, "");
    const img = pendingImage,
      c = $("import-preview");
    thumb(c, img.pixels, img.width, img.height);
    $("import-width").value = img.width <= 128 ? img.width : 32;
    $("import-height").value = img.height <= 128 ? img.height : 32;
    text("import-meta", `${file.name} · ${img.width} × ${img.height} px`);
    updateImportSummary();
    $("import-dialog").showModal();
  } else {
    const next = await readProjectFile(file);
    askReplace(
      () => next,
      `将打开「${next.name}」。当前本机草稿会被替换，可先下载备份。`,
    );
  }
}
$("file-input").onchange = guarded(async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  await importFile(file);
});
function updateImportSummary() {
  if (!pendingImage) return;
  const w = Number($("import-width").value),
    h = Number($("import-height").value),
    cols = pendingImage.width / w,
    rows = pendingImage.height / h;
  const good =
    Number.isInteger(w) &&
    Number.isInteger(h) &&
    w > 0 &&
    h > 0 &&
    w <= 128 &&
    h <= 128 &&
    Number.isInteger(cols) &&
    Number.isInteger(rows) &&
    cols * rows <= 64;
  text(
    "import-summary",
    good
      ? `${cols} 列 × ${rows} 行，共 ${cols * rows} 帧`
      : "尺寸必须完整覆盖原图；每帧最大 128 × 128，总数最多 64 帧。",
  );
  $("confirm-import").disabled = !good;
}
$("import-width").oninput = updateImportSummary;
$("import-height").oninput = updateImportSummary;
$("confirm-import").onclick = guarded(() => {
  const w = Number($("import-width").value),
    h = Number($("import-height").value),
    next = projectFromSheet(pendingImage, {
      frameWidth: w,
      frameHeight: h,
      columns: pendingImage.width / w,
      rows: pendingImage.height / h,
      name: pendingImage.name,
      duration: Number($("import-duration").value),
    });
  $("import-dialog").close();
  pendingImage = null;
  askReplace(() => next);
});
window.addEventListener("dragover", (e) => {
  if ([...e.dataTransfer.types].includes("Files")) e.preventDefault();
});
window.addEventListener(
  "drop",
  guarded(async (e) => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    if (document.querySelector("dialog[open]"))
      return notify("先关闭当前窗口，再拖入文件。");
    await importFile(e.dataTransfer.files[0]);
  }),
);
$("help-button").onclick = $("about-button").onclick = () =>
  $("help-dialog").showModal();
$("dismiss-welcome").onclick = () => {
  $("welcome-strip").hidden = true;
  fitCanvas();
};
document.querySelectorAll("dialog").forEach((dialog) =>
  dialog.addEventListener("click", (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }),
);
const keys = {
  b: "pencil",
  e: "eraser",
  g: "fill",
  i: "picker",
  l: "line",
  r: "rect",
  m: "select",
  v: "move",
};
window.addEventListener("keydown", (e) => {
  if (
    !isReady ||
    stroke ||
    e.target.closest("input,textarea,select,[contenteditable]") ||
    document.querySelector("dialog[open]")
  )
    return;
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && key === "z") {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && key === "s") {
    e.preventDefault();
    downloadProject();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && key === "y") {
    e.preventDefault();
    redo();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (
    mode === "run" &&
    ["arrowleft", "arrowright", "a", "d", " "].includes(key)
  ) {
    e.preventDefault();
    if (key === " ") {
      if (!e.repeat) stage.jump();
    } else stage.move(key === "arrowleft" || key === "a" ? -1 : 1);
    return;
  }
  if (keys[key]) {
    setTool(keys[key]);
    return;
  }
  if (key === "d") {
    e.preventDefault();
    addFrame(true);
  }
  if (key === "escape") {
    selection = null;
    drawCanvas();
  }
  if (key === "delete" && selection) {
    e.preventDefault();
    transact(clearPixels);
  }
  if (key === " ") {
    e.preventDefault();
    setPlaying(!playing);
  }
});
window.addEventListener("keyup", (e) => {
  if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key))
    stage.move(0);
});
window.addEventListener("blur", () => {
  stage.move(0);
  if (stroke) finishStroke({ pointerId: stroke.id });
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stage.move(0);
    if (stroke) finishStroke({ pointerId: stroke.id });
    clearTimeout(saveTimer);
    void flushSave();
  }
});
window.addEventListener("beforeunload", (e) => {
  if (isReady && savedRevision !== revision) {
    void flushSave();
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("pagehide", () => {
  stage.move(0);
  void flushSave();
});
async function initialize() {
  setColor(color);
  stage.setBackground($("stage-background").value);
  let canSave = true;
  try {
    const stored = await loadLocal();
    if (stored) project = stored;
  } catch (error) {
    try {
      const backup = await loadLocal({ previous: true });
      if (!backup) throw error;
      project = backup;
      notify("已恢复上一份本机草稿，请下载项目备份。", true);
    } catch {
      canSave = false;
      notify(
        `本机草稿未能读取：${error.message}。已打开示例，可导入之前下载的项目。`,
        true,
      );
    }
  }
  isReady = true;
  render();
  setPlaying(playing);
  fitCanvas();
  if (canSave) queueSave();
  else {
    savedRevision = revision;
    $("save-status").classList.add("error");
    text("save-status", "原草稿未覆盖；编辑后将保存新草稿");
  }
}
initialize().catch((error) => {
  console.error(error);
  notify(`编辑器初始化失败：${error.message}`, true);
  text("save-status", "初始化失败，请刷新或检查浏览器支持。");
});
