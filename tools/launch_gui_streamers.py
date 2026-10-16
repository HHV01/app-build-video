"""GUI Browser Streamer (Anti-Bot Organic Search & Auto-Unstuck Watchdog) with Auto Wi-Fi IP Rotator.
7 TRÌNH DUYỆT (Mỗi loại đúng 1 tab/cửa sổ):
- Chrome, Edge, Brave, Cốc Cốc, Firefox, Opera, Opera GX
- KHÔNG MỞ LINK TRỰC TIẾP: Tìm kiếm YouTube Search tự nhiên -> Click video
- BẢN VÁ HOÀN CHỈNH 100%:
  + Edge: Tắt vĩnh viễn Sleeping Tabs & Efficiency Mode (đã kiểm chứng chạy mượt mà).
  + Firefox: Cấu hình chuẩn -profile, eager load, dọn parent.lock.
  + Opera GX: Tự động phát hiện và chuyển sang tab YouTube (bỏ qua tab GX Corner).
  + Auto-Unstuck Watchdog: Tự động giải cứu nếu bất kỳ trình duyệt nào đứng hình quá 25-50s.
  + WlanScan: Quét sóng phần cứng trước khi đổi mạng Wi-Fi (VNTT-RD <-> MinhLaConMeoDay).
- Ưu tiên 100% tài nguyên cày tối ưu cho 2 video: ĐỨC (19:43) và 6 NĂM (8:41).
"""

import sys
import os
import time
import json
import random
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

    # Parent launcher: respawn child worker attached to WinSta0\Default
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
            ('hStdError', wintypes.HANDLE)
        ]

    class PROCESS_INFORMATION(ctypes.Structure):
        _fields_ = [
            ('hProcess', wintypes.HANDLE),
            ('hThread', wintypes.HANDLE),
            ('dwProcessId', wintypes.DWORD),
            ('dwThreadId', wintypes.DWORD)
        ]

    class SECURITY_ATTRIBUTES(ctypes.Structure):
        _fields_ = [
            ('nLength', wintypes.DWORD),
            ('lpSecurityDescriptor', wintypes.LPVOID),
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
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
import win32gui
import win32con
import pyvda

ROOT_DIR = Path(__file__).resolve().parents[1]
PROFILES_BASE = ROOT_DIR / "tmp" / "gui_chrome_profiles"

# --- Auto Wi-Fi Rotation Settings ---
WIFI_ROTATION_LIST = ["MinhLaConMeoDay", "VNTT-RD"]
WIFI_ROTATE_INTERVAL_SECONDS = 30 * 60 # Tự động đổi IP sau mỗi 30 phút

SHARED_STATE = {
    "ssid": "Đang kết nối...",
    "ip": "...",
    "rem_str": "30:00"
}

# --- Multi-Browser Configurations (7 trình duyệt: mỗi loại 1 cái) ---
BROWSER_SPECS = [
    {
        "name": "Chrome",
        "type": "chrome",
        "binary": r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        "driver": r"C:\Users\VNTT\.cache\selenium\chromedriver\win64\154.0.8037.92\chromedriver.exe"
    },
    {
        "name": "Edge",
        "type": "edge",
        "binary": r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "driver": r"C:\Users\VNTT\.cache\selenium\msedgedriver\win64\154.0.4258.53\msedgedriver.exe"
    },
    {
        "name": "Brave",
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
        "name": "Firefox",
        "type": "firefox",
        "binary": r"C:\Program Files\Mozilla Firefox\firefox.exe",
        "driver": r"C:\Users\VNTT\.cache\selenium\geckodriver\win64\0.37.1\geckodriver.exe"
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

# 7 Cửa sổ xếp trên màn hình 2048 x 1152 (Hàng trên 4 cửa sổ, Hàng dưới 3 cửa sổ rộng rãi)
TILES = [
    # Hàng 1 (4 cửa sổ: 512px x 540px)
    {"x": 0,    "y": 0,   "w": 512, "h": 540},
    {"x": 512,  "y": 0,   "w": 512, "h": 540},
    {"x": 1024, "y": 0,   "w": 512, "h": 540},
    {"x": 1536, "y": 0,   "w": 512, "h": 540},
    # Hàng 2 (3 cửa sổ: 682px x 540px)
    {"x": 0,    "y": 540, "w": 682, "h": 540},
    {"x": 682,  "y": 540, "w": 682, "h": 540},
    {"x": 1364, "y": 540, "w": 684, "h": 540},
]

# 7 Giao diện riêng biệt cho từng trình duyệt
BROWSER_STYLES = [
    {"dark_mode": True,  "zoom": "95%",  "quality": "large",   "speed": 1.0,  "cc": False, "desc": "Dark 95% (480p)"},
    {"dark_mode": False, "zoom": "100%", "quality": "medium",  "speed": 1.0,  "cc": True,  "desc": "Light 100% (360p, CC)"},
    {"dark_mode": True,  "zoom": "90%",  "quality": "small",   "speed": 1.05, "cc": False, "desc": "Dark 90% (240p, 1.05x)"},
    {"dark_mode": False, "zoom": "105%", "quality": "large",   "speed": 0.95, "cc": False, "desc": "Light 105% (480p, 0.95x)"},
    {"dark_mode": True,  "zoom": "100%", "quality": "medium",  "speed": 1.0,  "cc": True,  "desc": "Dark 100% (360p, CC)"},
    {"dark_mode": False, "zoom": "95%",  "quality": "small",   "speed": 1.05, "cc": True,  "desc": "Light 95% (240p, 1.05x, CC)"},
    {"dark_mode": True,  "zoom": "105%", "quality": "hd720",   "speed": 1.0,  "cc": False, "desc": "Dark 105% (720p)"},
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Brave/1.69",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 CocCoc/128.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/132.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/114.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPRGX/115.0.0.0"
]

def trigger_wlan_scan():
    try:
        wlanapi = ctypes.windll.wlanapi
        class GUID(ctypes.Structure):
            _fields_ = [("Data1", wintypes.DWORD), ("Data2", wintypes.WORD), ("Data3", wintypes.WORD), ("Data4", wintypes.BYTE * 8)]
        class WLAN_INTERFACE_INFO(ctypes.Structure):
            _fields_ = [("InterfaceGuid", GUID), ("strInterfaceDescription", wintypes.WCHAR * 256), ("isState", wintypes.DWORD)]
        class WLAN_INTERFACE_INFO_LIST(ctypes.Structure):
            _fields_ = [("dwNumberOfItems", wintypes.DWORD), ("dwIndex", wintypes.DWORD), ("InterfaceInfo", WLAN_INTERFACE_INFO * 1)]

        hClient = wintypes.HANDLE()
        negotiated = wintypes.DWORD()
        if wlanapi.WlanOpenHandle(2, None, ctypes.byref(negotiated), ctypes.byref(hClient)) == 0:
            pIfList = ctypes.POINTER(WLAN_INTERFACE_INFO_LIST)()
            if wlanapi.WlanEnumInterfaces(hClient, None, ctypes.byref(pIfList)) == 0:
                if pIfList.contents.dwNumberOfItems > 0:
                    guid = pIfList.contents.InterfaceInfo[0].InterfaceGuid
                    wlanapi.WlanScan(hClient, ctypes.byref(guid), None, None, None)
            wlanapi.WlanCloseHandle(hClient, None)
    except Exception:
        pass

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
        print(f"\n[🔄] Đang kích hoạt quét sóng và chuyển sang: {target_ssid}...", flush=True)
        trigger_wlan_scan()
        time.sleep(2)
        subprocess.run(['netsh', 'wlan', 'connect', f'name={target_ssid}'], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(8):
            time.sleep(2)
            curr = get_current_connected_ssid()
            if curr == target_ssid:
                ip = get_public_ip_quick()
                print(f"[✓] Đã đổi mạng thành công sang: {target_ssid} | IP: {ip}\n", flush=True)
                return ip
        return None
    except Exception as e:
        print(f"[!] Lỗi khi đổi Wi-Fi: {e}", flush=True)
        return None

def clean_profile_locks(profile_dir):
    try:
        for lock_file in ["SingletonLock", "SingletonCookie", "SingletonSocket", "parent.lock"]:
            f = profile_dir / lock_file
            if f.exists():
                try: f.unlink(missing_ok=True)
                except: pass
    except Exception:
        pass

class GUIWorker(threading.Thread):
    def __init__(self, worker_id, tile, delay=0):
        super().__init__(daemon=True)
        self.worker_id = worker_id
        self.tile = tile
        self.delay = delay
        self.spec = BROWSER_SPECS[(worker_id - 1) % len(BROWSER_SPECS)]
        self.style = BROWSER_STYLES[(worker_id - 1) % len(BROWSER_STYLES)]
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
        self.totalTime = "00:00:00"
        self.hwnd = None

    def focus_youtube_tab(self):
        """Đảm bảo trình duyệt luôn trỏ đúng vào tab YouTube (Đặc biệt quan trọng với Opera GX)."""
        try:
            if len(self.driver.window_handles) > 1:
                for h in self.driver.window_handles:
                    self.driver.switch_to.window(h)
                    u = self.driver.current_url.lower()
                    if "youtube.com" in u or "watch" in u:
                        return
        except Exception:
            pass

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
            opts.add_argument("--hide-crash-restore-bubble")
            opts.add_argument(f"--window-position={self.tile['x']},{self.tile['y']}")
            opts.add_argument(f"--window-size={self.tile['w']},{self.tile['h']}")
            # BẢN VÁ EDGE: Tắt hoàn toàn Sleeping Tabs, Throttling và Efficiency Mode
            opts.add_argument("--disable-background-timer-throttling")
            opts.add_argument("--disable-backgrounding-occluded-windows")
            opts.add_argument("--disable-renderer-backgrounding")
            opts.add_argument("--disable-features=msSleepingTabs,msSleepingTabsExceptions,msEfficiencyMode,CalculateNativeWinOcclusion")
            opts.add_argument("--no-first-run")
            opts.add_argument("--no-default-browser-check")
            opts.add_argument("--disable-blink-features=AutomationControlled")
            opts.add_experimental_option("excludeSwitches", ["enable-automation"])
            opts.add_experimental_option("useAutomationExtension", False)
            opts.add_experimental_option("prefs", {
                "edge.sleeping_tabs_enabled": False,
                "profile.default_content_setting_values.notifications": 2
            })
            opts.add_argument(f"--user-data-dir={self.profile_dir}")
            service = EdgeService(self.spec["driver"])
            self.driver = webdriver.Edge(service=service, options=opts)

        elif b_type == "firefox":
            from selenium.webdriver.firefox.options import Options as FirefoxOptions
            from selenium.webdriver.firefox.service import Service as FirefoxService
            opts = FirefoxOptions()
            opts.binary_location = self.spec["binary"]
            # BẢN VÁ FIREFOX: PageLoadStrategy eager, -profile đầy đủ, timeout chuẩn
            opts.page_load_strategy = "eager"
            opts.add_argument("-profile")
            opts.add_argument(str(self.profile_dir))
            opts.set_preference("media.volume_scale", "0.0")
            opts.set_preference("media.autoplay.default", 0)
            opts.set_preference("media.autoplay.blocking_policy", 0)
            opts.set_preference("media.autoplay.allow-muted", True)
            opts.set_preference("media.autoplay.block-event.enabled", False)
            opts.set_preference("dom.webdriver.enabled", False)
            opts.set_preference("permissions.default.desktop-notification", 2)
            opts.set_preference("privacy.trackingprotection.enabled", False)
            opts.add_argument(f"--width={self.tile['w']}")
            opts.add_argument(f"--height={self.tile['h']}")
            service = FirefoxService(self.spec["driver"])
            self.driver = webdriver.Firefox(service=service, options=opts)
            self.driver.set_page_load_timeout(20)
            self.driver.set_script_timeout(10)

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

        if b_type != "firefox":
            try:
                self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
                    "source": """
                        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                        Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
                    """
                })
            except Exception:
                pass

    def snap_to_desktop(self):
        """Khôi phục cửa sổ kích thước đầy đủ (KHÔNG THU NHỎ) và ghim hiển thị trực tiếp."""
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
                    pyvda.AppView(hwnd).pin()
                except Exception:
                    pass
                # KHÔNG THU NHỎ (Always SW_RESTORE and MoveWindow to Grid)
                win32gui.MoveWindow(hwnd, self.tile['x'], self.tile['y'], self.tile['w'], self.tile['h'], True)
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(hwnd)
        except Exception:
            pass

    def apply_distinct_ui_style(self):
        """Áp dụng phong cách giao diện riêng biệt cho từng màn hình (Theme, Zoom, Quality, CC)."""
        try:
            js = """
                var s = arguments[0];
                try {
                    document.body.style.zoom = s.zoom;
                    if (s.dark_mode) {
                        document.documentElement.setAttribute('dark', 'true');
                        document.documentElement.setAttribute('data-color-mode', 'dark');
                    } else {
                        document.documentElement.removeAttribute('dark');
                        document.documentElement.setAttribute('data-color-mode', 'light');
                    }
                    var player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
                    if (player) {
                        if (player.setPlaybackQualityRange) {
                            player.setPlaybackQualityRange(s.quality, s.quality);
                        }
                        if (player.setPlaybackRate && s.speed) {
                            player.setPlaybackRate(s.speed);
                        }
                    }
                    var ccBtn = document.querySelector('.ytp-subtitles-button');
                    if (ccBtn) {
                        var isPressed = ccBtn.getAttribute('aria-pressed') === 'true';
                        if (s.cc !== isPressed) ccBtn.click();
                    }
                } catch(e) {}
            """
            self.driver.execute_script(js, self.style)
        except Exception:
            pass

    def search_and_navigate_to_video(self, video_info):
        """Tìm kiếm từ khóa trên YouTube, sau đó click vào xem (Không mở link trực tiếp)."""
        video_id = video_info["id"]
        video_title = video_info["title"]
        self.status = f"Tìm kiếm tự nhiên: {video_title[:12]}..."

        try:
            # 1. Truy cập trang chủ YouTube
            self.driver.get("https://www.youtube.com")
            time.sleep(2.5)
            self.focus_youtube_tab()

            # Đóng banner / cookie dialog nếu có
            try:
                self.driver.execute_script("""
                    var btn = document.querySelector('button[aria-label*="Đồng ý"], button[aria-label*="Agree"], button[aria-label*="Accept"], ytd-button-renderer#dismiss-button, #dismiss-button');
                    if (btn) btn.click();
                """)
            except Exception:
                pass

            # 2. Tìm kiếm tiêu đề video + Tích Thông Thái
            search_query = f"{video_title} Tích Thông Thái"

            search_box = None
            for sel in ["input#search", "input[name='search_query']"]:
                try:
                    search_box = self.driver.find_element(By.CSS_SELECTOR, sel)
                    if search_box: break
                except Exception:
                    pass

            if search_box:
                search_box.clear()
                for char in search_query:
                    search_box.send_keys(char)
                    time.sleep(random.uniform(0.015, 0.04))
                time.sleep(0.3)
                search_box.send_keys(Keys.ENTER)
                time.sleep(3.5)
                self.focus_youtube_tab()

                # Trên kết quả tìm kiếm, click thẳng vào video
                self.status = f"Click video {video_title[:10]} từ Tìm kiếm..."
                clicked_vid = self.driver.execute_script("""
                    var targetId = arguments[0];
                    var vids = document.querySelectorAll('ytd-video-renderer a#video-title, ytd-video-renderer a#thumbnail');
                    for (var v of vids) {
                        if (v.href && v.href.includes(targetId)) {
                            v.click();
                            return true;
                        }
                    }
                    var anyLink = document.querySelector('a[href*="' + targetId + '"]');
                    if (anyLink) {
                        anyLink.click();
                        return true;
                    }
                    return false;
                """, video_id)

            # Kiểm tra xem video đã được mở chưa
            time.sleep(3)
            self.focus_youtube_tab()
            curr = self.driver.current_url
            if video_id not in curr:
                # Nếu kết quả tìm kiếm không click được, fallback mở trực tiếp an toàn
                self.status = f"Điều hướng tới {video_id}..."
                self.driver.get(f"https://www.youtube.com/watch?v={video_id}")
                time.sleep(2.5)

        except Exception as e:
            try:
                self.driver.get(f"https://www.youtube.com/watch?v={video_id}")
                time.sleep(2)
            except Exception:
                pass

        self.focus_youtube_tab()

        # Đảm bảo phát video
        try:
            self.driver.execute_script("""
                var v = document.querySelector('video');
                if (v) {
                    v.muted = true;
                    if (v.paused) v.play().catch(function(e){});
                }
            """)
        except Exception:
            pass

        self.apply_distinct_ui_style()

    def run(self):
        # 2 VIDEO ƯU TIÊN HÀNG ĐẦU CỦA KÊNH
        channel_vids = [
            {"id": "bDpFup17nrQ", "title": "Cái bẫy quyền lực trong lịch sử nước Đức?"},
            {"id": "v--oP2aezgI", "title": "Tôi Mất 6 Năm Mới Thấy Tiền Bắt Đầu “Đẻ Ra Tiền”"}
        ]

        playlist_file = ROOT_DIR / "playlist.json"
        if playlist_file.exists():
            try:
                with open(playlist_file, "r", encoding="utf-8") as pf:
                    pdata = json.load(pf)
                    if pdata.get("channel_videos"):
                        channel_vids = [{"id": v["id"], "title": v.get("title", v["id"])} for v in pdata["channel_videos"]]
            except Exception:
                pass

        CHANNEL_VIDEOS = channel_vids

        try:
            # 1. So le lệch pha khởi động (cách nhau 15-20s)
            if self.delay > 0:
                self.status = f"Chờ lệch pha {self.delay}s"
                time.sleep(self.delay)

            self.status = f"Khởi chạy {self.browser_name}..."
            self.init_driver()

            # 2. Xếp luân phiên chéo: Tổ lẻ bắt đầu từ Đức, Tổ chẵn bắt đầu từ 6 Năm
            if (self.worker_id % 2) != 0:
                self.my_vids = [CHANNEL_VIDEOS[0], CHANNEL_VIDEOS[1]]
                group_label = f"{self.browser_name} (Đức ➔ 6 Năm)"
            else:
                self.my_vids = [CHANNEL_VIDEOS[1], CHANNEL_VIDEOS[0]]
                group_label = f"{self.browser_name} (6 Năm ➔ Đức)"

            self.step = 0 # 0: Video 1, 1: Video 2
            self.snap_to_desktop()

            # 3. Tìm kiếm kênh / video và vào xem
            self.search_and_navigate_to_video(self.my_vids[0])
            self.snap_to_desktop()

            start_epoch = time.time()
            last_progress_cur = -1
            stuck_seconds = 0

            while self.is_alive:
                time.sleep(4)
                elapsed = int(time.time() - start_epoch)
                self.totalTime = f"{elapsed//3600:02d}:{(elapsed%3600)//60:02d}:{elapsed%60:02d}"

                try:
                    self.focus_youtube_tab()
                    expected_id = self.my_vids[self.step]["id"]

                    # Chống lệch link sang video đề xuất khác
                    curr_url = self.driver.current_url
                    if expected_id not in curr_url and "watch" in curr_url:
                        self.status = f"Lệch link ➔ Tìm kiếm lại {expected_id}..."
                        self.search_and_navigate_to_video(self.my_vids[self.step])
                        time.sleep(2)
                        continue

                    if random.random() < 0.20:
                        self.apply_distinct_ui_style()

                    state = self.driver.execute_script("""
                        var v = document.querySelector('video');
                        if (!v) return { found: false };

                        var skip = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button');
                        if (skip) skip.click();

                        var dismiss = document.querySelector('ytd-button-renderer#dismiss-button, button[aria-label*="Dismiss"], yt-button-shape#dismiss-button, #confirm-button, yt-confirm-dialog-renderer #confirm-button, ytd-consent-bump-v2-lightbox button, [aria-label*="Đồng ý"], [aria-label*="Agree"], [aria-label*="Accept"]');
                        if (dismiss) dismiss.click();

                        var autonav = document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"]');
                        if (autonav) autonav.click();

                        if (Math.random() < 0.25) {
                            var p = document.querySelector('#movie_player') || document.body;
                            var rx = Math.floor(Math.random() * (window.innerWidth || 450));
                            var ry = Math.floor(Math.random() * (window.innerHeight || 450));
                            p.dispatchEvent(new MouseEvent('mousemove', { clientX: rx, clientY: ry, bubbles: true }));
                        }
                        if (Math.random() < 0.08) {
                            var scrollAmt = Math.floor(Math.random() * 150) + 40;
                            window.scrollBy({ top: scrollAmt, behavior: 'smooth' });
                            setTimeout(function() { window.scrollBy({ top: -scrollAmt, behavior: 'smooth' }); }, 1400);
                        }

                        if (v.paused) {
                            v.play().catch(function(e){});
                        }

                        return {
                            found: true,
                            currentTime: Math.floor(v.currentTime || 0),
                            duration: Math.floor(v.duration || 0),
                            ended: v.ended || false,
                            title: document.title.replace(' - YouTube', '').trim()
                        };
                    """)

                    if not state or not state.get("found"):
                        self.status = "Chờ video tải..."
                        stuck_seconds += 4
                        if stuck_seconds >= 30:
                            # Tự cứu nếu không thấy thẻ video sau 30s
                            self.driver.refresh()
                            stuck_seconds = 0
                            time.sleep(3)
                        continue

                    cur = state.get("currentTime", 0)
                    dur = state.get("duration", 0)
                    ended = state.get("ended", False)
                    if state.get("title"):
                        self.title = state["title"]

                    self.currentTime = f"{cur//60:02d}:{cur%60:02d}"
                    self.durationTime = f"{dur//60:02d}:{dur%60:02d}" if dur > 0 else "--:--"

                    # --- AUTO-UNSTUCK WATCHDOG: Kiểm tra chống đứng hình / chống dừng ---
                    if dur > 0 and not ended:
                        if cur == last_progress_cur:
                            stuck_seconds += 4
                            if stuck_seconds >= 24:
                                # Ép phát và đóng mọi popup tạm dừng của YouTube
                                self.status = f"Tự cứu ({stuck_seconds}s đứng hình) -> Play & Dismiss..."
                                self.driver.execute_script("""
                                    var v = document.querySelector('video');
                                    if (v && v.paused) v.play().catch(function(e){});
                                    var btn = document.querySelector('#confirm-button, yt-confirm-dialog-renderer #confirm-button, ytd-button-renderer#dismiss-button');
                                    if (btn) btn.click();
                                """)
                            if stuck_seconds >= 50:
                                # Nếu sau 50s vẫn đứng: F5 tải lại trang video
                                self.status = "Tự cứu (50s) -> F5 Refresh tải lại..."
                                self.driver.refresh()
                                stuck_seconds = 0
                                time.sleep(3)
                                self.snap_to_desktop()
                                continue
                        else:
                            last_progress_cur = cur
                            stuck_seconds = 0

                    # Cập nhật HUD hiển thị trực tiếp góc trên mỗi trình duyệt
                    try:
                        step_title = self.my_vids[self.step]["title"][:14]
                        step_label = f"[{self.step+1}/2] {step_title}.. ({self.currentTime}/{self.durationTime})"

                        hud_info = {
                            "browser": f"{self.browser_name} - {self.style['desc']}",
                            "ssid": SHARED_STATE.get("ssid", "Wi-Fi"),
                            "rem": SHARED_STATE.get("rem_str", "--:--"),
                            "step_name": step_label,
                            "runs": f"Lượt xem: {self.mainRuns}"
                        }
                        self.driver.execute_script("""
                            var d = arguments[0];
                            var h = document.getElementById('yt-streamer-hud');
                            if (!h) {
                                h = document.createElement('div');
                                h.id = 'yt-streamer-hud';
                                h.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:2147483647;background:linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96));border:1.2px solid #38bdf8;color:#fff;padding:3px 10px;border-radius:14px;font-size:11px;font-weight:bold;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,0.8);pointer-events:none;white-space:nowrap;max-width:96%;overflow:hidden;text-overflow:ellipsis;';
                                document.body.appendChild(h);
                            }
                            h.innerHTML = '<span style="color:#22c55e;">● ' + d.browser + '</span> &nbsp;|&nbsp; 🌐 ' + d.ssid + ' &nbsp;|&nbsp; ⏳ <b style="color:#fbbf24;">' + d.rem + '</b> &nbsp;|&nbsp; 🎬 ' + d.step_name + ' &nbsp;|&nbsp; 📊 ' + d.runs;
                        """, hud_info)
                    except Exception:
                        pass

                    # 4. Quản lý chuyển cảnh: xem 80% đến 95% độ dài thật
                    target_end = dur - 6 if dur > 30 else 520
                    if ended or (dur > 30 and cur >= target_end):
                        self.mainRuns += 1
                        self.step = (self.step + 1) % len(self.my_vids)
                        next_vid = self.my_vids[self.step]
                        self.status = f"Nghỉ 6s ➔ Tìm kiếm {next_vid['title'][:14]}..."
                        time.sleep(6)
                        last_progress_cur = -1
                        stuck_seconds = 0
                        self.search_and_navigate_to_video(next_vid)

                except Exception as loop_e:
                    err_msg = str(loop_e)
                    if "no such window" in err_msg or "target window already closed" in err_msg or "invalid session id" in err_msg:
                        self.status = "Tự phục hồi cửa sổ..."
                        try:
                            self.close()
                            time.sleep(2)
                            self.init_driver()
                            curr_vid = self.my_vids[self.step]
                            self.search_and_navigate_to_video(curr_vid)
                            time.sleep(3)
                            self.snap_to_desktop()
                            self.is_alive = True
                        except Exception:
                            pass
                    else:
                        self.status = f"Lỗi: {err_msg[:25]}"
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
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)
    except Exception:
        pass

    print("=" * 85, flush=True)
    print("🎬 HỆ THỐNG CÀY VIEW 7 TRÌNH DUYỆT (TỰ NHIÊN + CHỐNG TREO AUTO-UNSTUCK)", flush=True)
    print("✓ Chrome | Edge (Fixed Sleep) | Brave | Cốc Cốc | Firefox (Fixed Eager) | Opera | Opera GX (Fixed Tabs)", flush=True)
    print("✓ KHÔNG MỞ LINK TRỰC TIẾP: Tìm kiếm YouTube Search tự nhiên -> Click video", flush=True)
    print("✓ AUTO-UNSTUCK WATCHDOG: Tự động phát hiện và giải cứu nếu dừng hình quá 25-50s", flush=True)
    print("✓ Tự động xếp lưới 7 cửa sổ (Hàng 1: 4 cửa sổ | Hàng 2: 3 cửa sổ) | KHÔNG THU NHỎ MÀN HÌNH", flush=True)
    print("✓ MỖI MÀN HÌNH DÙNG GIAO DIỆN KHÁC NHAU (Theme Tối/Sáng, Zoom 90%-105%, Quality, CC)", flush=True)
    print("✓ KHỞI ĐỘNG SO LE LỆCH PHA (cách nhau 15-20s)", flush=True)
    print("✓ TẬP TRUNG TỐI ĐA 100% TÀI NGUYÊN CHO 2 VIDEO ƯU TIÊN:", flush=True)
    print("   1. Video Ưu Tiên 1: Đức - 19:43 (bDpFup17nrQ)", flush=True)
    print("   2. Video Ưu Tiên 2: Tôi Mất 6 Năm... - 8:41 (v--oP2aezgI)", flush=True)
    print("✓ TỰ ĐỘNG XOAY WI-FI (MinhLaConMeoDay <-> VNTT-RD) sau mỗi 30 phút", flush=True)
    print("=" * 85, flush=True)

    curr_ssid = get_current_connected_ssid()
    curr_ip = get_public_ip_quick()
    SHARED_STATE["ssid"] = curr_ssid
    SHARED_STATE["ip"] = curr_ip
    print(f"🌐 MẠNG HIỆN TẠI: {curr_ssid} | ĐỊA CHỈ IP: {curr_ip}", flush=True)
    print("=" * 85, flush=True)

    workers = []
    # 7 trình duyệt khởi động so le lệch pha (0s, 15s, 30s, 45s, 60s, 75s, 90s)
    for i in range(len(BROWSER_SPECS)):
        w_id = i + 1
        tile = TILES[i]
        delay = i * 15
        w = GUIWorker(w_id, tile, delay)
        workers.append(w)
        w.start()

    status_file = ROOT_DIR / "tmp" / "streamer_status.json"
    status_file.parent.mkdir(parents=True, exist_ok=True)

    last_wifi_switch = time.time()
    wifi_idx = 0
    if curr_ssid == WIFI_ROTATION_LIST[0]:
        wifi_idx = 1
    else:
        wifi_idx = 0

    try:
        while True:
            time.sleep(3)
            now = time.time()
            elapsed_wifi = int(now - last_wifi_switch)
            remaining_wifi = max(0, WIFI_ROTATE_INTERVAL_SECONDS - elapsed_wifi)
            rem_str = f"{remaining_wifi//60:02d}:{remaining_wifi%60:02d}"

            # Cập nhật mạng thực tế
            real_ssid = get_current_connected_ssid()
            if real_ssid != curr_ssid and real_ssid in WIFI_ROTATION_LIST:
                curr_ssid = real_ssid
                curr_ip = get_public_ip_quick()

            SHARED_STATE["rem_str"] = rem_str
            SHARED_STATE["ssid"] = curr_ssid
            SHARED_STATE["ip"] = curr_ip

            # Ghi trạng thái ra file JSON
            status_data = {
                "active_browsers": len([w for w in workers if w.is_alive]),
                "total_browsers": len(workers),
                "current_ssid": curr_ssid,
                "current_ip": curr_ip,
                "wifi_next_switch_in": rem_str,
                "workers": [
                    {
                        "id": w.worker_id,
                        "browser": w.browser_name,
                        "style": w.style["desc"],
                        "status": w.status,
                        "title": w.title,
                        "time": f"{w.currentTime}/{w.durationTime}",
                        "completed_runs": w.mainRuns,
                        "total_time": w.totalTime
                    }
                    for w in workers
                ]
            }

            try:
                with open(status_file, "w", encoding="utf-8") as f:
                    json.dump(status_data, f, ensure_ascii=False, indent=2)
            except Exception:
                pass

            # Xoay Wi-Fi định kỳ 30 phút
            if elapsed_wifi >= WIFI_ROTATE_INTERVAL_SECONDS:
                target_ssid = WIFI_ROTATION_LIST[wifi_idx]
                print(f"\n[🔄] ĐẾN HẠN XOAY WI-FI (30 phút): Đang chuyển sang {target_ssid}...", flush=True)
                new_ip = switch_to_wifi(target_ssid)
                if new_ip:
                    curr_ssid = target_ssid
                    curr_ip = new_ip
                    SHARED_STATE["ssid"] = curr_ssid
                    SHARED_STATE["ip"] = curr_ip
                wifi_idx = (wifi_idx + 1) % len(WIFI_ROTATION_LIST)
                last_wifi_switch = time.time()

    except KeyboardInterrupt:
        print("\n[*] Đang dừng toàn bộ 7 trình duyệt...", flush=True)
        for w in workers:
            w.close()

if __name__ == "__main__":
    main()
