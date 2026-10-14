import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, step, setWorldSize, snapshot } from '../src/engine.js';
import { createOnboarding } from '../src/onboarding.js';

const DT = 1 / 120;
function advance(state, guide, seconds, input = {}, options = {}) {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    step(state, input, DT);
    guide?.observe(state, options);
  }
}
const copy = value => JSON.parse(JSON.stringify(value));

test('first-room guide observes real movement, shots and dash in order without commanding the world', () => {
  const s = createRun({ seed: 13 });
  const guide = createOnboarding(s);
  assert.deepEqual(guide.status(), { stepId:'move', index:0, complete:false, dismissed:false, progress:0, visible:true });
  advance(s, guide, .1, { moveX:-1 });
  assert.equal(guide.status().stepId, 'move');
  assert.ok(guide.status().progress > 0 && guide.status().progress < 1);
  advance(s, guide, .3, { moveX:-1 });
  assert.equal(guide.status().stepId, 'shoot');
  const shots = s.stats.shots;
  advance(s, guide, DT, { fire:true, aimX:500, aimY:90 });
  assert.equal(s.stats.shots, shots + 1); assert.equal(guide.status().stepId, 'dash');
  advance(s, guide, DT, { dash:true, moveX:1 });
  assert.ok(s.player.dashTime > 0);
  assert.deepEqual(guide.status(), { stepId:null, index:2, complete:true, dismissed:false, progress:1, visible:false });
});

test('real early shots and dash remain credited when their displayed steps come later', () => {
  const s = createRun({ seed: 13 });
  // Walk to the existing room boundary with real input before starting the observer.
  advance(s, null, 3, { moveX:-1 });
  const guide = createOnboarding(s);
  advance(s, guide, DT, { dash:true, moveX:-1, fire:true, aimX:s.player.x, aimY:90 });
  assert.equal(guide.status().stepId, 'move');
  assert.ok(s.player.dashTime > 0 && s.stats.shots > 0);
  advance(s, guide, .2, { moveX:-1 });
  assert.equal(guide.status().stepId, 'move');
  advance(s, guide, .4, { moveX:1 });
  assert.equal(guide.status().complete, true);
});

test('idle simulation, wall-clock repeats and old shot/cooldown baselines do not count as actions', () => {
  const s = createRun({ seed: 3 });
  advance(s, null, DT, { dash:true, moveX:-1, fire:true, aimX:50, aimY:100 });
  const guide = createOnboarding(s);
  for (let i=0; i<30; i++) guide.observe(s);
  assert.equal(guide.status().progress, 0);
  advance(s, guide, .05);
  // The inherited dash moves a little, but its existing cooldown is not a new dash.
  assert.equal(guide.status().stepId, 'move');
  advance(s, guide, .5, { moveX:1 });
  assert.equal(guide.status().stepId, 'shoot');
  advance(s, guide, DT, { fire:true, aimX:50, aimY:100 });
  assert.equal(guide.status().stepId, 'dash');
  assert.equal(guide.status().complete, false);
});

test('pause samples hide the guide and do not credit changed position or action counters', () => {
  const s = createRun({ seed: 2 });
  const guide = createOnboarding(s);
  advance(s, guide, .45, { moveX:-1, fire:true, aimX:100, aimY:100, dash:true }, { paused:true });
  assert.equal(guide.status().visible, false);
  assert.equal(guide.status().stepId, 'move'); assert.equal(guide.status().progress, 0);
  guide.observe(s, { paused:false });
  assert.equal(guide.status().visible, true); assert.equal(guide.status().progress, 0);
  advance(s, guide, .4, { moveX:1 });
  assert.equal(guide.status().stepId, 'shoot');
});

test('noncombat states hide guidance, and entering room two retires it automatically', () => {
  const s = createRun({ seed: 5 });
  const guide = createOnboarding(s);
  const reward = { ...copy(s), phase:'reward', time:1, stats:{ ...s.stats, shots:30 } };
  guide.observe(reward);
  assert.equal(guide.status().visible, false); assert.equal(guide.status().stepId, 'move');
  guide.observe({ ...reward, phase:'combat', room:2 });
  assert.deepEqual(guide.status(), { stepId:null, index:2, complete:true, dismissed:false, progress:1, visible:false });
  assert.equal(createOnboarding({ ...s, room:2 }).status().complete, true);
});

test('portrait/landscape repositioning cannot satisfy the move prompt', () => {
  const s = createRun({ seed: 11 }), guide = createOnboarding(s);
  setWorldSize(s, 390, 1000); guide.observe(s);
  assert.equal(guide.status().progress, 0);
  advance(s, guide, .01); assert.equal(guide.status().progress, 0);
  setWorldSize(s, 1100, 560); advance(s, guide, .01);
  assert.equal(guide.status().progress, 0);
  advance(s, guide, .4, { moveX:-1 }); assert.equal(guide.status().stepId, 'shoot');
});

test('dismissal is immediate, stays dismissed, and writes neither world nor entrance snapshot', () => {
  const s = createRun({ seed: 7 }), before = copy(s), saved = snapshot(s);
  const guide = createOnboarding(s);
  const first = guide.status(); first.index = 2; first.complete = true;
  assert.equal(guide.status().index, 0); assert.equal(guide.status().complete, false);
  guide.observe(s); guide.dismiss(); guide.dismiss();
  assert.deepEqual(s, before); assert.deepEqual(snapshot(s), saved);
  assert.equal(guide.status().dismissed, true); assert.equal(guide.status().visible, false); assert.equal(guide.status().stepId, null);
  advance(s, guide, .6, { fire:true, moveX:-1, dash:true, aimX:500, aimY:100 });
  assert.equal(guide.status().dismissed, true); assert.equal(guide.status().complete, false);
});

test('observing a different run or a malformed world cannot report completed actions', () => {
  const s = createRun({ seed: 6 }), guide = createOnboarding(s);
  const another = createRun({ seed: 7 });
  advance(another, null, .6, { moveX:-1, fire:true, dash:true, aimX:50, aimY:100 });
  guide.observe(another); assert.equal(guide.status().visible, false); assert.equal(guide.status().complete, false);
  guide.observe(null); assert.equal(guide.status().progress, 0);
  assert.doesNotThrow(() => createOnboarding(null).observe({}));
});
