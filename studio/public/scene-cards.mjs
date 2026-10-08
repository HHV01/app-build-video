import {rosterNames} from './scene-character.mjs';
import {sceneBible,BIBLE_FIELDS} from './bible-scene-tags.mjs';
import {CAMERAS} from './character-bible.mjs';
import {scenePromptRows,WARNING_MESSAGES} from './scene-prompts.mjs';
import {tagMenu,validateSceneTags,validateSceneCoverage,scenePlan} from './scene-workflow.mjs';
import {LAST_STEP} from './script-workflow.mjs';

export function updateSceneTags(project,position,tags){
 const scene=project.scenes?.[position];if(!scene)throw Error('Không tìm thấy cảnh.');
 const index=scene.index??scene.scene??scene.id??position+1;
 const [valid]=validateSceneTags([{index,tags,summary:scene.summary||''}],[{index}]);
 scene.tags=valid.tags;scene.invalidTags=false;project.done=false;project.approved=(project.approved||[]).filter(n=>n!==LAST_STEP);
}
export function sceneCompletionError(project,channel={}){
 if(project.step!==LAST_STEP)return 'Chỉ hoàn tất ở bước Cảnh và prompt.';
 try{const inspected=structuredClone(project),result=validateSceneCoverage(inspected),plan=scenePlan(inspected);
 if(scenePromptRows(channel,inspected).some(row=>row.warnings.split(', ').some(flag=>['invalidCharacters','invalidTags'].includes(flag))))return 'Có lỗi tên nhân vật ngoài roster hoặc thẻ bible. Kiểm tra cảnh đỏ trước khi hoàn tất.';
 for(const [i,scene] of (inspected.scenes||[]).entries())if(!sceneBible(channel,project)&&scene.tags?.length){const index=scene.index??scene.scene??scene.id??i+1;validateSceneTags([{index,tags:scene.tags,summary:''}],[{index}]);}
 if(!result.complete||inspected.scenes.length!==plan.count||inspected.sceneIssues?.length||inspected.scenes.some(s=>s.invalidTags||s.invalidCharacters))return inspected.coverageWarning||'Còn cảnh thiếu hoặc thẻ lỗi. Kiểm tra trước khi hoàn tất.';
 }catch(error){return error.message;}return '';
}
export function finishSceneProject(project,channel={}){
 const error=sceneCompletionError(project,channel);if(error)throw Error(error);
 validateSceneCoverage(project);
 project.done=true;project.approved||=[];if(!project.approved.includes(LAST_STEP))project.approved.push(LAST_STEP);
}
export function renderSceneCards(channel,project,{esc,btn}){
 const options=Object.entries(tagMenu).map(([group,tags])=>`<optgroup label="${esc(group)}">${tags.map(tag=>`<option value="${tag}">${tag}</option>`).join('')}</optgroup>`).join('');
 return scenePromptRows(channel,project).map((row,i)=>{
  const scene=project.scenes[i],bible=sceneBible(channel,project),tags=bible?row.tags.split(', ').filter(Boolean):Array.isArray(scene.tags)?scene.tags:[],warnings=row.warnings.split(', ').filter(Boolean);
  let selectors=Array.from({length:3},(_,slot)=>{
   const value=tags[slot]||'',id=`scene-${i}-tag-${slot}`;
   const selected=options.replace(`value="${esc(value)}"`,`value="${esc(value)}" selected`);
   return `<div class="field"><label for="${id}">Thẻ ${slot+1}${slot===0?' · bắt buộc':''}</label><select id="${id}" data-scene-tag="${i}" data-tag-slot="${slot}"><option value="" ${value?'':'selected'}>${slot===0?'Chọn thẻ':'Không thêm thẻ'}</option>${selected}</select></div>`;
  }).join('');
  if(bible)selectors=BIBLE_FIELDS.map(key=>{const list=key==='camera'?CAMERAS.map(tag=>({tag,label:tag})):bible[{expression:'expressions',pose:'poses',prop:'props',outfit:'outfits',graphics:'graphics'}[key]];const selected=Array.isArray(scene[key])?scene[key]:[scene[key]||''];return `<div class="field"><label for="bible-${i}-${key}">${key}</label><select id="bible-${i}-${key}" data-bible-tag="${i}" data-bible-field="${key}" ${key==='graphics'?'multiple':''}>${key==='graphics'?'':'<option value="">Chọn thẻ</option>'}${list.map(item=>`<option value="${esc(item.tag)}" ${selected.includes(item.tag)?'selected':''}>${esc(item.label)}</option>`).join('')}</select></div>`;}).join('');
  const characterControls=`<fieldset class="scene-characters"><legend>Nhân vật trong cảnh</legend>${rosterNames(channel,project).map(name=>`<label><input type="checkbox" data-scene-character="${i}" value="${esc(name)}" ${(scene.characters||[]).includes(name)?'checked':''} ${scene.noCharacter?'disabled':''}> ${esc(name)}</label>`).join('')}<label><input type="checkbox" data-scene-no-character="${i}" ${scene.noCharacter?'checked':''}> Cảnh không có nhân vật</label><p class="muted tiny">Không chọn tên nào thì dùng nhân vật chủ đạo. Bật công tắc để chỉ có đồ vật hoặc biểu đồ.</p></fieldset>`;
  const entry=(label,value)=>`<div class="scene-entry"><strong>${label}</strong><p class="scene-text">${esc(value||'—')}</p></div>`;
  return `<article class="panel scene-card" data-scene-card="${i}"><div class="panel-head"><h2>Cảnh ${esc(row.scene)}${scene.duration?` · ${esc(scene.duration)}s`:''}</h2><div class="actions">${btn('Copy cảnh','copy-scene-prompt','small',`data-index="${i}"`)}${btn('Tạo lại cảnh này','regenerate-scene','small',`data-index="${i}"`)}</div></div>${warnings.map(key=>`<div class="notice ${['promptLong','bibleWarnings'].includes(key)?'warning':'error'}"><strong>${esc(key)}</strong>: ${esc(WARNING_MESSAGES[key])}${key==='invalidTags'?` ${esc(row.tagErrors.join(' '))}`:''}${key==='bibleWarnings'?` ${esc(row.tagWarnings.join(' '))}`:''}${key==='invalidCharacters'?` ${esc(row.characterError)}`:''}${key==='coverageWarning'&&project.coverageWarning?` ${esc(project.coverageWarning)}`:''}</div>`).join('')}${entry('Lời kể',row.narration)}${characterControls}<div class="actions">${tags.map(tag=>`<span class="tag">${esc(tag)}</span>`).join('')}</div><div class="grid3">${selectors}</div>${entry('Mô tả hình',row.visual)}<div class="scene-entry"><strong>Prompt ảnh · image_prompt</strong><pre class="scene-prompt-preview scene-text" data-scene-preview="${i}">${esc(row.image_prompt)}</pre></div>${entry('Prompt chuyển động · animation_prompt',row.animation_prompt)}<div class="grid2">${entry('Chữ chèn · overlay',row.overlay)}${entry('SFX',row.sfx)}${entry('Nhân vật',row.characters)}${entry('Bối cảnh',row.background)}</div></article>`;
 }).join('');
}
