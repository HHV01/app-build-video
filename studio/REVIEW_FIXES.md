# Nghiệm thu · Tìm ngách + Kịch bản (07/10/2026)

## E1 · UI bốn bước

Giữ tìm ngách, kênh/identity, tiêu đề/thumbnail, research, script, copy/TXT/Markdown, model/fallback và khóa YouTube Data API. Kịch bản kết thúc bằng Hoàn tất kịch bản. Dự án legacy clamp step về 3, approved giữ 0–3; không xóa scene/audio/build cũ. Audit tham chiếu trước gỡ helper; videoTable và hookTable được giữ. Test legacy state/UI đỏ trước sửa; 122 test xanh ở checkpoint E1.

## E2 · Server

Gỡ route media và đăng video, bỏ action scenes/animation, chỉ giữ scriptPlan trong production. Settings chỉ cập nhật model, fallback và youtubeKey; trường cũ vẫn đọc nhưng không dùng. Assets và Data API/catalog/cache/quota giữ nguyên. Test route bị gỡ/action bị từ chối đỏ trước sửa; 106 test xanh sau loại các test backend đã hết chức năng.

## E3 · Kiểm thử tương thích

Bỏ integration dựng video và ZIP. Giữ kiểm thử niche/YouTube Data API (bao gồm shelf live với adapter mock), scriptPlan, model/fallback, đồng bộ, clipboard và assets. Thêm state legacy giữ nguyên media, settings legacy khởi động và youtubeKey lưu được nhưng không lộ qua GET. Giữ kiểm thử HTTP static no-store. 106 test xanh, không skip.

## E4 · Tài liệu hiện tại

README gốc và Studio mô tả đúng tìm ngách + bốn bước tới kịch bản; giữ tạo khóa YouTube Data API. Tài liệu cũ chuyển sang REVIEW_FIXES_HISTORY.md để tránh dùng nhầm hướng dẫn đã bỏ. CI không cài binary dựng video. Test tài liệu đỏ trước sửa.

## E5 · Kiểm kê

FILE_REVIEW_INVENTORY.md chỉ liệt kê tools/*.png, scratch/, tmp/, docs/ocr/ và dung lượng; không xóa dữ liệu chờ duyệt.

## Giới hạn xác minh

Các test API dùng mock, không chứng minh quota/hoạt động YouTube hoặc model thật. Chưa nghiệm thu toàn chuỗi khảo sát live → kênh → research → script với dịch vụ thật. Dữ liệu cũ được giữ; assets có thể chuyển media nhúng sang file như cơ chế có sẵn. Lịch sử chi tiết ở REVIEW_FIXES_HISTORY.md.

Nghiệm thu giao diện thực tế: dự án Greece cũ chuyển từ Cảnh về Kịch bản (4/4), đủ nút hoàn tất/copy/TXT/Markdown; nút Copy báo thành công. Màn cài đặt còn model, fallback và khóa Data API. Chưa xác nhận tải file bằng browser automation (công cụ kiểm tra bị timeout), chưa chạy lại AI hoặc YouTube thật. Tổng 108test xanh, không skip.

F1: đưa facts/claims cùng trạng thái và cảnh báo vào ngữ cảnh viết. Kiểm chứng bằng test; chưa xác nhận với AI thật.

F2: mock 7 phần, nguồn 20.000 ký tự: tổng JSON context cũ 155.197 ký tự, mới 3.522 ký tự. Đây là độ dài ký tự trong fixture, không phải token hay chi phí thực. Chưa đo trên AI thật.

F3: bỏ nhánh STT và quota upload, context nhân vật và AI templates cũ. Giữ videoTable/hookTable và youtubeKey.

F5: lọc trùng theo giao tập từ khoá >=60%, bỏ ghi chú tên nguồn, ưu tiên ghi chú có số; tối đa 5. Test 7x3 ghi chú và directive/UI. Chưa đo chất lượng ghi chú với AI thật.

F4: test retry một lần, lọc nhãn cảnh/markdown và phát hiện cụm 5 từ trùng. Cảnh báo độ dài riêng với ghi chú kiểm chứng. Chưa kiểm chứng chất lượng thực tế với AI.

G1: parseChapters yêu cầu ít nhất 3 mốc, bắt đầu 0:00 và tăng dần. Metadata dùng chung cho videoDetails, niche và import. Test metadata/chương/state không description; chưa đối chiếu YouTube thật.

G2: hàm thuần titleDNA/tagStats và test nhóm đủ/thiếu mẫu. Lift là chênh lệch tỷ lệ (không suy luận nhân quả), dữ liệu mock; chưa đối chiếu YouTube thật.

G3: test render panel có/không đủ dữ liệu, copy bằng helper clipboard hiện có. Chưa nghiệm thu dữ liệu YouTube thật.

G6: test flags/title và giới hạn tag; kiểm tra theo code, không bảo đảm chất lượng/CTR. Chưa đối chiếu tiêu đề AI thật.

H1: test xoá không/có dự án, bắt buộc xác nhận, giữ khảo sát và hoàn tác đúng vị trí. mergeState không hồi sinh kênh đã xoá từ tab cũ. Chưa xoá dữ liệu thật để nghiệm thu; sẽ dùng kênh thử.

## F–H · Nghiệm thu ngày 07/10/2026

Đã hoàn thành 10 mục bắt buộc, mỗi mục một commit:

| Mục | Commit |
|---|---|
| F1 | 272cd8c |
| F2 | e2673cc |
| F3 | 947b4e9 |
| F5 | c8eacbd |
| F4 | 74a3956 |
| G1 | a2fa7e7 |
| G2 | 25885cf |
| G3 | 919b2c9 |
| G6 | a83d3a4 |
| H1 | 5a4993d |

Test mới được chạy đỏ trước khi thêm hàm/sửa hành vi từng mục. Các commit cuối đều được kiểm tra bằng npm run studio:test. Tổng cuối: 131 test xanh, không skip (23 ca thêm so với nền E1–E5).

### Số đo F2

Mock HTTP gateway ghi lại toàn bộ nội dung messages gửi đi, 7 phần với sources dài 20.000 ký tự: snapshot context cũ 169.183 ký tự prompt; context mới 15.170 ký tự prompt. Đo bằng test F2 trong server.test.mjs. Số đo JSON context riêng ở mục F2 bên trên là fixture khác (155.197 / 3.522). Không quy đổi thành token, tiền hoặc cam kết tỷ lệ tiết kiệm trên dữ liệu thật.

### Kiểm tra giao diện

Bản chạy độc lập ở cổng 3231, dữ liệu trong tmp/script-qa-20261007, mock AI và kho nhập giả lập (3 kênh x 20 video). Đã bấm qua: phân tích khuôn > kiểm tra kho > nhóm JSON > ba mẫu nhu cầu > chốt 20 chủ đề > dựng kênh > tạo dự án > title/tag > thêm nguồn > Research > dàn ý > script > kiểm tra lặp > hoàn tất > copy. Copy script, DNA và tag báo thành công. Công tắc ẩn ghi chú giữ sau tải lại; ghi chú chỉ ở một ô thu gọn. Xoá kênh có dự án bị khoá đến khi tick, hoàn tác khôi phục kênh/dự án; xoá nháp giữ khảo sát.

Kiểm tra tay phát hiện thêm hai lỗi: textarea Research hiện object thô và nhập tên chưa cập nhật trước khi bấm hoàn tất. Đã sửa, thêm regression test. DNA dùng nhãn tiếng Việt và phần trăm thay cho JSON thô. Bản sao hoàn tác giữ trong bộ nhớ, nút hết hạn sau 10 giây.

TXT đã bấm xuất nhưng IAB không trả sự kiện download trong 5 giây; chưa xác nhận file tải trên trình duyệt thật. Test export kiểm tra tên file, nội dung Blob TXT và nội dung Markdown. Không gọi YouTube/provider thật, không đánh giá chất lượng fact, hedge hoặc editorNotes thực tế. G4/G5 chưa làm vì là tuỳ chọn. Không xoá dữ liệu kênh thật, không đổi youtubeKey.

Ảnh nghiệm thu: screenshots/script-improvements-qa.png và screenshots/title-dna-qa.png.

### Hook mở đầu và giải thích CTA — 2026-10-07
- Bổ sung ô chỉnh hook ở Kịch bản, kế thừa hook của tiêu đề đã chọn. Truyền hook cho dàn ý và phần viết đầu tiên; yêu cầu mở đầu 15–25 giây nằm trong ngân sách từ.
- CTA có giải thích ngay trên giao diện, context chỉ bật ở phần cuối. Không sửa lời kể cũ tự động.
- Test thấy đỏ vì thiếu openingHook trước sửa; toàn bộ 132 test qua. Chưa kiểm chứng chất lượng mở đầu bằng lời gọi AI thật.


### Mở đầu và kết bài theo nội dung
Hook được coi là định hướng thay vì lời bắt buộc chép nguyên văn. Phần đầu nhận tối đa 3 dữ kiện supported liên quan; phần cuối nhận câu hỏi mở đầu. Prompt hướng dẫn mở phù hợp lịch sử, giải thích, tài chính; kết luận đầy đủ cả khi tắt CTA. Test đỏ trước sửa và 133 test qua. Chưa kiểm chứng chất lượng đầu ra bằng AI thật; chọn dữ kiện theo từ chỉ là heuristic.

### K3 — Bible nhân vật và roster trước cảnh (07/10/2026)
- Sáu bước, LAST_STEP=5; step/approved kẹp 0–5, không xóa cảnh cũ. Nạp bible/mẫu trong Bản sắc bằng parser có sẵn; parse lỗi giữ danh sách hợp lệ trước đó.
- Nhân vật chủ đạo lấy từ channel.characters; dự án mới tự nạp. Gợi ý tối đa 6 phụ + 6 bối cảnh lưu bản nháp. Mô tả phụ/bối cảnh tối đa 40 từ, tên không trùng. Xác nhận mới chốt mainCharacters, extraCharacters, backgrounds và roster. Sửa danh sách hoặc kịch bản làm mất xác nhận.
- rosterExtras dùng context whitelist (scriptText, mainCharacters rút gọn), directive tiếng Anh và 1.200 token; API từ chối quá số lượng/độ dài.
- Giữ duy nhất composeImagePrompt để ghép, chỉ chèn mô tả người/bối cảnh có mặt. Hỗ trợ hiển thị, copy, TXT/Markdown/CSV; không ghi prompt đã ghép vào state. Bốn file cung cấp giữ nguyên byte.
- Test đỏ trước sửa: action chưa hỗ trợ và roster chưa được ghép. 157 test qua; browser QA với dữ liệu riêng kiểm nạp mẫu, thiếu identity, dự án mới, cổng xác nhận, sửa/lưu/tải lại và hai cảnh có/không nhân vật. Hai lượt trích dùng gateway mock; đổi style/copy không thêm lượt. Chưa gọi provider hoặc YouTube thật, chưa đánh giá chất lượng trích bằng model thật; luồng UI sinh lô cảnh và migration đầy đủ ở K4/K5 chưa làm.
