import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

// One render at a time bounds CPU/RAM; completed jobs survive server restarts.
export async function createRenderJobs({directory,render}) {
  await mkdir(directory,{recursive:true});
  let queue=Promise.resolve(),pending=0;
  const active=new Map();
  const metadata=id=>path.join(directory,id+'.json');
  async function persist(job){const temp=metadata(job.id)+'.tmp';await writeFile(temp,JSON.stringify(job));await rename(temp,metadata(job.id));}
  async function start(input){
    if(pending>=5)throw Object.assign(Error('Hàng đợi đầy; chờ bản dựng hiện tại hoàn tất.'),{status:429});
    const job={id:randomUUID(),status:'queued',progress:{completed:0,total:input?.scenes?.length||0}};
    await persist(job);pending++;active.set(job.id,job);
    queue=queue.then(async()=>{
      try{
        job.status='running';await persist(job);
        const result=await render(input,progress=>{job.progress=progress;});
        const basename=path.basename(result.file);
        if(path.resolve(result.file)!==path.join(path.resolve(directory),basename)||!/^[-a-f0-9]{36}\.mp4$/.test(basename))throw Error('Đường dẫn bản dựng không hợp lệ.');
        delete result.file;
        job.result={...result,url:`/api/renders/${job.id}/download`};job.output=basename;job.status='done';
      }catch(e){job.status='error';job.error=e.status?e.message:'Dựng thất bại. Kiểm tra FFmpeg và thử lại.';}
      finally{pending--;await persist(job);active.delete(job.id);}
    }).catch(()=>{active.delete(job.id);});
    return {id:job.id,status:job.status};
  }
  async function get(id){
    if(!/^[a-f0-9-]{36}$/.test(id))throw Object.assign(Error('Mã bản dựng không hợp lệ.'),{status:400});
    let job=active.get(id);
    if(!job){job=JSON.parse(await readFile(metadata(id),'utf8'));if(['queued','running'].includes(job.status)){job.status='error';job.error='Studio đã khởi động lại. Hãy dựng lại; cache cảnh vẫn được giữ.';}}
    const {output,...publicJob}=job;return publicJob;
  }
  async function file(job){
    const saved=JSON.parse(await readFile(metadata(job.id),'utf8'));
    if(!/^[a-f0-9-]{36}\.mp4$/.test(saved.output||''))throw Error('File bản dựng không hợp lệ.');
    return path.join(directory,saved.output);
  }
  return {start,get,file};
}
