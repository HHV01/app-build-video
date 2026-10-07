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
