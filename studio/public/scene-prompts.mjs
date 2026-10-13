import {voiceAlignmentStale} from './voice-align-integration.mjs';
import {sceneClock} from './voice-timing.mjs';
import {localizePromptVi} from './prompt-locale.mjs';
import {translationIsStale} from './prompt-translation.mjs';
import {sceneBible,bibleSceneCheck,BIBLE_FIELDS} from './bible-scene-tags.mjs';
import {sceneCharacterRoster,rosterNames,characterIssue} from './scene-character.mjs';
import {composeImagePrompt} from './character-bible.mjs';
import {animationFor,validateSceneCoverage,validateSceneTags,sceneNarration} from './scene-workflow.mjs';

export const SCENE_COLUMNS=['scene','narration','image_prompt','animation_prompt','overlay','sfx','characters','background','tags','warnings','duration','start','end','prompt_vi','timing_source'];
export const WARNING_MESSAGES={voiceTimingStale:'Voice hoặc lời kể đã đổi; cần căn lại mốc cảnh.',durationExceeded:'Thời lượng cảnh vượt nhịp tối đa.',tagPromptMismatch:'Thẻ giơ bảng không có trong mô tả cảnh; đã bỏ dáng giơ bảng khi ghép prompt. Sửa thẻ hoặc mô tả để khớp.',bibleWarnings:'Lưu ý từ bible:',invalidCharacters:'Tên nhân vật ngoài roster; prompt ảnh bị khóa để tránh mất nhân vật.',invalidTags:'Thẻ ngoài menu hoặc thẻ chưa hợp lệ.',duplicateNarration:'Lời kể trùng với cảnh trước.',promptLong:'Prompt riêng dài hơn 80 từ.',coverageWarning:'Lời kể chưa phủ đủ hoặc sai thứ tự kịch bản.',emptyNarration:'Lời kể cảnh rỗng.',indexWarning:'Index cảnh không liên tục.'};

// Presentation only: the sole composer is the supplied character-bible function.
export function scenePromptRows(channel,project) {
 const inspected=structuredClone(project);
 if(inspected.script||inspected.narration)validateSceneCoverage(inspected);
 const {main}=sceneCharacterRoster(channel,project);
 const bible=main[0]?.bible||channel.characterBible||channel.character||{};
 const base={identity:channel.characterDescription||'',expressions:[],poses:[],outfits:[],props:[],graphics:[],...bible};
 const characters=[...main,...(project.extraCharacters||[])],backgrounds=project.backgrounds||[];
 const lookup=(rows,name)=>rows.find(c=>[c.name,c.id].some(v=>v&&String(v).normalize('NFC').toLowerCase()===String(name).normalize('NFC').toLowerCase()));
 let elapsed=0;let wordCursor=0;const sfxValid=project.scriptSfxBasis===String(sceneNarration(project)).trim().split(/\s+/).filter(Boolean).join(' ');
 return (project.scenes||[]).map((scene,index)=>{
  const aligned=project.sceneTimingMode==='voice-aligned',startSeconds=aligned&&Number.isFinite(scene.start)?scene.start:elapsed,duration=Number(scene.duration)||Number(project.clipSeconds)||8;elapsed=aligned&&Number.isFinite(scene.end)?scene.end:startSeconds+duration;
  const end=wordCursor+String(scene.narration||'').trim().split(/\s+/).filter(Boolean).length;const fixedSfx=sfxValid?(project.scriptSfx||[]).filter(item=>item.word>=wordCursor&&item.word<end).map(item=>item.text):[];wordCursor=end;const sfx=[...new Set([scene.sfx||'',...fixedSfx].filter(Boolean))].join(' | ');
  const hasRoster=Boolean(project.roster||channel.characters||project.mainCharacters);
  const supplied=Array.isArray(scene.characters)?scene.characters:[];
  const present=supplied.length?supplied:main.map(row=>row.name);
  const issue=Array.isArray(scene.characters)?characterIssue(scene,rosterNames(channel,project)):'';
  const rosterDescription=row=>row&&(Object.hasOwn(project.roster||{},row.name)?project.roster[row.name]:row.description);
  const descriptions=[...new Set(present.map(name=>rosterDescription(lookup(characters,name))).filter(Boolean))];
  const character={...base,identity:hasRoster||Array.isArray(scene.characters)?descriptions.join(' '):base.identity};
  const background=rosterDescription(lookup(backgrounds,scene.background));
  const translated=channel.promptLanguage==='en'&&scene.promptEn?.trim(),specific=translated?scene.promptEn:scene.prompt;const translationWarning=channel.promptLanguage==='en'?(!translated?'Chưa dịch cảnh '+(scene.index??scene.scene??scene.id??index+1):translationIsStale(scene)?'Bản dịch cảnh '+(scene.index??scene.scene??scene.id??index+1)+' đã cũ, hãy dịch lại':''):'';
  const setting=[specific||scene.setting||scene.background||'',background||''].filter(Boolean).join(' ');
  const noCharacter=scene.noCharacter===true||(!main.length&&!character.identity);
  const number=scene.index??scene.scene??scene.id??index+1;
  const signSupported=/(?:bảng trắng|giơ bảng|cầm bảng|biển trắng|blank[ -](?:white[ -])?(?:sign|board)|hold(?:ing)?[^.]{0,25}(?:sign|placard))/iu.test([scene.visual,scene.prompt].filter(Boolean).join(' '));const tagPromptMismatch=scene.pose==='blank-sign'&&!signSupported;
  let prompt=issue?'':composeImagePrompt({...scene,...(tagPromptMismatch?{pose:''}:{}),
   noCharacter,
   subject:noCharacter?(specific||scene.subject||''):'',setting:noCharacter?(background||(specific?'':scene.setting||scene.background||'')):setting,overlay:'',
  },character,channel.visualStyle||'');
  if(channel.promptLanguage==='vi')prompt=localizePromptVi(prompt,base);
  const checked=inspected.scenes[index];checked.tagPromptMismatch=tagPromptMismatch;checked.voiceTimingStale=voiceAlignmentStale(project);checked.durationExceeded=duration>(Number(project.clipSeconds)||8)+.5+1e-8;if(issue)checked.invalidCharacters=true;
  const bible=sceneBible(channel,project);if(bible){const validation=bibleSceneCheck(scene,bible,project.scenes.slice(0,index));checked.invalidTags=checked.invalidTags||validation.errors.length>0;checked.tagWarnings=validation.warnings;checked.bibleWarnings=validation.warnings.length>0;checked.tagErrors=validation.errors;}
  if(!bible&&Array.isArray(scene.tags)&&scene.tags.length){try{validateSceneTags([{index:number,tags:scene.tags,summary:''}],[{index:number}]);}catch{checked.invalidTags=true;}}
  const warnings=Object.keys(WARNING_MESSAGES).filter(key=>key==='coverageWarning'?Boolean(inspected.coverageWarning):Boolean(checked[key]));
  if(channel.promptLanguage==='en'&&translationIsStale(scene))warnings.push('staleTranslation');
  const check_vi=sceneCheckVi(channel,project,tagPromptMismatch?{...scene,pose:''}:scene);
  return {timing_source:aligned?(scene.timing_source||'words'):'words',duration,start:(aligned&&scene.timingStartEstimated?'~':'')+sceneClock(startSeconds,aligned?3:0),end:(aligned&&scene.timingEndEstimated?'~':'')+sceneClock(elapsed,aligned?3:0),durationWarning:checked.durationExceeded?'Cảnh '+number+' dài '+duration.toFixed(1).replace('.',',')+' s, vượt nhịp '+(Number(project.clipSeconds)||8)+' s':'',translationWarning,check_vi,prompt_vi:[scene.prompt||'',check_vi].filter(Boolean).join('\n'),scene:number,narration:scene.narration||'',image_prompt:prompt,animation_prompt:animationFor(project,number),overlay:translated?(scene.overlayEn||scene.overlay||''):scene.overlay||'',sfx,characters:scene.noCharacter===true?supplied.join(', '):present.join(', '),background:scene.background||'',tags:bible?BIBLE_FIELDS.flatMap(key=>Array.isArray(scene[key])?scene[key].map(tag=>`${key}:${tag}`):scene[key]?[`${key}:${scene[key]}`]:[]).join(', '):Array.isArray(scene.tags)?scene.tags.join(', '):'',warnings:warnings.join(', '),visual:scene.visual||'',characterError:issue||scene.characterError||'',tagErrors:checked.tagErrors||[],tagWarnings:checked.tagWarnings||[],prompt};
 });
}
export function sceneText(row,format='txt'){
 const fields=['narration','visual',...SCENE_COLUMNS.slice(2)].map(key=>`${key}: ${row[key]||''}`).join('\n\n');
 return `${format==='markdown'?'## ':''}Scene ${row.scene}\n\n${fields}`;
}
export function scenePromptsText(channel,project,format='txt') {
 const rows=scenePromptRows(channel,project);
 if(format==='csv'){const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';return SCENE_COLUMNS.join(',')+'\n'+rows.map(row=>SCENE_COLUMNS.map(key=>quote(row[key])).join(',')).join('\n');}
 return rows.map(row=>sceneText(row,format)).join('\n\n');
}

export function sceneCheckVi(channel,project,scene){
 const bible=sceneBible(channel,project),{main}=sceneCharacterRoster(channel,project),names=scene.noCharacter===true?['Không có nhân vật']:(scene.characters?.length?scene.characters:main.map(x=>x.name));
 const parts=[names.join(', ')||'Không có nhân vật'];
 const groups={expression:['expressions','biểu cảm'],pose:['poses','dáng'],prop:['props','đạo cụ'],outfit:['outfits','trang phục'],graphics:['graphics','đồ họa']};
 if(!scene.noCharacter)for(const [key,[list,label]] of Object.entries(groups)){if(key==='outfit'&&(!scene[key]||scene[key]==='default'))continue;const tags=Array.isArray(scene[key])?scene[key]:scene[key]?[scene[key]]:[];if(tags.length)parts.push(label+': '+tags.map(tag=>bible?.[list]?.find(x=>x.tag===tag)?.vi||tag).join(', '));}
 const camera={wide:'toàn cảnh',medium:'trung cảnh','close-up':'cận cảnh','over-shoulder':'qua vai','low-angle':'góc thấp','high-angle':'góc cao','eye-level':'ngang mắt'};if(scene.camera)parts.push('góc máy: '+(camera[scene.camera]||scene.camera));else if(scene.tags?.length)parts.push('thẻ: '+scene.tags.map(x=>camera[x]||x).join(', '));return parts.filter(Boolean).join(' · ');
}
