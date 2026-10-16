import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProofedScript,proofIsCurrent,localScriptProblems} from './public/script-proof.mjs';
const text=Array.from({length:150},(_,i)=>'từ'+i).join(' ')+'.';
const good=()=>({overall:'ready',summary:'Đã đọc toàn bài.',strengths:[],rubric:['hook','flow','clarity','novelty','ending'].map(criterion=>({criterion,verdict:'good',reason:'Đạt.'})),issues:[]});
const problem=ctx=>({...good(),overall:'revise',issues:[{priority:'high',paragraph:1,quote:ctx.paragraphs[0].text.split(' ').slice(0,4).join(' '),why:'Câu khó hiểu.',suggestion:'Diễn đạt rõ hơn.',rewrite:'cách hiểu rõ hơn'}]});
const options=(p,generate,write=async candidate=>{candidate.narration=text;})=>({write,generate,save:async()=>{assert.notEqual(p.narration,text,'never publish before review passes');}});

test('new text is staged, full review can repair and recheck before replacing old narration',async()=>{
 const p={minutes:1,narration:'OLD',outline:[{title:'A'}]},seen=[];let calls=0;
 await buildProofedScript({},p,{write:async candidate=>{candidate.narration=text;},save:async()=>seen.push(p.narration),generate:async(action,ctx)=>{calls++;assert.equal(action,'scriptReview');assert.equal(ctx.scope,'full');assert.equal(ctx.coveragePercent,100);return calls===1?problem(ctx):good();}});
 assert.equal(calls,2);assert.ok(p.narration.startsWith('cách hiểu rõ hơn'));assert.equal(p.previousNarration,'OLD');assert.equal(seen.slice(0,-1).every(x=>x==='OLD'),true);assert(proofIsCurrent({},p));p.narration+=' sửa';assert(!proofIsCurrent({},p));
});

test('review API errors preserve old script and persist candidate for resume without regenerating',async()=>{
 const p={minutes:1,narration:'OLD'};let writes=0;
 await assert.rejects(buildProofedScript({},p,{write:async candidate=>{writes++;candidate.narration=text;},save:async()=>{},generate:async()=>{throw Error('API offline');}}),/offline/);
 assert.equal(p.narration,'OLD');assert.equal(p.scriptProofDraft.narration,text);
 await buildProofedScript({},p,{write:async()=>assert.fail('must resume'),save:async()=>{},generate:async()=>good()});assert.equal(writes,1);assert.equal(p.narration,text);
});

test('unfixed semantic problems stop after two repairs and never become completed narration',async()=>{
 const p={minutes:1,narration:'OLD'};let calls=0;
 await assert.rejects(buildProofedScript({},p,{write:async candidate=>{candidate.narration=text;},save:async()=>{},generate:async(action,ctx)=>{calls++;const issue=problem(ctx);issue.issues[0].rewrite=calls===1?'cách khác rất rõ':'lời kể vẫn rõ';return issue;}}),/chưa đạt/);
 assert.equal(calls,3);assert.equal(p.narration,'OLD');assert.equal(p.scriptQuality,undefined);assert.ok(p.scriptProofDraft.error);
});

test('ready label cannot override local repetitions or a watch verdict',async()=>{
 assert(localScriptProblems('đi đi đi qua phố.').length);assert(localScriptProblems('một hai một hai một hai.').length);
 const repeated='Một người thợ phải lựa chọn giữa sửa máy và thay đổi lịch làm việc.';assert(localScriptProblems(repeated+' '+repeated).length);
 const p={minutes:1,narration:'OLD'};
 await assert.rejects(buildProofedScript({},p,{write:async candidate=>{candidate.narration=text;},save:async()=>{},generate:async()=>{const r=good();r.rubric[2].verdict='watch';return r;}}),/chưa đạt/);assert.equal(p.narration,'OLD');
});

test('invented numbers, fixed-channel edits, overlapping edits and partial reviews cannot publish',async()=>{
 for(const kind of ['numbers','fixed','overlap']){
  const p={minutes:1,narration:'OLD'};
  await assert.rejects(buildProofedScript({},p,{write:async candidate=>{candidate.narration=text;if(kind==='fixed')candidate.planResult={opening:[{source:{kind:'fixed',text:text.split(' ').slice(0,8).join(' ')},text:text.split(' ').slice(0,8).join(' ')}]};},save:async()=>{},generate:async(action,ctx)=>{const r=problem(ctx);if(kind==='numbers')r.issues[0].rewrite='có 999999 người mới';if(kind==='overlap')r.issues.push({...r.issues[0]});return r;}}));assert.equal(p.narration,'OLD');
 }
});
