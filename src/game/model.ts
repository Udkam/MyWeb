import { ART_CONTACT_DATA } from './art-contact-data';
import { actorAabb, capsuleIntersectsAabb, feetPointToWorld, feetSegmentToWorld, sampleClipFrame,
  type ArtContactData, type ArtContactFrame } from './contact';

/** Pure, fixed 60 Hz action-sample simulation. Positions use feet-centre coordinates. */
export const FIXED_MS = 1000 / 60;
/** The new 70px bodies retain only 2px of hair above their standing collision/hurt box. */
export const STANDING_HEIGHT = 68;
const CONTACT_DATA: ArtContactData = ART_CONTACT_DATA;
const DODGE_ART = CONTACT_DATA.actors.hero!.actions.dodge!;
export const DODGE_TIMING = {
  duration: 260,
  invulnerableStart: 60,
  invulnerableEnd: 180,
  frameDurations: DODGE_ART.frames.map(frame => frame.durationMs),
  /** Actual alpha heights 49/51/51/64/70 minus the same 2px hair margin. */
  frameHeights: DODGE_ART.frames.map(frame => Math.min(STANDING_HEIGHT, -frame.visibleTopFromFeet - 2)),
} as const;
export function getDodgeFrame(elapsedMs: number): number {
  let remaining = Math.max(0, elapsedMs);
  for (let i = 0; i < DODGE_TIMING.frameDurations.length; i += 1) {
    if (remaining < DODGE_TIMING.frameDurations[i]!) return i;
    remaining -= DODGE_TIMING.frameDurations[i]!;
  }
  return DODGE_TIMING.frameDurations.length - 1;
}
export function getDodgeHeight(elapsedMs: number): number {
  return DODGE_TIMING.frameHeights[getDodgeFrame(elapsedMs)]!;
}
export const WORLD = { width: 640, height: 360, floor: 255, left: 18, right: 622 } as const;
/** Art-space offsets from feet-centre, shared with the renderer's muzzle effects. */
export const MUZZLES = {
  musket: {
    x: ART_CONTACT_DATA.actors.musket.actions.fire.frames[0].weapon.muzzle[0],
    y: ART_CONTACT_DATA.actors.musket.actions.fire.frames[0].weapon.muzzle[1],
  },
  cannon: { x: -43, y: -24 },
} as const;
export const PLATFORMS = [
  { id: 'crate', x: 160, y: 231, width: 48, height: 24, oneWay: false },
  { id: 'platform', x: 430, y: 207, width: 112, height: 12, oneWay: false },
] as const;

export type Facing = -1 | 1;
export type HeroAction =
  | 'idle' | 'run' | 'launch' | 'rise' | 'fall' | 'land'
  | 'attackWindup' | 'attackActive' | 'attackRecovery' | 'airAttack'
  | 'guard' | 'parry' | 'shovePrep' | 'shoveHit' | 'shoveRecovery'
  | 'hurt' | 'hurtRecover' | 'dead' | 'dodge';
export type EnemyAction = 'idle' | 'run' | 'windup' | 'attack' | 'recovery'
  | 'aim' | 'fire' | 'reload' | 'hurt' | 'stagger' | 'pushed' | 'brace' | 'retreat' | 'dead';

export interface ContextAction {
  kind: 'none' | 'shove' | 'cannon';
  targetId: string | null;
  opportunityId: number | null;
  revision: number;
}

export interface Opportunity {
  id: number;
  targetId: string;
  source: 'parry' | 'whiffPunish' | 'reloadInterrupt';
  enemyActionId: number;
  expiresAt: number;
  facing: Facing;
}

export interface BufferedInput {
  kind: 'attack' | 'guard' | 'jump' | 'dodge' | 'context';
  expiresAt: number;
  contextIntent?: ContextAction;
}

export interface Input {
  move: number;
  jumpPressed: boolean;
  attackPressed: boolean;
  guardPressed: boolean;
  guardHeld: boolean;
  dodgePressed: boolean;
  interactPressed: boolean;
  /** Copy of the displayed action when E/touch-interact was pressed. Never retargeted. */
  contextIntent?: ContextAction;
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
  stage: 1 | 2;
  hitConfirmed: boolean;
  cancelOpen: boolean;
  opportunityId?: number;
  pursuitTargetId?: string;
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
  guardPressure: number;
  guardRecoverAfter: number;
  parryReadyAt: number;
  blockedUntil: number;
  attackLatched: boolean;
  interactLatched: boolean;
  inputBuffer: BufferedInput | null;
  opportunity: Opportunity | null;
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
  actionId: number;
  attackId: number;
  attackContact: boolean;
  whiffRecovery: boolean;
  effectiveLightHits: number;
  braceAt: number;
  braceEstablished: boolean;
  retreatKind: 'guarded' | 'spacing';
  disengagedAt: number;
  staggerUntil: number;
  opportunityUntil: number;
  lockedFacing: Facing;
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
  contextAction: ContextAction;
  encounter: {
    status: 'active' | 'exitReady' | 'complete';
    exitX: number;
    completedAt: number | null;
    routeFlags: string[];
  };
}

export const GRAVITY = 1150;
const EPSILON = 0.00001;
const DEFAULT_INPUT: Input = {
  move: 0, jumpPressed: false, attackPressed: false, guardPressed: false,
  guardHeld: false, dodgePressed: false, interactPressed: false,
};

export function createModel(): Model {
  return {
    time: 0, tick: 0, paused: false, focused: true, nextId: 1,
    contextAction: { kind: 'none', targetId: null, opportunityId: null, revision: 0 },
    encounter: { status: 'active', exitX: 606, completedAt: null, routeFlags: [] },
    hero: {
      id: 'hero', x: 86, y: WORLD.floor, vx: 0, vy: 0, width: 22, height: STANDING_HEIGHT,
      facing: 1, grounded: true, hp: 6, maxHp: 6, action: 'idle', actionTime: 0,
      frameIndex: 0, invulnerableUntil: 0, guardPressedAt: -Infinity,
      guardLatched: false, guardHeld: false, guardBrokenUntil: 0, blockTimes: [],
      guardPressure: 0, guardRecoverAfter: 0, parryReadyAt: 0, blockedUntil: 0,
      attackLatched: false, interactLatched: false, inputBuffer: null, opportunity: null,
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
  const hp = kind === 'sword' ? 4 : 3;
  return {
    id, kind, x, y, vx: 0, vy: 0, width: kind === 'sword' ? 26 : 22, height: STANDING_HEIGHT,
    facing: -1, grounded: true, hp, maxHp: hp, action: 'idle', actionTime: 0,
    frameIndex: kind === 'sword' ? 0 : 12, attackResolved: false,
    pushRemaining: 0, pushDirection: -1, aimX: 86, aimY: WORLD.floor - 24,
    actionId: 0, attackId: 0, attackContact: false, whiffRecovery: false,
    effectiveLightHits: 0, braceAt: Infinity, braceEstablished: false, retreatKind: 'guarded',
    disengagedAt: Infinity, staggerUntil: 0, opportunityUntil: 0, lockedFacing: -1,
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
  model.hero.inputBuffer = null;
  emit(model, { type: paused ? 'pause' : 'resume', actor: 'system' });
}

export function setFocused(model: Model, focused: boolean): void {
  if (model.focused === focused) return;
  model.focused = focused;
  model.hero.guardHeld = false;
  model.hero.guardPressedAt = -Infinity;
  model.hero.inputBuffer = null;
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
  enemy.actionId += 1;
}

function locked(hero: Hero): boolean {
  return hero.action === 'dead' || hero.action === 'hurt' || hero.action === 'hurtRecover'
    || hero.action === 'dodge';
}

/** Each invocation advances exactly one simulation tick. The host owns the RAF accumulator. */
export function step(model: Model, partial: Partial<Input> = {}): void {
  if (model.paused || !model.focused || model.encounter.status === 'complete') return;
  const input = { ...DEFAULT_INPUT, ...partial };
  input.move = Number.isFinite(input.move) ? Math.max(-1, Math.min(1, input.move)) : 0;
  model.tick += 1;
  model.time = model.tick * FIXED_MS;
  updateHero(model, input);
  resolveHeroAttack(model);
  for (const enemy of model.enemies) updateEnemy(model, enemy);
  updateCannon(model);
  updateProjectiles(model);
  publishContextAction(model);
  if (model.enemies.every(enemy => enemy.hp <= 0) && model.hero.hp > 0) {
    if (model.encounter.status === 'active') {
      model.encounter.status = 'exitReady';
      emit(model, { type: 'exitReady', actor: 'system' });
    }
    if (model.hero.grounded && model.hero.x >= model.encounter.exitX) {
      model.encounter.status = 'complete';
      model.encounter.completedAt = model.time;
      model.hero.inputBuffer = null;
      emit(model, { type: 'encounterComplete', actor: 'hero' });
    }
  }
  updateFrames(model);
}

function updateHero(model: Model, input: Input): void {
  const hero = model.hero;
  hero.actionTime += FIXED_MS;
  if (hero.opportunity && (model.time >= hero.opportunity.expiresAt
    || !model.enemies.some(enemy => enemy.id === hero.opportunity!.targetId && enemy.hp > 0))) {
    clearOpportunity(model, 'expired');
  }
  if (!hero.guardHeld && !input.guardHeld && !input.guardPressed && model.time >= hero.guardRecoverAfter) {
    hero.guardPressure = Math.max(0, hero.guardPressure - 20 * FIXED_MS / 1000);
    if (hero.guardPressure === 0) hero.blockTimes = [];
  }
  const attackPressed = input.attackPressed && !hero.attackLatched;
  const contextPressed = input.interactPressed && !hero.interactLatched;
  const guardPressed = input.guardPressed && !hero.guardLatched;
  hero.attackLatched = input.attackPressed;
  hero.interactLatched = input.interactPressed;
  if (!input.guardHeld && !input.guardPressed) hero.guardLatched = false;
  if (input.guardHeld || input.guardPressed) hero.guardLatched = true;
  hero.guardHeld = input.guardHeld || input.guardPressed;

  if (hero.inputBuffer && model.time > hero.inputBuffer.expiresAt) {
    if (hero.inputBuffer.kind === 'context') emit(model, { type: 'contextMiss', actor: 'hero',
      target: hero.inputBuffer.contextIntent?.targetId ?? undefined });
    hero.inputBuffer = null;
  }
  if (hero.hp <= 0) {
    hero.inputBuffer = null;
    hero.height = STANDING_HEIGHT;
    heroAction(hero, 'dead');
    hero.vx = 0;
    integrate(hero, FIXED_MS / 1000, model);
    return;
  }
  if (hero.action === 'hurt' && hero.actionTime + EPSILON >= 160) heroAction(hero, 'hurtRecover');
  if ((hero.action === 'hurt' || hero.action === 'hurtRecover') && model.time >= hero.stunUntil) heroAction(hero, 'idle');
  if (hero.action === 'dodge' && model.time >= hero.dodgeUntil) {
    hero.height = STANDING_HEIGHT;
    hero.x = nearestLegalX(model, hero, hero.x);
    heroAction(hero, 'idle');
  }
  if (hero.action === 'parry' && hero.actionTime + EPSILON >= 210) heroAction(hero, 'idle');
  if (hero.action === 'land' && hero.actionTime + EPSILON >= 140) heroAction(hero, 'idle');
  if (hero.attack) {
    hero.attack.elapsed += FIXED_MS;
    hero.attack.cancelOpen = hero.attack.hitConfirmed && hero.attack.elapsed + EPSILON >= hero.attack.activeEnd;
    if (hero.attack.elapsed + EPSILON >= hero.attack.duration) {
      if (!hero.attack.hitConfirmed && hero.attack.kind !== 'shove') emit(model, { type: 'attackWhiff', actor: 'hero' });
      hero.attack = null;
      heroAction(hero, 'idle');
    } else syncAttackAction(hero);
  }
  if (input.move && !locked(hero) && !hero.attack) hero.facing = input.move < 0 ? -1 : 1;
  if (hero.grounded) hero.coyoteUntil = model.time + 80;

  // Exactly one slot. A fresh deliberate input replaces an older pending action.
  const kind: BufferedInput['kind'] | null = contextPressed ? 'context' : input.dodgePressed ? 'dodge'
    : input.jumpPressed ? 'jump' : guardPressed ? 'guard' : attackPressed ? 'attack' : null;
  if (kind) hero.inputBuffer = {
    kind, expiresAt: model.time + 180,
    ...(kind === 'context' ? { contextIntent: { ...(input.contextIntent ?? model.contextAction) } } : {}),
  };
  executeBufferedInput(model);

  if (hero.action === 'dodge') {
    hero.height = getDodgeHeight(hero.actionTime);
    const remaining = hero.dodgeTargetX - hero.x;
    hero.vx = Math.sign(remaining) * Math.min(330, Math.abs(remaining) * 1000 / FIXED_MS);
  } else if (hero.action === 'hurt') hero.vx *= 0.88;
  else if (hero.action === 'hurtRecover' || model.time < hero.blockedUntil) hero.vx = 0;
  else if (hero.attack && hero.grounded) {
    hero.vx = hero.attack.stage === 2 && hero.attack.elapsed >= 100 && hero.attack.elapsed < hero.attack.activeEnd
      ? hero.attack.facing * 75 : 0;
  } else if (hero.guardHeld && hero.grounded) hero.vx = 0;
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
    if (hero.guardHeld && hero.grounded && hero.guardPressure < 100 && model.time >= hero.guardBrokenUntil) heroAction(hero, 'guard');
    else if (!hero.grounded) {
      if (hero.action === 'launch' && hero.actionTime < 70) return;
      heroAction(hero, hero.vy < -35 ? 'rise' : 'fall');
    } else heroAction(hero, Math.abs(hero.vx) > 1 ? 'run' : 'idle');
  }
}

function executeBufferedInput(model: Model): void {
  const hero = model.hero;
  const buffered = hero.inputBuffer;
  if (!buffered || locked(hero) || model.time < hero.blockedUntil) return;
  let stage: 1 | 2 = 1;
  if (hero.attack) {
    if (!hero.attack.cancelOpen) return;
    if (buffered.kind === 'attack') {
      if (hero.attack.kind !== 'ground' || hero.attack.stage !== 1) return;
      stage = 2;
    }
    emit(model, { type: 'hitConfirmCancel', actor: 'hero', target: buffered.kind });
    hero.attack = null;
    heroAction(hero, 'idle');
  }
  if (buffered.kind === 'guard') {
    if (!hero.guardHeld || !hero.grounded || hero.guardPressure >= 100 || model.time < hero.guardBrokenUntil) {
      hero.inputBuffer = null;
      return;
    }
    if (model.time + EPSILON >= hero.parryReadyAt) {
      hero.guardPressedAt = model.time;
      hero.parryReadyAt = model.time + 480;
    } else hero.guardPressedAt = -Infinity;
    heroAction(hero, 'guard');
  } else if (buffered.kind === 'jump') {
    if (!hero.grounded && model.time > hero.coyoteUntil) return;
    hero.vy = -380;
    hero.grounded = false;
    hero.coyoteUntil = -Infinity;
    heroAction(hero, 'launch');
    emit(model, { type: 'jump', actor: 'hero' });
  } else if (buffered.kind === 'dodge') {
    if (!hero.grounded || model.time + EPSILON < hero.dodgeCooldownUntil) return;
    heroAction(hero, 'dodge');
    hero.height = getDodgeHeight(0);
    hero.dodgeUntil = model.time + DODGE_TIMING.duration;
    hero.dodgeInvulnerableFrom = model.time + DODGE_TIMING.invulnerableStart;
    hero.dodgeInvulnerableUntil = model.time + DODGE_TIMING.invulnerableEnd;
    hero.dodgeStartX = hero.x;
    const preview = { ...hero };
    moveHorizontal(preview, hero.facing * 79.2, model, true);
    hero.dodgeTargetX = nearestLegalX(model, { ...hero, height: STANDING_HEIGHT }, preview.x,
      Math.min(hero.x, preview.x), Math.max(hero.x, preview.x));
    hero.dodgeCooldownUntil = model.time + 800;
    emit(model, { type: 'dodge', actor: 'hero' });
  } else if (buffered.kind === 'context') {
    executeContext(model, buffered.contextIntent!);
  } else {
    if (!hero.grounded && hero.airAttackUsed) { hero.inputBuffer = null; return; }
    const opportunity = reachableOpportunity(model);
    beginAttack(model, hero.grounded ? 'ground' : 'air', undefined, stage, opportunity);
    if (opportunity) consumeOpportunity(model);
    if (!hero.grounded) hero.airAttackUsed = true;
  }
  hero.inputBuffer = null;
}

function executeContext(model: Model, intent: ContextAction): void {
  const hero = model.hero;
  if (intent.kind === 'shove') {
    const opportunity = reachableOpportunity(model);
    if (opportunity && opportunity.id === intent.opportunityId && opportunity.targetId === intent.targetId
      && shoveCanReach(model, opportunity)) {
      beginAttack(model, 'shove', opportunity.targetId, 1, opportunity);
      consumeOpportunity(model);
      return;
    }
  } else if (intent.kind === 'cannon' && intent.targetId === 'cannon' && model.cannon.action === 'idle'
    && Math.abs(hero.x - model.cannon.x) <= 58 && Math.abs(hero.y - model.cannon.y) <= 30) {
    model.cannon.action = 'windup';
    model.cannon.actionTime = 0;
    emit(model, { type: 'cannonIgnite', actor: 'hero', target: 'cannon' });
    return;
  }
  emit(model, { type: 'contextMiss', actor: 'hero', ...(intent.targetId ? { target: intent.targetId } : {}) });
}

function beginAttack(model: Model, kind: HeroAttack['kind'], targetId?: string,
  stage: 1 | 2 = 1, opportunity?: Opportunity | null): void {
  const hero = model.hero;
  hero.attack = {
    id: model.nextId++, kind, elapsed: 0, facing: hero.facing, hitTargets: [], stage,
    hitConfirmed: false, cancelOpen: false,
    activeStart: kind === 'air' ? 35 : kind === 'shove' ? 120 : stage === 2 ? 150 : 100,
    activeEnd: kind === 'air' ? 155 : kind === 'shove' ? 220 : stage === 2 ? 260 : 180,
    duration: kind === 'air' ? 300 : kind === 'shove' ? 470 : stage === 2 ? 560 : 420,
    ...(targetId ? { targetId } : {}),
    ...(opportunity ? { opportunityId: opportunity.id, pursuitTargetId: opportunity.targetId } : {}),
  };
  syncAttackAction(hero);
  emit(model, { type: kind === 'shove' ? 'shovePrepare' : 'attack', actor: 'hero',
    ...(targetId ? { target: targetId } : {}), amount: stage });
}

function reachableOpportunity(model: Model): Opportunity | null {
  const hero = model.hero;
  const opportunity = hero.opportunity;
  if (!opportunity || model.time >= opportunity.expiresAt || hero.facing !== opportunity.facing) return null;
  const target = model.enemies.find(enemy => enemy.id === opportunity.targetId && enemy.hp > 0);
  return target && inFront(hero, target.x) && Math.abs(target.x - hero.x) <= 88
    && Math.abs((target.y - target.height / 2) - (hero.y - hero.height / 2)) < 46 ? opportunity : null;
}

/** The displayed E only promises the real forward palm, not the broader J opportunity radius. */
function shoveCanReach(model: Model, opportunity: Opportunity): boolean {
  const target = model.enemies.find(enemy => enemy.id === opportunity.targetId && enemy.hp > 0);
  if (!target) return false;
  const clip = CONTACT_DATA.actors.hero!.actions.shove!;
  return (clip.phaseFrames?.active ?? []).some(index => {
    const palm = clip.frames[index]?.palm;
    if (!palm) return false;
    const point = feetPointToWorld(palm, model.hero);
    return capsuleIntersectsAabb({ a: point, b: point }, 2, actorAabb(target));
  });
}

function clearOpportunity(model: Model, reason: string): void {
  if (model.hero.opportunity) emit(model, { type: 'opportunityEnd', actor: 'hero',
    target: model.hero.opportunity.targetId });
  model.hero.opportunity = null;
  model.hero.parryTarget = null;
}

function consumeOpportunity(model: Model): void {
  const opportunity = model.hero.opportunity;
  if (opportunity) {
    const enemy = model.enemies.find(item => item.id === opportunity.targetId);
    if (enemy) enemy.opportunityUntil = 0;
    emit(model, { type: 'opportunityConsumed', actor: 'hero', target: opportunity.targetId });
  }
  model.hero.opportunity = null;
  model.hero.parryTarget = null;
}

function grantOpportunity(model: Model, enemy: Enemy, source: Opportunity['source'], sourceActionId: number): void {
  if (enemy.hp <= 0) return;
  model.hero.opportunity = { id: model.nextId++, targetId: enemy.id, source, enemyActionId: sourceActionId,
    expiresAt: model.time + 950, facing: model.hero.facing };
  model.hero.parryTarget = { enemyId: enemy.id, facing: model.hero.facing, expiresAt: model.time + 950 };
  enemy.opportunityUntil = model.time + 950;
  enemy.staggerUntil = model.time + 950;
  emit(model, { type: 'opportunity', actor: 'hero', target: enemy.id });
  if (!model.encounter.routeFlags.includes(source)) model.encounter.routeFlags.push(source);
}

/** Last published intent, safe for a keydown handler to copy before the next tick. */
export function getContextAction(model: Model): ContextAction {
  return { ...model.contextAction };
}

function publishContextAction(model: Model): void {
  const opportunity = model.hero.hp > 0 ? reachableOpportunity(model) : null;
  let next: ContextAction = { kind: 'none', targetId: null, opportunityId: null, revision: model.contextAction.revision };
  if (opportunity && shoveCanReach(model, opportunity)) next = { ...next, kind: 'shove', targetId: opportunity.targetId, opportunityId: opportunity.id };
  else if (model.hero.hp > 0 && model.cannon.action === 'idle' && Math.abs(model.hero.x - model.cannon.x) <= 58
    && Math.abs(model.hero.y - model.cannon.y) <= 30) next = { ...next, kind: 'cannon', targetId: 'cannon' };
  if (next.kind !== model.contextAction.kind || next.targetId !== model.contextAction.targetId
    || next.opportunityId !== model.contextAction.opportunityId) next.revision += 1;
  model.contextAction = next;
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
  if (!attack || hero.hp <= 0 || attack.elapsed + EPSILON < attack.activeStart || attack.elapsed >= attack.activeEnd) return;
  const name = attack.kind === 'shove' ? 'shove' : attack.kind === 'air' ? 'airAttack' : `attack${attack.stage}`;
  const clip = CONTACT_DATA.actors.hero!.actions[name]!;
  const frame = sampleClipFrame(clip, attack.elapsed - attack.activeStart, 'active', attack.activeEnd - attack.activeStart);
  if (!frame) return;
  for (const enemy of model.enemies) {
    if (enemy.hp <= 0 || attack.hitTargets.includes(enemy.id)) continue;
    if (attack.kind === 'shove' && enemy.id !== attack.targetId) continue;
    const pose = { x: hero.x, y: hero.y, facing: attack.facing };
    if (attack.kind === 'shove') {
      if (!frame.palm) continue;
      const palm = feetPointToWorld(frame.palm, pose);
      if (!capsuleIntersectsAabb({ a: palm, b: palm }, 2, actorAabb(enemy))) continue;
    } else if (!bladeTouches(frame, pose, enemy)) continue;
    attack.hitTargets.push(enemy.id);
    if (attack.kind === 'shove') {
      attack.hitConfirmed = true;
      enemy.pushDirection = attack.facing;
      enemy.pushRemaining = 54;
      enemyAction(enemy, 'pushed');
      enemy.actionTime = 0;
      enemy.staggerUntil = model.time + 650;
      enemy.attackResolved = true;
      emit(model, { type: 'shove', actor: 'hero', target: enemy.id, amount: 54, x: enemy.x, y: enemy.y });
      if (!model.encounter.routeFlags.includes('shove')) model.encounter.routeFlags.push('shove');
      continue;
    }
    if (enemy.braceEstablished && inFront(enemy, hero.x)) {
      emit(model, { type: 'enemyBlock', actor: enemy.id, target: 'hero', x: enemy.x, y: enemy.y - 30 });
      continue;
    }
    const source = enemy.kind === 'musket' && enemy.action === 'reload' ? 'reloadInterrupt'
      : enemy.kind === 'sword' && enemy.action === 'recovery' && enemy.whiffRecovery ? 'whiffPunish' : null;
    const actionId = source === 'whiffPunish' ? enemy.attackId : enemy.actionId;
    const pursuing = attack.pursuitTargetId === enemy.id;
    attack.hitConfirmed = true;
    damageEnemy(model, enemy, pursuing ? 2 : 1, 'hero', 'attackHit');
    if (attack.stage === 2 && enemy.hp > 0) moveHorizontal(enemy, attack.facing * 12, model);
    if (source && !pursuing && enemy.hp > 0) grantOpportunity(model, enemy, source, actionId);
  }
}

function bladeTouches(frame: ArtContactFrame, pose: { x: number; y: number; facing: Facing }, target: Body): boolean {
  const weapon = frame.weapon;
  return Boolean(weapon?.root && weapon.tip
    && capsuleIntersectsAabb(feetSegmentToWorld(weapon.root, weapon.tip, pose), 2, actorAabb(target)));
}

function updateEnemy(model: Model, enemy: Enemy): void {
  enemy.actionTime += FIXED_MS;
  enemy.vx = 0;
  if (enemy.hp <= 0) {
    enemyAction(enemy, 'dead');
    integrate(enemy, FIXED_MS / 1000, model);
    return;
  }
  if (Math.abs(enemy.x - model.hero.x) > 140) {
    if (!Number.isFinite(enemy.disengagedAt)) enemy.disengagedAt = model.time;
    if (model.time - enemy.disengagedAt >= 500) enemy.effectiveLightHits = 0;
  } else enemy.disengagedAt = Infinity;
  if (enemy.pushRemaining > EPSILON) {
    const wanted = Math.min(enemy.pushRemaining, 360 * FIXED_MS / 1000);
    const oldX = enemy.x;
    moveHorizontal(enemy, wanted * enemy.pushDirection, model);
    const moved = Math.abs(enemy.x - oldX);
    enemy.pushRemaining = Math.max(0, enemy.pushRemaining - moved);
    if (moved + EPSILON < wanted) enemy.pushRemaining = 0;
    // A collision can interrupt a second foe, but never grants or refreshes opportunity.
    for (const other of model.enemies) {
      if (other.id === enemy.id || other.hp <= 0 || !verticalOverlap(enemy, other)) continue;
      if (Math.abs(enemy.x - other.x) <= (enemy.width + other.width) / 2 + EPSILON
        && inFront({ x: enemy.x, facing: enemy.pushDirection }, other.x)) {
        enemyAction(other, 'stagger');
        other.staggerUntil = Math.max(other.staggerUntil, model.time + 260);
        other.attackResolved = true;
        emit(model, { type: 'bodyInterrupt', actor: enemy.id, target: other.id });
      }
    }
  }
  if (enemy.kind === 'sword' && model.time + EPSILON >= enemy.braceAt
    && model.time >= enemy.opportunityUntil && enemy.action !== 'brace' && enemy.action !== 'retreat'
    && enemy.action !== 'pushed') {
    enemyAction(enemy, 'brace');
    enemy.braceEstablished = false;
    enemy.lockedFacing = model.hero.x < enemy.x ? -1 : 1;
    enemy.facing = enemy.lockedFacing;
    enemy.braceAt = Infinity;
    emit(model, { type: 'enemyBrace', actor: enemy.id });
  }
  if (enemy.action === 'hurt' && enemy.actionTime + EPSILON >= 240) {
    if (model.time < enemy.opportunityUntil) {
      enemyAction(enemy, 'stagger');
      enemy.staggerUntil = enemy.opportunityUntil;
    } else enemyAction(enemy, 'idle');
  }
  if ((enemy.action === 'stagger' || enemy.action === 'pushed') && model.time >= enemy.staggerUntil) enemyAction(enemy, 'idle');
  if (enemy.action === 'brace') {
    enemy.facing = enemy.lockedFacing;
    if (enemy.actionTime + EPSILON >= 160) {
      enemy.braceEstablished = true;
      enemy.retreatKind = 'guarded';
      enemyAction(enemy, 'retreat');
      emit(model, { type: 'enemyRetreat', actor: enemy.id });
    }
  }
  if (enemy.action === 'retreat') {
    if (enemy.retreatKind === 'spacing') {
      enemy.facing = model.hero.x < enemy.x ? -1 : 1;
      enemy.lockedFacing = enemy.facing;
    }
    enemy.vx = -enemy.lockedFacing * 82;
    const frame = sampleClipFrame(CONTACT_DATA.actors.sword!.actions.attack!, 0, 'active', 150);
    if (enemy.retreatKind === 'spacing' && enemy.actionTime + EPSILON >= 150
      && frame && bladeTouches(frame, enemy, model.hero)) {
      enemy.vx = 0;
      enemyAction(enemy, 'idle');
    } else if (enemy.retreatKind === 'guarded' && enemy.actionTime + EPSILON >= 550) {
      enemy.braceEstablished = false;
      enemy.effectiveLightHits = 0;
      enemyAction(enemy, 'idle');
    }
  }
  const stunned = ['hurt', 'stagger', 'pushed', 'brace', 'retreat'].includes(enemy.action);
  if (!stunned && model.hero.hp > 0) {
    if (enemy.kind === 'sword') updateSword(model, enemy);
    else updateMusket(model, enemy);
  }
  integrate(enemy, FIXED_MS / 1000, model);
}

function updateSword(model: Model, enemy: Enemy): void {
  const hero = model.hero;
  if (enemy.action === 'windup') {
    if (enemy.actionTime < 240) enemy.lockedFacing = hero.x < enemy.x ? -1 : 1;
    enemy.facing = enemy.lockedFacing;
    if (enemy.actionTime + EPSILON >= 520) {
      enemyAction(enemy, 'attack');
      enemy.attackResolved = false;
      enemy.attackContact = false;
      const preview = { ...enemy };
      moveHorizontal(preview, enemy.facing * 8, model);
      const frame = sampleClipFrame(CONTACT_DATA.actors.sword!.actions.attack!, 0, 'active', 150);
      if (frame && bladeTouches(frame, preview, hero)) enemy.x = preview.x;
      emit(model, { type: 'enemyAttack', actor: enemy.id, target: 'hero' });
    }
  }
  if (enemy.action === 'attack') {
    const frame = sampleClipFrame(CONTACT_DATA.actors.sword!.actions.attack!, enemy.actionTime, 'active', 150);
    if (!enemy.attackResolved && frame && bladeTouches(frame, enemy, hero)) {
      enemy.attackResolved = true;
      const result = incomingHeroHit(model, enemy.id, enemy.x, 1, 'melee');
      enemy.attackContact = result !== 'ignored';
    }
    if (enemy.action === 'attack' && enemy.actionTime + EPSILON >= 150) {
      enemy.whiffRecovery = !enemy.attackContact;
      enemyAction(enemy, 'recovery');
      if (enemy.whiffRecovery) emit(model, { type: 'enemyWhiff', actor: enemy.id });
    }
  }
  if (enemy.action === 'recovery' && enemy.actionTime + EPSILON >= 650) enemyAction(enemy, 'idle');
  if (enemy.action !== 'idle' && enemy.action !== 'run') return;
  const dx = hero.x - enemy.x;
  enemy.facing = dx < 0 ? -1 : 1;
  const frame = sampleClipFrame(CONTACT_DATA.actors.sword!.actions.attack!, 0, 'active', 150);
  if (Math.abs(dx) < 40 && Math.abs(hero.y - enemy.y) < 38 && frame && !bladeTouches(frame, enemy, hero)) {
    enemy.retreatKind = 'spacing';
    enemy.braceEstablished = false;
    enemy.lockedFacing = enemy.facing;
    enemyAction(enemy, 'retreat');
    enemy.vx = -enemy.facing * 82;
    emit(model, { type: 'enemySpace', actor: enemy.id, target: 'hero' });
    return;
  }
  if (Math.abs(dx) <= 62 && Math.abs(hero.y - enemy.y) < 38) {
    enemyAction(enemy, 'windup');
    enemy.lockedFacing = enemy.facing;
    enemy.attackId = model.nextId++;
    enemy.attackResolved = false;
    enemy.whiffRecovery = false;
    emit(model, { type: 'enemyWindup', actor: enemy.id, target: 'hero' });
  } else {
    enemy.vx = enemy.facing * 64;
    enemyAction(enemy, 'run');
  }
}

function updateMusket(model: Model, enemy: Enemy): void {
  const hero = model.hero;
  if (enemy.action === 'idle' || enemy.action === 'run') {
    enemy.facing = hero.x < enemy.x ? -1 : 1;
    const line = getMusketLine(enemy, 'aim');
    enemy.aimX = line.muzzle.x + line.direction.x * 360;
    enemy.aimY = line.muzzle.y + line.direction.y * 360;
    enemyAction(enemy, 'aim');
    emit(model, { type: 'enemyAim', actor: enemy.id, target: 'hero' });
  }
  if (enemy.action === 'aim') {
    if (enemy.actionTime < 450) {
      enemy.facing = hero.x < enemy.x ? -1 : 1;
      const line = getMusketLine(enemy, 'aim');
      enemy.aimX = line.muzzle.x + line.direction.x * 360;
      enemy.aimY = line.muzzle.y + line.direction.y * 360;
    }
    if (enemy.actionTime + EPSILON >= 1000) {
      enemyAction(enemy, 'fire');
      const line = getMusketLine(enemy, 'fire');
      const { x, y } = line.muzzle;
      model.projectiles.push({
        id: model.nextId++, kind: 'musket', owner: enemy.id, x, y,
        vx: line.direction.x * 390, vy: line.direction.y * 390,
        radius: 3, damage: 1, age: 0, lifetime: 3500,
      });
      emit(model, { type: 'musketFire', actor: enemy.id, target: 'hero', x, y });
    }
  }
  if (enemy.action === 'fire' && enemy.actionTime + EPSILON >= 120) enemyAction(enemy, 'reload');
  if (enemy.action === 'reload') {
    if (Math.abs(hero.x - enemy.x) < 100) enemy.vx = (hero.x < enemy.x ? 1 : -1) * 26;
    if (enemy.actionTime + EPSILON >= 1700) enemyAction(enemy, 'idle');
  }
}

/** Fixed art-authored downward firing line; hero movement cannot secretly bend it. */
export function getMusketLine(pose: { x: number; y: number; facing: Facing }, phase: 'aim' | 'fire' = 'aim') {
  const frame = CONTACT_DATA.actors.musket!.actions[phase]!.frames[0]!;
  const root = feetPointToWorld(frame.weapon!.root!, pose);
  const muzzle = feetPointToWorld(frame.weapon!.muzzle!, pose);
  const length = Math.hypot(muzzle.x - root.x, muzzle.y - root.y);
  return { root, muzzle, direction: { x: (muzzle.x - root.x) / length, y: (muzzle.y - root.y) / length } };
}

function incomingHeroHit(model: Model, owner: string, sourceX: number, damage: number,
  kind: 'melee' | 'musket' | 'cannon'): 'ignored' | 'parry' | 'block' | 'hurt' {
  const hero = model.hero;
  if (hero.hp <= 0 || heroInvulnerable(model)) return 'ignored';
  const canGuard = kind === 'melee' && hero.guardHeld && hero.grounded && hero.guardPressure < 100 && !locked(hero)
    && !hero.attack && model.time >= hero.guardBrokenUntil && inFront(hero, sourceX);
  if (canGuard) {
    const attacker = model.enemies.find(enemy => enemy.id === owner && enemy.hp > 0);
    if (model.time - hero.guardPressedAt <= 140 + EPSILON && attacker) {
      heroAction(hero, 'parry');
      hero.actionTime = 0;
      hero.guardPressure = Math.max(0, hero.guardPressure - 40);
      hero.guardRecoverAfter = model.time + 1200;
      hero.parryReadyAt = model.time + 220;
      grantOpportunity(model, attacker, 'parry', attacker.attackId);
      enemyAction(attacker, 'stagger');
      attacker.actionTime = 0;
      attacker.pushRemaining = 0;
      attacker.attackResolved = true;
      emit(model, { type: 'parry', actor: 'hero', target: owner, x: hero.x, y: hero.y - 32 });
      return 'parry';
    }
    hero.guardPressure = Math.min(100, hero.guardPressure + 40);
    hero.guardRecoverAfter = model.time + 1200;
    hero.blockTimes.push(model.time);
    if (hero.blockTimes.length > 3) hero.blockTimes.shift();
    hero.blockedUntil = model.time + 110;
    moveHorizontal(hero, -hero.facing * (hero.guardPressure >= 80 ? 5 : 3), model);
    emit(model, { type: 'block', actor: 'hero', target: owner, amount: hero.guardPressure });
    if (hero.guardPressure >= 100) {
      hero.guardBrokenUntil = model.time + 650;
      hero.stunUntil = model.time + 450;
      hero.guardHeld = false;
      hero.guardPressedAt = -Infinity;
      hero.inputBuffer = null;
      clearOpportunity(model, 'guardBreak');
      hero.vx = -hero.facing * 95;
      heroAction(hero, 'hurt');
      hero.actionTime = 0;
      emit(model, { type: 'guardBreak', actor: owner, target: 'hero' });
    }
    return 'block';
  }
  hero.hp = Math.max(0, hero.hp - damage);
  hero.attack = null;
  hero.inputBuffer = null;
  clearOpportunity(model, 'hurt');
  hero.height = STANDING_HEIGHT;
  hero.x = nearestLegalX(model, hero, hero.x);
  hero.invulnerableUntil = model.time + 700;
  hero.guardRecoverAfter = model.time + 1200;
  hero.stunUntil = model.time + 360;
  hero.vx = (sourceX < hero.x ? 1 : -1) * 135;
  hero.guardPressedAt = -Infinity;
  heroAction(hero, hero.hp <= 0 ? 'dead' : 'hurt');
  hero.actionTime = 0;
  emit(model, { type: 'hurt', actor: owner, target: 'hero', amount: damage, x: hero.x, y: hero.y - 32 });
  if (hero.hp <= 0) emit(model, { type: 'death', actor: owner, target: 'hero' });
  return 'hurt';
}

function damageEnemy(model: Model, enemy: Enemy, amount: number, owner: string, type: string): void {
  if (enemy.hp <= 0) return;
  enemy.hp = Math.max(0, enemy.hp - amount);
  enemy.pushRemaining = 0;
  enemy.attackResolved = true;
  if (owner === 'hero' && type === 'attackHit') {
    enemy.effectiveLightHits += 1;
    if (enemy.kind === 'sword' && enemy.effectiveLightHits >= 2 && !Number.isFinite(enemy.braceAt)
      && enemy.action !== 'brace' && enemy.action !== 'retreat') enemy.braceAt = model.time + 220;
  }
  // Full damage continues during the visible brace preparation. Extra hits do not rewind it.
  const preparingBrace = enemy.action === 'brace' && !enemy.braceEstablished;
  const alreadyReacting = enemy.action === 'hurt' && enemy.effectiveLightHits >= 3 && Number.isFinite(enemy.braceAt);
  if (!preparingBrace && !alreadyReacting) {
    enemyAction(enemy, enemy.hp <= 0 ? 'dead' : 'hurt');
    enemy.actionTime = 0;
  }
  if (enemy.hp <= 0) {
    enemyAction(enemy, 'dead');
    enemy.braceEstablished = false;
    if (model.hero.opportunity?.targetId === enemy.id) clearOpportunity(model, 'targetDead');
  }
  emit(model, { type, actor: owner, target: enemy.id, amount, x: enemy.x, y: enemy.y - 30 });
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
        if (projectile.kind === 'cannon' && !model.encounter.routeFlags.includes('cannon')) model.encounter.routeFlags.push('cannon');
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
      animationClip: hero.attack?.kind === 'ground' ? `attack${hero.attack.stage}` : hero.action,
      invulnerable: heroInvulnerable(model),
      dodgeInvulnerableFrom: hero.dodgeInvulnerableFrom, dodgeInvulnerableUntil: hero.dodgeInvulnerableUntil,
      dodgeTargetX: hero.dodgeTargetX,
      guardHeld: hero.guardHeld, guardBroken: model.time < hero.guardBrokenUntil || hero.guardPressure >= 100,
      guardPressure: hero.guardPressure, parryReadyAt: hero.parryReadyAt,
      guardRecoveryRemaining: Math.max(0, hero.guardRecoverAfter - model.time),
      parryWindow: hero.guardHeld && hero.grounded && model.time >= hero.guardBrokenUntil
        && model.time - hero.guardPressedAt <= 140 && !locked(hero) && !hero.attack,
      blockCount: Math.ceil(hero.guardPressure / 40), airAttackUsed: hero.airAttackUsed,
      opportunity: hero.opportunity ? { ...hero.opportunity } : null,
      inputBuffer: hero.inputBuffer ? { ...hero.inputBuffer,
        ...(hero.inputBuffer.contextIntent ? { contextIntent: { ...hero.inputBuffer.contextIntent } } : {}) } : null,
      parryTarget: hero.parryTarget ? { ...hero.parryTarget } : null,
      attack: hero.attack ? { ...hero.attack, hitTargets: [...hero.attack.hitTargets] } : null,
    },
    enemies: model.enemies.map(enemy => ({ ...enemy })),
    cannon: { ...model.cannon },
    projectiles: model.projectiles.map(projectile => ({ ...projectile })),
    log: model.log.map(event => ({ ...event })),
    contextAction: { ...model.contextAction },
    encounter: { ...model.encounter, routeFlags: [...model.encounter.routeFlags] },
  };
}

export type RenderState = ReturnType<typeof snapshot>;
