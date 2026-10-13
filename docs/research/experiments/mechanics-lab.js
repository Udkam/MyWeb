import {createRun,getOptions,getGoals,preview,place,undo,reroll,SCENARIOS,TILE_TYPES,getResult} from './prototype.mjs';
const $=id=>document.getElementById(id);
const labels=Object.fromEntries(TILE_TYPES.map(tile=>[tile.id,tile.name]));
const animals=Object.fromEntries(SCENARIOS.flatMap(s=>s.goals).map(id=>[id,id]));
let seed=1,run=createRun(seed),card=null,cell=null;
$('scenario').innerHTML=SCENARIOS.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
function render(){
 const opts=getOptions(run),goals=getGoals(run);
 goals.forEach(g=>animals[g.id]=g.name);
 if(!opts.cards.some(c=>c.id===card))card=opts.cards[0]?.id??null;
 $('board').innerHTML=run.board.map((tile,i)=>`<button class="cell" data-cell="${i}" data-tile="${tile}" data-legal="${opts.legalCells.includes(i)}" aria-label="第${Math.floor(i/5)+1}行第${i%5+1}列 ${labels[tile]|| (tile==='blocked'?'障碍':'空地')}" aria-pressed="${cell===i}" ${!opts.legalCells.includes(i)?'disabled':''}>${labels[tile]|| (tile==='blocked'?'×':'·')}</button>`).join('');
 $('cards').innerHTML=opts.cards.map(c=>`<button data-card="${c.id}" aria-pressed="${c.id===card}" ${opts.done?'disabled':''}>${c.name}</button>`).join('');
 $('goals').innerHTML=goals.map(g=>`<article data-complete="${g.complete}"><strong>${g.complete?'已满足 · ':''}${g.name}</strong><p>${g.description}</p><progress value="${g.progress}" max="1"></progress></article>`).join('');
 $('turn').textContent=`已放 ${run.turn} / 12 手 · 换牌剩 ${run.rerollsLeft} 次`;
 $('scenario-note').textContent=SCENARIOS.find(s=>s.id===run.scenario).description;
 $('undo').disabled=!opts.canUndo;$('reroll').disabled=opts.done||!opts.rerollsLeft;
 const p=card!==null&&cell!==null?preview(run,card,cell):null;
 $('confirm').disabled=!p?.ok;
 $('preview').textContent=opts.done?`这座庭院完成了。${getResult(run).count}/3 位伙伴满足条件。可撤销继续调整。`:p?.ok?`${labels[opts.cards.find(c=>c.id===card).type]}放在第${Math.floor(cell/5)+1}行第${cell%5+1}列。${p.completed.length?'新满足：'+p.completed.map(id=>animals[id]).join('、')+'。':''}${p.lost.length?'将失去：'+p.lost.map(id=>animals[id]).join('、')+'。':''}${!p.completed.length&&!p.lost.length?'目标状态不变。':''}`:p?.reason||'选择地貌，再点虚线空格预览。';
}
function act(fn){try{run=fn(run);cell=null;$('status').textContent='';render();}catch(e){$('status').textContent=e.message}}
$('board').onclick=e=>{const target=e.target.closest('[data-cell]');if(target){cell=Number(target.dataset.cell);render()}};
$('cards').onclick=e=>{const target=e.target.closest('[data-card]');if(target){card=target.dataset.card;render()}};
$('confirm').onclick=()=>act(r=>place(r,card,cell));$('undo').onclick=()=>act(undo);$('reroll').onclick=()=>act(reroll);
$('scenario').onchange=()=>{run=createRun(seed,$('scenario').value);card=null;cell=null;render()};
$('restart').onclick=()=>{run=createRun(++seed,$('scenario').value);card=null;cell=null;render()};
window.render_game_to_text=()=>JSON.stringify({coordinateSystem:'5×5; index=row*5+col; origin top-left',...run,history:run.history.length,goals:getGoals(run),options:getOptions(run),selected:{card,cell}});
window.advanceTime=()=>render();
window.addEventListener('keydown',e=>{if(e.key==='f'&&!['SELECT','INPUT'].includes(document.activeElement.tagName))document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()});
render();
