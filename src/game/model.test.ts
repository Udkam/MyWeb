import { naturalRoute } from '../../scripts/playtest-route-policy';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createModel, step, restart, setPaused, setFocused, snapshot, getContextAction,
  FIXED_MS, WORLD, MUZZLES, STANDING_HEIGHT, DODGE_TIMING, getDodgeFrame, getDodgeHeight,
  getMusketLine, type Model, type Input, type Enemy, type Projectile } from './model';

function ticks(model: Model, count: number, input: Partial<Input> = {}): void {
  for (let i = 0; i < count; i += 1) step(model, input);
}
function park(enemy: Enemy): void {
  enemy.action = 'stagger'; enemy.actionTime = 0; enemy.staggerUntil = 1e9;
}
/** Isolated unit fixture; this is not claimed as a natural playthrough. */
function isolated(heroX = 260, swordX = 304): Model {
  const model = createModel(); model.hero.x = heroX; model.enemies[0]!.x = swordX;
  park(model.enemies[0]!); model.enemies[1]!.hp = 0; model.encounter.exitX = 10000;
  return model;
}
function incoming(model: Model, input: Partial<Input> = {}): void {
  const sword = model.enemies[0]!;
  sword.action = 'attack'; sword.actionTime = 0; sword.attackResolved = false;
  sword.attackContact = false; sword.facing = model.hero.x < sword.x ? -1 : 1;
  sword.attackId += 1; step(model, input);
}
function parry(model: Model): void { incoming(model, { guardPressed: true, guardHeld: true }); }
function context(model: Model): void { step(model, { interactPressed: true, contextIntent: getContextAction(model) }); }
function projectile(extra: Partial<Projectile> = {}): Projectile {
  return { id: 900, kind: 'cannon', owner: 'cannon', x: 600, y: WORLD.floor + MUZZLES.cannon.y,
    vx: -50000, vy: 0, radius: 5, damage: 3, age: 0, lifetime: 2500, ...extra };
}
function collect(model: Model, count: number, input: Partial<Input>): string[] {
  let last = 0; const events: string[] = [];
  for (let i = 0; i < count; i += 1) {
    step(model, input);
    for (const event of model.log) if (event.id > last) { events.push(event.type); last = event.id; }
  }
  return events;
}

test('fixed simulation, 6HP and real collision dimensions remain independent of render batching', () => {
  const run = (batch: number) => {
    const model = isolated();
    for (let frame = 0; frame < 120 / batch; frame += 1) ticks(model, batch, { move: -1 });
    return snapshot(model);
  };
  assert.deepEqual(run(1), run(2)); assert.deepEqual(run(2), run(4));
  const model = createModel(); assert.equal(model.hero.hp, 6); assert.equal(model.hero.maxHp, 6);
  assert.equal(model.hero.height, STANDING_HEIGHT); assert.deepEqual(model.enemies.map(e => e.height), [68, 68]);
  assert.deepEqual(model.enemies.map(e => e.hp), [4, 3]);
});

test('standing bodies cannot walk through the crate, raised plank or walls', () => {
  const model = isolated(86); model.enemies[0]!.hp = 0;
  ticks(model, 70, { move: 1 }); assert.equal(model.hero.x + model.hero.width / 2, 160);
  model.hero.x = 400; ticks(model, 20, { move: 1 });
  assert.equal(model.hero.x + model.hero.width / 2, 430, '58px standing body cannot squeeze under plank');
  model.hero.x = 570; ticks(model, 60, { move: 1 });
  assert.equal(model.hero.x + model.hero.width / 2, WORLD.right);
  model.hero.x = 80; ticks(model, 60, { move: -1 });
  assert.equal(model.hero.x - model.hero.width / 2, WORLD.left);
});

test('jump reaches both the 24px crate and 48px high platform without drifting feet', () => {
  const model = isolated(140); model.enemies[0]!.hp = 0;
  step(model, { jumpPressed: true, move: 1 }); ticks(model, 17, { move: 1 }); ticks(model, 35);
  assert.equal(model.hero.y, 231); assert.equal(model.hero.grounded, true);
  model.hero.x = 405; model.hero.y = 255; model.hero.grounded = true;
  step(model, { jumpPressed: true, move: 1 }); ticks(model, 20, { move: 1 }); ticks(model, 30);
  assert.equal(model.hero.y, 207); assert.equal(model.hero.grounded, true);
});

test('long-held ordinary guard accumulates real pressure and cannot stay safe against a slow lone sword', () => {
  const model = isolated(); const sword = model.enemies[0]!; sword.action = 'idle'; sword.staggerUntil = 0;
  const events = collect(model, 900, { guardHeld: true });
  assert.ok(events.includes('guardBreak')); assert.ok(events.includes('hurt'));
  assert.ok(model.hero.guardPressure > 0);
});

test('guard pressure persists through long holds and recovers only after release at 20 per second', () => {
  const model = isolated(); incoming(model, { guardHeld: true }); park(model.enemies[0]!);
  assert.equal(model.hero.guardPressure, 40);
  ticks(model, 180, { guardHeld: true }); assert.equal(model.hero.guardPressure, 40);
  ticks(model, 31); assert.ok(Math.abs(model.hero.guardPressure - 30) < 0.4);
  step(model, { guardHeld: true }); const pressure = model.hero.guardPressure;
  ticks(model, 60, { guardHeld: true }); assert.equal(model.hero.guardPressure, pressure);
});

test('three ordinary blocks reach 100 pressure even when spaced beyond the old two-second counter', () => {
  const model = isolated();
  for (let i = 0; i < 3; i += 1) {
    incoming(model, { guardHeld: true }); park(model.enemies[0]!);
    if (i < 2) ticks(model, 130, { guardHeld: true });
  }
  assert.equal(model.hero.guardPressure, 100); assert.ok(model.hero.guardBrokenUntil > model.time);
  assert.ok(model.log.some(e => e.type === 'guardBreak'));
});

test('held and rapid-tapped defense cannot refresh precision until a legal new guard start', () => {
  const model = isolated(); step(model, { guardPressed: true, guardHeld: true });
  const start = model.hero.guardPressedAt;
  ticks(model, 12, { guardPressed: true, guardHeld: true }); assert.equal(model.hero.guardPressedAt, start);
  step(model); incoming(model, { guardPressed: true, guardHeld: true });
  assert.equal(model.hero.opportunity, null); assert.equal(model.hero.guardPressure, 40);
  park(model.enemies[0]!); ticks(model, 30); incoming(model, { guardPressed: true, guardHeld: true });
  assert.equal(model.hero.opportunity?.source, 'parry'); assert.equal(model.hero.guardPressure, 0);
});

test('precision reduces pressure by forty and binds one opportunity to the actual attack event', () => {
  const model = isolated(); model.hero.guardPressure = 80; parry(model);
  assert.equal(model.hero.guardPressure, 40); assert.equal(model.hero.opportunity?.targetId, 'sword-1');
  assert.equal(model.hero.opportunity?.enemyActionId, model.enemies[0]!.attackId);
  assert.equal(getContextAction(model).kind, 'shove');
  assert.equal(model.hero.frameIndex, 16);
});

test('back attacks and front musket fire cannot be defended or parried', () => {
  const back = isolated(260, 220); incoming(back, { guardPressed: true, guardHeld: true });
  assert.equal(back.hero.hp, 5); assert.equal(back.hero.opportunity, null);
  const gun = isolated(); gun.enemies[0]!.hp = 0;
  gun.projectiles.push(projectile({ kind: 'musket', owner: 'musket-1', x: 300, y: 225,
    vx: -6000, radius: 3, damage: 1 }));
  step(gun, { guardPressed: true, guardHeld: true }); assert.equal(gun.hero.hp, 5);
  assert.equal(gun.hero.guardPressure, 0); assert.equal(gun.hero.opportunity, null);
});

test('J is pursuit, never an implicit shove, and consumes only its bound opportunity once', () => {
  const model = isolated(); parry(model); const id = model.hero.opportunity!.id;
  step(model, { move: 1, attackPressed: true });
  assert.equal(model.hero.attack?.kind, 'ground'); assert.equal(model.hero.attack?.opportunityId, id);
  assert.equal(model.hero.opportunity, null); ticks(model, 8);
  assert.equal(model.enemies[0]!.hp, 2, 'confirmed pursuit deals two without moving the target');
  assert.equal(model.log.filter(e => e.type === 'opportunityConsumed').length, 1);
  assert.equal(model.log.some(e => e.type === 'shove'), false);
});

test('E performs the displayed shove, moves only its target by 54px and cannot create another opportunity', () => {
  const model = isolated(); parry(model); const initial = model.enemies[0]!.x;
  context(model); assert.equal(model.hero.attack?.kind, 'shove'); ticks(model, 23);
  assert.ok(Math.abs(model.enemies[0]!.x - initial - 54) < 0.001);
  assert.equal(model.enemies[0]!.hp, 4); assert.equal(model.hero.opportunity, null);
  assert.equal(model.log.filter(e => e.type === 'opportunity').length, 1);
});

test('E is shown only for the actual forward palm while J keeps a separately chosen pursuit opportunity', () => {
  const model = isolated(); parry(model); const displayed = getContextAction(model);
  model.enemies[0]!.x = model.hero.x + 70; step(model);
  assert.ok(model.hero.opportunity); assert.equal(getContextAction(model).kind, 'none');
  step(model, { interactPressed: true, contextIntent: displayed });
  assert.equal(model.hero.attack, null); assert.ok(model.hero.opportunity);
  assert.ok(model.log.some(event => event.type === 'contextMiss'));
  step(model); step(model, { attackPressed: true });
  assert.equal(model.hero.attack?.pursuitTargetId, 'sword-1'); assert.equal(model.hero.opportunity, null);
});

test('a physically reached E-shove stops the target at the real wall instead of completing hidden displacement', () => {
  const model = isolated(564, 608); parry(model); context(model); ticks(model, 30);
  assert.ok(model.log.some(event => event.type === 'shove'));
  assert.equal(model.enemies[0]!.x, WORLD.right - model.enemies[0]!.width / 2);
  assert.equal(model.enemies[0]!.pushRemaining, 0);
});

test('actual blade segment rejects a high air cut and retains the mirrored same-level strike', () => {
  const high = isolated(); high.hero.y = 207; step(high, { attackPressed: true }); ticks(high, 12);
  assert.equal(high.enemies[0]!.hp, 4); assert.equal(high.hero.attack?.hitConfirmed, false);
  const mirror = isolated(350, 306); mirror.hero.facing = -1;
  step(mirror, { attackPressed: true }); ticks(mirror, 8);
  assert.equal(mirror.enemies[0]!.hp, 3);
});

test('expired displayed E-shove never falls through to a nearby cannon', () => {
  const model = isolated(564, 608); parry(model); const displayed = getContextAction(model);
  model.hero.opportunity!.expiresAt = model.time + FIXED_MS / 2;
  step(model, { interactPressed: true, contextIntent: displayed });
  assert.equal(model.cannon.action, 'idle'); assert.equal(model.hero.attack, null);
  assert.ok(model.log.some(e => e.type === 'contextMiss'));
  step(model); assert.equal(getContextAction(model).kind, 'cannon');
  context(model); assert.equal(model.cannon.action, 'windup', 'a genuinely new E press may choose cannon');
});

test('an E press cannot transfer to a different opportunity or follow a moved target', () => {
  const model = isolated(); parry(model); const displayed = getContextAction(model);
  model.hero.opportunity!.id += 1;
  step(model, { interactPressed: true, contextIntent: displayed });
  assert.equal(model.hero.attack, null); assert.ok(model.log.some(e => e.type === 'contextMiss'));
  step(model); const next = getContextAction(model); model.enemies[0]!.x = 400;
  step(model, { interactPressed: true, contextIntent: next }); assert.equal(model.hero.attack, null);
});

test('buffered E preserves displayed identity through expiry instead of changing to cannon', () => {
  const model = isolated(564, 608); parry(model); const displayed = getContextAction(model);
  model.hero.action = 'hurt'; model.hero.stunUntil = model.time + 100;
  model.hero.opportunity!.expiresAt = model.time + 50;
  step(model, { interactPressed: true, contextIntent: displayed });
  assert.equal(model.hero.inputBuffer?.contextIntent?.opportunityId, displayed.opportunityId);
  ticks(model, 8); assert.equal(model.cannon.action, 'idle');
  assert.ok(model.log.some(e => e.type === 'contextMiss'));
});

test('holding E does not re-ignite a cannon after cooldown', () => {
  const model = isolated(605); model.enemies[0]!.hp = 0; step(model);
  const intent = getContextAction(model); const events = collect(model, 230, { interactPressed: true, contextIntent: intent });
  assert.equal(events.filter(e => e === 'cannonFire').length, 1);
});

test('ordinary hits grant no opportunity; hitting genuine whiff recovery does', () => {
  const ordinary = isolated(); step(ordinary, { attackPressed: true }); ticks(ordinary, 8);
  assert.equal(ordinary.hero.opportunity, null);
  const punish = isolated(); const sword = punish.enemies[0]!;
  sword.action = 'recovery'; sword.actionTime = 0; sword.whiffRecovery = true; sword.attackId = 91;
  step(punish, { attackPressed: true }); ticks(punish, 8);
  assert.equal(punish.hero.opportunity?.source, 'whiffPunish');
  assert.equal(punish.hero.opportunity?.enemyActionId, 91);
});

test('interrupting a visible reload grants a musket-specific opportunity', () => {
  const model = createModel(); model.enemies[0]!.hp = 0; model.hero.x = 448; model.hero.y = 207;
  const gun = model.enemies[1]!; gun.action = 'reload'; gun.actionTime = 0; gun.actionId = 72;
  step(model, { attackPressed: true }); ticks(model, 8);
  assert.equal(gun.hp, 2); assert.equal(gun.action, 'hurt');
  assert.equal(model.hero.opportunity?.source, 'reloadInterrupt');
  assert.equal(model.hero.opportunity?.targetId, 'musket-1');
  assert.equal(model.hero.opportunity?.enemyActionId, 72);
});

test('a body struck by a shoved target is interrupted without recursive free shoves', () => {
  const model = isolated(); const gun = model.enemies[1]!;
  gun.hp = 3; gun.x = 342; gun.y = 255; park(gun);
  parry(model); context(model); ticks(model, 24);
  assert.equal(model.hero.opportunity, null);
  assert.equal(model.log.filter(e => e.type === 'opportunity').length, 1);
  assert.ok(model.log.some(e => e.type === 'bodyInterrupt' && e.target === 'musket-1'));
});

test('second cut requires a new press and hit-confirm window; holding first cut never loops it', () => {
  const held = isolated(); ticks(held, 60, { attackPressed: true });
  assert.equal(held.log.filter(e => e.type === 'attack').length, 1);
  const model = isolated(); step(model, { attackPressed: true }); ticks(model, 7);
  step(model, { attackPressed: true }); assert.equal(model.hero.inputBuffer?.kind, 'attack');
  ticks(model, 5); assert.equal(model.hero.attack?.stage, 2);
  assert.equal(model.hero.attack?.hitConfirmed, false);
  assert.equal(model.log.filter(e => e.type === 'attack').length, 2);
});

test('hit-confirm permits guard or jump cancel; whiff keeps its full visible recovery', () => {
  const hit = isolated(); step(hit, { attackPressed: true }); ticks(hit, 12);
  step(hit, { guardPressed: true, guardHeld: true });
  assert.equal(hit.hero.attack, null); assert.equal(hit.hero.action, 'guard');
  const jump = isolated(); step(jump, { attackPressed: true }); ticks(jump, 12);
  step(jump, { jumpPressed: true }); assert.equal(jump.hero.attack, null); assert.ok(jump.hero.vy < 0);
  const whiff = isolated(260, 400); step(whiff, { attackPressed: true }); ticks(whiff, 7);
  step(whiff, { guardPressed: true, guardHeld: true }); ticks(whiff, 14, { guardHeld: true });
  assert.ok(whiff.hero.attack); assert.equal(whiff.hero.attack?.hitConfirmed, false);
  assert.equal(whiff.hero.action, 'attackRecovery'); ticks(whiff, 5, { guardHeld: true });
  assert.equal(whiff.hero.attack, null);
});

test('one input buffer replaces older input, expires, and is cleared by pause/focus/death', () => {
  const model = isolated(260, 400); step(model, { attackPressed: true });
  step(model, { jumpPressed: true }); assert.equal(model.hero.inputBuffer?.kind, 'jump');
  step(model, { interactPressed: true, contextIntent: getContextAction(model) });
  assert.equal(model.hero.inputBuffer?.kind, 'context'); ticks(model, 13);
  assert.equal(model.hero.inputBuffer, null); assert.ok(model.log.some(e => e.type === 'contextMiss'));
  step(model, { jumpPressed: true }); setPaused(model, true); assert.equal(model.hero.inputBuffer, null);
  setPaused(model, false); step(model, { jumpPressed: true }); setFocused(model, false);
  assert.equal(model.hero.inputBuffer, null);
});

test('canceling back to first cut does not erase effective hits; second-hit brace leads to guarded retreat', () => {
  const model = isolated();
  for (let i = 0; i < 4; i += 1) {
    step(model, { attackPressed: true }); ticks(model, 11);
    step(model, { guardPressed: true, guardHeld: true }); step(model);
  }
  const sword = model.enemies[0]!;
  assert.ok(sword.effectiveLightHits >= 2); assert.equal(sword.hp, 1);
  assert.ok(model.log.some(e => e.type === 'enemyBrace'));
  assert.ok(model.log.some(e => e.type === 'enemyRetreat'));
  assert.ok(model.log.some(e => e.type === 'enemyBlock'));
});

test('brace preparation remains damageable and an established guard only protects the visible front', () => {
  const model = isolated(); const sword = model.enemies[0]!;
  sword.action = 'brace'; sword.actionTime = 0; sword.braceEstablished = false; sword.lockedFacing = -1;
  step(model, { attackPressed: true }); ticks(model, 7);
  assert.equal(sword.hp, 3, 'there is no hidden invulnerability while the guard is being raised');
  ticks(model, 30); model.hero.attack = null; model.hero.x = sword.x + 45; model.hero.facing = -1;
  step(model); step(model, { attackPressed: true }); ticks(model, 7);
  assert.ok(sword.hp < 3, 'rear is vulnerable even during defensive retreat');
});

test('readable close-range spacing remains damageable and preserves effective light hits', () => {
  const model = isolated(260, 284); const sword = model.enemies[0]!;
  sword.action = 'idle'; sword.effectiveLightHits = 1;
  step(model); assert.equal(sword.action, 'retreat'); assert.equal(sword.retreatKind, 'spacing');
  assert.equal(sword.braceEstablished, false); assert.equal(sword.effectiveLightHits, 1);
  assert.ok(model.log.some(event => event.type === 'enemySpace'));
  step(model, { attackPressed: true }); ticks(model, 8);
  assert.equal(sword.hp, 3); assert.equal(sword.effectiveLightHits, 2);
});

test('one attack damages a target only once; only one air cut is available until landing', () => {
  const model = isolated(); step(model, { attackPressed: true }); ticks(model, 14);
  assert.equal(model.enemies[0]!.hp, 3); assert.equal(model.log.filter(e => e.type === 'attackHit').length, 1);
  const air = isolated(86); air.enemies[0]!.hp = 0;
  step(air, { jumpPressed: true }); step(air, { attackPressed: true }); ticks(air, 19);
  assert.equal(air.hero.attack, null); assert.equal(air.hero.grounded, false);
  step(air, { attackPressed: true }); assert.equal(air.hero.attack, null);
  ticks(air, 30); assert.equal(air.hero.airAttackUsed, false);
});

test('dodge startup and recovery are vulnerable, the 120ms middle is evasive, and injury immunity is separate', () => {
  for (const [advance, expected] of [[0, 5], [5, 6], [12, 5]] as const) {
    const model = isolated(); step(model, { dodgePressed: true }); ticks(model, advance);
    model.enemies[0]!.hp = 0;
    model.projectiles.push(projectile({ kind: 'musket', owner: 'musket-1', damage: 1,
      x: model.hero.x + 35, y: model.hero.y - 25, radius: 1 }));
    step(model); assert.equal(model.hero.hp, expected);
  }
  const model = isolated(); model.hero.invulnerableUntil = 900;
  step(model, { dodgePressed: true }); assert.equal(model.hero.invulnerableUntil, 900);
});

test('standing head is hittable while the visible crouch has no empty standing head hitbox', () => {
  const standing = isolated(); standing.enemies[0]!.hp = 0;
  standing.projectiles.push(projectile({ kind: 'musket', owner: 'musket-1', damage: 1, x: 300, y: 191, radius: 1 }));
  step(standing); assert.equal(standing.hero.hp, 5, 'visible standing head above the old 58px body receives a hit');
  const crouched = isolated(); crouched.enemies[0]!.hp = 0;
  step(crouched, { dodgePressed: true });
  crouched.projectiles.push(projectile({ kind: 'musket', owner: 'musket-1', damage: 1,
    x: crouched.hero.x + 35, y: 195, radius: 1 }));
  step(crouched);
  assert.equal(crouched.hero.hp, 6, 'startup is vulnerable, but a bullet above the actual crouched head misses');
  assert.equal(crouched.hero.invulnerableUntil, 0); assert.ok(crouched.time < crouched.hero.dodgeInvulnerableFrom);
  const recovery = isolated(); recovery.enemies[0]!.hp = 0;
  step(recovery, { dodgePressed: true }); ticks(recovery, 14);
  assert.equal(recovery.hero.height, STANDING_HEIGHT);
  recovery.projectiles.push(projectile({ kind: 'musket', owner: 'musket-1', damage: 1,
    x: recovery.hero.x + 35, y: 191, radius: 1 }));
  step(recovery); assert.equal(recovery.hero.hp, 5, 'rising recovery exposes the same real standing head again');
});

test('dodge display frame and hurt height follow the measured five-frame 260ms action including recovery', () => {
  assert.equal(DODGE_TIMING.frameDurations.reduce((total, value) => total + value, 0), DODGE_TIMING.duration);
  for (const [time, frame, height] of [[0, 0, 47], [59.999, 0, 47], [60, 1, 49], [119.999, 1, 49],
    [120, 2, 49], [179.999, 2, 49], [180, 3, 62], [219.999, 3, 62], [220, 4, 68], [259.999, 4, 68]] as const) {
    assert.equal(getDodgeFrame(time), frame); assert.equal(getDodgeHeight(time), height);
  }
  const model = isolated(); model.enemies[0]!.hp = 0; step(model, { dodgePressed: true });
  for (let i = 0; i < 17; i += 1) {
    assert.equal(model.hero.height, model.hero.action === 'dodge' ? getDodgeHeight(model.hero.actionTime) : STANDING_HEIGHT);
    step(model);
  }
  assert.equal(model.hero.height, STANDING_HEIGHT); assert.notEqual(model.hero.action, 'dodge');
});

test('dodge cooldown leaves real vulnerable gaps and cannot be reset by canceling', () => {
  const model = isolated(); const events = collect(model, 120, { dodgePressed: true });
  assert.ok(events.filter(e => e === 'dodge').length <= 3);
  const dodgeEvents = model.log.filter(e => e.type === 'dodge');
  for (let i = 1; i < dodgeEvents.length; i += 1) assert.ok(dodgeEvents[i]!.time - dodgeEvents[i - 1]!.time >= 800 - 0.001);
  assert.equal(model.hero.invulnerableUntil, 0);
});

test('normal bodies block each other; dodge passes a light foe only if the standing landing fits', () => {
  const walk = isolated(); ticks(walk, 20, { move: 1 });
  assert.equal(walk.enemies[0]!.x - walk.hero.x, 24);
  const open = isolated(); step(open, { dodgePressed: true }); ticks(open, 20);
  assert.ok(open.hero.x > open.enemies[0]!.x + 24); assert.equal(open.hero.height, STANDING_HEIGHT);
  const tight = isolated(560, 606); step(tight, { dodgePressed: true }); ticks(tight, 20);
  assert.ok(tight.hero.x <= tight.enemies[0]!.x - 24);
  assert.equal(tight.hero.height, STANDING_HEIGHT);
});

test('sword locking, windup, active contact and whiff recovery are explicit', () => {
  const model = isolated(); const sword = model.enemies[0]!; sword.action = 'idle';
  step(model); ticks(model, 16); const facing = sword.facing;
  model.hero.x = 360; ticks(model, 16); assert.equal(sword.facing, facing, 'committed sword does not turn after lock');
  ticks(model, 10); assert.equal(sword.action, 'recovery'); assert.equal(sword.whiffRecovery, true);
  assert.ok(model.log.some(e => e.type === 'enemyWhiff'));
});

test('musket completes aim, locks facing and fires along the actual fixed fourteen-degree barrel', () => {
  const model = createModel(); model.enemies[0]!.hp = 0; model.hero.x = 400;
  step(model); ticks(model, 29); const gun = model.enemies[1]!; const aim = gun.aimX;
  model.hero.x = 500; ticks(model, 31);
  const fire = model.log.find(e => e.type === 'musketFire')!;
  assert.ok(fire); assert.equal(gun.aimX, aim);
  assert.equal(fire.x, gun.x - MUZZLES.musket.x); assert.equal(fire.y, gun.y + MUZZLES.musket.y);
  const shot = model.projectiles.find(item => item.kind === 'musket');
  if (shot) assert.ok(Math.abs(Math.atan2(shot.vy, Math.abs(shot.vx)) - 14 * Math.PI / 180) < 0.000001);
  ticks(model, 8); assert.equal(gun.action, 'reload');
});

test('musket aim and recoil lines share their real muzzle and mirror horizontally without vertical tracking', () => {
  for (const facing of [-1, 1] as const) {
    const line = getMusketLine({ x: 492, y: 207, facing }, 'fire');
    assert.equal(line.muzzle.x, 492 + facing * MUZZLES.musket.x);
    assert.equal(line.muzzle.y, 207 + MUZZLES.musket.y);
    assert.ok(Math.abs(Math.atan2(line.direction.y, Math.abs(line.direction.x)) - 14 * Math.PI / 180) < 0.000001);
    const aim = getMusketLine({ x: 492, y: 207, facing }, 'aim');
    assert.ok(Math.abs(aim.direction.y - line.direction.y) < 0.000001);
  }
});

test('gun and cannon projectiles obey the same swept friendly-fire contact and terrain ordering', () => {
  const cannon = isolated(86); cannon.projectiles.push(projectile()); step(cannon);
  assert.equal(cannon.enemies[0]!.hp, 1); assert.equal(cannon.hero.hp, 6); assert.equal(cannon.projectiles.length, 0);
  const gun = isolated(86); gun.projectiles.push(projectile({ kind: 'musket', owner: 'musket-1', damage: 1 })); step(gun);
  assert.equal(gun.enemies[0]!.hp, 3);
  const wall = isolated(86); wall.enemies[0]!.hp = 0; wall.projectiles.push(projectile()); step(wall);
  assert.equal(wall.hero.hp, 6); assert.ok(wall.log.some(e => e.target === 'crate' && e.type === 'cannonImpact'));
  wall.projectiles.push(projectile({ x: 450, y: 100, vx: 0, vy: 12000 })); step(wall);
  assert.ok(wall.log.some(e => e.target === 'platform' && e.type === 'cannonImpact'));
  const lane = isolated(86); lane.enemies[0]!.x = 350; lane.projectiles.push(projectile({ x: 549 })); step(lane);
  assert.equal(lane.enemies[0]!.hp, 1, 'cannon line passes below the 12px plank');
});

test('cannon E requires a displayed nearby intent, a visual 450ms fuse and has operator friendly fire', () => {
  const model = isolated(560); model.enemies[0]!.hp = 0; step(model); context(model);
  assert.equal(model.cannon.action, 'windup'); assert.equal(model.cannon.frameIndex, 1);
  ticks(model, 27); assert.equal(model.cannon.action, 'recovery'); assert.equal(model.hero.hp, 3);
  const fire = model.log.find(e => e.type === 'cannonFire')!;
  assert.equal(fire.x, model.cannon.x - 43); assert.equal(fire.y, model.cannon.y - 24);
});

test('simultaneous incoming sources cannot chain through the 700ms injury recovery', () => {
  const model = isolated(); model.enemies[0]!.hp = 0;
  model.projectiles.push(projectile({ x: 300, y: 225 }), projectile({ id: 901, x: 310, y: 225 }));
  step(model); assert.equal(model.hero.hp, 3); assert.equal(model.log.filter(e => e.type === 'hurt').length, 1);
});

test('dead melee cancels its uncommitted contact while its already-fired bullet remains physical', () => {
  const model = isolated(); const sword = model.enemies[0]!; sword.hp = 1; sword.action = 'windup';
  sword.actionTime = 400; step(model, { attackPressed: true }); ticks(model, 7);
  assert.equal(sword.hp, 0); ticks(model, 12); assert.equal(model.hero.hp, 6);
  model.projectiles.push(projectile({ kind: 'musket', owner: sword.id, damage: 1, x: 300, y: 225 }));
  step(model); assert.equal(model.hero.hp, 5);
});

test('death stops buffered actions; restart reconstructs 6HP and both original enemies', () => {
  const model = isolated(260, 220); model.hero.hp = 1; incoming(model);
  assert.equal(model.hero.hp, 0); assert.equal(model.hero.inputBuffer, null);
  const x = model.hero.x; ticks(model, 5, { move: 1, attackPressed: true }); assert.equal(model.hero.x, x);
  restart(model); assert.equal(model.hero.hp, 6); assert.equal(model.hero.x, 86);
  assert.deepEqual(model.enemies.map(e => e.hp), [4, 3]); assert.equal(model.encounter.status, 'active');
});

test('pause and focus freeze clocks, clear old input and require explicit resume', () => {
  const model = createModel(); step(model); const time = model.time;
  setPaused(model, true); ticks(model, 30); assert.equal(model.time, time);
  setPaused(model, false); setFocused(model, false); ticks(model, 30); assert.equal(model.time, time);
  setFocused(model, true); step(model); assert.equal(model.time, time);
  setPaused(model, false); step(model); assert.ok(model.time > time);
});

test('both foes defeated opens a real exit; reaching it completes without a minimum-time gate', () => {
  const model = createModel(); model.enemies.forEach(e => { e.hp = 0; });
  step(model); assert.equal(model.encounter.status, 'exitReady'); assert.equal(model.encounter.completedAt, null);
  model.hero.x = 605; step(model, { move: 1 }); assert.equal(model.encounter.status, 'complete');
  const completed = model.time; step(model, { move: -1 }); assert.equal(model.time, completed);
});

test('normal inputs reaching close quarters then releasing every control cannot freeze the sword in endless air cuts', () => {
  const model = naturalRoute('hugAudit'); const hp = model.hero.hp; let whiffs = 0; let last = 0;
  assert.ok(Math.abs(model.enemies[0]!.x - model.hero.x) < 40);
  for (let i = 0; i < 900 && model.hero.hp > 0; i += 1) {
    step(model);
    for (const event of model.log) if (event.id > last) { if (event.type === 'enemyWhiff') whiffs += 1; last = event.id; }
  }
  assert.ok(model.hero.hp < hp, `close standing remained ${hp}HP after ${whiffs} whiffs`);
});

test('natural remote-first route interrupts reload, pursues, then handles sword and reaches exit using inputs alone', () => {
  const model = naturalRoute('remoteFirst');
  assert.equal(model.encounter.status, 'complete'); assert.deepEqual(model.enemies.map(enemy => enemy.hp), [0, 0]);
  assert.ok(model.encounter.routeFlags.includes('reloadInterrupt')); assert.ok(model.encounter.routeFlags.includes('parry'));
  assert.equal(model.encounter.routeFlags.includes('cannon'), false);
});

test('natural cannon-first route uses earned E-shove, takes the gun lane and completes without a scripted target reset', () => {
  const model = naturalRoute('cannonFirst');
  assert.equal(model.encounter.status, 'complete'); assert.deepEqual(model.enemies.map(enemy => enemy.hp), [0, 0]);
  for (const flag of ['parry', 'shove', 'cannon', 'reloadInterrupt']) assert.ok(model.encounter.routeFlags.includes(flag));
});

test('snapshot is detached and publishes exact context, guard, stage and opportunity contracts', () => {
  const model = isolated(); parry(model); const view = snapshot(model);
  assert.equal(view.contextAction.kind, 'shove'); assert.equal(view.hero.guardPressure, 0);
  view.hero.x = 999; view.enemies[0]!.x = 999;
  assert.notEqual(model.hero.x, 999); assert.notEqual(model.enemies[0]!.x, 999);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(view)));
});
