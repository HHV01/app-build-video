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
