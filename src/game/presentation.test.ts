import assert from 'node:assert/strict';
import test from 'node:test';
import { createModel, WORLD } from './model';
import { defeatedHeroPose } from './presentation';

test('airborne defeat settles onto the nearest deck without advancing the frozen battle', () => {
  const model = createModel();
  Object.assign(model.hero, { hp: 0, grounded: false, x: 480, y: 180, vy: -80 });
  const frozen = JSON.stringify(model);
  assert.equal(defeatedHeroPose(model.hero, 1500).y, 207);
  assert.equal(JSON.stringify(model), frozen);
  model.hero.x = 350;
  assert.equal(defeatedHeroPose(model.hero, 1500).y, WORLD.floor);
});

test('defeat presentation respects a platform underside and keeps an already grounded body still', () => {
  const hero = createModel().hero;
  Object.assign(hero, { hp: 0, grounded: false, x: 480, y: 250, height: 30, vy: -380 });
  assert.ok(defeatedHeroPose(hero, 100).y >= 249);
  assert.equal(defeatedHeroPose(hero, 1500).y, WORLD.floor);
  Object.assign(hero, { grounded: true, y: 207, vy: 100 });
  assert.deepEqual(defeatedHeroPose(hero, 1500), { x: 480, y: 207 });
});
