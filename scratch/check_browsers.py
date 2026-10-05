import os
import subprocess

browsers = {
    'Chrome': r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'Edge': r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'Brave': r'C:\Users\VNTT\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe',
    'CocCoc': r'C:\Program Files\CocCoc\Browser\Application\browser.exe',
    'Firefox': r'C:\Program Files\Mozilla Firefox\firefox.exe',
    'Opera': r'C:\Users\VNTT\AppData\Local\Programs\Opera\opera.exe'
}

for name, path in browsers.items():
    if os.path.exists(path):
        cmd = ['powershell', '-NoProfile', '-Command', f'(Get-Item \'{path}\').VersionInfo.ProductVersion']
        res = subprocess.run(cmd, capture_output=True, text=True)
        print(f"{name}: {res.stdout.strip()} ({path})")
    else:
        print(f"{name}: Not found")
