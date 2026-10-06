# Bản sửa theo góp ý trong “Đọc repo ứng dụng.docx”

## B8 · Chọn khuôn đạt ngưỡng và thêm kênh tay (06/10/2026)

Rà soát trước push: đã sửa thống kê `result` theo ứng viên thực sự được chọn (không giữ matches của cụm dài mặc định), và kết quả cũ thiếu candidates yêu cầu chạy lại thay vì báo nhầm không có khuôn. Hai test hồi quy bổ sung đã chạy đỏ rồi xanh.

B1/B2/B3/B4 đã có trước khi làm B8; ngưỡng hơn 50%, lọc contentVideos, lọc video mang khuôn và shelfGate không đổi. Sáu test B8 được viết và chạy đỏ trước khi triển khai. `templateCandidates` giữ tất cả prefix đạt ngưỡng, loại mạo từ cuối, sắp dài → ngắn; `findTemplate` dùng lại helper và kèm danh sách. API chọn lại khuôn chỉ chấp nhận ứng viên vừa tính từ kênh chỉ đường, khóa đúng cụm được chọn, xóa stage phụ thuộc. Khuôn ≤2 từ chỉ cảnh báo.

UI hiển thị radio, tỷ lệ khớp, ví dụ, rộng nhất/chặt nhất và nút Dùng khuôn này; không có khuôn thì khóa bước sau. Kênh thêm tay live được catalog và kiểm tra như kênh tìm tự động, loại trùng theo channelId, không đạt vẫn hiển thị lý do. Import bỏ qua extraChannels. Chưa có cơ chế C2 riêng trong repo: B8 cộng ước tính theo channels/playlist pages/video-detail batches và ghi rõ cache có thể làm khác số thực tế.

Kiểm tra bằng adapter YouTube giả lập và render UI thật; chưa kiểm chứng B8 bằng một lần cào YouTube thật. Không coi dữ liệu kiểm thử là bằng chứng một niche đạt.

Ngày kiểm tra: 05/10/2026. Giữ ứng dụng hiện có, dùng lại `rx.mjs` và `core.mjs` theo hướng C.

## Đã nối vào ứng dụng

- Khảo sát có sáu bước ở cả UI và API: sân → khuôn → kho → nhóm → gõ thử → chủ đề. Backend từ chối gọi bước sau khi cổng trước chưa đạt. PUT state không thể tự đặt `passed` hoặc giả khóa niche.
- Một bộ `RULES`: tối đa 20 tiêu đề nội dung mới nhất (cần ít nhất 10), cụm mở đầu dài nhất lặp **trên** 50%; chỉ tính video dài ≥ 120 giây; video ít nhất 90 ngày; kênh ít nhất 5 video trưởng thành và trung vị ít nhất 20.000; ít nhất 3 kênh cùng khuôn. Luồng mới không dùng lựa chọn ngưỡng rộng/vừa/chặt của luồng cũ.
- Đọc uploads phân trang 50 video/lượt, tối đa 1.000 video/kênh. Khi vẫn còn trang hoặc thiếu chi tiết video, kênh được đánh dấu chưa đầy đủ và không qua cổng. Phân loại Shorts từ thời lượng còn gần đúng, được hiển thị rõ.
- Chia 4–7 nhóm: AI chỉ nhận ID và title. Code kiểm tra ID, phân loại đủ video, tính view/bội số/số kênh. Người dùng chọn một nhóm trước khi gõ thử.
- Ba mẫu tìm kiếm, mỗi mẫu đủ 20 kết quả; lấy trung vị số video **vượt** 20.000 view; cần ít nhất 11/20. Mẫu thiếu hoặc số âm không thể đạt.
- Kiểm tra đúng 20 tiêu đề mới, không rỗng, không trùng nhau hoặc title trong kho, đúng prefix khuôn, và **không trùng thực thể** với kho. Đây là kiểm tra trùng chủ đề; tính mới về nội dung vẫn cần biên tập viên đối chiếu.
- Khóa khuôn, angle, nhóm, 20 chủ đề được clone và đóng băng sâu trong bộ quy tắc. Server giữ khóa vào kênh và dự án. Sửa dữ liệu nguồn hoặc chạy lại bước trước làm mất các kết quả phụ thuộc. Kênh tạo thủ công từ trang chủ vẫn là hồ sơ chưa có bằng chứng khảo sát.
- Hồ sơ `visualProfile` được gửi cùng yêu cầu tạo prompt. Có preset Stickman và giữ mô tả/character sheet Tích của kênh, caption đặt ở editor.
- Prompt ảnh và animation tách riêng. Animation chạy từng batch 4 cảnh đã có ảnh; kiểm tra đúng scene ID, duyệt từng prompt và xuất danh sách đã duyệt. AI hiện lập chuyển động từ mô tả ảnh, không thực hiện xem ảnh hoặc tạo clip.
- Script dài được chia thành các phần mục tiêu không quá 220 từ; mỗi phần được lưu. Có thể tiếp tục bản nháp sau lỗi. Thay script giữ bản cũ và đánh dấu cảnh cần làm mới. Cảnh chia từng batch 4, giữ nguyên toàn bộ từ của lời kể, duration cuối là phần dư.
- Phát hiện AI hết giới hạn đầu ra và báo lỗi thay vì nhận kết quả bị cắt.
- Media được lưu riêng trong `.studio-data/assets`, dự án giữ URL nội bộ. File trùng được tái sử dụng theo hash. Media base64 cũ được chuyển đổi với một bản sao state để phục hồi. Không xóa media tự động.
- Dựng MP4 chặn cảnh thiếu ảnh và timeline lệch voice quá 0,5 giây; không âm thầm bỏ cảnh hay cắt lời. FFmpeg đã dựng thử video 2 giây, đủ hai cảnh và không bỏ cảnh.
- Groq trực tiếp: bỏ prefix `groq/` của model khi gọi API trực tiếp, Whisper dùng ngôn ngữ kênh. API tạo ảnh với mascot cần character sheet; nếu adapter không hỗ trợ reference thì trả lỗi rõ ràng, không giả vờ khóa nhận diện.

## Kiểm chứng đầu–cuối trên trình duyệt (05/10/2026)

- Wizard 6 bước chạy thật trên kho nhập 60 video (fixture giả lập, đã gắn `duration` vì server lọc video dài theo thời lượng): sân → khuôn (`the entire history of the`) → kho 3/3 kênh đạt → 5 nhóm Groq thật → gõ thử trung vị 11/20 → 20 chủ đề Groq thật, khóa niche, dựng kênh kèm `nicheLock` (`identity.titlePattern` đã nhận khuôn).
- Bước chủ đề từng trả toàn tiêu đề trùng kho; đã sửa bằng cách gom tiêu đề hợp lệ qua 2 lượt gọi (lượt 2 kèm danh sách tránh) thay vì đòi một lượt đúng hết.
- 0 lỗi console trên tất cả màn hình đã đi qua.

## Lỗi server đã vá (nhánh `fix/review-2026-10`, 06/10/2026)

| Mã | Lỗi | Cách sửa | Test |
| --- | --- | --- | --- |
| A1 | `GET /api/build/<id>` không tồn tại làm unhandled rejection, Node tắt cả Studio | `return await serveBuild(...)`; thêm `process.on('unhandledRejection')` | `/api/build/<uuid>` → 404 JSON, `/api/build/xyz` → 400 JSON, `GET /` vẫn 200 |
| A2 | `b.ext`, `b.voiceExt`, `b.musicExt` nối thẳng vào đường dẫn, `ext: "x/../../../settings.json"` ghi đè được file ngoài thư mục tạm | `safeExt()` chỉ nhận `[a-z0-9]{1,5}`; fallback lần lượt `bin`/`mp3`/`mp3` | POST `/api/probe` với đuôi độc hại: `settings.json` giữ nguyên, không tạo file nào ngoài `dataRoot/tmp/<uuid>` |
| A3 | Timeout ffmpeg không bao giờ báo lỗi vì `if (killed)` chạy đồng bộ ngay sau `spawn` | Kiểm `killed` trong handler `close`, reject 504 | Lệnh ngủ 60 giây với timeout 200 ms phải reject 504; lệnh chạy xong vẫn trả kết quả |
| A4 | HTTP 308 (Resume Incomplete) của khối chưa cuối bị ném lỗi → mọi video > 8 MB hỏng | Đọc header `Range`, gửi tiếp từ `N+1`; thiếu `Range` thì gửi lại khối đó tối đa 3 lần rồi báo lỗi | Mock: 308+`Range` rồi 200 → trả `id`, đúng thứ tự `Content-Range` |
| A5 | `max_tokens` gộp chung 700 cho mọi action; `ideas` (30 mục) và `packaging` (16 mục) không thể vừa | Bảng `AI_TOKEN_BUDGET` theo từng action, tất cả ≥ 1600 | Gateway mock ghi lại `max_tokens` của cả 11 action; `ideas` ≥ 4000, `packaging` ≥ 3500 |

A4 kèm hai việc phụ: `selfDeclaredMadeForKids` chuyển khỏi `snippet` (Google chỉ nhận trong `status`),
và `STUDIO_UPLOAD_URL` / `STUDIO_UPLOAD_CHUNK` cho phép trỏ upload vào mock khi kiểm thử.

Hàm thuần của server nằm ở `studio/server-lib.mjs` (`safeExt`, `runBinary`, `uploadResumable`,
`buildUploadPayload`, `AI_TOKEN_BUDGET`) vì `server.mjs` mở cổng ngay khi được import nên không import được trong test.

`STUDIO_ENV_FILE` cho phép kiểm thử trỏ `OPENAI_BASE_URL` vào gateway giả; không đặt thì server đọc `.env` như cũ.

## Lỗi tìm ngách đã vá (nhánh `fix/review-2026-10`, 06/10/2026)

Bảy lỗi logic, mỗi lỗi một commit, viết test đỏ trước rồi mới sửa.

| Mã | Lỗi | Cách sửa | Test |
| --- | --- | --- | --- |
| B1 | Khuôn dừng ở cụm kết thúc bằng mạo từ (`the entire history of the`) vì chỉ cần 12/20 tiêu đề có mạo từ đó; khuôn đó bắt mọi chủ đề mới phải viết `…of the X` | `ARTICLES = {the, a, an}`; `findTemplate` bỏ qua khi cụm tốt nhất ở k đó kết thúc bằng mạo từ rồi thử `k-1` | 12/20 `…of the X` + 8/20 `…of X` → `the entire history of`; `guide to android` (chứa chữ `a`) vẫn là khuôn hợp lệ |
| B2 | `evaluateChannel` so sánh khuôn bằng `===`, nên kênh lặp cụm **dài hơn** bị loại dù cùng dòng khuôn | `sameTemplate = template của kênh BẮT ĐẦU BẰNG khuôn đã chốt`; kênh lặp khuôn khác bị loại kèm ghi rõ khuôn của nó | 3 kênh chứa khuôn đều tính cùng khuôn → `count 3`; kênh lặp khuôn khác bị loại và lý do nêu đích danh khuôn đó |
| B3 | Kho tính trung vị/bội số trên **mọi** video của kênh, nên video nóng nhất không mang khuôn làm sai cả kho | `carriesTemplate(title, template)` lọc trước `channelShelf`; kho gộp cũng chỉ gồm video mang khuôn | Kênh có 25 video 300.000 view không mang khuôn: `matureCount` 45→20, trung vị 300.002→30.009, bội số 0,1→1 |
| B4 | Lấy 20 tiêu đề **gồm Shorts**, và đòi **đúng** 20 nên kênh 14 video bị báo thiếu dữ liệu; ngưỡng 180 giây rải rác hai chỗ | `contentVideos()` là nơi duy nhất quyết định "video nội dung"; `RULES.minContentSeconds = 120`, `RULES.minTitlesForTemplate = 10`; tỷ lệ "quá nửa" tính trên số tiêu đề thực có | 20 video có 7 Shorts xen kẽ vẫn tìm ra khuôn (`total` 13); kênh 14 video ra khuôn, kênh 6 video báo đúng ngưỡng 10 |
| B5 | Tìm kênh bằng `search type=channel` với `q` là khuôn — chỉ khớp **tên kênh**, nên kênh có khuôn tiêu đề đúng vẫn không xuất hiện | `type=video`, `q="<khuôn>"`, `maxResults=50`, `publishedAfter` 00:00 ngày 01/01 năm nay; lấy `snippet.channelId`, gộp trùng, tối đa 10 kênh | Mock `youtube`: đúng tham số gọi; 5 kết quả/3 kênh → 4 mục (kênh dẫn đường đứng đầu); 50 kết quả → đúng 10 lần gọi `channels` |
| B6 | Chỉ so trùng **nguyên tiêu đề**, nên kho có `…of Egypt` vẫn nhận `…of Ancient Egypt`; prompt còn bảo AI chọn chủ đề **ÍT NỔI TIẾNG HƠN** | `entityOf()` bỏ khuôn + mạo từ đầu; `overlapsShelf()` khớp theo **cụm từ liên tiếp** (nên `egypt` ăn trong `ancient egypt` nhưng không ăn trong `egyptian empire`); dùng ở `validateTopics` và `take()`; `take()` xếp theo `knownBy` (cao > vừa > thấp) trước khi cắt còn 20; prompt đổi sang "thực thể nhiều người biết" | Kho có `Egypt` → loại `Ancient Egypt`, **giữ** `Egyptian Empire`; 8 chủ đề "cao" nằm trước 12 chủ đề "thấp"; test prompt server khẳng định không còn `ÍT NỔI TIẾNG HƠN` |
| B7 | Người dùng phải tự nghĩ 3 câu gõ thử; trượt thì không có đường quay lại | `suggestedQueries()` lấy 3 câu từ nhóm có bội số trung vị cao nhất (bỏ nhóm `unclassified`), ghép lại khuôn; `groups` trả `suggestedQueries`; UI điền sẵn 3 ô và hiện nút "Thử nhóm khác" khi `probe` trượt | Nhóm có trung vị 4,5 thắng nhóm ~1,05; 3 câu lấy theo bội số giảm dần; dữ liệu rỗng/sai kiểu trả `[]` |
| B8 | `suggestedQueries` chọn nhóm trung vị cao nhất vô điều kiện: nhóm đó chỉ 1 video thì dựng sẵn 1 dòng, bấm "Kiểm tra nhu cầu" bị 400 `Nhập đúng ba câu` dù kho còn nhóm 13 video | Ưu tiên nhóm dựng được **đủ** số câu; trong đó nhiều câu hơn thắng, rồi tới trung vị cao hơn; không nhóm nào đủ thì lấy nhóm nhiều câu nhất; UI nói đúng số câu dựng được và nhắc cần đủ ba | Nhóm 1 video trung vị 9,1 + nhóm 6 video trung vị ~2,2 → 3 câu từ nhóm lớn; không nhóm nào đủ thì lấy nhóm nhiều câu nhất |
| B9 | Khảo sát trong state thiếu `videos` làm trang trắng (`Không tải được Studio`), vì `app.js` đọc `s.videos.length` thẳng và `PUT /api/state` chỉ kiểm mảng `surveys` | `app.js` dùng `s.videos?.length \|\| 0`; PUT bổ sung `videos = []` khi thiếu, chặn `videos` không phải mảng bằng 400, chặn khảo sát thiếu `id` | PUT `videos` dạng object → 400; PUT thiếu `videos` → 200, đọc lại ra `[]`; trang chủ render an toàn |

Hai ngưỡng mới (`minTitlesForTemplate = 10`, `minContentSeconds = 120`) là giá trị đã chọn, nằm trong
`RULES` nên chỉnh được một chỗ. `discover()` vẫn giữ mốc 180 giây riêng vì nhiệm vụ của nó là
**phân loại** dài/Shorts theo lựa chọn của người dùng, không phải lọc để tìm khuôn.

## Kiểm chứng

Chạy `npm run studio:test`.

Kiểm thử HTTP dùng cổng và thư mục dữ liệu riêng nằm trong workspace, không thay dữ liệu người dùng,
không gọi provider trả phí. Toàn bộ phần đăng YouTube dùng HTTP mock cục bộ — **chưa kiểm chứng
với YouTube thật**.

Yêu cầu `/api/test` trên app hiện tại đã trả `{ok:true, model:"openai/gpt-oss-120b"}`. Gateway hiện tại là `https://api.groq.com/openai/v1`; tên model có `openai/` không đổi provider thành OpenAI.

## Giới hạn cần giữ rõ

- Kiểm thử toàn bộ khảo sát dùng dữ liệu giả lập hoặc nhập có xác nhận. Không coi dữ liệu người dùng khai báo là số liệu đã được YouTube xác minh. Chưa kiểm chứng một niche thật từ đầu đến cuối bằng API YouTube.
- Chưa chạy dịch vụ tạo ảnh, TTS, Suno hoặc đăng video YouTube thật. Adapter image edit có truyền file reference nhưng chưa kiểm chứng chất lượng khóa mascot với một provider ảnh thực tế. ComfyUI reference workflow chưa nối.
- Bản dựng MP4 hiện là ảnh tĩnh + audio/nhạc nền. Chưa dùng clip animation và chưa xuất dự án CapCut native. Gói ZIP là gói bàn giao media/prompt, không phải project CapCut.
- Không khẳng định mọi công cụ bên ngoài miễn phí hoặc mọi bước AI có giá cố định. Kiểm tra hạn mức và hóa đơn ở provider đang dùng.

## Quota YouTube hiện hành

[Google Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost), cập nhật 15/09/2026: mặc định search.list có quỹ 100 lượt/ngày, videos.insert có quỹ 100 lượt/ngày; mỗi lượt dùng 1 đơn vị trong quỹ riêng. Các endpoint khác dùng chung quỹ 10.000 đơn vị/ngày; channels.list, playlistItems.list, videos.list mỗi lượt 1 đơn vị. Bộ đếm app chỉ là ước tính trong phiên chạy; Google Cloud là nguồn hạn mức thực tế.

## UX tìm ngách rút gọn (06/10/2026)

Năm bước hiển thị, sáu cổng backend vẫn giữ nguyên. Phân tích kênh nối field → template; duyệt khuôn nối template → shelf và dừng nếu không đạt. Ẩn lựa chọn nâng cao trong details, thêm nút xử lý kho thiếu kênh, lưu gợi ý câu tìm đúng với dữ liệu gửi. Sáu kiểm thử mới cho UI và chuỗi thao tác đã đạt; chưa kiểm chứng chuỗi tự động với YouTube thật.

## D1 · Kênh khám phá không truy cập được

Lỗi catalog có status thành dòng không đạt, kèm lý do; lỗi không có status vẫn ném tiếp. Kênh lỗi không làm hỏng toàn bộ bước kho và không được tính vào cổng. Test mock items rỗng và lỗi mạng đã đỏ trước, xanh sau. Chưa kiểm chứng với YouTube thật.

## D2 · Chủ đề mới trùng thực thể với nhau

Mỗi tiêu đề mới được so với cả kho và danh sách good. Egypt / Ancient Egypt chỉ giữ một; nếu thiếu 20 sẽ gọi lượt đề xuất bổ sung. Test hai lượt mock đã đỏ trước, xanh sau; chưa chạy Groq/YouTube thật trong mục này.

## D3 · Giảm trùng nhầm từ chung

Thực thể trong kho chỉ gồm war/history/story/life/world/empire/time/man/people chỉ trùng khi thực thể mới bằng đúng nó. Thực thể từ hai từ vẫn dùng luật chứa theo ranh giới từ. Bước 20 chủ đề luôn nhắc người dùng tự đối chiếu đồng nghĩa. Test logic và UI đã đỏ trước, xanh sau; các ca Egypt và Rome/Romeo giữ nguyên.

## D4 · Kho nhập thiếu duration

Kênh có ít nhất 80% video duration=0 và không phải format=short: template trả 400 với hướng dẫn bổ sung cột; shelf giữ dòng không đạt với cùng lý do. Shorts được đánh dấu rõ không bị coi là thiếu thời lượng. Test 0 giây, 600 giây, mốc 80% và Shorts đã đỏ trước, xanh sau.

## D5 · Gõ thử lấy dư và kiểm tra kiểu titles

Search live lấy 25, loại chi tiết thiếu/view không hợp lệ rồi lấy đúng 20 theo thứ tự trả về. Dưới 20 báo số thực có, không nới cổng. titles có mặt nhưng không phải mảng trả 400 trước khi gọi AI hoặc ghi state. Test mock mất chi tiết, view sai, mẫu 19 và titles sai đã đỏ trước, xanh sau. Chưa kiểm chứng search YouTube thật.
