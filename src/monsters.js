/** Additional deterministic enemy behaviours. The engine owns collisions,
 * projectiles, spawn safety and global caps; this module owns action timing.
 * All windups here are body tells. Only meteor hazards draw a landing circle. */
export const SPECIAL_ENEMIES = Object.freeze({
  weaver: Object.freeze({ hp: 34, r: 13 }),
  bomber: Object.freeze({ hp: 26, r: 14 }),
  trapper: Object.freeze({ hp: 38, r: 14 }),
  summoner: Object.freeze({ hp: 42, r: 15 }),
  leech: Object.freeze({ hp: 34, r: 13 }),
  shieldbearer: Object.freeze({ hp: 58, r: 17 }),
  prism: Object.freeze({ hp: 36, r: 14 }),
  boomerang: Object.freeze({ hp: 38, r: 14 }),
  burrower: Object.freeze({ hp: 35, r: 13 }),
  medic: Object.freeze({ hp: 35, r: 14 }),
  frost: Object.freeze({ hp: 34, r: 13 }),
  duelist: Object.freeze({ hp: 43, r: 15 }),
});

export const BOSS_DEFINITIONS = Object.freeze({
  sentinel: Object.freeze({ hp: 600, r: 29 }),
  briar: Object.freeze({ hp: 560, r: 28 }),
  leviathan: Object.freeze({ hp: 700, r: 30 }),
  mirror: Object.freeze({ hp: 650, r: 27 }),
  warden: Object.freeze({ hp: 950, r: 29 }),
  kiln: Object.freeze({ hp: 720, r: 31 }),
  tempest: Object.freeze({ hp: 920, r: 28 }),
  eclipse: Object.freeze({ hp: 900, r: 28 }),
  sovereign: Object.freeze({ hp: 1200, r: 31 }),
  chronarch: Object.freeze({ hp: 1150, r: 29 }),
});

const TAU = Math.PI * 2;
const isBoss = (e) => Object.hasOwn(BOSS_DEFINITIONS, e.type);
const known = (e) => Object.hasOwn(SPECIAL_ENEMIES, e.type) || isBoss(e);
const alive = (e) => e && !e.dead && e.hp > 0;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function walk(e, api, angle, speed, dt) {
  const slow = Number.isFinite(api.slow) ? clamp(api.slow, 0, 1) : 1;
  e.vx = Math.cos(angle) * speed * slow;
  e.vy = Math.sin(angle) * speed * slow;
  return api.move(e, e.vx * dt, e.vy * dt);
}

function rest(e, duration = .6, cooldown = .6) {
  e.phase = 'recover'; e.recoverTime = duration; e.specialCooldown = cooldown;
  e.windup = 0; e.telegraph = null; e.vx = 0; e.vy = 0;
  if (e.type === 'kiln') e.coreOpen = true;
}

function prepare(s, e, api, action, duration, angle = api.angleTo(e, s.player)) {
  e.specialAction = action;
  e.channelStartHp = e.hp;
  e.attackX = s.player.x; e.attackY = s.player.y;
  e.attackAngleOffset = angleDifference(angle, api.angleTo(e, s.player));
  if (e.type === 'kiln') e.coreOpen = false;
  api.windup(e, 'self', duration, angle, 0, { visible: false });
}

function fire(e, api, angle, speed = 210, extra = {}) {
  return api.bullet(e.x + Math.cos(angle) * (e.r + 7), e.y + Math.sin(angle) * (e.r + 7), angle, speed, 1, { life: 3.2, ...extra });
}

function cross(e, api, angle, speed, extra = {}) {
  for (let i = 0; i < 4; i++) fire(e, api, angle + i * TAU / 4, speed, extra);
}

function beginBurst(e, action, count, interval) {
  e.phase = 'burst'; e.specialAction = action; e.burstLeft = count;
  e.burstTotal = count; e.burstTimer = 0; e.burstInterval = interval;
  e.telegraph = null; e.windup = 0; e.vx = 0; e.vy = 0;
}

function beginCharge(e, speed, duration) {
  e.phase = 'charge'; e.chargeTime = duration; e.chargeSpeed = speed;
  e.telegraph = null; e.windup = 0;
  e.vx = Math.cos(e.angle) * speed; e.vy = Math.sin(e.angle) * speed;
}

function livingSummons(s, e) {
  e.summonedIds ||= [];
  e.summonedIds = e.summonedIds.filter((id) => s.enemies.some((other) => other.id === id && alive(other)));
  return e.summonedIds.length;
}

function woundedAlly(s, e, api) {
  return s.enemies.filter((other) => other !== e && alive(other) && other.phase !== 'spawn' && other.hp < other.maxHp && api.distance(e, other) <= 320)
    .sort((a, b) => api.distance(e, a) - api.distance(e, b) || a.id - b.id)[0];
}

function landing(s, e, api) {
  const bottom = s.height - (s.height > s.width ? 170 : 65);
  const candidates = [[.25, .28], [.75, .28], [.25, .64], [.75, .64]]
    .map(([x, y]) => ({ x: s.width * x, y: Math.min(bottom, s.height * y) }))
    .filter((point) => !api.blocked(point.x, point.y, e.r) && api.distance(point, s.player) >= 135);
  if (!candidates.length) return { x: e.x, y: e.y };
  return candidates[Math.floor(api.random() * candidates.length) % candidates.length];
}

function leavesEscape(s, candidate, api) {
  const radius = s.player.r + 3, stride = 22;
  const queue = [{ x: s.player.x, y: s.player.y, gx: 0, gy: 0 }], visited = new Set(['0:0']);
  for (let i = 0; i < queue.length && i < 1200; i++) {
    const point = queue[i];
    if (Math.hypot(point.x - s.player.x, point.y - s.player.y) >= 175) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const gx = point.gx + dx, gy = point.gy + dy, key = `${gx}:${gy}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const x = s.player.x + gx * stride, y = s.player.y + gy * stride;
      if (api.blocked(x, y, radius)) continue;
      const nearestX = clamp(x, candidate.x, candidate.x + candidate.w), nearestY = clamp(y, candidate.y, candidate.y + candidate.h);
      if (Math.hypot(x - nearestX, y - nearestY) < radius) continue;
      queue.push({ x, y, gx, gy });
    }
  }
  return false;
}

function plantThorns(s, e, api) {
  const max = e.stage === 2 ? 4 : 2;
  let planted = s.obstacles.filter((o) => o.kind === 'thorn' && o.ownerId === e.id && o.life > 0).length;
  // Four short separated posts leave diagonal corridors, rather than enclosing a body.
  for (const [dx, dy] of [[-100, 0], [100, 0], [0, -105], [0, 105]]) {
    if (planted >= max) break;
    const x = e.attackX + dx, y = e.attackY + dy, w = dx ? 22 : 54, h = dx ? 54 : 22;
    if (api.blocked(x, y, Math.max(w, h) / 2 + 6)) continue;
    if ([s.player, ...s.enemies.filter(alive)].some((body) => Math.abs(body.x - x) < w / 2 + body.r + 18 && Math.abs(body.y - y) < h / 2 + body.r + 18)) continue;
    const thorn = { kind: 'thorn', x: x - w / 2, y: y - h / 2, w, h, life: 5, ownerId: e.id, temporary: true };
    if (!leavesEscape(s, thorn, api)) continue;
    s.obstacles.push(thorn);
    api.effect('trail', x, y, .3, { radius: 18, color: '#9bc185' }); planted++;
  }
}

function makeDecoys(s, e, api) {
  const active = s.enemies.filter((other) => alive(other) && other.mirrorOwner === e.id).length;
  for (let i = active; i < (e.stage === 2 ? 2 : 1); i++) {
    const child = api.spawn('prism'); if (!child) break;
    child.mirrorDecoy = true; child.mirrorOwner = e.id; child.decoyTime = 7;
    child.maxHp = child.hp = 12; child.cooldown = .6;
  }
}

function swapDecoy(s, e, api) {
  const decoy = s.enemies.find((other) => alive(other) && other.mirrorOwner === e.id && api.distance(other, s.player) >= 110 && !api.blocked(other.x, other.y, e.r) && !api.blocked(e.x, e.y, other.r));
  if (!decoy) return false;
  const old = { x: e.x, y: e.y }; e.x = decoy.x; e.y = decoy.y; decoy.x = old.x; decoy.y = old.y;
  api.effect('rewind', old.x, old.y, .35, { x2: e.x, y2: e.y, color: '#c3e1ed' });
  return true;
}

function commandGuards(s, e, api) {
  if (e.stage >= 3) return;
  e.commandTotal ||= 0;
  const active = s.enemies.filter((other) => alive(other) && other.commandOwner === e.id).length;
  const count = Math.min((e.stage === 1 ? 2 : 4) - active, 6 - e.commandTotal);
  for (let i = 0; i < count; i++) {
    const child = api.spawn(e.stage === 1 ? 'shieldbearer' : 'sniper'); if (!child) break;
    child.commandOwner = e.id; child.elite = true; child.maxHp *= 1.2; child.hp = child.maxHp; e.commandTotal++;
  }
}

function release(s, e, api) {
  const action = e.specialAction;
  e.telegraph = null; e.windup = 0;
  if (action === 'weaver') {
    for (const offset of [-.16, .16]) fire(e, api, e.angle + offset, 185, { motion: 'weave', baseAngle: e.angle + offset, weaveAmplitude: 55, weaveFrequency: 5, color: '#e39ce7' });
    rest(e, .45, 1.15);
  } else if (action === 'bomber') {
    api.effect('nova', e.x, e.y, .32, { radius: 90, color: '#ff8954' });
    if (api.distance(e, s.player) < 90 + s.player.r) api.hurt(2);
    api.kill(e);
  } else if (action === 'trapper') {
    const active = (s.hazards || []).filter((h) => h.kind === 'mine' && h.ownerId === e.id && !h.dead).length;
    if (active < 2) api.hazard(e.x, e.y, 14, 0, { kind: 'mine', armTime: .8, life: 7, triggerRadius: 28, damage: 1, ownerId: e.id });
    rest(e, .35, 1.6);
  } else if (action === 'summoner') {
    e.summonTotal ||= 0;
    if (livingSummons(s, e) < 2 && e.summonTotal < 4) {
      const child = api.spawn('tiny');
      if (child) { e.summonedIds.push(child.id); e.summonTotal++; api.effect('nova', child.x, child.y, .3, { radius: 20, color: '#ad89e8' }); }
    }
    rest(e, .6, 2.2);
  } else if (action === 'summoner-shot') {
    fire(e, api, e.angle, 180, { color: '#ad89e8' }); rest(e, .45, 1.8);
  } else if (action === 'leech') {
    if (api.distance(e, s.player) <= 175 && e.hp >= e.channelStartHp) {
      const drained = Math.min(25, s.player.novaCharge);
      s.player.novaCharge = Math.max(0, s.player.novaCharge - drained);
      e.hp = Math.min(e.maxHp, e.hp + drained * .32);
      api.effect('leech', e.x, e.y, .35, { x2: s.player.x, y2: s.player.y, color: '#df7299' });
    }
    rest(e, .6, 2);
  } else if (action === 'shieldbearer') {
    e.chainLeft = 0; beginCharge(e, 235, .22);
  } else if (action === 'prism') {
    beginBurst(e, 'prism', 3, .3);
  } else if (action === 'boomerang') {
    for (const offset of [-.16, .16]) fire(e, api, e.angle + offset, 220, { motion: 'boomerang', turnAfter: .7, returnSpeed: 240, returnX: e.x, returnY: e.y, life: 2.4, color: '#f2bc78' });
    rest(e, .45, 1.55);
  } else if (action === 'burrow') {
    e.phase = 'burrow'; e.burrowTime = .65; e.untargetable = true;
    e.burrowX = e.attackX; e.burrowY = e.attackY; e.vx = 0; e.vy = 0;
    api.effect('trail', e.x, e.y, .25, { radius: 14, color: '#b6a2be' });
  } else if (action === 'burrow-ambush') {
    cross(e, api, e.angle, 185, { color: '#b6a2be' }); rest(e, .65, 2.2);
  } else if (action === 'medic') {
    const ally = s.enemies.find((other) => other.id === e.healTarget && alive(other));
    if (ally && e.hp >= e.channelStartHp && api.distance(e, ally) <= 340) {
      ally.hp = Math.min(ally.maxHp, ally.hp + 10);
      api.effect('heal', e.x, e.y, .4, { x2: ally.x, y2: ally.y, color: '#96e9b1' });
    }
    rest(e, .5, 2.8);
  } else if (action === 'frost') {
    for (const offset of [-.2, 0, .2]) fire(e, api, e.angle + offset, 185, { slowFactor: .55, slowDuration: 1.4, color: '#92ddec', style: 'frost' });
    rest(e, .45, 1.4);
  } else if (action === 'duelist' || action === 'sentinel-charge') {
    beginCharge(e, action === 'duelist' ? 390 : 390, action === 'duelist' ? .18 : .36);
  } else if (action === 'sentinel-cross') {
    beginBurst(e, 'sentinel-cross', e.stage === 2 ? 7 : 5, .22);
  } else if (action === 'warden-blink') {
    const point = landing(s, e, api); e.blinkX = point.x; e.blinkY = point.y;
    e.phase = 'blink'; e.blinkTime = .2; e.untargetable = true;
  } else if (action === 'warden-rain') {
    const offsets = e.stage === 2 ? [[0, 0], [-74, 0], [74, 0], [0, -74], [0, 74]] : [[0, 0], [-74, 0], [74, 0]];
    const bottom = s.height - (s.height > s.width ? 175 : 70);
    for (const [dx, dy] of offsets) {
      const x = clamp(e.attackX + dx, 60, s.width - 60), y = clamp(e.attackY + dy, 100, bottom);
      api.hazard(x, y, 36, .95, { kind: 'meteor', ownerId: e.id });
    }
    rest(e, .55, e.stage === 2 ? .3 : .7);
  } else if (action === 'warden-spin') {
    beginBurst(e, 'warden-spin', e.stage === 2 ? 9 : 6, .2);
  } else if (action === 'warden-rage') {
    beginBurst(e, 'warden-rage', 10, .15);
  } else if (action === 'briar-roots') {
    plantThorns(s, e, api);
    if (e.stage === 2) { for (const offset of [-.4, 0, .4]) fire(e, api, e.angle + offset, 170, { color: '#b3cf8f' }); }
    rest(e, .7, .5);
  } else if (action === 'briar-seeds') {
    for (const offset of [-.4, -.2, 0, .2, .4]) fire(e, api, e.angle + offset, 175, { color: '#b3cf8f', life: 4 });
    rest(e, .65, .5);
  } else if (action === 'leviathan-tide') {
    beginBurst(e, action, 3, .38);
  } else if (action === 'leviathan-surf') {
    beginCharge(e, 330, .45);
  } else if (action === 'mirror-split') {
    makeDecoys(s, e, api); rest(e, .65, .5);
  } else if (action === 'mirror-swap') {
    swapDecoy(s, e, api); prepare(s, e, api, 'mirror-shards', .65);
  } else if (action === 'mirror-shards') {
    beginBurst(e, action, e.stage === 2 ? 3 : 2, .35);
  } else if (action === 'kiln-flames') {
    beginBurst(e, action, 5, .25);
  } else if (action === 'kiln-vent') {
    e.coreAngle = e.angle + (e.stage === 2 ? (e.pattern % 2 ? -1 : 1) * Math.PI / 2 : 0);
    rest(e, e.stage === 2 ? 1.7 : 1.3, .4);
    api.effect('nova', e.x, e.y, .4, { radius: 38, color: '#ffd29d' });
  } else if (action === 'tempest-spiral') {
    beginBurst(e, action, 8, .19);
  } else if (action === 'tempest-thunder') {
    for (const offset of [-80, 0, 80]) {
      const x = clamp(e.attackX + offset, 60, s.width - 60);
      const y = clamp(e.attackY + (e.stage === 2 ? offset : 0), 100, s.height - (s.height > s.width ? 175 : 70));
      api.hazard(x, y, 30, .9, { kind: 'lightning', ownerId: e.id });
    }
    rest(e, .55, .3);
  } else if (action === 'eclipse-orbs') {
    for (const offset of [-.35, .35]) fire(e, api, e.angle + offset, 80, { r: 9, homing: .55, sourceId: e.id, style: 'dark-orb', color: '#ac83d8', life: 5 });
    rest(e, .7, .45);
  } else if (action === 'eclipse-blink') {
    if (e.stage === 2) for (const b of s.bullets) if (b.sourceId === e.id && b.style === 'dark-orb') b.dead = true;
    const point = landing(s, e, api); e.blinkX = point.x; e.blinkY = point.y;
    e.phase = 'blink'; e.blinkTime = .25; e.untargetable = true; e.postBlink = 'eclipse-snipe';
  } else if (action === 'eclipse-snipe') {
    beginBurst(e, action, 2, .45);
  } else if (action === 'sovereign-command') {
    commandGuards(s, e, api); beginBurst(e, 'sovereign-formation', e.stage + 2, .3);
  } else if (action === 'sovereign-formation') {
    beginBurst(e, action, 4, .25);
  } else if (action === 'chronarch-stop') {
    beginBurst(e, action, 5, .22);
  } else if (action === 'chronarch-charge') {
    beginCharge(e, 370, e.chronoCrossThrust ? .22 : .3);
  } else rest(e);
}

function updateAction(s, e, dt, api) {
  if (e.phase === 'windup') {
    if ((e.specialAction === 'leech' || e.specialAction === 'medic') && e.hp < e.channelStartHp) {
      api.effect('hit', e.x, e.y, .15, { radius: 16, color: '#e6d5ed' }); rest(e, .6, 1.1); return true;
    }
    e.windup = Math.max(0, e.windup - dt);
    if (e.telegraph) e.telegraph.remaining = e.windup;
    if (e.windup <= 0) release(s, e, api);
    return true;
  }
  if (e.phase === 'recover') {
    e.vx = 0; e.vy = 0; e.recoverTime = Math.max(0, e.recoverTime - dt);
    if (!e.recoverTime) { e.phase = 'chase'; e.cooldown = e.specialCooldown ?? .6; if (e.type === 'kiln') e.coreOpen = false; }
    return true;
  }
  if (e.phase === 'burst') {
    if (e.specialAction === 'tempest-spiral') walk(e, api, api.angleTo(e, s.player) + (e.orbitSign || 1) * Math.PI / 2, 92, dt);
    e.burstTimer -= dt;
    if (e.burstTimer <= 0 && e.burstLeft > 0) {
      const index = e.burstTotal - e.burstLeft;
      if (e.specialAction === 'prism') cross(e, api, e.angle + index * .23, 185, { bounces: 1, style: 'prism', color: '#9ee4de', life: 4 });
      else if (e.specialAction === 'sentinel-cross') cross(e, api, e.angle - .45 + index * .18, e.stage === 2 ? 220 : 195, { color: '#f5a474' });
      else if (e.specialAction === 'warden-spin') cross(e, api, e.angle + index * .3, e.stage === 2 ? 235 : 195, { color: '#d6a4ef' });
      else if (e.specialAction === 'warden-rage') {
        for (let i = 0; i < 3; i++) fire(e, api, e.angle + index * .23 + i * TAU / 3, 240, { color: '#ef799b' });
      } else if (e.specialAction === 'leviathan-tide') {
        for (const offset of [-.38, 0, .38]) fire(e, api, e.angle + offset + (index % 2 ? .14 : -.14), 205, { motion: 'boomerang', turnAfter: .75, returnSpeed: 230, returnX: e.x, returnY: e.y, life: 3.8, color: '#87cbdc' });
      } else if (e.specialAction === 'mirror-shards') {
        cross(e, api, e.angle + index * .28, 215, { bounces: 1, color: '#c3e1ed', style: 'prism', life: 4 });
      } else if (e.specialAction === 'kiln-flames') {
        const side = e.stage === 2 ? (index % 2 ? -1 : 1) : 0;
        const originX = e.x + Math.cos(e.angle + Math.PI / 2) * side * (e.r + 6);
        const originY = e.y + Math.sin(e.angle + Math.PI / 2) * side * (e.r + 6);
        for (const offset of [-.2, 0, .2]) api.bullet(originX, originY, e.angle + offset + (index - 2) * .14, 215, 1, { life: 1.2, r: 7, color: '#ff925c', style: 'flame' });
      } else if (e.specialAction === 'tempest-spiral') {
        for (const phase of [0, Math.PI]) {
          const angle = e.angle + index * .3 + phase;
          fire(e, api, angle, 180, { motion: 'weave', baseAngle: angle, weaveAmplitude: 45, weaveFrequency: 5, weavePhase: phase, color: '#a0dceb' });
        }
      } else if (e.specialAction === 'eclipse-snipe') {
        cross(e, api, e.angle + index * Math.PI / 4, 460, { life: 2.2, color: '#c89de7' });
      } else if (e.specialAction === 'sovereign-formation') {
        const arms = e.stage;
        for (let arm = 0; arm < arms; arm++) for (const offset of [-.17, 0, .17]) fire(e, api, e.angle + arm * TAU / arms + offset + index * .12, 205, { color: '#edc484', life: 3.1 });
      } else if (e.specialAction === 'chronarch-stop') {
        for (const offset of [-.25, 0, .25]) {
          const angle = e.angle + offset + index * .11;
          fire(e, api, angle, 155, { baseAngle: angle, pauseAfter: .32, pauseFor: .9, releaseSpeed: 320, color: '#98e4de', life: 3.7 });
        }
      }
      e.burstLeft--; e.burstTimer += e.burstInterval;
      if (e.burstLeft <= 0) {
        if (e.type === 'leviathan' && e.stage === 2 && e.specialAction === 'leviathan-tide') {
          e.chainLeft = 1; prepare(s, e, api, 'leviathan-surf', .65, api.angleTo(e, s.player) + Math.PI / 2);
        } else if (e.type === 'kiln') {
          e.coreAngle = e.angle + (e.stage === 2 ? Math.PI / 2 : 0); rest(e, 1.25, .45);
        } else rest(e, isBoss(e) ? .75 : .5, isBoss(e) && e.stage === 2 ? .35 : .8);
      }
    }
    return true;
  }
  if (e.phase === 'charge') {
    e.chargeTime = Math.max(0, e.chargeTime - dt);
    const hitWall = walk(e, api, e.angle, e.chargeSpeed, dt);
    if (hitWall || !e.chargeTime) {
      if (e.chainLeft > 0) {
        e.chainLeft--;
        if (e.specialAction === 'chronarch-charge' && !api.blocked(e.rewindX, e.rewindY, e.r) && api.distance({ x: e.rewindX, y: e.rewindY }, s.player) > e.r + s.player.r + 20) {
          const old = { x: e.x, y: e.y }; e.x = e.rewindX; e.y = e.rewindY;
          api.effect('rewind', old.x, old.y, .35, { x2: e.x, y2: e.y, color: '#98e4de' });
        }
        e.chronoCrossThrust = e.specialAction === 'chronarch-charge' && e.stage === 2;
        const angle = api.angleTo(e, s.player) + (e.specialAction === 'leviathan-surf' ? -Math.PI / 2 : e.chronoCrossThrust ? Math.PI / 2 : 0);
        prepare(s, e, api, e.specialAction, e.type === 'duelist' ? .3 : .55, angle);
      }
      else rest(e, e.type === 'duelist' ? .8 : .95, .65);
    }
    return true;
  }
  if (e.phase === 'sidestep') {
    e.sideTime = Math.max(0, e.sideTime - dt);
    walk(e, api, e.sideAngle, 190, dt);
    if (!e.sideTime) { e.chainLeft = 1; prepare(s, e, api, 'duelist', .48); }
    return true;
  }
  if (e.phase === 'burrow') {
    e.burrowTime = Math.max(0, e.burrowTime - dt);
    if (!e.burrowTime) {
      if (!api.blocked(e.burrowX, e.burrowY, e.r)) { e.x = e.burrowX; e.y = e.burrowY; }
      e.untargetable = false;
      prepare(s, e, api, 'burrow-ambush', .6);
    }
    return true;
  }
  if (e.phase === 'blink') {
    e.blinkTime = Math.max(0, e.blinkTime - dt);
    if (!e.blinkTime) {
      api.effect('trail', e.x, e.y, .25, { radius: 27, color: '#d29bee' });
      if (!api.blocked(e.blinkX, e.blinkY, e.r)) { e.x = e.blinkX; e.y = e.blinkY; }
      e.untargetable = false;
      api.effect('nova', e.x, e.y, .35, { radius: 38, color: '#d29bee' });
      if (e.postBlink) { const action = e.postBlink; e.postBlink = null; prepare(s, e, api, action, .75); }
      else rest(e, .5, .25);
    }
    return true;
  }
  return false;
}

function updateSentinel(s, e, dt, api) {
  if (e.hp <= e.maxHp * .5 && e.stage !== 2) {
    e.stage = 2;
    for (let i = 0; i < 2; i++) api.spawn('shieldbearer');
    s.events.push({ type: 'boss-summon', id: e.id, enemyType: e.type, stage: 2 });
  }
  if (updateAction(s, e, dt, api)) return;
  e.angle = api.angleTo(e, s.player); e.cooldown = Math.max(0, (e.cooldown ?? .5) - dt);
  walk(e, api, e.angle, 30, dt);
  if (!e.cooldown) {
    const action = (e.pattern || 0) % 2 === 0 ? 'sentinel-cross' : 'sentinel-charge';
    e.pattern = (e.pattern || 0) + 1;
    if (action === 'sentinel-charge') e.chainLeft = 1;
    prepare(s, e, api, action, action === 'sentinel-charge' ? .9 : .8);
  }
}

function updateWarden(s, e, dt, api) {
  if (e.hp <= e.maxHp * .35 && e.stage !== 2) {
    e.stage = 2; e.untargetable = false;
    prepare(s, e, api, 'warden-rage', 1.05);
    s.events.push({ type: 'boss-rage', id: e.id, enemyType: e.type, stage: 2 });
  }
  if (updateAction(s, e, dt, api)) return;
  e.angle = api.angleTo(e, s.player); e.cooldown = Math.max(0, (e.cooldown ?? .6) - dt);
  walk(e, api, e.angle + Math.PI / 2, 34, dt);
  if (!e.cooldown) {
    const actions = ['warden-blink', 'warden-rain', 'warden-spin'];
    const action = actions[(e.pattern || 0) % actions.length]; e.pattern = (e.pattern || 0) + 1;
    prepare(s, e, api, action, action === 'warden-blink' ? .75 : .8);
  }
}

function beginBossAction(s, e, api, action) {
  let angle = api.angleTo(e, s.player);
  if (action === 'leviathan-surf') { angle += Math.PI / 2; e.chainLeft = e.stage === 2 ? 1 : 0; }
  if (action === 'chronarch-charge') { e.rewindX = e.x; e.rewindY = e.y; e.chainLeft = 1; e.chronoCrossThrust = false; }
  if (e.type === 'tempest') e.orbitSign = e.stage === 2 ? -(e.orbitSign || 1) : 1;
  prepare(s, e, api, action, action === 'chronarch-charge' ? .9 : .8, angle);
}

function updateOtherBoss(s, e, dt, api) {
  const targetStage = e.type === 'sovereign' ? (e.hp <= e.maxHp * .3 ? 3 : e.hp <= e.maxHp * .65 ? 2 : 1) : e.hp <= e.maxHp * .5 ? 2 : 1;
  if (targetStage > (e.stage || 1)) {
    e.stage = targetStage; e.pattern = 0; e.untargetable = false; e.postBlink = null;
    const changeAction = { briar: 'briar-roots', leviathan: 'leviathan-tide', mirror: 'mirror-split', kiln: 'kiln-vent', tempest: 'tempest-thunder', eclipse: 'eclipse-blink', sovereign: targetStage === 3 ? 'sovereign-formation' : 'sovereign-command', chronarch: 'chronarch-charge' }[e.type];
    beginBossAction(s, e, api, changeAction);
    s.events.push({ type: 'boss-stage', id: e.id, enemyType: e.type, stage: targetStage });
  }
  if (updateAction(s, e, dt, api)) return;
  const angle = api.angleTo(e, s.player);
  e.angle = angle; e.cooldown = Math.max(0, (e.cooldown ?? .6) - dt);
  const speed = { briar: 16, leviathan: 35, mirror: 40, kiln: 12, tempest: 80, eclipse: 16, sovereign: 20, chronarch: 35 }[e.type];
  walk(e, api, angle + (['mirror', 'tempest'].includes(e.type) ? (e.orbitSign || 1) * Math.PI / 2 : 0), speed, dt);
  if (e.cooldown) return;
  const patterns = {
    briar: ['briar-roots', 'briar-seeds'],
    leviathan: e.stage === 2 ? ['leviathan-tide'] : ['leviathan-tide', 'leviathan-surf'],
    mirror: e.stage === 2 ? ['mirror-split', 'mirror-swap'] : ['mirror-split', 'mirror-shards'],
    kiln: ['kiln-flames', 'kiln-vent'],
    tempest: ['tempest-spiral', 'tempest-thunder'],
    eclipse: ['eclipse-orbs', 'eclipse-blink'],
    sovereign: e.stage >= 3 ? ['sovereign-formation'] : ['sovereign-command', 'sovereign-formation'],
    chronarch: e.stage === 2 ? ['chronarch-charge', 'chronarch-stop'] : ['chronarch-stop', 'chronarch-charge'],
  }[e.type];
  const action = patterns[(e.pattern || 0) % patterns.length]; e.pattern = (e.pattern || 0) + 1;
  beginBossAction(s, e, api, action);
}

/** Source position is required for directional guarding. DoT/chain/nova have
 * no directional origin and retain their normal damage. Hidden bodies cannot
 * be damaged; they reappear with a fresh visible body windup before attacking. */
export function adjustIncomingDamage(s, e, amount, source, origin = null) {
  void s;
  if (!Number.isFinite(amount) || amount <= 0 || e.untargetable) return 0;
  if (e.type === 'kiln') {
    if (!e.coreOpen) return amount * .35;
    if (e.stage === 2 && source === 'bullet' && origin && Number.isFinite(origin.x) && Number.isFinite(origin.y)) {
      const facing = Math.atan2(origin.y - e.y, origin.x - e.x);
      if (Math.abs(angleDifference(facing, e.coreAngle ?? e.angle ?? 0)) > Math.PI / 3) return amount * .5;
    }
    return amount * 1.75;
  }
  if (e.type !== 'shieldbearer' || source !== 'bullet' || !origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) return amount;
  const facing = Math.atan2(origin.y - e.y, origin.x - e.x);
  return amount * (Math.abs(angleDifference(facing, e.angle || 0)) <= Math.PI * .38 ? .2 : 1.5);
}

export function updateSpecialEnemy(s, e, dt, api) {
  if (!known(e)) return false;
  if (!alive(e) || e.phase === 'spawn' || !Number.isFinite(dt) || dt <= 0) return true;
  dt = Math.min(dt, 1 / 30);
  e.specialAge = (e.specialAge || 0) + dt;
  if (e.type === 'sentinel') { updateSentinel(s, e, dt, api); return true; }
  if (e.type === 'warden') { updateWarden(s, e, dt, api); return true; }
  if (isBoss(e)) { updateOtherBoss(s, e, dt, api); return true; }
  if (updateAction(s, e, dt, api)) return true;
  const angle = api.angleTo(e, s.player), dist = api.distance(e, s.player);
  e.angle = angle; e.cooldown = Math.max(0, (e.cooldown ?? .6) - dt);
  let direction = angle, speed = 0;
  if (e.type === 'bomber') speed = 104;
  else if (e.type === 'shieldbearer') speed = 51;
  else if (e.type === 'leech') speed = dist > 145 ? 88 : 0;
  else if (e.type === 'duelist') speed = dist > 175 ? 80 : 0;
  else if (e.type === 'burrower') speed = 32;
  else if (e.type === 'trapper') { direction += Math.PI / 2; speed = 76; }
  else if (e.type === 'medic') { direction += Math.PI / 2; speed = 48; }
  else { speed = dist < 190 ? -48 : dist > 320 ? 40 : 0; }
  walk(e, api, direction, speed, dt);
  if (e.cooldown > 0) return true;
  if (e.type === 'bomber') {
    if (dist < 100) prepare(s, e, api, 'bomber', .8);
  } else if (e.type === 'leech') {
    if (dist <= 175 && s.player.novaCharge > 0) prepare(s, e, api, 'leech', 1.05);
    else if (dist <= 175) e.cooldown = .4;
  } else if (e.type === 'duelist') {
    e.phase = 'sidestep'; e.sideTime = .22;
    e.sideAngle = angle + (api.random() < .5 ? -1 : 1) * Math.PI / 2;
  } else if (e.type === 'shieldbearer') {
    if (dist < 165) prepare(s, e, api, 'shieldbearer', .7);
  } else if (e.type === 'medic') {
    const target = woundedAlly(s, e, api);
    if (target) { e.healTarget = target.id; prepare(s, e, api, 'medic', .9, api.angleTo(e, target)); }
    else e.cooldown = .5;
  } else if (e.type === 'summoner') {
    const canSummon = livingSummons(s, e) < 2 && (e.summonTotal || 0) < 4;
    prepare(s, e, api, canSummon ? 'summoner' : 'summoner-shot', canSummon ? 1 : .65);
  } else {
    const duration = { weaver: .6, trapper: .45, prism: .8, boomerang: .7, burrower: .55, frost: .7 }[e.type];
    prepare(s, e, api, e.type === 'burrower' ? 'burrow' : e.type, duration);
  }
  return true;
}
