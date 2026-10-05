import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions

chromedriver_154 = r'C:\Users\VNTT\.cache\selenium\chromedriver\win64\154.0.8037.92\chromedriver.exe'
chromedriver_152 = r'C:\Users\VNTT\.cache\selenium\chromedriver\win64\152.0.7977.82\chromedriver.exe'
msedgedriver_154 = r'C:\Users\VNTT\.cache\selenium\msedgedriver\win64\154.0.4258.53\msedgedriver.exe'

# Test 1: Chrome
try:
    co = ChromeOptions()
    co.add_argument('--headless=new')
    s = ChromeService(chromedriver_154)
    d = webdriver.Chrome(service=s, options=co)
    d.get('http://localhost:5500/youtube_stream_tool.html')
    print('1. Google Chrome: SUCCESS!')
    d.quit()
except Exception as e:
    print('1. Google Chrome: FAILED:', e)

# Test 2: Edge
try:
    eo = EdgeOptions()
    eo.add_argument('--headless=new')
    s = EdgeService(msedgedriver_154)
    d = webdriver.Edge(service=s, options=eo)
    d.get('http://localhost:5500/youtube_stream_tool.html')
    print('2. Microsoft Edge: SUCCESS!')
    d.quit()
except Exception as e:
    print('2. Microsoft Edge: FAILED:', e)

# Test 3: Brave
try:
    bo = ChromeOptions()
    bo.binary_location = r'C:\Users\VNTT\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe'
    bo.add_argument('--headless=new')
    s = ChromeService(chromedriver_154)
    d = webdriver.Chrome(service=s, options=bo)
    d.get('http://localhost:5500/youtube_stream_tool.html')
    print('3. Brave: SUCCESS!')
    d.quit()
except Exception as e:
    print('3. Brave: FAILED:', e)

# Test 4: CocCoc
try:
    co = ChromeOptions()
    co.binary_location = r'C:\Program Files\CocCoc\Browser\Application\browser.exe'
    co.add_argument('--headless=new')
    s = ChromeService(chromedriver_152)
    d = webdriver.Chrome(service=s, options=co)
    d.get('http://localhost:5500/youtube_stream_tool.html')
    print('4. Cốc Cốc: SUCCESS!')
    d.quit()
except Exception as e:
    print('4. Cốc Cốc: FAILED:', e)
