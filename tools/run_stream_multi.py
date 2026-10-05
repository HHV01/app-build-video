"""Multi-instance Headless Runner for YouTube Smart Streamer.

Runs multiple independent headless Chrome browser instances in parallel.
Each instance has:
- Isolated Chrome User Profile (cookies, cache, session IDs are separated)
- Distinct User-Agent
- Staggered launch times (to avoid simultaneous requests)
- Real-time consolidated dashboard reporting
"""

import sys
import os
import time
import shutil
import argparse
import threading
import ctypes
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Prevent Windows from sleeping/suspending background tasks when screen is locked or idle
def keep_windows_awake():
    try:
        ES_CONTINUOUS = 0x80000000
        ES_SYSTEM_REQUIRED = 0x00000001
        ES_AWAYMODE_REQUIRED = 0x00000040
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED)
    except Exception:
        pass

keep_windows_awake()

# Force UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

import socket
import select
import subprocess

WIFI_PROXY_PORT = 19888
wifi_proxy_active = False

def get_wifi_ip():
    try:
        out = subprocess.check_output(['netsh', 'interface', 'ip', 'show', 'addresses', 'Wi-Fi'], text=True, errors='ignore')
        for line in out.splitlines():
            if 'ip' in line.lower() and ':' in line:
                val = line.split(':', 1)[1].strip()
                if val.count('.') == 3 and not val.startswith('127.'):
                    return val
    except Exception:
        pass
    return None

def start_wifi_proxy(wifi_ip):
    global wifi_proxy_active
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind(('127.0.0.1', WIFI_PROXY_PORT))
        server.listen(100)
    except Exception as e:
        print(f"Lỗi proxy Wi-Fi: {e}", flush=True)
        return False

    def handle_client(client_sock):
        try:
            req = b''
            while b'\r\n\r\n' not in req:
                chunk = client_sock.recv(4096)
                if not chunk:
                    break
                req += chunk
            
            first_line = req.split(b'\r\n')[0].decode('utf-8', errors='ignore')
            parts = first_line.split(' ')
            if len(parts) >= 2 and parts[0].upper() == 'CONNECT':
                host, port = parts[1].split(':')
                remote_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                remote_sock.bind((wifi_ip, 0))
                remote_sock.connect((host, int(port)))
                client_sock.sendall(b'HTTP/1.1 200 Connection Established\r\n\r\n')
                
                sockets = [client_sock, remote_sock]
                while True:
                    r, _, _ = select.select(sockets, [], [], 30)
                    if not r:
                        break
                    if client_sock in r:
                        data = client_sock.recv(16384)
                        if not data:
                            break
                        remote_sock.sendall(data)
                    if remote_sock in r:
                        data = remote_sock.recv(16384)
                        if not data:
                            break
                        client_sock.sendall(data)
                remote_sock.close()
        except Exception:
            pass
        finally:
            try:
                client_sock.close()
            except Exception:
                pass

    def serve():
        while True:
            try:
                s, _ = server.accept()
                threading.Thread(target=handle_client, args=(s,), daemon=True).start()
            except Exception:
                break

    threading.Thread(target=serve, daemon=True).start()
    wifi_proxy_active = True
    return True

ROOT_DIR = Path(__file__).resolve().parents[1]
STREAM_URL = "http://localhost:5500/youtube_stream_tool.html"
PROFILES_BASE = ROOT_DIR / "tmp" / "chrome_profiles"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0"
]

class StreamWorker(threading.Thread):
    def __init__(self, worker_id, stagger_delay=0):
        super().__init__(daemon=True)
        self.worker_id = worker_id
        self.stagger_delay = stagger_delay
        self.profile_dir = PROFILES_BASE / f"worker_{worker_id}"
        self.profile_dir.mkdir(parents=True, exist_ok=True)
        self.driver = None
        self.is_alive = True
        self.status = "Đang khởi tạo"
        self.title = "N/A"
        self.currentTime = "0:00"
        self.durationTime = "0:00"
        self.mainRuns = 0
        self.bufferRuns = 0
        self.totalTime = "00:00:00"

    def init_driver(self):
        opts = Options()
        opts.add_argument("--headless=new")
        opts.add_argument("--mute-audio")
        opts.add_argument("--disable-gpu")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--autoplay-policy=no-user-gesture-required")
        opts.add_argument("--window-size=1024,768")
        opts.add_argument("--disable-background-timer-throttling")
        opts.add_argument("--disable-backgrounding-occluded-windows")
        opts.add_argument("--disable-renderer-backgrounding")
        opts.add_argument("--disable-features=CalculateNativeWinOcclusion")

        # Stealth anti-bot measures
        opts.add_argument("--disable-blink-features=AutomationControlled")
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        opts.add_experimental_option("useAutomationExtension", False)

        # Diverse window sizes to look like different physical screens
        screen_resolutions = [
            "1366,768",
            "1440,900",
            "1280,800",
            "1536,864",
            "1280,720"
        ]
        res = screen_resolutions[self.worker_id % len(screen_resolutions)]
        opts.add_argument(f"--window-size={res}")

        if wifi_proxy_active:
            opts.add_argument(f"--proxy-server=http://127.0.0.1:{WIFI_PROXY_PORT}")
            opts.add_argument("--proxy-bypass-list=<-loopback>;localhost;127.0.0.1")

        opts.add_argument(f"--user-data-dir={self.profile_dir}")

        ua = USER_AGENTS[self.worker_id % len(USER_AGENTS)]
        opts.add_argument(f"user-agent={ua}")

        self.driver = webdriver.Chrome(options=opts)

        # Overwrite navigator.webdriver and languages to mask automation
        try:
            self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
                "source": """
                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                    Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
                    window.chrome = { runtime: {} };
                """
            })
        except Exception:
            pass

    def run(self):
        try:
            if self.stagger_delay > 0:
                self.status = f"Chờ lệch pha {self.stagger_delay}s"
                time.sleep(self.stagger_delay)

            self.status = "Đang mở trình duyệt"
            self.init_driver()
            self.driver.get(STREAM_URL)
            time.sleep(5)

            # Auto trigger stream
            self.driver.execute_script("""
                if (typeof toggleStream === 'function' && !isRunning) {
                    toggleStream();
                }
            """)

            while self.is_alive:
                time.sleep(5)
                try:
                    state = self.driver.execute_script("""
                        return {
                            status: document.getElementById('statusText') ? document.getElementById('statusText').innerText : 'N/A',
                            title: document.getElementById('displayTitle') ? document.getElementById('displayTitle').innerText : 'N/A',
                            currentTime: document.getElementById('currentTime') ? document.getElementById('currentTime').innerText : '0:00',
                            durationTime: document.getElementById('durationTime') ? document.getElementById('durationTime').innerText : '0:00',
                            mainRuns: document.getElementById('statMainRuns') ? parseInt(document.getElementById('statMainRuns').innerText) || 0 : 0,
                            bufferRuns: document.getElementById('statBufferRuns') ? parseInt(document.getElementById('statBufferRuns').innerText) || 0 : 0,
                            totalTime: document.getElementById('statTotalTime') ? document.getElementById('statTotalTime').innerText : '00:00:00',
                            isRunning: typeof isRunning !== 'undefined' ? isRunning : false
                        };
                    """)

                    self.status = state.get("status", "N/A")
                    self.title = state.get("title", "N/A")
                    self.currentTime = state.get("currentTime", "0:00")
                    self.durationTime = state.get("durationTime", "0:00")
                    self.mainRuns = state.get("mainRuns", 0)
                    self.bufferRuns = state.get("bufferRuns", 0)
                    self.totalTime = state.get("totalTime", "00:00:00")

                    if not state.get("isRunning"):
                        self.driver.execute_script("""
                            if (typeof toggleStream === 'function' && !isRunning) {
                                toggleStream();
                            }
                        """)

                except Exception as loop_e:
                    self.status = f"Lỗi đọc: {str(loop_e)[:30]}"

        except Exception as e:
            self.status = f"Lỗi luồng: {str(e)[:40]}"
        finally:
            self.close()

    def close(self):
        self.is_alive = False
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None

def main():
    parser = argparse.ArgumentParser(description="Multi-instance YouTube Streamer")
    parser.add_argument("--instances", "-n", type=int, default=4, help="Number of concurrent instances (default: 4)")
    args = parser.parse_args()

    num_instances = max(1, min(args.instances, 10))
    print("=" * 75, flush=True)
    print(f"🚀 KHỞI ĐỘNG HỆ THỐNG CÀY VIEW ĐA LUỒNG ({num_instances} INSTANCES)", flush=True)
    print(f"🔗 Máy chủ: {STREAM_URL}", flush=True)

    wifi_ip = get_wifi_ip()
    if wifi_ip:
        if start_wifi_proxy(wifi_ip):
            print(f"🌐 ĐÃ TỰ ĐỘNG ÉP LUỒNG SANG WI-FI: {wifi_ip}", flush=True)
            print("✓ Toàn bộ traffic xem video YouTube sẽ đi qua IP Wi-Fi mới (180.148.4.43) mà không cần rút cáp LAN!", flush=True)
        else:
            print("⚠️ Không thể bật proxy Wi-Fi, dùng mạng mặc định.", flush=True)
    else:
        print("⚠️ Không tìm thấy Wi-Fi, dùng mạng mặc định.", flush=True)

    print("✓ Mỗi luồng chạy hồ sơ Chrome riêng biệt, User-Agent độc lập, lệch pha thời gian.", flush=True)
    print("=" * 75, flush=True)

    workers = []
    for i in range(num_instances):
        delay = i * 20 # 20s delay between launches
        worker = StreamWorker(worker_id=i+1, stagger_delay=delay)
        worker.start()
        workers.append(worker)

    try:
        while True:
            time.sleep(12)
            total_main = sum(w.mainRuns for w in workers)
            total_buffer = sum(w.bufferRuns for w in workers)
            active_count = sum(1 for w in workers if w.is_alive)

            print("\n" + "-" * 75, flush=True)
            print(f"📊 BÁO CÁO TỔNG QUAN: [Đang chạy: {active_count}/{num_instances} luồng] | "
                  f"🔥 Tổng view video chính: {total_main} | 🎶 View đệm: {total_buffer}", flush=True)
            print("-" * 75, flush=True)

            for w in workers:
                short_title = (w.title[:30] + '..') if len(w.title) > 30 else w.title
                print(f"  [Luồng #{w.worker_id}] [{w.totalTime}] {w.status} | {short_title} ({w.currentTime}/{w.durationTime}) | Chính: {w.mainRuns} | Đệm: {w.bufferRuns}", flush=True)

    except KeyboardInterrupt:
        print("\n🛑 Nhận lệnh dừng hệ thống...", flush=True)
    finally:
        print("Đang đóng các luồng an toàn...", flush=True)
        for w in workers:
            w.close()
        print("✓ Đã dừng toàn bộ các luồng.", flush=True)

if __name__ == '__main__':
    main()
