import { validateProject, compositeFrame, uid } from "./core.js";
import { zipSync, strToU8, unzlibSync, zlibSync } from "./vendor/fflate.js";

const MAX_PROJECT_BYTES = 32 * 1024 * 1024;
const MAX_PNG_BYTES = 16 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 2_097_152;
const MAX_EXPORT_PIXELS = 16_777_216;
const MAX_EDGE = 8192;
const DB_NAME = "spritelab-local-v1";
const STORE_NAME = "projects";
let storageTail = Promise.resolve();
const canvasSources = new WeakMap();

function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label}必须是 ${min}–${max} 之间的整数。`);
  }
  return value;
}

function readableFile(file, maxBytes, label) {
  if (
    !file ||
    typeof file.arrayBuffer !== "function" ||
    typeof file.size !== "number"
  ) {
    throw new Error(`请选择${label}文件。`);
  }
  if (file.size === 0) throw new Error(`${label}文件为空。`);
  if (file.size > maxBytes)
    throw new Error(`${label}文件不能超过 ${maxBytes / 1024 / 1024} MB。`);
}

export function projectBlob(project) {
  const normalized = validateProject(project);
  return new Blob([JSON.stringify(normalized)], {
    type: "application/json;charset=utf-8",
  });
}

export async function readProjectFile(file) {
  readableFile(file, MAX_PROJECT_BYTES, "SpriteLab 项目");
  const bytes = await file.arrayBuffer();
  let value;
  try {
    const text = new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/, "");
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(
      "项目文件不是有效的 UTF-8 JSON，请选择 SpriteLab 导出的项目。",
      { cause: error },
    );
  }
  return validateProject(value);
}

// Check the dimensions before decoding, so a tiny compressed file cannot allocate
// an arbitrarily large canvas. PNG validity beyond this header is checked by the decoder.
export function inspectPNG(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 33)
    throw new Error("PNG 文件不完整。");
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value))
    throw new Error("只支持真正的 PNG 文件。");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(8) !== 13 ||
    String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR"
  ) {
    throw new Error("PNG 文件缺少有效的图像头。");
  }
  const width = integer(view.getUint32(16), 1, MAX_EDGE, "PNG 宽度");
  const height = integer(view.getUint32(20), 1, MAX_EDGE, "PNG 高度");
  if (width * height > MAX_SOURCE_PIXELS)
    throw new Error("PNG 总像素不能超过 2,097,152。");
  let offset = 8;
  let ended = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    if (length > bytes.length - offset - 12)
      throw new Error("PNG 数据块不完整。");
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === "acTL")
      throw new Error("暂不支持 APNG 动画，请导入规则 PNG 精灵图或单帧 PNG。");
    offset += length + 12;
    if (type === "IEND") {
      if (length !== 0 || offset !== bytes.length)
        throw new Error("PNG 结束数据块不正确。");
      ended = true;
      break;
    }
  }
  if (!ended) throw new Error("PNG 文件缺少结束数据块。");
  return { width, height };
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concatenate(parts) {
  const bytes = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  );
  let position = 0;
  for (const part of parts) {
    bytes.set(part, position);
    position += part.length;
  }
  return bytes;
}

function paeth(a, b, c) {
  const prediction = a + b - c;
  const da = Math.abs(prediction - a),
    db = Math.abs(prediction - b),
    dc = Math.abs(prediction - c);
  return da <= db && da <= dc ? a : db <= dc ? b : c;
}

// Decode PNG samples without the browser canvas's premultiplied-alpha round trip.
// Supports grayscale/RGB/indexed/grayscale-alpha/RGBA, legal bit depths, and Adam7.
// Format reference: https://www.w3.org/TR/png-3/ (filtering, scanlines, Adam7).
export function decodePNGPixels(bytes) {
  const { width, height } = inspectPNG(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const depth = bytes[24],
    colorType = bytes[25],
    interlace = bytes[28];
  const allowed = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  };
  if (
    !allowed[colorType]?.includes(depth) ||
    bytes[26] !== 0 ||
    bytes[27] !== 0 ||
    interlace > 1
  ) {
    throw new Error("PNG 的颜色类型、位深或压缩方式不受支持。");
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const idat = [];
  let palette, transparency;
  let dataEnded = false;
  for (let offset = 8; offset < bytes.length;) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (
      crc32(bytes.subarray(offset + 4, offset + 8 + length)) !==
      view.getUint32(offset + 8 + length)
    ) {
      throw new Error("PNG 校验失败，文件可能已损坏。");
    }
    if (idat.length && type !== "IDAT") dataEnded = true;
    if (type === "IHDR" && offset !== 8)
      throw new Error("PNG 包含重复图像头。");
    if (type === "IDAT") {
      if (dataEnded) throw new Error("PNG 像素数据块顺序不正确。");
      idat.push(data);
    } else if (type === "PLTE") {
      if (palette || idat.length || colorType === 0 || colorType === 4)
        throw new Error("PNG 调色板顺序或类型不正确。");
      palette = data;
    } else if (type === "tRNS") {
      if (transparency || idat.length || (colorType === 3 && !palette))
        throw new Error("PNG 透明通道顺序不正确。");
      transparency = data;
    } else if (
      type !== "IHDR" &&
      type !== "IEND" &&
      (bytes[offset + 4] & 32) === 0
    ) {
      throw new Error(`PNG 包含不支持的数据块：${type}。`);
    }
    offset += length + 12;
  }
  if (!idat.length) throw new Error("PNG 缺少像素数据。");
  if (
    colorType === 3 &&
    (!palette || !palette.length || palette.length % 3 || palette.length > 768)
  ) {
    throw new Error("PNG 调色板无效。");
  }
  if (
    transparency &&
    ((colorType === 0 && transparency.length !== 2) ||
      (colorType === 2 && transparency.length !== 6) ||
      (colorType === 3 && transparency.length > palette.length / 3) ||
      colorType === 4 ||
      colorType === 6)
  ) {
    throw new Error("PNG 透明通道无效。");
  }
  const steps = interlace
    ? [
        [0, 0, 8, 8],
        [4, 0, 8, 8],
        [0, 4, 4, 8],
        [2, 0, 4, 4],
        [0, 2, 2, 4],
        [1, 0, 2, 2],
        [0, 1, 1, 2],
      ]
    : [[0, 0, 1, 1]];
  const passes = steps
    .map(([x, y, dx, dy]) => ({
      x,
      y,
      dx,
      dy,
      w: Math.max(0, Math.ceil((width - x) / dx)),
      h: Math.max(0, Math.ceil((height - y) / dy)),
    }))
    .filter((pass) => pass.w && pass.h);
  const expectedLength = passes.reduce(
    (sum, pass) =>
      sum + (Math.ceil((pass.w * channels * depth) / 8) + 1) * pass.h,
    0,
  );
  let inflated;
  const compressed = concatenate(idat);
  try {
    // The extra byte makes overlong streams detectable without unbounded allocation.
    inflated = unzlibSync(compressed, {
      out: new Uint8Array(expectedLength + 1),
    });
  } catch (error) {
    throw new Error("PNG 像素数据解压失败。", { cause: error });
  }
  if (inflated.length !== expectedLength)
    throw new Error("PNG 像素数据长度不正确。");
  let a = 1,
    b = 0;
  for (let offset = 0; offset < inflated.length; offset += 5552) {
    for (let i = offset; i < Math.min(offset + 5552, inflated.length); i += 1) {
      a += inflated[i];
      b += a;
    }
    a %= 65521;
    b %= 65521;
  }
  if (
    compressed.length < 6 ||
    ((b << 16) | a) >>> 0 !==
      new DataView(compressed.buffer).getUint32(compressed.length - 4)
  ) {
    throw new Error("PNG 解压数据校验失败。");
  }
  const pixels = new Array(width * height).fill(0);
  const bytesPerPixel = Math.max(1, Math.ceil((channels * depth) / 8));
  const toByte = (value) =>
    depth === 16 ? value >>> 8 : Math.round((value * 255) / ((1 << depth) - 1));
  const transparent = transparency
    ? new DataView(
        transparency.buffer,
        transparency.byteOffset,
        transparency.byteLength,
      )
    : null;
  let cursor = 0;
  for (const pass of passes) {
    const rowLength = Math.ceil((pass.w * channels * depth) / 8);
    let previous = new Uint8Array(rowLength);
    for (let y = 0; y < pass.h; y += 1) {
      const filter = inflated[cursor++];
      if (filter > 4) throw new Error("PNG 行滤波类型无效。");
      const row = new Uint8Array(rowLength);
      for (let i = 0; i < rowLength; i += 1) {
        const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
        const above = previous[i];
        const corner = i >= bytesPerPixel ? previous[i - bytesPerPixel] : 0;
        const prediction =
          filter === 0
            ? 0
            : filter === 1
              ? left
              : filter === 2
                ? above
                : filter === 3
                  ? Math.floor((left + above) / 2)
                  : paeth(left, above, corner);
        row[i] = (inflated[cursor++] + prediction) & 255;
      }
      const sample = (index) =>
        depth === 16
          ? (row[index * 2] << 8) | row[index * 2 + 1]
          : depth === 8
            ? row[index]
            : (row[Math.floor((index * depth) / 8)] >>>
                (8 - depth - ((index * depth) % 8))) &
              ((1 << depth) - 1);
      for (let x = 0; x < pass.w; x += 1) {
        const index = x * channels;
        let r,
          g,
          blue,
          alpha = 255;
        if (colorType === 3) {
          const color = sample(index);
          if (color * 3 >= palette.length)
            throw new Error("PNG 像素引用了不存在的调色板颜色。");
          r = palette[color * 3];
          g = palette[color * 3 + 1];
          blue = palette[color * 3 + 2];
          alpha = transparency?.[color] ?? 255;
        } else if (colorType === 0 || colorType === 4) {
          const gray = sample(index);
          r = g = blue = toByte(gray);
          if (colorType === 4) alpha = toByte(sample(index + 1));
          else if (transparent && gray === transparent.getUint16(0)) alpha = 0;
        } else {
          const red = sample(index),
            green = sample(index + 1),
            blueSample = sample(index + 2);
          r = toByte(red);
          g = toByte(green);
          blue = toByte(blueSample);
          if (colorType === 6) alpha = toByte(sample(index + 3));
          else if (
            transparent &&
            red === transparent.getUint16(0) &&
            green === transparent.getUint16(2) &&
            blueSample === transparent.getUint16(4)
          )
            alpha = 0;
        }
        pixels[(pass.y + y * pass.dy) * width + pass.x + x * pass.dx] =
          alpha === 0 ? 0 : ((r << 24) | (g << 16) | (blue << 8) | alpha) >>> 0;
      }
      previous = row;
    }
  }
  return { width, height, pixels };
}

function pngChunk(type, data) {
  const bytes = new Uint8Array(data.length + 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  bytes.set(
    [...type].map((letter) => letter.charCodeAt(0)),
    4,
  );
  bytes.set(data, 8);
  view.setUint32(data.length + 8, crc32(bytes.subarray(4, data.length + 8)));
  return bytes;
}

export function encodePNG(width, height, pixels) {
  integer(width, 1, MAX_EDGE, "PNG 宽度");
  integer(height, 1, MAX_EDGE, "PNG 高度");
  if (width * height > MAX_EXPORT_PIXELS || pixels?.length !== width * height)
    throw new Error("PNG 导出像素数量不正确或超过限制。");
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = integer(pixels[y * width + x], 0, 0xffffffff, "RGBA 像素");
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      raw[offset] = pixel >>> 24;
      raw[offset + 1] = (pixel >>> 16) & 255;
      raw[offset + 2] = (pixel >>> 8) & 255;
      raw[offset + 3] = pixel & 255;
    }
  }
  const header = new Uint8Array(13);
  new DataView(header.buffer).setUint32(0, width);
  new DataView(header.buffer).setUint32(4, height);
  header[8] = 8;
  header[9] = 6;
  return new Blob(
    [
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk("IHDR", header),
      pngChunk("IDAT", zlibSync(raw, { level: 6 })),
      pngChunk("IEND", new Uint8Array(0)),
    ],
    { type: "image/png" },
  );
}

function canvas2D(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前浏览器无法创建绘图画布。");
  context.imageSmoothingEnabled = false;
  return { canvas, context };
}

export async function loadPNG(file) {
  readableFile(file, MAX_PNG_BYTES, "PNG");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return decodePNGPixels(bytes);
}

export function projectFromSheet(image, options = {}) {
  if (!image || !Array.isArray(image.pixels)) throw new Error("图片数据无效。");
  const imageWidth = integer(image.width, 1, MAX_EDGE, "图片宽度");
  const imageHeight = integer(image.height, 1, MAX_EDGE, "图片高度");
  if (
    imageWidth * imageHeight > MAX_SOURCE_PIXELS ||
    image.pixels.length !== imageWidth * imageHeight
  ) {
    throw new Error("图片像素数量与尺寸不一致或超过限制。");
  }
  for (const pixel of image.pixels) integer(pixel, 0, 0xffffffff, "RGBA 像素");
  const frameWidth = integer(options.frameWidth, 1, 128, "每帧宽度");
  const frameHeight = integer(options.frameHeight, 1, 128, "每帧高度");
  const columns = integer(options.columns, 1, 64, "列数");
  const rows = integer(options.rows, 1, 64, "行数");
  if (columns * rows > 64) throw new Error("单个动作最多导入 64 帧。");
  if (
    frameWidth * columns !== imageWidth ||
    frameHeight * rows !== imageHeight
  ) {
    throw new Error(
      "切帧网格必须完整覆盖图片：每帧尺寸 × 行列数应与图片尺寸完全一致。",
    );
  }
  const duration = integer(options.duration ?? 140, 30, 2000, "帧时长");
  const frames = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const pixels = new Array(frameWidth * frameHeight);
      for (let y = 0; y < frameHeight; y += 1) {
        for (let x = 0; x < frameWidth; x += 1) {
          pixels[y * frameWidth + x] =
            image.pixels[
              (row * frameHeight + y) * imageWidth + column * frameWidth + x
            ];
        }
      }
      frames.push({ id: uid("frame"), duration, cells: [pixels] });
    }
  }
  return validateProject({
    format: "spritelab",
    version: 1,
    name: options.name ?? "导入精灵图",
    width: frameWidth,
    height: frameHeight,
    layers: [{ id: uid("layer"), name: "导入图层", visible: true, opacity: 1 }],
    clips: [{ id: uid("clip"), name: "导入动作", frames }],
  });
}

function renderFrame(project, frame, scale) {
  integer(scale, 1, 8, "导出倍率");
  const pixels = compositeFrame(project, frame);
  const { canvas, context } = canvas2D(project.width, project.height);
  const imageData = context.createImageData(project.width, project.height);
  for (let i = 0; i < pixels.length; i += 1) {
    const pixel = pixels[i];
    const offset = i * 4;
    imageData.data[offset] = pixel >>> 24;
    imageData.data[offset + 1] = (pixel >>> 16) & 255;
    imageData.data[offset + 2] = (pixel >>> 8) & 255;
    imageData.data[offset + 3] = pixel & 255;
  }
  context.putImageData(imageData, 0, 0);
  if (scale === 1) {
    rememberCanvas(canvas, pixels);
    return canvas;
  }
  const scaled = canvas2D(project.width * scale, project.height * scale);
  scaled.context.drawImage(
    canvas,
    0,
    0,
    scaled.canvas.width,
    scaled.canvas.height,
  );
  const scaledPixels = new Uint32Array(
    scaled.canvas.width * scaled.canvas.height,
  );
  for (let y = 0; y < scaled.canvas.height; y += 1) {
    for (let x = 0; x < scaled.canvas.width; x += 1) {
      scaledPixels[y * scaled.canvas.width + x] =
        pixels[Math.floor(y / scale) * project.width + Math.floor(x / scale)];
    }
  }
  rememberCanvas(scaled.canvas, scaledPixels);
  canvas.width = 0;
  canvas.height = 0;
  return scaled.canvas;
}

function rememberCanvas(canvas, pixels) {
  canvasSources.set(canvas, {
    width: canvas.width,
    height: canvas.height,
    pixels,
    displayed: canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data,
  });
}

export function frameCanvas(project, frame, scale = 1) {
  const normalized = validateProject({
    ...project,
    clips: [{ id: "render", name: "导出帧", frames: [frame] }],
  });
  return renderFrame(normalized, normalized.clips[0].frames[0], scale);
}

export async function pngBlob(canvas) {
  if (
    !canvas ||
    typeof canvas.toBlob !== "function" ||
    !canvas.width ||
    !canvas.height
  ) {
    throw new Error("导出画布为空或不可用。");
  }
  const source = canvasSources.get(canvas);
  if (
    source &&
    source.width === canvas.width &&
    source.height === canvas.height
  ) {
    const current = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data;
    if (current.every((value, index) => value === source.displayed[index])) {
      return encodePNG(source.width, source.height, source.pixels);
    }
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG 导出失败，可能是浏览器内存不足。"));
    }, "image/png");
  });
}

function clipAt(project, clipIndex) {
  integer(clipIndex, 0, project.clips.length - 1, "动作序号");
  return project.clips[clipIndex];
}

// Pure export planning is intentionally shared with tests; rendering stays browser-only.
export function sheetMetadata(
  project,
  clipIndex,
  { columns = 0, scale = 1 } = {},
) {
  const normalized = validateProject(project);
  const clip = clipAt(normalized, clipIndex);
  integer(scale, 1, 8, "导出倍率");
  integer(columns, 0, 64, "导出列数");
  const cols = columns || Math.ceil(Math.sqrt(clip.frames.length));
  const rows = Math.ceil(clip.frames.length / cols);
  const cellWidth = normalized.width * scale;
  const cellHeight = normalized.height * scale;
  const width = cols * cellWidth;
  const height = rows * cellHeight;
  if (
    width > MAX_EDGE ||
    height > MAX_EDGE ||
    width * height > MAX_EXPORT_PIXELS
  ) {
    throw new Error(
      "导出精灵图过大，请降低倍率或调整列数；最多 16,777,216 像素且单边不超过 8192。",
    );
  }
  return {
    format: "spritelab-sheet",
    version: 1,
    name: normalized.name,
    clip: { id: clip.id, name: clip.name },
    width,
    height,
    frameWidth: normalized.width,
    frameHeight: normalized.height,
    columns: cols,
    rows,
    scale,
    order: "row-major",
    durationUnit: "ms",
    totalDuration: clip.frames.reduce((sum, frame) => sum + frame.duration, 0),
    frames: clip.frames.map((frame, index) => ({
      index,
      id: frame.id,
      duration: frame.duration,
      rect: {
        x: (index % cols) * cellWidth,
        y: Math.floor(index / cols) * cellHeight,
        width: cellWidth,
        height: cellHeight,
      },
    })),
  };
}

export async function sheetExport(project, clipIndex, options = {}) {
  const normalized = validateProject(project);
  const metadata = sheetMetadata(normalized, clipIndex, options);
  const clip = normalized.clips[clipIndex];
  const pixels = new Uint32Array(metadata.width * metadata.height);
  for (let index = 0; index < clip.frames.length; index += 1) {
    const source = compositeFrame(normalized, clip.frames[index]);
    const rect = metadata.frames[index].rect;
    for (let y = 0; y < rect.height; y += 1) {
      for (let x = 0; x < rect.width; x += 1) {
        pixels[(rect.y + y) * metadata.width + rect.x + x] =
          source[
            Math.floor(y / metadata.scale) * normalized.width +
              Math.floor(x / metadata.scale)
          ];
      }
    }
  }
  return { blob: encodePNG(metadata.width, metadata.height, pixels), metadata };
}

export async function framesZip(project, clipIndex) {
  const normalized = validateProject(project);
  const clip = clipAt(normalized, clipIndex);
  const files = {};
  const timing = {
    format: "spritelab-frames",
    version: 1,
    name: normalized.name,
    clip: { id: clip.id, name: clip.name },
    width: normalized.width,
    height: normalized.height,
    durationUnit: "ms",
    totalDuration: 0,
    frames: [],
  };
  for (let index = 0; index < clip.frames.length; index += 1) {
    const frame = clip.frames[index];
    const blob = encodePNG(
      normalized.width,
      normalized.height,
      compositeFrame(normalized, frame),
    );
    const filename = `frame-${String(index + 1).padStart(3, "0")}.png`;
    files[filename] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
    timing.frames.push({
      index,
      id: frame.id,
      file: filename,
      duration: frame.duration,
    });
    timing.totalDuration += frame.duration;
  }
  files["timing.json"] = strToU8(JSON.stringify(timing, null, 2));
  return new Blob([zipSync(files, { level: 0 })], { type: "application/zip" });
}

export function downloadBlob(blob, name) {
  if (!(blob instanceof Blob) || !blob.size)
    throw new Error("没有可以下载的内容。");
  if (typeof name !== "string" || !name.trim())
    throw new Error("下载文件名不能为空。");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-");
  anchor.hidden = true;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Give the browser time to consume the object URL before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function storageError(error) {
  return new Error(
    `本地保存不可用：${error?.message || "浏览器拒绝访问 IndexedDB。请导出项目文件保留作品。"}`,
    { cause: error },
  );
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(storageError());
      return;
    }
    let failed = false;
    let request;
    try {
      request = indexedDB.open(DB_NAME, 1);
    } catch (error) {
      reject(storageError(error));
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME))
        request.result.createObjectStore(STORE_NAME);
    };
    request.onblocked = () => {
      failed = true;
      reject(storageError(new Error("请关闭其他 SpriteLab 标签页后重试。")));
    };
    request.onerror = () => reject(storageError(request.error));
    request.onsuccess = () => {
      if (failed) request.result.close();
      else {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      }
    };
  });
}

function queueStorage(work) {
  // Each caller receives its rejection. A failed operation does not prevent a
  // later retry, and transactions are issued in the order of user edits.
  const task = storageTail.then(work, work);
  storageTail = task;
  return task;
}

async function transaction(mode, work) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => reject(storageError(tx.error));
      work(store, (value) => {
        result = value;
      });
    });
  } finally {
    database.close();
  }
}

export async function saveLocal(project) {
  const normalized = validateProject(project);
  return queueStorage(() =>
    transaction("readwrite", (store) => {
      const previous = store.get("current");
      previous.onsuccess = () => {
        if (previous.result) store.put(previous.result, "previous");
        store.put(
          { savedAt: new Date().toISOString(), project: normalized },
          "current",
        );
      };
    }),
  );
}

export function loadLocal({ previous = false } = {}) {
  return queueStorage(async () => {
    const record = await transaction("readonly", (store, done) => {
      const request = store.get(previous ? "previous" : "current");
      request.onsuccess = () => done(request.result);
    });
    if (record === undefined) return null;
    return validateProject(record.project);
  });
}

export function clearLocal() {
  return queueStorage(() =>
    transaction("readwrite", (store) => {
      store.clear();
    }),
  );
}
