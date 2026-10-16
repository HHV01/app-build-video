import test from 'node:test';
import assert from 'node:assert/strict';
import {runAutoPipeline} from './public/auto-pipeline.mjs';

const words=n=>Array.from({length:n},(_,i)=>'tu'+i).join(' ');
function harness(p,channel={type:'faceless',language:'vi'}){
 const calls=[];
 const generate=async(action,context)=>{
  calls.push({action,context});
  if(action==='packaging')return {variants:[{title:'Tieu de pick',overlay:'CHU THUMB',hook:'Hook mo',promise:'Loi hua',hookType:'myth-buster',thumbnailVisual:'scene'}],tags:['tag-moi']};
  if(action==='research')return {claims:[],questions:[],summary:'Tom tat',timeline:[],facts:[],sensory:'',cast:[],angles:[]};
  if(action==='outline')return {segments:[{title:'Mo dau',share:.3,question:'q',insight:'i',story:'s',visual:'v'},{title:'Ket',share:.7,question:'q',insight:'i',story:'s',visual:'v'}]};
  if(action==='rosterExtras')return {extras:[],backgrounds:[]};
  if(action==='scenes'){
   if(!context.combined)throw Error('pipeline phai dung combined');
   return {tagsByIndex:context.windows.map(w=>({index:w.index,tags:['wide'],summary:'canh mo'})),scenes:context.windows.map(()=>({visual:'mo ta',prompt:'Tich chi vao so do',overlay:'',sfx:'',characters:[],background:'nha'}))};
  }
  throw Error('action khong mong doi: '+action);
 };
 const save=async()=>{};
 const writeScript=async()=>{p.narration=words(24);};
 return {calls,deps:{generate,save,writeScript,getContext:()=>({topic:p.topic,language:'vi',sources:p.sources||[],researchAngle:''}),shelfTags:()=>({baseTags:['tag-cu'],needsTagExtras:false}),joinTags:tags=>tags.join(', ')}};
}
const bareProject=()=>({topic:'Vi sao het tien',minutes:5,approved:[],sources:[],outline:[],packaging:[],selectedPackaging:0,narration:'',step:0});

test('chay tu dong tu chu de: tieu de -> dan y -> kich ban -> roster -> canh',async()=>{
 const p=bareProject(),h=harness(p);
 const out=await runAutoPipeline({type:'faceless',language:'vi'},p,{...h.deps,onProgress:()=>{}});
 assert.deepEqual(h.calls.map(c=>c.action),['packaging','outline','rosterExtras','scenes']);
 assert.equal(p.selectedPackaging,0);
 assert.equal(p.tagText,'tag-cu, tag-moi');
 assert.ok(p.outline.length===2);
 assert.equal(p.narration.trim().split(/\s+/).length,24);
 assert.equal(p.rosterConfirmed,true);
 assert.ok(p.scenes.length>=2);
 assert.equal(p.step,5);
 assert.deepEqual([...p.approved].sort((a,b)=>a-b),[0,1,2,3,4]);
 assert.equal(out.scenes,p.scenes.length);
});

test('co nguon thi doi chieu claim; bam lai thi tiep tuc, khong lam lai',async()=>{
 const p=bareProject();p.sources=[{id:'s1',name:'Bao',url:'',text:'Noi dung nguon dai'}];
 const h=harness(p);
 await runAutoPipeline({type:'faceless',language:'vi'},p,h.deps);
 assert.equal(h.calls[1].action,'research');
 assert.equal(p.claims.length,0);
 assert.equal(p.researchSummary,'Tom tat');
 const before=h.calls.length;
 await runAutoPipeline({type:'faceless',language:'vi'},p,h.deps);
 assert.equal(h.calls.length,before,'khong goi AI khi moi buoc da xong');
});

test('thieu chu de thi dung lai; kenh thieu bible thi bao duyet tay',async()=>{
 const p=bareProject();p.topic='  ';
 await assert.rejects(runAutoPipeline({type:'faceless'},p,harness(p).deps),/chủ đề|chu de/i);
 const p2=bareProject();
 await assert.rejects(runAutoPipeline({type:'mascot',characters:[],language:'vi'},p2,harness(p2).deps),/duyệt tay/);
});
