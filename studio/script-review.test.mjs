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
