export function scriptPlan(outline, minutes, wpm=150) {
  if(!Array.isArray(outline)||!outline.length)throw Error('Cần dàn ý trước.');
  const duration=Number(minutes);
  if(!Number.isFinite(duration)||duration<=0||duration>60)throw Error('Thời lượng phải lớn hơn 0 và không quá 60 phút.');
  const target=Math.round(duration*wpm), weights=outline.map(s=>Number(s.share)>0?Number(s.share):1/outline.length), sum=weights.reduce((a,b)=>a+b,0);
  let assigned=0;const plan=[];
  outline.forEach((focus,i)=>{const count=i===outline.length-1?target-assigned:Math.floor(target*weights[i]/sum);assigned+=count;const chunks=Math.max(1,Math.ceil(count/220));for(let j=0;j<chunks;j++){const words=Math.floor(count*(j+1)/chunks)-Math.floor(count*j/chunks);if(words)plan.push({focus,targetWords:words,segment:i+1,segmentPart:j+1,segmentParts:chunks});}});
  return plan;
}
export function sceneWindows(narration, seconds, ceiling, start=0, batchMax=4) {
  const total=Number(seconds),clip=Number(ceiling), words=String(narration||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length||!Number.isFinite(total)||total<=0||total>3600||!Number.isFinite(clip)||clip<=0||clip>15)throw Error('Cần lời kể, thời lượng và nhịp cảnh hợp lệ.');
  const count=Math.ceil(total/clip);
  if(count>words.length)throw Error('Lời kể quá ngắn so với số cảnh. Sửa thời lượng hoặc script trước.');
  if(!Number.isInteger(start)||start<0||start>count)throw Error('Số cảnh hiện có không hợp lệ.');
  return {count,windows:Array.from({length:Math.min(batchMax,count-start)},(_,i)=>{const index=start+i,first=Math.floor(words.length*index/count),last=Math.floor(words.length*(index+1)/count);return{index:index+1,narration:words.slice(first,last).join(' '),duration:index===count-1?total-clip*(count-1):clip};})};
}
export function validateAnimations(items, scenes) {
  if(!Array.isArray(items)||items.length!==scenes.length)throw Error('AI trả sai số prompt chuyển động.');
  const expected=new Set(scenes.map(s=>s.scene));
  for(const item of items){if(!expected.has(item.scene)||typeof item.prompt!=='string'||!item.prompt.trim())throw Error('Prompt chuyển động sai ID hoặc rỗng.');expected.delete(item.scene);}
  if(expected.size)throw Error('Thiếu prompt chuyển động.');
  return items;
}

export function compactSceneContext(context, windows) {
 const keys=['visualProfile','topic','language','angle','audience','niche','characterDescription','researchAngle'];
 return {...Object.fromEntries(keys.filter(key=>context[key]!==undefined).map(key=>[key,context[key]])),narration:windows.map(w=>w.narration).join(' ')};
}
