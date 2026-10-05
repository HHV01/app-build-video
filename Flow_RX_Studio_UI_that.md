# RX Studio — Đặc tả app tham khảo (trích từ 32 ảnh UI + transcript video)

Nguồn: OCR 32 ảnh UI người dùng gửi + transcript video *"Cách Mình Tạo 1 Video YouTube HOÀN CHỈNH Bằng AI"*. Tên app tham khảo: **RX Studio** (rxstudio.vn), tên kênh mẫu trong ảnh: `Empire Files` / `Hung Vong De Che` / `Genius History`.

Tài liệu này thay thế phần "chung" trong `Flow_ung_dung_chi_tiet.md` về tên trường, ngưỡng và hành vi UI. Giữ nguyên nguyên tắc ràng buộc (không invent số liệu, không copy nội dung đối thủ, nhận diện bằng chứng).

---

# PHẦN 1 — TÊN TRƯỜNG & NGƯỠNG THẬT TỪ ẢNH

| Khái niệm | Tên gọi trong app | Giá trị mặc định / ví dụ từ ảnh |
|---|---|---|
| Thị trường | `Sân` | Mỹ (tiếng Anh), Việt Nam (tiếng Việt) |
| Cổng kênh | `Ngưỡng cổng` | Mặc định (19/9): video **>60 ngày** tuổi, kênh **≥3 video đã ăn**, nhóm **≥4 video** và **≥2 kênh**. Có preset: "Vừa video >60 ngày — kênh ≥3 video đã ăn — nhóm ≥4 video và ≥2 kênh" |
| Cổng cũ (so sánh) | `Vừa mặc định (19/9)` | Chỉ = lượt xem cho trung vị của chính kênh đó. Không có bước này → kênh tự nhiên nổi bặt và bạn đánh dấu "có kênh chờ", không phải "có".
| Khuôn | `KHUÔN` | Ví dụ: `entire history of`, `An thật`, `Ơ con sóng`, `chưa ngà`, `bandua`. Điểm khớp (ví dụ `6/10 — 60%`) |
| Video/kênh | `VIDEO` / `MÁY KÊNH` / `DÙNG` / `NHÓM` | Bội số trung vị, ngày đăng |
| Khuôn video mẫu | `Tên video mẫu` | Dùng để máy tự sinh video mới: `5/10 ảnh`, `* chọc = tên cho thể` |

Ghi chú từ ảnh: **"Chi phí 1 tin tìm thì ~$0,03 một lượt"**; quota YouTube miễn phí **10.000/ngày** → tìm 1–2 niche mới mỗi ngày, có hiệu suất chi phí hiển thị.

---

# PHẦN 2 — CỐNG CỦA APP (UI thật từ ảnh)

## 2.1 Thanh điều hướng (5 mục)

`Trang chủ` · `Tìm Niche` · `Tạo kênh` · `Xưởng` · `Làm video mới`

Trên cùng: logo `RX Studio`, nút `Người mới`, nút `API Key của bạn`, nút `Light mode`.

Bên trái (nhánh tạo kênh): `Trang chủ`, `Nguồn tham khảo`, `Framework`, `Tạo / Trang chủ`, `Góc nhìn`, `Khung`, `Hình & Giọng`, `Ky thuật`.

Thanh trạng thái video: tên video (ví dụ `The Entire History of the Portuguese Empire`), tiến trình `bước 3/9`, ngân sách `lượt này $0,64 · 1 ảnh`, `tổng tiêu $1,26 · 1 ảnh`.

Sidebar phải khi đang chạy: `Hỏi trợ lý`, `Nhật ký kỹ thuật`, `Sao chép`, `Báo lỗi`, `Tắt` (dừng lượt).

---

## 2.2 BƯỚC 0 — Tìm Niche / chọn sân

Màn hình `Tìm Niche` (Guide 4 bước, "Quy trình 1 phút đọc trước khi bắt đầu").

| Bước | Nội dung từ ảnh |
|---|---|
| **Bước 0** | Chọn sân: quyết định thị trường gõ tìm + ngôn ngữ bỏ máy tìm tiếng. Ô chọn: `Mỹ - tiếng Anh`, `Việt Nam - tiếng Việt`. Hiển thị ngưỡng cổng ngay dưới (video >60 ngày, kênh ≥3 video đã ăn, nhóm ≥4 video và ≥2 kênh) |
| **Bước 1** | Kênh chỉ đường — tìm mat KHUÔN gõ được. Dán 3–8 câu mô tả bạn định làm (mỗi dòng một câu). Ví dụ: `warning signs in your neighborhood`, `dangerous things you should never touch`, `what to do if you see this`. Link kênh chỉ đường (tuỳ chọn): `https://www.youtube.com/@ten-kenh`. Nút `Chạy bước 1` |
| **Bước 2** | Kênh làm được — chạy xong → chọn 3 kênh. Kho gộp bên dưới để dồn view ra bảng số |
| **Bước 3** | Nhóm & chủ đề — cho CHỈN có cả quy trình, bảng kèm lý do. **Đây là bước duy nhất tốn tiền** (~0,03đ/lượt). 2 bước trước gọi YouTube miễn phí |

Quy tắc hiển thị từ ảnh: "Bước 1 hỏi *khuôn này còn chưa có người làm?* — Bước 2 hỏi *kể cả người làm THÌ có người xem?*" (phải kênh chạy lâu, nhiều video).

---

## 2.3 BƯỚC 2 — bảng kênh (chi tiết từ ảnh 23 & 25)

Cột: `VAO KHUON CUA KENH` | `KENH` | `ĐÃ ĂN XONG` | `TRUNG` (trung vị view) | `ĐÙNG` | `NHÓM`.

Hai quy tắc quan trọng ghi rõ trong UI:

1. **KHUÔN KHÔNG còn là tiêu chí ở bước này.** Máy chỉ tính kênh qua cả hai điều kiện (view + khuôn). Đến xanh = đạt. Vàng = tích trong là phần dành cho bạn: kênh đã qua cửa view, nhưng tiêu đề không theo mẫu tích vào được, thường là nền tích. Tiêu chí tích: CÔNG ĐĂNG KÊ, KHÁC — công cho đỡ hết thì bằng chỉ con mắt.
2. **Cột MÁY KÊNH là cột quan trọng nhất.** Gộp video cho đủ nhưu cỡ nhiều video, nó **không cho đủ nhiều cột máy kênh** (một nhóm bị số dày mà chỉ có một tên group).

Ví dụ dữ liệu thật từ ảnh:

| Vào khuôn | Kênh | Đã ăn xong | Trung | Dùng | Nhóm |
|---|---|---|---|---|---|
| entire history of | Beginning To Now | 12 video | 2.072.938 | 10/12 | ✓ |
| entire history of | This Is History | 36 video | 789.979 | 20/20 | ✓ |
| entire history of | The Entire History | 15 video | 197.402 | 15/17 | ✓ |
| (không có) | bill wurtz | 35 video | 2.666.144 | — | ✗ không cụm nào lặp qua |
| (không có) | Historically | 21 video | 2.134.157 | — | ✗ |
| (không có) | REBOUND Football | 51 video | 1.441.616 | — | ✗ |
| (không có) | alex lennen | 27 video | 1.058.884 | — | ✗ |

Điểm nhấn trong UI: "Máy kênh này có thể đã bị bước 1 chỉm vì *chạy qua lâu*. Ở bước 2 thì đó là điểm mạnh — hai bước hỏi hai câu khác nhau."

---

## 2.4 BƯỚC 3 — bảng nhóm (chi tiết từ ảnh 19)

Cột: `VIDEO` | `MÁY KÊNH` | `ĐÙNG` | `NHÓM` | `BỘI TRUNG VỊ` | `NGÀY`.

Dữ liệu thật từ ảnh (khuôn `entire history of`, 3 kênh được chọn, 96 video):

| Nhóm | Video | Bội trung vị | Dùng (số kênh) | Ngày |
|---|---:|---:|---|---|
| ĐẾ CHẾ – NHÀ NƯỚC LỚN – TỔ CHỨC | 15 | **×1.27** | 3/15 (20%) | 1 ngày trước |
| THÀNH PHỐ | 8 | ×1.11 | 2/8 (25%) | 3 ngày trước |
| CHIẾN TRANH – XUNG ĐỘT | 11 | ×1.03 | 1/11 (9%) | 1 ngày trước |
| QUỐC GIA – VÙNG ĐẤT | 36 | (không hiện) | 9/36 (25%) | 1 ngày trước |
| SỰ KIỆN – HIỆN TƯỢNG LỊCH SỬ | 8 | ×0.96 | 3/8 (38%) | 1 ngày trước |
| DÂN TỘC – TÔN GIÁO – VĂN MINH | 8 | ×0.92 | 3/8 (38%) | 1 ngày trước |
| NGƯỜI CỤ THỂ | 10 | ×0.83 | 2/10 (20%) | 1 ngày trước |

Header: `Chia trên: khuôn entire history of — 3 kenh được chọn — 96 video được...`

Nút chia nhóm: `Chạy chia nhóm` → `xong · 7 nhóm`. Nút `Tách thử` — text UI: *"Tách thử, Hai nhóm dưới cách 0.16, lẫn hơn biên tịch trước 0.02."* (nghĩa là hai nhóm sát nhau quá, tách thử có thể hợp nhất).

Điểm nhấn: **"Chọt MÁY KÊNH là cột quan trọng nhất bảng này"** — nhóm bị số máy kênh dày lại chỉ có 1 tên group = bẫy, phải đổi tên nhóm.

---

## 2.5 Bước xác minh nhu cầu (khai thác trong bước 3)

Từ ảnh + transcript: sau khi chọn nhóm, app tự tạo 3 câu tìm kiếm, mở trên YouTube để người dùng **tự xác minh**: có bao nhiêu video >20.000 view. Thêm bộ lọc `năm nay` và `short-form`.

Cảnh báo trong UI (từ video): "Máy tìm giờ có cụt" / "Máy tìm giờ bị cắt" — **nghĩa 10 ảnh ~ 1.000đ tiền khóa của bạn, 1 lần cho kênh**. Data có thể thiếu, phải kiểm tra lại.

Sau khi xác minh: app hiện `Chọn độ liều khác: ✓ 2 câu đã xong · 3 câu nữa` với `Chọn`, `Ôm nhiều`, `gộc thi` (OCR: `gộc thi` = bỏ/thử), `mặc định cao rồi biến đổi học sửa lại`, `sẽ sao, kể trộn tôi đủ đến cỡ/thất lịch sử video?` (UI chọn mức độ dài của video). Đây là bước chọn **mức độ nghiên cứu** — tác động trực tiếp đến chi phí.

---

# PHẦN 3 — TẠO KÊNH (chi tiết từ ảnh 21 & 31)

Cột trái: `Nguồn tham khảo` → `Framework` → `Góc nhìn` → `Khung` → `Hình & Giọng` → `Ky thuật`.

## 3.1 Nguồn tham khảo (link kênh mẫu)

- Nhập link kênh mẫu (ví dụ `https://www.youtube.com/@genius_history01`).
- Bấm `Học kênh khác` → app đọc kênh đó **để bạn xem + máy đọc được, không bao giờ gợi ý cho máy vẽ**.
- `Tải thumbnail về` — 0 đồng, đồng chia YouTube của bạn.

## 3.2 Framework (khuôn tiêu đề + hook)

Card `Khuôn tiêu đề`: `1 khuôn — kích bản bám theo`. Ví dụ `entire history of`.

Mục `Angle`: mô tả khung góc nhìn của khuôn. Ví dụ từ ảnh:
> *"Thực thể này đã hình thành, phình to lên, lên đỉnh cao rồi biến dị hóc rồi sụp đổ sao, kể trọn từ đầu đến cuối."*

Ghi chú UI: *"Angle này do RÚT từ kịch bản cũ, đừng tự nghĩ link chuỗi Angle con trùng trong Niche. Bắt chột check viral là chèn vào chỗ đúng."*

`Độ dài Angle còn trống` → ô nhập số từ.

Mục `Khung hook 15 giây đầu - 10 kiểu xoay vòng` — bảng gồm `KHUÔN` | `CÁCH MỞ` | `VÍ DỤ TỪ KÊNH THUỘC`:

| KHUÔN | CÁCH MỞ | VÍ DỤ |
|---|---|---|
| shock-stat-then-misdirect | Open with a staggering number, then deny the obvious | *"...85 million people. That's the deadliest war in human history. Or at least that's what most people think."* |
| assumption-to-create-intrigue | State what most people think | (tiếp) |
| myth-buster | then undercut it | |
| defiance-paradox | Present a people or force that broke every rule of history | *"A people emerged there that would confound every law of history. Every empire that rose tried to erase them."* |
| in-medias-res-scene | Drop the viewer into a precise dated moment mid-action | *"On the 15th of July 1099, the army of the first crusade breached the walls of Jerusalem."* |

Nút `Xem 6 khung còn lại`. Header: `Khung hook 15 giây đầu — 10 kiểu xoay vòng`.

Đặc điểm quan trọng: hook là **15 giây đầu**, xoay vòng **10 kiểu** — mỗi video chọn 1 kiểu khác nhau để không bị lặp.

## 3.3 Khung (thumbnail layouts)

Mục `30 khung thumbnail` = `chưa có khung`. Nút `Đăng khung trống`, nút `Học kênh khác`.

Card mẫu từ ảnh (`Ten di chi on + nien dai`, `5/10 ảnh`, `* chọc = tin cho thể + có dong phụ`):

```
CHỮ / NGƯỜI / CẢNH
Chữ chính: Tên nưới chọn chỉ, serif đậm in hoa màu kem đậm đưa phía trên.
Dòng phụ: Dòng niên đại cho serif nhỏ hơn ngay dưới tên.
IRAN · ROME · LAS VEGAS

NGƯỜI / CẢNH
Cảnh: Cảnh người que họng hình lụp hai phần ba dưới, xếp trái sang phải; dál trên chỗ cho tiêu đề.
Phong cách: Tranh người que nải phẳng, viền đen dày, màu bịt tươi, nét đơn giản.
Dòng phụ: không có

1600 YEARS
```

Nút `Dùng khung từ bố cục này`. Chú thích: `máy nhìn 10 ảnh ~ 1.000đ tiền khóa của bạn, 1 lần cho kênh`.

Quy tắc từ ảnh (mục bên phải): **`Chữ trên thumbnail tên chọn thế — 14 chữ, đúng trong tiêu đề`** + `Dùng khung từ bố cục này` + `33 chỗ đồ - 0 đã làm`.

## 3.4 Hình & Giọng

Preset art style (ví dụ `Stickman mod`, `Người que - 0 bối cảnh - giọng`).

Text từ ảnh (quan trọng — quy tắc prompt):
> *"Ảnh tham chiếu nhớ: chỉ để bạn xem + máy đọc được, không bao giờ gợi ý cho máy vẽ."*
> *"Cánh trong khung — tiếng Anh cho máy vẽ"*
> *"Khi viết prompt video: chỉ nói 'mô tả máy nghĩ – vai trò trong đoạn' dưới 3 0 dòng, sơn được"*
> *"Chỉ có chữ chính / Chỉ chữ đồng phụ / Chữ + kí hiệu đồng phụ / Khung có đồng phụ / Nam / Địa danh / Câu phụ"*

## 3.5 Ky thuật

- **Góc nhìn**: `Mày nghĩ cảnh + chữ cho 3 chỗ dễ (lấy từ ý tưởng video của kênh, sửa được)`.
- **Dòng phụ**: `Nam` / `Địa danh` / `Câu phụ`.
- **Chỉ trên thumbnail**: `tên chọn thế (1–4 tiếng), đúng trong tiêu đề`.

---

# PHẦN 4 — XƯỞNG: 9 BƯỚC LÀM VIDEO (chi tiết từ ảnh)

Video mẫu trong ảnh: `The Entire History of the Portuguese Empire`, kênh `Empire Files` / `Hung Vong De Che`, niche `Entire history of`, nhóm `ĐẾ CHẾ – NHÀ NƯỚC LỚN – TỔ CHỨC`.

| Bước | Tên màn hình | Nội dung thật từ ảnh |
|---|---|---|
| 1/9 | *(Bước 0–3 ở Tìm Niche)* | Chọn sân, kênh chỉ đường, kênh làm được, nhóm |
| 2/9 | **Tiêu đề + Thumbnail** | Máy đề xuất **16 phương án** (chọn 1, sửa được). Mỗi phương án = 1 tiêu đề + 1 chữ thumbnail. Ví dụ: `The Entire History of the Portuguese Empire` ✓ đã xuất / `The Entire History of the World's First Global Empire` / `chữ thumbnail: THE FIRST GLOBAL EMPIRE` / `chữ thumbnail: 500 YEARS – 4 CONTINENTS`. Nút `Bỏ bỏ này, máy để lại` (sinh lại), `Duyệt → sang Research`. Chi phí `đã tiêu $0,04` |
| 3/9 | **Research** | Nguồn: Wikipedia (nhiều ngôn ngữ). Header: `Dữ liệu đã đầy: 40 mốc - 18 con số - 17 chi tiết giả định quan trọng`. Tabs: `Tóm tắt`, `Dòng thời gian - 40`, `Con số - 18` (đơn giản sắc mạnh nhất), `Chi tiết giác quan - 17` (thợ làm khác người đọc lại). Danh sách `Nhân vật - 16` với mô tả 1 dòng (Henry the Navigator, Gil Eanes, Fernão Gomes, Diogo Cão, Pêro da Covilhã, Bartolomeu Dias, Vasco da Gama, Pedro Álvares Cabral, Francisco de Almeida, Afonso de Albuquerque, King Manuel I, Timoji...). Nút `Duyệt dữ kiện - viết kịch bản`. Cảnh báo: `Vài kiện dữ liệu chưa chắc - nếu có thì viết chung` |
| 4/9 | **Kịch bản** | Ô nhập số từ (mặc định `800`). Tự tính thời lượng (ví dụ `5,3 phút`) và `150 câu/phút - tốc độ giọng kênh`. Preview chữ khớp tiêu đề (`Có giống tiêu đề`). Nội dung: `Lời đọc - sẽ chia sẻ trong video. Chỉ phần này được đọc lên và chia cảnh`. Nút `Duyệt - chia cảnh`. Cảnh báo: `Báo cáo kỹ thuật của máy (mất độ giọng - hook) không được lên, không thành cảnh` |
| 5/9 | **Chia cảnh** | Chia cảnh tự động. Nhịp tự tính: `33 chỗ đồ - 0 đã làm` |
| 6/9 | **Nhân vật + bối cảnh** | Quy tắc: `Bối cảnh có ảnh gốc khi xuất hiện ≥4 cảnh - 5` (OCR nhiễu, đọc là ≥4); `Nếu xuất hiện ≥4 lần bối cảnh - 5`. Danh sách nhân vật (Afonso de Albuquerque, Indian court officials, Vasco da Gama, Antonio Salazar, Persian envoys...). Nút `Xuat prompt` → `Vẽ ở G-Labs` (dán prompt vào tab "Flow Ảnh" của G-Labs, tải ảnh về máy — **Studio không tính tiền**). `Tên file phải chứa tên nhân vật/bối cảnh`. Nút `Tha ảnh vào đây` / `Nap ảnh`. Chi phí: `Ve ảnh nhân vật lên G-Labs bạn tự tay, Studio đỏm, 0 đồng`. Cảnh báo: `34 bối cảnh vẽ khi dùng - không cần ảnh gốc (dưới 4 cảnh); 20 cái >1cảnh nên làm ảnh gốc`. Giá: `$2,34 · 1 ảnh` |
| 7/9 | **Cảnh** | Header: `Cảnh 91/91 ảnh đã vẽ` + `Xem tất cả - 91`, `Còn thiếu - 0`, `Gợi ý clip - 42`, `Có clip Veo - 0`. Chia theo nhịp: `Lô 4s - 71 cảnh`, `Lô 6s - 20 cảnh`, `Lô 8s - 0 cảnh`. Nút `Chép 91 prompt`, `Tải 71 prompt.txt`, `Tải 71 ảnh.zip`, `Tải 20 prompt.txt`, `Tải 20 ảnh.zip`. Ghi chú: `clip luôn dài hơn cảnh, gõi chỉ cắt. Prompt Veo máy ghép từ chuyển động + hành động chi tiết cảnh, gõi đúng tên ảnh khung (3 chữ, trong tên file trong zip) - G-Labs tự gán ảnh`. Thả clip về: `Thả 71 clip về đây` / `Thả 20 clip về đây` — định dạng: `mp4 - tên có mã cảnh / scene-N / số thứ tự từ 0 đếu nhất`. Cảnh báo: `Kịch bản của máy gợi ý 42/42 cảnh đủ làm clip (có nhân vật - cao trao - 3-8s, mảnh xếp trước)` |
| 8/9 | **Giọng** | Nhập file mp3/wav/m4a. **Quy tắc SRT từ ảnh:** `Mỗi giọng mình, hoặc đọc ở ElevenLabs, Speechify... Tải kèm - srt nếu app cho`. App tự sinh `.srt` nếu thiếu (**mỗi phần này phải có file .srt**). Hai đường căn giọng: (1) **srt kèm** — thả mp3 + srt, file bị từ chỗ đầu (bỏ 1131 từ); (2) **CapCut kèm ghi chè** (787 từ lời thoại) — CapCut tự đồng bộ, **0 đồng, chính xác từng giây**. Nếu không có `.srt` → trở về cũ (chi tiết ở hội trợ lý). Giá: `Sinh phụ đề - 1$` (Sinh phụ đề + Tách câu 3$ / Sinh câu 1$) |
| 9/9 | **Đóng gói** | Nhạc nền: `Chưa có nhạc nền. Video sẽ không có nhạc`. Nếu thiếu key, máy đề nghị tạo nhạc cho **4 đoạn cảm xúc** (2,4 USD). Nút `Tạo nhạc` + đề bài cho Suno (có sẵn 3 prompt mẫu: `co lạt`/`co lắt`… → thực ra là `kiểu 1/2/3`):
  - `building cinematic underscore, rising strings, subtle pulse, sense of awe, cinematic documentary score, instrumental, no vocals`
  - `solemn documentary underscore, strings and piano, steady, restrained, cinematic documentary score, instrumental, no vocals`
  - `slow tense orchestral, low strings, sparse percussion, dark, minimal, cinematic documentary score, instrumental, no vocals`
  - Nút `Nạp nhạc riêng` (mp3/wav/m4a, **dưới 24 dB dưới giọng, tự hạ khi có lời**). `Luôn không lỗi.`
  - `Dựng video` → `Dang ra ip video... 2 giây` → `Video 91 cảnh - thường mất khoảng 43 giây`. Dựng tự cắt giọng theo nhịp đóng gói ảnh + tiếng viết metadata. Nút `Tải video`.

Ghi chú ảnh: `Thời gian dòng này?` / `tổng tiêu $2,34 · 1 ảnh`.

---

# PHẦN 5 — G-LABS (công cụ tạo ảnh/video, từ ảnh 7 & 13)

Phiên bản: `G-Labs Studio 2.0.4 - duckmartians`. Tabs: `Flow Ảnh`, `Flow Video`. Bảng điều khiển: `Ảnh tham chiếu`, `Prompt`, `Kết quả`, `Tiến độ`.

Cấu hình:
- **Cấu hình cơ bản**: style (`Flat 2D …`), chất lượng (`1K` / `2K` / `4K`), seed (`Khoá seed` với `547664`).
- **Model**: `GPT Image 2`, `Nano Banana Pro`, `Meta Media`, `Grok Media`.
- **Cấu hình nâng cao / Ảnh tham chiếu**: chế độ tham chiếu (`Số lượng ảnh/prompt`, `Mặc định`, `Full-bleed`), tỉ lệ (`16:9`).
- **Workflow**: thư mục lưu ảnh tham chiếu, `Đúng Video` (1 hàng / 1 prompt), nhịp tiếp (TXT, Excel), `Webhook API`, `Nhập danh sách prompt vào đây`, `Công cụ khác`.
- **Prompt Full-bleed** (rất quan trọng — mẫu chuẩn của app):
  > *"the artwork fills the ENTIRE image, edge to edge. NO border, NO frame, no outline around the picture, no white or coloured margin, no matte, no passe-partout, no rounded corners, no torn-paper or postcard edge, no drop shadow around the image. The drawing must touch all four edges of the canvas."*
- **Công cụ khác**: `Dùng 1 prompt cho tất cả`, `Thêm vào hàng chờ`, `Quản lý hàng chờ (0)`.
- Nút `CHẠY NGAY` / `TAM DỪNG` / `Xóa`, cache, `Chạy 10`.
- Header app: `G-Labs Studio 2.0.4 - duckmartians`, thông báo `Phiên bản mới v2.0.5 ra mắt: tích hợp nâng tầng Google Vids, tạo video với mô hình Omni miễn phí, bản đã cập nhật`.

Ghi chú từ ảnh (rất quan trọng cho prompt video): `Prompt Veo máy ghép từ chuyển động + hành động chi tiết cảnh, gõi đúng tên ảnh khung (3 chữ, trong tên file trong zip) - G-Labs tự gán ảnh`.

---

# PHẦN 6 — NHỮNG ĐIỂM CẦN GIỮ KHI BUILD

1. **Cổng ngưỡng mặc định thật:** video >60 ngày · kênh ≥3 video đã ăn · nhóm ≥4 video và ≥2 kênh. Đây là preset "vừa". Cho phép đổi.
2. **Chỉ = trung vị của chính kênh đó.** Không có chỉ thì kênh tự nhiên nổi bật và bạn đánh dấu tay "có kênh chờ".
3. **Cột MÁY KÊNH quan trọng nhất** ở cả bảng kênh lẫn bảng nhóm — nhóm bị số máy kênh dày nhưng chỉ 1 tên group là bẫy.
4. **Bước 3 là bước duy nhất tốn tiền** (~0,03đ/lượt). Bước 1–2 gọi YouTube miễn phí. Quota 10.000/ngày.
5. **Hai bước hỏi hai câu khác nhau:** Bước 1 = *khuôn này còn chưa có người làm?*; Bước 2 = *kể cả người làm thì có người xem?*.
6. **Mỗi video chọn 1 kiểu hook khác nhau** trong 10 kiểu xoay vòng (hook 15 giây đầu) — tránh lặp.
7. **Thumbnail layout là brand identity** — mỗi kênh tối đa 3 layout, đóng băng từ đầu (30 khung thumbnail trong ảnh).
8. **Bối cảnh có ảnh gốc khi xuất hiện ≥4 cảnh; nhân vật cần reference khi xuất hiện nhiều lần.** App đếm số cảnh và đề xuất tên file.
9. **Studio không tự vẽ** — xuất prompt → người dùng dán vào G-Labs → tải ảnh về nạp lại (0 đồng, tự khớp tên). Đây là quyết định kiến trúc quan trọng.
10. **Nhạc nền tự sinh theo 4 đoạn cảm xúc** (2,4 USD) — có sẵn prompt mẫu style "cinematic documentary underscore". Luôn dưới 24 dB dưới giọng.
11. **Prompt full-bleed chuẩn** — không viền, không khung, tranh chạm cả 4 cạnh.
12. **Cảnh báo tính xác thực:** máy tìm có thể cắt dữ liệu, phải kiểm tra lại; không tạo claim ngoài script.

---

# PHẦN 7 — SO SÁNH VỚI SPEC ĐÃ CÓ

| Mục | `Flow_ung_dung_chi_tiet.md` (bản tôi viết) | `RX Studio` (ảnh thật) | Hành động |
|---|---|---|---|
| Tên thị trường | "Thị trường ưu tiên" | **Sân** | Đổi tên |
| Tên khuôn | "khuôn" / "template" | **KHUÔN** | Thống nhất `Khuôn` |
| Tên nhóm video | "bội số nền" | **MÁY KÊNH** + **BỘI TRUNG VỊ** | Thêm cột Máy kênh |
| Cổng ngưỡng | >90 ngày, ≥5 video | **>60 ngày, ≥3 video, ≥4 video/nhóm, ≥2 kênh** | Sửa số |
| Bước hook | Bước 6 (tiêu đề + thumbnail + hook) | Tách: `Framework` (khung hook 15s, 10 kiểu) ở tạo kênh; `Tiêu đề + Thumbnail` ở xưởng | Tách 2 nơi |
| Số phương án thumbnail | 5 mode | **30 khung thumbnail** (chọn từ kho) | Số khung lưu trữ |
| Nhân vật/bối cảnh | Bước 08 chung | **Bước 6/9 riêng** với ngưỡng ≥4 cảnh | Tách bước |
| Voice | Bước 06 sớm | **Bước 8/9** (sau cảnh) | Đổi thứ tự |
| Nhạc | Không đề cập | **Bước 9/9** tự sinh 4 đoạn | Thêm |
| Số bước | 15 | **9** | Áp dụng 9 |

**Thứ tự đúng 9 bước (khác với spec 15 bước của tôi):**
`Tìm niche (4 bước) → Tiêu đề + Thumbnail (2/9) → Research (3/9) → Kịch bản (4/9) → Chia cảnh (5/9) → Nhân vật + Bối cảnh (6/9) → Cảnh (7/9) → Giọng (8/9) → Đóng gói (9/9)`

Điểm khác biệt lớn nhất so với spec của tôi: **thumbnail làm trước research** (đúng như video nhấn mạnh — package first), và **nhân vật/bối cảnh tách riêng khỏi cảnh**.

---

# PHẦN 8 — DỮ LIỆU THẬT TỪ ẢNH (dùng làm test fixture)

Kênh tham khảo: `Genius History` (16.900 sub, cao nhất 799.165, điểm khớp 6/10 = 60%, khuôn `entire history of`, `An thật`).

Video mẫu đã ăn (bước 2, theo khuôn entire history of):

| Tiêu đề | Khuôn | Lượt xem | Bội số |
|---|---|---:|---:|
| The ENTIRE History Of The Vietnam War \| 1862 - 1975 | theo khuôn | 1.075.576 | ×5,45 |
| The ENTIRE History of Human Civilizations (4K Documentary) | theo khuôn | 9.533.216 | ×4,6 |
| The ENTIRE History of ROME | theo khuôn | 8.877.121 | ×4,16 |
| This Is History: The Entire History of Japan | theo khuôn | 3.123.706 | ×3,95 |
| The Entire History of Jerusalem | theo khuôn | 2.368.046 | ×3 |
| WW2's BEST Soldiers... | — | 5.769.363 | ×2,7 |
| The Entire History of the East India Company | theo khuôn | 2.012.176 | ×2,55 |
| The Entire History of the Ottoman Empire | theo khuôn | 1.839.775 | ×2,33 |
| The ENTIRE History of Israel | theo khuôn | 1.509.400 | ×7,65 |

Thumbnail mẫu (từ ảnh 31) — hook 10 kiểu với view thật:
`10000 VS 100000` (799.333 / 188.648 view), `LAS VEGAS` (134.626), `ISRAEL` (93.482), `ROME` (44.296), `CAPE VERDE` (8.11), `1600 YEARS` (171.039), `HOW AMERICA ERUPTED` (3.851), `HIGH FOR 13.000` (2.689), `ONLY ONE` (3.532).

Nhóm đã chọn trong video: **ĐẾ CHẾ – NHÀ NƯỚC LỚN – TỔ CHỨC** (bội trung vị ×1,27 cao nhất). Video mẫu đầu tiên: **Portuguese Empire**.

**Cảnh báo ảnh 23:** "Máy kênh này có thể đã bị bước 1 chỉm vì *chạy qua lâu*." Và ảnh 26: kênh học (reference) phải ghi rõ *"để so bóng mày — không giờ máy vẽ"*.