import test from 'node:test';
import assert from 'node:assert/strict';
import {writeOutlineScript,scriptDraftStatus} from './public/script-draft.mjs';
test('partial script is visible after failure and resumes without rewriting completed parts',async()=>{
 const c={language:'vi'},p={outline:[{title:'One'}],minutes:3,approved:[0,1,2,3],narration:''};let calls=0,saves=0;
 const generate=async(action,ctx)=>{calls++;if(calls===2)throw Error('Model unavailable');return {narration:Array(ctx.targetWords).fill('word').join(' ')};};
 await assert.rejects(writeOutlineScript(c,p,{generate,save:async()=>saves++}),/Model unavailable/);
 const status=scriptDraftStatus(c,p);assert.equal(status.completed,1);assert.equal(status.total,3);assert.ok(status.text.length);assert.match(status.error,/Model unavailable/);assert.equal(p.narration,'');assert.ok(saves>=2);
 const previous=p.scriptDraft.parts[0];const contexts=[];
 await writeOutlineScript(c,p,{generate:async(action,ctx)=>{contexts.push(ctx);return{narration:Array(ctx.targetWords).fill('new').join(' ')};},save:async()=>{}});
 assert.equal(contexts.length,2);assert.equal(contexts[0].scriptPart.index,2);assert.equal(p.scriptParts[0],previous);assert.equal(p.narration.split(/\s+/).length,450);assert.equal(p.scriptDraft,undefined);assert.ok(!p.approved.includes(3));
});
test('an existing complete script is preserved while a replacement draft fails',async()=>{
 const c={},p={outline:[{title:'One'}],minutes:2,narration:'existing script',approved:[]};let calls=0;
 await assert.rejects(writeOutlineScript(c,p,{generate:async(a,ctx)=>{if(++calls===2)throw Error('offline');return{narration:Array(ctx.targetWords).fill('word').join(' ')};},save:async()=>{}}));
 assert.equal(p.narration,'existing script');assert.equal(scriptDraftStatus(c,p).completed,1);
});
