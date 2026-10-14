// Original CC0 Ninja Adventure sprites; manifest.json records exact source files.
// Renderer owns no clocks, input, network during rendering, or gameplay state.
import { t } from './i18n.js';
const FILES = {
  playerIdle: 'player-idle.png', playerWalk: 'player-walk.png', playerAttack: 'player-attack.png', playerDead: 'player-dead.png',
  slime: 'slime.png', shooter: 'shooter.png', charger: 'charger.png', caster: 'caster.png',
  sniper: 'sniper.png', orbiter: 'orbiter.png', brood: 'brood.png', meteor: 'meteor.png', tiny: 'tiny.png',
  weaver: 'weaver.png', bomber: 'bomber.png', trapper: 'trapper.png', summoner: 'summoner.png', leech: 'leech.png', shieldbearer: 'shieldbearer.png',
  prism: 'prism.png', boomerang: 'boomerang.png', burrower: 'burrower.png', medic: 'medic.png', frost: 'frost.png', duelist: 'duelist.png',
  traveler: 'traveler.png', ghost: 'ghost.png', interior: 'crypt-interior.png', bomb: 'bomb.png', iceSpike: 'ice-spike.png', shuriken: 'shuriken.png', rock: 'rock.png',
  sentinelIdle: 'sentinel-idle.png', sentinelCharge: 'sentinel-charge.png', sentinelAttack: 'sentinel-attack.png', sentinelJump: 'sentinel-jump.png', sentinelHit: 'sentinel-hit.png',
  wardenIdle: 'warden-idle.png', wardenAttack: 'warden-attack.png', wardenWalk: 'warden-walk.png', wardenHit: 'warden-hit.png',
  floor: 'floor.png', walls: 'walls.png', props: 'dungeon-props.png', decor: 'decor.png',
  fireball: 'fireball.png', energy: 'energy.png', energyBig: 'energy-big.png', impact: 'impact.png', smoke: 'smoke.png', slash: 'slash.png', flame: 'flame.png', staff: 'staff.png', book: 'relic-book.png', coin: 'coin.png',
};
// Dedicated original Boss atlases include rectangular cells; never infer frame width from image height.
export const BOSS_ANIMATIONS = Object.freeze({
  sentinel: { idle: [40,40,5], charge: [40,40,7], attack: [40,40,3], jump: [40,40,6], hit: [40,40,3] },
  warden: { idle: [68,68,6], attack: [82,82,15], walk: [82,82,10], hit: [68,68,8] },
  briar: {idle: [62, 62, 6], charge: [62, 62, 3], attack: [62, 62, 5], hit: [62, 62, 4]},
  leviathan: {idle: [76, 79, 4], attack: [76, 79, 6], shoot: [76, 79, 5], hit: [76, 79, 4]},
  mirror: {idle: [62, 52, 5], jump: [62, 52, 13], hit: [62, 52, 5]},
  kiln: {idle: [50, 50, 5], hit: [50, 50, 3]},
  tempest: {idle: [96, 48, 6], chargeleft: [96, 96, 3], attackleft: [96, 96, 4], walk: [96, 48, 6], hit: [96, 48, 4], chargeright: [96, 96, 3], attackright: [96, 96, 4]},
  eclipse: {idle: [50, 50, 5], walk: [50, 50, 6], hit: [50, 50, 3]},
  sovereign: {idle: [60, 60, 6], charge: [60, 60, 2], attack: [60, 60, 4], jump: [60, 60, 5]},
  chronarch: {idle: [50, 50, 5], hit: [50, 50, 3]}
});
for(const [type,poses] of Object.entries(BOSS_ANIMATIONS)) for(const pose of Object.keys(poses)) {
  const oldKey=`${type}${pose[0].toUpperCase()}${pose.slice(1)}`;
  if(FILES[oldKey]) delete FILES[oldKey];
  FILES[`${type}_${pose}`]=`${type}-${pose}.png`;
}
Object.assign(FILES,{outdoorFloor:'outdoor-floor.png',water:'water.png',nature:'nature.png',floorDetail:'floor-detail.png',hole:'hole.png',thunder:'thunder.png',purpleRipples:'purple-ripples.png'});
const art = Object.create(null);
let promise;
let backgroundCache;
export const assetStatus = { ready: false, failed: [], loaded: 0, total: Object.keys(FILES).length };
export const AUDIO = Object.freeze(Object.fromEntries(Object.entries({ music: 'music-fight.ogg', dungeon: 'music-dungeon.ogg', mire: 'music-aquatic.ogg', cinder: 'music-dark-castle.ogg', storm: 'music-tension.ogg', void: 'music-final-area.ogg', rift: 'music-dream.ogg', shot: 'shot.wav', dash: 'dash.wav', hit: 'hit.wav', death: 'death.wav', relic: 'relic.wav' }).map(([key, name]) => [key, new URL(`./assets/${name}`, import.meta.url).href])));

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
  const width = Math.ceil(state.width), height = Math.ceil(state.height), biome = state.biome || 'hollow', warm = biome === 'cinder';
  const layout = state.layout || 'pillar-court';
  const key = `${width}:${height}:${state.room}:${state.seed}:${layout}:${biome}`;
  if (backgroundCache?.key === key) return backgroundCache.canvas;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#10151b'; ctx.fillRect(0, 0, width, height);
  const unit = 32, inset = 24, cx = width / 2, cy = height * .48;
  ctx.save(); ctx.beginPath(); ctx.rect(inset, inset, width - inset * 2, height - inset * 2); ctx.clip();
  for (let y = 16; y < height; y += unit) for (let x = 16; x < width; x += unit) {
    let hash = Math.imul(Math.floor(x / unit) + 71, 374761393) ^ Math.imul(Math.floor(y / unit) + (state.room || 1) * 13, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
    // Interior cells only: edge/corner tiles must never repeat through the walking surface.
    if (biome === 'mire') sprite(ctx, 'outdoorFloor',16,128,16,16,x,y,unit,unit);
    else if (biome === 'storm') sprite(ctx,'outdoorFloor',16,352,16,16,x,y,unit,unit);
    else if (biome === 'rift') sprite(ctx,'water',224,112,16,16,x,y,unit,unit);
    else sprite(ctx, 'floor', [256,272][hash % 2],208,16,16,x,y,unit,unit);
  }
  // All floor motifs are original atlas crops. They are decorative, not collision or attack areas.
  ctx.fillStyle = {hollow:'rgba(12,26,31,.13)',mire:'rgba(10,27,24,.42)',cinder:'rgba(36,14,19,.16)',storm:'rgba(14,32,60,.55)',void:'rgba(24,13,42,.27)',rift:'rgba(29,12,43,.49)'}[biome] || 'rgba(12,26,31,.13)'; ctx.fillRect(0, 0, width, height);
  const slab = (x, y, size = 80) => {
    ctx.save(); ctx.globalAlpha = warm ? .22 : .32;
    sprite(ctx, 'floor', 176, warm ? 0 : 96, 48, 48, x - size / 2, y - size / 2, size, size); ctx.restore();
  };
  const runner = (x, y, length, vertical = false) => {
    ctx.save(); ctx.globalAlpha = warm ? .20 : .28;
    for (let d = 0; d < length; d += 32) sprite(ctx, 'floor', vertical ? 224 : 192, (warm ? 0 : 96) + (vertical ? 16 : 48), 16, 16, x + (vertical ? 0 : d), y + (vertical ? d : 0), vertical ? 32 : Math.min(32, length - d), vertical ? Math.min(32, length - d) : 32);
    ctx.restore();
  };
  if (layout === 'side-cloisters') {
    runner(width * .21, 70, height - 126, true); runner(width * .73, 70, height - 126, true);
    slab(cx, cy, Math.min(132, width * .3));
  } else if (layout === 'crossroads') {
    runner(52, cy - 16, width - 104); runner(cx - 16, 70, height - 126, true); slab(cx, cy, 104);
  } else if (layout === 'broken-hall') {
    for (const [x,y,size] of [[.26,.26,68],[.51,.47,90],[.76,.70,68]]) slab(width*x,height*y,size);
    runner(width * .16, height * .69, width * .3); runner(width * .58, height * .26, width * .26);
  } else if (layout === 'altar-ring') {
    ctx.save(); ctx.globalAlpha = .28;
    const size = Math.min(204, width * .47); sprite(ctx, 'floor', 240, warm ? 0 : 96, 64, 64, cx - size / 2, cy - size / 2, size, size); ctx.restore();
    for (const [x,y] of [[.24,.26],[.76,.26],[.24,.72],[.76,.72]]) slab(width*x,height*y,64);
  } else if (layout === 'twin-halls') {
    runner(width * .25, 80, height - 148, true); runner(width * .69, 80, height - 148, true);
    slab(width * .29, height * .28, 76); slab(width * .73, height * .69, 76);
  } else {
    runner(52, height * .28, width - 104); runner(52, height * .69, width - 104); slab(cx, cy, Math.min(136, width * .32));
  }
  // Small original rubble and wall niches make the six rooms feel inhabited without filling combat lanes.
  for (let i = 0; i < 12; i++) {
    const hash = ((state.seed || 1) + i * 173 + (state.room || 1) * 91) >>> 0;
    const side = i % 2, x = side ? width - 45 - hash % 22 : 34 + hash % 22, y = 92 + (hash * 7 % Math.max(1, height - 182));
    ctx.globalAlpha = .52; whole(ctx, 'rock', x, y, 17 + i % 3 * 3, 17 + i % 3 * 3); ctx.globalAlpha = 1;
  }
  if (biome === 'mire') {
    for (const [x,y] of [[34,110],[width-84,height*.53],[36,height*.73]]) sprite(ctx,'nature',64,0,32,32,x,y,60,60);
    for (const [x,y] of [[42,height*.34],[width-66,height*.78]]) sprite(ctx,'floorDetail',16,32,16,16,x,y,30,30);
  } else if (biome === 'storm') {
    for (const [x,y] of [[30,110],[width-72,height*.57],[30,height*.76]]) sprite(ctx,'nature',32,192,32,32,x,y,48,48);
    for (const [x,y] of [[40,height*.44],[width-62,height*.24]]) sprite(ctx,'nature',64,192,16,16,x,y,28,28);
  } else if (biome === 'void') {
    for (const [x,y] of [[44,height*.44],[width-64,height*.28]]) sprite(ctx,'floorDetail',192,0,32,16,x,y,38,19);
  } else if (biome === 'rift') {
    for (const [x,y] of [[38,105],[width-77,height*.58],[36,height*.76]]) sprite(ctx,'nature',32,224,16,16,x,y,35,35);
    for (const [x,y] of [[width*.32,height*.30],[width*.68,height*.65]]) { ctx.globalAlpha=.19;sprite(ctx,'purpleRipples',0,0,16,16,x,y,50,50);ctx.globalAlpha=1; }
  }
  ctx.restore();
  const wallX = biome === 'hollow' || biome === 'mire' ? 80 : 0;
  for (let x = 24; x < width - 24; x += 32) {
    sprite(ctx, 'walls', wallX + 16, 96, 16, 16, x, 8, 32, 32);
    sprite(ctx, 'walls', wallX + 16, 160, 16, 16, x, height - 34, 32, 32);
  }
  for (let y = 36; y < height - 32; y += 32) {
    sprite(ctx, 'walls', wallX, 112, 16, 16, 8, y, 24, 32);
    sprite(ctx, 'walls', wallX + 64, 112, 16, 16, width - 32, y, 24, 32);
  }
  for (const [sx,sy,x,y] of [[0,96,8,8],[64,96,width-40,8],[0,160,8,height-40],[64,160,width-40,height-40]]) sprite(ctx,'walls',wallX+sx,sy,16,16,x,y,32,32);
  const insetX = Math.min(124, width * .22);
  for (const x of [insetX, width - insetX]) {
    sprite(ctx, 'props', 32, 32, 16, 16, x - 12, 21, 24, 24);
    halo(ctx, x, 66, 150, warm ? 'rgba(252,145,71,.25)' : 'rgba(162,196,135,.19)');
  }
  for (const y of [height * .30, height * .68]) {
    sprite(ctx,'interior',warm ? 80 : 208,176,16,16,12,y,25,25);
    sprite(ctx,'interior',warm ? 80 : 208,176,16,16,width-37,y,25,25);
  }
  const shade = ctx.createRadialGradient(cx, cy, Math.min(width,height) * .22, cx, cy, Math.max(width,height) * .7);
  shade.addColorStop(0,'rgba(0,0,0,0)'); shade.addColorStop(1,'rgba(4,7,16,.31)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
  backgroundCache={key,canvas}; return canvas;
}

function drawObstacle(ctx, o, warm) {
  const { x,y,w,h }=o, green=!warm;
  // The visible solid footprint stays exactly aligned with the engine rectangle.
  ctx.fillStyle='rgba(2,5,10,.48)';ctx.fillRect(x+7,y+9,w,h);
  ctx.fillStyle=warm?'#39313b':'#323f36';ctx.fillRect(x,y,w,h);
  if(o.kind==='thorn') {
    ctx.fillStyle='#233626';ctx.fillRect(x,y,w,h);
    for(let dx=0;dx<w;dx+=16)sprite(ctx,'nature',176,128,16,32,x+dx,y-20,Math.min(24,w-dx+6),h+20);
    return;
  }
  if(o.kind==='rubble') {
    ctx.fillStyle=warm?'#393039':'#344039';ctx.fillRect(x,y,w,h);
    for(let dy=0;dy<h;dy+=22) for(let dx=0;dx<w;dx+=22) {
      const size=Math.min(30,w-dx+5,h-dy+5);whole(ctx,'rock',x+dx-2,y+dy-2,size,size);
    }
    ctx.fillStyle='rgba(6,9,15,.20)';ctx.fillRect(x,y+h-5,w,5);return;
  }
  for(let dy=0;dy<h;dy+=24) for(let dx=0;dx<w;dx+=24) sprite(ctx,'floor',208,224,16,16,x+dx,y+dy,Math.min(24,w-dx),Math.min(24,h-dy));
  nineSlice(ctx,x,y,w,h,green);
  if(o.kind==='pillar') {
    const size=Math.max(16,Math.min(w-8,h-8,40));
    sprite(ctx,'walls',green?112:32,128,16,16,x+(w-size)/2,y+(h-size)/2,size,size);
  } else if(o.kind==='altar') {
    const size=Math.min(w*.72,h*.72,48);sprite(ctx,'props',warm?96:64,32,16,16,x+(w-size)/2,y+(h-size)/2-3,size,size);
  } else {
    const ix=warm?32:160;
    for(let dx=8;dx<w-24;dx+=40) sprite(ctx,'interior',ix,240,16,16,x+dx,y+4,24,Math.min(24,h-8));
  }
  ctx.fillStyle='rgba(7,9,16,.28)';ctx.fillRect(x+3,y+h-7,Math.max(0,w-6),5);
}

// Ordinary attack geometry is intentionally never painted onto the ground.
// Windups communicate through the enemy's own light and original energy animation.
function drawWindup(ctx,e,time,reduceMotion) {
  if(e.phase!=='windup'||e.type==='burrower'&&e.untargetable) return;
  const progress=1-Math.max(0,e.windup||0)/Math.max(.001,e.windupMax||1);
  const color=e.type==='medic'?'rgba(145,238,154,.27)':e.type==='frost'?'rgba(128,217,244,.25)':'rgba(255,180,101,.28)';
  halo(ctx,e.x,e.y-e.r*.65,e.r+13+progress*8,color);
  strip(ctx,'energyBig',24,4,reduceMotion?1:time*9,e.x,e.y-e.r*.85,10+progress*17);
}
function drawHazard(ctx,h,time,reduceMotion) {
  if(h.kind==='mine') {
    shadow(ctx,h.x,h.y+5,12,4,.52);whole(ctx,'bomb',h.x-11,h.y-16,22,24);
    if(h.armTime<=0||h.armed){ctx.fillStyle=reduceMotion?'#ffbe78':Math.sin(time*9)>0?'#ffb667':'#cc664b';ctx.fillRect(h.x+3,h.y-14,3,3);}return;
  }
  if(h.kind!=='meteor'&&h.kind!=='lightning') return;
  const r=h.radius||44, progress=1-Math.max(0,h.remaining)/Math.max(.001,h.maxTime||1);
  ctx.save();ctx.fillStyle='rgba(251,113,62,.10)';ctx.strokeStyle=h.kind==='lightning'?'#bcddff':'#ffc184';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(h.x,h.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#fff0be';ctx.lineWidth=3;ctx.beginPath();ctx.arc(h.x,h.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();
  if(h.remaining<.27&&!reduceMotion){
    const drop=Math.max(0,h.remaining)/.27*150;
    if(h.kind==='lightning') sprite(ctx,'thunder',Math.min(2,Math.floor((.27-h.remaining)/.27*3))*20,0,20,28,h.x-20,h.y-drop-82,40,84);
    else strip(ctx,'fireball',16,4,time*15,h.x,h.y-drop,30);
  }
  ctx.restore();
}
function drawInteractable(ctx,o,state,reduceMotion) {
  const done=o.status==='done', ready=o.status==='ready', size=38;
  if(done&&o.kind==='ghost')return;
  const near=Math.hypot(state.player.x-o.x,state.player.y-o.y)<75;
  shadow(ctx,o.x,o.y+7,17,6,.43);
  if((ready||o.status==='lit')&&o.kind!=='cracked-wall') halo(ctx,o.x,o.y-8,near?51:34,'rgba(121,227,177,.15)');
  ctx.save();if(done)ctx.globalAlpha=.6;
  if(o.kind==='traveler'||o.kind==='ghost') {
    actor(ctx,o.kind,{...o,angle:Math.PI/2},state.time,size,o.kind==='ghost',reduceMotion);
  } else if(o.kind==='lamp') {
    sprite(ctx,'props',o.status==='ready'?48:64,48,16,16,o.x-18,o.y-24,36,36);
    if(o.status==='lit'||done) sprite(ctx,'flame',(reduceMotion?2:2+Math.floor(state.time*7)%3)*25,0,25,30,o.x-10,o.y-32,20,24);
  } else if(o.kind==='offering') {
    sprite(ctx,'props',32,32,16,16,o.x-20,o.y-26,40,40);whole(ctx,'book',o.x-10,o.y-24,20,20);
  } else if(o.kind==='cracked-wall') {
    sprite(ctx,'props',128,48,16,16,o.x-21,o.y-27,42,42);whole(ctx,'rock',o.x-16,o.y-8,26,26);
    ctx.strokeStyle='#171823';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.x+2,o.y-22);ctx.lineTo(o.x-5,o.y-12);ctx.lineTo(o.x+2,o.y-5);ctx.lineTo(o.x-5,o.y+8);ctx.stroke();
    for(let i=0;i<(o.hits||0);i++)whole(ctx,'rock',o.x-24+i*17,o.y+9,12,12);
  } else if(o.kind==='chest') {
    sprite(ctx,'decor',112,done?0:16,16,16,o.x-21,o.y-25,42,42);
  }
  ctx.restore();
  // Labels are world-local and compact; the actual action is an accessible HTML button.
  if(o.kind==='lamp'||ready&&o.kind!=='cracked-wall') {
    const label=o.kind==='lamp'?String(o.order):o.kind==='traveler'?'!':o.kind==='ghost'?'✦':o.kind==='chest'?'◆':'+';
    const y=o.y-45;ctx.fillStyle='#111e22';ctx.fillRect(o.x-9,y-1,18,19);
    ctx.font='700 12px system-ui, "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle=done||o.status==='lit'?'#ffd290':'#b2efcc';ctx.fillText(label,o.x,y+2);
  }
}
function drawBoss(ctx,e,time,size,reduceMotion) {
  const poses=BOSS_ANIMATIONS[e.type]; if(!poses)return;
  let pose='idle';
  const right=Math.cos(e.angle||0)>=0;
  if(e.phase==='windup') pose=poses.charge?'charge':poses.chargeleft?(right?'chargeright':'chargeleft'):'idle';
  else if(e.phase==='burst'||e.phase==='recover') pose=poses.attack?'attack':poses.attackleft?(right?'attackright':'attackleft'):poses.shoot?'shoot':'idle';
  else if(e.phase==='charge'||e.phase==='jump') pose=poses.jump?'jump':poses.walk?'walk':'idle';
  if(e.hitFlash>0&&poses.hit&&!reduceMotion)pose='hit';
  const [fw,fh,count]=poses[pose];
  let frame=reduceMotion?0:Math.floor(time*(pose==='idle'?7:11))%count;
  if(pose.startsWith('charge'))frame=reduceMotion?0:Math.floor((1-Math.max(0,e.windup||0)/Math.max(.001,e.windupMax||1))*(count-1));
  if(pose==='hit')frame=Math.max(0,Math.min(count-1,Math.floor((1-e.hitFlash/.1)*count)));
  const dw=size,dh=size*fh/fw;
  sprite(ctx,`${e.type}_${pose}`,frame*fw,0,fw,fh,e.x-dw/2,e.y-dh+size*.15,dw,dh);
}
function drawEnemy(ctx, e, time, reduceMotion) {
  const boss = Boolean(e.boss || BOSS_ANIMATIONS[e.type]);
  const size = boss ? Math.max(e.r * 3.7, e.type === 'tempest' ? 152 : e.type === 'leviathan' ? 132 : 114) : e.type === 'tiny' ? 26 : Math.max(38,e.r*2.8);
  if(e.phase==='burrow'&&e.untargetable) {
    shadow(ctx,e.x,e.y+3,e.r*.8,4,.3);
    if(!reduceMotion)strip(ctx,'smoke',32,6,time*8,e.x,e.y-3,24);return;
  }
  shadow(ctx,e.x,e.y+e.r*.5,size*.33,size*.13);
  ctx.save();
  if(e.phase==='spawn')ctx.globalAlpha=.62;
  if(e.phase==='blink')ctx.globalAlpha=.2;
  if(e.type==='kiln'&&!e.coreOpen)ctx.globalAlpha=.64;
  if(e.mirrorDecoy) { ctx.globalAlpha=.28;drawBoss(ctx,{...e,type:'mirror',phase:'chase'},time,78,reduceMotion); }
  else if(boss)drawBoss(ctx,e,time,size,reduceMotion);
  else actor(ctx,FILES[e.type]?e.type:'slime',e,time+(Number(e.id)||0)*.17,size,true,reduceMotion);
  ctx.restore();
  drawWindup(ctx, e, time, reduceMotion);
  if(e.type==='kiln') {
    if(e.coreOpen) { const a=e.coreAngle||-Math.PI/2; strip(ctx,'energyBig',24,4,reduceMotion?1:time*9,e.x+Math.cos(a)*15,e.y-22+Math.sin(a)*12,27); }
    else sprite(ctx,'props',128,48,16,16,e.x-13,e.y-25,26,26);
  }
  if(e.type==='mirror')strip(ctx,'energyBig',24,4,reduceMotion?1:time*8,e.x,e.y-21,15);
  if(e.type==='sovereign') {
    const stage=Math.min(3,Math.max(1,e.stage||1));
    for(let i=0;i<stage;i++) whole(ctx,'coin',e.x+(i-(stage-1)/2)*14-5,e.y-size*.8,10,10);
  }
  if (e.type === 'shieldbearer') {
    // A short raised shield edge belongs to the creature, not a ground attack cone.
    ctx.save(); ctx.translate(e.x, e.y - 5); ctx.rotate(e.angle || 0);
    ctx.strokeStyle = '#c7ded0'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(e.r + 1, -11); ctx.lineTo(e.r + 6, 0); ctx.lineTo(e.r + 1, 11); ctx.stroke(); ctx.restore();
  }
  if (e.hitFlash > 0 && !reduceMotion) {
    strip(ctx, 'impact', 40, 9, Math.min(8, (1 - e.hitFlash / .1) * 9), e.x, e.y - 7, boss ? 43 : 31);
  }
  if (!e.decorative && !e.mirrorDecoy && (boss || e.hp < e.maxHp)) {
    const idleRatio = boss ? BOSS_ANIMATIONS[e.type].idle[1] / BOSS_ANIMATIONS[e.type].idle[0] : 1;
    const bw = boss ? Math.min(100, size) : 30, y = e.y - size * (boss ? idleRatio - .15 : .69) - 7;
    ctx.fillStyle = '#100c1c'; ctx.fillRect(e.x - bw / 2 - 1, y - 1, bw + 2, boss ? 7 : 5);
    ctx.fillStyle = boss ? '#ef9c61' : '#b487c4'; ctx.fillRect(e.x - bw / 2, y, bw * Math.max(0, e.hp / e.maxHp), boss ? 5 : 3);
  }
  if (e.burnTime > 0) {
    const frame = reduceMotion ? 2 : 2 + Math.floor(time * 9) % 3;
    sprite(ctx, 'flame', frame * 25, 0, 25, 30, e.x - 12, e.y - 4, 25, 30);
  }
  if (e.coldTime > 0) {
    ctx.fillStyle = '#b3e6ec';
    for (const sign of [-1, 1]) { ctx.fillRect(e.x + sign * (e.r + 2) - 1, e.y - 6, 3, 7); ctx.fillRect(e.x + sign * (e.r - 1) - 1, e.y - 12, 2, 4); }
  } else if (boss && e.stage === 2) {
    strip(ctx, 'energyBig', 24, 4, reduceMotion ? 1 : time * 8, e.x, e.y - size * .66, 23);
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
function drawBullet(ctx,b,time,reduceMotion) {
  const player=b.owner==='player',size=Math.max(player?13:16,b.r*3.2),angle=Math.atan2(b.vy,b.vx);
  ctx.save();ctx.translate(b.x,b.y);
  if(b.paused){ctx.globalAlpha=.38;reduceMotion=true;}
  if(b.motion==='boomerang') {
    ctx.rotate(reduceMotion?angle:time*15);whole(ctx,'shuriken',-12,-12,24,24);
  } else if(b.slowDuration>0||b.style==='frost'||b.kind==='frost') {
    ctx.rotate(angle);sprite(ctx,'iceSpike',(reduceMotion?0:Math.floor(time*13)%8)*18,0,18,10,-15,-8,30,16);
  } else if(b.style==='prism') {
    ctx.rotate(reduceMotion?angle:time*5);strip(ctx,'energyBig',24,4,reduceMotion?0:time*9,0,0,size+5);
  } else {
    ctx.rotate(angle+Math.PI/4);
    strip(ctx,player?'fireball':'energy',16,4,reduceMotion?0:time*12,0,0,size);
  }
  if(!player){ctx.strokeStyle='#2a183e';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,Math.max(4,b.r+1),0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
function drawEffect(ctx, e, reduceMotion) {
  const ratio = Math.max(0, Math.min(1, (e.life || 0) / Math.max(.001, e.maxLife || e.life || 1)));
  const frame = 1 - ratio;
  ctx.save();
  if (e.type === 'nova') {
    ctx.strokeStyle = e.color || '#a2eee0'; ctx.lineWidth = 3; ctx.globalAlpha = Math.max(.18, ratio);
    ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(4, e.radius || 110) * (reduceMotion ? 1 : .2 + frame * .8), 0, Math.PI * 2); ctx.stroke();
  } else if (e.type === 'lightning' || e.type === 'leech' || e.type === 'heal') {
    ctx.strokeStyle = e.color || '#bff8e8'; ctx.lineWidth = e.type === 'lightning' ? 2.5 : 1.5; ctx.globalAlpha = Math.max(.25, ratio);
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x2 ?? e.x, e.y2 ?? e.y); ctx.stroke();
  } else if(e.type==='rewind') {
    ctx.globalAlpha=ratio*.35;drawBoss(ctx,{type:'chronarch',x:e.x,y:e.y,phase:'chase',r:29},0,100,true);
  } else if(e.type==='lightning-impact') {
    const f=reduceMotion?4:Math.min(7,Math.floor(frame*8));
    sprite(ctx,'thunder',f*20,0,20,28,e.x-32,e.y-136,64,140);
    strip(ctx,'impact',40,9,Math.min(8,frame*9),e.x,e.y,(e.radius||35)*1.5);
  } else if (e.type === 'meteor-impact' || e.type === 'explosion') {
    strip(ctx, 'impact', 40, 9, Math.min(8, frame * 9), e.x, e.y, (e.radius || 44) * 2.3);
    if (!reduceMotion) for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5, d = frame * (e.radius || 44) * .8;
      ctx.globalAlpha = ratio; whole(ctx, 'rock', e.x + Math.cos(a) * d - 5, e.y + Math.sin(a) * d - 5, 10, 10);
    }
  } else if (e.type === 'discovery') {
    ctx.globalAlpha = ratio; strip(ctx,'energyBig',24,4,frame*3,e.x,e.y-14,32+frame*20);
  } else if (e.type === 'blade') {
    strip(ctx, 'slash', 32, 4, frame * 3, e.x, e.y, Math.max(28, (e.radius || 16) * 2));
  } else if (!reduceMotion) {
    ctx.globalAlpha = ratio;
    if (e.type === 'death') {
      strip(ctx, 'smoke', 32, 6, Math.min(5, frame * 6), e.x, e.y, 48);
      for (let i=0;i<4;i++) { const a=i*Math.PI/2+.5,d=frame*28; whole(ctx,'rock',e.x+Math.cos(a)*d-3,e.y+Math.sin(a)*d-3,6,6); }
    }
    else if (e.type === 'hit') strip(ctx, 'impact', 40, 9, Math.min(8, frame * 9), e.x, e.y, 25);
    else if (e.type === 'trail') strip(ctx, 'fireball', 16, 4, frame * 3, e.x, e.y, 22);
    else if (e.type === 'ember') { ctx.fillStyle = e.color || '#ffa869'; ctx.fillRect(e.x - 1, e.y - 1, 3, 3); }
  }
  ctx.restore();
}
function drawGates(ctx, state, reduceMotion) {
  if (state.phase !== 'exit') return;
  for (const gate of state.gates || []) {
    const refuge = gate.route === 'refuge', rift = gate.route === 'rift', color = rift ? '#ddbbff' : refuge ? '#8ad7c3' : '#eda477';
    halo(ctx, gate.x, gate.y, 58, rift ? 'rgba(174,94,249,.27)' : refuge ? 'rgba(90,214,176,.22)' : 'rgba(245,119,53,.22)');
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(gate.x, gate.y, gate.r + 6, gate.r * .55 + 4, 0, 0, Math.PI * 2); ctx.stroke();
    if(rift) strip(ctx,'energyBig',24,4,reduceMotion?1:state.time*7,gate.x,gate.y-13,49);
    else sprite(ctx, 'props', refuge ? 112 : 96, 32, 16, 16, gate.x - 18, gate.y - 28, 36, 36);
    ctx.font = `600 ${state.width < 480 ? 11 : 13}px system-ui, "Microsoft YaHei", "PingFang SC", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const riftKeys={echo:'RIFT · ECHO',surge:'RIFT · SURGE',glass:'RIFT · GLASS'};
    const label = rift ? t(riftKeys[gate.riftRule] || riftKeys.echo) : refuge ? t('REFUGE +1 HP') : t('HUNT +EMBERS'); const tw = ctx.measureText(label).width;
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
  for (const hazard of state.hazards || []) drawHazard(ctx, hazard, state.time, reduceMotion);
  const layers = (state.obstacles || []).map(o => ({ y: o.y + o.h, obstacle: o }));
  for (const e of state.enemies || []) layers.push({ y: e.y, enemy: e });
  for (const o of state.interactables || []) layers.push({ y: o.y, interactable: o });
  layers.push({ y: state.player.y, player: state.player });
  layers.sort((a, b) => a.y - b.y);
  for (const layer of layers) {
    if (layer.obstacle) drawObstacle(ctx, layer.obstacle, state.biome === 'cinder');
    else if (layer.interactable) drawInteractable(ctx, layer.interactable, state, reduceMotion);
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
