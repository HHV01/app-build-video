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

## Dự án bốn bước

1. Chủ đề: chọn câu hỏi và thời lượng dự kiến.
2. Tiêu đề + Thumbnail: chọn lời hứa, hook, khuôn và bố cục thumbnail.
3. Research: thêm text nguồn, đối chiếu claim và chọn góc nhìn. URL đơn độc không chứng minh đã đọc nguồn.
4. Kịch bản: dựng dàn ý, viết từng phần, chỉnh narration rồi Hoàn tất kịch bản.

Copy toàn bộ kịch bản, Xuất kịch bản TXT hoặc Xuất Markdown (gồm nguồn). Nếu clipboard bị chặn, dùng Ctrl+C trong hộp thoại hoặc tải TXT. Ảnh, giọng và dựng video thực hiện ở app ngoài. Thumbnail giữ công cụ bố cục/canvas, không có API sinh ảnh.

Dự án cũ ở bước sau kịch bản tự về bước 4; cảnh, audio và các dữ liệu đã lưu vẫn được giữ trong state nhưng không hiển thị. assets.mjs và cơ chế đồng bộ state tiếp tục hoạt động.

## AI và model dự phòng

Giữ model chính và tối đa 3 dự phòng tại Kết nối API. App chuyển khi quá tải/hết hạn mức/lỗi dịch vụ/mất kết nối; không chuyển vì khóa sai hay JSON sai. Thử từng model một lần, tối đa 45 giây mỗi lượt khi bật dự phòng. Không thay model chính vĩnh viễn; nhật ký ghi model thực tế. Chỉ dùng model đã nối ở gateway; chi phí phụ thuộc tài khoản dịch vụ. Model của app độc lập với phiên Codex.

## Kiểm thử và dữ liệu

npm run studio:test dùng fixture và gateway giả lập, không gọi provider hoặc YouTube thật. Dữ liệu nằm trong .studio-data, được ignore. Giữ cửa sổ khi chưa lưu thành công; các xung đột cùng trường cần xử lý trước khi ghi.

Xem [REVIEW_FIXES.md](REVIEW_FIXES.md) cho nghiệm thu bản hiện tại, [REVIEW_FIXES_HISTORY.md](REVIEW_FIXES_HISTORY.md) cho lịch sử, [FILE_REVIEW_INVENTORY.md](FILE_REVIEW_INVENTORY.md) cho file chờ duyệt. Chưa xóa file trong danh sách này.
`nResearch đã đánh giá (supported/needs_check) được đưa vào dàn ý và kịch bản; dữ kiện needs_check không được khẳng định.

F2: Viết từng phần chỉ gửi tiêu đề đã chọn, ngữ cảnh nghiên cứu liên quan và tóm tắt hai câu mỗi phần trước; nguồn thô vẫn dùng ở Research.
