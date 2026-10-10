import test from 'node:test';
import assert from 'node:assert/strict';
import { createNicheAPI, normalizeShelfChecks } from './niche-api.mjs';
import { findTemplate, validateTopics, lockedNiche } from './rx.mjs';
const now=Date.now(), id='survey-test';
const fixture=()=>['a','b','c'].flatMap(ch=>Array.from({length:30},(_,i)=>({id:ch+i,channelId:ch,channelTitle:ch,title:`Entire history of ${i} ${ch}`,views:30000+i*100,publishedAt:new Date(now-(100+i)*86400000).toISOString(),duration:300,format:'long'})));
function harness(videos=fixture(), adapters={}){
 let state={revision:0,surveys:[{id,market:'US',language:'en',format:'long',angle:'How choices change institutions',videos}]};
 const api=createNicheAPI({getState:()=>state,updateState:async(expected,mutate)=>{assert.equal(expected,state.revision);const next=structuredClone(state),result=mutate(next);next.revision++;state=next;return{...result,revision:state.revision};},youtube:async()=>{throw Error('Live API unexpectedly called');},videoDetails:async()=>[],generate:async()=>{throw Error('AI unexpectedly called');},...adapters});
 const act=(stage,extra={})=>api.act(stage,{surveyId:id,mode:'import',confirmComplete:true,...extra});
 return {api,act,state:()=>state};
}
async function prepare(h){await h.act('field',{market:'US',language:'en',format:'long'});await h.act('template',{channel:'a',angle:'Original angle'});return h.act('shelf');}
test('below the title minimum is not a template; exact 50% is not a template; empty template cannot validate topics',()=>{
 assert.equal(findTemplate(Array(9).fill('Entire history of one')).complete,false);
 assert.equal(findTemplate([]).complete,false);
 assert.equal(findTemplate([...Array(10).fill('Entire history of one'),...Array(10).fill('Something different now')]).template,null);
 assert.equal(validateTopics(Array.from({length:20},(_,i)=>'Topic '+i),[],'').passed,false);
});
test('API refuses nonexistent surveys, skips and falsified passed values',async()=>{
 const h=harness();await assert.rejects(h.api.act('probe',{surveyId:'absent',passed:true}),e=>e.status===404);
 await assert.rejects(h.act('probe',{passed:true,samples:Array(3).fill(Array(20).fill(50000))}),e=>e.status===409);
});
test('three complete channels must repeat the same template; five old videos suffice independently of hit count',async()=>{
 const h=harness();const shelf=await prepare(h);assert.equal(shelf.survey.nicheFlow.shelf.passed,true);assert.equal(shelf.survey.nicheFlow.shelf.count,3);
 const bad=harness(fixture().map(v=>v.channelId==='c'?{...v,title:'Different new format '+v.id}:v));assert.equal((await prepare(bad)).survey.nicheFlow.shelf.passed,false);
 const sparse=harness(fixture().filter(v=>v.channelId!=='c'||Number(v.id.slice(1))<9));assert.equal((await prepare(sparse)).survey.nicheFlow.shelf.passed,false,'dưới ngưỡng tiêu đề tối thiểu thì không tìm được khuôn');
});
test('full offline workflow validates groups, three 20-result probes, topics, lock and invalidation',async()=>{
 const h=harness();await prepare(h);const videos=h.state().surveys[0].nicheFlow.shelf.videos;
 const groups=Array.from({length:4},(_,i)=>({name:'Group '+i,angle:'Angle '+i,videoIds:videos.filter((_,j)=>j%4===i).map(v=>v.id)}));
 await h.act('groups',{groups});await assert.rejects(h.act('probe',{samples:Array(3).fill(Array(20).fill(50000))}),e=>e.status===409);
 const result=await h.act('groups',{groupId:'group-0'});assert.equal(result.survey.nicheFlow.groups.chosen,'group-0');
 const samples=Array.from({length:3},()=>Array.from({length:20},(_,i)=>i<11?20001:20000));
 assert.equal((await h.act('probe',{samples})).survey.nicheFlow.probe.passed,true);
 const wrong=await h.act('topics',{titles:Array(20).fill('Entire history of duplicate')});assert.equal(wrong.survey.nicheFlow.topics.passed,false);
 const titles=Array.from({length:20},(_,i)=>`Entire history of new institution ${i}`);
 const done=await h.act('topics',{titles});assert.equal(done.nextStage,'done');assert.deepEqual(done.survey.lockedNiche.topics,titles);
 const lock=lockedNiche({niche:done.survey.nicheFlow});assert.throws(()=>lock.topics.push('overwrite'),TypeError);
 await h.act('field',{market:'VN',language:'vi',format:'long'});assert.equal(h.state().surveys[0].lockedNiche,undefined);assert.equal(h.state().surveys[0].nicheFlow.template,undefined);
});
// ---- B2: so sánh khuôn giữa các kênh theo "chứa", không theo bằng nhau ----

// Mỗi kênh 20 video đủ tuổi, trung vị 30.000 view. Tiêu đề do `make` sinh ra.
function shelfFixture(make){
 const n=Date.now();
 return ['a','b','c','d'].flatMap(ch=>Array.from({length:20},(_,i)=>({
  id:ch+i,channelId:ch,channelTitle:ch,title:make(ch,i)+' '+i,views:30000+i,
  publishedAt:new Date(n-(200+i)*86400000).toISOString(),duration:300,format:'long',
 })));
}
test('B2 · kênh lặp cụm DÀI HƠN khuôn vẫn tính cùng khuôn; kênh lặp khuôn khác bị loại kèm lý do',async()=>{
 // a rút ra khuôn ngắn; b và d lặp cụm dài hơn nhưng vẫn BẮT ĐẦU bằng khuôn đó.
 const videos=shelfFixture(ch=>({a:`The Entire History of ${ch}`,b:`The Entire History of Ancient ${ch}`,c:`The Rise and Fall of Empire ${ch}`,d:`The Entire History of Medieval ${ch}`}[ch]));
 const h=harness(videos);
 await h.act('field',{market:'US',language:'en',format:'long'});
 const t=await h.act('template',{channel:'a',angle:'Original angle'});
 assert.equal(t.survey.nicheFlow.template.value,'the entire history of');
 const shelf=(await h.act('shelf')).survey.nicheFlow.shelf;
 const by=Object.fromEntries(shelf.channels.map(c=>[c.channelId,c]));
 assert.equal(by.a.sameTemplate,true);
 assert.equal(by.b.sameTemplate,true,'khuôn dài hơn nhưng chứa khuôn thì vẫn cùng khuôn');
 assert.equal(by.d.sameTemplate,true,'khuôn dài hơn nhưng chứa khuôn thì vẫn cùng khuôn');
 assert.equal(by.c.sameTemplate,false);
 assert.match(by.c.reason,/the rise and fall of/,'phải nói rõ kênh đó lặp khuôn nào');
 assert.equal(shelf.count,3);
 assert.equal(shelf.passed,true);
 // Khuôn phát hiện ở từng kênh phải được trả về để người dùng đối chiếu.
 assert.match(by.b.template.template,/^the entire history of ancient/,'khuôn dài hơn vẫn chứa khuôn đã chốt');
 assert.match(by.c.template.template,/^the rise and fall of/);
});
test('B3 · kho chỉ chứa video MANG KHUÔN; video nóng không mang khuôn không được tính vào',async()=>{
 const n=Date.now();
 const plain=(ch,count,views,age,title)=>Array.from({length:count},(_,i)=>({
  id:`${ch}${age}${i}`,channelId:ch,channelTitle:ch,title:title(_,i),views:views+i,
  publishedAt:new Date(n-(age+i)*86400000).toISOString(),duration:300,format:'long',
 }));
 const videos=[
  // 2 kênh sạch: mọi video đều mang khuôn.
  ...plain('a',20,30000,200,(_,i)=>`The Entire History of Empire ${i}`),
  ...plain('b',20,30000,200,(_,i)=>`The Entire History of Empire Ancient ${i}`),
  // Kênh d: 20 video mới nhất mang khuôn (đủ tìm khuôn), 25 video CŨ hơn
  // không mang khuôn nhưng view gấp 10 lần. Nếu không lọc, chúng kéo trung vị
  // lên 300.002 và làm bội số sai.
  ...plain('d',20,30000,200,(_,i)=>`The Entire History of Empire Medieval ${i}`),
  ...plain('d',25,300000,1000,(_,i)=>`Completely Different Subject ${i}`),
 ];
 const h=harness(videos);
 await h.act('field',{market:'US',language:'en',format:'long'});
 await h.act('template',{channel:'a',angle:'x'});
 const shelf=(await h.act('shelf')).survey.nicheFlow.shelf;
 assert.equal(shelf.passed,true);
 const d=shelf.channels.find(c=>c.channelId==='d');
 assert.equal(d.matureCount,20,'chỉ tính video mang khuôn');
 assert.equal(d.median,30009.5,`trung vị phải tính trên video mang khuôn, thấy ${d.median}`);
 assert.equal(d.videos.length,20);
 assert.ok(d.videos.every(v=>/^the entire history of empire medieval/i.test(v.title)),'kho không được chứa video không mang khuôn');
 assert.ok(d.videos.every(v=>v.multiple>0.9&&v.multiple<1.1),`bội số phải quanh 1, thấy ${d.videos[0].multiple}`);
 assert.equal(d.videos.filter(v=>v.views>=300000).length,0,'video nóng không mang khuôn không được vào kho');
 // Kho gộp cũng phải sạch.
 const pooled=shelf.videos;
 assert.equal(pooled.length,60);
 assert.ok(pooled.every(v=>!/^completely different subject/i.test(v.title)));
});
test('B4 · 20 video có 7 Shorts xen kẽ vẫn tìm được khuôn từ phần video dài',async()=>{
 const n=Date.now();
 const long=Array.from({length:13},(_,i)=>({id:'L'+i,channelId:'a',channelTitle:'a',title:`The Entire History of Empire ${i}`,views:30000,publishedAt:new Date(n-(200+i)*86400000).toISOString(),duration:600,format:'long'}));
 const short=Array.from({length:7},(_,i)=>({id:'S'+i,channelId:'a',channelTitle:'a',title:`Shorts random number ${i}`,views:900000,publishedAt:new Date(n-(2+i)*86400000).toISOString(),duration:50,format:'short'}));
 // Xen kẽ để Shorts nằm xen giữa các tiêu đề mới nhất.
 const videos=[];for(let i=0;i<13;i++){videos.push(long[i]);if(i<short.length)videos.push(short[i]);}
 const h=harness(videos);
 await h.act('field',{market:'US',language:'en',format:'long'});
 const r=await h.act('template',{channel:'a',angle:'x'});
 const t=r.survey.nicheFlow.template;
 assert.equal(t.passed,true,'Shorts phải bị loại trước khi đếm khuôn');
 assert.equal(t.value,'the entire history of empire');
 assert.equal(t.result.total,13,'Shorts không được tính vào 20 tiêu đề xét khuôn');
 // Không Shorts nào lọt vào danh sách tiêu đề đã xét.
 assert.ok(t.result.titles.every(x=>!/^Shorts random/.test(x)));
});
test('B4 · kênh 14 video hợp lệ vẫn tìm được khuôn; kênh 6 video báo thiếu dữ liệu',async()=>{
 const mk=(n2)=>Array.from({length:n2},(_,i)=>({id:'a'+i,channelId:'a',channelTitle:'a',title:`The Entire History of Empire ${i}`,views:30000,publishedAt:new Date(Date.now()-(200+i)*86400000).toISOString(),duration:600,format:'long'}));
 const ok=harness(mk(14));
 await ok.act('field',{market:'US',language:'en',format:'long'});
 const good=(await ok.act('template',{channel:'a',angle:'x'})).survey.nicheFlow.template;
 assert.equal(good.passed,true); assert.equal(good.value,'the entire history of empire');
 const thin=harness(mk(6));
 await thin.act('field',{market:'US',language:'en',format:'long'});
 const bad=(await thin.act('template',{channel:'a',angle:'x'})).survey.nicheFlow.template;
 assert.equal(bad.passed,false); assert.equal(bad.value,null);
 assert.match(bad.result.reason,/Cần ít nhất 10 tiêu đề/);
});
// ---- B5: chế độ live tìm kênh bằng VIDEO có khuôn ----

const uc = n => 'UC' + String(n).padStart(22, '0');
// Mỗi kênh trả 20 video nội dung, mọi tiêu đề cùng mang khuôn "the entire history of".
const liveCatalog = hits => async (endpoint, params) => {
  if (endpoint === 'search') return { items: hits.map((cid, i) => ({ id: { videoId: 'v' + i }, snippet: { channelId: cid } })) };
  if (endpoint === 'channels') return { items: [{ id: params.id || params.forHandle, snippet: { title: 'Kênh ' + (params.id || params.forHandle) }, contentDetails: { relatedPlaylists: { uploads: 'up' } } }] };
  if (endpoint === 'playlistItems') return { items: Array.from({ length: 20 }, (_, i) => ({ contentDetails: { videoId: (params.playlistId || 'x') + i } })) };
  throw Error(endpoint);
};
const liveVideos = ids => ids.map((id, i) => ({
  id, channelId: 'UC' + id.replace(/\D/g, '').slice(0, 22).padEnd(22, '0'), channelTitle: 'K',
  title: `The Entire History of ${['Rome', 'Japan', 'Egypt'][i % 3]} part ${i}`,
  views: 30000, publishedAt: new Date(Date.now() - (200 + i) * 86400000).toISOString(), duration: 600, format: 'long',
}));

test('B5 · chế độ live tìm kênh bằng VIDEO có khuôn trong ngoặc kép, loại trùng channelId',async()=>{
 const calls=[];
 const wrap=async(ep,p)=>{calls.push({endpoint:ep,params:p});return liveCatalog([uc(1),uc(1),uc(2),uc(1),uc(3)])(ep,p);};
 const h=harness([],{youtube:wrap,videoDetails:liveVideos});
 await h.act('field',{market:'VN',language:'vi',format:'long'});
 await h.act('template',{mode:'live',channel:uc(99),angle:'x'});
 const r=await h.act('shelf',{mode:'live'});
 const search=calls.filter(c=>c.endpoint==='search');
 assert.equal(search.length,1);
 const q=search[0].params;
 assert.equal(q.type,'video','phải tìm theo TIÊU ĐỀ video, không theo tên kênh');
 assert.equal(q.q,'"the entire history of"','truy vấn phải có khuôn trong ngoặc kép');
 assert.equal(q.maxResults,'50');
 assert.equal(q.publishedAfter,`${new Date().getFullYear()}-01-01T00:00:00Z`);
 assert.equal(q.regionCode,'VN');
 assert.equal(q.relevanceLanguage,'vi');
 // Không tìm channel nữa.
 assert.ok(calls.every(c=>!(c.endpoint==='search'&&c.params.type==='channel')));
 // channelId trùng bị gộp, kênh dẫn đường ưu tiên đứng đầu.
 assert.deepEqual(r.survey.nicheFlow.shelf.channels.map(c=>c.channelId),[uc(99),uc(1),uc(2),uc(3)]);
});
test('B5 · chế độ live không cào quá 10 kênh',async()=>{
 const calls=[];
 const hits=Array.from({length:50},(_,i)=>uc(i));
 const wrap=async(ep,p)=>{calls.push({endpoint:ep,params:p});return liveCatalog(hits)(ep,p);};
 const h=harness([],{youtube:wrap,videoDetails:liveVideos});
 await h.act('field',{market:'US',language:'en',format:'long'});
 await h.act('template',{mode:'live',channel:uc(99),angle:'x'});
 const truoc=calls.filter(c=>c.endpoint==='channels').length;
 const r=await h.act('shelf',{mode:'live'});
 const ids=r.survey.nicheFlow.shelf.channels.map(c=>c.channelId);
 assert.equal(ids.length,10);
 assert.equal(ids[0],uc(99));
 assert.equal(new Set(ids).size,10,'không có channelId lặp');
 assert.equal(calls.filter(c=>c.endpoint==='channels').length-truoc,10,'đúng 10 lần gọi channels ở bước kho');
});
test('B6 · bước chủ đề loại thực thể đã có trong kho dù tiêu đề khác nhau',async()=>{
 const h=harness(fixture());await prepare(h);
 const videos=h.state().surveys[0].nicheFlow.shelf.videos;
 const norm=s=>String(s).normalize('NFC').toLowerCase().trim().replace(/\s+/g,' ');
 await h.act('groups',{groups:Array.from({length:4},(_,i)=>({name:'G'+i,videoIds:videos.filter((_,j)=>j%4===i).map(v=>v.id)}))});await h.act('groups',{groupId:'group-0'});
 await h.act('probe',{samples:Array.from({length:3},()=>Array.from({length:20},(_,i)=>i<11?20001:20000))});
 // Lấy một tiêu đề THẬT của kho rồi thêm hậu tố: tiêu đề khác hẳn nên so
 // khớp nguyên văn không bắt được, chỉ so thực thể mới bắt được.
 const mau=videos.find(v=>/ 5 a$/.test(v.title)).title;
 assert.ok(mau,'cần ít nhất một tiêu đề kho');
 const trung=Array.from({length:20},(_,i)=>`${mau} Revisited ${i}`);
 assert.ok(!videos.some(v=>norm(v.title)===norm(trung[0])),'tiêu đề thử phải khác hẳn tiêu đề trong kho');
 assert.equal((await h.act('topics',{titles:trung})).survey.nicheFlow.topics.passed,false,'thực thể đã có trong kho phải bị loại');
 const ok=Array.from({length:20},(_,i)=>'Entire history of New Subject '+i);
 const done=await h.act('topics',{titles:ok});
 assert.equal(done.survey.nicheFlow.topics.passed,true,(done.survey.nicheFlow.topics.errors||[]).join(' | '));
 assert.equal(done.survey.nicheFlow.topics.chosen.length,20);
});
test('B6 · chủ đề AI trả về được sắp theo knownBy rồi mới lấy 20',async()=>{
 const h=harness(fixture(),{generate:async()=>({output:{topics:[
  // 12 chủ đề "thấp" đứng trước 8 chủ đề "cao". Phải cắt theo mức độ nổi tiếng.
  ...Array.from({length:12},(_,i)=>({title:`Entire history of Low Topic ${i}`,knownBy:'thấp'})),
  ...Array.from({length:8},(_,i)=>({title:`Entire history of High Topic ${i}`,knownBy:'cao'})),
 ]}})});
 await prepare(h);
 const videos=h.state().surveys[0].nicheFlow.shelf.videos;
 await h.act('groups',{groups:Array.from({length:4},(_,i)=>({name:'G'+i,videoIds:videos.filter((_,j)=>j%4===i).map(v=>v.id)}))});await h.act('groups',{groupId:'group-0'});
 await h.act('probe',{samples:Array.from({length:3},()=>Array.from({length:20},(_,i)=>i<11?20001:20000))});
 const done=await h.act('topics');
 const chosen=done.survey.nicheFlow.topics.chosen;
 assert.equal(done.survey.nicheFlow.topics.passed,true,(done.survey.nicheFlow.topics.errors||[]).join(' | '));
 assert.equal(chosen.length,20);
 assert.equal(chosen.filter(t=>/High Topic/.test(t)).length,8);
 assert.ok(chosen.slice(0,8).every(t=>/High Topic/.test(t)),'8 chủ đề cao phải nằm TRƯỚC 12 chủ đề thấp');
 assert.equal(chosen[8],'Entire history of Low Topic 0');
});
test('B7 · bước chia nhóm gợi ý 3 câu gõ thử từ nhóm bội số trung vị cao nhất',async()=>{
 const mk=(ch,views)=>Array.from({length:30},(_,i)=>({id:ch+i,channelId:ch,channelTitle:ch,title:`Entire history of ${i} ${ch}`,views:typeof views==='function'?views(i):views,publishedAt:new Date(now-(100+i)*86400000).toISOString(),duration:300,format:'long'}));
 // Kênh a có 15 video nóng (view tụt dần) + 15 video nguội; b và c đều phẳng.
 const h=harness([...mk('a',i=>i<15?200000-i*5000:20000),...mk('b',30000),...mk('c',30000)]);
 await prepare(h);
 const shelf=h.state().surveys[0].nicheFlow.shelf.videos;
 const a=shelf.filter(v=>v.channelId==='a');
 const groups=[
  {name:'Nong',videoIds:a.filter(v=>v.multiple>1).map(v=>v.id)},
  {name:'Nguoi',videoIds:a.filter(v=>v.multiple<=1).map(v=>v.id)},
  {name:'B',videoIds:shelf.filter(v=>v.channelId==='b').map(v=>v.id)},
  {name:'C',videoIds:shelf.filter(v=>v.channelId==='c').map(v=>v.id)},
 ];
 const g=(await h.act('groups',{groups})).survey.nicheFlow.groups;
 assert.equal(g.passed,true);
 // 3 câu gõ thử lấy từ nhóm Nong (trung vị bội số cao nhất), theo bội số giảm dần.
 assert.deepEqual(g.suggestedQueries,['entire history of 0 a','entire history of 1 a','entire history of 2 a']);
 // Chọn nhóm vẫn giữ nguyên gợi ý.
 const chon=(await h.act('groups',{groupId:'group-0'})).survey.nicheFlow.groups;
 assert.equal(chon.chosen,'group-0');
 assert.deepEqual(chon.suggestedQueries,g.suggestedQueries);
});
test('probe missing results and invalid views cannot pass',async()=>{
 const h=harness();await prepare(h);const videos=h.state().surveys[0].nicheFlow.shelf.videos;
 await h.act('groups',{groups:Array.from({length:4},(_,i)=>({name:'G'+i,videoIds:videos.filter((_,j)=>j%4===i).map(v=>v.id)}))});await h.act('groups',{groupId:'group-0'});
 const partial=await h.act('probe',{samples:[Array(19).fill(50000),Array(20).fill(50000),Array(20).fill(50000)]});assert.equal(partial.survey.nicheFlow.probe.passed,false);
 await assert.rejects(h.act('probe',{samples:[Array(20).fill(-1),Array(20).fill(50000),Array(20).fill(50000)]}));
});
test('channel pagination reaches older uploads beyond latest50; blind grouping reveals only id/title',async()=>{
 let calls=0, observed;
 const h=harness(fixture(),{youtube:async(endpoint,params)=>{if(endpoint==='channels')return{items:[{id:'UC'+'a'.repeat(22),snippet:{title:'A'},contentDetails:{relatedPlaylists:{uploads:'uploads'}}}]};if(endpoint==='playlistItems'){calls++;return{items:Array.from({length:calls===1?50:10},(_,i)=>({contentDetails:{videoId:'v'+((calls-1)*50+i)}})),...(calls===1?{nextPageToken:'second'}:{})};}throw Error(endpoint);},videoDetails:async(ids)=>ids.map((vid,i)=>({...fixture()[0],id:vid,publishedAt:new Date(now-i*86400000).toISOString()})),generate:async(b)=>{observed=b.context;const vs=b.context.videos;return{output:{groups:Array.from({length:4},(_,i)=>({name:'G'+i,videoIds:vs.filter((_,j)=>j%4===i).map(v=>v.id)}))}};}});
 const cat=await h.api.catalog('UC'+'a'.repeat(22));assert.equal(cat.pages,2);assert.equal(cat.videos.length,60);assert.equal(cat.complete,true);
 await prepare(h);await h.act('groups');assert.ok(observed.videos.every(v=>Object.keys(v).sort().join(',')==='id,title'));
});

test('reference analysis accepts no angle; shelf requires a chosen angle',async()=>{
 const h=harness(); h.state().surveys[0].angle='';
 await h.act('field',{market:'US',language:'en',format:'long'});
 const result=await h.act('template',{channel:'a'});
 assert.equal(result.survey.nicheFlow.template.passed,true);
 assert.equal(result.survey.nicheFlow.template.angle,'');
 await assert.rejects(h.act('shelf'),e=>e.status===400&&/góc kể/.test(e.message));
 await h.act('template',{channel:'a',angle:'My selected angle'});
 assert.equal((await h.act('shelf')).survey.nicheFlow.shelf.passed,true);
});

test('angle proposals use only analyzed titles and provider failure preserves template',async()=>{
 let context; const h=harness(fixture(),{generate:async request=>{context=request;return{output:{angles:[{angle:'Why institutions change',reason:'Title evidence'}]}};}});
 await h.act('field',{market:'US',language:'en',format:'long'});
 const value=(await h.act('template',{channel:'a',suggestAngles:true})).survey.nicheFlow.template;
 assert.equal(context.action,'angles');assert.deepEqual(context.context.titles,value.examples);
 assert.equal(value.angleSuggestions[0].angle,'Why institutions change');
 const failed=harness();await failed.act('field',{market:'US',language:'en',format:'long'});
 const fallback=(await failed.act('template',{channel:'a',suggestAngles:true})).survey.nicheFlow.template;
 assert.equal(fallback.passed,true);assert.match(fallback.angleSuggestionError,/tự nhập/);
});

test('shelf accepts three matching templates despite low views and young videos, retaining metric warnings',async()=>{
 const h=harness(fixture().map(v=>v.channelId==='b'?{...v,views:1254}:v.channelId==='c'?{...v,publishedAt:new Date(now-10*86400000).toISOString()}:v));const result=(await prepare(h)).survey.nicheFlow.shelf;assert.equal(result.count,3);assert.equal(result.passed,true);assert(result.channels.every(c=>c.pass));assert.equal(result.channels.find(c=>c.channelId==='b').metricsPassed,false);assert.match(result.channels.find(c=>c.channelId==='b').reason,/20000/);assert.equal(result.channels.find(c=>c.channelId==='c').matureCount,0);assert(result.videos.some(v=>v.channelId==='b'));assert(result.videos.some(v=>v.channelId==='c'));assert.equal(h.state().surveys[0].nicheFlow.shelf.passed,true);
});

test('saved shelf migration unlocks matching channels and preserves downstream data',()=>{
 const state={surveys:[{nicheFlow:{shelf:{channels:['a','b','c'].map(channelId=>({channelId,sameTemplate:true,pass:channelId==='a'})),videos:[{id:'retained'}],passed:false,count:1},groups:{chosen:'history'}}}]};
 normalizeShelfChecks(state);
 const flow=state.surveys[0].nicheFlow;
 assert.equal(flow.shelf.passed,true);assert.equal(flow.shelf.count,3);
 assert.equal(flow.shelf.channels[1].metricsPassed,false);
 assert.deepEqual(flow.shelf.videos,[{id:'retained'}]);assert.equal(flow.groups.chosen,'history');
 const snapshot=JSON.stringify(state);normalizeShelfChecks(state);assert.equal(JSON.stringify(state),snapshot);
});

test('shelf baseline uses mature videos only and all-new channels have no multiples',async()=>{
 const h=harness(fixture().map(v=>v.channelId==='b'?{...v,views:Number(v.id.slice(1))<10?9000000:100,publishedAt:new Date(now-(Number(v.id.slice(1))<10?10:100)*86400000).toISOString()}:v.channelId==='c'?{...v,publishedAt:new Date(now-10*86400000).toISOString()}:v));
 const shelf=(await prepare(h)).survey.nicheFlow.shelf;assert.equal(shelf.count,3);assert.equal(shelf.passed,true);
 const b=shelf.channels.find(c=>c.channelId==='b'),c=shelf.channels.find(c=>c.channelId==='c');assert.equal(b.baseline,100);assert.equal(c.baseline,null);assert.equal(c.tier,'chỉ cùng khuôn');assert.equal(shelf.channels[0].tier,'chuẩn thước');
 assert(shelf.videos.filter(v=>v.channelId==='c').every(v=>v.multiple===null&&v.newVideo===true));assert(shelf.videos.filter(v=>v.channelId==='b'&&!v.newVideo).every(v=>v.multiple===1));
});
test('legacy shelf migration records affected channels and a stable notice instead of silent changes',()=>{
 const shelf={channels:[{channelId:'a',sameTemplate:true,pass:true},{channelId:'b',sameTemplate:true,pass:false},{channelId:'c',sameTemplate:true,pass:false}],videos:[],passed:false,count:1};const state={surveys:[{nicheFlow:{shelf}}]};normalizeShelfChecks(state);
 assert.equal(shelf.channels[1].migratedFromStrict,true);assert.equal(shelf.channels[0].migratedFromStrict,undefined);assert.match(shelf.migrationNotice,/2 kênh trước đây bị loại giờ được tính/);assert.equal(shelf.passed,true);const first=JSON.stringify(state);normalizeShelfChecks(state);assert.equal(JSON.stringify(state),first);
});
