import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldGuide } from '../src/field-guide.js';
import { setLanguage } from '../src/i18n.js';
import { SPECIAL_ENEMIES, BOSS_DEFINITIONS } from '../src/monsters.js';
import { BOSS_POOLS } from '../src/engine.js';

test('bilingual guide describes twenty real normal species and all ten distinct bosses; offspring excluded', () => {
  setLanguage('zh-CN'); const zh = fieldGuide();
  const normals = zh.filter(e => !e.boss), bosses = zh.filter(e => e.boss);
  assert.equal(normals.length, 20); assert.equal(bosses.length, 10);
  assert.equal(new Set(zh.map(e => e.id)).size, 30);
  assert.deepEqual(normals.map(e => e.id).sort(), ['slime','shooter','charger','caster','sniper','orbiter','brood','meteor', ...Object.keys(SPECIAL_ENEMIES)].sort());
  assert.deepEqual(bosses.map(e => e.id).sort(), Object.keys(BOSS_DEFINITIONS).sort());
  assert.deepEqual(BOSS_POOLS.flat().sort(), bosses.map(e => e.id).sort());
  for (const e of zh) { assert.match(e.name, /\p{Script=Han}/u); assert.match(e.description, /\p{Script=Han}/u); }
  setLanguage('en'); const en = fieldGuide();
  assert.deepEqual(en.map(e => e.id), zh.map(e => e.id));
  for (const e of en) { assert.doesNotMatch(e.name + e.description, /\p{Script=Han}/u); assert.ok(e.description.length > 20); }
  assert.equal(new Set(en.map(e => e.description)).size, 30);
  setLanguage('zh-CN');
});
