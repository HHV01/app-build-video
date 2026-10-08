import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadChannelBible,loadSchoolboySample,projectMainCharacters,buildRoster,initializeProjectRoster,confirmProjectRoster,rosterExtrasContext,renderBibleBlock,renderRosterStep} from './public/roster.mjs';
import {scenePromptRows,scenePromptsText} from './public/scene-prompts.mjs';
const preset=JSON.parse(await readFile('studio/public/schoolboy.preset.json','utf8'));
const bible=await readFile('studio/public/schoolboy-bible.txt','utf8');
const ui={esc:s=>String(s??''),field:(label,binding,value)=>`<textarea data-bind="${binding}">${value??''}</textarea>`,btn:(label,action)=>`<button data-action="${action}">${label}</button>`};
test('K3 sample loads one complete primary character and invalid bible preserves previous characters',async()=>{
 const c={};await loadSchoolboySample(c,async url=>({ok:true,json:async()=>preset,text:async()=>bible}));
 assert.equal(c.characters.length,1);assert.equal(c.characters[0].name,preset.name);assert.equal(c.characters[0].description,preset.identity);
 assert(renderBibleBlock(c,ui).includes(preset.identity));
 const before=structuredClone(c.characters);
 const result=loadChannelBible(c,bible.replace(/## 2\.[\s\S]*?## 3\./,'## 3.'));
 assert(result.errors.length);assert.deepEqual(c.characters,before);assert(renderBibleBlock(c,ui).includes('IDENTITY'));
});
test('K3 new project displays channel characters and requires review before snapshotting roster',()=>{
 const c={};loadChannelBible(c,bible);const p={narration:'A boy visits a storehouse.',extraCharacters:[{name:'Keeper',role:'Storekeeper',description:'An older keeper holding a ledger.'}],backgrounds:[{name:'Storehouse',description:'A clay warehouse with grain baskets.'}]};
 assert.equal(projectMainCharacters(c,p)[0].description,preset.identity);
 assert(renderRosterStep(c,p,ui).includes(preset.identity));
 assert.throws(()=>confirmProjectRoster(c,p),/xác nhận/);
 p.rosterReviewed=true;confirmProjectRoster(c,p);
 assert.equal(p.mainCharacters.length,1);assert.equal(p.roster.Keeper,'An older keeper holding a ledger.');assert.equal(p.roster.Storehouse,'A clay warehouse with grain baskets.');
 c.characters[0].description='Changed later';assert.equal(p.mainCharacters[0].description,preset.identity);
 assert.throws(()=>buildRoster([],[...Array(7)].map((_,i)=>({name:'X'+i,description:'X'})),[]),/6/);
 assert.throws(()=>buildRoster([],[{name:'X',description:Array(41).fill('word').join(' ')}],[]),/40/);
});
test('K3 composition inserts only present roster characters and backgrounds, keeps base prompt',()=>{
 const c={visualStyle:'Ink drawings.',characters:[{name:'A',description:'A unique lead identity.',bible:{identity:'A unique lead identity.'}}]},p={mainCharacters:[{name:'A',description:'A unique lead identity.'}],extraCharacters:[{name:'B',description:'A distinct secondary identity.'}],backgrounds:[{name:'Room',description:'A room with grain baskets.'}],scenes:[{prompt:'A person lifts a basket.',characters:['A'],background:'Room'},{prompt:'Empty courtyard.',characters:[],noCharacter:true,background:''},{prompt:'The keeper waits.',characters:['B'],background:''}]};
 p.roster=buildRoster(p.mainCharacters,p.extraCharacters,p.backgrounds);const original=JSON.stringify(p.scenes);
 const rows=scenePromptRows(c,p);assert(rows[0].prompt.includes('A unique lead identity.'));assert(!rows[0].prompt.includes('A distinct secondary identity.'));assert(rows[0].prompt.includes('A room with grain baskets.'));
 assert(!rows[1].prompt.includes('A unique lead identity.'));assert(!rows[1].prompt.includes('A room with grain baskets.'));assert(rows[2].prompt.includes('A distinct secondary identity.'));assert(!rows[2].prompt.includes('A unique lead identity.'));
 c.visualStyle='Blue ink.';scenePromptRows(c,p);assert.equal(JSON.stringify(p.scenes),original);
});
test('K3 extraction context is script plus short main character records only',()=>{
 const c={characters:[{id:'a',name:'A',role:'Lead',description:Array(80).fill('word').join(' ')}],visualStyle:'SECRET'},p={narration:'Script text.',research:'SECRET',sources:['SECRET'],packaging:['SECRET']};
 const ctx=rosterExtrasContext(c,p);assert.deepEqual(Object.keys(ctx).sort(),['mainCharacters','scriptText']);assert.equal(ctx.scriptText,p.narration);assert(ctx.mainCharacters[0].description.split(/\s+/).length<=40);assert(!JSON.stringify(ctx).includes('SECRET'));
});

test('K3 actual new-project and step gate handlers initialize mains and block unreviewed scenes',async()=>{
 const app=await readFile('studio/public/app.js','utf8'),c={id:'channel'};loadChannelBible(c,bible);let state={projects:[]};
 const line=app.split('\n').find(x=>x.startsWith('function newProject('));
 const create=new Function('state','uid','initializeProjectRoster','activity','save','go',line+';return newProject;')(state,()=> 'project',initializeProjectRoster,()=>{},async()=>{},()=>{});
 create(c,{title:'Script'});const p=state.projects[0];assert.equal(p.mainCharacters[0].description,preset.identity);assert(renderRosterStep(c,p,ui).includes(preset.identity));
 const gateLine=app.split('\n').find(x=>x.startsWith('function gate('));const gate=new Function('LAST_STEP',gateLine+';return gate;')(5);
 assert(gate(p,c,4));p.narration='Script';assert.equal(gate(p,c,4),'');assert(gate(p,c,5));
 p.rosterReviewed=true;confirmProjectRoster(c,p);assert.equal(gate(p,c,5),'');
 const row=app.split('\n').find(x=>x.startsWith("case 'roster-continue':"));
 const run=new Function('p','c','confirmProjectRoster','save','render',`return(async()=>{${row.slice(row.indexOf(':')+1).replace(/break;\s*$/,'')}})();`);
 await run(p,c,confirmProjectRoster,async()=>{},()=>{});assert.equal(p.step,5);assert(p.approved.includes(4));
});
test('K3 all export formats contain composed roster without changing scene state',()=>{
 const c={visualStyle:'Ink.'},p={mainCharacters:[{name:'A',description:'Exact identity A.'}],extraCharacters:[],backgrounds:[],scenes:[{scene:1,prompt:'A person waits.',characters:['A']}]};p.roster=buildRoster(p.mainCharacters,[],[]);const original=JSON.stringify(p);
 for(const format of ['txt','markdown','csv']){const text=scenePromptsText(c,p,format);assert(text.includes('Exact identity A.'));assert(text.includes('A person waits.'));}
 assert.equal(JSON.stringify(p),original);
});

test('K3 extraction drafts do not replace confirmed extras until review succeeds',()=>{
 const c={};loadChannelBible(c,bible);const p={extraCharacters:[{name:'Old',role:'Other',description:'Old approved description.'}],backgrounds:[],rosterDraft:{extraCharacters:[{name:'New',role:'Keeper',description:'A keeper with a ledger.'}],backgrounds:[]}};
 assert.throws(()=>confirmProjectRoster(c,p),/xác nhận/);assert.equal(p.extraCharacters[0].name,'Old');
 p.rosterReviewed=true;confirmProjectRoster(c,p);assert.equal(p.extraCharacters[0].name,'New');assert.equal(p.rosterDraft,undefined);
});
