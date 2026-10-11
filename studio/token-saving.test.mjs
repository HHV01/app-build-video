import test from 'node:test';import assert from 'node:assert/strict';
import {scriptPartContext,legacyScriptPartContext} from './public/research-context.mjs';
import {writeOutlineScript} from './public/script-draft.mjs';
import {writeCheckedPart} from './public/script-quality.mjs';
import {scriptPlan} from './production.mjs';
import {withModelFallback} from './model-fallback.mjs';
import {parseRetryAfter} from './server-lib.mjs';
test('compact writing keeps evidence verbatim, excludes irrelevant/metadata and reduces fixture context',()=>{
const p={topic:'Egypt',researchSummary:'Egypt overview. '+('Unrelated material. '.repeat(100)),researchFacts:[{claim:'Egypt tax 12 percent in 1920',status:'supported',sourceId:'s1',raw:'PRIVATE_RAW '.repeat(100)},{claim:'Rome unrelated fact',status:'supported'},{claim:'Egypt unverified',status:'needs_check'}],researchTimeline:[{date:'1920',event:'Egypt taxes'}],researchSensory:'unused '.repeat(100)};
const part={focus:{title:'Egypt taxes'},targetWords:300,segment:1};const compact=scriptPartContext({},p,part,1,3,['previous '.repeat(200)]),old=legacyScriptPartContext({},p,part,1,3,['previous '.repeat(200)]);
assert.equal(compact.researchFacts[0].claim,p.researchFacts[0].claim);assert.equal(compact.researchFacts[0].sourceId,'s1');assert.equal(compact.researchFacts[1].assertable,false);assert.doesNotMatch(JSON.stringify(compact),/PRIVATE_RAW|Rome unrelated/);assert.equal(compact.scriptPart.focus,undefined);assert(JSON.stringify(compact).length<JSON.stringify(old).length*.65);
});
test('small length deviation does not regenerate, larger deviation still retries once',async()=>{
let calls=0;const r=await writeCheckedPart(async()=>{calls++;return{narration:Array(112).fill('word').join(' ')};},{targetWords:100});assert.equal(calls,1);assert.match(r.warning,/112\/100/);
});
test('new writing uses fewer moderate batches, persists plan and resumes a legacy draft exactly',async()=>{
const c={},p={outline:[{title:'Egypt'}],minutes:6,narration:'',approved:[]},seen=[];await writeOutlineScript(c,p,{generate:async(a,ctx)=>{seen.push(ctx);return{narration:Array(ctx.targetWords).fill('word').join(' ')};},save:async()=>{}});assert.equal(seen.length,3);assert.equal(p.narration.split(/\s+/).length,900);
const oldPlan=scriptPlan(p.outline,6),basis=JSON.stringify({research:(await import('./public/research-context.mjs')).researchContext(p),context:legacyScriptPartContext(c,p,oldPlan[0],0,oldPlan.length),plan:oldPlan});p.scriptDraft={basis,parts:[Array(oldPlan[0].targetWords).fill('saved').join(' ')],notes:[]};const saved=p.scriptDraft.parts[0];seen.length=0;await writeOutlineScript(c,p,{generate:async(a,ctx)=>{seen.push(ctx);return{narration:Array(ctx.targetWords).fill('next').join(' ')};},save:async()=>{}});assert.equal(seen.length,oldPlan.length-1);assert.equal(p.scriptParts[0],saved);
});
test('provider Retry-After controls cooldown and resting model is not called early',async()=>{
assert.equal(parseRetryAfter(new Headers({'retry-after':'12'}),'',1000),12000);assert.equal(parseRetryAfter(new Headers(),'Please try again in 1m2.5s.',1000),62500);assert.equal(parseRetryAfter(new Headers({'retry-after':'bad'}),'',1000),undefined);
let time=1000,calls=0;const opts={now:()=>time,cooldowns:new Map()};await assert.rejects(withModelFallback('a',[],async()=>{calls++;throw Object.assign(Error('quota'),{upstreamStatus:429,retryAfterMs:12000});},opts));assert.equal(opts.cooldowns.get('a').until,13000);await assert.rejects(withModelFallback('a',[],async()=>{calls++;return{};},opts),/Chờ/);assert.equal(calls,1);time=13000;await withModelFallback('a',[],async()=>{calls++;return{};},opts);assert.equal(calls,2);
});
test('planned channel avoids regenerating a mildly long part and rebalances later targets',async()=>{
 const {writeChannelScript}=await import('./public/channel-plans.mjs');const c={openingPlan:[{kind:'fixed',text:'Start.'}],closingPlan:[{kind:'fixed',text:'End.'}]},p={outline:[{title:'Egypt'}],minutes:6},seen=[];
 await writeChannelScript(c,p,{save:async()=>{},generate:async(a,ctx)=>{seen.push(ctx);return {narration:Array(seen.length===1?Math.round(ctx.targetWords*1.12):ctx.targetWords).fill('word').join(' ')};}});
 assert.equal(seen.length,3);assert.equal(p.narration.split(/\s+/).length,900);assert(p.scriptWarnings.length);assert(seen[1].targetWords<seen[0].targetWords);
});
