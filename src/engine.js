/** Deterministic world simulation. Seconds, world coordinates, y points down.
 * No browser APIs or wall-clock/random sources. step mutates and returns state.
 * Enemy warnings: windup/windupMax seconds, telegraph kind/angle/range/width/
 * spread/remaining. chargeX/Y is the locked destination, never a hidden retarget.
 */
import * as monsters from './monsters.js';
import { LAYOUTS, LEGACY_LAYOUTS, buildRoomGeometry } from './rooms.js';
export { LAYOUTS, LEGACY_LAYOUTS };
const { SPECIAL_ENEMIES, updateSpecialEnemy, adjustIncomingDamage } = monsters;
export const WEAPONS = [
  { id: 'cinder', name: 'Cinderbolt', description: 'Steady single firebolts.', unlockRooms: 0 },
  { id: 'scatter', name: 'Scatter', description: 'Three short-range pellets with a longer firing interval.', unlockRooms: 4 },
  { id: 'needle', name: 'Needle', description: 'Faster, lighter shots that pierce one extra enemy.', unlockRooms: 10 },
];
export const RELICS = [
  { id: 'split', name: 'Split Flame', description: 'Add two half-damage side bolts per level.', maxLevel: 3, color: '#ffbd69', tag: 'SPLIT' },
  { id: 'ricochet', name: 'Echo Stone', description: 'Shots bounce off walls and pillars once per level.', maxLevel: 3, color: '#91d9e5', tag: 'BOUNCE' },
  { id: 'pierce', name: 'Heartseeker', description: 'Shots pass through one extra enemy per level.', maxLevel: 3, color: '#c2e8ef', tag: 'PIERCE' },
  { id: 'seeking', name: 'Mothlight', description: 'Shots turn toward nearby enemies. Each level increases steering.', maxLevel: 3, color: '#fa9fdf', tag: 'SEEK' },
  { id: 'chain', name: 'Chain Spark', description: 'Hits arc to another nearby enemy for half damage. Add one jump per level.', maxLevel: 3, color: '#a3dfff', tag: 'CHAIN' },
  { id: 'burn', name: 'Ember Core', description: 'Hits burn for two seconds, dealing 3 damage per second per level.', maxLevel: 3, color: '#ff8851', tag: 'BURN' },
  { id: 'cold', name: 'Frost Seal', description: 'Hits slow enemies for two seconds: 20% per level, up to 60%.', maxLevel: 3, color: '#98eaff', tag: 'SLOW' },
  { id: 'explosive', name: 'Ash Bloom', description: 'Defeated enemies explode for 12 nearby damage per level, with growing radius.', maxLevel: 3, color: '#ffc075', tag: 'EXPLODE' },
  { id: 'blades', name: 'Orbit Blades', description: 'Gain one orbiting blade per level. Each damages enemies on contact.', maxLevel: 3, color: '#e2ecf2', tag: 'ORBIT' },
  { id: 'trail', name: 'Firetrail', description: 'Dashes leave a damaging trail for one second. Each level increases damage.', maxLevel: 3, color: '#ff8957', tag: 'DASH' },
  { id: 'nova', name: 'Nova Core', description: 'Nova gains 25% radius, 12 damage and faster charging per level.', maxLevel: 3, color: '#93f4e8', tag: 'NOVA' },
  { id: 'blood', name: 'Blood Pact', description: 'Lose one maximum heart this run for 30% more shot damage per level.', maxLevel: 3, color: '#ef7894', tag: 'TRADEOFF' },
];
const TAU = Math.PI * 2;
const MAX_ROOMS = 15;
const PAD = 28;
const MAX_ENEMIES = 18;
export const NORMAL_ENEMY_TYPES = Object.freeze(['slime', 'shooter', 'charger', 'caster', 'sniper', 'orbiter', 'brood', 'meteor', ...Object.keys(SPECIAL_ENEMIES)]);
export const BOSS_POOLS = Object.freeze([['sentinel', 'briar'], ['leviathan', 'mirror'], ['warden', 'kiln'], ['tempest', 'eclipse'], ['sovereign', 'chronarch']].map(pair => Object.freeze(pair)));
const BOSS_IDS = new Set(BOSS_POOLS.flat());
const BIOMES = ['hollow', 'mire', 'cinder', 'storm', 'void'];
const ACT_NAMES = ['The Hollow', 'The Mire', 'The Cinder Vault', 'The Stormwake', 'The Pale Beyond'];
export function isBossRoom(s) { return s.campaign === 'legacy' ? s.room === 4 || s.room === 8 : s.room % 3 === 0; }
function selectedBoss(s) {
  if (!isBossRoom(s)) return null;
  if (s.campaign === 'legacy') return s.room === 4 ? 'sentinel' : 'warden';
  let n = (s.seed ^ Math.imul(s.act, 0x9e3779b1)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad); n ^= n >>> 15;
  return BOSS_POOLS[s.act - 1][n & 1];
}
function hash(value) { let n = Math.imul((value ^ (value >>> 16)) >>> 0, 0x21f0aaad); n = Math.imul(n ^ (n >>> 15), 0x735a2d97); return (n ^ (n >>> 15)) >>> 0; }
export function getRiftRule(seed, room) { return ['echo', 'surge', 'glass'][hash((seed >>> 0) ^ Math.imul(room, 0x51ed270b)) % 3]; }
function newAdventure() { return { version: 1, spent: 0, claims: [], escort: null, cleanRooms: 0, roomDamage: 0 }; }
export function availableEmbers(s) { return Math.max(0, s.stats.embers - s.adventure.spent); }
const clone = (value) => JSON.parse(JSON.stringify(value));
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const level = (s, id) => s.relics[id] || 0;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
function random(s) {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function roomBounds(s) {
  return { left: PAD, right: s.width - PAD, top: 66, bottom: s.height - (s.height > s.width ? 150 : PAD) };
}
function rectHit(x, y, r, o) {
  return Math.hypot(x - clamp(x, o.x, o.x + o.w), y - clamp(y, o.y, o.y + o.h)) < r;
}
function blocked(s, x, y, r) {
  const b = roomBounds(s);
  return x < b.left + r || x > b.right - r || y < b.top + r || y > b.bottom - r || s.obstacles.some(o => rectHit(x, y, r, o));
}
function move(s, e, dx, dy) {
  const b = roomBounds(s);
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(4, e.r / 2)));
  let hit = false;
  for (let i = 0; i < steps; i++) {
    const x = clamp(e.x + dx / steps, b.left + e.r, b.right - e.r);
    if (!s.obstacles.some(o => rectHit(x, e.y, e.r, o))) e.x = x; else hit = true;
    const y = clamp(e.y + dy / steps, b.top + e.r, b.bottom - e.r);
    if (!s.obstacles.some(o => rectHit(e.x, y, e.r, o))) e.y = y; else hit = true;
  }
  return hit;
}
function resolveBody(s, e) {
  const b = roomBounds(s);
  e.x = clamp(e.x, b.left + e.r, b.right - e.r);
  e.y = clamp(e.y, b.top + e.r, b.bottom - e.r);
  if (!blocked(s, e.x, e.y, e.r)) return;
  for (let radius = 4; radius <= 200; radius += 4) for (let i = 0; i < 16; i++) {
    const x = e.x + Math.cos(i / 16 * TAU) * radius, y = e.y + Math.sin(i / 16 * TAU) * radius;
    if (!blocked(s, x, y, e.r)) { e.x = x; e.y = y; return; }
  }
}
function effect(s, type, x, y, life = 0.2, extra = {}) {
  s.effects.push({ id: s.nextId++, type, x, y, life, maxLife: life, color: '#ffc987', ...extra });
}
function enemy(s, type, x, y) {
  const boss = BOSS_IDS.has(type);
  const definition = SPECIAL_ENEMIES[type] || monsters.BOSS_DEFINITIONS?.[type];
  const base = definition?.hp ?? { slime: 28, shooter: 32, charger: 46, caster: 36, sniper: 38, orbiter: 40, brood: 44, tiny: 10, meteor: 36, sentinel: 600, warden: 950 }[type];
  if (!finite(base)) throw new Error(`Unknown enemy definition: ${type}`);
  const maxHp = base + (boss || type === 'tiny' ? 0 : Math.max(0, s.room - 1) * 3);
  return { id: s.nextId++, type, boss, x, y, r: definition?.r ?? (boss ? 29 : type === 'charger' || type === 'brood' ? 17 : type === 'tiny' ? 8 : 14), hp: maxHp, maxHp,
    angle: 0, vx: 0, vy: 0, phase: 'spawn', spawnTime: 0.9, windup: 0, windupMax: 0,
    cooldown: 0.7 + random(s) * 0.5, hitFlash: 0, stage: 1, pattern: 0, summoned: false, orbitDirection: random(s) < .5 ? -1 : 1,
    burnTime: 0, burnDamage: 0, coldTime: 0, coldFactor: 1, bladeCooldown: 0, trailCooldown: 0, telegraph: null };
}
function freeSpawn(s, fx, fy, radius) {
  const b = roomBounds(s);
  const target = { x: b.left + (b.right - b.left) * fx, y: b.top + (b.bottom - b.top) * fy };
  for (let ring = 0; ring < 10; ring++) {
    for (let a = 0; a < 12; a++) {
      const x = target.x + Math.cos(a / 12 * TAU) * ring * 20;
      const y = target.y + Math.sin(a / 12 * TAU) * ring * 20;
      if (!blocked(s, x, y, radius) && distance({ x, y }, s.player) > 135 && !s.enemies.some(e => distance({ x, y }, e) < e.r + radius + 12)) return { x, y };
    }
  }
  // Layouts leave a clear top lane; the fallback is bounded and collision-safe.
  for (let y = b.top + radius + 2; y < b.bottom - radius; y += 20) for (let x = b.left + radius + 2; x < b.right - radius; x += 20) {
    if (!blocked(s, x, y, radius) && distance({ x, y }, s.player) > 135 && !s.enemies.some(e => distance({ x, y }, e) < e.r + radius + 8)) return { x, y };
  }
  return null;
}
function normalWaveCount(s) {
  if (s.room === 1) return 3;
  const refuge = s.campaign === 'legacy' ? Math.max(2, 1 + Math.ceil(s.room / 2)) : 2 + Math.floor((s.room - 1) / 3);
  return refuge + (s.route === 'hunt' ? 2 : s.route === 'rift' ? 3 : 0);
}
function initialEnemyCount(s) { return isBossRoom(s) ? 1 + (s.campaign === 'legacy' ? (s.room === 8 ? 3 : 2) : Math.min(3, Math.ceil(s.room / 3))) : normalWaveCount(s); }
function spawnEnemies(s, count, specifiedTypes = null) {
  const types = specifiedTypes || (s.room === 1 ? ['slime', 'shooter'] : s.room === 2 ? ['charger', 'sniper', 'brood', 'shooter', 'weaver', 'bomber', 'frost', 'medic'] : ['sniper', 'orbiter', 'brood', 'meteor', 'charger', 'caster', 'shooter', 'slime', ...Object.keys(SPECIAL_ENEMIES)]);
  if (!specifiedTypes && s.room > 1) for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(random(s) * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
  for (let i = 0; i < count; i++) {
    if (s.enemies.filter(e => !e.dead).length >= MAX_ENEMIES) break;
    // The second wave changes the mix as well as position, while keeping route counts honest.
    const type = types[i % types.length];
    const radius = SPECIAL_ENEMIES[type]?.r || (type === 'charger' || type === 'brood' ? 17 : 14);
    const point = freeSpawn(s, 0.12 + random(s) * 0.76, 0.10 + random(s) * 0.65, radius);
    if (point) s.enemies.push(enemy(s, type, point.x, point.y));
  }
}
function nextWave(s) {
  s.wave++; s.waveDelay = 0.9;
  // Remove lingering hostile projectiles before the visible, non-damaging spawn warning.
  s.bullets = s.bullets.filter(b => b.owner === 'player');
  s.hazards = [];
  spawnEnemies(s, normalWaveCount(s));
  s.events.push({ type: 'wave-enter', room: s.room, wave: s.wave, waveTotal: s.waveTotal });
}
function interactionPoint(s, fx, fy) {
  const b = roomBounds(s), target = { x: b.left + fx * (b.right - b.left), y: b.top + fy * (b.bottom - b.top) };
  for (let ring = 0; ring < 24; ring++) for (let i = 0; i < 16; i++) {
    const point = { x: target.x + Math.cos(i / 16 * TAU) * ring * 8, y: target.y + Math.sin(i / 16 * TAU) * ring * 8 };
    if (!blocked(s, point.x, point.y, 20) && !s.interactables.some(o => distance(point, o) < 44)) return point;
  }
  return { x: s.player.x, y: s.player.y - 50 };
}
function makeInteractables(s) {
  const add = (kind, fx, fy, extra = {}) => {
    const item = { id: `r${s.room}-${kind}${extra.order ? `-${extra.order}` : ''}`, kind, ...interactionPoint(s, fx, fy), r: 18, status: 'ready', ...extra };
    s.interactables.push(item); return item;
  };
  if (s.adventure.escort?.dueRoom === s.room) add('traveler', .5, .85, { status: 'following' });
  if (s.room > 1 && !isBossRoom(s)) {
    const choice = (s.seed + s.room * 17) % 3;
    if (choice === 0 && !s.adventure.escort && s.room < s.totalRooms) add('traveler', .16, .77);
    else if (choice === 1) for (let i = 0; i < 3; i++) add('lamp', .14 + i * .36, .79, { order: i + 1, progress: 0 });
    else add('offering', .84, .70);
    if ((s.seed + s.room) % 2 === 0) add('cracked-wall', .03, .46, { status: 'sealed', hits: 0 });
  }
  if (s.adventure.cleanRooms >= 3 && !s.adventure.claims.some(key => key.endsWith(':ghost'))) add('ghost', .82, .81);
}
function canInteract(item) { return item.status === 'ready' && ['traveler', 'lamp', 'offering', 'chest', 'ghost'].includes(item.kind); }
export function nearestInteractable(s) {
  if (!['combat', 'exit'].includes(s.phase)) return null;
  return s.interactables.filter(item => canInteract(item) && distance(item, s.player) <= item.r + s.player.r + 30)
    .sort((a, b) => distance(a, s.player) - distance(b, s.player) || a.id.localeCompare(b.id))[0] || null;
}
function adventureReward(s, claim, kind, embers = 0, hearts = 0, novaCharge = 0) {
  if (s.adventure.claims.includes(claim)) return null;
  s.adventure.claims.push(claim);
  const hp = Math.min(s.player.maxHp - s.player.hp, hearts), nova = Math.min(100 - s.player.novaCharge, novaCharge);
  s.stats.embers += embers; s.player.hp += hp; s.player.novaCharge += nova;
  const reward = { embers, hp, nova };
  s.events.push({ type: ['chest', 'ghost'].includes(kind) ? 'secret' : 'quest', kind, reason: 'completed', reward });
  effect(s, 'discovery', s.player.x, s.player.y, .65, { radius: 35, color: '#9cecc5' });
  return reward;
}
function performInteraction(s, id) {
  if (!['combat', 'exit'].includes(s.phase)) return { ok: false, reason: 'not-active' };
  const item = s.interactables.find(candidate => candidate.id === id);
  if (!item || !canInteract(item)) return { ok: false, reason: 'unavailable' };
  if (distance(item, s.player) > item.r + s.player.r + 30) return { ok: false, reason: 'too-far', kind: item.kind };
  let reward;
  if (item.kind === 'traveler') {
    if (s.adventure.escort) return { ok: false, reason: 'unavailable', kind: item.kind };
    s.adventure.escort = { fromRoom: s.room, dueRoom: s.room + 1 }; item.status = 'rescued';
    s.events.push({ type: 'quest', kind: 'traveler', reason: 'rescued' });
    return { ok: true, reason: 'rescued', kind: item.kind };
  }
  if (item.kind === 'lamp') {
    const lamps = s.interactables.filter(candidate => candidate.kind === 'lamp');
    const progress = lamps.filter(lamp => lamp.status === 'lit').length;
    if (item.order !== progress + 1) {
      for (const lamp of lamps) { lamp.status = 'ready'; lamp.progress = 0; }
      s.events.push({ type: 'quest', kind: 'lamp', reason: 'wrong-order' });
      return { ok: false, reason: 'wrong-order', kind: item.kind };
    }
    item.status = 'lit'; for (const lamp of lamps) lamp.progress = progress + 1;
    if (progress < 2) return { ok: true, reason: 'lit', kind: item.kind, progress: progress + 1 };
    for (const lamp of lamps) lamp.status = 'done';
    reward = adventureReward(s, `${s.room}:lamps`, 'lamp', 6, 0, 25);
  } else if (item.kind === 'offering') {
    if (availableEmbers(s) < 10) return { ok: false, reason: 'insufficient-embers', kind: item.kind };
    if (s.player.hp >= s.player.maxHp && s.player.novaCharge >= 100) return { ok: false, reason: 'already-restored', kind: item.kind };
    if (s.adventure.claims.includes(`${s.room}:offering`)) return { ok: false, reason: 'unavailable', kind: item.kind };
    s.adventure.spent += 10; item.status = 'done'; reward = adventureReward(s, `${s.room}:offering`, 'offering', 0, 2, 100);
  } else {
    item.status = 'done'; reward = adventureReward(s, `${s.room}:${item.kind}`, item.kind, item.kind === 'chest' ? 12 : 8, item.kind === 'ghost' ? 1 : 0);
  }
  return { ok: Boolean(reward), reason: reward ? 'completed' : 'unavailable', kind: item.kind, reward };
}
export function interact(s, id) {
  const result = performInteraction(s, id);
  const messages = {
    'not-active': 'Explore during combat or after choosing your relic.',
    unavailable: 'There is nothing to use here.', 'too-far': 'Move closer to interact.',
    rescued: 'The traveler will follow you. Clear the next room for a reward.',
    'wrong-order': 'The lamps went dark. Light them in the order 1, 2, 3.',
    lit: 'A lamp is lit. Continue the sequence.',
    'insufficient-embers': 'The offering requires 10 available embers.',
    'already-restored': 'Your hearts and nova are already full. Nothing was spent.',
  };
  const completions = { lamp: 'The lamps answer: 6 embers and 25 nova charge.', offering: 'Offering accepted. Recover up to two hearts and fully charge nova.', chest: 'A hidden cache: 12 embers.', ghost: 'The lost ghost thanks you: 8 embers and one heart.' };
  return { ...result, message: messages[result.reason] || completions[result.kind] || 'The discovery is complete.' };
}
function makeRoom(s, capture = true) {
  s.phase = 'combat'; s.enemies = []; s.bullets = []; s.pickups = []; s.effects = []; s.choices = []; s.gates = []; s.hazards = []; s.interactables = [];
  s.hitStop = 0; s.shake = 0; s.inputLatch = { dash: false, nova: false };
  s.rng = (s.seed ^ Math.imul(s.room, 0x9e3779b1) ^ (s.route === 'refuge' ? 0x71a53d09 : s.route === 'rift' ? 0x3948329d : 0)) >>> 0;
  const b = roomBounds(s);
  s.act = s.campaign === 'legacy' ? Math.ceil(s.room / 4) : Math.ceil(s.room / 3);
  s.baseBiome = s.campaign === 'legacy' ? (s.room < 5 ? 'hollow' : 'cinder') : BIOMES[s.act - 1];
  s.actName = s.campaign === 'legacy' ? (s.room < 5 ? ACT_NAMES[0] : ACT_NAMES[2]) : ACT_NAMES[s.act - 1];
  const boss = isBossRoom(s); s.bossId = selectedBoss(s);
  s.wave = 1; s.waveTotal = s.room === 1 || boss ? 1 : 2; s.waveDelay = 0.9;
  s.biome = s.route === 'rift' ? 'rift' : s.baseBiome;
  s.riftRule = s.route === 'rift' ? getRiftRule(s.seed, s.room) : null;
  Object.assign(s, buildRoomGeometry({ ...s, bounds: b, boss }));
  s.player.x = s.width / 2; s.player.y = b.bottom - 46; s.player.vx = 0; s.player.vy = 0;
  s.player.invuln = 1.1; s.player.dashTime = 0; s.player.dashCooldown = 0; s.player.fireCooldown = 0; s.player.recoil = 0;
  s.player.slowTime = 0; s.player.slowFactor = 1;
  s.player.angle = -Math.PI / 2;
  s.adventure.roomDamage = s.stats.damageTaken;
  makeInteractables(s);
  s.landmarks = s.landmarks.filter(p => !s.interactables.some(item => distance(p, item) < 45));
  if (boss) {
    const point = freeSpawn(s, 0.5, 0.24, 29);
    s.enemies.push(enemy(s, s.bossId, point.x, point.y));
  }
  spawnEnemies(s, boss ? initialEnemyCount(s) - 1 : normalWaveCount(s));
  if (capture) s.entrance = entranceData(s);
}
function entranceData(s) {
  return { kind: 'cinder-below-run', version: s.campaign === 'legacy' ? 1 : 2, ...(s.campaign === 'legacy' ? {} : { totalRooms: MAX_ROOMS }), ...([2, 3].includes(s.mapVersion) ? { mapVersion: s.mapVersion } : {}), seed: s.seed, width: s.width, height: s.height,
    room: s.room, route: s.route, weapon: s.player.weapon, relics: clone(s.relics), hp: s.player.hp,
    novaCharge: s.player.novaCharge, stats: clone(s.stats), time: s.time, nextId: s.nextId, adventure: clone(s.adventure) };
}
export function createRun({ seed = 20261014, width = 1100, height = 720, weapon = 'cinder', meta = {}, campaign = 'five-acts', mapVersion = campaign === 'legacy' ? 1 : 3 } = {}) {
  void meta;
  const s = { width: clamp(finite(width) ? width : 1100, 380, 4000), height: clamp(finite(height) ? height : 720, 560, 4000),
    time: 0, seed: (Number(seed) >>> 0) || 1, rng: 1, room: 1, route: 'hunt', phase: 'combat', nextId: 1,
    mapVersion: [2, 3].includes(mapVersion) ? mapVersion : 1, campaign: campaign === 'legacy' ? 'legacy' : 'five-acts', totalRooms: campaign === 'legacy' ? 8 : MAX_ROOMS,
    player: { x: 0, y: 0, r: 13, hp: 6, maxHp: 6, angle: -Math.PI / 2, vx: 0, vy: 0, invuln: 0,
      dashTime: 0, dashCooldown: 0, dashVX: 0, dashVY: 0, fireCooldown: 0, novaCharge: 100, novaMax: 100,
      recoil: 0, slowTime: 0, slowFactor: 1, weapon: WEAPONS.some(w => w.id === weapon) ? weapon : 'cinder' },
    enemies: [], bullets: [], obstacles: [], pickups: [], effects: [], relics: {}, choices: [], gates: [], hazards: [], interactables: [], adventure: newAdventure(),
    stats: { kills: 0, rooms: 0, embers: 0, shots: 0, hits: 0, damageTaken: 0, elapsed: 0 },
    events: [], shake: 0, hitStop: 0, inputLatch: { dash: false, nova: false }, entrance: null };
  makeRoom(s); s.events.push({ type: 'room-enter', room: 1, route: 'hunt' }); return s;
}
function playerHit(s, amount = 1) {
  const p = s.player;
  if (p.invuln > 0 || p.dashTime > 0 || s.phase !== 'combat') return false;
  const actual = Math.min(p.hp, amount); p.hp -= actual; p.invuln = 1; s.stats.damageTaken += actual;
  s.shake = 7; s.hitStop = Math.max(s.hitStop, 0.065);
  s.events.push({ type: 'player-hit', damage: actual, hp: p.hp });
  effect(s, 'hit', p.x, p.y, 0.3, { radius: 24, color: '#ff7589' });
  if (p.hp <= 0) { p.hp = 0; s.phase = 'dead'; s.events.push({ type: 'death', room: s.room }); }
  return true;
}
function damageEnemy(s, e, amount, source = 'bullet', origin = null) {
  if (e.hp <= 0 || e.phase === 'spawn') return;
  amount = adjustIncomingDamage(s, e, amount, source, origin);
  if (amount <= 0) return;
  const actual = Math.min(e.hp, amount); e.hp -= actual; e.hitFlash = 0.1;
  if (source === 'bullet') { s.stats.hits++; s.player.novaCharge = Math.min(100, s.player.novaCharge + 2 + level(s, 'nova')); }
  s.events.push({ type: 'enemy-hit', id: e.id, damage: actual, source });
  if (e.hp <= 0) kill(s, e);
}
function kill(s, e) {
  if (e.dead) return;
  if (e.mirrorDecoy) { e.dead = true; e.hp = 0; effect(s, 'death', e.x, e.y, .25, { radius: e.r * 1.5, color: '#afa1e1' }); return; }
  e.dead = true; e.hp = 0; s.stats.kills++; s.player.novaCharge = Math.min(100, s.player.novaCharge + 7 + level(s, 'nova') * 2);
  s.hitStop = Math.max(s.hitStop, 0.025); s.shake = Math.max(s.shake, 1.8);
  const value = BOSS_IDS.has(e.type) ? 12 : s.route === 'refuge' ? 1 : 2;
  s.pickups.push({ id: s.nextId++, x: e.x, y: e.y, value, r: 5, age: 0 });
  s.events.push({ type: 'kill', id: e.id, enemyType: e.type, value });
  effect(s, 'death', e.x, e.y, 0.32, { radius: e.r * 1.7, color: '#ffb263' });
  if (e.type === 'brood') {
    for (let i = 0; i < 2 && s.enemies.filter(other => !other.dead).length < MAX_ENEMIES; i++) {
      const child = enemy(s, 'tiny', e.x + (i ? 1 : -1) * 22, e.y);
      resolveBody(s, child);
      if (distance(child, s.player) < 60) {
        const b = roomBounds(s), point = freeSpawn(s, (e.x - b.left) / (b.right - b.left), (e.y - b.top) / (b.bottom - b.top), child.r);
        if (!point) continue; Object.assign(child, point);
      }
      child.spawnTime = .7; s.enemies.push(child);
    }
  }
  const power = level(s, 'explosive');
  if (power) {
    const radius = 70 + power * 18;
    effect(s, 'nova', e.x, e.y, 0.3, { radius, color: '#ff9a51' });
    for (const other of s.enemies) if (other !== e && !other.dead && distance(other, e) <= radius + other.r) damageEnemy(s, other, 12 * power, 'explosion');
  }
}
function bullet(s, owner, x, y, angle, speed, damage, extra = {}) {
  if (owner === 'enemy' && s.route === 'rift') speed *= s.riftRule === 'surge' ? 1.22 : 1.12;
  const b = { id: s.nextId++, owner, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: owner === 'player' ? 4 : 5,
    damage, life: 3.5, color: owner === 'player' ? '#ffbe68' : '#c69bff', hits: [], bounces: 0, pierces: 0, ...extra };
  if (s.riftRule === 'echo') b.bounces++;
  if (s.riftRule === 'glass' && owner === 'player') b.damage *= 1.5;
  s.bullets.push(b); return b;
}
function shoot(s) {
  const p = s.player, scatter = p.weapon === 'scatter', needle = p.weapon === 'needle';
  const damage = (scatter ? 5 : needle ? 5.5 : 8) * (1 + level(s, 'blood') * 0.3);
  const count = scatter ? 3 : 1;
  const props = { bounces: level(s, 'ricochet'), pierces: level(s, 'pierce') + (needle ? 1 : 0), seeking: level(s, 'seeking'), damage };
  for (let i = 0; i < count; i++) {
    const a = p.angle + (i - (count - 1) / 2) * 0.18;
    // The collision origin stays inside the muzzle so contact-range enemies cannot be skipped.
    bullet(s, 'player', p.x + Math.cos(a) * 10, p.y + Math.sin(a) * 10, a, needle ? 660 : scatter ? 450 : 540, damage, { ...props, life: scatter ? 0.85 : 1.65 });
  }
  for (let i = 1; i <= level(s, 'split'); i++) for (const sign of [-1, 1]) {
    const a = p.angle + sign * (0.17 + i * 0.11);
    bullet(s, 'player', p.x + Math.cos(a) * 10, p.y + Math.sin(a) * 10, a, 510, damage * 0.5, { ...props, damage: damage * 0.5, life: 1.55 });
  }
  p.fireCooldown = scatter ? 0.40 : needle ? 0.14 : 0.23; p.recoil = 0.075; s.stats.shots++;
  s.events.push({ type: 'shot', x: p.x, y: p.y, angle: p.angle, weapon: p.weapon });
  effect(s, 'hit', p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18, 0.07, { radius: 7 });
}
function nova(s) {
  const p = s.player, power = level(s, 'nova'), radius = 140 * (1 + power * 0.25);
  p.novaCharge = 0;
  for (const b of s.bullets) if (b.owner === 'enemy' && distance(p, b) < radius) b.dead = true;
  for (const e of s.enemies) if (distance(p, e) < radius + e.r) damageEnemy(s, e, 30 + power * 12, 'nova');
  effect(s, 'nova', p.x, p.y, 0.5, { radius, color: '#8bffdf' }); s.shake = 5;
  s.events.push({ type: 'nova', radius });
}
function windup(e, kind, time, angle, range, extra = {}) {
  e.phase = 'windup'; e.windup = time; e.windupMax = time; e.angle = angle;
  e.telegraph = { kind, angle, range, width: e.r * 2, spread: 0.8, remaining: time, visible: kind === 'impact', ...extra };
  e.chargeX = e.x + Math.cos(angle) * range; e.chargeY = e.y + Math.sin(angle) * range;
  e.vx = 0; e.vy = 0;
}
function enemyFire(s, e, angle, spread, count, speed = 205) {
  for (let i = 0; i < count; i++) {
    const a = angle + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread);
    bullet(s, 'enemy', e.x + Math.cos(a) * (e.r + 7), e.y + Math.sin(a) * (e.r + 7), a, speed, 1, { life: 4.5 });
  }
}
function finishWindup(s, e) {
  const warning = e.telegraph;
  if (warning.kind === 'impact') {
    e.phase = 'recover'; e.recoverTime = .55;
  } else if (e.type === 'sniper') {
    enemyFire(s, e, warning.angle, 0, 1, 540); e.phase = 'recover'; e.recoverTime = .55;
  } else if (e.type === 'orbiter') {
    e.burstAngle = warning.angle; e.burstLeft = 2; e.burstTimer = .22;
    enemyFire(s, e, e.burstAngle, .5, 3, 255); e.phase = 'burst';
  } else if (warning.kind === 'line') {
    e.phase = 'charge'; e.chargeTime = e.type === 'charger' ? 0.55 : 0.6;
    e.vx = Math.cos(warning.angle) * (e.type === 'charger' ? 390 : 420);
    e.vy = Math.sin(warning.angle) * (e.type === 'charger' ? 390 : 420);
  } else {
    if (warning.kind === 'ring') {
      const count = e.type === 'caster' ? 8 : e.stage === 2 ? 16 : 12;
      for (let i = 0; i < count; i++) enemyFire(s, e, warning.angle + i / count * TAU, 0, 1, e.type === 'caster' ? 185 : 195);
    } else enemyFire(s, e, warning.angle, warning.spread, e.type === 'shooter' ? 3 : e.stage === 2 ? 9 : 7, 255);
    if (e.type === 'shooter') { e.burstAngle = warning.angle; e.burstLeft = 1; e.burstTimer = .24; e.phase = 'burst'; }
    else { e.phase = 'recover'; e.recoverTime = .48; }
  }
  e.telegraph = null; e.windup = 0;
}
function specialAPI(s, slow) {
  return {
    slow, distance, angleTo, random: () => random(s), move: (e, dx, dy) => move(s, e, dx, dy),
    blocked: (x, y, radius) => blocked(s, x, y, radius),
    bullet: (x, y, angle, speed, damage = 1, extra = {}) => bullet(s, 'enemy', x, y, angle, speed, damage, extra),
    hurt: (amount = 1) => playerHit(s, amount), kill: e => kill(s, e),
    effect: (type, x, y, life, extra) => effect(s, type, x, y, life, extra),
    windup,
    hazard: (x, y, radius, delay, extra = {}) => {
      const item = { id: s.nextId++, kind: 'meteor', x, y, radius, remaining: delay, maxTime: delay, ...extra };
      if (s.hazards.length < 48) s.hazards.push(item);
      return item;
    },
    spawn: (type, x, y) => {
      if (s.enemies.filter(e => !e.dead).length >= MAX_ENEMIES || !['tiny', ...NORMAL_ENEMY_TYPES].includes(type)) return null;
      const b = roomBounds(s), radius = SPECIAL_ENEMIES[type]?.r || (type === 'tiny' ? 8 : ['charger', 'brood'].includes(type) ? 17 : 14);
      const point = freeSpawn(s, finite(x) ? (x - b.left) / (b.right - b.left) : .15 + random(s) * .7,
        finite(y) ? (y - b.top) / (b.bottom - b.top) : .15 + random(s) * .55, radius);
      if (!point) return null;
      const added = enemy(s, type, point.x, point.y); s.enemies.push(added); return added;
    },
  };
}
function updateEnemy(s, e, dt) {
  e.hitFlash = Math.max(0, e.hitFlash - dt); e.bladeCooldown = Math.max(0, e.bladeCooldown - dt); e.trailCooldown = Math.max(0, e.trailCooldown - dt);
  if (e.mirrorDecoy) { e.decoyTime = Math.max(0, e.decoyTime - dt); if (!e.decoyTime) { e.dead = true; e.hp = 0; return; } }
  if (e.phase === 'spawn') { e.spawnTime -= dt; if (e.spawnTime <= 0) e.phase = 'chase'; return; }
  if (e.burnTime > 0) { e.burnTime -= dt; damageEnemy(s, e, e.burnDamage * dt, 'burn'); }
  if (e.hp <= 0) return;
  e.coldTime = Math.max(0, e.coldTime - dt);
  const slow = e.coldTime > 0 ? e.coldFactor : 1;
  if (updateSpecialEnemy(s, e, dt, specialAPI(s, slow))) {
    if (!e.dead && !e.untargetable && e.phase !== 'windup' && distance(e, s.player) < e.r + s.player.r) playerHit(s);
    return;
  }
  const boss = e.type === 'sentinel' || e.type === 'warden';
  if (e.phase === 'burst') {
    if (e.type === 'orbiter') {
      const a = angleTo(e, s.player) + e.orbitDirection * Math.PI / 2;
      e.vx = Math.cos(a) * 94 * slow; e.vy = Math.sin(a) * 94 * slow; move(s, e, e.vx * dt, e.vy * dt);
    }
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) {
      enemyFire(s, e, e.burstAngle + (e.type === 'orbiter' ? (2 - e.burstLeft) * .15 : .09), e.type === 'orbiter' ? .5 : .42, 3, 255);
      e.burstLeft--; e.burstTimer += .22;
      if (e.burstLeft <= 0) { e.phase = 'recover'; e.recoverTime = e.type === 'orbiter' ? .28 : .48; }
    }
  } else if (e.phase === 'windup') {
    e.windup -= dt; e.telegraph.remaining = Math.max(0, e.windup);
    if (e.windup <= 0) finishWindup(s, e);
  } else if (e.phase === 'charge') {
    e.chargeTime -= dt;
    const collision = move(s, e, e.vx * dt * slow, e.vy * dt * slow);
    if (collision || e.chargeTime <= 0) { e.phase = 'recover'; e.recoverTime = 0.8; e.vx = 0; e.vy = 0; }
  } else if (e.phase === 'recover') {
    e.vx = 0; e.vy = 0; e.recoverTime -= dt;
    if (e.recoverTime <= 0) { e.phase = 'chase'; e.cooldown = boss ? (e.stage === 2 ? 0.4 : 0.7) : e.type === 'meteor' ? .95 : .65; }
  } else {
    const angle = angleTo(e, s.player), dist = distance(e, s.player);
    e.angle = angle; e.cooldown -= dt;
    let speed = e.type === 'slime' ? 70 + s.room * 3 : e.type === 'tiny' ? 125 : e.type === 'brood' ? 48 : e.type === 'charger' ? 45 : boss ? 32 : 46;
    let direction = angle;
    if (e.type === 'shooter') speed *= dist < 170 ? -1 : dist < 270 ? 0 : 1;
    if (e.type === 'caster') { direction += Math.PI / 2; speed = 52; }
    if (e.type === 'sniper') speed *= dist < 250 ? -1 : dist > 370 ? 1 : 0;
    if (e.type === 'meteor') speed *= dist < 210 ? -1 : dist > 310 ? 1 : 0;
    if (e.type === 'orbiter') { direction += e.orbitDirection * Math.PI / 2; speed = 94; if (dist > 300) direction -= e.orbitDirection * .5; }
    e.vx = Math.cos(direction) * speed * slow; e.vy = Math.sin(direction) * speed * slow;
    move(s, e, e.vx * dt, e.vy * dt);
    if (e.cooldown <= 0) {
      if (e.type === 'charger') windup(e, 'line', 0.8, angle, 350 * 0.55);
      else if (e.type === 'shooter') windup(e, 'fan', 0.65, angle, 400, { spread: 0.42 });
      else if (e.type === 'caster') windup(e, 'ring', 0.85, angle, 240);
      else if (e.type === 'sniper') windup(e, 'shot', .85, angle, 900);
      else if (e.type === 'orbiter') windup(e, 'fan', .45, angle, 420, { spread: .5 });
      else if (e.type === 'meteor') {
        const x = s.player.x, y = s.player.y;
        windup(e, 'impact', 1, angle, 0, { x, y, radius: 44 });
        s.hazards.push({ id: s.nextId++, kind: 'meteor', x, y, radius: 44, remaining: 1, maxTime: 1 });
      }
      else if (boss) {
        const kind = e.type === 'warden' ? ['fan', 'ring', 'line'][e.pattern++ % 3] : ['fan', 'line', 'ring'][e.pattern++ % 3];
        windup(e, kind, kind === 'line' ? 0.85 : 0.8, angle, kind === 'line' ? 234 : 350, { spread: e.stage === 2 ? 1.7 : 1.15 });
      }
    }
  }
  if (distance(e, s.player) < e.r + s.player.r && e.phase !== 'windup') playerHit(s);
}
function onBulletHit(s, b, e) {
  damageEnemy(s, e, b.damage, 'bullet', b);
  effect(s, 'hit', b.x, b.y, 0.14, { radius: 10, color: '#ffd39b' });
  b.hits.push(e.id);
  const angle = Math.atan2(b.vy, b.vx);
  if (!e.dead && !BOSS_IDS.has(e.type)) move(s, e, Math.cos(angle) * 5, Math.sin(angle) * 5);
  if (level(s, 'burn')) { e.burnTime = 2; e.burnDamage = 3 * level(s, 'burn'); }
  if (level(s, 'cold')) { e.coldTime = 2; e.coldFactor = 1 - 0.2 * level(s, 'cold'); }
  let from = e;
  const visited = [e.id];
  for (let i = 0; i < level(s, 'chain'); i++) {
    const target = s.enemies.filter(other => !other.dead && other.phase !== 'spawn' && !visited.includes(other.id) && distance(from, other) < 155).sort((a, c) => distance(from, a) - distance(from, c) || a.id - c.id)[0];
    if (!target) break;
    effect(s, 'lightning', from.x, from.y, 0.16, { x2: target.x, y2: target.y, color: '#aeefff' });
    damageEnemy(s, target, b.damage * 0.5, 'chain'); visited.push(target.id); from = target;
  }
  if (b.pierces > 0) b.pierces--; else b.dead = true;
}
function updateBullet(s, b, dt) {
  b.age = (b.age || 0) + dt;
  if (b.owner === 'enemy' && b.motion === 'weave') {
    b.baseSpeed ||= Math.hypot(b.vx, b.vy);
    const a = b.baseAngle ?? Math.atan2(b.vy, b.vx), sway = Math.sin(b.age * (b.weaveFrequency || 5) + (b.weavePhase || 0)) * (b.weaveAmplitude || 55);
    b.vx = Math.cos(a) * b.baseSpeed - Math.sin(a) * sway; b.vy = Math.sin(a) * b.baseSpeed + Math.cos(a) * sway;
  } else if (b.owner === 'enemy' && b.motion === 'boomerang' && b.age >= b.turnAfter) {
    const a = Math.atan2(b.returnY - b.y, b.returnX - b.x), speed = b.returnSpeed || 240;
    b.vx = Math.cos(a) * speed; b.vy = Math.sin(a) * speed;
    if (Math.hypot(b.returnX - b.x, b.returnY - b.y) < 9) { b.dead = true; return; }
  }
  if (b.owner === 'enemy' && b.homing > 0) {
    const current = Math.atan2(b.vy, b.vx), desired = angleTo(b, s.player), speed = Math.hypot(b.vx, b.vy);
    const delta = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
    const angle = current + clamp(delta, -Math.min(2, b.homing) * dt, Math.min(2, b.homing) * dt);
    b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed;
  }
  if (b.owner === 'enemy' && finite(b.pauseAfter) && b.pauseFor > 0) {
    b.baseAngle ??= Math.atan2(b.vy, b.vx); b.baseSpeed ||= Math.hypot(b.vx, b.vy);
    b.paused = b.age >= b.pauseAfter && b.age < b.pauseAfter + b.pauseFor;
    if (b.paused) { b.vx = 0; b.vy = 0; }
    else if (b.age >= b.pauseAfter + b.pauseFor) {
      const speed = b.releaseSpeed || b.baseSpeed; b.vx = Math.cos(b.baseAngle) * speed; b.vy = Math.sin(b.baseAngle) * speed;
    }
  }
  b.life -= dt; if (b.life <= 0) { b.dead = true; return; }
  if (b.owner === 'player' && b.seeking) {
    const target = s.enemies.filter(e => !e.dead && !e.untargetable && !b.hits.includes(e.id) && distance(b, e) < 340).sort((a, c) => distance(b, a) - distance(b, c) || a.id - c.id)[0];
    if (target) {
      const current = Math.atan2(b.vy, b.vx), desired = angleTo(b, target), speed = Math.hypot(b.vx, b.vy);
      const delta = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
      const a = current + clamp(delta, -b.seeking * 1.7 * dt, b.seeking * 1.7 * dt);
      b.vx = Math.cos(a) * speed; b.vy = Math.sin(a) * speed;
    }
  }
  const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 5));
  for (let i = 0; i < steps && !b.dead; i++) {
    const nx = b.x + b.vx * dt / steps, ny = b.y + b.vy * dt / steps;
    if (b.owner === 'player') {
      const wall = s.interactables.find(item => item.kind === 'cracked-wall' && item.status === 'sealed' && distance({ x: nx, y: ny }, item) < item.r + b.r);
      if (wall) {
        wall.hits++; b.dead = true;
        effect(s, 'hit', wall.x, wall.y, .18, { radius: 18, color: '#cfc2b2' });
        if (wall.hits >= 3) { wall.kind = 'chest'; wall.status = 'ready'; s.events.push({ type: 'secret', kind: 'chest', reason: 'revealed' }); }
        continue;
      }
    }
    if (blocked(s, nx, ny, b.r)) {
      if (b.bounces > 0) {
        if (blocked(s, nx, b.y, b.r)) b.vx *= -1;
        if (blocked(s, b.x, ny, b.r)) b.vy *= -1;
        b.bounces--;
      } else b.dead = true;
      continue;
    }
    b.x = nx; b.y = ny;
    if (b.owner === 'player') {
      for (const e of s.enemies) if (!e.dead && !e.untargetable && e.phase !== 'spawn' && !b.hits.includes(e.id) && distance(b, e) < b.r + e.r) { onBulletHit(s, b, e); if (b.dead) break; }
    } else if (distance(b, s.player) < b.r + s.player.r) {
      if (s.player.dashTime <= 0) {
        const hurt = playerHit(s, b.damage * (s.riftRule === 'glass' ? 2 : 1));
        if (hurt && b.slowDuration > 0) { s.player.slowTime = Math.min(3, b.slowDuration); s.player.slowFactor = clamp(b.slowFactor || .6, .35, 1); }
        b.dead = true;
      }
    }
  }
}
function updateHazards(s, dt) {
  for (const hazard of s.hazards) {
    if (hazard.kind === 'mine') {
      hazard.armTime = Math.max(0, (hazard.armTime || 0) - dt); hazard.life -= dt;
      if (hazard.life <= 0) hazard.dead = true;
      else if (hazard.armTime <= 0 && distance(hazard, s.player) < (hazard.triggerRadius || hazard.radius) + s.player.r) {
        playerHit(s, hazard.damage || 1); hazard.dead = true;
        effect(s, 'meteor-impact', hazard.x, hazard.y, .3, { radius: hazard.radius, color: '#e78158' });
      }
    } else {
      hazard.remaining -= dt;
      if (hazard.remaining <= 0) {
        hazard.dead = true;
        if (distance(hazard, s.player) < hazard.radius + s.player.r) playerHit(s, hazard.damage || 1);
        effect(s, hazard.kind === 'lightning' ? 'lightning-impact' : 'meteor-impact', hazard.x, hazard.y, .35, { radius: hazard.radius, color: '#efb67e' });
      }
    }
  }
  s.hazards = s.hazards.filter(h => !h.dead);
}
function chooseOptions(s) {
  const pool = RELICS.filter(r => level(s, r.id) < r.maxLevel && (r.id !== 'blood' || s.player.maxHp > 2));
  const choices = [];
  while (pool.length && choices.length < 3) choices.push(pool.splice(Math.floor(random(s) * pool.length), 1)[0].id);
  return choices;
}
function clearRoom(s) {
  for (const p of s.pickups) s.stats.embers += p.value;
  s.pickups = []; s.bullets = []; s.hazards = []; s.stats.rooms++;
  s.adventure.cleanRooms = s.stats.damageTaken === s.adventure.roomDamage ? s.adventure.cleanRooms + 1 : 0;
  if (s.adventure.escort?.dueRoom === s.room) {
    adventureReward(s, `${s.adventure.escort.fromRoom}:escort`, 'traveler', 8, 1);
    s.adventure.escort = null;
    for (const item of s.interactables) if (item.kind === 'traveler' && item.status === 'following') item.status = 'done';
  }
  const bonus = s.route === 'refuge' ? 2 : 4 + s.room + (s.route === 'rift' ? 6 : 0);
  s.stats.embers += bonus;
  if (s.route === 'rift') s.player.novaCharge = Math.min(100, s.player.novaCharge + 30);
  s.events.push({ type: 'room-clear', room: s.room, route: s.route, embers: bonus });
  if (s.room === s.totalRooms) { s.phase = 'won'; s.events.push({ type: 'win', room: s.room }); return; }
  s.phase = 'reward'; s.choices = chooseOptions(s);
  if (!s.choices.length) openGates(s);
}
function openGates(s) {
  const b = roomBounds(s);
  s.phase = 'exit'; s.choices = [];
  s.gates = [{ x: s.width * 0.32, y: b.top + 24, r: 27, route: 'hunt', label: 'Hunt · More foes and embers' }, { x: s.width * 0.68, y: b.top + 24, r: 27, route: 'refuge', label: 'Refuge · Heal one heart' }];
  if (s.campaign !== 'legacy' && isBossRoom(s) && s.room < s.totalRooms) {
    s.gates[0].x = s.width * .18; s.gates[1].x = s.width * .82;
    s.gates.push({ x: s.width * .5, y: b.top + 24, r: 27, route: 'rift', riftRule: getRiftRule(s.seed, s.room + 1), label: 'Rift · Stranger enemies, extra embers and nova' });
  }
  for (const gate of s.gates) gate.armed = distance(s.player, gate) > s.player.r + gate.r + 8;
}
export function chooseRelic(s, id) {
  if (s.phase !== 'reward' || !s.choices.includes(id)) return false;
  const r = RELICS.find(item => item.id === id);
  if (!r || level(s, id) >= r.maxLevel || (id === 'blood' && s.player.maxHp <= 2)) return false;
  s.relics[id] = level(s, id) + 1;
  if (id === 'blood') { s.player.maxHp--; s.player.hp = Math.min(s.player.hp, s.player.maxHp); }
  s.events.push({ type: 'relic', id, level: s.relics[id] }); openGates(s); return true;
}
export function enterRoom(s, route = 'hunt') {
  if (s.phase !== 'exit' || !['hunt', 'refuge', 'rift'].includes(route) || s.room >= s.totalRooms) return false;
  if (route === 'rift' && (s.campaign === 'legacy' || !isBossRoom(s))) return false;
  s.room++; s.route = route;
  if (route === 'refuge') s.player.hp = Math.min(s.player.maxHp, s.player.hp + 1);
  makeRoom(s); s.events.push({ type: 'room-enter', room: s.room, route }); return true;
}
export function step(s, input = {}, dt = 1 / 120) {
  s.events = [];
  if (!finite(dt) || dt <= 0) return s;
  dt = Math.min(dt, 1 / 30);
  if (s.phase !== 'combat' && s.phase !== 'exit') return s;
  s.time += dt; s.stats.elapsed += dt;
  s.waveDelay = Math.max(0, s.waveDelay - dt);
  for (const o of s.obstacles) if (o.temporary) o.life -= dt;
  s.obstacles = s.obstacles.filter(o => !o.temporary || o.life > 0);
  s.shake = Math.max(0, s.shake - dt * 35); s.hitStop = Math.max(0, s.hitStop - dt);
  for (const e of s.effects) e.life -= dt;
  s.effects = s.effects.filter(e => e.life > 0);
  const p = s.player;
  p.invuln = Math.max(0, p.invuln - dt); p.dashCooldown = Math.max(0, p.dashCooldown - dt); p.fireCooldown = Math.max(0, p.fireCooldown - dt); p.recoil = Math.max(0, p.recoil - dt);
  p.slowTime = Math.max(0, (p.slowTime || 0) - dt); if (!p.slowTime) p.slowFactor = 1;
  p.novaCharge = Math.min(p.novaMax, p.novaCharge + dt * (2.5 + level(s, 'nova')) * (s.riftRule === 'surge' ? 3 : 1));
  let mx = finite(input.moveX) ? clamp(input.moveX, -1, 1) : 0, my = finite(input.moveY) ? clamp(input.moveY, -1, 1) : 0;
  const magnitude = Math.hypot(mx, my); if (magnitude > 1) { mx /= magnitude; my /= magnitude; }
  if (finite(input.aimX) && finite(input.aimY) && Math.hypot(input.aimX - p.x, input.aimY - p.y) > 1) p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  if (input.dash && !s.inputLatch.dash && p.dashCooldown <= 0) {
    const a = magnitude > 0.1 ? Math.atan2(my, mx) : p.angle;
    p.dashVX = Math.cos(a) * 620; p.dashVY = Math.sin(a) * 620; p.dashTime = 0.18; p.dashCooldown = 1.15;
    s.events.push({ type: 'dash', x: p.x, y: p.y });
  }
  if (s.phase === 'combat' && input.nova && !s.inputLatch.nova && p.novaCharge >= p.novaMax) nova(s);
  s.inputLatch.dash = Boolean(input.dash); s.inputLatch.nova = Boolean(input.nova);
  if (p.dashTime > 0) {
    p.vx = p.dashVX; p.vy = p.dashVY;
    if (level(s, 'trail')) effect(s, 'trail', p.x, p.y, 1, { radius: 19, damage: 8 * level(s, 'trail'), color: '#ff8e53' });
    p.dashTime = Math.max(0, p.dashTime - dt);
  } else { p.vx = mx * 215 * (p.slowTime > 0 ? p.slowFactor : 1); p.vy = my * 215 * (p.slowTime > 0 ? p.slowFactor : 1); }
  move(s, p, p.vx * dt, p.vy * dt);
  for (const traveler of s.interactables.filter(item => item.kind === 'traveler' && ['rescued', 'following'].includes(item.status))) {
    if (distance(traveler, p) > 45) { const a = angleTo(traveler, p); move(s, traveler, Math.cos(a) * 165 * dt, Math.sin(a) * 165 * dt); }
  }
  if (s.phase === 'exit') {
    for (const gate of s.gates) {
      const d = distance(p, gate);
      // A gate appearing underneath the reward position needs a deliberate leave/re-entry.
      if (!gate.armed && d > p.r + gate.r + 8) gate.armed = true;
      if (gate.armed && d < p.r + gate.r) { enterRoom(s, gate.route); break; }
    }
    return s;
  }
  if (input.fire && p.fireCooldown <= 0) shoot(s);
  // A short impact pause stops combat entities, while input/player movement stays responsive.
  if (s.hitStop <= 0) for (const e of s.enemies) if (!e.dead && s.phase === 'combat') updateEnemy(s, e, dt);
  if (s.phase === 'dead') return s;
  if (s.hitStop <= 0) for (const b of s.bullets) if (!b.dead) updateBullet(s, b, dt);
  if (s.hitStop <= 0) updateHazards(s, dt);
  if (s.phase === 'dead') return s;
  const blades = level(s, 'blades');
  for (let i = 0; i < blades; i++) {
    const a = s.time * 3.8 + i / blades * TAU, x = p.x + Math.cos(a) * 49, y = p.y + Math.sin(a) * 49;
    effect(s, 'blade', x, y, dt * 1.5, { radius: 8, angle: a, color: '#d2f1f3' });
    for (const e of s.enemies) if (!e.dead && e.bladeCooldown <= 0 && distance({ x, y }, e) < e.r + 8) { damageEnemy(s, e, 9, 'blade'); e.bladeCooldown = 0.3; }
  }
  const trails = s.effects.filter(e => e.type === 'trail');
  for (const e of s.enemies) if (!e.dead && e.trailCooldown <= 0 && trails.some(t => distance(e, t) < e.r + t.radius)) { damageEnemy(s, e, 8 * level(s, 'trail'), 'trail'); e.trailCooldown = 0.3; }
  s.enemies = s.enemies.filter(e => !e.dead); s.bullets = s.bullets.filter(b => !b.dead);
  for (const pickup of s.pickups) {
    pickup.age += dt; const d = distance(p, pickup);
    if (d < 125 || pickup.age > 4) { const a = angleTo(pickup, p), speed = Math.min(d / dt, 260 + pickup.age * 35); pickup.x += Math.cos(a) * speed * dt; pickup.y += Math.sin(a) * speed * dt; }
    if (distance(p, pickup) < p.r + 8) { pickup.taken = true; s.stats.embers += pickup.value; s.events.push({ type: 'pickup', value: pickup.value }); }
  }
  s.pickups = s.pickups.filter(pickup => !pickup.taken);
  if (s.phase === 'combat' && !s.enemies.length) {
    if (s.wave < s.waveTotal) nextWave(s);
    else clearRoom(s);
  }
  return s;
}
export function setWorldSize(s, width, height) {
  if (!finite(width) || !finite(height) || width < 380 || height < 560 || width > 4000 || height > 4000) return false;
  const old = roomBounds(s), oldWidth = s.width, oldHeight = s.height;
  s.width = width; s.height = height; const next = roomBounds(s);
  const sx = (next.right - next.left) / (old.right - old.left), sy = (next.bottom - next.top) / (old.bottom - old.top);
  const point = e => { e.x = next.left + (e.x - old.left) * sx; e.y = next.top + (e.y - old.top) * sy; };
  point(s.player);
  for (const list of [s.enemies, s.bullets, s.pickups, s.effects, s.gates, s.hazards, s.interactables]) for (const e of list) {
    point(e);
    if (finite(e.x2)) { e.x2 = next.left + (e.x2 - old.left) * sx; e.y2 = next.top + (e.y2 - old.top) * sy; }
    if (finite(e.chargeX)) { e.chargeX = next.left + (e.chargeX - old.left) * sx; e.chargeY = next.top + (e.chargeY - old.top) * sy; }
    if (finite(e.returnX)) { e.returnX = next.left + (e.returnX - old.left) * sx; e.returnY = next.top + (e.returnY - old.top) * sy; }
    for (const prefix of ['attack', 'burrow', 'blink', 'rewind']) if (finite(e[`${prefix}X`])) {
      e[`${prefix}X`] = next.left + (e[`${prefix}X`] - old.left) * sx; e[`${prefix}Y`] = next.top + (e[`${prefix}Y`] - old.top) * sy;
    }
    if (e.telegraph?.kind === 'impact' && finite(e.telegraph.x)) point(e.telegraph);
  }
  for (const o of s.obstacles) { point(o); o.w *= sx; o.h *= sy; }
  // Rebuild seeded visual semantics on rotation; legacy collision scaling is exact.
  const geometry = buildRoomGeometry({ ...s, bounds: next, boss: isBossRoom(s) });
  s.floorZones = geometry.floorZones; s.landmarks = geometry.landmarks;
  if (s.mapVersion >= 2) s.obstacles = [...geometry.obstacles, ...s.obstacles.filter(o => o.temporary)];
  resolveBody(s, s.player);
  for (const item of s.interactables) resolveBody(s, item);
  s.landmarks = s.landmarks.filter(p => !s.interactables.some(item => distance(p, item) < 45));
  for (const e of s.enemies) {
    resolveBody(s, e);
    if (e.specialAction && finite(e.attackX)) { e.angle = Math.atan2(e.attackY - e.y, e.attackX - e.x) + (e.attackAngleOffset || 0); if (e.telegraph) e.telegraph.angle = e.angle; }
    if (finite(e.chargeX)) {
      const a = Math.atan2(e.chargeY - e.y, e.chargeX - e.x);
      if (e.telegraph && !e.specialAction) { e.telegraph.angle = a; e.telegraph.range = Math.hypot(e.chargeX - e.x, e.chargeY - e.y); }
      if (e.phase === 'charge') { const speed = Math.hypot(e.vx, e.vy), direction = e.specialAction ? e.angle : a; e.vx = Math.cos(direction) * speed; e.vy = Math.sin(direction) * speed; }
    }
  }
  s.bullets = s.bullets.filter(bullet => !blocked(s, bullet.x, bullet.y, bullet.r));
  if (s.entrance) { s.entrance.width = width; s.entrance.height = height; }
  return oldWidth !== width || oldHeight !== height;
}
export function snapshot(s) { return s && s.entrance ? clone(s.entrance) : null; }
function validAdventure(data, checkpoint) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const keys = ['version', 'spent', 'claims', 'escort', 'cleanRooms', 'roomDamage'];
  if (Object.keys(data).length !== keys.length || Object.keys(data).some(key => !keys.includes(key)) || data.version !== 1) return false;
  if (!Number.isInteger(data.spent) || data.spent < 0 || data.spent > checkpoint.stats.embers || data.spent % 10 !== 0) return false;
  if (!Number.isInteger(data.cleanRooms) || data.cleanRooms < 0 || data.cleanRooms > checkpoint.room - 1 || data.roomDamage !== checkpoint.stats.damageTaken) return false;
  if (!Array.isArray(data.claims) || data.claims.length > 40 || new Set(data.claims).size !== data.claims.length) return false;
  if (data.claims.some(key => typeof key !== 'string' || !/^(?:[1-9]|1[0-5]):(lamps|offering|chest|escort|ghost)$/.test(key) || Number(key.split(':')[0]) >= checkpoint.room)) return false;
  if (data.claims.filter(key => key.endsWith(':ghost')).length > 1 || data.spent !== data.claims.filter(key => key.endsWith(':offering')).length * 10) return false;
  if (data.escort !== null) {
    const escort = data.escort;
    if (!escort || typeof escort !== 'object' || Array.isArray(escort) || Object.keys(escort).length !== 2 || !Object.hasOwn(escort, 'fromRoom') || !Object.hasOwn(escort, 'dueRoom') || !Number.isInteger(escort.fromRoom) || escort.fromRoom !== checkpoint.room - 1 || escort.dueRoom !== checkpoint.room || escort.fromRoom < 2 || escort.dueRoom > (checkpoint.version === 1 ? 8 : 15) || data.claims.includes(`${escort.fromRoom}:escort`)) return false;
  }
  return true;
}
export function restoreRun(data) {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.kind !== 'cinder-below-run' || ![1, 2].includes(data.version)) return null;
    const allowed = ['kind', 'version', 'seed', 'width', 'height', 'room', 'route', 'weapon', 'relics', 'hp', 'novaCharge', 'stats', 'time', 'nextId'];
    if (data.version === 2) allowed.push('totalRooms');
    if (Object.keys(data).some(k => !allowed.includes(k) && k !== 'adventure' && k !== 'mapVersion') || allowed.some(k => !Object.hasOwn(data, k))) return null;
    if (Object.hasOwn(data, 'mapVersion') && ![2, 3].includes(data.mapVersion)) return null;
    const maxRooms = data.version === 1 ? 8 : MAX_ROOMS;
    if (data.version === 2 && data.totalRooms !== MAX_ROOMS) return null;
    if (!Number.isInteger(data.seed) || data.seed < 1 || data.seed > 4294967295 || !Number.isInteger(data.room) || data.room < 1 || data.room > maxRooms || !['hunt', 'refuge', ...(data.version === 2 ? ['rift'] : [])].includes(data.route) || !WEAPONS.some(w => w.id === data.weapon)) return null;
    if (data.route === 'rift' && (data.room < 4 || data.room % 3 !== 1)) return null;
    if (!finite(data.width) || !finite(data.height) || data.width < 380 || data.width > 4000 || data.height < 560 || data.height > 4000) return null;
    if (!data.relics || typeof data.relics !== 'object' || Array.isArray(data.relics) || Object.keys(data.relics).some(id => !RELICS.some(r => r.id === id) || !Number.isInteger(data.relics[id]) || data.relics[id] < 1 || data.relics[id] > 3)) return null;
    if (Object.values(data.relics).reduce((a, b) => a + b, 0) !== data.room - 1) return null;
    const maxHp = 6 - (data.relics.blood || 0);
    if (!finite(data.hp) || data.hp <= 0 || data.hp > maxHp || !finite(data.novaCharge) || data.novaCharge < 0 || data.novaCharge > 100 || !finite(data.time) || data.time < 0 || data.time > 1e7 || !Number.isSafeInteger(data.nextId) || data.nextId < 1 || data.nextId > 1e9) return null;
    const keys = ['kills', 'rooms', 'embers', 'shots', 'hits', 'damageTaken', 'elapsed'];
    if (!data.stats || Object.keys(data.stats).length !== keys.length || keys.some(k => !finite(data.stats[k]) || data.stats[k] < 0 || data.stats[k] > 1e9) || data.stats.rooms !== data.room - 1 || Math.abs(data.stats.elapsed - data.time) > 1e-7) return null;
    if (keys.filter(k => k !== 'elapsed').some(k => !Number.isInteger(data.stats[k]))) return null;
    if (Object.hasOwn(data, 'adventure') && !validAdventure(data.adventure, data)) return null;
    const s = createRun({ ...data, mapVersion: data.mapVersion ?? 1, campaign: data.version === 1 ? 'legacy' : 'five-acts' });
    s.room = data.room; s.route = data.route; s.relics = clone(data.relics); s.player.maxHp = maxHp; s.player.hp = data.hp; s.player.novaCharge = data.novaCharge;
    s.time = data.time; s.stats = clone(data.stats); s.nextId = Math.max(1, data.nextId - initialEnemyCount(s));
    s.adventure = Object.hasOwn(data, 'adventure') ? clone(data.adventure) : newAdventure();
    makeRoom(s); s.events = []; return s;
  } catch { return null; }
}
export function describe(s) {
  const round = n => Math.round(n * 100) / 100;
  return { title: 'Cinder Below', coordinates: 'World coordinates; origin top-left; x right, y down. Aim uses absolute world position.',
    width: s.width, height: s.height, seed: s.seed, time: round(s.time), room: s.room, totalRooms: s.totalRooms, campaign: s.campaign, route: s.route, phase: s.phase,
    mapVersion: s.mapVersion, roomShape: s.roomShape, layoutVariant: clone(s.layoutVariant), floorZones: clone(s.floorZones), landmarks: clone(s.landmarks),
    wave: s.wave, waveTotal: s.waveTotal, waveDelay: round(s.waveDelay), layout: s.layout, biome: s.biome, baseBiome: s.baseBiome, act: s.act, actName: s.actName, bossId: s.bossId, riftRule: s.riftRule,
    player: Object.fromEntries(Object.entries(s.player).filter(([k]) => !['fireCooldown', 'dashVX', 'dashVY'].includes(k)).map(([k, v]) => [k, typeof v === 'number' ? round(v) : v])),
    enemies: s.enemies.map(e => ({ id: e.id, type: e.type, boss: e.boss, x: round(e.x), y: round(e.y), r: e.r, hp: round(e.hp), maxHp: e.maxHp, phase: e.phase, stage: e.stage, windup: round(e.windup), ...(e.boss ? { action: e.specialAction || null, angle: round(e.angle), aimLocked: Boolean(e.aimLocked), comboStep: e.comboStep || 0, coreOpen: Boolean(e.coreOpen) } : {}), telegraph: e.telegraph ? { ...e.telegraph } : null, burnTime: round(e.burnTime), coldTime: round(e.coldTime) })),
    bullets: s.bullets.map(b => ({ id: b.id, owner: b.owner, x: round(b.x), y: round(b.y), vx: round(b.vx), vy: round(b.vy), r: b.r, ...(b.motion ? { motion: b.motion } : {}), ...(b.paused !== undefined ? { paused: b.paused } : {}) })),
    obstacles: clone(s.obstacles), gates: clone(s.gates), relics: { ...s.relics }, choices: s.choices.map(id => ({ ...RELICS.find(r => r.id === id), nextLevel: level(s, id) + 1 })),
    hazards: clone(s.hazards), interactables: clone(s.interactables), adventure: clone(s.adventure), wallet: availableEmbers(s),
    pickups: s.pickups.map(p => ({ x: round(p.x), y: round(p.y), value: p.value })), stats: { ...s.stats, elapsed: round(s.stats.elapsed) },
    goal: s.phase === 'combat' ? 'Defeat every enemy. Read their windups, dodge projectiles and falling impacts. Nearby discoveries use Q.' : s.phase === 'reward' ? 'Choose one relic.' : s.phase === 'exit' ? 'Explore optional discoveries or choose an exit.' : s.phase === 'won' ? `All ${s.totalRooms} rooms are cleared.` : 'This run is over. Start a new descent.' };
}
