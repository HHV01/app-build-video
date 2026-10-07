import {composeImagePrompt} from './character-bible.mjs';

// Presentation only: the sole composer is the supplied character-bible function.
export function scenePromptRows(channel,project) {
 const main=project.rosterConfirmed?project.mainCharacters||[]:channel.characters||project.mainCharacters||[];
 const bible=main[0]?.bible||channel.characterBible||channel.character||{};
 const base={identity:channel.characterDescription||'',expressions:[],poses:[],outfits:[],props:[],graphics:[],...bible};
 const characters=[...main,...(project.extraCharacters||[])],backgrounds=project.backgrounds||[];
 const lookup=(rows,name)=>rows.find(c=>[c.name,c.id].some(v=>v&&String(v).normalize('NFC').toLowerCase()===String(name).normalize('NFC').toLowerCase()));
 return (project.scenes||[]).map((scene,index)=>{
  const hasRoster=Boolean(project.roster||channel.characters||project.mainCharacters);
  const present=Array.isArray(scene.characters)?scene.characters:[];
  const rosterDescription=row=>row&&(Object.hasOwn(project.roster||{},row.name)?project.roster[row.name]:row.description);
  const descriptions=[...new Set(present.map(name=>rosterDescription(lookup(characters,name))).filter(Boolean))];
  const character={...base,identity:hasRoster||Array.isArray(scene.characters)?descriptions.join(' '):base.identity};
  const background=rosterDescription(lookup(backgrounds,scene.background));
  const setting=[scene.prompt||scene.setting||scene.background||'',background||''].filter(Boolean).join(' ');
  const noCharacter=scene.noCharacter??(!character.identity||(channel.type==='faceless'&&!hasRoster));
  return {
  scene:scene.scene??scene.id??index+1,
  prompt:composeImagePrompt({...scene,
   noCharacter,
   subject:noCharacter?(scene.prompt||scene.subject||''):'',setting:noCharacter?(background||(scene.prompt?'':scene.setting||scene.background||'')):setting,overlay:'',
  },character,channel.visualStyle||''),
 };});
}
export function scenePromptsText(channel,project,format='txt') {
 const rows=scenePromptRows(channel,project);
 if(format==='markdown')return rows.map(row=>`## Scene ${row.scene}\n\n${row.prompt}`).join('\n\n');
 if(format==='csv'){const quote=s=>'"'+String(s).replaceAll('"','""')+'"';return 'scene,prompt\n'+rows.map(row=>`${quote(row.scene)},${quote(row.prompt)}`).join('\n');}
 return rows.map(row=>`Scene ${row.scene}\n${row.prompt}`).join('\n\n');
}
