/** Mosslight Post scenery. Original CC0 sprites by Pixel-boy & AAA.
 * Placement and appearance only: route safety is supplied by the model.
 */
const SIZE = 288;
const FRAME_MS = 720;
const FRIEND_SPECIES = {
  carpenter: "dog",
  herbalist: "frog",
  beekeeper: "chicken",
  teacher: "cat",
  ranger: "racoon",
  astronomer: "pig",
};
const ANIMALS = {
  dog: { name: "阿木", x: 172, y: 147 },
  frog: { name: "苔生", x: 73, y: 222 },
  chicken: { name: "米粒", x: 151, y: 216 },
  cat: { name: "小满", x: 145, y: 169 },
  racoon: { name: "栗子", x: 146, y: 263 },
  pig: { name: "桃子", x: 194, y: 265 },
};
const THEMES = {
  evergreen: {
    trees: ["tree", "pine", "tree"],
    flower: "flowersWhite",
    wide: "treeWide",
  },
  blossom: {
    trees: ["treeCherry", "treeCherry", "tree"],
    flower: "flowersRed",
    wide: "treeCherryWide",
  },
  riverside: {
    trees: ["treeWillow", "tree", "treeWillow"],
    flower: "flowers",
    wide: "treeWide",
  },
};
async function getAssetMap() {
  const response = await fetch(
    new URL("./assets/asset-map.json", import.meta.url),
  );
  if (!response.ok) throw new Error("庭院素材说明暂时没有载入，请刷新重试。");
  return response.json();
}
function imageAt(path) {
  const image = new Image();
  image.src = new URL(`./assets/${path}`, import.meta.url).href;
  return image
    .decode()
    .then(() => image)
    .catch(() => {
      throw new Error(`庭院素材暂时没有载入：${path.split("/").pop()}`);
    });
}
function cellSet(x, y, width, height, cells = new Set()) {
  for (let row = y; row < y + height; row++)
    for (let col = x; col < x + width; col++) cells.add(`${col},${row}`);
  return cells;
}
function segmentDistance(x, y, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
}

export async function createScene(canvas) {
  if (!canvas?.getContext) throw new TypeError("场景需要一个 Canvas。");
  const map = await getAssetMap();
  const images = Object.fromEntries(
    await Promise.all(
      Object.entries(map.files).map(async ([id, path]) => [
        id,
        await imageAt(path),
      ]),
    ),
  );
  const resolution = Math.max(864, canvas.width || 0, canvas.height || 0);
  canvas.width = resolution;
  canvas.height = resolution;
  const scale = resolution / SIZE;
  const ctx = canvas.getContext("2d", { alpha: false });
  const backing = document.createElement("canvas");
  backing.width = resolution;
  backing.height = resolution;
  const back = backing.getContext("2d", { alpha: false });
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let requestedMotion = true;
  let elapsed = 0;
  let timer = null;
  let destroyed = false;
  let lastBaseKey = "";
  let targets = [];
  let state = {
    mode: "home",
    theme: "evergreen",
    plots: [],
    residents: [],
    selectedPlot: null,
  };
  const effectiveMotion = () => requestedMotion && !media.matches;
  const currentFrame = () =>
    effectiveMotion() ? Math.floor(elapsed / FRAME_MS) % 4 : 0;
  const config = () => THEMES[state.theme] || THEMES.evergreen;
  function reset(context) {
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.imageSmoothingEnabled = false;
    context.globalAlpha = 1;
    context.setLineDash([]);
  }
  function cut(context, file, rect, x, y, width = rect[2], height = rect[3]) {
    context.drawImage(
      images[file],
      ...rect,
      Math.round(x),
      Math.round(y),
      width,
      height,
    );
  }
  function sprite(context, id, x, y, zoom = 1, frame = 0) {
    const part = map.sprites[id];
    if (!part) return;
    const rect = [...part.rect];
    rect[0] += (frame % (part.frames || 1)) * (part.strideX || 0);
    cut(context, part.file, rect, x, y, rect[2] * zoom, rect[3] * zoom);
  }
  function centered(context, id, x, y, maximum = 36, frame = 0) {
    const source = map.sprites[id];
    if (!source) return;
    const zoom = Math.min(
      1.5,
      maximum / Math.max(source.rect[2], source.rect[3]),
    );
    sprite(
      context,
      id,
      x - (source.rect[2] * zoom) / 2,
      y - (source.rect[3] * zoom) / 2,
      zoom,
      frame,
    );
  }
  function autotiles(context, cells, name) {
    const atlas = map.tileSets[name];
    for (const key of cells) {
      const [x, y] = key.split(",").map(Number);
      const top = !cells.has(`${x},${y - 1}`);
      const bottom = !cells.has(`${x},${y + 1}`);
      const left = !cells.has(`${x - 1},${y}`);
      const right = !cells.has(`${x + 1},${y}`);
      const vertical = top ? "top" : bottom ? "bottom" : "";
      const part =
        vertical +
        (left
          ? vertical
            ? "Left"
            : "left"
          : right
            ? vertical
              ? "Right"
              : "right"
            : "");
      cut(context, atlas.file, atlas.rects[part || "center"], x * 16, y * 16);
    }
  }
  function grass(context) {
    for (let y = 0; y < 18; y++)
      for (let x = 0; x < 18; x++)
        sprite(
          context,
          (x * 3 + y * 7) % 11 === 0 ? "grassDetail" : "grass",
          x * 16,
          y * 16,
        );
  }
  function clearOfPlots(x, y, width = 16, height = 16) {
    return !map.plots.some(
      (plot) =>
        Math.abs(x + width / 2 - plot.x) < width / 2 + 23 &&
        Math.abs(y + height / 2 - plot.y) < height / 2 + 23,
    );
  }
  function homeForest() {
    const theme = config();
    for (let i = 0; i < 10; i++)
      sprite(back, theme.trees[i % 3], i * 31 - 17, -12 + (i % 3) * 6, 1.5);
    for (let i = 0; i < 8; i++)
      sprite(
        back,
        theme.trees[(i + 1) % 3],
        i * 37 - 20,
        19 + (i % 2) * 7,
        1.25,
      );
    sprite(back, theme.wide, 66, 34);
    for (let i = 0; i < 5; i++)
      sprite(back, theme.trees[i % 3], 270 + (i % 2) * 7, 55 + i * 39, 1.35);
    for (const [x, y] of [
      [4, 69],
      [3, 102],
      [7, 210],
      [8, 245],
    ])
      sprite(back, theme.trees[1], x - 16, y, 1.25);
    for (const [x, y] of [
      [-12, 261],
      [29, 273],
      [263, 264],
    ])
      sprite(back, theme.trees[0], x, y, 1.45);
  }
  function homeBase() {
    grass(back);
    const paths = cellSet(8, 7, 3, 11);
    cellSet(3, 10, 7, 2, paths);
    cellSet(8, 8, 6, 2, paths);
    autotiles(back, paths, "path");
    const water =
      state.theme === "riverside" ? cellSet(0, 6, 5, 13) : cellSet(1, 6, 3, 13);
    autotiles(back, water, "stream");
    sprite(back, "bridge", 16, 167, 1.2);
    homeForest();
    sprite(back, "cottage", 148, 66, 1.5);
    sprite(back, "door", 173, 113, 1.5);
    sprite(back, "window", 211, 113, 1.15);
    for (const [x, y] of [
      [78, 77],
      [67, 211],
      [250, 249],
      [114, 68],
      [241, 139],
      [113, 276],
      [224, 56],
    ])
      if (clearOfPlots(x, y)) sprite(back, "bush", x, y);
    for (const [x, y] of [
      [75, 137],
      [114, 78],
      [234, 144],
      [205, 246],
      [225, 266],
      [83, 278],
      [268, 194],
    ])
      if (clearOfPlots(x, y)) sprite(back, config().flower, x, y);
    for (const [x, y] of [
      [4, 143],
      [65, 249],
      [224, 48],
      [247, 87],
      [66, 100],
    ])
      if (clearOfPlots(x, y)) sprite(back, "fern", x, y);
    for (const [x, y] of [
      [63, 204],
      [49, 93],
      [267, 201],
      [61, 261],
    ])
      if (clearOfPlots(x, y)) sprite(back, "rock", x, y);
    // The save is the only source for rewards: no bench/lantern/etc is pre-placed.
    map.plots.forEach((plot, index) => {
      const spriteId = map.decor[state.plots?.[index]];
      if (spriteId) centered(back, spriteId, plot.x, plot.y, 36);
    });
  }
  const nodes = () => state.region?.nodes || [];
  function pairs() {
    const byId = new Map(nodes().map((node) => [node.id, node]));
    return (state.region?.edges || [])
      .map((edge) => ({
        edge,
        from: byId.get(edge.from),
        to: byId.get(edge.to),
      }))
      .filter((pair) => pair.from && pair.to);
  }
  function routeBase() {
    grass(back);
    const theme = config();
    const links = pairs();
    const points = nodes();
    const riverX = state.region?.id === "hill-post" ? 16 : 0;
    autotiles(back, cellSet(riverX, -1, 2, 20), "stream");
    // Closely spaced original ground tiles keep diagonal paths continuous.
    // The atlas's outer-corner tiles are only for orthogonal home paths.
    for (const { from, to } of links) {
      const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 3);
      for (let i = 0; i <= steps; i++) {
        const t = i / Math.max(steps, 1);
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        cut(back, "floor", map.tileSets.path.rects.center, x - 8, y - 8);
      }
    }
    for (let row = 0; row < 9; row++)
      for (let col = 0; col < 9; col++) {
        const x = col * 34 - 10 + (row % 2) * 10;
        const y = row * 34 - 11;
        const center = { x: x + 16, y: y + 24 };
        if (
          points.some(
            (node) => Math.hypot(node.x - center.x, node.y - center.y) < 29,
          )
        )
          continue;
        if (
          links.some(
            ({ from, to }) =>
              segmentDistance(center.x, center.y, from, to) < 22,
          )
        )
          continue;
        if (x > riverX * 16 - 18 && x < (riverX + 2) * 16) continue;
        sprite(back, theme.trees[(row + col) % 3], x, y, 1.2);
      }
    for (const node of points) {
      if (["camp", "home", "delivery"].includes(node.kind))
        centered(
          back,
          "cottage",
          node.x,
          node.y - 3,
          node.kind === "delivery" ? 37 : 33,
        );
      else if (node.kind === "gather") {
        centered(back, theme.flower, node.x - 7, node.y, 19);
        centered(back, "bush", node.x + 8, node.y + 4, 18);
      } else if (node.kind !== "guest")
        centered(back, "stump", node.x, node.y + 2, 24);
    }
  }
  function selection(x, y, radius, color, dashed = false) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.setLineDash(dashed ? [3, 3] : []);
    ctx.beginPath();
    ctx.roundRect(x - radius, y - radius, radius * 2, radius * 2, 5);
    ctx.stroke();
    ctx.restore();
  }
  function routeStatus(photo) {
    const current = state.trip?.position || "camp";
    const walked = new Set(state.trip?.path || []);
    const visited = new Set(state.trip?.visited || []);
    const safe = new Set(
      (state.routes || [])
        .filter((route) => route.safeAvailable)
        .map((route) => route.id),
    );
    if (!photo)
      for (const { edge, from, to } of pairs()) {
        const seen = walked.has(edge.id);
        const next = safe.has(edge.id);
        if (!seen && !next) continue;
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = next ? "#fff3b2" : "#5d6736";
        ctx.lineWidth = next ? 2.4 : 1.5;
        ctx.setLineDash(next ? [4, 4] : []);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();
      }
    for (const node of nodes()) {
      if (node.kind === "guest") {
        const species =
          node.species ||
          FRIEND_SPECIES[node.guestId] ||
          FRIEND_SPECIES[node.id];
        if (species && ANIMALS[species])
          centered(ctx, species, node.x, node.y, 26, currentFrame());
      }
      if (photo) continue;
      if (node.id === current) selection(node.x, node.y, 19, "#fff9db");
      else if (visited.has(node.id))
        selection(node.x, node.y, 17, "#65713c", true);
    }
  }
  function draw(photo = false) {
    if (destroyed) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backing, 0, 0);
    reset(ctx);
    const frame = currentFrame();
    if (state.mode === "route") {
      const x = state.region?.id === "hill-post" ? 261 : 5;
      sprite(ctx, "ripple", x, 48, 1, frame);
      sprite(ctx, "ripple", x, 216, 1, (frame + 2) % 4);
      routeStatus(photo);
    } else {
      sprite(ctx, "ripple", 37, 122, 1, frame);
      sprite(ctx, "ripple", 25, 240, 1, (frame + 2) % 4);
      for (const [index, species] of [
        ...new Set(state.residents || []),
      ].entries()) {
        const animal = ANIMALS[species];
        if (animal)
          centered(ctx, species, animal.x, animal.y, 25, (frame + index) % 2);
      }
      const index =
        typeof state.selectedPlot === "string"
          ? map.plots.findIndex((plot) => plot.id === state.selectedPlot)
          : state.selectedPlot;
      if (!photo && Number.isInteger(index) && map.plots[index]) {
        const plot = map.plots[index];
        selection(plot.x, plot.y, 21, "#fff8cb", true);
      }
    }
  }
  function buildTargets() {
    if (state.mode === "route")
      targets = nodes().map((node) => ({
        kind: "node",
        id: node.id,
        x: node.x,
        y: node.y,
        label: node.name,
      }));
    else {
      targets = map.plots.map((plot, index) => ({
        kind: "plot",
        ...plot,
        index,
        decorId: state.plots?.[index] || null,
      }));
      for (const species of [...new Set(state.residents || [])]) {
        const animal = ANIMALS[species];
        if (animal)
          targets.push({
            kind: "friend",
            id: species,
            species,
            x: animal.x,
            y: animal.y,
            label: animal.name,
          });
      }
    }
  }
  function render(next = {}) {
    if (destroyed) return;
    state = {
      mode: "home",
      theme: "evergreen",
      plots: [],
      residents: [],
      selectedPlot: null,
      ...next,
    };
    const key = JSON.stringify({
      mode: state.mode,
      theme: state.theme,
      plots: state.plots,
      region: state.region
        ? {
            id: state.region.id,
            nodes: state.region.nodes,
            edges: state.region.edges,
          }
        : null,
    });
    if (key !== lastBaseKey) {
      reset(back);
      if (state.mode === "route") routeBase();
      else homeBase();
      lastBaseKey = key;
    }
    buildTargets();
    draw();
  }
  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (destroyed || !effectiveMotion() || document.hidden) return;
    timer = setTimeout(() => {
      elapsed += FRAME_MS;
      draw();
      schedule();
    }, FRAME_MS);
  }
  function onVisibility() {
    schedule();
  }
  function onPreference() {
    schedule();
    draw();
  }
  document.addEventListener("visibilitychange", onVisibility);
  media.addEventListener("change", onPreference);
  render();
  schedule();
  return {
    render,
    setMotion(enabled) {
      requestedMotion = Boolean(enabled);
      schedule();
      draw();
    },
    advanceTime(ms) {
      if (destroyed) return;
      elapsed += Math.max(0, Number(ms) || 0);
      draw();
    },
    getHitTargets() {
      return targets.map((target) => ({ ...target }));
    },
    toDataURL() {
      if (destroyed) return "";
      draw(true);
      const data = canvas.toDataURL("image/png");
      draw();
      return data;
    },
    destroy() {
      destroyed = true;
      clearTimeout(timer);
      timer = null;
      targets = [];
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", onPreference);
    },
  };
}
