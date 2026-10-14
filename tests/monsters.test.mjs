import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIAL_ENEMIES, BOSS_DEFINITIONS, updateSpecialEnemy, adjustIncomingDamage } from '../src/monsters.js';
import { createRun, step, setWorldSize } from '../src/engine.js';

function harness(type, options = {}) {
  const definition = SPECIAL_ENEMIES[type] || BOSS_DEFINITIONS[type] || { hp: 28, r: 14 };
  const e = { id: 1, type, ...definition, maxHp: definition.hp, x: 230, y: 220, vx: 0, vy: 0, angle: 0, phase: 'chase', cooldown: 0, stage: 1, pattern: 0, ...options };
  const s = { width: 1000, height: 700, time: 0, player: { x: 390, y: 220, r: 13, hp: 100, maxHp: 100, novaCharge: 100 }, enemies: [e], hazards: [], bullets: [], effects: [], events: [], obstacles: [] };
  let nextId = 2, randomState = 1;
  const spawned = [], moves = [], hurt = [], hazardHistory = [], phases = [];
  const api = {
    random() { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; },
    move(target, dx, dy) {
      moves.push({ phase: target.phase, dx, dy });
      const x = target.x + dx, y = target.y + dy;
      target.x = Math.max(40, Math.min(960, x)); target.y = Math.max(80, Math.min(650, y));
      return target.x !== x || target.y !== y;
    },
    bullet(x, y, angle, speed, damage = 1, extra = {}) { const b = { id: nextId++, x, y, angle, speed, damage, ...extra }; s.bullets.push(b); return b; },
    hurt(amount = 1) { s.player.hp = Math.max(0, s.player.hp - amount); hurt.push(amount); },
    effect(type, x, y, life, extra = {}) { s.effects.push({ type, x, y, life, ...extra }); },
    spawn(type) {
      if (s.enemies.filter((enemy) => !enemy.dead && enemy.hp > 0).length >= 18) return null;
      const child = { id: nextId++, type, x: 600, y: 140, r: 10, hp: 10, maxHp: 10, phase: 'spawn', spawnTime: .9 };
      s.enemies.push(child); spawned.push(child); return child;
    },
    windup(target, kind, duration, angle, range, extra) {
      target.phase = 'windup'; target.windup = duration; target.windupMax = duration; target.angle = angle;
      target.vx = 0; target.vy = 0; target.telegraph = { kind, remaining: duration, angle, range, ...extra };
    },
    hazard(x, y, radius, delay, extra = {}) { const h = { id: nextId++, x, y, radius, remaining: delay, ...extra }; s.hazards.push(h); hazardHistory.push(h); return h; },
    kill(target) { target.dead = true; target.hp = 0; },
    blocked: (x, y, r) => x - r < 28 || x + r > 972 || y - r < 66 || y + r > 672,
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    angleTo: (a, b) => Math.atan2(b.y - a.y, b.x - a.x),
    slow: 1,
  };
  function frame(dt = 1 / 120) {
    if (alive(e)) updateSpecialEnemy(s, e, dt, api);
    s.time += dt;
    phases.push({ phase: e.phase, action: e.specialAction, x: e.x, y: e.y, untargetable: Boolean(e.untargetable) });
    for (const h of s.hazards) if (h.life !== undefined) { h.life -= dt; if (h.life <= 0) h.dead = true; }
    s.hazards = s.hazards.filter((h) => !h.dead);
  }
  function advance(seconds) { for (let i = 0; i < Math.ceil(seconds * 120); i++) frame(); }
  function until(predicate, maxSeconds = 12) {
    for (let i = 0; i < maxSeconds * 120; i++) { if (predicate()) return; frame(); }
    assert.fail(`Timed out waiting for ${type}: ${e.phase}/${e.specialAction}`);
  }
  return { s, e, api, spawned, moves, hurt, hazardHistory, phases, frame, advance, until };
}
const alive = (e) => !e.dead && e.hp > 0;

test('twelve explicit definitions are bounded and unsupported enemies remain with the base engine', () => {
  assert.deepEqual(Object.keys(SPECIAL_ENEMIES).sort(), ['weaver', 'bomber', 'trapper', 'summoner', 'leech', 'shieldbearer', 'prism', 'boomerang', 'burrower', 'medic', 'frost', 'duelist'].sort());
  for (const definition of Object.values(SPECIAL_ENEMIES)) {
    assert.ok(definition.hp > 0 && definition.hp < 100);
    assert.ok(definition.r >= 8 && definition.r <= 20);
    assert.equal(Object.isFrozen(definition), true);
  }
  const h = harness('slime');
  const before = JSON.stringify(h.e);
  assert.equal(updateSpecialEnemy(h.s, h.e, 1 / 120, h.api), false);
  assert.equal(JSON.stringify(h.e), before);
});

test('weaver fires paired sine-motion bullets after a body-only windup', () => {
  const h = harness('weaver'); h.frame();
  assert.equal(h.e.phase, 'windup'); assert.equal(h.e.telegraph.visible, false); assert.equal(h.e.telegraph.kind, 'self');
  h.until(() => h.s.bullets.length === 2);
  assert.equal(h.s.bullets.every((b) => b.motion === 'weave' && b.weaveAmplitude === 55 && b.weaveFrequency === 5), true);
  assert.notEqual(h.s.bullets[0].baseAngle, h.s.bullets[1].baseAngle);
});

test('bomber commits to a visible fuse, hurts nearby targets, and a player who leaves avoids the blast', () => {
  const near = harness('bomber'); near.s.player.x = 290; near.frame();
  assert.equal(near.e.phase, 'windup'); near.advance(.9);
  assert.equal(near.e.dead, true); assert.deepEqual(near.hurt, [2]);
  assert.equal(near.s.effects.some((effect) => effect.type === 'nova' && effect.radius === 90), true);
  const dodge = harness('bomber'); dodge.s.player.x = 290; dodge.frame(); dodge.s.player.x = 700; dodge.advance(.9);
  assert.equal(dodge.e.dead, true); assert.deepEqual(dodge.hurt, []);
});

test('trapper leaves persistent entity mines, at most two per owner at once', () => {
  const h = harness('trapper');
  for (let i = 0; i < 30 * 120; i++) {
    h.frame();
    assert.ok(h.s.hazards.filter((hazard) => hazard.kind === 'mine' && hazard.ownerId === h.e.id).length <= 2);
  }
  assert.ok(h.hazardHistory.length >= 3, 'Expired mines can be replaced');
  for (const mine of h.hazardHistory) {
    assert.equal(mine.kind, 'mine'); assert.equal(mine.armTime, .8);
    assert.equal(mine.radius, 14); assert.equal(mine.triggerRadius, 28);
    assert.equal(mine.ownerId, h.e.id);
  }
  assert.equal(h.s.bullets.length, 0);
});

test('summoner has two active summons and a lifetime budget of four, respecting an already full room', () => {
  const h = harness('summoner'); h.advance(18);
  assert.equal(h.spawned.length, 2);
  h.spawned.forEach((child) => { child.dead = true; child.hp = 0; }); h.advance(14);
  assert.equal(h.spawned.length, 4);
  h.spawned.forEach((child) => { child.dead = true; child.hp = 0; }); h.advance(14);
  assert.equal(h.spawned.length, 4);
  assert.ok(h.s.bullets.length > 0, 'When unable to summon it can still attack');
  const full = harness('summoner');
  for (let i = 2; i <= 18; i++) full.s.enemies.push({ id: i + 100, hp: 10, type: 'tiny' });
  full.advance(10); assert.equal(full.spawned.length, 0);
  assert.ok((full.e.summonTotal || 0) <= 4);
});

test('leech drains nova only after uninterrupted close channel, and damage or leaving range prevents it', () => {
  const h = harness('leech', { hp: 20 }); h.advance(1.2);
  assert.equal(h.s.player.novaCharge, 75); assert.equal(h.e.hp, 28);
  assert.ok(h.s.effects.some((effect) => effect.type === 'leech' && effect.x2 === h.s.player.x));
  const interrupt = harness('leech'); interrupt.frame(); interrupt.e.hp--; interrupt.advance(1.2);
  assert.equal(interrupt.s.player.novaCharge, 100);
  const leave = harness('leech'); leave.frame(); leave.s.player.x = 800; leave.advance(1.2);
  assert.equal(leave.s.player.novaCharge, 100);
});

test('shieldbearer reduces frontal bullets, takes extra rear damage and does not block non-directional effects', () => {
  const h = harness('shieldbearer'); h.e.angle = 0;
  assert.equal(adjustIncomingDamage(h.s, h.e, 10, 'bullet', { x: h.e.x + 20, y: h.e.y }), 2);
  assert.equal(adjustIncomingDamage(h.s, h.e, 10, 'bullet', { x: h.e.x - 20, y: h.e.y }), 15);
  assert.equal(adjustIncomingDamage(h.s, h.e, 10, 'burn'), 10);
  assert.equal(adjustIncomingDamage(h.s, h.e, 10, 'nova'), 10);
  assert.equal(adjustIncomingDamage(h.s, h.e, NaN, 'bullet'), 0);
  h.e.untargetable = true; assert.equal(adjustIncomingDamage(h.s, h.e, 10, 'nova'), 0);
});

test('prism emits three rotated crosses with one wall bounce, rather than a radial reskin', () => {
  const h = harness('prism'); h.until(() => h.s.bullets.length === 12);
  assert.ok(h.s.bullets.every((bullet) => bullet.bounces === 1 && bullet.style === 'prism'));
  assert.ok(Math.abs(h.s.bullets[4].angle - h.s.bullets[0].angle - .23) < 1e-8);
  assert.ok(Math.abs(h.s.bullets[1].angle - h.s.bullets[0].angle - Math.PI / 2) < 1e-8);
});

test('boomerang supplies a fixed return origin and delayed reversal for the engine', () => {
  const h = harness('boomerang'); h.until(() => h.s.bullets.length === 2);
  for (const bullet of h.s.bullets) {
    assert.equal(bullet.motion, 'boomerang'); assert.equal(bullet.turnAfter, .7);
    assert.equal(bullet.returnSpeed, 240); assert.equal(bullet.returnX, h.e.x); assert.equal(bullet.returnY, h.e.y);
  }
});

test('burrower targets the previous player position and emerges with another tell before attacking', () => {
  const h = harness('burrower'); const old = { x: h.s.player.x, y: h.s.player.y };
  h.frame(); h.s.player.x = 700;
  h.until(() => h.e.phase === 'burrow'); assert.equal(h.e.untargetable, true);
  h.until(() => h.e.specialAction === 'burrow-ambush');
  assert.equal(h.e.x, old.x); assert.equal(h.e.y, old.y);
  assert.equal(h.e.untargetable, false); assert.equal(h.e.phase, 'windup');
  assert.equal(h.s.bullets.length, 0);
  h.until(() => h.s.bullets.length === 4);
});

test('medic heals the nearest wounded ally, caps its health, and can be interrupted', () => {
  const h = harness('medic');
  const near = { id: 90, type: 'slime', x: 260, y: 220, hp: 18, maxHp: 25, phase: 'chase' };
  const far = { id: 91, type: 'slime', x: 410, y: 220, hp: 1, maxHp: 25, phase: 'chase' };
  h.s.enemies.push(near, far); h.advance(1.1);
  assert.equal(near.hp, 25); assert.equal(far.hp, 1); assert.equal(h.e.hp, h.e.maxHp);
  assert.ok(h.s.effects.some((effect) => effect.type === 'heal' && effect.x2 === near.x));
  const interrupt = harness('medic'); const ally = { ...near, hp: 5 }; interrupt.s.enemies.push(ally);
  interrupt.frame(); interrupt.e.hp--; interrupt.advance(1.1); assert.equal(ally.hp, 5);
});

test('frost applies finite temporary slowing metadata to a three-shot fan', () => {
  const h = harness('frost'); h.until(() => h.s.bullets.length === 3);
  assert.ok(h.s.bullets.every((bullet) => bullet.slowFactor === .55 && bullet.slowDuration === 1.4 && bullet.style === 'frost'));
});

test('duelist side-steps, performs two separately telegraphed thrusts and recovers', () => {
  const h = harness('duelist'); h.frame(); assert.equal(h.e.phase, 'sidestep');
  h.until(() => h.e.phase === 'recover');
  const transitions = h.phases.filter((phase, i, all) => phase.phase === 'charge' && all[i - 1]?.phase !== 'charge');
  assert.equal(transitions.length, 2);
  assert.ok(h.moves.some((move) => move.phase === 'sidestep' && Math.abs(move.dy) > 0));
  assert.ok(h.moves.some((move) => move.phase === 'charge' && Math.hypot(move.dx, move.dy) > 2));
  assert.equal(h.s.bullets.length, 0);
});

test('sentinel alternates rotating crosses and double charges, adding two shield guards only once', () => {
  const h = harness('sentinel'); h.advance(12);
  assert.ok(h.phases.some((phase) => phase.action === 'sentinel-cross' && phase.phase === 'burst'));
  assert.ok(h.phases.some((phase) => phase.action === 'sentinel-charge' && phase.phase === 'charge'));
  assert.equal(h.hazardHistory.length, 0);
  h.e.hp = h.e.maxHp * .49; h.advance(14);
  assert.deepEqual(h.spawned.map((enemy) => enemy.type), ['shieldbearer', 'shieldbearer']);
  assert.equal(h.s.events.filter((event) => event.type === 'boss-summon').length, 1);
  assert.equal(h.e.stage, 2);
});

test('warden teleports, creates timed landing rain and rotating fire, then enters a distinct low-health burst', () => {
  const h = harness('warden'); const start = { x: h.e.x, y: h.e.y }; h.advance(13);
  assert.ok(h.phases.some((phase) => phase.phase === 'blink'));
  assert.ok(h.phases.some((phase) => Math.hypot(phase.x - start.x, phase.y - start.y) > 100));
  assert.equal(h.hazardHistory.every((hazard) => hazard.kind === 'meteor' && hazard.remaining === .95), true);
  assert.ok(h.hazardHistory.length >= 3);
  assert.ok(h.phases.some((phase) => phase.action === 'warden-spin' && phase.phase === 'burst'));
  assert.equal(h.spawned.length, 0);
  h.e.hp = h.e.maxHp * .34; h.frame();
  assert.equal(h.e.specialAction, 'warden-rage'); assert.equal(h.e.phase, 'windup');
  h.advance(4); assert.equal(h.e.stage, 2);
  assert.equal(h.s.events.filter((event) => event.type === 'boss-rage').length, 1);
  assert.ok(h.s.bullets.filter((bullet) => bullet.color === '#ef799b').length >= 30);
});

test('all behaviours preserve finite state, bounded volleys and body-only tells across sustained updates', () => {
  for (const type of [...Object.keys(SPECIAL_ENEMIES), ...Object.keys(BOSS_DEFINITIONS)]) {
    const h = harness(type);
    if (type === 'bomber') h.s.player.x = 290;
    for (let i = 0; i < 40 * 120; i++) {
      h.frame();
      for (const [key, value] of Object.entries(h.e)) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${type}.${key}`);
      if (h.e.telegraph) assert.equal(h.e.telegraph.visible, false, `${type} must not request a ground warning`);
      assert.ok(h.s.enemies.filter(alive).length <= 18);
    }
    assert.ok(h.s.bullets.length < 600, `${type} emitted an unbounded burst`);
  }
});

test('invalid timesteps do not mutate supported enemies, and large dt is clamped', () => {
  const h = harness('weaver'); const before = JSON.stringify(h.e);
  for (const dt of [NaN, Infinity, -1, 0]) assert.equal(updateSpecialEnemy(h.s, h.e, dt, h.api), true);
  assert.equal(JSON.stringify(h.e), before);
  updateSpecialEnemy(h.s, h.e, 1e6, h.api);
  assert.equal(h.e.specialAge, 1 / 30);
  assert.equal(h.s.bullets.length, 0, 'A stalled frame cannot skip straight past the tell');
});

function engineFixture(type) {
  const state = createRun({ seed: 19, width: 1100, height: 720 });
  const definition = SPECIAL_ENEMIES[type] || BOSS_DEFINITIONS[type];
  const enemy = { ...state.enemies[0], ...definition, maxHp: definition.hp, type, id: 900, x: 300, y: 300, phase: 'chase', cooldown: 0, spawnTime: 0 };
  state.enemies = [enemy]; state.obstacles = []; state.interactables = []; state.waveDelay = 0;
  state.player.x = 580; state.player.y = 300; state.player.invuln = 1000;
  function advance(seconds, observe = () => {}) {
    for (let i = 0; i < Math.ceil(seconds * 120); i++) { step(state, {}, 1 / 120); observe(state); }
  }
  return { state, enemy, advance };
}

test('real engine step dispatches every new type and both bosses into their distinct mechanisms', () => {
  const observed = {};
  for (const type of [...Object.keys(SPECIAL_ENEMIES), 'sentinel', 'warden']) {
    const { state, enemy, advance } = engineFixture(type);
    if (type === 'bomber') state.player.x = 370;
    if (type === 'leech') state.player.x = 440;
    if (type === 'medic') state.enemies.push({ ...enemy, id: 901, type: 'slime', x: 345, hp: 5, maxHp: 28 });
    const seen = new Set();
    advance(18, () => {
      seen.add(enemy.phase); if (enemy.specialAction) seen.add(enemy.specialAction);
      if (enemy.dead) seen.add('dead');
      if (enemy.untargetable) seen.add('untargetable');
      if (state.player.novaCharge < 85) seen.add('drained');
      if (state.enemies.find((e) => e.id === 901)?.hp > 5) seen.add('healed');
      if (state.enemies.some((e) => e.type === 'tiny')) seen.add('summon');
      for (const b of state.bullets) { if (b.motion) seen.add(b.motion); if (b.bounces) seen.add('bounce'); if (b.slowDuration) seen.add('slow'); }
      for (const hazard of state.hazards) seen.add(hazard.kind);
    });
    observed[type] = seen;
    assert.ok(Number.isFinite(enemy.x) && Number.isFinite(enemy.y), type);
  }
  for (const [type, signatures] of Object.entries({
    weaver: ['weave'], bomber: ['dead'], trapper: ['mine'], summoner: ['summon'], leech: ['drained'],
    shieldbearer: ['charge'], prism: ['bounce'], boomerang: ['boomerang'], burrower: ['untargetable', 'burrow-ambush'],
    medic: ['healed'], frost: ['slow'], duelist: ['sidestep', 'charge'], sentinel: ['sentinel-cross', 'sentinel-charge'],
    warden: ['blink', 'meteor', 'warden-spin'],
  })) for (const signature of signatures) assert.ok(observed[type].has(signature), `${type}: engine never observed ${signature}`);
});

test('real engine sine bullets alter lateral velocity and boomerangs actually reverse toward their fixed origin', () => {
  const wave = engineFixture('weaver'); wave.state.player.x = 950;
  let projectile;
  wave.advance(.8, (s) => { projectile ||= s.bullets.find((b) => b.motion === 'weave'); });
  assert.ok(projectile);
  const initialVy = projectile.vy; wave.advance(.15); assert.notEqual(projectile.vy, initialVy);
  const returning = engineFixture('boomerang'); returning.state.player.x = 950;
  let returningBullet, wasOutbound = false, wasInbound = false;
  returning.advance(2, (s) => {
    returningBullet ||= s.bullets.find((b) => b.motion === 'boomerang');
    if (!returningBullet || returningBullet.dead) return;
    const dot = returningBullet.vx * (returningBullet.returnX - returningBullet.x) + returningBullet.vy * (returningBullet.returnY - returningBullet.y);
    if (returningBullet.age < returningBullet.turnAfter && dot < 0) wasOutbound = true;
    if (returningBullet.age >= returningBullet.turnAfter && dot > 0) wasInbound = true;
  });
  assert.equal(wasOutbound, true); assert.equal(wasInbound, true);
});

test('real engine frost collision slows movement temporarily and restores ordinary movement afterwards', () => {
  const { state } = engineFixture('frost');
  state.enemies[0].phase = 'spawn'; state.enemies[0].spawnTime = 100;
  state.player.invuln = 0;
  state.bullets.push({ id: 909, owner: 'enemy', x: state.player.x - 1, y: state.player.y, vx: 10, vy: 0, r: 5, damage: 1, life: 4, hits: [], bounces: 0, slowFactor: .55, slowDuration: 1.4 });
  step(state, {}, 1 / 120);
  assert.equal(state.player.hp, 5); assert.ok(state.player.slowTime > 1.3);
  step(state, { moveX: 1 }, 1 / 120); assert.ok(Math.abs(state.player.vx - 215 * .55) < 1e-6);
  for (let i = 0; i < 190; i++) step(state, {}, 1 / 120);
  step(state, { moveX: 1 }, 1 / 120);
  assert.equal(state.player.slowTime, 0); assert.equal(state.player.vx, 215);
});

test('real engine applies shield origin damage and avoids invisible burrow contact damage', () => {
  for (const [direction, expected] of [[1, 2], [-1, 15]]) {
    const { state, enemy } = engineFixture('shieldbearer');
    enemy.phase = 'windup'; enemy.windup = 10; enemy.angle = 0; enemy.specialAction = 'shieldbearer'; enemy.telegraph = { remaining: 10 };
    state.bullets.push({ id: 910, owner: 'player', x: enemy.x + direction * (enemy.r + 2), y: enemy.y, vx: direction * -100, vy: 0, r: 4, damage: 10, life: 4, hits: [], bounces: 0, pierces: 0 });
    step(state, {}, 1 / 120);
    assert.equal(enemy.maxHp - enemy.hp, expected);
  }
  const hidden = engineFixture('burrower');
  hidden.enemy.phase = 'burrow'; hidden.enemy.burrowTime = 1; hidden.enemy.untargetable = true;
  hidden.state.player.x = hidden.enemy.x; hidden.state.player.y = hidden.enemy.y; hidden.state.player.invuln = 0;
  hidden.advance(.2); assert.equal(hidden.state.player.hp, 6);
});

test('exactly ten independently identified boss definitions and twelve additional ordinary enemies are exported', () => {
  assert.deepEqual(Object.keys(BOSS_DEFINITIONS).sort(), ['sentinel', 'briar', 'leviathan', 'mirror', 'warden', 'kiln', 'tempest', 'eclipse', 'sovereign', 'chronarch'].sort());
  assert.equal(Object.keys(SPECIAL_ENEMIES).length, 12);
  for (const [id, definition] of Object.entries(BOSS_DEFINITIONS)) {
    assert.ok(definition.hp >= 500 && definition.hp <= 1500, id);
    assert.ok(definition.r >= 25 && definition.r <= 35, id);
    assert.equal(Object.hasOwn(SPECIAL_ENEMIES, id), false);
  }
});

test('real briar plants safe bounded solid posts, changes planting at half health, and old thorns expire', () => {
  const h = engineFixture('briar'); let normalMax = 0;
  h.advance(8, (s) => { normalMax = Math.max(normalMax, s.obstacles.filter((o) => o.kind === 'thorn').length); });
  assert.ok(normalMax > 0 && normalMax <= 2);
  h.enemy.hp = h.enemy.maxHp * .49;
  let hardMax = 0;
  h.advance(10, (s) => {
    const thorns = s.obstacles.filter((o) => o.kind === 'thorn'); hardMax = Math.max(hardMax, thorns.length);
    assert.ok(thorns.length <= 4);
    for (const thorn of thorns) assert.equal(s.player.x > thorn.x && s.player.x < thorn.x + thorn.w && s.player.y > thorn.y && s.player.y < thorn.y + thorn.h, false);
  });
  assert.equal(h.enemy.stage, 2); assert.ok(hardMax >= 3);
  h.enemy.phase = 'spawn'; h.enemy.spawnTime = 100;
  h.advance(6); assert.equal(h.state.obstacles.filter((o) => o.kind === 'thorn').length, 0);
});

test('real leviathan stage two overlaps returning tides with a pair of diagonal surfing charges', () => {
  const h = engineFixture('leviathan'); const actions = new Set();
  h.advance(12, () => actions.add(h.enemy.specialAction));
  assert.ok(actions.has('leviathan-tide') && actions.has('leviathan-surf'));
  h.enemy.hp = h.enemy.maxHp * .49;
  let overlap = false, charges = 0, previous = h.enemy.phase;
  h.advance(10, (s) => {
    if (h.enemy.phase === 'charge' && previous !== 'charge') charges++;
    if (h.enemy.phase === 'charge' && s.bullets.some((b) => b.motion === 'boomerang')) overlap = true;
    previous = h.enemy.phase;
  });
  assert.equal(h.enemy.stage, 2); assert.ok(charges >= 2); assert.equal(overlap, true);
});

test('briar never seals both ends of a narrow passage around the player', () => {
  const h = engineFixture('briar');
  h.state.obstacles = [{ x: 28, y: 66, w: 1044, h: 194, kind: 'wall' }, { x: 28, y: 340, w: 1044, h: 352, kind: 'wall' }];
  h.advance(2);
  const posts = h.state.obstacles.filter((o) => o.kind === 'thorn');
  assert.equal(posts.length, 1, 'A second post would seal the remaining exit');
});

test('real mirror keeps bounded temporary decoys, swaps in stage two and awards nothing on natural expiry', () => {
  const h = engineFixture('mirror'); let stageOneMax = 0;
  h.advance(12, (s) => { stageOneMax = Math.max(stageOneMax, s.enemies.filter((e) => e.mirrorDecoy).length); });
  assert.equal(stageOneMax, 1);
  h.enemy.hp = h.enemy.maxHp * .49;
  let stageTwoMax = 0, swapped = false;
  h.advance(14, (s) => {
    stageTwoMax = Math.max(stageTwoMax, s.enemies.filter((e) => e.mirrorDecoy).length);
    swapped ||= s.effects.some((effect) => effect.type === 'rewind');
  });
  assert.equal(stageTwoMax, 2); assert.equal(swapped, true);
  h.enemy.phase = 'spawn'; h.enemy.spawnTime = 100;
  const counters = { kills: h.state.stats.kills, embers: h.state.stats.embers };
  h.advance(8);
  assert.equal(h.state.enemies.some((e) => e.mirrorDecoy), false);
  assert.deepEqual({ kills: h.state.stats.kills, embers: h.state.stats.embers }, counters);
});

test('real kiln opens its core after flame volleys and stage two requires the exposed side for full bullet damage', () => {
  const h = engineFixture('kiln'); let flames = false, opened = false;
  h.advance(10, (s) => { flames ||= s.bullets.some((b) => b.style === 'flame'); opened ||= h.enemy.coreOpen === true; });
  assert.equal(flames, true); assert.equal(opened, true);
  h.enemy.hp = h.enemy.maxHp * .49; h.advance(1.1);
  assert.equal(h.enemy.stage, 2); assert.equal(h.enemy.coreOpen, true);
  const a = h.enemy.coreAngle;
  const side = { x: h.enemy.x + Math.cos(a) * 40, y: h.enemy.y + Math.sin(a) * 40 };
  const back = { x: h.enemy.x - Math.cos(a) * 40, y: h.enemy.y - Math.sin(a) * 40 };
  assert.equal(adjustIncomingDamage(h.state, h.enemy, 20, 'bullet', side), 35);
  assert.equal(adjustIncomingDamage(h.state, h.enemy, 20, 'bullet', back), 10);
  h.enemy.coreOpen = false;
  assert.equal(adjustIncomingDamage(h.state, h.enemy, 20, 'bullet', side), 7);
});

test('real tempest uses phased helix projectiles and changes to diagonal lightning with reversed orbits', () => {
  const h = engineFixture('tempest'); const phases = new Set();
  h.advance(12, (s) => { for (const b of s.bullets) if (b.motion === 'weave') phases.add(b.weavePhase); });
  assert.ok(phases.has(0) && phases.has(Math.PI));
  h.enemy.hp = h.enemy.maxHp * .49;
  let diagonal = false; const signs = new Set();
  h.advance(12, (s) => {
    signs.add(h.enemy.orbitSign);
    const lightning = s.hazards.filter((hazard) => hazard.kind === 'lightning');
    if (lightning.length >= 3) diagonal ||= new Set(lightning.map((hazard) => hazard.y)).size >= 3;
  });
  assert.equal(diagonal, true); assert.ok(signs.has(-1) && signs.has(1));
});

test('real eclipse turns slow orbs toward the player then recalls them before phase-two teleport snipes', () => {
  const h = engineFixture('eclipse'); let orb;
  h.advance(1.1, (s) => { orb ||= s.bullets.find((b) => b.style === 'dark-orb'); });
  assert.ok(orb && orb.homing > 0);
  const angle = Math.atan2(orb.vy, orb.vx); h.state.player.y = 560; h.advance(.2);
  assert.notEqual(Math.atan2(orb.vy, orb.vx), angle);
  h.enemy.hp = h.enemy.maxHp * .49;
  let recalled = false, sniped = false;
  h.advance(6, (s) => {
    if (h.enemy.phase === 'blink') recalled ||= !s.bullets.some((b) => b.sourceId === h.enemy.id && b.style === 'dark-orb');
    sniped ||= h.enemy.specialAction === 'eclipse-snipe' && h.enemy.phase === 'burst';
  });
  assert.equal(recalled, true); assert.equal(sniped, true);
});

test('real sovereign changes guard type and firing formations across three stages within lifetime caps', () => {
  const h = engineFixture('sovereign'); h.advance(6);
  assert.ok(h.state.enemies.some((e) => e.commandOwner === h.enemy.id && e.type === 'shieldbearer'));
  h.enemy.hp = h.enemy.maxHp * .6; h.advance(6);
  assert.equal(h.enemy.stage, 2);
  assert.ok(h.state.enemies.some((e) => e.commandOwner === h.enemy.id && e.type === 'sniper'));
  assert.ok(h.state.enemies.filter((e) => e.commandOwner === h.enemy.id).length <= 4);
  const summonedBefore = h.enemy.commandTotal;
  h.enemy.hp = h.enemy.maxHp * .29;
  for (const e of h.state.enemies) if (e.commandOwner === h.enemy.id) { e.dead = true; e.hp = 0; }
  let threeArms = false;
  h.advance(12, (s) => {
    const own = s.bullets.filter((b) => b.color === '#edc484');
    threeArms ||= own.some((b) => b.vx > 80) && own.some((b) => b.vx < -80) && own.some((b) => Math.abs(b.vy) > 170);
  });
  assert.equal(h.enemy.stage, 3); assert.equal(h.enemy.commandTotal, summonedBefore);
  assert.ok(h.enemy.commandTotal <= 6); assert.equal(threeArms, true);
});

test('real chronarch stops and releases its bullets, rewinds between thrusts, and reverses its second-phase order', () => {
  const h = engineFixture('chronarch'); let held = false, released = false, rewound = false;
  h.advance(16, (s) => {
    for (const b of s.bullets) if (b.pauseAfter !== undefined) {
      if (b.paused && b.vx === 0 && b.vy === 0) held = true;
      if (!b.paused && b.age > b.pauseAfter + b.pauseFor && Math.hypot(b.vx, b.vy) > 300) released = true;
    }
    rewound ||= s.effects.some((effect) => effect.type === 'rewind');
  });
  assert.equal(held, true); assert.equal(released, true); assert.equal(rewound, true);
  h.enemy.hp = h.enemy.maxHp * .49; h.advance(1 / 120);
  assert.equal(h.enemy.stage, 2); assert.equal(h.enemy.specialAction, 'chronarch-charge');
});

test('chronarch phase two replaces its second aimed thrust with a separately told perpendicular short thrust', () => {
  for (const stage of [1, 2]) {
    const h = engineFixture('chronarch');
    h.enemy.pattern = 1;
    if (stage === 2) h.enemy.hp = h.enemy.maxHp * .49;
    let previous = h.enemy.phase;
    const tells = [], charges = [];
    h.advance(3, () => {
      if (h.enemy.specialAction === 'chronarch-charge' && h.enemy.phase !== previous) {
        if (h.enemy.phase === 'windup') {
          tells.push({ duration: h.enemy.windupMax, offset: h.enemy.attackAngleOffset });
          assert.equal(h.enemy.telegraph.visible, false);
        }
        if (h.enemy.phase === 'charge') {
          const targetAngle = Math.atan2(h.enemy.attackY - h.enemy.y, h.enemy.attackX - h.enemy.x);
          const velocityAngle = Math.atan2(h.enemy.vy, h.enemy.vx);
          const relative = Math.atan2(Math.sin(velocityAngle - targetAngle), Math.cos(velocityAngle - targetAngle));
          charges.push({ duration: h.enemy.chargeTime, relative });
        }
      }
      previous = h.enemy.phase;
    });
    assert.equal(charges.length, 2, `stage ${stage} completes two actual charges`);
    assert.equal(tells.length, 2);
    assert.ok(tells[0].duration >= .8 && tells[1].duration >= .5, 'Each thrust preserves its own readable body tell');
    assert.ok(Math.abs(charges[0].relative) < 1e-8);
    assert.ok(Math.abs(charges[1].relative - (stage === 2 ? Math.PI / 2 : 0)) < 1e-8);
    assert.equal(charges[0].duration, .62);
    assert.equal(charges[1].duration, stage === 2 ? .44 : .62);
  }
});

test('real engine exercises every boss health phase with finite state, bounded bodies and no ordinary floor tells', () => {
  for (const type of Object.keys(BOSS_DEFINITIONS)) {
    const h = engineFixture(type);
    for (const health of [1, .49, .29]) {
      h.enemy.hp = h.enemy.maxHp * health;
      h.advance(12, (s) => {
        for (const [key, value] of Object.entries(h.enemy)) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${type}.${key}`);
        assert.ok(s.enemies.filter(alive).length <= 18, type);
        assert.ok(s.bullets.length <= 150, `${type} projectile cap`);
        if (h.enemy.telegraph) assert.equal(h.enemy.telegraph.visible, false, type);
      });
    }
    assert.ok(h.enemy.stage >= 2, type);
  }
});

test('resizing keeps diagonal surf orientation and transforms the chronarch rewind anchor', () => {
  const surf = engineFixture('leviathan'); surf.enemy.pattern = 1;
  surf.advance(1 / 120); assert.equal(surf.enemy.specialAction, 'leviathan-surf');
  assert.ok(Math.abs(surf.enemy.attackAngleOffset - .45) < 1e-8);
  setWorldSize(surf.state, 420, 1000);
  const targetAngle = Math.atan2(surf.enemy.attackY - surf.enemy.y, surf.enemy.attackX - surf.enemy.x);
  assert.ok(Math.abs(surf.enemy.angle - targetAngle - .45) < 1e-8);
  const rewind = engineFixture('chronarch'); rewind.enemy.pattern = 1;
  rewind.advance(1 / 120); assert.equal(rewind.enemy.specialAction, 'chronarch-charge');
  const expectedX = 28 + (rewind.enemy.rewindX - 28) * ((420 - 56) / (1100 - 56));
  const expectedY = 66 + (rewind.enemy.rewindY - 66) * ((1000 - 150 - 66) / (720 - 28 - 66));
  setWorldSize(rewind.state, 420, 1000);
  assert.ok(Math.abs(rewind.enemy.rewindX - expectedX) < 1e-8);
  assert.ok(Math.abs(rewind.enemy.rewindY - expectedY) < 1e-8);
});
