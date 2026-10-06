import test from 'node:test';
import assert from 'node:assert/strict';
import { scriptPlan,sceneWindows,validateAnimations } from './production.mjs';
test('Long scripts split into bounded resumable parts with exact total target',()=>{
 const p=scriptPlan([{share:.1,title:'hook'},{share:.9,title:'story'}],30);
 assert.equal(p.reduce((s,x)=>s+x.targetWords,0),4500);assert(p.every(x=>x.targetWords>0&&x.targetWords<=220));
 assert.throws(()=>scriptPlan([],5));assert.throws(()=>scriptPlan([{}],Infinity));
});
test('Sequential scene batches preserve every original word once and exact duration',()=>{
 const words=Array.from({length:143},(_,i)=>'word'+i),scenes=[];
 while(true){const p=sceneWindows(words.join(' '),73,10,scenes.length);if(!p.windows.length)break;assert(p.windows.length<=4);scenes.push(...p.windows);}
 assert.equal(scenes.map(x=>x.narration).join(' '),words.join(' '));assert.equal(scenes.reduce((s,x)=>s+x.duration,0),73);
 assert.deepEqual(scenes.map(x=>x.index),[1,2,3,4,5,6,7,8]);assert.equal(scenes.at(-1).duration,3);
 assert.throws(()=>sceneWindows('one two',40,10));
});
test('Animation batches reject wrong, duplicate, missing or empty scene IDs',()=>{
 const scenes=[{scene:5},{scene:9}],good=[{scene:9,prompt:'move'},{scene:5,prompt:'blink'}];assert.deepEqual(validateAnimations(good,scenes),good);
 for(const bad of [[],[{scene:5,prompt:'a'},{scene:5,prompt:'b'}],[{scene:5,prompt:'a'},{scene:9,prompt:''}],[{scene:1,prompt:'a'},{scene:2,prompt:'b'}]])assert.throws(()=>validateAnimations(bad,scenes));
});

test('scene context sends batch narration and visual identity without full research or outline',async()=>{
 const {compactSceneContext}=await import('./production.mjs');const c=compactSceneContext({topic:'Sumer',angle:'Law',sources:[{text:'HUGE'}],outline:['HUGE'],narration:'FULL',visualProfile:{style:'flat'},characterDescription:'Mascot',language:'vi'},[{narration:'Only this batch'}]);
 assert.equal(c.narration,'Only this batch');assert.equal(c.topic,'Sumer');assert.deepEqual(c.visualProfile,{style:'flat'});assert(!('sources' in c));assert(!('outline' in c));
});
