"""GUI Browser Streamer (Anti-Bot Visible Windows on Desktop 2) with Auto Wi-Fi IP Rotator.

Features:
- 100% REAL GUI windows (no headless bot signature)
- Opens directly on current interactive desktop (Desktop 2)
- Clean profile isolation with stale lock remover (no 'window already closed' error)
- Tiles 4 windows 2x2 cleanly across Desktop 2
- Masks navigator.webdriver and automation flags
- Smart proxy fallback: tests Wi-Fi proxy health, falls back to direct connection so YouTube never breaks
- Brings windows to foreground on Desktop 2 and ensures video playback
- Anti-occlusion flags so playback continues when PC is locked
- AUTO WI-FI IP ROTATOR: Tự động đổi luân phiên giữa các mạng Wi-Fi (MinhLaConMeoDay <-> VNTT-RD)
  sau mỗi 25 phút để xoay IP liên tục, bảo đảm không bao giờ bị trùng IP!
- SELF-HEALING: Tự phục hồi luồng nếu mạng đổi hoặc trình duyệt bị ngắt kết nối
"""

import sys
import os
import time
import json
import socket
import select
import shutil
import subprocess
import threading
import ctypes
from ctypes import wintypes
from pathlib import Path
import urllib.request

# Enforce UTF-8 immediately
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# --- Ensure execution on User's Interactive Desktop (WinSta0\Default) ---
def ensure_interactive_desktop():
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    curr_desk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
    desk_buf = ctypes.create_unicode_buffer(256)
    user32.GetUserObjectInformationW(curr_desk, 2, desk_buf, 256, None)
    curr_name = desk_buf.value

    if curr_name == "Default" or "--child-worker" in sys.argv:
        h_winsta = user32.OpenWindowStationW("WinSta0", False, 0x037F)
        if h_winsta:
            user32.SetProcessWindowStation(h_winsta)
        h_desk = user32.OpenDesktopW("Default", 0, False, 0x01FF)
        if h_desk:
            user32.SetThreadDesktop(h_desk)
        return

    print(f"[*] Chuyển luồng sang Desktop tương tác (WinSta0\\Default)...", flush=True)

    class STARTUPINFO(ctypes.Structure):
        _fields_ = [
            ('cb', wintypes.DWORD),
            ('lpReserved', wintypes.LPWSTR),
            ('lpDesktop', wintypes.LPWSTR),
            ('lpTitle', wintypes.LPWSTR),
            ('dwX', wintypes.DWORD),
            ('dwY', wintypes.DWORD),
            ('dwXSize', wintypes.DWORD),
            ('dwYSize', wintypes.DWORD),
            ('dwXCountChars', wintypes.DWORD),
            ('dwYCountChars', wintypes.DWORD),
            ('dwFillAttribute', wintypes.DWORD),
            ('dwFlags', wintypes.DWORD),
            ('wShowWindow', wintypes.WORD),
            ('cbReserved2', wintypes.WORD),
            ('lpReserved2', ctypes.c_char_p),
            ('hStdInput', wintypes.HANDLE),
            ('hStdOutput', wintypes.HANDLE),
            ('hStdError', wintypes.HANDLE),
        ]

    class PROCESS_INFORMATION(ctypes.Structure):
        _fields_ = [
            ('hProcess', wintypes.HANDLE),
            ('hThread', wintypes.HANDLE),
            ('dwProcessId', wintypes.DWORD),
            ('dwThreadId', wintypes.DWORD),
        ]

    class SECURITY_ATTRIBUTES(ctypes.Structure):
        _fields_ = [
            ('nLength', wintypes.DWORD),
            ('lpSecurityDescriptor', ctypes.c_void_p),
            ('bInheritHandle', wintypes.BOOL)
        ]

    h_read = wintypes.HANDLE()
    h_write = wintypes.HANDLE()
    sa = SECURITY_ATTRIBUTES()
    sa.nLength = ctypes.sizeof(SECURITY_ATTRIBUTES)
    sa.bInheritHandle = True
    sa.lpSecurityDescriptor = None

    kernel32.CreatePipe(ctypes.byref(h_read), ctypes.byref(h_write), ctypes.byref(sa), 0)
    kernel32.SetHandleInformation(h_read, 1, 0)

    si = STARTUPINFO()
    si.cb = ctypes.sizeof(STARTUPINFO)
    si.lpDesktop = 'WinSta0\\Default'
    si.dwFlags = 0x00000100 # STARTF_USESTDHANDLES
    si.hStdOutput = h_write
    si.hStdError = h_write
    si.hStdInput = kernel32.GetStdHandle(-10)

    pi = PROCESS_INFORMATION()

    script_path = os.path.abspath(__file__)
    cmd = f'"{sys.executable}" -u "{script_path}" --child-worker'

    ret = kernel32.CreateProcessW(
        None, cmd, None, None, True, 0, None, None,
        ctypes.byref(si), ctypes.byref(pi)
    )

    if not ret:
        print(f"[!] Lỗi CreateProcessW: {kernel32.GetLastError()}", flush=True)
        return

    kernel32.CloseHandle(h_write)

    buf = ctypes.create_string_buffer(4096)
    bytes_read = wintypes.DWORD()
    try:
        while True:
            success = kernel32.ReadFile(h_read, buf, 4096, ctypes.byref(bytes_read), None)
            if not success or bytes_read.value == 0:
                break
            try:
                sys.stdout.buffer.write(buf.raw[:bytes_read.value])
                sys.stdout.buffer.flush()
            except Exception:
                pass
    except KeyboardInterrupt:
        kernel32.TerminateProcess(pi.hProcess, 0)
    finally:
        kernel32.CloseHandle(h_read)
        kernel32.CloseHandle(pi.hProcess)
        kernel32.CloseHandle(pi.hThread)
        sys.exit(0)

ensure_interactive_desktop()

def keep_windows_awake():
    try:
        ES_CONTINUOUS = 0x80000000
        ES_SYSTEM_REQUIRED = 0x00000001
        ES_AWAYMODE_REQUIRED = 0x00000040
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED)
    except Exception:
        pass

keep_windows_awake()

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
import win32gui
import win32con
import pyvda

ROOT_DIR = Path(__file__).resolve().parents[1]
STREAM_URL = "http://localhost:5500/youtube_stream_tool.html?v=v--oP2aezgI"
PROFILES_BASE = ROOT_DIR / "tmp" / "gui_chrome_profiles"

WIFI_PROXY_PORT = 19888
wifi_proxy_active = False

# --- Auto Wi-Fi Rotation Settings ---
WIFI_ROTATION_LIST = ["MinhLaConMeoDay", "VNTT-RD"]
WIFI_ROTATE_INTERVAL_SECONDS = 30 * 60 # Tự động đổi IP sau mỗi 30 phút

SHARED_STATE = {
    "ssid": "Đang kết nối...",
    "ip": "...",
    "rem_str": "30:00"
}

# --- Multi-Browser Configurations (6 Distinct Browsers) ---
BROWSER_SPECS = [
    {
        "name": "Google Chrome",
        "type": "chrome",
        "binary": r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        "driver": r"C:\Users\VNTT\.cache\selenium\chromedriver\win64\154.0.8037.92\chromedriver.exe"
    },
    {
        "name": "Microsoft Edge",
        "type": "edge",
        "binary": r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "driver": r"C:\Users\VNTT\.cache\selenium\msedgedriver\win64\154.0.4258.53\msedgedriver.exe"
    },
    {
        "name": "Brave Browser",
        "type": "brave",
        "binary": r"C:\Users\VNTT\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe",
        "driver": r"C:\Users\VNTT\.cache\selenium\chromedriver\win64\154.0.8037.92\chromedriver.exe"
    },
    {
        "name": "Cốc Cốc",
        "type": "coccoc",
        "binary": r"C:\Program Files\CocCoc\Browser\Application\browser.exe",
        "driver": r"C:\Users\VNTT\.cache\selenium\chromedriver\win64\152.0.7977.82\chromedriver.exe"
    },
    {
        "name": "Opera",
        "type": "opera",
        "binary": r"C:\Users\VNTT\AppData\Local\Programs\Opera\opera.exe",
        "driver": r"C:\Users\VNTT\.cache\selenium\chromedriver\win64\152.0.7977.82\chromedriver.exe"
    },
    {
        "name": "Opera GX",
        "type": "opera_gx",
        "binary": r"C:\Users\VNTT\AppData\Local\Programs\Opera GX\opera.exe",
        "driver": r"C:\Users\VNTT\.cache\selenium\chromedriver\win64\152.0.7977.82\chromedriver.exe"
    }
]

def get_current_connected_ssid():
    try:
        out = subprocess.check_output(['netsh', 'wlan', 'show', 'interfaces'], text=True, errors='ignore')
        for line in out.splitlines():
            if 'SSID' in line and 'BSSID' not in line and ':' in line:
                return line.split(':', 1)[1].strip()
    except Exception:
        pass
    return "N/A"

def get_public_ip_quick():
    for url in ['https://api.ipify.org', 'https://icanhazip.com']:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'curl/7.68.0'})
            with urllib.request.urlopen(req, timeout=4) as r:
                return r.read().decode('utf-8').strip()
        except Exception:
            pass
    return "N/A"

def switch_to_wifi(target_ssid):
    try:
        print(f"\n🔄 [TỰ ĐỘNG XOAY IP] Đang kích hoạt chuyển sang Wi-Fi: {target_ssid}...", flush=True)
        subprocess.run(['netsh', 'wlan', 'connect', f'name={target_ssid}'], capture_output=True, text=True, timeout=10)
        time.sleep(5) # Chờ cấp IP qua DHCP
        new_ip = get_public_ip_quick()
        print(f"✓ [THÀNH CÔNG] Đã đổi sang Wi-Fi: {target_ssid} | Public IP mới: {new_ip}!\n", flush=True)
        return new_ip
    except Exception as e:
        print(f"[!] Lỗi khi đổi Wi-Fi: {e}", flush=True)
        return None

def clean_profile_locks(profile_dir):
    try:
        for lock_file in ["SingletonLock", "SingletonCookie", "SingletonSocket"]:
            f = profile_dir / lock_file
            if f.exists():
                try: f.unlink(missing_ok=True)
                except: pass
    except Exception:
        pass

# 6 Tiled Windows for 1920x1080 display (3 cols x 2 rows, 640x515 each)
TILES = [
    {"x": 0,    "y": 0,   "w": 640, "h": 515},
    {"x": 640,  "y": 0,   "w": 640, "h": 515},
    {"x": 1280, "y": 0,   "w": 640, "h": 515},
    {"x": 0,    "y": 515, "w": 640, "h": 515},
    {"x": 640,  "y": 515, "w": 640, "h": 515},
    {"x": 1280, "y": 515, "w": 640, "h": 515},
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 CocCoc/128.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/114.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPRGX/114.0.0.0"
]

class GUIWorker(threading.Thread):
    def __init__(self, worker_id, tile, delay=0):
        super().__init__(daemon=True)
        self.worker_id = worker_id
        self.tile = tile
        self.delay = delay
        self.spec = BROWSER_SPECS[(worker_id - 1) % len(BROWSER_SPECS)]
        self.browser_name = self.spec["name"]
        self.profile_dir = PROFILES_BASE / f"clean_{self.spec['type']}_{worker_id}"
        self.profile_dir.mkdir(parents=True, exist_ok=True)
        clean_profile_locks(self.profile_dir)
        self.driver = None
        self.is_alive = True
        self.status = "Khởi tạo"
        self.title = "N/A"
        self.currentTime = "0:00"
        self.durationTime = "0:00"
        self.mainRuns = 0
        self.bufferRuns = 0
        self.totalTime = "00:00:00"
        self.hwnd = None
        self.stream_url = "http://localhost:5500/youtube_stream_tool.html"

    def init_driver(self):
        clean_profile_locks(self.profile_dir)
        b_type = self.spec["type"]

        if b_type == "edge":
            opts = EdgeOptions()
            opts.binary_location = self.spec["binary"]
            opts.add_argument("--mute-audio")
            opts.add_argument("--no-sandbox")
            opts.add_argument("--disable-dev-shm-usage")
            opts.add_argument("--autoplay-policy=no-user-gesture-required")
            opts.add_argument("--disable-session-crashed-bubble")
            opts.add_argument(f"--window-position={self.tile['x']},{self.tile['y']}")
            opts.add_argument(f"--window-size={self.tile['w']},{self.tile['h']}")
            opts.add_argument("--disable-background-timer-throttling")
            opts.add_argument("--disable-backgrounding-occluded-windows")
            opts.add_argument("--disable-renderer-backgrounding")
            opts.add_argument("--disable-blink-features=AutomationControlled")
            opts.add_experimental_option("excludeSwitches", ["enable-automation"])
            opts.add_experimental_option("useAutomationExtension", False)
            opts.add_argument(f"--user-data-dir={self.profile_dir}")
            service = EdgeService(self.spec["driver"])
            self.driver = webdriver.Edge(service=service, options=opts)
        else:
            opts = ChromeOptions()
            if self.spec.get("binary"):
                opts.binary_location = self.spec["binary"]
            opts.add_argument("--mute-audio")
            opts.add_argument("--no-sandbox")
            opts.add_argument("--disable-dev-shm-usage")
            opts.add_argument("--autoplay-policy=no-user-gesture-required")
            opts.add_argument("--disable-session-crashed-bubble")
            opts.add_argument("--hide-crash-restore-bubble")
            opts.add_argument(f"--window-position={self.tile['x']},{self.tile['y']}")
            opts.add_argument(f"--window-size={self.tile['w']},{self.tile['h']}")
            opts.add_argument("--disable-background-timer-throttling")
            opts.add_argument("--disable-backgrounding-occluded-windows")
            opts.add_argument("--disable-renderer-backgrounding")
            opts.add_argument("--disable-features=CalculateNativeWinOcclusion")
            opts.add_argument("--disable-blink-features=AutomationControlled")
            opts.add_experimental_option("excludeSwitches", ["enable-automation"])
            opts.add_experimental_option("useAutomationExtension", False)
            opts.add_argument(f"--user-data-dir={self.profile_dir}")
            service = ChromeService(self.spec["driver"])
            self.driver = webdriver.Chrome(service=service, options=opts)

        try:
            self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
                "source": """
                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                    Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
                """
            })
        except Exception:
            pass

    def snap_to_desktop_2(self):
        try:
            unique_marker = f"YT_STREAMER_WORKER_{self.worker_id}"
            self.driver.execute_script(f"document.title = '{unique_marker}';")
            time.sleep(0.5)
            hwnd = win32gui.FindWindowW(None, f"{unique_marker} - Google Chrome")
            if not hwnd:
                hwnd = win32gui.FindWindowW(None, unique_marker)
            if not hwnd:
                def enum_handler(h, res):
                    if win32gui.IsWindowVisible(h):
                        t = win32gui.GetWindowText(h)
                        if unique_marker in t:
                            res.append(h)
                    return True
                found = []
                win32gui.EnumWindows(enum_handler, found)
                if found:
                    hwnd = found[0]

            if hwnd:
                self.hwnd = hwnd
                try:
                    desk2 = pyvda.VirtualDesktop(2)
                    pyvda.AppView(hwnd).move(desk2)
                except Exception:
                    pass
                win32gui.MoveWindow(hwnd, self.tile['x'], self.tile['y'], self.tile['w'], self.tile['h'], True)
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(hwnd)
        except Exception:
            pass

    def navigate_to_video(self, video_id):
        url = f"https://www.youtube.com/watch?v={video_id}"
        self.driver.get(url)
        time.sleep(3)
        try:
            if len(self.driver.window_handles) > 1:
                for h in self.driver.window_handles:
                    self.driver.switch_to.window(h)
                    if "youtube" in self.driver.current_url.lower():
                        break
        except Exception:
            pass
        try:
            self.driver.execute_script("""
                var v = document.querySelector('video');
                if (v && v.paused) {
                    v.play().catch(function(e){});
                }
            """)
        except Exception:
            pass

    def run(self):
        playlist_file = ROOT_DIR / "playlist.json"
        channel_vids = [
            {"id": "v--oP2aezgI", "title": "Tôi Mất 6 Năm Mới Thấy Tiền Bắt Đầu “Đẻ Ra Tiền”"},
            {"id": "OC4aGfMpViU", "title": "MILO – Vì sao phát miễn phí mà cả thế hệ vẫn nhớ?"}
        ]
        buffer_vids = [
            {"id": "kJQP7kiw5Fk", "title": "Luis Fonsi - Despacito", "limit": 10},
            {"id": "dQw4w9WgXcQ", "title": "Rick Astley - Never Gonna Give You Up", "limit": 30}
        ]
        if playlist_file.exists():
            try:
                import json
                with open(playlist_file, "r", encoding="utf-8") as pf:
                    pdata = json.load(pf)
                    if pdata.get("channel_videos"):
                        channel_vids = [{"id": v["id"], "title": v.get("title", v["id"])} for v in pdata["channel_videos"]]
                    if pdata.get("buffer_videos"):
                        buffer_vids = [{"id": v["id"], "title": v.get("title", v["id"]), "limit": v.get("limit_seconds", 15)} for v in pdata["buffer_videos"]]
            except Exception:
                pass

        CHANNEL_VIDEOS = channel_vids
        BUFFER_VIDEOS = buffer_vids

        try:
            if self.delay > 0:
                self.status = f"Chờ lệch pha {self.delay}s"
                time.sleep(self.delay)

            self.status = f"Khởi chạy {self.browser_name}..."
            self.init_driver()

            self.step = 0 # 0: Video 1, 1: Video 2, 2: Buffer
            self.buffer_cycle = 0 # 0: 10s, 1: 30s
            self.current_limit = None
            self.current_buffer_id = None

            # Navigate directly to YouTube Video 1
            self.status = "Mở YouTube trực tiếp..."
            self.navigate_to_video(CHANNEL_VIDEOS[0]["id"])
            time.sleep(2)
            self.snap_to_desktop_2()

            start_epoch = time.time()

            while self.is_alive:
                time.sleep(4)
                elapsed = int(time.time() - start_epoch)
                self.totalTime = f"{elapsed//3600:02d}:{(elapsed%3600)//60:02d}:{elapsed%60:02d}"

                try:
                    # 1. Determine expected video ID
                    if self.step == 0:
                        expected_id = CHANNEL_VIDEOS[0]["id"]
                    elif self.step == 1:
                        expected_id = CHANNEL_VIDEOS[1]["id"]
                    else:
                        expected_id = self.current_buffer_id or BUFFER_VIDEOS[0]["id"]

                    # 2. Strict URL drift guard: if YouTube navigated away to recommended videos, force return!
                    curr_url = self.driver.current_url
                    if expected_id not in curr_url and "watch" in curr_url:
                        self.status = f"Lệch link ➔ Kéo về {expected_id}..."
                        self.navigate_to_video(expected_id)
                        time.sleep(2)
                        continue

                    state = self.driver.execute_script("""
                        var v = document.querySelector('video');
                        if (!v) return { found: false };

                        // Auto-skip ads
                        var skip = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button');
                        if (skip) skip.click();

                        // Auto-dismiss dialog popups and YouTube "Are you still watching?"
                        var dismiss = document.querySelector('ytd-button-renderer#dismiss-button, button[aria-label*="Dismiss"], yt-button-shape#dismiss-button, #confirm-button, yt-confirm-dialog-renderer #confirm-button');
                        if (dismiss) dismiss.click();

                        // Force DISABLE YouTube Autoplay toggle so YouTube never auto-plays random videos
                        var autonav = document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"]');
                        if (autonav) autonav.click();

                        if (v.paused && !v.ended) {
                            v.play().catch(function(e){});
                        }

                        var dur = v.duration || 0;
                        var cur = v.currentTime || 0;
                        var titleElem = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1');
                        var vTitle = titleElem ? titleElem.innerText : document.title.replace(' - YouTube', '');

                        return {
                            found: true,
                            paused: v.paused,
                            ended: v.ended,
                            cur: Math.floor(cur),
                            dur: Math.floor(dur),
                            title: vTitle.trim()
                        };
                    """)

                    if not state or not state.get("found"):
                        self.status = "Đang tải YouTube..."
                        continue

                    cur = state.get("cur", 0)
                    dur = state.get("dur", 0)
                    ended = state.get("ended", False)
                    v_title = state.get("title", "")
                    if v_title:
                        self.title = v_title

                    self.currentTime = f"{cur//60}:{cur%60:02d}"
                    self.durationTime = f"{dur//60}:{dur%60:02d}"
                    self.status = "Đang phát"

                    # Inject and update visible floating HUD directly on YouTube video page
                    try:
                        hud_info = {
                            "browser": self.browser_name,
                            "ssid": SHARED_STATE.get("ssid", "Wi-Fi"),
                            "ip": SHARED_STATE.get("ip", ""),
                            "rem": SHARED_STATE.get("rem_str", "--:--"),
                            "step_name": f"Video 1 ({self.currentTime}/{self.durationTime})" if self.step == 0 else (f"Video 2 ({self.currentTime}/{self.durationTime})" if self.step == 1 else f"Video Đệm ({cur}s/{self.current_limit}s)"),
                            "runs": f"Chính: {self.mainRuns} | Đệm: {self.bufferRuns}"
                        }
                        self.driver.execute_script("""
                            var d = arguments[0];
                            var h = document.getElementById('yt-streamer-hud');
                            if (!h) {
                                h = document.createElement('div');
                                h.id = 'yt-streamer-hud';
                                h.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;background:linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96));border:1.5px solid #38bdf8;color:#fff;padding:8px 18px;border-radius:25px;font-size:13px;font-weight:bold;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.8);pointer-events:none;white-space:nowrap;';
                                document.body.appendChild(h);
                            }
                            h.innerHTML = '<span style="color:#22c55e;">● ' + d.browser + '</span> &nbsp;|&nbsp; 🌐 <b>' + d.ssid + '</b> (' + d.ip + ') &nbsp;|&nbsp; ⏳ Đổi Wi-Fi: <b style="color:#fbbf24;">' + d.rem + '</b> &nbsp;|&nbsp; 🎬 <b style="color:#38bdf8;">' + d.step_name + '</b> &nbsp;|&nbsp; 📊 ' + d.runs;
                        """, hud_info)
                    except Exception:
                        pass

                    # Check transitions
                    if self.step == 0:
                        # Video 1: finish when ended or near end or past 520s
                        if ended or (dur > 30 and cur >= dur - 3) or (cur >= 520):
                            self.mainRuns += 1
                            self.step = 1
                            self.status = "Chuyển sang Video 2..."
                            time.sleep(2)
                            self.navigate_to_video(CHANNEL_VIDEOS[1]["id"])

                    elif self.step == 1:
                        # Video 2: finish when ended or near end or past 560s
                        if ended or (dur > 30 and cur >= dur - 3) or (cur >= 560):
                            self.mainRuns += 1
                            self.step = 2
                            buf = BUFFER_VIDEOS[self.buffer_cycle]
                            self.current_limit = buf["limit"]
                            self.current_buffer_id = buf["id"]
                            self.buffer_cycle = (self.buffer_cycle + 1) % len(BUFFER_VIDEOS)
                            self.status = f"Chuyển sang Đệm ({self.current_limit}s)..."
                            time.sleep(2)
                            self.navigate_to_video(self.current_buffer_id)

                    elif self.step == 2:
                        # Buffer video: finish when current >= current_limit (10s or 30s) or ended
                        if (self.current_limit and cur >= self.current_limit) or ended:
                            self.bufferRuns += 1
                            self.step = 0
                            self.current_limit = None
                            self.current_buffer_id = None
                            self.status = "Xong đệm ➔ Quay lại Video 1..."
                            time.sleep(2)
                            self.navigate_to_video(CHANNEL_VIDEOS[0]["id"])

                except Exception as loop_e:
                    err_msg = str(loop_e)
                    if "no such window" in err_msg or "target window already closed" in err_msg or "invalid session id" in err_msg:
                        self.status = "Tự phục hồi cửa sổ..."
                        try:
                            self.close()
                            time.sleep(2)
                            self.init_driver()
                            curr_vid = CHANNEL_VIDEOS[self.step if self.step < 2 else 0]["id"]
                            self.navigate_to_video(curr_vid)
                            time.sleep(3)
                            self.snap_to_desktop_2()
                            self.is_alive = True
                        except Exception:
                            pass
                    else:
                        self.status = f"Lỗi đọc: {err_msg[:25]}"
        except Exception as e:
            self.status = f"Lỗi: {str(e)[:40]}"
        finally:
            self.close()

    def close(self):
        self.is_alive = False
        if self.driver:
            try: self.driver.quit()
            except: pass
            self.driver = None

def main():
    try:
        # Prevent Windows from sleeping or suspending threads when PC is locked (Win + L)
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)
    except Exception:
        pass

    print("=" * 80, flush=True)
    print("🎬 HỆ THỐNG CÀY VIEW ĐA TRÌNH DUYỆT (6 BROWSERS) TRÊN DESKTOP 2", flush=True)
    print("✓ Cửa sổ #1: Google Chrome | Cửa sổ #2: Microsoft Edge", flush=True)
    print("✓ Cửa sổ #3: Brave Browser | Cửa sổ #4: Cốc Cốc", flush=True)
    print("✓ Cửa sổ #5: Opera         | Cửa sổ #6: Opera GX", flush=True)
    print("✓ Tự động xếp gọn 3x2 trên Desktop 2 | Mỗi trình duyệt profile riêng 100%", flush=True)
    print("✓ DANH SÁCH PHÁT (PLAYLIST):", flush=True)
    print("   1. Video Chính 1: https://www.youtube.com/watch?v=v--oP2aezgI (Tôi Mất 6 Năm...)", flush=True)
    print("   2. Video Chính 2: https://www.youtube.com/watch?v=OC4aGfMpViU (MILO...)", flush=True)
    print("   3. Đệm 1 (10s)  : https://www.youtube.com/watch?v=kJQP7kiw5Fk (Despacito)", flush=True)
    print("   4. Đệm 2 (30s)  : https://www.youtube.com/watch?v=dQw4w9WgXcQ (Never Gonna Give You Up)", flush=True)
    print("✓ Chu kỳ chuẩn: 1 -> 2 -> đệm 10s -> 1 -> 2 -> đệm 30s -> Lặp lại", flush=True)
    print("✓ TỰ ĐỘNG XOAY WI-FI (MinhLaConMeoDay <-> VNTT-RD) sau mỗi 30 phút", flush=True)
    print("=" * 80, flush=True)

    # Initialize current network status
    current_ssid = get_current_connected_ssid()
    current_public_ip = get_public_ip_quick()
    current_wifi_index = 0
    if current_ssid in WIFI_ROTATION_LIST:
        current_wifi_index = WIFI_ROTATION_LIST.index(current_ssid)

    last_wifi_rotate_time = time.time()
    print(f"🌐 MẠNG HIỆN TẠI: {current_ssid} | ĐỊA CHỈ IP: {current_public_ip}", flush=True)
    print("=" * 80, flush=True)

    workers = []
    for i in range(len(BROWSER_SPECS)):
        tile = TILES[i % len(TILES)]
        delay = i * 4
        w = GUIWorker(worker_id=i+1, tile=tile, delay=delay)
        w.start()
        workers.append(w)

    try:
        while True:
            time.sleep(8)
            now = time.time()
            elapsed_since_rotate = now - last_wifi_rotate_time

            # Check if time to rotate Wi-Fi
            if elapsed_since_rotate >= WIFI_ROTATE_INTERVAL_SECONDS:
                current_wifi_index = (current_wifi_index + 1) % len(WIFI_ROTATION_LIST)
                next_ssid = WIFI_ROTATION_LIST[current_wifi_index]
                new_ip = switch_to_wifi(next_ssid)
                if new_ip and new_ip != "N/A":
                    current_public_ip = new_ip
                current_ssid = next_ssid
                last_wifi_rotate_time = time.time()
                elapsed_since_rotate = 0

                # Ensure all workers resume playback immediately after network switch
                for w in workers:
                    try:
                        if w.driver:
                            w.driver.execute_script("""
                                var v = document.querySelector('video');
                                if (v) {
                                    v.muted = true;
                                    if (v.paused) v.play().catch(function(e){});
                                }
                            """)
                    except Exception:
                        pass

            # Calculate remaining time to next Wi-Fi rotation
            remaining_sec = max(0, int(WIFI_ROTATE_INTERVAL_SECONDS - elapsed_since_rotate))
            rem_min = remaining_sec // 60
            rem_s = remaining_sec % 60

            SHARED_STATE["ssid"] = current_ssid
            SHARED_STATE["ip"] = current_public_ip
            SHARED_STATE["rem_str"] = f"{rem_min:02d}:{rem_s:02d}"

            # Export status.json for live monitor GUI
            try:
                status_payload = {
                    "wifi": current_ssid,
                    "ip": current_public_ip,
                    "countdown": f"{rem_min:02d}:{rem_s:02d}",
                    "workers": [
                        {
                            "id": w.worker_id,
                            "name": w.browser_name,
                            "title": w.title,
                            "time": f"{w.currentTime}/{w.durationTime}",
                            "status": w.status,
                            "main": w.mainRuns,
                            "buffer": w.bufferRuns
                        } for w in workers
                    ]
                }
                with open(ROOT_DIR / "status.json", "w", encoding="utf-8") as sf:
                    json.dump(status_payload, sf, ensure_ascii=False, indent=2)
            except Exception:
                pass

            total_main = sum(w.mainRuns for w in workers)
            total_buffer = sum(w.bufferRuns for w in workers)
            active_count = sum(1 for w in workers if w.is_alive)
            
            print("\n" + "-" * 80, flush=True)
            print(f"📊 BÁO CÁO DESKTOP 2: [Wi-Fi: {current_ssid} | IP: {current_public_ip} | Đổi IP sau: {rem_min}m{rem_s:02d}s] | Chính: {total_main} | Đệm: {total_buffer}", flush=True)
            print("-" * 80, flush=True)
            for w in workers:
                short_title = (w.title[:24] + '..') if len(w.title) > 24 else w.title
                print(f"  [Cửa sổ #{w.worker_id} - {w.browser_name}] [{w.totalTime}] {w.status} | {short_title} ({w.currentTime}/{w.durationTime}) | Chính: {w.mainRuns} | Đệm: {w.bufferRuns}", flush=True)
    except KeyboardInterrupt:
        print("\nDừng hệ thống...", flush=True)
    finally:
        for w in workers: w.close()

if __name__ == '__main__':
    main()
