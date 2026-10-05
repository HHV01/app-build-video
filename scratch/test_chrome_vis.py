import ctypes
import subprocess
import time
from PIL import ImageGrab

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW("WinSta0", False, 0x037F)
user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW("Default", 0, False, 0x01FF)
user32.SetThreadDesktop(h_desk)

orig_popen = subprocess.Popen
def patched_popen(*args, **kwargs):
    startupinfo = kwargs.get('startupinfo')
    if startupinfo is None:
        startupinfo = subprocess.STARTUPINFO()
    startupinfo.lpDesktop = 'WinSta0\\Default'
    kwargs['startupinfo'] = startupinfo
    return orig_popen(*args, **kwargs)

subprocess.Popen = patched_popen

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

opts = Options()
opts.add_argument("--mute-audio")
# Place on Monitor 2 (Left monitor: -1920 to 0, Top: 365)
opts.add_argument("--window-position=-1900,380")
opts.add_argument("--window-size=900,500")

print("Launching test Chrome on Default desktop...")
driver = webdriver.Chrome(options=opts)
driver.get("http://localhost:5500/youtube_stream_tool.html")
time.sleep(3)

# Take screenshot
im = ImageGrab.grab(all_screens=True)
im.save("scratch/test_chrome_visible.png")
print("Screenshot saved to scratch/test_chrome_visible.png")

time.sleep(5)
driver.quit()
print("Done!")
