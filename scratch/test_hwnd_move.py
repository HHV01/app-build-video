import ctypes
from ctypes import wintypes
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW('WinSta0', False, 0x037F)
user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(h_desk)

from pyvda import AppView, VirtualDesktop, get_virtual_desktops

def get_hwnd_by_title_keyword(keyword):
    found_hwnd = [None]
    def cb(hwnd, lp):
        if user32.IsWindowVisible(hwnd):
            len_t = user32.GetWindowTextLengthW(hwnd)
            if len_t > 0:
                buf = ctypes.create_unicode_buffer(len_t + 1)
                user32.GetWindowTextW(hwnd, buf, len_t + 1)
                if keyword in buf.value:
                    found_hwnd[0] = hwnd
                    return False
        return True
    user32.EnumWindows(ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)(cb), 0)
    return found_hwnd[0]

print("Available Virtual Desktops:", [d.number for d in get_virtual_desktops()])
