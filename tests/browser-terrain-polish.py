"""Terrain acceptance: labelled renderer fixtures plus real UI movement.

The atlas deliberately constructs separate engine worlds, and the landing atlas
sets invulnerability on that isolated specimen to inspect the full attack. It
does not alter the application's running world or claim a played campaign.
Route checks preload an exported fresh room-one entrance, then use only ordinary
keyboard input and the deterministic time hook. Phone sizes are emulation.
"""
import json
import math
from pathlib import Path
import subprocess
import sys
from playwright.sync_api import sync_playwright
from browser_navigation import waypoint_to

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa' / 'terrain-polish'
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4330/src/?test=1'
REPORT = {'url': URL, 'checks': [], 'errors': [], 'console_errors': [], 'screenshots': [], 'routes': [],
          'scope': 'Labelled isolated renderer/landing fixtures; separately, fresh entrance save fixtures followed by actual keyboard navigation. No changes to an active application world; phone viewport emulation.'}


def check(ok, name, detail=None):
    REPORT['checks'].append({'name': name, 'passed': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name, flush=True)
    if not ok:
        raise AssertionError(name)


def state(page):
    return json.loads(page.evaluate('window.render_game_to_text()'))


def advance(page, ms):
    page.evaluate('(ms) => window.advanceTime(ms)', ms)
    return state(page)


def observe(page):
    page.on('pageerror', lambda error: REPORT['errors'].append(str(error)))
    page.on('console', lambda message: REPORT['console_errors'].append(message.text) if message.type == 'error' else None)
    page.goto(URL, wait_until='domcontentloaded')
    page.wait_for_function("typeof window.render_game_to_text==='function' && JSON.parse(window.render_game_to_text()).ui.ready")


def screenshot(page, name, locator=None):
    path = OUT / (name + '.png')
    if locator:
        locator.screenshot(path=str(path))
    else:
        page.screenshot(path=str(path), full_page=True)
    REPORT['screenshots'].append(str(path))


def terrain_atlas(browser):
    page = browser.new_page(viewport={'width': 1200, 'height': 900})
    observe(page)
    # A separate specimen canvas is drawn with the production renderer. It is
    # intentionally outside app.js: this is visual fixture evidence, not input.
    metadata = page.evaluate("""async()=>{
      const E=await import('./engine.js'),R=await import('./renderer.js');await R.loadArt();
      const find=(id)=>{for(let seed=1;seed<1000;seed++){const s=E.createRun({seed,mapVersion:3});if(s.layout===id)return seed;}};
      const specs=[{id:'desktop',w:1100,h:720,ww:1100,wh:720},{id:'portrait',w:390,h:844,ww:1000*390/844,wh:1000},{id:'short-landscape',w:844,h:390,ww:1100,wh:560}];
      const root=document.createElement('main');root.id='terrain-fixtures';root.style.cssText='position:absolute;inset:0;background:#101218;z-index:99999;overflow:visible;color:white;font:14px monospace';
      document.body.append(root);const result=[];
      for(const spec of specs)for(const id of E.LAYOUTS){
        const s=E.createRun({seed:find(id),mapVersion:3,width:spec.ww,height:spec.wh});
        const card=document.createElement('section');card.id=spec.id+'-'+id;card.style.cssText='width:'+spec.w+'px;background:#101218;margin:0 0 24px';
        const title=document.createElement('div');title.style.cssText='min-height:28px;padding:6px;box-sizing:border-box';title.textContent='RENDER FIXTURE / mapVersion 3 / '+spec.id+' / '+id+' / seed '+s.seed;
        const canvas=document.createElement('canvas');canvas.width=spec.w;canvas.height=spec.h;canvas.style.display='block';card.append(title,canvas);root.append(card);
        R.render(canvas.getContext('2d'),s,{width:spec.w,height:spec.h,reduceMotion:true});
        result.push({key:card.id,layout:s.layout,seed:s.seed,mapVersion:s.mapVersion,world:[s.width,s.height],viewport:[spec.w,spec.h],obstacles:s.obstacles,floorZones:s.floorZones});
      }
      document.body.style.overflow='auto';return result;
    }""")
    for item in metadata:
        screenshot(page, item['key'], page.locator('#' + item['key']))
        check(item['mapVersion'] == 3, item['key'] + ': production renderer receives v3 geometry')
    (OUT / 'render-fixture-worlds.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    # Contact sheets retain each original PNG as the full-size evidence.
    from PIL import Image, ImageOps, ImageDraw
    for spec in ['desktop', 'portrait', 'short-landscape']:
        files = [OUT / (m['key'] + '.png') for m in metadata if m['key'].startswith(spec + '-')]
        thumbs = []
        for file in files:
            im = Image.open(file).convert('RGB')
            im.thumbnail((550, 460))
            cell = Image.new('RGB', (550, 500), '#101218')
            cell.paste(im, ((550-im.width)//2, 24))
            ImageDraw.Draw(cell).text((8, 5), file.stem, fill='white')
            thumbs.append(cell)
        sheet = Image.new('RGB', (1650, 2000), '#101218')
        for index, im in enumerate(thumbs):
            sheet.paste(im, ((index % 3)*550, (index//3)*500))
        path = OUT / (spec + '-contact-sheet.png');sheet.save(path);REPORT['screenshots'].append(str(path))
    page.close()


def discovery_and_landing_atlas(browser):
    page = browser.new_page(viewport={'width': 1100, 'height': 900})
    observe(page)
    info = page.evaluate("""async()=>{
      const E=await import('./engine.js'),R=await import('./renderer.js');await R.loadArt();
      document.body.replaceChildren();document.body.style.cssText='background:#101218;color:white;margin:0;font:14px monospace;overflow:auto';
      const out=[];const show=(id,s,label)=>{const section=document.createElement('section');section.id=id;section.style.width='1100px';
        const title=document.createElement('div');title.textContent='ISOLATED ENGINE FIXTURE / '+label;title.style.cssText='padding:8px';
        const c=document.createElement('canvas');c.width=1100;c.height=720;section.append(title,c);document.body.append(section);R.render(c.getContext('2d'),s,{width:1100,height:720,reduceMotion:false});out.push({id,layout:s.layout,seed:s.seed,room:s.room,interactables:s.interactables,hazards:s.hazards,effects:s.effects});};
      const room=(seed,n)=>{const s=E.createRun({seed,mapVersion:3});s.room=n-1;s.phase='exit';s.stats.rooms=n-1;s.relics={split:Math.min(3,n-1)};E.enterRoom(s,'hunt');return s;};
      for(const kind of ['traveler','lamp','offering','cracked-wall']){for(let seed=1;seed<50;seed++){const s=room(seed,2);if(s.interactables.some(i=>i.kind===kind)){show('discovery-'+kind,s,'generated '+kind+' placement, not played campaign');break;}}}
      const ghost=room(1,4);ghost.adventure.cleanRooms=3;ghost.room=3;ghost.phase='exit';E.enterRoom(ghost,'hunt');show('discovery-ghost',ghost,'declared clean-room milestone specimen');
      let meteor;for(let seed=1;seed<100;seed++){const s=room(seed,4);if(s.enemies.some(e=>e.type==='meteor')){meteor=s;break;}}
      if(!meteor)throw Error('No natural meteor specimen found');meteor.player.invuln=999;
      let warning;for(let i=0;i<600;i++){E.step(meteor,{},1/120);if(meteor.hazards.some(h=>h.kind==='meteor')){warning=structuredClone(meteor);break;}}
      if(!warning)throw Error('Meteor never created landing warning');show('landing-warning',warning,'natural meteor warning; isolated specimen invulnerability only');
      let impact;for(let i=0;i<180;i++){E.step(meteor,{},1/120);if(meteor.effects.some(e=>e.type==='meteor-impact')){impact=structuredClone(meteor);break;}}
      if(!impact)throw Error('Meteor never reached impact');show('landing-impact',impact,'same natural meteor landing coordinate');
      return out;
    }""")
    for item in info:
        screenshot(page, item['id'], page.locator('#' + item['id']))
    warning = next(item for item in info if item['id'] == 'landing-warning')['hazards'][0]
    impact = next(effect for item in info if item['id'] == 'landing-impact' for effect in item['effects'] if effect['type'] == 'meteor-impact')
    check(math.hypot(warning['x']-impact['x'], warning['y']-impact['y']) < .001, 'natural falling attack warning and impact share a landing point')
    check({item['id'] for item in info} >= {'discovery-traveler','discovery-lamp','discovery-offering','discovery-cracked-wall','discovery-ghost'}, 'five discovery placements have labelled render evidence')
    (OUT / 'discovery-landing-fixtures.json').write_text(json.dumps(info, indent=2), encoding='utf-8')
    page.close()


def entry_save(layout):
    source = """import{createRun,snapshot}from'./src/engine.js';import{createDefaultSave,exportSave}from'./src/storage.js';
      let s;for(let seed=1;seed<1000;seed++){const c=createRun({seed,mapVersion:3});if(c.layout===process.argv[1]){s=c;break;}}
      const save=createDefaultSave();save.stats.runs=1;save.stats.bestRoom=1;save.checkpoint=snapshot(s);console.log(exportSave(save));"""
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',source,layout],cwd=ROOT,text=True,encoding='utf-8'))


def move_to(page, target):
    held = set()
    try:
        for _ in range(160):
            s = state(page);p = s['player']
            if math.hypot(p['x']-target[0],p['y']-target[1]) < 11:
                return s
            if s['phase'] != 'combat':
                raise AssertionError('Route lost combat: ' + s['phase'])
            x,y = waypoint_to(s,target);dx,dy = x-p['x'],y-p['y']
            keys = ({'d'} if dx>5 else {'a'} if dx < -5 else set()) | ({'s'} if dy>5 else {'w'} if dy < -5 else set())
            for key in held-keys: page.keyboard.up(key)
            for key in keys-held: page.keyboard.down(key)
            held=keys;advance(page,50)
        raise AssertionError('Route did not reach ' + str(target))
    finally:
        for key in held: page.keyboard.up(key)
        advance(page,0)


def real_routes(browser):
    for name,width,height in [('desktop',1440,960),('portrait',390,844),('short-landscape',844,390)]:
        for layout in ['chasm-loop','broken-causeway','sunken-forge']:
            context=browser.new_context(viewport={'width':width,'height':height},is_mobile=name!='desktop',has_touch=name!='desktop')
            save=entry_save(layout)
            context.add_init_script('localStorage.setItem("cinder-below-v1",'+json.dumps(json.dumps(save))+');')
            page=context.new_page();observe(page);page.locator('#resume-run').click();s=advance(page,0)
            check(s['mapVersion']==3 and s['layout']==layout,name+' '+layout+': real UI restores declared entrance')
            initial={'x':s['player']['x'],'y':s['player']['y'],'hp':s['player']['hp']}
            if layout=='chasm-loop':
                pit=s['obstacles'][0];page.keyboard.down('w');s=advance(page,1800);page.keyboard.up('w')
                check(abs(s['player']['y']-(pit['y']+pit['h']+s['player']['r']))<3,name+': pit blocks the direct walking route')
                x=pit['x']+pit['w']+38
                move_to(page,(x,s['player']['y']));move_to(page,(x,pit['y']-38));s=move_to(page,(s['width']/2,pit['y']-38))
            else:
                top=min(o['y'] for o in s['obstacles']);s=move_to(page,(s['width']/2,top-35))
            check(s['player']['hp']>0 and s['player']['y']<initial['y']-70,name+' '+layout+': actual keys traverse the intended safe floor')
            check(not page.evaluate('document.documentElement.scrollWidth>innerWidth'),name+' '+layout+': no horizontal viewport overflow')
            screenshot(page,name+'-'+layout+'-real-input')
            REPORT['routes'].append({'viewport':name,'layout':layout,'initial':initial,'final':s['player'],'time':s['time'],'seed':s['seed']})
            context.close()


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            terrain_atlas(browser)
            discovery_and_landing_atlas(browser)
            real_routes(browser)
            browser.close()
        check(not REPORT['errors'] and not REPORT['console_errors'],'no page errors or console errors across fixtures and ordinary input')
    finally:
        (OUT/'report.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':
    main()
