import test from "node:test";
import assert from "node:assert/strict";
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
} from "../src/core.js";

const RED = 0xff0000ff;
const GREEN = 0x00ff00ff;
const BLUE = 0x0000ffff;
const white = 0xffffffff;
const frame = (project) => project.clips[0].frames[0];
const pixels = (project) => frame(project).cells[0];

function layer(project, color, opacity = 1, visible = true) {
  project.layers.push({ id: uid("layer"), name: "叠加层", opacity, visible });
  for (const clip of project.clips) {
    for (const item of clip.frames)
      item.cells.push(Array(project.width * project.height).fill(color));
  }
}

function chineseError(action) {
  assert.throws(
    action,
    (error) => error instanceof Error && /[\u4e00-\u9fff]/u.test(error.message),
  );
}

test("颜色使用无符号 RRGGBBAA，转换保留每个通道", () => {
  assert.equal(hexToPixel("#FF0080"), 0xff0080ff);
  assert.equal(hexToPixel("#ffffff"), 4294967295);
  assert.equal(hexToPixel("#000000"), 255);
  assert.equal(pixelToHex(0x12ab3400), "#12ab34");
  assert.deepEqual(rgba(0x12ab3480), [18, 171, 52, 128]);
  assert.deepEqual(rgba(0), [0, 0, 0, 0]);
  for (const hex of ["fff", "#fff", "#ffffff80", "#gg0000", null, 123])
    chineseError(() => hexToPixel(hex));
  for (const invalid of [-1, 2 ** 32, 1.2, NaN, Infinity, "255"]) {
    chineseError(() => rgba(invalid));
    chineseError(() => pixelToHex(invalid));
  }
});

test("新作品拥有独立像素、中文名称、可序列化数据和唯一标识", () => {
  const a = createProject();
  const b = createProject(16, 32, "角色甲");
  assert.equal(a.width, 32);
  assert.equal(a.height, 32);
  assert.equal(a.name, "未命名作品");
  assert.equal(pixels(a).length, 1024);
  assert.equal(pixels(b).length, 512);
  assert.ok(pixels(a).every((value) => value === 0));
  assert.notEqual(a.layers[0].id, b.layers[0].id);
  assert.equal(
    new Set(Array.from({ length: 500 }, () => uid("frame"))).size,
    500,
  );
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(a))), a);
  chineseError(() => createProject(0, 32));
  chineseError(() => createProject(129, 32));
});

test("项目深复制不会跨图层、动作或帧泄漏修改", () => {
  const source = createProject(2, 1);
  layer(source, BLUE);
  source.clips.push({
    id: uid("clip"),
    name: "走路",
    frames: [
      {
        id: uid("frame"),
        duration: 30,
        cells: [
          [RED, 0],
          [0, GREEN],
        ],
      },
    ],
  });
  const copy = cloneProject(source);
  copy.layers[0].name = "改变";
  copy.clips[1].frames[0].cells[0][0] = white;
  copy.clips[0].frames[0].duration = 200;
  assert.notEqual(source.layers[0].name, "改变");
  assert.equal(source.clips[1].frames[0].cells[0][0], RED);
  assert.equal(frame(source).duration, 140);
});

test("叠加采用正确 straight-alpha 输出，并只在最终量化", () => {
  const project = createProject(1, 1);
  pixels(project)[0] = 0xff000080;
  assert.deepEqual(
    rgba(compositeFrame(project, frame(project))[0]),
    [255, 0, 0, 128],
  );
  layer(project, 0x0000ff80);
  assert.deepEqual(
    rgba(compositeFrame(project, frame(project))[0]),
    [85, 0, 170, 192],
  );
  assert.equal(pixels(project)[0], 0xff000080);
});

test("叠加应用图层顺序、可见性和独立 opacity，不混入透明 RGB", () => {
  const project = createProject(1, 1);
  pixels(project)[0] = BLUE;
  layer(project, 0xff000080, 0.5);
  layer(project, GREEN, 1, false);
  layer(project, white, 0);
  assert.deepEqual(
    rgba(compositeFrame(project, frame(project))[0]),
    [64, 0, 191, 255],
  );
  project.layers[1].visible = false;
  assert.equal(compositeFrame(project, frame(project))[0], BLUE);
  project.layers.forEach((entry) => {
    entry.visible = false;
  });
  assert.deepEqual(compositeFrame(project, frame(project)), [0]);
  project.layers[0].visible = true;
  pixels(project)[0] = 0xffffff00;
  assert.deepEqual(compositeFrame(project, frame(project)), [0]);
});

test("笔划在八个方向连续且包含端点，拖得很快也不漏点", () => {
  for (const [endX, endY] of [
    [8, 5],
    [5, 8],
    [3, 8],
    [0, 5],
    [0, 3],
    [3, 0],
    [5, 0],
    [8, 3],
  ]) {
    const cells = Array(81).fill(0);
    paintLine(cells, 9, 9, 4, 4, endX, endY, RED);
    assert.equal(cells[4 * 9 + 4], RED);
    assert.equal(cells[endY * 9 + endX], RED);
    assert.equal(cells.filter(Boolean).length, 5);
    const remaining = new Set(
      cells.flatMap((color, index) => (color ? [index] : [])),
    );
    const pending = [4 * 9 + 4];
    remaining.delete(pending[0]);
    while (pending.length) {
      const index = pending.pop();
      for (const other of [...remaining]) {
        if (
          Math.abs((index % 9) - (other % 9)) <= 1 &&
          Math.abs(Math.floor(index / 9) - Math.floor(other / 9)) <= 1
        ) {
          remaining.delete(other);
          pending.push(other);
        }
      }
    }
    assert.equal(remaining.size, 0);
  }
});

test("极长画布外线段先裁剪，不生成越界属性", { timeout: 1000 }, () => {
  const cells = Array(64).fill(0);
  paintLine(
    cells,
    8,
    8,
    -1_000_000_000,
    -1_000_000_000,
    1_000_000_000,
    1_000_000_000,
    RED,
  );
  assert.deepEqual(
    cells.flatMap((value, index) => (value ? [index] : [])),
    [0, 9, 18, 27, 36, 45, 54, 63],
  );
  paintLine(cells, 8, 8, 1_000_000_000, 3, -1_000_000_000, 3, GREEN);
  assert.deepEqual(cells.slice(24, 32), Array(8).fill(GREEN));
  const before = cells.slice();
  paintLine(cells, 8, 8, -1_000_000, 20, 1_000_000, 20, BLUE);
  assert.deepEqual(cells, before);
  assert.equal(Object.keys(cells).length, 64);
});

test("边缘粗笔刷与镜像对称、擦除不会扩大数组", () => {
  const cells = Array(25).fill(0);
  paintLine(cells, 5, 5, 0, 0, 0, 0, RED, 3, true);
  assert.deepEqual(cells.slice(0, 5), [RED, RED, 0, RED, RED]);
  assert.deepEqual(cells.slice(5, 10), [RED, RED, 0, RED, RED]);
  assert.equal(cells.filter(Boolean).length, 8);
  paintLine(cells, 5, 5, 0, 0, 0, 0, 0, 3, true);
  assert.ok(cells.every((value) => value === 0));
  assert.equal(cells.length, 25);
  chineseError(() => paintLine(cells, 5, 5, NaN, 0, 1, 1, RED));
  chineseError(() => paintLine(cells, 5, 5, 0, 0, 1, 1, RED, 0));
});

test("矩形逆向绘制保留空心，油漆桶不穿越边框或斜角", () => {
  const cells = Array(25).fill(0);
  drawShape(cells, 5, 5, 3, 3, 1, 1, RED, "rect");
  assert.equal(cells.filter(Boolean).length, 8);
  floodFill(cells, 5, 5, 2, 2, BLUE);
  assert.equal(cells[12], BLUE);
  assert.equal(cells[0], 0);
  const diagonal = [0, RED, RED, 0];
  floodFill(diagonal, 2, 2, 0, 0, GREEN);
  assert.deepEqual(diagonal, [GREEN, RED, RED, 0]);
  const outside = Array(9).fill(0);
  drawShape(outside, 3, 3, -10, -10, 10, 10, RED, "rect");
  assert.deepEqual(outside, Array(9).fill(0));
});

test("填充支持最大画布，无递归栈溢出，完全匹配 alpha", () => {
  const cells = Array(128 * 128).fill(0);
  floodFill(cells, 128, 128, 0, 0, RED);
  assert.ok(cells.every((value) => value === RED));
  floodFill(cells, 128, 128, 127, 127, RED);
  floodFill(cells, 128, 128, -1, 0, BLUE);
  assert.ok(cells.every((value) => value === RED));
  const alpha = [0xff000080, 0xff000081, 0xff000080];
  floodFill(alpha, 3, 1, 0, 0, BLUE);
  assert.deepEqual(alpha, [BLUE, 0xff000081, 0xff000080]);
});

test("直线形状、单像素画布和矩形退化为线均有效", () => {
  const cells = Array(12).fill(0);
  drawShape(cells, 4, 3, 1, 0, 1, 2, RED, "rect");
  assert.deepEqual(cells, [0, RED, 0, 0, 0, RED, 0, 0, 0, RED, 0, 0]);
  drawShape(cells, 4, 3, 0, 2, 3, 2, BLUE, "line");
  assert.deepEqual(cells.slice(8), Array(4).fill(BLUE));
  const single = [0];
  drawShape(single, 1, 1, 0, 0, 0, 0, white, "rect");
  assert.deepEqual(single, [white]);
  chineseError(() => drawShape(single, 1, 1, 0, 0, 0, 0, RED, "ellipse"));
});

test("横纵翻转适用于矩形且不修改源数组", () => {
  const cells = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(flipPixels(cells, 3, 2, "x"), [3, 2, 1, 6, 5, 4]);
  assert.deepEqual(flipPixels(cells, 3, 2, "y"), [4, 5, 6, 1, 2, 3]);
  assert.deepEqual(flipPixels(flipPixels(cells, 3, 2, "x"), 3, 2, "x"), cells);
  assert.deepEqual(cells, [1, 2, 3, 4, 5, 6]);
  chineseError(() => flipPixels(cells, 3, 2, "z"));
});

test("整图移动按目标裁剪，不会环绕画布", () => {
  const cells = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(movePixels(cells, 3, 2, 1, 0), [0, 1, 2, 0, 4, 5]);
  assert.deepEqual(movePixels(cells, 3, 2, -1, -1), [5, 6, 0, 0, 0, 0]);
  assert.deepEqual(movePixels(cells, 3, 2, 100, 100), Array(6).fill(0));
  assert.deepEqual(movePixels(cells, 3, 2, 0, 0), cells);
  assert.deepEqual(cells, [1, 2, 3, 4, 5, 6]);
});

test("选区移动清空来源、覆盖目标非零像素，重叠不涂抹", () => {
  const cells = [RED, 0, BLUE, GREEN, 0];
  assert.deepEqual(movePixels(cells, 5, 1, 2, 0, { x: 0, y: 0, w: 2, h: 1 }), [
    0,
    0,
    RED,
    GREEN,
    0,
  ]);
  assert.deepEqual(
    movePixels([1, 2, 3, 4], 4, 1, 1, 0, { x: 0, y: 0, w: 3, h: 1 }),
    [0, 1, 2, 3],
  );
  assert.deepEqual(
    movePixels([1, 2, 3, 4], 4, 1, -1, 0, { x: 1, y: 0, w: 3, h: 1 }),
    [2, 3, 4, 0],
  );
  assert.deepEqual(
    movePixels([1, 2, 3], 3, 1, 1, 0, { x: -2, y: 0, w: 4, h: 1 }),
    [0, 1, 2],
  );
  assert.deepEqual(
    movePixels(cells, 5, 1, 1, 0, { x: 20, y: 0, w: 2, h: 1 }),
    cells,
  );
  chineseError(() => movePixels(cells, 5, 1, 0.5, 0));
  chineseError(() => movePixels(cells, 5, 1, 0, 0, { x: 0, y: 0, w: 0, h: 1 }));
});

test("居中改变尺寸保留各帧图层和持续时间，不进行缩放", () => {
  const project = createProject(2, 2, "测试");
  frame(project).cells[0] = [RED, GREEN, BLUE, white];
  layer(project, 0);
  frame(project).cells[1][0] = BLUE;
  project.clips.push({
    id: uid("clip"),
    name: "移动",
    frames: [
      {
        id: uid("frame"),
        duration: 310,
        cells: [
          [1, 2, 3, 4],
          [5, 6, 7, 8],
        ],
      },
    ],
  });
  const original = cloneProject(project);
  const larger = resizeProject(project, 4, 4);
  assert.deepEqual(frame(larger).cells[0], [
    0,
    0,
    0,
    0,
    0,
    RED,
    GREEN,
    0,
    0,
    BLUE,
    white,
    0,
    0,
    0,
    0,
    0,
  ]);
  assert.equal(larger.clips[1].frames[0].duration, 310);
  assert.equal(larger.clips[1].frames[0].cells[1][10], 8);
  assert.deepEqual(resizeProject(larger, 2, 2), original);
  assert.deepEqual(project, original);
  const odd = createProject(3, 3);
  frame(odd).cells[0] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  assert.deepEqual(pixels(resizeProject(odd, 2, 2)), [5, 6, 8, 9]);
});

test("校验接受上限预算并深复制，超过预算在复制像素前拒绝", () => {
  const project = createProject(128, 128);
  for (let i = 0; i < 3; i += 1) layer(project, 0);
  const shared = frame(project).cells;
  project.clips[0].frames = Array.from({ length: 32 }, (_, i) => ({
    id: `f${i}`,
    duration: 30,
    cells: shared,
  }));
  assert.equal(128 * 128 * 4 * 32, LIMITS.maxPixels);
  const normalized = validateProject(project);
  normalized.clips[0].frames[0].cells[0][0] = RED;
  assert.equal(normalized.clips[0].frames[1].cells[0][0], 0);
  assert.equal(shared[0][0], 0);
  project.clips[0].frames.push({ id: "f33", duration: 30, cells: shared });
  assert.throws(() => validateProject(project), /总像素/);
  const small = createProject(32, 32);
  for (let i = 0; i < 3; i += 1) layer(small, 0);
  small.clips[0].frames = Array.from({ length: 33 }, (_, i) => ({
    id: `f${i}`,
    duration: 30,
    cells: frame(small).cells,
  }));
  assert.throws(() => resizeProject(small, 128, 128), /总像素/);
});

test("校验拒绝不合法类型、版本、维度、数量、时长、图层和像素", () => {
  const cases = [
    (p) => {
      p.version = 2;
    },
    (p) => {
      p.format = "other";
    },
    (p) => {
      p.width = "2";
    },
    (p) => {
      p.height = 1.5;
    },
    (p) => {
      p.width = 129;
    },
    (p) => {
      p.height = 0;
    },
    (p) => {
      p.name = "";
    },
    (p) => {
      p.name = "a".repeat(129);
    },
    (p) => {
      p.layers = [];
    },
    (p) => {
      p.clips = [];
    },
    (p) => {
      p.layers = Array(5).fill(p.layers[0]);
    },
    (p) => {
      p.clips = Array(9).fill(p.clips[0]);
    },
    (p) => {
      p.clips[0].frames = [];
    },
    (p) => {
      p.clips[0].frames = Array(65).fill(frame(p));
    },
    (p) => {
      frame(p).duration = 29;
    },
    (p) => {
      frame(p).duration = 2001;
    },
    (p) => {
      frame(p).duration = NaN;
    },
    (p) => {
      frame(p).duration = "140";
    },
    (p) => {
      p.layers[0].visible = 1;
    },
    (p) => {
      p.layers[0].opacity = NaN;
    },
    (p) => {
      p.layers[0].opacity = -1;
    },
    (p) => {
      p.layers[0].opacity = 1.01;
    },
    (p) => {
      frame(p).cells = [];
    },
    (p) => {
      frame(p).cells[0] = [0];
    },
    (p) => {
      frame(p).cells[0] = new Uint32Array(4);
    },
    ...[-1, 4294967296, 0.5, "0", null, undefined, NaN, Infinity, {}].map(
      (value) => (p) => {
        pixels(p)[0] = value;
      },
    ),
  ];
  for (const mutate of cases) {
    const project = createProject(2, 2);
    mutate(project);
    chineseError(() => validateProject(project));
  }
  for (const input of [null, [], 42, "spritelab", new Date()])
    chineseError(() => validateProject(input));
});

test("ID在各自集合内唯一，允许不同动作使用相同局部帧ID", () => {
  const project = createProject(1, 1);
  const secondFrame = { ...frame(project), cells: [[0]] };
  project.clips[0].frames.push(secondFrame);
  assert.throws(() => validateProject(project), /标识重复/);
  project.clips[0].frames.pop();
  project.clips.push({
    id: uid("clip"),
    name: "其他动作",
    frames: [secondFrame],
  });
  assert.equal(validateProject(project).clips.length, 2);
  project.clips[1].id = project.clips[0].id;
  assert.throws(() => validateProject(project), /标识重复/);
  const layers = createProject(1, 1);
  layer(layers, 0);
  layers.layers[1].id = layers.layers[0].id;
  assert.throws(() => validateProject(layers), /标识重复/);
});

test("恶意字段、原型、稀疏数组及访问器被拒绝且不执行", () => {
  const extra = createProject(1, 1);
  extra.script = "globalThis.pwned = true";
  chineseError(() => validateProject(extra));
  const proto = JSON.parse(
    JSON.stringify(createProject(1, 1)).replace(
      '"format":',
      '"__proto__":{"polluted":true},"format":',
    ),
  );
  chineseError(() => validateProject(proto));
  assert.equal({}.polluted, undefined);
  const inherited = Object.assign(
    Object.create({ evil: true }),
    createProject(1, 1),
  );
  chineseError(() => validateProject(inherited));
  let called = 0;
  const getter = createProject(1, 1);
  Object.defineProperty(getter, "name", {
    get() {
      called += 1;
      return "bad";
    },
  });
  chineseError(() => validateProject(getter));
  const pixelGetter = createProject(1, 1);
  Object.defineProperty(pixels(pixelGetter), "0", {
    get() {
      called += 1;
      return 0;
    },
  });
  chineseError(() => validateProject(pixelGetter));
  assert.equal(called, 0);
  const sparse = createProject(1, 1);
  delete pixels(sparse)[0];
  chineseError(() => validateProject(sparse));
  const extraArray = createProject(1, 1);
  pixels(extraArray).evil = true;
  chineseError(() => validateProject(extraArray));
  const textOnly = createProject(1, 1, "<img src=x onerror=alert(1)>");
  assert.equal(validateProject(textOnly).name, textOnly.name);
});

test("撤销重做保存完整状态，返回值及原对象不能篡改内部快照", () => {
  const history = createHistory();
  let current = createProject(1, 1, "初始");
  history.push(current);
  pixels(current)[0] = RED;
  current.name = "红色";
  history.push(current);
  pixels(current)[0] = BLUE;
  current = history.undo(current);
  assert.equal(pixels(current)[0], RED);
  assert.equal(current.name, "红色");
  assert.ok(history.canUndo && history.canRedo);
  current = history.undo(current);
  assert.equal(pixels(current)[0], 0);
  assert.equal(current.name, "初始");
  assert.equal(history.undo(current), null);
  current = history.redo(current);
  assert.equal(pixels(current)[0], RED);
  current = history.redo(current);
  assert.equal(pixels(current)[0], BLUE);
  assert.equal(history.redo(current), null);
  current = history.undo(current);
  history.push(current);
  pixels(current)[0] = GREEN;
  assert.equal(history.canRedo, false);
  assert.equal(pixels(history.undo(current))[0], RED);
  history.clear();
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test("历史条数限制保留最近操作，所有图层和帧均可回退", () => {
  const history = createHistory(2);
  let current = createProject(1, 1);
  for (const color of [RED, GREEN, BLUE]) {
    history.push(current);
    pixels(current)[0] = color;
  }
  current = history.undo(current);
  assert.equal(pixels(current)[0], GREEN);
  current = history.undo(current);
  assert.equal(pixels(current)[0], RED);
  assert.equal(history.undo(current), null);
  current = history.redo(current);
  assert.equal(pixels(current)[0], GREEN);
  const all = createHistory();
  const project = createProject(1, 1);
  all.push(project);
  layer(project, RED);
  project.clips[0].frames.push({
    id: uid("frame"),
    duration: 2000,
    cells: [[BLUE], [GREEN]],
  });
  const previous = all.undo(project);
  assert.equal(previous.layers.length, 1);
  assert.equal(previous.clips[0].frames.length, 1);
  assert.deepEqual(all.redo(previous), project);
});

test("历史内存预算同时约束撤销和重做，超大快照清除不可恢复链", () => {
  const history = createHistory(40, 7000);
  let current = createProject(16, 16);
  for (const color of [RED, GREEN, BLUE]) {
    history.push(current);
    pixels(current)[0] = color;
  }
  let count = 0;
  while (history.canUndo) {
    current = history.undo(current);
    count += 1;
  }
  assert.equal(count, 2);
  count = 0;
  while (history.canRedo) {
    current = history.redo(current);
    count += 1;
  }
  assert.equal(count, 2);
  history.push(createProject(64, 64));
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
  const disabled = createHistory(0, 0);
  disabled.push(current);
  assert.equal(disabled.undo(current), null);
  chineseError(() => createHistory(-1));
  chineseError(() => createHistory(40, NaN));
});
