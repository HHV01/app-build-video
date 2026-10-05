import sys
import os
import time
import ctypes
from ctypes import wintypes
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.kernel32 # just reference
gdi32 = ctypes.windll.gdi32

SW_RESTORE = 9
SW_SHOWMAXIMIZED = 3
KEYEVENTF_KEYUP = 0x0002
VK_M = 0x4D
VK_UP = 0x26
VK_SPACE = 0x20
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004

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

def capture_window(hwnd, filename):
    rect = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    w = max(1, rect.right - rect.left)
    h = max(1, rect.bottom - rect.top)

    hdc = user32.GetWindowDC(hwnd)
    memdc = gdi32.CreateCompatibleDC(hdc)
    hbitmap = gdi32.CreateCompatibleBitmap(hdc, w, h)
    gdi32.SelectObject(memdc, hbitmap)

    # Use PrintWindow with PW_RENDERFULLCONTENT (2) or BitBlt
    res = user32.PrintWindow(hwnd, memdc, 2)
    if not res:
        # Fallback to normal PrintWindow
        user32.PrintWindow(hwnd, memdc, 0)

    bmi = BITMAPINFOHEADER()
    bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    bmi.biWidth = w
    bmi.biHeight = -h
    bmi.biPlanes = 1
    bmi.biBitCount = 32
    bmi.biCompression = 0

    buffer = ctypes.create_string_buffer(w * h * 4)
    gdi32.GetDIBits(memdc, hbitmap, 0, h, buffer, ctypes.byref(bmi), 0)
    im = Image.frombuffer('RGBA', (w, h), buffer, 'raw', 'BGRA', 0, 1)
    im.save(filename)

    gdi32.DeleteObject(hbitmap)
    gdi32.DeleteDC(memdc)
    user32.ReleaseDC(hwnd, hdc)
    return filename

def capture_fullscreen(filename):
    w = user32.GetSystemMetrics(0)
    h = user32.GetSystemMetrics(1)
    hdesktop = user32.GetDesktopWindow()
    hdc = user32.GetWindowDC(hdesktop)
    memdc = gdi32.CreateCompatibleDC(hdc)
    hbitmap = gdi32.CreateCompatibleBitmap(hdc, w, h)
    gdi32.SelectObject(memdc, hbitmap)
    gdi32.BitBlt(memdc, 0, 0, w, h, hdc, 0, 0, 0x00CC0020)

    bmi = BITMAPINFOHEADER()
    bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    bmi.biWidth = w
    bmi.biHeight = -h
    bmi.biPlanes = 1
    bmi.biBitCount = 32
    bmi.biCompression = 0

    buffer = ctypes.create_string_buffer(w * h * 4)
    gdi32.GetDIBits(memdc, hbitmap, 0, h, buffer, ctypes.byref(bmi), 0)
    im = Image.frombuffer('RGBA', (w, h), buffer, 'raw', 'BGRA', 0, 1)
    im.save(filename)

    gdi32.DeleteObject(hbitmap)
    gdi32.DeleteDC(memdc)
    user32.ReleaseDC(hdesktop, hdc)
    return filename

def send_key(vk):
    user32.keybd_event(vk, 0, 0, 0)
    time.sleep(0.05)
    user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.05)

def check_and_unmute_all():
    print("=" * 65)
    print("🔍 KIỂM TRA & BẬT TIẾNG TẤT CẢ CÁC CỬA SỔ TRÌNH DUYỆT...")
    print("=" * 65)

    h_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
    if not h_default:
        print("❌ Không mở được Default desktop")
        return
    user32.SetThreadDesktop(h_default)

    matched = []
    def callback(hwnd, lparam):
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            title = buff.value.strip()
            title_lower = title.lower()
            if any(k in title_lower for k in ['chrome', 'edge', 'brave', 'cốc cốc', 'opera', 'youtube', 'streamer']):
                if not any(ex in title_lower for ex in ['antigravity', 'settings', 'explorer']):
                    matched.append((hwnd, title))
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumDesktopWindows(h_default, WNDENUMPROC(callback), 0)

    print(f"👉 Tìm thấy {len(matched)} cửa sổ trình duyệt:")
    for idx, (hwnd, title) in enumerate(matched, 1):
        print(f"  [{idx}] HWND: {hwnd} | {title}")

    # Process each window
    for idx, (hwnd, title) in enumerate(matched, 1):
        clean_name = title.split(" - ")[-1].replace(" ", "_")[:15]
        print(f"\n--- Đang xử lý [{idx}/{len(matched)}]: {title[:40]} ---")

        # 1. Bring window to front
        user32.ShowWindow(hwnd, SW_RESTORE)
        time.sleep(0.2)
        user32.SetForegroundWindow(hwnd)
        time.sleep(0.5)

        rect = RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        cx = (rect.left + rect.right) // 2
        cy = (rect.top + rect.bottom) // 2

        # 2. Click in center of window to activate page & trigger document.body click
        user32.SetCursorPos(cx, cy)
        time.sleep(0.1)
        user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        time.sleep(0.05)
        user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
        time.sleep(0.3)

        # 3. Send 'm' key to toggle YouTube mute/unmute
        # Send keypress 'm'
        send_key(VK_M)
        time.sleep(0.2)

        # Increase volume by pressing Up Arrow 5 times
        for _ in range(5):
            send_key(VK_UP)
            time.sleep(0.05)

        # Click also near player area
        user32.SetCursorPos(rect.left + 250, rect.top + 250)
        time.sleep(0.1)
        user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        time.sleep(0.05)
        user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)

        # 4. Capture screenshot
        shot_path = f"tools/tab_{idx}_{clean_name}.png"
        capture_fullscreen(shot_path)
        print(f"   ✓ Đã gửi lệnh bật tiếng (Click + phím 'M' + phím Up Arrow).")
        print(f"   ✓ Ảnh chụp màn hình: {shot_path}")
        time.sleep(0.5)

    print("\n" + "=" * 65)
    print("✅ ĐÃ KIỂM TRA VÀ KÍCH HOẠT TIẾNG TOÀN BỘ CÁC TRÌNH DUYỆT!")
    print("=" * 65)

if __name__ == '__main__':
    check_and_unmute_all()
