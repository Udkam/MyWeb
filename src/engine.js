/** Deterministic world simulation. Seconds, world coordinates, y points down.
 * No browser APIs or wall-clock/random sources. step mutates and returns state.
 * Enemy warnings: windup/windupMax seconds, telegraph kind/angle/range/width/
 * spread/remaining. chargeX/Y is the locked destination, never a hidden retarget.
 */
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
const MAX_ROOMS = 8;
const PAD = 28;
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
  const boss = type === 'sentinel' || type === 'warden';
  const base = { slime: 24, shooter: 27, charger: 40, caster: 30, sentinel: 600, warden: 950 }[type];
  const maxHp = base + (boss ? 0 : Math.max(0, s.room - 1) * 2);
  return { id: s.nextId++, type, x, y, r: boss ? 29 : type === 'charger' ? 17 : 14, hp: maxHp, maxHp,
    angle: 0, vx: 0, vy: 0, phase: 'spawn', spawnTime: 0.9, windup: 0, windupMax: 0,
    cooldown: 0.8 + random(s) * 0.6, hitFlash: 0, stage: 1, pattern: 0, summoned: false,
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
  const refuge = Math.max(2, 1 + Math.ceil(s.room / 2));
  return refuge + (s.route === 'hunt' ? 2 : 0);
}
function initialEnemyCount(s) { return s.room === 4 ? 3 : s.room === 8 ? 4 : normalWaveCount(s); }
function spawnEnemies(s, count, specifiedTypes = null) {
  const types = specifiedTypes || (s.room === 1 ? ['slime', 'shooter'] : s.room < 3 ? ['slime', 'shooter', 'charger'] : ['slime', 'shooter', 'charger', 'caster']);
  for (let i = 0; i < count; i++) {
    // The second wave changes the mix as well as position, while keeping route counts honest.
    const type = types[(i + (specifiedTypes ? 0 : s.wave - 1)) % types.length];
    const point = freeSpawn(s, 0.12 + random(s) * 0.76, 0.10 + random(s) * 0.65, type === 'charger' ? 17 : 14);
    if (point) s.enemies.push(enemy(s, type, point.x, point.y));
  }
}
function nextWave(s) {
  s.wave++; s.waveDelay = 0.9;
  // Remove lingering hostile projectiles before the visible, non-damaging spawn warning.
  s.bullets = s.bullets.filter(b => b.owner === 'player');
  spawnEnemies(s, normalWaveCount(s));
  s.events.push({ type: 'wave-enter', room: s.room, wave: s.wave, waveTotal: s.waveTotal });
}
function makeRoom(s, capture = true) {
  s.phase = 'combat'; s.enemies = []; s.bullets = []; s.pickups = []; s.effects = []; s.choices = []; s.gates = [];
  s.hitStop = 0; s.shake = 0; s.inputLatch = { dash: false, nova: false };
  s.rng = (s.seed ^ Math.imul(s.room, 0x9e3779b1) ^ (s.route === 'refuge' ? 0x71a53d09 : 0)) >>> 0;
  const b = roomBounds(s), w = b.right - b.left, h = b.bottom - b.top;
  const boss = s.room === 4 || s.room === 8;
  s.wave = 1; s.waveTotal = s.room === 1 || boss ? 1 : 2; s.waveDelay = 0.9;
  const positions = boss ? [[0.22, 0.48], [0.72, 0.48]] : s.room % 2 ? [[0.25, 0.35], [0.65, 0.56]] : [[0.25, 0.58], [0.66, 0.32], [0.46, 0.45]];
  s.obstacles = positions.map(([x, y]) => ({ x: b.left + x * w, y: b.top + y * h, w: Math.min(70, w * 0.11), h: Math.min(58, h * 0.10) }));
  s.player.x = s.width / 2; s.player.y = b.bottom - 46; s.player.vx = 0; s.player.vy = 0;
  s.player.invuln = 1.1; s.player.dashTime = 0; s.player.dashCooldown = 0; s.player.fireCooldown = 0; s.player.recoil = 0;
  s.player.angle = -Math.PI / 2;
  if (boss) {
    const point = freeSpawn(s, 0.5, 0.24, 29);
    s.enemies.push(enemy(s, s.room === 4 ? 'sentinel' : 'warden', point.x, point.y));
  }
  spawnEnemies(s, boss ? (s.room === 8 ? 3 : 2) : normalWaveCount(s));
  if (capture) s.entrance = entranceData(s);
}
function entranceData(s) {
  return { kind: 'cinder-below-run', version: 1, seed: s.seed, width: s.width, height: s.height,
    room: s.room, route: s.route, weapon: s.player.weapon, relics: clone(s.relics), hp: s.player.hp,
    novaCharge: s.player.novaCharge, stats: clone(s.stats), time: s.time, nextId: s.nextId };
}
export function createRun({ seed = 20261014, width = 1100, height = 720, weapon = 'cinder', meta = {} } = {}) {
  void meta;
  const s = { width: clamp(finite(width) ? width : 1100, 380, 4000), height: clamp(finite(height) ? height : 720, 560, 4000),
    time: 0, seed: (Number(seed) >>> 0) || 1, rng: 1, room: 1, route: 'hunt', phase: 'combat', nextId: 1,
    player: { x: 0, y: 0, r: 13, hp: 6, maxHp: 6, angle: -Math.PI / 2, vx: 0, vy: 0, invuln: 0,
      dashTime: 0, dashCooldown: 0, dashVX: 0, dashVY: 0, fireCooldown: 0, novaCharge: 100, novaMax: 100,
      recoil: 0, weapon: WEAPONS.some(w => w.id === weapon) ? weapon : 'cinder' },
    enemies: [], bullets: [], obstacles: [], pickups: [], effects: [], relics: {}, choices: [], gates: [],
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
function damageEnemy(s, e, amount, source = 'bullet') {
  if (e.hp <= 0 || e.phase === 'spawn') return;
  const actual = Math.min(e.hp, amount); e.hp -= actual; e.hitFlash = 0.1;
  if (source === 'bullet') { s.stats.hits++; s.player.novaCharge = Math.min(100, s.player.novaCharge + 2 + level(s, 'nova')); }
  s.events.push({ type: 'enemy-hit', id: e.id, damage: actual, source });
  if (e.hp <= 0) kill(s, e);
}
function kill(s, e) {
  if (e.dead) return;
  e.dead = true; e.hp = 0; s.stats.kills++; s.player.novaCharge = Math.min(100, s.player.novaCharge + 7 + level(s, 'nova') * 2);
  s.hitStop = Math.max(s.hitStop, 0.025); s.shake = Math.max(s.shake, 1.8);
  const value = e.type === 'sentinel' || e.type === 'warden' ? 12 : s.route === 'hunt' ? 2 : 1;
  s.pickups.push({ id: s.nextId++, x: e.x, y: e.y, value, r: 5, age: 0 });
  s.events.push({ type: 'kill', id: e.id, enemyType: e.type, value });
  effect(s, 'death', e.x, e.y, 0.32, { radius: e.r * 1.7, color: '#ffb263' });
  const power = level(s, 'explosive');
  if (power) {
    const radius = 70 + power * 18;
    effect(s, 'nova', e.x, e.y, 0.3, { radius, color: '#ff9a51' });
    for (const other of s.enemies) if (other !== e && !other.dead && distance(other, e) <= radius + other.r) damageEnemy(s, other, 12 * power, 'explosion');
  }
}
function bullet(s, owner, x, y, angle, speed, damage, extra = {}) {
  const b = { id: s.nextId++, owner, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: owner === 'player' ? 4 : 5,
    damage, life: 3.5, color: owner === 'player' ? '#ffbe68' : '#c69bff', hits: [], bounces: 0, pierces: 0, ...extra };
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
  e.telegraph = { kind, angle, range, width: e.r * 2, spread: 0.8, remaining: time, ...extra };
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
  if (warning.kind === 'line') {
    e.phase = 'charge'; e.chargeTime = e.type === 'charger' ? 0.55 : 0.6;
    e.vx = Math.cos(warning.angle) * (e.type === 'charger' ? 350 : 390);
    e.vy = Math.sin(warning.angle) * (e.type === 'charger' ? 350 : 390);
  } else {
    if (warning.kind === 'ring') {
      const count = e.type === 'caster' ? 7 : e.stage === 2 ? 16 : 12;
      for (let i = 0; i < count; i++) enemyFire(s, e, warning.angle + i / count * TAU, 0, 1, e.type === 'caster' ? 145 : 170);
    } else enemyFire(s, e, warning.angle, warning.spread, e.type === 'shooter' ? 3 : e.stage === 2 ? 9 : 7, 220);
    e.phase = 'recover'; e.recoverTime = e.type === 'shooter' ? 0.6 : 0.48;
  }
  e.telegraph = null; e.windup = 0;
}
function updateEnemy(s, e, dt) {
  e.hitFlash = Math.max(0, e.hitFlash - dt); e.bladeCooldown = Math.max(0, e.bladeCooldown - dt); e.trailCooldown = Math.max(0, e.trailCooldown - dt);
  if (e.phase === 'spawn') { e.spawnTime -= dt; if (e.spawnTime <= 0) e.phase = 'chase'; return; }
  if (e.burnTime > 0) { e.burnTime -= dt; damageEnemy(s, e, e.burnDamage * dt, 'burn'); }
  if (e.hp <= 0) return;
  e.coldTime = Math.max(0, e.coldTime - dt);
  const slow = e.coldTime > 0 ? e.coldFactor : 1;
  const boss = e.type === 'sentinel' || e.type === 'warden';
  if (boss && e.hp <= e.maxHp * 0.5) {
    e.stage = 2;
    if (!e.summoned) {
      e.summoned = true;
      spawnEnemies(s, 2, e.type === 'sentinel' ? ['slime', 'shooter'] : ['charger', 'caster']);
      s.events.push({ type: 'boss-summon', id: e.id, enemyType: e.type, stage: 2 });
    }
  }
  if (e.phase === 'windup') {
    e.windup -= dt; e.telegraph.remaining = Math.max(0, e.windup);
    if (e.windup <= 0) finishWindup(s, e);
  } else if (e.phase === 'charge') {
    e.chargeTime -= dt;
    const collision = move(s, e, e.vx * dt * slow, e.vy * dt * slow);
    if (collision || e.chargeTime <= 0) { e.phase = 'recover'; e.recoverTime = 0.8; e.vx = 0; e.vy = 0; }
  } else if (e.phase === 'recover') {
    e.vx = 0; e.vy = 0; e.recoverTime -= dt;
    if (e.recoverTime <= 0) { e.phase = 'chase'; e.cooldown = boss ? (e.stage === 2 ? 0.5 : 0.9) : 0.8; }
  } else {
    const angle = angleTo(e, s.player), dist = distance(e, s.player);
    e.angle = angle; e.cooldown -= dt;
    let speed = e.type === 'slime' ? 62 + s.room * 2 : e.type === 'charger' ? 35 : boss ? 28 : 38;
    let direction = angle;
    if (e.type === 'shooter') speed *= dist < 170 ? -1 : dist < 270 ? 0 : 1;
    if (e.type === 'caster') { direction += Math.PI / 2; speed = 52; }
    e.vx = Math.cos(direction) * speed * slow; e.vy = Math.sin(direction) * speed * slow;
    move(s, e, e.vx * dt, e.vy * dt);
    if (e.cooldown <= 0) {
      if (e.type === 'charger') windup(e, 'line', 0.8, angle, 350 * 0.55);
      else if (e.type === 'shooter') windup(e, 'fan', 0.65, angle, 400, { spread: 0.42 });
      else if (e.type === 'caster') windup(e, 'ring', 0.85, angle, 240);
      else if (boss) {
        const kind = e.type === 'warden' ? ['fan', 'ring', 'line'][e.pattern++ % 3] : ['fan', 'line', 'ring'][e.pattern++ % 3];
        windup(e, kind, kind === 'line' ? 0.85 : 0.8, angle, kind === 'line' ? 234 : 350, { spread: e.stage === 2 ? 1.7 : 1.15 });
      }
    }
  }
  if (distance(e, s.player) < e.r + s.player.r && e.phase !== 'windup') playerHit(s);
}
function onBulletHit(s, b, e) {
  damageEnemy(s, e, b.damage);
  effect(s, 'hit', b.x, b.y, 0.14, { radius: 10, color: '#ffd39b' });
  b.hits.push(e.id);
  const angle = Math.atan2(b.vy, b.vx);
  if (!e.dead && e.type !== 'sentinel' && e.type !== 'warden') move(s, e, Math.cos(angle) * 5, Math.sin(angle) * 5);
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
  b.life -= dt; if (b.life <= 0) { b.dead = true; return; }
  if (b.owner === 'player' && b.seeking) {
    const target = s.enemies.filter(e => !e.dead && !b.hits.includes(e.id) && distance(b, e) < 340).sort((a, c) => distance(b, a) - distance(b, c) || a.id - c.id)[0];
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
      for (const e of s.enemies) if (!e.dead && e.phase !== 'spawn' && !b.hits.includes(e.id) && distance(b, e) < b.r + e.r) { onBulletHit(s, b, e); if (b.dead) break; }
    } else if (distance(b, s.player) < b.r + s.player.r) { if (s.player.dashTime <= 0) { playerHit(s, b.damage); b.dead = true; } }
  }
}
function chooseOptions(s) {
  const pool = RELICS.filter(r => level(s, r.id) < r.maxLevel && (r.id !== 'blood' || s.player.maxHp > 2));
  const choices = [];
  while (pool.length && choices.length < 3) choices.push(pool.splice(Math.floor(random(s) * pool.length), 1)[0].id);
  return choices;
}
function clearRoom(s) {
  for (const p of s.pickups) s.stats.embers += p.value;
  s.pickups = []; s.bullets = []; s.stats.rooms++;
  const bonus = s.route === 'hunt' ? 4 + s.room : 2;
  s.stats.embers += bonus;
  s.events.push({ type: 'room-clear', room: s.room, route: s.route, embers: bonus });
  if (s.room === MAX_ROOMS) { s.phase = 'won'; s.events.push({ type: 'win', room: s.room }); return; }
  s.phase = 'reward'; s.choices = chooseOptions(s);
  if (!s.choices.length) openGates(s);
}
function openGates(s) {
  const b = roomBounds(s);
  s.phase = 'exit'; s.choices = [];
  s.gates = [{ x: s.width * 0.32, y: b.top + 24, r: 27, route: 'hunt', label: 'Hunt · More foes and embers' }, { x: s.width * 0.68, y: b.top + 24, r: 27, route: 'refuge', label: 'Refuge · Heal one heart' }];
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
  if (s.phase !== 'exit' || !['hunt', 'refuge'].includes(route) || s.room >= MAX_ROOMS) return false;
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
  s.shake = Math.max(0, s.shake - dt * 35); s.hitStop = Math.max(0, s.hitStop - dt);
  for (const e of s.effects) e.life -= dt;
  s.effects = s.effects.filter(e => e.life > 0);
  const p = s.player;
  p.invuln = Math.max(0, p.invuln - dt); p.dashCooldown = Math.max(0, p.dashCooldown - dt); p.fireCooldown = Math.max(0, p.fireCooldown - dt); p.recoil = Math.max(0, p.recoil - dt);
  p.novaCharge = Math.min(p.novaMax, p.novaCharge + dt * (2.5 + level(s, 'nova')));
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
  } else { p.vx = mx * 215; p.vy = my * 215; }
  move(s, p, p.vx * dt, p.vy * dt);
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
  for (const list of [s.enemies, s.bullets, s.pickups, s.effects, s.gates]) for (const e of list) {
    point(e);
    if (finite(e.x2)) { e.x2 = next.left + (e.x2 - old.left) * sx; e.y2 = next.top + (e.y2 - old.top) * sy; }
    if (finite(e.chargeX)) { e.chargeX = next.left + (e.chargeX - old.left) * sx; e.chargeY = next.top + (e.chargeY - old.top) * sy; }
  }
  for (const o of s.obstacles) { point(o); o.w *= sx; o.h *= sy; }
  resolveBody(s, s.player);
  for (const e of s.enemies) {
    resolveBody(s, e);
    if (finite(e.chargeX)) {
      const a = Math.atan2(e.chargeY - e.y, e.chargeX - e.x);
      if (e.telegraph) { e.telegraph.angle = a; e.telegraph.range = Math.hypot(e.chargeX - e.x, e.chargeY - e.y); }
      if (e.phase === 'charge') { const speed = Math.hypot(e.vx, e.vy); e.vx = Math.cos(a) * speed; e.vy = Math.sin(a) * speed; }
    }
  }
  s.bullets = s.bullets.filter(bullet => !blocked(s, bullet.x, bullet.y, bullet.r));
  if (s.entrance) { s.entrance.width = width; s.entrance.height = height; }
  return oldWidth !== width || oldHeight !== height;
}
export function snapshot(s) { return s && s.entrance ? clone(s.entrance) : null; }
export function restoreRun(data) {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.kind !== 'cinder-below-run' || data.version !== 1) return null;
    const allowed = ['kind', 'version', 'seed', 'width', 'height', 'room', 'route', 'weapon', 'relics', 'hp', 'novaCharge', 'stats', 'time', 'nextId'];
    if (Object.keys(data).some(k => !allowed.includes(k)) || Object.keys(data).length !== allowed.length) return null;
    if (!Number.isInteger(data.seed) || data.seed < 1 || data.seed > 4294967295 || !Number.isInteger(data.room) || data.room < 1 || data.room > 8 || !['hunt', 'refuge'].includes(data.route) || !WEAPONS.some(w => w.id === data.weapon)) return null;
    if (!finite(data.width) || !finite(data.height) || data.width < 380 || data.width > 4000 || data.height < 560 || data.height > 4000) return null;
    if (!data.relics || typeof data.relics !== 'object' || Array.isArray(data.relics) || Object.keys(data.relics).some(id => !RELICS.some(r => r.id === id) || !Number.isInteger(data.relics[id]) || data.relics[id] < 1 || data.relics[id] > 3)) return null;
    if (Object.values(data.relics).reduce((a, b) => a + b, 0) !== data.room - 1) return null;
    const maxHp = 6 - (data.relics.blood || 0);
    if (!finite(data.hp) || data.hp <= 0 || data.hp > maxHp || !finite(data.novaCharge) || data.novaCharge < 0 || data.novaCharge > 100 || !finite(data.time) || data.time < 0 || data.time > 1e7 || !Number.isSafeInteger(data.nextId) || data.nextId < 1 || data.nextId > 1e9) return null;
    const keys = ['kills', 'rooms', 'embers', 'shots', 'hits', 'damageTaken', 'elapsed'];
    if (!data.stats || Object.keys(data.stats).length !== keys.length || keys.some(k => !finite(data.stats[k]) || data.stats[k] < 0 || data.stats[k] > 1e9) || data.stats.rooms !== data.room - 1 || Math.abs(data.stats.elapsed - data.time) > 1e-7) return null;
    if (keys.filter(k => k !== 'elapsed').some(k => !Number.isInteger(data.stats[k]))) return null;
    const s = createRun(data);
    s.room = data.room; s.route = data.route; s.relics = clone(data.relics); s.player.maxHp = maxHp; s.player.hp = data.hp; s.player.novaCharge = data.novaCharge;
    s.time = data.time; s.stats = clone(data.stats); s.nextId = Math.max(1, data.nextId - initialEnemyCount(s));
    makeRoom(s); s.events = []; return s;
  } catch { return null; }
}
export function describe(s) {
  const round = n => Math.round(n * 100) / 100;
  return { title: 'Cinder Below', coordinates: 'World coordinates; origin top-left; x right, y down. Aim uses absolute world position.',
    width: s.width, height: s.height, seed: s.seed, time: round(s.time), room: s.room, totalRooms: MAX_ROOMS, route: s.route, phase: s.phase,
    wave: s.wave, waveTotal: s.waveTotal, waveDelay: round(s.waveDelay),
    player: Object.fromEntries(Object.entries(s.player).filter(([k]) => !['fireCooldown', 'dashVX', 'dashVY'].includes(k)).map(([k, v]) => [k, typeof v === 'number' ? round(v) : v])),
    enemies: s.enemies.map(e => ({ id: e.id, type: e.type, x: round(e.x), y: round(e.y), r: e.r, hp: round(e.hp), maxHp: e.maxHp, phase: e.phase, stage: e.stage, windup: round(e.windup), telegraph: e.telegraph ? { ...e.telegraph } : null, burnTime: round(e.burnTime), coldTime: round(e.coldTime) })),
    bullets: s.bullets.map(b => ({ id: b.id, owner: b.owner, x: round(b.x), y: round(b.y), vx: round(b.vx), vy: round(b.vy), r: b.r })),
    obstacles: clone(s.obstacles), gates: clone(s.gates), relics: { ...s.relics }, choices: s.choices.map(id => ({ ...RELICS.find(r => r.id === id), nextLevel: level(s, id) + 1 })),
    pickups: s.pickups.map(p => ({ x: round(p.x), y: round(p.y), value: p.value })), stats: { ...s.stats, elapsed: round(s.stats.elapsed) },
    goal: s.phase === 'combat' ? 'Defeat every enemy. Avoid attack warnings; use dash and charged nova.' : s.phase === 'reward' ? 'Choose one relic.' : s.phase === 'exit' ? 'Walk into Hunt or Refuge.' : s.phase === 'won' ? 'The Cinder Warden is defeated. All eight rooms are cleared.' : 'This run is over. Start a new descent.' };
}
