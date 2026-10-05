# Bản sửa theo góp ý trong “Đọc repo ứng dụng.docx”

Ngày kiểm tra: 05/10/2026. Giữ ứng dụng hiện có, dùng lại `rx.mjs` và `core.mjs` theo hướng C.

## Đã nối vào ứng dụng

- Khảo sát có sáu bước ở cả UI và API: sân → khuôn → kho → nhóm → gõ thử → chủ đề. Backend từ chối gọi bước sau khi cổng trước chưa đạt. PUT state không thể tự đặt `passed` hoặc giả khóa niche.
- Một bộ `RULES`: 20 tiêu đề mới nhất, cụm mở đầu dài nhất lặp **trên** 50%; video ít nhất 90 ngày; kênh ít nhất 5 video trưởng thành và trung vị ít nhất 20.000; ít nhất 3 kênh cùng khuôn. Luồng mới không dùng lựa chọn ngưỡng rộng/vừa/chặt của luồng cũ.
- Đọc uploads phân trang 50 video/lượt, tối đa 1.000 video/kênh. Khi vẫn còn trang hoặc thiếu chi tiết video, kênh được đánh dấu chưa đầy đủ và không qua cổng. Phân loại Shorts từ thời lượng còn gần đúng, được hiển thị rõ.
- Chia 4–7 nhóm: AI chỉ nhận ID và title. Code kiểm tra ID, phân loại đủ video, tính view/bội số/số kênh. Người dùng chọn một nhóm trước khi gõ thử.
- Ba mẫu tìm kiếm, mỗi mẫu đủ 20 kết quả; lấy trung vị số video **vượt** 20.000 view; cần ít nhất 11/20. Mẫu thiếu hoặc số âm không thể đạt.
- Kiểm tra đúng 20 tiêu đề mới, không rỗng, không trùng nhau hoặc title trong kho, đúng prefix khuôn. Đây là kiểm tra trùng tiêu đề; tính mới về nội dung vẫn cần biên tập viên đối chiếu.
- Khóa khuôn, angle, nhóm, 20 chủ đề được clone và đóng băng sâu trong bộ quy tắc. Server giữ khóa vào kênh và dự án. Sửa dữ liệu nguồn hoặc chạy lại bước trước làm mất các kết quả phụ thuộc. Kênh tạo thủ công từ trang chủ vẫn là hồ sơ chưa có bằng chứng khảo sát.
- Hồ sơ `visualProfile` được gửi cùng yêu cầu tạo prompt. Có preset Stickman và giữ mô tả/character sheet Tích của kênh, caption đặt ở editor.
- Prompt ảnh và animation tách riêng. Animation chạy từng batch 4 cảnh đã có ảnh; kiểm tra đúng scene ID, duyệt từng prompt và xuất danh sách đã duyệt. AI hiện lập chuyển động từ mô tả ảnh, không thực hiện xem ảnh hoặc tạo clip.
- Script dài được chia thành các phần mục tiêu không quá 220 từ; mỗi phần được lưu. Có thể tiếp tục bản nháp sau lỗi. Thay script giữ bản cũ và đánh dấu cảnh cần làm mới. Cảnh chia từng batch 4, giữ nguyên toàn bộ từ của lời kể, duration cuối là phần dư.
- Phát hiện AI hết giới hạn đầu ra và báo lỗi thay vì nhận kết quả bị cắt.
- Media được lưu riêng trong `.studio-data/assets`, dự án giữ URL nội bộ. File trùng được tái sử dụng theo hash. Media base64 cũ được chuyển đổi với một bản sao state để phục hồi. Không xóa media tự động.
- Dựng MP4 chặn cảnh thiếu ảnh và timeline lệch voice quá 0,5 giây; không âm thầm bỏ cảnh hay cắt lời. FFmpeg đã dựng thử video 2 giây, đủ hai cảnh và không bỏ cảnh.
- Groq trực tiếp: bỏ prefix `groq/` của model khi gọi API trực tiếp, Whisper dùng ngôn ngữ kênh. API tạo ảnh với mascot cần character sheet; nếu adapter không hỗ trợ reference thì trả lỗi rõ ràng, không giả vờ khóa nhận diện.

## Kiểm chứng đầu–cuối trên trình duyệt (05/10/2026)

- Wizard 6 bước chạy thật trên kho nhập 60 video (fixture giả lập, đã gắn `duration` vì server lọc video dài theo thời lượng): sân → khuôn (`the entire history of the`) → kho 3/3 kênh đạt → 5 nhóm Groq thật → gõ thử trung vị 11/20 → 20 chủ đề Groq thật, khóa niche, dựng kênh kèm `nicheLock` (`identity.titlePattern` đã nhận khuôn).
- Bước chủ đề từng trả toàn tiêu đề trùng kho; đã sửa bằng cách gom tiêu đề hợp lệ qua 2 lượt gọi (lượt 2 kèm danh sách tránh) thay vì đòi một lượt đúng hết.
- 0 lỗi console trên tất cả màn hình đã đi qua.

## Kiểm chứng

Chạy `node --test studio/core.test.mjs studio/rx.test.mjs studio/niche.test.mjs studio/niche-api.test.mjs studio/production.test.mjs studio/integration.test.mjs`.

39 kiểm thử đã qua. Kiểm thử HTTP dùng cổng/data directory riêng, không thay dữ liệu người dùng, không gọi provider trả phí. Bao gồm chống giả cổng, kiểm tra revision đồng thời, phân trang 60 uploads với YouTube giả lập, lưu media và FFmpeg thật.

Yêu cầu `/api/test` trên app hiện tại đã trả `{ok:true, model:"openai/gpt-oss-120b"}`. Gateway hiện tại là `https://api.groq.com/openai/v1`; tên model có `openai/` không đổi provider thành OpenAI.

## Giới hạn cần giữ rõ

- Kiểm thử toàn bộ khảo sát dùng dữ liệu giả lập hoặc nhập có xác nhận. Không coi dữ liệu người dùng khai báo là số liệu đã được YouTube xác minh. Chưa kiểm chứng một niche thật từ đầu đến cuối bằng API YouTube.
- Chưa chạy dịch vụ tạo ảnh, TTS, Suno hoặc đăng video YouTube thật. Adapter image edit có truyền file reference nhưng chưa kiểm chứng chất lượng khóa mascot với một provider ảnh thực tế. ComfyUI reference workflow chưa nối.
- Bản dựng MP4 hiện là ảnh tĩnh + audio/nhạc nền. Chưa dùng clip animation và chưa xuất dự án CapCut native. Gói ZIP là gói bàn giao media/prompt, không phải project CapCut.
- Không khẳng định mọi công cụ bên ngoài miễn phí hoặc mọi bước AI có giá cố định. Kiểm tra hạn mức và hóa đơn ở provider đang dùng.

## Quota YouTube hiện hành

[Google Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost), cập nhật 15/09/2026: mặc định search.list có quỹ 100 lượt/ngày, videos.insert có quỹ 100 lượt/ngày; mỗi lượt dùng 1 đơn vị trong quỹ riêng. Các endpoint khác dùng chung quỹ 10.000 đơn vị/ngày; channels.list, playlistItems.list, videos.list mỗi lượt 1 đơn vị. Bộ đếm app chỉ là ước tính trong phiên chạy; Google Cloud là nguồn hạn mức thực tế.
