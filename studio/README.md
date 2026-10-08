# Tích Studio · Tìm ngách và kịch bản

Ứng dụng chạy trên máy để tìm ngách có bằng chứng, xây hồ sơ kênh và viết kịch bản hoàn chỉnh. Kết quả cuối là văn bản để copy hoặc xuất sang công cụ ngoài.

## Chạy

Cần Node.js 22 trở lên. Từ thư mục gốc:

```sh
npm run studio
npm run studio:test
```

Mở http://localhost:3210. AI dùng gateway tương thích chat/completions; cấu hình OPENAI_BASE_URL và OPENAI_API_KEY trong .env (tham khảo .env.example). Không đưa khóa, .env hoặc .studio-data lên Git.

## Tìm ngách

1. Nhập kênh tham khảo, chọn thị trường/ngôn ngữ/định dạng rồi Phân tích kênh.
2. Duyệt khuôn từ danh sách đạt hơn 50% tiêu đề mới nhất. Chọn hoặc chỉnh góc kể được Groq/gateway gợi ý từ tiêu đề.
3. Kiểm tra kho kênh, thêm tối đa 5 kênh tay khi dùng API, phân nhóm và gõ thử nhu cầu.
4. Chốt 20 chủ đề rồi dựng kênh từ ngách đã khóa.

Không có khuôn gõ tự do để vượt cổng. Khuôn cần ít nhất 10 tiêu đề hợp lệ trong tối đa 20 tiêu đề mới nhất; video dài từ 120 giây. Kho cần 3 kênh cùng khuôn; mỗi kênh có ít nhất 5 video từ 90 ngày trước, trung vị từ 20.000 view. Chỉ bắt trùng theo từ, chủ đề đồng nghĩa cần tự đối chiếu. Kho nhập cần duration và xác nhận đầy đủ.

## Khóa YouTube Data API

Tạo dự án tại Google Cloud Console, bật YouTube Data API v3 và tạo API key ở Credentials. Nhập ở Kết nối API → YouTube API key → Lưu khóa YouTube. Khóa chỉ lưu ở server; API settings chỉ báo đã có cấu hình. Khóa phục vụ tìm/đọc video và kênh, không đăng video. Không cần khóa nếu nhập kho JSON/CSV có đủ dữ liệu và xác nhận.

## Dự án sáu bước

1. Chủ đề: chọn câu hỏi và thời lượng dự kiến.
2. Tiêu đề + Thumbnail: chọn lời hứa, hook, khuôn và bố cục thumbnail.
3. Research: thêm text nguồn, đối chiếu claim và chọn góc nhìn. URL đơn độc không chứng minh đã đọc nguồn.
4. Kịch bản: dựng dàn ý, viết từng phần, chỉnh narration rồi Duyệt kịch bản → Nhân vật + bối cảnh.
5. Nhân vật + bối cảnh: nạp bible hợp lệ tại Bản sắc; kiểm tra nhân vật chủ đạo, trích hoặc nhập tối đa 6 nhân vật phụ và 6 bối cảnh. Sửa mô tả tiếng Anh (mỗi mô tả phụ/bối cảnh tối đa 40 từ), tick xác nhận rồi Lưu & tiếp tục.
6. Cảnh và prompt: tạo/tiếp tục lô 4 cảnh; kiểm tra lời kể, thẻ, mô tả hình, prompt đã ghép và cảnh báo. Tạo chuyển động bằng nút riêng nếu cần. Copy cảnh/Copy tất cả hoặc xuất TXT/Markdown/CSV; bấm Hoàn tất tại bước cuối khi đủ cảnh và lời kể.

Copy toàn bộ kịch bản, Xuất kịch bản TXT hoặc Xuất Markdown (gồm nguồn). Nếu clipboard bị chặn, dùng Ctrl+C trong hộp thoại hoặc tải TXT. Ảnh, giọng và dựng video thực hiện ở app ngoài. Thumbnail giữ công cụ bố cục/canvas, không có API sinh ảnh.

Step và approved của dự án cũ được kẹp về chỉ số 0–5; cảnh và dữ liệu cũ vẫn giữ trong state. Cảnh đã có hiển thị ở bước cuối; dữ liệu audio cũ được giữ nhưng không có giao diện sử dụng. assets.mjs và cơ chế đồng bộ state tiếp tục hoạt động.

## AI và model dự phòng

Giữ model chính và tối đa 3 dự phòng tại Kết nối API. App chuyển khi quá tải/hết hạn mức/lỗi dịch vụ/mất kết nối; không chuyển vì khóa sai hay JSON sai. Thử từng model một lần, tối đa 45 giây mỗi lượt khi bật dự phòng. Không thay model chính vĩnh viễn; nhật ký ghi model thực tế. Chỉ dùng model đã nối ở gateway; chi phí phụ thuộc tài khoản dịch vụ. Model của app độc lập với phiên Codex.

## Kiểm thử và dữ liệu

npm run studio:test dùng fixture và gateway giả lập, không gọi provider hoặc YouTube thật. Dữ liệu nằm trong .studio-data, được ignore. Giữ cửa sổ khi chưa lưu thành công; các xung đột cùng trường cần xử lý trước khi ghi.

Xem [REVIEW_FIXES.md](REVIEW_FIXES.md) cho nghiệm thu bản hiện tại, [REVIEW_FIXES_HISTORY.md](REVIEW_FIXES_HISTORY.md) cho lịch sử, [FILE_REVIEW_INVENTORY.md](FILE_REVIEW_INVENTORY.md) cho file chờ duyệt. Chưa xóa file trong danh sách này.

Research đã đánh giá (supported/needs_check) được đưa vào dàn ý và kịch bản; dữ kiện needs_check không được khẳng định.

F2: Viết từng phần chỉ gửi tiêu đề đã chọn, ngữ cảnh nghiên cứu liên quan và tóm tắt hai câu mỗi phần trước; nguồn thô vẫn dùng ở Research.

F3: Khuôn tiêu đề được đếm bằng code theo luật hơn 50%; tác vụ AI dò khuôn cũ đã bỏ. Trạng thái viết phần không gắn tên nhà cung cấp.

F5: Ghi chú biên tập nằm trong một ô thu gọn; công tắc Ẩn ghi chú kiểm chứng lưu theo kênh. Code lọc trùng/gần trùng và giữ tối đa 5 ghi chú; dữ kiện chưa có nguồn phải diễn đạt thận trọng.

F4: Mỗi phần lệch mục tiêu hơn 25% được viết lại đúng một lần. Nếu vẫn lệch, cảnh báo được giữ để bạn sửa. Kiểm tra lặp ý so cụm 5 từ giữa các phần bằng code, không gọi AI.

G1: Kho giữ tag (15 x 40 ký tự), like/comment, ngôn ngữ, phụ đề và tối đa 20 chương; không lưu mô tả video. Import nhận các cột tùy chọn tags, likes, comments, chapters (mảng JSON hoặc tag phân cách bằng dấu chấm phẩy).

G2: DNA tiêu đề thống kê phân vị độ dài, số/năm/dấu phân cách/viết hoa và từ sau khuôn. Lift là chênh lệch tỷ lệ đặc điểm nhóm bội số >=2 với nhóm còn lại; mỗi nhóm cần >=5 video. Tag chỉ dùng lấy ý tưởng từ khóa.

G3: Bước Kho có ô thu gọn DNA tiêu đề và tag khi có ít nhất 5 video, kèm nút copy. Lift thiếu mẫu được ghi rõ.

G6: Phương án title được gắn cờ độ dài ngoài p25–p75, thiếu khuôn hoặc trùng thực thể. Không tự xoá. Tag ưu tiên thống kê kho, AI chỉ bổ sung khi dưới 5 tag; Copy tag giới hạn tổng 500 ký tự. Thumbnail thắng chỉ là liên kết mở tab mới.

H1: Tổng quan có Xoá kênh, xác nhận tên/số dự án/số chủ đề; kênh có dự án bắt buộc tick xoá luôn dự án. Khảo sát giữ nguyên. Hoàn tác trong 10 giây, bản sao trong bộ nhớ đến khi tải lại. Trang chủ gợi ý dọn nhiều kênh nháp cùng lúc.

Các mục G4 (chương thành dàn ý) và G5 (lấy bình luận) chưa bật. Bản hiện tại chỉ lấy chương từ mô tả đã trả sẵn, không gọi lấy bình luận. Các chỉ số và test mock không bảo đảm chất lượng kịch bản hoặc hiệu quả tiêu đề thực tế.

### Mở đầu và CTA
Ở bước Kịch bản, ô **Mở đầu / Hook** lấy hook của phương án Tiêu đề đã chọn; bạn có thể sửa trước khi dựng dàn ý và viết. AI nhận hook ở phần đầu, tạo tò mò và nối vào thân bài trong tổng số từ. CTA là lời mời bình luận hoặc đăng ký ở cuối; bỏ chọn để không thêm. Kịch bản đã lưu không tự thay đổi: viết lại khi muốn áp dụng hook mới.

Mở đầu được diễn đạt theo tiêu đề, góc kể, người xem và giọng kênh; nhận tối đa 3 dữ kiện research supported liên quan. Không có dữ kiện thì dùng câu hỏi thay vì bịa chi tiết. Kết bài trả lời câu hỏi mở đầu; CTA tùy chọn chỉ một câu mời bình luận liên quan nội dung. Không thêm lượt gọi AI.

### Bible và roster (K3)
Bản sắc → dán bible rồi Nạp bible, hoặc Nạp mẫu Cậu bé học sinh. Parse lỗi hiển thị rõ và giữ nguyên nhân vật hợp lệ cũ. Khối nhân vật chủ đạo chỉ đọc ở dự án; sửa bible tại kênh trước khi xác nhận. Gợi ý AI chỉ lưu bản nháp, roster đã xác nhận được chụp vào dự án khi Lưu & tiếp tục. Thay đổi mô tả hoặc kịch bản yêu cầu xác nhận lại.

`rosterExtras` chỉ gửi kịch bản và bản tóm tắt nhân vật chủ đạo (tối đa 40 từ/mô tả), ngân sách đầu ra 1.200 token. Không gửi nguồn nghiên cứu, packaging hoặc visualStyle. Chỉ `composeImagePrompt` ghép prompt để hiển thị/copy/xuất; `scene.prompt` vẫn là phần riêng của cảnh. Hàm có sẵn nhận `(scene, character, styleOverride)` nên roster được chuyển thành dữ liệu nhân vật/bối cảnh đầu vào, không sửa bốn file bible/preset.

### Cảnh và prompt (K4)
Sau khi xác nhận Nhân vật + bối cảnh, bấm **Tạo cảnh và prompt**. Code chia toàn bộ lời kể theo thời lượng (mặc định 150 từ/phút) và nhịp cảnh (mặc định 8 giây). Mỗi lô tối đa 4 cửa sổ: AI chọn 1–3 thẻ trong menu cố định rồi điền mô tả. Lời kể/index do code giữ nguyên. Lô hoàn thành tự lưu; lỗi thì bấm **Tiếp tục tạo cảnh**. Thẻ sai thử lại đúng một lần, vẫn sai hiện đỏ và không tính vào cảnh hoàn thành.

Độ phủ kiểm tra số từ và thứ tự lời kể, cảnh rỗng/trùng/index thiếu; prompt riêng dài hơn 80 từ được cảnh báo. Không thay kịch bản hoặc thời lượng giữa các lô đã lưu; dùng dự án mới nếu muốn chia lại, cảnh cũ được giữ. **Tạo prompt chuyển động** là nút riêng, không tự gọi khi tạo cảnh. Chuyển động cũng theo lô 4, chỉ lưu sau khi đủ prompt/đúng ID. Không tạo ảnh, âm thanh hoặc video.

### Thẻ cảnh và xuất văn bản (K5)
Mỗi cảnh hiển thị đầy đủ lời kể, thẻ, visual, image_prompt, animation_prompt (nếu có), overlay, SFX, nhân vật và bối cảnh. Ba dropdown chỉ chọn thẻ trong menu, không gõ thẻ tự do. Dấu đỏ chỉ rõ thẻ lỗi, lời kể trùng/rỗng, index thiếu hoặc chưa phủ đủ; prompt riêng >80 từ có cảnh báo vàng và không chặn hoàn tất.

**Copy cảnh** giữ cả prompt ảnh/chuyển động và các trường phụ. **Copy tất cả**, **Xuất TXT**, **Xuất Markdown (.md)** và **Xuất CSV (.csv)** dùng cùng dữ liệu đã ghép lúc xuất. CSV có đúng thứ tự `scene,narration,image_prompt,animation_prompt,overlay,sfx,characters,background,tags,warnings`; nhân vật/thẻ/cờ phân cách bằng dấu phẩy bên trong ô CSV đã quote. Chữ overlay để biên tập riêng, không tự đưa vào prompt ảnh. Đổi visualStyle cập nhật ngay prompt hiển thị/copy/xuất, không sửa scene.prompt hoặc gọi lại AI.

**Hoàn tất** chỉ có ở bước 6 (index 5) và bị khóa khi còn cảnh thiếu hoặc lỗi độ phủ. Dự án cũ step 8 được đưa về 5; scenes, voiceData, rendered, assets, roster và animations giữ nguyên. Có cảnh cũ thì vẫn mở lại bước cuối để xem/copy và tiếp tục từ số cảnh đã lưu. Nếu lời kể/thời lượng cũ không khớp kế hoạch, cảnh báo hiện rõ; không tự xóa/viết lại cảnh cũ. API sinh ảnh, giọng, dựng hoặc đăng video không khả dụng; khóa YouTube Data API giữ nguyên để khảo sát ngách.

### Giữ nhân vật trong cảnh — Prompt 1
Action scenes gửi thêm rosterNames: chỉ tên nhân vật chủ đạo/phụ đã chốt, không gửi mô tả hoặc identity. Tên ngoài danh sách khiến lô scenes được gọi lại đúng một lần; nếu còn sai, lưu cảnh với invalidCharacters và lý do. Không đoán tên thay thế, không xuất một prompt ảnh thiếu nhân vật như thể hợp lệ; cảnh đỏ chặn Hoàn tất.

characters rỗng dùng nhân vật chủ đạo của dự án/kênh. Muốn cảnh chỉ có đồ vật/biểu đồ phải có noCharacter=true. Tên hợp lệ vẫn ghép khối nhân vật nguyên văn. Phần prompt riêng giữ nguyên trong state; kiểm cảnh cũ cũng báo tên ngoài roster.

### Thẻ bible theo cảnh — Prompt 2
Kênh có bible dùng đúng menu `tagMenu(character)` của bible: expression, pose/prop, outfit, graphics và camera. Chọn thẻ trước khi tạo cảnh, kiểm bằng bộ `validateSceneTags` gốc; lỗi thử lại một lần rồi hiện đỏ, cảnh báo hiện vàng. Kênh chưa có bible tiếp tục dùng menu thẻ chung.

Các dropdown trên thẻ cảnh lấy lựa chọn từ bible. Expression/Pose và khối nhân vật nguyên văn được ghép khi hiển thị/copy/xuất; không lưu chuỗi ghép vào scene.prompt. Cảnh cũ thiếu thẻ bible được báo rõ và có thể chọn lại bằng dropdown. Bước chọn thẻ chỉ gửi lời kể của lô, menu và tóm tắt cảnh trước; không gửi identity/mô tả nhân vật, research hoặc sources.

### Sửa nhân vật hoặc tạo lại một cảnh
Trong mỗi thẻ cảnh, chọn các tên ở **Nhân vật trong cảnh** (chỉ từ roster đã chốt). Tên hợp lệ gỡ lỗi invalidCharacters; không chọn tên nào dùng nhân vật chủ đạo. Bật **Cảnh không có nhân vật** cho đồ vật/biểu đồ để bỏ khối nhân vật khỏi prompt. Các thay đổi cần Hoàn tất lại.

**Tạo lại cảnh này** chọn thẻ và sinh mô tả cho đúng một cửa sổ lời kể, giữ nguyên các cảnh khác. Lời kể/index do code gắn. Lỗi mạng giữ cảnh cũ; tên sai vẫn thử lại đúng một lần rồi báo đỏ để bạn sửa bằng checkbox. Prompt chuyển động cũ của riêng cảnh được tạo lại bị xoá để bạn tạo lại khi cần. Nếu kịch bản/thời lượng không khớp cửa sổ đã lưu, giao diện báo lỗi thay vì thay lời kể âm thầm.
