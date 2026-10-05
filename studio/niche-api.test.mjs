import test from 'node:test';
import assert from 'node:assert/strict';
import { createNicheAPI } from './niche-api.mjs';
import { findTemplate, validateTopics, lockedNiche } from './rx.mjs';
const now=Date.now(), id='survey-test';
const fixture=()=>['a','b','c'].flatMap(ch=>Array.from({length:30},(_,i)=>({id:ch+i,channelId:ch,channelTitle:ch,title:`Entire history of ${i} ${ch}`,views:30000+i*100,publishedAt:new Date(now-(100+i)*86400000).toISOString(),duration:300,format:'long'})));
function harness(videos=fixture(), adapters={}){
 let state={revision:0,surveys:[{id,market:'US',language:'en',format:'long',angle:'How choices change institutions',videos}]};
 const api=createNicheAPI({getState:()=>state,updateState:async(expected,mutate)=>{assert.equal(expected,state.revision);const next=structuredClone(state),result=mutate(next);next.revision++;state=next;return{...result,revision:state.revision};},youtube:async()=>{throw Error('Live API unexpectedly called');},videoDetails:async()=>[],generate:async()=>{throw Error('AI unexpectedly called');},...adapters});
 const act=(stage,extra={})=>api.act(stage,{surveyId:id,mode:'import',confirmComplete:true,...extra});
 return {api,act,state:()=>state};
}
async function prepare(h){await h.act('field',{market:'US',language:'en',format:'long'});await h.act('template',{channel:'a',angle:'Original angle'});return h.act('shelf');}
test('20 titles are required; exact 50% is not a template; empty template cannot validate topics',()=>{
 assert.equal(findTemplate(Array(19).fill('Entire history of one')).complete,false);
 assert.equal(findTemplate([...Array(10).fill('Entire history of one'),...Array(10).fill('Something different now')]).template,null);
 assert.equal(validateTopics(Array.from({length:20},(_,i)=>'Topic '+i),[],'').passed,false);
});
test('API refuses nonexistent surveys, skips and falsified passed values',async()=>{
 const h=harness();await assert.rejects(h.api.act('probe',{surveyId:'absent',passed:true}),e=>e.status===404);
 await assert.rejects(h.act('probe',{passed:true,samples:Array(3).fill(Array(20).fill(50000))}),e=>e.status===409);
});
test('three complete channels must repeat the same template; five old videos suffice independently of hit count',async()=>{
 const h=harness();const shelf=await prepare(h);assert.equal(shelf.survey.nicheFlow.shelf.passed,true);assert.equal(shelf.survey.nicheFlow.shelf.count,3);
 const bad=harness(fixture().map(v=>v.channelId==='c'?{...v,title:'Different new format '+v.id}:v));assert.equal((await prepare(bad)).survey.nicheFlow.shelf.passed,false);
 const sparse=harness(fixture().filter(v=>v.channelId!=='c'||Number(v.id.slice(1))<19));assert.equal((await prepare(sparse)).survey.nicheFlow.shelf.passed,false);
});
test('full offline workflow validates groups, three 20-result probes, topics, lock and invalidation',async()=>{
 const h=harness();await prepare(h);const videos=h.state().surveys[0].nicheFlow.shelf.videos;
 const groups=Array.from({length:4},(_,i)=>({name:'Group '+i,angle:'Angle '+i,videoIds:videos.filter((_,j)=>j%4===i).map(v=>v.id)}));
 await h.act('groups',{groups});await assert.rejects(h.act('probe',{samples:Array(3).fill(Array(20).fill(50000))}),e=>e.status===409);
 const result=await h.act('groups',{groupId:'group-0'});assert.equal(result.survey.nicheFlow.groups.chosen,'group-0');
 const samples=Array.from({length:3},()=>Array.from({length:20},(_,i)=>i<11?20001:20000));
 assert.equal((await h.act('probe',{samples})).survey.nicheFlow.probe.passed,true);
 const wrong=await h.act('topics',{titles:Array(20).fill('Entire history of duplicate')});assert.equal(wrong.survey.nicheFlow.topics.passed,false);
 const titles=Array.from({length:20},(_,i)=>`Entire history of new institution ${i}`);
 const done=await h.act('topics',{titles});assert.equal(done.nextStage,'done');assert.deepEqual(done.survey.lockedNiche.topics,titles);
 const lock=lockedNiche({niche:done.survey.nicheFlow});assert.throws(()=>lock.topics.push('overwrite'),TypeError);
 await h.act('field',{market:'VN',language:'vi',format:'long'});assert.equal(h.state().surveys[0].lockedNiche,undefined);assert.equal(h.state().surveys[0].nicheFlow.template,undefined);
});
test('probe missing results and invalid views cannot pass',async()=>{
 const h=harness();await prepare(h);const videos=h.state().surveys[0].nicheFlow.shelf.videos;
 await h.act('groups',{groups:Array.from({length:4},(_,i)=>({name:'G'+i,videoIds:videos.filter((_,j)=>j%4===i).map(v=>v.id)}))});await h.act('groups',{groupId:'group-0'});
 const partial=await h.act('probe',{samples:[Array(19).fill(50000),Array(20).fill(50000),Array(20).fill(50000)]});assert.equal(partial.survey.nicheFlow.probe.passed,false);
 await assert.rejects(h.act('probe',{samples:[Array(20).fill(-1),Array(20).fill(50000),Array(20).fill(50000)]}));
});
test('channel pagination reaches older uploads beyond latest50; blind grouping reveals only id/title',async()=>{
 let calls=0, observed;
 const h=harness(fixture(),{youtube:async(endpoint,params)=>{if(endpoint==='channels')return{items:[{id:'UC'+'a'.repeat(22),snippet:{title:'A'},contentDetails:{relatedPlaylists:{uploads:'uploads'}}}]};if(endpoint==='playlistItems'){calls++;return{items:Array.from({length:calls===1?50:10},(_,i)=>({contentDetails:{videoId:'v'+((calls-1)*50+i)}})),...(calls===1?{nextPageToken:'second'}:{})};}throw Error(endpoint);},videoDetails:async(ids)=>ids.map((vid,i)=>({...fixture()[0],id:vid,publishedAt:new Date(now-i*86400000).toISOString()})),generate:async(b)=>{observed=b.context;const vs=b.context.videos;return{output:{groups:Array.from({length:4},(_,i)=>({name:'G'+i,videoIds:vs.filter((_,j)=>j%4===i).map(v=>v.id)}))}};}});
 const cat=await h.api.catalog('UC'+'a'.repeat(22));assert.equal(cat.pages,2);assert.equal(cat.videos.length,60);assert.equal(cat.complete,true);
 await prepare(h);await h.act('groups');assert.ok(observed.videos.every(v=>Object.keys(v).sort().join(',')==='id,title'));
});
