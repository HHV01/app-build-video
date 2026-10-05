import ctypes
from ctypes import wintypes
import sys
import os

kernel32 = ctypes.windll.kernel32

h_read = wintypes.HANDLE()
h_write = wintypes.HANDLE()

class SECURITY_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ('nLength', wintypes.DWORD),
        ('lpSecurityDescriptor', ctypes.c_void_p),
        ('bInheritHandle', wintypes.BOOL)
    ]

sa = SECURITY_ATTRIBUTES()
sa.nLength = ctypes.sizeof(SECURITY_ATTRIBUTES)
sa.bInheritHandle = True
sa.lpSecurityDescriptor = None

kernel32.CreatePipe(ctypes.byref(h_read), ctypes.byref(h_write), ctypes.byref(sa), 0)
kernel32.SetHandleInformation(h_read, 1, 0)

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
si.dwFlags = 0x00000100 # STARTF_USESTDHANDLES
si.hStdOutput = h_write
si.hStdError = h_write
si.hStdInput = kernel32.GetStdHandle(-10)

pi = PROCESS_INFORMATION()

cmd = f'"{sys.executable}" -u tools/launch_gui_streamers.py --child-worker'
ret = kernel32.CreateProcessW(
    None, cmd, None, None, True, 0, None, None,
    ctypes.byref(si), ctypes.byref(pi)
)
print("CreateProcessW return:", ret, "PID:", pi.dwProcessId)

kernel32.CloseHandle(h_write)

buf = ctypes.create_string_buffer(4096)
bytes_read = wintypes.DWORD()
for _ in range(10):
    success = kernel32.ReadFile(h_read, buf, 4096, ctypes.byref(bytes_read), None)
    if not success or bytes_read.value == 0:
        print("Pipe closed or empty, err:", kernel32.GetLastError())
        break
    print("CHILD OUTPUT:", buf.raw[:bytes_read.value].decode('utf-8', errors='ignore'))

# Check if process is alive
exit_code = wintypes.DWORD()
kernel32.GetExitCodeProcess(pi.hProcess, ctypes.byref(exit_code))
print("Child process exit code:", exit_code.value)

# Take screenshot of user desktop to see if Chrome windows appeared!
from PIL import ImageGrab
h_desk = ctypes.windll.user32.OpenDesktopW("Default", 0, False, 0x01FF)
ctypes.windll.user32.SetThreadDesktop(h_desk)
im = ImageGrab.grab(all_screens=True)
im.save("scratch/test_spawn_worker_result.png")
print("Saved screenshot to scratch/test_spawn_worker_result.png")
