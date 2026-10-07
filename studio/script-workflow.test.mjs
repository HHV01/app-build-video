import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeScriptProjects} from './public/script-workflow.mjs';
test('E1 legacy projects clamp to script without deleting media data',()=>{const s={projects:[{step:8,approved:[0,3,8],scenes:[{prompt:'old'}],voiceData:'old',rendered:{id:'old'}}]};normalizeScriptProjects(s);assert.equal(s.projects[0].step,3);assert.deepEqual(s.projects[0].approved,[0,3]);assert.equal(s.projects[0].scenes[0].prompt,'old');assert.equal(s.projects[0].voiceData,'old');assert.equal(s.projects[0].rendered.id,'old');});
test('E1 only four production tabs and final script controls',async()=>{const s=await readFile('studio/public/app.js','utf8');assert.match(s,/Hoàn tất kịch bản/);assert(!s.includes("case 'render-video'"));assert(!s.includes('youtube-client-id'));assert(s.includes("'youtube-key'"));});

test('E4 current docs describe script-only workflow and preserve Data API setup',async()=>{
 const text=await readFile('studio/README.md','utf8');assert.match(text,/Hoàn tất kịch bản/);assert.match(text,/YouTube Data API/);assert(!/ffmpeg|OAuth|TTS/.test(text));
});
