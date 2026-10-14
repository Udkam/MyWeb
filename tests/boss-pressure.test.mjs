import test from 'node:test';
import assert from 'node:assert/strict';
import { step } from '../src/engine.js';
import { BOSS_DEFINITIONS } from '../src/monsters.js';
import { bossFixture, measureBoss, surviveBoss } from './boss-pressure.mjs';

for (const type of Object.keys(BOSS_DEFINITIONS)) {
  test(`${type}: every phase commits its final aim, gives a punish window and respects hit grace`, () => {
    for (const stage of type === 'sovereign' ? [1, 2, 3] : [1, 2]) {
      const { state: s, enemy: e } = bossFixture(type, { stage });
      let previous = {}, finalLocks = 0, recoveries = 0, hits = [], actions = new Set();
      for (let i = 0; i < 20 * 120; i++) {
        // Alternating horizontal motion actively tests that a locked tell does
        // not silently aim again when a player changes direction.
        step(s, { moveX: Math.floor(i / 160) % 2 ? -1 : 1 }, 1 / 120);
        actions.add(e.specialAction);
        if (e.phase === 'windup') {
          assert.equal(e.telegraph.visible, false);
          assert.ok(e.windupMax >= .55, `${type} ${e.specialAction} tell too short`);
          if (e.aimLocked && previous.phase === 'windup' && previous.action === e.specialAction && previous.locked) {
            assert.equal(e.angle, previous.angle, 'Final aim cannot track input');
            assert.equal(e.x, previous.x); assert.equal(e.y, previous.y);
            finalLocks++;
          }
        }
        if (e.phase === 'recover' && previous.phase !== 'recover') {
          assert.ok(e.recoverTime >= .6, `${type} lacks a real punish window`); recoveries++;
        }
        if (e.phase === 'charge' && previous.phase === 'windup') assert.ok(previous.locked, 'A charge releases only after final lock');
        for (const event of s.events) if (event.type === 'player-hit') hits.push(s.time);
        assert.ok(s.enemies.length <= 18); assert.ok(s.bullets.length <= 150); assert.ok(s.hazards.length <= 48);
        for (const value of Object.values(e)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
        previous = { phase: e.phase, action: e.specialAction, locked: e.aimLocked, angle: e.angle, x: e.x, y: e.y };
      }
      assert.ok(finalLocks > 80, `${type} has actual locked frames`);
      assert.ok(recoveries >= 2, `${type} has repeated recovery windows`);
      assert.ok(actions.size >= (type === 'kiln' || type === 'sovereign' && stage === 3 ? 1 : 2));
      for (let i = 1; i < hits.length; i++) assert.ok(hits[i] - hits[i - 1] >= .99, 'One-second damage grace is unchanged');
      assert.equal(e.stage, stage);
    }
  });

  test(`${type}: perimeter running meets real threats, but a six-heart avoidance pilot can survive`, () => {
    for (const stage of type === 'sovereign' ? [1, 2, 3] : [1, 2]) {
      for (const [width, height] of [[1100, 720], [420, 1000]]) {
        const pressure = measureBoss(type, { stage, width, height });
        assert.ok(pressure.threatSeconds >= .5, `${type} stage ${stage} ${width}px never reaches a moving player`);
        assert.ok(pressure.maxBullets <= 150); assert.ok(pressure.maxBodies <= 18);
        const survival = surviveBoss(type, { stage, width, height });
        assert.ok(survival.alive, `${type} stage ${stage} ${width}px lacks measured avoidance margin`);
        assert.ok(survival.time >= 29.9);
      }
    }
  });
}

test('pressure action state is deterministic for the same seed and input stream', () => {
  const a = bossFixture('chronarch', { stage: 2 }), b = bossFixture('chronarch', { stage: 2 });
  for (let i = 0; i < 1800; i++) {
    const input = { moveX: Math.sin(i / 120), moveY: Math.cos(i / 170), dash: i % 240 === 0 };
    step(a.state, input, 1 / 120); step(b.state, input, 1 / 120);
  }
  assert.deepEqual(a.state, b.state);
});
