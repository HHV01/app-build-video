import test from 'node:test';
import assert from 'node:assert/strict';
import {tichBrand,finalizeScriptMetadata} from './public/script-policy.mjs';
import {scriptPartContext} from './public/research-context.mjs';
import {planSegmentContext} from './public/channel-plans.mjs';
import {writeCheckedPart} from './public/script-quality.mjs';

test('Tich intro invitation follows hook only in the first part and final CTA is mandatory for this profile',()=>{
 const c={name:'Tích Thông Thái'},p={includeCTA:false,outline:[]},part={focus:{},targetWords:200};
 const first=scriptPartContext(c,p,part,0,3),middle=scriptPartContext(c,p,part,1,3),last=scriptPartContext(c,p,part,2,3);
 assert.equal(first.openingCTA,true);assert.equal(first.includeCTA,false);assert.equal(middle.openingCTA,false);assert.equal(middle.includeCTA,false);assert.equal(last.includeCTA,true);
 assert.equal(last.channelBrand.tagline,'Chuyện quen. Góc nhìn lạ.');
 assert.equal(scriptPartContext({name:'Other'},p,part,0,1).channelBrand,undefined);
 assert.equal(tichBrand({name:'TICH THONG THAI'}).presenter,'Tích');
 const custom=scriptPartContext({...c,openingPlan:[{kind:'fixed'}],closingPlan:[{kind:'fixed'}]},p,part,0,1);assert.equal(custom.openingCTA,false);assert.equal(custom.includeCTA,false);
});

test('word count is actually measured and missing brand requirements are warnings outside narration',()=>{
 const c={name:'Tích Thông Thái'},p={narration:'Chào bạn, mình là Tích. Hãy đăng ký Tích Thông Thái.\n\nBạn nghĩ sao? Bình luận nhé. Hãy theo dõi kênh. Chuyện quen. Góc nhìn lạ.'};
 const before=p.narration;finalizeScriptMetadata(c,p);assert.equal(p.scriptMetrics.wordCount,before.trim().split(/\s+/).length);assert.equal(p.scriptMetrics.timing,'estimate');assert.equal(p.scriptMetrics.verification,'research-context-only');assert.deepEqual(p.scriptWarnings,[]);assert.equal(p.narration,before);
 const missing={narration:'Một câu chuyện chưa có kết.'};finalizeScriptMetadata(c,missing);assert(missing.scriptWarnings.length>=4);assert.equal(missing.narration,'Một câu chuyện chưa có kết.');
});

test('AI planned boundary preserves branded side and templates do not inherit boundary instructions',()=>{
 const base={kind:'ai',topic:'A shop',instruction:'Write the opening',maxWords:100,channelBrand:tichBrand({name:'Tích Thông Thái'}),boundary:'opening'};
 const ctx=planSegmentContext(base);assert.equal(ctx.boundary,'opening');assert.equal(ctx.channelBrand.presenter,'Tích');
 const other=planSegmentContext({...base,channelBrand:{channel:'Other'}});assert.equal(other.boundary,undefined);
 const template=planSegmentContext({kind:'template',slots:{topic:10},channelBrand:base.channelBrand,boundary:'opening'});assert.equal(template.boundary,undefined);
});

test('missing intro branding uses the same bounded repair budget and then surfaces warnings',async()=>{
 let calls=0;
 const text='Một cửa hàng đang cân nhắc thay đổi cách giao hàng trong tháng tới.';
 const context={channelBrand:tichBrand({name:'Tích Thông Thái'}),openingCTA:true,scriptPart:{index:1,count:3},targetWords:text.split(/\s+/).length};
 const result=await writeCheckedPart(async ctx=>{calls++;if(calls===2)assert.match(ctx.editorialCorrection,/Tích/);return {narration:text};},context);
 assert.equal(calls,2);assert.match(result.warning,/Giới thiệu/);assert.equal(result.narration,text);
});
