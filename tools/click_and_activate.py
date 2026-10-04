"""Automate window activation and click on all open browsers.

Finds each browser window on the user's interactive desktop (WinSta0\\Default),
restores it, brings it to foreground, and clicks the middle of the window
to trigger video autoplay and unmute.
"""

import sys
import time
import ctypes
from ctypes import wintypes

sys.stdout.reconfigure(encoding='utf-8')

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

SW_RESTORE = 9
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
VK_SPACE = 0x20
KEYEVENTF_KEYUP = 0x0002

class RECT(ctypes.Structure):
    _fields_ = [
        ('left', wintypes.LONG),
        ('top', wintypes.LONG),
        ('right', wintypes.LONG),
        ('bottom', wintypes.LONG)
    ]

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

def launch_on_default(cmd_str):
    si = STARTUPINFOW()
    si.cb = ctypes.sizeof(STARTUPINFOW)
    si.lpDesktop = "WinSta0\\Default"
    pi = PROCESS_INFORMATION()
    res = kernel32.CreateProcessW(None, cmd_str, None, None, False, 0, None, None, ctypes.byref(si), ctypes.byref(pi))
    if res:
        kernel32.CloseHandle(pi.hProcess)
        kernel32.CloseHandle(pi.hThread)
    return res

def click_and_activate():
    print("=" * 65)
    print("🎯 Bắt đầu tự động kích hoạt và click vào các cửa sổ trình duyệt...")
    print("=" * 65)

    # 1. Open the user's interactive desktop
    h_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
    if not h_default:
        print("❌ Không thể mở Desktop Default của người dùng.")
        return

    user32.SetThreadDesktop(h_default)

    # 2. Enumerate visible windows on Default desktop
    matched_windows = []
    
    def enum_callback(hwnd, lparam):
        if not user32.IsWindowVisible(hwnd):
            return True
        
        # Check window rect
        rect = RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        w = rect.right - rect.left
        h = rect.bottom - rect.top
        if w < 300 or h < 200:
            return True

        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            title = buff.value.strip()

            title_lower = title.lower()
            # Match any browser or YouTube window
            browser_keywords = [
                'chrome', 'edge', 'brave', 'cốc cốc', 'opera', 'firefox',
                'youtube', 'milo', 'streamer'
            ]
            
            # Exclude IDE, File Explorer, Settings, UltraViewer
            exclude_keywords = ['antigravity', 'file explorer', 'settings', 'ultraviewer', 'task manager']
            
            if any(k in title_lower for k in browser_keywords) and not any(ex in title_lower for ex in exclude_keywords):
                matched_windows.append((hwnd, title, rect))
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumDesktopWindows(h_default, WNDENUMPROC(enum_callback), 0)

    print(f"🔍 Tìm thấy {len(matched_windows)} cửa sổ trình duyệt cần kích hoạt.")

    if not matched_windows:
        print("⚠️ Không tìm thấy cửa sổ trình duyệt nào trên màn hình.")
        print("Đang khởi động lại các trình duyệt trực tiếp lên màn hình chính...")
        browsers_cmd = [
            r'"C:\Program Files\Google\Chrome\Application\chrome.exe" http://localhost:5500/youtube_stream_tool.html',
            r'msedge.exe http://localhost:5500/youtube_stream_tool.html',
            r'"C:\Users\VNTT\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" http://localhost:5500/youtube_stream_tool.html',
            r'"C:\Program Files\CocCoc\Browser\Application\browser.exe" http://localhost:5500/youtube_stream_tool.html',
            r'"C:\Users\VNTT\AppData\Local\Programs\Opera\opera.exe" http://localhost:5500/youtube_stream_tool.html',
        ]
        for cmd in browsers_cmd:
            launch_on_default(cmd)
            time.sleep(1)
        time.sleep(3)
        user32.EnumDesktopWindows(h_default, WNDENUMPROC(enum_callback), 0)

    for i, (hwnd, title, rect) in enumerate(matched_windows, 1):
        try:
            print(f"\n👉 [{i}/{len(matched_windows)}] Đang kích hoạt: {title[:45]}...")

            # Restore and bring to front
            user32.ShowWindow(hwnd, SW_RESTORE)
            time.sleep(0.2)
            user32.SetForegroundWindow(hwnd)
            time.sleep(0.4)

            # Re-read rect after restore
            user32.GetWindowRect(hwnd, ctypes.byref(rect))
            cx = (rect.left + rect.right) // 2
            cy = (rect.top + rect.bottom) // 2

            # Move mouse to center and click
            user32.SetCursorPos(cx, cy)
            time.sleep(0.15)
            user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            time.sleep(0.08)
            user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            time.sleep(0.15)

            # Also click slightly higher to hit the video player area if controls were at center
            user32.SetCursorPos(cx, max(rect.top + 150, cy - 80))
            time.sleep(0.1)
            user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            time.sleep(0.08)
            user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)

            print(f"   ✓ Đã click vào tọa độ ({cx}, {cy}) để kích hoạt phát video.")
            time.sleep(1.0)
        except Exception as e:
            print(f"   ⚠️ Lỗi click cửa sổ: {e}")

    print("\n" + "=" * 65)
    print("✅ ĐÃ HOÀN TẤT CLICK TỰ ĐỘNG VÀO TOÀN BỘ CÁC CỬA SỔ TRÌNH DUYỆT!")
    print("=" * 65)

if __name__ == '__main__':
    click_and_activate()
