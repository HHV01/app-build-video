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

test('niche angle suggestions use niche as primary context, preserve selected angle and gates on error',async()=>{
 const {suggestNicheAngles,angleOptionsFor}=await import('./public/niche-workflow.mjs');const s={angleNiche:'Tài chính cá nhân',language:'vi',angle:'Góc đang dùng',nicheFlow:{template:{passed:true,value:'Why',examples:['Why save money'],angleSuggestions:[{angle:'Old',reason:'Titles'}]},shelf:{passed:true}}};let sent,saves=0;
 await suggestNicheAngles(s,async(action,context)=>{sent={action,context};return {angles:[{angle:'Vì sao quyết định nhỏ ảnh hưởng tiền bạc?',reason:'Hợp ngách tài chính'}]};},async()=>{saves++;});assert.equal(sent.action,'angles');assert.equal(sent.context.basis,'niche');assert.equal(sent.context.niche,'Tài chính cá nhân');assert.deepEqual(sent.context.titles,['Why save money']);assert.equal(s.angle,'Góc đang dùng');assert(s.nicheFlow.shelf.passed);assert.equal(angleOptionsFor(s)[0].angle,'Vì sao quyết định nhỏ ảnh hưởng tiền bạc?');assert.equal(saves,1);
 await suggestNicheAngles(s,async()=>{throw Error('Gateway offline');},async()=>{});assert.match(s.nicheAngleError,/Gateway offline/);assert.equal(angleOptionsFor(s).length,1);assert.equal(s.angle,'Góc đang dùng');s.angleNiche='Lịch sử';assert.deepEqual(angleOptionsFor(s),[]);
});
