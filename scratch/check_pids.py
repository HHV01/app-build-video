import ctypes
import ctypes.wintypes
import psutil

user32 = ctypes.windll.user32

parent_pid = 41100
try:
    parent = psutil.Process(parent_pid)
    children = parent.children(recursive=True)
    pids = [parent_pid] + [c.pid for c in children]
    print(f"Parent {parent_pid} has {len(children)} descendant processes.")
    for c in children:
        print(f"  PID {c.pid}: {c.name()} | cmdline: {' '.join(c.cmdline()[:3])}")
except Exception as e:
    print("Error getting children:", e)
    pids = []

windows = []
def win_cb(hwnd, lParam):
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    if pid.value in pids:
        length = user32.GetWindowTextLengthW(hwnd)
        title_buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, title_buf, length + 1)
        
        class_buf = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, class_buf, 256)
        
        r = ctypes.wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(r))
        is_visible = user32.IsWindowVisible(hwnd)
        
        windows.append({
            "hwnd": hwnd,
            "pid": pid.value,
            "title": title_buf.value,
            "class": class_buf.value,
            "rect": (r.left, r.top, r.right, r.bottom),
            "visible": is_visible
        })
    return True

cb_proto = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
user32.EnumWindows(cb_proto(win_cb), 0)

print(f"\nFound {len(windows)} windows belonging to PID {parent_pid} and children:")
for w in windows:
    print(w)
