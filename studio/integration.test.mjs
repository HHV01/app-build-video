import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp,readFile,rm,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { createAssetStore } from './assets.mjs';
const root=path.resolve('.'),tempRoot=path.join(root,'tmp');
test('Media stored separately, deduplicated, typed and restricted to safe identifiers',async()=>{
 const dir=await mkdtemp(path.join(tempRoot,'assets-test-')),store=createAssetStore(dir);
 try{const data='data:image/png;base64,'+Buffer.from('test media').toString('base64');const a=await store.put(data),b=await store.put(data);assert.equal(a.url,b.url);
 assert.equal(store.read(a.url,'data:image/').bytes.toString(),'test media');assert.throws(()=>store.read(a.url,'data:audio/'));assert.throws(()=>store.read('/api/assets/../../settings.json'));
 const state={projects:[{scenes:[{image:data}],voiceData:'no file'}]};const refs=await store.externalize(state);assert.equal(refs.length,1);assert.equal(state.projects[0].scenes[0].image,a.url);assert(!JSON.stringify(state).includes('base64'));
 await assert.rejects(store.put('data:text/html;base64,WA=='));await assert.rejects(store.put('data:image/png;base64,A'));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Real HTTP routes enforce revisions and niche gates, persist media and render without dropping narration',async()=>{
 const dir=await mkdtemp(path.join(tempRoot,'http-test-')),port=33219;
 const server=spawn(process.execPath,['studio/server.mjs'],{cwd:root,env:{...process.env,STUDIO_PORT:String(port),STUDIO_DATA_DIR:dir},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let errors='';server.stderr.on('data',d=>errors+=d);
 const base=`http://localhost:${port}`;
 async function req(route,method='GET',body){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json','X-Studio-Request':'1'},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()};}
 try{
   for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error(errors);try{await fetch(base+'/api/state');break;}catch{await new Promise(r=>setTimeout(r,50));}}
   assert.equal((await fetch(base+'/production.mjs')).status,200);
   const initial=(await req('/api/state')).body;
   initial.surveys=[{id:'s',market:'US',language:'en',format:'long',videos:[],nicheFlow:{field:{passed:true}},lockedNiche:{template:'forged'}}];
   assert.equal((await req('/api/state','PUT',initial)).status,200);
   const saved=(await req('/api/state')).body;assert.equal(saved.surveys[0].nicheFlow,undefined);assert.equal(saved.surveys[0].lockedNiche,undefined);
   assert.equal((await req('/api/niche/topics','POST',{surveyId:'s',titles:Array(20).fill('forged')})).status,409);
   const field=await req('/api/niche/field','POST',{surveyId:'s',market:'US',language:'en',format:'long'});assert.equal(field.status,200);assert.equal(field.body.survey.nicheFlow.field.passed,true);
   const snapshot=(await req('/api/state')).body;
   const writes=await Promise.all([req('/api/state','PUT',snapshot),req('/api/state','PUT',snapshot)]);assert.deepEqual(writes.map(x=>x.status).sort(),[200,409]);
   const latest=(await req('/api/state')).body;latest.channels=[{id:'c',surveyId:'s'}];assert.equal((await req('/api/state','PUT',latest)).status,409);
   const asset=await req('/api/assets','POST',{data:'data:audio/wav;base64,'+wav(2).toString('base64')});assert.equal(asset.status,200);assert.equal((await fetch(base+asset.body.url)).headers.get('content-type'),'audio/wav');
   const invalid=await req('/api/render','POST',{scenes:[{duration:1,image:''}],voice:asset.body.url});assert.equal(invalid.status,422);assert.match(invalid.body.error,/thiếu ảnh/);
   const pngFile=path.join(dir,'frame.png');
   const ff=spawn(path.join(root,'tools/ffmpeg/bin/ffmpeg.exe'),['-y','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=white:s=320x180','-frames:v','1',pngFile],{windowsHide:true});assert.equal((await once(ff,'close'))[0],0);
   const image=(await req('/api/assets','POST',{data:'data:image/png;base64,'+(await readFile(pngFile)).toString('base64')})).body.url;
   const rendered=await req('/api/render','POST',{name:'test',width:320,height:180,scenes:[{duration:1,image},{duration:1,image}],voice:asset.body.url,voiceExt:'wav'});assert.equal(rendered.status,200,rendered.body.error);assert.equal(rendered.body.droppedScenes,0);assert.equal(rendered.body.scenesRendered,2);assert(Math.abs(rendered.body.probe.duration-2)<.2);
   const mismatch=await req('/api/render','POST',{width:320,height:180,scenes:[{duration:1,image}],voice:asset.body.url,voiceExt:'wav'});assert.equal(mismatch.status,422);assert.match(mismatch.body.error,/chưa khớp voice/);
   const mediaState=(await req('/api/state')).body;mediaState.projects=[{id:'p',voiceData:'data:audio/wav;base64,'+wav(2).toString('base64')}];const stored=await req('/api/state','PUT',mediaState);assert.equal(stored.status,200);assert.equal(stored.body.mediaRefs.length,1);assert(!JSON.stringify(JSON.parse(await readFile(path.join(dir,'state.json'),'utf8'))).includes('base64'));
 }finally{server.kill();if(server.exitCode===null)await once(server,'exit');await rm(dir,{recursive:true,force:true});}
});
function wav(seconds){const rate=8000,size=rate*seconds*2,b=Buffer.alloc(44+size);b.write('RIFF');b.writeUInt32LE(36+size,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(size,40);return b;}
