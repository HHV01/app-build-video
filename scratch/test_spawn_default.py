import ctypes
from ctypes import wintypes
import subprocess
import time

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

h_winsta = user32.OpenWindowStationW("WinSta0", False, 0x037F)
user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW("Default", 0, False, 0x01FF)
user32.SetThreadDesktop(h_desk)

# Now launch a test notepad
p = subprocess.Popen(["notepad.exe"])
time.sleep(1)

# Enum windows on Default desktop
found = []
def enum_cb(hwnd, lparam):
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    if pid.value == p.pid:
        found.append(hwnd)
    return True

cb = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)(enum_cb)
user32.EnumDesktopWindows(h_desk, cb, 0)
print(f"Notepad PID: {p.pid}, Found on Default desktop: {found}")

p.terminate()
