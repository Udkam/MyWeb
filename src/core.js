// SpriteLab's data and pixel operations are independent of the DOM.
// Pixels are unsigned 0xRRGGBBAA values; arrays stay JSON-compatible.
export const LIMITS = Object.freeze({
  maxDimension: 128,
  maxLayers: 4,
  maxClips: 8,
  maxFramesPerClip: 64,
  maxPixels: 2_097_152,
  minDuration: 30,
  maxDuration: 2_000,
});

let nextId = 0;

function fail(message) {
  throw new Error(message);
}

function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${label}必须是 ${min}～${max} 之间的整数。`);
  }
  return value;
}

function dimensions(w, h) {
  integer(w, 1, LIMITS.maxDimension, "画布宽度");
  integer(h, 1, LIMITS.maxDimension, "画布高度");
}

function pixelValue(value, label = "像素颜色") {
  return integer(value, 0, 0xffffffff, label);
}

function textValue(value, label, maxLength = 128) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    fail(`${label}必须是 1～${maxLength} 个字符的非空文字。`);
  }
  return value;
}

// Reading descriptors rejects accessors without invoking untrusted getters.
function record(value, fields, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`${label}包含不支持的对象类型。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || !fields.includes(key)) {
      fail(`${label}包含未知字段。`);
    }
    if (!Object.hasOwn(descriptors[key], "value")) {
      fail(`${label}不能包含动态属性。`);
    }
  }
  for (const key of fields) {
    if (!Object.hasOwn(descriptors, key)) fail(`${label}缺少 ${key} 字段。`);
  }
  return value;
}

function array(value, min, max, label) {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    fail(`${label}必须是普通数组。`);
  }
  integer(value.length, min, max, `${label}数量`);
  if (Reflect.ownKeys(value).length !== value.length + 1) {
    fail(`${label}不能包含空缺或额外属性。`);
  }
  return value;
}

function item(values, index, label) {
  const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
  if (!descriptor || !Object.hasOwn(descriptor, "value")) {
    fail(`${label}不能包含空缺或动态属性。`);
  }
  return descriptor.value;
}

function uniqueId(value, seen, label) {
  textValue(value, `${label}标识`);
  if (seen.has(value)) fail(`${label}标识重复。`);
  seen.add(value);
  return value;
}

function budget(width, height, layerCount, frameCount) {
  if (width * height * layerCount * frameCount > LIMITS.maxPixels) {
    fail(
      `作品总像素超过 ${LIMITS.maxPixels.toLocaleString("zh-CN")}，请减少画布尺寸、帧数或图层。`,
    );
  }
}

export function uid(prefix = "item") {
  textValue(prefix, "标识前缀", 64);
  const random = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${random || `${Date.now().toString(36)}-${(++nextId).toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

// This fast copy is for in-memory projects already checked at the input boundary.
export function cloneProject(project) {
  return {
    format: project.format,
    version: project.version,
    name: project.name,
    width: project.width,
    height: project.height,
    layers: project.layers.map((layer) => ({ ...layer })),
    clips: project.clips.map((clip) => ({
      id: clip.id,
      name: clip.name,
      frames: clip.frames.map((frame) => ({
        id: frame.id,
        duration: frame.duration,
        cells: frame.cells.map((cells) => cells.slice()),
      })),
    })),
  };
}

export function createProject(width = 32, height = 32, name = "未命名作品") {
  dimensions(width, height);
  textValue(name, "作品名称");
  return {
    format: "spritelab",
    version: 1,
    name,
    width,
    height,
    layers: [{ id: uid("layer"), name: "图层 1", visible: true, opacity: 1 }],
    clips: [
      {
        id: uid("clip"),
        name: "动画 1",
        frames: [
          {
            id: uid("frame"),
            duration: 140,
            cells: [Array(width * height).fill(0)],
          },
        ],
      },
    ],
  };
}

export function validateProject(value) {
  record(
    value,
    ["format", "version", "name", "width", "height", "layers", "clips"],
    "作品",
  );
  if (value.format !== "spritelab" || value.version !== 1) {
    fail("不支持的作品格式或版本，请选择 SpriteLab 第 1 版作品文件。");
  }
  dimensions(value.width, value.height);
  textValue(value.name, "作品名称");
  const layers = array(value.layers, 1, LIMITS.maxLayers, "图层");
  const clips = array(value.clips, 1, LIMITS.maxClips, "动作");
  let frameCount = 0;
  // Count everything before allocating any copied pixel arrays.
  for (let c = 0; c < clips.length; c += 1) {
    const clip = record(
      item(clips, c, "动作"),
      ["id", "name", "frames"],
      `动作 ${c + 1}`,
    );
    frameCount += array(
      clip.frames,
      1,
      LIMITS.maxFramesPerClip,
      "动作帧",
    ).length;
  }
  budget(value.width, value.height, layers.length, frameCount);
  const layerIds = new Set();
  const normalizedLayers = [];
  for (let l = 0; l < layers.length; l += 1) {
    const layer = record(
      item(layers, l, "图层"),
      ["id", "name", "visible", "opacity"],
      `图层 ${l + 1}`,
    );
    uniqueId(layer.id, layerIds, "图层");
    textValue(layer.name, "图层名称");
    if (typeof layer.visible !== "boolean") fail("图层可见状态必须是布尔值。");
    if (
      typeof layer.opacity !== "number" ||
      !Number.isFinite(layer.opacity) ||
      layer.opacity < 0 ||
      layer.opacity > 1
    ) {
      fail("图层不透明度必须是 0～1 之间的数字。");
    }
    normalizedLayers.push({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
    });
  }
  const clipIds = new Set();
  const normalizedClips = [];
  const pixelCount = value.width * value.height;
  for (let c = 0; c < clips.length; c += 1) {
    const clip = item(clips, c, "动作");
    uniqueId(clip.id, clipIds, "动作");
    textValue(clip.name, "动作名称");
    const frameIds = new Set();
    const frames = [];
    for (let f = 0; f < clip.frames.length; f += 1) {
      const frame = record(
        item(clip.frames, f, "帧"),
        ["id", "duration", "cells"],
        `第 ${f + 1} 帧`,
      );
      uniqueId(frame.id, frameIds, "同一动作内的帧");
      integer(frame.duration, LIMITS.minDuration, LIMITS.maxDuration, "帧时长");
      array(frame.cells, layers.length, layers.length, "帧图层");
      const cells = [];
      for (let l = 0; l < layers.length; l += 1) {
        const source = array(
          item(frame.cells, l, "帧图层"),
          pixelCount,
          pixelCount,
          "图层像素",
        );
        const copy = new Array(pixelCount);
        for (let p = 0; p < pixelCount; p += 1) {
          copy[p] = pixelValue(
            item(source, p, "像素"),
            `第 ${f + 1} 帧第 ${l + 1} 层像素`,
          );
        }
        cells.push(copy);
      }
      frames.push({ id: frame.id, duration: frame.duration, cells });
    }
    normalizedClips.push({ id: clip.id, name: clip.name, frames });
  }
  return {
    format: "spritelab",
    version: 1,
    name: value.name,
    width: value.width,
    height: value.height,
    layers: normalizedLayers,
    clips: normalizedClips,
  };
}

export function hexToPixel(hex) {
  if (typeof hex !== "string" || !/^#[\da-f]{6}$/i.test(hex)) {
    fail("颜色必须采用 #RRGGBB 格式。");
  }
  return (Number.parseInt(hex.slice(1), 16) * 256 + 255) >>> 0;
}

export function pixelToHex(pixel) {
  pixelValue(pixel);
  return `#${(pixel >>> 8).toString(16).padStart(6, "0")}`;
}

export function rgba(pixel) {
  pixelValue(pixel);
  return [
    (pixel >>> 24) & 255,
    (pixel >>> 16) & 255,
    (pixel >>> 8) & 255,
    pixel & 255,
  ];
}

function pack(r, g, b, a) {
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

function pixelArray(cells, w, h) {
  dimensions(w, h);
  if (!Array.isArray(cells) || cells.length !== w * h)
    fail("像素数组长度与画布尺寸不一致。");
}

export function compositeFrame(project, frame) {
  dimensions(project.width, project.height);
  if (
    !Array.isArray(frame.cells) ||
    frame.cells.length !== project.layers.length
  ) {
    fail("帧的图层数量与作品不一致。");
  }
  for (const cells of frame.cells)
    pixelArray(cells, project.width, project.height);
  const output = Array(project.width * project.height).fill(0);
  for (let p = 0; p < output.length; p += 1) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let l = 0; l < project.layers.length; l += 1) {
      const layer = project.layers[l];
      if (!layer.visible || layer.opacity === 0) continue;
      const color = frame.cells[l][p];
      const sourceAlpha = ((color & 255) / 255) * layer.opacity;
      if (sourceAlpha === 0) continue;
      const remainder = 1 - sourceAlpha;
      r = ((color >>> 24) & 255) * sourceAlpha + r * remainder;
      g = ((color >>> 16) & 255) * sourceAlpha + g * remainder;
      b = ((color >>> 8) & 255) * sourceAlpha + b * remainder;
      a = sourceAlpha + a * remainder;
    }
    if (a > 0)
      output[p] = pack(
        Math.round(r / a),
        Math.round(g / a),
        Math.round(b / a),
        Math.round(a * 255),
      );
  }
  return output;
}

function coordinate(value) {
  if (!Number.isFinite(value) || !Number.isSafeInteger(Math.round(value)))
    fail("绘图坐标必须是有限数字。");
  return Math.round(value);
}

// Liang–Barsky clipping bounds the work even for a segment millions of pixels long.
function clipLine(x0, y0, x1, y1, minX, minY, maxX, maxY) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let enter = 0;
  let leave = 1;
  const directions = [-dx, dx, -dy, dy];
  const distances = [x0 - minX, maxX - x0, y0 - minY, maxY - y0];
  for (let i = 0; i < 4; i += 1) {
    if (directions[i] === 0) {
      if (distances[i] < 0) return null;
    } else {
      const ratio = distances[i] / directions[i];
      if (directions[i] < 0) enter = Math.max(enter, ratio);
      else leave = Math.min(leave, ratio);
      if (enter > leave) return null;
    }
  }
  return [
    Math.max(minX, Math.min(maxX, Math.round(x0 + enter * dx))),
    Math.max(minY, Math.min(maxY, Math.round(y0 + enter * dy))),
    Math.max(minX, Math.min(maxX, Math.round(x0 + leave * dx))),
    Math.max(minY, Math.min(maxY, Math.round(y0 + leave * dy))),
  ];
}

export function paintLine(
  cells,
  w,
  h,
  x0,
  y0,
  x1,
  y1,
  color,
  size = 1,
  mirror = false,
) {
  pixelArray(cells, w, h);
  pixelValue(color);
  integer(size, 1, LIMITS.maxDimension, "笔刷尺寸");
  x0 = coordinate(x0);
  y0 = coordinate(y0);
  x1 = coordinate(x1);
  y1 = coordinate(y1);
  const start = -Math.floor(size / 2);
  const end = start + size - 1;
  const clipped = clipLine(
    x0,
    y0,
    x1,
    y1,
    -end,
    -end,
    w - 1 - start,
    h - 1 - start,
  );
  if (!clipped) return cells;
  [x0, y0, x1, y1] = clipped;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    for (
      let y = Math.max(0, y0 + start);
      y <= Math.min(h - 1, y0 + end);
      y += 1
    ) {
      for (
        let x = Math.max(0, x0 + start);
        x <= Math.min(w - 1, x0 + end);
        x += 1
      ) {
        cells[y * w + x] = color;
        if (mirror) cells[y * w + w - 1 - x] = color;
      }
    }
    if (x0 === x1 && y0 === y1) break;
    const doubleError = error * 2;
    if (doubleError >= dy) {
      error += dy;
      x0 += sx;
    }
    if (doubleError <= dx) {
      error += dx;
      y0 += sy;
    }
  }
  return cells;
}

export function floodFill(cells, w, h, x, y, color) {
  pixelArray(cells, w, h);
  pixelValue(color);
  x = coordinate(x);
  y = coordinate(y);
  if (x < 0 || x >= w || y < 0 || y >= h) return cells;
  const target = cells[y * w + x];
  if (target === color) return cells;
  const stack = [y * w + x];
  cells[stack[0]] = color;
  function visit(index) {
    if (cells[index] === target) {
      cells[index] = color;
      stack.push(index);
    }
  }
  while (stack.length) {
    const index = stack.pop();
    const column = index % w;
    if (column > 0) visit(index - 1);
    if (column + 1 < w) visit(index + 1);
    if (index >= w) visit(index - w);
    if (index + w < cells.length) visit(index + w);
  }
  return cells;
}

export function drawShape(cells, w, h, x0, y0, x1, y1, color, kind) {
  if (kind === "line") return paintLine(cells, w, h, x0, y0, x1, y1, color);
  if (kind !== "rect") fail("不支持的绘图形状。");
  paintLine(cells, w, h, x0, y0, x1, y0, color);
  paintLine(cells, w, h, x1, y0, x1, y1, color);
  paintLine(cells, w, h, x1, y1, x0, y1, color);
  paintLine(cells, w, h, x0, y1, x0, y0, color);
  return cells;
}

export function flipPixels(cells, w, h, axis) {
  pixelArray(cells, w, h);
  if (axis !== "x" && axis !== "y") fail("翻转方向必须是 x 或 y。");
  const output = new Array(cells.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const sourceX = axis === "x" ? w - 1 - x : x;
      const sourceY = axis === "y" ? h - 1 - y : y;
      output[y * w + x] = cells[sourceY * w + sourceX];
    }
  }
  return output;
}

export function movePixels(cells, w, h, dx, dy, selection = null) {
  pixelArray(cells, w, h);
  integer(
    dx,
    -Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    "横向移动距离",
  );
  integer(
    dy,
    -Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    "纵向移动距离",
  );
  const bounds = selection ?? { x: 0, y: 0, w, h };
  if (!bounds || typeof bounds !== "object") fail("选区格式不正确。");
  integer(
    bounds.x,
    -Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    "选区横坐标",
  );
  integer(
    bounds.y,
    -Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    "选区纵坐标",
  );
  integer(bounds.w, 1, Number.MAX_SAFE_INTEGER, "选区宽度");
  integer(bounds.h, 1, Number.MAX_SAFE_INTEGER, "选区高度");
  const left = Math.max(0, bounds.x);
  const top = Math.max(0, bounds.y);
  const right = Math.min(w, bounds.x + bounds.w);
  const bottom = Math.min(h, bounds.y + bounds.h);
  const output = cells.slice();
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) output[y * w + x] = 0;
  }
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const targetX = x + dx;
      const targetY = y + dy;
      const color = cells[y * w + x];
      if (
        color !== 0 &&
        targetX >= 0 &&
        targetX < w &&
        targetY >= 0 &&
        targetY < h
      ) {
        output[targetY * w + targetX] = color;
      }
    }
  }
  return output;
}

export function resizeProject(project, w, h) {
  dimensions(w, h);
  const count = project.clips.reduce(
    (total, clip) => total + clip.frames.length,
    0,
  );
  budget(w, h, project.layers.length, count);
  const result = cloneProject(project);
  const offsetX = Math.floor((w - project.width) / 2);
  const offsetY = Math.floor((h - project.height) / 2);
  for (const clip of result.clips) {
    for (const frame of clip.frames) {
      frame.cells = frame.cells.map((cells) => {
        const output = Array(w * h).fill(0);
        for (let y = 0; y < project.height; y += 1) {
          const targetY = y + offsetY;
          if (targetY < 0 || targetY >= h) continue;
          for (let x = 0; x < project.width; x += 1) {
            const targetX = x + offsetX;
            if (targetX >= 0 && targetX < w)
              output[targetY * w + targetX] = cells[y * project.width + x];
          }
        }
        return output;
      });
    }
  }
  result.width = w;
  result.height = h;
  return result;
}

function estimatedBytes(project) {
  // Ordinary JS number arrays need about 8 bytes per slot, not the packed-file 4.
  // Add conservative allowances for array/object headers and UTF-16 strings.
  const stringBytes = (text) => text.length * 2 + 32;
  let bytes = 256 + stringBytes(project.name);
  for (const layer of project.layers)
    bytes += 128 + stringBytes(layer.id) + stringBytes(layer.name);
  for (const clip of project.clips) {
    bytes += 128 + stringBytes(clip.id) + stringBytes(clip.name);
    for (const frame of clip.frames) {
      bytes += 160 + stringBytes(frame.id);
      for (const cells of frame.cells) bytes += 64 + cells.length * 8;
    }
  }
  return bytes;
}

export function createHistory(limit = 40, byteLimit = 32 * 1024 * 1024) {
  integer(limit, 0, Number.MAX_SAFE_INTEGER, "历史记录数量");
  integer(byteLimit, 0, Number.MAX_SAFE_INTEGER, "历史记录内存上限");
  const past = [];
  const future = [];
  let bytes = 0;
  function removeFirst(stack) {
    bytes -= stack.shift().bytes;
  }
  function discard(stack) {
    for (const entry of stack) bytes -= entry.bytes;
    stack.length = 0;
  }
  function trim() {
    while (past.length + future.length > limit || bytes > byteLimit) {
      if (past.length) removeFirst(past);
      else if (future.length) removeFirst(future);
      else break;
    }
  }
  function save(stack, project) {
    const size = estimatedBytes(project);
    if (limit === 0 || size > byteLimit) return false;
    stack.push({ project: cloneProject(project), bytes: size });
    bytes += size;
    return true;
  }
  function travel(source, destination, current) {
    if (!source.length) return null;
    const target = source.pop();
    bytes -= target.bytes;
    if (!save(destination, current)) discard(destination);
    trim();
    // The popped snapshot is no longer retained; the caller may edit it freely.
    return target.project;
  }
  return {
    push(project) {
      discard(future);
      if (!save(past, project)) discard(past);
      trim();
    },
    undo(current) {
      return travel(past, future, current);
    },
    redo(current) {
      return travel(future, past, current);
    },
    clear() {
      past.length = 0;
      future.length = 0;
      bytes = 0;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
  };
}
