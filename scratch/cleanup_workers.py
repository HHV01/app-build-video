import subprocess
import re

out = subprocess.check_output(['wmic', 'process', 'where', 'name="chrome.exe"', 'get', 'processid,commandline'], text=True, errors='ignore')
killed = 0
for line in out.splitlines():
    if 'gui_chrome_profiles' in line:
        parts = line.strip().split()
        if parts:
            pid = parts[-1]
            if pid.isdigit():
                subprocess.call(['taskkill', '/F', '/PID', pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                killed += 1
print(f"Killed {killed} worker Chrome processes.")
