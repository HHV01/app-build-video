import {sceneCharacterRoster,rosterNames,characterIssue} from './scene-character.mjs';
import {composeImagePrompt} from './character-bible.mjs';
import {animationFor,validateSceneCoverage,validateSceneTags} from './scene-workflow.mjs';

export const SCENE_COLUMNS=['scene','narration','image_prompt','animation_prompt','overlay','sfx','characters','background','tags','warnings'];
export const WARNING_MESSAGES={invalidCharacters:'Tên nhân vật ngoài roster; prompt ảnh bị khóa để tránh mất nhân vật.',invalidTags:'Thẻ ngoài menu hoặc thẻ chưa hợp lệ.',duplicateNarration:'Lời kể trùng với cảnh trước.',promptLong:'Prompt riêng dài hơn 80 từ.',coverageWarning:'Lời kể chưa phủ đủ hoặc sai thứ tự kịch bản.',emptyNarration:'Lời kể cảnh rỗng.',indexWarning:'Index cảnh không liên tục.'};

// Presentation only: the sole composer is the supplied character-bible function.
export function scenePromptRows(channel,project) {
 const inspected=structuredClone(project);
 if(inspected.script||inspected.narration)validateSceneCoverage(inspected);
 const {main}=sceneCharacterRoster(channel,project);
 const bible=main[0]?.bible||channel.characterBible||channel.character||{};
 const base={identity:channel.characterDescription||'',expressions:[],poses:[],outfits:[],props:[],graphics:[],...bible};
 const characters=[...main,...(project.extraCharacters||[])],backgrounds=project.backgrounds||[];
 const lookup=(rows,name)=>rows.find(c=>[c.name,c.id].some(v=>v&&String(v).normalize('NFC').toLowerCase()===String(name).normalize('NFC').toLowerCase()));
 return (project.scenes||[]).map((scene,index)=>{
  const hasRoster=Boolean(project.roster||channel.characters||project.mainCharacters);
  const supplied=Array.isArray(scene.characters)?scene.characters:[];
  const present=supplied.length?supplied:main.map(row=>row.name);
  const issue=Array.isArray(scene.characters)?characterIssue(scene,rosterNames(channel,project)):'';
  const rosterDescription=row=>row&&(Object.hasOwn(project.roster||{},row.name)?project.roster[row.name]:row.description);
  const descriptions=[...new Set(present.map(name=>rosterDescription(lookup(characters,name))).filter(Boolean))];
  const character={...base,identity:hasRoster||Array.isArray(scene.characters)?descriptions.join(' '):base.identity};
  const background=rosterDescription(lookup(backgrounds,scene.background));
  const setting=[scene.prompt||scene.setting||scene.background||'',background||''].filter(Boolean).join(' ');
  const noCharacter=scene.noCharacter===true||(!main.length&&!character.identity);
  const number=scene.index??scene.scene??scene.id??index+1;
  const prompt=issue?'':composeImagePrompt({...scene,
   noCharacter,
   subject:noCharacter?(scene.prompt||scene.subject||''):'',setting:noCharacter?(background||(scene.prompt?'':scene.setting||scene.background||'')):setting,overlay:'',
  },character,channel.visualStyle||'');
  const checked=inspected.scenes[index];if(issue)checked.invalidCharacters=true;
  if(Array.isArray(scene.tags)&&scene.tags.length){try{validateSceneTags([{index:number,tags:scene.tags,summary:''}],[{index:number}]);}catch{checked.invalidTags=true;}}
  const warnings=Object.keys(WARNING_MESSAGES).filter(key=>key==='coverageWarning'?Boolean(inspected.coverageWarning):Boolean(checked[key]));
  return {scene:number,narration:scene.narration||'',image_prompt:prompt,animation_prompt:animationFor(project,number),overlay:scene.overlay||'',sfx:scene.sfx||'',characters:scene.noCharacter===true?supplied.join(', '):present.join(', '),background:scene.background||'',tags:Array.isArray(scene.tags)?scene.tags.join(', '):'',warnings:warnings.join(', '),visual:scene.visual||'',characterError:issue||scene.characterError||'',prompt};
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
