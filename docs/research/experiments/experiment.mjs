/** Run: node .playwright-mcp/game-lab/experiment.mjs [--quick]
 * Writes only experiment-results.json / experiment-report.md alongside this file.
 * This is a rules experiment, not a claim about player enjoyment or retention.
 */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRun, getOptions, preview, place, undo, reroll, getGoals, getResult,
  boardAfter, neighbors, SCENARIOS, GOALS, TILE_TYPES } from './prototype.mjs';

const quick = process.argv.includes('--quick');
const SEEDS = quick ? 10 : 100;
const RANDOM_REPEATS = quick ? 2 : 20;
const ROOT = new URL('./', import.meta.url);
const types = TILE_TYPES.map(tile => tile.id);
const average = values => values.reduce((a, b) => a + b, 0) / (values.length || 1);
const sum = values => values.reduce((a, b) => a + b, 0);
const full = goals => goals.filter(goal => goal.complete).length;
const quality = goals => full(goals) * 4 + sum(goals.map(goal => goal.progress));
const rng = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const round = n => Math.round(n * 1000) / 1000;

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value); Object.values(value).forEach(freeze);
  }
  return value;
}

function assertions() {
  let checks = 0;
  const check = fn => { fn(); checks++; };
  check(() => assert.deepEqual(neighbors(4), [9, 3]));
  check(() => assert.deepEqual(neighbors(0), [1, 5]));
  check(() => assert.throws(() => createRun(-1)));
  check(() => assert.throws(() => createRun(1, 'unknown')));
  for (const scenario of SCENARIOS) {
    const initial = freeze(createRun(42, scenario.id));
    check(() => assert.equal(getOptions(initial).legalCells.length, 4));
    const card = initial.hand[0].id; const cell = getOptions(initial).legalCells[0];
    const prediction = preview(initial, card, cell);
    check(() => assert.equal(prediction.ok, true));
    const moved = place(initial, card, cell);
    check(() => assert.deepEqual(getGoals(moved), prediction.goals));
    check(() => assert.deepEqual(undo(moved), initial));
    check(() => assert.deepEqual(place(undo(moved), card, cell), moved));
    const redrawn = reroll(initial);
    check(() => assert.deepEqual(undo(redrawn), initial));
    check(() => assert.deepEqual(reroll(undo(redrawn)), redrawn));
    check(() => assert.throws(() => reroll(reroll(redrawn))));
    check(() => assert.throws(() => undo(initial)));
    check(() => assert.throws(() => place(initial, 'fake', cell)));
    check(() => assert.throws(() => place(initial, card, 12)));
    check(() => assert.equal(preview(initial, card, -1).ok, false));
    let live = initial;
    for (let turn = 0; turn < 12; turn++) {
      const options = getOptions(live);
      check(() => assert.ok(options.legalCells.length > 0));
      const reloaded = JSON.parse(JSON.stringify(live));
      const id = live.hand[0].id; const target = options.legalCells[0];
      check(() => assert.deepEqual(place(reloaded, id, target), place(live, id, target)));
      live = place(live, id, target);
    }
    check(() => assert.equal(getOptions(live).done, true));
    check(() => assert.equal(getOptions(live).legalCells.length, 0));
    check(() => assert.throws(() => place(live, live.hand[0].id, 24)));
    check(() => assert.equal(undo(live).turn, 11));
    for (let i = 0; i < 12; i++) live = undo(live);
    check(() => assert.deepEqual(live, initial));
    // The accessible component must contain > 12 empty spaces. A connected placed
    // subset cannot lose all boundary cells before filling the whole component.
    const seen = new Set([12]); const queue = [12];
    while (queue.length) for (const cell of neighbors(queue.shift())) {
      if (!seen.has(cell) && initial.board[cell] !== 'blocked') { seen.add(cell); queue.push(cell); }
    }
    check(() => assert.ok(seen.size >= 13));
  }
  const conflict = createRun(1, 'normal');
  conflict.board[7] = 'moss'; conflict.board[11] = 'moss'; conflict.board[17] = 'flower';
  conflict.hand[0].type = 'stone';
  const changed = preview(conflict, conflict.hand[0].id, 13);
  check(() => assert.deepEqual(changed.completed, ['dragonfly']));
  check(() => assert.deepEqual(changed.lost, ['frog']));
  check(() => assert.deepEqual(undo(place(conflict, conflict.hand[0].id, 13)), conflict));
  conflict.board[0] = 'water'; conflict.board[1] = 'moss'; conflict.board[5] = 'moss';
  check(() => assert.deepEqual(preview(conflict, conflict.hand[0].id, 13).lost, []));
  return checks;
}

function candidates(run) {
  const moves = [];
  for (const card of run.hand) for (const cell of getOptions(run).legalCells) {
    const next = boardAfter(run, card.id, cell); const goals = getGoals(next);
    moves.push({ cardId: card.id, type: card.type, cell, goals, score: quality(goals) });
  }
  return moves;
}

// These arrangements are intentionally simple constructive counterexamples:
// all three targets fit within 6–7 placements, before the 12-turn budget ends.
const STENCILS = {
  teaching: { 7: 'moss', 11: 'moss', 17: 'flower', 22: 'flower', 18: 'bush', 19: 'log', 13: 'moss' },
  normal: { 7: 'moss', 11: 'moss', 17: 'water', 22: 'flower', 16: 'stone', 10: 'log', 5: 'moss' },
  conflict: { 7: 'flower', 11: 'stone', 2: 'flower', 1: 'bush', 10: 'stone', 5: 'log' },
};

function transform(index, symmetry) {
  let x = index % 5; let y = Math.floor(index / 5);
  if (symmetry >= 4) x = 4 - x;
  for (let i = 0; i < symmetry % 4; i++) [x, y] = [4 - y, x];
  return y * 5 + x;
}

function stencilFor(run) {
  for (let symmetry = 0; symmetry < 8; symmetry++) {
    const stencil = Object.fromEntries(Object.entries(STENCILS[run.scenario]).map(([i, type]) => [transform(Number(i), symmetry), type]));
    if (Object.keys(stencil).some(i => run.board[i] === 'blocked')) continue;
    const board = run.board.slice(); Object.entries(stencil).forEach(([i, type]) => { board[i] = type; });
    if (full(getGoals({ ...run, board })) === 3) return stencil;
  }
  throw new Error(`固定模板无法移植：${run.scenario}`);
}

function stencilMove(run, moves, stencil) {
  const direct = moves.filter(move => stencil[move.cell] === move.type);
  if (direct.length) return { move: direct[0], gain: true };
  const filler = moves.filter(move => {
    if (Object.hasOwn(stencil, move.cell)) return false;
    const board = run.board.slice(); board[move.cell] = move.type;
    for (const [i, type] of Object.entries(stencil)) board[i] = type;
    return full(getGoals({ ...run, board })) === 3;
  });
  return { move: filler[0] || moves[0], gain: false, deviated: filler.length === 0 };
}

function twoStep(run, moves, random) {
  // No hidden bag or replacement draw is read. Only currently visible remaining
  // cards are considered, so this is planning under public information.
  const ranked = moves.map(move => ({ ...move, tie: random() })).sort((a, b) => b.score - a.score || a.tie - b.tie).slice(0, 12);
  for (const move of ranked) {
    const next = boardAfter(run, move.cardId, move.cell);
    next.turn = run.turn + 1;
    next.hand = run.hand.filter(card => card.id !== move.cardId);
    const following = candidates(next);
    move.lookahead = following.length ? Math.max(...following.map(candidate => candidate.score)) : move.score;
  }
  ranked.sort((a, b) => b.lookahead - a.lookahead || b.score - a.score || a.tie - b.tie);
  return ranked[0];
}

function canonical(board) {
  return Array.from({ length: 8 }, (_, symmetry) => {
    const values = Array(25);
    board.forEach((value, index) => { values[transform(index, symmetry)] = value || '.'; });
    return values.join(',');
  }).sort()[0];
}

function visibleShortage(run, seenCards) {
  const available = Object.fromEntries(types.map(type => [type, 0])); available.water = 1;
  for (const type of seenCards.values()) available[type]++;
  const minimum = Object.fromEntries(types.map(type => [type, 0]));
  for (const id of SCENARIOS.find(map => map.id === run.scenario).goals) {
    const goal = GOALS.find(item => item.id === id);
    const need = { ...goal.needs }; need[goal.center] = (need[goal.center] || 0) + 1;
    for (const [type, count] of Object.entries(need)) minimum[type] = Math.max(minimum[type], count);
  }
  // These two patterns require incompatible water anchors.
  if (run.scenario === 'normal') minimum.water = 2;
  return types.filter(type => available[type] < minimum[type]);
}

function simulate(seed, scenario, strategy, repetition = 0) {
  let run = createRun(seed, scenario); const random = rng((seed ^ 0xa511e9b3 ^ Math.imul(repetition + 1, 2654435761)) >>> 0);
  const seenCards = new Map(); const everMet = new Set(); const trace = [];
  let noLegal = 0; let losses = 0; let firstFullTurn = null; let lastFullStart = null; let deviated = false;
  let choiceTurns = 0; let partialChoiceTurns = 0; let sequentialNoGain = 0;
  const stencil = strategy === 'template' ? stencilFor(run) : null;
  const remember = () => run.hand.forEach(card => seenCards.set(card.id, card.type));
  remember();
  while (run.turn < 12) {
    const options = getOptions(run); if (!options.legalCells.length) { noLegal++; break; }
    const before = getGoals(run); let move;
    if (strategy === 'random') {
      if ((run.turn === 3 || run.turn === 8) && run.rerollsLeft) { run = reroll(run); remember(); }
      const card = run.hand[Math.floor(random() * run.hand.length)];
      move = { cardId: card.id, type: card.type, cell: options.legalCells[Math.floor(random() * options.legalCells.length)] };
    } else {
      let moves = candidates(run);
      if (strategy === 'template') {
        let decision = stencilMove(run, moves, stencil);
        while (!decision.gain && run.rerollsLeft) {
          run = reroll(run); remember(); moves = candidates(run); decision = stencilMove(run, moves, stencil);
        }
        move = decision.move; deviated ||= Boolean(decision.deviated);
      } else {
        let bestScore = Math.max(...moves.map(item => item.score));
        while (bestScore <= quality(before) && full(before) < 3 && run.rerollsLeft) {
          run = reroll(run); remember(); moves = candidates(run); bestScore = Math.max(...moves.map(item => item.score));
        }
        const sets = new Set(moves.map(item => item.goals.filter(goal => goal.complete).map(goal => goal.id).join(',')));
        if (sets.size > 1) choiceTurns++;
        if (Math.max(...moves.map(item => item.score)) - Math.min(...moves.map(item => item.score)) > .5) partialChoiceTurns++;
        if (strategy === 'lookahead') move = twoStep(run, moves, random);
        else {
          const best = moves.filter(item => item.score === bestScore); move = best[Math.floor(random() * best.length)];
        }
      }
    }
    const predicted = preview(run, move.cardId, move.cell);
    if (predicted.lost.length) losses += predicted.lost.length;
    if (quality(predicted.goals) <= quality(before)) sequentialNoGain++;
    trace.push({ turn: run.turn + 1, type: move.type, cell: move.cell,
      gained: predicted.completed, lost: predicted.lost, score: full(predicted.goals) });
    run = place(run, move.cardId, move.cell); remember();
    for (const goal of getGoals(run)) if (goal.complete) everMet.add(goal.id);
    if (full(getGoals(run)) === 3 && firstFullTurn === null) firstFullTurn = run.turn;
    if (full(getGoals(run)) === 3 && full(before) < 3) lastFullStart = run.turn;
  }
  const result = getResult(run); const footprint = Array(25).fill(null);
  for (const goal of result.goals) if (goal.complete) for (const cell of goal.matchedCells) footprint[cell] = run.board[cell];
  return { seed, scenario, strategy, repetition, score: result.count, won: result.won,
    everScore: everMet.size, losses, firstFullTurn, remainingAfterFirstFull: result.won && firstFullTurn !== null ? 12 - firstFullTurn : null,
    stableTailTurns: result.won ? 12 - lastFullStart : null,
    rerolls: 2 - run.rerollsLeft, noLegal, deviated, choiceTurns, partialChoiceTurns, sequentialNoGain,
    shortage: visibleShortage(run, seenCards), board: run.board,
    canonical: canonical(run.board), habitatCanonical: canonical(footprint), goals: result.goals, trace };
}

function aggregate(rows) {
  const winners = rows.filter(row => row.won);
  return { runs: rows.length, winRate: round(winners.length / rows.length), meanGoals: round(average(rows.map(row => row.score))),
    distribution: [0, 1, 2, 3].map(score => rows.filter(row => row.score === score).length),
    meanFirstFullTurnAmongWinners: winners.length ? round(average(winners.map(row => row.firstFullTurn))) : null,
    meanRemainingAfterFirstFullAmongWinners: winners.length ? round(average(winners.map(row => row.remainingAfterFirstFull))) : null,
    meanStableTailTurnsAmongWinners: winners.length ? round(average(winners.map(row => row.stableTailTurns))) : null,
    meanRerolls: round(average(rows.map(row => row.rerolls))), noLegal: sum(rows.map(row => row.noLegal)),
    meanGoalLosses: round(average(rows.map(row => row.losses))),
    everVisitInflatesWinRate: round(rows.filter(row => row.everScore === 3 && !row.won).length / rows.length),
    completeChoiceTurns: round(average(rows.map(row => row.choiceTurns))),
    partialChoiceTurns: round(average(rows.map(row => row.partialChoiceTurns))),
    visibleCardShortageRuns: rows.filter(row => row.shortage.length).length,
    templateDeviations: rows.filter(row => row.deviated).length,
    uniqueBoardsUpToSymmetry: new Set(rows.map(row => row.canonical)).size,
    uniqueWinningHabitatFootprints: new Set(winners.map(row => row.habitatCanonical)).size,
    goalCompletion: Object.fromEntries((rows[0]?.goals || []).map(goal => [goal.id, round(rows.filter(row => row.goals.find(item => item.id === goal.id).complete).length / rows.length)])),
  };
}

const assertionCount = assertions();
const all = []; const summaries = []; const comparisons = []; const templates = [];
for (const scenario of SCENARIOS) {
  const beginning = createRun(1, scenario.id); const stencil = stencilFor(beginning);
  const board = beginning.board.slice(); Object.entries(stencil).forEach(([index, type]) => { board[index] = type; });
  assert.equal(full(getGoals({ ...beginning, board })), 3);
  templates.push({ scenario: scenario.id, placements: Object.keys(stencil).length, cells: stencil });
  const rows = [];
  for (let seed = 0; seed < SEEDS; seed++) {
    for (let repetition = 0; repetition < RANDOM_REPEATS; repetition++) rows.push(simulate(seed, scenario.id, 'random', repetition));
    for (const strategy of ['greedy', 'template', 'lookahead']) rows.push(simulate(seed, scenario.id, strategy));
  }
  for (const strategy of ['random', 'greedy', 'template', 'lookahead']) {
    summaries.push({ scenario: scenario.id, strategy, ...aggregate(rows.filter(row => row.strategy === strategy)) });
  }
  const paired = Array.from({ length: SEEDS }, (_, seed) => {
    const samples = rows.filter(row => row.seed === seed);
    const baseline = average(samples.filter(row => row.strategy === 'random').map(row => row.score));
    const greedy = samples.find(row => row.strategy === 'greedy');
    const lookahead = samples.find(row => row.strategy === 'lookahead');
    return { seed, greedyMinusRandom: greedy.score - baseline, lookaheadMinusGreedy: lookahead.score - greedy.score };
  });
  comparisons.push({ scenario: scenario.id, meanGreedyAdvantage: round(average(paired.map(p => p.greedyMinusRandom))),
    lookaheadImprovesSeeds: paired.filter(p => p.lookaheadMinusGreedy > 0).map(p => p.seed),
    lookaheadWorsensSeeds: paired.filter(p => p.lookaheadMinusGreedy < 0).map(p => p.seed),
    meanLookaheadAdvantage: round(average(paired.map(p => p.lookaheadMinusGreedy))) });
  all.push(...rows);
  console.log(`${scenario.id}: ${rows.length} runs complete`);
}

const examples = SCENARIOS.flatMap(scenario => {
  const rows = all.filter(row => row.scenario === scenario.id);
  const failed = rows.find(row => row.strategy === 'greedy' && !row.won && row.shortage.length === 0);
  const improved = rows.find(row => row.strategy === 'lookahead' && row.won
    && !rows.find(other => other.seed === row.seed && other.strategy === 'greedy').won);
  const early = rows.filter(row => row.won && row.strategy === 'template').sort((a, b) => a.firstFullTurn - b.firstFullTurn)[0];
  return [failed && { label: '贪心失败但未触发简单缺牌必要条件', ...failed },
    improved && { label: '仅看当前手牌的两步规划胜过贪心', ...improved },
    early && { label: '固定模板提前满足全部目标', ...early }].filter(Boolean);
});
const output = { date: '2026-10-13', experiment: 'ecology-garden-rule-lab-v1', seeds: SEEDS,
  randomRepeatsPerSeed: RANDOM_REPEATS, assertionCount, totalRuns: all.length,
  scope: '规则与启发式程序实验；非真人试玩、非留存测量、非全局可解性证明。',
  summaries, comparisons, constructiveTemplates: templates, examples };
await writeFile(new URL('experiment-results.json', ROOT), JSON.stringify(output, null, 2) + '\n', 'utf8');

let report = `# 12 手生态庭院：规则实验 v1\n\n日期：2026-10-13。运行 ${all.length} 局，${SEEDS} 个共同种子，随机策略每种子重复 ${RANDOM_REPEATS} 次；${assertionCount} 项边界断言通过。只证明程序规则和策略结果，不能证明真人好玩。\n\n## 明确规则\n\n- 5×5，中心水固定，其他障碍按三个场景固定。共六类牌：水、苔、花、灌木、石、倒木。新牌须与现有非障碍地块四邻相接。\n- 每局 12 次摆放，每次三选一；两次整手换牌不耗摆放。牌袋每类三张、共 18 张，洗完再开新袋，种子/余袋/手牌全部进存档。\n- 当前栖地决定当前来访，最终按第 12 手仍同时成立的目标数 0–3 结算。“曾来访”不锁定胜利。放置前预览将达成及将失效的目标。\n- 可以撤销包括换牌在内的既有操作；恢复原牌、余袋、随机状态和换牌次数，重走同一操作得到完全相同牌，不产生无限重抽。\n- 无时钟、产币、饥饿、过期、签到，也没有失利扣除永久进度。本实验没有建立永久奖励经济。\n\n${GOALS.map(goal => `- **${goal.name}：**${goal.description}`).join('\n')}\n\n以上是清晰可测的游戏配方，不作为现实生态知识。\n\n## 策略与公平性\n\n- 随机：从可见牌和合法格独立均匀选取，在第 4、9 次摆放前各换一次手牌。每种子重复 ${RANDOM_REPEATS} 次。\n- 简单贪心：只看当前三张牌，最大化 4×当前达标动物数+三个目标局部进度之和；平局由独立控制器种子决定。没有改善且未全达标时使用换牌。\n- 固定模板：每场景一个手写 6–7 格三目标解，只允许旋转/镜像以避开障碍；优先填模板，缺牌时换牌，其他牌只填不会破坏预定解的空位。该基线专门反驳“地图不同就是策略不同”。\n- 两步规划：在即时评分前 12 个候选中，模拟再放一张当前剩余手牌，比较第二步评分；不读取隐藏余袋或未来补牌。有限宽度启发式，不是最优求解器。\n- 每个种子使用同一初始牌流；不同策略的换牌时机/消耗不同，实际后续可见窗口会不同。这是策略的一部分，但比较不能解释成纯空间规划的因果效应。\n\n## 结果\n\n| 场景 | 策略 | 局数 | 三目标率 | 平均目标 | 胜局首次全齐手 | 胜局全齐稳定尾手 | 无合法格 | 必要供牌不足 |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${summaries.map(row => `| ${row.scenario} | ${row.strategy} | ${row.runs} | ${(row.winRate * 100).toFixed(1)}% | ${row.meanGoals} | ${row.meanFirstFullTurnAmongWinners} | ${row.meanStableTailTurnsAmongWinners} | ${row.noLegal} | ${row.visibleCardShortageRuns} |`).join('\n')}\n\n## 已证明的边界\n\n1. 三张固定图中，中心可达的非障碍连通分量分别有 25、23、21 格；起始占一格，12 手用不完。任何连通已放集合在未填满整个分量前必有空边界，因此合法状态不可能在第 12 手之前无格可放。牌种不限制落格。模拟亦未出现该问题。\n2. 手写模板直接构造教学 ${templates[0].placements} 格、普通 ${templates[1].placements} 格、冲突 ${templates[2].placements} 格三目标布局。它们已通过 getGoals 检查，但发牌顺序不保证任意种子都能照抄。**12 手不是三目标配方本身所需的决定数。**\n3. 一处水先满足青蛙，再向其邻格放石可以使青蛙失效并让蜻蜓成立；预览和撤销已验证。若另外还有合格青蛙栖地，系统不会误报全局失效。\n4. 逐手 JSON 保存/恢复后的同操作与未刷新一致；撤销后重做摆放/换牌完全一致；第 12 手可撤回到第 11 手，不能继续第 13 手。\n5. “必要供牌不足”为保守下界：把本局曾看见的牌与中心水相加，若连单目标所需的最大材料数量都不够，则本局牌流不足；普通图另需至少两处水。下界没触发并不证明按顺序可解。\n\n## 对耐玩性的解释限制\n\n贪心胜随机只能证明按配方放比乱放有效；不能证明有趣。棋盘唯一率包含无关填充格，因此报告也记录胜局栖地足迹，但两者都不代表策略深度。两步策略的改善/退步和具体路线见 JSON；不能用一次有限宽度搜索失败宣称无解。\n\n## 下一步调参\n\n- 先查看固定模板胜率和首次全齐后的填充手数；若模板稳定且剩余多手，优先取消强制凑满 12 手：目标已全齐可随时收尾，或将同一局的最后几手用于玩家自选且真正冲突的新愿望。不要增加纯统计奖励来掩盖空操作。\n- 若失败主要来自供牌而非位置，考虑三选一中固定保留一张“当前目标相关牌”、或允许保留手牌中的指定牌再换其余牌。把“随机全手换牌”与“有代价的指定换牌”做独立对照，再选机制。\n- 若固定模板仍占优，下一轮对“开放空间”“必须复用有限核心区”“目标组合改变”分别实验，不同时叠加新动物和新货币。限制核心区可能增加真实冲突，也可能只增加卡死，必须测。\n- 若规划可解释地改善贪心失败，保存该种子的每手对照给真人试玩；若变化只是多抽到合适牌，不当作规划价值证据。\n- 不在当前三图结果上直接扩写永久成长。先看同一人第二、第三局是否改变方案，再决定可长期保留的作品、主题槽或规则解锁。\n\n## 文件与复跑\n\n运行：\`node .playwright-mcp/game-lab/experiment.mjs\`。快速调试用 \`--quick\`（会覆盖同名结果，请最终使用完整运行）。\n\n- prototype.mjs：浏览器/Node 均可导入的纯函数；不访问 DOM、系统时间、网络或存储。\n- experiment.mjs：边界断言、策略、批量试验与报告生成。\n- experiment-results.json：汇总、成对差值、模板和具体失败/改善/提前完成例。\n\n这是规则草案的否证工具；正式产品是否采用尚未决定。\n`;
report += `\n## 冻结结论与独立审查\n\n当前规则冻结，不通过增加动物、货币或数值升级来包装本轮负结果。固定模板在教学/普通/冲突的三目标率为 ${summaries.filter(row => row.strategy === 'template').map(row => `${(row.winRate * 100).toFixed(0)}%`).join(' / ')}，普通和冲突均高于自适应两步控制器；这比“贪心胜随机”更值得重视。每场景只有 100 个发牌种子，不是 6,900 个独立关卡，地图及三目标组合固定。\n\n- 胜局“首次全齐后剩余手数”和“最后一次全齐后始终保持的尾部手数”已分开记录；后者只表示不再增加目标，不证明装饰本身无乐趣。无胜局时均值为 null。\n- 可回退完整历史，且撤销换牌恢复额度，因此玩家可以先看补牌/换牌再撤销。相同操作不重抽成立，但“只能知道当前三牌”对真人不成立。四种模拟策略均未使用 undo；该便利不直接污染本批算法结果，却是必须接受或另测的规则边界。\n- 局部进度 75% 不是完成概率，也不是离成功只差四分之一。已经被禁忌永久污染的中心仍可能获较高启发分；贪心失败可能反映控制器不够聪明，不能都归因于游戏深度。UI 应显示逐条件对勾。\n- 两步与贪心的平局随机数消耗不同，换牌窗口也不同。本轮只作描述，不能把全部增益归因为前瞻规划。\n- 独立只读审查逐个枚举六配方的 7^4 邻域、共 14,406 组，与独立布尔判定一致；复现了撤销可获知未来牌的边界，确认没有第13手前视、第三次换牌或读取隐藏牌袋。此枚举为审查记录，不混入脚本自身 134 项断言。\n\n具体反例：教学 seed26 的贪心第一手把灌木贴在中心水边，最后刺猬材料齐全却因邻水永远不达标；两步控制器先放苔、把灌木放到远离水的一格，第6手全齐。冲突 seed1 的贪心把花放在 index11，它的两侧障碍和中心水让第二朵花没有位置；两步控制器用 index7→2 的花链，第8手完成三目标。这证明局部位置确有后果，但固定模板仍能绕开大部分变化。\n\n**当前决定：不把这套 12 手模板直接升级为长期养成。** 允许提前收园有明确理由；新的核心区/目标机制只列为后续假设，不在本轮悄悄实现。下一步用另一套行囊与路线规则作对照。\n`;
await writeFile(new URL('experiment-report.md', ROOT), report, 'utf8');
console.log(JSON.stringify({ assertionCount, totalRuns: all.length, output: fileURLToPath(ROOT) }));
