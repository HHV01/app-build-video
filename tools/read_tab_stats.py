import sys
import time
import ctypes
from ctypes import wintypes
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

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
        if any(k in t_lower for k in ['chrome', 'edge', 'brave', 'cốc cốc', 'opera']):
            if not any(ex in t_lower for ex in ['antigravity', 'settings']):
                matched.append((hwnd, pid.value, title))
    return True

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
user32.EnumDesktopWindows(h_default, WNDENUMPROC(callback), 0)

print(f"Tìm thấy {len(matched)} cửa sổ trình duyệt:")

w_screen = user32.GetSystemMetrics(0)
h_screen = user32.GetSystemMetrics(1)
hdesktop = user32.GetDesktopWindow()
hdc = user32.GetWindowDC(hdesktop)
memdc = gdi32.CreateCompatibleDC(hdc)
hbitmap = gdi32.CreateCompatibleBitmap(hdc, w_screen, h_screen)
gdi32.SelectObject(memdc, hbitmap)

class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ('biSize', wintypes.DWORD), ('biWidth', wintypes.LONG), ('biHeight', wintypes.LONG),
        ('biPlanes', wintypes.WORD), ('biBitCount', wintypes.WORD), ('biCompression', wintypes.DWORD),
        ('biSizeImage', wintypes.DWORD), ('biXPelsPerMeter', wintypes.LONG), ('biYPelsPerMeter', wintypes.LONG),
        ('biClrUsed', wintypes.DWORD), ('biClrImportant', wintypes.DWORD)
    ]
bmi = BITMAPINFOHEADER()
bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
bmi.biWidth = w_screen
bmi.biHeight = -h_screen
bmi.biPlanes = 1
bmi.biBitCount = 32

for idx, (hwnd, pid, title) in enumerate(matched, 1):
    user32.ShowWindow(hwnd, 9)
    time.sleep(0.15)
    user32.BringWindowToTop(hwnd)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.4)

    rect = wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))

    gdi32.BitBlt(memdc, 0, 0, w_screen, h_screen, hdc, 0, 0, 0x00CC0020)
    buffer = ctypes.create_string_buffer(w_screen * h_screen * 4)
    gdi32.GetDIBits(memdc, hbitmap, 0, h_screen, buffer, ctypes.byref(bmi), 0)
    im = Image.frombuffer('RGBA', (w_screen, h_screen), buffer, 'raw', 'BGRA', 0, 1)

    box = (max(0, rect.left), max(0, rect.top), min(w_screen, rect.right), min(h_screen, rect.bottom))
    cropped = im.crop(box)
    
    # Save both full window and crop of the stats card area
    # Stats row is around x: 50 to 500, y: 550 to 750 inside the window
    app_tag = "browser"
    for k in ['edge', 'chrome', 'opera', 'brave', 'coccoc', 'cốc']:
        if k in title.lower():
            app_tag = k
            break
    img_name = f"tools/stat_{idx}_{app_tag}_{pid}.png"
    cropped.save(img_name)
    print(f"[{idx}] {title[:40]} -> {img_name}")

gdi32.DeleteObject(hbitmap)
gdi32.DeleteDC(memdc)
user32.ReleaseDC(hdesktop, hdc)
print("Hoàn tất chụp thông số tất cả các tab!")
