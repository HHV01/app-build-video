import test from 'node:test';
import assert from 'node:assert/strict';
import {scriptTarget,scriptPlan} from './production.mjs';
import {ensureScriptLength} from './public/script-length.mjs';
import {buildProofedScript,proofIsCurrent} from './public/script-proof.mjs';
import {writeOutlineScript} from './public/script-draft.mjs';
import {writeChannelScript} from './public/channel-plans.mjs';
const count=s=>s.trim().split(/\s+/).length;
const letters=i=>{let s='';do{s=String.fromCharCode(97+i%26)+s;i=Math.floor(i/26)-1;}while(i>=0);return s;};
function prose(n,prefix='ý',offset=0){return Array.from({length:Math.ceil(n/100)},(_,part)=>Array.from({length:Math.min(100,n-part*100)},(_,i)=>prefix+letters(offset+part*100+i)).join(' ')+'.').join('\n\n');}
const outline=[{title:'Mở đầu',share:.1},{title:'Cơ chế',share:.8},{title:'Kết',share:.1}];
const researchFacts=[{claim:'Một thay đổi trong quy trình có thể làm thay đổi cách phân chia công việc.',status:'supported',sourceId:'provided'}];
const ready=()=>({overall:'ready',summary:'Đã đọc toàn bài.',strengths:[],rubric:['hook','flow','clarity','novelty','ending'].map(criterion=>({criterion,verdict:'good',reason:'Đạt.'})),issues:[]});

test('explicit word target overrides minutes, exact allocation is bounded, invalid targets reject',()=>{
 assert.equal(scriptTarget({minutes:1,targetWords:'5000'}),5000);assert.equal(scriptTarget({minutes:2,targetWords:''}),300);
 const plan=scriptPlan(outline,1,150,400,5000);assert.equal(plan.reduce((n,x)=>n+x.targetWords,0),5000);assert(plan.every(x=>x.targetWords<=400));
 for(const targetWords of [0,-1,50,5000.5,'oops',20001])assert.throws(()=>scriptTarget({minutes:1,targetWords}));
});

test('ordinary and planned writing use the same 5000-word budget without one giant model call',async()=>{
 for(const planned of [false,true]){
  const p={minutes:1,targetWords:5000,outline,approved:[]},c=planned?{openingPlan:[{kind:'fixed',text:'Đây là lời mở đầu.'}],closingPlan:[{kind:'fixed',text:'Đây là lời kết.'}]}:{};let calls=0;
  await (planned?writeChannelScript:writeOutlineScript)(c,p,{save:async()=>{},generate:async(action,ctx)=>{calls++;assert.equal(action,'script');assert(ctx.targetWords<=600);return {narration:prose(ctx.targetWords,'mới',calls*1000)};}});
  assert.equal(count(p.narration),5000);assert.equal(p.scriptMetrics.targetWords,5000);assert(calls>1);
 }
});

test('a 2000-word draft grows to the requested range by insertion and is fully reviewed before publication',async()=>{
 const original=prose(2000),p={minutes:1,targetWords:5000,narration:'OLD',outline,researchFacts};let additions=0,reviews=0;const saved=[];
 await buildProofedScript({},p,{write:async candidate=>{candidate.narration=original;},save:async()=>saved.push(p.narration),generate:async(action,ctx)=>{
  if(action==='script'){additions++;assert(ctx.expansion);assert(ctx.targetWords<=400);assert.equal(ctx.includeCTA,false);assert(ctx.researchFacts.some(x=>x.assertable));return {narration:prose(ctx.targetWords,'thêm',additions*1000)};}
  reviews++;assert.equal(ctx.scope,'full');assert.equal(ctx.localChecks.targetWords,5000);return ready();
 }});
 assert(count(p.narration)>=4750&&count(p.narration)<=5250);assert(additions>=7);assert.equal(reviews,1);assert(proofIsCurrent({},p));assert(saved.slice(0,-1).every(x=>x==='OLD'));assert(p.narration.startsWith(original.slice(0,200)));assert(p.narration.endsWith(original.slice(-200)));
});

test('an editorial cut below the lower bound triggers replenishment then a fresh full review',async()=>{
 const p={minutes:1,targetWords:5000,narration:'OLD',outline,researchFacts};let additions=0,reviews=0;
 await buildProofedScript({},p,{write:async candidate=>{candidate.narration=prose(4750);},save:async()=>{},generate:async(action,ctx)=>{
  if(action==='script'){additions++;return {narration:prose(ctx.targetWords,'bổ',10000)};}
  reviews++;const review=ready();if(reviews===1){review.overall='revise';review.issues=[{priority:'medium',paragraph:1,quote:ctx.paragraphs[0].text.split(' ').slice(0,20).join(' '),why:'Câu khó hiểu.',suggestion:'Viết rõ.',rewrite:'Rõ.'}];}return review;
 }});
 assert.equal(additions,1);assert.equal(reviews,2);assert(count(p.narration)>=4750);assert(proofIsCurrent({},p));
});

test('lack of evidence or failed expansion cannot turn a short draft into a finished script',async()=>{
 const p={minutes:1,targetWords:5000,narration:'OLD',outline};
 await assert.rejects(buildProofedScript({},p,{write:async candidate=>{candidate.narration=prose(2000);},save:async()=>{},generate:async()=>assert.fail('no call without evidence')}),/chứng cứ/);
 assert.equal(p.narration,'OLD');assert.equal(count(p.scriptProofDraft.narration),2000);assert.equal(p.scriptQuality,undefined);
});

test('an interrupted length expansion saves progress and resumes without repeating completed additions',async()=>{
 const p={minutes:1,targetWords:5000,outline,researchFacts},draft={narration:prose(2000)};let writes=0;
 await assert.rejects(ensureScriptLength({},p,draft,{save:async()=>{},generate:async(action,ctx)=>{if(++writes===2)throw Error('offline');return {narration:prose(ctx.targetWords,'thêm',1000)};}}),/offline/);
 const completed=draft.narration;assert(count(completed)>2000);
 let calls=0;await ensureScriptLength({},p,draft,{save:async()=>{},generate:async(action,ctx)=>{calls++;return {narration:prose(ctx.targetWords,'sau',calls*1000)};}});
 assert(count(draft.narration)>=4750);const savedWords=new Set(completed.replaceAll('.','').split(/\s+/)),finalWords=new Set(draft.narration.replaceAll('.','').split(/\s+/));assert([...savedWords].every(word=>finalWords.has(word)));
});
