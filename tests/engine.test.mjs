import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, step, chooseRelic, enterRoom, setWorldSize, snapshot, restoreRun, describe, interact, nearestInteractable, availableEmbers, getRiftRule, isBossRoom, BOSS_POOLS, LAYOUTS, LEGACY_LAYOUTS, RELICS, WEAPONS } from '../src/engine.js';

const DT = 1 / 120;
function advance(s, seconds, input = {}) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) { step(s, typeof input === 'function' ? input(s) : input, DT); events.push(...s.events); }
  return events;
}
function chamber(type = 'slime') {
  const s = createRun({ seed: 91 });
  s.obstacles = []; s.player.x = 220; s.player.y = 350; s.player.invuln = 0;
  const e = s.enemies[0]; Object.assign(e, { type, x: 480, y: 350, phase: 'chase', cooldown: 999, hp: 300, maxHp: 300 });
  s.enemies = [e]; return s;
}
function grant(s, id) { s.phase = 'reward'; s.choices = [id]; assert.equal(chooseRelic(s, id), true); s.phase = 'combat'; s.gates = []; }
function shot(s, seconds = 0.6) { return advance(s, seconds, { fire: true, aimX: 900, aimY: 350 }); }
const copy = x => JSON.parse(JSON.stringify(x));

test('same seed and timed inputs reproduce complete state; other seed changes room geometry occupants', () => {
  const a = createRun({ seed: 7 }), b = createRun({ seed: 7 }), c = createRun({ seed: 8 });
  const input = s => ({ moveX: Math.sin(s.time * 2), moveY: -0.5, fire: true, aimX: 500, aimY: 100, nova: s.time > 0.8 && s.time < 0.82 });
  advance(a, 4, input); advance(b, 4, input); assert.deepEqual(a, b);
  assert.notDeepEqual(snapshot(createRun({ seed: 7 })), snapshot(c));
  assert.notDeepEqual(createRun({ seed: 7 }).enemies.map(e => [e.x, e.y]), c.enemies.map(e => [e.x, e.y]));
});

test('new room has safe entrance, one second grace and nonoverlapping enemies in portrait', () => {
  for (const width of [380, 390, 1100]) {
    const s = createRun({ width, height: width < 500 ? 1000 : 720 });
    assert.equal(s.phase, 'combat'); assert.equal(s.room, 1); assert.ok(s.player.invuln >= 1);
    for (const e of s.enemies) { assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) > 120); assert.ok(e.y + e.r <= s.height - (s.height > s.width ? 150 : 28)); }
  }
});

test('walls and obstacles stop ordinary movement and dash without tunneling', () => {
  const s = chamber(); s.obstacles = [{ x: 300, y: 250, w: 30, h: 200 }];
  advance(s, 0.8, { moveX: 1 }); assert.ok(s.player.x + s.player.r <= 300.001);
  advance(s, 0.3, { moveX: 1, dash: true }); assert.ok(s.player.x + s.player.r <= 300.001);
  s.obstacles = []; advance(s, 10, { moveX: -1 }); assert.ok(s.player.x >= 28 + s.player.r);
});

test('solid obstacle blocks bullets; ricochet level controls wall bounces', () => {
  const s = chamber(); s.obstacles = [{ x: 330, y: 200, w: 30, h: 320 }];
  shot(s, 1); assert.equal(s.enemies[0].hp, 300); assert.equal(s.stats.hits, 0);
  const a = chamber(); grant(a, 'ricochet'); grant(a, 'ricochet'); a.player.x = 70;
  step(a, { fire: true, aimX: -100, aimY: 350 }, DT); const b = a.bullets[0];
  advance(a, 0.1); assert.ok(b.vx > 0); assert.equal(b.bounces, 1); assert.ok(!b.dead);
});

test('dash is edge-triggered, grants safety and enforces cooldown; holding does not repeat', () => {
  const s = chamber(); s.enemies[0].x = s.player.x + 10; s.enemies[0].y = s.player.y;
  step(s, { dash: true, moveX: 1 }, DT); assert.equal(s.player.hp, 6); assert.equal(s.events.filter(e => e.type === 'dash').length, 1);
  const events = advance(s, 2, { dash: true, moveX: 1 }); assert.equal(events.filter(e => e.type === 'dash').length, 0);
  step(s, { dash: false }, DT); step(s, { dash: true, moveX: -1 }, DT); assert.ok(s.events.some(e => e.type === 'dash'));
});

test('enemy attacks expose locked warning before damage and charger does not retarget', () => {
  const s = chamber('charger'), e = s.enemies[0]; e.cooldown = 0;
  step(s, {}, DT); assert.equal(e.phase, 'windup'); assert.equal(e.telegraph.kind, 'line'); const angle = e.telegraph.angle;
  advance(s, 0.5, { moveY: 1 }); assert.equal(e.phase, 'windup'); assert.equal(e.telegraph.angle, angle); assert.equal(s.player.hp, 6);
  advance(s, 0.32); assert.equal(e.phase, 'charge'); assert.ok(Math.abs(Math.atan2(e.vy, e.vx) - angle) < 0.001);
  const shooter = chamber('shooter'); shooter.enemies[0].cooldown = 0; step(shooter, {}, DT); advance(shooter, 0.4);
  assert.equal(shooter.bullets.length, 0); advance(shooter, 0.3); assert.ok(shooter.bullets.some(b => b.owner === 'enemy'));
});

test('the original two bosses have different action cycles and body-only windups', () => {
  for (const type of ['sentinel', 'warden']) {
    const s = chamber(type), e = s.enemies[0]; e.cooldown = 0; e.hp = 80;
    const seen = new Set();
    for (let i = 0; i < 2400; i++) { s.player.invuln = 2; step(s, {}, DT); if (e.specialAction) seen.add(e.specialAction); if(e.telegraph)assert.equal(e.telegraph.visible,false); }
    assert.equal(e.stage, 2);
    for(const action of type==='sentinel'?['sentinel-cross','sentinel-charge']:['warden-rage','warden-blink','warden-rain','warden-spin']) assert.ok(seen.has(action),action);
  }
});

test('damage invulnerability prevents contact draining all hearts in a frame; death freezes simulation', () => {
  const s = chamber(); s.enemies[0].x = s.player.x; s.enemies[0].y = s.player.y;
  const first = advance(s, 0.2); assert.equal(s.player.hp, 5); assert.equal(first.filter(e => e.type === 'player-hit').length, 1);
  s.player.hp = 1; s.player.invuln = 0; step(s, {}, DT); assert.equal(s.phase, 'dead'); assert.ok(s.events.some(e => e.type === 'death'));
  const time = s.time; advance(s, 2, { fire: true, moveX: 1 }); assert.equal(s.time, time);
});

test('split stacks actual side projectiles; blood trades max health for projectile damage', () => {
  const s = chamber(); grant(s, 'split'); grant(s, 'split'); grant(s, 'blood');
  step(s, { fire: true, aimX: 900, aimY: 350 }, DT);
  assert.equal(s.bullets.filter(b => b.owner === 'player').length, 5); assert.equal(s.player.maxHp, 5); assert.equal(s.player.hp, 5);
  assert.equal(s.bullets[0].damage, 10.4); assert.equal(s.bullets[1].damage, 5.2);
});

test('piercing harms two lined-up targets; seeking turns toward an offset target', () => {
  const s = chamber(); const second = { ...copy(s.enemies[0]), id: 999, x: 600 }; s.enemies.push(second); grant(s, 'pierce');
  shot(s, 0.85); assert.ok(s.enemies.every(e => e.hp < 300));
  const h = chamber(); h.enemies[0].y = 440; grant(h, 'seeking'); step(h, { fire: true, aimX: 900, aimY: 350 }, DT);
  const b = h.bullets[0]; advance(h, 0.2); assert.ok(b.vy > 20);
});

test('chain propagates to distinct nearby targets; burn persists; cold slows pursuit', () => {
  const s = chamber(); s.enemies.push({ ...copy(s.enemies[0]), id: 999, y: 420 }); grant(s, 'chain'); grant(s, 'burn'); grant(s, 'cold');
  step(s, { fire: true, aimX: 900, aimY: 350 }, DT); advance(s, 0.5);
  assert.ok(s.enemies[1].hp < 300); assert.ok(s.enemies[0].burnTime > 0); assert.equal(s.enemies[0].coldFactor, 0.8);
  const hp = s.enemies[0].hp; advance(s, 0.5); assert.ok(s.enemies[0].hp < hp);
  const chilled = chamber(), plain = chamber(); chilled.enemies[0].coldTime = 2; chilled.enemies[0].coldFactor = 0.4;
  advance(chilled, 0.5); advance(plain, 0.5); assert.ok(chilled.enemies[0].x > plain.enemies[0].x);
});

test('explosive kills hurt nearby enemies without recursive duplicate kill credit', () => {
  const s = chamber(); s.enemies[0].hp = 1; s.enemies.push({ ...copy(s.enemies[0]), id: 999, y: 390, hp: 10 });
  grant(s, 'explosive'); const events = shot(s, 0.7);
  assert.equal(s.stats.kills, 2); assert.equal(events.filter(e => e.type === 'kill').length, 2); assert.equal(s.phase, 'reward');
});

test('orbit blades and dash trail cause actual contact damage, with per-target rate limits', () => {
  const s = chamber(); grant(s, 'blades'); s.enemies[0].x = s.player.x + 49; s.enemies[0].y = s.player.y;
  advance(s, 0.1); assert.ok(s.enemies[0].hp < 300); assert.ok(s.enemies[0].hp >= 291);
  const t = chamber(); grant(t, 'trail'); t.enemies[0].x = t.player.x + 65; t.enemies[0].y = t.player.y;
  advance(t, 0.2, { moveX: 1, dash: true }); assert.ok(t.enemies[0].hp < 300); assert.ok(t.effects.some(e => e.type === 'trail'));
});

test('nova consumes charge, removes nearby enemy bullets and scales range/damage with relic', () => {
  const s = chamber(); grant(s, 'nova'); s.enemies[0].x = s.player.x + 155;
  s.bullets.push({ id: 999, owner: 'enemy', x: s.player.x + 30, y: s.player.y, r: 5, vx: -50, vy: 0, life: 3, hits: [], damage: 1 });
  step(s, { nova: true }, DT); assert.ok(s.player.novaCharge < 1); assert.ok(!s.bullets.some(b => b.id === 999)); assert.equal(s.enemies[0].hp, 258);
  const hp = s.enemies[0].hp; step(s, { nova: true }, DT); assert.equal(s.enemies[0].hp, hp);
});

test('each weapon is a distinct projectile behavior rather than a renamed stat', () => {
  const states = WEAPONS.map(w => { const s = chamber(); s.player.weapon = w.id; step(s, { fire: true, aimX: 900, aimY: 350 }, DT); return s; });
  assert.equal(states[0].bullets.length, 1); assert.equal(states[1].bullets.length, 3); assert.equal(states[2].bullets[0].pierces, 1);
  assert.ok(states[2].bullets[0].vx > states[0].bullets[0].vx); assert.ok(states[1].player.fireCooldown > states[0].player.fireCooldown);
});

test('clearing grants exactly one reward; capped relics excluded; exits require choice', () => {
  const s = chamber(); s.enemies[0].hp = 1; s.relics.split = 3; shot(s, 0.7);
  assert.equal(s.phase, 'reward'); assert.equal(s.choices.length, 3); assert.equal(new Set(s.choices).size, 3); assert.ok(!s.choices.includes('split'));
  assert.equal(enterRoom(s), false); const rooms = s.stats.rooms, embers = s.stats.embers; advance(s, 2);
  assert.equal(s.stats.rooms, rooms); assert.equal(s.stats.embers, embers);
  assert.equal(chooseRelic(s, 'not-a-relic'), false); assert.equal(chooseRelic(s, s.choices[0]), true); assert.equal(s.phase, 'exit'); assert.equal(s.gates.length, 2);
  s.player.hp = 3; s.player.x = s.gates[1].x; s.player.y = s.gates[1].y; step(s, {}, DT);
  assert.equal(s.room, 2); assert.equal(s.route, 'refuge'); assert.equal(s.player.hp, Math.min(4, s.player.maxHp)); assert.ok(s.events.some(e => e.type === 'room-enter'));
});

test('safe snapshot rolls active damage and bullets back to entrance, with identical seeded enemies', () => {
  const s = createRun({ seed: 55 }), start = copy(s), saved = snapshot(s);
  advance(s, 5, { fire: true, aimX: 500, aimY: 100 }); s.player.hp = 2;
  assert.deepEqual(snapshot(s), saved); const restored = restoreRun(saved); assert.ok(restored);
  assert.deepEqual(restored.enemies, start.enemies); assert.deepEqual(restored.player, start.player); assert.deepEqual(restored.stats, start.stats);
  assert.equal(restored.bullets.length, 0); assert.deepEqual(snapshot(restored), saved);
});

test('checkpoint rejects unknown, impossible, nonfinite and excessive imported fields without throwing', () => {
  const good = snapshot(createRun());
  for (const mutate of [d => d.hp = 0, d => d.room = 9, d => d.width = 1, d => d.seed = -1, d => d.extra = 1, d => d.relics = { blood: 99 }, d => d.stats.rooms = 6, d => d.time = Infinity, d => d.nextId = 0, d => d.nextId = Number.MAX_SAFE_INTEGER, d => d.stats.elapsed = 10, d => d.stats.kills = 0.5]) { const d = copy(good); mutate(d); assert.equal(restoreRun(d), null); }
  assert.equal(restoreRun(null), null); assert.equal(restoreRun('{bad'), null); assert.equal(restoreRun([]), null);
});

test('room progress checkpoint preserves build, paid outcomes and health; two bosses and final win exist', () => {
  const s = createRun({ seed: 103, campaign: 'legacy' }); const bossTypes = [];
  for (let room = 1; room <= 8; room++) {
    assert.equal(s.room, room); bossTypes.push(...s.enemies.filter(e => ['sentinel', 'warden'].includes(e.type)).map(e => e.type));
    // Small-hp fixture exercises actual shots/kill/reward transitions without a debug production API.
    s.obstacles = []; s.player.x = 150; s.player.y = 350; s.player.invuln = 999;
    for (let i = 0; i < s.enemies.length; i++) Object.assign(s.enemies[i], { x: 300 + i * 40, y: 350, hp: 1, phase: 'chase', cooldown: 999 });
    advance(s, 40, state => {
      // Progression fixture isolates room/checkpoint transitions; enemy behavior is tested separately.
      for (let i = 0; i < state.enemies.length; i++) if (state.enemies[i].phase !== 'spawn') Object.assign(state.enemies[i], { type: 'slime', x: 300 + i * 40, y: 350, hp: 1, cooldown: 999 });
      return { fire: true, aimX: state.enemies[0]?.x ?? 1000, aimY: state.enemies[0]?.y ?? 350 };
    });
    assert.equal(s.phase, room === 8 ? 'won' : 'reward'); assert.equal(s.stats.rooms, room);
    if (room < 8) {
      chooseRelic(s, s.choices.find(id => id !== 'blood') || s.choices[0]); enterRoom(s, room % 2 ? 'refuge' : 'hunt');
      const saved = snapshot(s), restored = restoreRun(saved); assert.ok(restored); assert.deepEqual(restored.enemies, s.enemies); assert.deepEqual(restored.relics, s.relics); assert.deepEqual(restored.stats, s.stats);
    }
  }
  assert.deepEqual(bossTypes, ['sentinel', 'warden']); const before = s.stats.rooms; advance(s, 3); assert.equal(s.stats.rooms, before);
});

test('resize and describe retain truthful world positions, phone touch reserve and accessible choices', () => {
  const s = createRun(); assert.equal(setWorldSize(s, 390, 1000), true); assert.equal(s.width, 390); assert.equal(s.height, 1000);
  assert.ok(s.enemies.every(e => e.y + e.r < 850)); assert.equal(snapshot(s).width, 390); assert.ok(restoreRun(snapshot(s)));
  assert.equal(setWorldSize(s, 0, 0), false); const text = describe(s); assert.ok(text.coordinates.includes('top-left')); assert.equal(text.enemies.length, s.enemies.length); assert.equal(text.player.hp, s.player.hp);
  assert.equal(RELICS.length, 12); assert.equal(new Set(RELICS.map(r => r.id)).size, 12);
});

test('rotation cannot trap bodies in pillars and keeps a locked charge warning aligned', () => {
  const s = chamber('charger'); s.obstacles = [{ x: 300, y: 240, w: 80, h: 150 }];
  s.player.x = 285; s.enemies[0].x = 395; s.enemies[0].cooldown = 0;
  step(s, {}, DT); assert.equal(s.enemies[0].phase, 'windup');
  setWorldSize(s, 390, 1000);
  for (const body of [s.player, ...s.enemies]) for (const o of s.obstacles) {
    const x = Math.max(o.x, Math.min(o.x + o.w, body.x)), y = Math.max(o.y, Math.min(o.y + o.h, body.y));
    assert.ok(Math.hypot(body.x - x, body.y - y) >= body.r - 0.001);
  }
  const e = s.enemies[0]; assert.ok(Math.abs(e.telegraph.angle - Math.atan2(e.chargeY - e.y, e.chargeX - e.x)) < 1e-8);
});

test('impact pause freezes hostile motion briefly without swallowing movement or dash inputs', () => {
  const s = chamber(); s.hitStop = 0.06; const x = s.enemies[0].x;
  step(s, { moveY: -1, dash: true }, DT);
  assert.equal(s.enemies[0].x, x); assert.ok(s.player.y < 350); assert.ok(s.events.some(e => e.type === 'dash'));
  advance(s, 0.1); assert.ok(s.enemies[0].x < x);
});

test('two-wave rooms withhold rewards until the final wave and warn safe new spawns for 0.9 seconds', () => {
  const s = createRun({ seed: 37, width: 390, height: 1000 });
  s.phase = 'exit'; s.stats.rooms = 1; s.relics = { cold: 1 }; enterRoom(s, 'refuge');
  assert.equal(s.wave, 1); assert.equal(s.waveTotal, 2);
  s.obstacles = []; s.player.x = 120; s.player.y = 500; s.player.invuln = 20;
  for (let i = 0; i < s.enemies.length; i++) Object.assign(s.enemies[i], { x: 210 + i * 35, y: 500, hp: 1, phase: 'chase', cooldown: 999 });
  for (let i = 0; i < 600 && s.wave === 1; i++) step(s, { fire: true, aimX: s.enemies[0]?.x ?? 300, aimY: s.enemies[0]?.y ?? 500 }, DT);
  assert.equal(s.wave, 2); assert.equal(s.phase, 'combat'); assert.equal(s.stats.rooms, 1); assert.equal(s.choices.length, 0); assert.equal(s.gates.length, 0);
  assert.equal(s.waveDelay, 0.9); assert.ok(s.events.some(e => e.type === 'wave-enter'));
  const restored = restoreRun(snapshot(s)); assert.ok(restored); assert.equal(restored.wave, 1); assert.equal(restored.waveTotal, 2); assert.equal(restored.stats.rooms, 1);
  for (const e of s.enemies) { assert.equal(e.phase, 'spawn'); assert.equal(e.spawnTime, 0.9); assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) > 135); }
  const hp = s.player.hp, enemyHp = s.enemies.map(e => e.hp);
  advance(s, 0.7, { fire: true, aimX: s.enemies[0].x, aimY: s.enemies[0].y });
  assert.equal(s.player.hp, hp); assert.deepEqual(s.enemies.map(e => e.hp), enemyHp); assert.ok(s.enemies.every(e => e.phase === 'spawn'));
  advance(s, 0.25); assert.ok(s.enemies.every(e => e.phase !== 'spawn'));
  for (let i = 0; i < s.enemies.length; i++) Object.assign(s.enemies[i], { x: 210 + i * 35, y: 500, hp: 1, phase: 'chase', cooldown: 999 });
  advance(s, 4, state => ({ fire: true, aimX: state.enemies[0]?.x ?? 300, aimY: state.enemies[0]?.y ?? 500 }));
  assert.equal(s.phase, 'reward'); assert.equal(s.stats.rooms, 2); assert.equal(s.choices.length, 3);
});

test('Hunt adds exactly two enemies per normal wave; every sampled portrait spawn is safely separated', () => {
  for (const room of [2, 3, 5, 6, 7]) for (let seed = 1; seed <= 12; seed++) {
    const states = ['hunt', 'refuge'].map(route => {
      const s = createRun({ seed, width: 380, height: 1000, campaign: 'legacy' }); s.room = room - 1; s.phase = 'exit'; enterRoom(s, route); return s;
    });
    assert.equal(states[0].enemies.length, states[1].enemies.length + 2);
    for (const s of states) { assert.equal(s.waveTotal, 2); for (const e of s.enemies) assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) > 135); }
  }
  assert.equal(createRun().waveTotal, 1);
});

test('Sentinel summons two safe guards once; Warden enrages once without copying that summon', () => {
  for (const type of ['sentinel', 'warden']) {
    const s = chamber(type), boss = s.enemies[0]; boss.maxHp = type === 'sentinel' ? 600 : 950; boss.hp = boss.maxHp * .3;
    s.player.invuln = 20;
    step(s, {}, DT); assert.equal(boss.stage, 2); assert.equal(s.enemies.length, type==='sentinel'?3:1);
    assert.equal(s.events.filter(e => e.type === (type==='sentinel'?'boss-summon':'boss-rage')).length, 1);
    for (const e of s.enemies.slice(1)) { assert.equal(e.phase, 'spawn'); assert.ok(e.spawnTime > 0.88); assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) > 135); }
    assert.equal(advance(s, 2).filter(e => ['boss-summon','boss-rage'].includes(e.type)).length, 0); assert.equal(s.enemies.length, type==='sentinel'?3:1);
    boss.hp = boss.maxHp; step(s, {}, DT); boss.hp = 1; step(s, {}, DT); assert.equal(s.enemies.length, type==='sentinel'?3:1);
  }
});

test('point-blank shots hit contact-range enemies instead of emerging behind them', () => {
  const s = chamber(); s.enemies[0].x = s.player.x; s.enemies[0].y = s.player.y; s.player.invuln = 1;
  step(s, { fire: true, aimX: s.player.x + 200, aimY: s.player.y }, DT);
  assert.ok(s.enemies[0].hp < 300); assert.equal(s.stats.hits, 1);
});

test('a gate appearing under the player requires leaving and entering again after choosing a relic', () => {
  for (const [route, xFactor] of [['hunt', 0.32], ['refuge', 0.68]]) {
    const s = createRun(); s.phase = 'reward'; s.choices = ['cold']; s.enemies = []; s.stats.rooms = 1;
    s.player.x = s.width * xFactor; s.player.y = 90;
    assert.equal(chooseRelic(s, 'cold'), true);
    const gate = s.gates.find(g => g.route === route);
    assert.equal(gate.armed, false); assert.equal(describe(s).gates.find(g => g.route === route).armed, false);
    advance(s, 1); assert.equal(s.phase, 'exit'); assert.equal(s.room, 1); assert.equal(gate.armed, false);
    advance(s, 0.3, { moveY: 1 }); assert.equal(s.phase, 'exit'); assert.equal(gate.armed, true);
    advance(s, 0.2, { moveY: -1 }); assert.equal(s.room, 2); assert.equal(s.phase, 'combat'); assert.equal(s.route, route);
  }
});

function roomFixture(room, seed = 1, width = 1100, height = 720, campaign = 'legacy') {
  const s = createRun({ seed, width, height, campaign }); s.room = room - 1; s.phase = 'exit';
  s.stats.rooms = room - 1; s.stats.embers = 30;
  s.relics = {};let levels=room-1;for(const id of ['cold','split','burn','pierce','chain']){const count=Math.min(3,levels);if(count)s.relics[id]=count;levels-=count;}
  if (room > 1) enterRoom(s, 'hunt');
  return s;
}
function use(s, item) { s.player.x = item.x; s.player.y = item.y; return interact(s, item.id); }
function clearFixture(s) {
  s.enemies = []; s.wave = s.waveTotal; step(s, {}, DT);
  if (s.phase === 'reward') chooseRelic(s, s.choices.find(id => id !== 'blood') || s.choices[0]);
}

test('sniper locks a fast single shot; orbiter strafes and releases three separated fans', () => {
  const s = chamber('sniper'), e = s.enemies[0]; e.cooldown = 0; s.player.invuln = 20;
  step(s, {}, DT); const angle = e.telegraph.angle;
  assert.equal(e.telegraph.visible, false); assert.equal(e.telegraph.kind, 'shot');
  advance(s, .5, { moveY: 1 }); assert.equal(s.bullets.length, 0);
  advance(s, .37); const bolt = s.bullets.find(b => b.owner === 'enemy');
  assert.ok(bolt); assert.ok(Math.hypot(bolt.vx, bolt.vy) > 500); assert.ok(Math.abs(Math.atan2(bolt.vy, bolt.vx) - angle) < .001);
  const o = chamber('orbiter'); o.enemies[0].cooldown = 0; o.player.invuln = 20;
  step(o, {}, DT); advance(o, .46); const originY = o.enemies[0].y;
  assert.equal(o.enemies[0].phase, 'burst'); const firstIds = new Set(o.bullets.map(b => b.id));
  advance(o, .23); assert.ok(o.enemies[0].y !== originY); assert.ok(o.bullets.filter(b => !firstIds.has(b.id)).length >= 3);
  const count = o.nextId; advance(o, .23); assert.ok(o.nextId >= count + 3);
});

test('meteor strikes the old player position after a full second and moving away avoids it', () => {
  const s = chamber('meteor'), e = s.enemies[0]; e.cooldown = 0;
  step(s, {}, DT); assert.equal(s.hazards.length, 1); const impact = copy(s.hazards[0]);
  assert.equal(e.telegraph.kind, 'impact'); assert.equal(e.telegraph.visible, true);
  advance(s, .75, { moveY: 1 }); assert.equal(s.player.hp, 6);
  assert.equal(s.hazards[0].x, impact.x); assert.equal(s.hazards[0].y, impact.y);
  advance(s, .3); assert.equal(s.player.hp, 6); assert.ok(s.effects.some(x => x.type === 'meteor-impact'));
  const still = chamber('meteor'); still.enemies[0].cooldown = 0;
  advance(still, 1.02); assert.equal(still.player.hp, 5);
});

test('Tempest lightning deals delayed impact damage and emits a distinct effect from falling meteors', () => {
  const thunder = chamber('tempest'), boss = thunder.enemies[0]; boss.hp = boss.maxHp * .49;
  advance(thunder, .81); const marked = thunder.hazards.filter(h => h.kind === 'lightning');
  assert.equal(marked.length, 3); assert.equal(thunder.player.hp, 6);
  assert.ok(marked.some(h => h.x === thunder.player.x && h.y === thunder.player.y));
  advance(thunder, .75); assert.equal(thunder.player.hp, 6); assert.ok(thunder.hazards.length > 0);
  const events = advance(thunder, .17);
  assert.equal(thunder.player.hp, 5); assert.equal(thunder.stats.damageTaken, 1);
  assert.ok(events.some(event => event.type === 'player-hit'));
  assert.equal(thunder.effects.filter(effect => effect.type === 'lightning-impact').length, 3);
  assert.equal(thunder.effects.some(effect => effect.type === 'meteor-impact'), false);
  const meteor = chamber('meteor'); meteor.enemies[0].cooldown = 0; advance(meteor, 1.02);
  assert.equal(meteor.player.hp, 5);
  assert.equal(meteor.effects.filter(effect => effect.type === 'meteor-impact').length, 1);
  assert.equal(meteor.effects.some(effect => effect.type === 'lightning-impact'), false);
});

test('brood splits once into two warned small enemies and never exceeds the live enemy cap', () => {
  const s = chamber('brood'); s.enemies[0].x = 300; s.enemies[0].hp = 1;
  shot(s, .18); assert.equal(s.stats.kills, 1); assert.equal(s.enemies.length, 2);
  assert.ok(s.enemies.every(e => e.type === 'tiny' && e.phase === 'spawn' && e.spawnTime > .5));
  for (const e of s.enemies) { e.hp = 1; e.phase = 'chase'; e.x = 300; e.y = 350; }
  shot(s, .8); assert.equal(s.stats.kills, 3); assert.equal(s.enemies.length, 0);
  const crowded = chamber('brood'); crowded.enemies[0].hp = 1; crowded.enemies[0].x = 280;
  for (let i = 0; i < 17; i++) crowded.enemies.push({ ...copy(crowded.enemies[0]), id: 400 + i, hp: 500, type: 'slime', x: 750, y: 100 + i * 15 });
  shot(crowded, .13); assert.ok(crowded.enemies.filter(e => !e.dead).length <= 18);
});

function reachableFloor(s) {
  const top = 66, left = 28, right = s.width - 28, bottom = s.height - (s.height > s.width ? 150 : 28), r = 13, stride = 10;
  const columns = Math.floor((right - left - 2*r) / stride) + 1, rows = Math.floor((bottom - top - 2*r) / stride) + 1;
  const pos = index => ({ x: left+r+(index%columns)*stride, y: top+r+Math.floor(index/columns)*stride });
  const isFree = p => !s.obstacles.some(o => Math.hypot(p.x-Math.max(o.x,Math.min(o.x+o.w,p.x)),p.y-Math.max(o.y,Math.min(o.y+o.h,p.y))) < r);
  const free = Array.from({length:columns*rows},(_,i)=>isFree(pos(i))), visited = new Set();
  const nearest = p => {
    let best=-1, dist=Infinity;
    for(let i=0;i<free.length;i++) if(free[i]) { const q=pos(i),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<dist){best=i;dist=d;} }
    return best;
  };
  const start=nearest(s.player),queue=[start]; visited.add(start);
  for(let head=0;head<queue.length;head++) {
    const i=queue[head],x=i%columns,y=Math.floor(i/columns);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) { const nx=x+dx,ny=y+dy,n=ny*columns+nx;if(nx>=0&&nx<columns&&ny>=0&&ny<rows&&free[n]&&!visited.has(n)){visited.add(n);queue.push(n);} }
  }
  return p => visited.has(nearest(p));
}

test('six physical layouts keep entrance, both exits and every discovery reachable through rotations', () => {
  const layouts = new Set(), shapes = new Set();
  const samples=new Map();for(let seed=1;seed<=200&&samples.size<6;seed++){const s=roomFixture(3,seed);if(!samples.has(s.layout))samples.set(s.layout,seed);}
  for (const seed of samples.values()) for(const [width,height] of [[380,1000],[1100,560],[1100,720]]) {
    const s=roomFixture(3,seed,width,height);layouts.add(s.layout);shapes.add(JSON.stringify(s.obstacles));
    for(const [w,h] of [[width,height],[390,1000],[1100,560]]) {
      setWorldSize(s,w,h);const reachable=reachableFloor(s);
      for(const point of [...s.enemies,...s.interactables,{x:s.width*.32,y:90},{x:s.width*.68,y:90}]) assert.ok(reachable(point),`${s.layout} ${w}x${h} ${point.kind||point.type||'exit'}`);
      for(const entity of [s.player,...s.enemies,...s.interactables]) for(const o of s.obstacles) assert.ok(Math.hypot(entity.x-Math.max(o.x,Math.min(o.x+o.w,entity.x)),entity.y-Math.max(o.y,Math.min(o.y+o.h,entity.y)))>=entity.r-.001);
    }
  }
  assert.deepEqual([...layouts].sort(),[...LEGACY_LAYOUTS].sort());assert.ok(shapes.size>=6);
});

test('lamp order is a genuine resettable puzzle, nearby-only, and pays exactly once', () => {
  const s=roomFixture(2,3), lamps=s.interactables.filter(i=>i.kind==='lamp');assert.equal(lamps.length,3);
  s.player.x=800;s.player.y=120;assert.equal(interact(s,lamps[0].id).reason,'too-far');
  assert.equal(use(s,lamps[1]).reason,'wrong-order');assert.ok(lamps.every(i=>i.status==='ready'));
  assert.equal(use(s,lamps[0]).reason,'lit');assert.equal(use(s,lamps[2]).reason,'wrong-order');assert.ok(lamps.every(i=>i.progress===0));
  s.player.novaCharge=20;const gross=s.stats.embers;
  for(const item of lamps)use(s,item);
  assert.equal(s.stats.embers,gross+6);assert.equal(s.player.novaCharge,45);assert.ok(lamps.every(i=>i.status==='done'));
  assert.equal(use(s,lamps[2]).ok,false);assert.equal(s.stats.embers,gross+6);assert.equal(nearestInteractable(s),null);
});

test('offering uses spendable currency without lowering bankable income and rolls back with the room', () => {
  const s=roomFixture(2,1), offering=s.interactables.find(i=>i.kind==='offering');assert.ok(offering);
  assert.equal(use(s,offering).reason,'already-restored');assert.equal(s.adventure.spent,0);
  s.player.hp=3;s.player.novaCharge=20;const before=snapshot(s),gross=s.stats.embers;
  assert.equal(use(s,offering).ok,true);assert.equal(s.player.hp,5);assert.equal(s.player.novaCharge,100);
  assert.equal(s.stats.embers,gross);assert.equal(availableEmbers(s),gross-10);assert.equal(use(s,offering).ok,false);
  assert.deepEqual(snapshot(s),before);const rolled=restoreRun(snapshot(s));assert.equal(rolled.adventure.spent,0);assert.equal(rolled.player.hp,before.hp);
  clearFixture(s);enterRoom(s,'hunt');const persisted=restoreRun(snapshot(s));assert.ok(persisted);
  assert.equal(persisted.adventure.spent,10);assert.ok(persisted.adventure.claims.includes('2:offering'));assert.equal(persisted.player.hp,5);
});

test('traveler follows, rewards clearing the next room once, and hidden wall needs three separate hits', () => {
  const s=roomFixture(2,2), traveler=s.interactables.find(i=>i.kind==='traveler');assert.ok(traveler);
  assert.equal(use(s,traveler).reason,'rescued');assert.equal(use(s,traveler).ok,false);
  clearFixture(s);enterRoom(s,'hunt');assert.deepEqual(s.adventure.escort,{fromRoom:2,dueRoom:3});assert.ok(restoreRun(snapshot(s)));
  const gross=s.stats.embers;s.player.hp=3;clearFixture(s);
  assert.equal(s.adventure.escort,null);assert.equal(s.player.hp,4);assert.ok(s.adventure.claims.includes('2:escort'));
  assert.equal(s.stats.embers,gross+8+7);const paid=s.stats.embers;advance(s,2);assert.equal(s.stats.embers,paid);
  const secret=roomFixture(2,2),wall=secret.interactables.find(i=>i.kind==='cracked-wall');assert.ok(wall);
  secret.obstacles=[];secret.player.x=wall.x+100;secret.player.y=wall.y;secret.player.invuln=20;
  advance(secret,.55,{fire:true,aimX:wall.x,aimY:wall.y});assert.equal(wall.kind,'cracked-wall');assert.equal(wall.hits,2);
  advance(secret,.25,{fire:true,aimX:wall.x,aimY:wall.y});assert.equal(wall.kind,'chest');
  const old=secret.stats.embers;assert.equal(use(secret,wall).ok,true);assert.equal(secret.stats.embers,old+12);assert.equal(use(secret,wall).ok,false);
});

test('three clean chambers reveal a one-time ghost; damage breaks the streak', () => {
  const s=createRun({seed:8,campaign:'legacy'});
  for(let room=1;room<=3;room++){clearFixture(s);enterRoom(s,'hunt');}
  assert.equal(s.adventure.cleanRooms,3);const ghost=s.interactables.find(i=>i.kind==='ghost');assert.ok(ghost);
  assert.equal(use(s,ghost).ok,true);assert.equal(use(s,ghost).ok,false);
  s.stats.damageTaken++;clearFixture(s);assert.equal(s.adventure.cleanRooms,0);enterRoom(s,'hunt');
  assert.ok(!s.interactables.some(i=>i.kind==='ghost'));assert.ok(restoreRun(snapshot(s)));
});

test('legacy checkpoints default adventure safely and strict adventure rejects forged or inconsistent receipts', () => {
  const legacy=snapshot(createRun({campaign:'legacy'}));delete legacy.adventure;assert.ok(restoreRun(legacy));
  assert.deepEqual(restoreRun(legacy).adventure,{version:1,spent:0,claims:[],escort:null,cleanRooms:0,roomDamage:0});
  const good=snapshot(roomFixture(3,5));
  for(const mutate of [a=>a.extra=1,a=>a.spent=1,a=>a.spent=10,a=>a.cleanRooms=3,a=>a.roomDamage=1,a=>a.claims=['3:chest'],a=>a.claims=['2:fake'],a=>a.claims=['2:chest','2:chest'],a=>a.claims=['1:ghost','2:ghost'],a=>a.escort={fromRoom:1,dueRoom:3},a=>a.escort={fromRoom:2,dueRoom:4},a=>a.claims=Array(25).fill('2:chest')]){
    const bad=copy(good);mutate(bad.adventure);assert.equal(restoreRun(bad),null);
  }
});

test('the real room pool contains twenty ordinary behaviours, excluding tiny summons and bosses', () => {
  const found=new Set(), mixes=new Set();
  for(let seed=1;seed<=80;seed++) {
    const s=roomFixture(5,seed,390,1000,'five-acts');
    for(const e of s.enemies)found.add(e.type);
    mixes.add(s.enemies.map(e=>e.type).sort().join(','));
    const resumed=restoreRun(snapshot(s));assert.ok(resumed);assert.deepEqual(resumed.enemies,s.enemies);
  }
  assert.equal(found.size,20);assert.ok(!found.has('tiny'));assert.ok(!found.has('sentinel'));assert.ok(mixes.size>30);
});

test('shuffled layout bags vary across seeds, cover six layouts per bag and survive entrance reload', () => {
  const sequences=new Set();
  for(let seed=1;seed<=10;seed++) {
    const s=createRun({seed,campaign:'legacy'}), sequence=[];
    for(let room=1;room<=8;room++) {
      sequence.push(s.layout);assert.equal(restoreRun(snapshot(s)).layout,s.layout);
      if(room<8){clearFixture(s);enterRoom(s,'hunt');}
    }
    assert.equal(new Set(sequence.slice(0,6)).size,6);assert.ok(sequence.every((layout,i)=>i===0||layout!==sequence[i-1]));
    sequences.add(sequence.join(','));
  }
  assert.ok(sequences.size>=8);
});

test('v2 normal checkpoints keep fifteen-room campaign identity while old v1 remains eight-room', () => {
  const modern=roomFixture(11,10,390,1000,'five-acts'), snap=snapshot(modern), resumed=restoreRun(snap);
  assert.equal(snap.version,2);assert.equal(snap.totalRooms,15);assert.ok(resumed);
  assert.equal(resumed.totalRooms,15);assert.equal(resumed.act,4);assert.equal(resumed.biome,'storm');assert.equal(resumed.campaign,'five-acts');
  const legacy=roomFixture(5,10), old=snapshot(legacy);delete old.adventure;const oldRun=restoreRun(old);
  assert.equal(oldRun.totalRooms,8);assert.equal(oldRun.campaign,'legacy');assert.equal(oldRun.biome,'cinder');assert.equal(snapshot(oldRun).version,1);
  for(const mutate of [c=>c.totalRooms=8,c=>c.version=1,c=>c.totalRooms=16,c=>c.room=16,c=>c.route='rift']){const bad=copy(snap);mutate(bad);assert.equal(restoreRun(bad),null);}
});

test('rift is an optional boss-exit route with different occupants, speed, payout and strict checkpoint position', () => {
  const a=roomFixture(2,12,1100,720,'five-acts');a.phase='exit';assert.equal(enterRoom(a,'rift'),false);
  const worlds=['hunt','rift'].map(route=>{const s=createRun({seed:31});s.room=3;s.phase='exit';s.stats.rooms=3;s.relics={cold:3};enterRoom(s,route);return s;});
  const [normal,rift]=worlds;assert.equal(rift.room,4);assert.equal(rift.biome,'rift');assert.equal(rift.baseBiome,'mire');
  assert.equal(rift.enemies.length,normal.enemies.length+1);assert.notDeepEqual(rift.enemies.map(e=>e.type),normal.enemies.map(e=>e.type));
  const restored=restoreRun(snapshot(rift));assert.ok(restored);assert.equal(restored.route,'rift');assert.deepEqual(restored.enemies,rift.enemies);
  for(const s of worlds) {s.obstacles=[];s.player.x=220;s.player.y=350;s.player.invuln=20;s.enemies=[{...copy(s.enemies[0]),type:'sniper',x:480,y:350,hp:500,phase:'chase',cooldown:0}];advance(s,.88);}
  const speeds=worlds.map(s=>Math.hypot(s.bullets[0].vx,s.bullets[0].vy));assert.ok(Math.abs(speeds[1]/speeds[0]-(rift.riftRule==='surge'?1.22:1.12))<1e-8);
  for(const s of worlds){s.pickups=[];s.stats.embers=0;s.player.novaCharge=0;clearFixture(s);}
  assert.equal(rift.stats.embers-normal.stats.embers,6);assert.ok(rift.player.novaCharge>=30);
});

test('rift rules are seeded, have real temporary effects, and never leak into the next normal room', () => {
  const seeds=new Map();for(let seed=1;seed<100&&seeds.size<3;seed++)seeds.set(getRiftRule(seed,4),seed);
  assert.equal(seeds.size,3);
  for(const [rule,seed] of seeds) {
    const s=createRun({seed});s.room=3;s.phase='exit';s.stats.rooms=3;s.relics={cold:3};enterRoom(s,'rift');
    assert.equal(s.riftRule,rule);assert.equal(restoreRun(snapshot(s)).riftRule,rule);
    s.obstacles=[];s.interactables=[];s.enemies=[{...copy(s.enemies[0]),type:'slime',x:900,y:100,hp:1000,cooldown:999,phase:'chase'}];s.player.x=70;s.player.y=350;s.player.invuln=20;
    step(s,{fire:true,aimX:-100,aimY:350},DT);const projectile=s.bullets[0];
    if(rule==='echo') {assert.equal(projectile.bounces,1);advance(s,.1);assert.ok(projectile.vx>0);assert.equal(projectile.bounces,0);assert.ok(!projectile.dead);}
    if(rule==='glass')assert.equal(projectile.damage,12);
    if(rule==='surge'){s.player.novaCharge=0;advance(s,1);assert.ok(Math.abs(s.player.novaCharge-7.5)<.01);}
    if(rule==='glass') {
      s.player.invuln=0;s.bullets=[{id:990,owner:'enemy',x:s.player.x,y:s.player.y,r:5,vx:0,vy:0,life:1,damage:1,hits:[]}];step(s,{},DT);assert.equal(s.player.hp,4);
      s.player.invuln=0;s.enemies[0].x=s.player.x;s.enemies[0].y=s.player.y;advance(s,.1);assert.equal(s.player.hp,3);
    }
    clearFixture(s);enterRoom(s,'hunt');assert.equal(s.riftRule,null);assert.equal(s.biome,s.baseBiome);
    s.obstacles=[];s.interactables=[];s.player.x=70;s.player.y=350;step(s,{fire:true,aimX:-100,aimY:350},DT);const regular=s.bullets.find(b=>b.owner==='player');assert.equal(regular.damage,8);assert.equal(regular.bounces,s.relics.ricochet||0);
  }
});

test('fifteen-room progression has five independently seeded boss choices, stable restores and four optional rifts', () => {
  const bosses = new Set(), sequences = new Set();
  for (let seed = 1; seed <= 24; seed++) {
    const s = createRun({ seed }), sequence = [];
    for (let room = 1; room <= 15; room++) {
      assert.equal(s.room, room); assert.equal(s.act, Math.ceil(room / 3));
      assert.equal(isBossRoom(s), room % 3 === 0);
      const restored = restoreRun(snapshot(s)); assert.ok(restored, `seed ${seed}, room ${room}`);
      assert.deepEqual(restored.enemies, s.enemies); assert.equal(restored.bossId, s.bossId);
      if (isBossRoom(s)) {
        assert.ok(BOSS_POOLS[s.act - 1].includes(s.bossId));
        assert.equal(s.enemies.filter(e => e.type === s.bossId).length, 1);
        bosses.add(s.bossId); sequence.push(s.bossId);
      } else assert.equal(s.bossId, null);
      // This fixture verifies campaign/reward/checkpoint routing, not combat balance.
      clearFixture(s); assert.equal(s.stats.rooms, room);
      if (room === 15) { assert.equal(s.phase, 'won'); assert.equal(enterRoom(s), false); }
      else {
        assert.equal(s.phase, 'exit'); const rift = s.gates.find(g => g.route === 'rift');
        assert.equal(Boolean(rift), room % 3 === 0);
        if (rift) assert.equal(rift.riftRule, getRiftRule(seed, room + 1));
        const route = rift && seed % 2 ? 'rift' : 'refuge';
        assert.equal(enterRoom(s, route), true);
      }
    }
    assert.equal(Object.values(s.relics).reduce((sum, value) => sum + value, 0), 14);
    sequences.add(sequence.join(','));
  }
  assert.deepEqual([...bosses].sort(), BOSS_POOLS.flat().sort()); assert.ok(sequences.size >= 10);
});

test('rotation preserves a diagonal surf tell and relocates the Chronarch rewind anchor', () => {
  const s = chamber('leviathan'), e = s.enemies[0]; e.cooldown = 0; s.player.invuln = 100;
  for (let i = 0; i < 3600 && !(e.specialAction === 'leviathan-surf' && e.phase === 'windup'); i++) step(s, {}, DT);
  assert.equal(e.specialAction, 'leviathan-surf'); assert.equal(e.phase, 'windup');
  assert.ok(Math.abs(Math.abs(e.attackAngleOffset) - .45) < 1e-8);
  e.rewindX = 400; e.rewindY = 250;
  const sx = (390 - 56) / (s.width - 56), sy = (1000 - 150 - 66) / (s.height - 28 - 66);
  setWorldSize(s, 390, 1000);
  assert.ok(Math.abs(e.rewindX - (28 + (400 - 28) * sx)) < 1e-8);
  assert.ok(Math.abs(e.rewindY - (66 + (250 - 66) * sy)) < 1e-8);
  const targetAngle = Math.atan2(e.attackY - e.y, e.attackX - e.x);
  assert.ok(Math.abs(e.angle - targetAngle - e.attackAngleOffset) < 1e-8);
  assert.equal(e.telegraph.angle, e.angle);
});

test('new map v3 saves roundtrip while explicit v2 and omitted legacy geometry stay pinned', () => {
  assert.equal(createRun().mapVersion, 3);
  for (const mapVersion of [1, 2, 3]) {
    const run = createRun({ seed: 91, mapVersion }), saved = snapshot(run), resumed = restoreRun(saved);
    assert.ok(resumed); assert.equal(resumed.mapVersion, mapVersion);
    assert.deepEqual(resumed.obstacles, run.obstacles); assert.deepEqual(snapshot(resumed), saved);
    assert.equal(Object.hasOwn(saved, 'mapVersion'), mapVersion !== 1);
    setWorldSize(resumed, 420, 1000); assert.equal(resumed.mapVersion, mapVersion);
    assert.ok(restoreRun(snapshot(resumed)));
  }
  const saved = snapshot(createRun());
  for (const invalid of [0, 1, 4, '3', null, -1]) assert.equal(restoreRun({ ...saved, mapVersion: invalid }), null);
});

test('all ten naturally generated bosses expose the boolean HUD marker while ordinary supports do not', () => {
  const observed = new Set(), bossIds = new Set(BOSS_POOLS.flat());
  for (let seed = 1; seed <= 20; seed++) for (const room of [3, 6, 9, 12, 15]) {
    const s = roomFixture(room, seed, 1100, 720, 'five-acts');
    assert.equal(s.enemies.filter(e => e.boss).length, 1);
    for (const e of s.enemies) {
      assert.equal(e.boss, bossIds.has(e.type));
      assert.equal(describe(s).enemies.find(item => item.id === e.id).boss, e.boss);
      if (e.boss) observed.add(e.type);
    }
  }
  assert.deepEqual([...observed].sort(), [...bossIds].sort());
});
