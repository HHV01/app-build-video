# Tích Studio

Chạy `node studio/server.mjs` hoặc `start_studio.bat`; mở http://localhost:3210.

## Cấu trúc

| File | Vai trò |
|---|---|
| studio/server.mjs | Server localhost, trạng thái, provider AI, YouTube, FFmpeg |
| studio/core.mjs | Nhập dữ liệu, median, kiểm tra JSON/nhóm |
| studio/rx.mjs | Bộ RULES dùng chung cho niche mới; hook, thumbnail, timing, ZIP naming |
| studio/niche-api.mjs | Khảo sát sáu bước, phân trang và khóa kết quả |
| studio/production.mjs | Chia script/cảnh và kiểm tra animation |
| studio/assets.mjs | Media lưu file riêng, URL nội bộ, hash và kiểm tra đường dẫn |
| studio/public/niche-ui.mjs | Giao diện khảo sát theo RULES |
| studio/public/app.js | Kênh, xưởng chín bước, lưu tự động |

## Tìm ngách

Sau khi **Tìm khuôn tiêu đề**, chọn một radio trong danh sách cụm mở đầu đã lặp ở **hơn 50%** tiêu đề nội dung mới nhất rồi bấm **Dùng khuôn này**. Mặc định là cụm dài nhất; các cụm có cùng số tiêu đề khớp được đánh dấu **rộng nhất** / **chặt nhất** ở hai đầu. Các cụm ở giữa vẫn chọn được. Khuôn kết thúc bằng `the`, `a`, `an` bị loại. Không có ô gõ khuôn tự do: server tính lại danh sách từ kênh chỉ đường và từ chối mọi giá trị ngoài danh sách, tránh vượt cổng bằng cách gõ tay. Chọn lại khuôn xóa kết quả từ bước Kho trở đi.

Ở bước **Kho**, nguồn **YouTube Data API** có ô **Thêm kênh bạn biết cùng khuôn**: tối đa 5 dòng, mỗi dòng là URL `/@handle`, `/channel/UC…`, ID `UC…` hoặc `@handle`. Mỗi kênh vẫn phải cùng khuôn, chỉ tính video mang khuôn và qua ngưỡng trưởng thành/view. Kênh không đạt vẫn hiện nhãn **do bạn thêm** và lý do; kênh trùng chỉ đếm một lần. Nguồn nhập JSON/CSV bỏ qua danh sách thêm tay và thông báo rõ. Ước tính quota của lần cào có tính cả lượt đọc kênh thêm tay, chưa phải quota thực tế sau cache.

Sân → khuôn tiêu đề → kho ít nhất 3 kênh → 4–7 nhóm → ba mẫu gõ thử → khóa 20 chủ đề.

Khuôn là cụm mở đầu dài nhất lặp **trên** 50% của tối đa 20 tiêu đề nội dung mới nhất (cần ít nhất 10,
giá trị trong `RULES.minTitlesForTemplate`). Chỉ tính video dài ≥ 120 giây (`RULES.minContentSeconds`) —
Shorts và video quá ngắn bị loại **trước** khi đếm khuôn, nên `contentVideos()` là nơi duy nhất quyết định
"video nội dung". Khuôn không bao giờ kết thúc bằng mạo từ (`the`, `a`, `an`): khuôn kiểu `…of the` bắt
mọi chủ đề mới phải viết `…of the X`, không dùng được.

Mỗi kênh cần ít nhất 5 video từ 90 ngày và trung vị ít nhất 20.000 view, tính **trên các video mang khuôn**
— video nổi bật nhất của kênh nhưng nói chủ đề khác không được kéo trung vị hay bội số. Khi so khuôn giữa
các kênh, kênh lặp cụm **dài hơn** khuôn đã chốt vẫn được tính là cùng khuôn (`startsWith`), vì đó vẫn là
một dòng tiêu đề.

Ở chế độ trực tiếp, Studio tìm kênh bằng `search type=video` với `q="<khuôn>"`, `maxResults=50`, chỉ trong
năm hiện tại; lấy `snippet.channelId`, gộp trùng và dừng ở 10 kênh. `search type=channel` không dùng vì nó
chỉ khớp tên kênh.

Gõ thử cần đủ 20 video mỗi mẫu, trung vị số video vượt 20.000 view đạt ít nhất 11/20. Khi chế độ trực tiếp,
ba câu tìm được điền sẵn từ **nhóm dựng được đủ ba câu** (ưu tiên nhóm nhiều câu, rồi tới bội số trung vị cao nhất); nếu gõ thử trượt thì có nút quay lại bước
Chia nhóm để thử nhóm khác. Các lựa chọn ngưỡng rộng/vừa/chặt trong helper cũ không áp dụng cho luồng mới.

Chủ đề cuối phải theo đúng khuôn và **không trùng thực thể** với kho: thực thể là phần tiêu đề còn lại sau
khi bỏ khuôn và bỏ mạo từ đầu, và so khớp theo cụm từ liên tiếp — kho có `…of Egypt` thì `…of Ancient Egypt`
là trùng, còn `…of Egyptian Empire` là thực thể khác. Chủ đề do AI đề xuất được xếp theo mức nhiều người biết
(`knownBy`: cao > vừa > thấp) trước khi cắt còn 20.

Kho nhập JSON/CSV được ghi rõ là do người dùng khai báo. Khảo sát trực tiếp cần YouTube Data API key. Đọc tối đa 1.000 uploads/kênh; vượt giới hạn hoặc thiếu dữ liệu sẽ không chốt cổng. Shorts suy từ thời lượng chưa phải xác nhận tuyệt đối.

Kênh dựng từ niche đã chốt dùng lại khuôn, angle, nhóm và 20 chủ đề. Hồ sơ kênh thủ công chưa có khóa bằng chứng.

## Xưởng chín bước

Chủ đề → Tiêu đề + Thumbnail → Research → Kịch bản → Chia cảnh → Nhân vật + Bối cảnh → Cảnh → Giọng → Đóng gói.

Script chia nhỏ và lưu từng phần; cảnh chia batch bốn theo lời kể gốc. Hồ sơ visualProfile giữ phong cách kênh. Prompt ảnh tách khỏi prompt animation; animation cần duyệt trước khi xuất. Đây là lập prompt chuyển động, chưa tạo clip video.

Ảnh/audio lưu ở .studio-data/assets; state giữ URL nội bộ. Backup trước chuyển đổi media được giữ trên máy. Không xóa assets tự động.

## Provider và chi phí

Provider lấy từ .env và trang Kết nối API. Cấu hình hiện tại gọi Groq trực tiếp. Khi dùng OmniRoute, model cần đúng định dạng gateway. Cấu hình app không thay provider/model của phiên Codex.

Groq trong cấu hình này dùng cho nội dung chữ và Whisper STT. Tạo ảnh, TTS, nhạc và đăng YouTube cần dịch vụ/cấu hình riêng; không có bảo đảm miễn phí hoặc giá cố định. Luồng xuất prompt và nạp file thủ công vẫn dùng được.

Tạo ảnh mascot cần character sheet. Adapter image edit gửi reference khi provider hỗ trợ; chưa kiểm chứng provider ảnh thật. ComfyUI reference workflow chưa được nối.

## Đóng gói

FFmpeg/ffprobe được tìm ở tools/ffmpeg/bin hoặc PATH. Dựng MP4 ảnh tĩnh + audio, H.264/AAC, mặc định 1280×720. Thiếu ảnh hoặc timeline lệch voice quá 0,5 giây bị chặn; không âm thầm bỏ cảnh/cắt lời. Nhạc tùy chọn hạ còn 1/8 giọng và lặp đủ dài. Bản dựng giữ ở .studio-data/build.

ZIP chứa prompt, ảnh, danh sách clip và tài liệu bàn giao. Chưa xuất project CapCut native hoặc ghép clip animation vào MP4.

Đăng YouTube cần OAuth của bạn, chỉ chạy khi bấm nút đăng, mặc định riêng tư. Upload resumable chia
khối 8 MB; khối trung gian trả HTTP 308 (Resume Incomplete) được đọc header `Range` rồi gửi tiếp, không
bị coi là lỗi. `selfDeclaredMadeForKids` chỉ gửi trong `status`, không gửi trong `snippet`.
**Chưa kiểm chứng tải lên thật trong bản sửa này** — kiểm thử dùng HTTP mock cục bộ.

Hai biến môi trường chỉ dùng cho kiểm thử: `STUDIO_UPLOAD_URL` trỏ endpoint upload sang mock,
`STUDIO_UPLOAD_CHUNK` ghi đè kích thước khối (mặc định 8 MB).

## Quota YouTube

Theo [tài liệu Google hiện hành](https://developers.google.com/youtube/v3/determine_quota_cost), mặc định 100 search/ngày, 100 upload/ngày trong hai quỹ riêng; endpoint đọc khác dùng chung 10.000 đơn vị/ngày. channels.list, playlistItems.list và videos.list mỗi lượt 1 đơn vị. Bộ đếm app là ước tính trong phiên; xem quota thực tế ở Google Cloud.

## Kiểm tra

`npm run studio:test`

Nghiệm thu ngày 06/10/2026: 109 kiểm thử đạt, không lỗi, không bỏ qua trên máy có FFmpeg. [Chi tiết bản sửa và phần chưa kiểm chứng](REVIEW_FIXES.md).

## Flow tìm ngách rút gọn

Kênh tham khảo → Chọn khuôn → Kiểm tra ngách (kho kênh, nhóm, nhu cầu) → 20 chủ đề → Dựng kênh. Dán link hoặc @handle, nhập góc kể rồi bấm **Phân tích kênh**. Thị trường, ngôn ngữ, định dạng và tên khảo sát nằm trong mục mở rộng. Khảo sát mới mặc định dùng YouTube API; kho JSON/CSV vẫn có trong nguồn dữ liệu.

Khuôn dài nhất được đề xuất; mở **Xem thêm lựa chọn** để chọn khuôn khác đã đạt hơn 50%. **Dùng khuôn này** tự kiểm tra kho. Thiếu kênh thì xem số còn thiếu, thêm kênh hoặc thử khuôn khác. Các cổng ở backend giữ nguyên; không có khuôn gõ tự do.

Chọn nhóm xong, câu tìm gợi ý được lưu và có thể sửa; ô cố ý xoá trống không bị tự điền lại. Các bước liên tiếp dừng khi chưa đạt hoặc API lỗi, giữ kết quả đã hoàn thành. Tạo kênh dùng lại khuôn, góc kể, nhóm, 20 chủ đề và link tham khảo.

## Bổ sung D1–D6 và C1/C4

Kênh khám phá không truy cập được hiện thành dòng không đạt, kèm lý do. Kho nhập có ít nhất 80% video duration=0 chưa đánh dấu Shorts cần bổ sung cột duration; bước Khuôn báo lỗi rõ, bước Kho giữ dòng không đạt.

Gõ thử YouTube lấy 25 kết quả, lọc chi tiết/view hợp lệ rồi dùng 20; thiếu sẽ báo số thực có. Chủ đề mới so trùng với kho và với nhau, có ngoại lệ cho thực thể một từ chung; đồng nghĩa vẫn cần đối chiếu tay. knownBy được xếp lại sau cả hai lượt trước khi lấy 20. titles gửi vào phải là mảng.

Test chạy trên dữ liệu riêng. Thiếu ffmpeg/ffprobe chỉ bỏ qua subtest dựng, vẫn kiểm chứng HTTP. Workflow GitHub Actions kiểm thử Ubuntu/Windows với Node 22; chưa có kết quả chạy CI từ GitHub cho bản sửa này. [Kiểm kê file chờ duyệt, chưa xoá](FILE_REVIEW_INVENTORY.md). Các thay đổi D1/D5 và chuỗi khảo sát mới chưa được kiểm chứng với YouTube thật; test dùng mock, không tiêu quota thật.

Các nút tìm ngách đọc trực tiếp nội dung ô nhập trước khi chạy, nên không phụ thuộc việc rời ô để lưu. Kiểm chứng UI trên kho giả lập riêng đã đi từ Phân tích kênh → duyệt khuôn/tự chạy kho → chọn nhóm → nhập mẫu nhu cầu → chốt 20 chủ đề → dựng kênh, giữ đúng khuôn và angle. [Ảnh kiểm chứng](screenshots/niche-ux-review.jpg).
