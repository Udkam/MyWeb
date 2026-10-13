// Original CC0 Ninja Adventure sprites; manifest.json records exact source files.
// Renderer owns no clocks, input, network during rendering, or gameplay state.
const FILES = {
  playerIdle: 'player-idle.png', playerWalk: 'player-walk.png', playerAttack: 'player-attack.png', playerDead: 'player-dead.png',
  slime: 'slime.png', shooter: 'shooter.png', charger: 'charger.png', caster: 'caster.png',
  sentinelIdle: 'sentinel-idle.png', sentinelCharge: 'sentinel-charge.png', sentinelAttack: 'sentinel-attack.png', sentinelJump: 'sentinel-jump.png', sentinelHit: 'sentinel-hit.png',
  wardenIdle: 'warden-idle.png', wardenAttack: 'warden-attack.png', wardenWalk: 'warden-walk.png', wardenHit: 'warden-hit.png',
  floor: 'floor.png', walls: 'walls.png', props: 'dungeon-props.png', decor: 'decor.png',
  fireball: 'fireball.png', energy: 'energy.png', energyBig: 'energy-big.png', impact: 'impact.png', smoke: 'smoke.png', slash: 'slash.png', flame: 'flame.png', staff: 'staff.png', book: 'relic-book.png', coin: 'coin.png',
};
const art = Object.create(null);
let promise;
let backgroundCache;
export const assetStatus = { ready: false, failed: [], loaded: 0, total: Object.keys(FILES).length };
export const AUDIO = Object.freeze(Object.fromEntries(Object.entries({ music: 'music-fight.ogg', dungeon: 'music-dungeon.ogg', shot: 'shot.wav', dash: 'dash.wav', hit: 'hit.wav', death: 'death.wav', relic: 'relic.wav' }).map(([key, name]) => [key, new URL(`./assets/${name}`, import.meta.url).href])));

export async function loadArt() {
  if (promise) return promise;
  promise = Promise.all(Object.entries(FILES).map(([key, file]) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { art[key] = image; assetStatus.loaded += 1; resolve(); };
    image.onerror = () => { assetStatus.failed.push(file); reject(new Error(`Could not load artwork: ${file}`)); };
    image.src = new URL(`./assets/${file}`, import.meta.url).href;
  }))).then(() => { assetStatus.ready = true; return assetStatus; });
  return promise;
}

function sprite(ctx, key, sx, sy, sw, sh, x, y, w, h) {
  const image = art[key];
  if (image) ctx.drawImage(image, sx, sy, sw, sh, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function whole(ctx, key, x, y, w, h) { const image = art[key]; if (image) sprite(ctx, key, 0, 0, image.width, image.height, x, y, w, h); }
function strip(ctx, key, frameSize, count, frame, x, y, size = frameSize * 2, height = size) {
  sprite(ctx, key, ((Math.floor(frame) % count) + count) % count * frameSize, 0, frameSize, frameSize, x - size / 2, y - height / 2, size, height);
}
export function directionColumn(angle = Math.PI / 2) {
  const x = Math.cos(angle), y = Math.sin(angle);
  return Math.abs(x) > Math.abs(y) ? (x < 0 ? 2 : 3) : (y < 0 ? 1 : 0);
}
function actor(ctx, key, e, time, size, moving, reduceMotion) {
  const direction = directionColumn(e.angle);
  const frame = moving && !reduceMotion ? Math.floor(time * 9) % 4 : 0;
  sprite(ctx, key, direction * 16, frame * 16, 16, 16, e.x - size / 2, e.y - size * 0.68, size, size);
}
function shadow(ctx, x, y, rx, ry, opacity = 0.4) {
  ctx.fillStyle = `rgba(4,5,12,${opacity})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function halo(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function nineSlice(ctx, x, y, w, h, green = false) {
  const srcX = green ? 80 : 0, srcY = 96, unit = Math.min(24, w / 3, h / 3);
  // The original wall set has 16px corners around an 80px frame.
  const axisX = [x, x + unit, x + w - unit], axisY = [y, y + unit, y + h - unit];
  const sizesX = [unit, w - unit * 2, unit], sizesY = [unit, h - unit * 2, unit];
  for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) {
    // Keep the hollow center clear: stone floor below remains visible.
    if (row === 1 && col === 1) continue;
    const sw = col === 1 ? 16 : 16, sh = row === 1 ? 16 : 16;
    sprite(ctx, 'walls', srcX + [0, 16, 64][col], srcY + [0, 16, 64][row], sw, sh, axisX[col], axisY[row], sizesX[col], sizesY[row]);
  }
}

function makeBackdrop(state) {
  const width = Math.ceil(state.width), height = Math.ceil(state.height);
  const key = `${width}:${height}:${state.room}:${state.seed}`;
  if (backgroundCache?.key === key) return backgroundCache.canvas;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#101016'; ctx.fillRect(0, 0, width, height);
  const unit = 32, inset = 24;
  ctx.save(); ctx.beginPath(); ctx.rect(inset, inset, width - inset * 2, height - inset * 2); ctx.clip();
  for (let y = 16; y < height; y += unit) for (let x = 16; x < width; x += unit) {
    let hash = Math.imul(Math.floor(x / unit) + 71, 374761393) ^ Math.imul(Math.floor(y / unit) + (state.room || 1) * 13, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
    const sx = [208, 224, 240, 256, 272, 208, 224][hash % 7];
    sprite(ctx, 'floor', sx, 224, 16, 16, x, y, unit, unit);
  }
  ctx.fillStyle = 'rgba(18,17,30,.32)'; ctx.fillRect(0, 0, width, height);
  // Restrained geometric inlays distinguish the playable crypt from the void.
  ctx.strokeStyle = 'rgba(151,131,122,.18)'; ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, width - 112, height - 112);
  const cx = width / 2, cy = height * 0.48;
  ctx.strokeStyle = 'rgba(118,166,160,.09)'; ctx.lineWidth = 3;
  for (const r of [66, 82]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70); ctx.lineTo(cx + Math.cos(a) * 78, cy + Math.sin(a) * 78); ctx.stroke();
  }
  ctx.restore();
  // Repeated corner and edge tiles, not a stretched solid-color rectangle.
  for (let x = 24; x < width - 24; x += 32) {
    sprite(ctx, 'walls', 16, 96, 16, 16, x, 8, 32, 32);
    sprite(ctx, 'walls', 16, 160, 16, 16, x, height - 34, 32, 32);
  }
  for (let y = 36; y < height - 32; y += 32) {
    sprite(ctx, 'walls', 0, 112, 16, 16, 8, y, 24, 32);
    sprite(ctx, 'walls', 64, 112, 16, 16, width - 32, y, 24, 32);
  }
  for (const [sx, sy, x, y] of [[0,96,8,8],[64,96,width-40,8],[0,160,8,height-40],[64,160,width-40,height-40]]) sprite(ctx, 'walls', sx, sy, 16, 16, x, y, 32, 32);
  // Wall sockets and a small number of original environment props live outside combat lanes.
  for (const x of [Math.min(124, width * .22), width - Math.min(124, width * .22)]) {
    sprite(ctx, 'props', 32, 32, 16, 16, x - 12, 21, 24, 24);
    halo(ctx, x, 51, 116, 'rgba(238,128,59,.17)');
  }
  const shade = ctx.createRadialGradient(cx, height * .48, width * .12, cx, height * .48, Math.max(width, height) * .72);
  shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(4,5,12,.5)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
  backgroundCache = { key, canvas }; return canvas;
}

function drawObstacle(ctx, o) {
  const x = o.x, y = o.y, w = o.w, h = o.h;
  // Collision footprint is exactly x/y/w/h; the small cast shadow does not imply collision.
  ctx.fillStyle = 'rgba(2,3,9,.45)'; ctx.fillRect(x + 7, y + 9, w, h);
  ctx.fillStyle = '#24202c'; ctx.fillRect(x, y, w, h);
  for (let dy = 0; dy < h; dy += 24) for (let dx = 0; dx < w; dx += 24) {
    const tw = Math.min(24, w - dx), th = Math.min(24, h - dy);
    sprite(ctx, 'floor', 208, 224, 16, 16, x + dx, y + dy, tw, th);
  }
  nineSlice(ctx, x, y, w, h);
  ctx.fillStyle = 'rgba(14,10,23,.26)'; ctx.fillRect(x + 3, y + h * .60, w - 6, h * .4);
}
function drawTelegraph(ctx, e, reduceMotion) {
  const t = e.telegraph;
  if (!t || e.phase !== 'windup') return;
  const progress = 1 - Math.max(0, e.windup || 0) / Math.max(.001, e.windupMax || 1);
  const angle = Number.isFinite(t.angle) ? t.angle : e.angle || 0;
  const range = Math.max(10, t.range || 160), width = t.width || 28;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(angle);
  ctx.strokeStyle = '#ffba7b'; ctx.fillStyle = 'rgba(246,107,59,.14)'; ctx.lineWidth = 2;
  if (t.kind === 'line') {
    ctx.fillRect(0, -width / 2, range, width); ctx.strokeRect(0, -width / 2, range, width);
    ctx.fillStyle = 'rgba(255,159,82,.25)'; ctx.fillRect(0, -width / 2, range * progress, width);
  } else if (t.kind === 'fan') {
    const spread = t.spread || 1.1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, range, -spread / 2, spread / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, range, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffdb9e'; ctx.beginPath(); ctx.arc(0, 0, range, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
  }
  ctx.restore();
  // This remains visible with reduced motion: it communicates an incoming attack.
  ctx.strokeStyle = '#ffcc85'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 9, 0, Math.PI * 2); ctx.stroke();
}
function drawEnemy(ctx, e, time, reduceMotion) {
  const boss = e.type === 'sentinel' || e.type === 'warden';
  const size = boss ? Math.max(e.r * 2.7, e.type === 'warden' ? 108 : 94) : Math.max(32, e.r * 2.7);
  shadow(ctx, e.x, e.y + e.r * .5, size * .33, size * .13);
  ctx.save();
  if (e.phase === 'spawn') ctx.globalAlpha = .62;
  if (e.type === 'sentinel') {
    let key = 'sentinelIdle', count = 5, frame = time * 7;
    if (e.phase === 'windup') { key = 'sentinelCharge'; count = 7; frame = (1 - e.windup / Math.max(.01, e.windupMax || 1)) * 6; }
    else if (e.phase === 'charge') { key = 'sentinelJump'; count = 6; frame = time * 12; }
    else if (e.phase === 'recover') { key = 'sentinelAttack'; count = 3; }
    if (e.hitFlash > 0 && !reduceMotion) { key = 'sentinelHit'; count = 3; frame = Math.min(2, (1 - e.hitFlash / .1) * 3); }
    strip(ctx, key, 40, count, reduceMotion ? 0 : frame, e.x, e.y - size * .15, size);
  } else if (e.type === 'warden') {
    let key = 'wardenIdle', unit = 68, count = 6, frame = time * 7;
    if (e.phase === 'charge') { key = 'wardenWalk'; unit = 82; count = 10; frame = time * 12; }
    else if (e.phase === 'windup' || e.phase === 'recover') { key = 'wardenAttack'; unit = 82; count = 15; frame = time * 11; }
    if (e.hitFlash > 0 && !reduceMotion) { key = 'wardenHit'; unit = 68; count = 8; frame = Math.min(7, (1 - e.hitFlash / .1) * 8); }
    strip(ctx, key, unit, count, reduceMotion ? 0 : frame, e.x, e.y - size * .18, size);
  } else {
    actor(ctx, FILES[e.type] ? e.type : 'slime', e, time + (Number(e.id) || 0) * .17, size, true, reduceMotion);
  }
  ctx.restore();
  if (e.hitFlash > 0 && !reduceMotion) {
    ctx.strokeStyle = '#fff1ba'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2); ctx.stroke();
  }
  if (!e.decorative && (boss || e.hp < e.maxHp)) {
    const bw = boss ? Math.min(100, size) : 30, y = e.y - size * .69 - 7;
    ctx.fillStyle = '#100c1c'; ctx.fillRect(e.x - bw / 2 - 1, y - 1, bw + 2, boss ? 7 : 5);
    ctx.fillStyle = boss ? '#ef9c61' : '#b487c4'; ctx.fillRect(e.x - bw / 2, y, bw * Math.max(0, e.hp / e.maxHp), boss ? 5 : 3);
  }
  if (e.burnTime > 0) {
    const frame = reduceMotion ? 2 : 2 + Math.floor(time * 9) % 3;
    sprite(ctx, 'flame', frame * 25, 0, 25, 30, e.x - 12, e.y - 4, 25, 30);
  }
  if (e.coldTime > 0 || (boss && e.stage === 2)) {
    ctx.strokeStyle = e.coldTime > 0 ? '#8ddbe5' : '#d3a0de'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * .4, e.r + 5, e.r * .45, 0, 0, Math.PI * 2); ctx.stroke();
  }
}
function drawPlayer(ctx, player, state, reduceMotion) {
  const size = Math.max(34, player.r * 2.7), t = state.time;
  const moving = Math.hypot(player.vx || 0, player.vy || 0) > 1;
  shadow(ctx, player.x, player.y + 6, 15, 5, .52);
  // Cyan feet ring separates the red-robed player from warm projectiles and gray monsters.
  ctx.strokeStyle = player.dashTime > 0 ? '#d1ffef' : '#82d0c6'; ctx.lineWidth = player.dashTime > 0 ? 3 : 1.5;
  ctx.beginPath(); ctx.ellipse(player.x, player.y + 5, 15, 6, 0, 0, Math.PI * 2); ctx.stroke();
  if (player.invuln > 0) { ctx.strokeStyle = '#b2e9e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(player.x, player.y, player.r + 10, 0, Math.PI * 2); ctx.stroke(); }
  if (state.phase === 'dead') { whole(ctx, 'playerDead', player.x - size / 2, player.y - size / 2, size, size); return; }
  ctx.save(); if (player.dashTime > 0) ctx.globalAlpha = .78;
  const key = moving ? 'playerWalk' : (player.fireCooldown > 0 ? 'playerAttack' : 'playerIdle');
  actor(ctx, key, player, t, size, moving, reduceMotion); ctx.restore();
  // The wand is an original detached weapon sprite, rotated around the firing hand.
  ctx.save(); ctx.translate(player.x, player.y - 3); ctx.rotate((player.angle || 0) + Math.PI / 2);
  whole(ctx, 'staff', -5, -25, 10, 20); ctx.restore();
  const a = player.angle || 0; ctx.strokeStyle = 'rgba(156,235,218,.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(player.x, player.y, player.r + 17, a - .22, a + .22); ctx.stroke();
}
function drawBullet(ctx, b, time, reduceMotion) {
  const player = b.owner === 'player', size = Math.max(player ? 13 : 15, b.r * 3.2);
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 4);
  // Player flame vs enemy cold orb differ in silhouette as well as their colors.
  const key = player ? 'fireball' : 'energy';
  strip(ctx, key, 16, 4, reduceMotion ? 0 : time * 12, 0, 0, size);
  if (!player) { ctx.strokeStyle = '#33294d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, Math.max(4, b.r + 1), 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function drawEffect(ctx, e, reduceMotion) {
  const ratio = Math.max(0, Math.min(1, (e.life || 0) / Math.max(.001, e.maxLife || e.life || 1)));
  const frame = 1 - ratio;
  ctx.save();
  if (e.type === 'nova') {
    ctx.strokeStyle = e.color || '#a2eee0'; ctx.lineWidth = 3; ctx.globalAlpha = Math.max(.18, ratio);
    ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(4, e.radius || 110) * (reduceMotion ? 1 : .2 + frame * .8), 0, Math.PI * 2); ctx.stroke();
  } else if (e.type === 'lightning') {
    ctx.strokeStyle = '#bff8e8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x2 ?? e.x, e.y2 ?? e.y); ctx.stroke();
  } else if (e.type === 'blade') {
    strip(ctx, 'slash', 32, 4, frame * 3, e.x, e.y, Math.max(28, (e.radius || 16) * 2));
  } else if (!reduceMotion) {
    ctx.globalAlpha = ratio;
    if (e.type === 'death') strip(ctx, 'smoke', 32, 6, Math.min(5, frame * 6), e.x, e.y, 46);
    else if (e.type === 'hit') strip(ctx, 'impact', 40, 9, Math.min(8, frame * 9), e.x, e.y, 25);
    else if (e.type === 'trail') strip(ctx, 'fireball', 16, 4, frame * 3, e.x, e.y, 22);
    else if (e.type === 'ember') { ctx.fillStyle = e.color || '#ffa869'; ctx.fillRect(e.x - 1, e.y - 1, 3, 3); }
  }
  ctx.restore();
}
function drawGates(ctx, state, reduceMotion) {
  if (state.phase !== 'exit') return;
  for (const gate of state.gates || []) {
    const refuge = gate.route === 'refuge', color = refuge ? '#8ad7c3' : '#eda477';
    halo(ctx, gate.x, gate.y, 58, refuge ? 'rgba(90,214,176,.22)' : 'rgba(245,119,53,.22)');
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(gate.x, gate.y, gate.r + 6, gate.r * .55 + 4, 0, 0, Math.PI * 2); ctx.stroke();
    sprite(ctx, 'props', refuge ? 112 : 96, 32, 16, 16, gate.x - 18, gate.y - 28, 36, 36);
    ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const label = refuge ? 'REFUGE +1 HP' : 'HUNT +EMBERS'; const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(13,16,25,.9)'; ctx.fillRect(gate.x - tw / 2 - 8, gate.y + 21, tw + 16, 23);
    ctx.fillStyle = color; ctx.fillText(label, gate.x, gate.y + 25);
  }
}

export function render(ctx, state, { width, height, dpr = 1, reduceMotion = false, title = false } = {}) {
  if (!state || !ctx) return;
  width ||= state.width; height ||= state.height;
  // Promotional title tableau uses only original sprites. It is a render-only
  // composition, not a fake live encounter or mutation of the dormant run.
  const titleTableau = title && width >= height;
  if (titleTableau) {
    const scale = width / state.width;
    state = { ...state,
      player: { ...state.player, x: state.width * .76, y: state.height * .73, r: (Math.round(96 / scale / 16) * 16) / 2.7, angle: -1.36, vx: 0, vy: 0, fireCooldown: 1, invuln: 0 },
      enemies: [{ id: 'title-warden', type: 'warden', x: state.width * .80, y: state.height * .38, r: 260 / scale / 2.7, hp: 1, maxHp: 1, angle: 1.6, phase: 'chase', decorative: true }],
      bullets: [], effects: [], pickups: [],
    };
  }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#111019'; ctx.fillRect(0, 0, width, height);
  if (!assetStatus.ready) { ctx.restore(); return; }
  ctx.scale(width / state.width, height / state.height);
  if (!reduceMotion && !title && state.shake > 0) {
    const n = Math.min(4, state.shake * 5); ctx.translate(Math.sin(state.time * 73) * n, Math.cos(state.time * 91) * n);
  }
  ctx.drawImage(makeBackdrop(state), 0, 0);
  if (titleTableau) {
    halo(ctx, state.width * .80, state.height * .40, 210, 'rgba(119,101,197,.22)');
    halo(ctx, state.player.x, state.player.y, 150, 'rgba(255,152,78,.22)');
    ctx.strokeStyle = 'rgba(143,180,194,.30)'; ctx.lineWidth = 2;
    for (const radius of [78, 95]) { ctx.beginPath(); ctx.ellipse(state.width * .80, state.height * .46, radius, radius * .35, 0, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 3; i += 1) {
      const x = state.player.x + i * 15, y = state.player.y - 100 - i * 64;
      strip(ctx, 'fireball', 16, 4, reduceMotion ? 1 : state.time * 8 + i, x, y, 27);
    }
    strip(ctx, 'energyBig', 24, 4, reduceMotion ? 1 : state.time * 7, state.width * .91, state.height * .48, 38);
    strip(ctx, 'energyBig', 24, 4, reduceMotion ? 1 : state.time * 7 + 2, state.width * .67, state.height * .41, 32);
  }
  for (const x of [Math.min(124, state.width * .22), state.width - Math.min(124, state.width * .22)]) {
    const frame = reduceMotion ? 2 : 2 + Math.floor(state.time * 7 + x) % 3;
    sprite(ctx, 'flame', frame * 25, 0, 25, 30, x - 15, 19, 30, 36);
  }
  drawGates(ctx, state, reduceMotion);
  for (const pickup of state.pickups || []) {
    const bob = reduceMotion ? 0 : Math.sin(state.time * 4 + pickup.x) * 2;
    shadow(ctx, pickup.x, pickup.y + 4, 6, 2, .3);
    whole(ctx, 'coin', pickup.x - 7, pickup.y - 8 + bob, 14, 14);
  }
  for (const e of state.enemies || []) drawTelegraph(ctx, e, reduceMotion);
  const layers = (state.obstacles || []).map(o => ({ y: o.y + o.h, obstacle: o }));
  for (const e of state.enemies || []) layers.push({ y: e.y, enemy: e });
  layers.push({ y: state.player.y, player: state.player });
  layers.sort((a, b) => a.y - b.y);
  for (const layer of layers) {
    if (layer.obstacle) drawObstacle(ctx, layer.obstacle);
    else if (layer.enemy) drawEnemy(ctx, layer.enemy, state.time, reduceMotion);
    else drawPlayer(ctx, layer.player, state, reduceMotion);
  }
  for (const b of state.bullets || []) drawBullet(ctx, b, state.time, reduceMotion);
  for (const e of state.effects || []) drawEffect(ctx, e, reduceMotion);
  ctx.restore();
}

export function drawRelicIcon(ctx, id, x, y, size = 32) {
  if (!assetStatus.ready) return;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (/nova|chain|seek|cold/i.test(id)) strip(ctx, 'energyBig', 24, 4, 1, x + size / 2, y + size / 2, size);
  else if (/burn|explos|dash/i.test(id)) strip(ctx, 'fireball', 16, 4, 1, x + size / 2, y + size / 2, size);
  else if (/blade|pierc|split/i.test(id)) strip(ctx, 'slash', 32, 4, 1, x + size / 2, y + size / 2, size);
  else whole(ctx, 'book', x + size * .15, y + size * .15, size * .7, size * .7);
  ctx.restore();
}
