import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, snapshot, restoreRun } from '../src/engine.js';
import { SAVE_KEY, MAX_SAVE_BYTES, createDefaultSave, loadSave, saveSave, parseImport, exportSave } from '../src/storage.js';

function memory(entries = {}) {
  const map = new Map(Object.entries(entries));
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), map };
}
const copy = value => JSON.parse(JSON.stringify(value));

test('default is isolated, load never writes, and other game saves remain untouched', () => {
  const store = memory({ 'mosslight-v1': 'preserve' });
  const empty = loadSave(store);
  assert.equal(empty.status, 'empty');
  assert.equal(store.map.size, 1);
  empty.data.settings.music = false;
  assert.equal(createDefaultSave().settings.music, true);
  const saved = saveSave(empty.data, store);
  assert.equal(saved.status, 'saved');
  assert.equal(saved.data.revision, 1);
  assert.equal(empty.data.revision, 0);
  assert.equal(store.getItem('mosslight-v1'), 'preserve');
  assert.deepEqual(loadSave(store).data, saved.data);
});

test('revision CAS rejects stale tabs without changing their input or shared data', () => {
  const store = memory();
  const first = saveSave(createDefaultSave(), store).data;
  const tabA = copy(first), tabB = copy(first);
  tabA.stats.runs++;
  const savedA = saveSave(tabA, store);
  tabB.settings.sfx = false;
  const raw = store.getItem(SAVE_KEY);
  assert.equal(saveSave(tabB, store).status, 'conflict');
  assert.equal(store.getItem(SAVE_KEY), raw);
  assert.equal(tabB.revision, 1);
  assert.equal(savedA.data.revision, 2);
  store.map.delete(SAVE_KEY);
  assert.equal(saveSave(savedA.data, store).status, 'conflict');
});

test('corrupt existing data is preserved unless explicit replacement matches exact raw', () => {
  const raw = '{broken';
  const store = memory({ [SAVE_KEY]: raw });
  assert.equal(loadSave(store).status, 'corrupt');
  assert.equal(saveSave(createDefaultSave(), store).status, 'corrupt');
  assert.equal(store.getItem(SAVE_KEY), raw);
  assert.equal(saveSave(createDefaultSave(), store, { replace: true }).status, 'conflict');
  assert.equal(saveSave(createDefaultSave(), store, { replace: true, expectedRaw: 'changed' }).status, 'conflict');
  const replaced = saveSave(createDefaultSave(), store, { replace: true, expectedRaw: raw });
  assert.equal(replaced.status, 'saved');
  assert.equal(loadSave(store).status, 'ready');
});

test('confirmed import is monotonic and cannot overwrite a change after confirmation', () => {
  const store = memory();
  let data = saveSave(createDefaultSave(), store).data;
  data = saveSave(data, store).data;
  const expectedRaw = store.getItem(SAVE_KEY);
  const olderImport = createDefaultSave();
  const imported = saveSave(olderImport, store, { replace: true, expectedRaw });
  assert.equal(imported.data.revision, 3);
  const before = store.getItem(SAVE_KEY);
  assert.equal(saveSave(olderImport, store, { replace: true, expectedRaw }).status, 'conflict');
  assert.equal(store.getItem(SAVE_KEY), before);
  const emptyStore = memory();
  assert.equal(saveSave(olderImport, emptyStore, { replace: true, expectedRaw: null }).ok, true);
});

test('storage read failure and write quota failure remain visible and do not advance revision', () => {
  const blocked = { getItem() { throw new Error('blocked'); } };
  assert.equal(loadSave(blocked).status, 'unavailable');
  assert.equal(saveSave(createDefaultSave(), blocked).status, 'unavailable');
  const data = createDefaultSave();
  const store = memory();
  store.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(saveSave(data, store).status, 'unavailable');
  assert.equal(data.revision, 0);
  assert.equal(store.getItem(SAVE_KEY), null);
});

test('backup round trip validates a real engine entrance and preserves banked credit above the checkpoint', () => {
  const data = createDefaultSave();
  data.stats = { runs: 1, wins: 0, kills: 7, rooms: 1, embers: 9, bestRoom: 2 };
  data.banked = { kills: 7, rooms: 1, embers: 9 };
  data.checkpoint = snapshot(createRun({ seed: 71 }));
  const parsed = parseImport(exportSave(data));
  assert.equal(parsed.error, null);
  assert.deepEqual(parsed.data, data);
  const resumed = restoreRun(parsed.data.checkpoint);
  assert.equal(resumed.stats.kills, 0);
  // Replaying already banked progress adds nothing until the previous maximum.
  for (const kills of [0, 3, 7]) assert.equal(Math.max(0, kills - parsed.data.banked.kills), 0);
  assert.equal(Math.max(0, 8 - parsed.data.banked.kills), 1);
});

test('weapon unlocks are derived from rooms and optional old fields normalize safely', () => {
  const data = createDefaultSave();
  delete data.banked;
  delete data.unlocks;
  data.stats.rooms = 10;
  const parsed = parseImport(JSON.stringify(data));
  assert.deepEqual(parsed.data.banked, { kills: 0, rooms: 0, embers: 0 });
  assert.deepEqual(parsed.data.unlocks, ['cinder', 'scatter', 'needle']);
  data.unlocks = ['cinder', 'not-a-weapon'];
  assert.ok(parseImport(JSON.stringify(data)).error);
});

test('bad root, version, unknown fields, numbers, settings and inconsistent counters are rejected', () => {
  const invalid = [null, [], {}, { ...createDefaultSave(), version: 2 }];
  for (const mutate of [
    d => { d.extra = 1; }, d => { d.revision = -1; }, d => { d.revision = 0.5; },
    d => { d.stats.runs = 1e10; }, d => { d.stats.wins = 1; }, d => { d.stats.bestRoom = 16; },
    d => { d.settings.music = 'yes'; }, d => { d.stats.rooms = -1; },
    d => { d.banked.kills = 1; }, d => { d.banked.unknown = 0; }, d => { d.banked = null; }, d => { d.settings.extra = true; },
  ]) { const data = createDefaultSave(); mutate(data); invalid.push(data); }
  for (const data of invalid) assert.ok(parseImport(JSON.stringify(data)).error);
  assert.equal(parseImport('not-json').data, null);
  const infinity = createDefaultSave(); infinity.stats.runs = Infinity;
  assert.throws(() => exportSave(infinity));
});

test('hostile prototype keys, accessors, cycles and excessive payloads are rejected without evaluation', () => {
  const json = JSON.stringify(createDefaultSave());
  assert.ok(parseImport(json.replace('"version":1', '"version":1,"__proto__":{"polluted":true}')).error);
  const inherited = Object.assign(Object.create({ inherited: true }), createDefaultSave());
  assert.throws(() => exportSave(inherited));
  let called = false;
  const getter = createDefaultSave();
  Object.defineProperty(getter, 'version', { enumerable: true, get() { called = true; return 1; } });
  assert.equal(saveSave(getter, memory()).status, 'invalid');
  assert.equal(called, false);
  const cycle = createDefaultSave(); cycle.checkpoint = cycle;
  assert.throws(() => exportSave(cycle));
  assert.ok(parseImport(' '.repeat(MAX_SAVE_BYTES + 1)).error);
  assert.ok(parseImport('中'.repeat(Math.floor(MAX_SAVE_BYTES / 2))).error);
  assert.equal({}.polluted, undefined);
});

test('engine checkpoint schema rejects fabricated room, relic, health, time and stat combinations', () => {
  const valid = snapshot(createRun({ seed: 12 }));
  for (const mutate of [
    c => { c.room = 3; }, c => { c.relics = { split: 1 }; }, c => { c.hp = 0; },
    c => { c.time = 999; }, c => { c.time = -1; }, c => { c.nextId = 0; },
    c => { c.stats.rooms = 5; }, c => { c.extra = 'future'; }, c => { c.weapon = 'missing'; },
  ]) {
    const data = createDefaultSave(); data.checkpoint = copy(valid); mutate(data.checkpoint);
    assert.ok(parseImport(JSON.stringify(data)).error);
  }
});

test('revision overflow refuses write without damaging an otherwise readable backup', () => {
  const data = createDefaultSave(); data.revision = 1_000_000_000_000;
  const raw = exportSave(data), store = memory({ [SAVE_KEY]: raw });
  assert.equal(loadSave(store).status, 'ready');
  assert.equal(saveSave(data, store).status, 'invalid');
  assert.equal(store.getItem(SAVE_KEY), raw);
});

test('the unchanged v1 save envelope accepts modern v2 checkpoints and legacy v1 progress without migration', () => {
  const current=createDefaultSave();current.stats.bestRoom=15;current.stats.rooms=15;current.stats.runs=1;current.stats.wins=1;
  current.checkpoint=snapshot(createRun({seed:39}));
  const parsed=parseImport(exportSave(current));assert.equal(parsed.error,null);assert.equal(parsed.data.version,1);assert.equal(parsed.data.checkpoint.version,2);assert.equal(parsed.data.stats.bestRoom,15);
  const legacy=createDefaultSave();legacy.checkpoint=snapshot(createRun({seed:39,campaign:'legacy'}));delete legacy.checkpoint.adventure;
  const old=parseImport(exportSave(legacy));assert.equal(old.error,null);assert.equal(old.data.checkpoint.version,1);assert.equal(restoreRun(old.data.checkpoint).totalRooms,8);
});
