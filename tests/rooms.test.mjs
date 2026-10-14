import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LAYOUTS, LEGACY_LAYOUTS, buildRoomGeometry, layoutForRoom } from '../src/rooms.js';
import { createRun, enterRoom, setWorldSize, snapshot, restoreRun, describe, step } from '../src/engine.js';

const boundsFor=(width,height)=>({left:28,right:width-28,top:66,bottom:height-(height>width?150:28)});
const collides=(p,r,o)=>Math.hypot(p.x-Math.max(o.x,Math.min(o.x+o.w,p.x)),p.y-Math.max(o.y,Math.min(o.y+o.h,p.y)))<r-.001;
function floorGraph(obstacles,bounds,r=13) {
  const stride=6,columns=Math.ceil((bounds.right-bounds.left-2*r)/stride)+1,rows=Math.ceil((bounds.bottom-bounds.top-2*r)/stride)+1;
  const dx=(bounds.right-bounds.left-2*r)/(columns-1),dy=(bounds.bottom-bounds.top-2*r)/(rows-1);
  const pos=i=>({x:bounds.left+r+(i%columns)*dx,y:bounds.top+r+Math.floor(i/columns)*dy});
  const free=Array.from({length:columns*rows},(_,i)=>!obstacles.some(o=>collides(pos(i),r,o)));
  const first=free.indexOf(true),seen=new Set([first]),queue=[first];
  for(let head=0;head<queue.length;head++){
    const i=queue[head],x=i%columns,y=Math.floor(i/columns);
    for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,ny=y+dy,n=ny*columns+nx;if(nx>=0&&nx<columns&&ny>=0&&ny<rows&&free[n]&&!seen.has(n)){seen.add(n);queue.push(n);}}
  }
  return{connected:seen.size===free.filter(Boolean).length,reachable(point){let nearest=-1,d=Infinity;for(let i=0;i<free.length;i++)if(free[i]){const p=pos(i),distance=Math.hypot(p.x-point.x,p.y-point.y);if(distance<d){d=distance;nearest=i;}}return seen.has(nearest);}};
}
function roomFixture(room,seed,width=390,height=1000,mapVersion=3){
  const s=createRun({seed,width,height,mapVersion});if(room===1)return s;s.room=room-1;s.phase='exit';s.stats.rooms=room-1;s.stats.embers=30;
  let count=room-1;for(const id of ['cold','split','burn','pierce','chain']){if(count)s.relics[id]=Math.min(3,count);count-=Math.min(3,count);}
  enterRoom(s,'hunt');return s;
}

test('twelve-layout bags cover every architecture, do not repeat at bag boundaries and derive independent mirror variants',()=>{
  const sequences=new Set(),variants=new Map();
  for(let seed=1;seed<=40;seed++){
    const layouts=Array.from({length:36},(_,i)=>LAYOUTS[layoutForRoom(seed,i+1)]);
    for(let i=0;i<3;i++)assert.equal(new Set(layouts.slice(i*12,i*12+12)).size,12);
    assert.ok(layouts.every((id,i)=>i===0||id!==layouts[i-1]));sequences.add(layouts.join(','));
    for(let room=1;room<=12;room++){const g=buildRoomGeometry({seed,room,bounds:boundsFor(380,560)});const key=`${g.layoutVariant.mirrorX}:${g.layoutVariant.mirrorY}`;if(!variants.has(g.layout))variants.set(g.layout,new Set());variants.get(g.layout).add(key);}
  }
  assert.equal(sequences.size,40);for(const id of LAYOUTS)assert.equal(variants.get(id).size,4,id);
});

test('normal and boss geometry has connected floor for player, boss and 80px-wide bypasses at minimum phone dimensions',()=>{
  const samples=new Map();
  for(let seed=1;seed<100&&samples.size<48;seed++)for(let room=1;room<=12;room++){const g=buildRoomGeometry({seed,room,bounds:boundsFor(380,560)});samples.set(`${g.layout}:${g.layoutVariant.mirrorX}:${g.layoutVariant.mirrorY}`,{seed,room});}
  assert.equal(samples.size,48);
  for(const{seed,room}of samples.values())for(const[width,height]of[[380,560],[390,1000],[1100,560]])for(const boss of [false,true]){
    const bounds=boundsFor(width,height),g=buildRoomGeometry({seed,room,bounds,boss});
    for(const r of [13,29,40])assert.ok(floorGraph(g.obstacles,bounds,r).connected,`${g.layout} ${width}x${height} boss=${boss} radius=${r}`);
    for(const o of g.obstacles){assert.ok(o.x>=bounds.left&&o.x+o.w<=bounds.right);assert.ok(o.y>=bounds.top&&o.y+o.h<=bounds.bottom);}
  }
});

test('actual rooms and rotations keep every enemy, optional discovery and exit reachable without overlap',()=>{
  const seen=new Set();
  for(let seed=1;seed<=12;seed++)for(let room=1;room<=15;room++){
    const s=roomFixture(room,seed,380,560);seen.add(s.layout);
    for(const[width,height]of[[380,560],[1100,560],[390,1000]]){
      setWorldSize(s,width,height);const floor=floorGraph(s.obstacles,boundsFor(width,height));assert.ok(floor.connected,s.layout);
      for(const e of [s.player,...s.enemies,...s.interactables]){assert.ok(floor.reachable(e),`${s.layout}: ${e.kind||e.type||'player'}`);assert.ok(!s.obstacles.some(o=>collides(e,e.r,o)),`${s.layout} overlapping ${e.kind||e.type||'player'}`);}
      for(const x of [.32,.50,.68])assert.ok(floor.reachable({x:s.width*x,y:90}));
      assert.ok(s.landmarks.every(p=>s.interactables.every(i=>Math.hypot(i.x-p.x,i.y-p.y)>=45)));
    }
  }
  assert.deepEqual([...seen].sort(),[...LAYOUTS].sort());
});

test('frozen pre-mapVersion v1 and v2 checkpoints preserve exact old collision, spawns and discoveries',()=>{
  const {cases}=JSON.parse(readFileSync(new URL('./fixtures/maps-before-v2.json',import.meta.url),'utf8'));
  assert.equal(cases.length,18);
  for(const c of cases){
    const s=restoreRun(c.checkpoint);assert.ok(s);assert.equal(s.mapVersion,1);assert.equal(s.layout,c.layout);assert.ok(LEGACY_LAYOUTS.includes(s.layout));
    assert.deepEqual(s.obstacles,c.obstacles);assert.deepEqual(s.enemies,c.enemies);assert.deepEqual(s.interactables,c.interactables);
    assert.equal(Object.hasOwn(snapshot(s),'mapVersion'),false);
  }
});

test('mapVersion2 and 3 snapshots preserve layout variants and derived semantics, invalid versions reject without mutation',()=>{
  for(const mapVersion of [2,3])for(let room=1;room<=15;room++){
    const s=roomFixture(room,41,390,1000,mapVersion),snap=snapshot(s),restored=restoreRun(snap);assert.equal(snap.mapVersion,mapVersion);assert.ok(restored);
    for(const key of ['layout','layoutVariant','roomShape','floorZones','landmarks','obstacles'])assert.deepEqual(restored[key],s[key],key);
    assert.deepEqual(restored.enemies,s.enemies);assert.equal(describe(s).mapVersion,mapVersion);
    for(const value of [1,0,4,'2',null,{},true])assert.equal(restoreRun({...snap,mapVersion:value}),null);
    assert.equal(s.mapVersion,mapVersion);
  }
});

test('published mapVersion2 geometry remains byte-for-byte frozen across all layouts, acts, boss transformations and mirrors',()=>{
  // Captured before this repair, over 360 outputs: this protects collision AND
  // all derived visuals, without using new generation code as its own oracle.
  const prior=[];
  for(let seed=1;seed<=12;seed++)for(let room=1;room<=15;room++)for(const boss of [false,true])prior.push(buildRoomGeometry({
    seed,room,mapVersion:2,boss,bounds:{left:28,right:1072,top:66,bottom:692},biome:['hollow','mire','cinder','storm','void'][Math.floor((room-1)/3)],
  }));
  assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'),'13c4e960b40409bf2cb9a74142bfcaa6643acbd670f295ddd09ab180f61cf943');
});

test('version3 walkable materials never cover solid terrain and bridges join actual split chasms',()=>{
  const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1e-6&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1e-6;
  const seen=new Set();
  for(let seed=1;seed<=12;seed++)for(let room=1;room<=12;room++)for(const boss of [false,true]){
    const g=buildRoomGeometry({seed,room,mapVersion:3,boss,bounds:boundsFor(380,560),biome:['hollow','mire','cinder','storm','void'][room%5]});
    for(const z of g.floorZones){
      assert.ok(g.obstacles.every(o=>!overlaps(z,o)),`${g.layout} ${z.kind} over solid terrain`);
      if(z.kind==='bridge'){
        seen.add(g.layout);
        const joins=g.obstacles.filter(o=>o.kind==='pit'&&Math.min(o.y+o.h,z.y+z.h)>Math.max(o.y,z.y)+1&&
          (Math.abs(o.x+o.w-z.x)<.001||Math.abs(z.x+z.w-o.x)<.001));
        assert.equal(joins.length,2,`${g.layout}: bridge must connect the floor strip between two pit edges`);
        assert.ok(z.w>=80,`${g.layout}: crossing too narrow`);
      }
    }
    if(boss)assert.equal(g.floorZones.some(z=>z.kind==='bridge'),false,'boss arena must not imply shortened pit needs a long bridge');
    if(g.layout==='chasm-loop')assert.equal(g.floorZones.some(z=>z.kind==='bridge'),false,'ring path goes around the chasm on stone');
  }
  assert.deepEqual([...seen].sort(),['broken-causeway','sunken-forge']);
});

test('pit geometry blocks movement and shots, while all floor-zone materials remain non-damaging and walkable',()=>{
  let s;for(let seed=1;seed<100;seed++){const candidate=roomFixture(2,seed,1100,720);if(candidate.obstacles.some(o=>o.kind==='pit')){s=candidate;break;}}
  assert.ok(s);const pit=s.obstacles.find(o=>o.kind==='pit');s.enemies=[];s.waveTotal=999;s.player.x=pit.x-25;s.player.y=pit.y+pit.h/2;s.player.invuln=0;
  for(let i=0;i<30;i++)step(s,{moveX:1,fire:true,aimX:pit.x+pit.w,aimY:s.player.y},1/120);
  assert.ok(s.player.x+s.player.r<=pit.x+.001);assert.equal(s.player.hp,6);assert.equal(s.bullets.some(b=>b.x>pit.x+pit.w),false);
  const open=createRun({seed:1});open.obstacles=[];open.enemies=[];open.waveTotal=999;open.player.invuln=0;const hp=open.player.hp;
  for(const zone of open.floorZones){open.player.x=zone.x+zone.w/2;open.player.y=zone.y+zone.h/2;for(let i=0;i<10;i++)step(open,{moveX:.2},1/120);assert.equal(open.player.hp,hp);}
});
