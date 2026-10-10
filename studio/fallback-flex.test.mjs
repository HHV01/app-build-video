import test from 'node:test';import assert from 'node:assert/strict';
import {classifyAIError,withModelFallback,MODEL_COOLDOWN_MS} from './model-fallback.mjs';
test('error classification switches configuration/provider failures but stops bad requests',()=>{
 for(const status of [0,401,402,403,404,429,500,502,503,504])assert.equal(classifyAIError({upstreamStatus:status}),'switch');
 assert.equal(classifyAIError({status:428}),'switch');assert.equal(classifyAIError({status:400}),'stop');assert.equal(classifyAIError({status:422}),'stop');for(const status of [400,422])assert.equal(classifyAIError({status,upstreamStatus:status}),'stop');assert.equal(classifyAIError({outputTruncated:true,status:422}),'switch');
});
test('cooldown skips quota models until expiry and tries earliest when all resting',async()=>{
 let time=0;const cooldowns=new Map(),opts={now:()=>time,cooldowns},calls=[];
 const execute=async m=>{calls.push(m);if(m==='main')throw Object.assign(Error('SECRET'),{upstreamStatus:402});return {output:{}};};
 const r=await withModelFallback('main',['backup'],execute,opts);assert.equal(r.fallback.attempts[0].reason,'credit');assert(!JSON.stringify(r).includes('SECRET'));assert.equal(cooldowns.get('main').until,MODEL_COOLDOWN_MS);
 calls.length=0;await withModelFallback('main',['backup'],execute,opts);assert.deepEqual(calls,['backup']);time=MODEL_COOLDOWN_MS;calls.length=0;await withModelFallback('main',['backup'],execute,opts);assert.deepEqual(calls,['main','backup']);
 cooldowns.set('backup',{until:time+100,reason:'quota',status:429});calls.length=0;await withModelFallback('main',['backup'],async m=>{calls.push(m);return{output:{}};},opts);assert.deepEqual(calls,['backup']);
});
test('auth/missing-model switch visibly without cooldown and total deadline is bounded',async()=>{
 for(const status of [401,404]){const cooldowns=new Map();const r=await withModelFallback('a',['b'],async m=>{if(m==='a')throw Object.assign(Error('PRIVATE_KEY'),{upstreamStatus:status});return {output:{}};},{cooldowns});assert.equal(cooldowns.size,0);assert.equal(r.fallback.attempts[0].status,status);}
 let time=0;const budgets=[];await assert.rejects(withModelFallback('a',['b','c','d'],async()=>{}, {now:()=>time,cooldowns:new Map(),timeout:async(fn,ms)=>{budgets.push(ms);time+=ms;throw Object.assign(Error('timeout'),{upstreamStatus:0});}}));assert.deepEqual(budgets,[30000,30000,30000]);assert.equal(time,90000);
});

test('fallback banner renders credit reason and remaining cooldown without secrets',async()=>{const {renderAIStatus}=await import('./public/ai-status.mjs');const html=renderAIStatus({fallback:{used:true,selectedModel:'gemini/next',attempts:[{model:'xai/main',status:402,reason:'credit'}]},cooldowns:[{model:'xai/main',reason:'credit',remainingMs:60000}]},s=>String(s));assert.match(html,/402: hết credit/);assert.match(html,/gemini\/next/);assert.match(html,/1 phút/);});
