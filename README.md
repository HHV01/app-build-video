# Tích Studio · Tìm ngách và kịch bản

Khảo sát ngách YouTube, xây hồ sơ kênh và viết kịch bản qua sáu bước: Chủ đề → Tiêu đề + Thumbnail → Research → Kịch bản → Nhân vật + bối cảnh → Cảnh và prompt. Copy hoặc xuất văn bản để làm ảnh, giọng và video ở công cụ ngoài.

## Yêu cầu và chạy

Cần Node.js 22 và npm. AI dùng Groq hoặc gateway đã cấu hình; khảo sát live cần YouTube Data API key.

```sh
npm run studio
npm run studio:test
```

Mở http://localhost:3210. Xem [hướng dẫn Studio](studio/README.md) để cấu hình .env, khóa API và flow. Không đưa khóa hoặc .studio-data lên Git. GitHub Actions chạy test trên Ubuntu và Windows, không gọi dịch vụ thật.

[Dữ liệu tạm chờ duyệt](studio/FILE_REVIEW_INVENTORY.md) chỉ được kiểm kê, chưa xóa.
