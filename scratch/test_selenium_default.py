import ctypes
import subprocess
import time

user32 = ctypes.windll.user32
h_desk = user32.OpenDesktopW("Default", 0, False, 0x01FF)
user32.SetThreadDesktop(h_desk)

# Monkey-patch subprocess.Popen to always use lpDesktop = 'WinSta0\\Default'
orig_popen = subprocess.Popen

def patched_popen(*args, **kwargs):
    startupinfo = kwargs.get('startupinfo')
    if startupinfo is None:
        startupinfo = subprocess.STARTUPINFO()
    startupinfo.lpDesktop = 'WinSta0\\Default'
    kwargs['startupinfo'] = startupinfo
    return orig_popen(*args, **kwargs)

subprocess.Popen = patched_popen

# Test running a simple selenium chrome
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

opts = Options()
opts.add_argument("--mute-audio")
opts.add_argument("--window-position=-1920,365")
opts.add_argument("--window-size=800,600")

print("Starting driver with patched Popen...")
driver = webdriver.Chrome(options=opts)
print("Driver started! Navigating...")
driver.get("http://localhost:5500/youtube_stream_tool.html")
time.sleep(3)

# Check if window is visible on Default desktop
found = []
def cb(hwnd, lp):
    if user32.IsWindowVisible(hwnd):
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            b = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, b, length + 1)
            if "YouTube" in b.value or "Stream" in b.value:
                found.append((hwnd, b.value))
    return True

user32.EnumWindows(ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)(cb), 0)
print("Found on Default desktop:", found)

time.sleep(2)
driver.quit()
print("Test completed successfully!")
