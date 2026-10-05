import ctypes
from ctypes import wintypes
import sys

sys.stdout.reconfigure(encoding='utf-8')
user32 = ctypes.windll.user32

windows = []
def enum_windows_proc(hwnd, extra):
    length = user32.GetWindowTextLengthW(hwnd)
    if length > 0:
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buff, length + 1)
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        windows.append((hwnd, pid.value, buff.value))
    return True

hwinsta = user32.OpenWindowStationW("WinSta0", False, 0x037F)
if hwinsta:
    user32.SetProcessWindowStation(hwinsta)
hdesk = user32.OpenDesktopW("Default", 0, False, 0x01FF)
if hdesk:
    user32.SetThreadDesktop(hdesk)

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
user32.EnumDesktopWindows(hdesk, WNDENUMPROC(enum_windows_proc), 0)

print(f"Total windows found: {len(windows)}")
for h, pid, t in windows:
    if any(k in t.lower() for k in ['chrome', 'opera', 'edge', 'cốc', 'coccoc', 'milo', 'stream', 'youtube']):
        print(f"[{pid}] {t}")
