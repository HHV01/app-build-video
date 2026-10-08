import {parseCharacterBible,slug} from './character-bible.mjs';
const countWords=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const key=s=>String(s||'').normalize('NFC').trim().toLowerCase();
export function loadChannelBible(channel,text){
 channel.bibleText=String(text||'');const result=parseCharacterBible(channel.bibleText);channel.bibleErrors=result.errors;
 if(!result.errors.length){const c=result.character;channel.characters=[{id:slug(c.name)||'main',name:c.name||'Main character',role:'Nhân vật chủ đạo',description:c.identity,bible:structuredClone(c)}];}
 return result;
}
export const loadTichSample=(channel,fetcher=fetch)=>loadCharacterSample(channel,'tich',fetcher);
export const loadSchoolboySample=(channel,fetcher=fetch)=>loadCharacterSample(channel,'schoolboy',fetcher);
async function loadCharacterSample(channel,name,fetcher){
 const [json,text]=await Promise.all([fetcher('/'+name+'.preset.json'),fetcher('/'+name+'-bible.txt')]);
 if(!json.ok||!text.ok)throw Error('Không tải được mẫu nhân vật.');
 const preset=await json.json(),bible=await text.text(),parsed=parseCharacterBible(bible);
 if(parsed.errors.length||parsed.character.identity!==preset.identity||parsed.character.name!==preset.name)throw Error('Mẫu bible và preset không khớp.');
 return loadChannelBible(channel,bible);
}
export function projectMainCharacters(channel,project={}){
 return structuredClone(project.rosterConfirmed?project.mainCharacters||[]:channel.characters||project.mainCharacters||[]);
}
export function initializeProjectRoster(channel,project){
 project.mainCharacters=projectMainCharacters(channel,project);project.extraCharacters||=[];project.backgrounds||=[];project.rosterReviewed=false;return project;
}
export function ensureRosterDraft(project){project.rosterDraft||={extraCharacters:structuredClone(project.extraCharacters||[]),backgrounds:structuredClone(project.backgrounds||[])};return project.rosterDraft;}
export function buildRoster(main=[],extras=[],backgrounds=[]){
 if(!Array.isArray(main)||!Array.isArray(extras)||!Array.isArray(backgrounds))throw Error('Danh sách roster phải là mảng.');
 if(extras.length>6||backgrounds.length>6)throw Error('Tối đa 6 nhân vật phụ và 6 bối cảnh.');
 const roster=Object.create(null),names=new Set();
 for(const [rows,limited] of [[main,false],[extras,true],[backgrounds,true]])for(const row of rows){
  if(typeof row.name!=='string'||!row.name.trim()||typeof row.description!=='string'||!row.description.trim())throw Error('Mỗi mục cần tên và mô tả tiếng Anh.');
  if(limited&&countWords(row.description)>40)throw Error('Mô tả nhân vật phụ/bối cảnh tối đa 40 từ.');
  if(names.has(key(row.name)))throw Error('Tên nhân vật và bối cảnh không được trùng nhau.');
  names.add(key(row.name));roster[row.name.trim()]=row.description;
 }
 return roster;
}
export function confirmProjectRoster(channel,project){
 if(!project.rosterReviewed)throw Error('Bạn cần xem và xác nhận danh sách trước khi tiếp tục.');
 const main=projectMainCharacters(channel,project);
 if(!main.length&&channel.type!=='faceless')throw Error('Nạp bible nhân vật hợp lệ ở Bản sắc trước.');
 const extras=project.rosterDraft?.extraCharacters||project.extraCharacters||[],backgrounds=project.rosterDraft?.backgrounds||project.backgrounds||[];
 const roster=buildRoster(main,extras,backgrounds);
 project.mainCharacters=main;project.extraCharacters=structuredClone(extras);project.backgrounds=structuredClone(backgrounds);delete project.rosterDraft;project.roster=roster;project.rosterConfirmed=true;return roster;
}
export function rosterExtrasContext(channel,project){
 return {scriptText:project.narration||'',mainCharacters:projectMainCharacters(channel,project).map(c=>({name:c.name,role:String(c.role||'').slice(0,120),description:String(c.description||'').trim().split(/\s+/).slice(0,40).join(' ')}))};
}
export function validateRosterExtras(output,main=[]){
 if(!Array.isArray(output?.extras)||!Array.isArray(output?.backgrounds))throw Error('AI chưa trả danh sách nhân vật phụ và bối cảnh.');
 if(output.extras.some(c=>typeof c.role!=='string'))throw Error('Nhân vật phụ cần có vai trò.');
 buildRoster(main,output.extras,output.backgrounds);return output;
}
export function renderBibleBlock(c,{esc,field,btn}){
 return `<section><h3>Nhân vật chủ đạo</h3>${field('Dán bible nhân vật','channel.bibleText',c.bibleText||'','textarea')}<div class="actions">${btn('Nạp bible','load-bible')}${btn('Nạp mẫu Tích','load-tich')}${btn('Mẫu Cậu bé học sinh','load-schoolboy')}</div>${(c.bibleErrors||[]).map(e=>`<p role="alert">${esc(e)}</p>`).join('')}${(c.characters||[]).map(x=>`<article data-main-character><h4>${esc(x.name)}</h4><p>${esc(x.role)}</p><p>${esc(x.description)}</p></article>`).join('')}</section>`;
}
export function renderRosterStep(c,p,{esc,field,btn}){
 const main=projectMainCharacters(c,p),extras=p.rosterDraft?.extraCharacters||p.extraCharacters||[],backgrounds=p.rosterDraft?.backgrounds||p.backgrounds||[];
 const list=(rows,type)=>rows.map((x,i)=>`<article>${field('Tên',`project.rosterDraft.${type}.${i}.name`,x.name)}${type==='extraCharacters'?field('Vai trò',`project.rosterDraft.${type}.${i}.role`,x.role):''}${field('Mô tả tiếng Anh · tối đa 40 từ',`project.rosterDraft.${type}.${i}.description`,x.description,'textarea')}${btn('Xóa mục','roster-remove','small',`data-kind="${type}" data-index="${i}"`)}</article>`).join('');
 return `<div class="grid2"><section><h3>Nhân vật chủ đạo · bible gốc</h3>${main.length?main.map(x=>`<article data-main-character><h4>${esc(x.name)}</h4><p>${esc(x.role)}</p><p>${esc(x.description)}</p></article>`).join(''):'<p>Nạp bible hợp lệ ở tab Bản sắc của kênh trước.</p>'}</section><section><h3>Nhân vật phụ · tối đa 6</h3>${btn('Trích nhân vật và bối cảnh từ kịch bản','roster-extras')}${list(extras,'extraCharacters')}${btn('Thêm nhân vật phụ','roster-add','',`data-kind="extraCharacters" ${extras.length>=6?'disabled':''}`)}<h3>Bối cảnh · tối đa 6</h3>${list(backgrounds,'backgrounds')}${btn('Thêm bối cảnh','roster-add','',`data-kind="backgrounds" ${backgrounds.length>=6?'disabled':''}`)}</section></div><label><input type="checkbox" data-bind="project.rosterReviewed" ${p.rosterReviewed?'checked':''}> Tôi đã xem và xác nhận danh sách nhân vật, bối cảnh</label><div class="actions">${btn('Lưu & tiếp tục','roster-continue','primary',p.rosterReviewed?'':'disabled')}</div>`;
}
