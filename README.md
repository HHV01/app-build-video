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


## Launcher Windows và tài liệu lưu trữ

Giữ [start_studio.bat](start_studio.bat) ở gốc: bấm để chạy Studio. Launcher phụ ở [scripts/windows/](scripts/windows/); mỗi file chuyển về thư mục gốc repo trước khi chạy. [OmniRoute launcher](scripts/windows/start_omniroute.bat). Tài liệu Flow/Prompt/milo cũ ở [docs/legacy/](docs/legacy/). Hai file HTML gốc vẫn giữ.

[Dọn repo đã duyệt](docs/REPO_CLEANUP_REVIEW_20261012.md): bỏ theo dõi 96 ảnh, scratch và file tmp từng tracked; giữ nguyên 11 ảnh Studio và docs/ocr. File local vẫn còn, lịch sử Git không đổi. tmp nặng chủ yếu do profile/cache trình duyệt (2.664,62 MiB), không phải bộ test Studio hiện tại. Bản kiểm kê đầy đủ giữ local và ignore; báo cáo tracked chỉ 65 dòng. CI Node 22 vẫn dùng npm run studio:test.
