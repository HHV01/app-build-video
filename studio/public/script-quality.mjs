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
