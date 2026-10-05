import os
import sys
import ctypes
from ctypes import wintypes

def run():
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    curr_desk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
    desk_buf = ctypes.create_unicode_buffer(256)
    user32.GetUserObjectInformationW(curr_desk, 2, desk_buf, 256, None)
    if desk_buf.value == "Default" or "--child" in sys.argv:
        import pyvda
        import win32gui
        import win32con

        desk2 = pyvda.VirtualDesktop(2)
        print("Moving workers to Desktop 2...")

        def enum_cb(hwnd, res):
            if win32gui.IsWindowVisible(hwnd):
                title = win32gui.GetWindowText(hwnd)
                if any(f"YT_STREAMER_WORKER_{i}" in title for i in range(1, 5)) or "YouTube Smart Streamer" in title:
                    res.append((hwnd, title))
            return True

        targets = []
        win32gui.EnumWindows(enum_cb, targets)
        for hwnd, title in targets:
            try:
                pyvda.AppView(hwnd).move(desk2)
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                print(f"Moved: hwnd={hwnd} | title={title}")
            except Exception as e:
                print(f"Err {hwnd}: {e}")
        return

    # Elevate via CreateProcessW
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
    run()
