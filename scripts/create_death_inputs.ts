import fs from 'node:fs';
import {createModel,step,restart,type Input} from '../src/game/model.ts';
fs.mkdirSync('.qa/art-review',{recursive:true});
const m=createModel();const inputs:any[]=[];
function go(n:number,input:Partial<Input>={}){for(let t=0;t<n;t++){inputs.push(input);step(m,input)}}
function wait(check:()=>boolean,max=180,input:Partial<Input>={}){for(let n=0;n<max&&!check();n++)go(1,input)}
go(20,{move:1});go(1,{move:1,jumpPressed:true});wait(()=>m.hero.grounded&&m.hero.x>170,65,{move:1});
wait(()=>m.enemies[0].action==='windup'&&m.enemies[0].actionTime>=410,100);
go(1,{guardPressed:true,guardHeld:true});wait(()=>m.hero.parryTarget!==null,12,{guardHeld:true});
go(1,{move:1,attackPressed:true});go(28);wait(()=>m.enemies[0].x-m.hero.x<=40,40,{move:1});
go(1,{move:1,dodgePressed:true});go(18,{move:1});wait(()=>m.hero.x>=602,180,{move:1});
go(1,{interactPressed:true});go(65);
wait(()=>m.hero.x<=560,30,{move:-1});wait(()=>m.cannon.action==='idle',100);
go(1,{interactPressed:true});wait(()=>m.hero.hp<=3,60);wait(()=>m.cannon.action==='idle',100);
// Re-enter range through normal movement if recoil moved the operator too far.
wait(()=>m.hero.x>=538,30,{move:1});go(1,{interactPressed:true});wait(()=>m.hero.hp===0,60);
if(m.hero.hp!==0)throw new Error('Natural two-cannon death was not reached');
go(60);inputs.push({command:'restart'});restart(m);go(60);
fs.writeFileSync('.qa/art-review/death-inputs.json',JSON.stringify({fps:60,inputs},null,2));
console.log(JSON.stringify({ticks:inputs.length,duration:inputs.length/60,deathAndRestart:true}));
