# Tích Studio

Chạy `npm run studio` tại thư mục Video hoặc mở `start_studio.bat`. Truy cập http://localhost:3210. OmniRoute cần chạy trước các thao tác AI.

## Cấu trúc

| Tệp | Vai trò |
|---|---|
| `studio/server.mjs` | Server loopback. Route API, schema JSON cho từng action AI, directive tiếng Việt, bộ đếm hạn mức, phục vụ `/rx.mjs` và `/zip.mjs` |
| `studio/core.mjs` | Logic nền: `median`, `enrichVideos`, `normalizeImport`, `validateGroups`, `safeYouTube`, `parseAIJSON` |
| `studio/rx.mjs` | Toàn bộ nghiệp vụ ngách + xưởng: cổng ngưỡng, bảng kênh/nhóm, 10 kiểu hook, thư viện khung thumbnail, lô 4s/6s/8s, đặt tên file ảnh, đề bài nhạc, hạn mức. Chạy được cả Node lẫn trình duyệt, không phụ thuộc module khác |
| `studio/zip.mjs` | Gói ZIP phương pháp STORE, không phụ thuộc thư viện ngoài |
| `studio/public/app.js` | Giao diện, một module duy nhất |
| `studio/public/style.css` | Toàn bộ CSS |
| `tools/ffmpeg/bin/ffmpeg.exe`, `ffprobe.exe` | ffmpeg dùng đo thời lượng và dựng MP4. Không cài vào hệ thống, không sửa PATH |
| `studio/fixtures/kho-mau-thu-nghiem.json` | Kho mẫu **giả lập** để thử giao diện Tìm ngách mà không cần API YouTube |
| `studio/core.test.mjs`, `studio/rx.test.mjs` | 22 kiểm tra tự động |

## Quy trình Tìm ngách — 4 bước

1. **Bước 0 · Chọn sân** — thị trường, ngôn ngữ, định dạng, cửa sổ tìm, ngưỡng cổng (rong / vừa / chat).
2. **Bước 1 · Kênh chỉ đường** — hỏi đúng một câu: *khuôn này còn chưa có người làm?* Máy tìm khuôn tiêu đề lặp trong từng kênh.
3. **Bước 2 · Kênh làm được** — hỏi câu khác: *kể cả người làm thì có người xem?* Người dùng tự tick kênh; kho gộp dồn view ra bải số.
4. **Bước 3 · Nhóm & chủ đề** — bước duy nhất tốn tiền thật (~0,03 USD/lượt). Cột `MÁY KÊNH` quan trọng nhất; một nhóm đủ số video nhưng chỉ có một tên group là bẫy.

Ngưỡng cổng mặc định `vừa`: video quá 60 ngày, kênh có ít nhất 3 video đã ăn, nhóm có ít nhất 4 video và 2 kênh. Một video tính là "đã ăn" từ 20.000 lượt xem; kênh cần trung vị vượt 20.000.

## Tạo kênh — 6 mục

`Nguồn tham khảo` → `Framework` → `Góc nhìn` → `Khung` → `Hình & Giọng` → `Kỹ thuật`.

Framework giữ khuôn tiêu đề, angle của khuôn và bảng `Khung hook 15 giây đầu — 10 kiểu xoay vòng` (5 kiểu `đã xác minh` lấy từ ảnh app tham khảo, 5 kiểu là mặc định của Studio). Khung thumbnail lấy từ thư viện 8 bố cục tự thiết kế; bản xem trước canvas vẽ đúng theo ô của khung đang chọn.

## Xưởng — 9 bước

`Chủ đề` → `Tiêu đề + Thumbnail` → `Research` → `Kịch bản` → `Chia cảnh` → `Nhân vật + Bối cảnh` → `Cảnh` → `Giọng` → `Đóng gói`.

- Bước Kịch bản dùng `estimateRead` (150 từ/phút) để cân độ dài — 800 từ ≈ 5,3 phút.
- Bước Nhân vật liệt kê bối cảnh lặp từ 4 cảnh trở lên, loại đó cần ảnh gốc.
- Bước Cảnh chia lô **4s / 6s / 8s** cho khớp voice, gán tên ảnh `<mã3chữ>-NNN.png` và xuất gói ZIP gồm `README.txt` + `prompts/*.txt` + `images/*.png` + `clip-list.txt`.
- Bước Đóng gói cảnh báo cảnh thiếu ảnh sẽ bị bỏ (kéo theo mất lời thoại), đưa đề bài 4 đoạn cảm xúc / 3 kiểu nhạc tham khảo 2,40 USD, và cảnh báo khi danh sách clip gợi ý vượt 60% số cảnh.

## Tạo ảnh

Mặc định **Studio không tự gọi tạo ảnh**: bạn dán prompt vào công cụ tạo ảnh, tải ảnh về, đặt đúng tên rồi nạp vào cảnh. Cách này tốn **0 đồng** và luôn chạy.

Nếu bạn cài ComfyUI (cũng 0 đồng), bấm **Tạo ảnh tại đây** ở từng cảnh để Studio gọi thẳng. Model mặc định là `comfyui/flux-dev`, đổi được ở trang Kết nối API. Studio sẽ báo rõ khi ComfyUI chưa mở.

Nếu bạn không muốn cài gì, để trống ô model tạo ảnh — luồng dán prompt ra ngoài không bị ảnh hưởng.

## AI và hạn mức

AI gửi qua OmniRoute, model trong `.env` hoặc trang Kết nối API; provider Groq lưu ở OmniRoute. Cấu hình này không thay model của phiên Codex đang phát triển ứng dụng.

Khảo sát YouTube cần YouTube Data API v3 key riêng. Bộ đếm hạn mức tính theo đơn vị chính thức: `search` 100, `channels` 2, `playlistItems` 1, `videos` 1; chia miễn phí 10.000/ngày tức khoảng 100 lượt gõ tìm niche mới mỗi ngày.

Script dài có thể chạm hạn mức miễn phí của Groq. Lỗi xảy ra thì dữ liệu đã lưu được giữ và người dùng chạy lại.

## Giọng đọc, SRT và dựng MP4

| Việc | Cần gì | Tốn tiền |
|---|---|---|
| Đo thời lượng voice | Trình duyệt lúc nạp file; **ffprobe** cho chính xác | 0 |
| **Tạo SRT có timestamp** | `groq/whisper-large-v3-turbo` qua OmniRoute | 0 (dùng chung gateway) |
| Đọc giọng máy (TTS) | Gateway phải có nhà cung cấp giọng đọc | tuỳ nhà cung cấp |
| **Dựng MP4** | `tools/ffmpeg/bin` | 0 |

Cách dựng: ghép ảnh cảnh thành video tĩnh đúng `duration` của từng cảnh, cắt theo thời lượng voice, xuất **H.264 + AAC 1280×720**. Cảnh thiếu ảnh bị bỏ và báo rõ mất bao nhiêu cảnh. Nhạc nền tuỳ chọn được hạ còn **1/8** giọng và lặp cho đủ dài.

Bản dựng được giữ trong `.studio-data/build/`, nên tải lại hoặc đăng YouTube không phải dựng lại.

Whisper nghe sai chỗ nào thì sửa tay trong ô SRT — SRT vẫn là nguồn chuẩn cho editor.

## Đăng YouTube

Cần OAuth Client ID và Client Secret của **chính bạn**:

1. Vào [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → chọn hoặc tạo dự án → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID** → loại **Desktop app** → copy Client ID và Client Secret.
3. Trong Studio: trang **Kết nối API** → khung *Đăng video lên YouTube* → dán hai giá trị → **Lưu thông tin OAuth**.
4. Bấm **Kết nối YouTube** → chọn tài khoản ở tab Google mở ra → quay lại bấm **Kết nối YouTube** lần nữa để Studio đổi mã lấy token.

Token lưu trên máy bạn trong `.studio-data/settings.json`, chỉ dùng để tải video lên. Mặc định đăng **riêng tư** để bạn tự xem trước khi công bố.

Một lần tải video lên tốn **1.600 đơn vị** hạn mức — bộ đếm trong Studio không tính khoản này.

## Trung thực dữ liệu

- Số liệu view chỉ lấy từ YouTube hoặc dữ liệu người dùng nhập. AI không được tạo số liệu.
- Kho mẫu trong `studio/fixtures/` có `_note` ghi rõ: tên kênh và trung vị lấy từ ảnh app tham khảo, **view từng video là số giả lập** để bố trí bảng cho dễ đọc.
- Chi phí trong `COST_REFERENCE` là giá tham khảo của app khác, không phải giá nhà cung cấp của bạn.
- Phân loại Shorts qua thời lượng chỉ là gần đúng; Studio nói rõ điều đó trong thông báo sau khi khảo sát.
- Bội số cần ít nhất 3 video so sánh, loại target khỏi nền; nền gần tuổi đăng ưu tiên, thiếu mẫu thì gắn nhãn gần đúng.

## Chưa có

- **Retention và CTR của kênh đối thủ.** YouTube Data API v3 không có số này — chỉ có analytics của chính kính mìa bạn. Studio ghi "không có dữ liệu này" thay vì bịa.
- **Clip tự động.** Studio xuất *danh sách* cảnh đáng làm clip; cắt clip vẫn làm tay trong editor.
- **Chữ overlay đã khắc vào ảnh.** Ảnh xuất ra không có chữ, đúng như app tham khảo.
- **Tự nghiên cứu web.** Research dùng kho video nhập vào, không quét web tự động.

Các bước làm được ngay với cấu hình hiện tại: khảo sát CSV/JSON, toàn bộ 9 bước xưởng, SRT, dựng MP4, xuất ZIP. Cần thêm: YouTube Data API key (khảo sát tự động), OAuth (đăng video), ComfyUI (tạo ảnh trong Studio), nhà cung cấp giọng đọc (TTS).

## Thử nhanh không cần API YouTube

```bash
node tools/make-sample-survey.mjs      # sinh lại kho mẫu
node tools/seed-demo.mjs 2 --project    # nạp khảo sát + dự án mẫu vào Studio đang chạy
node tools/inspect-sample.mjs           # in bảng kênh / bảng nhóm để kiểm ngưỡng
node tools/seed-media.mjs              # gắn ảnh mẫu + giọng mẫu vào dự án demo để thử dựng MP4
node tools/check-render.mjs            # tự dựng MP4 thật rồi đo lại bằng ffprobe
node tools/check-transcribe.mjs        # tạo SRT thật rồi kiểm tra cấu trúc và độ dài
```

Sau khi nạp, mở http://localhost:3210/#niche/survey-mau-thu-nghiem. Lưu ý đường dẫn có dấu `#` ngay sau cổng, không có dấu `/` ở giữa.

Chạy kiểm tra: `npm run studio:test`. Kiểm tra cú pháp giao diện: `node tools/check-studio-syntax.mjs`.

## Bảo mật

API POST/PUT yêu cầu header `X-Studio-Request: 1`, cùng origin và host nội bộ. Server chỉ nghe loopback; chưa thiết kế cho máy chủ công khai hoặc nhiều người dùng. Dữ liệu lưu trong `.studio-data`, khóa và file dữ liệu đã được gitignore.
