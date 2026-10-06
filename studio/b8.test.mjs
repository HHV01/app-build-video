import test from 'node:test';
import assert from 'node:assert/strict';
import * as rx from './rx.mjs';
import {createNicheAPI} from './niche-api.mjs';
const ids=Object.fromEntries(['a','b','c','d','x'].map(c=>[c,'UC'+c.repeat(22)]));
const videos=(ch,prefix='The Entire History of Ancient')=>Array.from({length:20},(_,i)=>({id:ch+i,channelId:ids[ch],channelTitle:ch,title:prefix+' Entity'+i,views:30000,publishedAt:new Date(Date.now()-(200+i)*86400000).toISOString(),duration:300,format:'long'}));
function harness(){
 let state={revision:0,surveys:[{id:'s',videos:videos('a'),angle:'My angle'}]},calls=[];
 const api=createNicheAPI({getState:()=>state,updateState:async(r,fn)=>{assert.equal(r,state.revision);const next=structuredClone(state),result=fn(next);state=next;state.revision++;return{...result,revision:state.revision};},
 youtube:async(endpoint,p)=>{calls.push({endpoint,p});if(endpoint==='search')return{items:['a','b','c'].map(c=>({snippet:{channelId:ids[c]}}))};if(endpoint==='channels'){const ch=p.id?Object.keys(ids).find(c=>ids[c]===p.id):p.forHandle?.replace(/^@/,'');if(!ch)throw Object.assign(Error('Không có kênh'),{status:404});return{items:[{id:ids[ch],snippet:{title:ch},contentDetails:{relatedPlaylists:{uploads:ch}}}]};}return{items:videos(p.playlistId).map(v=>({contentDetails:{videoId:v.id}}))};},
 videoDetails:async(list)=>list.map(id=>videos(id[0],id[0]==='x'?'Completely Different Format':'The Entire History of Ancient').find(v=>v.id===id)),generate:async()=>{throw Error('Unexpected AI');}});
 return{api,state:()=>state,calls,act:(stage,b={})=>api.act(stage,{surveyId:'s',mode:'import',confirmComplete:true,...b})};
}
async function field(h){await h.act('field',{market:'US',language:'en',format:'long'});}
test('B8 selected candidate statistics describe the selection, not the longest default',async()=>{
 const h=harness();h.state().surveys[0].videos=videos('a').map((v,i)=>({...v,title:(i<12?'The Entire History of Ancient ':'The Entire History of Modern ')+'Entity'+i}));await field(h);
 const r=await h.act('template',{channel:ids.a,template:'the entire history of'});const t=r.survey.nicheFlow.template;
 assert.equal(t.result.template,t.value);assert.equal(t.result.matches,20);assert.equal(t.result.titles.length,20);
});
test('B8 candidates retain every qualifying prefix and remove terminal articles',()=>{
 assert.equal(typeof rx.templateCandidates,'function');const titles=Array.from({length:20},(_,i)=>`The Entire History of ${i<12?'the ':''}Entity${i}`);
 const c=rx.templateCandidates(titles);assert(c.some(x=>x.template==='the entire history of'));assert(c.every(x=>!['the','a','an'].includes(x.template.split(' ').at(-1))));assert(c.every((x,i)=>!i||c[i-1].words>=x.words));
 const nested=rx.templateCandidates(videos('a').map(v=>v.title));assert.deepEqual(nested.map(c=>c.template),['the entire history of ancient','the entire history of','the entire history','the entire']);assert.deepEqual(rx.findTemplate(titles).candidates,c);
});
test('B8 empty candidates include a clear reason and never pass exact 50%',()=>{
 assert.equal(typeof rx.templateCandidates,'function');const t=Array.from({length:20},(_,i)=>i<10?'First pattern '+i:'Second pattern '+i);const c=rx.templateCandidates(t);assert.equal(c.length,0);assert.match(rx.findTemplate(t).reason,/không có khuôn.*đổi kênh chỉ đường/i);
});
test('B8 template rejects free text without mutation and locks the selected shorter candidate',async()=>{
 const h=harness();await field(h);const before=structuredClone(h.state());await assert.rejects(h.act('template',{channel:ids.a,template:'not in the candidates'}),e=>e.status===400);assert.deepEqual(h.state(),before);
 const result=await h.act('template',{channel:ids.a,template:'  THE   ENTIRE HISTORY OF  '});assert.equal(result.survey.nicheFlow.template.value,'the entire history of');assert(result.survey.nicheFlow.template.candidates.length>1);
 await h.act('shelf',{mode:'live'});const pool=h.state().surveys[0].nicheFlow.shelf.videos;await h.act('groups',{groups:Array.from({length:4},(_,i)=>({name:'g'+i,angle:'a'+i,videoIds:pool.filter((_,j)=>j%4===i).map(v=>v.id)}))});await h.act('groups',{groupId:'group-0'});await h.act('probe',{samples:Array.from({length:3},()=>Array(20).fill(30000))});await h.act('topics',{titles:Array.from({length:20},(_,i)=>'The Entire History of NewPlace'+i)});assert.equal(h.state().surveys[0].lockedNiche.template,'the entire history of');
 await h.act('template',{channel:ids.a,template:'the entire'});assert.equal(h.state().surveys[0].lockedNiche,undefined);assert.equal(h.state().surveys[0].nicheFlow.shelf,undefined);assert.match(h.state().surveys[0].nicheFlow.template.warning,/quá chung/);
});
test('B8 no template cannot open shelf',async()=>{
 const h=harness();h.state().surveys[0].videos=videos('a').map((v,i)=>({...v,title:(i<10?'First pattern ':'Second pattern ')+i}));await field(h);const r=await h.act('template',{channel:ids.a});assert.equal(r.survey.nicheFlow.template.passed,false);assert.equal(r.survey.nicheFlow.template.candidates.length,0);await assert.rejects(h.act('shelf'),e=>e.status===409);
});
test('B8 extra live channels pass ordinary gates, are deduplicated, and count toward estimates',async()=>{
 const h=harness();await field(h);await h.act('template',{channel:ids.a});const r=await h.act('shelf',{mode:'live',extraChannels:['@d','https://www.youtube.com/@x',ids.a,ids.d]});const shelf=r.survey.nicheFlow.shelf;
 assert.equal(shelf.count,4);assert.equal(shelf.channels.length,5);const x=shelf.channels.find(c=>c.channelId===ids.x);assert.equal(x.pass,false);assert.match(x.reason,/khuôn khác/);assert.equal(x.addedByUser,true);assert(shelf.channels.find(c=>c.channelId===ids.d).pass);assert(shelf.quotaEstimate.extraReadUnits>0);
 const before=structuredClone(h.state()),calls=h.calls.length;await assert.rejects(h.act('shelf',{mode:'live',extraChannels:Array(6).fill('@d')}),e=>e.status===400);assert.deepEqual(h.state(),before);assert.equal(h.calls.length,calls);
});
test('B8 import ignores extra channels with a message and no extra requests',async()=>{
 const h=harness();await field(h);await h.act('template',{channel:ids.a});const r=await h.act('shelf',{extraChannels:Array(6).fill('@d')});assert.match(r.survey.nicheFlow.shelf.notice,/kho nhập/i);assert.equal(h.calls.length,0);assert.equal(r.survey.nicheFlow.shelf.channels.length,1);
});
