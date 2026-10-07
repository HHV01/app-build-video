import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeScriptProjects} from './public/script-workflow.mjs';
test('E1 legacy projects clamp to script without deleting media data',()=>{const s={projects:[{step:8,approved:[0,3,4,8],scenes:[{prompt:'old'}],voiceData:'old',rendered:{id:'old'}}]};normalizeScriptProjects(s);assert.equal(s.projects[0].step,5);assert.deepEqual(s.projects[0].approved,[0,3,4]);assert.equal(s.projects[0].scenes[0].prompt,'old');assert.equal(s.projects[0].voiceData,'old');assert.equal(s.projects[0].rendered.id,'old');});
test('E1 only four production tabs and final script controls',async()=>{const s=await readFile('studio/public/app.js','utf8');assert.match(s,/Hoàn tất kịch bản/);assert(!s.includes("case 'render-video'"));assert(!s.includes('youtube-client-id'));assert(s.includes("'youtube-key'"));});

test('E4 current docs describe script-only workflow and preserve Data API setup',async()=>{
 const text=await readFile('studio/README.md','utf8');assert.match(text,/Hoàn tất kịch bản/);assert.match(text,/YouTube Data API/);assert(!new RegExp(['ff'+'mpeg','OAuth','TTS'].join('|')).test(text));
});

test('E5 inventory refreshed for all requested groups without deletion',async()=>{const text=await readFile('studio/FILE_REVIEW_INVENTORY.md','utf8');assert.match(text,/07\/10\/2026/);for(const group of ['tools/*.png','scratch/','tmp/','docs/ocr/'])assert(text.includes(group));assert.match(text,/chưa xoá/i);});

test('K3 six-step bounds preserve scene data and valid approvals',()=>{const state={projects:[{step:8,approved:[-1,0,4,5,6,8],scenes:[{prompt:'kept'}]},{step:-2,approved:[0]},{step:4.9,approved:[]}]};normalizeScriptProjects(state);assert.equal(state.projects[0].step,5);assert.deepEqual(state.projects[0].approved,[0,4,5]);assert.equal(state.projects[0].scenes[0].prompt,'kept');assert.equal(state.projects[1].step,0);assert.equal(state.projects[2].step,4);});
