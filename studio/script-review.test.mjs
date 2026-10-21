import test from 'node:test';import assert from 'node:assert/strict';
import {reviewContext,runScriptReview,reviewIsCurrent,renderScriptReview,currentScriptParts,validateScriptReview,locateReviewQuote} from './public/script-review.mjs';
const c={language:'vi',angle:'Money mechanics'},p=()=>({topic:'Budget',minutes:1,narration:'Bạn tiêu tiền hôm nay. Bạn đã nghĩ tới ngày mai chưa?\n\nLập ngân sách giúp bạn nhìn rõ thu chi.\n\nBắt đầu bằng ghi lại khoản chi hôm nay.',sources:[{text:'PRIVATE_SOURCE'}],scriptParts:['OUTDATED SCRIPT'],visualStyle:'PRIVATE_STYLE'});
const output=ctx=>({overall:'revise',summary:'Cần làm rõ cơ chế.',strengths:['Mở bằng câu hỏi cụ thể.'],rubric:['hook','flow','clarity','novelty','ending'].map(criterion=>({criterion,verdict:'watch',reason:'Có thể cụ thể hơn.'})),issues:[{priority:'high',paragraph:2,quote:'Lập ngân sách',why:'Thiếu ví dụ.',suggestion:'Thêm một khoản chi cụ thể.',rewrite:'Bạn có thể ghi lại một khoản chi hôm nay.'}]});
test('one review uses current narration only, caches unchanged input, invalidates edits and never rewrites script',async()=>{
 const project=p(),before=project.narration,seen=[];const generate=async(a,ctx)=>{seen.push({a,ctx});return output(ctx);};let saves=0;
 await runScriptReview(c,project,{generate,save:async()=>saves++});assert.equal(seen.length,1);assert.equal(seen[0].a,'scriptReview');assert.doesNotMatch(JSON.stringify(seen[0].ctx),/PRIVATE_SOURCE|PRIVATE_STYLE|OUTDATED/);assert.equal(project.narration,before);assert(reviewIsCurrent(c,project));
 await runScriptReview(c,project,{generate,save:async()=>saves++});assert.equal(seen.length,1);project.narration+=' Câu mới.';assert(!reviewIsCurrent(c,project));await runScriptReview(c,project,{generate,save:async()=>{}});assert.equal(seen.length,2);
});
test('unknown quotations/paragraphs fail without modifying script or previous review',async()=>{
 const project=p(),ctx=reviewContext(c,project);const bad=output(ctx);bad.issues[0].quote='A quote that does not exist';assert.throws(()=>validateScriptReview(bad,ctx),/trích/);bad.issues[0].paragraph=999;assert.throws(()=>validateScriptReview(bad,ctx),/đoạn|trích/);
 project.scriptReview={summary:'previous'};await assert.rejects(runScriptReview(c,project,{generate:async()=>bad,save:async()=>assert.fail('no save')}));assert.equal(project.scriptReview.summary,'previous');assert.equal(project.narration,p().narration);
});
test('economy review bounds excerpts and discloses sampling; full mode preserves text',()=>{
 const project=p();project.narration=Array.from({length:30},(_,i)=>('Đoạn '+i+' '+ 'câu chuyện '.repeat(80))).join('\n\n');let ctx=reviewContext(c,project);assert.equal(ctx.scope,'sampled');assert(ctx.coveragePercent<100);assert(ctx.paragraphs.reduce((n,x)=>n+x.text.length,0)<=8000);project.reviewFull=true;ctx=reviewContext(c,project);assert.equal(ctx.scope,'full');assert.equal(ctx.coveragePercent,100);
 assert.deepEqual(currentScriptParts({narration:'Fresh one.\n\nFresh two.',scriptParts:['OLD']}),['Fresh one.','Fresh two.']);
});
test('review display shows concrete prioritized fixes and stale/sample limitations with escaped text',async()=>{
 const project=p();await runScriptReview(c,project,{generate:async()=>output(),save:async()=>{}});project.narration+=' Changed';const esc=s=>String(s??'').replaceAll('<','&lt;');const html=renderScriptReview(c,project,{esc,btn:(t,a,x,attrs)=>`<button data-action="${a}" ${attrs}>${t}</button>`});assert.match(html,/cũ|đã đổi/i);assert.match(html,/Sửa trước/);assert.match(html,/Lập ngân sách/);assert.match(html,/không.*bảo đảm|không.*lượt xem/i);
});

test('quote locator selects the exact substring after long paragraph chunk boundaries',()=>{const narration=('word '.repeat(450)+'TARGET phrase').trim(),project={narration},ctx=reviewContext({},project),row=ctx.paragraphs.find(x=>x.text.includes('TARGET'));const at=locateReviewQuote(project,{paragraph:row.index,quote:'TARGET phrase'});assert.equal(narration.slice(at,at+13),'TARGET phrase');});

test('full review is bounded, resumes saved batches and still covers every paragraph',async()=>{
 const {reviewInBatches}=await import('./public/script-review.mjs');
 const ctx={...reviewContext(c,p()),scope:'full',coveragePercent:100,paragraphs:Array.from({length:12},(_,i)=>({index:i+1,text:('đoạn '+i+' ').repeat(180)}))};
 const cache={},seen=[];let fail=true;
 const generate=async(action,input)=>{seen.push(input);assert.ok(input.paragraphs.reduce((n,x)=>n+x.text.length,0)<=7000);if(seen.length===3&&fail)throw Error('offline');return {overall:'ready',summary:'Ổn',strengths:[],issues:[],rubric:Object.keys((await import('./public/script-review.mjs')).REVIEW_CRITERIA).map(criterion=>({criterion,verdict:'good',reason:'Ổn'}))};};
 await assert.rejects(reviewInBatches(ctx,{generate,cache,save:async()=>{}}),/offline/);
 const completed=seen.slice(0,2).map(x=>JSON.stringify(x));fail=false;seen.length=0;
 const result=await reviewInBatches(ctx,{generate,cache,save:async()=>{}});
 assert.equal(result.coveragePercent,100);assert.equal(result.overall,'ready');
 assert.ok(seen.every(x=>!completed.includes(JSON.stringify(x))));
 const all=[...completed.map(JSON.parse),...seen].flatMap(x=>x.paragraphs);
 for(const row of ctx.paragraphs)assert.ok(all.some(x=>x.index===row.index&&x.text===row.text));
});

test('batched review keeps concrete late issues and invalidates cached checks after edits',async()=>{
 const {reviewInBatches,REVIEW_CRITERIA}=await import('./public/script-review.mjs');
 const ctx={...reviewContext(c,p()),scope:'full',coveragePercent:100,paragraphs:Array.from({length:10},(_,i)=>({index:i+1,text:('nội dung '+i+' ').repeat(140)}))};
 const cache={};let calls=0;
 const generate=async(action,input)=>{
  calls++;const result={overall:'ready',summary:'Đã kiểm tra',strengths:[],issues:[],rubric:Object.keys(REVIEW_CRITERIA).map(criterion=>({criterion,verdict:'good',reason:'Ổn'}))};
  if(input.reviewStage==='detail'&&input.paragraphs.some(x=>x.index===10)){
   result.overall='revise';result.rubric.find(x=>x.criterion==='clarity').verdict='fix';
   result.issues=[{priority:'high',paragraph:10,quote:'nội dung 9',why:'Thiếu ý chính.',suggestion:'Làm rõ.',rewrite:'Ý chính cần làm rõ'}];
  }
  return result;
 };
 const first=await reviewInBatches(ctx,{generate,cache});assert.equal(first.overall,'revise');assert.equal(first.issues[0].paragraph,10);assert.equal(first.rubric.find(x=>x.criterion==='clarity').verdict,'fix');
 const done=calls;await reviewInBatches(ctx,{generate,cache});assert.equal(calls,done);
 ctx.paragraphs[0].text+=' mới';await reviewInBatches(ctx,{generate,cache});assert(calls>done);
});
