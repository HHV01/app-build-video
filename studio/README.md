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

Không có khuôn gõ tự do để vượt cổng. Khuôn cần ít nhất 10 tiêu đề hợp lệ trong tối đa 20 tiêu đề mới nhất; video dài từ 120 giây. Kho cần 3 kênh khác nhau có dấu ✓ cùng khuôn. Số video từ 90 ngày trước và trung vị 20.000 view chỉ là thông tin tham khảo, không chặn bước tiếp theo. Chỉ bắt trùng theo từ, chủ đề đồng nghĩa cần tự đối chiếu. Kho nhập cần duration và xác nhận đầy đủ.

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
Bản sắc → dán bible rồi Nạp bible, hoặc Nạp mẫu Tích (mẫu Cậu bé học sinh vẫn có nút riêng). Parse lỗi hiển thị rõ và giữ nguyên nhân vật hợp lệ cũ. Khối nhân vật chủ đạo chỉ đọc ở dự án; sửa bible tại kênh trước khi xác nhận. Gợi ý AI chỉ lưu bản nháp, roster đã xác nhận được chụp vào dự án khi Lưu & tiếp tục. Thay đổi mô tả hoặc kịch bản yêu cầu xác nhận lại.

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

Các dropdown trên thẻ cảnh lấy lựa chọn từ bible. Expression/Pose và khối nhân vật nguyên văn được ghép khi hiển thị/copy/xuất; không lưu chuỗi ghép vào scene.prompt. Cảnh cũ thiếu thẻ bible được báo rõ và có thể chọn lại bằng dropdown. Bước chọn thẻ chỉ gửi lời kể của lô, menu, tên roster và tóm tắt cảnh trước; không gửi identity/mô tả nhân vật, research hoặc sources.

### Sửa nhân vật hoặc tạo lại một cảnh
Trong mỗi thẻ cảnh, chọn các tên ở **Nhân vật trong cảnh** (chỉ từ roster đã chốt). Tên hợp lệ gỡ lỗi invalidCharacters; không chọn tên nào dùng nhân vật chủ đạo. Bật **Cảnh không có nhân vật** cho đồ vật/biểu đồ để bỏ khối nhân vật khỏi prompt. Các thay đổi cần Hoàn tất lại.

**Tạo lại cảnh này** chọn thẻ và sinh mô tả cho đúng một cửa sổ lời kể, giữ nguyên các cảnh khác. Lời kể/index do code gắn. Lỗi mạng giữ cảnh cũ; tên sai vẫn thử lại đúng một lần rồi báo đỏ để bạn sửa bằng checkbox. Prompt chuyển động cũ của riêng cảnh được tạo lại bị xoá để bạn tạo lại khi cần. Nếu kịch bản/thời lượng không khớp cửa sổ đã lưu, giao diện báo lỗi thay vì thay lời kể âm thầm.

### Mẫu nhân vật Tích
Nút Nạp mẫu Tích ở Nhân vật chủ đạo tải tich-bible.txt và tich.preset.json. Hai bản chỉ đổi tên thành Tích, giữ nguyên identity/style và 8/8/4/7/9 thẻ. Bản Cậu bé học sinh vẫn dùng được bằng nút riêng. sceneTags và scenes gửi chỉ tên roster Tích, không gửi mô tả nhân vật, research hoặc sources.

### Mở đầu/Kết thúc cố định — Tích Thông Thái
Bản sắc → **Nạp mẫu Tích Thông Thái** để nạp đúng các câu mẫu và giọng/hook/cấu trúc. Đây là nút riêng với **Nạp mẫu Tích** (nhân vật). Hai danh sách Mở đầu/Kết thúc có Thêm đoạn, Xoá đoạn, ↑/↓ và xem trước:
- `fixed`: code chèn câu nguyên văn; SFX tuỳ chọn không đọc vào narration.
- `template`: câu giữ nguyên có `{tên_chỗ_trống}`; nhập JSON giới hạn như `{"chủ_đề":12,"cảnh_mở_đầu":15}`. AI chỉ điền giá trị, quá giới hạn bị chặn.
- `ai`: instruction và maxWords, code kiểm giới hạn trước lưu.

Viết script từ dàn ý sẽ viết từng đoạn theo kế hoạch rồi thân bài. Câu fixed không gửi AI viết lại; khung chữ của template do code ghép. Chi phí từ của mở đầu/kết thúc trừ vào mục tiêu phần đầu/cuối; khi vượt phần chia ban đầu, ngân sách thân bài còn lại được cân lại. Quá ngắn thì yêu cầu tăng thời lượng/rút kế hoạch. Thân bài lệch quá 5% được sửa đúng một lần, vẫn lệch thì dừng và giữ phần đã lưu để tiếp tục. Kế hoạch Kết thúc thay checkbox CTA; kênh không có kế hoạch vẫn dùng luồng cũ.

Sau khi gom, code lắp lại các đoạn theo bản nguồn, giữ đúng thứ tự và câu ở đầu/cuối. SFX được lưu bằng vị trí từ, xuất vào cột `sfx` của cảnh chứa từ cuối đoạn fixed; với mẫu này là cảnh cuối. SFX không tính số từ và không gửi AI. Nếu sửa lời kể sau khi viết khiến vị trí không còn khớp, SFX cũ không tự gắn sang cảnh sai; viết lại theo kế hoạch để cập nhật vị trí.

Nghiệm thu bằng gateway giả trên giao diện: nạp cả hai mẫu, script 900/900 từ, hook rồi câu chào, kết bằng câu cố định, cảnh cuối có Yeah riêng. CSV từ dự án QA có Yeah ở cột sfx cuối và narration không chứa Yeah. Chưa kiểm chất lượng sáng tác với AI thật. Ảnh: `screenshots/tich-plan-qa.png`.

### Đề xuất góc kể theo ngách
Ở bước Chọn khuôn, nhập **Ngách bạn muốn làm** (ví dụ “tài chính cá nhân”, “kinh doanh dễ hiểu”), rồi bấm **Đề xuất góc kể theo ngách**. Chọn một gợi ý và chỉnh trong ô Góc kể nếu cần. Nút **Xem gợi ý từ kênh tham khảo** mở lại nhóm gợi ý dựa trên tiêu đề đã phân tích. Đổi ngách sẽ ẩn gợi ý của ngách cũ cho tới khi chạy lại; không tự ghi đè góc đã chọn. Góc này được dùng khi chốt khuôn và dựng kênh, còn các cổng kiểm chứng không đổi.

Cổng Kho được cập nhật theo yêu cầu: đếm kênh cùng khuôn, loại trùng channelId; dữ liệu đã lưu được cập nhật khi khởi động. Muốn lấy thêm video tham khảo của các kênh trước đây bị loại, bấm kiểm tra lại kho. Không thay đổi ngưỡng tìm khuôn hay cổng Gõ thử.

Viết script từ dàn ý lưu từng phần. Nếu model lỗi giữa chừng, mở Lời kể nháp để đọc/copy và bấm Tiếp tục viết script; không gọi lại các phần đã hoàn thành khi dàn ý và cấu hình không đổi. Duyệt kịch bản chỉ sau khi hoàn tất nháp.

Nếu model báo `Failed to validate JSON` (HTTP 400), Studio thử lại đúng một lần ở phần đang viết với chỉ dẫn JSON nhưng bỏ chế độ ép JSON của dịch vụ. Nếu vẫn thất bại, chuyển sang model dự phòng khi đã bật tự động chuyển model. JSON đầu ra vẫn được kiểm tra trước khi nhận; lỗi tham số/quyền truy cập không dùng cơ chế này.

Giới hạn đầu ra là giới hạn của một lượt gọi, không phải thông báo hết hạn mức tài khoản. Khi model báo finish_reason=length, Studio không nhận lời kể bị cắt: thử lại tối đa một lần với ngân sách đầu ra tăng có giới hạn (script 2.000 → 4.000), rồi chuyển model theo cấu hình dự phòng. Các lượt bình thường giữ ngân sách cũ.

## Gemini, Grok, Groq và DeepSeek API trực tiếp
1. Mở Kết nối API, dán khóa của dịch vụ bạn có rồi bấm Lưu. Grok là xAI, khác Groq.
2. Studio tự tải danh sách model, tự chọn model phù hợp và thêm vào dự phòng (tối đa 3). Khóa đã lưu trước đó cũng được tự thêm vào chuỗi khi khởi động; không cần chọn tay từng model.
3. Muốn đổi model chính hoặc model việc nhẹ thì bấm nút tương ứng trong thẻ dịch vụ. Mọi thay đổi được lưu ngay.
4. DeepSeek có thêm nút Kiểm tra số dư; số dư chỉ hiển thị, không lưu vào cấu hình.
Khóa nằm trong `.studio-data/ai-keys.json`, bị Git bỏ qua; GET settings chỉ trả trạng thái đã cấu hình. Để trống giữ khóa cũ. API trực tiếp gọi Google/xAI/Groq/DeepSeek, không đi qua OmniRoute. Model ghi `gemini/tên-model`, `xai/tên-model`, `groq/tên-model` hoặc `deepseek/tên-model`. DeepSeek dùng `response_format: json_object`; nội dung rỗng được coi là lỗi JSON để thử lại không dùng response_format, rồi mới chuyển model. Model suy luận của DeepSeek bỏ `reasoning_content` và không gửi tham số sampling/JSON không hỗ trợ.
Endpoint theo tài liệu chính thức: https://ai.google.dev/gemini-api/docs/openai, https://docs.x.ai/developers/model-capabilities/legacy/chat-completions, https://console.groq.com/docs/openai và https://api-docs.deepseek.com.

## Dự phòng linh hoạt
Thiếu khóa, 401/402/403/404, 5xx và timeout có thể chuyển model; 400/422 sai yêu cầu dừng ngay (JSON/cắt dở được thử lại). Model 429/402/403/5xx nghỉ 10 phút; nếu tất cả nghỉ, thử model hết nghỉ sớm nhất. Mỗi model tối đa 30 giây khi có dự phòng, cả chuỗi 90 giây. Banner hiển thị model thay thế và trạng thái nghỉ; GET /api/ai/status không trả khóa.

## Tìm nguồn web có dự phòng
Bước tìm web chỉ dùng Gemini hoặc Grok (DeepSeek/Groq không có công cụ này). `researchConnection` trả danh sách ứng viên theo thứ tự model đã chọn, rồi bổ sung dịch vụ có khóa. Lỗi 429/402/403/401/404/428/5xx hoặc timeout thì thử ứng viên kế; lỗi yêu cầu sai dừng ngay; ứng viên đang nghỉ bị bỏ qua đến hết giờ. Nếu mọi ứng viên đều hết hạn mức, giao diện báo rõ và mở thẳng Tự thêm nguồn, giữ nguyên dữ liệu đã có. Bước đọc nguồn/đối chiếu vẫn dùng chuỗi model thường (gồm DeepSeek).

## Việc nhẹ/nặng và thống kê phiên
Model cho việc nhẹ để trống thì dùng model chính; khi có model nhẹ, dùng chuỗi dự phòng riêng (tối đa 3). Việc nhẹ: thẻ/cảnh/chuyển động/nhóm/bản sắc/góc kể/nhân vật. Việc nặng: research/dàn ý/script/ý tưởng/chủ đề/thumbnail/đoạn mở-kết. Tiền tố gateway/ đi qua gateway và chỉ bỏ tiền tố đầu; gemini/, xai/ hoặc grok/ gọi trực tiếp. Tên không tiền tố giữ aiMode cũ. Bảng tiêu thụ ghi usage thực trả về, số lượt và chuyển model, trong bộ nhớ phiên, không lưu prompt.

## Nối mạch kịch bản và giới hạn ngữ cảnh
Mở đầu/kết thúc nhận tối đa 12 tiêu đề dàn ý và tiêu đề video; phần kết nhận tiêu đề thân bài. Thân bài đầu nhận các chỗ trống mở đầu đã điền và 300 ký tự cuối hook, không nhận câu fixed hoặc phần chữ cố định template. Chỉ giữ tóm tắt 4 phần gần nhất (240 ký tự/phần), phần cũ nén thành một dòng tối đa 300; tổng tóm tắt tối đa 1.200 ký tự. Ngân sách từ/±5% giữ nguyên.

Lỗi yêu cầu cục bộ status 400/422 cũng dừng chuỗi, kể cả không có upstreamStatus; ngoại lệ JSON/cắt dở giữ cơ chế thử lại.

## Kho: cùng khuôn và chuẩn thước
Cổng vẫn cần 3 kênh cùng khuôn. Nhãn chuẩn thước dành cho kênh đạt số video trưởng thành và trung vị view; kênh còn lại mang nhãn chỉ cùng khuôn. Baseline chỉ dùng video ≥90 ngày; video mới có multiple=null, không tham gia trung vị/xếp hạng và gợi ý câu gõ thử. Nếu không có video trưởng thành, baseline=null. Khi chuyển khảo sát cũ, app gắn migratedFromStrict và hiện số kênh được tính thêm; bấm Đã hiểu để không hiện lại thông báo. Nội dung/chọn nhóm cũ được giữ.

Khi tiếp tục bản nháp, xung đột riêng ở thông báo scriptDraft.error không chặn lưu. Xung đột lời kể vẫn được bảo vệ; giữ trang mở và chép nội dung trước khi tải lại nếu chưa lưu.

Gemini 3 Flash trực tiếp mặc định dùng reasoning_effort=low để hạn chế phần suy luận chiếm ngân sách đầu ra. Nếu truyền mức riêng thì vẫn giữ mức đã chọn. Danh sách model trả thành công chưa đủ chứng minh model viết được; cần thử sinh văn bản.

Groq API trực tiếp: lưu khóa Groq (gsk_) ở mục riêng, khác Grok/xAI. Model có dạng groq/openai/gpt-oss-120b; có thể chọn groq/openai/gpt-oss-20b cho việc nhẹ và Gemini làm dự phòng. Khóa chỉ ở ai-keys.json, không trả lại UI. Model Groq cũ qua gateway vẫn hoạt động nếu chưa cấu hình Groq trực tiếp. Endpoint chính thức https://api.groq.com/openai/v1.

### Tiết kiệm lượt viết và ngữ cảnh
Bản nháp mới chia tối đa 400 từ/lượt; bản nháp đang viết giữ kế hoạch cũ để tiếp tục đúng phần. Ngữ cảnh viết giữ nguyên claim, số liệu, sourceId và status liên quan, bỏ metadata thừa, giới hạn tóm tắt/đoạn nối và tránh gửi trùng bản sắc. Hướng dẫn hook chỉ gửi ở phần đầu, kết luận chỉ ở phần cuối. Lệch từ nhẹ (trong 25%) được giữ và cảnh báo; lệch lớn thử sửa tối đa một lần. Luồng opening/closing cố định cân mục tiêu các phần sau và giữ kiểm tra tổng ±5%, phần cuối kiểm chặt hơn. HTTP429 dùng Retry-After hoặc thời gian trong lỗi dịch vụ; khi có thời gian chờ rõ thì không gọi model sớm. Thiếu thông tin vẫn dùng 10 phút mặc định.

Groq có thêm ô khóa dự phòng riêng. Giữ khóa chính; chỉ thử khóa dự phòng tối đa1 lần khi khóa chính bị401/403. Lỗi429 vẫn tuân thủ thời gian chờ/chuyển model, không tự quay vòng khóa vì hạn mức có thể chung ở cấp tài khoản. Khóa dự phòng lưu ở ai-keys.json, hoặc GROQ_BACKUP_API_KEY; UI chỉ trả trạng thái đã lưu.

### Nhịp chờ hạn mức token
Sau mỗi phản hồi có x-ratelimit-limit-tokens và usage, Studio tính thời gian chờ bằng token đã dùng ×60000/hạn mức token/phút (tối đa60 giây/lượt). Trước lượt AI kế tiếp UI hiện đếm ngược; thời điểm chờ lưu cục bộ và dùng chung giữa các tab cùng trình duyệt. Ví dụ1600 token, hạn mức8000/phút →12 giây. API vẫn có thể429 nếu dùng chung tài khoản ở app khác, hết quota ngày hoặc dịch vụ có hạn mức khác; nhịp chờ không tăng hạn mức.


### Đánh giá kịch bản trước khi xuất

Ở bước Kịch bản, bấm **Đánh giá trước khi xuất** sau khi hoàn tất lời kể. AI nhận xét hook, mạch kể, độ rõ, thông tin mới/lặp ý và kết thúc; tối đa 5 chỗ sửa, có câu trích nguyên văn, lý do, ưu tiên và câu viết thử. Nút tìm câu chỉ chọn đoạn trong lời kể; chép gợi ý dùng clipboard fallback hiện có, không tự sửa bài.

Mặc định bài dài gửi trích đoạn mở/giữa/kết và công bố tỷ lệ ký tự đã xem; chọn **Đọc toàn bộ** sẽ tốn token hơn. Một lượt gọi model chính, tối đa 1800 token đầu ra, không tự retry/fallback cho đánh giá. Bài không đổi dùng nhận xét đã lưu; đổi lời kể/định hướng thì báo nhận xét cũ. Kiểm tra lặp ý bằng code đọc lời kể hiện tại, không dùng scriptParts cũ. Nhận xét là đánh giá biên tập, không bảo đảm lượt xem hay thay đối chiếu nguồn.

Kiểm chứng: test hành vi đỏ trước → xanh, mock HTTP/context sạch, trích dẫn đúng, cache và giữ nguyên lời kể. Chưa kiểm chứng chất lượng nhận xét bằng AI thật hoặc toàn bộ thao tác giao diện trên trình duyệt.


### Tự đề xuất nhân vật phụ và bối cảnh
Mở bước Nhân vật + bối cảnh sẽ tự trích từ kịch bản một lần (có dùng token AI), tối đa 6 nhân vật phụ và 6 bối cảnh. Không cần bible để nhận đề xuất; vẫn cần bible cho nhân vật chủ đạo trước khi xác nhận với kênh có nhân vật. Không bịa thêm khi không cần; giữ danh sách đã sửa/xác nhận. Lỗi được lưu để không tự gọi lặp khi mở lại, có nút Đề xuất lại. Bạn sửa và xác nhận trước khi sang cảnh. Test hành vi đỏ trước, toàn bộ 250 test xanh; chưa kiểm chứng chất lượng trích bằng AI thật.


### Nạp nhân vật ngay tại bước roster
Kênh thiếu bible hiện nút Nạp mẫu Tích ngay trong Nhân vật + bối cảnh, không phải quay lại Bản sắc. Nút tiếp tục chỉ bật khi có nhân vật chủ đạo hợp lệ (hoặc kênh faceless) và đã xác nhận. Nạp mẫu giữ danh sách phụ/bối cảnh, bỏ duyệt bước cuối để xem lại. Test render hành vi đỏ trước rồi xanh; không sửa bible gốc.


### Thẻ cảnh tập trung vào prompt ảnh
Phần chính: mốc bắt đầu–kết thúc cộng dồn theo thời lượng cảnh (thời gian ước tính), lời kể, mô tả hình, prompt ảnh ghép và Copy prompt ảnh. Nhân vật, thẻ bible, animation, overlay và SFX nằm trong Chỉnh nâng cao. Không tự gọi tạo ảnh hoặc chuyển động. Directive yêu cầu hình hợp bối cảnh lịch sử và ý nghĩa lời kể, cảm xúc/đạo cụ có căn cứ; nhân vật chủ đạo có thể làm người dẫn chuyện. Cảnh cũ giữ nguyên, Tạo lại cảnh này áp dụng directive mới. Kiểm chứng bằng test hành vi render và mock HTTP, chưa kiểm chứng chất lượng bằng AI thật.


### Prompt riêng tiếng Việt, bám ý lời kể
AI sinh mô tả hình và prompt riêng bằng tiếng Việt, summary tiếng Việt; ID thẻ và tên roster giữ nguyên. Directive yêu cầu ý chính của đúng cửa sổ lời kể, chủ thể/hành động/quan hệ rõ, ẩn dụ hoặc sơ đồ cho ý trừu tượng, không bịa sự kiện ngoài đoạn. Thẻ cảnh có ô sửa visual/prompt, preview ghép cập nhật ngay và bỏ duyệt cuối khi sửa. Khối bible/phong cách gốc giữ nguyên nên prompt ghép vẫn có thể chứa tiếng Anh. Cảnh cũ không dịch tự động để tránh gọi AI và thay nội dung; bấm Tạo lại cảnh này nếu cần. Test hành vi UI/mock HTTP; chưa kiểm chứng độ bám sát với AI thật.


### Gộp chọn thẻ và viết cảnh
Giao diện dùng combined=true: một lượt scenes trả tagsByIndex và scenes cho mỗi lô tối đa 4 cửa sổ. Kiểm menu/bible và tên roster, thử lại có giới hạn khi lỗi; lời kể và thời lượng do code gắn. Giữ luồng hai lượt cho tương thích. Lưu/resume từng lô, không viết lại cảnh đã có. Giảm số lượt bình thường từ hai xuống một, vẫn giữ pacing quota. 256 test xanh gồm mock HTTP và resume; chưa đo tốc độ với AI thật.


### Việc 1 — Kiểm tra cảnh tiếng Việt
Dòng Kiểm tra dưới lời kể ghép bằng code: nhân vật, nhãn vi của biểu cảm/dáng/đạo cụ/trang phục khác mặc định/đồ họa, góc máy tiếng Việt; thiếu vi dùng ID thẻ. Đổi thẻ/nhân vật cập nhật qua render, không gọi AI. CSV thêm prompt_vi ở cuối; TXT/Markdown/Copy tất cả cũng có bản Việt + dòng kiểm tra. image_prompt giữ cách ghép cũ. Test hành vi đỏ trước rồi 257/257 xanh. Chưa chạy tay dự án mới với AI thật.


### Việc 2 — Dịch prompt tiếng Anh tùy chọn
Chọn Ngôn ngữ prompt gửi app ảnh theo kênh: Việt mặc định, Anh dùng promptEn khi có; cảnh chưa dịch báo Chưa dịch cảnh n và dùng Việt. prompt_vi luôn giữ bản Việt. Nút Dịch prompt sang tiếng Anh mới gọi AI việc nhẹ, lô 4, lưu từng lô và bỏ qua cảnh đã dịch. Lưu promptEn/overlayEn riêng, có ô sửa; không ghi đè prompt/overlay Việt, không gửi research/identity/bible. Kiểm số và tên roster trong bản dịch. image_prompt vẫn ghép bằng composeImagePrompt gốc. 260/260 test xanh, mock HTTP model nhẹ. Chưa kiểm chứng chất lượng dịch và thao tác trình duyệt với AI thật.


### Việc 3 — Kiểm kê chờ duyệt
Danh sách: [REPO_CLEANUP_REVIEW_20261012.md](../docs/REPO_CLEANUP_REVIEW_20261012.md). tools/ ảnh: 48 file, 14,93 MiB; scratch/: 36 file, 2,59 MiB; tmp/: 14.761 file, 2.817,51 MiB; docs/ocr/: 33 file, 0,05 MiB. Git đang theo dõi đúng 107 ảnh (104,54 MiB), nhóm file gốc theo yêu cầu 21 file (0,34 MiB). Các nhóm có thể trùng nhau, không cộng tổng. Mỗi file có dung lượng, trạng thái tracked và đề xuất. Chưa di chuyển, chưa git rm --cached, chưa thêm ignore hoặc xóa trên đĩa. Bước 2 chờ người dùng duyệt; workflow studio-test.yml giữ nguyên. Chỉ thay tài liệu kiểm kê, không thêm test giả cho việc liệt kê.


### Phát hiện bản dịch cũ
Khi dịch lưu promptEnFor/overlayEnFor theo đúng bản Việt của lượt dịch. Bản Việt đổi thì cảnh báo vàng khi chọn Anh, warnings xuất có staleTranslation; vẫn dùng bản Anh cũ theo yêu cầu. Nút dịch chỉ lấy cảnh chưa dịch hoặc đã cũ, giữ cảnh khớp. Sửa promptEn/overlayEn bằng tay ghi nhận bản Việt tương ứng, không gọi AI. Bản dịch cũ thiếu dấu mốc được coi cần dịch lại. Test hành vi đỏ trước, 262/262 xanh; chưa kiểm chứng dịch với AI thật.


### Tiến độ cảnh không lặp lỗi toàn cục
Chưa tạo đủ cảnh hiện một lần ở đầu trang: đã tạo X/Y, còn Z cảnh. Không hiện coverageWarning trên mỗi thẻ; lỗi riêng như thẻ sai, lời kể trùng và prompt dài vẫn hiện. Kiểm tra phủ kịch bản và cổng hoàn tất/export warnings giữ nguyên. Test hành vi render đỏ trước rồi xanh, không gọi AI thêm.


### Thẻ nhân vật phải khớp mô tả cảnh
Lượt combined gửi thêm nghĩa ngắn của pose/prop (không identity) để AI hiểu ID thẻ. Directive yêu cầu thiết kế hành động từ lời kể rồi chọn thẻ tương thích, visual/prompt nêu hành động đã chọn, không tự giơ bảng trắng hoặc vừa giơ bảng hai tay vừa chống cằm. Code phòng vệ: blank-sign thiếu căn cứ trong visual/prompt thì không ghép Pose giơ bảng, báo vàng tagPromptMismatch, dòng Kiểm tra bỏ dáng đó. State/thẻ gốc không sửa ngầm, bible không thay đổi, vẫn dùng composeImagePrompt duy nhất. Không tăng lượt AI. 264/264 test xanh gồm tái hiện prompt sai; chưa kiểm chứng hình vẽ với app ảnh thật hoặc bao quát mọi xung đột dáng.


### Voice thật và prompt copy tiếng Việt
WAV Đức có thời lượng PCM đo được 1.183,4 giây. Căn dự án Germany giữ 180 cảnh/prompt/lời kể, phân phối thời lượng theo tỷ lệ số từ, tổng đúng voice; đây là ước tính, chưa căn timestamp từng câu hoặc xác nhận voice đọc đủ script. sceneTimingMode voice-fit giữ kế hoạch và tạo lại từng cảnh đúng cửa sổ cũ; đổi script/thời lượng sẽ yêu cầu căn lại. Không thêm upload/tts/render. Prompt chọn Việt được bản địa hóa sau composeImagePrompt: khối schoolboy/Tích mẫu, nhãn và mô tả thẻ tiếng Việt; bible gốc giữ nguyên, không gọi AI thêm. Kiểm thử đỏ trước rồi 266/266 xanh; đã áp dụng dữ liệu Germany có backup. Chưa nghe/đối chiếu toàn WAV hoặc kiểm chứng hình tạo từ app ảnh.


### Kiểm tra toàn bộ cảnh và sửa có chọn lọc
Ở bước Cảnh và prompt có Kiểm tra toàn bộ cảnh: AI đối chiếu lời kể, visual, prompt riêng, dòng Kiểm tra và tên roster theo lô 4; không gửi identity/research/sources. Nhận xét cần sửa phải trích đúng phần được cung cấp. Chỉ gọi khi bấm, dùng model chính cho kiểm tra ngữ nghĩa. Lưu từng lô, tiếp tục sau lỗi; cảnh không đổi dùng cache, đổi nội dung/thẻ làm nhận xét cũ. Danh sách riêng hiển thị những cảnh cần sửa. Sửa các cảnh bị đánh dấu chỉ gửi cảnh fix có nhận xét còn khớp, kèm chỉ dẫn sửa; kiểm thẻ và tên, giữ index/narration/duration, xóa animation cũ của cảnh sửa, bản dịch Anh được coi cũ khi bản Việt đổi. Không tự kiểm lại sau sửa; bấm Kiểm tra lần nữa chỉ gửi cảnh đã thay đổi. Không chặn xuất chỉ vì nhận xét AI; đây là hỗ trợ biên tập, không bảo đảm đúng mọi cảnh hoặc xác minh lịch sử. Test hành vi đỏ trước, mock cache/resume/repair/HTTP; chưa chạy đánh giá 180 cảnh với AI thật.


### Kiểm tra cảnh: định dạng linh hoạt, ít xử lý hơn
Chuẩn hóa ID dạng chuỗi, status OK/pass/needs_fix, null hoặc thiếu trường phụ của cảnh ok, mảng kết quả trực tiếp. Cảnh fix vẫn phải có reason/suggestion và trích dẫn thật; chỉ suy ra evidenceField khi câu trích nằm trong dữ liệu gửi. Lỗi định dạng thật thử lại đúng một lần ở server, có giải thích lỗi và đúng danh sách ID; chờ pacing nếu provider báo. Lưu lỗi lô để hiện rõ chỗ cần tiếp tục; các lô đã lưu/cache giữ nguyên. Nhận xét ngắn, temperature 0.1, budget 1400. Tính trạng thái từ dữ liệu cảnh trực tiếp, không ghép toàn bộ prompt cho mỗi cảnh. Không tự gọi AI khi mở trang; test hành vi đỏ trước và mock HTTP. Chưa kiểm chứng lại 180 cảnh bằng AI thật.


### Căn lại voice từ giao diện
Bước Cảnh và prompt có Thời lượng voice thật và Căn cảnh theo voice thật. Nhận mm:ss (19:36 = 1176), h:mm:ss (1:19:36 = 4776, không phải 1176) và số giây thập phân; preview ngay khi gõ, đầu vào rác không lưu. Khi đã có cảnh, ô giây cũ bị khóa; nút căn gọi fitScenesToVoice không AI, giữ narration/prompt/index. Chỉ căn được khi các cảnh phủ đủ lời kể; nếu lời kể đã sửa và không còn khớp, cần sửa lại lời kể hoặc cảnh trước, không giả vờ đã khớp. Báo tổng cũ → mới/chênh lệch, số cảnh vượt nhịp, chỉ số và dài nhất. Cảnh dài có durationExceeded và cờ vàng; không tự chia. CSV/TXT/Markdown thêm duration/start/end trước prompt_vi để prompt_vi vẫn cuối; duration giữ số thật, mốc mm:ss cộng dồn. 276/276 test xanh; chưa kiểm chứng khớp từng câu với SRT hoặc chạy tay launcher.


### Căn mốc cảnh bằng file voice — xử lý tại trình duyệt
Bên cạnh ô thời lượng có Tải voice (mp3, wav, m4a). AudioContext giải mã ở 8000 Hz và trộn mono; chặn file trên 200 MB/không giải mã được, gợi ý file chỉ có giọng nói. File, byte âm thanh và samples không được đưa vào API/state hay gửi đến AI; chỉ tên/kích thước/ngày sửa và mốc đã tính lưu trong dự án. Chọn file sẽ căn tự động, không cần tạo lại cảnh. Tổng thời lượng gồm im lặng đầu/cuối lấy từ detectPauses.duration; timeline cảnh bắt đầu ở speechStart và kết thúc speechEnd.

Hai file voice-align.mjs và voice-align.test.mjs được chép nguyên byte từ bản cung cấp, SHA256 khớp; không thay logic. Lớp tích hợp lấy anchorable từ dấu kết câu (. ? ! … :) sau khi bỏ ngoặc/dấu nháy cuối. total chỉ đếm ranh giới đủ điều kiện neo, không tính ranh giới cuối file. Nếu alignScenes trả ends=null, lớp tích hợp dùng fitScenesToVoice hiện có làm fallback theo số từ, matched=0 và báo ước lượng. Nhãn pauses/words suy ra từ mốc khớp tâm ngắt nghỉ; điểm đầu/cuối file là mốc detector cố định. Cảnh nội suy có ~ trên mốc, mm:ss.mmm khi căn âm thanh.

Hiện Khớp matched/total ranh giới theo ngắt nghỉ; dưới 60% hoặc không có ranh giới neo thì cảnh báo vàng Voice ít ngắt nghỉ hoặc có nhạc nền, mốc cảnh chỉ là ước lượng. Mode voice-aligned lưu basis lời kể/các cửa sổ/voice; thay lời kể, thời lượng hoặc source thì báo căn lại và khóa hoàn tất. Giải mã file mới lỗi giữ mốc cũ, có cảnh báo. Căn lại bằng số giây chuyển về voice-fit và bỏ mốc pause cũ. Lời kể, prompt và thẻ giữ nguyên; approved bước cảnh bỏ để xem lại. Nhịp tối đa dùng dung sai 0,5 giây, không tự chia. Xuất CSV/TXT/Markdown/Copy tất cả lấy mốc mới; thêm timing_source ở cuối, không đổi thứ tự 14 cột cũ.

Test hành vi dựng âm thanh nhẹ tại chỗ, decode giả lập, chặn network, giữ nội dung, fallback, stale voice/script, xuất timing và dung sai; test đỏ trước. Chưa chạy giải mã/đối chiếu file voice thật trong trình duyệt, chưa xác minh mốc bằng phụ đề SRT.

Nghiệm thu cuối: 290/290 test xanh. SHA256 hai bản chép local khớp file Downloads cung cấp. Không thêm route upload/AI hoặc thay file bible/preset.


### Một prompt ảnh để copy
Phần chính mỗi thẻ chỉ hiện Prompt ảnh hoàn chỉnh (phong cách + nhân vật + mô tả cảnh) và nút Copy prompt hoàn chỉnh. Prompt riêng/bản Anh để sửa và Copy cảnh đầy đủ chuyển vào Chỉnh nâng cao. Không đổi nội dung prompt, cách ghép hoặc state; không gọi AI. Test hành vi render đỏ trước rồi xanh.

### Dựng video từ voice + ảnh (flow chính)
Kịch bản đã duyệt giữ trong dự án; voice và ảnh làm ở app ngoài rồi nhập lại.
Bước Cảnh và prompt gom thành 4 chặng: Kịch bản + voice → Duyệt cảnh → Tạo/nhập hình → Xem trước + xuất.
Nhập SRT từ app voice để lấy mốc từng câu (0 token); không có SRT mới cần xử lý audio local.
Ảnh nhập từng cảnh (PNG/JPEG/WebP ≤10 MB, lưu qua /api/assets); cảnh thiếu ảnh sẽ chặn dựng để giữ khớp voice.
Xuất gói SRT/CSV/JSON bằng code; dựng MP4 bằng FFmpeg local (h264/aac cố định 1920x1080, kiểm tra khớp thời lượng voice).
POST /api/render nhận ảnh/voice dạng data URL hoặc /api/assets; GET /api/capabilities báo ffmpeg/ffmpegVersion.
POST /api/transcribe trả 501 cho tới khi có engine local — nhập SRT thay thế.
Đổi nhạc/phụ đề chỉ ghép lại; đổi ảnh/overlay/thời lượng mới dựng lại cảnh đó (sceneCacheKey).
Cảnh chữ/số liệu dùng HTML: nhập đoạn HTML (chỉ CSS, không script, làm sạch + chặn mạng), Chromium local ghi hình offline 3–20 giây rồi ép chuẩn khung dựng/30fps.
Cảnh cần nhân vật cử động dùng Wan local qua ComfyUI (node Wan22ImageToVideoLatent + model wan2.2, ~2 phút/clip 2s, chạy lần lượt, duyệt động tác bằng mắt).
POST /api/wan nhận ảnh + mô tả chuyển động, trả clip MP4 lưu qua /api/assets; thiếu ComfyUI trả 503.
Mỗi cảnh chọn 1 loại dựng (image/html/wan); /api/render dựng từng đoạn rồi nối, cảnh thiếu nội dung sẽ chặn dựng, kết quả có kinds và URL tải MP4.
GET /api/capabilities báo thêm htmlVideo/wan.


### Dựng video 1080p và voice local

- MP4 cố định 1920 × 1080, 30 FPS, H.264 CRF 18/preset fast và AAC 192 kbps. Không hỗ trợ xuất 720p.
- Cần đủ nội dung mọi cảnh (tối đa 1000); tổng thời lượng phải khớp voice trong 0,5 giây. Không bỏ cảnh thiếu ảnh/clip.
- POST /api/render trả 202 và mã job; GET /api/renders/:id trả tiến trình; kết quả có URL tải MP4 trực tiếp. Mỗi lần chỉ chạy một bản dựng, tối đa 5 job chờ/chạy.
- MP4 và metadata lưu tại .studio-data/renders; cache cảnh ở .studio-data/render-cache. Giữ cache để lần dựng sau chỉ xử lý cảnh đổi. Cache và video lưu trên ổ đĩa, chưa tự xóa bản cũ.
- Job đang chạy bị gián đoạn khi server khởi động lại phải dựng lại; cảnh đã cache được tái sử dụng. Job hoàn tất vẫn tải được sau khởi động lại.
- Python: STUDIO_PYTHON chỉ đường dẫn Python có faster-whisper, av, numpy; ưu tiên .venv trong repo, sau đó môi trường cũ nếu có, cuối cùng Python trong PATH. STUDIO_WHISPER_CACHE cấu hình thư mục model (mặc định .studio-data/whisper-models). GPU cần torch/CUDA phù hợp; thiếu torch/CUDA sẽ thử CPU. Cài dependency: python -m pip install faster-whisper av numpy.
- File audio tạm được dọn khi job voice hoàn tất hoặc lỗi; kết quả nhận diện được giữ để dùng lại. Dựng MP4 và căn voice local không gọi AI API.

### Chất lượng kể chuyện khi tạo kịch bản mới

Dàn ý mới đi theo câu hỏi trung tâm, tình huống, lựa chọn/cơ chế và hậu quả có chứng cứ. Mỗi phần viết nhận vị trí trong mạch kể và ý kế tiếp để tránh khởi động lại câu chuyện. Kiểm tra bằng code phát hiện phần trùng đáng kể với các trích đoạn gần nhất; dùng chung tối đa một lượt sửa với kiểm tra độ dài. Nếu vẫn trùng, giữ bản nháp và cảnh báo để duyệt. Đây là kiểm tra trùng văn bản, không thay thế đánh giá nội dung hoặc fact-check.

Hướng dẫn riêng về Đức chỉ gửi cho chủ đề liên quan. Không đổi model, tự gọi API, sửa kịch bản đã lưu hoặc viết lại các phần đã hoàn tất. Tạo dàn ý/viết kịch bản bằng các nút hiện có để áp dụng; nguồn nghiên cứu và giọng kênh vẫn quyết định chất lượng đầu ra.


### Prompt Tích Thông Thái và duyệt trước khi hoàn tất

- Khi viết mới cho kênh Tích Thông Thái: hook rồi giới thiệu Tích/mời theo dõi ngắn; kết giải đáp, câu hỏi bình luận, lời mời đăng ký và tagline “Chuyện quen. Góc nhìn lạ.”. Các đoạn fixed/template do người dùng đặt vẫn giữ nguyên.
- Số từ đếm theo khoảng trắng; thời lượng đọc là ước tính 150 từ/phút. Nguồn phải có nội dung trong Research; không tự tra web hoặc nhận đã fact-check. Tiêu đề và ghi chú tách khỏi narration theo flow hiện có.
- Viết từng phần vẫn tối đa một lượt sửa. Khi đủ bản nháp, app đọc toàn bài bằng scriptReview, sửa các trích đoạn có lỗi và duyệt lại: tối đa hai vòng sửa/ba lượt duyệt mỗi lần bấm. Bước này có dùng thêm token; không dùng review trích đoạn để duyệt đạt toàn bài.
- Chỉ thay narration đã hoàn tất khi cả 5 tiêu chí good, không còn issue, kiểm tra local/nhận diện kênh đạt và số từ trong ±5% mục tiêu. API lỗi, còn vấn đề hoặc quá giới hạn một lượt duyệt thì giữ bản nháp, không công bố hoàn tất. Đây là cổng biên tập, không bảo đảm tuyệt đối về ngữ nghĩa hay thay đối chiếu nguồn.
- Bản nháp lỗi có thể sửa ngay tại ô nháp rồi bấm tiếp tục; bản hoàn tất chỉnh tay dùng “Duyệt lời dẫn hiện tại”. Sửa lời dẫn hoặc đầu vào làm kết quả duyệt hết hiệu lực. Bản đã duyệt chưa đổi không gọi lại API khi bấm duyệt.
- Giới hạn lượt duyệt hiện tại: tối đa 50.000 ký tự/60 khối văn bản; vượt giới hạn sẽ dừng, không tự chuyển sang đọc mẫu và tuyên bố đã kiểm toàn bài.


### Mục tiêu số từ trực tiếp và bổ sung nội dung thiếu

Nhập “Số từ mục tiêu” ở Chủ đề hoặc Dàn ý và kịch bản (100–20.000, đơn vị ngăn cách bằng khoảng trắng). Nếu có, mục tiêu này ưu tiên hơn số phút; để trống giữ cách tính theo phút. Ví dụ 5.000 từ chỉ hoàn tất trong khoảng 4.750–5.250 từ, không giao bản 2.000 từ như bản hoàn chỉnh.

Dàn ý và cả hai đường viết dùng cùng ngân sách; lời mở/kết cố định cũng tính vào tổng. Các lượt viết nhỏ (thường tối đa 400 từ) và tự lưu. Bản thiếu sau khi viết hoặc sau khi sửa câu được bổ sung vào thân bài theo phần còn ít nội dung, giữ mở/kết và phần đã viết. Đoạn mới phát triển bối cảnh/cơ chế/diễn biến/ví dụ từ chứng cứ supported, không đổi thành tóm tắt hoặc bù bằng lặp ý. Sau bổ sung phải đọc lại toàn bài trước khi công bố.

Bổ sung chỉ chạy khi dưới ngưỡng 95%; tối đa 32 lượt bổ sung cho mỗi lần bấm, có lưu tiếp từng lượt. Thiếu nguồn, lặp nội dung, thêm số liệu chưa có trong chứng cứ, lỗi API hoặc vượt giới hạn duyệt toàn bài thì giữ nháp và báo cần tiếp tục. Không cắt bớt tự động khi vượt ngưỡng 105%. Không đổi giới hạn duyệt 50.000 ký tự/60 khối hiện có.

### Duyệt kịch bản dài theo lô (2026-10-21)
- Bản nháp dài được kiểm tra mạch kể bằng trích đoạn tổng thể, sau đó đọc đủ từng đoạn theo lô tối đa 6.000 ký tự. Bài ngắn giữ một lượt duyệt.
- Lưu kết quả từng lô theo đúng nội dung đầu vào; bấm tiếp tục sẽ bỏ qua lô đã duyệt. Đổi nội dung sẽ làm mất hiệu lực kết quả cũ.
- Chỉ công nhận lời dẫn hoàn chỉnh sau khi duyệt và kiểm độ dài đạt. Không cần dựng lại dàn ý khi lỗi ở bước duyệt.
- HTTP 413 được phân loại là yêu cầu quá lớn, không còn gọi là quá tải model. Lô nhỏ giảm kích thước mỗi yêu cầu, không bảo đảm tránh mọi hạn mức của nhà cung cấp.

### Chất lượng bản nháp và kiểm tra chứng cứ (2026-10-21)
- Lượt duyệt tự rút gọn phần nhận xét dài; câu trích và câu thay thế vẫn kiểm nguyên văn, không cắt để hợp thức hóa. Lỗi định dạng thử lại đúng một lần theo lô; lỗi quota/mạng không tự nhân lượt gọi.
- Bước kịch bản báo rõ nếu Research chưa có fact/claim `supported`, hoặc dự án thuộc kênh chưa đặt tên và chưa áp dụng mở–kết Tích. Không tự đổi kênh hay tự chèn lời nhận diện.
- Context viết có danh sách ý đã kể trên toàn bài (tối đa 24 mục, dung lượng nhỏ), nhấn rõ dàn ý chưa phải chứng cứ. AI phải dùng fact/claim supported, không phát triển chi tiết kỹ thuật suy đoán để đủ từ.
- Lượt duyệt được báo tình trạng chứng cứ; kết quả biên tập không thay việc xác minh nguồn. Bản đủ số từ vẫn có thể chưa sẵn sàng thu âm.
