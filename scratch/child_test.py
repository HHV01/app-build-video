import ctypes
from ctypes import wintypes
import time

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

h_winsta = user32.OpenWindowStationW("WinSta0", False, 0x037F)
user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW("Default", 0, False, 0x01FF)
user32.SetThreadDesktop(h_desk)

curr_desk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
desk_buf = ctypes.create_unicode_buffer(256)
user32.GetUserObjectInformationW(curr_desk, 2, desk_buf, 256, None)
print(f"[Child Script] Current Desktop: {desk_buf.value}")

# Test launching a real Chrome with Selenium
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

opts = Options()
opts.add_argument("--mute-audio")
opts.add_argument("--window-position=-1900,380")
opts.add_argument("--window-size=900,500")

print("[Child Script] Starting Chrome...")
driver = webdriver.Chrome(options=opts)
driver.get("http://localhost:5500/youtube_stream_tool.html")
print("[Child Script] Navigated! Sleeping 8s so parent can take screenshot...")
time.sleep(8)
driver.quit()
print("[Child Script] Done!")
