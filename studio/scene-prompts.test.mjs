import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderSceneCards} from './public/scene-cards.mjs';
import {scenePromptRows,scenePromptsText,sceneText} from './public/scene-prompts.mjs';
const character=JSON.parse(await readFile('studio/public/schoolboy.preset.json','utf8'));
test('K2 changing style updates presentation copy and export without AI or state mutation',async()=>{
 const c={characterBible:character,visualStyle:''},p={scenes:[{scene:7,narration:'He counts the coins.',prompt:'A boy counts coins at a desk.',expression:'thinking',pose:'laptop'}]};
 const original=JSON.stringify(p);
 const before=scenePromptRows(c,p)[0].prompt;
 assert(before.includes(character.identity));assert(!before.includes(character.style));
 c.visualStyle='Ink drawing on beige paper.';
 const after=scenePromptRows(c,p)[0].prompt;
 assert.notEqual(before,after);assert(after.startsWith(c.visualStyle));assert(after.includes(character.identity));assert(after.includes(p.scenes[0].prompt));
 assert(scenePromptsText(c,p).includes(after));assert(scenePromptsText(c,p).includes('He counts the coins.'));
 assert.equal(JSON.stringify(p),original);
 const app=await readFile('studio/public/app.js','utf8'),line=app.split('\n').find(s=>s.startsWith('function scenePromptPanel('));
 const render=new Function('scenePromptRows','panel','esc','btn','field','renderSceneCards',line+';return scenePromptPanel;')(scenePromptRows,(_title,body)=>body,s=>String(s),label=>label,()=>'',renderSceneCards );
 assert(render(c,p).includes(after));
 c.visualStyle='Flat blue ink.';assert(render(c,p).includes('Flat blue ink.'));assert(!render(c,p).includes('Ink drawing on beige paper.'));
 assert.equal(JSON.stringify(p),original);
});
test('K2 character-free scenes omit identity and editor overlay stays out of image prompt',()=>{
 const c={characterBible:character,visualStyle:'Minimal drawing.'};
 const rows=scenePromptRows(c,{scenes:[{noCharacter:true,prompt:'A grain storehouse.',overlay:'Taxation'}]});
 assert(rows[0].prompt.includes('A grain storehouse.'));assert(!rows[0].prompt.includes(character.identity));assert(!rows[0].prompt.includes('Taxation'));
});

test('K2 real input/copy/export handlers use current style and never call AI',async()=>{
 const appSource=await readFile('studio/public/app.js','utf8');
 const c={visualStyle:'First style.',characterBible:character},p={scenes:[{scene:2,prompt:'A boy counts coins.'}]};
 const original=JSON.stringify(p);let callback,aiCalls=0,saves=0;
 const preview={dataset:{scenePreview:'0'},textContent:''};
 const inputLine=appSource.split('\n').find(line=>line.startsWith("app.addEventListener('input',e=>{syncInputBinding"));
 const bindLine=appSource.split('\n').find(line=>line.startsWith('function syncInputBinding('));
 const sync=new Function('boundObject',bindLine+';return syncInputBinding;')(()=>({object:c,keys:['visualStyle']}));
 new Function('app','syncInputBinding','currentChannel','currentProject','scenePromptRows','generate','save',inputLine)({addEventListener(_event,fn){callback=fn;},querySelectorAll(){return [preview];}},sync,()=>c,()=>p,scenePromptRows,()=>{aiCalls++;throw Error('No AI allowed');},async()=>{saves++;});
 callback({target:{dataset:{bind:'channel.visualStyle'},type:'textarea',value:'Second style.'}});
 const expected=scenePromptRows(c,p)[0].prompt;
 assert.equal(preview.textContent,expected);assert(expected.includes(character.identity));assert(expected.startsWith('Second style.'));
 let copied,downloaded;
 for(const action of ['copy-scene-prompt','copy-scene-prompts','export-scene-prompts']){
  const line=appSource.split('\n').find(line=>line.startsWith(`case '${action}':`));
  const handler=new Function('c','p','el','scenePromptRows','scenePromptsText','copy','download','generate','sceneText',`return (async()=>{switch('${action}'){${line}}}) ();`);
  await handler(c,p,{dataset:{index:'0'}},scenePromptRows,scenePromptsText,text=>{copied=text;},(name,text)=>{downloaded={name,text};},()=>{aiCalls++;throw Error('No AI allowed');},sceneText);
  if(action==='copy-scene-prompt')assert.equal(copied,sceneText(scenePromptRows(c,p)[0]));
  if(action==='copy-scene-prompts')assert.equal(copied,scenePromptsText(c,p));
 }
 assert.deepEqual(downloaded,{name:'scene-prompts.txt',text:scenePromptsText(c,p)});
 assert.equal(aiCalls,0);assert.equal(saves,1);assert.equal(JSON.stringify(p),original);
});

