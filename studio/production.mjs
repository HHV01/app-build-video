export function scriptPlan(outline, minutes, wpm=150) {
  if(!Array.isArray(outline)||!outline.length)throw Error('Cần dàn ý trước.');
  const duration=Number(minutes);
  if(!Number.isFinite(duration)||duration<=0||duration>60)throw Error('Thời lượng phải lớn hơn 0 và không quá 60 phút.');
  const target=Math.round(duration*wpm), weights=outline.map(s=>Number(s.share)>0?Number(s.share):1/outline.length), sum=weights.reduce((a,b)=>a+b,0);
  let assigned=0;const plan=[];
  outline.forEach((focus,i)=>{const count=i===outline.length-1?target-assigned:Math.floor(target*weights[i]/sum);assigned+=count;const chunks=Math.max(1,Math.ceil(count/220));for(let j=0;j<chunks;j++){const words=Math.floor(count*(j+1)/chunks)-Math.floor(count*j/chunks);if(words)plan.push({focus,targetWords:words,segment:i+1,segmentPart:j+1,segmentParts:chunks});}});
  return plan;
}
