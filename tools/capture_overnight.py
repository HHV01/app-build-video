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

windows = [
    (1510428, 'edge'),
    (1904622, 'brave'),
    (5049144, 'coccoc'),
    (3342396, 'opera'),
    (4524950, 'chrome2'),
    (12978730, 'chrome1')
]

for hwnd, tag in windows:
    user32.ShowWindow(hwnd, 9) # SW_RESTORE
    time.sleep(0.3)
    user32.BringWindowToTop(hwnd)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.5)

    rect = wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))

    gdi32.BitBlt(memdc, 0, 0, w_screen, h_screen, hdc, 0, 0, 0x00CC0020)
    buffer = ctypes.create_string_buffer(w_screen * h_screen * 4)
    gdi32.GetDIBits(memdc, hbitmap, 0, h_screen, buffer, ctypes.byref(bmi), 0)
    im = Image.frombuffer('RGBA', (w_screen, h_screen), buffer, 'raw', 'BGRA', 0, 1)

    x1 = max(0, min(rect.left, rect.right))
    y1 = max(0, min(rect.top, rect.bottom))
    x2 = min(w_screen, max(rect.left, rect.right))
    y2 = min(h_screen, max(rect.top, rect.bottom))

    if x2 > x1 and y2 > y1:
        cropped = im.crop((x1, y1, x2, y2))
        fname = f'tools/overnight_{tag}.png'
        cropped.save(fname)
        print(f'Captured {fname} (Rect: {x1},{y1} -> {x2},{y2})')
    else:
        print(f'Skipped {tag} - invalid rect {rect.left}, {rect.top}')

gdi32.DeleteObject(hbitmap)
gdi32.DeleteDC(memdc)
user32.ReleaseDC(hdesktop, hdc)
print('Done!')
