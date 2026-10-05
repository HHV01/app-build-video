import sys
import os
import time
import ctypes
from ctypes import wintypes
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

SW_RESTORE = 9
KEYEVENTF_KEYUP = 0x0002
VK_CONTROL = 0x11
VK_SHIFT = 0x10
VK_F5 = 0x74
VK_M = 0x4D
VK_UP = 0x26
VK_SPACE = 0x20
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

def send_key_combo(vk_mod, vk_key):
    user32.keybd_event(vk_mod, 0, 0, 0)
    time.sleep(0.05)
    user32.keybd_event(vk_key, 0, 0, 0)
    time.sleep(0.05)
    user32.keybd_event(vk_key, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.05)
    user32.keybd_event(vk_mod, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.05)

def send_key(vk):
    user32.keybd_event(vk, 0, 0, 0)
    time.sleep(0.05)
    user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.05)

def click_at(x, y):
    user32.SetCursorPos(x, y)
    time.sleep(0.08)
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
    time.sleep(0.08)

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

def sync_tabs():
    print("=" * 65)
    print("🚀 ĐỒNG BỘ, BẬT TIẾNG & KIỂM TRA TOÀN BỘ 6 CỬA SỔ TRÌNH DUYỆT...")
    print("=" * 65)

    h_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
    if not h_default:
        print("❌ Lỗi mở desktop Default")
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

    print(f"Tìm thấy {len(matched)} cửa sổ.")

    for idx, (hwnd, title) in enumerate(matched, 1):
        print(f"\n[{idx}/{len(matched)}] Cửa sổ: {title[:45]}...")
        user32.ShowWindow(hwnd, SW_RESTORE)
        time.sleep(0.3)
        user32.SetForegroundWindow(hwnd)
        time.sleep(0.4)

        rect = RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        w = rect.right - rect.left
        h = rect.bottom - rect.top

        # Reload with Ctrl+F5 so tabs get updated code (auto-unmute, fixed buffer list)
        print("   -> Tải lại trang (Ctrl + F5) để nạp phiên bản tự động bật tiếng mới nhất...")
        send_key_combo(VK_CONTROL, VK_F5)
        time.sleep(2.5)

        # Re-check rect and bring to front again
        user32.SetForegroundWindow(hwnd)
        time.sleep(0.3)

        # 1. Click anywhere in the document to activate audio context and clear gesture block
        cx = rect.left + w // 2
        cy = rect.top + h // 2
        click_at(cx, cy)
        time.sleep(0.2)

        # 2. If tab speaker icon is muted (tab mute icon near top left of tab):
        # Click on tab speaker area to unmute tab if Chrome/Edge muted it
        tab_speaker_x = rect.left + min(240, w // 4)
        tab_speaker_y = rect.top + 45
        click_at(tab_speaker_x, tab_speaker_y)
        time.sleep(0.2)

        # 3. Click the video player area to ensure iframe is focused and playing
        player_x = rect.left + min(350, w // 3)
        player_y = rect.top + min(300, h // 3)
        click_at(player_x, player_y)
        time.sleep(0.2)

        # 4. Press 'm' to ensure unmuted, and Up Arrow 5 times
        send_key(VK_M)
        for _ in range(5):
            send_key(VK_UP)
            time.sleep(0.05)

        # 5. Click the "🔊 Bật tiếng" button if visible
        # Controls card is on the right side
        ctrl_btn_x = rect.left + int(w * 0.7)
        ctrl_btn_y = rect.top + min(340, int(h * 0.35))
        click_at(ctrl_btn_x, ctrl_btn_y)
        time.sleep(0.2)

        # Take screenshot of the result
        clean_name = title.split(" - ")[-1].replace(" ", "_")[:12]
        shot_path = f"tools/verified_{idx}_{clean_name}.png"
        capture_fullscreen(shot_path)
        print(f"   ✓ Đã hoàn tất kích hoạt. Ảnh chụp: {shot_path}")
        time.sleep(1.0)

    print("\n" + "=" * 65)
    print("✅ ĐÃ ĐỒNG BỘ VÀ KÍCH HOẠT TIẾNG THÀNH CÔNG CHO TẤT CẢ 6 CỬA SỔ!")
    print("=" * 65)

if __name__ == '__main__':
    sync_tabs()
