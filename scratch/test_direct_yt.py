import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

driver_path = r'C:\Users\VNTT\.cache\selenium\chromedriver\win64\154.0.8037.92\chromedriver.exe'
opts = Options()
opts.add_argument('--mute-audio')
opts.add_argument('--disable-session-crashed-bubble')
opts.add_argument('--autoplay-policy=no-user-gesture-required')
opts.add_argument('--window-size=960,515')

s = Service(driver_path)
d = webdriver.Chrome(service=s, options=opts)
url = 'https://www.youtube.com/watch?v=v--oP2aezgI'
print('Navigating directly to YouTube URL:', url)
d.get(url)
time.sleep(5)

# Check video element state
state = d.execute_script("""
    var v = document.querySelector('video');
    if (!v) return { found: false };
    if (v.paused) v.play();
    return {
        found: true,
        paused: v.paused,
        currentTime: v.currentTime,
        duration: v.duration,
        title: document.title
    };
""")
print('Direct YouTube Video State:', state)
time.sleep(3)
d.quit()
