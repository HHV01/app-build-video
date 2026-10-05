// In kết quả phân tích cho kho mẫu để kiểm tra cổng ngưỡng và bảng nhóm.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeChannels, analyzeGroups, videoPool } from '../studio/rx.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sample = JSON.parse(readFileSync(path.join(root, 'studio', 'fixtures', 'kho-mau-thu-nghiem.json'), 'utf8'));
const now = Date.parse(sample._now);

console.log('--- BẢNG KÊNH (cổng vừa)');
for (const c of analyzeChannels(sample.videos, { gate: sample.gate, now, template: sample.template }).channels) {
  console.log(`${c.gatePass ? 'xanh' : '----'}  ${c.name.padEnd(20)} vào khuôn ${String(c.templateVideos + '/' + c.totalVideos).padEnd(7)} đã ăn ${String(c.hits).padStart(2)}  trung ${Math.round(c.medianViews || 0).toLocaleString('vi-VN').padStart(12)}  ${c.gateReason}`);
}
const picked = analyzeChannels(sample.videos, { gate: sample.gate, now }).channels.filter(c => c.gatePass).map(c => c.id);
console.log(`\n--- KHO GỘP từ ${picked.length} kênh: ${videoPool(sample.videos, { gate: sample.gate, now, channelIds: picked }).length} video`);

console.log('\n--- BẢNG NHÓM');
const { groups, proximity } = analyzeGroups(sample.groups, sample.videos, { gate: sample.gate, now });
for (const g of groups) {
  console.log(`${g.gatePass ? 'đạt ' : 'rớt '} ${g.name.padEnd(36)} ${String(g.videos).padStart(2)} video · ${g.channels} kênh · ×${g.medianMultiple?.toFixed(2) ?? '—'}  ${g.gateReason}${g.clusterWarning ? '  ⚠ ' + g.clusterWarning : ''}`);
}
console.log('\n--- TÁCH THỬ');
for (const p of proximity) console.log(`  ${p.a} ↔ ${p.b} cách ${p.gap}`);