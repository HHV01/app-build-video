import ctypes
from ctypes import wintypes
import sys
import os

kernel32 = ctypes.windll.kernel32

# Create Pipe
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
kernel32.SetHandleInformation(h_read, 1, 0) # HANDLE_FLAG_INHERIT = 1

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
si.hStdInput = kernel32.GetStdHandle(-10) # STD_INPUT_HANDLE

pi = PROCESS_INFORMATION()

cmd = f'"{sys.executable}" -c "print(\'Hello from child on WinSta0\\\\Default!\')"'
ret = kernel32.CreateProcessW(
    None, cmd, None, None, True, 0, None, None,
    ctypes.byref(si), ctypes.byref(pi)
)
print("CreateProcessW ret:", ret, "PID:", pi.dwProcessId)

# Close write handle in parent so EOF is triggered when child finishes
kernel32.CloseHandle(h_write)

# Read pipe
buf = ctypes.create_string_buffer(4096)
bytes_read = wintypes.DWORD()
output = []
while True:
    success = kernel32.ReadFile(h_read, buf, 4096, ctypes.byref(bytes_read), None)
    if not success or bytes_read.value == 0:
        break
    output.append(buf.raw[:bytes_read.value].decode('utf-8', errors='ignore'))

kernel32.CloseHandle(h_read)
kernel32.CloseHandle(pi.hProcess)
kernel32.CloseHandle(pi.hThread)

print("Child Output Captured:")
print("".join(output))
