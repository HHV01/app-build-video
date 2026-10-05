import ctypes
import ctypes.wintypes
import subprocess

user32 = ctypes.windll.user32

def enum_chrome_windows():
    results = []
    def win_cb(hwnd, lParam):
        class_buf = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, class_buf, 256)
        cls = class_buf.value
        
        if cls == "Chrome_WidgetWin_1":
            length = user32.GetWindowTextLengthW(hwnd)
            title_buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, title_buf, length + 1)
            title = title_buf.value
            
            r = ctypes.wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(r))
            is_visible = user32.IsWindowVisible(hwnd)
            
            pid = ctypes.wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            
            results.append({
                "hwnd": hwnd,
                "title": title,
                "class": cls,
                "rect": (r.left, r.top, r.right, r.bottom),
                "visible": is_visible,
                "pid": pid.value
            })
        return True

    cb_proto = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    user32.EnumWindows(cb_proto(win_cb), 0)
    return results

wins = enum_chrome_windows()
print(f"Total Chrome_WidgetWin_1 found: {len(wins)}")
for w in wins:
    print(w)
