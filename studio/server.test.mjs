import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import http from 'node:http';

const root = path.resolve('.');
const tempRoot = path.join(root, 'tmp');
await mkdir(tempRoot,{recursive:true});

// Mỗi test dựng server riêng với cổng và thư mục dữ liệu nằm trong workspace.
let nextPort = 33400;
async function boot(env = {},seed={}) {
  const dir = await mkdtemp(path.join(tempRoot, 'srv-test-'));
  if(seed.settings)await writeFile(path.join(dir,'settings.json'),JSON.stringify(seed.settings));
  if(seed.state)await writeFile(path.join(dir,'state.json'),JSON.stringify(seed.state));
  const port = nextPort++;
  const child = spawn(process.execPath, ['studio/server.mjs'], {
    cwd: root,
    env: { ...process.env, STUDIO_PORT: String(port), STUDIO_DATA_DIR: dir, ...env },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', d => { stderr += d; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw Error(`server chết khi khởi động: ${stderr}`);
    try { await fetch(`${base}/api/state`); break; } catch { await new Promise(r => setTimeout(r, 50)); }
  }
  const req = async (route, method = 'GET', body) => {
    const r = await fetch(base + route, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Studio-Request': '1', ...(body === undefined ? {} : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: r.status, body: await r.json() };
  };
  return {
    base, port, dir, req,
    stderr: () => stderr,
    exited: () => child.exitCode !== null,
    exitCode: () => child.exitCode,
    async stop() {
      if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
      await rm(dir, { recursive: true, force: true });
    },
  };
}

test('B9 · PUT state từ chối khảo sát videos hỏng và bổ sung videos mảng rỗng', async () => {
  const s = await boot();
  try {
    const current = await s.req('/api/state');
    const revision = current.body.revision;
    const bad = await s.req('/api/state', 'PUT', { revision, channels: [], projects: [], surveys: [{ id: 'sv1', name: 'X', videos: { khong: 'phai mang' } }] });
    assert.equal(bad.status, 400, 'videos không phải mảng phải bị chặn');
    const fixed = await s.req('/api/state', 'PUT', { revision, channels: [], projects: [], surveys: [{ id: 'sv1', name: 'X' }] });
    assert.equal(fixed.status, 200);
    const after = await s.req('/api/state');
    assert.deepEqual(after.body.surveys[0].videos, [], 'thiếu videos phải được bổ sung mảng rỗng');
  } finally { await s.stop(); }
});

// ---- A5: max_tokens phải đủ lớn cho từng tác vụ ----

// Gateway giả theo chuẩn OpenAI, ghi lại max_tokens của mỗi lượt gọi.
async function mockGateway(replyOverride={}) {
  const seen = [];
  const reply = {
    ok: true, groups: [{ name: 'Nhóm 1', angle: 'a', reason: 'r', videoIds: ['v1'] }],
    ideas: [], variants: [], names: [], topics: [], animations: [],
    segments: [], scenes: [], channels: [], summary: '', sensory: '', cast: [], angles: [],
    claims: [], questions: [], facts: [], timeline: [], narration: '', editorNotes: [],...replyOverride,
  };
  const srv = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', d => chunks.push(d));
    req.on('end', () => {
      let sent = null;
      try { sent = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* bỏ qua */ }
      seen.push({ max_tokens: sent?.max_tokens, model: sent?.model });
      const payload = JSON.stringify({ model: sent?.model || 'mock', choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: 'stop' }] });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(payload);
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { seen, url: `http://127.0.0.1:${srv.address().port}/v1`, stop: () => new Promise(r => srv.close(r)) };
}

const AI_ACTIONS = ['groups', 'packaging', 'identity', 'ideas', 'topics', 'research', 'outline', 'script'];

test('A5 · mỗi tác vụ AI gửi max_tokens đủ lớn, không action nào dùng chung mức 700', async () => {
  const gw = await mockGateway();
  const envFile = path.join(tempRoot, `env-a5-${Date.now()}.env`);
  await writeFile(envFile, `OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`, 'utf8');
  const s = await boot({ STUDIO_ENV_FILE: envFile });
  try {
    for (const action of AI_ACTIONS) {
      const r = await s.req('/api/generate', 'POST', { action, context: { note: 'x' } });
      assert.equal(r.status, 200, `${action}: ${r.body.error}\n${s.stderr()}`);
    }
    const byCall = Object.fromEntries(AI_ACTIONS.map((a, i) => [a, gw.seen[i]]));
    for (const action of AI_ACTIONS) {
      const sent = byCall[action]?.max_tokens;
      assert.equal(typeof sent, 'number', `${action}: không gửi max_tokens`);
      assert.ok(sent >= 1600, `${action} chỉ có ${sent} token, cần ít nhất 1600`);
    }
    // 30 ý tưởng / 16 phương án bao bì không thể vừa 700 token.
    assert.ok(byCall.ideas.max_tokens >= 4000, `ideas có ${byCall.ideas.max_tokens}, cần ≥ 4000 cho 30 mục`);
    assert.ok(byCall.packaging.max_tokens >= 3500, `packaging có ${byCall.packaging.max_tokens}, cần ≥ 3500 cho 16 mục`);
  } finally { await s.stop(); await gw.stop(); await rm(envFile, { force: true }); }
});

// ---- B6: prompt topics không được đẩy AI về chủ đề ít nổi tiếng ----

// Gateway giả ghi lại TOÀN BỘ thân yêu cầu để kiểm tra prompt gửi đi.
async function promptGateway(replyOverride={}) {
  const seen = [];
  const reply = {
    ok: true, groups: [], ideas: [], variants: [], names: [], topics: [], animations: [],
    segments: [], scenes: [], channels: [], summary: '', sensory: '', cast: [], angles: [],
    claims: [], questions: [], facts: [], timeline: [], narration: '', editorNotes: [],...replyOverride,
  };
  const srv = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', d => chunks.push(d));
    req.on('end', () => {
      let sent = null;
      try { sent = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* bỏ qua */ }
      seen.push(sent);
      const payload = JSON.stringify({ model: sent?.model || 'mock', choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: 'stop' }] });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(payload);
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { seen, url: `http://127.0.0.1:${srv.address().port}/v1`, stop: () => new Promise(r => srv.close(r)) };
}

test('B6 · prompt topics đòi thực thể nhiều người biết, không đẩy sang chủ đề vắng', async () => {
  const gw = await promptGateway();
  const envFile = path.join(tempRoot, `env-b6-${Date.now()}.env`);
  await writeFile(envFile, `OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`, 'utf8');
  const s = await boot({ STUDIO_ENV_FILE: envFile });
  try {
    const r = await s.req('/api/generate', 'POST', {
      action: 'topics',
      context: { group: 'Thành phố', template: 'the entire history of', shelfTitles: ['the entire history of egypt'] },
    });
    assert.equal(r.status, 200, r.body.error);
    const prompt = JSON.stringify(gw.seen[0] || {});
    assert.ok(!/ÍT NỔI TIẾNG HƯỢN HƠN/i.test(prompt), 'prompt không được bảo AI chọn chủ đề ít nổi tiếng hơn');
    assert.match(prompt, /nhiều người biết/, 'phải yêu cầu thực thể nhiều người biết');
    assert.match(prompt, /trùng thực thể/, 'phải yêu cầu loại trùng thực thể với kho');
    assert.match(prompt, /knownBy/, 'phải yêu cầu điền knownBy để xếp hạng');
  } finally { await s.stop(); await gw.stop(); await rm(envFile, { force: true }); }
});

test('AI HTTP 503 switches model through gateway and retains primary setting',async()=>{
 const models=[];const gateway=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const b=JSON.parse(raw);models.push(b.model);res.setHeader('Content-Type','application/json');if(b.model==='primary'){res.writeHead(503);res.end(JSON.stringify({error:{message:'overloaded'}}));}else res.end(JSON.stringify({model:'backup',choices:[{message:{content:'{"angles":[{"angle":"Test angle","reason":"Titles"}]}'},finish_reason:'stop'}]}));});
 gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
 const envDir=await mkdtemp(path.join(tempRoot,'fallback-env-'));const envPath=path.join(envDir,'test.env');await writeFile(envPath,`OPENAI_BASE_URL=http://127.0.0.1:${gateway.address().port}/v1\nOPENAI_API_KEY=test-key\n`);
 const s=await boot({STUDIO_ENV_FILE:envPath});
 try{
  assert.equal((await s.req('/api/settings','PUT',{model:'primary',autoFallback:true,fallbackModels:['backup']})).status,200);
  const result=await s.req('/api/generate','POST',{action:'angles',context:{titles:['Title']}});
  assert.equal(result.status,200);assert.equal(result.body.model,'backup');assert.equal(result.body.fallback.used,true);assert.deepEqual(models,['primary','backup']);
  assert.equal((await s.req('/api/settings')).body.model,'primary');
  assert.equal((await s.req('/api/settings','PUT',{fallbackModels:['a','b','c','d']})).status,400);
 }finally{await s.stop();gateway.close();await rm(envDir,{recursive:true,force:true});}
});

test('E2 removed media routes return 404',async()=>{
 const s=await boot();try{
 for(const method of ['GET','POST'])for(const route of ['tts','image','image/generate','image/batch','transcribe','render','render/status','probe','youtube/connect','youtube/callback','youtube/publish'])assert.equal((await s.req('/api/'+route,method,method==='POST'?{}:undefined)).status,404,route+' '+method);
 assert.equal((await s.req('/api/build/old')).status,404);
 assert.equal((await s.req('/api/state')).status,200);
 }finally{await s.stop();}
});

test('E3 legacy settings boot; Data API key remains secret; old media data survives',async()=>{
 const legacyKey=['youtube','ClientId'].join('');const s=await boot({}, {settings:{[legacyKey]:'old',model:'test'},state:{revision:0,channels:[],surveys:[],projects:[{id:'p',step:8,approved:[0,3,8],scenes:[{prompt:'old'}],voiceData:'old',rendered:{id:'old'}}]}});
 try{
  const state=(await s.req('/api/state')).body;assert.equal(state.projects[0].step,5);assert.deepEqual(state.projects[0].approved,[0,3]);assert.equal(state.projects[0].scenes[0].prompt,'old');assert.equal(state.projects[0].voiceData,'old');assert.equal(state.projects[0].rendered.id,'old');
  assert.equal((await s.req('/api/settings','PUT',{youtubeKey:'private-test-key',[legacyKey]:'new'})).status,200);
  const settings=(await s.req('/api/settings')).body;assert.equal(settings.youtubeConfigured,true);assert(!JSON.stringify(settings).includes('private-test-key'));assert(!Object.hasOwn(settings,legacyKey));
  const persisted=JSON.parse(await readFile(path.join(s.dir,'settings.json'),'utf8'));assert.equal(persisted.youtubeKey,'private-test-key');assert.equal(persisted[legacyKey],'old');
  for(const route of ['/','/app.js','/production.mjs','/sync.mjs']){const r=await fetch(s.base+route);assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);}
 }finally{await s.stop();}
});

test('F1 mock AI receives evaluated evidence for both writing actions',async()=>{
 const {researchContext}=await import('./public/research-context.mjs');const gw=await promptGateway();const envFile=path.join(tempRoot,`env-f1-${Date.now()}.env`);await writeFile(envFile,`OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`);const s=await boot({STUDIO_ENV_FILE:envFile});
 try{for(const action of ['outline','script']){const r=await s.req('/api/generate','POST',{action,context:researchContext({researchFacts:[{claim:'verified',status:'supported'}],claims:[{claim:'uncertain',status:'needs_check'}]})});assert.equal(r.status,200);const prompt=JSON.stringify(gw.seen.at(-1));assert.match(prompt,/verified/);assert.match(prompt,/uncertain/);assert.match(prompt,/không được khẳng định/);assert.match(prompt,/assertable/);}}finally{await s.stop();await gw.stop();await rm(envFile,{force:true});}
});

test('G1 saved imported survey drops descriptions but retains optional metadata',async()=>{const s=await boot();try{const cur=(await s.req('/api/state')).body;const r=await s.req('/api/state','PUT',{...cur,surveys:[{id:'metadata',videos:[{id:'v',title:'A',channelId:'c',description:'do not store',tags:['tag'],chapters:[{t:0,label:'Intro'}]}]}]});assert.equal(r.status,200);const saved=JSON.parse(await readFile(path.join(s.dir,'state.json'),'utf8'));assert.equal(saved.surveys[0].videos[0].description,undefined);assert.deepEqual(saved.surveys[0].videos[0].tags,['tag']);}finally{await s.stop();}});

test('F2 mock gateway measures full prompts for seven old and compact script contexts',async()=>{
 const {researchContext,scriptPartContext}=await import('./public/research-context.mjs');const gw=await promptGateway();const envFile=path.join(tempRoot,`env-f2-${Date.now()}.env`);await writeFile(envFile,`OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`);const s=await boot({STUDIO_ENV_FILE:envFile});const p={topic:'Egypt',minutes:7,sources:[{text:'x'.repeat(20000)}],packaging:[{title:'Egypt',thumbnailVisual:'x'.repeat(800)}],outline:Array.from({length:7},(_,i)=>({title:'part '+i})),researchSummary:'Egypt summary',researchFacts:[{claim:'Egypt fact',status:'supported'}]},c={language:'vi',identity:{voice:'voice',hook:'hook'},characterDescription:'x'.repeat(1000)};
 try{for(let i=0;i<7;i++){const part={focus:p.outline[i],targetWords:150};const context={...researchContext(p),includeCTA:false,topic:p.topic,language:c.language,minutes:p.minutes,voice:c.identity.voice,hookPattern:c.identity.hook,packaging:p.packaging[0],sources:p.sources,outline:p.outline,characterDescription:c.characterDescription,researchAngle:'',outlineFocus:part.focus,targetWords:150,scriptPart:{...part,index:i+1,count:7},previousEnding:''};assert.equal((await s.req('/api/generate','POST',{action:'script',context})).status,200);}for(let i=0;i<7;i++){assert.equal((await s.req('/api/generate','POST',{action:'script',context:scriptPartContext(c,p,{focus:p.outline[i],targetWords:150},i,7,Array(i).fill('A brief written part.'))})).status,200);}const size=rows=>rows.reduce((n,b)=>n+b.messages.reduce((m,x)=>m+String(x.content).length,0),0),before=size(gw.seen.slice(0,7)),after=size(gw.seen.slice(7));assert(after<before);for(const call of gw.seen.slice(7))assert(!call.messages.some(m=>String(m.content).includes('"sources"')));console.log(`F2 full mock prompt chars BEFORE=${before} AFTER=${after}`);
 }finally{await s.stop();await gw.stop();await rm(envFile,{force:true});}
});
test('F5 channel note preference survives save and reload',async()=>{const s=await boot();try{const cur=(await s.req('/api/state')).body;assert.equal((await s.req('/api/state','PUT',{...cur,channels:[{id:'notes',name:'Notes',hideVerificationNotes:true}]})).status,200);assert.equal((await s.req('/api/state')).body.channels[0].hideVerificationNotes,true);assert.equal(JSON.parse(await readFile(path.join(s.dir,'state.json'),'utf8')).channels[0].hideVerificationNotes,true);}finally{await s.stop();}});


test('K1b scene actions send only batch narration and return requested schemas',async()=>{
 const seen=[];let forcedPrompt;
 const gateway=http.createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;const sent=JSON.parse(raw);seen.push(sent);
  const schema=JSON.parse(sent.messages[0].content.split('Cấu trúc JSON cần trả: ')[1]);
  const output=schema.scenes?{scenes:[{narration:'A farmer delivers grain.',visual:'A farmer delivers grain.',prompt:'A farmer carries a grain basket into a storehouse. Wide shot.',overlay:'',sfx:'',characters:['Farmer'],noCharacter:false,background:'Storehouse'}]}:{animations:[{scene:7,prompt:'The farmer lifts the basket. The camera stays still.'}]};
  if(forcedPrompt!==undefined)(output.scenes||output.animations)[0].prompt=forcedPrompt;
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(output)},finish_reason:'stop'}]}));
 });
 await new Promise(r=>gateway.listen(0,'127.0.0.1',r));
 const envFile=path.join(tempRoot,`env-k1b-${Date.now()}.env`);
 await writeFile(envFile,`OPENAI_BASE_URL=http://127.0.0.1:${gateway.address().port}/v1\nOPENAI_API_KEY=test-key\n`);
 const s=await boot({STUDIO_ENV_FILE:envFile});
 try{
  for(const action of ['scenes','animation']){
   const context={narration:'A farmer delivers grain.',scenes:[{scene:7,narration:'A farmer delivers grain.',prompt:'cinematic realistic matte painting 4K photorealistic lighting'}],research:{secret:'RESEARCH_SENTINEL'},sources:['SOURCES_SENTINEL'],packaging:{title:'PACKAGING_SENTINEL'},visualProfile:{style:'lighting'}};
   const result=await s.req('/api/generate','POST',{action,context});
   assert.equal(result.status,200,result.body.error);
   const messages=seen.at(-1).messages,text=JSON.stringify(messages);
   assert.doesNotMatch(text,/research|sources|packaging|SENTINEL|cinematic|realistic|matte painting|4K|photorealistic|lighting/i);
   const data=JSON.parse(messages[1].content.split('Batch narration:\n')[1]);
   assert.deepEqual(data,action==='scenes'?{narration:context.narration,rosterNames:[]}:{scenes:[{scene:7,narration:context.narration}]});
   const schema=JSON.parse(messages[0].content.split('Cấu trúc JSON cần trả: ')[1]);
   const key=action==='scenes'?'scenes':'animations',fields=action==='scenes'?['background','characters','narration','noCharacter','overlay','prompt','sfx','visual']:['prompt','scene'];
   assert.deepEqual(Object.keys(schema[key][0]).sort(),fields);
   assert.deepEqual(Object.keys(result.body.output[key][0]).sort(),fields);
   assert(messages[1].content.includes('60 words'));
  }
  for(const action of ['scenes','animation'])for(const invalid of ['cinematic','realistic','matte painting','4K','photorealistic','lighting',...(action==='animation'?[Array(61).fill('word').join(' ')]:[])]){
   forcedPrompt=invalid;const result=await s.req('/api/generate','POST',{action,context:{narration:'A farmer delivers grain.',scenes:[{scene:7,narration:'A farmer delivers grain.'}]}});
   assert.equal(result.status,422,action+': '+invalid);
  }
  const calls=seen.length;
  assert.equal((await s.req('/api/generate','POST',{action:'scenes',context:{research:'not narration'}})).status,400);
  assert.equal((await s.req('/api/generate','POST',{action:'animation',context:{scenes:[{scene:7,prompt:'old image prompt'}]}})).status,400);
  assert.equal(seen.length,calls,'invalid batch must not call AI');
 }finally{await s.stop();await new Promise(r=>gateway.close(r));await rm(envFile,{force:true});}
});

test('K4 HTTP sceneTags and scenes whitelist context, validate fixed tags and bound batches',async()=>{
 const tags=[{index:5,tags:['WIDE','day'],summary:'A person arrives.'}],rows=[{narration:'untrusted rewrite',visual:'A person arrives.',prompt:Array(81).fill('word').join(' '),overlay:'',sfx:'',characters:[],background:'desk'}];
 const gw=await promptGateway({tagsByIndex:tags,scenes:rows}),envFile=path.join(tempRoot,`env-k4-${Date.now()}.env`);await writeFile(envFile,`OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`);const s=await boot({STUDIO_ENV_FILE:envFile});
 try{
  const windows=[{index:5,narration:'A person arrives.'}],forbidden={research:'SECRET_R',sources:'SECRET_S',packaging:'SECRET_P',identity:'SECRET_I',audience:'SECRET_A',niche:'SECRET_N',visualStyle:'SECRET_V',characterDescription:'SECRET_C',researchAngle:'SECRET_G'};
  const r=await s.req('/api/generate','POST',{action:'sceneTags',context:{windows,summaryPrev:'Before.',tagMenu:{fake:['invented']},...forbidden}});assert.equal(r.status,200,r.body.error);assert.deepEqual(r.body.output.tagsByIndex[0].tags,['wide','day']);
  const sent=gw.seen.at(-1),ctx=JSON.parse(sent.messages[1].content.split('Batch narration:\n')[1]);assert.deepEqual(Object.keys(ctx).sort(),['rosterNames','summaryPrev','tagMenu','windows']);assert(ctx.tagMenu.camera.includes('wide'));assert.doesNotMatch(JSON.stringify(sent),/SECRET_/);assert(sent.max_tokens<=700);
  tags[0].tags=['invented'];const bad=await s.req('/api/generate','POST',{action:'sceneTags',context:{windows}});assert.equal(bad.status,422);assert.equal(bad.body.invalidTags,true);tags[0].tags=['wide'];
  const scenes=await s.req('/api/generate','POST',{action:'scenes',context:{windows,tagsByIndex:tags,...forbidden}});assert.equal(scenes.status,200,scenes.body.error);const sceneContext=JSON.parse(gw.seen.at(-1).messages[1].content.split('Batch narration:\n')[1]);assert.deepEqual(Object.keys(sceneContext).sort(),['rosterNames','tagsByIndex','windows']);assert.doesNotMatch(JSON.stringify(gw.seen.at(-1)),/SECRET_/);assert.equal(scenes.body.output.scenes[0].prompt.split(' ').length,81,'long raw prompts are warnings, not a blocked batch');
  const before=gw.seen.length;assert.equal((await s.req('/api/generate','POST',{action:'sceneTags',context:{windows:Array.from({length:5},(_,i)=>({index:i+1,narration:'text'}))}})).status,400);assert.equal(gw.seen.length,before);
 }finally{await s.stop();await gw.stop();await rm(envFile,{force:true});}
});

test('P1 HTTP scene generation sends roster names only and actual workflow retries unknown names once',async()=>{
 const {runSceneBatches}=await import('./public/scene-workflow.mjs');
 const gw=await promptGateway({tagsByIndex:[{index:1,tags:['wide'],summary:''}],scenes:[{narration:'AI rewrite',visual:'A boy waits.',prompt:'A boy waits.',characters:['Nam'],noCharacter:false,overlay:'',sfx:'',background:''}]}),envFile=path.join(tempRoot,`env-p1-${Date.now()}.env`);await writeFile(envFile,`OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`);const server=await boot({STUDIO_ENV_FILE:envFile});
 try{
  const p={script:'A boy waits.',voiceSeconds:4,clipSeconds:4,mainCharacters:[{name:'Tích',description:'IDENTITY_PRIVATE_SENTINEL'}],rosterConfirmed:true,scenes:[]};
  await runSceneBatches(p,{save:async()=>{},generate:async(action,context)=>{const result=await server.req('/api/generate','POST',{action,context:{...context,identity:'IDENTITY_PRIVATE_SENTINEL',research:'RESEARCH_SENTINEL',sources:['SOURCE_SENTINEL']}});assert.equal(result.status,200,result.body.error);return result.body.output;}});
  const sceneCalls=gw.seen.filter(call=>JSON.parse(call.messages[0].content.split('Cấu trúc JSON cần trả: ')[1]).scenes);assert.equal(sceneCalls.length,2);assert(p.scenes[0].invalidCharacters);
  for(const call of sceneCalls){const context=JSON.parse(call.messages[1].content.split('Batch narration:\n')[1]);assert.deepEqual(context.rosterNames,['Tích']);assert.doesNotMatch(JSON.stringify(call),/PRIVATE_SENTINEL|RESEARCH_SENTINEL|SOURCE_SENTINEL/);const schema=JSON.parse(call.messages[0].content.split('Cấu trúc JSON cần trả: ')[1]);assert.equal(typeof schema.scenes[0].noCharacter,'boolean');assert(call.messages[1].content.includes('only exact names from rosterNames'));}
  const count=gw.seen.length;assert.equal((await server.req('/api/generate','POST',{action:'scenes',context:{narration:'text',rosterNames:[{name:'A',description:'secret'}]}})).status,400);assert.equal(gw.seen.length,count);
 }finally{await server.stop();await gw.stop();await rm(envFile,{force:true});}
});


test('K2 identity renders an empty multiline visualStyle and persists edits per channel',async()=>{
 const app=await readFile('studio/public/app.js','utf8');
 const viewLine=app.split('\n').find(line=>line.startsWith('function identityView('));
 const fields=[];
 const {renderBibleBlock}=await import('./public/roster.mjs');const {renderChannelPlans}=await import('./public/channel-plans.mjs');
 const render=new Function('panel','field','select','THUMB_LAYOUTS','renderBibleBlock','renderChannelPlans','esc','btn',viewLine+';return identityView;')((name,content)=>content,(label,binding,value,type)=>{fields.push({binding,value,type});return `<${binding}>${value??''}</${binding}>`;},()=>'',[],renderBibleBlock,renderChannelPlans,s=>String(s??''),()=>'' );
 const first=render({id:'a',identity:{}});
 assert.deepEqual(fields.find(f=>f.binding==='channel.visualStyle'),{binding:'channel.visualStyle',value:'',type:'textarea'});
 const style='Flat ink drawings.\nKeep backgrounds sparse.';
 const s=await boot();try{
  const state=(await s.req('/api/state')).body;
  state.channels=[{id:'a',identity:{},visualStyle:style},{id:'b',identity:{},visualStyle:''}];
  state.projects=[{id:'p',channelId:'a',step:3,scenes:[{prompt:'A farmer lifts a basket.'}]}];
  const {scenePromptRows}=await import('./public/scene-prompts.mjs');
  const composed=scenePromptRows(state.channels[0],state.projects[0])[0].prompt;
  assert(composed.includes(style.replace(/\s+/g,' ')));
  assert.equal((await s.req('/api/state','PUT',state)).status,200);
  const saved=(await s.req('/api/state')).body;
  const changed=render(saved.channels[0]);
  assert.notEqual(first,changed);assert(changed.includes(style));
  assert.equal(saved.channels[1].visualStyle,'');
  assert.equal(saved.projects[0].scenes[0].prompt,'A farmer lifts a basket.');
  assert(!JSON.stringify(saved).includes(composed));
  const disk=JSON.parse(await readFile(path.join(s.dir,'state.json'),'utf8'));assert.equal(disk.projects[0].scenes[0].prompt,'A farmer lifts a basket.');assert(!JSON.stringify(disk).includes(composed));
 }finally{await s.stop();}
});


test('K3 rosterExtras strips unrelated context and bounds output through real HTTP',async()=>{
 const extras=[{name:'Keeper',role:'Storekeeper',description:'An older keeper holding a ledger.'}],backgrounds=[{name:'Storehouse',description:'A clay warehouse with grain baskets.'}];
 const gw=await promptGateway({extras,backgrounds}),envFile=path.join(tempRoot,`env-k3-${Date.now()}.env`);await writeFile(envFile,`OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`);const s=await boot({STUDIO_ENV_FILE:envFile});
 const context={scriptText:'A boy meets a keeper.',mainCharacters:[{id:'a',name:'Boy',role:'Lead',description:Array(80).fill('word').join(' '),identity:'SECRET'}],research:'SECRET',sources:['SECRET'],packaging:['SECRET'],visualStyle:'SECRET',identity:'SECRET',audience:'SECRET',niche:'SECRET'};
 try{
  const result=await s.req('/api/generate','POST',{action:'rosterExtras',context});assert.equal(result.status,200,result.body.error);assert.deepEqual(result.body.output.extras,extras);
  const sent=gw.seen[0];assert.doesNotMatch(JSON.stringify(sent.messages),/research|sources|packaging|visualStyle|SECRET|audience|niche/);
  const ctx=JSON.parse(sent.messages[1].content.split('Batch narration:\n')[1]);assert.deepEqual(Object.keys(ctx).sort(),['mainCharacters','scriptText']);assert.equal(ctx.mainCharacters[0].description.split(/\s+/).length,40);
  assert(sent.max_tokens<=1200);assert.deepEqual(Object.keys(JSON.parse(sent.messages[0].content.split('Cấu trúc JSON cần trả: ')[1])).sort(),['backgrounds','extras']);
  extras.push(...Array.from({length:6},(_,i)=>({name:'Extra'+i,role:'Other',description:'A person.'})));assert.equal((await s.req('/api/generate','POST',{action:'rosterExtras',context})).status,422);
  extras.splice(1);extras[0].description=Array(41).fill('word').join(' ');assert.equal((await s.req('/api/generate','POST',{action:'rosterExtras',context})).status,422);
  extras[0].description='A keeper.';backgrounds.push(...Array.from({length:6},(_,i)=>({name:'Place'+i,description:'A courtyard.'})));assert.equal((await s.req('/api/generate','POST',{action:'rosterExtras',context})).status,422);
  backgrounds.splice(1);extras[0].name='Boy';assert.equal((await s.req('/api/generate','POST',{action:'rosterExtras',context})).status,422);
  const calls=gw.seen.length;assert.equal((await s.req('/api/generate','POST',{action:'rosterExtras',context:{scriptText:''}})).status,400);assert.equal(gw.seen.length,calls);
 }finally{await s.stop();await gw.stop();await rm(envFile,{force:true});}
});

test('P2 HTTP uses bible menu without identity and validates unknown tags',async()=>{
 const {tagMenu}=await import('./public/character-bible.mjs');const {runSceneBatches}=await import('./public/scene-workflow.mjs');const {scenePromptRows}=await import('./public/scene-prompts.mjs');
 const bible=JSON.parse(await readFile('studio/public/schoolboy.preset.json','utf8'));
 const tags=[{index:1,expression:bible.expressions[0].tag,pose:bible.poses[0].tag,graphics:[],camera:'wide',summary:'He waits.'}];
 const gw=await promptGateway({tagsByIndex:tags,scenes:[{visual:'A boy waits.',prompt:'A boy waits.',characters:[],noCharacter:false,overlay:'',sfx:'',background:''}]}),envFile=path.join(tempRoot,`env-p2-${Date.now()}.env`);await writeFile(envFile,`OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`);const server=await boot({STUDIO_ENV_FILE:envFile});
 try{
  const channel={characters:[{name:bible.name,description:bible.identity,bible}]},p={script:'A boy waits.',voiceSeconds:4,clipSeconds:4,scenes:[]};
  await runSceneBatches(p,{channel,save:async()=>{},generate:async(action,context)=>{const r=await server.req('/api/generate','POST',{action,context:{...context,identity:bible.identity,research:'PRIVATE_RESEARCH',sources:['PRIVATE_SOURCE'],packaging:'PRIVATE_PACKAGING'}});assert.equal(r.status,200,r.body.error);return r.body.output;}});
  assert.equal(gw.seen.length,2);
  const contexts=gw.seen.map(call=>JSON.parse(call.messages[1].content.split('Batch narration:\n')[1]));assert.equal(contexts[0].tagMenu,tagMenu(bible));assert.deepEqual(Object.keys(contexts[0]).sort(),['rosterNames','summaryPrev','tagMenu','windows']);assert.equal(contexts[1].tagMenu,undefined);assert.equal(contexts[1].tagsByIndex[0].tagWarnings,undefined);
  for(const sent of gw.seen){assert(!JSON.stringify(sent).includes(bible.identity));assert.doesNotMatch(JSON.stringify(sent),/PRIVATE_RESEARCH|PRIVATE_SOURCE|PRIVATE_PACKAGING/);}
  const image=scenePromptRows(channel,p)[0].image_prompt;assert(image.includes(bible.identity));assert(image.includes('Expression:'));assert(image.includes('Pose:'));
  tags[0].expression='invented';const bad=await server.req('/api/generate','POST',{action:'sceneTags',context:{windows:[{index:1,narration:p.script}],tagMenu:tagMenu(bible)}});assert.equal(bad.status,422);assert.equal(bad.body.invalidTags,true);
 }finally{await server.stop();await gw.stop();await rm(envFile,{force:true});}
});

test('channel plan segment HTTP whitelists context, excludes fixed/SFX/research and blocks oversized slot',async()=>{
 const fills={subject:'one two three'},gw=await promptGateway({text:'A useful hook.',fills}),envFile=path.join(tempRoot,`env-plans-${Date.now()}.env`);await writeFile(envFile,`OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`);const server=await boot({STUDIO_ENV_FILE:envFile});
 try{const result=await server.req('/api/generate','POST',{action:'planSegment',context:{kind:'ai',instruction:'Tell a daily story.',maxWords:20,topic:'Money',fixed:'PRIVATE_FIXED',sfx:'PRIVATE_SFX',research:'PRIVATE_RESEARCH',sources:['PRIVATE_SOURCE']}});assert.equal(result.status,200);assert.equal(result.body.output.text,'A useful hook.');assert.doesNotMatch(JSON.stringify(gw.seen),/PRIVATE_FIXED|PRIVATE_SFX|PRIVATE_RESEARCH|PRIVATE_SOURCE/);
 const tooLong=await server.req('/api/generate','POST',{action:'planSegment',context:{kind:'template',slots:{subject:2},topic:'Money'}});assert.equal(tooLong.status,422);assert.match(tooLong.body.error,/2/);
 }finally{await server.stop();await gw.stop();await rm(envFile,{force:true});}
});

test('niche angle HTTP uses niche context and strips unrelated private research',async()=>{
 const gw=await promptGateway({angles:[{angle:'Why small money choices matter',reason:'Personal finance'}]}),envFile=path.join(tempRoot,`env-niche-angle-${Date.now()}.env`);await writeFile(envFile,`OPENAI_BASE_URL=${gw.url}\nOPENAI_API_KEY=test-key\n`);const server=await boot({STUDIO_ENV_FILE:envFile});
 try{const r=await server.req('/api/generate','POST',{action:'angles',context:{basis:'niche',niche:'Personal finance',titles:['Why save'],research:'PRIVATE_RESEARCH',sources:['PRIVATE_SOURCES'],identity:'PRIVATE_IDENTITY'}});assert.equal(r.status,200);assert.equal(r.body.output.angles[0].angle,'Why small money choices matter');const prompt=gw.seen[0].messages[1].content,ctx=JSON.parse(prompt.split('Dữ liệu dự án:\n')[1]);assert.equal(ctx.niche,'Personal finance');assert.equal(ctx.basis,'niche');assert.doesNotMatch(prompt,/PRIVATE_RESEARCH|PRIVATE_SOURCES|PRIVATE_IDENTITY/);const before=gw.seen.length;assert.equal((await server.req('/api/generate','POST',{action:'angles',context:{basis:'niche',niche:''}})).status,400);assert.equal(gw.seen.length,before);
 }finally{await server.stop();await gw.stop();await rm(envFile,{force:true});}
});

async function jsonFailureHarness(reply,settings={}){
 const seen=[];const gateway=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const sent=JSON.parse(raw);seen.push(sent);const value=reply(sent,seen.length);res.writeHead(value.status||200,{'Content-Type':'application/json'});res.end(JSON.stringify(value.body));});
 await new Promise(r=>gateway.listen(0,'127.0.0.1',r));const envFile=path.join(tempRoot,`env-json-${Date.now()}-${Math.random()}.env`);
 await writeFile(envFile,`OPENAI_BASE_URL=http://127.0.0.1:${gateway.address().port}/v1\nOPENAI_API_KEY=test-key\n`);
 const server=await boot({STUDIO_ENV_FILE:envFile},{settings:{model:'primary',...settings}});
 return {seen,server,async stop(){await server.stop();await new Promise(r=>gateway.close(r));await rm(envFile,{force:true});}};
}
const badJsonReply={status:400,body:{error:{code:'json_validate_failed',message:"Failed to validate JSON. Please adjust your prompt. See 'failed_generation' for more details."}}};
const goodScriptReply={body:{choices:[{message:{content:'{"narration":"A valid next part.","editorNotes":[]}'},finish_reason:'stop'}]}};
test('HTTP JSON validation 400 retries once without response_format while retaining JSON instructions and state',async()=>{
 const h=await jsonFailureHarness((sent,n)=>n===1?badJsonReply:goodScriptReply);
 try{const before=(await h.server.req('/api/state')).body;const r=await h.server.req('/api/generate','POST',{action:'script',context:{targetWords:20,outlineFocus:{title:'A next section'}}});
 assert.equal(r.status,200,r.body.error);assert.equal(r.body.output.narration,'A valid next part.');assert.equal(h.seen.length,2);
 assert.equal(h.seen[0].response_format.type,'json_object');assert.equal(h.seen[1].response_format,undefined);assert.match(h.seen[1].messages[0].content,/JSON/);assert.deepEqual(h.seen[0].messages,h.seen[1].messages);
 assert.deepEqual((await h.server.req('/api/state')).body,before);
 }finally{await h.stop();}
});
test('persistent JSON validation failure switches model after exactly one retry',async()=>{
 const h=await jsonFailureHarness(sent=>sent.model==='primary'?badJsonReply:goodScriptReply,{autoFallback:true,fallbackModels:['backup']});
 try{const r=await h.server.req('/api/generate','POST',{action:'script',context:{}});assert.equal(r.status,200,r.body.error);assert.equal(r.body.fallback.used,true);assert.deepEqual(h.seen.map(x=>x.model),['primary','primary','backup']);assert.equal(h.seen[2].response_format.type,'json_object');}
 finally{await h.stop();}
});
test('unrelated HTTP 400 never retries or switches models',async()=>{
 const h=await jsonFailureHarness(()=>({status:400,body:{error:{code:'invalid_request_error',message:'Invalid model parameter'}}}),{autoFallback:true,fallbackModels:['backup']});
 try{const r=await h.server.req('/api/generate','POST',{action:'script',context:{}});assert.notEqual(r.status,200);assert.equal(h.seen.length,1);assert.match(r.body.error,/Invalid model parameter/);}
 finally{await h.stop();}
});

test('malformed JSON in successful HTTP response is retried and parsed before returning',async()=>{
 const h=await jsonFailureHarness((sent,n)=>n===1?{body:{choices:[{message:{content:'{"narration": unfinished'},finish_reason:'stop'}]}}:goodScriptReply);
 try{const r=await h.server.req('/api/generate','POST',{action:'script',context:{}});assert.equal(r.status,200,r.body.error);assert.equal(h.seen.length,2);assert.equal(r.body.output.narration,'A valid next part.');}finally{await h.stop();}
});
test('all models failing JSON stop after bounded retries with an understandable error',async()=>{
 const h=await jsonFailureHarness(()=>badJsonReply,{autoFallback:true,fallbackModels:['backup']});
 try{const r=await h.server.req('/api/generate','POST',{action:'script',context:{}});assert.equal(r.status,503);assert.equal(h.seen.length,4);assert.match(r.body.error,/JSON hợp lệ/);assert.match(r.body.error,/đã lưu được giữ/i);}finally{await h.stop();}
});

const truncatedScriptReply={body:{choices:[{message:{content:'{"narration":"unfinished'},finish_reason:'length'}]}};
test('output length limit retries the same part with bounded extra output budget',async()=>{
 const h=await jsonFailureHarness((sent,n)=>n===1?truncatedScriptReply:goodScriptReply);
 try{const before=(await h.server.req('/api/state')).body;const r=await h.server.req('/api/generate','POST',{action:'script',context:{targetWords:200}});assert.equal(r.status,200,r.body.error);assert.equal(h.seen.length,2);assert.equal(h.seen[0].max_tokens,2000);assert.equal(h.seen[1].max_tokens,4000);assert.deepEqual(h.seen[0].messages,h.seen[1].messages);assert.equal(h.seen[1].response_format.type,'json_object');assert.deepEqual((await h.server.req('/api/state')).body,before);}
 finally{await h.stop();}
});
test('persistent output truncation switches model without accepting partial narration',async()=>{
 const h=await jsonFailureHarness(sent=>sent.model==='primary'?truncatedScriptReply:goodScriptReply,{autoFallback:true,fallbackModels:['backup']});
 try{const r=await h.server.req('/api/generate','POST',{action:'script',context:{}});assert.equal(r.status,200,r.body.error);assert.equal(r.body.output.narration,'A valid next part.');assert.deepEqual(h.seen.map(x=>x.model),['primary','primary','backup']);assert.equal(h.seen[2].max_tokens,2000);assert.equal(r.body.fallback.used,true);}
 finally{await h.stop();}
});

test('direct API keys persist separately and never appear in settings or state responses',async()=>{
 const s=await boot({}, {settings:{youtubeKey:'youtube-retained'}});
 try{const saved=await s.req('/api/ai/keys','PUT',{gemini:'fake-gemini-secret',xai:'fake-xai-secret'});assert.equal(saved.status,200);
 const settings=await s.req('/api/settings');assert.equal(settings.body.geminiConfigured,true);assert.equal(settings.body.xaiConfigured,true);assert.doesNotMatch(JSON.stringify(settings.body),/fake-gemini-secret|fake-xai-secret/);
 assert.doesNotMatch(JSON.stringify((await s.req('/api/state')).body),/fake-gemini-secret|fake-xai-secret/);
 const stored=JSON.parse(await readFile(path.join(s.dir,'ai-keys.json'),'utf8'));assert.equal(stored.gemini,'fake-gemini-secret');assert.equal(stored.xai,'fake-xai-secret');assert.equal(JSON.parse(await readFile(path.join(s.dir,'settings.json'),'utf8')).youtubeKey,'youtube-retained');
 assert.equal((await s.req('/api/ai/keys','PUT',{gemini:''})).status,200);assert.equal(JSON.parse(await readFile(path.join(s.dir,'ai-keys.json'),'utf8')).gemini,'fake-gemini-secret');
 assert.equal((await s.req('/api/ai/keys','PUT',{gemini:{bad:true}})).status,400);
 }finally{await s.stop();}
});
test('direct mode without keys returns an actionable error without using configured gateway',async()=>{
 const s=await boot({}, {settings:{aiMode:'direct',model:'gemini/test-model'}});
 try{const r=await s.req('/api/test','POST',{});assert.equal(r.status,503);assert.match(r.body.error,/missing_key/);}finally{await s.stop();}
});
