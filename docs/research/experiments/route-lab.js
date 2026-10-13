import {TOOLS,CASES,createTrip,getRoutes,travel,undoTrip,getOutcome} from './route-v3.mjs';
const $=id=>document.getElementById(id);
const terrain={plain:'平路',forest:'林路',rain:'雨路',cliff:'攀越',tunnel:'隧道'};
let caseId=CASES[0].id,selected=[],trip=null;
$('case').innerHTML=CASES.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
function render(){const c=CASES.find(c=>c.id===caseId),slots=selected.reduce((s,id)=>s+TOOLS.find(t=>t.id===id).slots,0);
 $('description').textContent=c.description;
 $('slots').innerHTML=Array.from({length:4},(_,i)=>`<span class="${i<slots?'full':''}"></span>`).join('')+`<small>${slots} / 4 格</small>`;
 $('tools').innerHTML=TOOLS.map(t=>`<button class="tool" data-tool="${t.id}" aria-pressed="${selected.includes(t.id)}" ${trip?'disabled':''}><strong>${t.name} · ${t.slots} 格</strong><small>${t.description}</small></button>`).join('');
 $('start').disabled=Boolean(trip);$('case').disabled=Boolean(trip);$('undo').disabled=!trip?.history.length;
 const mapTrip=createTrip(caseId,selected);
 $('map').innerHTML=c.edges.map(e=>{const from=c.nodes.find(n=>n.id===e.from),to=c.nodes.find(n=>n.id===e.to),r=getRoutes({...mapTrip,position:e.from}).find(x=>x.id===e.id);return `<tr><td>${from.name} → ${to.name}<br><small>${terrain[e.terrain]}</small></td><td>${r.cost}</td><td>${e.requires?TOOLS.find(t=>t.id===e.requires).name+' · ':''}${to.kind==='delivery'?'送达信件':to.kind==='guest'?to.keepsake:to.collection?'采集 '+r.reward.collection:'—'}</td></tr>`}).join('');
 $('current').textContent=trip?c.nodes.find(n=>n.id===trip.position).name:'还在小屋';
 $('energy').textContent=trip?`本趟精力 ${trip.energy} / ${c.energy} · ${trip.delivered?'信已送达':'信在包里'} · 采集 ${trip.collection}`:`出发精力 ${c.energy} · 仅用于本趟，回家后不计分。`;
 $('routes').innerHTML=trip?getRoutes(trip).map(r=>`<button class="route" data-route="${r.id}" ${r.safeAvailable?'':'disabled'}><strong>${r.name} · 用 ${r.cost} 精力</strong><small>${terrain[r.terrain]}${r.requires?' / '+TOOLS.find(t=>t.id===r.requires).name:''} → 余 ${r.energyAfter}${r.reward.collection?' · 采集 +'+r.reward.collection:''}${r.reward.keepsake?' · 留下 '+r.reward.keepsake:''}${r.reward.delivery?' · 送达信件':''}${r.reward.energyRestore?' · 热茶恢复 '+r.reward.energyRestore:''}${r.reason?' · '+r.reason:''}</small></button>`).join(''):'<p>先看路段，再选工具。可以空包出发，但捷径需要对应工具。</p>';
 $('outcome').hidden=!trip?.done;
 if(trip?.done){const o=getOutcome(trip);$('outcome').textContent=`${o.delivered?'信已经送达。':'信尚未送达。'}这次 ${o.keepsake?'得到“'+o.keepsake+'”':'没有拜访支线客人'}，带回 ${o.collection} 件采集物。走了 ${o.steps} 段路。剩余精力 ${o.energyLeft} 不计永久收益。`}
 $('history').innerHTML=trip?.log.map(l=>`<li>${l.name}：精力 ${l.energyBefore} → ${l.energyAfter}${l.delivered?' · 送达':''}${l.guestId?' · 会见客人':''}${l.collectionGained?' · 采集 '+l.collectionGained:''}</li>`).join('')||'';
}
function act(fn){try{fn();$('status').textContent='';render()}catch(e){$('status').textContent=e.message}}
$('tools').onclick=e=>{const b=e.target.closest('[data-tool]');if(!b||trip)return;act(()=>{const next=selected.includes(b.dataset.tool)?selected.filter(id=>id!==b.dataset.tool):[...selected,b.dataset.tool];createTrip(caseId,next);selected=next})};
$('case').onchange=()=>{caseId=$('case').value;render()};$('start').onclick=()=>act(()=>{trip=createTrip(caseId,selected)});$('restart').onclick=()=>act(()=>{trip=null});$('undo').onclick=()=>act(()=>{trip=undoTrip(trip)});
$('routes').onclick=e=>{const b=e.target.closest('[data-route]');if(b)act(()=>{trip=travel(trip,b.dataset.route)})};
window.render_game_to_text=()=>JSON.stringify({caseId,selected,trip:trip?{...trip,history:trip.history.length}:null,routes:trip?getRoutes(trip):[],outcome:trip?getOutcome(trip):null});window.advanceTime=()=>render();render();
