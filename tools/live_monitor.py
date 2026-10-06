"""Real-time console dashboard for YouTube multi-browser streaming."""
import sys
import os
import time
import json
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
os.system('color') # Enable ANSI colors

ROOT_DIR = Path(__file__).resolve().parents[1]
STATUS_FILE = ROOT_DIR / "status.json"
PLAYLIST_FILE = ROOT_DIR / "playlist.json"

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def main():
    while True:
        playlist_data = {}
        if PLAYLIST_FILE.exists():
            try:
                with open(PLAYLIST_FILE, "r", encoding="utf-8") as f:
                    playlist_data = json.load(f)
            except Exception:
                pass

        status_data = {}
        if STATUS_FILE.exists():
            try:
                with open(STATUS_FILE, "r", encoding="utf-8") as f:
                    status_data = json.load(f)
            except Exception:
                pass

        clear_screen()
        print("\033[96m" + "=" * 80 + "\033[0m")
        print("\033[92m  🎬 BẢNG ĐIỀU KHIỂN & THEO DÕI CÀY VIEW YOUTUBE ĐA TRÌNH DUYỆT (6 BROWSERS)\033[0m")
        print("\033[96m" + "=" * 80 + "\033[0m")

        # Network Status
        wifi = status_data.get("wifi", "Đang cập nhật...")
        ip = status_data.get("ip", "...")
        cd = status_data.get("countdown", "--:--")
        print(f"  🌐 \033[93mWi-Fi Hiện Tại:\033[0m \033[97;1m{wifi}\033[0m  |  \033[93mĐịa Chỉ Public IP:\033[0m \033[92m{ip}\033[0m")
        print(f"  ⏳ \033[93mĐồng Hồ Tự Động Xoay Wi-Fi (Đổi IP):\033[0m \033[91;1m{cd}\033[0m (Chu kỳ 30 phút/lần)")
        print("\033[90m" + "-" * 80 + "\033[0m")

        # Playlist Info
        print("  \033[95m📋 DANH SÁCH PHÁT ĐANG CHẠY (PLAYLIST):\033[0m")
        cvs = playlist_data.get("channel_videos", [])
        for i, v in enumerate(cvs, 1):
            print(f"     \033[92m{i}. [Video Kênh]\033[0m {v.get('title')} ({v.get('duration')}) -> \033[94m{v.get('url')}\033[0m")
        bvs = playlist_data.get("buffer_videos", [])
        for i, v in enumerate(bvs, len(cvs) + 1):
            print(f"     \033[93m{i}. [Video Đệm]\033[0m {v.get('title')} (xem {v.get('limit_seconds')}s) -> \033[94m{v.get('url')}\033[0m")
        print(f"     \033[97m🔄 Flow:\033[0m \033[96m{playlist_data.get('flow_description', '1 -> 2 -> đệm 10s -> 1 -> 2 -> đệm 30s')}\033[0m")
        print("\033[90m" + "-" * 80 + "\033[0m")

        # Workers Status
        workers = status_data.get("workers", [])
        print("  \033[97;1m🖥️ TIẾN ĐỘ 6 TRÌNH DUYỆT TRÊN DESKTOP 2:\033[0m")
        if workers:
            for w in workers:
                short_title = (w.get("title", "")[:26] + '..') if len(w.get("title", "")) > 26 else w.get("title", "")
                st = w.get("status", "")
                st_color = "\033[92m" if "phát" in st.lower() else "\033[93m"
                print(f"   [Cửa sổ #{w.get('id')} - \033[97;1m{w.get('name'):<15}\033[0m] {st_color}{st:<18}\033[0m | \033[96m{short_title:<28}\033[0m ({w.get('time')}) | Chính: \033[92m{w.get('main')}\033[0m | Đệm: \033[93m{w.get('buffer')}\033[0m")
        else:
            print("   \033[93mĐang khởi tạo các trình duyệt...\033[0m")

        print("\033[96m" + "=" * 80 + "\033[0m")
        print("  \033[90mBảng điều khiển tự động làm mới mỗi giây. Nhấn Ctrl+C để thoát theo dõi.\033[0m\n")
        time.sleep(1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
