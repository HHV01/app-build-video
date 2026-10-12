# Thiết kế luồng tìm ngách và xây kịch bản cho người dùng

## Mục tiêu

Người dùng đi từ một chủ đề rộng đến một ngách có dữ liệu hỗ trợ, chọn góc khai thác, lập kế hoạch video và viết kịch bản có thể đưa sang hệ thống Tích Finance. Thiết kế dựa trên tám ảnh giao diện được cung cấp. Link video chưa truy xuất được nên các chi tiết không xuất hiện trong ảnh được ghi là đề xuất.

Phần tìm ngách trong ảnh gồm chọn thị trường, tìm kênh chỉ đường, tìm kênh làm được, gom video, chia nhóm và chọn angle. Phần đánh giá cơ hội, thiết kế lời hứa, xây kịch bản và kiểm tra kết quả dưới đây là phần mở rộng đề xuất.

Đây là đặc tả giao diện và quy trình sử dụng; chưa có kết nối dữ liệu YouTube hoặc chức năng tự động đang chạy.

## 1. Trang chủ

Hiển thị bốn thao tác: Tìm ngách, Thiết lập kênh, Xây kịch bản, Đo kết quả. Bên dưới là các dự án đang làm, bước hiện tại, dữ liệu cập nhật lúc nào và việc người dùng cần làm tiếp.

Tìm ngách có thể dùng khi chưa có kênh. Thiết lập kênh nhận hồ sơ ngách đã chọn. Xây kịch bản nhận chủ đề đã chọn hoặc chủ đề tự nhập. Đo kết quả nhận dữ liệu kênh do người dùng cung cấp hoặc cấp quyền truy cập.

Mỗi màn hình có phần Hướng dẫn, Dữ liệu đầu vào, Kết quả, Giải thích chỉ số và nút tiếp tục. Kết quả chạy được lưu để tải lại trang vẫn tiếp tục được.

## 2. Bước 0 chọn thị trường và cách khảo sát

### Người dùng nhập

- Ngôn ngữ nội dung: tiếng Việt hoặc tiếng Anh.
- Thị trường ưu tiên: Việt Nam, Mỹ hoặc thị trường khác. Không coi vị trí khai báo của kênh là bằng chứng địa lý khán giả.
- Định dạng: video dài hoặc Shorts; mỗi khảo sát chỉ so một định dạng.
- Nhóm nội dung muốn tìm: tài chính, tâm lý, lịch sử, kinh doanh hoặc tự nhập.
- Khoảng thời gian video: mặc định đề xuất 90 ngày, có thể mở rộng khi dữ liệu ít.
- Phong cách sản xuất: hoạt hình, faceless dùng stock, quay người thật hoặc không giới hạn.
- Năng lực của mình: thời lượng dự kiến, số video/tuần và ngân sách sản xuất nếu có.

### Cấu hình khảo sát đề xuất

Khám phá: bộ lọc rộng để tìm ứng viên. Kiểm chứng: chỉ đưa vào danh sách ưu tiên các mẫu có nhiều video và nhiều kênh độc lập hỗ trợ. Các ngưỡng lượt xem, số video và số kênh phải được hiển thị, sửa được và lưu cùng phiên khảo sát. Chúng là quy tắc lọc của ứng dụng, không phải tiêu chuẩn của YouTube hoặc bảo đảm thành công.

Không sao chép các mức quota hoặc chi phí trong ảnh thành thông số hệ thống. Hiển thị dự toán từ cấu hình API và nhà cung cấp thực tế khi triển khai, cùng xác nhận trước lần chạy có phát sinh chi phí theo thiết lập người dùng.

Nút chính: Lưu thị trường và tìm kênh.

## 3. Bước 1 tìm kênh chỉ đường

Kênh chỉ đường giúp tìm khuôn nội dung và ngôn ngữ tiêu đề; không cần là kênh nhỏ hoặc kênh mà người dùng có thể tái hiện ngay.

### Người dùng nhập

Nhập 3–8 cụm tìm kiếm, mỗi dòng một cụm, và link kênh đã biết nếu có. Ví dụ cho Tích: lifestyle creep, money psychology, financial traps, why salary is never enough. Khi khảo sát tiếng Việt, dùng cụm tiếng Việt hoặc bộ từ khóa do người dùng duyệt.

### Hệ thống xử lý

Tìm video/kênh ứng viên; xác minh ID; loại trùng; lấy video mẫu; phát hiện khuôn tiêu đề và định dạng. Phân biệt dữ liệu quan sát với nhãn do AI suy luận. Không khẳng định camera, cấu trúc script hoặc độ khó sản xuất chỉ từ tiêu đề.

### Bảng kết quả

Kênh | Link | Khuôn thường gặp | Ví dụ video | Số video quan sát | Độ phù hợp ngôn ngữ/định dạng | Mức chắc chắn | Thao tác.

Người dùng bấm Xem bằng chứng để mở các video hỗ trợ khuôn, sau đó Chọn khuôn này. Có thể sửa tên khuôn hoặc chọn nhiều khuôn để so sánh. Một khuôn như Why X happens chỉ là hình thức tiêu đề; chưa đủ để gọi là ngách.

Nút tiếp: Tìm các kênh làm cùng khuôn.

## 4. Bước 2 tìm kênh làm được

Mục tiêu là tìm bằng chứng khuôn được nhiều kênh thực hiện lặp lại, đồng thời đánh giá người dùng có thể sản xuất hay không.

### Người dùng nhập

Khuôn đã chọn, từ khóa bổ sung và giới hạn thời gian khảo sát. Có bộ lọc kênh theo quy mô, thời gian hoạt động, định dạng và phong cách; không loại kênh chỉ vì view thấp trước khi xem dữ liệu cùng khuôn.

### Hai loại đánh giá tách riêng

1. Kênh có thực hiện khuôn: số video khớp và tỷ lệ khớp trong mẫu khảo sát.
2. Khuôn có hiệu quả trong kênh: phân bố lượt xem, bội số so với nền của kênh và số video thành công lặp lại.

### Bảng kết quả

Chọn | Kênh | Quy mô tại thời điểm thu thập | Video khớp/tổng mẫu | Trung vị cùng định dạng | Trung vị video khớp | Video vượt nền | Bằng chứng | Đánh giá khả năng sản xuất.

Không gán nhãn ăn thật chỉ bằng lượt xem tuyệt đối. Nhãn phù hợp hơn: Có kết quả lặp lại, Chỉ có một video nổi bật, Chưa đủ mẫu, Không cùng khuôn.

Người dùng chọn các kênh để đưa vào kho. Cảnh báo mô tả khi toàn bộ mẫu đến từ một kênh hoặc cùng một mạng nội dung, nhưng cho phép tiếp tục với trạng thái bằng chứng yếu.

Nút tiếp: Tạo kho video khảo sát.

## 5. Bước 3 tạo kho video và chia nhóm

### Kho video

Video | Kênh | Ngày đăng | Tuổi video | Định dạng | Thời lượng | View tại thời điểm chụp | Bội số nền | Khuôn | Nhóm chủ đề | Link | Trạng thái xác minh.

View và tuổi video được lưu tại cùng thời điểm thu thập. Không gọi một video cũ là đang lên chỉ vì tổng view cao. Muốn đo tốc độ tăng phải có ít nhất hai lần chụp số liệu; tốc độ tăng tính từ chênh lệch view chia khoảng thời gian, không lấy tổng view/tuổi video để thay thế.

Bội số nền = view video / trung vị view của các video so sánh cùng kênh, cùng định dạng và có tuổi đăng gần nhau. Nếu chưa đủ mẫu đồng tuổi, dùng nền gần đúng và hiển thị hạn chế. Nền bằng 0 hoặc quá ít mẫu thì không tính. Bội số đo mức nổi bật trong kênh, không đo nhu cầu toàn thị trường.

### Chia nhóm

AI gợi ý nhóm theo vấn đề người xem muốn giải quyết. Người dùng sửa tên nhóm, chuyển video và gộp/tách nhóm. Với Tích, nhóm ban đầu có thể là tăng lương vẫn thiếu tiền, áp lực mua nhà/xe, tiền và quan hệ, cảm giác bắt đầu muộn, bẫy mua sắm, cơ chế kinh doanh.

Một video có một nhóm chính để tránh đếm trùng trong tổng; có thể có các nhãn phụ. Video không rõ nhóm được giữ trong Chưa phân loại.

### Bảng nhóm

Nhóm | Số video | Số kênh độc lập | Trung vị bội số | Khoảng tuổi video | Số video nổi bật | Độ chắc chắn | Khả năng làm series | Xem bằng chứng.

Có cả view tuyệt đối lẫn bội số và số kênh. Không xếp nhóm chỉ theo bội số trung bình, vì một video bất thường có thể kéo lệch kết quả.

Nút tiếp: So sánh ngách.

## 6. Bước 4 chọn ngách và angle

Ngách = nhóm khán giả + vấn đề lặp lại + lời hứa nội dung + cách thể hiện.

Ví dụ đề xuất: người đi làm 25–40 tuổi muốn hiểu vì sao thu nhập tăng nhưng vẫn thấy thiếu tiền, được giải thích bằng các câu chuyện hoạt hình đời thường. Đây là ứng viên để kiểm chứng, không phải kết luận thị trường từ dữ liệu hiện có.

Angle là câu hỏi hoặc góc nhìn xuyên suốt series. Ví dụ: Vì sao một lựa chọn tưởng giúp bạn sống tốt hơn lại khiến bạn có ít lựa chọn hơn?

### So sánh ngách

Người dùng đánh giá từng ngách theo năm tiêu chí: bằng chứng nhu cầu trong mẫu, thành công lặp lại qua nhiều kênh, khoảng trống có thể khác biệt, khả năng sản xuất, khả năng có ít nhất 20 ý tưởng riêng biệt. Mỗi nhận xét có lý do và dữ liệu hỗ trợ. Không tạo điểm nhu cầu chính xác nếu dữ liệu chỉ là mẫu tìm kiếm.

Hiển thị kết luận dưới dạng Có thể thử, Cần bổ sung bằng chứng hoặc Chưa phù hợp nguồn lực. Độ cạnh tranh được mô tả từ mẫu đã quan sát, không giả định nhìn thấy toàn bộ thị trường.

### Người dùng chốt

Khán giả chính; vấn đề trung tâm; angle; lời hứa kênh; ba trụ cột nội dung; điểm khác với kênh tham khảo; giới hạn không làm.

Nút chính: Tạo hồ sơ ngách. Đầu ra: bản tóm tắt một trang và kho video bằng chứng, chuyển sang thiết lập kênh hoặc lập ý tưởng.

## 7. Bước 5 tạo danh sách ý tưởng có bằng chứng

Mỗi ý tưởng có: câu hỏi trung tâm, nỗi đau/ham muốn, nghịch lý, tình huống mở đầu, phát hiện quan trọng, góc khác biệt, video tham khảo, dữ kiện cần tìm, độ khó sản xuất và hướng hình ảnh với Tích.

Ví dụ đề xuất:

- Tăng lương vẫn không có tiền: thu nhập cao hơn nhưng chi phí cố định tăng nhanh hơn khoảng dự phòng.
- Mua xe để thấy thành công: đối chiếu cảm giác sở hữu với những nghĩa vụ mới, không gán con số chưa được kiểm chứng.
- Người bắt đầu muộn: kể về quyết định và cảm giác thua kém; các kết quả tiền bạc phải có giả định rõ nếu dùng mô phỏng.

Không dùng tiêu đề hay cấu trúc độc quyền của nguồn như nội dung của mình. Video nguồn cung cấp bằng chứng về chủ đề và cách đặt vấn đề; ý tưởng mới cần ví dụ, luận điểm và cách kể riêng.

Người dùng chọn một ý tưởng. Nút tiếp: Thiết kế lời hứa và mở đầu.

## 8. Bước 6 thiết kế tiêu đề thumbnail và hook trước script

### Đầu vào

Ý tưởng đã chọn, khán giả, ngôn ngữ, thời lượng, tone và điều người xem cần hiểu khi video kết thúc.

### Đầu ra đề xuất

- Ba cặp tiêu đề và ý tưởng thumbnail; mỗi cặp có một lời hứa rõ.
- Ba mở đầu với cách tiếp cận khác nhau: cảnh đời thường, nghịch lý hoặc tình huống lựa chọn.
- Một câu trả lời cuối video để bảo đảm lời hứa có payoff.

Người dùng chọn một cặp và một hook, hoặc viết phương án riêng. Kiểm tra tính thống nhất giữa tiêu đề, thumbnail, hook và nội dung sẽ kể. Không dùng số tiền, tỷ lệ hoặc lời hứa không được script hỗ trợ.

Ví dụ hook nguyên bản: Ngày được tăng lương, Tích nghĩ cuối cùng mình cũng có thể thở. Ba tháng sau, tài khoản lại về chỗ cũ. Nhưng lần này, Tích không còn sống được bằng mức lương trước đây nữa.

Mốc 30 giây là điểm kiểm tra retention có trong YouTube Analytics; không đặt một ngưỡng phần trăm chung làm bảo đảm thành công. Hook phải trả lời đúng kỳ vọng người xem từ tiêu đề và thumbnail.

## 9. Bước 7 dựng khung câu chuyện

Cho người dùng chọn một cấu trúc phù hợp:

| Cấu trúc | Phù hợp | Cách đi câu chuyện |
|---|---|---|
| Một quyết định và hậu quả | Bẫy tiêu dùng, tâm lý tiền | Tình huống → lựa chọn hợp lý → nghĩa vụ mới → sự cố → cơ chế → lựa chọn khác |
| Hai con đường | So sánh thói quen hoặc quyết định | Cùng xuất phát → lựa chọn khác → hậu quả phân kỳ → giải thích yếu tố tạo khác biệt |
| Điều tra một nghịch lý | Giá cả, doanh nghiệp, kinh tế đời sống | Hiện tượng → giả thuyết ban đầu → bằng chứng → cơ chế ẩn → câu trả lời |
| Các bẫy liên kết | Tổng hợp nhiều lỗi trong một chủ đề | Bẫy đầu → ví dụ và hậu quả → bẫy kế tiếp có liên hệ → nguyên tắc chung |

Khung mỗi đoạn ghi: câu hỏi đang xử lý, thông tin mới, bằng chứng hoặc ví dụ, tình thế thay đổi, cơ hội hình ảnh và lý do đi sang đoạn sau. Không bắt mọi video theo một mẫu duy nhất.

Người dùng sửa thứ tự và duyệt dàn ý trước khi viết dài. Có thể đổi cấu trúc nhưng giữ brief và dữ liệu nguồn.

## 10. Bước 8 viết script và kiểm tra

Viết narration theo dàn ý đã duyệt. Tách phần lời dùng để thu voice khỏi bảng biên tập: đoạn, mục đích, claim, nguồn, visual opportunity và ghi chú sửa.

### Kiểm tra tự động và biên tập

- Lời hứa: kết thúc có trả lời điều tiêu đề/hook hứa không?
- Tiến triển: mỗi đoạn có phát hiện hoặc thay đổi mới không?
- Logic: quan hệ nhân quả có hợp lý hay chỉ là hai sự kiện xảy ra liên tiếp?
- Bằng chứng: số liệu, thời gian, tên và phép tính có nguồn hoặc giả định rõ không?
- Cách kể: có quá nhiều giải thích trước khi người xem có lý do quan tâm không?
- Ngôn ngữ: lời có đọc tự nhiên và phù hợp khán giả không?
- Hình ảnh: có thể thể hiện ý bằng nhân vật, object, data hoặc cutaway không?
- Tính nguyên bản: có sao chép câu chữ hoặc kể lại gần như nguyên video tham khảo không?

Không gọi điểm do AI chấm là xác suất viral hoặc retention dự đoán. Hiển thị vấn đề cụ thể và đề xuất sửa. Người dùng có các thao tác Sửa hook, Rút đoạn này, Thêm ví dụ, Giải thích rõ hơn, Kiểm chứng claim và Duyệt script.

Nguồn chưa đủ: giữ claim trong danh sách cần xác minh, thay câu để tránh khẳng định cụ thể hoặc dùng ví dụ giả định có nhãn. Không tự tạo dữ kiện để lấp chỗ trống.

## 11. Bước 9 bàn giao sang sản xuất

Gói bàn giao gồm brief, hồ sơ ngách, tiêu đề/thumbnail concept đã chọn, narration đã duyệt, nguồn claim, dàn ý, character/style reference và ghi chú hình ảnh. Có version để sửa script sẽ đánh dấu voice và assets liên quan cần cập nhật.

Chuyển sang flow Tích: voice → đo thời lượng → storyboard → chapter prompts → keyframe → clip thử → tạo clip → dựng → duyệt bản cuối.

## 12. Bước 10 học từ video đã đăng

Nhận CTR theo nguồn traffic, impressions, retention 30 giây, average view duration, average percentage viewed, các điểm tụt/spike và phản hồi bình luận nếu có quyền truy cập. Không suy ra retention hoặc CTR của kênh đối thủ từ dữ liệu công khai.

So video của mình với video cùng định dạng và độ dài tương đối gần; ghi bối cảnh traffic. CTR thấp chỉ gợi ý kiểm tra đóng gói và khán giả được phân phối, không chứng minh tiêu đề sai. Tụt đầu video gợi ý kiểm tra lời hứa, intro và tốc độ vào nội dung. Tụt giữa video gợi ý xem đoạn giải thích, sự lặp lại hoặc chuyển ý. Spike có thể là hấp dẫn hoặc khó hiểu cần xem lại.

Người dùng chọn bài học áp dụng cho video sau. Chỉ thay đổi một vài yếu tố có chủ đích để dễ hiểu kết quả; không kết luận ngách thất bại chỉ sau một video.

## 13. Các trạng thái và xử lý lỗi

- Nháp, Đang lấy dữ liệu, Đang phân tích, Cần người dùng chọn, Hoàn tất, Thất bại hoặc Dữ liệu cũ.
- Không có kết quả: gợi ý mở rộng từ khóa/thời gian, không tự tạo kênh hoặc view.
- Quota hết: giữ kết quả đã có, hiển thị phần chưa lấy và cho tiếp tục sau.
- Transcript không có: cho nhập transcript hoặc chọn video khác; không kết luận cấu trúc script từ tiêu đề.
- Link sai hoặc không truy cập được: đánh dấu rõ và cho sửa; không khẳng định đã xem.
- Chạy lại: dùng cache và khóa theo job để tránh trùng; hiển thị thời điểm dữ liệu.
- Chỉnh nhóm: tính lại chỉ số từ dữ liệu đã có, không cần gọi API lại.
- Đổi thị trường/định dạng: tạo phiên khảo sát mới hoặc yêu cầu tính lại phần phụ thuộc.

## 14. Mốc xây dựng sản phẩm

MVP đầu tiên: nhập dữ liệu khảo sát bằng CSV hoặc thủ công, có bảng bằng chứng, sửa nhóm, chọn ngách, tạo brief và trình soạn dàn ý/script. Các tính toán hoạt động trên dữ liệu thật được nhập; dữ liệu mẫu nếu dùng phải gắn nhãn minh họa.

Mốc tiếp: kết nối YouTube để thu dữ liệu công khai, cache và xử lý quota; thêm phân tích có AI với nguồn và kết quả người dùng sửa được. Việc chọn API, xác thực và chi phí cần chốt khi triển khai, không giả định từ giao diện tham khảo.

Mốc cuối: nối hệ thống sản xuất Tích và analytics của kênh được cấp quyền. Nghiệm thu bằng một phiên đi xuyên suốt: từ nguồn video thật đến ngách có bằng chứng, brief, dàn ý, script duyệt và gói sản xuất.

## 15. Tài liệu tham chiếu

- Tám ảnh giao diện RX Studio do người dùng cung cấp.
- Script làm video.docx và TICH_Finance_Animation_Engine_v2.0_VI.md do người dùng cung cấp.
- Hướng dẫn retention của YouTube: https://support.google.com/youtube/answer/9314415?hl=en
- Link video tham khảo do người dùng cung cấp chưa truy xuất được: https://www.youtube.com/watch?v=Agmqa63o28svv
