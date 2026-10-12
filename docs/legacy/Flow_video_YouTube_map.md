# Flow theo video YouTube — Map vào app spec (Tích Studio)

Nguồn: transcript video *"Cách Mình Tạo 1 Video YouTube HOÀN CHỈNH Bằng AI - (FULL Quy Trình)"* (https://www.youtube.com/watch?v=Agmqa63o28svv). File này map flow của tool tham khảo (gọi là "Studio"/"R tool" trong video) vào `Flow_ung_dung_chi_tiet.md` và code `studio/` đang có.

---

# PHẦN 1 — FLOW TRONG VIDEO (CÓ NGƯỠNG VÀ CHỈ SỐ CỤ THỂ)

## 1.1 Tiền đề — cách tìm ngách (video trước)

- Tìm kênh tham khảo → nhận ra kênh đó **tập trung vào một template tiêu đề** (ví dụ: "history of [quốc gia] trong [N] phút") thì kênh bắt đầu tăng trưởng; thumbnail theo cùng công thức (quốc gia/thời đại + tên + năm).
- Gom tất cả kênh dùng **cùng khuôn (template) và cùng góc nhìn** → gom chủ đề thành **các nhóm chủ đề** (đế chế/quốc gia, con người, thành phố...).
- Chọn nhóm có **nhu cầu cao, cung ít, bội số trung vị cao** — vào thị trường không cạnh tranh trực tiếp với các nhóm đó nhưng dùng cùng phương pháp sản xuất (stick figure đơn giản, AI image, transition đơn giản, AI voiceover).
- Vấn đề của cách làm rời rạc: script ở ChatGPT/Gemini/Claude, scene breakdown riêng, prompt riêng, ảnh riêng, thumbnail riêng → tool tích hợp tất cả trong một studio.

## 1.2 Flow tool (từng bước)

| # | Bước | Chi tiết trong video |
|---|---|---|
| 1 | Chọn playground (thị trường) | US market / Vietnamese market (sau mở thêm). Mỗi thị trường học từ kênh cùng thị trường đó |
| 2 | Cổng ngưỡng (threshold gate) | Cũ (nghiêm ngặt): video >90 ngày tuổi, ≥5 video thành công (20k–1k views), nhóm ≥5 video và ≥3 kênh. Nay ở mức vừa phải để nhiều kênh qua hơn. Ngưỡng hiển thị và sửa được |
| 3 | Lead channel (kênh chỉ đường) | Paste link kênh đã biết → tool tự phát hiện template (ví dụ "enjoy history") |
| 4 | Bước 2 — tìm kênh cùng template | Chạy tự động tìm kênh dùng cùng template. Cổng: **median >20k views**. Kênh median vài nghìn view bị loại. Kết quả hiện kênh nào đúng template, kênh nào bị làm mờ (không cùng template) |
| 5 | Duyệt kênh thủ công | Click từng kênh để kiểm tra có cover nhóm chủ đề mình quan tâm không. Người dùng tự chọn (ví dụ 5 kênh) — "không để máy quyết định" |
| 6 | Đo kho video | Từ 5 kênh: đo ~96 video, tất cả >2 tháng tuổi |
| 7 | Gom nhóm chủ đề | AI đọc tất cả topic → chia nhóm (video ra 7 nhóm: đế chế/quốc gia/tổ chức, thành phố, chiến tranh/xung đột, vùng đất/quốc gia, sắc tộc/tôn giáo/văn minh, sự kiện/hiện tượng lịch sử, quốc gia...). Chỉ số mỗi nhóm: số kênh cover, số video, **median multiple** (ví dụ 1.27 = cao hơn median kênh) |
| 8 | Xác minh nhu cầu | Tool tự tạo 3 câu tìm kiếm cho nhóm → **người dùng tự dán vào YouTube** để đo: có bao nhiêu video >20k views. Có filter "năm nay" và short-form. Cảnh báo: view máy đôi khi sai; có kênh clone/re-upload (cùng tên, title, thumbnail) |
| 9 | Chọn nhóm | Ví dụ chọn "empires/states/organizations": median cao nhất, 5 kênh đang hoạt động, 15 video. Bỏ nhóm quá niche (sự kiện/hiện tượng lịch sử: kênh nhỏ không take off) |
| 10 | Build channel from results | Dữ liệu được load vào kênh mới |
| 11 | Học voice | Học từ kênh lớn đang tăng trưởng **cùng thị trường** (VN học kênh VN) |
| 12 | Loại kênh | **Storytelling** (mỗi video nhân vật khác, không mascot) vs **Mascot/host** (nhân vật dẫn cố định luôn là người kể). Video demo chọn storytelling nhưng hướng bền hơn: mascot + host |
| 13 | Extract identity | Tool trích format + voice style từ các kênh. **Học được:** format, công thức hook, góc nhìn, phong cách hình ảnh. **Không học/copy:** nguyên liệu thô cụ thể, visual cụ thể của kênh, giọng, market, shock angle, nghịch lý, số topic |
| 14 | Approve & validate | Duyệt giá trị → đặt tên kênh, set identity (sửa được sau) |
| 15 | Character & art style | Thiết kế mascot (video sau); art style presets (ví dụ stickman mods). **Thư viện background/character** để tái dùng — vẽ "tribesman Adam" rồi script nhắc Adam là gọi lại được |
| 16 | Roadmap 30 video | "Cánh cửa" = 10 video đầu (thực tế 10–13 video quyết định tiếp hay dừng). List topic trong nhóm vào thư viện (video demo list 33 topic) để không hết ý tưởng |
| 17 | Make video — setup | Chọn topic (video demo chọn topic có average score cao nhất), chọn duration (demo 5 phút), **pacing**: script 15–20 phút → 200–300 scenes; nhanh = đổi scene mỗi 3s, chậm = mỗi 8s, vừa phải → ~60 scenes |
| 18 | Finalize thumbnail layout TRƯỚC | Vào engine: paste thumbnail kênh mẫu → tải về → máy phân loại layout (ví dụ: "người/ngữ cảnh + text", "scene + text phía trên") → học hook template → thiết kế layout riêng cho kênh và topic (cùng chất lượng/style/font) → match → confirm. **Tối đa 3 layout/kênh** |
| 19 | Research | Nguồn chính Wikipedia, nhiều ngôn ngữ → summary, timeline, dữ kiện thật, characters xuất hiện |
| 20 | Chọn storytelling angle | Tool đề xuất 3 angle, vẫn nhất quán với angle chính của kênh → chọn 1 |
| 21 | Review data → viết script | Demo 5 phút ≈ 800 từ |
| 22 | Scene split | Tách scene như đạo diễn (demo: 91 scenes). **Quy tắc:** character = xuất hiện >2 scenes; background = xuất hiện ≥4 scenes (demo: 5 characters, 5 backgrounds) |
| 23 | Tạo character/background ngoài | Paste 10 prompts vào tool tạo ảnh ngoài (video gọi "Glab"/"Cab"), **khuyên 2K**, generate, load về studio — tự động match tên |
| 24 | Tạo scene cho cả video | Copy 91 prompts; reference bộ ảnh gốc đã tải về (cùng tên) để tự match character/background trong từng scene → generate |
| 25 | Video generation theo batch duration | Chia batch 4s / 6s / 8s để scene cố định không bị cắt cụt; tải prompt + reference images; demo chọn 6s, 720p cho nhanh, ~10 threads. Ảnh 2K → video chất lượng cao hơn |
| 26 | Voiceover | Copy script → TTS bất kỳ (đổi ngôn ngữ) → generate → download |
| 27 | SRT | Render **chỉ SRT** (không render video) trong CapCut để timing chính xác → upload voice + SRT vào studio |
| 28 | Packaging | Gói thành **CapCut project**: tự tạo background music theo mood (unique, tự sinh), SFX (biển, gõ, chim, gió...), metadata (description, tags), tải thumbnail. Download project → đóng CapCut hoàn toàn → mở lại → import → mọi thứ tự căn (track VO để dài hơn để tự căn/optimize) → fine-tune → upload |

## 1.3 Thứ tự đúng (video nhấn mạnh)

**Package first:** topic → **title + thumbnail** → research → script → scene split → characters/backgrounds → voiceover → package. Vì title/thumbnail là chỉ số quyết định click; nếu làm đóng gói cuối mà tệ, mọi bước trước bị phí.

---

# PHẦN 2 — CẢNH BÁO TỪ VIDEO

- **Dữ liệu view của máy có thể sai** → luôn tự kiểm tra trên YouTube.
- **Kênh clone/re-upload** (cùng tên, title, thumbnail) → nhận diện và loại khỏi bằng chứng.
- **Luật chơi đã đổi:** không còn copy lại nội dung đối thủ để lên — phải build brand, nhận diện, identity riêng.
- Nhóm quá niche: kênh nhỏ thử mà không take off → bỏ nhóm đó.
- Nhu cầu thật = view không đến từ sub (ví dụ 12k subs nhưng 491k views) — đó là dấu hiệu nhóm tiềm năng.

---

# PHẦN 3 — MAP VÀO SPEC ĐÃ CÓ (`Flow_ung_dung_chi_tiet.md`)

| Bước video | Spec đã có | Trạng thái |
|---|---|---|
| 1 Chọn thị trường | Bước 0 (ngôn ngữ, thị trường, định dạng) | ✅ Có — thêm preset "playground" US/VN |
| 2 Cổng ngưỡng | Bước 0 (ngưỡng lọc sửa được) | ✅ Có — thêm preset Strict/Moderate |
| 3 Lead channel → template | Bước 1 (kênh chỉ đường, phát hiện khuôn) | ✅ Có — thêm tự phát hiện template + tên template |
| 4 Kênh cùng template, median >20k | Bước 2 (kênh làm được, nhãn bằng chứng) | ⚠️ Thêm cổng median >20k mặc định |
| 5 Duyệt kênh thủ công | Bước 2 (chọn kênh vào kho) | ✅ Có — thêm UI làm mờ kênh không cùng template |
| 6 Đo kho >2 tháng tuổi | Bước 3 (kho video) | ✅ Có — thêm filter tuổi mặc định 60 ngày |
| 7 Gom nhóm + median multiple | Bước 3 (chia nhóm, bội số nền) | ✅ Có — thêm cột "số kênh cover" |
| 8 Xác minh nhu cầu (3 câu tìm kiếm) | Bước 3/4 | ➕ MỚI — auto tạo 3 câu tìm kiếm + link YouTube search |
| 9 Chọn nhóm | Bước 4 (so sánh ngách) | ✅ Có |
| 10–11 Build channel, học voice | Thiết lập kênh (Phần B) | ✅ Có — thêm "học voice từ kênh lớn cùng thị trường" |
| 12 Loại kênh storytelling/mascot | Thiết lập kênh | ➕ MỚI — Tích = mascot/host |
| 13 Extract identity (học/không học) | Bước 02 Phần B (DNA) | ✅ Có — thêm danh sách "không học" |
| 15 Thư viện asset có tên | Studio có nạp character/background | ➕ MỚI — library + đặt tên + tái dùng |
| 16 Roadmap 30 video + cánh cửa 10–13 | Studio có lộ trình chủ đề | ➕ MỚI — tracking "cánh cửa" 10–13 video đầu |
| 17 Pacing (3s/6s/8s per scene) | Phần B bước 08 (clip ceiling 10s/15s) | ⚠️ Thêm tùy chọn nhanh/vừa/chậm |
| 18 Thumbnail layout trước | Bước 6 spec (title/thumbnail trước script) | ✅ Phù hợp — thêm engine phân loại layout, tối đa 3 layout |
| 19 Research Wikipedia | Bước 8 (nguồn claim) | ➕ MỚI — research step; phải verify, không invent |
| 20 Ba storytelling angle | Bước 7 (4 cấu trúc) | ➕ MỚI — đề xuất 3 angle nhất quán angle kênh |
| 22 Scene split (>2/≥4 scenes) | Phần B bước 07–08 | ➕ MỚI — quy tắc đếm scene cho cast/background |
| 23–25 Tạo ảnh/video ngoài, batch 4/6/8s | Phần B bước 09–10 (clip thử, queue) | ➕ MỚI — exporter batch theo duration + reference name matching |
| 26–27 TTS + SRT | Phần B bước 06 (voice) | ➕ MỚI — upload SRT, căn mốc lời từ SRT |
| 28 CapCut package (music/SFX/metadata) | Phần B bước 12–14 (dựng, xuất) | ➕ MỚI — export gói CapCut; music/SFX tự sinh cần công cụ ngoài |

---

# PHẦN 4 — MODULE MỚI CẦN BUILD CHO STUDIO (theo video)

1. **Playground & threshold presets** — chọn thị trường (US/VN), preset cổng Strict/Moderate, ngưỡng sửa được, lưu kèm phiên khảo sát.
2. **Template detection** — từ lead channel: tự phát hiện và đặt tên template (khuôn), hiển thị làm căn cứ cho Bước 2.
3. **Median gate >20k** — lọc kênh cùng template theo median views; hiển thị lý do loại.
4. **Channel review UI** — bảng kênh với trạng thái sáng/mờ (cùng/khác template), check "có cover nhóm chủ đề mục tiêu", chọn tay.
5. **Demand verification** — auto tạo 3 câu tìm kiếm mỗi nhóm, mở link YouTube search, checklist "≥N video >20k views?", filter năm nay/short-form, đánh dấu clone channel.
6. **Channel profile mở rộng** — loại kênh (storytelling/mascot-host), voice học từ kênh lớn cùng thị trường, danh sách học được/không học, asset library có tên, roadmap 30 video + tracking cánh cửa 10–13 video.
7. **Thumbnail layout engine** — paste thumbnail mẫu → phân loại layout → hook template → thiết kế layout riêng → tối đa 3 layout/kênh.
8. **Research step** — tổng hợp từ Wikipedia đa ngôn ngữ; mọi dữ kiện vào danh sách claim cần verify.
9. **Angle generator** — 3 angle nhất quán angle kênh.
10. **Scene split engine** — quy tắc character >2 scenes, background ≥4 scenes; đếm scene theo pacing (3s/6s/8s).
11. **Batch exporter** — xuất prompts + reference images theo batch 4s/6s/8s cho tool tạo video ngoài; reference name matching.
12. **Voice + SRT** — upload TTS audio + SRT; căn mốc câu từ SRT.
13. **CapCut package exporter** — timeline, SFX cues, metadata (description, tags), thumbnail; music tự sinh là module ngoài (cần công cụ tạo music).

---

# PHẦN 5 — GHI CHÚ KHI BUILD

- Thứ tự sản xuất trong app phải là **package first**: topic → title/thumbnail → research → script → scenes → media → voice → package.
- Mọi số liệu view hiển thị kèm thời điểm chụp; có nút "kiểm tra lại trên YouTube" cho từng hàng.
- Tích là mascot/host (channel type = mascot-host) — khớp với Engine v2.0.
- "Glab"/"Cab"/"Focus Cam"/"R tool" trong video là tên tool riêng của tác giả video; app của bạn build tương đắc năng, không cần cùng tên.
- Chưa xác minh được: độ chính xác của auto template detection, auto grouping, auto music generation — cần test với dữ liệu thật trước khi tin mặc định.
