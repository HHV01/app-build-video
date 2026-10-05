import sys
import time
import ctypes
from ctypes import wintypes
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
gdi32 = ctypes.windll.gdi32

SW_RESTORE = 9
SW_MAXIMIZE = 3
KEYEVENTF_KEYUP = 0x0002
VK_CONTROL = 0x11
VK_SHIFT = 0x10
VK_F5 = 0x74
VK_M = 0x4D
VK_UP = 0x26
VK_DOWN = 0x28
VK_RETURN = 0x0D
VK_ESCAPE = 0x1B
VK_L = 0x4C # Ctrl+L for address bar
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010

class RECT(ctypes.Structure):
    _fields_ = [
        ('left', wintypes.LONG),
        ('top', wintypes.LONG),
        ('right', wintypes.LONG),
        ('bottom', wintypes.LONG)
    ]

class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ('biSize', wintypes.DWORD),
        ('biWidth', wintypes.LONG),
        ('biHeight', wintypes.LONG),
        ('biPlanes', wintypes.WORD),
        ('biBitCount', wintypes.WORD),
        ('biCompression', wintypes.DWORD),
        ('biSizeImage', wintypes.DWORD),
        ('biXPelsPerMeter', wintypes.LONG),
        ('biYPelsPerMeter', wintypes.LONG),
        ('biClrUsed', wintypes.DWORD),
        ('biClrImportant', wintypes.DWORD)
    ]

def send_key(vk):
    user32.keybd_event(vk, 0, 0, 0)
    time.sleep(0.04)
    user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.04)

def send_combo(mod, vk):
    user32.keybd_event(mod, 0, 0, 0)
    time.sleep(0.04)
    user32.keybd_event(vk, 0, 0, 0)
    time.sleep(0.04)
    user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.04)
    user32.keybd_event(mod, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.04)

def click_left(x, y):
    user32.SetCursorPos(x, y)
    time.sleep(0.05)
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    time.sleep(0.04)
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
    time.sleep(0.05)

def click_right(x, y):
    user32.SetCursorPos(x, y)
    time.sleep(0.05)
    user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
    time.sleep(0.04)
    user32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
    time.sleep(0.05)

def capture(hwnd, filename):
    rect = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    w = max(100, rect.right - rect.left)
    h = max(100, rect.bottom - rect.top)

    w_screen = user32.GetSystemMetrics(0)
    h_screen = user32.GetSystemMetrics(1)
    hdesktop = user32.GetDesktopWindow()
    hdc = user32.GetWindowDC(hdesktop)
    memdc = gdi32.CreateCompatibleDC(hdc)
    hbitmap = gdi32.CreateCompatibleBitmap(hdc, w_screen, h_screen)
    gdi32.SelectObject(memdc, hbitmap)
    gdi32.BitBlt(memdc, 0, 0, w_screen, h_screen, hdc, 0, 0, 0x00CC0020)

    bmi = BITMAPINFOHEADER()
    bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    bmi.biWidth = w_screen
    bmi.biHeight = -h_screen
    bmi.biPlanes = 1
    bmi.biBitCount = 32
    bmi.biCompression = 0

    buffer = ctypes.create_string_buffer(w_screen * h_screen * 4)
    gdi32.GetDIBits(memdc, hbitmap, 0, h_screen, buffer, ctypes.byref(bmi), 0)
    im = Image.frombuffer('RGBA', (w_screen, h_screen), buffer, 'raw', 'BGRA', 0, 1)

    # Crop window
    box = (max(0, rect.left), max(0, rect.top), min(w_screen, rect.right), min(h_screen, rect.bottom))
    cropped = im.crop(box)
    cropped.save(filename)

    gdi32.DeleteObject(hbitmap)
    gdi32.DeleteDC(memdc)
    user32.ReleaseDC(hdesktop, hdc)

def navigate_url(hwnd, url):
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.2)
    # Ctrl + L to focus address bar
    send_combo(VK_CONTROL, VK_L)
    time.sleep(0.2)
    # Type URL via clipboard
    import subprocess
    subprocess.run(['powershell', '-Command', f'Set-Clipboard "{url}"'], capture_output=True)
    time.sleep(0.2)
    send_combo(VK_CONTROL, 0x56) # Ctrl+V
    time.sleep(0.2)
    send_key(VK_RETURN)
    time.sleep(2.0)

def run():
    print("=" * 65)
    print("🔧 ĐIỀU CHỈNH CHÍNH XÁC TỪNG TRÌNH DUYỆT...")
    print("=" * 65)

    h_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
    user32.SetThreadDesktop(h_default)

    matched = []
    def callback(hwnd, lparam):
        if not user32.IsWindowVisible(hwnd): return True
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            title = buff.value.strip()
            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            t_lower = title.lower()
            if any(k in t_lower for k in ['chrome', 'edge', 'brave', 'cốc cốc', 'opera', 'youtube', 'streamer', 'claude']):
                if not any(ex in t_lower for ex in ['antigravity', 'settings', 'explorer']):
                    matched.append((hwnd, pid.value, title))
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumDesktopWindows(h_default, WNDENUMPROC(callback), 0)

    for hwnd, pid, title in matched:
        t_lower = title.lower()
        print(f"\n👉 Xử lý: HWND {hwnd} | {title[:40]}")
        user32.ShowWindow(hwnd, SW_RESTORE)
        time.sleep(0.3)
        user32.SetForegroundWindow(hwnd)
        time.sleep(0.3)

        rect = RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        w = rect.right - rect.left
        h = rect.bottom - rect.top

        # Case 1: Edge navigated away -> re-navigate
        if 'edge' in t_lower and 'claude' in t_lower:
            print("   -> Điều hướng lại Edge về công cụ Stream...")
            navigate_url(hwnd, "http://localhost:5500/youtube_stream_tool.html")
            time.sleep(2.5)

        # Case 2: Chrome windows with muted tab -> Unmute site
        if 'chrome' in t_lower:
            print("   -> Bật tiếng Tab Chrome (Unmute site)...")
            # Click right on tab header
            tab_x = rect.left + min(180, w // 4)
            tab_y = rect.top + 45
            click_right(tab_x, tab_y)
            time.sleep(0.3)
            # Press 'm' to toggle mute site in Chrome
            send_key(VK_M)
            time.sleep(0.2)
            # Send Escape in case menu stayed
            send_key(VK_ESCAPE)
            time.sleep(0.1)

            # Also click speaker icon on tab directly
            click_left(rect.left + 242, tab_y)
            time.sleep(0.1)

        # Case 3: Brave -> Click start or reload if needed
        if 'brave' in t_lower:
            print("   -> Kích hoạt phát trên Brave...")
            # Click button 'Bắt đầu chạy' or body
            btn_x = rect.left + int(w * 0.45)
            btn_y = rect.top + min(340, int(h * 0.35))
            click_left(btn_x, btn_y)
            time.sleep(0.3)

        # Universal: Focus page and send 'm' (unmute YouTube) + Up Arrow
        page_center_x = rect.left + w // 2
        page_center_y = rect.top + h // 2
        click_left(page_center_x, page_center_y)
        time.sleep(0.1)

        # Press 'm' to unmute video
        send_key(VK_M)
        time.sleep(0.05)
        for _ in range(3):
            send_key(VK_UP)
            time.sleep(0.03)

        # Click green 'Đang bật tiếng / Bật tiếng ngay' button
        sound_btn_x = rect.left + int(w * 0.58)
        sound_btn_y = rect.top + min(340, int(h * 0.35))
        click_left(sound_btn_x, sound_btn_y)
        time.sleep(0.2)

        # Capture cropped screenshot
        app_name = "browser"
        for k in ['edge', 'chrome', 'opera', 'brave', 'coccoc', 'cốc']:
            if k in t_lower:
                app_name = k
                break
        shot_name = f"tools/final_{app_name}_{hwnd}.png"
        capture(hwnd, shot_name)
        print(f"   ✓ Đã chụp ảnh kết quả: {shot_name}")

    print("\n" + "=" * 65)
    print("✅ ĐÃ HOÀN TẤT ĐIỀU CHỈNH TOÀN BỘ CÁC CỬA SỔ!")
    print("=" * 65)

if __name__ == '__main__':
    run()
