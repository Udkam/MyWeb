/** Reproduce the frozen Route A finite experiment. Node only; model remains browser-native. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TOOLS, CASES, createTrip, getRoutes, travel, undoTrip, getOutcome, enumerateCase } from './route-prototype.mjs';

let assertions = 0;
const equal = (actual, expected, message) => { assertions++; assert.deepEqual(actual, expected, message); };
const ok = (condition, message) => { assertions++; assert.ok(condition, message); };
const rejects = fn => { assertions++; assert.throws(fn); };
const copy = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const dominates = (a, b, dims) => dims.every(d => a[d] >= b[d]) && dims.some(d => a[d] > b[d]);
const toolNames = ids => ids.length ? ids.map(id => TOOLS.find(t => t.id === id).name).join('、') : '空包';

rejects(() => createTrip('missing'));
rejects(() => createTrip(CASES[0].id, ['rope', 'rope']));
rejects(() => createTrip(CASES[0].id, ['rope', 'basket', 'map']));
rejects(() => createTrip(CASES[0].id, ['missing']));
rejects(() => createTrip(CASES[0].id, 'basket'));
rejects(() => undoTrip(createTrip(CASES[0].id)));
rejects(() => travel(createTrip(CASES[0].id), 'missing'));

const results = CASES.map(scenario => {
  const result = enumerateCase(scenario.id);
  equal(result.loadoutCount, 39, 'all capacity-valid subsets included');
  equal(new Set(scenario.nodes.map(n => n.id)).size, scenario.nodes.length, 'unique node ids');
  equal(new Set(scenario.edges.map(e => e.id)).size, scenario.edges.length, 'unique edge ids');
  const nodeIds = scenario.nodes.map(n => n.id);
  scenario.edges.forEach(e => {
    ok(nodeIds.includes(e.from) && nodeIds.includes(e.to), 'edge endpoints exist');
    ok(Number.isInteger(e.baseCost) && e.baseCost >= 1, 'positive finite public cost');
    ok(!e.requires || TOOLS.some(t => t.id === e.requires), 'required tool exists');
  });
  ok(result.solutions.some(s => s.tools.length === 0 && s.outcome.guestId === null && s.outcome.collection === 0), 'empty bag main letter route');
  const signatures = new Set();
  for (const solution of result.solutions) {
    const signature = `${solution.tools.join(',')}:${solution.path.join(',')}`;
    ok(!signatures.has(signature), 'no duplicated loadout-route pair'); signatures.add(signature);
    let trip = createTrip(scenario.id, solution.tools);
    for (const edgeId of solution.path) {
      const before = copy(trip);
      freeze(trip);
      const route = getRoutes(trip).find(e => e.id === edgeId);
      ok(route && route.available, 'enumerated path available');
      const next = travel(trip, edgeId);
      equal(trip, before, 'pure transition');
      equal(next.energy, route.energyAfter, 'energy preview equals paid result');
      equal(next.energy, before.energy - route.cost + route.reward.energyRestore, 'energy conservation');
      equal(next.collection, before.collection + route.reward.collection, 'reward preview equals paid result');
      equal(next.guests.length, before.guests.length + Number(Boolean(route.reward.guestId)), 'guest preview equals paid result');
      equal(next.delivered, before.delivered || route.reward.delivery, 'letter preview equals paid result');
      equal(undoTrip(next), before, 'undo restores exact serializable state');
      equal(travel(copy(before), edgeId), next, 'JSON round trip resumes exact branch');
      ok(next.energy >= 0 && next.energy <= scenario.energy, 'bounded trip-only energy');
      ok(next.guests.length <= 1, 'two optional guests remain mutually exclusive');
      ok(next.log.filter(entry => entry.energyRestored > 0).length <= 1, 'tea applies only once');
      trip = next;
    }
    equal(getOutcome(trip), solution.outcome, 'enumeration outcome trace agrees');
    equal(getRoutes(trip), [], 'home closes route');
    ok(trip.done && trip.delivered && trip.path.length <= 15, 'home, successful letter, step ceiling');
    rejects(() => travel(trip, scenario.edges[0].id));
  }
  // Independently count the abstract tool-enabled DAG paths, ignoring energy. If all
  // finish in the energy-aware model, energy is not constraining any enabled route.
  let graphPaths = 0;
  const abstractPathCounts = [];
  for (let mask = 0; mask < 64; mask++) {
    const tools = TOOLS.filter((_, i) => mask & (1 << i));
    if (tools.reduce((sum, t) => sum + t.slots, 0) > 4) continue;
    const ids = tools.map(t => t.id);
    const count = (position, seen) => {
      ok(!seen.includes(position), 'graph acyclic');
      if (position === 'home') return 1;
      return scenario.edges.filter(e => e.from === position && (!e.requires || ids.includes(e.requires)))
        .reduce((sum, e) => sum + count(e.to, [...seen, position]), 0);
    };
    const paths = count('camp', []);
    abstractPathCounts.push({ tools: ids, paths }); graphPaths += paths;
  }
  equal(graphPaths, result.solutions.length, 'every tool-enabled graph path also fits energy');
  equal(result.deadEnds.length, 0, 'no stranded budget branch in this version');
  const nonBasket = result.solutions.filter(s => !s.tools.includes('basket'));
  const basketOnly = result.solutions.filter(s => s.tools.length === 1 && s.tools[0] === 'basket');
  const basketDominatesSameGuest = nonBasket.every(s => basketOnly.some(b => b.outcome.guestId === s.outcome.guestId && b.outcome.collection > s.outcome.collection));
  ok(basketDominatesSameGuest, 'basket alone strictly improves collection with same guest identity over every no-basket outcome');
  const efficient = result.solutions.filter(s => !result.solutions.some(t => dominates(t.outcome, s.outcome, ['visits', 'collection'])));
  const allEfficientCarryBasket = efficient.every(s => s.tools.includes('basket'));
  ok(allEfficientCarryBasket, 'all efficient outcomes carry basket');
  const maxCollectionByGuest = Object.fromEntries(scenario.nodes.filter(n => n.kind === 'guest').map(n => [n.id, Math.max(...result.solutions.filter(s => s.outcome.guestId === n.guestId).map(s => s.outcome.collection))]));
  const examples = result.frontierWithoutEnergy.map(s => ({ ...s,
    routeNames: ['小屋', ...s.log.map(entry => entry.name)],
    totalEnergySpent: s.log.reduce((sum, entry) => sum + entry.cost, 0),
    totalEnergyRestored: s.log.reduce((sum, entry) => sum + entry.energyRestored, 0),
  }));
  return { caseId: scenario.id, name: scenario.name, energy: scenario.energy,
    loadouts: result.loadoutCount, enabledGraphPaths: graphPaths, successfulSolutions: result.solutions.length,
    deadEnds: result.deadEnds.length, minSteps: Math.min(...result.solutions.map(s => s.path.length)), maxSteps: Math.max(...result.solutions.map(s => s.path.length)),
    abstractPathCounts, basketDominatesSameGuest, allEfficientCarryBasket,
    efficientSolutions: efficient.length, efficientLoadouts: [...new Set(efficient.map(s => s.tools.join(',')))],
    emptyBagRoutes: result.solutions.filter(s => s.tools.length === 0),
    maxCollectionByGuest, examples,
    frontierWithEnergy: result.frontier, frontierWithoutEnergy: result.frontierWithoutEnergy,
    collectionOnlyFrontier: result.collectionOnlyFrontier, solutions: result.solutions };
});

// Explicit availability guards and actual tool effect; these do not imply useful terminal decisions.
let atFork = travel(createTrip('rain-valley'), 'r0');
equal(getRoutes(atFork).find(e => e.id === 'r3').missingTool, 'rope');
rejects(() => travel(atFork, 'r3'));
atFork = travel(createTrip('rain-valley', ['rope']), 'r0');
equal(travel(atFork, 'r3').energy, 9);
atFork = travel(createTrip('rain-valley', ['map']), 'r0');
equal(getRoutes(atFork).find(e => e.id === 'r2').cost, 3);
atFork = travel(createTrip('rain-valley', ['cape']), 'r0');
equal(getRoutes(atFork).find(e => e.id === 'r5').cost, 1);
atFork = travel(createTrip('rain-valley', ['tea']), 'r0');
const teaTrip = travel(atFork, 'r2'); equal(teaTrip.energy, 9); equal(teaTrip.teaUsed, true);
let noEnergy = copy(atFork); noEnergy.energy = 0;
ok(getRoutes(noEnergy).every(e => !e.available), 'tea cannot pay a cost before reaching guest');
rejects(() => travel(noEnergy, 'r2'));

const report = { date: '2026-10-13', label: 'Route A first frozen finite model',
  methodology: 'Exhaustive all 39 legal loadouts and all tool-enabled paths in three fixed DAGs; no human fun claim; terminal energy excluded from primary dominance; guest identities compared separately for basket dominance.',
  assertions, totalSuccessfulSolutions: results.reduce((sum, r) => sum + r.successfulSolutions, 0), results };
writeFileSync(new URL('./route-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n', 'utf8');

const lines = [
  '# 路线 A：四格行囊规则对照实验（首版冻结）',
  '',
  '日期：2026-10-13。结论：**首版未证明有意义的行囊准备，不建议据此进入正式游戏制作。** 数值模型运转正确，但规则选择失败：三例所有不带篮的结算，均能被「只带采集篮」的同客人结算提高采集量；其余工具节省的精力在回家后没有用途。',
  '',
  '这是一份穷举规则报告，不是真人体验结论。没有用客人名字、纪念物名字或剩余精力人为制造额外价值维度。模型已原样冻结，只修正了枚举统计中等价方案计数的实现，不改路线成本、工具或奖励。',
  '',
  '## 最小规则与产品边界',
  '',
  '- 四格行囊，六件公开工具，每件最多一件，每趟自由选；不收费、不升级数值。',
  '- 全地图、每段代价、工具条件、固定奖励均预先可见。没有战斗、随机事件、时间经济或需要等待恢复的体力。',
  '- 每例一个主收信人，两个互斥的可选客人，另有无会客的采集支线。回家前送达主信，空包总有安全主路。',
  '- 精力仅是这趟旅行的预算；回家后余力不变成奖励。模型每趟实际 2–5 段，不强制点击 15 次，15 仅作上限。',
  '- 每到新地点获得公开采集和纪念物；可以逐步撤销，恢复精力、工具使用、访问和奖励。没有惩罚性丢失。',
  '- 这是单趟纯函数模型。JSON 可精确续局，尚无长期总存档、导入清洗或解锁系统。permanent 字段只表示本趟可带回结果，并未实现跨趟合并；deliveredTo 的 post 是案例内 ID，正式存档需命名空间。',
  '',
  '| 工具 | 格数 | 本趟规则 |',
  '|---|---:|---|',
  ...TOOLS.map(t => `| ${t.name} | ${t.slots} | ${t.description} |`),
  '',
  '## 穷举结果',
  '',
  '每例枚举所有 64 个工具子集中的 39 个容量合法行囊，再遍历全部可走路径。独立忽略精力，仅按工具条件数图上的路径，所得数量与实际成功归家数完全相同：本版精力没有排除任何工具已允许的路径。',
  '',
  '| 案例 | 初始精力 | 合法行囊 | 图上允许路径＝成功归家 | 卡住 | 实际段数 | 去掉余力后的结果（见人,采集） |',
  '|---|---:|---:|---:|---:|---|---|',
  ...results.map(r => `| ${r.name} | ${r.energy} | ${r.loadouts} | ${r.successfulSolutions} | ${r.deadEnds} | ${r.minSteps}–${r.maxSteps} | ${r.examples.map(e => `(${e.outcome.visits},${e.outcome.collection})`).join(' / ')} |`),
  '',
  '「见人」含主收信人；全部成功方案必有 1，见到可选客人变成 2。这只是一种可审计的结果计数，不代表同等重要的长期收益。去掉会客这一尚未落实后续规则的维度，只以采集比较，每例只剩一类最优结果。',
  '',
  '## 三例逐段可追踪解',
  '',
];
for (const r of results) {
  lines.push(`### ${r.name}`, '', `初始精力 ${r.energy}；以下两种路线都仅带「采集篮」占 2 格。因此这里能证明路线分支有不同结果，**不能证明准备行囊有机会成本**。`, '');
  for (const [i, e] of r.examples.entries()) {
    lines.push(`**解 ${i + 1}：${e.routeNames.join(' → ')}**`, '',
      `工具：${toolNames(e.tools)}；总支出 ${e.totalEnergySpent}，恢复 ${e.totalEnergyRestored}，归家余力 ${e.outcome.energyLeft}。主信已送达，可选客人：${e.outcome.guestId || '无'}；采集 ${e.outcome.collection}，纪念物：${e.outcome.keepsake || '无'}。`, '',
      '| 路段 | 边 ID | 支出 | 精力（前→后） | 本段采集 |', '|---|---|---:|---|---:|',
      ...e.log.map(l => `| ${l.from} → ${l.to} | ${l.edgeId} | ${l.cost} | ${l.energyBefore} → ${l.energyAfter} | ${l.collectionGained} |`), '');
  }
  lines.push(`两位客人的最大采集：${Object.entries(r.maxCollectionByGuest).map(([g, v]) => `${g}=${v}`).join('，')}。只有名字不同、未实现规则收益时，较少采集的一位不能自动被算作等价策略。`, '');
}
lines.push('## 为什么判定失败，而不是把六件工具包装成六种玩法', '',
  '1. **预算没有咬合。** 无工具也能走完所有普通支线。地图、雨披、热茶与捷径确实改变支付数字，但这些数字没有牵动后续可达性或可带回结果。',
  '2. **篮子是唯一直接改善结算的工具。** 所有非支配方案都带篮，且全部关键结果只带篮就能实现；剩余两格放什么不影响本版的永久结果。这不是四格准备。',
  '3. **会客多与采集多是人为公开分叉，但尚非持久成长。** 两种路线的坐标确实互不支配；如果会客没有后续不同规则或有价值的表达成果，这个维度并未说明玩家为何会再次选择它。',
  '4. **第二个客人尚是收藏标签。** 每例两条会客支线的采集并不相等；忽略名字后，一条被另一条压倒。分别计 guestId 只能保存差别，不能证实差别有游戏价值。',
  '5. **已知地图解决后可能是重复点最优路径。** 没有新增状态需求或横向规则约束，本版不能回答第 7 天为什么继续玩。', '',
  '## 下一次若继续，只做一个受控反证实验', '',
  '先选一张地图，不增加系统、文本量、随机事件或工具数。只改公开成本或一处确实有后续用途的奖励，保留空包主信路线；要求一条有价值的会客路线必须占用至少三个工具格，而高采集路线需要篮子及另一组真实通达条件，才能检验四格互相挤占。再次穷举，并把余力、客人标签去掉重验。', '',
  '在验证前不把这个建议写入当前模型，也不预言一定成功。若改成本后只是固定两套答案轮流照抄，仍不足以支撑长线游戏；应缩成有限短篇旅行，或回到核心循环选择。', '',
  '## 可复现性与实现验收', '',
  `运行：\`node .playwright-mcp/game-lab/route-experiment.mjs\`。本次 ${assertions} 条断言、${report.totalSuccessfulSolutions} 条完整可追踪送信归家方案，覆盖公开预览与实付一致、不可变输入、精力边界、工具门槛、互斥客人、热茶一次、撤销、JSON 续局和终局关闭。`, '',
  '统计所有允许路径的独立图遍历证明本版没有精力排除路径。失败结论来源于结算支配关系，不来源于断言数量。没有进行速度/满意度/留存用户测试，也没有宣称真人好玩。', '',
  '源码：route-prototype.mjs；复现脚本：route-experiment.mjs；完整逐段原始结果：route-results.json。全部为本地规则实验，不部署、不接入正式网站。', '',
  '## 浏览器接线 API', '',
  '- TOOLS：id、name、slots、description。CASES：id、name、energy、description、nodes、edges。',
  '- node：id、name、kind、collection、guestId、keepsake；kind=camp/junction/gather/guest/delivery/home。',
  '- edge：id、from、to、baseCost、terrain、requires；地形 plain/forest/rain/cliff/tunnel；requires 为 null/rope/lantern。',
  '- createTrip(caseId, toolIds) → 新状态。getRoutes(trip) → 当前可选边（含不可用说明），额外 cost、available、missingTool、affordable、energyAfter、reason、reward。',
  '- reward：delivery、visits、collection、guestId、keepsake、energyRestore。注意不可用路线的 energyAfter 是试算，不应当成实际状态。',
  '- travel(trip, edgeId) → 新状态；非法走法抛错。undoTrip(trip) → 精确前态。getOutcome(trip) → 当前/终局结果。',
  '- enumerateCase(caseId) → 所有合法行囊路径、死路、含余力 frontier、去余力 frontierWithoutEnergy、只采集 collectionOnlyFrontier。等价结果不因人物名字或不同路径重复计为新策略。', '',
);
writeFileSync(new URL('./route-report.md', import.meta.url), lines.join('\n'), 'utf8');
console.log(JSON.stringify({ assertions, totalSuccessfulSolutions: report.totalSuccessfulSolutions,
  cases: results.map(r => ({ id: r.caseId, solutions: r.successfulSolutions, noEnergyFrontier: r.examples.map(e => [e.outcome.visits, e.outcome.collection]), basketDominatesSameGuest: r.basketDominatesSameGuest })),
  report: fileURLToPath(new URL('./route-report.md', import.meta.url)) }, null, 2));
