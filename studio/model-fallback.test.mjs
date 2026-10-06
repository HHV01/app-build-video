import test from 'node:test';
import assert from 'node:assert/strict';
import { withModelFallback, normalizeFallbackModels } from './model-fallback.mjs';
test('switches on overload, deduplicates, reports actual model and does not change primary',async()=>{
 const calls=[];const result=await withModelFallback('primary',['primary','backup','backup'],async model=>{calls.push(model);if(model==='primary')throw Object.assign(Error('busy'),{upstreamStatus:503});return {model:'resolved-backup',output:{ok:true}};});
 assert.deepEqual(calls,['primary','backup']);assert.equal(result.model,'resolved-backup');assert.equal(result.fallback.used,true);assert.equal(result.fallback.requestedModel,'primary');
});
test('auth and bad input do not switch; failed models leave a bounded error',async()=>{
 let calls=0;await assert.rejects(withModelFallback('a',['b'],async()=>{calls++;throw Object.assign(Error('unauthorized'),{upstreamStatus:401});}),/unauthorized/);assert.equal(calls,1);
 await assert.rejects(withModelFallback('a',['b'],async()=>{throw Object.assign(Error('busy'),{upstreamStatus:429});}),/a.*b/);
 assert.throws(()=>normalizeFallbackModels(['a','b','c','d']),/tối đa 3/);
});
test('timeout switches, success runs once and disabling has no backup',async()=>{
 const r=await withModelFallback('a',['b'],async m=>{if(m==='a')throw Object.assign(Error('timeout'),{upstreamStatus:0});return {output:{}};});assert.equal(r.fallback.used,true);
 let calls=0;await withModelFallback('a',[],async()=>{calls++;return {model:'a'};});assert.equal(calls,1);
});
