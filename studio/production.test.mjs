import test from 'node:test';
import assert from 'node:assert/strict';
import { scriptPlan } from './production.mjs';
test('Long scripts split into bounded resumable parts with exact total target',()=>{
 const p=scriptPlan([{share:.1,title:'hook'},{share:.9,title:'story'}],30);
 assert.equal(p.reduce((s,x)=>s+x.targetWords,0),4500);assert(p.every(x=>x.targetWords>0&&x.targetWords<=220));
 assert.throws(()=>scriptPlan([],5));assert.throws(()=>scriptPlan([{}],Infinity));
});
