import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveAIConnection,sendAICompletion} from './ai-providers.mjs';
import {withModelFallback} from './model-fallback.mjs';
const keys={gemini:'test-google-secret',xai:'test-xai-secret'};
test('Gemini and Grok requests go directly to official endpoints with separate credentials',async()=>{
 const seen=[];for(const model of ['gemini/gemini-test','xai/grok-test'])await sendAICompletion({aiMode:'direct'},keys,{},model,{messages:[{role:'user',content:'hello'}],max_tokens:100},async(url,options)=>{seen.push({url,headers:options.headers,body:JSON.parse(options.body)});return {ok:true};},1000);
 assert.equal(seen[0].url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');assert.equal(seen[0].headers.Authorization,'Bearer '+keys.gemini);assert.equal(seen[0].body.model,'gemini-test');
 assert.equal(seen[1].url,'https://api.x.ai/v1/chat/completions');assert.equal(seen[1].headers.Authorization,'Bearer '+keys.xai);assert.equal(seen[1].body.model,'grok-test');assert(!JSON.stringify(seen[1]).includes(keys.gemini));
});
test('direct fallback switches endpoint and credentials, while invalid key errors do not switch',async()=>{
 const seen=[];const execute=async model=>sendAICompletion({aiMode:'direct'},keys,{},model,{messages:[]},async(url,options)=>{seen.push([url,options.headers.Authorization]);if(url.includes('googleapis'))throw Object.assign(Error('busy'),{upstreamStatus:429});return {output:{narration:'next part'}};},1000);
 const r=await withModelFallback('gemini/a',['xai/b'],execute);assert.equal(r.output.narration,'next part');assert.equal(r.fallback.used,true);assert.equal(seen.length,2);assert.equal(seen[1][1],'Bearer '+keys.xai);
 let calls=0;await assert.rejects(withModelFallback('gemini/a',['xai/b'],async()=>{calls++;throw Object.assign(Error('invalid key'),{upstreamStatus:401});}));assert.equal(calls,1);
});
test('missing direct credentials never fall back to gateway, and existing gateway mode is preserved',()=>{
 assert.throws(()=>resolveAIConnection({aiMode:'direct'},{},{OPENAI_API_KEY:'gateway'},'gemini/a'),/Gemini/);
 assert.throws(()=>resolveAIConnection({aiMode:'direct'},keys,{},'groq/a'),/gemini.*xai/i);
 const r=resolveAIConnection({},keys,{OPENAI_API_KEY:'gateway',OPENAI_BASE_URL:'http://localhost:20128/v1'},'gemini/a');assert.equal(r.key,'gateway');assert.equal(r.model,'gemini/a');assert.equal(r.base,'http://localhost:20128/v1');
});
