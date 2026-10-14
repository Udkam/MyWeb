// Original CC0 Ninja Adventure sprites; manifest.json records exact source files.
// Renderer owns no clocks, input, network during rendering, or gameplay state.
import { t } from './i18n.js';
import { discoveryInfo } from './discovery.js';
import { MUSIC_CUES } from './audio.js';
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
Object.assign(FILES,{outdoorFloor:'outdoor-floor.png',water:'water.png',nature:'nature.png',floorDetail:'floor-detail.png',hole:'hole.png',thunder:'thunder.png',purpleRipples:'purple-ripples.png',relief:'relief.png',pipes:'pipes.png',ruins:'ruins.png',field:'field.png'});
const art = Object.create(null);
let promise;
let backgroundCache;
let titleBackdropCache;
export const assetStatus = { ready: false, failed: [], loaded: 0, total: Object.keys(FILES).length };
export const AUDIO = Object.freeze(Object.fromEntries(Object.entries({ ...Object.fromEntries(Object.entries(MUSIC_CUES).map(([key,cue])=>[key,cue.file])), shot: 'shot.wav', dash: 'dash.wav', hit: 'hit.wav', death: 'death.wav', relic: 'relic.wav' }).map(([key, name]) => [key, new URL(`./assets/${name}`, import.meta.url).href])));

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

// Ground layers use original atlas cells. These surfaces never imply damage;
// only state.obstacles determines solid ground or blocked chasms.
function tiledRegion(ctx,key,sx,sy,sw,sh,x,y,w,h,unit=32) {
  if(w<=0||h<=0)return;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  for(let yy=y;yy<y+h;yy+=unit)for(let xx=x;xx<x+w;xx+=unit) sprite(ctx,key,sx,sy,sw,sh,xx,yy,unit,unit);
  ctx.restore();
}
function drawFloorZone(ctx,z,biome) {
  const {x,y,w,h}=z;
  ctx.save();
  if(z.kind==='bridge') {
    // Cross-grain planks distinguish the safe crossing from the solid pit edges.
    tiledRegion(ctx,'water',32,208,16,16,x,y,w,h,32);
    for(let yy=y+46;yy<y+h-16;yy+=78)tiledRegion(ctx,'water',16,240,16,16,x,yy,w,10,20);
    ctx.fillStyle='rgba(15,24,29,.66)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#686b65';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
  } else if(z.kind==='mud') {
    tiledRegion(ctx,'outdoorFloor',240,128,16,16,x,y,w,h,32);
    ctx.fillStyle='rgba(15,26,19,.30)';ctx.fillRect(x,y,w,h);
  } else if(z.kind==='grate') {
    tiledRegion(ctx,'floor',224,224,16,16,x,y,w,h,32);
    ctx.fillStyle='rgba(13,13,18,.26)';ctx.fillRect(x,y,w,h);
    ctx.globalAlpha=.7;
    for(let xx=x;xx<x+w;xx+=32)sprite(ctx,'pipes',16,0,16,16,xx,y-4,Math.min(32,x+w-xx),20);
  } else if(z.kind==='rune'||z.kind==='court') {
    tiledRegion(ctx,'floor',256,208,16,16,x,y,w,h,32);
    ctx.fillStyle=biome==='void'||biome==='rift'?'rgba(84,68,110,.10)':'rgba(131,150,108,.08)';ctx.fillRect(x,y,w,h);
    ctx.globalAlpha=z.kind==='rune'?.40:.27;
    const size=Math.min(w,h,176);
    sprite(ctx,'floor',240,96,64,64,x+(w-size)/2,y+(h-size)/2,size,size);
    // Broken masonry edging avoids a flat rectangular carpet pasted on stone.
    ctx.globalAlpha=.34;
    for(let offset=0;offset<w-12;offset+=32)if(Math.floor(offset/32)%3!==1)for(const yy of [y,y+h-8])sprite(ctx,'floor',272,192,16,8,x+offset,yy,Math.min(26,w-offset),8);
    for(let offset=12;offset<h-12;offset+=36)if(Math.floor(offset/36)%3!==2)for(const xx of [x,x+w-8])sprite(ctx,'floor',240,208,8,16,xx,y+offset,8,Math.min(28,h-offset));
  } else {
    tiledRegion(ctx,'floor',256,224,16,16,x,y,w,h,32);
    ctx.fillStyle='rgba(39,43,37,.13)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='rgba(146,145,114,.26)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  }
  ctx.restore();
}
function drawLandmark(ctx,l,biome) {
  const size=Math.max(24,Math.min(40,(l.r||10)*3)),x=l.x-size/2,y=l.y-size*.75;
  ctx.save();ctx.globalAlpha=.76;
  if(l.kind==='brazier') {
    sprite(ctx,'props',biome==='cinder'?96:32,32,16,16,x,y,size,size);
    halo(ctx,l.x,l.y-10,46,biome==='cinder'?'rgba(253,144,63,.13)':'rgba(182,217,180,.09)');
  } else if(l.kind==='roots') {
    sprite(ctx,'nature',64,0,32,32,x-5,y-5,size+10,size+10);
  } else if(l.kind==='chain') {
    sprite(ctx,'pipes',80,0,16,48,l.x-7,l.y-28,14,42);
  } else if(l.kind==='obelisk') {
    sprite(ctx,'nature',256,224,32,32,x,y,size,size);
  } else if(l.kind==='broken-column') {
    sprite(ctx,'ruins',16+((l.variant||0)%2)*16,48,16,48,l.x-10,l.y-30,20,50);
  } else {
    sprite(ctx,'ruins',128,0,48,32,x-8,y-5,size+16,size);
  }
  ctx.restore();
}
function makeBackdrop(state) {
  const width=Math.ceil(state.width),height=Math.ceil(state.height),biome=state.biome||'hollow';
  const geometryKey=JSON.stringify([state.mapVersion,state.layoutVariant,state.roomShape,state.floorZones,state.landmarks]);
  const key=`${width}:${height}:${state.room}:${state.seed}:${state.layout}:${biome}:${geometryKey}`;
  if(backgroundCache?.key===key)return backgroundCache.canvas;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const palettes={hollow:['#10191a','rgba(7,18,18,.17)'],mire:['#0c1c1a','rgba(9,29,25,.58)'],cinder:['#241716','rgba(36,16,18,.20)'],storm:['#111d29','rgba(15,28,44,.30)'],void:['#171320','rgba(27,15,39,.26)'],rift:['#211327','rgba(31,15,46,.33)']};
  const palette=palettes[biome]||palettes.hollow;
  ctx.fillStyle=palette[0];ctx.fillRect(0,0,width,height);
  ctx.save();ctx.beginPath();ctx.rect(24,24,width-48,height-48);ctx.clip();
  for(let y=16;y<height;y+=32)for(let x=16;x<width;x+=32) {
    const hash=(Math.imul(Math.floor(x/32)+71,374761393)^Math.imul(Math.floor(y/32)+(state.room||1)*13,668265263))>>>0;
    if(biome==='mire')sprite(ctx,'field',16,112,16,16,x,y,32,32);
    else if(biome==='storm')sprite(ctx,'outdoorFloor',256,240,16,16,x,y,32,32);
    else if(biome==='void'||biome==='rift')sprite(ctx,'floor',256+(hash%2)*16,208,16,16,x,y,32,32);
    else sprite(ctx,'floor',256+(hash%2)*16,208,16,16,x,y,32,32);
  }
  ctx.fillStyle=palette[1];ctx.fillRect(0,0,width,height);
  // The shoreline/furnace/chasm stays at the room margin. Main combat surfaces
  // remain neutral so bright projectiles and actual falling-attack warnings read.
  if(biome==='mire') {
    for(const x of [24,width-48]){tiledRegion(ctx,'water',16,112,16,16,x,40,24,height-80,24);ctx.fillStyle='rgba(15,42,35,.48)';ctx.fillRect(x,40,24,height-80);}
    for(const x of [29,width-61])for(let y=112;y<height-96;y+=136)sprite(ctx,'floorDetail',16,32,16,16,x,y,30,30);
  } else if(biome==='cinder') {
    for(const x of [27,width-43])tiledRegion(ctx,'pipes',0,16,16,16,x,56,16,height-108,24);
    for(const y of [height*.27,height*.71])for(const x of [32,width-40])halo(ctx,x,y,88,'rgba(228,75,34,.14)');
  } else if(biome==='storm') {
    for(let y=70;y<height-80;y+=96)for(const x of [25,width-43])sprite(ctx,'relief',112,0,16,48,x,y,18,80);
  } else if(biome==='void'||biome==='rift') {
    for(let y=64;y<height-64;y+=64)for(const x of [25,width-39]){ctx.globalAlpha=.5;sprite(ctx,'hole',32,16,16,48,x,y,14,64);ctx.globalAlpha=1;}
  }
  const zones=state.floorZones?.length?state.floorZones:[{kind:'stone-path',x:width*.16,y:height*.25,w:width*.68,h:36},{kind:'court',x:width*.37,y:height*.39,w:width*.26,h:height*.24}];
  for(const z of zones)drawFloorZone(ctx,z,biome);
  for(const l of state.landmarks||[])drawLandmark(ctx,l,biome);
  // Sparse edge-only debris supports the architecture instead of covering lanes.
  for(let i=0;i<8;i++) {
    const hash=((state.seed||1)+i*173+(state.room||1)*91)>>>0;
    const x=i%2?width-53-hash%10:33+hash%10,y=105+(hash*7%Math.max(1,height-212));
    ctx.globalAlpha=.55;whole(ctx,'rock',x,y,13+i%3*3,13+i%3*3);ctx.globalAlpha=1;
  }
  ctx.restore();
  const green=biome==='hollow'||biome==='mire',wallX=green?80:0;
  for(let x=24;x<width-24;x+=32){
    sprite(ctx,'walls',wallX+16,96,16,16,x,8,Math.min(32,width-24-x),32);
    sprite(ctx,'walls',wallX+16,160,16,16,x,height-34,Math.min(32,width-24-x),32);
  }
  for(let y=36;y<height-32;y+=32){
    sprite(ctx,'walls',wallX,112,16,16,8,y,24,Math.min(32,height-32-y));
    sprite(ctx,'walls',wallX+64,112,16,16,width-32,y,24,Math.min(32,height-32-y));
  }
  for(const [sx,sy,x,y] of [[0,96,8,8],[64,96,width-40,8],[0,160,8,height-40],[64,160,width-40,height-40]])sprite(ctx,'walls',wallX+sx,sy,16,16,x,y,32,32);
  for(const x of [Math.min(124,width*.22),width-Math.min(124,width*.22)]){
    sprite(ctx,'props',32,32,16,16,x-12,21,24,24);
    halo(ctx,x,61,100,biome==='cinder'?'rgba(255,144,61,.23)':'rgba(176,213,159,.17)');
  }
  const shade=ctx.createRadialGradient(width/2,height*.48,Math.min(width,height)*.30,width/2,height*.48,Math.max(width,height)*.76);
  shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(4,7,15,.22)');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
  backgroundCache={key,canvas};return canvas;
}

function drawObstacle(ctx, o, biome) {
  const { x,y,w,h }=o, warm=biome==='cinder', green=!warm;
  if(o.kind==='pit') {
    const edge=Math.min(12,w/3,h/3);
    ctx.fillStyle=warm?'#27171a':biome==='mire'?'#092521':'#090c15';ctx.fillRect(x,y,w,h);
    tiledRegion(ctx,'hole',16,0,16,16,x,y,w,edge,edge);
    tiledRegion(ctx,'hole',16,48,16,16,x,y+h-edge,w,edge,edge);
    tiledRegion(ctx,'hole',0,16,16,16,x,y,edge,h,edge);
    tiledRegion(ctx,'hole',48,16,16,16,x+w-edge,y,edge,h,edge);
    ctx.strokeStyle=warm?'#98664c':biome==='mire'?'#578374':'#797886';ctx.lineWidth=1.5;ctx.strokeRect(x+.75,y+.75,w-1.5,h-1.5);
    ctx.save();ctx.beginPath();ctx.rect(x+edge,y+edge,w-edge*2,h-edge*2);ctx.clip();
    if(w>35&&h>30){ctx.globalAlpha=.40;tiledRegion(ctx,'relief',64,16,16,32,x+edge,y+edge,w-edge*2,Math.min(27,h-edge*2),22);ctx.globalAlpha=1;}
    // Original rock fragments sit inside the exact solid footprint. Staggered
    // breaks in the rim give depth without promising a non-existent crossing.
    ctx.globalAlpha=.55;
    for(let offset=10;offset<w-edge*2;offset+=73)whole(ctx,'rock',x+edge+offset,y+edge-6,13,16);
    for(let offset=22;offset<h-edge*2;offset+=89)whole(ctx,'rock',x+w-edge-10,y+edge+offset,12,15);
    ctx.restore();
    return;
  }
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
  const info=discoveryInfo(state,o),done=info.complete,size=48;
  const color=info.tone==='violet'?'#d5b3ff':info.tone==='mint'?'#a4eed5':'#f5d18c';
  shadow(ctx,o.x,o.y+9,22,8,.56);
  if(!done) {
    halo(ctx,o.x,o.y-8,info.near?62:45,info.tone==='violet'?'rgba(178,118,255,.21)':info.tone==='mint'?'rgba(119,231,193,.20)':'rgba(254,190,87,.20)');
    // A vertical glint marks discoveries without adding floor attack geometry.
    ctx.fillStyle=color;ctx.globalAlpha=.6;
    for(let i=0;i<3;i++) {const rise=reduceMotion?i*10:(state.time*13+i*11)%34;ctx.fillRect(o.x-2+(i%2?7:-7),o.y-28-rise,3,3);}
    ctx.globalAlpha=1;
  }
  ctx.save();if(done)ctx.globalAlpha=.6;
  if(o.kind==='traveler'||o.kind==='ghost') {
    actor(ctx,o.kind,{...o,angle:Math.PI/2},state.time,size,o.kind==='ghost',reduceMotion);
  } else if(o.kind==='lamp') {
    sprite(ctx,'props',o.status==='ready'?48:64,48,16,16,o.x-22,o.y-30,44,44);
    if(o.status==='lit'||done)sprite(ctx,'flame',(reduceMotion?2:2+Math.floor(state.time*7)%3)*25,0,25,30,o.x-13,o.y-41,26,31);
  } else if(o.kind==='offering') {
    sprite(ctx,'props',32,32,16,16,o.x-26,o.y-35,52,52);whole(ctx,'book',o.x-14,o.y-35,28,28);
  } else if(o.kind==='cracked-wall') {
    sprite(ctx,'props',128,48,16,16,o.x-27,o.y-36,54,54);whole(ctx,'rock',o.x-18,o.y-5,32,32);
    ctx.lineJoin='round';ctx.strokeStyle='#10121a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(o.x+5,o.y-32);ctx.lineTo(o.x-6,o.y-18);ctx.lineTo(o.x+4,o.y-7);ctx.lineTo(o.x-8,o.y+11);ctx.stroke();
    ctx.strokeStyle='#f3ce8b';ctx.lineWidth=1.5;ctx.stroke();
    for(let i=0;i<(o.hits||0);i++)whole(ctx,'rock',o.x-27+i*19,o.y+13,14,14);
  } else if(o.kind==='chest') {
    sprite(ctx,'decor',112,done?0:16,16,16,o.x-27,o.y-33,54,54);
  }
  ctx.restore();
}
function labelRectOverlap(a,b) {return a.x<b.x+b.w+4&&a.x+a.w+4>b.x&&a.y<b.y+b.h+4&&a.y+a.h+4>b.y;}
function drawDiscoveryLabels(ctx,state,scaleX,scaleY) {
  const placed=[],items=(state.interactables||[]).map(item=>({item,info:discoveryInfo(state,item)}));
  items.sort((a,b)=>Number(b.info.inRange)-Number(a.info.inRange)||Number(a.info.complete)-Number(b.info.complete)||Math.hypot(state.player.x-a.item.x,state.player.y-a.item.y)-Math.hypot(state.player.x-b.item.x,state.player.y-b.item.y));
  const font=14/scaleY,line=19/scaleY,pad=8/scaleX,edge=10/scaleX;
  for(const {item:o,info} of items) {
    const color=info.complete?'#bec2ba':info.tone==='violet'?'#d8b8ff':info.tone==='mint'?'#b8f5df':'#ffe0a0';
    const title=`${info.marker}  ${info.title}`;
    const action=info.statusLabel||(info.near&&!info.complete?info.action:'');
    ctx.font=`600 ${font}px system-ui, "Microsoft YaHei", "PingFang SC", sans-serif`;
    const maxWidth=Math.max(90/scaleX,Math.min(200/scaleX,state.width*.56));
    const shorten=text=>{let result=text||'';while(ctx.measureText(result).width>maxWidth&&result.length>2)result=result.slice(0,-2)+'…';return result;};
    const lines=[shorten(title)];if(action)lines.push(shorten(action));
    const w=Math.max(...lines.map(text=>ctx.measureText(text).width))+pad*2,h=line*lines.length+8/scaleY;
    const minY=68/scaleY,maxY=state.height-h-22/scaleY;
    const initial={x:Math.max(edge,Math.min(state.width-w-edge,o.x-w/2)),y:Math.max(minY,Math.min(maxY,o.y-52-h)),w,h};
    const candidates=[initial,{...initial,y:Math.min(maxY,initial.y-h-8/scaleY)},{...initial,y:Math.min(maxY,o.y+24)},{...initial,x:Math.max(edge,Math.min(state.width-w-edge,o.x+34))},{...initial,x:Math.max(edge,Math.min(state.width-w-edge,o.x-w-34))}];
    const box=candidates.find(candidate=>!placed.some(other=>labelRectOverlap(candidate,other)))||initial;
    placed.push(box);
    ctx.save();ctx.globalAlpha=info.complete?.78:1;
    ctx.fillStyle='rgba(7,14,20,.95)';ctx.fillRect(box.x,box.y,box.w,box.h);
    ctx.strokeStyle=info.inRange?color:'rgba(126,144,151,.60)';ctx.lineWidth=(info.inRange?1.5:1)/scaleX;ctx.strokeRect(box.x,box.y,box.w,box.h);
    ctx.fillStyle=color;ctx.fillRect(box.x,box.y,3/scaleX,box.h);
    ctx.textAlign='center';ctx.textBaseline='top';
    for(let index=0;index<lines.length;index++) {ctx.fillStyle=index?'#f3f1df':color;ctx.fillText(lines[index],box.x+box.w/2,box.y+5/scaleY+index*line);}
    if(Math.abs(box.x+box.w/2-o.x)>w*.25||Math.abs(box.y+h-(o.y-52))>h){ctx.strokeStyle=color;ctx.globalAlpha=.42;ctx.lineWidth=1/scaleX;ctx.beginPath();ctx.moveTo(Math.max(box.x,Math.min(box.x+box.w,o.x)),box.y+box.h);ctx.lineTo(o.x,o.y-32);ctx.stroke();}
    ctx.restore();
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
function drawGates(ctx, state, reduceMotion, scaleY=1) {
  if (state.phase !== 'exit') return;
  for (const gate of state.gates || []) {
    const refuge = gate.route === 'refuge', rift = gate.route === 'rift', color = rift ? '#ddbbff' : refuge ? '#8ad7c3' : '#eda477';
    halo(ctx, gate.x, gate.y, 58, rift ? 'rgba(174,94,249,.27)' : refuge ? 'rgba(90,214,176,.22)' : 'rgba(245,119,53,.22)');
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(gate.x, gate.y, gate.r + 6, gate.r * .55 + 4, 0, 0, Math.PI * 2); ctx.stroke();
    if(rift) strip(ctx,'energyBig',24,4,reduceMotion?1:state.time*7,gate.x,gate.y-13,49);
    else sprite(ctx, 'props', refuge ? 112 : 96, 32, 16, 16, gate.x - 18, gate.y - 28, 36, 36);
    ctx.font = `600 ${14/scaleY}px system-ui, "Microsoft YaHei", "PingFang SC", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const riftKeys={echo:'RIFT · ECHO',surge:'RIFT · SURGE',glass:'RIFT · GLASS'};
    const label = rift ? t(riftKeys[gate.riftRule] || riftKeys.echo) : refuge ? t('REFUGE +1 HP') : t('HUNT +EMBERS'); const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(13,16,25,.95)'; ctx.fillRect(gate.x - tw / 2 - 6/scaleY, gate.y + 21, tw + 12/scaleY, 23/scaleY);
    ctx.fillStyle = color; ctx.fillText(label, gate.x, gate.y + 21 + 4/scaleY);
  }
}

// The title has a separate presentation stage: no live-room entities, camera
// mutation, collision, or independent clock. Its only motion input is run time.
function makeTitleBackdrop(width,height) {
  const key=`${Math.ceil(width)}:${Math.ceil(height)}`;
  if(titleBackdropCache?.key===key)return titleBackdropCache.canvas;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(width);canvas.height=Math.ceil(height);
  const ctx=canvas.getContext('2d'),portrait=height>width,compact=!portrait&&height<=500;ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#080e16';ctx.fillRect(0,0,width,height);
  const px=width*(portrait?.86:compact?.43:.80),py=height*(portrait?.16:.43);
  halo(ctx,px,py,Math.min(width*.47,height*.58),'rgba(55,91,113,.20)');
  halo(ctx,width*.91,height*.82,Math.min(width*.45,height*.62),'rgba(116,61,44,.10)');
  // Original stone tiles on a receding plinth, surrounded by open darkness.
  const platform=portrait?[[width*.66,height*.08],[width*.96,height*.08],[width*1.16,height*.45],[width*.70,height*.45]]:compact?[[width*.38,height*.30],[width*.48,height*.30],[width*.51,height*.93],[width*.32,height*.93]]:[[width*.70,height*.39],[width*.91,height*.39],[width*1.08,height*.94],[width*.52,height*.94]];
  const polygon=(offset=0)=>{ctx.beginPath();platform.forEach(([x,y],i)=>i?ctx.lineTo(x,y+offset):ctx.moveTo(x,y+offset));ctx.closePath();};
  polygon(18);ctx.fillStyle='#070a10';ctx.fill();
  ctx.save();polygon();ctx.clip();
  const floorLeft=Math.min(...platform.map(point=>point[0])),floorTop=Math.min(...platform.map(point=>point[1]));
  tiledRegion(ctx,'floor',256,208,16,16,floorLeft,floorTop,Math.max(...platform.map(point=>point[0]))-floorLeft,height*.94-floorTop,portrait||compact?32:48);
  ctx.fillStyle='rgba(5,14,24,.51)';ctx.fillRect(0,0,width,height);
  const line=portrait?width*.80:compact?width*.40:width*.76;
  ctx.globalAlpha=.21;
  tiledRegion(ctx,'floor',272,224,16,16,line,height*.35,portrait||compact?42:64,height*.61,32);
  ctx.globalAlpha=.20;const emblem=portrait||compact?78:Math.min(185,height*.27);
  sprite(ctx,'floor',240,96,64,64,px-emblem/2,py-emblem*.06,emblem,emblem*.64);
  ctx.restore();
  ctx.strokeStyle='rgba(128,149,156,.17)';ctx.lineWidth=2;polygon();ctx.stroke();
  if(!portrait&&!compact) {
    for(const [x,y,size] of [[.635,.67,55],[.94,.63,70],[.585,.84,78],[.97,.84,96]]) {
      ctx.globalAlpha=.40;sprite(ctx,'ruins',16,48,16,48,width*x,height*y-size*.8,size*.36,size);ctx.globalAlpha=1;
    }
  }
  // A broad quiet area is reserved for the real HTML title, actions and guide.
  const veil=ctx.createLinearGradient(0,0,width,0);
  veil.addColorStop(0,'rgba(8,14,22,.99)');veil.addColorStop(portrait?.57:compact?.29:.43,'rgba(8,14,22,.96)');veil.addColorStop(portrait?.84:compact?.39:.66,'rgba(8,14,22,.12)');veil.addColorStop(1,'rgba(8,14,22,0)');
  ctx.fillStyle=veil;ctx.fillRect(0,0,width,height);
  if(portrait){const fade=ctx.createLinearGradient(0,height*.30,0,height*.58);fade.addColorStop(0,'rgba(8,14,22,0)');fade.addColorStop(1,'rgba(8,14,22,1)');ctx.fillStyle=fade;ctx.fillRect(0,height*.30,width,height*.70);}
  titleBackdropCache={key,canvas};return canvas;
}
function drawTitleScene(ctx,state,width,height,reduceMotion,titleWeapon) {
  const portrait=height>width,compact=!portrait&&height<=500,time=reduceMotion?0:state.time;
  const palette=titleWeapon==='scatter'?['#d4b6f0','rgba(147,94,180,.14)']:titleWeapon==='needle'?['#a2e9df','rgba(70,163,168,.15)']:['#f1b489','rgba(231,120,58,.15)'];
  ctx.drawImage(makeTitleBackdrop(width,height),0,0);
  const bossX=width*(portrait?.86:compact?.43:.80),bossY=height*(portrait?.17:compact?.47:.47),playerX=width*(portrait?.85:compact?.36:.69),playerY=height*(portrait?.32:compact?.81:.81);
  const bossSize=portrait?Math.min(110,width*.27):compact?Math.min(94,width*.11,height*.25):Math.min(300,height*.39,width*.25),playerSize=portrait?48:compact?42:Math.max(48,Math.min(96,height*.14));
  const portalY=bossY-bossSize*.43,ringR=bossSize*.45;
  ctx.save();if(portrait)ctx.globalAlpha=.95;else if(compact)ctx.globalAlpha=.78;
  halo(ctx,bossX,portalY,ringR*2,'rgba(128,130,218,.15)');
  for(let i=0;i<2;i++) {
    const angle=time*.095*(i?-1:1)+i*1.1;
    ctx.strokeStyle=i?'rgba(116,160,168,.30)':'rgba(171,162,212,.34)';ctx.lineWidth=portrait?1:1.5;
    ctx.beginPath();ctx.ellipse(bossX,portalY,ringR*(1+i*.16),ringR*(1.20+i*.18),0,angle,angle+Math.PI*1.54);ctx.stroke();
  }
  const orbitAngle=time*.13+.4;
  for(let i=0;i<3;i++){const a=orbitAngle+i*Math.PI*2/3;strip(ctx,'energyBig',24,4,reduceMotion?1:time*4+i,bossX+Math.cos(a)*ringR*1.12,portalY+Math.sin(a)*ringR*1.30,portrait?12:21);}
  shadow(ctx,bossX,bossY+bossSize*.12,bossSize*.37,bossSize*.13,.56);
  const bob=reduceMotion?0:Math.sin(time*.8)*Math.min(3,bossSize*.018);
  drawBoss(ctx,{type:'warden',x:bossX,y:bossY+bob,r:29,phase:'chase'},time,bossSize,reduceMotion);
  halo(ctx,playerX,playerY-14,playerSize*1.12,palette[1]);
  shadow(ctx,playerX,playerY+playerSize*.22,playerSize*.32,playerSize*.09,.6);
  actor(ctx,'playerIdle',{x:playerX,y:playerY,angle:Math.atan2(bossY-playerY,bossX-playerX)},time,playerSize,false,true);
  const staffAngle=Math.atan2(bossY-playerY,bossX-playerX);
  ctx.save();ctx.translate(playerX+playerSize*.19,playerY-playerSize*.19);ctx.rotate(staffAngle+Math.PI/2);whole(ctx,'staff',-playerSize*.06,-playerSize*.28,playerSize*.12,playerSize*.38);ctx.restore();
  // Slow, spaced projectiles establish the duel without flashing or rapid fire.
  const count=titleWeapon==='scatter'?3:2;
  for(let i=0;i<count;i++) {
    const progress=((time*.085+i/count+.12)%1),spread=titleWeapon==='scatter'?(i-1)*.15:0;
    const x=playerX+(bossX-playerX)*progress+Math.sin(progress*Math.PI)*(14+spread*100),y=playerY-30+(bossY-playerY)*progress;
    ctx.globalAlpha=(portrait?.80:compact?.62:1)*Math.sin(progress*Math.PI)*.78;
    strip(ctx,titleWeapon==='cinder'?'fireball':'energy',16,4,reduceMotion?1:time*5+i,x,y,titleWeapon==='needle'?20:portrait?12:18);
  }
  ctx.globalAlpha=portrait?.48:.65;
  // Fixed deterministic particles, independent of RNG and bounded to 24/12.
  const particles=portrait?12:compact?8:24;
  for(let i=0;i<particles;i++) {
    const phase=((i*.6180339887+time*.018)%1),drift=Math.sin(i*2.31+time*.16)*9;
    const x=width*(portrait?.72:compact?.33:.56)+(i*73%100)/100*width*(portrait?.26:compact?.16:.39)+drift,y=height*(portrait?.40:.92)-phase*height*(portrait?.36:.69);
    ctx.fillStyle=i%4===0?'#9baec0':palette[0];ctx.globalAlpha=(portrait?.32:.48)*(1-Math.abs(phase-.5)*1.4);
    const size=i%5===0?3:2;ctx.fillRect(Math.round(x),Math.round(y),size,size);
  }
  ctx.restore();
}

export function render(ctx, state, { width, height, dpr = 1, reduceMotion = false, title = false, titleWeapon = 'cinder' } = {}) {
  if (!state || !ctx) return;
  width ||= state.width; height ||= state.height;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#111019'; ctx.fillRect(0, 0, width, height);
  if (!assetStatus.ready) { ctx.restore(); return; }
  if(title){drawTitleScene(ctx,state,width,height,reduceMotion,titleWeapon);ctx.restore();return;}
  ctx.scale(width / state.width, height / state.height);
  if (!reduceMotion && !title && state.shake > 0) {
    const n = Math.min(4, state.shake * 5); ctx.translate(Math.sin(state.time * 73) * n, Math.cos(state.time * 91) * n);
  }
  ctx.drawImage(makeBackdrop(state), 0, 0);
  for (const x of [Math.min(124, state.width * .22), state.width - Math.min(124, state.width * .22)]) {
    const frame = reduceMotion ? 2 : 2 + Math.floor(state.time * 7 + x) % 3;
    sprite(ctx, 'flame', frame * 25, 0, 25, 30, x - 15, 19, 30, 36);
  }
  drawGates(ctx, state, reduceMotion, height/state.height);
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
    if (layer.obstacle) drawObstacle(ctx, layer.obstacle, state.biome);
    else if (layer.interactable) drawInteractable(ctx, layer.interactable, state, reduceMotion);
    else if (layer.enemy) drawEnemy(ctx, layer.enemy, state.time, reduceMotion);
    else drawPlayer(ctx, layer.player, state, reduceMotion);
  }
  for (const b of state.bullets || []) drawBullet(ctx, b, state.time, reduceMotion);
  for (const e of state.effects || []) drawEffect(ctx, e, reduceMotion);
  if(!title)drawDiscoveryLabels(ctx,state,width/state.width,height/state.height);
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
