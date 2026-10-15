import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createTimeline,parseSrt} from './timeline.mjs';

export function createVoiceJobs({root,dataRoot,assets}) {
 const jobs=new Map();let queue=Promise.resolve();
 const runtime=process.env.STUDIO_LOCAL_VIDEO_HOME||path.join(root,'..','Test repo_V');
 const python=process.env.STUDIO_PYTHON||path.join(runtime,'video-test/.venv/Scripts/python.exe');
 const ffmpeg=[path.join(root,'tools/ffmpeg/bin/ffmpeg.exe'),path.join(runtime,'app-build-video/tools/ffmpeg/bin/ffmpeg.exe')].find(existsSync)||'ffmpeg';
 function run(exe,args,env={}) {return new Promise((resolve,reject)=>{const c=spawn(exe,args,{windowsHide:true,env:{...process.env,...env}});let err='';c.stderr.on('data',d=>err+=d);c.on('error',reject);c.on('close',code=>code===0?resolve():reject(Error(err.slice(-600)||'Tiến trình local thất bại.')));});}
 async function transcribe(audio,output) {
  const args=[path.join(root,'studio/local_transcribe.py'),audio,output,'--cache',path.join(runtime,'app-build-video/.studio-data/whisper-models'),'--language','vi'];
  try {await run(python,args,{STUDIO_WHISPER_CUDA:'1'});}catch(e){if(!/cuda|cudnn|cublas|driver/i.test(e.message))throw e;await run(python,args,{STUDIO_WHISPER_CUDA:'0'});}
  return JSON.parse(await readFile(output,'utf8')).segments;
 }
 function start(project) {
  if(!project.voiceData||!project.narration)throw Error('Cần voice đã lưu và kịch bản.');
  const p=structuredClone(project),job={id:randomUUID(),status:'running',message:'Đang chờ nhận diện voice local…',narration:p.narration,voice:p.voiceData};jobs.set(job.id,job);
  queue=queue.then(async()=>{try {
   const bytes=assets.read(p.voiceData,'data:audio').bytes,cache=path.join(dataRoot,'voice-words');await mkdir(cache,{recursive:true});
   const key=createHash('sha256').update(bytes).digest('hex'),output=path.join(cache,key+'.json');
   let dir,audio;
   async function ensureAudio(){if(!audio){dir=await mkdtemp(path.join(cache,'job-'));audio=path.join(dir,'voice.wav');await writeFile(audio,bytes);}return audio;}
   let words;
   if(existsSync(output))words=JSON.parse(await readFile(output,'utf8')).segments;
   else {job.message='Đang nhận diện lời đọc trên máy; voice dài cần vài phút…';words=await transcribe(await ensureAudio(),output);}
   for(let attempt=0;attempt<4;attempt++) {
    job.message='Đang đối chiếu kịch bản và chia cảnh…';
    const timeline=createTimeline(p.narration,words,Number(p.voiceSeconds),Number(p.clipSeconds)||8,'local');
    try {parseSrt(timeline.srt);job.timeline=timeline;break;}catch(e){
     const bad=timeline.cues.find((q,i)=>q.end<=q.start||(i&&q.start<timeline.cues[i-1].end));
     if(!bad||attempt===3)throw Error('Có đoạn voice chưa tìm được mốc phụ đề riêng. Hãy kiểm tra gần giây '+Math.round(bad?.start||0)+'. Kịch bản và cảnh cũ được giữ nguyên.');
     const left=Math.max(0,bad.start-15),right=Math.min(Number(p.voiceSeconds),bad.start+20),duration=right-left;
     job.message='Đang nhận diện lại đoạn khó gần giây '+Math.round(bad.start)+'…';await ensureAudio();
     const clip=path.join(dir,'retry-'+attempt+'.wav'),json=path.join(dir,'retry-'+attempt+'.json');
     await run(ffmpeg,['-y','-v','error','-ss',String(left),'-t',String(duration),'-i',audio,clip]);
     const local=await transcribe(clip,json),margin=2;
     const from=left===0?0:left+margin,to=right===Number(p.voiceSeconds)?right:right-margin;
     const refined=local.map(w=>({...w,start:Math.round((w.start+left)*1000)/1000,end:Math.round((w.end+left)*1000)/1000})).filter(w=>w.start>=from&&w.end<=to);
     if(!refined.length)throw Error('Không nhận diện được đoạn voice cần kiểm tra.');
     words=[...words.filter(w=>w.start<from||w.start>=to),...refined].sort((a,b)=>a.start-b.start);
     await writeFile(output,JSON.stringify({segments:words,language:'vi'}));
    }
   }
   await writeFile(path.join(cache,job.id+'-timeline.json'),JSON.stringify(job.timeline));
   job.status='done';job.message='Đã căn lời đọc và chia cảnh; cần duyệt mốc trước khi tạo ảnh.';
  }catch(e){job.status='error';job.error=e.message;job.message=e.message;}});
  return {id:job.id};
 }
 function get(id){const job=jobs.get(id);if(!job)throw Error('Không tìm thấy tiến trình.');return job;}
 return {start,get};
}
