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

### K4 — Chia cảnh xác định, thẻ và resume (07/10/2026)
- sceneWindows xác định toàn bộ cửa sổ; lô tối đa 4, giữ nguyên narration/index của code, lưu mỗi lô và tiếp tục từ scenes.length. Lô lỗi không thêm cảnh; invalidTags thử lại đúng một lần rồi lưu cảnh báo lô chờ.
- sceneTags dùng menu cố định trong module riêng, khác bộ thẻ bible được bảo vệ. Whitelist chỉ windows/tagMenu/summaryPrev, 600 token. scenes chỉ windows/tagsByIndex; animation chỉ ID/lời kể. Giữ directive tiếng Anh và chặn sáu từ phong cách. Prompt ảnh dài là cảnh báo, không làm hỏng lô.
- Kiểm độ phủ >=98%, thứ tự, rỗng/trùng/index, promptLong >80 từ. Animation chỉ chạy khi bấm nút; validateAnimations kiểm đủ số/ID/prompt trước lưu.
- Test đỏ trước: thiếu module và API sceneTags 400; sau sửa toàn bộ 164 test xanh. Kiểm retry đúng một lần, network không retry validation, hai lô lưu riêng, resume không gửi lại cảnh cũ, cảnh bị AI sửa lời vẫn giữ bản gốc và chuyển động chỉ chạy khi gọi riêng. Bốn file bible/preset không sửa. Chưa gọi YouTube hoặc provider thật; chất lượng chọn thẻ/mô tả bởi model chưa kiểm chứng. Scene card/xuất đầy đủ và nghiệm thu UI tiếp ở K5.

### K5 — Thẻ cảnh, xuất đầy đủ và legacy (08/10/2026)
- Sáu nhãn đúng thứ tự, LAST_STEP=5, không còn SCRIPT_LAST_STEP. Duyệt kịch bản dẫn tới roster; Hoàn tất chỉ tại bước cuối, kiểm độ phủ/cảnh/index/thẻ trước chốt.
- Thẻ cảnh có đầy đủ lời kể, tags badge và dropdown từ menu, visual, prompt ảnh/chuyển động, overlay/SFX/nhân vật/bối cảnh và lý do cảnh báo. Copy từng cảnh/Copy tất cả và TXT/Markdown/CSV giữ các trường; CSV 10 cột đúng thứ tự, quote dấu phẩy/nháy/xuống dòng. Composer duy nhất vẫn là composeImagePrompt, kết quả ghép không lưu state.
- Legacy kẹp step/approved 0–5, không xóa scenes, voiceData, rendered, assets, mainCharacters, extraCharacters, backgrounds, roster, animations. Cho mở lại cảnh cũ kể cả chưa có xác nhận roster đời mới; resume dùng scenes.length và giữ prompt cũ.
- GET/POST routes media và biến thể, probe/đăng YouTube trả 404; settings.youtubeKey còn nguyên và không lộ trong API. Grep code chạy không thấy route gọi media cũ, công cụ dựng cũ hay biến LAST_STEP tạm. Không xóa tools/scratch/tmp hoặc dữ liệu thật.
- Test đỏ trước: thiếu thẻ cảnh/xuất đầy đủ, và completion vẫn cho thẻ legacy ngoài menu; sau sửa toàn bộ 171 test xanh. Test hành vi kiểm CSV, state không lưu prompt ghép, legacy/display/resume, six-tab renderer, finish, clipboard bị chặn (textarea tạm + hộp chọn thủ công có hướng dẫn Ctrl+C/TXT) và 404 GET/POST.
- Browser QA dùng dự án/gateway riêng: lỗi 503 sau lô đầu vẫn lưu 4/6; tiếp tục chỉ gửi windows index 5, hoàn thành 6/6 và coverage 100%. Hai lượt chuyển động (4+2) chỉ phát sinh khi bấm nút. Đổi style/thẻ và copy không gọi AI; tải lại vẫn có cảnh/thẻ/motion; Hoàn tất chỉ ở bước cuối. Ảnh: screenshots/k45-scenes-qa.png.
- Chưa gọi provider hoặc YouTube thật, chưa đánh giá chất lượng mô tả/chọn thẻ bởi model thật. Nội dung xuất và các nút tải được kiểm bằng test; chưa xác nhận file tải trên trình duyệt người dùng.

### Prompt 1 — Không mất nhân vật âm thầm (08/10/2026)
- Thêm rosterNames vào context scenes (chỉ tên nhân vật, không lấy bối cảnh làm nhân vật); schema thêm noCharacter boolean và directive giới hạn đúng tên. Browser orchestration kiểm tên và gọi lại cùng lô đúng một lần; không retry vô hạn hoặc retry lỗi mạng.
- Sau retry vẫn tên lạ: giữ tên gốc, invalidCharacters/characterError trên cảnh; UI/copy/xuất có cờ đỏ, image_prompt để trống và chặn Hoàn tất, không đoán hoặc âm thầm xuất cảnh thiếu nhân vật. characters=[] dùng nhân vật chủ đạo; noCharacter===true mới bỏ khối nhân vật. Cảnh cũ được kiểm khi hiển thị.
- Test đỏ tái hiện trước sửa: [] làm mất identity, Nam chỉ gọi một lần. Sau sửa 175/175 test xanh. Mock AI và mock gateway qua HTTP kiểm tên đúng/[]/noCharacter, retry sai hai lần và retry thành công, khối nguyên văn, schema boolean, context chỉ thêm tên không lộ mô tả/identity/research/sources. Chưa gọi model thật để kiểm chất lượng tuân thủ tên.
- Không sửa bốn file bible/preset, không làm Prompt 2 hoặc .gitattributes trong commit này.

### Prompt 2 — Chọn và dùng thẻ bible (08/10/2026)
- Dùng tagMenu và validateSceneTags từ character-bible.mjs gốc cho kênh có bible; kênh không bible giữ menu chung. Server chỉ nhận menu tên thẻ, không nhận identity. Lỗi chọn thẻ thử lại đúng một lần ở workflow, vẫn sai lưu cờ đỏ; cảnh báo của bộ kiểm gốc hiển thị vàng.
- Lưu expression/pose/prop/outfit/graphics/camera riêng trên cảnh; dropdown dùng danh sách bible. composeImagePrompt duy nhất nhận các trường này để ghép Expression/Pose và identity nguyên văn lúc hiển thị/copy/xuất, không sửa scene.prompt. Cảnh legacy thiếu thẻ được báo lỗi để người dùng chọn lại, không tự đoán.
- Test đỏ trước do thiếu adapter bible; sau sửa 179/179 test xanh. Mock workflow và HTTP gateway kiểm menu, schema, retry, cảnh báo lặp biểu cảm, dropdown, khối nhân vật nguyên văn, Expression/Pose và context không chứa identity/research/sources/packaging. Bốn file bible/preset không đổi nội dung.
- Chưa gọi model hoặc YouTube thật; chưa đánh giá chất lượng chọn biểu cảm/dáng của model thật. Không sửa dữ liệu dự án hoặc khóa API hiện có.

### Sửa cảnh lỗi tên nhân vật (08/10/2026)
- Thẻ cảnh thêm checkbox từ roster và công tắc không nhân vật; lưu characters/noCharacter, kiểm tên trước ghi, xoá invalidCharacters/characterError khi hợp lệ và bỏ duyệt bước cuối. Handler lưu/cập nhật prompt ngay; không sửa composer hoặc bible.
- Tạo lại riêng một cửa sổ bằng workflow chọn thẻ/scenes chung, giữ lời kể/index từ code và các cảnh khác. Giữ retry tên sai/thẻ sai đúng một lần; lỗi mạng không thay cảnh cũ. Xoá riêng animation của cảnh thay thế, không xoá animation khác.
- Hai test đỏ trước vì chưa có hàm sửa/tạo lại. Sau sửa 182/182 test xanh: khối nhân vật nguyên văn, cờ biến mất và Hoàn tất được mở, noCharacter bỏ identity, lựa chọn sai không đổi state, renderer/handler checkbox, regenerate một cửa sổ không đổi cảnh khác, lỗi mạng giữ state.
- Chưa chạy model thật hoặc xác nhận tương tác trên trình duyệt người dùng. Giữ ngưỡng cảnh báo prompt >80 từ, không thay media/YouTube/API keys; bốn file bible/preset không đổi.

### Tích Thông Thái — Phần 1: mẫu Tích
- Tạo hai bản sao chỉ đổi tên; giữ nguyên bốn file gốc. Nút chính nạp mẫu Tích, bản Schoolboy có nút riêng. Context sceneTags/scenes thêm chỉ tên roster theo yêu cầu mới.
- Test đỏ vì thiếu loadTichSample; sau sửa 183/183 test xanh. Kiểm bản sao nguyên ký tự ngoài tên, 8/8/4/7/9 thẻ, roster Tích, prompt ghép identity nguyên văn và context mock AI không lộ identity/research/sources. Chưa chạy AI thật.

### Tích Thông Thái — Phần 2: kế hoạch mở đầu/kết thúc
- Thêm editor hai danh sách theo kênh: fixed/template/ai, giới hạn từ, SFX, thêm/xoá/sắp xếp và preview. Mẫu giữ nguyên văn toàn bộ câu/instruction/voice-hook-cấu trúc đã yêu cầu; không thêm media APIs.
- fixed do code chèn; template chỉ gửi tên chỗ trống/giới hạn và chủ đề/cảnh mở cho AI, giữ nguyên khung câu bằng code. Action planSegment lọc context qua whitelist, kiểm giới hạn trả về. AI segment chỉ nhận instruction/voice/cảnh mở và tối đa ba claim supported; không gửi fixed/SFX/sources/research thừa.
- Trừ chi phí từ ở phần đầu/cuối, cân lại thân bài khi kế hoạch vượt tỷ trọng ban đầu; tổng ±5%, lỗi độ dài retry một lần, lỗi mạng giữ draft và resume các đoạn đã hoàn tất. Kết thúc theo plan thay CTA, kênh không plan giữ luồng cũ. Chốt script bằng bản nguồn fixed/template, không tin bản viết lại của AI.
- SFX lưu ngoài narration, theo vị trí từ cuối đoạn; composer/export ghép vào sfx cảnh tương ứng, không gửi AI và không tính targetWords. Vị trí chỉ áp dụng khi lời kể khớp basis đã chốt để tránh gắn nhầm sau chỉnh tay.
- Test đỏ trước do thiếu module; sau sửa 189/189 test xanh. Test hành vi mock workflow/HTTP kiểm literals, khung template, độ dài/chặn slot, restore fixed, context lọc, số từ và SFX CSV, budget phần đầu/cuối, resume và legacy no-plan. Bốn file gốc không đổi; youtubeKey không đụng.
- Chạy tay IAB với Studio/gateway giả riêng: nạp hai mẫu, xác nhận roster Tích, tạo 900 từ và 45 cảnh; lời kể không chứa Yeah, CSV và scene card cuối có SFX Yeah. Mock lặp từ/biểu cảm có cảnh báo của workflow như dự kiến; không dùng mock này để đánh giá nội dung. Ảnh screenshots/tich-plan-qa.png.
- Chưa gọi AI/YouTube thật; chưa đánh giá chất lượng hook, kết luận hoặc độ phù hợp dữ kiện do model thật viết. Các file/dữ liệu QA nằm trong tmp, không đổi dữ liệu người dùng.

### Đề xuất góc kể theo ngách (08/10/2026)
- Bổ sung ô ngách và nút đề xuất riêng ở bước Chọn khuôn; dùng action angles với niche làm căn cứ chính, chỉ lấy tối đa 20 tiêu đề tham khảo. Server lọc context, không gửi research/sources/identity dư. Người dùng chủ động chọn/sửa góc kể; giữ cách xem gợi ý theo kênh.
- Gợi ý không tự đổi angle hoặc kết quả cổng. Đổi ngách ẩn đề xuất cũ, lỗi AI giữ góc/kết quả đã chọn. Test đỏ trước do thiếu helper; sau sửa 192/192 test xanh (mock workflow, renderer và HTTP). Chưa kiểm chất lượng đề xuất bằng AI thật.

## Cổng Kho: ba kênh cùng khuôn (theo yêu cầu mới)
- Ba channelId khác nhau cùng khuôn đủ để tiếp tục; tuổi video và trung vị view chỉ còn cảnh báo tham khảo. Giữ luật tìm khuôn >50%.
- Cập nhật kết quả Kho đã lưu, không tự cào lại YouTube. Lần kiểm tra mới giữ video mang khuôn của cả kênh ít view hoặc video mới.
- Kiểm bằng fixture/mock; chưa cào lại YouTube thật để kiểm chứng dữ liệu mới.

## Lời kể nháp và tiếp tục script
- Tái hiện dự án 30 phút có 5 phần scriptDraft nhưng narration trống: giao diện trước đây chỉ hiện lời kể sau toàn bộ vòng viết.
- Hiện số phần/độ dài và nháp có thể copy; giữ nguyên kịch bản cũ khi viết lại, lưu nguyên nhân lỗi và tiếp tục phần còn thiếu; chặn duyệt khi còn nháp.
- Test hành vi: mock lỗi giữa chừng, kiểm lưu nháp/tiếp tục không viết lại, bảo toàn lời kể cũ. Chưa chạy sinh toàn bộ script với AI thật.

## Khôi phục khi model không tạo được JSON
- Tái hiện HTTP 400 `json_validate_failed`: trước đây bị dừng vì chỉ fallback cho lỗi mạng/quota/quá tải.
- Thử lại tối đa một lần/model, bỏ response_format ở lượt thử lại nhưng giữ nguyên schema và chỉ dẫn JSON; vẫn parse đầu ra. Sau hai lần lỗi JSON, fallback theo cấu hình.
- Test đỏ trước, mock HTTP kiểm retry, fallback, giới hạn lượt gọi, lỗi 400 khác không retry, JSON sai ở HTTP 200 và state không đổi. Chưa kiểm chứng sinh script với model thật sau sửa; không thay cấu hình model hoặc youtubeKey.

## Tiếp tục khi model cắt dở đầu ra
- Tái hiện finish_reason=length: trước đây luôn dừng 422 dù đã chia script khoảng 220 từ/phần.
- Retry một lần với ngân sách đầu ra tăng có giới hạn, giữ JSON mode; nếu vẫn bị cắt, fallback. Chung giới hạn tối đa hai lượt/model với retry JSON, không gọi vô hạn hoặc nhận narration bị cắt.
- Test hành vi HTTP/mock kiểm ngân sách, prompt giữ nguyên, fallback và state không đổi. Chưa xác nhận sinh script với AI thật sau sửa.

## Gemini + Grok API trực tiếp
- Hai khóa tách riêng ở ai-keys.json; không đưa vào state/settings API hoặc Git. Không sửa youtubeKey. Endpoint cố định Google/xAI; Grok không phải Groq.
- UI lưu khóa từng dịch vụ, tải danh sách model được cấp quyền và chọn model chính/dự phòng. Chế độ gateway cũ vẫn dùng được khi chọn gateway.
- Test đỏ trước: lưu khóa/thiếu khóa; mock request kiểm URL, model bỏ prefix, Authorization tách đúng provider, fallback liên dịch vụ; test UI render model/khóa không lộ.
- Chưa kiểm chứng bằng khóa Gemini/xAI thật mới; chờ người dùng nhập tại Kết nối API.

## Đợt cuối · Phần 1
Phân loại lỗi, lý do chuyển, cooldown tiêm đồng hồ, giới hạn thời gian và banner/trạng thái. Test mock bảng mã lỗi, nghỉ/hết nghỉ, tất cả nghỉ, 90 giây, banner credit. Chưa chạy với Gemini/Grok thật có lỗi quota/credit.

## Đợt cuối · Phần 2
TASK_TIERS và schema dùng chung để phát hiện action chưa phân loại. Chọn model nhẹ/nặng riêng, routing theo tiền tố, bảng usage phiên. Mock kiểm URL/khóa chuỗi gateway→Gemini→xAI, chọn model HTTP và cộng usage. Chưa kiểm với khóa Gemini/Grok thật; không khẳng định mức tiết kiệm token.

## Đợt cuối · Phần 3
Outline/title cho opening/closing, openingHandoff cho thân bài đầu, tóm tắt có giới hạn. Mock 12 lượt cùng fixture: ngữ cảnh trước [537,1561,1924,2287,2650,3013,3376,3739,4102,4467,4830,5214] ký tự; sau [714,1441,1684,1927,2170,2430,2430,2430,2430,2432,2432,2453]. Lượt cuối 5.214 → 2.453 ký tự. Đây là độ dài JSON context bằng mock, không phải số token hoặc chứng minh chất lượng AI. Chưa chạy script thật với Gemini/Grok sau sửa.

Phần 1 kiểm tra bổ sung sau commit WIP 6dcde5a: tái hiện lỗi status 400/422 không có upstreamStatus bị switch; bổ sung test đỏ rồi sửa điều kiện stop. Không thay đổi các mở rộng khác của commit WIP.
