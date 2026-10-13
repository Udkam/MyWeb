import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as m from '../src/model.js';
const copy = x => structuredClone(x);
const freeze = x => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
const save = s => { const r = m.parseState(m.serializeState(s)); assert.deepEqual(r, s); return r; };
const choices = [
  [['basket','map','tea'], ['r0','r2','r4','r11']],
  [['basket','map','tea'], ['h0','h2','h4']],
  [['basket','map','tea'], ['d0','d2','d3','d4','d12']],
  [['basket','tea','lantern'], ['r0','r5','r7','r8','r11']],
  [['basket','map','lantern'], ['h0','h5','h7','h8']],
  [['basket','lantern'], ['d0','d6','d7','d12']],
  [['basket','map','cape'], ['r0','r5','r9','r10','r11']],
  [['basket','map','cape'], ['h0','h5','h9','h10']],
  [['basket','map','cape'], ['d0','d9','d10','d11','d12']],
];
function deliver(state, index, check=false) {
  let s = m.beginTrip(state, `letter-${index+1}`, choices[index][0]);
  for (const edge of choices[index][1]) {
    const before = copy(s); s = m.stepTrip(freeze(s), edge);
    assert.equal(s.revision, before.revision + 1);
    if (s.trip) for (const k of ['materials','completedLetters','friendVisits','unlockedDecor','unlockedThemes','journeys']) assert.deepEqual(s[k], before[k]);
    if (check) s = save(s);
  }
  assert.equal(s.trip, null); return s;
}
function story(check=false) { let s=m.createState(); for(let i=0;i<9;i++)s=deliver(s,i,check);return s; }

test('finite content, removed rope, verified costs, scene coordinates and six gifts', () => {
  assert.deepEqual([m.LETTERS.length,m.FRIENDS.length,m.DECOR.length,m.PLOTS.length],[9,6,12,8]);
  assert.deepEqual(m.TOOLS.map(t=>t.id),['basket','map','cape','tea','lantern']);
  assert.deepEqual(m.REGIONS.map(r=>r.energy),[6,7,9]);
  assert.equal(m.REGIONS.flatMap(r=>r.edges).some(e=>e.requires==='rope'),false);
  assert.equal(m.DECOR.filter(d=>!d.friendId).reduce((s,d)=>s+d.cost,0),27);
  assert.equal(m.REGIONS[1].edges.find(e=>e.id==='h6').baseCost,4);
  assert.equal(m.REGIONS[1].edges.find(e=>e.id==='h9').baseCost,2);
  assert.equal(m.REGIONS[2].edges.find(e=>e.id==='d3').baseCost,5);
  for(const r of m.REGIONS)for(const a of r.nodes){assert.ok(a.x>=0&&a.x<=288&&a.y>=0&&a.y<=288);for(const b of r.nodes)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=36);}
  for(const f of m.FRIENDS){assert.equal(f.memory.length,3);assert.equal(m.DECOR.find(d=>d.id===f.gift).friendId,f.id);}
});
test('fresh state, sequential letters, no-op revision and validated settings', () => {
  const s=freeze(m.createState());save(s);
  assert.deepEqual(m.availableLetters(s).map(l=>l.id),['letter-1']);
  assert.strictEqual(m.setPack(s,s.pack),s);assert.strictEqual(m.setSetting(s,'sound',true),s);assert.strictEqual(m.abandonTrip(s),s);
  assert.strictEqual(m.placeDecor(s,0,null),s);assert.strictEqual(m.setTheme(s,'evergreen'),s);
  for(const fn of [()=>m.beginTrip(s,'letter-2'),()=>m.setPack(s,['basket','map','cape','tea']),()=>m.setPack(s,['map','map']),()=>m.setPack(s,['rope']),()=>m.setSetting(s,'__proto__',true),()=>m.setSetting(s,'music',1)])assert.throws(fn);
  const next=m.setSetting(s,'motion',false);assert.equal(next.revision,1);assert.equal(s.settings.motion,true);assert.equal(next.settings.motion,false);
});
test('nine different letters reach all friends, 18 memories, 12 decor and 3 themes without replay', () => {
  let s=m.createState();
  for(let i=0;i<9;i++){
    s=deliver(s,i,true);assert.equal(s.journeys,i+1);assert.equal(s.lastTrip.firstDelivery,true);
    assert.equal(m.getFriendMemories(s,'carpenter').length,Math.ceil((i+1)/3));
    assert.equal(s.unlockedThemes.includes('blossom'),i>=2);assert.equal(s.unlockedThemes.includes('riverside'),i>=5);
  }
  assert.equal(s.materials,67);assert.deepEqual(Object.values(s.friendVisits),[1,1,1,1,1,1]);assert.equal(s.plots.filter(Boolean).length,6);
  for(const d of m.DECOR.filter(d=>!d.friendId))s=save(m.buyDecor(freeze(s),d.id));
  assert.equal(s.materials,40);assert.equal(s.unlockedDecor.length,12);
  assert.deepEqual(m.getProgress(s),{lettersDone:9,lettersTotal:9,friendsMet:6,friendsTotal:6,decorOwned:12,decorTotal:12,themesUnlocked:3,themesTotal:3,journeys:9,ending:true});
  for(const f of m.FRIENDS)assert.equal(m.getFriendMemories(s,f.id).length,3);
});
test('home pays atomically once; repeat trips have no duplicate first reward or gifts', () => {
  let s=m.beginTrip(m.createState(),'letter-1');for(const e of ['r0','r2','r4'])s=m.stepTrip(s,e);
  assert.equal(s.trip.delivered,true);assert.equal(s.materials,0);assert.deepEqual(s.friendVisits,{});
  const home=save(m.stepTrip(s,'r11'));assert.equal(home.materials,5);assert.deepEqual(home.lastTrip.newDecor,['bench']);assert.equal(home.plots[0],'bench');
  assert.throws(()=>m.stepTrip(home,'r11'));assert.throws(()=>m.rewindTrip(home));
  const again=save(deliver(home,0));assert.equal(again.materials,8);assert.equal(again.lastTrip.firstDelivery,false);
  assert.deepEqual(again.lastTrip.newDecor,[]);assert.deepEqual(again.lastTrip.newThemes,[]);assert.equal(again.friendVisits.carpenter,2);assert.equal(again.unlockedDecor.length,1);
});
test('rewind restores tea and provisional gains exactly; abandoning pays nothing', () => {
  const s=m.stepTrip(m.beginTrip(m.createState(),'letter-1'),'r0'), visited=m.stepTrip(s,'r2');
  assert.equal(visited.trip.teaUsed,true);assert.equal(visited.trip.collection,3);
  const back=save(m.rewindTrip(visited));assert.deepEqual(back.trip,s.trip);assert.deepEqual(m.stepTrip(back,'r2').trip,visited.trip);
  assert.throws(()=>m.setPack(visited,[]));assert.throws(()=>m.beginTrip(visited,'letter-1'));
  const abandoned=save(m.abandonTrip(visited));assert.equal(abandoned.trip,null);assert.equal(abandoned.materials,0);assert.deepEqual(abandoned.friendVisits,{});assert.equal(abandoned.journeys,0);
});
test('safeAvailable blocks payable dead ends; preparation preview does not combine branches', () => {
  let s=m.stepTrip(m.beginTrip(m.createState(),'letter-1',[]),'r0');
  const r=m.getRoutes(s.trip).find(r=>r.id==='r2');assert.equal(r.available,true);assert.equal(r.safeAvailable,false);assert.ok(r.unsafeReason);assert.throws(()=>m.stepTrip(s,'r2'));
  s=m.stepTrip(m.stepTrip(s,'r1'),'r11');assert.equal(s.materials,2);
  assert.deepEqual(m.getReachableOutcomes('rain-valley',['basket','map','tea']),{deliverable:true,visitorIds:['carpenter'],collectionMax:3});
  assert.deepEqual(m.getReachableOutcomes('rain-valley',['basket','map','cape']),{deliverable:true,visitorIds:[],collectionMax:8});
});
test('all 27 packs preserve V3 paths, saves, payment previews and safe continuation', () => {
  const base=story(),counts=[];
  for(let ri=0;ri<3;ri++){
    let count=0,packs=0;
    for(let mask=0;mask<32;mask++){
      const ts=m.TOOLS.filter((_,i)=>mask&(1<<i));if(ts.reduce((s,t)=>s+t.slots,0)>4)continue;packs++;
      const walk=s=>{
        save(s);if(!s.trip){count++;return;}
        const before=copy(s),routes=m.getRoutes(freeze(s.trip)).filter(r=>r.safeAvailable);assert.ok(routes.length);
        for(const r of routes){const next=m.stepTrip(freeze(s),r.id);if(next.trip){assert.equal(next.trip.energy,r.energyAfter);assert.equal(next.trip.collection,s.trip.collection+r.reward.collection);}assert.deepEqual(s,before);walk(next);}
      };
      walk(m.beginTrip(base,`letter-${ri+1}`,ts.map(t=>t.id)));
    }
    assert.equal(packs,27);counts.push(count);
  }
  assert.deepEqual(counts,[47,53,68]);
});
test('purchases are once, placement is free and new gifts never overwrite a full yard', () => {
  let s=m.buyDecor(deliver(m.createState(),0),'stump');assert.equal(s.materials,3);assert.strictEqual(m.buyDecor(s,'stump'),s);
  for(const id of ['firepit','tent','missing'])assert.throws(()=>m.buyDecor(s,id));
  for(let i=0;i<8;i++)s=m.placeDecor(s,i,'stump');assert.equal(s.materials,3);
  assert.throws(()=>m.placeDecor(s,8,null));assert.throws(()=>m.placeDecor(s,-1,'stump'));assert.throws(()=>m.placeDecor(s,0,'tent'));
  s=save(deliver(s,1));assert.deepEqual(s.plots,Array(8).fill('stump'));assert.ok(s.unlockedDecor.includes('lantern'));assert.equal(m.placeDecor(s,0,null).plots[0],null);
});
test('theme gating and future/backward savedAt never produce resources or progress', () => {
  let s=m.createState();assert.throws(()=>m.setTheme(s,'blossom'));for(let i=0;i<3;i++)s=deliver(s,i);
  s=m.setTheme(s,'blossom');const before=copy(s);s.savedAt=8.64e15;let r=save(s);assert.equal(r.materials,before.materials);assert.equal(r.journeys,before.journeys);r.savedAt=0;save(r);
});
test('strict import rejects bad roots, unknown fields, invalid ids and impossible progress', () => {
  const mutations=[s=>s.version=2,s=>s.extra=true,s=>delete s.settings,s=>s.materials=Infinity,s=>s.materials=-1,s=>s.materials=1,
    s=>s.revision=-1,s=>s.savedAt=8.64e15+1,s=>s.savedAt=.5,s=>s.journeys=1,s=>s.completedLetters=['letter-2'],s=>s.pack=['rope'],
    s=>s.pack=['basket','map','cape','tea'],s=>s.settings.sound='yes',s=>s.settings.extra=false,s=>s.unlockedDecor=['bench'],
    s=>s.plots[0]='stump',s=>s.plots.pop(),s=>s.unlockedThemes.push('blossom'),s=>s.friendVisits.carpenter=1];
  for(const change of mutations){const s=m.createState();change(s);assert.throws(()=>m.parseState(JSON.stringify(s)));}
  for(const t of ['', '{','null','[]','{}',' '.repeat(200001),'{"__proto__":{"polluted":true}}'])assert.throws(()=>m.parseState(t));assert.equal({}.polluted,undefined);
  for(const material of [0,12]){const s=m.createState();s.journeys=1;s.completedLetters=['letter-1'];s.materials=material;assert.throws(()=>m.parseState(JSON.stringify(s)));}
  for(const change of [s=>s.friendVisits.carpenter=10,s=>s.unlockedDecor.pop(),s=>s.lastTrip.collection=9,s=>s.lastTrip.newDecor=['bench'],s=>s.lastTrip.journeyNo--,s=>s.completedLetters.reverse()]){const s=story();change(s);assert.throws(()=>m.parseState(JSON.stringify(s)));}
});
test('active import replays energy, gains, tea, history, route identity and all nested fields', () => {
  const base=m.stepTrip(m.stepTrip(m.beginTrip(m.createState(),'letter-1'),'r0'),'r2');save(base);
  const changes=[s=>s.trip.energy++,s=>s.trip.collection++,s=>s.trip.teaUsed=false,s=>s.trip.history[0].energy++,s=>s.trip.log[1].collectionGained++,s=>s.trip.guests=[],
    s=>s.trip.keepsakes=['tent'],s=>s.trip.visited.pop(),s=>s.trip.path.push('r3'),s=>s.trip.path=Array(16).fill('r0'),s=>s.trip.regionId='hill-post',s=>s.trip.letterId='letter-4',
    s=>s.trip.done=true,s=>s.trip.extra=1,s=>s.trip.tools=['basket','cape','tea'],s=>s.trip.slots=1];
  for(const change of changes){const s=copy(base);change(s);assert.throws(()=>m.parseState(JSON.stringify(s)));}
  assert.deepEqual(m.parseState(JSON.stringify(Object.fromEntries(Object.entries(base).reverse()))),base);
});
test('numeric ceilings reject new trips early and never produce an unexportable revision', () => {
  const full=m.createState();full.journeys=1_000_000;full.completedLetters=['letter-1'];full.materials=2;
  const restored=save(full);assert.throws(()=>m.beginTrip(restored,'letter-1'));
  const active=m.beginTrip(m.createState(),'letter-1');active.journeys=full.journeys;active.completedLetters=full.completedLetters;active.materials=2;
  assert.throws(()=>m.parseState(JSON.stringify(active)));
  const high=m.createState();high.revision=Number.MAX_SAFE_INTEGER-1;
  const last=m.setSetting(save(high),'music',true);assert.equal(last.revision,Number.MAX_SAFE_INTEGER);save(last);
  assert.throws(()=>m.setSetting(last,'music',false));
});
test('browser playthrough fixture executes nine distinct letters and every purchase as documented', () => {
  const plan=JSON.parse(readFileSync(new URL('./playthrough-plan.json',import.meta.url),'utf8'));
  let s=m.createState();assert.equal(new Set(plan.letters.map(l=>l.letterId)).size,9);
  for(const letter of plan.letters){
    assert.equal(s.materials,letter.expected.materialsBefore);
    s=m.beginTrip(s,letter.letterId,letter.pack);
    for(const step of letter.steps){const route=m.getRoutes(s.trip).find(r=>r.id===step.edgeId);assert.equal(route.name,step.name);assert.equal(route.cost,step.cost);assert.equal(route.energyAfter,step.energyAfter);s=m.stepTrip(s,step.edgeId);}
    assert.equal(s.lastTrip.guestId,letter.expected.guestId);assert.equal(s.materials,letter.expected.materialsAfter);assert.deepEqual(s.lastTrip.newDecor,letter.expected.newDecor);
  }
  for(const purchase of plan.purchases){assert.equal(s.materials,purchase.materialsBefore);s=m.buyDecor(s,purchase.decorId);assert.equal(s.materials,purchase.materialsAfter);}
  assert.equal(s.materials,plan.expectedFinal.materials);assert.equal(s.unlockedDecor.length,12);assert.equal(Object.keys(s.friendVisits).length,6);save(s);
});
