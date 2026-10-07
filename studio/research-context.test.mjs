import test from 'node:test';
import assert from 'node:assert/strict';
import { researchContext } from './public/research-context.mjs';
import { readFile } from 'node:fs/promises';

test('F1 supported evidence retained, uncertain evidence explicitly marked',()=>{
 const p={researchSummary:'summary',researchFacts:[{claim:'verified',status:'supported',sourceId:'s1'},{claim:'uncertain',status:'needs_check'},{claim:'rejected',status:'rejected'}],claims:[{claim:'claim',status:'supported'},{claim:'maybe',status:'needs_check'}],researchTimeline:[{event:'event'}],researchCast:[{name:'person'}],researchSensory:'sensory'};
 const ctx=researchContext(p);assert.equal(ctx.researchSummary,'summary');assert.equal(ctx.researchFacts.length,2);assert.equal(ctx.researchFacts[1].assertable,false);assert.match(ctx.researchFacts[1].warning,/khẳng định/);assert.equal(ctx.claims[0].claim,'claim');assert.equal(ctx.researchTimeline[0].event,'event');assert.equal(ctx.researchCast[0].name,'person');
});
test('F1 outline/script context includes research and directives prohibit uncertain assertions',async()=>{
 const app=await readFile('studio/public/app.js','utf8'),server=await readFile('studio/server.mjs','utf8');assert.match(app,/\.\.\.researchContext\(p\)/);assert.match(server,/needs_check.*không được khẳng định/);
});

test('F2 seven script calls omit raw sources and shrink measured contexts',async()=>{
 const {scriptPartContext}=await import('./public/research-context.mjs');const p={topic:'Egypt',minutes:7,sources:[{text:'x'.repeat(20000)}],packaging:[{title:'Egypt',thumbnailVisual:'x'.repeat(800)}],outline:Array.from({length:7},(_,i)=>({title:'part '+i})),researchSummary:'Egypt summary',researchFacts:[{claim:'Egypt fact',status:'supported'}]};const c={language:'vi',identity:{voice:'voice',hook:'hook'},characterDescription:'x'.repeat(1000)};const old={...p,packaging:p.packaging[0],characterDescription:c.characterDescription};const seen=[];const mockAI=async context=>{seen.push(JSON.stringify(context));return {narration:'A brief written part.'};};const parts=[];
 for(let i=0;i<7;i++){const ctx=scriptPartContext(c,p,{focus:p.outline[i],targetWords:150},i,7,parts);assert.equal(ctx.sources,undefined);assert.equal(ctx.packaging,undefined);assert.equal(ctx.characterDescription,undefined);assert.equal(ctx.selectedTitle,'Egypt');await mockAI(ctx);parts.push('A brief written part.');}const before=7*JSON.stringify(old).length,after=seen.reduce((n,s)=>n+s.length,0);assert(after<before);console.log('F2 context characters before='+before+' after='+after);assert.match(seen.at(-1),/previousSummaries/);
});

test('F3 retired AI template discovery and media quota removed from runtime',async()=>{for(const path of ['studio/public/app.js','studio/server.mjs','studio/rx.mjs']){const text=await readFile(path,'utf8');for(const marker of ['detect'+'-templates','upload'+'Daily','stt'+'Model','Groq viết phần'])assert(!text.includes(marker),path+': '+marker);}const app=await readFile('studio/public/app.js','utf8');const context=app.match(/function projectContext[^\n]+/)[0];assert(!context.includes('character'+'Description'));assert.match(app,/function videoTable/);assert.match(app,/function hookTable/);});
