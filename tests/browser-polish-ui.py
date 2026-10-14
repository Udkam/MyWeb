"""Independent responsive UI acceptance with explicit fixture boundaries.

Room entrances and the unlocked/all-relic loadout are exported save fixtures,
installed before page load. Combat, damage, reward selection, dialogs, import
confirmation, exports and death use real browser input. Running worlds are never
written. Viewport changes are emulation, not physical touch-device acceptance.
"""
import importlib.util
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
from playwright.sync_api import sync_playwright
from browser_navigation import die_from_real_damage, waypoint_to

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.qa/polish-ui'
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4330/src/?test=1'
KEY='cinder-below-v1'
REPORT={'url':URL,'checks':[],'errors':[],'console_errors':[],'screenshots':[], 'specimens':[],
        'scope':'Preloaded, explicitly declared entrance/loadout save fixtures; subsequent actions use actual UI/input. No live-world writes. Desktop and emulated mobile viewport matrix, Chinese and English.'}
spec=importlib.util.spec_from_file_location('language_helper',ROOT/'tests/browser-language-check.py')
language_helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(language_helper)


def check(ok,name,detail=None):
    REPORT['checks'].append({'name':name,'passed':bool(ok),'detail':detail})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)


def state(p): return json.loads(p.evaluate('window.render_game_to_text()'))
def advance(p,ms): p.evaluate('(ms)=>window.advanceTime(ms)',ms);return state(p)


def capture(p,name):
    path=OUT/(name+'.png');p.screenshot(path=str(path),full_page=True)
    REPORT['screenshots'].append(str(path))


def save_fixture(kind):
    source="""import{createRun,enterRoom,snapshot,restoreRun,RELICS}from'./src/engine.js';import{createDefaultSave,exportSave}from'./src/storage.js';
    const kind=process.argv[1],s=createRun({seed:3,mapVersion:3,weapon:'scatter'});
    if(kind==='build'){s.room=12;s.phase='exit';s.stats.rooms=12;s.stats.kills=80;s.stats.embers=160;s.relics=Object.fromEntries(RELICS.map(r=>[r.id,1]));s.player.hp=5;s.player.maxHp=5;enterRoom(s,'hunt');}
    if(kind==='boss'){s.room=14;s.phase='exit';s.stats.rooms=14;s.stats.kills=100;s.stats.embers=180;s.relics={split:3,burn:3,cold:2,seeking:3,chain:3};enterRoom(s,'hunt');}
    const save=createDefaultSave();save.stats={runs:2,wins:0,kills:100,rooms:14,embers:180,bestRoom:15};save.unlocks=['cinder','scatter','needle'];save.checkpoint=snapshot(s);
    if(!restoreRun(save.checkpoint))throw Error('Invalid declared '+kind+' specimen');console.log(exportSave(save));"""
    result=json.loads(subprocess.check_output(['node','--input-type=module','-e',source,kind],cwd=ROOT,text=True,encoding='utf-8'))
    (OUT/('declared-'+kind+'-save.json')).write_text(json.dumps(result,indent=2),encoding='utf-8')
    return result


def open_page(browser,mobile,kind='first'):
    context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 960},is_mobile=mobile,has_touch=mobile,accept_downloads=True,reduced_motion='reduce')
    fixture=save_fixture(kind)
    context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(fixture))+');')
    p=context.new_page()
    p.on('pageerror',lambda error:REPORT['errors'].append(str(error)))
    p.on('console',lambda message:REPORT['console_errors'].append(message.text) if message.type=='error' else None)
    p.goto(URL,wait_until='domcontentloaded')
    p.wait_for_function('window.render_game_to_text && JSON.parse(window.render_game_to_text()).ui.ready')
    return context,p,fixture


def set_lang(p,lang):
    if not state(p)['ui']['language'].startswith(lang):
        selector='#menu-language-toggle' if p.locator('#menu').evaluate('(el)=>el.open') else '#language-toggle'
        p.locator(selector).click();advance(p,0)


def variants(p,mobile):
    for width,height in ([(390,844),(320,568),(844,390)] if mobile else [(1440,960)]):
        p.set_viewport_size({'width':width,'height':height});advance(p,0)
        for lang in ['zh','en']:
            set_lang(p,lang);yield f'{width}x{height}-{lang}'


def geometry(p,selector):
    return p.locator(selector).evaluate('''el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {
      x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,inside:r.x>=-.5&&r.y>=-.5&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,
      hit:!!hit&&(hit===el||el.contains(hit)),overflow:el.scrollWidth>el.clientWidth+2,font:parseFloat(s.fontSize),text:el.innerText,title:el.title,textOverflow:s.textOverflow};}''')


def accessible(p,selector,case,min_height=40):
    node=p.locator(selector);node.scroll_into_view_if_needed();p.wait_for_timeout(30)
    data=geometry(p,selector)
    check(data['inside'] and data['hit'] and data['h']>=min_height,case+' '+selector+' is visible and operable',data)
    return data


def screen_text(p,case,selectors,min_size=12):
    for selector in selectors:
        data=geometry(p,selector)
        check(not data['overflow'] and data['font']>=min_size,case+' '+selector+' text is not clipped or undersized',data)
    check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),case+' has no horizontal page overflow')


def no_overlap(p,first,second,case):
    if p.locator(first).is_visible() and p.locator(second).is_visible():
        a,b=geometry(p,first),geometry(p,second)
        overlap=max(0,min(a['right'],b['right'])-max(a['x'],b['x']))*max(0,min(a['bottom'],b['bottom'])-max(a['y'],b['y']))
        check(overlap<1,case+' '+first+' does not cover '+second,{'first':a,'second':b,'overlapArea':overlap})


def menus_and_weapons(browser,mobile):
    context,p,fixture=open_page(browser,mobile)
    for case in variants(p,mobile):
        check(p.locator('.weapon-choice').count()==3,case+' all three weapons are displayed')
        for index in range(3):
            button=p.locator('.weapon-choice').nth(index);button.click()
            check(bool(button.get_attribute('title')) and button.get_attribute('title') in p.locator('#weapon-detail').inner_text(),case+' weapon '+str(index+1)+' has its current description')
        screen_text(p,case,['#weapon-detail'],min_size=10)
        p.locator('#pause-button').click();accessible(p,'#continue',case+' settings')
        screen_text(p,case+' settings',['.save-status','.menu-prose'])
        with p.expect_download() as transfer: p.locator('#export-save').click()
        destination=OUT/(case+'-export.json');transfer.value.save_as(str(destination))
        exported=json.loads(destination.read_text(encoding='utf-8'))
        check(exported['checkpoint']['room']==1 and exported['unlocks']==['cinder','scatter','needle'],case+' real export contains the declared entrance and three weapons')
        p.locator('#menu-journal').click()
        check(p.locator('#menu-body p strong').count()==30,case+' field guide displays 20 enemies and 10 bosses')
        p.locator('#menu-body p').last.scroll_into_view_if_needed();capture(p,case+'-field-guide-bottom')
        accessible(p,'#continue',case+' long field guide');p.locator('#continue').click()
        # The actual title Import button opens the browser file chooser.
        previous=p.evaluate('(key)=>localStorage.getItem(key)',KEY)
        with p.expect_file_chooser() as chooser: p.locator('#title-import').click()
        chooser.value.set_files({'name':'declared-ui-save.json','mimeType':'application/json','buffer':json.dumps(fixture).encode('utf-8')})
        p.wait_for_selector('#confirm-import');screen_text(p,case+' import',['.warning-box'])
        accessible(p,'#confirm-import',case+' import');accessible(p,'#cancel-import',case+' import')
        capture(p,case+'-import-confirmation')
        check(p.evaluate('(key)=>localStorage.getItem(key)',KEY)==previous,case+' import waits for explicit confirmation')
        p.locator('#cancel-import').click();p.locator('#continue').click()
        check(p.evaluate('(key)=>localStorage.getItem(key)',KEY)==previous,case+' cancelling import preserves the current save')
    # Complete an actual confirm action after exercising cancellation in every
    # viewport/language; the fixture remains clearly identified in the report.
    reviewed=json.loads(json.dumps(fixture));reviewed['stats']['runs']+=1;reviewed['checkpoint']['seed']+=17
    with p.expect_file_chooser() as chooser:p.locator('#title-import').click()
    chooser.value.set_files({'name':'declared-reviewed-save.json','mimeType':'application/json','buffer':json.dumps(reviewed).encode('utf-8')})
    p.wait_for_selector('#confirm-import');p.locator('#confirm-import').click()
    p.wait_for_function("seed=>!document.querySelector('#menu').open && JSON.parse(localStorage.getItem('cinder-below-v1')).checkpoint.seed===seed",arg=reviewed['checkpoint']['seed'])
    saved=json.loads(p.evaluate('(key)=>localStorage.getItem(key)',KEY))
    check(saved['checkpoint']['seed']==reviewed['checkpoint']['seed'] and saved['stats']==reviewed['stats'] and state(p)['ui']['mode']=='title','confirmed import applies the reviewed save and returns to title')
    context.close()


def build_inventory(browser,mobile):
    context,p,fixture=open_page(browser,mobile,'build');p.locator('#resume-run').click();advance(p,0)
    for case in variants(p,mobile):
        check(len(state(p)['relics'])==12 and p.locator('.build-icon').count()==12,case+' all twelve relics persist through the real Continue action')
        compact=p.evaluate("matchMedia('(max-width:700px),(max-height:500px)').matches")
        if compact:
            check(not p.locator('#build-strip').is_visible(),case+' compact combat hides the twelve-icon strip')
            accessible(p,'#build-menu-toggle',case+' compact relic access',44)
            check(p.locator('#build-count').inner_text()=='12' and '12' in p.locator('#build-menu-toggle').get_attribute('aria-label'),case+' compact relic button communicates all twelve collected relics')
            for target in ['#discovery-panel','#abilities','#move-stick','#aim-stick','#interact-button']:
                no_overlap(p,'#build-menu-toggle',target,case)
        else:
            check(not p.locator('#build-menu-toggle').is_visible(),case+' desktop keeps individual relic access')
            boxes=[]
            for index in range(12):
                p.locator('.build-icon').nth(index).scroll_into_view_if_needed()
                box=geometry(p,f'.build-icon:nth-child({index+1})');boxes.append(box)
            check(all(box['inside'] and box['hit'] for box in boxes),case+' every relic button is reachable by scrolling the inventory strip',boxes)
            p.locator('.build-icon').first.scroll_into_view_if_needed()
        no_overlap(p,'#build-strip','#discovery-panel',case)
        no_overlap(p,'#room-banner','#discovery-panel',case)
        no_overlap(p,'#build-strip','#interact-button',case)
        no_overlap(p,'#build-strip','#abilities',case)
        capture(p,case+'-twelve-relics')
        p.locator('#build-menu-toggle' if compact else '.build-icon').first.click()
        opened=state(p);after_wait=advance(p,80)
        check(opened['ui']['paused'] and opened['ui']['menuOpen'] and after_wait['time']==opened['time'],case+' opening relic descriptions pauses combat without advancing the world')
        check(p.locator('#menu-body p strong').count()==12,case+' build dialog exposes every relic name, level and description')
        paragraphs=[]
        for index in range(12):
            paragraph=p.locator('#menu-body p').nth(index);paragraph.scroll_into_view_if_needed()
            data=geometry(p,f'#menu-body p:nth-child({index+1})');paragraphs.append(data)
        check(all(item['inside'] and not item['overflow'] and item['font']>=12 and len(item['text'])>15 for item in paragraphs),case+' all twelve full relic descriptions are readable through the actual build menu',paragraphs)
        p.locator('#menu-body p').last.scroll_into_view_if_needed();accessible(p,'#continue',case+' build dialog')
        capture(p,case+'-build-description-bottom');p.locator('#continue').click();resumed=advance(p,20)
        check(not resumed['ui']['paused'] and not resumed['ui']['menuOpen'] and resumed['time']>opened['time'],case+' closing relic descriptions resumes the same live encounter',{'before':opened['time'],'after':resumed['time'],'paused':resumed['ui']['paused'],'menuOpen':resumed['ui']['menuOpen']})
    target=next((i for i in state(p)['interactables'] if i['kind']=='offering'),None)
    if target:
        held=set()
        try:
            for _ in range(130):
                s=state(p);player=s['player'];target=next(i for i in s['interactables'] if i['kind']=='offering')
                if math.hypot(player['x']-target['x'],player['y']-target['y'])<10:break
                point=waypoint_to(s,(target['x'],target['y']));dx,dy=point[0]-player['x'],point[1]-player['y']
                keys=({'d'} if dx>5 else {'a'} if dx < -5 else set())|({'s'} if dy>5 else {'w'} if dy < -5 else set())
                for key in held-keys:p.keyboard.up(key)
                for key in keys-held:p.keyboard.down(key)
                held=keys;advance(p,50)
        finally:
            for key in held:p.keyboard.up(key)
        for case in variants(p,mobile):
            check(p.locator('#interact-button').is_visible(),case+' real approach exposes the interaction action')
            accessible(p,'#interact-button',case+' near offering',44)
            no_overlap(p,'#build-strip','#interact-button',case+' near offering')
            no_overlap(p,'#build-strip','#abilities',case+' near offering')
            no_overlap(p,'#room-banner','#interact-button',case+' near offering')
            if p.locator('#build-menu-toggle').is_visible():
                accessible(p,'#build-menu-toggle',case+' near offering',44)
                for target in ['#interact-button','#abilities','#move-stick','#aim-stick']:
                    no_overlap(p,'#build-menu-toggle',target,case+' near offering')
            capture(p,case+'-offering-with-build')
    context.close()


def reward_and_end(browser,mobile):
    context,p,_=open_page(browser,mobile);p.locator('#resume-run').click();advance(p,0)
    language_helper.clear_first_room(p)
    check(state(p)['phase']=='reward' and state(p)['stats']['shots']>0,('mobile' if mobile else 'desktop')+' actual combat earns reward')
    choices=[r['id'] for r in state(p)['choices']]
    for case in variants(p,mobile):
        check([r['id'] for r in state(p)['choices']]==choices,case+' resizing and translation preserve offered relics')
        for index in range(3):
            accessible(p,f'.relic-card:nth-child({index+1})',case+' reward',44)
            screen_text(p,case+' reward '+str(index+1),[f'.relic-card:nth-child({index+1}) .relic-name',f'.relic-card:nth-child({index+1}) .relic-desc'])
        capture(p,case+'-reward-last-card')
    p.locator('.relic-card').first.click();advance(p,0)
    check(state(p)['phase']=='exit' and state(p)['relics'].get(choices[0])==1,'real reward selection applies exactly one relic')
    p.locator('#pause-button').click();p.locator('#abandon').click();p.locator('#play').click();advance(p,0)
    damage=die_from_real_damage(p)
    check(state(p)['phase']=='dead' and len(damage['hits'])>0,'actual enemy damage reaches the defeat screen',damage)
    for case in variants(p,mobile):
        screen_text(p,case+' defeat',['#end-copy','#end-title'])
        no_overlap(p,'#build-menu-toggle','.end-stats',case+' defeat')
        accessible(p,'#retry',case+' defeat',44);accessible(p,'#back-title',case+' defeat',40 if mobile else 24)
        capture(p,case+'-defeat')
    p.locator('#retry').click();advance(p,0)
    check(state(p)['phase']=='combat' and state(p)['player']['hp']==6,'real retry starts a healthy new run')
    context.close()


def boss_geometry(p,case,stage2=False):
    data=geometry(p,'#boss-hud');name=geometry(p,'#boss-name');status=geometry(p,'#boss-status')
    short=p.evaluate("matchMedia('(max-height:500px)').matches")
    check(p.locator('#boss-hud').evaluate('(el)=>el.parentElement.id')==('run-hud' if short else 'combat-ui'),case+' rotating preserves and places the Boss HUD in its intended container')
    tools=[geometry(p,selector) for selector in ['#language-toggle','#audio-toggle','#fullscreen','#pause-button']]
    check(all(item['inside'] and item['hit'] and item['w']>=36 and item['h']>=36 for item in tools),case+' all four header controls remain visible and operable beside the Boss HUD',tools)
    check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),case+' Boss header does not create horizontal page overflow')
    for target in ['.tools','.vitals','#build-menu-toggle']:
        no_overlap(p,'#boss-hud',target,case)
    # Narrow displays deliberately truncate the name. Full title text and the
    # separate visible phase/status are the replacement information contract.
    name_readable=not name['overflow'] or (name['textOverflow']=='ellipsis' and name['title']==name['text'])
    check(data['inside'] and not data['overflow'] and name_readable and not status['overflow'],case+' Boss health/name/attack status fit their HUD',{'hud':data,'name':name,'status':status})
    check(name['font']>=11 and status['font']>=9 and bool(status['text']),case+' Boss phase status is present',status)
    if stage2:
        compact=p.evaluate("matchMedia('(max-width:700px),(max-height:500px)').matches")
        check('2' in name['text'] and name_readable and (not compact or '2' in status['text']),case+' actual Boss phase 2 remains readable with the full name preserved',{'name':name,'status':status})
    for stick in ['#move-stick','#aim-stick']:
        no_overlap(p,'#boss-hud',stick,case)
        if p.locator(stick).is_visible():
            box=geometry(p,stick);cx,cy=box['x']+box['w']/2,box['y']+box['h']/2
            check(not(data['x']<=cx<=data['right'] and data['y']<=cy<=data['bottom']),case+' Boss HUD leaves '+stick+' touch center clear',box)
    s=state(p);canvas=p.locator('#world').bounding_box()
    for kind,actor in [('player',s['player']),('boss',next(e for e in s['enemies'] if e['boss']))]:
        cx=canvas['x']+actor['x']/s['width']*canvas['width'];cy=canvas['y']+actor['y']/s['height']*canvas['height']
        check(not(data['x']<=cx<=data['right'] and data['y']<=cy<=data['bottom']),case+' Boss HUD leaves actual '+kind+' center visible',{'center':[cx,cy],'hud':data})


def boss_hud(browser,mobile):
    context,p,_=open_page(browser,mobile,'boss');p.locator('#resume-run').click();advance(p,0)
    # Initial phase and attack tells come from an authentic restored boss room.
    encountered=set();samples=[]
    for _ in range(100):
        s=state(p);boss=next((e for e in s['enemies'] if e['boss']),None)
        if not boss or s['phase']!='combat':break
        if boss['phase'] not in encountered:
            encountered.add(boss['phase']);samples.append({'phase':boss['phase'],'status':p.locator('#boss-status').inner_text(),'hp':boss['hp']})
        if boss['phase']=='windup':break
        advance(p,50)
    check('windup' in encountered,('mobile' if mobile else 'desktop')+' live boss reaches a readable windup',samples)
    for case in variants(p,mobile):
        boss_geometry(p,case)
        capture(p,case+'-boss-windup')
    REPORT['specimens'].append({'kind':'boss-windup','mobile':mobile,'samples':samples,'state':state(p)})
    stage=boss_combat(p,stop_at_stage2=True)
    boss=next((e for e in stage['enemies'] if e['boss']),None)
    check(bool(boss and boss['stage']>1),('mobile' if mobile else 'desktop')+' real attacks reach Boss phase 2',{'phase':stage['phase'],'hp':stage['player']['hp'],'shots':stage['stats']['shots']})
    if boss and boss['stage']>1:
        for case in variants(p,mobile):
            boss_geometry(p,case,stage2=True)
            capture(p,case+'-boss-phase2')
        final=boss_combat(p)
        check(final['phase']=='won',('mobile' if mobile else 'desktop')+' actual final-room combat reaches victory from declared entrance',{'phase':final['phase'],'hp':final['player']['hp'],'shots':final['stats']['shots']})
        if final['phase']=='won':
            for case in variants(p,mobile):
                screen_text(p,case+' victory',['#end-copy','#end-title'])
                no_overlap(p,'#build-menu-toggle','.end-stats',case+' victory')
                check(not p.locator('#build-menu-toggle').is_visible(),case+' victory does not retain the combat-only relic shortcut')
                accessible(p,'#retry',case+' victory',44)
                accessible(p,'#back-title',case+' victory',40 if mobile else 24)
                capture(p,case+'-victory')
    context.close()


def boss_combat(p,stop_at_stage2=False):
    """Read-only threat sampling, actual keys and mouse; no combat overrides."""
    held=set()
    box=p.locator('#world').bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);p.mouse.down()
    try:
        for _ in range(700):
            s=state(p);boss=next((e for e in s['enemies'] if e['boss']),None)
            if s['phase']!='combat' or (stop_at_stage2 and boss and boss['stage']>1):return s
            if not s['enemies']:advance(p,100);continue
            a=s['player'];target=boss or min(s['enemies'],key=lambda e:math.hypot(e['x']-a['x'],e['y']-a['y']))
            box=p.locator('#world').bounding_box()
            p.mouse.move(box['x']+target['x']/s['width']*box['width'],box['y']+target['y']/s['height']*box['height'])
            angle=math.atan2(a['y']-target['y'],a['x']-target['x'])+.2
            goal=(target['x']+math.cos(angle)*280,target['y']+math.sin(angle)*280);candidates=[]
            for dx,dy in [(0,0),(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]:
                f=(a['x']+dx*32,a['y']+dy*32);bottom=s['height']-(150 if s['height']>s['width'] else 28)
                if not(45<f[0]<s['width']-45 and 83<f[1]<bottom-17 and language_helper.unobstructed(s,(a['x'],a['y']),f)):continue
                risk=sum(max(0,75-math.hypot(e['x']-f[0],e['y']-f[1]))**2 for e in s['enemies'])
                risk+=sum(max(0,42-math.hypot(q['x']+q['vx']*.18-f[0],q['y']+q['vy']*.18-f[1]))**2 for q in s['bullets'] if q['owner']=='enemy')
                candidates.append((math.dist(goal,f)+risk,dx,dy,risk))
            if candidates:
                _,dx,dy,risk=min(candidates)
                keys=({'a'} if dx<0 else {'d'} if dx>0 else set())|({'w'} if dy<0 else {'s'} if dy>0 else set())
                for key in held-keys:p.keyboard.up(key)
                for key in keys-held:p.keyboard.down(key)
                held=keys
                if risk>500 and a['dashCooldown']<=0:p.keyboard.press('Space')
                if math.hypot(a['x']-target['x'],a['y']-target['y'])<190 and a['novaCharge']>=100:p.keyboard.press('e')
            advance(p,100)
        return state(p)
    finally:
        p.mouse.up()
        for key in held:p.keyboard.up(key)


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    sources=['app.js','index.html','home.css','polish.css','renderer.js','engine.js','rooms.js']
    hashes=lambda:{name:hashlib.sha256((ROOT/'src'/name).read_bytes()).hexdigest() for name in sources}
    REPORT['source_sha256']=hashes()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            for mobile in [False,True]:
                for task in [menus_and_weapons,build_inventory,reward_and_end,boss_hud]:
                    try:task(browser,mobile)
                    except Exception as error:
                        check(False,f'{task.__name__} mobile={mobile} completed',str(error))
            browser.close()
        check(not REPORT['errors'] and not REPORT['console_errors'],'no page or console errors',REPORT['errors']+REPORT['console_errors'])
        current=hashes();REPORT['changed_during_run']=[name for name in sources if current[name]!=REPORT['source_sha256'][name]]
        check(not REPORT['changed_during_run'],'examined source files remain unchanged during this acceptance run',REPORT['changed_during_run'])
    finally:
        (OUT/'report.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'checks':len(REPORT['checks']),'failed':[c['name'] for c in REPORT['checks'] if not c['passed']],'screenshots':len(REPORT['screenshots'])}),flush=True)
    if any(not check['passed'] for check in REPORT['checks']):raise SystemExit(1)


if __name__=='__main__':main()
