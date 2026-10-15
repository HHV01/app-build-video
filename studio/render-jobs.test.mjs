import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRenderJobs} from './render-jobs.mjs';

test('serial queue bounds load, failure does not block next job, completed download survives restart',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'render-jobs-'));
 let concurrent=0,maximum=0;
 const render=async(input,progress)=>{
   concurrent++;maximum=Math.max(maximum,concurrent);
   try{
     await new Promise(r=>setTimeout(r,20));
     if(input.fail)throw Object.assign(Error('Thiếu ảnh'),{status:400});
     const file=path.join(directory,randomUUID()+'.mp4');await writeFile(file,'MP4');progress({completed:51,total:51});
     return {file,fileName:'video.mp4'};
   }finally{concurrent--;}
 };
 try{
   const jobs=await createRenderJobs({directory,render});
   const first=await jobs.start({fail:true}),second=await jobs.start({});
   let job;for(let n=0;n<100;n++){job=await jobs.get(second.id);if(job.status==='done')break;await new Promise(r=>setTimeout(r,10));}
   assert.equal(maximum,1);assert.equal((await jobs.get(first.id)).status,'error');assert.equal(job.status,'done');assert.equal(job.output,undefined);assert.equal(job.result.file,undefined);
   const restored=await createRenderJobs({directory,render});
   const persisted=await restored.get(second.id);assert.equal(persisted.status,'done');assert.equal(await readFile(await restored.file(persisted),'utf8'),'MP4');
   await assert.rejects(restored.get('../secret'));
   const interrupted=randomUUID();await writeFile(path.join(directory,interrupted+'.json'),JSON.stringify({id:interrupted,status:'running'}));assert.equal((await restored.get(interrupted)).status,'error');
 }finally{await rm(directory,{recursive:true,force:true});}
});
