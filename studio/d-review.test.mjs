import test from 'node:test';
import assert from 'node:assert/strict';
import { createNicheAPI } from './niche-api.mjs';
import { overlapsShelf } from './rx.mjs';
const uc=n=>'UC'+String(n).padStart(22,'0');
const template='the entire history of';
const videos=(id=uc(1))=>Array.from({length:20},(_,i)=>({id:id+'-'+i,channelId:id,channelTitle:id,title:'The Entire History of Place'+i,views:30000,duration:600,format:'long',publishedAt:'2025-01-01T00:00:00Z'}));
function harness(adapters={}){
 let state={revision:0,surveys:[{id:'s',angle:'Original angle',videos:videos(),nicheFlow:{
  field:{passed:true,market:'US',language:'en',format:'long'},template:{passed:true,value:template,angle:'Original angle',channelId:uc(1)},
  shelf:{passed:true,videos:videos()},groups:{passed:true,chosen:'g',groups:[{id:'g',name:'Places',videoIds:videos().map(v=>v.id)}]},probe:{passed:true}
 }}]};
 const api=createNicheAPI({getState:()=>state,updateState:async(revision,fn)=>{assert.equal(revision,state.revision);const next=structuredClone(state),result=fn(next);next.revision++;state=next;return {...result,revision:next.revision};},
 youtube:async(endpoint,p)=>{if(endpoint==='search')return {items:[uc(2),uc(3)].map(channelId=>({snippet:{channelId}}))};if(endpoint==='channels')return {items:[{id:p.id,snippet:{title:p.id},contentDetails:{relatedPlaylists:{uploads:p.id}}}]};return {items:videos(p.playlistId).map(v=>({contentDetails:{videoId:v.id}}))};},
 videoDetails:async(ids)=>ids.map(id=>{const ch=id.split('-')[0];return videos(ch).find(v=>v.id===id);}),generate:async()=>{throw Error('Unexpected AI');},...adapters});
 return {state:()=>state,act:(stage,body={})=>api.act(stage,{surveyId:'s',mode:'import',confirmComplete:true,...body})};
}

test('D1 unavailable discovered channels become failed rows; network errors still abort',async()=>{
 const youtube=async(endpoint,p)=>{if(endpoint==='search')return {items:[uc(2),uc(3)].map(channelId=>({snippet:{channelId}}))};if(endpoint==='channels')return {items:p.id===uc(3)?[]:[{id:p.id,snippet:{title:p.id},contentDetails:{relatedPlaylists:{uploads:p.id}}}]};return {items:videos(p.playlistId).map(v=>({contentDetails:{videoId:v.id}}))};};
 const h=harness({youtube});const r=await h.act('shelf',{mode:'live'});const shelf=r.survey.nicheFlow.shelf;
 const failed=shelf.channels.find(c=>c.channelId==='unresolved:'+uc(3));assert(failed);assert.equal(failed.pass,false);assert.match(failed.reason,/Không tìm thấy kênh/);assert.equal(shelf.count,2);assert.equal(shelf.passed,false);
 const error=Error('network');const broken=harness({youtube:async()=>{throw error;}}),before=structuredClone(broken.state());await assert.rejects(broken.act('shelf',{mode:'live'}),e=>e===error);assert.deepEqual(broken.state(),before);
});

test('D2 new overlapping topics are rejected and trigger the second generation',async()=>{
 let calls=0;
 const h=harness({generate:async()=>({output:{topics:++calls===1?[
  'The Entire History of Egypt','The Entire History of Ancient Egypt',...Array.from({length:18},(_,i)=>'The Entire History of NewEntity'+i)
 ]:['The Entire History of Atlantis']}})});
 const topics=(await h.act('topics')).survey.nicheFlow.topics;
 assert.equal(calls,2);assert.equal(topics.passed,true);assert.equal(topics.chosen.length,20);
 assert(!topics.chosen.includes('The Entire History of Ancient Egypt'));assert(topics.chosen.includes('The Entire History of Atlantis'));
});

test('D3 generic single-word shelf entities require equality; specific entities retain word boundaries',()=>{
 for(const word of ['war','history','story','life','world','empire','time','man','people']){
  assert.equal(overlapsShelf('The Entire History of the Cold '+word,template,['The Entire History of '+word]),false,word);
  assert.equal(overlapsShelf('The Entire History of the '+word,template,['The Entire History of '+word]),true,word);
 }
 assert.equal(overlapsShelf('The Entire History of Egypt',template,['The Entire History of Ancient Egypt']),true);
 assert.equal(overlapsShelf('The Entire History of Romeo',template,['The Entire History of Rome']),false);
 assert.equal(overlapsShelf('The Entire History of Rome',template,['The Entire History of Romeo']),false);
});

test('D4 import reports missing duration at 80 percent and leaves complete data and explicit Shorts alone',async()=>{
 const missing='Kho nhập thiếu thời lượng (cột duration). Thêm cột này hoặc đánh dấu format=short cho Shorts.';
 const h=harness();h.state().surveys[0].videos=videos().map(v=>({...v,duration:0}));
 const before=structuredClone(h.state());await assert.rejects(h.act('template',{channel:uc(1)}),e=>e.status===400&&e.message===missing);assert.deepEqual(h.state(),before);
 const shelf=(await h.act('shelf')).survey.nicheFlow.shelf;assert.equal(shelf.channels[0].pass,false);assert.match(shelf.channels[0].reason,/Kho nhập thiếu thời lượng \(cột duration\)/);
 const normal=harness();assert.equal((await normal.act('template',{channel:uc(1)})).survey.nicheFlow.template.passed,true);
 const threshold=harness();threshold.state().surveys[0].videos=videos().map((v,i)=>({...v,duration:i<16?0:600}));await assert.rejects(threshold.act('template',{channel:uc(1)}),e=>e.message===missing);
 const shorts=harness();shorts.state().surveys[0].videos=videos().map(v=>({...v,duration:0,format:'short'}));shorts.state().surveys[0].nicheFlow.field.format='short';assert.equal((await shorts.act('template',{channel:uc(1)})).survey.nicheFlow.template.passed,true);
});

test('D5 live probes request 25 and use the first 20 valid views despite missing details',async()=>{
 const calls=[];
 const h=harness({youtube:async(endpoint,p)=>{calls.push(p);return {items:Array.from({length:25},(_,i)=>({id:{videoId:'v'+i}}))};},videoDetails:async ids=>ids.slice(1).map((id,i)=>({id,views:i===0?NaN:i===1?-1:30000}))});
 const probe=(await h.act('probe',{mode:'live',queries:['a','b','c']})).survey.nicheFlow.probe;
 assert(calls.every(p=>p.maxResults==='25'));assert.equal(probe.passed,true);assert(probe.samples.every(a=>a.length===20));assert(probe.samples.every(a=>a[0].id==='v3'));assert(probe.results.every(r=>r.hits===20));
 const thin=harness({youtube:async()=>({items:Array.from({length:25},(_,i)=>({id:{videoId:'v'+i}}))}),videoDetails:async ids=>ids.slice(0,19).map(id=>({id,views:30000}))});
 const partial=(await thin.act('probe',{mode:'live',queries:['a','b','c']})).survey.nicheFlow.probe;assert.equal(partial.passed,false);assert.match(partial.results[0].error,/đang có 19/);
});
test('D5 non-array titles return 400 before generation or state mutation',async()=>{
 const h=harness();for(const titles of ['wrong',{},null,123]){const before=structuredClone(h.state());await assert.rejects(h.act('topics',{titles}),e=>e.status===400&&/mảng/.test(e.message));assert.deepEqual(h.state(),before);}
});

test('D6 knownBy ranks the combined two generations before the final cut to 20',async()=>{
 let calls=0;
 const h=harness({generate:async()=>({output:{topics:++calls===1?
  Array.from({length:19},(_,i)=>({title:'The Entire History of LowEntity'+i,knownBy:'thấp'})):
  [{title:'The Entire History of FamousA',knownBy:'Cao'},{title:'The Entire History of FamousB',knownBy:'cao'},{title:'The Entire History of MediumC',knownBy:'vừa'}]
 }})});
 const result=(await h.act('topics')).survey.nicheFlow.topics;assert.equal(calls,2);assert.equal(result.passed,true);
 assert.deepEqual(result.chosen.slice(0,3),['The Entire History of FamousA','The Entire History of FamousB','The Entire History of MediumC']);
 assert.equal(result.chosen.length,20);assert.equal(result.chosen.at(-1),'The Entire History of LowEntity16');
});
