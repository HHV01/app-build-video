import sys
import os
import ctypes
from ctypes import wintypes

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def run_in_interactive():
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    curr_desk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
    desk_buf = ctypes.create_unicode_buffer(256)
    user32.GetUserObjectInformationW(curr_desk, 2, desk_buf, 256, None)

    if desk_buf.value == "Default" or "--child" in sys.argv:
        shell32 = ctypes.windll.shell32
        print(f"[*] Đang hiển thị hộp thoại xác nhận quyền Quản trị viên (UAC) để tắt Ethernet...")
        # Direct PowerShell Disable-NetAdapter command
        ps_cmd = '-NoProfile -Command "Disable-NetAdapter -Name Ethernet -Confirm:$false; Write-Host `"[THÀNH CÔNG] ĐÃ TẮT MẠNG DÂY! CHUYỂN SANG 100% WI-FI`" -ForegroundColor Green; Start-Sleep -Seconds 3"'
        ret = shell32.ShellExecuteW(None, "runas", "powershell.exe", ps_cmd, None, 1)
        if ret > 32:
            print("[✓] Đã gửi lệnh yêu cầu tắt mạng dây thành công! Vui lòng nhấn 'Yes' trên màn hình.")
        else:
            print(f"[!] ShellExecute error code: {ret}")
        return

    # Elevate via CreateProcessW to WinSta0\Default
    class STARTUPINFO(ctypes.Structure):
        _fields_ = [
            ('cb', wintypes.DWORD), ('lpReserved', wintypes.LPWSTR), ('lpDesktop', wintypes.LPWSTR),
            ('lpTitle', wintypes.LPWSTR), ('dwX', wintypes.DWORD), ('dwY', wintypes.DWORD),
            ('dwXSize', wintypes.DWORD), ('dwYSize', wintypes.DWORD), ('dwXCountChars', wintypes.DWORD),
            ('dwYCountChars', wintypes.DWORD), ('dwFillAttribute', wintypes.DWORD), ('dwFlags', wintypes.DWORD),
            ('wShowWindow', wintypes.WORD), ('cbReserved2', wintypes.WORD), ('lpReserved2', ctypes.c_char_p),
            ('hStdInput', wintypes.HANDLE), ('hStdOutput', wintypes.HANDLE), ('hStdError', wintypes.HANDLE),
        ]

    class PROCESS_INFORMATION(ctypes.Structure):
        _fields_ = [
            ('hProcess', wintypes.HANDLE), ('hThread', wintypes.HANDLE),
            ('dwProcessId', wintypes.DWORD), ('dwThreadId', wintypes.DWORD),
        ]

    class SECURITY_ATTRIBUTES(ctypes.Structure):
        _fields_ = [('nLength', wintypes.DWORD), ('lpSecurityDescriptor', ctypes.c_void_p), ('bInheritHandle', wintypes.BOOL)]

    h_read, h_write = wintypes.HANDLE(), wintypes.HANDLE()
    sa = SECURITY_ATTRIBUTES(ctypes.sizeof(SECURITY_ATTRIBUTES), None, True)
    kernel32.CreatePipe(ctypes.byref(h_read), ctypes.byref(h_write), ctypes.byref(sa), 0)
    kernel32.SetHandleInformation(h_read, 1, 0)

    si = STARTUPINFO()
    si.cb = ctypes.sizeof(STARTUPINFO)
    si.lpDesktop = 'WinSta0\\Default'
    si.dwFlags = 0x00000100
    si.hStdOutput = h_write
    si.hStdError = h_write

    pi = PROCESS_INFORMATION()
    cmd = f'"{sys.executable}" -u "{os.path.abspath(__file__)}" --child'
    if not kernel32.CreateProcessW(None, cmd, None, None, True, 0, None, None, ctypes.byref(si), ctypes.byref(pi)):
        print("CreateProcessW failed")
        return

    kernel32.CloseHandle(h_write)
    buf = ctypes.create_string_buffer(4096)
    bytes_read = wintypes.DWORD()
    while True:
        if not kernel32.ReadFile(h_read, buf, 4096, ctypes.byref(bytes_read), None) or bytes_read.value == 0:
            break
        sys.stdout.buffer.write(buf.raw[:bytes_read.value])
        sys.stdout.buffer.flush()

    kernel32.CloseHandle(h_read)
    kernel32.CloseHandle(pi.hProcess)
    kernel32.CloseHandle(pi.hThread)

if __name__ == '__main__':
    run_in_interactive()
