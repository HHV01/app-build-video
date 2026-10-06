import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeState} from './sync.mjs';
test('Concurrent disjoint edits and new records survive stale revisions',()=>{
 const base={revision:1,surveys:[{id:'s',name:'old',angle:''}],channels:[]};const local=structuredClone(base),remote=structuredClone(base);local.surveys[0].name='mine';remote.surveys[0].angle='theirs';remote.channels.push({id:'c',name:'new'});remote.revision=2;
 const result=mergeState(base,local,remote);assert.deepEqual(result.conflicts,[]);assert.equal(result.state.revision,2);assert.deepEqual(result.state.surveys[0],{id:'s',name:'mine',angle:'theirs'});assert.equal(result.state.channels[0].id,'c');
});
test('Same-field edits, delete versus edit, and scene array changes are conflicts',()=>{
 const base={surveys:[{id:'s',name:'old'}]},local={surveys:[{id:'s',name:'mine'}]},remote={surveys:[{id:'s',name:'theirs'}]};assert.deepEqual(mergeState(base,local,remote).conflicts,['surveys[s].name']);assert(mergeState(base,{surveys:[]},remote).conflicts.length);
 const s={scenes:[{prompt:'old'}]};assert(mergeState(s,{scenes:[{prompt:'a'}]},{scenes:[{prompt:'b'}]}).conflicts.length);
});
