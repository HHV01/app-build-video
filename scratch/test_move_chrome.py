import ctypes
from ctypes import wintypes
import time
from pyvda import AppView, VirtualDesktop, get_virtual_desktops

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW('WinSta0', False, 0x037F)
user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(h_desk)

def move_hwnd_to_desktop(hwnd, desktop_num=2):
    try:
        view = AppView(hwnd)
        d = VirtualDesktop(desktop_num)
        view.move(d)
        print(f"Successfully moved HWND {hwnd} to Desktop {desktop_num}!")
        return True
    except Exception as e:
        print(f"Failed to move HWND {hwnd}: {e}")
        return False

# Test with a newly launched chrome
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

opts = Options()
opts.add_argument("--mute-audio")
opts.add_argument("--window-size=800,600")

print("Launching Chrome...")
driver = webdriver.Chrome(options=opts)
driver.get("http://localhost:5500/youtube_stream_tool.html")
time.sleep(2)

# Find chrome top-level HWND
def find_chrome_hwnds():
    hwnds = []
    def cb(h, lp):
        if user32.IsWindowVisible(h):
            cls_buf = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(h, cls_buf, 256)
            if cls_buf.value == "Chrome_WidgetWin_1":
                r = wintypes.RECT()
                user32.GetWindowRect(h, ctypes.byref(r))
                if (r.right - r.left) > 200:
                    hwnds.append(h)
        return True
    user32.EnumWindows(ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)(cb), 0)
    return hwnds

found = find_chrome_hwnds()
print("Found Chrome HWNDs:", found)
for h in found:
    move_hwnd_to_desktop(h, 2)

time.sleep(5)
driver.quit()
print("Done test!")
