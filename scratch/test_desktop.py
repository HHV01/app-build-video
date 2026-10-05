import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

DESKTOP_ALL = 0x01FF

# Open Window Station WinSta0
h_winsta = user32.OpenWindowStationW("WinSta0", False, 0x037F)
print("OpenWindowStation:", h_winsta)
if h_winsta:
    user32.SetProcessWindowStation(h_winsta)

# Open Desktop Default
h_desk = user32.OpenDesktopW("Default", 0, False, DESKTOP_ALL)
print("OpenDesktop Default:", h_desk)
if h_desk:
    ret = user32.SetThreadDesktop(h_desk)
    print("SetThreadDesktop result:", ret)
    if not ret:
        print("SetThreadDesktop error:", kernel32.GetLastError())
    else:
        curr_desk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
        desk_buf = ctypes.create_unicode_buffer(256)
        user32.GetUserObjectInformationW(curr_desk, 2, desk_buf, 256, None)
        print("Current Thread Desktop is now:", desk_buf.value)
