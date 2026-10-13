/** Controlled finite parameter comparison. Does not modify prototype files. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import * as v1 from './route-prototype.mjs';
import * as v2 from './route-v2.mjs';
import * as v3 from './route-v3.mjs';

let assertions = 0;
const equal = (a, b, message) => { assertions++; assert.deepEqual(a, b, message); };
const ok = (condition, message) => { assertions++; assert.ok(condition, message); };
const clone = value => structuredClone(value);
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const coords = outcome => `${outcome.visits}/${outcome.collection}`;
const dominates = (a, b) => a.visits >= b.visits && a.collection >= b.collection && (a.visits > b.visits || a.collection > b.collection);
const prefix = (short, full) => short.every((id, i) => full[i] === id);
const key = s => `${s.tools.join(',')}:${s.path.join(',')}`;
const toolsName = ids => ids.length ? ids.map(id => v3.TOOLS.find(t => t.id === id).name).join('＋') : '空包';

function summarize(model, scenario) {
  const r = model.enumerateCase(scenario.id);
  const efficient = r.solutions.filter(s => !r.solutions.some(t => dominates(t.outcome, s.outcome)));
  const targets = [...new Set(efficient.map(s => coords(s.outcome)))];
  const packages = [...new Set(r.solutions.map(s => s.tools.join(',')))];
  const universalPackages = packages.filter(pack => targets.every(target => r.solutions.some(s => s.tools.join(',') === pack && coords(s.outcome) === target)));
  return { id: scenario.id, energy: scenario.energy, solutions: r.solutions.length, deadEnds: r.deadEnds.length,
    frontier: targets, universalPackages, preparationTradeoff: targets.length >= 2 && universalPackages.length === 0,
    examples: r.frontierWithoutEnergy, efficientPackages: [...new Set(efficient.map(s => s.tools.join(',')))],
    raw: r, efficient };
}

const budgetScan = [];
for (const scenario of v1.CASES) {
  const original = scenario.energy;
  const rows = [];
  for (let energy = 5; energy <= original; energy++) {
    scenario.energy = energy;
    const r = summarize(v1, scenario);
    rows.push({ energy, solutions: r.solutions, deadEnds: r.deadEnds, frontier: r.frontier, universalPackages: r.universalPackages, preparationTradeoff: r.preparationTradeoff });
  }
  scenario.energy = original;
  budgetScan.push({ id: scenario.id, rows });
}

const versionResults = {};
const safetyTests = {};
for (const [version, model] of [['v2', v2], ['v3', v3]]) {
  versionResults[version] = model.CASES.map(scenario => summarize(model, scenario));
  let rawStates = 0, checkedRoutes = 0, unsafeAffordable = 0, safeDeadEnds = 0;
  for (const summary of versionResults[version]) {
    const loadouts = [];
    for (let mask = 0; mask < 2 ** model.TOOLS.length; mask++) {
      const tools = model.TOOLS.filter((_, i) => mask & (1 << i));
      if (tools.reduce((sum, tool) => sum + tool.slots, 0) <= 4) loadouts.push(tools.map(t => t.id));
    }
    equal(loadouts.length, 39);
    const safeSolutions = [];
    for (const tools of loadouts) {
      const terminalPaths = summary.raw.solutions.filter(s => s.tools.join(',') === tools.join(',')).map(s => s.path);
      const rawWalk = trip => {
        rawStates++;
        freeze(trip);
        equal(model.canFinish(trip), terminalPaths.some(path => prefix(trip.path, path)), 'canFinish equals exhaustive terminal-prefix proof');
        for (const route of model.getRoutes(trip)) {
          checkedRoutes++;
          const expectedSafe = Boolean(route.available && terminalPaths.some(path => prefix([...trip.path, route.id], path)));
          equal(route.safeAvailable, expectedSafe, 'safeAvailable neither hides a valid continuation nor invents one');
          if (route.available && !route.safeAvailable) { unsafeAffordable++; ok(Boolean(route.unsafeReason), 'dead prefix has explicit reason'); }
          if (!route.available) continue;
          const next = model.travel(trip, route.id);
          equal(next.energy, route.energyAfter, 'preview energy accurate');
          equal(next.collection - trip.collection, route.reward.collection, 'preview collection accurate');
          equal(model.undoTrip(next), trip, 'undo restores precise state');
          equal(model.travel(JSON.parse(JSON.stringify(trip)), route.id), next, 'JSON save resumes identical transition');
          ok(next.energy >= 0 && next.guests.length <= 1);
          rawWalk(next);
        }
      };
      const safeWalk = trip => {
        if (trip.done) { ok(trip.delivered); safeSolutions.push({ tools, path: trip.path }); return; }
        const routes = model.getRoutes(trip).filter(r => r.safeAvailable);
        if (!routes.length) safeDeadEnds++;
        for (const r of routes) safeWalk(model.travel(trip, r.id));
      };
      rawWalk(model.createTrip(summary.id, tools));
      safeWalk(model.createTrip(summary.id, tools));
    }
    equal(safeSolutions.map(key).sort(), summary.raw.solutions.map(key).sort(), 'safe filtering preserves every successful preparation/path');
    const noRope = summary.raw.solutions.filter(s => !s.tools.includes('rope'));
    const noRopeEfficient = noRope.filter(s => !noRope.some(t => dominates(t.outcome, s.outcome)));
    summary.noRope = { packages: loadouts.filter(t => !t.includes('rope')).length, solutions: noRope.length,
      frontier: [...new Set(noRopeEfficient.map(s => coords(s.outcome)))],
      sameGuestMaxPreserved: [null, ...model.CASES.find(c => c.id === summary.id).nodes.filter(n => n.guestId).map(n => n.guestId)]
        .every(guest => Math.max(...summary.raw.solutions.filter(s => s.outcome.guestId === guest).map(s => s.outcome.collection)) === Math.max(...noRope.filter(s => s.outcome.guestId === guest).map(s => s.outcome.collection))) };
    equal(summary.noRope.frontier.slice().sort(), summary.frontier.slice().sort(), 'removing rope preserves useful primary result coordinates');
  }
  equal(safeDeadEnds, 0, 'safeAvailable never strands a fresh legal loadout');
  safetyTests[version] = { rawStates, checkedRoutes, unsafeAffordable, safeDeadEnds };
}

// The rejected initial dusk v3 estimate is retained as evidence, then restored.
const dusk = v3.CASES.find(c => c.id === 'dusk-woods');
dusk.energy = 8;
const rejectedDusk8 = summarize(v3, dusk);
dusk.energy = 9;
const rejectedEstimate = { energy: 8, solutions: rejectedDusk8.solutions, deadEnds: rejectedDusk8.deadEnds,
  frontier: rejectedDusk8.frontier, universalPackages: rejectedDusk8.universalPackages,
  reason: 'Maximum gather route requires 1+2+2+3+1=9 even with basket/map/cape.' };

const toolEffects = v3.TOOLS.map(tool => {
  const efficientWitnesses = [], localWitnesses = [], removalEffects = [];
  for (const summary of versionResults.v3) {
    const without = summary.raw.solutions.filter(s => !s.tools.includes(tool.id));
    const withoutEfficient = without.filter(s => !without.some(t => dominates(t.outcome, s.outcome)));
    removalEffects.push({ id: summary.id, frontier: [...new Set(withoutEfficient.map(s => coords(s.outcome)))],
      losesGlobalCoordinate: summary.frontier.some(coord => !without.some(s => coords(s.outcome) === coord)) });
    for (const solution of summary.raw.solutions.filter(s => s.tools.includes(tool.id))) {
      const remaining = solution.tools.filter(id => id !== tool.id).join(',');
      const alternatives = without.filter(s => s.tools.join(',') === remaining);
      const resultLost = !alternatives.some(s => s.outcome.guestId === solution.outcome.guestId && s.outcome.collection >= solution.outcome.collection);
      if (resultLost && !localWitnesses.some(w => w.id === summary.id)) localWitnesses.push({ id: summary.id, tools: solution.tools, path: solution.path, outcome: solution.outcome });
      if (resultLost && summary.efficient.includes(solution) && !efficientWitnesses.some(w => w.id === summary.id)) efficientWitnesses.push({ id: summary.id, tools: solution.tools, path: solution.path, outcome: solution.outcome });
    }
  }
  return { tool: tool.id, name: tool.name, localWitnesses, efficientWitnesses, removalEffects,
    recommendation: efficientWitnesses.length ? '可保留为有效准备选项；不等于不可删除' : '删除候选：当前有效前沿没有贡献' };
});

const serializable = summaries => summaries.map(({ raw, efficient, ...rest }) => rest);
const output = { date: '2026-10-13', assertions, methodology: 'Exhaustive finite comparison; terminal energy excluded; safe-prefix test against all completed paths; no human fun or retention claim.',
  budgetScan, v2: serializable(versionResults.v2), v3: serializable(versionResults.v3), rejectedEstimate, safetyTests, toolEffects };
writeFileSync(new URL('./route-comparison-results.json', import.meta.url), JSON.stringify(output, null, 2) + '\n', 'utf8');

const scanLines = ['## 只改总精力的完整扫描', '', '| 图 | 精力 | 前沿（见人/采集） | 覆盖全部前沿的行囊数 | 准备取舍成立 |', '|---|---:|---|---:|---|'];
for (const entry of budgetScan) for (const row of entry.rows) scanLines.push(`| ${entry.id} | ${row.energy} | ${row.frontier.join('、')} | ${row.universalPackages.length} | ${row.preparationTradeoff ? '是' : '否'} |`);
const sharedLimits = ['## 解释边界', '',
  '这里的「成立」仅指：至少两种去掉余力后的结果坐标互不支配，且没有一个合法行囊能通过改走另一条路取得全部前沿。它证明容量开始限制准备，不证明有趣、耐玩或长期成长。', '',
  '篮子仍是所有主前沿的共同核心，实际取舍主要发生在剩余两个格子。会客与采集的长期用途未实现；若会客只有标签，采集才有实质用途，则这些二维前沿不能自动成立为玩家价值。继续开发前需把至少一种会客反馈做成不同规则或有价值的永久表达，再让人实玩，而不是给名字加分。', '',
  '跨图准备仍有模板风险：三张图均可用「篮＋地图＋茶」取得最多会客的主前沿，用「篮＋地图＋雨披」取得最多采集的主前沿。三图没有万能单包，不等于三图迫使玩家重新思考准备；当前可能只需记住两套套餐。有限内容与长期耐玩须分开判断。', '',
  '两位客人不能只按身份算成两种策略；本报告的主前沿把身份合并为见人数，同客人比较则只用于审计删工具是否抹掉不同地点的最好结果。所有奖励是候选本趟结果，尚未写入长期存档。', '',
  'safeAvailable 只给信息，不改变模型 travel 的支付规则。UI 可以禁止 unsafe 分支；安全证明保留全部成功路径，仍允许撤销。它消除了死路惩罚，也会把有限地图显得更接近“出门前选套餐”，这项体验代价需要真实试玩评估。', '',
  `复现：\`node .playwright-mcp/game-lab/route-comparison.mjs\`。本次 ${assertions} 条断言；原始结果见 route-comparison-results.json。未部署，未接入正式存档。`, ''];

writeFileSync(new URL('./route-v2-report.md', import.meta.url), [
  '# 路线 A V2：仅收紧预算的对照', '', '日期：2026-10-13。V1 保留不变。V2 仅把雨谷精力 12→6，另两图保持 V1 失败对照；新增可完成后继预览，不改变局部 available。', '',
  '雨谷的主前沿仍是 (见2,采3) 与 (见1,采8)，但已不存在万能包。会客代表为篮＋地图＋茶；采集代表为篮＋地图＋雨披。两包只替换一个格子，失去的是真实目的地通达性，不是归家后的余力。', '',
  '山坡和暮林单改预算均不能解决：低于阈值只有一个前沿，到达双前沿阈值时篮＋地图＋雨披已同时覆盖。更低于 5 的预算连空包安全主信也不成立；高于原预算只更宽松。', '',
  ...scanLines, '',
  `V2 安全预览核对：${safetyTests.v2.rawStates} 个原规则可达状态、${safetyTests.v2.checkedRoutes} 条候选边；${safetyTests.v2.unsafeAffordable} 次眼前可支付但无成功后继。只走 safeAvailable 后死路 0，所有 442 条成功路径完整保留。`, '',
  ...sharedLimits,
].join('\n'), 'utf8');

const v3Lines = [
  '# 路线 A V3：最小边成本对照', '', '日期：2026-10-13。有限准备取舍已通过模型检验；尚未证明真人好玩或长期成长。V1、V2 均保留作失败对照。', '',
  '## 参数演变', '',
  '- 雨谷：V1 精力 12；V2/V3 精力 6，边成本不变。',
  '- 山坡：V1/V2 精力 12；V3 精力 7，h6 雨路 3→4，h9 普通采集路 3→2，其余不变。',
  '- 暮林：V1/V2 精力 13；V3 长坡 d3 林路 3→5。最初试精力 8 仅得单前沿 (2,3)，因为高采集最低需 9；已保留失败值记录，最终精力 9。', '',
  '| 图 | 精力 | 成功路径 | 只看眼前支付产生的死路 | 前沿（见人/采集） | 万能行囊 |', '|---|---:|---:|---:|---|---:|',
  ...versionResults.v3.map(r => `| ${r.id} | ${r.energy} | ${r.solutions} | ${r.deadEnds} | ${r.frontier.join('、')} | ${r.universalPackages.length} |`), '',
  '## 实际准备与逐段支出', '',
];
for (const r of versionResults.v3) {
  v3Lines.push(`### ${r.id}`, '');
  for (const e of r.examples) v3Lines.push(`- ${toolsName(e.tools)}（${e.slots} 格）：${e.path.join(' → ')}；支出 ${e.log.map(l => l.cost).join('+')}，茶恢复 ${e.log.reduce((s, l) => s + l.energyRestored, 0)}；结果（见人/采集）=${coords(e.outcome)}，余力 ${e.outcome.energyLeft}。`);
  v3Lines.push('', `本图全部有效前沿行囊：${r.efficientPackages.map(p => toolsName(p.split(','))).join('；')}。`, '');
}
v3Lines.push('## 六件工具逐一反证', '', '| 工具 | 去掉后有本趟不同结果的实例 | 参与有效前沿且移除此格会失去结果 | 处理建议 |', '|---|---|---|---|',
  ...toolEffects.map(t => `| ${t.name} | ${t.localWitnesses.map(w => w.id).join('、') || '无'} | ${t.efficientWitnesses.map(w => `${w.id}：${toolsName(w.tools)}`).join('；') || '无'} | ${t.recommendation} |`), '',
  '绳索可能让某个不带篮的小包走到客人，但那些结果被其他合法准备压倒，因此不能用“至少开一条路”掩盖它缺乏有效作用。去掉绳索后重新枚举子集，主前沿及每位客人的最高采集均保留，适合从正式工具栏删除。', '',
  '| 图 | 去绳索合法行囊 | 去绳索成功路径 | 前沿 | 各客人最高采集保留 |', '|---|---:|---:|---|---|',
  ...versionResults.v3.map(r => `| ${r.id} | ${r.noRope.packages} | ${r.noRope.solutions} | ${r.noRope.frontier.join('、')} | ${r.noRope.sameGuestMaxPreserved ? '是' : '否'} |`), '',
  '提灯存在有效前沿中的替代准备，能用夜间捷径换掉另一个格子的需求。它不是每图必选，也不是取得所有前沿所必需：删掉它仍可能保留相同坐标，但会减少真实可行的准备选项。这里不为凑工具数量补规则。', '',
  '## 前缀死路与安全预览', '',
  '以雨谷空包为例：溪口走普通木匠路眼前能付 4，但剩下 1，后续送信与回家还需 4；走草甸也会陷入无成功后继。getRoutes 因此同时返回 available（局部可付）与 safeAvailable（递归证明能送信归家），并显示具体说明。', '',
  `V3 共检查 ${safetyTests.v3.rawStates} 个可达状态、${safetyTests.v3.checkedRoutes} 条候选边；发现 ${safetyTests.v3.unsafeAffordable} 次“眼前可走但后面无解”。safeAvailable 对照完整终局路径的前缀逐条核验，只筛掉无解分支；所有 ${versionResults.v3.reduce((s, r) => s + r.solutions, 0)} 条成功方案完整保留，筛后死路 0。`, '',
  ...sharedLimits,
);
writeFileSync(new URL('./route-v3-report.md', import.meta.url), v3Lines.join('\n'), 'utf8');
console.log(JSON.stringify({ assertions, safetyTests, v3: versionResults.v3.map(r => ({ id: r.id, solutions: r.solutions,
  deadEnds: r.deadEnds, frontier: r.frontier, universalPackages: r.universalPackages, noRope: r.noRope })),
  toolSummary: toolEffects.map(t => ({ tool: t.tool, efficientCases: t.efficientWitnesses.map(w => w.id), recommendation: t.recommendation })) }, null, 2));
