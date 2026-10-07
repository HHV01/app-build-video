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
