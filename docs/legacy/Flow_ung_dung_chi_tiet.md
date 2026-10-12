# Flow ứng dụng chi tiết — Tích Finance Studio (Spec cho người dùng & build)

Tài liệu này mở rộng `Flow_tim_ngach_va_xay_kich_ban.md` và `Flow_he_thong_Tich_Finance.md` thành đặc tả từng màn hình, từng trường nhập, từng nút bấm — đủ để người dùng làm theo và đủ để build app. Ví dụ xuyên suốt dùng kênh Tích Finance (hoạt hình tài chính, nhân vật Tích).

---

# PHẦN 0 — TỔNG QUAN APP

## 0.1 Mục đích

Một app local tiếng Việt giúp người dùng: (1) tìm ngách nội dung YouTube có bằng chứng lượt xem, (2) xây kịch bản có cấu trúc hấp dẫn, (3) sản xuất video hoạt hình với nhân vật Tích cố định, (4) đo kết quả video đã đăng để cải tiến video sau.

## 0.2 Bốn chức năng chính (màn hình chủ)

| Chức năng | Dùng khi | Nhận vào |
|---|---|---|
| **Tìm ngách** | Chưa có kênh hoặc muốn đổi hướng | Cấu hình khảo sát |
| **Thiết lập kênh** | Đã chọn ngách, muốn khóa hồ sơ kênh | Hồ sơ ngách đã chọn |
| **Xây kịch bản** | Đã có kênh, muốn làm video mới | Chủ đề đã chọn hoặc tự nhập |
| **Đo kết quả** | Video đã đăng, muốn học | Dữ liệu kênh do người dùng cấp |

## 0.3 Màn hình chủ (Dashboard)

Hiển thị:

- Bốn thẻ chức năng trên.
- Bảng **Dự án đang làm**: tên dự án, bước hiện tại, dữ liệu cập nhật lúc nào, việc người dùng cần làm tiếp, nút "Tiếp tục".
- Mỗi dự án lưu trạng thái tự động — tải lại trang vẫn tiếp tục được đúng bước.

Mỗi màn hình trong app có cấu trúc cố định:

1. **Hướng dẫn** — đoạn 2–4 dòng giải thích bước này làm gì, vì sao quan trọng.
2. **Dữ liệu đầu vào** — các trường nhập, mỗi trường có nhãn, gợi ý (placeholder), giá trị mặc định, và dấu hiệu bắt buộc.
3. **Kết quả** — bảng/card hiển thị đầu ra, mỗi cột số liệu có biểu tượng ⓘ để xem giải thích.
4. **Giải thích chỉ số** — pop-up hoặc tooltip định nghĩa từng chỉ số, giới hạn của nó, và điều nó KHÔNG chứng minh.
5. **Nút tiếp tục** — một nút chính duy nhất mỗi bước; nút phụ (quay lại, lưu nháp).

## 0.4 Nguyên tắc UX toàn cục

- Một bước = một màn hình = một nút chính. Không hỏi quá một việc tại một thời điểm.
- Mọi số liệu hiển thị kèm nhãn nguồn: **Quan sát** (lấy từ YouTube/người dùng nhập) hoặc **Suy luận AI** (AI gợi ý, người dùng sửa được).
- AI không bao giờ tạo số liệu view, không tạo retention/CTR của kênh khác, không xác suất viral.
- Mọi hành động có chi phí (gọi API, tạo media) phải hiện dự toán và hỏi xác nhận trước khi chạy.
- Dữ liệu khảo sát lưu kèm thời điểm thu thập; hiển thị "cũ" nếu quá 30 ngày.
- Nhãn dữ liệu mẫu (nếu dùng) phải ghi rõ "Minh họa — không phải dữ liệu thị trường".

---

# PHẦN A — TÌM NGÁCH & XÂY KỊCH BẢN (10 bước)

## BƯỚC 0 — Chọn thị trường và cấu hình khảo sát

**Hướng dẫn:** Khảo sát chỉ mạnh khi hẹp. Chọn một ngôn ngữ, một thị trường, một định dạng cho mỗi lần chạy.

**Dữ liệu nhập (từng trường):**

| Trường | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| Ngôn ngữ nội dung | select | tiếng Việt | tiếng Việt / tiếng Anh |
| Thị trường ưu tiên | select | Việt Nam | Việt Nam / Mỹ / khác. Ghi chú: không coi vị trí kênh là bằng chứng địa lý khán giả |
| Định dạng | select | video dài | video dài / Shorts. Một khảo sát chỉ so một định dạng |
| Nhóm nội dung | select + tự nhập | tài chính | tài chính, tâm lý, lịch sử, kinh doanh hoặc tự nhập |
| Khoảng thời gian | number (ngày) | 90 | Mở rộng khi dữ liệu ít |
| Phong cách sản xuất | select | hoạt hình | hoạt hình / faceless stock / người thật / không giới hạn |
| Năng lực của mình | số liệu tùy chọn | — | thời lượng dự kiến, video/tuần, ngân sách |

**Cấu hình khảo sát (hiển thị, sửa được, lưu cùng phiên bản):**

- Ngưỡng lượt xem tối thiểu để tính "nổi bật" (mặc định để trống → không lọc).
- Số video tối thiểu mỗi kênh trong mẫu.
- Số kênh độc lập tối thiểu cho một khuôn.
- Hiển thị cảnh báo: đây là quy tắc lọc của app, không phải tiêu chuẩn YouTube, không bảo đảm thành công.

**Kết quả:** Tóm tắt cấu hình + dự toán số lần gọi API (nếu có key) + xác nhận chi phí.

**Nút chính:** `Lưu thị trường và tìm kênh` → Bước 1.

**Lỗi:** Thiếu market/format → không cho chạy; hiển thị đúng trường còn thiếu.

---

## BƯỚC 1 — Tìm kênh chỉ đường

**Hướng dẫn:** Kênh chỉ đường để học khuôn nội dung và ngôn ngữ tiêu đề. Không cần là kênh nhỏ hay kênh bạn làm lại được ngay.

**Dữ liệu nhập:**

- Ô textarea: 3–8 cụm tìm kiếm, mỗi dòng một cụm.
  - Ví dụ Tích: `lifestyle creep`, `money psychology`, `financial traps`, `why salary is never enough` (tiếng Việt: cụm tiếng Việt hoặc bộ từ khóa người dùng duyệt).
- Ô tùy chọn: link kênh đã biết.

**Hệ thống xử lý:** Tìm video/kênh ứng viên → xác minh ID → loại trùng → lấy video mẫu → phát hiện khuôn tiêu đề và định dạng. Phân biệt dữ liệu quan sát với nhãn AI suy luận. Không khẳng định camera, cấu trúc script hay độ khó sản xuất chỉ từ tiêu đề.

**Bảng kết quả — cột:**

| Kênh | Link | Khuôn thường gặp | Ví dụ video | Số video quan sát | Độ phù hợp ngôn ngữ/định dạng | Mức chắc chắn | Thao tác |

**Hành động:**

- `Xêm bằng chứng` — mở danh sách video hỗ trợ khuôn.
- `Chọn khuôn này` — khóa khuôn. Có thể sửa tên khuôn hoặc chọn nhiều khuôn để so sánh.
- Cảnh báo: một khuôn như "Why X happens" chỉ là hình thức tiêu đề; chưa đủ để gọi là ngách.

**Nút chính:** `Tìm các kênh làm cùng khuôn` → Bước 2.

**Lỗi:** Không có kết quả → gợi ý mở rộng từ khóa/thời gian; không tự tạo kênh hay view. Link sai/không truy cập → đánh dấu rõ, cho sửa, không khẳng định đã xem.

---

## BƯỚC 2 — Tìm kênh làm được (cùng khuôn)

**Hướng dẫn:** Mục tiêu: bằng chứng khuôn được nhiều kênh lặp lại, đồng thời đánh giá bạn có sản xuất được không.

**Dữ liệu nhập:** khuôn đã chọn, từ khóa bổ sung, giới hạn thời gian; bộ lọc kênh (quy mô, thời gian hoạt động, định dạng, phong cách). Không loại kênh chỉ vì view thấp trước khi xem dữ liệu cùng khuôn.

**Hai loại đánh giá — tách riêng, hiển thị thành hai nhóm cột:**

1. **Kênh có thực hiện khuôn:** số video khớp / tổng mẫu, tỷ lệ khớp.
2. **Khuôn có hiệu quả trong kênh:** phân bố lượt xem, bội số so với nền của kênh, số video thành công lặp lại.

**Bảng kết quả — cột:**

| Chọn | Kênh | Quy mô tại thời điểm thu thập | Video khớp/tổng mẫu | Trung vị cùng định dạng | Trung vị video khớp | Video vượt nền | Bằng chứng | Đánh giá khả năng sản xuất |

**Nhãn bằng chứng (dùng đúng, không dùng "ăn thật" chỉ vì view tuyệt đối):**

- `Có kết quả lặp lại` — nhiều video khớp vượt nền.
- `Chỉ có một video nổi bật` — một outlier.
- `Chưa đủ mẫu` — dưới ngưỡng.
- `Không cùng khuôn` — khớp hình thức, lệch chủ đề.

**Hành động:** chọn kênh đưa vào kho. Cảnh báo khi toàn bộ mẫu đến từ một kênh hoặc cùng một mạng nội dung — cho phép tiếp tục với trạng thái **bằng chứng yếu**.

**Nút chính:** `Tạo kho video khảo sát` → Bước 3.

---

## BƯỚC 3 — Tạo kho video và chia nhóm

**Hướng dẫn:** Gom bằng chứng vào một kho, chia nhóm theo vấn đề người xem muốn giải quyết.

### 3.1 Bảng kho video — cột

| Video | Kênh | Ngày đăng | Tuổi video | Định dạng | Thời lượng | View tại thời điểm chụp | Bội số nền | Khuôn | Nhóm chủ đề | Link | Trạng thái xác minh |

**Quy tắc tính (hiển thị trong "Giải thích chỉ số"):**

- View và tuổi video lưu tại cùng thời điểm thu thập. Không gọi video cũ là "đang lên" chỉ vì tổng view cao. Muốn đo tốc độ tăng cần ít nhất hai lần chụp; tốc độ tăng = chênh lệch view ÷ khoảng thời gian, không lấy tổng view ÷ tuổi.
- **Bội số nền** = view video ÷ trung vị view các video so sánh cùng kênh, cùng định dạng, tuổi đăng gần nhau (≤30 ngày). Cần ≥3 video so sánh; thiếu mẫu thì dùng nền gần đúng và gắn nhãn `gần đúng`. Nền = 0 hoặc quá ít mẫu thì không tính. Bội số đo mức nổi bật trong kênh, không đo nhu cầu toàn thị trường.
- Phân loại Shorts qua thời lượng chỉ là gần đúng.

### 3.2 Chia nhóm

- AI gợi ý nhóm theo vấn đề người xem muốn giải quyết (nhãn Suy luận AI).
- Người dùng sửa tên nhóm, chuyển video, gộp/tách nhóm.
- Ví dụ nhóm cho Tích: `tăng lương vẫn thiếu tiền`, `áp lực mua nhà/xe`, `tiền và quan hệ`, `cảm giác bắt đầu muộn`, `bẫy mua sắm`, `cơ chế kinh doanh`.
- Một video có một nhóm chính (tránh đếm trùng), có thể có nhãn phụ. Không rõ nhóm → `Chưa phân loại`.

### 3.3 Bảng nhóm — cột

| Nhóm | Số video | Số kênh độc lập | Trung vị bội số | Khoảng tuổi video | Số video nổi bật | Độ chắc chắn | Khả năng làm series | Xem bằng chứng |

Hiển thị cả view tuyệt đối lẫn bội số và số kênh. Không xếp nhóm chỉ theo bội số trung bình (một outlier kéo lệch).

**Nút chính:** `So sánh ngách` → Bước 4.

**Lỗi:** chỉnh nhóm → tính lại chỉ số từ dữ liệu đã có, không gọi API lại. Đổi thị trường/định dạng → tạo phiên khảo sát mới.

---

## BƯỚC 4 — So sánh ngách và chọn angle

**Hướng dẫn:** Ngách = nhóm khán giả + vấn đề lặp lại + lời hứa nội dung + cách thể hiện. Angle = câu hỏi xuyên suốt series.

**Ví dụ đề xuất (gắn nhãn "ứng viên để kiểm chứng", không phải kết luận thị trường):** người đi làm 25–40 tuổi muốn hiểu vì sao thu nhập tăng nhưng vẫn thấy thiếu tiền, được giải thích bằng câu chuyện hoạt hình đời thường. Ví dụ angle: *Vì sao một lựa chọn tưởng giúp bạn sống tốt hơn lại khiến bạn có ít lựa chọn hơn?*

**So sánh ngách — năm tiêu chí, mỗi nhận xét phải có lý do + dữ liệu hỗ trợ:**

1. Bằng chứng nhu cầu trong mẫu.
2. Thành công lặp lại qua nhiều kênh.
3. Khoảng trống có thể khác biệt.
4. Khả năng sản xuất (phù hợp năng lực đã khai Bước 0).
5. Khả năng có ít nhất 20 ý tưởng riêng biệt.

**Kết luận hiển thị một trong ba:** `Có thể thử` / `Cần bổ sung bằng chứng` / `Chưa phù hợp nguồn lực`. Độ cạnh tranh mô tả từ mẫu đã quan sát; không giả định nhìn thấy toàn bộ thị trường. Không tạo điểm nhu cầu chính xác nếu dữ liệu chỉ là mẫu tìm kiếm.

**Người dùng chốt (form):** khán giả chính; vấn đề trung tâm; angle; lời hứa kênh; ba trụ cột nội dung; điểm khác với kênh tham khảo; giới hạn không làm.

**Nút chính:** `Tạo hồ sơ ngách` → xuất bản tóm tắt một trang + kho video bằng chứng → Bước 5 (hoặc sang Thiết lập kênh).

---

## BƯỚC 5 — Danh sách ý tưởng có bằng chứng

**Hướng dẫn:** Mỗi ý tưởng gắn với bằng chứng từ kho và góc nhìn riêng, không copy tiêu đề nguồn.

**Mỗi ý tưởng hiển thị các trường:** câu hỏi trung tâm, nỗi đau/ham muốn, nghịch lý, tình huống mở đầu, phát hiện quan trọng, góc khác biệt, video tham khảo (link từ kho), dữ kiện cần tìm, độ khó sản xuất, hướng hình ảnh với Tích.

**Ví dụ đề xuất:**

- **Tăng lương vẫn không có tiền** — thu nhập cao hơn nhưng chi phí cố định tăng nhanh hơn khoảng dự phòng.
- **Mua xe để thấy thành công** — đối chiếu cảm giác sở hữu với nghĩa vụ mới; không gán con số chưa kiểm chứng.
- **Người bắt đầu muộn** — kể về quyết định và cảm giác thua kém; kết quả tiền bạc phải có giả định rõ nếu dùng mô phỏng.

**Quy tắc:** video nguồn chỉ cung cấp bằng chứng về chủ đề và cách đặt vấn đề; ý tưởng mới cần ví dụ, luận điểm và cách kể riêng. Không dùng tiêu đề hay cấu trúc độc quyền của nguồn.

**Hành động:** chọn một ý tưởng. **Nút chính:** `Thiết kế lời hứa và mở đầu` → Bước 6.

---

## BƯỚC 6 — Thiết kế tiêu đề, thumbnail concept và hook (trước script)

**Dữ liệu nhập:** ý tưởng đã chọn, khán giả, ngôn ngữ, thời lượng, tone, điều người xem cần hiểu khi video kết thúc.

**Đầu ra đề xuất:**

- **Ba cặp tiêu đề + ý tưởng thumbnail** — mỗi cặp có một lời hứa rõ ràng.
- **Ba mở đầu** với cách tiếp cận khác nhau: cảnh đời thường / nghịch lý / tình huống lựa chọn.
- **Một câu trả lời cuối video** — bảo đảm lời hứa có payoff.

**Kiểm tra tự động:** thống nhất giữa tiêu đề – thumbnail – hook – nội dung sẽ kể. Không dùng số tiền, tỷ lệ hay lời hứa không được script hỗ hợp.

**Ví dụ hook nguyên bản:** *Ngày được tăng lương, Tích nghĩ cuối cùng mình cũng có thể thở. Ba tháng sau, tài khoản lại về chỗ cũ. Nhưng lần này, Tích không còn sống được bằng mức lương trước đây nữa.*

**Giải thích chỉ số:** mốc 30 giây là điểm kiểm tra retention có trong YouTube Analytics; không đặt ngưỡng phần trăm chung làm bảo đảm thành công. Hook phải trả lời đúng kỳ vọng người xem từ tiêu đề và thumbnail.

**Hành động:** chọn một cặp + một hook, hoặc viết phương án riêng. **Nút chính:** `Dựng khung câu chuyện` → Bước 7.

---

## BƯỚC 7 — Khung câu chuyện

**Chọn một trong bốn cấu trúc (bảng chọn, mỗi cái có ví dụ):**

| Cấu trúc | Phù hợp | Cách đi câu chuyện |
|---|---|---|
| Một quyết định và hậu quả | Bẫy tiêu dùng, tâm lý tiền | Tình huống → lựa chọn hợp lý → nghĩa vụ mới → sự cố → cơ chế → lựa chọn khác |
| Hai con đường | So sánh thói quen hoặc quyết định | Cùng xuất phát → lựa chọn khác → hậu quả phân kỳ → giải thích yếu tố tạo khác biệt |
| Điều tra một nghịch lý | Giá cả, doanh nghiệp, kinh tế đời sống | Hiện tượng → giả thuyết ban đầu → bằng chứng → cơ chế ẩn → câu trả lời |
| Các bẫy liên kết | Tổng hợp nhiều lỗi trong một chủ đề | Bẫy đầu → ví dụ và hậu quả → bẫy kế tiếp có liên hệ → nguyên tắc chung |

**Khung mỗi đoạn ghi:** câu hỏi đang xử lý, thông tin mới, bằng chứng hoặc ví dụ, tình thế thay đổi, cơ hội hình ảnh, lý do đi sang đoạn sau.

Không bắt mọi video theo một mẫu duy nhất. Người dùng sửa thứ tự và duyệt dàn ý trước khi viết dài. Có thể đổi cấu trúc nhưng giữ brief và dữ liệu nguồn.

**Nút chính:** `Viết script` → Bước 8.

---

## BƯỚC 8 — Viết script và kiểm tra

**Giao diện:** soạn thảo narration theo dàn ý đã duyệt. Tách hai bảng:

- **Bảng lời** (dùng để thu voice): đoạn → lời dẫn.
- **Bảng biên tập:** đoạn → mục đích → claim → nguồn → visual opportunity → ghi chú sửa.

**Tám kiểm tra tự động (hiển thị kết quả từng mục, kèm đề xuất sửa cụ thể):**

1. **Lời hứa** — kết thúc có trả lời điều tiêu đề/hook hứa không?
2. **Tiến triển** — mỗi đoạn có phát hiện hoặc thay đổi mới không?
3. **Logic** — quan hệ nhân quả hợp lý hay chỉ hai sự kiện xảy ra liên tiếp?
4. **Bằng chứng** — số liệu, thời gian, tên, phép tính có nguồn hoặc giả định rõ không?
5. **Cách kể** — có quá nhiều giải thích trước khi người xem có lý do quan tâm không?
6. **Ngôn ngữ** — lời có đọc tự nhiên, phù hợp khán giả không?
7. **Hình ảnh** — có thể hiện ý bằng nhân vật, object, data hoặc cutaway không?
8. **Tính nguyên bản** — có sao chép câu chữ hay kể lại gần như nguyên video tham khảo không?

**Quy tắc hiển thị:** không gọi điểm do AI chấm là "xác suất viral" hay "retention dự đoán". Hiển thị vấn đề cụ thể + đề xuất sửa.

**Thao tác sửa:** `Sửa hook`, `Rút đoạn này`, `Thêm ví dụ`, `Giải thích rõ hơn`, `Kiểm chứng claim`, `Duyệt script`.

**Nguồn chưa đủ:** giữ claim trong danh sách cần xác minh, thay câu để tránh khẳng định cụ thể, hoặc dùng ví dụ giả định có nhãn. Không tự tạo dữ kiện để lấp chỗ trống.

**Nút chính:** `Duyệt script` → khóa phiên bản script → Bước 9.

---

## BƯỚC 9 — Bàn giao sản xuất

**Gói bàn giao (xuất được JSON/Markdown/TXT):** brief, hồ sơ ngách, tiêu đề/thumbnail concept đã chọn, narration đã duyệt, nguồn claim, dàn ý, character/style reference, ghi chú hình ảnh.

**Quy tắc phiên bản:** sửa script sẽ đánh dấu voice và assets liên quan cần cập nhật (xem Phần B bước 15).

**Chuyển tiếp:** sang xưởng sản xuất Tích — voice → đo thời lượng → storyboard → chapter prompts → keyframe → clip thử → tạo clip → dựng → duyệt bản cuối.

**Nút chính:** `Mở trong Xưởng sản xuất` → Phần B.

---

## BƯỚC 10 — Đo kết quả và học (sau khi đăng)

**Dữ liệu nhận:** CTR theo nguồn traffic, impressions, retention 30 giây, average view duration, average percentage viewed, các điểm tụt/spike, phản hồi bình luận — chỉ khi có quyền truy cập (OAuth analytics). Không suy ra retention/CTR của kênh đối thủ từ dữ liệu công khai.

**So sánh:** video của mình với video cùng định dạng và độ dài gần tương đối; ghi bối cảnh traffic.

**Cách đọc (hiển thị kèm giải thích):**

- CTR thấp → gợi ý kiểm tra đóng gói và khán giả được phân phối; không chứng minh tiêu đề sai.
- Tụt đầu video → kiểm tra lời hứa, intro, tốc độ vào nội dung.
- Tụt giữa video → xem đoạn giải thích, sự lặp lại, chuyển ý.
- Spike → có thể hấp dẫn hoặc khó hiểu; xem lại ngữ cảnh.

**Hành động:** chọn bài học áp dụng cho video sau. Chỉ thay đổi một vài yếu tố có chủ đích để dễ hiểu kết quả; không kết luận ngách thất bại chỉ sau một video.

**Nút chính:** `Lưu bài học cho dự án` → quay Dashboard.

---

# PHẦN B — XƯỞNG SẢN XUẤT TÍCH (15 bước)

Áp dụng sau Bước 9 hoặc với dự án đã có script. Mỗi bước có gate duyệt; chỉ đi tiếp khi dữ liệu hợp lệ.

## Thiết lập kênh (làm một lần, tách khỏi từng video)

Khóa một lần: tên kênh, định vị, nhóm khán giả, ngôn ngữ mặc định, branding, character sheet Tích (`schoolboy-character-sheet-v1.png`), STYLE ANCHOR, quy tắc animation, thư viện đạo cụ, nguyên tắc thumbnail. Video mới dùng lại hồ sơ đã duyệt — không chạy lại naming, không thiết kế lại Tích. Đổi nhận diện → tạo phiên bản hồ sơ mới, áp dụng cho dự án được chọn.

## 15 bước sản xuất

| # | Bước | Người dùng làm gì | Hệ thống làm gì | Đầu ra / điều kiện đi tiếp |
|---|---|---|---|---|
| 01 | Nạp nguồn | Đính kèm MODEL PDF, character sheet | Đọc text + ảnh, ghi provenance, liệt kê dữ liệu thiếu | Hồ sơ nguồn. Thiếu character sheet → chưa khóa nhận diện Tích |
| 02 | Phân tích | Duyệt DNA trích xuất | Trích writing/visual/animation/thumbnail/prop DNA; đánh dấu phần chỉ là suy luận | Hồ sơ phong cách đã duyệt |
| 03 | Khóa kênh | Nhập tên hoặc chọn trong 10 tên đề xuất; branding tùy chọn | Sinh tên theo naming DNA; logo/banner prompt | Hồ sơ kênh dùng lại cho nhiều video |
| 04 | Chọn chủ đề | Nhập chủ đề hoặc chọn trong 10 ý tưởng | Chốt góc nhìn, đối tượng, ngôn ngữ, thời lượng | Brief video |
| 05 | Viết script | Duyệt/sửa script | Viết narration theo writing DNA; kiểm tra claim, phép tính, nguyên bản, nhịp kể | Script đã duyệt, phiên bản cố định |
| 06 | Tạo voice | Tạo hoặc上传 bản thu; duyệt | Kiểm tra đọc sai; đo thời lượng audio và mốc câu | Voice đã duyệt + timeline narration |
| 07 | Chốt visual flow | Chọn MINE (paste beats) hoặc YOURS | Giữ beats người dùng nêu; bổ sung gap; lập cast phụ và đạo cụ | Storyboard theo thời gian + danh sách reference cần có |
| 08 | Chapter prompts | Chọn clip ceiling 10s/15s | Chia chapter; lập beat (4–5 beat/10s, 5–7 beat/15s); nhúng CHARACTER LOCK + STYLE ANCHOR + PROP PALETTE; tách overlay | Prompt đầy đủ từng chapter; timeline không hở/chồng |
| 09 | Clip thử | Duyệt clip đại diện có Tích | Tạo scene still (nếu cần) rồi animate; kiểm tra identity và motion | Clip thử đạt yêu cầu trước khi sản xuất hàng loạt |
| 10 | Sản xuất assets | Duyệt queue, chọn phần chạy lại | Tạo clip theo hàng đợi; lưu reference, phiên bản, chi phí, lỗi; retry giới hạn | Bộ clip được kiểm tra; chỉ chạy lại phần lỗi |
| 11 | Thumbnail | Chọn 1 trong 5 phương án | Tạo 5 phương án ≥3 mode (A: nhân vật + callout, B: số làm hero, C: so sánh split, D: object hero); chữ thêm ở khâu dựng | Bộ thumbnail; phương án chọn cho bản xuất |
| 12 | Dựng video | Duyệt bản xem trước | Ghép timeline; căn hình với lời; chèn số liệu và chữ chính xác bằng overlay | Bản xem trước đầy đủ |
| 13 | Kiểm tra bản cuối | Duyệt bản cuối | Kiểm tra nội dung, nhân vật, continuity, âm thanh, phụ đề, thông số xuất | Bản cuối được người dùng duyệt |
| 14 | Xuất và đăng | Cho phép đăng/lên lịch (bật rõ ràng) | Xuất file + metadata; đăng chỉ khi được cho phép | Gói bàn giao hoặc video đã đăng |
| 15 | Phản hồi | Cung cấp hoặc cấp quyền dữ liệu hiệu suất | Xem CTR, retention, điểm rơi; lưu bài học có bằng chứng | Brief cải tiến cho video sau |

## Quy tắc sản xuất bắt buộc (tóm tắt giữ từ Engine v2.0)

- Character sheet là nguồn chính nhận diện Tích; PDF tham khảo chỉ cung cấp nguyên tắc kể chuyện và hình ảnh. Không lấy mascot nguồn thay Tích.
- Giữ tóc, đầu trắng lớn, khăn đỏ, tỷ lệ đầu/thân, mặt tối giản, tay chân mảnh. Không tạo Tích mới theo từng video.
- Narration mặc định tiếng Việt; prompt ảnh/video mặc định tiếng Anh; chữ overlay đưa riêng.
- Mọi prompt có Tích chứa đầy đủ CHARACTER LOCK; mọi chapter chứa STYLE ANCHOR, PROP PALETTE, beats, negative prompt.
- Character sheet = reference nhận diện; scene still = first frame nếu cần. Hai vai trò tách rõ trong dữ liệu gửi model.
- Không đưa phần script reference vào prompt gửi video model. Editor nhận lời + mốc thời gian để căn dựng.
- Chữ, nhãn biểu đồ, con số chính xác dựng bằng overlay; không yêu cầu model video tự viết.
- Mỗi beat tối đa một camera move. Phong cách khóa camera tĩnh → variety từ framing và cut.
- Match-cut giữa các chapter; không pad chapter cuối. Chapter cuối ngắn → giảm số beats cho phù hợp.
- Sửa một phần → chỉ làm lại phần bị ảnh hưởng (sửa script: đánh dấu voice/timeline/prompts/clip/bản dựng; sửa một prompt: làm lại assets chapter đó + kiểm tra hai điểm nối; sửa thumbnail: không làm lại video).
- Trạng thái tách rõ: `prompt_ready` ≠ `asset_generated` ≠ `asset_approved`.
- Thời lượng lấy từ voice đã duyệt, không phải đếm từ. Mặc định 2.6 wps chỉ là dự toán — cần kiểm chứng cho tiếng Việt. Số chapter tối thiểu = ceil(T/C); chapter cuối = T − C×(N−1). Không cắt câu máy móc theo mốc 10/15 giây — ưu tiên mốc câu và ý nghĩa.

---

# PHẦN C — MAPPING VÀO CODE STUDIO HIỆN CÓ

## Đã có trong `studio/`

- `core.mjs`: `median`, `enrichVideos` (tuổi video, bội số nền, nền gần đúng ≥3 mẫu), `normalizeImport` (CSV/JSON ≤500 video, validate title/channelId/views/publishedAt, loại trùng ID), `validateGroups` (AI chia nhóm ≤12 nhóm, nhóm `Chưa phân loại`), `safeYouTube`, `durationSeconds`.
- `server.mjs` + `public/`: UI local, port 3210, lưu `.studio-data`.
- Kiểm tra: `npm run studio:test`. API POST/PUT cần header `X-Studio-Request: 1`, cùng origin, host nội bộ.
- Đã có: nhập kho JSON/CSV, so nền view từng kênh, AI chia nhóm, hồ sơ kênh, rút bản sắc transcript, lộ trình chủ đề, xưởng 9 bước, chỉnh narration, prompt cảnh theo batch (≤8 cảnh/batch), nạp character sheet/ảnh/voice, thumbnail canvas, xuất JSON/Markdown/TXT.

## Cần build thêm (theo thứ tự ưu tiên)

1. **Bước 0–2 (khảo sát):** form cấu hình khảo sát có ngưỡng lọc lưu phiên bản; bảng kênh chỉ đường + bảng kênh làm cùng khuôn với hai nhóm cột đánh giá và nhãn bằng chứng. Kết nối YouTube Data API v3 (cần key riêng; khi chưa có key → chỉ nhập CSV/JSON thủ công).
2. **Bước 4:** màn hình so sánh ngách 5 tiêu chí + chốt hồ sơ ngách (bản tóm tắt một trang).
3. **Bước 5–8:** danh sách ý tưởng có bằng chứng; thiết kế tiêu đề/thumbnail/hook với kiểm tra thống nhất; soạn thảo script theo dàn ý với 8 kiểm tra tự động và các thao tác sửa.
4. **Bước 10:** nhập dữ liệu hiệu suất (hoặc OAuth analytics sau này) + cách đọc + lưu bài học.
5. **Xưởng sản xuất:** nối xưởng 9 bước hiện có với spec 15 bước Phần B — đặc biệt clip thử bắt buộc (bước 09), queue retry, trạng thái prompt/asset/approval tách biệt.
6. **Chưa nằm trong MVP:** tạo ảnh/video, TTS, render MP4, đăng YouTube, retention/CTR đối thủ, tự nghiên cứu web — hiện tại các bước media hỗ trợ prompt và nạp file thủ công.

## Data model tối thiểu

- Channel: channel_id, tên, định vị, audience, ngôn ngữ, style_version, character_reference_id, branding.
- Survey: survey_id, cấu hình, ngưỡng lọc, thời điểm, trạng thái.
- Reference: reference_id, file, loại, nguồn, trạng thái đọc/xác nhận.
- Video (kho): id, title, channelId, channelTitle, views, publishedAt, duration, format, url, capturedAt, baseline, multiple, baselineApproximate, peerCount, khuôn, nhóm chính, nhãn phụ.
- Group: id, tên, angle, reason, videoIds.
- NicheProfile: khán giả, vấn đề trung tâm, angle, lời hứa, ba trụ cột, điểm khác, giới hạn, bằng chứng.
- VideoProject: project_id, channel_id, brief, thời lượng mục tiêu, trạng thái, phiên bản script/voice.
- Script: script_id, version, narration, claims, nguồn, trạng thái duyệt.
- Voice: voice_id, script_version, file, duration, sentence_timestamps, trạng thái.
- Chapter: chapter_id, thứ tự, start, end, lời cover, beats, cast, props, overlays, handoff.
- Prompt: prompt_id, chapter_id, phiên bản lock/style, prompt gửi model, editor notes riêng.
- Asset: asset_id, loại, chapter_id, file, input_version, generation_job_id, trạng thái QA.
- Job: job_id, loại, inputs, trạng thái, số lần thử, lỗi, thời gian, chi phí.
- Approval: đối tượng, phiên bản, người duyệt, kết quả, thời gian, ghi chú sửa.
- Export: export_id, timeline_version, video_file, thumbnail_file, metadata, trạng thái bàn giao/đăng.
- Lesson: video_id, chỉ số, quan sát, bài học, áp dụng cho dự án.

---

# PHẦN D — TRẠNG THÁI & XỬ LỖI

**Trạng thái:** Nháp, Đang lấy dữ liệu, Đang phân tích, Cần người dùng chọn, Hoàn tất, Thất bại, Dữ liệu cũ (>30 ngày).

| Lỗi | Xử lý |
|---|---|
| Không có kết quả | Gợi ý mở rộng từ khóa/thời gian; không tự tạo kênh hoặc view |
| Quota hết | Giữ kết quả đã có, hiển thị phần chưa lấy, cho tiếp tục sau |
| Transcript không có | Cho nhập transcript hoặc chọn video khác; không kết luận cấu trúc script từ tiêu đề |
| Link sai/không truy cập | Đánh dấu rõ, cho sửa; không khẳng định đã xem |
| Chạy lại | Dùng cache, khóa theo job tránh trùng; hiển thị thời điểm dữ liệu |
| Chỉnh nhóm | Tính lại chỉ số từ dữ liệu đã có, không gọi API lại |
| Đổi thị trường/định dạng | Tạo phiên khảo sát mới hoặc tính lại phần phụ thuộc |
| Script dài chạm hạn mức miễn phí (Groq) | Dữ liệu đã lưu được giữ; người dùng chạy lại |
| Lỗi AI (chia nhóm, v.v.) | Hiển thị lỗi, cho làm lại; không chặn dữ liệu đã có |

---

# PHẦN E — LỘ TRÌNH BUILD & MỐC NGHIỆM THU

**MVP 1 (đang gần xong):** nhập khảo sát CSV/thủ công, bảng bằng chứng, sửa nhóm, chọn ngách, tạo brief, soạn dàn ý/script. Mọi tính toán chạy trên dữ liệu thật nhập vào; dữ liệu mẫu phải gắn nhãn minh họa.

**MVP 2:** kết nối YouTube (thu dữ liệu công khai, cache, xử lý quota); phân tích AI có nguồn, kết quả người dùng sửa được. Chốt API, xác thực, chi phí khi triển khai.

**MVP 3:** nối xưởng sản xuất Tích + analytics kênh được cấp quyền. Nghiệm thu bằng một phiên đi xuyên suốt: nguồn video thật → ngách có bằng chứng → brief → dàn ý → script duyệt → gói sản xuất → (nếu có công cụ) clip thử + clip + dựng → bản cuối.

**Mốc nghiệm thu đầu tiên của sản xuất:** một video hoàn chỉnh từ brief, giữ Tích nhất quán, hình khớp lời, thumbnail đúng script, xuất được file cuối. Kết nối tự động thêm dần sau mốc này.

---

# PHẦN F — RÀNG BUỘC DỮ LIỆU & PHÁP LÝ (giữ nguyên từ flow doc)

- Không sao chép câu chữ, thumbnail composition, logo, mascot, bố cục độc quyền từ kênh tham khảo. Chỉ hấp thụ nguyên tắc, nhịp, cấu trúc, ngôn ngữ hình ảnh cấp tổng quát.
- Không tạo số liệu, không promise lợi nhuận, không financial advice, không bảo người xem buy/sell named asset, không sponsor copy, không subscribe CTA (trừ khi người dùng chủ đích).
- Hiển thị dự toán chi phí từ cấu hình API thực tế; xác nhận trước lần chạy có phát sinh chi phí.
- Server chỉ nghe loopback; app local, chưa thiết kế cho máy chủ công khai hoặc nhiều người dùng.
