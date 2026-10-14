/** Seeded room geometry. Decorative zones never change collision or combat rules. */
export const LEGACY_LAYOUTS = Object.freeze(['pillar-court', 'side-cloisters', 'crossroads', 'broken-hall', 'altar-ring', 'twin-halls']);
export const LAYOUTS = Object.freeze([...LEGACY_LAYOUTS, 'staggered-arcade', 'split-courts', 'offset-nave', 'chasm-loop', 'broken-causeway', 'sunken-forge']);
export const ROOM_TITLES = Object.freeze({
  'pillar-court': 'Pillar Court', 'side-cloisters': 'Side Cloisters', crossroads: 'Crossroads', 'broken-hall': 'Broken Hall',
  'altar-ring': 'Altar Ring', 'twin-halls': 'Twin Halls', 'staggered-arcade': 'Staggered Arcade', 'split-courts': 'Split Courts',
  'offset-nave': 'Offset Nave', 'chasm-loop': 'Chasm Loop', 'broken-causeway': 'Broken Causeway', 'sunken-forge': 'Sunken Forge',
});
const LEGACY_BLOCKS = [
  [[.17,.27,.12,.13,'pillar'],[.71,.27,.12,.13,'pillar'],[.17,.60,.12,.13,'pillar'],[.71,.60,.12,.13,'pillar']],
  [[.22,.25,.09,.44,'wall'],[.69,.25,.09,.44,'wall']],
  [[.12,.24,.27,.18,'wall'],[.61,.24,.27,.18,'wall'],[.12,.59,.27,.18,'wall'],[.61,.59,.27,.18,'wall']],
  [[.15,.25,.13,.10,'rubble'],[.68,.34,.15,.09,'rubble'],[.23,.62,.13,.13,'rubble'],[.64,.66,.16,.09,'rubble'],[.46,.43,.09,.10,'rubble']],
  [[.40,.39,.20,.16,'altar'],[.15,.27,.10,.12,'pillar'],[.75,.27,.10,.12,'pillar'],[.15,.63,.10,.12,'pillar'],[.75,.63,.10,.12,'pillar']],
  [[.46,.23,.08,.24,'wall'],[.46,.63,.08,.15,'wall'],[.16,.47,.12,.09,'rubble'],[.72,.47,.12,.09,'rubble']],
];
// World bounds are at least 324 x 344. Quarter-width/height bypasses therefore
// remain >=81/86 px, independent of orientation. No lethal terrain is added.
const ROOMS = [
  { shape:'courtyard', blocks:[[.25,.25,.10,.10,'pillar'],[.65,.25,.10,.10,'pillar'],[.25,.65,.10,.10,'pillar'],[.65,.65,.10,.10,'pillar']], zones:[[.36,.12,.28,.76,'stone-path'],[.12,.37,.76,.26,'court']] },
  { shape:'cloister', blocks:[[.25,.25,.10,.50,'wall'],[.65,.25,.10,.50,'wall']], zones:[[.36,.10,.28,.80,'stone-path'],[.03,.15,.20,.70,'court'],[.77,.15,.20,.70,'court']] },
  { shape:'crossing', blocks:[[.25,.25,.10,.15,'wall'],[.65,.25,.10,.15,'wall'],[.25,.65,.10,.10,'wall'],[.65,.65,.10,.10,'wall']], zones:[[.36,.12,.28,.76,'stone-path'],[.12,.41,.76,.23,'stone-path']] },
  { shape:'ruin', blocks:[[.25,.25,.10,.12,'rubble'],[.65,.65,.10,.10,'rubble'],[.45,.45,.10,.10,'rubble']], zones:[[.10,.11,.64,.12,'stone-path'],[.09,.18,.12,.67,'stone-path'],[.20,.78,.70,.11,'stone-path'],[.66,.30,.23,.26,'court']] },
  { shape:'sanctum', blocks:[[.40,.40,.20,.20,'altar']], zones:[[.29,.29,.42,.42,'rune'],[.05,.12,.30,.76,'stone-path'],[.65,.12,.30,.76,'stone-path']] },
  { shape:'divided-hall', blocks:[[.45,.25,.10,.15,'wall'],[.45,.65,.10,.10,'wall']], zones:[[.12,.13,.30,.73,'court'],[.58,.13,.30,.73,'court'],[.16,.42,.68,.20,'stone-path']] },
  { shape:'staggered-gallery', blocks:[[.25,.25,.10,.28,'wall'],[.65,.47,.10,.28,'wall']], zones:[[.07,.13,.83,.10,'stone-path'],[.36,.20,.28,.58,'stone-path'],[.10,.78,.80,.11,'stone-path']] },
  { shape:'double-court', blocks:[[.45,.25,.10,.50,'wall']], zones:[[.06,.22,.35,.56,'court'],[.59,.22,.35,.56,'court'],[.10,.10,.80,.12,'stone-path'],[.10,.78,.80,.12,'stone-path']] },
  { shape:'nave', blocks:[[.25,.25,.10,.50,'wall'],[.65,.25,.10,.10,'pillar']], zones:[[.38,.12,.24,.77,'stone-path'],[.64,.38,.28,.43,'court'],[.04,.18,.17,.64,'court']] },
  { shape:'island-loop', blocks:[[.38,.36,.24,.28,'pit']], zones:[[.11,.16,.78,.13,'stone-path'],[.11,.71,.78,.13,'stone-path'],[.12,.28,.19,.44,'bridge'],[.69,.28,.19,.44,'bridge']] },
  { shape:'causeway', blocks:[[.25,.25,.10,.50,'pit'],[.65,.25,.10,.22,'pit']], zones:[[.36,.10,.28,.79,'bridge'],[.65,.49,.26,.37,'court'],[.04,.15,.18,.71,'stone-path']] },
  { shape:'forge', blocks:[[.25,.25,.50,.10,'pit'],[.25,.65,.50,.10,'pit']], zones:[[.26,.37,.48,.25,'grate'],[.04,.16,.18,.69,'stone-path'],[.78,.16,.18,.69,'stone-path'],[.38,.08,.24,.12,'court']] },
];
function hash(value) { let n=Math.imul((value^(value>>>16))>>>0,0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return(n^(n>>>15))>>>0; }
export function layoutForRoom(seed, room, mapVersion=2) {
  const layouts=mapVersion===2?LAYOUTS:LEGACY_LAYOUTS;let previous=-1,selected=0;
  for(let cycle=0;cycle<=Math.floor((room-1)/layouts.length);cycle++) {
    const bag=layouts.map((_,index)=>index);let rng=hash(seed^Math.imul(cycle+1,0x9e3779b1));
    for(let i=bag.length-1;i>0;i--){rng=hash(rng+i);const j=rng%(i+1);[bag[i],bag[j]]=[bag[j],bag[i]];}
    if(bag[0]===previous)[bag[0],bag[1]]=[bag[1],bag[0]];
    previous=bag.at(-1);selected=bag[(room-1)%layouts.length];
  }
  return selected;
}
function variantFor(seed,room,mapVersion){const n=hash(seed^Math.imul(room,0x41c64e6d));return{mirrorX:mapVersion===2&&Boolean(n&1),mirrorY:mapVersion===2&&Boolean(n&2),decoration:n%3};}
function rectToWorld(rect,bounds,variant){let[x,y,w,h,kind]=rect;if(variant.mirrorX)x=1-x-w;if(variant.mirrorY)y=1-y-h;return{x:bounds.left+x*(bounds.right-bounds.left),y:bounds.top+y*(bounds.bottom-bounds.top),w:w*(bounds.right-bounds.left),h:h*(bounds.bottom-bounds.top),kind};}
export function buildRoomGeometry({seed,room,mapVersion=2,bounds,biome='hollow',boss=false}) {
  const index=layoutForRoom(seed,room,mapVersion),definition=ROOMS[index],variant=variantFor(seed,room,mapVersion);
  let blocks=mapVersion===2?definition.blocks:LEGACY_BLOCKS[index];
  // Keep an uninterrupted boss arena in the upper centre while retaining the
  // room's architecture on the flanks. An 80 px bypass remains on every edge.
  if(mapVersion===2&&boss) blocks=blocks.map(([x,y,w,h,kind])=>[x,y,w,Math.min(h,.18),kind]).filter(([x])=>x<.37||x>.61);
  const obstacles=blocks.map(rect=>rectToWorld(rect,bounds,variant));
  const floorZones=definition.zones.map((rect,i)=>({id:`zone-${i}`,...rectToWorld(rect,bounds,variant)}));
  if(boss)floorZones.push({id:'boss-court',...rectToWorld([.24,.12,.52,.55,'rune'],bounds,variant)});
  if(biome==='mire') floorZones.push({id:'biome-patch',...rectToWorld([.07,.67,.15,.16,'mud'],bounds,variant)});
  if(biome==='cinder') floorZones.push({id:'biome-patch',...rectToWorld([.79,.38,.14,.20,'grate'],bounds,variant)});
  const motif={hollow:'broken-column',mire:'roots',cinder:'brazier',storm:'chain',void:'obelisk',rift:'obelisk'}[biome]||'broken-column';
  const positions=variant.decoration===0?[[.08,.28],[.92,.59],[.08,.69]]:variant.decoration===1?[[.92,.30],[.08,.51],[.92,.70]]:[[.08,.36],[.92,.47],[.08,.72],[.92,.72]];
  const landmarks=positions.map(([x,y],i)=>{
    const p=rectToWorld([x,y,0,0,motif],bounds,variant);
    return{id:`landmark-${i}`,kind:motif,x:p.x,y:p.y,r:8+(i%3)*2,variant:(variant.decoration+i)%3};
  }).filter(p=>!obstacles.some(o=>p.x>o.x-24&&p.x<o.x+o.w+24&&p.y>o.y-24&&p.y<o.y+o.h+24));
  return{layout:(mapVersion===2?LAYOUTS:LEGACY_LAYOUTS)[index],layoutVariant:variant,roomShape:definition.shape,floorZones,landmarks,obstacles};
}
