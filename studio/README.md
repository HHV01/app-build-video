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
ba câu tìm được điền sẵn từ **nhóm có bội số trung vị cao nhất**; nếu gõ thử trượt thì có nút quay lại bước
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

`node --test studio/core.test.mjs studio/rx.test.mjs studio/niche.test.mjs studio/niche-api.test.mjs studio/production.test.mjs studio/integration.test.mjs`

39 kiểm thử. [Chi tiết bản sửa và phần chưa kiểm chứng](REVIEW_FIXES.md).
