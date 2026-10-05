import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichVideos, median, normalizeImport, validateGroups, safeYouTube, durationSeconds, parseAIJSON } from './core.mjs';
test('Outliers exclude the target and do not invent sparse baselines',()=>{
 const input=[100,200,300,2000].map((views,i)=>({id:String(i),views,channelId:'a',format:'long',publishedAt:'2026-09-01'}));
 const out=enrichVideos(input);assert.equal(out[3].baseline,200);assert.equal(out[3].multiple,10);
 assert.equal(enrichVideos(input.slice(0,3))[0].multiple,null);
 assert.equal(enrichVideos([...input,{id:'short',views:900000,channelId:'a',format:'short',publishedAt:'2026-09-01'}])[3].multiple,10);
});
test('Import rejects negative, missing and duplicate data and unsafe links',()=>{
 const row={id:'one',title:'test',views:10,channelId:'a',publishedAt:'2026-09-01',url:'javascript:alert(1)'};
 assert.equal(normalizeImport([row])[0].url,'');
 assert.throws(()=>normalizeImport([{...row,views:-1}]));assert.throws(()=>normalizeImport([row,row]));assert.throws(()=>normalizeImport([{...row,publishedAt:'yesterday'}]));
 assert.equal(safeYouTube('https://youtube.com.attacker.com/watch?v=x'),'');
});
test('AI groups cannot create IDs, double count or drop unmatched videos',()=>{
 const out=validateGroups([{name:'a',videoIds:['1','2','invented']},{name:'b',videoIds:['1','3']}],[{id:'1'},{id:'2'},{id:'3'},{id:'4'}]);
 assert.deepEqual(out[0].videoIds,['1','2']);assert.deepEqual(out[1].videoIds,['3']);assert.deepEqual(out[2].videoIds,['4']);
});
test('Durations, median and fenced JSON parse correctly',()=>{assert.equal(durationSeconds('PT1H2M3S'),3723);assert.equal(median([4,1,3,2]),2.5);assert.deepEqual(parseAIJSON('```json\n{"ok":true}\n```'),{ok:true});assert.throws(()=>parseAIJSON('no JSON'));});
