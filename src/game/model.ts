/** Pure, fixed 60 Hz action-sample simulation. Positions use feet-centre coordinates. */
export const FIXED_MS = 1000 / 60;
export const WORLD = { width: 640, height: 360, floor: 255, left: 18, right: 622 } as const;
/** Art-space offsets from feet-centre, shared with the renderer's muzzle effects. */
export const MUZZLES = {
  musket: { x: 37, y: -46 },
  cannon: { x: -30, y: -28 },
} as const;
export const PLATFORMS = [
  { id: 'crate', x: 160, y: 231, width: 48, height: 24, oneWay: false },
  { id: 'platform', x: 430, y: 207, width: 112, height: 12, oneWay: true },
] as const;

export type Facing = -1 | 1;
export type HeroAction =
  | 'idle' | 'run' | 'launch' | 'rise' | 'fall' | 'land'
  | 'attackWindup' | 'attackActive' | 'attackRecovery' | 'airAttack'
  | 'guard' | 'parry' | 'shovePrep' | 'shoveHit' | 'shoveRecovery'
  | 'hurt' | 'hurtRecover' | 'dead' | 'dodge';
export type EnemyAction = 'idle' | 'run' | 'windup' | 'attack' | 'recovery'
  | 'aim' | 'fire' | 'reload' | 'hurt' | 'stagger' | 'pushed' | 'dead';

export interface Input {
  move: number;
  jumpPressed: boolean;
  attackPressed: boolean;
  guardPressed: boolean;
  guardHeld: boolean;
  dodgePressed: boolean;
  interactPressed: boolean;
}

interface Body {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: Facing;
  grounded: boolean;
  hp: number;
  maxHp: number;
  actionTime: number;
  frameIndex: number;
}

export interface ParryTarget {
  enemyId: string;
  facing: Facing;
  expiresAt: number;
}

export interface HeroAttack {
  id: number;
  kind: 'ground' | 'air' | 'shove';
  elapsed: number;
  activeStart: number;
  activeEnd: number;
  duration: number;
  facing: Facing;
  targetId?: string;
  hitTargets: string[];
}

export interface Hero extends Body {
  id: 'hero';
  action: HeroAction;
  invulnerableUntil: number;
  guardPressedAt: number;
  guardLatched: boolean;
  guardHeld: boolean;
  guardBrokenUntil: number;
  blockTimes: number[];
  stunUntil: number;
  dodgeUntil: number;
  dodgeInvulnerableFrom: number;
  dodgeInvulnerableUntil: number;
  dodgeStartX: number;
  dodgeTargetX: number;
  dodgeCooldownUntil: number;
  coyoteUntil: number;
  jumpBufferedUntil: number;
  airAttackUsed: boolean;
  parryTarget: ParryTarget | null;
  attack: HeroAttack | null;
}

export interface Enemy extends Body {
  id: string;
  kind: 'sword' | 'musket';
  action: EnemyAction;
  attackResolved: boolean;
  pushRemaining: number;
  pushDirection: Facing;
  aimX: number;
  aimY: number;
}

export interface Projectile {
  id: number;
  kind: 'cannon' | 'musket';
  owner: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  age: number;
  lifetime: number;
}

export interface Cannon {
  x: number;
  y: number;
  facing: -1;
  action: 'idle' | 'windup' | 'recovery';
  actionTime: number;
  frameIndex: number;
}

export interface GameEvent {
  id: number;
  time: number;
  tick: number;
  type: string;
  actor: string;
  target?: string;
  x?: number;
  y?: number;
  amount?: number;
}

export interface Model {
  time: number;
  tick: number;
  paused: boolean;
  focused: boolean;
  hero: Hero;
  enemies: Enemy[];
  cannon: Cannon;
  projectiles: Projectile[];
  log: GameEvent[];
  nextId: number;
}

const GRAVITY = 1150;
const EPSILON = 0.00001;
const DEFAULT_INPUT: Input = {
  move: 0, jumpPressed: false, attackPressed: false, guardPressed: false,
  guardHeld: false, dodgePressed: false, interactPressed: false,
};

export function createModel(): Model {
  return {
    time: 0, tick: 0, paused: false, focused: true, nextId: 1,
    hero: {
      id: 'hero', x: 86, y: WORLD.floor, vx: 0, vy: 0, width: 20, height: 46,
      facing: 1, grounded: true, hp: 6, maxHp: 6, action: 'idle', actionTime: 0,
      frameIndex: 0, invulnerableUntil: 0, guardPressedAt: -Infinity,
      guardLatched: false, guardHeld: false, guardBrokenUntil: 0, blockTimes: [],
      stunUntil: 0, dodgeUntil: 0, dodgeInvulnerableFrom: 0, dodgeInvulnerableUntil: 0,
      dodgeStartX: 86, dodgeTargetX: 86, dodgeCooldownUntil: 0, coyoteUntil: 80,
      jumpBufferedUntil: -Infinity, airAttackUsed: false, parryTarget: null, attack: null,
    },
    enemies: [makeEnemy('sword-1', 'sword', 284, WORLD.floor), makeEnemy('musket-1', 'musket', 492, 207)],
    cannon: { x: 592, y: WORLD.floor, facing: -1, action: 'idle', actionTime: 0, frameIndex: 0 },
    projectiles: [], log: [],
  };
}

function makeEnemy(id: string, kind: Enemy['kind'], x: number, y: number): Enemy {
  const hp = kind === 'sword' ? 3 : 2;
  return {
    id, kind, x, y, vx: 0, vy: 0, width: kind === 'sword' ? 24 : 20, height: 46,
    facing: -1, grounded: true, hp, maxHp: hp, action: 'idle', actionTime: 0,
    frameIndex: kind === 'sword' ? 0 : 12, attackResolved: false,
    pushRemaining: 0, pushDirection: -1, aimX: 86, aimY: WORLD.floor - 24,
  };
}

function emit(model: Model, event: Omit<GameEvent, 'id' | 'time' | 'tick'>): void {
  model.log.push({ id: model.nextId++, time: model.time, tick: model.tick, ...event });
  if (model.log.length > 40) model.log.splice(0, model.log.length - 40);
}

export function restart(model: Model): void {
  Object.assign(model, createModel());
  emit(model, { type: 'restart', actor: 'hero' });
}

export function setPaused(model: Model, paused: boolean): void {
  if (model.paused === paused) return;
  model.paused = paused;
  model.hero.guardHeld = false;
  // Resuming requires a new physical press; an old held guard cannot become a fresh parry.
  model.hero.guardPressedAt = -Infinity;
  emit(model, { type: paused ? 'pause' : 'resume', actor: 'system' });
}

export function setFocused(model: Model, focused: boolean): void {
  if (model.focused === focused) return;
  model.focused = focused;
  model.hero.guardHeld = false;
  model.hero.guardPressedAt = -Infinity;
  if (!focused) model.paused = true;
  emit(model, { type: focused ? 'focus' : 'blur', actor: 'system' });
}

function heroAction(hero: Hero, action: HeroAction): void {
  if (hero.action === action) return;
  hero.action = action;
  hero.actionTime = 0;
}

function enemyAction(enemy: Enemy, action: EnemyAction): void {
  if (enemy.action === action) return;
  enemy.action = action;
  enemy.actionTime = 0;
}

function locked(hero: Hero): boolean {
  return hero.action === 'dead' || hero.action === 'hurt' || hero.action === 'hurtRecover'
    || hero.action === 'dodge';
}

/** Each invocation advances exactly one simulation tick. The host owns the RAF accumulator. */
export function step(model: Model, partial: Partial<Input> = {}): void {
  if (model.paused || !model.focused) return;
  const input = { ...DEFAULT_INPUT, ...partial };
  input.move = Number.isFinite(input.move) ? Math.max(-1, Math.min(1, input.move)) : 0;
  model.tick += 1;
  model.time = model.tick * FIXED_MS;
  updateHero(model, input);
  resolveHeroAttack(model);
  for (const enemy of model.enemies) updateEnemy(model, enemy);
  updateCannon(model);
  updateProjectiles(model);
  updateFrames(model);
}

function updateHero(model: Model, input: Input): void {
  const hero = model.hero;
  hero.actionTime += FIXED_MS;
  hero.blockTimes = hero.blockTimes.filter(time => model.time - time < 2000);
  if (hero.parryTarget && model.time > hero.parryTarget.expiresAt) hero.parryTarget = null;
  if (!input.guardHeld && !input.guardPressed) hero.guardLatched = false;
  if (input.guardPressed && !hero.guardLatched && !locked(hero) && model.time >= hero.guardBrokenUntil) {
    hero.guardPressedAt = model.time;
  }
  if (input.guardHeld || input.guardPressed) hero.guardLatched = true;
  hero.guardHeld = input.guardHeld || input.guardPressed;

  if (hero.hp <= 0) {
    heroAction(hero, 'dead');
    hero.vx = 0;
    integrate(hero, FIXED_MS / 1000, model);
    return;
  }

  if (hero.action === 'hurt' && hero.actionTime + EPSILON >= 160) heroAction(hero, 'hurtRecover');
  if ((hero.action === 'hurt' || hero.action === 'hurtRecover') && model.time >= hero.stunUntil) {
    heroAction(hero, 'idle');
  }
  if (hero.action === 'dodge' && model.time >= hero.dodgeUntil) {
    hero.x = nearestLegalX(model, hero, hero.x);
    heroAction(hero, 'idle');
  }
  if (hero.action === 'parry' && hero.actionTime + EPSILON >= 210) heroAction(hero, 'idle');
  if (hero.action === 'land' && hero.actionTime + EPSILON >= 140) heroAction(hero, 'idle');

  if (hero.attack) {
    hero.attack.elapsed += FIXED_MS;
    if (hero.attack.elapsed >= hero.attack.duration - EPSILON) {
      hero.attack = null;
      heroAction(hero, 'idle');
    } else syncAttackAction(hero);
  }

  if (input.move && !locked(hero) && !hero.attack) hero.facing = input.move < 0 ? -1 : 1;

  if (input.dodgePressed && hero.grounded && !locked(hero) && !hero.attack
    && model.time >= hero.dodgeCooldownUntil) {
    heroAction(hero, 'dodge');
    hero.dodgeUntil = model.time + 240;
    hero.dodgeInvulnerableFrom = model.time + 60;
    hero.dodgeInvulnerableUntil = model.time + 180;
    hero.dodgeStartX = hero.x;
    const preview = { ...hero };
    moveHorizontal(preview, hero.facing * 330 * 0.24, model, true);
    hero.dodgeTargetX = nearestLegalX(model, hero, preview.x,
      Math.min(hero.x, preview.x), Math.max(hero.x, preview.x));
    hero.dodgeCooldownUntil = model.time + 650;
    emit(model, { type: 'dodge', actor: 'hero' });
  }

  if (input.jumpPressed) hero.jumpBufferedUntil = model.time + 100;
  if (hero.grounded) hero.coyoteUntil = model.time + 80;
  if (model.time <= hero.jumpBufferedUntil && model.time <= hero.coyoteUntil
    && !locked(hero) && !hero.attack && !hero.guardHeld) {
    hero.vy = -380;
    hero.grounded = false;
    hero.jumpBufferedUntil = -Infinity;
    hero.coyoteUntil = -Infinity;
    heroAction(hero, 'launch');
    emit(model, { type: 'jump', actor: 'hero' });
  }

  if (input.attackPressed && !locked(hero) && !hero.attack) {
    const token = hero.parryTarget;
    const target = token && model.enemies.find(enemy => enemy.id === token.enemyId && enemy.hp > 0);
    if (token && target && model.time <= token.expiresAt && hero.facing === token.facing
      && input.move * token.facing > 0
      && inFront(hero, target.x) && Math.abs(target.x - hero.x) <= 88
      && Math.abs((target.y - target.height / 2) - (hero.y - hero.height / 2)) < 40) {
      beginAttack(model, 'shove', target.id);
      hero.parryTarget = null;
    } else if (hero.grounded || !hero.airAttackUsed) {
      beginAttack(model, hero.grounded ? 'ground' : 'air');
      if (!hero.grounded) hero.airAttackUsed = true;
    }
  }

  if (input.interactPressed && !locked(hero) && !hero.attack && model.cannon.action === 'idle'
    && Math.abs(hero.x - model.cannon.x) <= 58 && Math.abs(hero.y - model.cannon.y) <= 30) {
    model.cannon.action = 'windup';
    model.cannon.actionTime = 0;
    emit(model, { type: 'cannonIgnite', actor: 'hero', target: 'cannon' });
  }

  if (hero.action === 'dodge') {
    const remaining = hero.dodgeTargetX - hero.x;
    hero.vx = Math.sign(remaining) * Math.min(330, Math.abs(remaining) * 1000 / FIXED_MS);
  }
  else if (hero.action === 'hurt') hero.vx *= 0.88;
  else if (hero.action === 'hurtRecover') hero.vx = 0;
  else if (hero.attack && hero.grounded) hero.vx = 0;
  else if (hero.guardHeld && hero.grounded && !hero.attack) hero.vx = 0;
  else if (hero.action === 'parry' && hero.grounded) hero.vx = 0;
  else hero.vx = input.move * 150;

  const wasGrounded = hero.grounded;
  integrate(hero, FIXED_MS / 1000, model);
  if (hero.grounded) {
    hero.airAttackUsed = false;
    if (!wasGrounded) {
      emit(model, { type: 'land', actor: 'hero', x: hero.x, y: hero.y });
      if (!locked(hero) && !hero.attack) heroAction(hero, 'land');
    }
  }
  if (!locked(hero) && !hero.attack && hero.action !== 'parry' && hero.action !== 'land') {
    if (hero.guardHeld && hero.grounded && model.time >= hero.guardBrokenUntil) heroAction(hero, 'guard');
    else if (!hero.grounded) {
      if (hero.action === 'launch' && hero.actionTime < 70) return;
      heroAction(hero, hero.vy < -35 ? 'rise' : 'fall');
    } else heroAction(hero, Math.abs(hero.vx) > 1 ? 'run' : 'idle');
  }
}

function beginAttack(model: Model, kind: HeroAttack['kind'], targetId?: string): void {
  const hero = model.hero;
  hero.attack = {
    id: model.nextId++, kind, elapsed: 0, facing: hero.facing, hitTargets: [],
    activeStart: kind === 'air' ? 35 : kind === 'shove' ? 120 : 110,
    activeEnd: kind === 'air' ? 155 : kind === 'shove' ? 220 : 210,
    duration: kind === 'air' ? 250 : kind === 'shove' ? 440 : 410,
    ...(targetId ? { targetId } : {}),
  };
  syncAttackAction(hero);
  emit(model, { type: kind === 'shove' ? 'shovePrepare' : 'attack', actor: 'hero', ...(targetId ? { target: targetId } : {}) });
}

function syncAttackAction(hero: Hero): void {
  const attack = hero.attack;
  if (!attack) return;
  if (attack.kind === 'air') {
    heroAction(hero, 'airAttack');
    hero.actionTime = attack.elapsed;
    return;
  }
  const phase = attack.elapsed < attack.activeStart ? 0 : attack.elapsed < attack.activeEnd ? 1 : 2;
  const actions: HeroAction[] = attack.kind === 'shove'
    ? ['shovePrep', 'shoveHit', 'shoveRecovery'] : ['attackWindup', 'attackActive', 'attackRecovery'];
  heroAction(hero, actions[phase]!);
  hero.actionTime = attack.elapsed - (phase === 0 ? 0 : phase === 1 ? attack.activeStart : attack.activeEnd);
}

function inFront(body: Pick<Body, 'x' | 'facing'>, x: number): boolean {
  return (x - body.x) * body.facing > 0;
}

function resolveHeroAttack(model: Model): void {
  const hero = model.hero;
  const attack = hero.attack;
  if (!attack || hero.hp <= 0 || attack.elapsed < attack.activeStart || attack.elapsed >= attack.activeEnd) return;
  for (const enemy of model.enemies) {
    if (enemy.hp <= 0 || attack.hitTargets.includes(enemy.id)) continue;
    if (attack.kind === 'shove' && enemy.id !== attack.targetId) continue;
    const dx = (enemy.x - hero.x) * attack.facing;
    const dy = Math.abs((enemy.y - enemy.height / 2) - (hero.y - hero.height / 2));
    if (dx <= 0 || dx > (attack.kind === 'shove' ? 88 : 50) + enemy.width / 2 || dy > 38) continue;
    attack.hitTargets.push(enemy.id);
    if (attack.kind === 'shove') {
      enemy.pushDirection = attack.facing;
      enemy.pushRemaining = 54;
      enemyAction(enemy, 'pushed');
      enemy.actionTime = 0;
      enemy.attackResolved = true;
      emit(model, { type: 'shove', actor: 'hero', target: enemy.id, amount: 54, x: enemy.x, y: enemy.y });
    } else damageEnemy(model, enemy, 1, 'hero', 'attackHit');
  }
}

function updateEnemy(model: Model, enemy: Enemy): void {
  enemy.actionTime += FIXED_MS;
  enemy.vx = 0;
  if (enemy.hp <= 0) {
    enemyAction(enemy, 'dead');
    integrate(enemy, FIXED_MS / 1000, model);
    return;
  }
  if (enemy.pushRemaining > EPSILON) {
    const wanted = Math.min(enemy.pushRemaining, 360 * FIXED_MS / 1000);
    const oldX = enemy.x;
    moveHorizontal(enemy, wanted * enemy.pushDirection, model);
    const moved = Math.abs(enemy.x - oldX);
    enemy.pushRemaining = Math.max(0, enemy.pushRemaining - moved);
    if (moved + EPSILON < wanted) enemy.pushRemaining = 0;
  }

  if (enemy.action === 'hurt' && enemy.actionTime + EPSILON >= 260) enemyAction(enemy, 'idle');
  if ((enemy.action === 'stagger' || enemy.action === 'pushed') && enemy.actionTime + EPSILON >= 650) enemyAction(enemy, 'idle');

  const stunned = enemy.action === 'hurt' || enemy.action === 'stagger' || enemy.action === 'pushed';
  if (!stunned && model.hero.hp > 0) {
    if (enemy.kind === 'sword') updateSword(model, enemy);
    else updateMusket(model, enemy);
  }
  integrate(enemy, FIXED_MS / 1000, model);
}

function updateSword(model: Model, enemy: Enemy): void {
  const hero = model.hero;
  if (enemy.action === 'windup' && enemy.actionTime + EPSILON >= 520) {
    enemyAction(enemy, 'attack');
    enemy.attackResolved = false;
    emit(model, { type: 'enemyAttack', actor: enemy.id, target: 'hero' });
  }
  if (enemy.action === 'attack') {
    const dx = (hero.x - enemy.x) * enemy.facing;
    if (!enemy.attackResolved && dx > -4 && dx < 58
      && Math.abs((hero.y - hero.height / 2) - (enemy.y - enemy.height / 2)) < 36) {
      enemy.attackResolved = true;
      incomingHeroHit(model, enemy.id, enemy.x, 1, 'melee');
    }
    if (enemy.action === 'attack' && enemy.actionTime + EPSILON >= 130) enemyAction(enemy, 'recovery');
  }
  if (enemy.action === 'recovery' && enemy.actionTime + EPSILON >= 520) enemyAction(enemy, 'idle');
  if (enemy.action !== 'idle' && enemy.action !== 'run') return;
  const dx = hero.x - enemy.x;
  enemy.facing = dx < 0 ? -1 : 1;
  if (Math.abs(dx) <= 62 && Math.abs(hero.y - enemy.y) < 34) {
    enemyAction(enemy, 'windup');
    enemy.attackResolved = false;
    emit(model, { type: 'enemyWindup', actor: enemy.id, target: 'hero' });
  } else {
    enemy.vx = enemy.facing * 61;
    enemyAction(enemy, 'run');
  }
}

function updateMusket(model: Model, enemy: Enemy): void {
  const hero = model.hero;
  if (enemy.action === 'idle' || enemy.action === 'run') {
    enemy.facing = hero.x < enemy.x ? -1 : 1;
    enemy.aimX = hero.x;
    enemy.aimY = hero.y - 24;
    enemyAction(enemy, 'aim');
    emit(model, { type: 'enemyAim', actor: enemy.id, target: 'hero' });
  }
  if (enemy.action === 'aim') {
    if (enemy.actionTime < 350) {
      enemy.facing = hero.x < enemy.x ? -1 : 1;
      enemy.aimX = hero.x;
      enemy.aimY = hero.y - 24;
    }
    if (enemy.actionTime + EPSILON >= 700) {
      enemyAction(enemy, 'fire');
      const x = enemy.x + enemy.facing * MUZZLES.musket.x;
      const y = enemy.y + MUZZLES.musket.y;
      const dx = enemy.aimX - x;
      const dy = enemy.aimY - y;
      // The sample has a horizontal gun pose, so aim only within 18 degrees of it.
      const angle = Math.max(-Math.PI / 10, Math.min(Math.PI / 10, Math.atan2(dy, Math.abs(dx))));
      model.projectiles.push({
        id: model.nextId++, kind: 'musket', owner: enemy.id, x, y,
        vx: enemy.facing * Math.cos(angle) * 390, vy: Math.sin(angle) * 390, radius: 3, damage: 1,
        age: 0, lifetime: 3500,
      });
      emit(model, { type: 'musketFire', actor: enemy.id, target: 'hero', x, y });
    }
  }
  if (enemy.action === 'fire' && enemy.actionTime + EPSILON >= 120) enemyAction(enemy, 'reload');
  if (enemy.action === 'reload') {
    if (Math.abs(hero.x - enemy.x) < 130) {
      enemy.vx = (hero.x < enemy.x ? 1 : -1) * 34;
    }
    if (enemy.actionTime + EPSILON >= 1050) enemyAction(enemy, 'idle');
  }
}

function incomingHeroHit(model: Model, owner: string, sourceX: number, damage: number,
  kind: 'melee' | 'musket' | 'cannon'): void {
  const hero = model.hero;
  if (hero.hp <= 0 || heroInvulnerable(model)) return;
  const canGuard = kind === 'melee' && hero.guardHeld && hero.grounded && !locked(hero)
    && !hero.attack && model.time >= hero.guardBrokenUntil && inFront(hero, sourceX);
  if (canGuard) {
    const attacker = model.enemies.find(enemy => enemy.id === owner && enemy.hp > 0);
    if (model.time - hero.guardPressedAt <= 140 + EPSILON && attacker) {
      heroAction(hero, 'parry');
      hero.actionTime = 0;
      hero.parryTarget = { enemyId: attacker.id, facing: hero.facing, expiresAt: model.time + 800 };
      enemyAction(attacker, 'stagger');
      attacker.actionTime = 0;
      attacker.pushRemaining = 0;
      attacker.attackResolved = true;
      emit(model, { type: 'parry', actor: 'hero', target: owner, x: hero.x, y: hero.y - 25 });
      return;
    }
    hero.blockTimes.push(model.time);
    emit(model, { type: 'block', actor: 'hero', target: owner, amount: hero.blockTimes.length });
    if (hero.blockTimes.length >= 3) {
      hero.blockTimes = [];
      hero.guardBrokenUntil = model.time + 650;
      hero.stunUntil = model.time + 360;
      hero.guardHeld = false;
      hero.guardPressedAt = -Infinity;
      hero.parryTarget = null;
      hero.vx = -hero.facing * 95;
      heroAction(hero, 'hurt');
      hero.actionTime = 0;
      emit(model, { type: 'guardBreak', actor: owner, target: 'hero' });
    }
    return;
  }
  hero.hp = Math.max(0, hero.hp - damage);
  hero.attack = null;
  hero.parryTarget = null;
  hero.invulnerableUntil = model.time + 700;
  hero.stunUntil = model.time + 360;
  hero.vx = (sourceX < hero.x ? 1 : -1) * 135;
  hero.guardPressedAt = -Infinity;
  heroAction(hero, hero.hp <= 0 ? 'dead' : 'hurt');
  hero.actionTime = 0;
  emit(model, { type: 'hurt', actor: owner, target: 'hero', amount: damage, x: hero.x, y: hero.y - 25 });
  if (hero.hp <= 0) emit(model, { type: 'death', actor: owner, target: 'hero' });
}

function damageEnemy(model: Model, enemy: Enemy, amount: number, owner: string, type: string): void {
  if (enemy.hp <= 0) return;
  enemy.hp = Math.max(0, enemy.hp - amount);
  enemy.pushRemaining = 0;
  enemy.attackResolved = true;
  enemyAction(enemy, enemy.hp <= 0 ? 'dead' : 'hurt');
  enemy.actionTime = 0;
  if (enemy.hp <= 0 && model.hero.parryTarget?.enemyId === enemy.id) model.hero.parryTarget = null;
  emit(model, { type, actor: owner, target: enemy.id, amount, x: enemy.x, y: enemy.y - 24 });
  if (enemy.hp <= 0) emit(model, { type: 'enemyDeath', actor: owner, target: enemy.id });
}

function updateCannon(model: Model): void {
  const cannon = model.cannon;
  if (cannon.action === 'idle') return;
  cannon.actionTime += FIXED_MS;
  if (cannon.action === 'windup' && cannon.actionTime + EPSILON >= 450) {
    cannon.action = 'recovery';
    cannon.actionTime = 0;
    const x = cannon.x + MUZZLES.cannon.x;
    const y = cannon.y + MUZZLES.cannon.y;
    model.projectiles.push({
      id: model.nextId++, kind: 'cannon', owner: 'cannon', x, y,
      vx: -780, vy: 0, radius: 5, damage: 3, age: 0, lifetime: 2500,
    });
    emit(model, { type: 'cannonFire', actor: 'cannon', x, y });
  } else if (cannon.action === 'recovery' && cannon.actionTime + EPSILON >= 1200) {
    cannon.action = 'idle';
    cannon.actionTime = 0;
  }
}

/** Move bodies without allowing a full-solid crate or world wall to be crossed in one tick. */
function moveHorizontal(body: Body, displacement: number, model: Model, ignoreActors = false): void {
  const half = body.width / 2;
  let next = Math.max(WORLD.left + half, Math.min(WORLD.right - half, body.x + displacement));
  for (const solid of PLATFORMS) {
    if (solid.oneWay || body.y <= solid.y + EPSILON || body.y - body.height >= solid.y + solid.height - EPSILON) continue;
    if (displacement > 0 && body.x + half <= solid.x + EPSILON && next + half > solid.x) next = solid.x - half;
    if (displacement < 0 && body.x - half >= solid.x + solid.width - EPSILON && next - half < solid.x + solid.width) {
      next = solid.x + solid.width + half;
    }
  }
  if (!ignoreActors) for (const other of [model.hero, ...model.enemies]) {
    if (!actorsBlock(model, body, other)) continue;
    const gap = (body.width + other.width) / 2;
    if (displacement > 0 && body.x <= other.x - gap + EPSILON && next > other.x - gap) next = other.x - gap;
    if (displacement < 0 && body.x >= other.x + gap - EPSILON && next < other.x + gap) next = other.x + gap;
  }
  body.x = next;
}

function integrate(body: Body, seconds: number, model: Model): void {
  moveHorizontal(body, body.vx * seconds, model);
  const previousY = body.y;
  body.vy += GRAVITY * seconds;
  let nextY = body.y + body.vy * seconds;
  body.grounded = false;
  if (body.vy >= 0) {
    let landing: number = WORLD.floor;
    for (const platform of PLATFORMS) {
      if (body.x + body.width / 2 <= platform.x + EPSILON
        || body.x - body.width / 2 >= platform.x + platform.width - EPSILON) continue;
      if (previousY <= platform.y + EPSILON && nextY >= platform.y && platform.y < landing) landing = platform.y;
    }
    if (nextY >= landing) {
      nextY = landing;
      body.vy = 0;
      body.grounded = true;
    }
  } else {
    for (const solid of PLATFORMS) {
      if (solid.oneWay || body.x + body.width / 2 <= solid.x || body.x - body.width / 2 >= solid.x + solid.width) continue;
      const bottom = solid.y + solid.height;
      if (previousY - body.height >= bottom - EPSILON && nextY - body.height < bottom) {
        nextY = bottom + body.height;
        body.vy = 0;
      }
    }
  }
  body.y = nextY;
  if (body.hp > 0 && !(body.id === 'hero' && model.hero.action === 'dodge')) {
    body.x = nearestLegalX(model, body, body.x, undefined, undefined, false);
  }
}

function verticalOverlap(a: Body, b: Body): boolean {
  return a.y > b.y - b.height + EPSILON && a.y - a.height < b.y - EPSILON;
}

function actorsBlock(model: Model, a: Body, b: Body, includeDodge = false): boolean {
  if (a.id === b.id || a.hp <= 0 || b.hp <= 0 || !verticalOverlap(a, b)) return false;
  // Both sample enemies are light. No heavy-enemy exception is implied for future content.
  return includeDodge || model.hero.action !== 'dodge' || (a.id !== 'hero' && b.id !== 'hero');
}

/** Small-scene separation also handles landing beside a foe and a dodge ending in a tight gap. */
function nearestLegalX(model: Model, body: Body, wanted: number,
  minimum: number = WORLD.left + body.width / 2, maximum: number = WORLD.right - body.width / 2,
  includeDodge = true): number {
  const half = body.width / 2;
  const candidates = [wanted, body.x, minimum, maximum];
  const blockers = [model.hero, ...model.enemies].filter(other => actorsBlock(model, body, other, includeDodge));
  const solids = PLATFORMS.filter(solid => !solid.oneWay && body.y > solid.y + EPSILON
    && body.y - body.height < solid.y + solid.height - EPSILON);
  for (const other of blockers) {
    const gap = (body.width + other.width) / 2;
    candidates.push(other.x - gap, other.x + gap);
  }
  for (const solid of solids) candidates.push(solid.x - half, solid.x + solid.width + half);
  const legal = candidates.filter(x => x >= minimum - EPSILON && x <= maximum + EPSILON
    && x >= WORLD.left + half - EPSILON && x <= WORLD.right - half + EPSILON
    && blockers.every(other => Math.abs(x - other.x) >= (body.width + other.width) / 2 - EPSILON)
    && solids.every(solid => x + half <= solid.x + EPSILON || x - half >= solid.x + solid.width - EPSILON));
  legal.sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted) || Math.abs(a - body.x) - Math.abs(b - body.x));
  return legal[0] ?? body.x;
}

function heroInvulnerable(model: Model): boolean {
  const hero = model.hero;
  return model.time < hero.invulnerableUntil || (hero.action === 'dodge'
    && model.time + EPSILON >= hero.dodgeInvulnerableFrom && model.time < hero.dodgeInvulnerableUntil - EPSILON);
}

interface Rect { left: number; top: number; right: number; bottom: number }

function bodyRect(body: Body): Rect {
  return { left: body.x - body.width / 2, top: body.y - body.height, right: body.x + body.width / 2, bottom: body.y };
}

/** Slab intersection of the complete projectile segment against a radius-expanded rectangle. */
function segmentHit(x: number, y: number, nx: number, ny: number, radius: number, rect: Rect): number | null {
  let near = 0;
  let far = 1;
  const axes = [
    [x, nx - x, rect.left - radius, rect.right + radius],
    [y, ny - y, rect.top - radius, rect.bottom + radius],
  ];
  for (const axis of axes) {
    const [start, delta, low, high] = axis as [number, number, number, number];
    if (Math.abs(delta) < EPSILON) {
      if (start < low || start > high) return null;
    } else {
      let enter = (low - start) / delta;
      let exit = (high - start) / delta;
      if (enter > exit) [enter, exit] = [exit, enter];
      near = Math.max(near, enter);
      far = Math.min(far, exit);
      if (near > far) return null;
    }
  }
  return near >= 0 && near <= 1 ? near : null;
}

function updateProjectiles(model: Model): void {
  const survivors: Projectile[] = [];
  const terrain = [
    ...PLATFORMS.map(item => ({ id: item.id as string, rect: { left: item.x, top: item.y, right: item.x + item.width, bottom: item.y + item.height } })),
    { id: 'left-wall', rect: { left: -10000, top: -10000, right: WORLD.left, bottom: 10000 } },
    { id: 'right-wall', rect: { left: WORLD.right, top: -10000, right: 10000, bottom: 10000 } },
    { id: 'floor', rect: { left: WORLD.left, top: WORLD.floor, right: WORLD.right, bottom: 10000 } },
  ];
  for (const projectile of model.projectiles) {
    const nx = projectile.x + projectile.vx * FIXED_MS / 1000;
    const ny = projectile.y + projectile.vy * FIXED_MS / 1000;
    projectile.age += FIXED_MS;
    let nearest: { t: number; terrain?: string; body?: Hero | Enemy } | null = null;
    // Terrain wins an exactly equal contact, so a body behind a wall cannot be hit through it.
    for (const solid of terrain) {
      const t = segmentHit(projectile.x, projectile.y, nx, ny, projectile.radius, solid.rect);
      if (t !== null && (!nearest || t < nearest.t)) nearest = { t, terrain: solid.id };
    }
    for (const body of [model.hero, ...model.enemies]) {
      if (body.id === projectile.owner || body.hp <= 0) continue;
      const t = segmentHit(projectile.x, projectile.y, nx, ny, projectile.radius, bodyRect(body));
      if (t !== null && (!nearest || t < nearest.t)) nearest = { t, body };
    }
    if (nearest) {
      const x = projectile.x + (nx - projectile.x) * nearest.t;
      const y = projectile.y + (ny - projectile.y) * nearest.t;
      if (nearest.body?.id === 'hero') {
        if (projectile.kind === 'cannon') emit(model, { type: 'cannonHit', actor: 'cannon', target: 'hero', x, y });
        incomingHeroHit(model, projectile.owner, projectile.x, projectile.damage, projectile.kind);
      } else if (nearest.body) {
        damageEnemy(model, nearest.body as Enemy, projectile.damage, projectile.owner,
          projectile.kind === 'cannon' ? 'cannonHit' : 'musketHit');
      } else {
        emit(model, { type: projectile.kind === 'cannon' ? 'cannonImpact' : 'bulletImpact',
          actor: projectile.owner, target: nearest.terrain, x, y });
      }
      continue;
    }
    projectile.x = nx;
    projectile.y = ny;
    if (projectile.age < projectile.lifetime && ny > -100 && ny < WORLD.height + 100) survivors.push(projectile);
  }
  model.projectiles = survivors;
}

function updateFrames(model: Model): void {
  const hero = model.hero;
  const time = hero.actionTime;
  const fixed: Partial<Record<HeroAction, number>> = {
    launch: 6, rise: 7, fall: 8, airAttack: 11, attackWindup: 12, attackActive: 13,
    attackRecovery: 14, guard: 15, shovePrep: 18, shoveHit: 19, shoveRecovery: 20,
    hurt: 21, hurtRecover: 22, dead: 23, dodge: 6,
  };
  hero.frameIndex = fixed[hero.action] ?? (hero.action === 'run' ? 2 + Math.floor(time / 90) % 4
    : hero.action === 'land' ? 9 + Math.min(1, Math.floor(time / 70))
      : hero.action === 'parry' ? 16 + Math.min(1, Math.floor(time / 90)) : Math.floor(time / 450) % 2);
  for (const enemy of model.enemies) {
    const t = enemy.actionTime;
    if (enemy.kind === 'sword') {
      enemy.frameIndex = enemy.action === 'run' ? 1 + Math.floor(t / 100) % 4
        : enemy.action === 'windup' ? 5 + Math.min(1, Math.floor(t / 260))
          : enemy.action === 'attack' ? 7 : enemy.action === 'recovery' ? 8
            : enemy.action === 'hurt' ? 9 : enemy.action === 'stagger' || enemy.action === 'pushed' ? 10
              : enemy.action === 'dead' ? 11 : 0;
    } else {
      enemy.frameIndex = enemy.action === 'run' ? 13 + Math.floor(t / 110) % 2
        : enemy.action === 'aim' ? 15 + Math.min(1, Math.floor(t / 350))
          : enemy.action === 'fire' ? 17 : enemy.action === 'reload' ? 18 + Math.min(2, Math.floor(t / 350))
            : enemy.action === 'hurt' ? 21 : enemy.action === 'stagger' || enemy.action === 'pushed' ? 22
              : enemy.action === 'dead' ? 23 : 12;
    }
  }
  model.cannon.frameIndex = model.cannon.action === 'idle' ? 0
    : model.cannon.action === 'windup' ? 1 : model.cannon.actionTime < 150 ? 2 : 3;
}

/** Detached, JSON-safe render/readback data. Internal -Infinity sentinels are omitted. */
export function snapshot(model: Model) {
  const hero = model.hero;
  return {
    coordinates: 'origin top-left; +x right, +y down; actor x/y = feet centre; projectile x/y = centre',
    time: model.time, tick: model.tick, paused: model.paused, focused: model.focused,
    hero: {
      id: hero.id, x: hero.x, y: hero.y, vx: hero.vx, vy: hero.vy, width: hero.width, height: hero.height,
      facing: hero.facing, grounded: hero.grounded, hp: hero.hp, maxHp: hero.maxHp,
      action: hero.action, actionTime: hero.actionTime, frameIndex: hero.frameIndex,
      invulnerable: heroInvulnerable(model),
      dodgeInvulnerableFrom: hero.dodgeInvulnerableFrom, dodgeInvulnerableUntil: hero.dodgeInvulnerableUntil,
      dodgeTargetX: hero.dodgeTargetX,
      guardHeld: hero.guardHeld, guardBroken: model.time < hero.guardBrokenUntil,
      parryWindow: hero.guardHeld && hero.grounded && model.time >= hero.guardBrokenUntil
        && model.time - hero.guardPressedAt <= 140 && !locked(hero) && !hero.attack,
      blockCount: hero.blockTimes.length, airAttackUsed: hero.airAttackUsed,
      parryTarget: hero.parryTarget ? { ...hero.parryTarget } : null,
      attack: hero.attack ? { ...hero.attack, hitTargets: [...hero.attack.hitTargets] } : null,
    },
    enemies: model.enemies.map(enemy => ({ ...enemy })),
    cannon: { ...model.cannon },
    projectiles: model.projectiles.map(projectile => ({ ...projectile })),
    log: model.log.map(event => ({ ...event })),
  };
}

export type RenderState = ReturnType<typeof snapshot>;
