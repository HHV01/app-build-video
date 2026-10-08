import {scenePromptRows,WARNING_MESSAGES} from './scene-prompts.mjs';
import {tagMenu,validateSceneTags,validateSceneCoverage,scenePlan} from './scene-workflow.mjs';
import {LAST_STEP} from './script-workflow.mjs';

export function updateSceneTags(project,position,tags){
 const scene=project.scenes?.[position];if(!scene)throw Error('Không tìm thấy cảnh.');
 const index=scene.index??scene.scene??scene.id??position+1;
 const [valid]=validateSceneTags([{index,tags,summary:scene.summary||''}],[{index}]);
 scene.tags=valid.tags;scene.invalidTags=false;project.done=false;project.approved=(project.approved||[]).filter(n=>n!==LAST_STEP);
}
export function sceneCompletionError(project){
 if(project.step!==LAST_STEP)return 'Chỉ hoàn tất ở bước Cảnh và prompt.';
 try{const inspected=structuredClone(project),result=validateSceneCoverage(inspected),plan=scenePlan(inspected);
 for(const [i,scene] of (inspected.scenes||[]).entries())if(scene.tags?.length){const index=scene.index??scene.scene??scene.id??i+1;validateSceneTags([{index,tags:scene.tags,summary:''}],[{index}]);}
 if(!result.complete||inspected.scenes.length!==plan.count||inspected.sceneIssues?.length||inspected.scenes.some(s=>s.invalidTags))return inspected.coverageWarning||'Còn cảnh thiếu hoặc thẻ lỗi. Kiểm tra trước khi hoàn tất.';
 }catch(error){return error.message;}return '';
}
export function finishSceneProject(project){
 const error=sceneCompletionError(project);if(error)throw Error(error);
 validateSceneCoverage(project);
 project.done=true;project.approved||=[];if(!project.approved.includes(LAST_STEP))project.approved.push(LAST_STEP);
}
export function renderSceneCards(channel,project,{esc,btn}){
 const options=Object.entries(tagMenu).map(([group,tags])=>`<optgroup label="${esc(group)}">${tags.map(tag=>`<option value="${tag}">${tag}</option>`).join('')}</optgroup>`).join('');
 return scenePromptRows(channel,project).map((row,i)=>{
  const scene=project.scenes[i],tags=Array.isArray(scene.tags)?scene.tags:[],warnings=row.warnings.split(', ').filter(Boolean);
  const selectors=Array.from({length:3},(_,slot)=>{
   const value=tags[slot]||'',id=`scene-${i}-tag-${slot}`;
   const selected=options.replace(`value="${esc(value)}"`,`value="${esc(value)}" selected`);
   return `<div class="field"><label for="${id}">Thẻ ${slot+1}${slot===0?' · bắt buộc':''}</label><select id="${id}" data-scene-tag="${i}" data-tag-slot="${slot}"><option value="" ${value?'':'selected'}>${slot===0?'Chọn thẻ':'Không thêm thẻ'}</option>${selected}</select></div>`;
  }).join('');
  const entry=(label,value)=>`<div class="scene-entry"><strong>${label}</strong><p class="scene-text">${esc(value||'—')}</p></div>`;
  return `<article class="panel scene-card" data-scene-card="${i}"><div class="panel-head"><h2>Cảnh ${esc(row.scene)}${scene.duration?` · ${esc(scene.duration)}s`:''}</h2>${btn('Copy cảnh','copy-scene-prompt','small',`data-index="${i}"`)}</div>${warnings.map(key=>`<div class="notice ${key==='promptLong'?'warning':'error'}"><strong>${esc(key)}</strong>: ${esc(WARNING_MESSAGES[key])}${key==='coverageWarning'&&project.coverageWarning?` ${esc(project.coverageWarning)}`:''}</div>`).join('')}${entry('Lời kể',row.narration)}<div class="actions">${tags.map(tag=>`<span class="tag">${esc(tag)}</span>`).join('')}</div><div class="grid3">${selectors}</div>${entry('Mô tả hình',row.visual)}<div class="scene-entry"><strong>Prompt ảnh · image_prompt</strong><pre class="scene-prompt-preview scene-text" data-scene-preview="${i}">${esc(row.image_prompt)}</pre></div>${entry('Prompt chuyển động · animation_prompt',row.animation_prompt)}<div class="grid2">${entry('Chữ chèn · overlay',row.overlay)}${entry('SFX',row.sfx)}${entry('Nhân vật',row.characters)}${entry('Bối cảnh',row.background)}</div></article>`;
 }).join('');
}
