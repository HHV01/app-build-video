import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeState} from './sync.mjs';
test('Draft diagnostics do not block saving, while conflicting narration stays protected',()=>{
 const base={projects:[{id:'p',scriptDraft:{parts:['saved'],error:'old'}}]};
 const local=structuredClone(base),remote=structuredClone(base);
 delete local.projects[0].scriptDraft.error;remote.projects[0].scriptDraft.error='upstream timeout';
 let result=mergeState(base,local,remote);assert.deepEqual(result.conflicts,[]);assert.deepEqual(result.state.projects[0].scriptDraft.parts,['saved']);assert.equal(result.state.projects[0].scriptDraft.error,undefined);
 local.projects[0].scriptDraft.error='retry failed';result=mergeState(base,local,remote);assert.deepEqual(result.conflicts,[]);assert.equal(result.state.projects[0].scriptDraft.error,'retry failed');
 local.projects[0].scriptDraft.parts=['mine'];remote.projects[0].scriptDraft.parts=['theirs'];result=mergeState(base,local,remote);assert.deepEqual(result.conflicts,['projects[p].scriptDraft.parts']);
});
test('Concurrent disjoint edits and new records survive stale revisions',()=>{
 const base={revision:1,surveys:[{id:'s',name:'old',angle:''}],channels:[]};const local=structuredClone(base),remote=structuredClone(base);local.surveys[0].name='mine';remote.surveys[0].angle='theirs';remote.channels.push({id:'c',name:'new'});remote.revision=2;
 const result=mergeState(base,local,remote);assert.deepEqual(result.conflicts,[]);assert.equal(result.state.revision,2);assert.deepEqual(result.state.surveys[0],{id:'s',name:'mine',angle:'theirs'});assert.equal(result.state.channels[0].id,'c');
});
test('Same-field edits, delete versus edit, and scene array changes are conflicts',()=>{
 const base={surveys:[{id:'s',name:'old'}]},local={surveys:[{id:'s',name:'mine'}]},remote={surveys:[{id:'s',name:'theirs'}]};assert.deepEqual(mergeState(base,local,remote).conflicts,['surveys[s].name']);assert(mergeState(base,{surveys:[]},remote).conflicts.length);
 const s={scenes:[{prompt:'old'}]};assert(mergeState(s,{scenes:[{prompt:'a'}]},{scenes:[{prompt:'b'}]}).conflicts.length);
});

test('activity logging repairs missing/non-array legacy activity and keeps prior entries',async()=>{
 const {appendActivity}=await import('./sync.mjs');
 for(const activity of [undefined,null,{}]){const state={activity};appendActivity(state,{id:'new',text:'AI success'});assert.equal(state.activity[0].id,'new');}
 const state={activity:[{id:'old'}]};appendActivity(state,{id:'new'});assert.deepEqual(state.activity.map(x=>x.id),['new','old']);
});
