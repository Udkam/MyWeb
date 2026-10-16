/**
 * Original SpriteLab teaching artwork, drawn specifically for this project.
 * No downloaded sprites or generated images. Palette and all pixel poses are
 * original; released with SpriteLab under its MIT license.
 */
export const TEMPLATE_PROVENANCE =
  "SpriteLab 原创像素练习素材 · 手工设计轮廓与逐帧动作 · MIT";

const W = 32;
const C = (hex) =>
  (Number.parseInt(hex.replace("#", ""), 16) * 256 + 255) >>> 0;
const palette = {
  ink: C("263637"),
  deep: C("274f44"),
  green: C("497a56"),
  sage: C("84ab6f"),
  mint: C("b7d8a1"),
  cream: C("ffe6b2"),
  skin: C("e8b97e"),
  blush: C("ce865d"),
  darkBrown: C("664941"),
  brown: C("a87346"),
  gold: C("efbb65"),
  light: C("fff5d5"),
  cyan: C("a3e4d0"),
  teal: C("52ad9c"),
  tealDark: C("247975"),
  fireDark: C("a33d46"),
  fire: C("e25c3e"),
  orange: C("f89a48"),
  yellow: C("ffd874"),
};
function painter() {
  const pixels = Array(W * W).fill(0);
  const dot = (x, y, color) => {
    if (x >= 0 && x < W && y >= 0 && y < W) pixels[y * W + x] = color;
  };
  const rect = (x, y, w, h, color) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) dot(i, j, color);
  };
  const line = (x0, y0, x1, y1, color) => {
    let dx = Math.abs(x1 - x0),
      sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0),
      sy = y0 < y1 ? 1 : -1,
      err = dx + dy;
    while (true) {
      dot(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e = 2 * err;
      if (e >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  };
  const poly = (points, color) => {
    const minY = Math.max(0, Math.min(...points.map((p) => p[1])));
    const maxY = Math.min(W - 1, Math.max(...points.map((p) => p[1])));
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i],
          [bx, by] = points[(i + 1) % points.length];
        if ((ay <= y && by > y) || (by <= y && ay > y))
          xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2)
        rect(
          Math.ceil(xs[i]),
          y,
          Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1,
          1,
          color,
        );
    }
    points.forEach((p, i) =>
      line(...p, ...points[(i + 1) % points.length], color),
    );
  };
  return { pixels, dot, rect, line, poly };
}

function courier(pose, idle = false) {
  const body = painter(),
    details = painter(),
    p = palette;
  const bob = idle ? pose : pose % 2;
  const r = (x, y, w, h, c) => body.rect(x, y + bob, w, h, c);
  const shape = (points, c) =>
    body.poly(
      points.map(([x, y]) => [x, y + bob]),
      c,
    );
  // Small asymmetric boots make the four contact/passing poses legible.
  const legs = idle
    ? [
        [12, 26, 3, 5],
        [18, 26, 3, 5],
      ]
    : [
        [
          [9, 25, 3, 6],
          [20, 25, 3, 6],
        ],
        [
          [13, 25, 3, 6],
          [18, 24, 3, 4],
        ],
        [
          [20, 25, 3, 6],
          [9, 25, 3, 6],
        ],
        [
          [15, 24, 3, 4],
          [17, 25, 3, 6],
        ],
      ][pose];
  legs.forEach(([x, y, w, h], i) => {
    body.rect(x, y, w, h, p.ink);
    body.rect(x + 1, y, 1, Math.max(1, h - 2), i === 0 ? p.deep : p.green);
    body.rect(x, y + h - 1, 5, 2, p.ink);
    body.rect(x + 1, y + h - 1, 3, 1, p.brown);
  });
  // Cloak and tunic.
  shape(
    [
      [11, 15],
      [18, 15],
      [23, 24],
      [22, 27],
      [9, 27],
      [9, 20],
    ],
    p.ink,
  );
  shape(
    [
      [11, 17],
      [17, 16],
      [21, 24],
      [20, 25],
      [11, 25],
    ],
    p.green,
  );
  r(12, 18, 3, 6, p.sage);
  r(12, 25, 9, 1, p.deep);
  shape(
    [
      [10, 16],
      [7, 21],
      [8, 25],
      [11, 24],
      [13, 17],
    ],
    p.deep,
  );
  r(8, 21, 2, 3, p.green);
  // Head and ear, facing right.
  shape(
    [
      [12, 8],
      [21, 8],
      [23, 11],
      [23, 14],
      [20, 17],
      [13, 16],
      [10, 13],
    ],
    p.ink,
  );
  r(13, 10, 9, 5, p.skin);
  r(15, 10, 7, 3, p.cream);
  r(13, 13, 7, 3, p.skin);
  r(12, 11, 2, 3, p.cream);
  r(20, 11, 1, 2, p.ink);
  r(20, 14, 2, 1, p.blush);
  // The leaf cap has a clear diagonal silhouette and one warm badge.
  shape(
    [
      [8, 8],
      [10, 4],
      [15, 2],
      [19, 3],
      [22, 7],
      [26, 8],
      [26, 10],
      [12, 10],
    ],
    p.ink,
  );
  shape(
    [
      [10, 7],
      [12, 4],
      [16, 3],
      [19, 4],
      [21, 7],
    ],
    p.green,
  );
  r(11, 7, 10, 2, p.sage);
  r(21, 8, 4, 1, p.green);
  r(16, 4, 2, 2, p.mint);
  r(12, 8, 2, 1, p.gold);
  // Scarf follows the body, with its tail changing direction slightly.
  r(13, 16, 8, 2, p.gold);
  r(14, 18, 2, 3, p.brown);
  shape(
    [
      [12, 16],
      [8, 15 + (pose % 2)],
      [5, 17],
      [10, 18],
    ],
    p.gold,
  );
  // Mail satchel sits on its own editable layer.
  details.line(13, 18 + bob, 21, 24 + bob, p.darkBrown);
  details.line(14, 18 + bob, 22, 24 + bob, p.brown);
  details.rect(18, 22 + bob, 8, 6, p.ink);
  details.rect(19, 23 + bob, 6, 4, p.brown);
  details.rect(19, 23 + bob, 6, 2, p.gold);
  details.rect(21, 24 + bob, 2, 2, p.darkBrown);
  details.rect(21, 24 + bob, 1, 1, p.light);
  details.rect(24, 21 + bob, 2, 2, p.skin);
  return [body.pixels, details.pixels];
}

function slime(pose, idle = false) {
  const body = painter(),
    details = painter(),
    p = palette;
  const forms = idle
    ? [
        { x: 6, y: 16, w: 21, h: 16 },
        { x: 6, y: 17, w: 21, h: 15 },
      ]
    : [
        { x: 4, y: 19, w: 25, h: 13 },
        { x: 9, y: 7, w: 15, h: 22 },
        { x: 8, y: 4, w: 17, h: 20 },
        { x: 6, y: 13, w: 21, h: 18 },
      ];
  const { x, y, w, h } = forms[pose],
    mid = x + Math.floor(w / 2),
    bottom = y + h - 1;
  const outline = [
    [x, bottom - 2],
    [x, y + 7],
    [x + 2, y + 3],
    [x + 5, y],
    [x + w - 6, y],
    [x + w - 3, y + 3],
    [x + w - 1, y + 7],
    [x + w - 1, bottom - 2],
    [x + w - 3, bottom],
    [x + 2, bottom],
  ];
  body.poly(outline, p.ink);
  body.poly(
    outline.map(([a, b]) => [
      a < mid ? a + 1 : a - 1,
      b === bottom ? b - 1 : b + 1,
    ]),
    p.teal,
  );
  body.poly(
    [
      [x + 2, bottom - 5],
      [mid, bottom - 3],
      [x + w - 3, bottom - 6],
      [x + w - 3, bottom - 2],
      [x + 3, bottom - 1],
    ],
    p.tealDark,
  );
  body.rect(x + 4, y + 3, Math.max(2, w - 10), 2, p.cyan);
  body.rect(x + 3, y + 5, 2, 4, p.cyan);
  body.rect(x + 5, y + 3, 3, 1, p.light);
  const eyeY = y + Math.round(h * 0.52);
  details.rect(mid - 4, eyeY, 2, idle && pose === 1 ? 1 : 3, p.ink);
  details.rect(mid + 3, eyeY, 2, idle && pose === 1 ? 1 : 3, p.ink);
  if (!idle || pose === 0) {
    details.dot(mid - 4, eyeY, p.light);
    details.dot(mid + 3, eyeY, p.light);
  }
  details.rect(mid - 1, eyeY + 3, 3, 1, p.ink);
  details.rect(mid - 6, eyeY + 3, 2, 1, p.mint);
  details.rect(mid + 5, eyeY + 3, 2, 1, p.mint);
  // A tiny leaf gives the creature a recognizable top silhouette.
  details.poly(
    [
      [mid, y + 1],
      [mid - 3, y - 2],
      [mid - 1, y - 4],
      [mid + 2, y - 2],
      [mid + 3, y],
    ],
    p.ink,
  );
  details.line(mid - 1, y - 2, mid + 1, y, p.sage);
  return [body.pixels, details.pixels];
}

function spark(pose) {
  const body = painter(),
    details = painter(),
    p = palette;
  const tipX = [18, 15, 12, 16][pose],
    tipY = [3, 1, 4, 2][pose];
  body.poly(
    [
      [12, 29],
      [8, 26],
      [6, 21],
      [7, 16],
      [10, 12],
      [11, 18],
      [13, 14],
      [12, 10],
      [tipX, tipY],
      [tipX + 1, 10],
      [21, 14],
      [23, 11],
      [26, 18],
      [25, 24],
      [22, 29],
      [20, 31],
      [13, 31],
    ],
    p.ink,
  );
  body.poly(
    [
      [12, 28],
      [9, 25],
      [8, 21],
      [9, 17],
      [11, 20],
      [15, 15],
      [14, 11],
      [tipX, tipY + 3],
      [tipX, 12],
      [21, 17],
      [23, 15],
      [24, 20],
      [23, 25],
      [20, 29],
      [14, 30],
    ],
    p.fireDark,
  );
  body.poly(
    [
      [11, 24],
      [10, 19],
      [13, 21],
      [17, 12],
      [18, 18],
      [22, 19],
      [22, 25],
      [19, 29],
      [14, 28],
    ],
    p.fire,
  );
  body.poly(
    [
      [12, 23],
      [14, 18],
      [16, 21],
      [18, 18],
      [21, 23],
      [20, 27],
      [17, 29],
      [14, 27],
    ],
    p.orange,
  );
  body.poly(
    [
      [14, 26],
      [15, 22],
      [17, 24],
      [18, 22],
      [19, 26],
      [17, 29],
    ],
    p.yellow,
  );
  details.rect(12, 21, 2, 3, p.ink);
  details.rect(20, 21, 2, 3, p.ink);
  details.dot(12, 21, p.light);
  details.dot(20, 21, p.light);
  details.rect(16, 25, 2, 1, p.ink);
  const particles = [
    [7, 7],
    [24, 4],
    [5, 12],
    [23, 7],
  ];
  const [px, py] = particles[pose];
  details.rect(px, py, 2, 2, p.orange);
  details.dot(px, py, p.yellow);
  return [body.pixels, details.pixels];
}

const descriptions = [
  {
    id: "courier",
    name: "森林信使",
    description: "4 帧步行与 2 帧待机，观察脚步交替和挎包摆动。",
  },
  {
    id: "slime",
    name: "苔芽团子",
    description: "压扁、伸展、腾空、落地，练习弹跳的节奏。",
  },
  {
    id: "spark",
    name: "口袋火苗",
    description: "4 帧火焰循环，用轮廓与色块表现轻盈的摇曳。",
  },
];

export function makeTemplate(id = "courier") {
  const entry = descriptions.find((item) => item.id === id);
  if (!entry) throw new Error("没有找到这个练习素材");
  const project = {
    format: "spritelab",
    version: 1,
    name: entry.name,
    width: W,
    height: W,
    layers: [
      {
        id: `${id}-body`,
        name: id === "courier" ? "角色" : "轮廓与颜色",
        visible: true,
        opacity: 1,
      },
      {
        id: `${id}-details`,
        name: id === "courier" ? "邮差挎包" : "表情与装饰",
        visible: true,
        opacity: 1,
      },
    ],
    clips: [],
  };
  const clip = (name, key, durations, draw) => ({
    id: `${id}-${key}`,
    name,
    frames: durations.map((duration, index) => ({
      id: `${id}-${key}-${index}`,
      duration,
      cells: draw(index),
    })),
  });
  if (id === "courier") {
    project.clips = [
      clip("行走", "walk", [140, 100, 140, 100], (i) => courier(i)),
      clip("待机", "idle", [520, 520], (i) => courier(i, true)),
    ];
  } else if (id === "slime") {
    project.clips = [
      clip("弹跳", "bounce", [180, 90, 200, 100], (i) => slime(i)),
      clip("待机", "idle", [700, 130], (i) => slime(i, true)),
    ];
  } else {
    project.clips = [
      clip("燃烧", "glow", [150, 110, 160, 120], (i) => spark(i)),
    ];
  }
  return project;
}

export function getTemplates() {
  return descriptions.map((entry) => ({
    ...entry,
    provenance: TEMPLATE_PROVENANCE,
    thumbnailProject: makeTemplate(entry.id),
  }));
}
