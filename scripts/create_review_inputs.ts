import fs from 'node:fs';
import {createModel,step,Input} from '../src/game/model.ts';
fs.mkdirSync('.qa/art-review',{recursive:true});
const m=createModel();const inputs:any[]=[];const seen:any[]=[];let last=0;let phase='run-jump';
function go(n:number,i:Partial<Input>={}){for(let t=0;t<n;t++){inputs.push({...i,phase});step(m,i);for(const e of m.log)if(e.id>last){last=e.id;seen.push(e)}}}
function wait(check:()=>boolean,max=180,i:Partial<Input>={}){for(let n=0;n<max&&!check();n++)go(1,i)}
go(20,{move:1});go(1,{move:1,jumpPressed:true});wait(()=>m.hero.grounded&&m.hero.x>170,65,{move:1});
phase='ordinary-block';wait(()=>m.enemies[0].action==='windup',100);go(1,{guardHeld:true,guardPressed:true});wait(()=>seen.some(e=>e.type==='block'),100,{guardHeld:true});go(1);
phase='read-attack-and-parry';let guarding=false;
for(let n=0;n<360&&!seen.some(e=>e.type==='parry');n++){
 const s=m.enemies[0];const ready=s.action==='windup'&&s.actionTime>=410&&m.time>=m.hero.invulnerableUntil&&!['hurt','hurtRecover'].includes(m.hero.action);
 const down=ready||guarding&&s.action==='windup';go(1,{guardHeld:down,guardPressed:down&&!guarding});guarding=down;
}
phase='directional-shove';go(1,{move:1,attackPressed:true});go(28);
phase='dodge-through-light-enemy';wait(()=>m.enemies[0].x-m.hero.x<=40,40,{move:1});go(1,{move:1,dodgePressed:true});go(18,{move:1});
phase='cannon';wait(()=>m.hero.x>=602,180,{move:1});go(1,{interactPressed:true});go(65);
phase='jump-to-musketeer';go(10,{move:-1});go(1,{move:-1,jumpPressed:true});
for(let n=0;n<60&&!m.hero.grounded;n++)go(1,{move:m.hero.x>m.enemies[1].x+25?-1:0});
phase='punish-reload';for(let t=0;t<3&&m.enemies[1].hp>0;t++){go(1,{move:-1,attackPressed:true});go(30);}
phase='movement-and-air-slash';go(35,{move:-1});go(1,{move:-1,jumpPressed:true});go(10,{move:-1});go(1,{move:-1,attackPressed:true});go(40,{move:-1});go(1,{move:1,dodgePressed:true});go(25,{move:1});
go(25,{move:1});go(1,{move:1,jumpPressed:true});go(40,{move:1});
phase='end-pose';while(inputs.length<1080)go(1);
fs.writeFileSync('.qa/art-review/sample-inputs.json',JSON.stringify({fps:60,inputs:inputs.slice(0,1080),expected:seen,final:{tick:m.tick,hp:m.hero.hp,enemies:m.enemies.map(e=>({id:e.id,hp:e.hp}))}},null,2));
console.log(JSON.stringify({frames:inputs.length,events:seen.filter(e=>['block','parry','shove','hurt','cannonFire','cannonHit','death'].includes(e.type)).map(e=>({tick:e.tick,type:e.type,target:e.target})),end:{hp:m.hero.hp,enemies:m.enemies.map(e=>e.hp)}}));
