import test from 'node:test';
import assert from 'node:assert/strict';
import { runNicheSequence, probeQueriesFor } from './public/niche-workflow.mjs';
import * as workflow from './public/niche-workflow.mjs';

test('quick analysis and template approval preserve stage order and chosen template', async () => {
  const calls=[];
  await runNicheSequence([{stage:'field'}, {stage:'template'}], async stage=>{calls.push(stage);return {passed:true};});
  await runNicheSequence([{stage:'template',extras:{template:'the entire history'}},{stage:'shelf'}], async (stage,extras)=>{calls.push([stage,extras]);return {passed:true};});
  assert.deepEqual(calls,['field','template',['template',{template:'the entire history'}],['shelf',{}]]);
});
test('failed gate or provider error stops automatic work and keeps completed stages', async () => {
  const calls=[];
  const result=await runNicheSequence([{stage:'template'},{stage:'shelf'}],async stage=>{calls.push(stage);return {passed:false};});
  assert.equal(result.passed,false);assert.deepEqual(calls,['template']);
  calls.length=0;
  await assert.rejects(runNicheSequence([{stage:'field'},{stage:'template'},{stage:'shelf'}],async stage=>{calls.push(stage);if(stage==='template')throw Error('quota exhausted');return {passed:true};}),/quota exhausted/);
  assert.deepEqual(calls,['field','template']);
});
test('displayed probe suggestions are submitted; user edits and intentional clearing win',()=>{
  const s={nicheFlow:{groups:{suggestedQueries:['rome','china','japan']}}};
  assert.equal(probeQueriesFor(s),'rome\nchina\njapan');
  assert.equal(probeQueriesFor({...s,probeQueries:'my query'}),'my query');
  assert.equal(probeQueriesFor({...s,probeQueries:''}),'');
});
test('pending survey input is captured before actions; unchecked radios cannot override the selection',()=>{
 assert.equal(typeof workflow.applySurveyFields,'function');
 const s={angle:'old',templateChoice:'long'};
 workflow.applySurveyFields(s,[{binding:'survey.angle',value:'new',type:'textarea'},{binding:'survey.groupDraft',value:'[]',type:'textarea'},{binding:'survey.templateChoice',value:'long',type:'radio',checked:false},{binding:'survey.templateChoice',value:'short',type:'radio',checked:true},{binding:'survey.completeImport',type:'checkbox',checked:true},{binding:'channel.name',value:'ignore'}]);
 assert.deepEqual(s,{angle:'new',groupDraft:'[]',templateChoice:'short',completeImport:true});
});
