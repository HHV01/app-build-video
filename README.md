# Tích Studio

Ứng dụng chạy trên máy để khảo sát ngách YouTube, xây hồ sơ kênh và làm video qua chín bước: chủ đề, tiêu đề/thumbnail, research, kịch bản, chia cảnh, nhân vật/bối cảnh, cảnh, giọng và đóng gói.

## Yêu cầu

- Node.js 22 trở lên và npm đi kèm.
- `ffmpeg` và `ffprobe` để dựng MP4. Đặt binary trong `tools/ffmpeg/bin/` hoặc cài vào PATH. Windows dùng được bản `.exe`.
- AI chữ dùng Groq hoặc gateway được cấu hình riêng. Khảo sát trực tiếp cần YouTube Data API key; có thể nhập kho JSON/CSV có xác nhận.

## Chạy trên máy

Chạy từ thư mục gốc repo:

```sh
npm run studio
```

Mở [Tích Studio](http://localhost:3210). Vào **Kết nối API** để cấu hình dịch vụ. Nếu cần cấu hình gateway, sao chép `.env.example` thành `.env` rồi điền thông tin của bạn. Không đưa khóa hoặc `.studio-data/` lên Git.

```sh
npm run studio:test
```

Test dùng dữ liệu và cổng riêng, không gọi API YouTube/Groq thật. Khi thiếu ffmpeg/ffprobe, chỉ phần kiểm thử dựng video được bỏ qua với lý do; các kiểm thử HTTP vẫn chạy. GitHub Actions chạy bộ test trên Ubuntu và Windows.

Đọc [hướng dẫn ứng dụng](studio/README.md), [các bản sửa và giới hạn kiểm chứng](studio/REVIEW_FIXES.md) và [danh sách file chờ duyệt, chưa xoá](studio/FILE_REVIEW_INVENTORY.md).
