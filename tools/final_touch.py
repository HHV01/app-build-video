import sys
import time
import ctypes
from ctypes import wintypes
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

SW_RESTORE = 9
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
VK_F5 = 0x74
VK_CONTROL = 0x11
KEYEVENTF_KEYUP = 0x0002

class RECT(ctypes.Structure):
    _fields_ = [
        ('left', wintypes.LONG),
        ('top', wintypes.LONG),
        ('right', wintypes.LONG),
        ('bottom', wintypes.LONG)
    ]

def click_at(x, y):
    user32.SetCursorPos(x, y)
    time.sleep(0.08)
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
    time.sleep(0.1)

def run_touches():
    h_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
    user32.SetThreadDesktop(h_default)

    matched = []
    def callback(hwnd, lparam):
        if not user32.IsWindowVisible(hwnd): return True
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            title = buff.value.strip()
            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            t_lower = title.lower()
            if any(k in t_lower for k in ['chrome', 'edge', 'brave', 'cốc cốc', 'opera']):
                if not any(ex in t_lower for ex in ['antigravity', 'settings']):
                    matched.append((hwnd, pid.value, title))
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumDesktopWindows(h_default, WNDENUMPROC(callback), 0)

    for hwnd, pid, title in matched:
        t_lower = title.lower()
        user32.ShowWindow(hwnd, SW_RESTORE)
        time.sleep(0.2)
        user32.SetForegroundWindow(hwnd)
        time.sleep(0.3)

        rect = RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        w = rect.right - rect.left
        h = rect.bottom - rect.top

        # Opera: Click YouTube player speaker button (top right of video player)
        if 'opera' in t_lower:
            print(f"👉 Opera: Bật tiếng trên video YouTube...")
            # Speaker icon is around top right of the player box
            click_at(rect.left + 322, rect.top + 318)
            time.sleep(0.2)
            # Also send 'm'
            user32.keybd_event(0x4D, 0, 0, 0)
            time.sleep(0.05)
            user32.keybd_event(0x4D, 0, KEYEVENTF_KEYUP, 0)
            time.sleep(0.2)

        # Chrome 2 (HWND 4524950): Resume playback
        if 'chrome' in t_lower and hwnd == 4524950:
            print(f"👉 Chrome 2: Tiếp tục phát...")
            click_at(rect.left + 520, rect.top + 315)
            time.sleep(0.3)

        # Edge (HWND 1510428): Resume playback
        if 'edge' in t_lower:
            print(f"👉 Edge: Tiếp tục phát...")
            click_at(rect.left + 190, rect.top + 270) # play button on video
            time.sleep(0.2)
            click_at(rect.left + 500, rect.top + 260)
            time.sleep(0.2)

        # Brave: Toggle Shields or Reload
        if 'brave' in t_lower:
            print(f"👉 Brave: Tắt Brave Shields trên localhost để cho phép embed...")
            # Lion icon at right side of omnibox
            click_at(rect.left + 728, rect.top + 58)
            time.sleep(0.5)
            # Click toggle switch inside popup
            click_at(rect.left + 728, rect.top + 160)
            time.sleep(0.5)
            # Press Esc to close popup
            user32.keybd_event(0x1B, 0, 0, 0)
            user32.keybd_event(0x1B, 0, KEYEVENTF_KEYUP, 0)

    print("Hoàn tất tinh chỉnh!")

if __name__ == '__main__':
    run_touches()
