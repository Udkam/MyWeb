"""Focused real-browser discovery integration, using explicitly labelled room-entry fixtures.

Fixtures are generated offline through engine/storage exports and loaded into isolated
browser contexts. After resume, only real keyboard/mouse/tap inputs and public time/read
hooks are used. No live game state is changed. This is not full-run/balance evidence.
Usage: python tests/browser-adventure-check.py http://127.0.0.1:4328/src/?test=1
"""
import heapq
import json
import math
import pathlib
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'.qa'/'adventure'
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4328/src/?test=1'
REPORT={'url':URL,'evidence':'Explicit seed/room-entry fixtures, then real visible controls; not a full run.','checks':[],'errors':[],'console_errors':[],'fixtures':[],'screenshots':[]}

def check(ok,name,detail=None):
    REPORT['checks'].append({'name':name,'passed':bool(ok),'detail':detail})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)
    if not ok:raise AssertionError(name)

def state(page):return json.loads(page.evaluate('window.render_game_to_text()'))
def advance(page,ms=0):page.evaluate('(ms)=>window.advanceTime(ms)',ms);return state(page)

def fixture(seed):
    source="""import {createRun,enterRoom,snapshot} from './src/engine.js';
import {createDefaultSave,exportSave} from './src/storage.js';
const seed=Number(process.argv[1]);const s=createRun({seed});
s.phase='exit';s.stats.rooms=1;s.stats.embers=30;s.relics={cold:1};s.player.hp=4;s.player.novaCharge=20;
enterRoom(s,'refuge');
const save=createDefaultSave();save.stats={runs:1,wins:0,kills:0,rooms:1,embers:30,bestRoom:2};
save.banked={kills:0,rooms:1,embers:30};save.checkpoint=snapshot(s);console.log(exportSave(save));"""
    data=json.loads(subprocess.check_output(['node','--input-type=module','-e',source,str(seed)],cwd=ROOT,text=True,encoding='utf-8'))
    path=OUT/f'fixture-room2-seed{seed}.json';path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    REPORT['fixtures'].append({'seed':seed,'room':2,'campaign':'five-acts','route':'refuge','path':str(path),'synthetic_entry':True})
    return data

def open_case(browser,name,seed,mobile=False):
    context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 960},is_mobile=mobile,has_touch=mobile,locale='en-US')
    context.add_init_script('localStorage.setItem("cinder-below-v1",'+json.dumps(json.dumps(fixture(seed)))+');')
    page=context.new_page()
    page.on('pageerror',lambda e:REPORT['errors'].append({'case':name,'error':str(e)}))
    page.on('console',lambda m:REPORT['console_errors'].append({'case':name,'error':m.text}) if m.type=='error' else None)
    page.goto(URL,wait_until='domcontentloaded')
    page.wait_for_function("typeof window.render_game_to_text==='function'&&JSON.parse(window.render_game_to_text()).ui.ready")
    page.locator('#resume-run').click();s=advance(page)
    check(s['room']==2 and s['seed']==seed and s['ui']['storageStatus']=='saved',name+': valid entry fixture resumes through the real UI')
    return context,page

def free(s,x,y,pad=16):
    bottom=s['height']-(150 if s['height']>s['width'] else 28)
    if x<28+pad or x>s['width']-28-pad or y<66+pad or y>bottom-pad:return False
    return not any(math.hypot(x-max(o['x'],min(o['x']+o['w'],x)),y-max(o['y'],min(o['y']+o['h'],y)))<pad for o in s['obstacles'])

def line_clear(s,a,b):
    steps=max(1,math.ceil(math.dist(a,b)/8))
    return all(free(s,a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps) for i in range(steps+1))

def next_waypoint(s,target):
    p=(s['player']['x'],s['player']['y']);goal=(target['x'],target['y'])
    if line_clear(s,p,goal):return goal
    size=22
    nodes=[(x,y) for x in range(44,int(s['width']-43),size) for y in range(82,int(s['height']-(166 if s['height']>s['width'] else 44)),size) if free(s,x,y)]
    node_set=set(nodes);start=min(nodes,key=lambda n:math.dist(n,p));end=min(nodes,key=lambda n:math.dist(n,goal))
    queue=[(0,start)];cost={start:0};previous={}
    while queue:
        _,n=heapq.heappop(queue)
        if n==end:break
        for dx,dy in [(size,0),(-size,0),(0,size),(0,-size),(size,size),(size,-size),(-size,size),(-size,-size)]:
            nxt=(n[0]+dx,n[1]+dy)
            if nxt not in node_set or not line_clear(s,n,nxt):continue
            alt=cost[n]+math.hypot(dx,dy)
            if alt<cost.get(nxt,float('inf')):cost[nxt]=alt;previous[nxt]=n;heapq.heappush(queue,(alt+math.dist(nxt,end),nxt))
    if end not in cost:raise AssertionError('No route to '+target['kind'])
    route=[end]
    while route[-1]!=start:route.append(previous[route[-1]])
    route.reverse()
    for point in route[1:]:
        if math.dist(p,point)>25:return point
    return goal

def move_to(page,target_id,stop=43):
    held=set()
    try:
        for _ in range(150):
            s=state(page)
            if s['phase'] not in ('combat','exit'):raise AssertionError('Run left playable phase while moving: '+s['phase'])
            target=next(i for i in s['interactables'] if i['id']==target_id)
            p=s['player']
            if math.hypot(p['x']-target['x'],p['y']-target['y'])<=stop:return s
            x,y=next_waypoint(s,target);dx,dy=x-p['x'],y-p['y']
            desired=({'d'} if dx>8 else {'a'} if dx<-8 else set())|({'s'} if dy>8 else {'w'} if dy<-8 else set())
            for key in held-desired:page.keyboard.up(key)
            for key in desired-held:page.keyboard.down(key)
            held=desired;advance(page,80)
        raise AssertionError('Navigation timeout '+target_id)
    finally:
        for key in held:page.keyboard.up(key)
        advance(page)

def capture(page,name):
    path=OUT/name;page.screenshot(path=str(path),full_page=True);REPORT['screenshots'].append(str(path))

def run_lamps(browser):
    context,page=open_case(browser,'lamp-sequence',3)
    lamps=sorted([i for i in state(page)['interactables'] if i['kind']=='lamp'],key=lambda i:i['order'])
    check(len(lamps)==3,'three lamps exist as actual room objects')
    move_to(page,lamps[1]['id']);page.keyboard.press('q');s=advance(page)
    check(all(i['status']=='ready' for i in s['interactables'] if i['kind']=='lamp'),'wrong visible lamp order resets the puzzle')
    before=s['stats']['embers']
    for lamp in lamps:move_to(page,lamp['id']);page.keyboard.press('q');advance(page)
    s=state(page);check('2:lamps' in s['adventure']['claims'] and s['stats']['embers']==before+6,'normal movement and Q complete lamp sequence and award six embers once')
    capture(page,'lamps-complete.png');context.close()

def run_traveler(browser):
    context,page=open_case(browser,'traveler-mobile',2,True)
    traveler=next(i for i in state(page)['interactables'] if i['kind']=='traveler')
    before=state(page)['stats']['embers'];move_to(page,traveler['id'])
    button=page.locator('#interact-button');check(button.is_visible(),'nearby traveler exposes mobile interaction button')
    box=button.bounding_box();check(box['width']>=44 and box['height']>=44,'mobile interaction touch target is at least 44px',box)
    button.tap();s=advance(page)
    check(s['adventure']['escort']=={'fromRoom':2,'dueRoom':3} and s['stats']['embers']==before,'real mobile tap starts escort without prematurely awarding next-room reward')
    capture(page,'traveler-mobile.png');context.close()

def run_offering(browser):
    context,page=open_case(browser,'offering',1)
    offering=next(i for i in state(page)['interactables'] if i['kind']=='offering')
    move_to(page,offering['id']);before=state(page);page.keyboard.press('q');s=advance(page)
    check(s['adventure']['spent']==10 and s['wallet']==before['wallet']-10 and s['stats']['embers']==before['stats']['embers'],'offering subtracts spendable balance while preserving bankable gross income')
    check(s['player']['hp']>=before['player']['hp'] and s['player']['novaCharge']==100,'offering actually restores hearts and fills nova')
    check(page.locator('#ember-count').inner_text()==str(s['wallet']),'top HUD displays remaining spendable embers')
    page.keyboard.press('q');check(advance(page)['adventure']['spent']==10,'repeated Q does not charge a completed offering again')
    capture(page,'offering-complete.png');context.close()

def run_wall(browser):
    context,page=open_case(browser,'hidden-wall',2)
    wall=next(i for i in state(page)['interactables'] if i['kind']=='cracked-wall')
    move_to(page,wall['id'],85);s=state(page);box=page.locator('#world').bounding_box()
    page.mouse.move(box['x']+wall['x']/s['width']*box['width'],box['y']+wall['y']/s['height']*box['height']);page.mouse.down()
    observed=[]
    try:
        for _ in range(25):
            s=advance(page,80);item=next(i for i in s['interactables'] if i['id']==wall['id']);observed.append(item['hits'])
            if item['kind']=='chest':break
    finally:page.mouse.up()
    check(item['kind']=='chest' and item['hits']==3 and 1 in observed and 2 in observed,'three separate real shots reveal the hidden chest',observed)
    capture(page,'chest-revealed.png');move_to(page,wall['id']);before=state(page)['stats']['embers'];page.keyboard.press('q');s=advance(page)
    check('2:chest' in s['adventure']['claims'] and s['stats']['embers']==before+12,'Q opens the revealed chest and banks its single reward')
    page.keyboard.press('q');check(advance(page)['stats']['embers']==s['stats']['embers'],'claimed chest cannot pay twice')
    context.close()

def main():
    OUT.mkdir(parents=True,exist_ok=True);started=time.perf_counter()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True);REPORT['browser']=browser.version
            try:
                for scenario in [run_lamps,run_traveler,run_offering,run_wall]:scenario(browser)
            finally:browser.close()
    except Exception as error:REPORT['failure']=str(error);print('STOP '+str(error),flush=True)
    REPORT['wall_seconds']=round(time.perf_counter()-started,2);REPORT['passed']=not REPORT.get('failure') and not REPORT['errors'] and not REPORT['console_errors'] and all(i['passed'] for i in REPORT['checks'])
    (OUT/'report.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'passed':REPORT['passed'],'checks':len(REPORT['checks']),'failure':REPORT.get('failure'),'errors':REPORT['errors'],'console_errors':REPORT['console_errors']}),flush=True)
    return 0 if REPORT['passed'] else 1

if __name__=='__main__':raise SystemExit(main())
