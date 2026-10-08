export function sceneCharacterRoster(channel={},project={}){
 const main=project.rosterConfirmed?project.mainCharacters||[]:channel.characters||project.mainCharacters||[];
 return {main,characters:[...main,...(project.extraCharacters||[])]};
}
export function rosterNames(channel,project){return [...new Set(sceneCharacterRoster(channel,project).characters.map(row=>row.name).filter(name=>typeof name==='string'&&name.trim()))];}
export function characterIssue(scene,names){
 if(!Array.isArray(scene.characters)||scene.characters.some(name=>typeof name!=='string'))return 'Danh sách nhân vật không hợp lệ.';
 const unknown=scene.characters.filter(name=>!names.includes(name));
 return unknown.length?`Tên nhân vật ngoài roster: ${unknown.join(', ')}. Không tự đoán nhân vật thay thế.`:'';
}

export function updateSceneCharacters(channel,project,position,{characters,noCharacter=false}){
 const scene=project.scenes?.[position];if(!scene)throw Error('Không tìm thấy cảnh.');
 const candidate={characters,noCharacter:noCharacter===true},issue=characterIssue(candidate,rosterNames(channel,project));
 if(issue)throw Error(issue);
 scene.characters=[...new Set(characters)];scene.noCharacter=candidate.noCharacter;
 delete scene.invalidCharacters;delete scene.characterError;
 project.done=false;project.approved=(project.approved||[]).filter(n=>n!==5);
}
