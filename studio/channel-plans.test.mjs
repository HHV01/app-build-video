import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTichChannelSample,writeChannelScript,fillTemplate,assemblePlannedScript,movePlan,renderChannelPlans} from './public/channel-plans.mjs';
import {scenePromptRows,scenePromptsText} from './public/scene-prompts.mjs';
import {scriptPartContext} from './public/research-context.mjs';
const count=s=>s.trim().split(/\s+/).filter(Boolean).length;
const mock=async(action,c)=>action==='planSegment'?c.kind==='template'?{fills:{chủ_đề:'tiền bạc',cảnh_mở_đầu:'một quán nhỏ'}}:{text:Array(c.maxWords).fill('bạn').join(' '),fixed:'AI rewritten fixed'}:{narration:Array(c.targetWords).fill('tiền').join(' '),editorNotes:[]};
test('plans retain verbatim boundaries, template literals, exact word budget and separate end SFX',async()=>{
 const c={};loadTichChannelSample(c);const fixed=c.closingPlan.at(-1).text;const p={topic:'Tiền',minutes:6,outline:[{title:'Cơ chế',share:1}],researchSummary:'EXTRA_PRIVATE_RESEARCH',sources:[{text:'EXTRA_PRIVATE_SOURCE'}],includeCTA:true};const calls=[];
 await writeChannelScript(c,p,{generate:async(a,ctx)=>{calls.push({a,ctx});return mock(a,ctx);},save:async()=>{}});
 assert(p.narration.startsWith(Array(130).fill('bạn').join(' ')));assert(p.narration.includes(c.openingPlan[1].text));assert(p.narration.includes('Hôm nay chúng ta sẽ cùng bóc tách tiền bạc. Bắt đầu từ một quán nhỏ.'));assert(p.narration.endsWith(fixed));assert(!p.narration.includes('Yeah'));assert(Math.abs(count(p.narration)-900)<=45);
 for(const call of calls.filter(x=>x.a==='planSegment')){assert(!JSON.stringify(call).includes(c.openingPlan[1].text));assert(!JSON.stringify(call).includes(fixed));assert.doesNotMatch(JSON.stringify(call),/EXTRA_PRIVATE/);}
 for(const call of calls.filter(x=>x.a==='script'))assert.equal(call.ctx.includeCTA,false);
 const words=p.narration.split(/\s+/);p.scenes=[{index:1,narration:words.slice(0,-20).join(' '),prompt:'Objects.',sfx:'',characters:[],noCharacter:true},{index:2,narration:words.slice(-20).join(' '),prompt:'Objects.',sfx:'',characters:[],noCharacter:true}];assert.equal(scenePromptRows(c,p)[1].sfx,'Yeah! (hiệu ứng cuối video)');assert(scenePromptsText(c,p,'csv').includes('Yeah! (hiệu ứng cuối video)'));
 const n=count(p.narration);p.planResult.closing.at(-1).sfx='';assemblePlannedScript(p);assert.equal(count(p.narration),n);p.planResult.opening[1].text='AI rewrite';assemblePlannedScript(p);assert(p.narration.includes(c.openingPlan[1].text));
});
test('template over budget is blocked; editor reorders plans and previews literal text',()=>{assert.throws(()=>fillTemplate({kind:'template',text:'Hello {name}.',slots:{name:2}},{name:'one two three'}),/2/);const c={};loadTichChannelSample(c);const first=c.openingPlan[0];movePlan(c,'openingPlan',0,1);assert.equal(c.openingPlan[1],first);const html=renderChannelPlans(c,{esc:String,btn:(t)=>t});assert(html.includes(c.openingPlan[0].text));assert(html.includes('maxWords'));});
test('channel without plans retains old CTA and script context',()=>{const ctx=scriptPartContext({}, {includeCTA:true}, {focus:{},targetWords:100},0,1);assert.equal(ctx.includeCTA,true);const c={closingPlan:[{kind:'fixed',text:'Bye'}]};assert.equal(scriptPartContext(c,{includeCTA:true},{focus:{},targetWords:100},0,1).includeCTA,false);});

test('planned script resumes completed segments after network failure, enforces body budget without altering fixed text',async()=>{
 const c={openingPlan:[{kind:'fixed',text:'Original intro.'},{kind:'ai',instruction:'Hook',maxWords:5}],closingPlan:[{kind:'fixed',text:'Original ending.'}]},p={topic:'Money',minutes:1,outline:[{title:'Mechanism',share:1}]};let fail=true,segments=0,bodyCalls=0;
 const generate=async(a,ctx)=>{if(a==='planSegment'){segments++;return {text:'A daily surprise.'};}bodyCalls++;if(fail)throw Error('network');return mock(a,ctx);};await assert.rejects(writeChannelScript(c,p,{generate,save:async()=>{}}),/network/);assert.equal(p.planDraft.opening.length,2);assert.equal(p.planDraft.closing.length,1);fail=false;await writeChannelScript(c,p,{generate,save:async()=>{}});assert.equal(segments,1);assert.equal(bodyCalls,2);assert(p.narration.startsWith('Original intro.\n\nA daily surprise.'));assert(p.narration.endsWith('Original ending.'));assert.equal(count(p.narration),150);
 p.planResult.opening[0].text='Model changed greeting.';p.planResult.closing[0].text='Model changed ending.';assemblePlannedScript(p);assert(p.narration.startsWith('Original intro.'));assert(p.narration.endsWith('Original ending.'));
});

test('fixed and template word costs are deducted from the first and last section targets',async()=>{
 const c={openingPlan:[{kind:'fixed',text:'One two three.'}],closingPlan:[{kind:'fixed',text:'Final words.'}]},p={topic:'Money',minutes:2,outline:[{title:'First',share:.5},{title:'Last',share:.5}]},targets=[];await writeChannelScript(c,p,{save:async()=>{},generate:async(a,ctx)=>{targets.push(ctx.targetWords);return mock(a,ctx);}});assert.deepEqual(targets,[147,148]);assert.equal(count(p.narration),300);
});
