import {composeImagePrompt} from './character-bible.mjs';

// Presentation only: the sole composer is the supplied character-bible function.
export function scenePromptRows(channel,project) {
 const bible=channel.characterBible||channel.character||{};
 const character={identity:channel.characterDescription||'',expressions:[],poses:[],outfits:[],props:[],graphics:[],...bible};
 return (project.scenes||[]).map((scene,index)=>{
  const noCharacter=scene.noCharacter??(!character.identity||channel.type==='faceless');
  return {
  scene:scene.scene??scene.id??index+1,
  prompt:composeImagePrompt({...scene,
   noCharacter,
   subject:noCharacter?(scene.prompt||scene.subject||''):'',setting:noCharacter?(scene.prompt?'':scene.setting||scene.background||''):(scene.prompt||scene.setting||scene.background||''),overlay:'',
  },character,channel.visualStyle||''),
 };});
}
export function scenePromptsText(channel,project) {
 return scenePromptRows(channel,project).map(row=>`Scene ${row.scene}\n${row.prompt}`).join('\n\n');
}
