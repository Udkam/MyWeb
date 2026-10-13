/** Pure deterministic state. savedAt is metadata, never a game clock. */
import {
  TOOLS,
  REGIONS,
  FRIENDS,
  DECOR,
  LETTERS,
  THEMES,
  PLOTS,
} from "./content.js";
export {
  TOOLS,
  REGIONS,
  FRIENDS,
  DECOR,
  LETTERS,
  THEMES,
  PLOTS,
} from "./content.js";
const MAX_JOURNEYS = 1_000_000,
  MAX_TEXT = 200_000;
const clone = (value) => structuredClone(value);
const find = (items, id) => items.find((item) => item.id === id);
const fail = (message) => {
  throw new Error(message);
};
const integer = (value, min, max) =>
  Number.isSafeInteger(value) && value >= min && value <= max;
const same = (a, b) => {
  if (a === b) return true;
  if (
    !a ||
    !b ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  const ka = Object.keys(a),
    kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((key) => Object.hasOwn(b, key) && same(a[key], b[key]))
  );
};
function validPack(toolIds) {
  if (
    !Array.isArray(toolIds) ||
    toolIds.length > TOOLS.length ||
    new Set(toolIds).size !== toolIds.length ||
    toolIds.some((id) => typeof id !== "string" || !find(TOOLS, id))
  )
    fail("行囊里有不认识或重复的工具。");
  if (toolIds.reduce((sum, id) => sum + find(TOOLS, id).slots, 0) > 4)
    fail("行囊只有四格。");
  return [...toolIds];
}
function mutate(state, change) {
  if (!integer(state.revision, 0, Number.MAX_SAFE_INTEGER - 1))
    fail("存档修订号无效。");
  const next = clone(state);
  change(next);
  next.revision++;
  return next;
}
export function createState() {
  return {
    version: 1,
    revision: 0,
    savedAt: 0,
    materials: 0,
    completedLetters: [],
    friendVisits: {},
    unlockedDecor: [],
    plots: Array(PLOTS.length).fill(null),
    theme: "evergreen",
    unlockedThemes: ["evergreen"],
    pack: ["basket", "map", "tea"],
    trip: null,
    lastTrip: null,
    journeys: 0,
    settings: { music: false, sound: true, motion: true },
  };
}
export function availableLetters(state) {
  return LETTERS.slice(
    0,
    Math.min(LETTERS.length, state.completedLetters.length + 1),
  );
}
export function setPack(state, toolIds) {
  const pack = validPack(toolIds);
  if (state.trip) fail("先回家，再整理行囊。");
  return same(pack, state.pack)
    ? state
    : mutate(state, (next) => {
        next.pack = pack;
      });
}
function createTrip(regionId, letterId, toolIds) {
  const region = find(REGIONS, regionId);
  if (!region) fail("没有找到这条路线。");
  const tools = validPack(toolIds);
  return {
    version: 1,
    caseId: regionId,
    regionId,
    letterId,
    tools,
    slots: tools.reduce((sum, id) => sum + find(TOOLS, id).slots, 0),
    position: "camp",
    energy: region.energy,
    teaUsed: false,
    delivered: false,
    guests: [],
    collection: 0,
    keepsakes: [],
    visited: ["camp"],
    path: [],
    log: [],
    history: [],
    done: false,
  };
}
function rawRoutes(trip) {
  if (trip.done) return [];
  const region = find(REGIONS, trip.regionId);
  return region.edges
    .filter((route) => route.from === trip.position)
    .map((route) => {
      const target = find(region.nodes, route.to);
      const reduction =
        (route.terrain === "forest" && trip.tools.includes("map")) ||
        (route.terrain === "rain" && trip.tools.includes("cape"))
          ? 1
          : 0;
      const cost = Math.max(1, route.baseCost - reduction);
      const missingTool =
        route.requires && !trip.tools.includes(route.requires)
          ? route.requires
          : null;
      const affordable = trip.energy >= cost,
        fresh = !trip.visited.includes(target.id);
      const collection =
        fresh && target.collection > 0
          ? target.collection + (trip.tools.includes("basket") ? 2 : 0)
          : 0;
      const energyRestore =
        fresh &&
        target.kind === "guest" &&
        trip.tools.includes("tea") &&
        !trip.teaUsed
          ? Math.min(2, Math.max(0, region.energy - (trip.energy - cost)))
          : 0;
      const exclusive =
        target.kind === "guest" &&
        trip.guests.length > 0 &&
        !trip.guests.includes(target.guestId);
      const available =
        !missingTool && affordable && !exclusive && trip.path.length < 15;
      return {
        ...route,
        name: target.name,
        cost,
        missingTool,
        affordable,
        available,
        energyAfter: trip.energy - cost + energyRestore,
        reward: {
          delivery: fresh && target.kind === "delivery",
          visits: fresh && ["delivery", "guest"].includes(target.kind) ? 1 : 0,
          collection,
          guestId: fresh ? target.guestId : null,
          keepsake: fresh ? target.keepsake : null,
          energyRestore,
        },
        reason: missingTool
          ? `需要${find(TOOLS, missingTool).name}。`
          : !affordable
            ? "这一段的精力不够了。"
            : exclusive
              ? "这趟只能拜访一位朋友。"
              : trip.path.length >= 15
                ? "这趟已经走得够远了。"
                : "",
      };
    });
}
function travel(original, edgeId) {
  const route = rawRoutes(original).find((item) => item.id === edgeId);
  if (!route?.available) fail(route?.reason || "这条路不从这里出发。");
  const trip = clone(original),
    snapshot = clone(original);
  delete snapshot.history;
  trip.history.push(snapshot);
  trip.position = route.to;
  trip.energy = route.energyAfter;
  trip.path.push(route.id);
  trip.visited.push(route.to);
  trip.delivered ||= route.reward.delivery;
  trip.collection += route.reward.collection;
  if (route.reward.guestId) trip.guests.push(route.reward.guestId);
  if (route.reward.keepsake) trip.keepsakes.push(route.reward.keepsake);
  if (route.reward.energyRestore) trip.teaUsed = true;
  trip.done =
    find(find(REGIONS, trip.regionId).nodes, route.to).kind === "home";
  trip.log.push({
    edgeId,
    from: route.from,
    to: route.to,
    name: route.name,
    cost: route.cost,
    energyBefore: original.energy,
    energyRestored: route.reward.energyRestore,
    energyAfter: trip.energy,
    collectionGained: route.reward.collection,
    delivered: route.reward.delivery,
    guestId: route.reward.guestId,
  });
  return trip;
}
export function canFinish(trip) {
  const visit = (current) =>
    current.done
      ? current.delivered
      : rawRoutes(current).some(
          (route) => route.available && visit(travel(current, route.id)),
        );
  return visit(trip);
}
export function getRoutes(trip) {
  if (!trip) return [];
  return rawRoutes(trip).map((route) => {
    const safeAvailable = Boolean(
      route.available && canFinish(travel(trip, route.id)),
    );
    const unsafeReason =
      route.available && !safeAvailable
        ? trip.delivered || route.reward.delivery
          ? "信已送达，但这样走就没有足够精力回家。"
          : "这样走，精力不够送信再回家。"
        : "";
    return {
      ...route,
      safeAvailable,
      unsafeReason,
      reason: route.reason || unsafeReason,
    };
  });
}
function outcomes(regionId, tools) {
  const results = [];
  const visit = (trip) => {
    if (trip.done) {
      if (trip.delivered)
        results.push({
          guestId: trip.guests[0] || null,
          collection: trip.collection,
        });
      return;
    }
    for (const route of rawRoutes(trip))
      if (route.available) visit(travel(trip, route.id));
  };
  visit(createTrip(regionId, null, tools));
  return results;
}
export function getReachableOutcomes(regionId, toolIds) {
  const results = outcomes(regionId, validPack(toolIds));
  return {
    deliverable: results.length > 0,
    visitorIds: [
      ...new Set(results.map((result) => result.guestId).filter(Boolean)),
    ],
    collectionMax: Math.max(0, ...results.map((result) => result.collection)),
  };
}
export function beginTrip(state, letterId, toolIds = state.pack) {
  if (state.trip) fail("这封信还在路上。");
  if (state.journeys >= MAX_JOURNEYS)
    fail("这份存档的旅途记录已满，请先导出留念。");
  const letter = find(availableLetters(state), letterId);
  if (!letter) fail("这封信还没有到。");
  const tools = validPack(toolIds),
    trip = createTrip(letter.regionId, letter.id, tools);
  if (!canFinish(trip)) fail("这个行囊还不能完成这趟路。");
  return mutate(state, (next) => {
    next.pack = tools;
    next.trip = trip;
    next.lastTrip = null;
  });
}
function settle(next, trip) {
  if (!trip.done || !trip.delivered || next.journeys >= MAX_JOURNEYS)
    fail("这趟旅途还不能收好。");
  const letter = find(LETTERS, trip.letterId),
    firstDelivery = !next.completedLetters.includes(letter.id);
  const newDecor = [],
    newThemes = [],
    guestId = trip.guests[0] || null;
  next.materials += trip.collection + (firstDelivery ? letter.reward : 0);
  if (firstDelivery) {
    next.completedLetters.push(letter.id);
    if (
      letter.themeUnlock &&
      !next.unlockedThemes.includes(letter.themeUnlock)
    ) {
      next.unlockedThemes.push(letter.themeUnlock);
      newThemes.push(letter.themeUnlock);
    }
  }
  if (guestId) {
    next.friendVisits[guestId] = (next.friendVisits[guestId] || 0) + 1;
    const gift = find(FRIENDS, guestId).gift;
    if (!next.unlockedDecor.includes(gift)) {
      next.unlockedDecor.push(gift);
      newDecor.push(gift);
      const empty = next.plots.indexOf(null);
      if (empty !== -1) next.plots[empty] = gift;
    }
  }
  next.journeys++;
  next.lastTrip = {
    letterId: letter.id,
    delivered: true,
    guestId,
    collection: trip.collection,
    newDecor,
    newThemes,
    firstDelivery,
    journeyNo: next.journeys,
  };
  next.trip = null;
}
export function stepTrip(state, edgeId) {
  if (!state.trip) fail("先选一封信出发吧。");
  const route = getRoutes(state.trip).find((item) => item.id === edgeId);
  if (!route?.safeAvailable) fail(route?.reason || "这条路不从这里出发。");
  const trip = travel(state.trip, edgeId);
  return mutate(state, (next) => {
    if (trip.done) settle(next, trip);
    else next.trip = trip;
  });
}
export function rewindTrip(state) {
  if (!state.trip?.history.length) fail("还没有走过可以退回的路。");
  return mutate(state, (next) => {
    const history = next.trip.history;
    const previous = history.pop();
    next.trip = { ...previous, history };
  });
}
export function abandonTrip(state) {
  return state.trip
    ? mutate(state, (next) => {
        next.trip = null;
      })
    : state;
}
export function buyDecor(state, decorId) {
  const decor = find(DECOR, decorId);
  if (!decor) fail("没有找到这件陈设。");
  if (state.unlockedDecor.includes(decor.id)) return state;
  if (decor.friendId) fail("这是朋友亲手带来的礼物。");
  if (state.materials < decor.cost) fail("枝叶还不够，下一趟可以顺路收集。");
  return mutate(state, (next) => {
    next.materials -= decor.cost;
    next.unlockedDecor.push(decor.id);
  });
}
export function placeDecor(state, plotIndex, decorIdOrNull) {
  if (!integer(plotIndex, 0, PLOTS.length - 1)) fail("这里不能摆放。");
  if (decorIdOrNull !== null && !state.unlockedDecor.includes(decorIdOrNull))
    fail("还没有这件陈设。");
  return state.plots[plotIndex] === decorIdOrNull
    ? state
    : mutate(state, (next) => {
        next.plots[plotIndex] = decorIdOrNull;
      });
}
export function setTheme(state, themeId) {
  if (!state.unlockedThemes.includes(themeId)) fail("这个院景还没有来到。");
  return state.theme === themeId
    ? state
    : mutate(state, (next) => {
        next.theme = themeId;
      });
}
export function setSetting(state, key, value) {
  if (!["music", "sound", "motion"].includes(key) || typeof value !== "boolean")
    fail("这个设置不合适。");
  return state.settings[key] === value
    ? state
    : mutate(state, (next) => {
        next.settings[key] = value;
      });
}
export function getFriendMemories(state, friendId) {
  const friend = find(FRIENDS, friendId);
  return !friend || !state.friendVisits[friendId]
    ? []
    : friend.memory.slice(
        0,
        Math.max(1, Math.ceil(state.completedLetters.length / 3)),
      );
}
export function getProgress(state) {
  return {
    lettersDone: state.completedLetters.length,
    lettersTotal: LETTERS.length,
    friendsMet: Object.keys(state.friendVisits).length,
    friendsTotal: FRIENDS.length,
    decorOwned: state.unlockedDecor.length,
    decorTotal: DECOR.length,
    themesUnlocked: state.unlockedThemes.length,
    themesTotal: THEMES.length,
    journeys: state.journeys,
    ending: state.completedLetters.length === LETTERS.length,
  };
}
function objectKeys(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    fail("存档字段不完整或不受支持。");
}
function uniqueIds(value, definitions, max = definitions.length) {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    new Set(value).size !== value.length ||
    value.some((id) => typeof id !== "string" || !find(definitions, id))
  )
    fail("存档里有不认识或重复的项目。");
}
const outcomeCache = new Map();
function allOutcomes(regionId) {
  if (!outcomeCache.has(regionId)) {
    const possible = [];
    for (let mask = 0; mask < 2 ** TOOLS.length; mask++) {
      const tools = TOOLS.filter((_, i) => mask & (1 << i));
      if (tools.reduce((sum, tool) => sum + tool.slots, 0) <= 4)
        possible.push(
          ...outcomes(
            regionId,
            tools.map((tool) => tool.id),
          ),
        );
    }
    outcomeCache.set(regionId, possible);
  }
  return outcomeCache.get(regionId);
}
function validateLastTrip(last, state) {
  if (last === null) return;
  objectKeys(last, [
    "letterId",
    "delivered",
    "guestId",
    "collection",
    "newDecor",
    "newThemes",
    "firstDelivery",
    "journeyNo",
  ]);
  const letter = find(LETTERS, last.letterId);
  if (
    !letter ||
    !state.completedLetters.includes(last.letterId) ||
    last.delivered !== true ||
    !integer(last.collection, 0, 10) ||
    typeof last.firstDelivery !== "boolean" ||
    last.journeyNo !== state.journeys ||
    state.journeys === 0
  )
    fail("归家记录与存档不一致。");
  if (last.firstDelivery && state.completedLetters.at(-1) !== last.letterId)
    fail("首通信件记录不一致。");
  uniqueIds(last.newDecor, DECOR, 1);
  uniqueIds(last.newThemes, THEMES, 1);
  const friend = find(FRIENDS, last.guestId);
  if (
    last.guestId !== null &&
    (!friend ||
      !state.friendVisits[last.guestId] ||
      !find(REGIONS, letter.regionId).nodes.some(
        (node) => node.guestId === last.guestId,
      ))
  )
    fail("会客记录不一致。");
  const expectedGift =
    friend && state.friendVisits[friend.id] === 1 ? [friend.gift] : [];
  if (
    !same(last.newDecor, expectedGift) ||
    last.newDecor.some((id) => !state.unlockedDecor.includes(id))
  )
    fail("赠品记录不一致。");
  const expectedTheme =
    last.firstDelivery && letter.themeUnlock ? [letter.themeUnlock] : [];
  if (!same(last.newThemes, expectedTheme)) fail("院景记录不一致。");
  const possible = allOutcomes(letter.regionId);
  if (
    !possible.some(
      (result) =>
        result.guestId === last.guestId &&
        result.collection === last.collection,
    )
  )
    fail("归家的收获不符合路线。");
}
function validateState(state) {
  objectKeys(state, Object.keys(createState()));
  if (state.version !== 1) fail("这个存档版本暂不支持。");
  if (
    !integer(state.revision, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(state.savedAt, 0, 8.64e15) ||
    !integer(state.materials, 0, 10 * MAX_JOURNEYS + 18) ||
    !integer(state.journeys, 0, MAX_JOURNEYS)
  )
    fail("存档中的数字无效。");
  uniqueIds(state.completedLetters, LETTERS);
  if (
    !same(
      state.completedLetters,
      LETTERS.slice(0, state.completedLetters.length).map(
        (letter) => letter.id,
      ),
    ) ||
    state.journeys < state.completedLetters.length ||
    (state.journeys === 0) !== (state.completedLetters.length === 0)
  )
    fail("信件的先后记录不一致。");
  validPack(state.pack);
  uniqueIds(state.unlockedDecor, DECOR);
  uniqueIds(state.unlockedThemes, THEMES);
  const expectedThemes = [
    "evergreen",
    ...LETTERS.filter(
      (letter) =>
        state.completedLetters.includes(letter.id) && letter.themeUnlock,
    ).map((letter) => letter.themeUnlock),
  ];
  if (
    !same(state.unlockedThemes, expectedThemes) ||
    !state.unlockedThemes.includes(state.theme)
  )
    fail("院景尚未解锁。");
  if (
    !state.friendVisits ||
    typeof state.friendVisits !== "object" ||
    Array.isArray(state.friendVisits) ||
    Object.getPrototypeOf(state.friendVisits) !== Object.prototype
  )
    fail("伙伴记录无效。");
  let visits = 0;
  for (const [id, count] of Object.entries(state.friendVisits)) {
    if (!find(FRIENDS, id) || !integer(count, 1, state.journeys))
      fail("伙伴记录无效。");
    visits += count;
    const region = REGIONS.find((region) =>
      region.nodes.some((node) => node.guestId === id),
    );
    if (
      !state.completedLetters.some(
        (id) => find(LETTERS, id).regionId === region.id,
      )
    )
      fail("还没有走到这位朋友那里。");
  }
  if (visits > state.journeys) fail("会客次数超过了旅途次数。");
  for (const friend of FRIENDS)
    if (
      Boolean(state.friendVisits[friend.id]) !==
      state.unlockedDecor.includes(friend.gift)
    )
      fail("伙伴与赠品记录不一致。");
  const spent = state.unlockedDecor.reduce(
    (sum, id) => sum + find(DECOR, id).cost,
    0,
  );
  // Bound cumulative receipts using actual route outcomes, paid purchases, first
  // rewards and guest counts; a local summary is not a signed full journey ledger.
  let minimum = state.completedLetters.length * 2,
    maximum = minimum,
    requiredGatherTrips = 0,
    bestGather = 0;
  for (const region of REGIONS) {
    const letterCount = state.completedLetters.filter(
      (id) => find(LETTERS, id).regionId === region.id,
    ).length;
    if (!letterCount) continue;
    const possible = allOutcomes(region.id);
    let regionVisits = 0;
    for (const friend of FRIENDS.filter((friend) =>
      region.nodes.some((node) => node.guestId === friend.id),
    )) {
      const count = state.friendVisits[friend.id] || 0,
        values = possible
          .filter((o) => o.guestId === friend.id)
          .map((o) => o.collection);
      regionVisits += count;
      minimum += count * Math.min(...values);
      maximum += count * Math.max(...values);
    }
    const gatherMax = Math.max(
      ...possible.filter((o) => o.guestId === null).map((o) => o.collection),
    );
    const required = Math.max(0, letterCount - regionVisits);
    requiredGatherTrips += required;
    maximum += required * gatherMax;
    bestGather = Math.max(bestGather, gatherMax);
  }
  if (requiredGatherTrips > state.journeys - visits)
    fail("路线与会客次数不一致。");
  maximum += (state.journeys - visits - requiredGatherTrips) * bestGather;
  if (state.materials + spent < minimum || state.materials + spent > maximum)
    fail("枝叶数量与旅途收获不一致。");
  if (
    !Array.isArray(state.plots) ||
    state.plots.length !== PLOTS.length ||
    state.plots.some((id) => id !== null && !state.unlockedDecor.includes(id))
  )
    fail("庭院里有尚未拥有的陈设。");
  objectKeys(state.settings, ["music", "sound", "motion"]);
  if (Object.values(state.settings).some((value) => typeof value !== "boolean"))
    fail("设置记录无效。");
  validateLastTrip(state.lastTrip, state);
  if (state.trip !== null) {
    if (state.journeys >= MAX_JOURNEYS)
      fail("旅途记录已满，不能还有未结算的行程。");
    const imported = state.trip;
    if (
      !imported ||
      typeof imported !== "object" ||
      Array.isArray(imported) ||
      !Array.isArray(imported.path) ||
      imported.path.length > 15 ||
      imported.path.some((id) => typeof id !== "string" || id.length > 16)
    )
      fail("路途记录无效。");
    const letter = find(availableLetters(state), imported.letterId);
    if (
      !letter ||
      imported.regionId !== letter.regionId ||
      !same(imported.tools, state.pack) ||
      state.lastTrip !== null
    )
      fail("路途与行囊、信件不一致。");
    let replay = createTrip(letter.regionId, letter.id, imported.tools);
    for (const id of imported.path) {
      const route = getRoutes(replay).find((route) => route.id === id);
      if (!route?.safeAvailable) fail("存档里有无法完成的路线。");
      replay = travel(replay, id);
    }
    if (replay.done || !same(imported, replay))
      fail("路途记录无法重放，请使用完整备份。");
    state.trip = replay;
  }
  return state;
}
export function parseState(text) {
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_TEXT)
    fail("存档为空或文件太大。");
  let input;
  try {
    input = JSON.parse(text);
  } catch {
    fail("这不是完整的 JSON 存档。");
  }
  try {
    return validateState(input);
  } catch (error) {
    if (error instanceof RangeError || !(error instanceof Error))
      fail("存档结构太复杂，无法读取。");
    throw error;
  }
}
export function serializeState(state) {
  let text;
  try {
    text = JSON.stringify(state);
  } catch {
    fail("暂时无法导出这份存档。");
  }
  parseState(text);
  return text;
}
