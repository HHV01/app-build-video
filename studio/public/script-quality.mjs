const normalize=s=>String(s||'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const keywords=s=>new Set(normalize(s).split(' ').filter(w=>!['kiểm','tra','cần','xác','nhận','lại','của','vào','ở','khi','năm','the','of','nguồn','tên'].includes(w)));
export function filterEditorNotes(notes=[],sourceNames=[]) {
 const good=[];
 const priority=s=>/\d/.test(s)?2:/\p{Lu}[\p{L}]+/u.test(s.replace(/^\S+\s+/,''))?1:0;
 for(const note of [...notes].filter(x=>typeof x==='string').sort((a,b)=>priority(b)-priority(a))) {
  const text=note.trim();if(!text)continue;
  if(/tên nguồn|nguồn (?:có tên|được gọi)|source (?:name|title)/i.test(text))continue;
  if(sourceNames.some(name=>normalize(text).includes(normalize(name))&&!/\d/.test(text)&&keywords(text).size<=keywords(name).size+2))continue;
  const words=keywords(text);if(good.some(x=>{const prev=keywords(x),common=[...words].filter(w=>prev.has(w)).length;return normalize(x)===normalize(text)||common/Math.max(1,Math.min(words.size,prev.size))>=.6;}))continue;
  good.push(text);if(good.length===5)break;
 }return good;
}
export function cleanNarration(text) {
 return String(text||'').split('\n').filter(line=>!/^\s*#{1,6}\s|^\s*\[(?:hook|intro|outro|scene[^\]]*|cảnh[^\]]*)\]\s*$/i.test(line)).map(line=>line.replace(/^\s*(?:cảnh|scene)\s*\d+\s*[:.\-]?\s*/i,'').replace(/^\s*\[(?:hook|intro|outro)\]\s*/i,'')).join('\n').trim();
}
const wordCount=text=>String(text).trim().split(/\s+/).filter(Boolean).length;
export async function writeCheckedPart(generate,context) {
 let result=await generate(context);result={...result,narration:cleanNarration(result.narration)};
 if(!result.narration)throw Error('AI chưa trả lời kể; phần đã viết được giữ để tiếp tục.');
 const off=r=>Math.abs(wordCount(r.narration)-context.targetWords)>context.targetWords*.25;
 if(off(result)){result=await generate({...context,lengthCorrection:`Viết ${wordCount(result.narration)<context.targetWords?'dài hơn':'ngắn hơn'}: mục tiêu ${context.targetWords} từ, lần trước ${wordCount(result.narration)} từ. Chỉ sửa phần đang viết.`});result={...result,narration:cleanNarration(result.narration)};if(!result.narration)throw Error('AI chưa trả lời kể sau khi chỉnh độ dài.');}
 return {...result,...(off(result)?{warning:`Phần vẫn lệch độ dài: ${wordCount(result.narration)}/${context.targetWords} từ sau một lần thử lại.`}:{})};
}
export function repeatedParts(parts=[]) {
 const grams=text=>{const words=normalize(text).split(' ');return new Set(words.slice(0,-4).map((_,i)=>words.slice(i,i+5).join(' ')));};const sets=parts.map(grams),pairs=[];
 for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++){const matches=[...sets[i]].filter(g=>sets[j].has(g)),ratio=matches.length/Math.max(1,Math.min(sets[i].size,sets[j].size));if(matches.length&&ratio>=.2)pairs.push({first:i+1,second:j+1,matches:matches.length,ratio,examples:matches.slice(0,3)});}return pairs;
}
