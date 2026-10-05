"""Launch Opera GX directly on the user's interactive Desktop (WinSta0\\Default).
"""

import sys
import time
import ctypes
from ctypes import wintypes

sys.stdout.reconfigure(encoding='utf-8')

kernel32 = ctypes.windll.kernel32
user32 = ctypes.windll.user32

class STARTUPINFOW(ctypes.Structure):
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
        ('lpReserved2', ctypes.POINTER(ctypes.c_byte)),
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

def launch():
    si = STARTUPINFOW()
    si.cb = ctypes.sizeof(STARTUPINFOW)
    si.lpDesktop = "WinSta0\\Default"
    pi = PROCESS_INFORMATION()

    app_path = r"C:\Users\VNTT\AppData\Local\Programs\Opera GX\opera.exe"
    work_dir = r"C:\Users\VNTT\AppData\Local\Programs\Opera GX"
    cmd = f'"{app_path}" http://localhost:5500/youtube_stream_tool.html'

    print("🚀 Đang khởi động Opera GX trực tiếp lên màn hình Desktop của bạn...")
    res = kernel32.CreateProcessW(
        None,
        cmd,
        None,
        None,
        False,
        0,
        None,
        work_dir,
        ctypes.byref(si),
        ctypes.byref(pi)
    )

    if res:
        print(f"✓ Đã kích hoạt Opera GX thành công (PID {pi.dwProcessId}).")
        kernel32.CloseHandle(pi.hProcess)
        kernel32.CloseHandle(pi.hThread)
    else:
        err = kernel32.GetLastError()
        print(f"❌ Lỗi CreateProcess: mã lỗi {err}")

if __name__ == '__main__':
    launch()
