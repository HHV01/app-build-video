# 🚀 Hướng Dẫn Tích Hợp OmniRoute — Nguồn Token AI Miễn Phí Cho Video Production

Tài liệu hướng dẫn sử dụng **OmniRoute** ([github.com/diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute)) làm AI Gateway trung gian, cung cấp nguồn token AI miễn phí và tự động cân bằng tải (auto-fallback) cho toàn bộ tác vụ sinh prompt, kịch bản video, kịch bản phân cảnh trong repo `Video`.

---

## 💡 1. OmniRoute Là Gì & Lợi Ích Trong Repo Video?

- **AI Gateway cục bộ**: Chạy dưới dạng proxy server tại `http://localhost:20128/v1`, tương thích hoàn toàn chuẩn OpenAI API, Anthropic API, Gemini API.
- **Kho token miễn phí khổng lồ (~1.62B tokens/tháng)**: Tích hợp sẵn danh mục hơn **150+ nhà cung cấp có gói Free** (OpenCode Free, Groq, Mistral, Kimi, DeepSeek, Cerebras, Sambanova, HuggingFace, Github Models...).
- **Cơ chế Auto-Fallback (Tự động chuyển đổi dự phòng)**: Khi một provider hết quota hoặc bị giới hạn tốc độ (rate-limit), router tự động chuyển sang provider tiếp theo mà không làm gián đoạn việc sinh kịch bản hay prompt.
- **Ứng dụng thực tế trong repo này**:
  - Tự động sinh kịch bản phân cảnh video (như [milo-production-script-by-scene.md](file:///c:/Users/VNTT/Desktop/Video/milo-production-script-by-scene.md)).
  - Sinh prompt hình ảnh chi tiết cho từng cảnh (như [milo-scene-image-prompts.md](file:///c:/Users/VNTT/Desktop/Video/milo-scene-image-prompts.md)).
  - Sinh lời thoại và voiceover (như [milo-voiceover-by-scene.md](file:///c:/Users/VNTT/Desktop/Video/milo-voiceover-by-scene.md)).
  - Sinh kho bình luận tương tác seeding cho YouTube (như [kho_binh_luan.html](file:///c:/Users/VNTT/Desktop/Video/kho_binh_luan.html)).

---

## 🛠️ 2. Các Lệnh Đã Được Tích Hợp Vào Repo

Trong thư mục dự án `Video`, bạn có thể dùng các lệnh sau:

| Lệnh | Ý nghĩa |
| :--- | :--- |
| `npm run omniroute` | Khởi động máy chủ OmniRoute cục bộ tại cổng `20128` |
| `npm run omniroute:dashboard` | Mở giao diện Dashboard trên trình duyệt (`http://localhost:20128/dashboard`) |
| `npm run omniroute:test` | Kiểm tra kết nối và token phản hồi qua Node.js |
| `npm run omniroute:test:py` | Kiểm tra kết nối và token phản hồi qua Python |
| `npm run omniroute:status` | Kiểm tra trạng thái các providers và quota |
| **Double click `start_omniroute.bat`** | Bật OmniRoute server nhanh bằng 1 click trên Windows |

---

## ⚙️ 3. Cấu Hình Token Trong File `.env`

File `.env` trong repo đã được cấu hình sẵn:

```env
# 1. Trỏ endpoint về máy chủ OmniRoute cục bộ
OPENAI_BASE_URL="http://localhost:20128/v1"

# 2. Chọn chiến lược model ('auto' sẽ tự động chọn provider tốt nhất)
OPENAI_MODEL="auto"

# 3. Khi dùng OmniRoute free pool, API key chỉ cần điền chuỗi bất kỳ
OPENAI_API_KEY="omniroute"
```

### Các biến thể model thông minh của OmniRoute:
- `auto`: Cân bằng chất lượng và tốc độ (mặc định).
- `auto/coding`: Ưu tiên các model code tốt nhất (Kimi K3, DeepSeek Coder, Claude...).
- `auto/fast`: Ưu tiên model có độ trễ thấp nhất (Groq, Cerebras...).
- `auto/cheap`: Ưu tiên model tốn ít chi phí / 0 đồng.
- Hoặc chỉ định trực tiếp model cụ thể: `gemini-2.0-flash`, `gpt-4o-mini`, `deepseek-chat`, v.v.

---

## 🚀 4. Quy Trình Sử Dụng Chuẩn

### Bước 1: Khởi động OmniRoute
Chạy file [start_omniroute.bat](file:///c:/Users/VNTT/Desktop/Video/start_omniroute.bat) hoặc mở terminal gõ:
```bash
npm run omniroute
```

### Bước 2: Kiểm tra kết nối
Mở terminal khác và chạy:
```bash
npm run omniroute:test:py
# hoặc
npm run omniroute:test
```

### Bước 3: Xem Dashboard trực quan
Gõ lệnh:
```bash
npm run omniroute:dashboard
```
Trình duyệt sẽ mở `http://localhost:20128/dashboard` hiển thị biểu đồ request, danh sách providers hoạt động và số token đã tiết kiệm được.
