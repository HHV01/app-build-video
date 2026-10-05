import ctypes
from ctypes import wintypes
import sys
import os
import time

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

def get_current_desktop_name():
    curr_desk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
    desk_buf = ctypes.create_unicode_buffer(256)
    user32.GetUserObjectInformationW(curr_desk, 2, desk_buf, 256, None)
    return desk_buf.value

print("Running test_self_relaunch. Current desktop:", get_current_desktop_name())

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

if "--on-default" not in sys.argv:
    print("Not on Default yet, spawning child on WinSta0\\Default...")
    si = STARTUPINFO()
    si.cb = ctypes.sizeof(STARTUPINFO)
    si.lpDesktop = 'WinSta0\\Default'
    pi = PROCESS_INFORMATION()

    cmd = f'"{sys.executable}" "{os.path.abspath(__file__)}" --on-default'
    ret = kernel32.CreateProcessW(
        None, cmd, None, None, False, 0, None, None,
        ctypes.byref(si), ctypes.byref(pi)
    )
    print("Spawned child return:", ret, "Child PID:", pi.dwProcessId)
    kernel32.WaitForSingleObject(pi.hProcess, 5000)
    kernel32.CloseHandle(pi.hProcess)
    kernel32.CloseHandle(pi.hThread)
    print("Parent finished successfully!")
else:
    print("[CHILD] Successfully running inside desktop:", get_current_desktop_name())
