import {sceneWindows,compactSceneContext,validateAnimations} from '../production.mjs';

// Scene planning vocabulary, separate from the protected character bible vocabulary.
export const tagMenu=Object.freeze(Object.fromEntries(Object.entries({
 action:['walk','sit','stand','turn','reach','open','close','talk','listen','react'],
 camera:['wide','medium','close-up','over-shoulder','low-angle','high-angle','eye-level'],
 location:['indoor','outdoor','room','hallway','desk','yard'],
 time:['day','morning','afternoon','evening','night'],
 mood:['calm','curious','serious','excited','worried','neutral'],
}).map(([key,values])=>[key,Object.freeze(values)])));
const allowed=new Set(Object.values(tagMenu).flat());
const words=text=>String(text||'').trim().split(/\s+/).filter(Boolean);
const tagError=message=>Object.assign(Error(message),{invalidTags:true});
export function validateSceneTags(items,windows){
 if(!Array.isArray(items)||items.length!==windows.length)throw tagError('AI trả sai số thẻ cảnh.');
 return windows.map(window=>{
  const rows=items.filter(item=>item.index===window.index),row=rows[0];
  if(rows.length!==1||!Array.isArray(row.tags)||row.tags.length<1||row.tags.length>3||row.tags.some(t=>typeof t!=='string'||!allowed.has(t.toLowerCase()))||typeof row.summary!=='string'||words(row.summary).length>20)throw tagError('Thẻ cảnh không hợp lệ: chọn 1–3 thẻ trong menu và tóm tắt tối đa 20 từ.');
  const tags=row.tags.map(t=>t.toLowerCase());if(new Set(tags).size!==tags.length)throw tagError('Thẻ cảnh bị trùng.');
  return {index:window.index,tags,summary:row.summary.trim()};
 });
}
export function sceneNarration(project){return typeof project.script==='string'&&project.script.trim()?project.script:project.narration||'';}
export function scenePlan(project){
 const narration=sceneNarration(project),seconds=Number(project.voiceSeconds)||Math.max(1,words(narration).length/150*60),ceiling=Number(project.clipSeconds)||8;
 return {...sceneWindows(narration,seconds,ceiling,0,4),narration,seconds,ceiling};
}
export function validateSceneCoverage(project){
 const original=words(sceneNarration(project)),scenes=project.scenes||[],seen=new Set();let covered=0,position=0,ordered=true;
 for(const [i,scene] of scenes.entries()){
  const text=String(scene.narration||'').trim(),tokens=words(text),index=scene.index??scene.scene??scene.id??i+1;
  scene.emptyNarration=!text;scene.duplicateNarration=Boolean(text&&seen.has(text));seen.add(text);
  scene.promptLong=words(scene.prompt).length>80;scene.indexWarning=index!==i+1;
  if(tokens.some((t,j)=>t!==original[position+j]))ordered=false;
  position+=tokens.length;covered+=tokens.length;
 }
 const coverage=original.length?covered/original.length:0;
 const coverageWarning=coverage<.98||coverage>1||!ordered||scenes.some(s=>s.emptyNarration||s.duplicateNarration||s.indexWarning);
 project.coverage=coverage;
 project.coverageWarning=coverageWarning?`Chưa phủ đủ kịch bản: ${(coverage*100).toFixed(1)}%${ordered?'':' — lời kể thiếu, trùng hoặc sai thứ tự.'}`:'';
 return {coverage,coverageWarning,complete:scenes.length>0&&!coverageWarning};
}
export async function runSceneBatches(project,{generate,save,onProgress=()=>{}}){
 const plan=scenePlan(project);project.scenes||=[];
 const basis=JSON.stringify([plan.narration,plan.seconds,plan.ceiling]);
 if(project.scenes.length&&project.sceneBasis&&project.sceneBasis!==basis)throw Error('Kịch bản hoặc thời lượng đã đổi. Giữ cảnh cũ; hãy dùng một bản dự án mới để chia lại.');
 if(project.scenes.length>plan.count)throw Error('Số cảnh cũ vượt kế hoạch hiện tại. Kiểm tra thời lượng trước khi tiếp tục.');
 project.sceneBasis=basis;
 for(let start=project.scenes.length;start<plan.count;start=project.scenes.length){
  const {windows}=sceneWindows(plan.narration,plan.seconds,plan.ceiling,start,4);
  onProgress(`Đang tạo cảnh ${start+1}–${start+windows.length}/${plan.count}`);
  let tags;
  for(let attempt=0;attempt<2;attempt++){
   try{
    const reply=await generate('sceneTags',{windows:windows.map(({index,narration})=>({index,narration})),tagMenu,summaryPrev:project.scenes.at(-1)?.summary||''});
    tags=validateSceneTags(reply.tagsByIndex,windows);break;
   }catch(error){
    if(!error.invalidTags)throw error;
    if(attempt===1){project.sceneIssues=windows.map(w=>({index:w.index,invalidTags:true,reason:error.message}));await save();throw tagError('Thẻ cảnh vẫn sai sau một lần thử lại. Lô trước được giữ; bấm Tiếp tục để thử lô này.');}
   }
  }
  const reply=await generate('scenes',compactSceneContext({tagsByIndex:tags},windows));
  if(!Array.isArray(reply.scenes)||reply.scenes.length!==windows.length)throw Error('AI trả sai số cảnh; lô chưa được lưu, có thể tiếp tục.');
  const batch=reply.scenes.map((row,i)=>{
   if(!row||['visual','prompt','overlay','sfx','background'].some(key=>typeof row[key]!=='string')||!row.prompt.trim()||!Array.isArray(row.characters)||row.characters.some(c=>typeof c!=='string'))throw Error('AI trả cảnh thiếu trường; lô chưa được lưu.');
   return {...Object.fromEntries(['visual','prompt','overlay','sfx','characters','background'].map(key=>[key,row[key]])),...windows[i],tags:tags[i].tags,summary:tags[i].summary};
  });
  project.scenes.push(...batch);delete project.sceneIssues;validateSceneCoverage(project);await save();
 }
 return validateSceneCoverage(project);
}
export function animationFor(project,index){
 if(Array.isArray(project.animations))return project.animations.find(item=>item.scene===index)?.prompt||'';
 const value=project.animations?.[index];return typeof value==='string'?value:value?.prompt||'';
}
export async function runAnimationBatches(project,{generate,save,onProgress=()=>{}}){
 const pending=(project.scenes||[]).map((s,i)=>({scene:s.index??s.scene??s.id??i+1,narration:s.narration})).filter(s=>!animationFor(project,s.scene));
 for(let start=0;start<pending.length;start+=4){
  const scenes=pending.slice(start,start+4);onProgress(`Đang tạo chuyển động cho ${scenes.map(s=>s.scene).join(', ')}`);
  const output=await generate('animation',{scenes}),items=validateAnimations(output.animations,scenes);
  const map=Array.isArray(project.animations)?Object.fromEntries(project.animations.map(s=>[s.scene,s.prompt])):{...(project.animations||{})};
  for(const item of items)map[item.scene]=item.prompt;project.animations=map;await save();
 }
}
