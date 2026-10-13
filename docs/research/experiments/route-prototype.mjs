/** Route A lab. Pure deterministic model; no clocks, combat, economy, or randomness. */
export const TOOLS = Object.freeze([
  { id: 'rope', name: '绳索', slots: 2, description: '可走标明绳索的攀越捷径；不消耗。' },
  { id: 'basket', name: '采集篮', slots: 2, description: '每个标有采集的地点确定多带回 2 件。' },
  { id: 'map', name: '地图', slots: 1, description: '每段林路少用 1 点精力，最低 1。' },
  { id: 'cape', name: '雨披', slots: 1, description: '每段雨路少用 1 点精力，最低 1。' },
  { id: 'tea', name: '热茶', slots: 1, description: '首次会见可选客人时恢复 2 点本趟精力，只用一次，不超过出发精力。' },
  { id: 'lantern', name: '提灯', slots: 1, description: '可走标明提灯的隧道捷径；不消耗。' },
]);

const node = (id, name, kind, collection = 0, guestId = null, keepsake = null) => ({ id, name, kind, collection, guestId, keepsake });
const edge = (id, from, to, baseCost, terrain = 'plain', requires = null) => ({ id, from, to, baseCost, terrain, requires });

export const CASES = Object.freeze([
  {
    id: 'rain-valley', name: '雨后溪谷', energy: 12,
    description: '送信前分路。桥边木匠与渡口药师只能拜访一位；也可不拜访，改去采集地。',
    nodes: [node('camp', '小屋', 'camp'), node('fork', '溪口岔路', 'junction'),
      node('carpenter', '桥边木匠', 'guest', 1, 'carpenter', '木桥模型'),
      node('meadow', '雨后草甸', 'gather', 1), node('herbalist', '渡口药师', 'guest', 0, 'herbalist', '草药挂束'),
      node('cache', '无人果园', 'gather', 3), node('post', '磨坊收信人', 'delivery'), node('home', '归家', 'home')],
    edges: [edge('r0', 'camp', 'fork', 1), edge('r1', 'fork', 'post', 3),
      edge('r2', 'fork', 'carpenter', 4, 'forest'), edge('r3', 'fork', 'carpenter', 2, 'cliff', 'rope'),
      edge('r4', 'carpenter', 'post', 3, 'rain'), edge('r5', 'fork', 'meadow', 2, 'rain'),
      edge('r6', 'meadow', 'herbalist', 3, 'forest'), edge('r7', 'meadow', 'herbalist', 1, 'tunnel', 'lantern'),
      edge('r8', 'herbalist', 'post', 3), edge('r9', 'meadow', 'cache', 2, 'forest'),
      edge('r10', 'cache', 'post', 3, 'rain'), edge('r11', 'post', 'home', 1)],
  },
  {
    id: 'hill-post', name: '山坡邮局', energy: 12,
    description: '先送达主信，再决定余下旅途：拜访蜂农、夜校老师，或去无人旧园采集。',
    nodes: [node('camp', '小屋', 'camp'), node('post', '山坡收信人', 'delivery'),
      node('beekeeper', '山腰蜂农', 'guest', 1, 'beekeeper', '蜂蜡小灯'), node('grove', '林缘草地', 'gather', 1),
      node('teacher', '夜校老师', 'guest', 1, 'teacher', '手写书签'), node('cache', '旧果园', 'gather', 4), node('home', '归家', 'home')],
    edges: [edge('h0', 'camp', 'post', 2), edge('h1', 'post', 'home', 3),
      edge('h2', 'post', 'beekeeper', 5, 'forest'), edge('h3', 'post', 'beekeeper', 2, 'cliff', 'rope'),
      edge('h4', 'beekeeper', 'home', 3, 'rain'), edge('h5', 'post', 'grove', 2, 'forest'),
      edge('h6', 'grove', 'teacher', 3, 'rain'), edge('h7', 'grove', 'teacher', 1, 'tunnel', 'lantern'),
      edge('h8', 'teacher', 'home', 3, 'forest'), edge('h9', 'grove', 'cache', 3), edge('h10', 'cache', 'home', 3, 'rain')],
  },
  {
    id: 'dusk-woods', name: '暮色山林', energy: 13,
    description: '多段林路与短隧道并存。可拜访守林人、观星客，也可绕过客人去两处采集地。',
    nodes: [node('camp', '小屋', 'camp'), node('fork', '雨林入口', 'junction'),
      node('ranger', '老守林人', 'guest', 0, 'ranger', '林叶拓印'), node('ridge', '长坡林缘', 'gather', 2),
      node('astronomer', '观星客', 'guest', 1, 'astronomer', '纸星图'), node('orchard', '山中果林', 'gather', 3),
      node('cache', '石阶菌园', 'gather', 3), node('post', '山顶收信人', 'delivery'), node('home', '归家', 'home')],
    edges: [edge('d0', 'camp', 'fork', 1, 'rain'), edge('d1', 'fork', 'post', 3),
      edge('d2', 'fork', 'ranger', 3, 'forest'), edge('d3', 'ranger', 'ridge', 3, 'forest'), edge('d4', 'ridge', 'post', 3, 'rain'),
      edge('d5', 'fork', 'astronomer', 5, 'forest'), edge('d6', 'fork', 'astronomer', 2, 'tunnel', 'lantern'),
      edge('d7', 'astronomer', 'post', 3), edge('d8', 'astronomer', 'post', 1, 'cliff', 'rope'),
      edge('d9', 'fork', 'orchard', 3, 'forest'), edge('d10', 'orchard', 'cache', 3, 'rain'),
      edge('d11', 'cache', 'post', 3), edge('d12', 'post', 'home', 1)],
  },
]);

const getCase = id => CASES.find(item => item.id === id);
const clone = value => structuredClone(value);
export function createTrip(caseId, toolIds = []) {
  const scenario = getCase(caseId);
  if (!scenario) throw new Error('没有这个出发案例。');
  if (!Array.isArray(toolIds) || new Set(toolIds).size !== toolIds.length
    || toolIds.some(id => !TOOLS.some(tool => tool.id === id))) throw new Error('行囊工具无效或重复。');
  const slots = toolIds.reduce((sum, id) => sum + TOOLS.find(tool => tool.id === id).slots, 0);
  if (slots > 4) throw new Error('行囊最多 4 格。');
  return { version: 1, caseId, tools: [...toolIds], slots, position: 'camp', energy: scenario.energy,
    teaUsed: false, delivered: false, guests: [], collection: 0, keepsakes: [], visited: ['camp'],
    path: [], log: [], history: [], done: false };
}

export function getRoutes(trip) {
  if (trip.done) return [];
  const scenario = getCase(trip.caseId);
  return scenario.edges.filter(route => route.from === trip.position).map(route => {
    const target = scenario.nodes.find(item => item.id === route.to);
    const reduction = (route.terrain === 'forest' && trip.tools.includes('map'))
      || (route.terrain === 'rain' && trip.tools.includes('cape')) ? 1 : 0;
    const cost = Math.max(1, route.baseCost - reduction);
    const missingTool = route.requires && !trip.tools.includes(route.requires) ? route.requires : null;
    const affordable = trip.energy >= cost;
    const fresh = !trip.visited.includes(target.id);
    const collection = fresh && target.collection > 0 ? target.collection + (trip.tools.includes('basket') ? 2 : 0) : 0;
    const energyRestore = fresh && target.kind === 'guest' && trip.tools.includes('tea') && !trip.teaUsed
      ? Math.min(2, Math.max(0, scenario.energy - (trip.energy - cost))) : 0;
    const exclusive = target.kind === 'guest' && trip.guests.length > 0 && !trip.guests.includes(target.guestId);
    const available = !missingTool && affordable && !exclusive && trip.path.length < 15;
    return { ...route, name: target.name, cost, missingTool, affordable, available,
      energyAfter: trip.energy - cost + energyRestore,
      reward: { delivery: fresh && target.kind === 'delivery', visits: fresh && ['delivery', 'guest'].includes(target.kind) ? 1 : 0,
        collection, guestId: fresh ? target.guestId : null, keepsake: fresh ? target.keepsake : null, energyRestore },
      reason: missingTool ? `需要${TOOLS.find(tool => tool.id === missingTool).name}`
        : !affordable ? `本趟精力不足，还需 ${cost - trip.energy} 点` : exclusive ? '这趟只能拜访其中一位客人'
          : trip.path.length >= 15 ? '已到路线步数上限' : '' };
  });
}

export function travel(original, edgeId) {
  const route = getRoutes(original).find(item => item.id === edgeId);
  if (!route || !route.available) throw new Error(route?.reason || '这条路不从当前位置出发。');
  const trip = clone(original); const snapshot = clone(original); delete snapshot.history;
  trip.history.push(snapshot);
  trip.position = route.to; trip.energy = route.energyAfter; trip.path.push(route.id); trip.visited.push(route.to);
  trip.delivered ||= route.reward.delivery;
  trip.collection += route.reward.collection;
  if (route.reward.guestId) trip.guests.push(route.reward.guestId);
  if (route.reward.keepsake) trip.keepsakes.push(route.reward.keepsake);
  if (route.reward.energyRestore) trip.teaUsed = true;
  trip.done = getCase(trip.caseId).nodes.find(item => item.id === route.to).kind === 'home';
  trip.log.push({ edgeId, from: route.from, to: route.to, name: route.name, cost: route.cost,
    energyBefore: original.energy, energyRestored: route.reward.energyRestore, energyAfter: trip.energy,
    collectionGained: route.reward.collection, delivered: route.reward.delivery, guestId: route.reward.guestId });
  return trip;
}

export function undoTrip(original) {
  if (!original.history.length) throw new Error('还没有可撤销的路段。');
  const trip = clone(original); const previous = trip.history.pop(); return { ...previous, history: trip.history };
}

export function getOutcome(trip) {
  return { done: trip.done, delivered: trip.delivered, visits: Number(trip.delivered) + trip.guests.length,
    collection: trip.collection, energyLeft: trip.energy, guestId: trip.guests[0] || null,
    keepsake: trip.keepsakes[0] || null, steps: trip.path.length,
    permanent: { deliveredTo: trip.delivered ? getCase(trip.caseId).nodes.find(node => node.kind === 'delivery').id : null,
      helpedGuest: trip.guests[0] || null, keepsakes: [...trip.keepsakes], collected: trip.collection },
  };
}

function dominates(a, b, dimensions) {
  return dimensions.every(key => a[key] >= b[key]) && dimensions.some(key => a[key] > b[key]);
}

function frontier(solutions, dimensions) {
  const representatives = new Map();
  for (const solution of solutions) {
    if (solutions.some(other => dominates(other.outcome, solution.outcome, dimensions))) continue;
    const key = dimensions.map(dimension => solution.outcome[dimension]).join('/');
    const current = representatives.get(key);
    // Equivalent coordinate labels/guest names do not create a second strategy.
    if (!current || solution.slots < current.slots) representatives.set(key, { ...solution, equivalentSolutions: (current?.equivalentSolutions || 0) + 1 });
    else current.equivalentSolutions++;
  }
  return [...representatives.values()].sort((a, b) => b.outcome.visits - a.outcome.visits || a.outcome.collection - b.outcome.collection);
}

/** Exhaustive finite comparison, no heuristic score. Complete main delivery only. */
export function enumerateCase(caseId) {
  const solutions = []; const deadEnds = []; let loadoutCount = 0;
  for (let mask = 0; mask < 2 ** TOOLS.length; mask++) {
    const tools = TOOLS.filter((_, i) => mask & (1 << i)).map(tool => tool.id);
    if (tools.reduce((sum, id) => sum + TOOLS.find(tool => tool.id === id).slots, 0) > 4) continue;
    loadoutCount++;
    const visit = trip => {
      if (trip.done) {
        if (trip.delivered) solutions.push({ tools, slots: trip.slots, path: trip.path, log: trip.log, outcome: getOutcome(trip) });
        return;
      }
      const routes = getRoutes(trip).filter(route => route.available);
      if (!routes.length) deadEnds.push({ tools, path: trip.path, energy: trip.energy, delivered: trip.delivered });
      for (const route of routes) visit(travel(trip, route.id));
    };
    visit(createTrip(caseId, tools));
  }
  return { caseId, loadoutCount, solutions, deadEnds,
    frontier: frontier(solutions, ['visits', 'collection', 'energyLeft']),
    frontierWithoutEnergy: frontier(solutions, ['visits', 'collection']),
    collectionOnlyFrontier: frontier(solutions, ['collection']) };
}
