import {tagMenu,validateSceneTags,CAMERAS} from './character-bible.mjs';
import {sceneCharacterRoster} from './scene-character.mjs';
export const BIBLE_FIELDS=['expression','pose','prop','outfit','graphics','camera'];
export function sceneBible(channel={},project={}){
 const main=sceneCharacterRoster(channel,project).main;
 const bible=main[0]?.bible||channel.characterBible||channel.character;
 return bible&&['expressions','poses','outfits','props','graphics'].every(key=>Array.isArray(bible[key]))?bible:null;
}
export function bibleFromMenu(menu){
 if(typeof menu!=='string'||menu.length>12000)throw Error('Menu bible không hợp lệ.');
 const groups={expression:'expressions',pose:'poses',outfit:'outfits',prop:'props',graphics:'graphics',camera:'camera'},result={identity:''},seen=new Set();
 for(const line of menu.split('\n')){
  const [key,...rest]=line.split(':');if(!groups[key]||seen.has(key))throw Error('Menu bible không hợp lệ.');seen.add(key);
  const tags=rest.join(':').trim().split('|').map(t=>t.trim()).filter(Boolean);
  if(tags.length>100||tags.some(t=>!/^[-\p{L}\p{N}]+$/u.test(t)))throw Error('Menu bible chỉ chứa tên thẻ.');
  if(key==='camera'){if(tags.some(t=>!CAMERAS.includes(t)))throw Error('Camera ngoài menu.');}else result[groups[key]]=tags.map(tag=>({tag,label:tag}));
 }
 if(seen.size!==6)throw Error('Menu bible thiếu nhóm thẻ.');return result;
}
export const bibleMenu=bible=>tagMenu(bible);
export function validateBibleBatch(items,windows,bible,prev=[]){
 const fail=message=>{throw Object.assign(Error(message),{invalidTags:true});};
 if(!Array.isArray(items)||items.length!==windows.length)fail('AI trả sai số thẻ bible.');
 const previous=[...prev];return windows.map(w=>{
  const rows=items.filter(row=>row&&row.index===w.index),row=rows[0];
  if(rows.length!==1||typeof row.summary!=='string'||row.summary.trim().split(/\s+/).filter(Boolean).length>20||!CAMERAS.includes(row.camera)||['expression','pose','prop','outfit'].some(k=>row[k]!==undefined&&typeof row[k]!=='string')||row.graphics!==undefined&&(!Array.isArray(row.graphics)||row.graphics.some(g=>typeof g!=='string')))fail('Thẻ bible hoặc summary không hợp lệ.');
  const clean={index:w.index,...Object.fromEntries(BIBLE_FIELDS.map(key=>[key,row[key]??(key==='graphics'?[]:'')])),summary:row.summary.trim()};
  const checked=validateSceneTags(clean,bible,previous);
  if(checked.errors.length)fail(checked.errors.join(' '));previous.push(clean);
  return {...clean,tagWarnings:checked.warnings};
 });
}
export function bibleSceneCheck(scene,bible,prev=[]){return validateSceneTags({...scene,subject:scene.prompt||scene.visual||scene.subject||''},bible,prev);}
export function updateBibleTags(channel,project,index,patch){
 const bible=sceneBible(channel,project),scene=project.scenes?.[index];if(!bible||!scene)throw Error('Không tìm thấy bible hoặc cảnh.');
 const next={...scene,...Object.fromEntries(Object.entries(patch).filter(([key])=>BIBLE_FIELDS.includes(key)))};
 const checked=bibleSceneCheck({...next,noCharacter:false},bible,project.scenes.slice(0,index));
 if(checked.errors.some(error=>!['Thiếu expression.','Cần pose hoặc prop.'].includes(error)))throw Error(checked.errors.join(' '));
 Object.assign(scene,...BIBLE_FIELDS.map(key=>({[key]:next[key]})),{invalidTags:checked.errors.length>0,tagErrors:checked.errors,tagWarnings:checked.warnings});
 project.done=false;project.approved=(project.approved||[]).filter(n=>n!==5);
}
