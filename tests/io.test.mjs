import test from "node:test";
import assert from "node:assert/strict";
import {
  projectBlob,
  readProjectFile,
  inspectPNG,
  loadPNG,
  projectFromSheet,
  sheetMetadata,
  encodePNG,
  decodePNGPixels,
  sheetExport,
  framesZip,
} from "../src/io.js";
import { unzipSync, strFromU8 } from "../src/vendor/fflate.js";

function project() {
  return {
    format: "spritelab",
    version: 1,
    name: "森林信使",
    width: 2,
    height: 2,
    layers: [{ id: "layer-1", name: "角色", visible: true, opacity: 1 }],
    clips: [
      {
        id: "clip-1",
        name: "行走",
        frames: [
          {
            id: "frame-1",
            duration: 70,
            cells: [[0xff000080, 0, 0x00ff00ff, 0x12345678]],
          },
          {
            id: "frame-2",
            duration: 200,
            cells: [[0x112233ff, 0xabcdef99, 0, 0xffffffff]],
          },
          { id: "frame-3", duration: 350, cells: [[0, 0, 0, 0]] },
        ],
      },
    ],
  };
}

const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2pVYAAAAASUVORK5CYII=",
    "base64",
  ),
);

test("project JSON round-trip preserves Chinese text, alpha bytes and exact frame timing", async () => {
  const original = project();
  const blob = projectBlob(original);
  assert.match(blob.type, /application\/json/);
  const restored = await readProjectFile(blob);
  assert.deepEqual(restored, original);
  restored.clips[0].frames[0].cells[0][0] = 0;
  assert.equal(original.clips[0].frames[0].cells[0][0], 0xff000080);
});

test("project export validates before creating a file", () => {
  const invalid = project();
  invalid.clips[0].frames[0].cells[0][0] = -1;
  assert.throws(() => projectBlob(invalid));
});

test("project import rejects malformed JSON, non-UTF8 and invalid schemas", async () => {
  await assert.rejects(readProjectFile(new Blob(["{broken"])), /UTF-8 JSON/);
  await assert.rejects(
    readProjectFile(new Blob([new Uint8Array([0xff, 0xfe, 0xff])])),
    /UTF-8 JSON/,
  );
  await assert.rejects(readProjectFile(new Blob(['{"format":"other"}'])));
  const invalid = project();
  invalid.clips[0].frames[0].duration = 29;
  await assert.rejects(readProjectFile(new Blob([JSON.stringify(invalid)])));
});

test("project import accepts a UTF-8 BOM without changing project data", async () => {
  assert.deepEqual(
    await readProjectFile(new Blob(["\uFEFF", JSON.stringify(project())])),
    project(),
  );
});

test("project import checks byte limit and empty input before reading", async () => {
  let read = false;
  await assert.rejects(
    readProjectFile({
      size: 32 * 1024 * 1024 + 1,
      arrayBuffer() {
        read = true;
        throw new Error("must not read");
      },
    }),
    /32 MB/,
  );
  assert.equal(read, false);
  await assert.rejects(readProjectFile(new Blob([])), /为空/);
});

test("PNG preflight reads genuine PNG dimensions and rejects renamed non-PNGs", () => {
  assert.deepEqual(inspectPNG(png), { width: 1, height: 1 });
  const forged = new Uint8Array(png);
  forged[0] = 0xff;
  assert.throws(() => inspectPNG(forged), /真正的 PNG/);
  assert.throws(() => inspectPNG(new Uint8Array(4)), /不完整/);
});

test("PNG preflight rejects extreme dimensions before a browser decoder is used", () => {
  const wide = new Uint8Array(png);
  new DataView(wide.buffer).setUint32(16, 8193);
  assert.throws(() => inspectPNG(wide), /PNG 宽度/);
  const large = new Uint8Array(png);
  new DataView(large.buffer).setUint32(16, 2048);
  new DataView(large.buffer).setUint32(20, 2048);
  assert.throws(() => inspectPNG(large), /总像素/);
});

test("PNG preflight rejects truncated chunks and missing endings", () => {
  assert.throws(
    () => inspectPNG(png.subarray(0, png.length - 3)),
    /结束数据块|不完整/,
  );
  const badLength = new Uint8Array(png);
  new DataView(badLength.buffer).setUint32(33, 0xffffffff);
  assert.throws(() => inspectPNG(badLength), /数据块不完整/);
});

test("PNG preflight explicitly rejects animated PNG instead of silently using one frame", () => {
  const animation = new Uint8Array(png.length + 20);
  animation.set(png.subarray(0, 33), 0);
  new DataView(animation.buffer).setUint32(33, 8);
  animation.set([97, 99, 84, 76], 37); // acTL, rejected before CRC/decode
  animation.set(png.subarray(33), 53);
  assert.throws(() => inspectPNG(animation), /APNG/);
});

test("PNG file import rejects wrong signatures and byte limits without a DOM", async () => {
  await assert.rejects(loadPNG(new Blob(["not a PNG"])), /PNG/);
  await assert.rejects(
    loadPNG({
      size: 16 * 1024 * 1024 + 1,
      arrayBuffer() {
        throw new Error("must not read");
      },
    }),
    /16 MB/,
  );
});

test("regular sheet splitting uses left-to-right then top-to-bottom without scaling", () => {
  const image = {
    width: 4,
    height: 4,
    pixels: Array.from(
      { length: 16 },
      (_, index) => (index * 0x01000000 + 255) >>> 0,
    ),
  };
  const imported = projectFromSheet(image, {
    frameWidth: 2,
    frameHeight: 2,
    columns: 2,
    rows: 2,
    name: "测试",
    duration: 125,
  });
  const expected = [
    [0, 1, 4, 5],
    [2, 3, 6, 7],
    [8, 9, 12, 13],
    [10, 11, 14, 15],
  ];
  expected.forEach((indices, index) =>
    assert.deepEqual(
      imported.clips[0].frames[index].cells[0],
      indices.map((i) => image.pixels[i]),
    ),
  );
  assert.equal(imported.width, 2);
  assert.equal(imported.height, 2);
  assert.deepEqual(
    imported.clips[0].frames.map((frame) => frame.duration),
    [125, 125, 125, 125],
  );
  assert.equal(
    new Set(imported.clips[0].frames.map((frame) => frame.id)).size,
    4,
  );
  imported.clips[0].frames[0].cells[0][0] = 0;
  assert.equal(image.pixels[0], 255);
});

test("rectangular frames preserve packed uint32 RGBA including transparent and partial alpha", () => {
  const pixels = [0, 0xff000080, 0xffffffff, 0x12345678, 0, 0x01020304];
  const imported = projectFromSheet(
    { width: 3, height: 2, pixels },
    { frameWidth: 3, frameHeight: 2, columns: 1, rows: 1 },
  );
  assert.deepEqual(imported.clips[0].frames[0].cells[0], pixels);
  assert.equal(imported.clips[0].frames[0].duration, 140);
});

test("sheet import refuses partial coverage and invalid pixel data", () => {
  const options = { frameWidth: 2, frameHeight: 1, columns: 1, rows: 1 };
  assert.throws(
    () => projectFromSheet({ width: 3, height: 1, pixels: [0, 0, 0] }, options),
    /完整覆盖/,
  );
  assert.throws(
    () => projectFromSheet({ width: 2, height: 1, pixels: [0] }, options),
    /像素数量/,
  );
  for (const pixel of [-1, 1.5, 0x100000000, NaN, "255"]) {
    assert.throws(
      () =>
        projectFromSheet({ width: 2, height: 1, pixels: [0, pixel] }, options),
      /RGBA/,
    );
  }
});

test("sheet import refuses more than 64 frames, oversize frames and invalid durations", () => {
  assert.throws(
    () =>
      projectFromSheet(
        { width: 8, height: 9, pixels: new Array(72).fill(0) },
        { frameWidth: 1, frameHeight: 1, columns: 8, rows: 9 },
      ),
    /64 帧/,
  );
  assert.throws(
    () =>
      projectFromSheet(
        { width: 129, height: 1, pixels: new Array(129).fill(0) },
        { frameWidth: 129, frameHeight: 1, columns: 1, rows: 1 },
      ),
    /每帧宽度/,
  );
  assert.throws(
    () =>
      projectFromSheet(
        { width: 1, height: 1, pixels: [0] },
        { frameWidth: 1, frameHeight: 1, columns: 1, rows: 1, duration: 2001 },
      ),
    /帧时长/,
  );
});

test("sheet metadata records scaled rectangles and exact per-frame timings", () => {
  const metadata = sheetMetadata(project(), 0, { columns: 2, scale: 3 });
  assert.equal(metadata.width, 12);
  assert.equal(metadata.height, 12);
  assert.equal(metadata.scale, 3);
  assert.equal(metadata.durationUnit, "ms");
  assert.equal(metadata.totalDuration, 620);
  assert.deepEqual(
    metadata.frames.map(({ duration }) => duration),
    [70, 200, 350],
  );
  assert.deepEqual(
    metadata.frames.map(({ rect }) => rect),
    [
      { x: 0, y: 0, width: 6, height: 6 },
      { x: 6, y: 0, width: 6, height: 6 },
      { x: 0, y: 6, width: 6, height: 6 },
    ],
  );
});

test("sheet auto layout is square-ish and requested spare columns remain represented", () => {
  assert.equal(sheetMetadata(project(), 0).columns, 2);
  const wide = sheetMetadata(project(), 0, { columns: 5 });
  assert.equal(wide.rows, 1);
  assert.equal(wide.width, 10);
  assert.equal(wide.frames.length, 3);
});

test("sheet export planning rejects invalid choices and oversized output before rendering", () => {
  for (const scale of [0, 1.5, 9, "2"])
    assert.throws(() => sheetMetadata(project(), 0, { scale }), /导出倍率/);
  for (const columns of [-1, 1.5, 65])
    assert.throws(() => sheetMetadata(project(), 0, { columns }), /导出列数/);
  assert.throws(() => sheetMetadata(project(), 1), /动作序号/);
  const large = project();
  large.width = 128;
  large.height = 128;
  large.clips[0].frames.forEach((frame) => {
    frame.cells = [new Array(128 * 128).fill(0)];
  });
  assert.throws(
    () => sheetMetadata(large, 0, { columns: 64, scale: 8 }),
    /导出精灵图过大/,
  );
});

test("PNG encoding and decoding preserve very low alpha RGB values exactly", async () => {
  const pixels = [
    0x11559901, 0x1f3f7f02, 0x0c223811, 0xcb5b0b7f, 0, 0xffffffff,
  ];
  const encoded = encodePNG(3, 2, pixels);
  const decoded = await loadPNG(encoded);
  assert.deepEqual(decoded, { width: 3, height: 2, pixels });
});

test("PNG decoder rejects CRC corruption instead of accepting damaged pixels", async () => {
  const bytes = new Uint8Array(
    await encodePNG(1, 1, [0xffffffff]).arrayBuffer(),
  );
  bytes[bytes.length - 15] ^= 1;
  assert.throws(() => decodePNGPixels(bytes), /校验失败/);
});

test("PNG encoder enforces uint32 pixel data and full dimensions", () => {
  assert.throws(() => encodePNG(2, 1, [0]), /像素数量/);
  assert.throws(() => encodePNG(1, 1, [-1]), /RGBA/);
});

test("sheet export writes exact RGBA pixels and transparent unused grid cells", async () => {
  const input = project();
  input.clips[0].frames[0].cells[0][0] = 0x11559901;
  const { blob, metadata } = await sheetExport(input, 0, {
    columns: 2,
    scale: 2,
  });
  const decoded = await loadPNG(blob);
  assert.equal(decoded.width, 8);
  assert.equal(decoded.height, 8);
  assert.equal(decoded.pixels[0], 0x11559901);
  assert.equal(decoded.pixels[1], 0x11559901);
  assert.equal(decoded.pixels[8], 0x11559901);
  for (let y = 4; y < 8; y += 1)
    for (let x = 4; x < 8; x += 1) assert.equal(decoded.pixels[y * 8 + x], 0);
  assert.equal(metadata.totalDuration, 620);
});

test("ZIP contains every frame with independently decodable PNG and exact timing", async () => {
  const input = project();
  const blob = await framesZip(input, 0);
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  assert.deepEqual(Object.keys(files).sort(), [
    "frame-001.png",
    "frame-002.png",
    "frame-003.png",
    "timing.json",
  ]);
  const timing = JSON.parse(strFromU8(files["timing.json"]));
  assert.deepEqual(
    timing.frames.map((frame) => frame.duration),
    [70, 200, 350],
  );
  assert.equal(timing.totalDuration, 620);
  assert.equal(timing.name, "森林信使");
  for (let i = 0; i < 3; i += 1) {
    const pngFrame = await loadPNG(new Blob([files[timing.frames[i].file]]));
    assert.deepEqual(pngFrame.pixels, input.clips[0].frames[i].cells[0]);
  }
});

// Actual canvas behavior, browser downloads and IndexedDB persistence are covered
// by the real-browser acceptance run, not by fake Canvas/IndexedDB objects.
