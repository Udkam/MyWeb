import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, step, chooseRelic, enterRoom, setWorldSize, snapshot, restoreRun, describe, RELICS, WEAPONS } from '../src/engine.js';

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

test('both bosses change stage below half health and cycle fans, rings and charges', () => {
  for (const type of ['sentinel', 'warden']) {
    const s = chamber(type), e = s.enemies[0]; e.cooldown = 0; e.hp = 149;
    const seen = new Set();
    for (let i = 0; i < 1500; i++) { s.player.invuln = 2; step(s, {}, DT); if (e.telegraph) seen.add(e.telegraph.kind); }
    assert.equal(e.stage, 2); assert.deepEqual([...seen].sort(), ['fan', 'line', 'ring']);
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
  const s = createRun({ seed: 103 }); const bossTypes = [];
  for (let room = 1; room <= 8; room++) {
    assert.equal(s.room, room); bossTypes.push(...s.enemies.filter(e => ['sentinel', 'warden'].includes(e.type)).map(e => e.type));
    // Small-hp fixture exercises actual shots/kill/reward transitions without a debug production API.
    s.obstacles = []; s.player.x = 150; s.player.y = 350; s.player.invuln = 999;
    for (let i = 0; i < s.enemies.length; i++) Object.assign(s.enemies[i], { x: 300 + i * 40, y: 350, hp: 1, phase: 'chase', cooldown: 999 });
    advance(s, 40, state => ({ fire: true, aimX: state.enemies[0]?.x ?? 1000, aimY: state.enemies[0]?.y ?? 350 }));
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
      const s = createRun({ seed, width: 380, height: 1000 }); s.room = room - 1; s.phase = 'exit'; enterRoom(s, route); return s;
    });
    assert.equal(states[0].enemies.length, states[1].enemies.length + 2);
    for (const s of states) { assert.equal(s.waveTotal, 2); for (const e of s.enemies) assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) > 135); }
  }
  assert.equal(createRun().waveTotal, 1);
});

test('boss phase two summons exactly two supports once, with safe warning and no repeated summons', () => {
  for (const type of ['sentinel', 'warden']) {
    const s = chamber(type), boss = s.enemies[0]; boss.maxHp = type === 'sentinel' ? 600 : 950; boss.hp = boss.maxHp / 2 - 1;
    s.player.invuln = 20;
    step(s, {}, DT); assert.equal(boss.stage, 2); assert.equal(s.enemies.length, 3); assert.ok(boss.summoned);
    assert.equal(s.events.filter(e => e.type === 'boss-summon').length, 1);
    for (const e of s.enemies.slice(1)) { assert.equal(e.phase, 'spawn'); assert.ok(e.spawnTime > 0.88); assert.ok(Math.hypot(e.x - s.player.x, e.y - s.player.y) > 135); }
    assert.equal(advance(s, 2).filter(e => e.type === 'boss-summon').length, 0); assert.equal(s.enemies.length, 3);
    boss.hp = boss.maxHp; step(s, {}, DT); boss.hp = 1; step(s, {}, DT); assert.equal(s.enemies.length, 3);
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
