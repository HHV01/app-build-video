# Danh sách file chờ duyệt sau khi dọn profile

Cập nhật ngày 06/10/2026 theo yêu cầu của người dùng. Đã dừng worker liên quan, đổi tên hai thư mục thành .cu, chạy npm run studio:test (109/109 đạt), kiểm tra app rồi xoá hai thư mục profile. Dữ liệu Studio giữ nguyên.

## Đã xoá theo yêu cầu

| Thư mục | File | Byte |
| --- | ---: | ---: |
| `tmp/gui_chrome_profiles` | 18315 | 5336710795 |
| `tmp/chrome_profiles` | 3460 | 1174435448 |

Tổng dung lượng file đã xoá: 6.511.146.243 byte (khoảng 6,51 GB thập phân). Script chạy worker vẫn còn và có thể tạo lại profile mới khi chạy tiếp.

## tmp/ · phần còn lại, giữ nguyên

Không liệt kê từng file thư viện/cache để bản kiểm kê dễ đọc. Giữ tmp/pdfs, tmp/shorts-deps, tmp/shorts-build và các script *.mjs; không xoá .studio-data/tmp. tmp/ đã có trong .gitignore.

| Nhóm | File | Byte |
| --- | ---: | ---: |
| `tmp/* (file trực tiếp)` | 19 | 55879 |
| `tmp/pdfs/` | 7 | 2358152 |
| `tmp/shorts-build/` | 13 | 44909951 |
| `tmp/shorts-deps/` | 2129 | 109329140 |

## tools/*.png · giữ nguyên

| File | Byte |
| --- | ---: |
| `tools/clean_brave.png` | 190612 |
| `tools/clean_coccoc.png` | 805139 |
| `tools/clean_edge.png` | 293159 |
| `tools/crop_header.png` | 95697 |
| `tools/crop_player_full.png` | 211521 |
| `tools/crop_speaker.png` | 13976 |
| `tools/final_brave_1904622.png` | 187369 |
| `tools/final_chrome_12978730.png` | 244618 |
| `tools/final_chrome_4524950.png` | 272870 |
| `tools/final_coccoc_5049144.png` | 777342 |
| `tools/final_edge_1510428.png` | 305559 |
| `tools/final_opera_3342396.png` | 452799 |
| `tools/full_virtual_screen.png` | 554155 |
| `tools/opera_after_reload_btn.png` | 449315 |
| `tools/opera_check2.png` | 194917 |
| `tools/opera_current_now.png` | 209136 |
| `tools/opera_nav_bar.png` | 4217 |
| `tools/opera_now.png` | 214639 |
| `tools/opera_reloaded_final.png` | 340347 |
| `tools/opera_reloaded_success.png` | 196599 |
| `tools/opera_reloaded.png` | 214188 |
| `tools/opera_speaker_after_click.png` | 811 |
| `tools/opera_top_icons.png` | 4390 |
| `tools/opera_unmuted_final.png` | 230668 |
| `tools/opera_unmuted.png` | 457688 |
| `tools/opera_video_controls.png` | 200214 |
| `tools/overnight_edge.png` | 270 |
| `tools/screen_now.png` | 373912 |
| `tools/screen_preview.png` | 332778 |
| `tools/stat_1_opera_29264.png` | 9113 |
| `tools/stat_2_opera_29264.png` | 324992 |
| `tools/stat_3_coccoc_10924.png` | 310203 |
| `tools/stat_4_brave_15956.png` | 315251 |
| `tools/stat_5_edge_39776.png` | 294967 |
| `tools/stat_6_chrome_20008.png` | 309066 |
| `tools/stat_7_chrome_20008.png` | 239543 |
| `tools/tab_1_Edge.png` | 508270 |
| `tools/tab_2_Opera.png` | 549854 |
| `tools/tab_3_CocCoc.png` | 663773 |
| `tools/tab_4_Brave.png` | 396389 |
| `tools/tab_5_Google_Chrome.png` | 439423 |
| `tools/tab_6_Google_Chrome.png` | 549598 |
| `tools/v_1_Opera.png` | 354723 |
| `tools/v_2_Brave.png` | 343434 |
| `tools/v_3_E.png` | 350729 |
| `tools/v_4_CocCoc.png` | 792943 |
| `tools/v_5_Chrome1.png` | 545021 |
| `tools/v_6_Chrome2.png` | 531606 |

## scratch/ · giữ nguyên

| File | Byte |
| --- | ---: |
| `scratch/check_browsers.py` | 837 |
| `scratch/check_omniroute_db.py` | 843 |
| `scratch/check_pids.py` | 1629 |
| `scratch/child_test.py` | 1112 |
| `scratch/clean_front.py` | 3539 |
| `scratch/cleanup_workers.py` | 560 |
| `scratch/current_desktop_view.png` | 974866 |
| `scratch/find_groq_key.py` | 999 |
| `scratch/find_windows.py` | 1422 |
| `scratch/inspect_chrome.py` | 1889 |
| `scratch/kill_workers.ps1` | 652 |
| `scratch/launcher_test.py` | 2149 |
| `scratch/move_workers_to_d2.py` | 3642 |
| `scratch/test_4_browsers.py` | 2267 |
| `scratch/test_all_models.py` | 1588 |
| `scratch/test_chrome_launched_visible.png` | 614203 |
| `scratch/test_chrome_vis.py` | 1303 |
| `scratch/test_chrome_visible.png` | 615614 |
| `scratch/test_desktop.py` | 900 |
| `scratch/test_direct_yt.py` | 1133 |
| `scratch/test_enum_desktops.py` | 4312 |
| `scratch/test_firefox.py` | 1271 |
| `scratch/test_go_d2.py` | 548 |
| `scratch/test_groq_auth.py` | 911 |
| `scratch/test_groq_direct.py` | 1657 |
| `scratch/test_hwnd_move.py` | 1084 |
| `scratch/test_move_chrome.py` | 1801 |
| `scratch/test_move_d2.py` | 552 |
| `scratch/test_pipe_desktop.py` | 2764 |
| `scratch/test_screen.png` | 459776 |
| `scratch/test_selenium_default.py` | 1689 |
| `scratch/test_self_relaunch.py` | 2247 |
| `scratch/test_spawn_default.py` | 847 |
| `scratch/test_spawn_default2.py` | 1917 |
| `scratch/test_spawn_worker.py` | 3079 |
| `scratch/test_vdm.py` | 2028 |

## docs/ocr/ · giữ nguyên

| File | Byte |
| --- | ---: |
| `docs/ocr/_index.txt` | 2015 |
| `docs/ocr/01_14e18580-21b7-4270-99fc-d0b78a024fc6.txt` | 1094 |
| `docs/ocr/02_1b832dc9-fbdf-4647-8046-272d7ff67cb6.txt` | 1261 |
| `docs/ocr/03_1e8339b6-070d-48b7-9da9-5c1368dc80ab.txt` | 1579 |
| `docs/ocr/04_2b685897-6e5b-4b53-b452-193bba666de6.txt` | 1256 |
| `docs/ocr/05_2c6c0d5e-cf7d-4c20-934f-e492d06f0516.txt` | 1479 |
| `docs/ocr/06_3207c1df-547b-4c05-b8b7-c1fa2000d41e.txt` | 654 |
| `docs/ocr/07_3944af60-9128-4db8-bc10-6106a3ed8d6c.txt` | 1728 |
| `docs/ocr/08_48c13d76-7372-4886-819c-9befbdc34e77.txt` | 936 |
| `docs/ocr/09_4d3c6c92-4368-4ac7-8f3d-0bd4d9e81a1f.txt` | 1402 |
| `docs/ocr/10_52e6acf0-4d86-4a33-80b6-23b8bb97dee9.txt` | 2087 |
| `docs/ocr/11_5360e0da-c8c8-420e-b0e9-016e603f9659.txt` | 1984 |
| `docs/ocr/12_55840bed-59e1-4db7-bb2b-3f3bf3ad3991.txt` | 1670 |
| `docs/ocr/13_621603fd-a868-4ec4-96f6-b03be1762b4e.txt` | 1534 |
| `docs/ocr/14_6a46814a-7082-4252-ad72-4bcfe0a6c7d9.txt` | 1335 |
| `docs/ocr/15_7d82d0b7-ce23-4443-ac57-7cdfa8477560.txt` | 1717 |
| `docs/ocr/16_892c0f52-704f-4bc9-8d0e-2bc569826892.txt` | 1148 |
| `docs/ocr/17_8e64777b-2011-4453-8aa5-5ae725a89bed.txt` | 1187 |
| `docs/ocr/18_8ea31e6d-fa68-4f0a-93ce-f9233763f588.txt` | 4068 |
| `docs/ocr/19_9a11ec3d-4243-4a18-ae1a-a44312985595.txt` | 1309 |
| `docs/ocr/20_9a1a40b5-e0b4-479d-95de-dd197d9a5352.txt` | 640 |
| `docs/ocr/21_a1128d48-665e-44f8-a447-51c20386d8d5.txt` | 1269 |
| `docs/ocr/22_a42b4bcf-c749-4b23-b5d1-6d35fae14ee4.txt` | 3011 |
| `docs/ocr/23_b025324c-f132-414b-93d1-1e4e16157c2d.txt` | 1295 |
| `docs/ocr/24_b51ca2bc-8046-458f-8b09-82c8625bfcec.txt` | 640 |
| `docs/ocr/25_b8f80ca9-d411-4acd-a3d3-60d829baa8d8.txt` | 547 |
| `docs/ocr/26_bbc4fed4-0d1c-46fa-8921-ce316ff3a3c6.txt` | 1013 |
| `docs/ocr/27_c539b161-a430-4f3c-a357-208aad0aeaf8.txt` | 1588 |
| `docs/ocr/28_c61f0a6c-561c-490c-bc63-41af57743512.txt` | 2331 |
| `docs/ocr/29_cb156d36-8862-4206-8697-e487cf36be85.txt` | 1163 |
| `docs/ocr/30_cef35c1d-1be3-49b4-a9fb-794b9f943864.txt` | 877 |
| `docs/ocr/31_cf0e9890-9cf0-4f00-b54b-c8e1d27e6467.txt` | 1102 |
| `docs/ocr/32_f2b3856b-6747-423e-8cba-feb5b101d461.txt` | 640 |

