# Repo cleanup — 2026-10-12

Đã duyệt và thực hiện: không xóa file khỏi ổ đĩa, không viết lại lịch sử Git.

| Nhóm | Trước | Thực hiện |
|---|---:|---|
| Ảnh tracked | 107 / 104,54 MiB | Bỏ theo dõi 96, giữ 11 trong studio/screenshots/ |
| tools/ ảnh | 48 / 14,93 MiB | Bỏ theo dõi + ignore; file local giữ nguyên |
| scratch/ | 36 / 2,59 MiB | Bỏ theo dõi + ignore |
| tmp/ | 14.761 / 2.817,51 MiB | Bỏ theo dõi file tracked + giữ ignore tmp/ |
| docs/ocr/ | 33 / 0,05 MiB | Giữ nguyên |
| Tài liệu gốc | 12 | Chuyển docs/legacy/ |
| Launcher phụ | 6 | Chuyển scripts/windows/, làm việc từ gốc repo |
| start_studio.bat | 1 | Giữ nguyên ở gốc |
| HTML gốc | 2 | Giữ kho_binh_luan.html, youtube_stream_tool.html |

## 11 ảnh giữ lại

- studio/screenshots/angle-after-analysis.jpg
- studio/screenshots/b8-shelf.jpg
- studio/screenshots/b8-template.jpg
- studio/screenshots/k45-scenes-qa.png
- studio/screenshots/model-fallback.jpg
- studio/screenshots/niche-ux-review.jpg
- studio/screenshots/script-improvements-qa.png
- studio/screenshots/script-only-review.png
- studio/screenshots/studio-actions-restored.jpg
- studio/screenshots/tich-plan-qa.png
- studio/screenshots/title-dna-qa.png

## Tài liệu đã chuyển

- docs/legacy/Flow_RX_Studio_UI_that.md
- docs/legacy/Flow_he_thong_Tich_Finance.md
- docs/legacy/Flow_tim_ngach_va_xay_kich_ban.md
- docs/legacy/Flow_ung_dung_chi_tiet.md
- docs/legacy/Flow_video_YouTube_map.md
- docs/legacy/Prompt_Tai_Chinh_Hoc_Sinh_Hoan_Chinh.txt
- docs/legacy/Prompt_hoat_hinh_tai_chinh_Nhan_vat_hoc_sinh.txt
- docs/legacy/Prompt_hoat_hinh_tai_chinh_Tieng_Viet.txt
- docs/legacy/Prompt_nhan_vat_hoc_sinh.txt
- docs/legacy/milo-production-script-by-scene.md
- docs/legacy/milo-scene-image-prompts.md
- docs/legacy/milo-voiceover-by-scene.md

## Launcher đã chuyển

- scripts/windows/Bat_Lai_Mang_Day.bat
- scripts/windows/Chay_Cai_View_Man_Hinh_2.bat
- scripts/windows/Chay_Cay_View_Wifi_Moi.bat
- scripts/windows/Tat_Mang_Day.bat
- scripts/windows/Theo_Doi_Tien_Do.bat
- scripts/windows/start_omniroute.bat

## Nguồn dung lượng tmp/

- gui_chrome_profiles: 2.664,62 MiB — profile/cache trình duyệt.
- shorts-deps: 104,26 MiB — thư viện build.
- shorts-build: 42,83 MiB — đầu ra dựng trung gian.
- pdfs: 2,25 MiB — giữ công cụ/tài liệu PDF.
- Test Studio server có rm thư mục riêng trong stop(); không tạo profile trình duyệt.
- Không xóa tay dữ liệu hoặc sửa test Studio trong commit dọn.

Bản liệt kê đầy đủ giữ local tại docs/REPO_CLEANUP_REVIEW_20261012.full.local.md, đã ignore.
CI .github/workflows/studio-test.yml và nội dung studio/ giữ nguyên trong commit này.
