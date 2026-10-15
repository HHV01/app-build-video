import test from 'node:test';
import assert from 'node:assert/strict';
import {isGermanHistory} from './script-editorial.mjs';
import {scriptPartContext} from './public/research-context.mjs';
import {writeCheckedPart,repeatedNarration} from './public/script-quality.mjs';

const previous='Một người thợ bước vào xưởng và nhìn thấy chiếc máy đã dừng giữa ca làm việc. Người quản lý phải chọn sửa chiếc máy ngay hôm nay hay để cả nhóm tiếp tục làm thủ công trong tuần tới. Mỗi lựa chọn đều làm thay đổi cách phân chia công việc và thời gian giao hàng.';
const fresh='Buổi họp bắt đầu với bảng đơn hàng còn trống ở cuối tháng. Nhóm bán hàng cần tìm ra khách hàng nào đang chờ báo giá trước khi xưởng quyết định sản xuất loại sản phẩm tiếp theo. Thay vì đầu tư thêm thiết bị, họ thử thay đổi lịch liên hệ và cách xác nhận yêu cầu của từng đơn đặt hàng.';

test('routing retains one section across chunks and points to the next section without sending full scripts',()=>{
 const p={outline:[{title:'Choice'},{title:'Cost'},{title:'Result'}]};
 const first=scriptPartContext({},p,{focus:p.outline[1],segment:2,segmentPart:1,segmentParts:3,targetWords:200},2,7);
 assert.deepEqual(first.storyRoute,{beat:'setup',previous:'Choice',next:'Result',position:'3/7'});
 assert.equal(scriptPartContext({},p,{focus:{},segment:2,segmentPart:2,segmentParts:3},3,7).storyRoute.beat,'complication');
 assert.equal(scriptPartContext({},p,{focus:{},segment:2,segmentPart:3,segmentParts:3},4,7).storyRoute.beat,'consequence');
 assert.equal(isGermanHistory({topic:'Lịch sử nước Đức'}),true);assert.equal(isGermanHistory({topic:'Cash flow for a small shop'}),false);
});

test('repeated text gets one editorial correction and shares the retry with length correction',async()=>{
 let calls=0;const ctx={previousEnding:previous,targetWords:60};
 assert.equal(repeatedNarration(previous,ctx),true);assert.equal(repeatedNarration(fresh,ctx),false);
 const result=await writeCheckedPart(async context=>{calls++;if(calls===1)return {narration:previous+' '+previous};assert.ok(context.editorialCorrection);assert.ok(context.lengthCorrection);return {narration:fresh};},ctx);
 assert.equal(calls,2);assert.equal(result.narration,fresh);assert.doesNotMatch(result.warning||'',/còn lặp/);
});

test('persistent repetition is surfaced for review without an unlimited rewrite loop',async()=>{
 let calls=0;const result=await writeCheckedPart(async()=>{calls++;return {narration:previous};},{previousEnding:previous,targetWords:previous.split(/\s+/).length});
 assert.equal(calls,2);assert.match(result.warning,/còn lặp/);assert.equal(result.narration,previous);
});

test('short shared names and a brief callback do not trigger regeneration',async()=>{
 let calls=0;await writeCheckedPart(async()=>{calls++;return {narration:fresh};},{previousEnding:'Nhóm bán hàng trong xưởng.',targetWords:fresh.split(/\s+/).length});assert.equal(calls,1);
});
