import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRun } from '../src/engine.js';
import { loadArt, render, assetStatus, directionColumn, BOSS_ANIMATIONS, AUDIO } from '../src/renderer.js';

// Pixel dimensions are read from the actual PNG headers. This catches bad source
// rectangles and atlas substitutions; it is not a replacement for browser QA.
const manifest = JSON.parse(readFileSync(new URL('../src/assets/manifest.json', import.meta.url), 'utf8'));
const ordinaryTypes = ['slime','shooter','charger','caster','sniper','orbiter','brood','meteor','weaver','bomber','trapper','summoner','leech','shieldbearer','prism','boomerang','burrower','medic','frost','duelist'];
test('curated files retain their original hashes and PNG dimensions', () => {
  for (const row of manifest.files) {
    const bytes = readFileSync(new URL(`../src/assets/${row.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, row.file);
    if (row.dimensions) assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], row.dimensions, row.file);
  }
});

test('20 ordinary creatures and 10 dedicated bosses use distinct original images', () => {
  const ordinary = ordinaryTypes.map(type => manifest.files.find(row => row.file === `${type}.png`));
  assert.equal(ordinary.length, 20); assert.ok(ordinary.every(Boolean));
  assert.equal(new Set(ordinary.map(row => row.sha256)).size, 20);
  assert.equal(new Set(ordinary.map(row => row.original.split('/Actor/Monster/')[1]?.split('/')[0])).size, 20);
  const bosses = Object.keys(BOSS_ANIMATIONS).map(type => manifest.files.find(row => row.file === `${type}-idle.png`));
  assert.equal(bosses.length, 10); assert.ok(bosses.every(Boolean));
  assert.equal(new Set(bosses.map(row => row.sha256)).size, 10);
  assert.ok(bosses.every(row => row.original.includes('/Actor/Boss/')));
  for (const [type, poses] of Object.entries(BOSS_ANIMATIONS)) for (const [pose, [w,h,count]] of Object.entries(poses)) {
    const row = manifest.files.find(item => item.file === `${type}-${pose}.png`);
    assert.deepEqual(row.dimensions, [w * count, h], `${type}/${pose} must use its actual rectangular cells`);
  }
  assert.equal(Object.values(AUDIO).filter(url => url.endsWith('.ogg')).length, 4);
});
test('sprite directions map to source columns, not animation rows', () => {
  assert.deepEqual([Math.PI / 2, -Math.PI / 2, Math.PI, 0].map(directionColumn), [0, 1, 2, 3]);
});
test('every actor phase uses valid rectangles and title never mutates the run', async () => {
  const oldImage = globalThis.Image, oldDocument = globalThis.document;
  let checked = 0;
  let backdropCount = 0;
  let geometry = [];
  const context = new Proxy({
    fillRect(...args) { geometry.push(['fillRect', ...args]); },
    strokeRect(...args) { geometry.push(['strokeRect', ...args]); },
    arc(...args) { geometry.push(['arc', ...args]); },
    ellipse(...args) { geometry.push(['ellipse', ...args]); },
    drawImage(image, ...args) {
      assert.ok(args.every(Number.isFinite), `non-finite drawImage ${image.src || 'canvas'}`);
      geometry.push(['drawImage',image.src||'cached-scene',...args]);
      if (args.length === 8 && image.src) {
        const [x, y, w, h] = args;
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= image.width && y + h <= image.height, `out-of-range ${image.src}: ${args}`);
        checked++;
      }
    },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    measureText(text) { return { width: text.length * 7 }; },
  }, { get(target, key) { return target[key] ?? (() => {}); }, set(target, key, value) { target[key] = value; return true; } });
  globalThis.Image = class {
    set src(value) {
      this._src = value; const bytes = readFileSync(fileURLToPath(value));
      this.width = bytes.readUInt32BE(16); this.height = bytes.readUInt32BE(20);
      queueMicrotask(() => this.onload());
    }
    get src() { return this._src; }
  };
  globalThis.document = { createElement() { backdropCount++; return { width: 0, height: 0, getContext: () => context }; } };
  try {
    await loadArt(); assert.equal(assetStatus.ready, true); assert.deepEqual(assetStatus.failed, []);
    const state = createRun({ seed: 14 });
    state.enemies = [...ordinaryTypes,'tiny',...Object.keys(BOSS_ANIMATIONS)].map((type,index) => ({ id:index,type,boss:Boolean(BOSS_ANIMATIONS[type]),x:100+index%8*110,y:170+Math.floor(index/8)*110,r:BOSS_ANIMATIONS[type]?29:14,hp:50,maxHp:60,vx:10,vy:0,angle:.7,stage:2,burnTime:1,coldTime:1,coreOpen:true,coreAngle:.7 }));
    state.effects = ['nova','lightning','meteor-impact','lightning-impact','leech','heal','rewind','death','discovery'].map((type,index) => ({type,x:150+index*80,y:350,x2:220+index*70,y2:360,radius:44,life:.3,maxLife:.5}));
    state.hazards=[{kind:'meteor',x:180,y:220,radius:44,remaining:.2,maxTime:1},{kind:'lightning',x:450,y:300,radius:36,remaining:.5,maxTime:1},{kind:'mine',x:600,y:320,armTime:0,radius:14}];
    state.interactables=['traveler','lamp','offering','cracked-wall','chest','ghost'].map((kind,index)=>({kind,x:80+index*135,y:500,r:18,status:kind==='cracked-wall'?'sealed':'ready',order:2,hits:2}));
    state.obstacles.push({x:500,y:230,w:40,h:40,kind:'thorn'});
    state.obstacles.push({x:330,y:350,w:65,h:70,kind:'pit'});
    state.floorZones=['stone-path','court','mud','grate','bridge','rune'].map((kind,index)=>({id:`zone-${index}`,kind,x:55+index*125,y:145,w:104,h:72}));
    state.landmarks=['arch','brazier','roots','chain','obelisk','broken-column'].map((kind,index)=>({id:`mark-${index}`,kind,x:60+index*130,y:100,r:12,variant:index%3}));
    for (const phase of ['spawn','chase','windup','charge','recover','burst','blink']) {
      for (const e of state.enemies) Object.assign(e, { phase, windup: .4, windupMax: .8, telegraph: { kind: e.id % 2 ? 'line' : 'fan', angle: .7, range: 180, width: 30, spread: .8 } });
      for (const time of [0, .11, .42, .93, 1.77, 4.1]) {
        state.time = time; render(context, state, { width: 1440, height: 900 });
        render(context, state, { width: 390, height: 844, reduceMotion: true });
      }
    }
    const beforeBiomes = backdropCount; state.room++;
    for (const biome of ['hollow','mire','cinder','storm','void','rift']) { state.biome=biome; render(context,state,{width:1440,height:900}); }
    assert.equal(backdropCount - beforeBiomes, 6, 'each distinct biome needs its own backdrop cache entry');
    const beforeGeometry=backdropCount;
    state.floorZones[0].x+=5;render(context,state,{width:1440,height:900});
    assert.equal(backdropCount-beforeGeometry,1,'changed map geometry must invalidate the floor cache without a room change');
    state.phase='exit'; state.gates=[{route:'refuge',x:180,y:170,r:28},{route:'hunt',x:500,y:170,r:28},{route:'rift',riftRule:'glass',x:780,y:170,r:28}]; render(context,state,{width:390,height:844});
    state.enemies=[{id:1,type:'shooter',x:300,y:280,r:14,hp:30,maxHp:30,phase:'windup',windup:.4,windupMax:.8,angle:.2}];
    render(context,state,{width:1440,height:900}); // Populate the backdrop cache before comparing commands.
    geometry=[]; render(context,state,{width:1440,height:900}); const without=JSON.stringify(geometry);
    state.enemies[0].telegraph={kind:'line',visible:true,angle:.2,range:400,width:60};
    geometry=[]; render(context,state,{width:1440,height:900}); assert.equal(JSON.stringify(geometry),without,'ordinary telegraphs must not create ground geometry');
    state.enemies.forEach(e => e.hitFlash = .06); render(context, state, { width: 1440, height: 900 });
    const before = JSON.stringify(state); render(context, state, { width: 1440, height: 900, title: true });
    assert.equal(JSON.stringify(state), before); assert.ok(checked > 1000);
    for(const [width,height] of [[1440,900],[390,844],[844,390]]) {
      for(const titleWeapon of ['cinder','scatter','needle']) {
        const options={width,height,title:true,titleWeapon};
        render(context,state,options);const cached=backdropCount;
        state.time=1;geometry=[];render(context,state,options);const moving=JSON.stringify(geometry);
        const titleBefore=JSON.stringify(state);render(context,state,options);assert.equal(JSON.stringify(state),titleBefore,'title must never mutate a real run');
        state.time=8;geometry=[];render(context,state,options);assert.notEqual(JSON.stringify(geometry),moving,'title uses the supplied clock for animation');
        assert.equal(backdropCount,cached,'title cannot allocate a large background canvas per animation frame');
        state.time=1;geometry=[];render(context,state,{...options,reduceMotion:true});const frozen=JSON.stringify(geometry);
        assert.ok(geometry.filter(command=>command[0]==='fillRect').length<=28,'title has at most 24 particles plus three fill/halo operations');
        state.time=90;geometry=[];render(context,state,{...options,reduceMotion:true});assert.equal(JSON.stringify(geometry),frozen,'reduced motion freezes every title decoration and sprite');
      }
    }
  } finally { globalThis.Image = oldImage; globalThis.document = oldDocument; }
});
