/** Rule lab only: 12 placements, a 5 × 5 board, no clocks or economy. */
export const TILE_TYPES = Object.freeze([
  { id: 'water', name: '水', color: '#6aadc2' },
  { id: 'moss', name: '苔', color: '#92b77b' },
  { id: 'flower', name: '花', color: '#e5a7a2' },
  { id: 'bush', name: '灌木', color: '#52745b' },
  { id: 'stone', name: '石', color: '#a6a0a0' },
  { id: 'log', name: '倒木', color: '#b28d64' },
]);

// These are game patterns, not claims about real animal ecology.
export const GOALS = Object.freeze([
  { id: 'frog', name: '青蛙', center: 'water', needs: { moss: 2 }, avoids: 'stone', description: '一格水四邻有至少 2 格苔，且不邻石。' },
  { id: 'dragonfly', name: '蜻蜓', center: 'water', needs: { flower: 1, stone: 1 }, avoids: 'bush', description: '一格水四邻同时有花和石，且不邻灌木。' },
  { id: 'butterfly', name: '蝴蝶', center: 'flower', needs: { flower: 1, bush: 1 }, avoids: 'stone', description: '一格花四邻同时有另一格花和灌木，且不邻石。' },
  { id: 'hedgehog', name: '刺猬', center: 'bush', needs: { moss: 1, log: 1 }, avoids: 'water', description: '一格灌木四邻同时有苔和倒木，且不邻水。' },
  { id: 'snail', name: '蜗牛', center: 'log', needs: { moss: 2 }, avoids: 'flower', description: '一格倒木四邻有至少 2 格苔，且不邻花。' },
  { id: 'lizard', name: '蜥蜴', center: 'stone', needs: { stone: 1, log: 1 }, avoids: 'water', description: '一格石四邻同时有另一格石和倒木，且不邻水。' },
]);

export const SCENARIOS = Object.freeze([
  { id: 'teaching', name: '教学：林边初见', blocked: [], goals: ['frog', 'butterfly', 'hedgehog'], description: '开阔庭院，先学会共享花和苔。' },
  { id: 'normal', name: '普通：水边分岔', blocked: [6, 18], goals: ['frog', 'dragonfly', 'snail'], description: '青蛙和蜻蜓不能共用同一格水，需要规划第二处水边。' },
  { id: 'conflict', name: '冲突：石与花', blocked: [6, 8, 16, 18], goals: ['dragonfly', 'butterfly', 'lizard'], description: '花与石会相互干扰，石的栖地又必须避开水。' },
]);

export const SIZE = 5;
export const MAX_TURNS = 12;
const TYPES = TILE_TYPES.map(tile => tile.id);
const copy = value => structuredClone(value);
const occupied = tile => tile !== null && tile !== 'blocked';
const definition = id => GOALS.find(goal => goal.id === id);

export function neighbors(index) {
  if (!Number.isInteger(index) || index < 0 || index >= 25) return [];
  const x = index % 5; const y = Math.floor(index / 5);
  return [y > 0 ? index - 5 : -1, x < 4 ? index + 1 : -1,
    y < 4 ? index + 5 : -1, x > 0 ? index - 1 : -1].filter(cell => cell !== -1);
}

function random(run) {
  run.rng = (Math.imul(run.rng, 1664525) + 1013904223) >>> 0;
  return run.rng / 4294967296;
}

function draw(run) {
  if (!run.bag.length) {
    run.bag = TYPES.flatMap(type => [type, type, type]);
    for (let i = run.bag.length - 1; i > 0; i--) {
      const j = Math.floor(random(run) * (i + 1));
      [run.bag[i], run.bag[j]] = [run.bag[j], run.bag[i]];
    }
  }
  return { id: `c${run.nextCardId++}`, type: run.bag.pop() };
}

export function createRun(seed = 1, scenario = 'teaching') {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('种子须为 uint32。');
  const map = SCENARIOS.find(item => item.id === scenario);
  if (!map) throw new Error('没有这个规则场景。');
  const board = Array(25).fill(null);
  board[12] = 'water'; map.blocked.forEach(index => { board[index] = 'blocked'; });
  const run = { version: 1, seed, scenario, board, hand: [], bag: [], rng: seed,
    nextCardId: 0, turn: 0, rerollsLeft: 2, history: [] };
  run.hand = [draw(run), draw(run), draw(run)];
  return run;
}

function goalStatus(board, goal) {
  let best = { score: 0, complete: false, matchedCells: [], anchor: null, blockedBy: [] };
  const maxScore = 2 + Object.values(goal.needs).reduce((sum, count) => sum + count, 0);
  for (let anchor = 0; anchor < board.length; anchor++) {
    if (board[anchor] !== goal.center) continue;
    const adjacent = neighbors(anchor);
    const blockedBy = adjacent.filter(index => board[index] === goal.avoids);
    let score = 1 + (blockedBy.length ? 0 : 1);
    const matchedCells = [anchor];
    for (const [type, required] of Object.entries(goal.needs)) {
      const matched = adjacent.filter(index => board[index] === type).slice(0, required);
      score += matched.length; matchedCells.push(...matched);
    }
    if (score > best.score) best = { score, complete: score === maxScore,
      matchedCells, anchor, blockedBy };
  }
  const label = type => TILE_TYPES.find(tile => tile.id === type).name;
  const adjacent = best.anchor === null ? [] : neighbors(best.anchor);
  const checks = [
    { label: `中心是${label(goal.center)}`, met: best.anchor !== null },
    ...Object.entries(goal.needs).map(([type, required]) => {
      const count = adjacent.filter(cell => board[cell] === type).length;
      return { label: `四邻${label(type)} ${count}/${required}`, met: count >= required };
    }),
    { label: `不邻${label(goal.avoids)}`, met: best.anchor !== null && best.blockedBy.length === 0 },
  ];
  return { id: goal.id, name: goal.name, description: goal.description, ...best, checks,
    maxScore, progress: best.score / maxScore };
}

export function getGoals(run) {
  return SCENARIOS.find(map => map.id === run.scenario).goals.map(id => goalStatus(run.board, definition(id)));
}

export function getOptions(run) {
  const done = run.turn >= MAX_TURNS;
  return {
    cards: run.hand.map(card => ({ ...card, name: TILE_TYPES.find(tile => tile.id === card.type).name })),
    legalCells: done ? [] : run.board.map((tile, index) => tile === null
      && neighbors(index).some(cell => occupied(run.board[cell])) ? index : -1).filter(index => index !== -1),
    turn: run.turn, remaining: MAX_TURNS - run.turn, done,
    rerollsLeft: run.rerollsLeft, canUndo: run.history.length > 0,
  };
}

function placementError(run, cardId, cellIndex) {
  if (run.turn >= MAX_TURNS) return '12 手已完成，可以撤销再调整。';
  if (!run.hand.some(card => card.id === cardId)) return '这张牌不在当前手牌中。';
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= 25) return '请选择棋盘内的格子。';
  if (run.board[cellIndex] !== null) return '这个格子已经有地貌或障碍。';
  if (!neighbors(cellIndex).some(cell => occupied(run.board[cell]))) return '新地块须与已有地块四邻相接。';
  return '';
}

export function preview(run, cardId, cellIndex) {
  const reason = placementError(run, cardId, cellIndex);
  if (reason) return { ok: false, reason, completed: [], lost: [], goals: getGoals(run) };
  const board = run.board.slice(); board[cellIndex] = run.hand.find(card => card.id === cardId).type;
  const before = getGoals(run); const goals = getGoals({ ...run, board });
  return { ok: true, reason: '', goals,
    completed: goals.filter((goal, i) => goal.complete && !before[i].complete).map(goal => goal.id),
    lost: goals.filter((goal, i) => !goal.complete && before[i].complete).map(goal => goal.id),
  };
}

function beginAction(original) {
  const run = copy(original); const snapshot = copy(original);
  delete snapshot.history; run.history.push(snapshot); return run;
}

export function place(original, cardId, cellIndex) {
  const reason = placementError(original, cardId, cellIndex);
  if (reason) throw new Error(reason);
  const run = beginAction(original);
  const handIndex = run.hand.findIndex(card => card.id === cardId);
  run.board[cellIndex] = run.hand[handIndex].type; run.turn++;
  if (run.turn < MAX_TURNS) run.hand[handIndex] = draw(run);
  else run.hand.splice(handIndex, 1);
  return run;
}

export function reroll(original) {
  if (original.turn >= MAX_TURNS) throw new Error('本局已经结束。');
  if (!original.rerollsLeft) throw new Error('本局的两次换牌已经用完。');
  const run = beginAction(original); run.rerollsLeft--;
  run.hand = [draw(run), draw(run), draw(run)];
  return run;
}

export function undo(original) {
  if (!original.history.length) throw new Error('还没有可撤销的操作。');
  const run = copy(original); const previous = run.history.pop();
  return { ...previous, history: run.history };
}

export function getResult(run) {
  const goals = getGoals(run);
  return { done: run.turn === MAX_TURNS, completed: goals.filter(goal => goal.complete).map(goal => goal.id),
    count: goals.filter(goal => goal.complete).length, total: goals.length,
    won: run.turn === MAX_TURNS && goals.every(goal => goal.complete), goals };
}

/** Cheap evaluation without drawing or cloning history; used only for planning in the lab. */
export function boardAfter(run, cardId, cellIndex) {
  const reason = placementError(run, cardId, cellIndex);
  if (reason) throw new Error(reason);
  const board = run.board.slice(); board[cellIndex] = run.hand.find(card => card.id === cardId).type;
  return { ...run, board };
}
