import test from 'node:test';
import assert from 'node:assert/strict';
import { copyWithFallback } from './public/clipboard.mjs';
test('clipboard denial uses fallback without losing prompt',async()=>{
 let text;const result=await copyWithFallback('FULL PROMPT',{writeText:async()=>{throw Error('permission denied');},legacyCopy:t=>{text=t;return true;}});assert.equal(result,true);assert.equal(text,'FULL PROMPT');
});
test('both copy methods blocked return false for manual selection; success skips fallback',async()=>{
 assert.equal(await copyWithFallback('text',{writeText:async()=>{throw Error('denied');},legacyCopy:()=>false}),false);
 assert.equal(await copyWithFallback('text',{writeText:async()=>{},legacyCopy:()=>{throw Error('not needed');}}),true);
});
