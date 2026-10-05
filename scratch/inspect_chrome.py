import ctypes
from ctypes import wintypes
import json
import subprocess

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

# Get list of chrome processes from tasklist
out = subprocess.check_output(['tasklist', '/FI', 'IMAGENAME eq chrome.exe', '/FO', 'CSV'], text=True)
pids = []
for line in out.splitlines()[1:]:
    parts = line.strip().split('","')
    if len(parts) >= 2:
        try:
            pid = int(parts[1].replace('"', ''))
            pids.append(pid)
        except:
            pass

print(f"Total chrome PIDs running: {len(pids)}")

# Check all windows across all desktops
found_windows = []
def enum_all(hwnd, lparam):
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    if pid.value in pids:
        r = wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(r))
        is_vis = bool(user32.IsWindowVisible(hwnd))
        
        len_t = user32.GetWindowTextLengthW(hwnd)
        t_buf = ctypes.create_unicode_buffer(len_t + 1)
        user32.GetWindowTextW(hwnd, t_buf, len_t + 1)
        
        c_buf = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, c_buf, 256)
        
        # Only interested if rect is not 0x0
        w = r.right - r.left
        h = r.bottom - r.top
        if w > 50 and h > 50:
            found_windows.append({
                "hwnd": hwnd,
                "pid": pid.value,
                "visible": is_vis,
                "class": c_buf.value,
                "title": t_buf.value,
                "rect": (r.left, r.top, r.right, r.bottom),
                "w": w,
                "h": h
            })
    return True

cb = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)(enum_all)
user32.EnumWindows(cb, 0)

print(f"Windows with size > 50x50 belonging to Chrome: {len(found_windows)}")
for w in found_windows:
    print(w)
