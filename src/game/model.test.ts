import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createModel, step, restart, setPaused, setFocused, snapshot, WORLD, MUZZLES, FIXED_MS,
  type Model, type Input, type Enemy, type Projectile,
} from './model';

function ticks(model: Model, count: number, input: Partial<Input> = {}): void {
  for (let i = 0; i < count; i += 1) step(model, input);
}

function encounter(heroX = 260, swordX = 304): Model {
  const model = createModel();
  model.hero.x = heroX;
  const sword = model.enemies[0]!;
  sword.x = swordX;
  sword.action = 'stagger';
  sword.actionTime = -100000;
  model.enemies[1]!.hp = 0;
  return model;
}

function incoming(model: Model, input: Partial<Input> = {}): void {
  const sword = model.enemies[0]!;
  sword.action = 'attack';
  sword.actionTime = 0;
  sword.attackResolved = false;
  sword.facing = model.hero.x < sword.x ? -1 : 1;
  step(model, input);
}

function holdEnemy(enemy: Enemy): void {
  enemy.action = 'stagger';
  enemy.actionTime = -100000;
}

function ball(extra: Partial<Projectile> = {}): Projectile {
  return { id: 900, kind: 'cannon', owner: 'cannon', x: 600, y: WORLD.floor + MUZZLES.cannon.y,
    vx: -50000, vy: 0, radius: 5, damage: 3, age: 0, lifetime: 2500, ...extra };
}

test('fixed tick and full-solid crate/world walls constrain walking without tunnelling', () => {
  const model = createModel();
  model.enemies.forEach(enemy => { enemy.hp = 0; });
  ticks(model, 100, { move: 1 });
  assert.equal(model.hero.x, 150, 'right body edge stops at crate left edge');
  assert.equal(model.hero.y, WORLD.floor);
  assert.equal(model.time, model.tick * FIXED_MS);
  model.hero.vx = 20000;
  model.hero.x = 250;
  ticks(model, 300, { move: 1 });
  assert.equal(model.hero.x + model.hero.width / 2, WORLD.right);
  ticks(model, 500, { move: -1 });
  assert.equal(model.hero.x - model.hero.width / 2, 208, 'crate also blocks from the right');
  model.hero.x = 100;
  ticks(model, 100, { move: -1 });
  assert.equal(model.hero.x - model.hero.width / 2, WORLD.left);
});

test('jump clears the crate, lands on it, and single-way platform permits ascent from below', () => {
  const model = createModel();
  model.enemies.forEach(enemy => { enemy.hp = 0; });
  model.hero.x = 140;
  step(model, { jumpPressed: true, move: 1 });
  ticks(model, 17, { move: 1 });
  assert.ok(model.hero.y < 231 && model.hero.x > 160);
  ticks(model, 40);
  assert.equal(model.hero.y, 231);
  assert.equal(model.hero.grounded, true);
  model.hero.x = 470;
  model.hero.y = WORLD.floor;
  model.hero.grounded = true;
  step(model, { jumpPressed: true });
  ticks(model, 20);
  assert.ok(model.hero.y < 207, 'passes upward through the one-way platform');
  ticks(model, 35);
  assert.equal(model.hero.y, 207);
  assert.equal(model.hero.grounded, true);
});

test('holding defense, including repeated pressed flags, cannot refresh the 140ms parry window', () => {
  const model = encounter();
  step(model, { guardPressed: true, guardHeld: true });
  const pressedAt = model.hero.guardPressedAt;
  ticks(model, 15, { guardPressed: true, guardHeld: true });
  incoming(model, { guardPressed: true, guardHeld: true });
  assert.equal(model.hero.guardPressedAt, pressedAt);
  assert.equal(model.hero.hp, 6);
  assert.equal(model.log.filter(event => event.type === 'parry').length, 0);
  assert.equal(model.log.filter(event => event.type === 'block').length, 1);
  holdEnemy(model.enemies[0]!);
  step(model);
  incoming(model, { guardPressed: true, guardHeld: true });
  assert.equal(model.log.filter(event => event.type === 'parry').length, 1, 'release and a real new press reopen the window');
});

test('front guard parries, while an attack from behind hurts through held guard', () => {
  const front = encounter();
  incoming(front, { guardPressed: true, guardHeld: true });
  assert.equal(front.hero.hp, 6);
  assert.equal(front.hero.parryTarget?.enemyId, 'sword-1');
  assert.equal(front.hero.frameIndex, 16);
  assert.equal(front.enemies[0]!.action, 'stagger');
  const back = encounter(260, 220);
  incoming(back, { guardPressed: true, guardHeld: true });
  assert.equal(back.hero.hp, 5);
  assert.equal(back.hero.action, 'hurt');
  assert.equal(back.hero.frameIndex, 21);
  assert.equal(back.log.some(event => event.type === 'parry' || event.type === 'block'), false);
});

test('three ordinary blocks inside two seconds break guard and the next hit hurts', () => {
  const model = encounter();
  for (let i = 0; i < 3; i += 1) {
    incoming(model, { guardHeld: true });
    holdEnemy(model.enemies[0]!);
    if (i < 2) ticks(model, 15, { guardHeld: true });
  }
  assert.equal(model.log.filter(event => event.type === 'block').length, 3);
  assert.equal(model.log.filter(event => event.type === 'guardBreak').length, 1);
  assert.equal(model.hero.hp, 6);
  assert.ok(model.hero.guardBrokenUntil > model.time);
  incoming(model, { guardPressed: true, guardHeld: true });
  assert.equal(model.hero.hp, 5);
});

test('ordinary blocks outside the rolling two-second window do not accumulate forever', () => {
  const model = encounter();
  incoming(model, { guardHeld: true });
  holdEnemy(model.enemies[0]!);
  ticks(model, 125, { guardHeld: true });
  incoming(model, { guardHeld: true });
  assert.equal(model.hero.blockTimes.length, 1);
  assert.equal(model.log.some(event => event.type === 'guardBreak'), false);
});

test('the parried target receives a 54px shove, with active contact on frame 19', () => {
  const model = encounter();
  incoming(model, { guardPressed: true, guardHeld: true });
  const initial = model.enemies[0]!.x;
  step(model, { move: 1, attackPressed: true, guardHeld: true });
  assert.equal(model.hero.action, 'shovePrep');
  assert.equal(model.hero.frameIndex, 18);
  assert.equal(model.hero.parryTarget, null, 'the token is consumed by this action');
  ticks(model, 8);
  assert.equal(model.hero.frameIndex, 19);
  ticks(model, 12);
  assert.ok(Math.abs(model.enemies[0]!.x - initial - 54) < 0.001);
  assert.equal(model.log.filter(event => event.type === 'shove').length, 1);
  assert.equal(model.enemies[0]!.hp, 3, 'shove is control, not a hidden ordinary slash');
});

test('a shove cannot transfer its token to another enemy or work while turned away/expired', () => {
  const wrongTarget = encounter();
  wrongTarget.hero.parryTarget = { enemyId: 'musket-1', facing: 1, expiresAt: 800 };
  step(wrongTarget, { attackPressed: true });
  assert.equal(wrongTarget.hero.attack?.kind, 'ground');
  const turned = encounter();
  incoming(turned, { guardPressed: true, guardHeld: true });
  step(turned, { move: -1, attackPressed: true });
  assert.equal(turned.hero.facing, -1);
  assert.equal(turned.hero.attack?.kind, 'ground');
  const expired = encounter();
  incoming(expired, { guardPressed: true, guardHeld: true });
  holdEnemy(expired.enemies[0]!);
  ticks(expired, 49);
  step(expired, { attackPressed: true });
  assert.equal(expired.hero.attack?.kind, 'ground');
});

test('attack alone chooses ordinary pursuit and preserves momentum; toward + attack chooses shove', () => {
  const ordinary = encounter();
  incoming(ordinary, { guardPressed: true, guardHeld: true });
  step(ordinary, { attackPressed: true });
  assert.equal(ordinary.hero.attack?.kind, 'ground');
  assert.equal(ordinary.hero.parryTarget?.enemyId, 'sword-1');
  assert.equal(ordinary.log.some(event => event.type === 'shovePrepare'), false);
  const shove = encounter();
  incoming(shove, { guardPressed: true, guardHeld: true });
  step(shove, { move: 1, attackPressed: true });
  assert.equal(shove.hero.attack?.kind, 'shove');
  assert.equal(shove.hero.parryTarget, null);
});

test('shove displacement stops at world wall and a solid crate', () => {
  const wall = encounter(564, 608);
  incoming(wall, { guardPressed: true, guardHeld: true });
  step(wall, { move: 1, attackPressed: true });
  ticks(wall, 25);
  assert.equal(wall.enemies[0]!.x + wall.enemies[0]!.width / 2, WORLD.right);
  assert.equal(wall.enemies[0]!.pushRemaining, 0);
  const crate = encounter(272, 228);
  crate.hero.facing = -1;
  incoming(crate, { guardPressed: true, guardHeld: true });
  step(crate, { move: -1, attackPressed: true });
  ticks(crate, 25);
  assert.equal(crate.enemies[0]!.x - crate.enemies[0]!.width / 2, 208);
});

test('one attack damages an enemy at most once across its entire active window', () => {
  const model = encounter(260, 300);
  step(model, { attackPressed: true });
  assert.equal(model.hero.frameIndex, 12);
  ticks(model, 8);
  assert.equal(model.hero.frameIndex, 13);
  ticks(model, 12);
  assert.equal(model.hero.frameIndex, 14);
  assert.equal(model.enemies[0]!.hp, 2);
  assert.equal(model.log.filter(event => event.type === 'attackHit').length, 1);
});

test('only one air slash is allowed before landing', () => {
  const model = createModel();
  model.enemies.forEach(enemy => { enemy.hp = 0; });
  step(model, { jumpPressed: true, attackPressed: true });
  assert.equal(model.hero.attack?.kind, 'air');
  assert.equal(model.hero.frameIndex, 11);
  ticks(model, 17);
  assert.equal(model.hero.attack, null);
  assert.equal(model.hero.grounded, false);
  step(model, { attackPressed: true });
  assert.equal(model.hero.attack, null);
  ticks(model, 35);
  assert.equal(model.hero.airAttackUsed, false);
});

test('sword telegraphs before its one active hit and visibly recovers', () => {
  const model = encounter();
  model.enemies[0]!.action = 'idle';
  step(model);
  assert.equal(model.enemies[0]!.action, 'windup');
  assert.equal(model.enemies[0]!.frameIndex, 5);
  ticks(model, 30);
  assert.equal(model.enemies[0]!.action, 'windup');
  assert.equal(model.enemies[0]!.frameIndex, 6);
  assert.equal(model.hero.hp, 6);
  ticks(model, 2);
  assert.equal(model.enemies[0]!.action, 'attack');
  assert.equal(model.enemies[0]!.frameIndex, 7);
  assert.equal(model.hero.hp, 5);
  ticks(model, 8);
  assert.equal(model.enemies[0]!.action, 'recovery');
  assert.equal(model.enemies[0]!.frameIndex, 8);
  assert.equal(model.hero.hp, 5, 'active frames do not repeatedly damage the same target');
});

test('musket locks aim, fires from its muzzle, reloads, and a melee hit interrupts reload', () => {
  const model = createModel();
  model.enemies[0]!.hp = 0;
  step(model);
  const musket = model.enemies[1]!;
  assert.equal(musket.action, 'aim');
  assert.equal(musket.frameIndex, 15);
  ticks(model, 24);
  const aimX = musket.aimX;
  model.hero.x = 300;
  ticks(model, 18);
  assert.equal(musket.aimX, aimX, 'late aim no longer tracks the moving hero');
  assert.equal(musket.action, 'fire');
  assert.equal(musket.frameIndex, 17);
  const fire = model.log.find(event => event.type === 'musketFire')!;
  assert.equal(fire.x, musket.x - MUZZLES.musket.x);
  assert.equal(fire.y, musket.y + MUZZLES.musket.y);
  ticks(model, 8);
  assert.equal(musket.action, 'reload');
  assert.equal(musket.frameIndex, 18);
  model.hero.x = 450;
  model.hero.y = 207;
  model.hero.grounded = true;
  model.hero.facing = 1;
  step(model, { attackPressed: true });
  ticks(model, 8);
  assert.equal(musket.hp, 1);
  assert.equal(musket.action, 'hurt');
  assert.equal(musket.frameIndex, 21);
  assert.equal(model.log.filter(event => event.type === 'musketFire').length, 1);
});

test('dodge immunity exists only in its 60..180ms middle, leaving startup and recovery vulnerable', () => {
  for (const [advance, expectedHp] of [[0, 5], [5, 6], [12, 5]] as const) {
    const model = encounter(260, 216);
    step(model, { dodgePressed: true });
    ticks(model, advance);
    const sword = model.enemies[0]!;
    sword.x = model.hero.x - 44;
    incoming(model);
    assert.equal(model.hero.hp, expectedHp, `hit at dodge tick ${advance + 1}`);
  }
  const model = encounter(606, 562);
  model.hero.invulnerableUntil = 900;
  step(model, { dodgePressed: true });
  assert.equal(model.hero.invulnerableUntil, 900, 'dodge never overwrites or extends injury immunity');
  ticks(model, 20);
  assert.equal(model.hero.x + model.hero.width / 2, WORLD.right);
});

test('ordinary bodies block walking and landing instead of allowing heroes and enemies to overlap', () => {
  const model = encounter();
  ticks(model, 50, { move: 1 });
  assert.equal(model.hero.x, 282);
  assert.equal(model.enemies[0]!.x, 304);
  const landing = encounter(304, 304);
  landing.hero.y = 175;
  landing.hero.grounded = false;
  landing.hero.vy = 250;
  ticks(landing, 30);
  assert.ok(Math.abs(landing.hero.x - landing.enemies[0]!.x) >= 22);
  assert.equal(landing.hero.y, WORLD.floor);
  assert.equal(landing.hero.grounded, true);
});

test('light-foe dodge crosses when a landing fits and shortens before a wall-trapped foe', () => {
  const open = encounter();
  step(open, { dodgePressed: true });
  ticks(open, 20);
  assert.ok(open.hero.x > open.enemies[0]!.x + 22);
  assert.ok(Math.abs(open.hero.x - open.hero.dodgeTargetX) < 0.001);
  const tight = encounter(564, 608);
  step(tight, { dodgePressed: true });
  assert.equal(tight.hero.dodgeTargetX, 586);
  ticks(tight, 20);
  assert.equal(tight.hero.x, 586, 'stops on the legal near side instead of ending inside the foe');
  assert.equal(tight.enemies[0]!.x, 608);
  const moving = encounter();
  step(moving, { dodgePressed: true });
  ticks(moving, 7);
  moving.enemies[0]!.x = 340;
  ticks(moving, 13);
  assert.ok(Math.abs(moving.hero.x - moving.enemies[0]!.x) >= 22,
    'a foe entering the planned landing is separated on dodge exit');
});

test('shoving one foe into another respects their physical bodies', () => {
  const model = encounter();
  const musket = model.enemies[1]!;
  musket.hp = 2;
  musket.y = WORLD.floor;
  musket.x = 340;
  holdEnemy(musket);
  incoming(model, { guardPressed: true, guardHeld: true });
  step(model, { move: 1, attackPressed: true });
  ticks(model, 24);
  assert.equal(model.enemies[0]!.x, 318);
  assert.equal(musket.x, 340);
});

test('front-held guard cannot block or parry musket fire', () => {
  const model = encounter();
  model.enemies[0]!.hp = 0;
  model.enemies[1]!.hp = 2;
  model.projectiles.push(ball({ kind: 'musket', owner: 'musket-1', x: 300,
    y: model.hero.y - 25, vx: -6000, radius: 3, damage: 1 }));
  step(model, { guardPressed: true, guardHeld: true });
  assert.equal(model.hero.hp, 5);
  assert.equal(model.hero.parryTarget, null);
  assert.equal(model.log.some(event => event.type === 'parry' || event.type === 'block'), false);
});

test('sample musket aim stays within eighteen degrees of the horizontal sprite pose', () => {
  const model = createModel();
  model.enemies[0]!.hp = 0;
  model.hero.x = 450;
  step(model);
  ticks(model, 42);
  const shot = model.projectiles.find(projectile => projectile.kind === 'musket')!;
  assert.ok(shot);
  assert.ok(Math.atan2(Math.abs(shot.vy), Math.abs(shot.vx)) <= Math.PI / 10 + 0.00001);
  const fire = model.log.find(event => event.type === 'musketFire')!;
  assert.equal(fire.x, model.enemies[1]!.x - 37);
  assert.equal(fire.y, model.enemies[1]!.y - 46);
});

test('swept cannon collision hits a crossed enemy at extreme speed instead of tunnelling', () => {
  const model = encounter(86, 284);
  model.projectiles.push(ball());
  step(model);
  assert.equal(model.enemies[0]!.hp, 0);
  assert.equal(model.projectiles.length, 0);
  assert.equal(model.hero.hp, 6, 'first contact consumes the projectile');
  assert.ok(model.log.some(event => event.type === 'cannonHit' && event.target === 'sword-1'));
});

test('swept collision respects a thin platform and wall/terrain before bodies behind them', () => {
  const model = createModel();
  model.enemies.forEach(enemy => { enemy.hp = 0; });
  model.projectiles.push(ball());
  step(model);
  assert.equal(model.hero.hp, 6, 'the full-solid crate stops the shot before the hero');
  assert.ok(model.log.some(event => event.type === 'cannonImpact' && event.target === 'crate'));
  model.projectiles.push(ball({ id: 901, x: 450, y: 100, vx: 0, vy: 12000 }));
  step(model);
  assert.ok(model.log.some(event => event.type === 'cannonImpact' && event.target === 'platform'));
  model.projectiles.push(ball({ id: 902, vx: 50000 }));
  step(model);
  assert.ok(model.log.some(event => event.type === 'cannonImpact' && event.target === 'right-wall'));
  assert.equal(model.projectiles.length, 0);
});

test('cannon requires nearby interaction, visible windup, and can hurt its operator', () => {
  const model = createModel();
  model.enemies.forEach(enemy => { enemy.hp = 0; });
  step(model, { interactPressed: true });
  assert.equal(model.cannon.action, 'idle');
  model.hero.x = 568;
  step(model, { interactPressed: true });
  assert.equal(model.cannon.action, 'windup');
  assert.equal(model.cannon.frameIndex, 1);
  assert.equal(model.projectiles.length, 0);
  ticks(model, 27, { guardHeld: true });
  assert.equal(model.cannon.action, 'recovery');
  assert.equal(model.hero.hp, 3, 'a cannon is not blocked by ordinary guard');
  assert.ok(model.log.some(event => event.type === 'cannonHit' && event.target === 'hero'));
});

test('hurt immunity lasts 700ms, death stops inputs, restart reconstructs the full scene', () => {
  const model = encounter(260, 220);
  incoming(model);
  const immunity = model.hero.invulnerableUntil;
  incoming(model);
  assert.equal(model.hero.hp, 5);
  holdEnemy(model.enemies[0]!);
  ticks(model, 43);
  assert.ok(model.time >= immunity);
  model.hero.x = 260;
  model.hero.hp = 1;
  incoming(model);
  assert.equal(model.hero.hp, 0);
  assert.equal(model.hero.frameIndex, 23);
  const x = model.hero.x;
  ticks(model, 5, { move: 1, jumpPressed: true, attackPressed: true, dodgePressed: true });
  assert.equal(model.hero.x, x);
  assert.equal(model.hero.attack, null);
  assert.ok(model.log.some(event => event.type === 'death'));
  restart(model);
  assert.equal(model.hero.hp, 6);
  assert.equal(model.hero.x, 86);
  assert.equal(model.hero.y, 255);
  assert.equal(model.enemies[0]!.hp, 3);
  assert.equal(model.enemies[1]!.hp, 2);
  assert.equal(model.time, 0);
  assert.equal(model.log.some(event => event.type === 'death'), false);
});

test('pause and focus loss freeze all clocks and require explicit resume after focus returns', () => {
  const model = createModel();
  step(model);
  const time = model.time;
  setPaused(model, true);
  ticks(model, 60, { move: 1 });
  assert.equal(model.time, time);
  setPaused(model, false);
  setFocused(model, false);
  ticks(model, 60);
  assert.equal(model.time, time);
  setFocused(model, true);
  step(model);
  assert.equal(model.time, time, 'focus alone does not surprise-resume combat');
  setPaused(model, false);
  step(model);
  assert.ok(model.time > time);
});

test('natural spawn route reaches a parry, directional shove, dodge passage and enemy cannon hit using inputs alone', () => {
  // This is the same input route exercised through keyboard events in the real local demo.
  // No coordinates, health, timers or enemy actions are assigned by this test.
  const model = createModel();
  ticks(model, 20, { move: 1 });
  step(model, { move: 1, jumpPressed: true });
  for (let i = 0; i < 65 && !(model.hero.grounded && model.hero.x > 170); i += 1) step(model, { move: 1 });
  assert.equal(model.hero.y, 231);
  for (let i = 0; i < 100; i += 1) {
    const sword = model.enemies[0]!;
    if (sword.action === 'windup' && sword.actionTime >= 410) break;
    step(model);
  }
  step(model, { guardPressed: true, guardHeld: true });
  for (let i = 0; i < 12 && !model.log.some(event => event.type === 'parry'); i += 1) step(model, { guardHeld: true });
  assert.ok(model.log.some(event => event.type === 'parry'));
  step(model, { move: 1, attackPressed: true });
  ticks(model, 28);
  assert.ok(model.log.some(event => event.type === 'shove'));
  for (let i = 0; i < 40 && model.enemies[0]!.x - model.hero.x > 40; i += 1) step(model, { move: 1 });
  step(model, { move: 1, dodgePressed: true });
  ticks(model, 18, { move: 1 });
  assert.ok(model.hero.x > model.enemies[0]!.x);
  for (let i = 0; i < 180 && model.hero.x < 602; i += 1) step(model, { move: 1 });
  assert.ok(model.hero.x >= 602 && model.hero.hp > 0);
  step(model, { interactPressed: true });
  ticks(model, 65);
  assert.ok(model.log.some(event => event.type === 'cannonHit' && event.target === 'sword-1'));
  assert.equal(model.enemies[0]!.hp, 0);
  assert.ok(model.hero.hp > 0);
});

test('render snapshot is detached and finite/JSON-safe without losing action information', () => {
  const model = createModel();
  const state = snapshot(model);
  assert.equal(state.hero.frameIndex, 0);
  assert.equal(state.enemies[1]!.y, 207);
  state.hero.x = 999;
  state.enemies[0]!.x = 999;
  assert.equal(model.hero.x, 86);
  assert.equal(model.enemies[0]!.x, 284);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(state)));
});
