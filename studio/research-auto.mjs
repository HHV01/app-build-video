import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {fetchPublicPage,extractSource} from './research-web.mjs';
import {searchResearch} from './research-search.mjs';
export const RESEARCH_AUDIT_SCHEMA='{"summary":"research summary","claims":[{"claim":"specific factual statement","verdict":"supported|conflicting|needs_check","note":"limits or disagreement","evidence":[{"sourceId":"ID","quote":"exact excerpt from supplied text, 20-400 characters"}]}],"timeline":[{"date":"verbatim date in claim","claimIndex":0}],"cast":[{"name":"verbatim name in claim","claimIndex":0}],"questions":["missing evidence"],"angles":["story angle"]}';
const short=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function sourceDomain(url){try{const parts=new URL(url).hostname.replace(/^www\./,'').split('.');return parts.slice(/^(?:co|ac|gov|org|com|edu)\.(?:uk|au|nz|jp)$/.test(parts.slice(-2).join('.'))?-3:-2).join('.');}catch{return '';}}
export function normalizeAutoResearch(output,sources){
 if(!output||!Array.isArray(output.claims)||!output.claims.length||output.claims.length>30)throw Error('AI chưa trả danh sách phát biểu có chứng cứ hợp lệ.');
 const byId=new Map(sources.map(s=>[s.id,s]));
 const claims=output.claims.map(row=>{
  const claim=short(row.claim,500);if(!claim)throw Error('Có phát biểu rỗng.');
  const evidence=(Array.isArray(row.evidence)?row.evidence:[]).slice(0,6).filter(e=>{const source=byId.get(e.sourceId);return source&&typeof e.quote==='string'&&e.quote.length>=20&&e.quote.length<=400&&source.text.includes(e.quote);}).map(e=>({sourceId:e.sourceId,quote:e.quote}));
  const domains=new Set(evidence.map(e=>sourceDomain(byId.get(e.sourceId).url)).filter(Boolean));
  const status=row.verdict==='supported'&&domains.size>=2?'supported':'needs_check';
  const verdict=row.verdict==='conflicting'?'conflicting':status;
  return {claim,status,verdict,sourceId:[...new Set(evidence.map(e=>e.sourceId))].join(', '),evidence,note:(verdict==='conflicting'?'Nguồn còn mâu thuẫn. ':status==='needs_check'?'Chưa đủ hai miền nguồn và trích đoạn phù hợp. ':'AI đã đối chiếu trích đoạn từ ít nhất hai miền. ')+short(row.note,350)};
 });
 const seen=new Set();const unique=claims.filter(row=>{const key=row.claim.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});
 const timeline=(Array.isArray(output.timeline)?output.timeline:[]).slice(0,24).flatMap(row=>{const claim=claims[row.claimIndex],date=short(row.date,60);return claim?.status==='supported'&&date&&claim.claim.includes(date)?[{date,event:claim.claim,sourceId:claim.sourceId}]:[];});
 const cast=(Array.isArray(output.cast)?output.cast:[]).slice(0,20).flatMap(row=>{const claim=claims[row.claimIndex],name=short(row.name,100);return claim?.status==='supported'&&name&&claim.claim.includes(name)?[{name,role:claim.claim,sourceId:claim.sourceId}]:[];});
 return {summary:short(output.summary,4000),claims:unique,facts:unique.map(({claim,status,sourceId,evidence,verdict})=>({claim,status,sourceId,evidence,verdict})),timeline,cast,sensory:'',questions:(Array.isArray(output.questions)?output.questions:[]).slice(0,12).map(x=>short(x,300)).filter(Boolean),angles:(Array.isArray(output.angles)?output.angles:[]).slice(0,3).map(x=>short(x,300)).filter(Boolean)};
}
export function researchInput(project,channel={}){
 const topic=short(project.topic,400);if(!topic)throw Object.assign(Error('Chốt chủ đề trước khi nghiên cứu tự động.'),{status:400});
 return {topic,title:short(project.packaging?.[project.selectedPackaging||0]?.title||topic,400),angle:short(project.researchAngle||channel.angle,400),language:short(channel.language||'vi',30),sources:(project.sources||[]).filter(s=>!s.autoResearch&&s.text?.trim()).slice(0,8).map(s=>({id:s.id,name:short(s.name,200),url:short(s.url,2000),text:s.text.slice(0,10000)}))};
}
export async function createAutoResearch({directory,call,audit,fetchPage=fetchPublicPage,search=searchResearch,cleanError=()=> 'Nghiên cứu tự động thất bại; dữ liệu cũ được giữ nguyên.'}){
 await mkdir(directory,{recursive:true});const jobs=new Map();let pending=0,queue=Promise.resolve();
 const file=id=>path.join(directory,id+'.json');
 async function persist(job){const temp=file(job.id)+'.tmp';await writeFile(temp,JSON.stringify(job));await rename(temp,file(job.id));}
 async function start(input,connection,{refresh=false}={}){
  const connections=Array.isArray(connection)?connection:[connection];
  const basis=createHash('sha256').update(JSON.stringify([input,connections.map(item=>[item.provider,item.model])])).digest('hex');
  const active=[...jobs.values()].find(j=>j.basis===basis&&['queued','running'].includes(j.status));if(active)return {id:active.id};
  if(!refresh){try{const old=JSON.parse(await readFile(file('cache-'+basis),'utf8'));if(old.status==='done'&&Date.now()-Date.parse(old.completedAt)<86400000)return {id:old.id};}catch{}}
  if(pending>=3)throw Object.assign(Error('Đang có nhiều tác vụ Research; chờ tác vụ hiện tại hoàn tất.'),{status:429});
  const job={id:randomUUID(),basis,status:'queued',message:'Đang chờ nghiên cứu…',provider:connections[0].provider,model:connections[0].model};jobs.set(job.id,job);pending++;await persist(job);
  queue=queue.then(async()=>{try{
   job.status='running';job.message='Đang tìm nguồn trên web…';await persist(job);
   const found=await search(connections,JSON.stringify({topic:input.topic,title:input.title,angle:input.angle}),call);job.suggestions=found.suggestions;
   if(found.search){job.provider=found.search.provider;job.model=found.search.model;job.searchAttempts=found.search.attempts||[];}
   const read=[],unread=[];for(let i=0;i<Math.min(6,found.links.length);i+=2){
    job.message=`Đang đọc nguồn ${i+1}–${Math.min(i+2,found.links.length,6)}…`;
    const batch=await Promise.all(found.links.slice(i,i+2).map(async link=>{try{const page=await fetchPage(link.url),article=extractSource(page.html,input.topic);return {id:'web-'+createHash('sha256').update(page.url).digest('hex').slice(0,16),name:article.title||link.title,url:page.url,text:article.text,autoResearch:true,excerpt:true,retrievedAt:new Date().toISOString()};}catch(e){unread.push({url:link.url,note:'Không đọc được nội dung text; không dùng làm chứng cứ.'});return null;}}));
    for(const source of batch.filter(Boolean))if(!read.some(x=>x.url===source.url))read.push(source);
    if(new Set(read.map(x=>sourceDomain(x.url))).size>=4)break;
   }
   const distinct=[];for(const source of read){const host=sourceDomain(source.url);if(!distinct.some(x=>sourceDomain(x.url)===host))distinct.push(source);}
   if(distinct.length<2)throw Object.assign(Error('Chưa đọc được nội dung từ ít nhất hai miền nguồn. Hãy thêm nguồn thủ công hoặc thử lại; dữ liệu cũ được giữ nguyên.'),{status:422});
   const sources=[...input.sources,...distinct.slice(0,4)];job.message='Đang đối chiếu phát biểu với trích đoạn nguồn…';
   const output=await audit(input,sources);const result=normalizeAutoResearch(output,sources);
   job.result={...result,sources:sources.filter(x=>x.autoResearch),unread,input,provider:job.provider,model:job.model,search:{provider:job.provider,model:job.model,attempts:job.searchAttempts||[]},checkedAt:new Date().toISOString()};job.status='done';job.message='Đã đối chiếu trích đoạn; cần xem các điểm chưa rõ.';job.completedAt=new Date().toISOString();
   await writeFile(file('cache-'+basis),JSON.stringify(job));
  }catch(e){job.status='error';job.error=cleanError(e);job.message=job.error;job.canAddSources=e.canAddSources===true;if(Array.isArray(e.attempts))job.searchAttempts=e.attempts;if(e.code)job.code=e.code;}finally{pending--;await persist(job);jobs.delete(job.id);}}).catch(()=>{jobs.delete(job.id);});
  return {id:job.id};
 }
 async function get(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Object.assign(Error('Mã tác vụ Research không hợp lệ.'),{status:400});const active=jobs.get(id);if(active)return active;const job=JSON.parse(await readFile(file(id),'utf8'));if(['running','queued'].includes(job.status)){job.status='error';job.error='Studio đã khởi động lại. Bấm nghiên cứu tự động để chạy lại.';}return job;}
 return {start,get};
}
