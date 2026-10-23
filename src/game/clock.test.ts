import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceFixedClock, resetFixedClock, type FixedClockState } from './clock';
import { createModel, step, snapshot, getContextAction, setPaused, FIXED_MS, WORLD, type Input } from './model';

interface TimedInput {
  atMs: number;
  input: Partial<Input>;
}

/** Record one normal-input route once. Replays never inspect state to choose an input. */
function recordInputTimeline() {
  const model = createModel();
  const timeline: TimedInput[] = [];
  const checkpoints: { tick: number; kind: string; x: number; y: number }[] = [];
  const tick = (input: Partial<Input> = {}) => {
    timeline.push({ atMs: model.tick * FIXED_MS, input: structuredClone(input) });
    step(model, input);
    assert.ok(model.hero.hp > 0, 'normal-input clock fixture must stay alive');
  };
  const until = (condition: () => boolean, limit: number, input: () => Partial<Input> = () => ({})) => {
    for (let i = 0; i < limit && !condition(); i += 1) tick(input());
    assert.ok(condition(), `input route stalled at tick ${model.tick}: hero(${model.hero.x},${model.hero.y},${model.hero.action}) sword(${model.enemies[0]!.x},${model.enemies[0]!.y},${model.enemies[0]!.action},${model.enemies[0]!.actionTime},${model.enemies[0]!.hp}HP)`);
  };

  until(() => model.hero.x >= 135, 100, () => ({ move: 1 }));
  tick({ move: 1, jumpPressed: true });
  until(() => model.hero.grounded, 70, () => ({ move: 1 }));
  assert.equal(model.hero.y, 231, 'jump lands on the actual crate');
  checkpoints.push({ tick: model.tick, kind: 'crate', x: model.hero.x, y: model.hero.y });
  until(() => model.hero.x >= 350, 180, () => {
    const sword = model.enemies[0]!;
    const near = sword.x > model.hero.x && sword.x - model.hero.x < 90;
    return { move: 1, jumpPressed: model.hero.grounded && near,
      dodgePressed: model.hero.grounded && model.hero.y === 255 && near && model.time >= model.hero.dodgeCooldownUntil };
  });
  until(() => model.hero.grounded && model.hero.y === 255, 100);
  until(() => Math.abs(model.enemies[0]!.x - model.hero.x) >= 42
    && Math.abs(model.enemies[0]!.x - model.hero.x) <= 50, 180, () => {
    const gap = model.enemies[0]!.x - model.hero.x;
    return { move: Math.abs(gap) < 42 ? -Math.sign(gap) : Math.abs(gap) > 50 ? Math.sign(gap) : 0 };
  });
  tick({ move: Math.sign(model.enemies[0]!.x - model.hero.x) });
  until(() => model.enemies[0]!.action === 'windup' && model.enemies[0]!.actionTime >= 400, 180);
  tick({ guardPressed: true, guardHeld: true });
  until(() => model.hero.opportunity?.source === 'parry', 12, () => ({ guardHeld: true }));
  assert.equal(model.contextAction.kind, 'shove');
  checkpoints.push({ tick: model.tick, kind: 'parry', x: model.enemies[0]!.x, y: model.enemies[0]!.y });
  const beforeShove = model.enemies[0]!.x;
  tick({ interactPressed: true, contextIntent: getContextAction(model) });
  for (let i = 0; i < 30; i += 1) tick();
  const pushDistance = Math.abs(model.enemies[0]!.x - beforeShove);
  const expectedPush = Math.min(54, beforeShove - 221);
  assert.ok(Math.abs(pushDistance - expectedPush) < 0.001, `actual shove moved ${pushDistance}px, expected ${expectedPush}`);
  assert.ok(model.enemies[0]!.x >= 221, 'the actual pushed body cannot enter the crate');
  checkpoints.push({ tick: model.tick, kind: 'shove', x: model.enemies[0]!.x, y: model.enemies[0]!.y });
  until(() => model.hero.x >= WORLD.right - model.hero.width / 2 - 0.001, 280, () => ({ move: 1,
    jumpPressed: model.hero.grounded && model.hero.x >= 398 && model.hero.x <= 431,
    dodgePressed: model.hero.grounded && model.time >= model.hero.dodgeCooldownUntil
      && model.enemies.some(enemy => enemy.hp > 0 && enemy.x > model.hero.x && enemy.x - model.hero.x < 80) }));
  until(() => model.hero.grounded, 100);
  for (let i = 0; i < 12; i += 1) tick({ move: 1 });
  assert.equal(model.hero.x, WORLD.right - model.hero.width / 2, 'body stays inside the right wall');
  assert.equal(model.hero.y, WORLD.floor, 'walking off the crate lands on the deck');
  checkpoints.push({ tick: model.tick, kind: 'wall', x: model.hero.x, y: model.hero.y });
  return { timeline, checkpoints, pushDistance, final: snapshot(model) };
}

test('30/60/120/144 Hz render slices replay the same timed parry, shove and terrain inputs identically', () => {
  const recorded = recordInputTimeline();
  const totalMs = recorded.timeline.length * FIXED_MS;
  for (const hz of [30, 60, 120, 144]) {
    const model = createModel();
    const clock: FixedClockState = { accumulator: 0 };
    const checkpoints: typeof recorded.checkpoints = [];
    let eventIndex = 0;
    let currentInput: Partial<Input> = {};
    let elapsed = 0;
    let ticks = 0;
    const onTick = () => {
      const simulatedMs = ticks * FIXED_MS;
      while (eventIndex < recorded.timeline.length && recorded.timeline[eventIndex]!.atMs <= simulatedMs + 0.0001) {
        currentInput = recorded.timeline[eventIndex]!.input;
        eventIndex += 1;
      }
      step(model, currentInput);
      ticks += 1;
      const expected = recorded.checkpoints.find(checkpoint => checkpoint.tick === ticks);
      if (expected) {
        const actor = expected.kind === 'parry' || expected.kind === 'shove' ? model.enemies[0]! : model.hero;
        checkpoints.push({ tick: ticks, kind: expected.kind, x: actor.x, y: actor.y });
      }
    };
    while (elapsed < totalMs - 0.0001) {
      const delta = Math.min(1000 / hz, totalMs - elapsed);
      advanceFixedClock(clock, delta, onTick);
      elapsed += delta;
    }
    assert.equal(ticks, recorded.timeline.length, `${hz} Hz must produce the same fixed-tick count`);
    assert.deepEqual(checkpoints, recorded.checkpoints, `${hz} Hz parry/push/collision checkpoints`);
    assert.deepEqual(snapshot(model), recorded.final, `${hz} Hz complete simulation state`);
    assert.ok(clock.accumulator < 0.0001, `${hz} Hz must not accumulate timing drift`);
  }
});

test('a long render frame keeps the existing 100ms cap instead of replaying hidden-tab time', () => {
  const clock: FixedClockState = { accumulator: 0 };
  let ticks = 0;
  assert.equal(advanceFixedClock(clock, 2000, () => { ticks += 1; }), 6);
  assert.equal(ticks, 6);
  assert.ok(clock.accumulator < 0.0001);
  assert.equal(advanceFixedClock(clock, 0, () => { ticks += 1; }), 0);
  assert.equal(advanceFixedClock(clock, -20, () => { ticks += 1; }), 0);
  assert.equal(advanceFixedClock(clock, Number.NaN, () => { ticks += 1; }), 0);
  assert.equal(ticks, 6);
});

test('pause/resume resets the partial tick and keeps world state frozen until fresh playable time arrives', () => {
  const model = createModel();
  const clock: FixedClockState = { accumulator: 0 };
  const tick = () => step(model, { move: 1 });
  let playing = true;
  const frame = (deltaMs: number) => { if (playing) advanceFixedClock(clock, deltaMs, tick); };
  frame(FIXED_MS * 0.75);
  assert.equal(model.tick, 0);
  playing = false;
  setPaused(model, true);
  resetFixedClock(clock);
  const paused = snapshot(model);
  for (let i = 0; i < 300; i += 1) frame(1000 / 60);
  assert.deepEqual(snapshot(model), paused);
  assert.equal(clock.accumulator, 0);
  playing = true;
  setPaused(model, false);
  resetFixedClock(clock);
  frame(FIXED_MS * 0.25);
  assert.equal(model.tick, 0, 'pre-pause remainder cannot trigger a post-resume tick');
  frame(FIXED_MS * 0.75);
  assert.equal(model.tick, 1);
  assert.equal(model.hero.x, 88.5);
  resetFixedClock(clock);
  assert.equal(clock.accumulator, 0);
});
