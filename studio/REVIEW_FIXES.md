# Nghiệm thu · Tìm ngách + Kịch bản (07/10/2026)

## E1 · UI bốn bước

Giữ tìm ngách, kênh/identity, tiêu đề/thumbnail, research, script, copy/TXT/Markdown, model/fallback và khóa YouTube Data API. Kịch bản kết thúc bằng Hoàn tất kịch bản. Dự án legacy clamp step về 3, approved giữ 0–3; không xóa scene/audio/build cũ. Audit tham chiếu trước gỡ helper; videoTable và hookTable được giữ. Test legacy state/UI đỏ trước sửa; 122 test xanh ở checkpoint E1.

## E2 · Server

Gỡ route media và đăng video, bỏ action scenes/animation, chỉ giữ scriptPlan trong production. Settings chỉ cập nhật model, fallback và youtubeKey; trường cũ vẫn đọc nhưng không dùng. Assets và Data API/catalog/cache/quota giữ nguyên. Test route bị gỡ/action bị từ chối đỏ trước sửa; 106 test xanh sau loại các test backend đã hết chức năng.

## E3 · Kiểm thử tương thích

Bỏ integration dựng video và ZIP. Giữ kiểm thử niche/YouTube Data API (bao gồm shelf live với adapter mock), scriptPlan, model/fallback, đồng bộ, clipboard và assets. Thêm state legacy giữ nguyên media, settings legacy khởi động và youtubeKey lưu được nhưng không lộ qua GET. Giữ kiểm thử HTTP static no-store. 106 test xanh, không skip.

## E4 · Tài liệu hiện tại

README gốc và Studio mô tả đúng tìm ngách + bốn bước tới kịch bản; giữ tạo khóa YouTube Data API. Tài liệu cũ chuyển sang REVIEW_FIXES_HISTORY.md để tránh dùng nhầm hướng dẫn đã bỏ. CI không cài binary dựng video. Test tài liệu đỏ trước sửa.

## E5 · Kiểm kê

FILE_REVIEW_INVENTORY.md chỉ liệt kê tools/*.png, scratch/, tmp/, docs/ocr/ và dung lượng; không xóa dữ liệu chờ duyệt.

## Giới hạn xác minh

Các test API dùng mock, không chứng minh quota/hoạt động YouTube hoặc model thật. Chưa nghiệm thu toàn chuỗi khảo sát live → kênh → research → script với dịch vụ thật. Dữ liệu cũ được giữ; assets có thể chuyển media nhúng sang file như cơ chế có sẵn. Lịch sử chi tiết ở REVIEW_FIXES_HISTORY.md.

Nghiệm thu giao diện thực tế: dự án Greece cũ chuyển từ Cảnh về Kịch bản (4/4), đủ nút hoàn tất/copy/TXT/Markdown; nút Copy báo thành công. Màn cài đặt còn model, fallback và khóa Data API. Chưa xác nhận tải file bằng browser automation (công cụ kiểm tra bị timeout), chưa chạy lại AI hoặc YouTube thật. Tổng 108test xanh, không skip.
`nF1: đưa facts/claims cùng trạng thái và cảnh báo vào ngữ cảnh viết. Kiểm chứng bằng test; chưa xác nhận với AI thật.

F2: mock 7 phần, nguồn 20.000 ký tự: tổng JSON context cũ 155.197 ký tự, mới 3.522 ký tự. Đây là độ dài ký tự trong fixture, không phải token hay chi phí thực. Chưa đo trên AI thật.

F3: bỏ nhánh STT và quota upload, context nhân vật và AI templates cũ. Giữ videoTable/hookTable và youtubeKey.

F5: lọc trùng theo giao tập từ khoá >=60%, bỏ ghi chú tên nguồn, ưu tiên ghi chú có số; tối đa 5. Test 7x3 ghi chú và directive/UI. Chưa đo chất lượng ghi chú với AI thật.
