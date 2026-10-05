import ctypes
from ctypes import wintypes
import time
import sys
from PIL import ImageGrab

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

h_winsta = user32.OpenWindowStationW("WinSta0", False, 0x037F)
user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW("Default", 0, False, 0x01FF)
user32.SetThreadDesktop(h_desk)

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
        ('hStdError', wintypes.HANDLE),
    ]

class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [
        ('hProcess', wintypes.HANDLE),
        ('hThread', wintypes.HANDLE),
        ('dwProcessId', wintypes.DWORD),
        ('dwThreadId', wintypes.DWORD),
    ]

si = STARTUPINFO()
si.cb = ctypes.sizeof(STARTUPINFO)
si.lpDesktop = 'WinSta0\\Default'
pi = PROCESS_INFORMATION()

cmd = f'"{sys.executable}" scratch/child_test.py'
print(f"Launching via CreateProcessW on WinSta0\\Default: {cmd}")
ret = kernel32.CreateProcessW(
    None, cmd, None, None, False, 0, None, None,
    ctypes.byref(si), ctypes.byref(pi)
)
print("CreateProcessW return:", ret, "PID:", pi.dwProcessId)

# Wait 5s for Chrome to appear
time.sleep(5)

# Take screenshot
im = ImageGrab.grab(all_screens=True)
im.save("scratch/test_chrome_launched_visible.png")
print("Saved screenshot to scratch/test_chrome_launched_visible.png")

# Wait for process to exit
kernel32.WaitForSingleObject(pi.hProcess, 15000)
kernel32.CloseHandle(pi.hProcess)
kernel32.CloseHandle(pi.hThread)
print("Finished test!")
