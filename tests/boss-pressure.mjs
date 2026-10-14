/** Deterministic isolated encounter probe. It keeps collision, one-second hit
 * grace and real inputs. Extra HP only prevents early death in a 30s sample;
 * this is a pressure comparison, not evidence of a completed player run. */
import { createRun, step } from '../src/engine.js';
import { BOSS_DEFINITIONS } from '../src/monsters.js';
import { writeFileSync } from 'node:fs';

export function bossFixture(type, { stage = 1, width = 1100, height = 720, seed = 19 } = {}) {
  const state = createRun({ seed, width, height, mapVersion: 2 });
  const definition = BOSS_DEFINITIONS[type];
  const enemy = { ...state.enemies[0], ...definition, type, boss: true, id: 900,
    maxHp: definition.hp, hp: definition.hp * (stage === 3 ? .29 : stage === 2 ? .34 : 1),
    x: width * .5, y: height * .36, phase: 'chase', stage: 1, pattern: 0,
    cooldown: 0, spawnTime: 0 };
  state.enemies = [enemy]; state.obstacles = []; state.interactables = [];
  state.bullets = []; state.hazards = []; state.waveDelay = 0;
  state.player.x = width * .72; state.player.y = height * .65;
  state.player.hp = state.player.maxHp = 1000; state.player.invuln = 0;
  return { state, enemy };
}

export function measureBoss(type, { stage = 1, width = 1100, height = 720, seconds = 30, pilot = 'perimeter' } = {}) {
  const { state: s, enemy: e } = bossFixture(type, { stage, width, height });
  const bottom = height - (height > width ? 200 : 100);
  const points = [[width - 82, bottom], [82, bottom], [82, 138], [width - 82, 138]];
  let target = 0, nearFrames = 0, activeFrames = 0, maxBullets = 0, maxBodies = 0;
  const fired = new Set(), near = new Set(), actions = new Set(), phases = {}, damages = [];
  for (let i = 0; i < seconds * 120; i++) {
    const [x, y] = points[target];
    let dx = x - s.player.x, dy = y - s.player.y, distance = Math.hypot(dx, dy);
    if (distance < 14) target = (target + 1) % points.length;
    const input = pilot === 'idle' ? {} : { moveX: dx / (distance || 1), moveY: dy / (distance || 1) };
    step(s, input, 1 / 120);
    for (const event of s.events) if (event.type === 'player-hit') damages.push(s.time);
    actions.add(e.specialAction); phases[e.phase] = (phases[e.phase] || 0) + 1;
    if (['burst', 'charge'].includes(e.phase)) activeFrames++;
    let threatened = false;
    for (const b of s.bullets) if (b.owner === 'enemy') {
      fired.add(b.id);
      if (Math.hypot(b.x - s.player.x, b.y - s.player.y) < 85) { near.add(b.id); threatened = true; }
    }
    if (s.hazards.some(h => !h.dead && Math.hypot(h.x - s.player.x, h.y - s.player.y) < h.radius + 35)) threatened = true;
    if (Math.hypot(e.x - s.player.x, e.y - s.player.y) < e.r + s.player.r + 60 && e.phase === 'charge') threatened = true;
    if (threatened) nearFrames++;
    maxBullets = Math.max(maxBullets, s.bullets.length); maxBodies = Math.max(maxBodies, s.enemies.length);
  }
  return { type, stage, width, height, pilot, seconds,
    damage: s.stats.damageTaken, emitted: fired.size, closeProjectiles: near.size,
    threatSeconds: Math.round(nearFrames / 120 * 100) / 100,
    attackSeconds: Math.round(activeFrames / 120 * 100) / 100,
    maxBullets, maxBodies, actions: [...actions].filter(Boolean),
    phases: Object.fromEntries(Object.entries(phases).map(([key, n]) => [key, Math.round(n / 120 * 100) / 100])), damages };
}

/** A declared, deterministic avoidance pilot. It reads real threats and emits
 * ordinary movement/dash/nova inputs; it never moves entities or erases shots. */
export function evadeInput(s, previousDash = false) {
  const p = s.player, bottom = s.height - (s.height > s.width ? 150 : 28);
  const directions = [[0, 0], ...Array.from({ length: 16 }, (_, i) => [Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)])];
  const threats = s.bullets.filter(b => b.owner === 'enemy' && Math.hypot(b.x - p.x, b.y - p.y) < 370);
  const candidates = directions.map(([dx, dy]) => {
    let score = 0;
    for (const time of [.12, .28, .46]) {
      const x = p.x + dx * 215 * time, y = p.y + dy * 215 * time;
      const wall = Math.min(x - 28, s.width - 28 - x, y - 66, bottom - y);
      score += Math.max(0, 45 - wall) ** 2 * 5;
      for (const o of s.obstacles) {
        const distance = Math.hypot(x - Math.max(o.x, Math.min(o.x + o.w, x)), y - Math.max(o.y, Math.min(o.y + o.h, y)));
        score += Math.max(0, 33 - distance) ** 2 * 8;
      }
      for (const b of threats) {
        const distance = Math.hypot(x - b.x - b.vx * time, y - b.y - b.vy * time);
        score += Math.max(0, 46 + b.r - distance) ** 2 * 2;
      }
      for (const e of s.enemies) {
        const moving = e.phase === 'charge';
        const distance = Math.hypot(x - e.x - (moving ? e.vx * time : 0), y - e.y - (moving ? e.vy * time : 0));
        score += Math.max(0, e.r + p.r + 24 - distance) ** 2 * 4;
        if (e.phase === 'windup' && e.aimLocked && /charge|surf/.test(e.specialAction)) {
          const advance = Math.max(0, time - e.windup) * 440;
          const chargeDistance = Math.hypot(x - e.x - Math.cos(e.angle) * advance, y - e.y - Math.sin(e.angle) * advance);
          score += Math.max(0, e.r + p.r + 28 - chargeDistance) ** 2 * 4;
        }
      }
      for (const h of s.hazards) if (!h.dead && h.remaining < time + .15) score += Math.max(0, h.radius + p.r + 22 - Math.hypot(x - h.x, y - h.y)) ** 2 * 5;
    }
    // Mild centre preference prevents the no-threat tie from camping a corner.
    score += Math.hypot(p.x + dx * 90 - s.width / 2, p.y + dy * 90 - (66 + bottom) / 2) * .02;
    return { dx, dy, score };
  }).sort((a, b) => a.score - b.score);
  const best = candidates[0];
  const close = threats.filter(b => Math.hypot(b.x - p.x, b.y - p.y) < 120).length;
  return { moveX: best.dx, moveY: best.dy, dash: best.score > 450 && p.dashCooldown <= 0 && !previousDash, nova: close >= 4 && p.novaCharge >= 100 };
}

export function surviveBoss(type, { stage = 1, width = 1100, height = 720, seconds = 30 } = {}) {
  const { state: s, enemy: e } = bossFixture(type, { stage, width, height });
  s.player.hp = s.player.maxHp = 6;
  let input = {}, dashCount = 0, novaCount = 0;
  for (let i = 0; i < seconds * 120 && s.phase === 'combat'; i++) {
    if (i % 6 === 0) input = evadeInput(s, input.dash);
    step(s, input, 1 / 120);
    dashCount += s.events.filter(event => event.type === 'dash').length;
    novaCount += s.events.filter(event => event.type === 'nova').length;
  }
  return { type, stage, width, height, alive: s.player.hp > 0, hp: s.player.hp, damage: s.stats.damageTaken, time: s.time, dashCount, novaCount, bossHp: e.hp };
}

if (process.argv.includes('--survival')) {
  const rows = [];
  for (const [width, height] of [[1100, 720], [420, 1000]]) for (const type of Object.keys(BOSS_DEFINITIONS)) {
    for (const stage of type === 'sovereign' ? [1, 2, 3] : [1, 2]) rows.push(surviveBoss(type, { stage, width, height }));
  }
  const path = process.argv[process.argv.indexOf('--survival') + 1];
  writeFileSync(path, JSON.stringify({ fixture: 'Open arena. 6 HP, real movement/dash/nova, no gunfire; deterministic threat-aware pilot, not human acceptance.', rows }, null, 2), 'utf8');
  console.log(JSON.stringify({ path, survived: rows.filter(r => r.alive).length, samples: rows.length, failures: rows.filter(r => !r.alive) }));
}

if (process.argv.includes('--report')) {
  const rows = [];
  for (const [width, height] of [[1100, 720], [420, 1000]]) for (const type of Object.keys(BOSS_DEFINITIONS)) {
    for (const stage of type === 'sovereign' ? [1, 2, 3] : [1, 2]) {
      for (const pilot of ['idle', 'perimeter']) rows.push(measureBoss(type, { stage, width, height, pilot }));
    }
  }
  const path = process.argv[process.argv.indexOf('--report') + 1];
  writeFileSync(path, JSON.stringify({ fixture: 'Open arena, real step/collision and 1s hit grace, 1000 HP observation fixture, no fire/dash, map v2 held fixed.', rows }, null, 2), 'utf8');
  console.log(JSON.stringify({ path, samples: rows.length, damage: rows.reduce((n, r) => n + r.damage, 0), threatSeconds: rows.reduce((n, r) => n + r.threatSeconds, 0) }));
}
