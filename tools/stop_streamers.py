import subprocess
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("[*] Đang tìm và dừng các tiến trình streamer qua PowerShell/CIM...", flush=True)

ps_cmd = """
Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine | ConvertTo-Json -Compress
"""

try:
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, encoding="utf-8", errors="replace")
    data = json.loads(res.stdout)
    if isinstance(data, dict):
        data = [data]
except Exception as e:
    print(f"Error querying processes: {e}")
    sys.exit(1)

kill_count = 0
for proc in data:
    pid = proc.get("ProcessId")
    name = (proc.get("Name") or "").lower()
    cmd = (proc.get("CommandLine") or "").lower()

    is_worker = "launch_gui_streamers" in cmd or "--child-worker" in cmd
    is_streamer_browser = "gui_chrome_profiles" in cmd
    is_driver = name in ["chromedriver.exe", "msedgedriver.exe", "geckodriver.exe"]

    if (is_worker or is_streamer_browser or is_driver) and pid:
        print(f"[-] Đang dừng PID {pid}: {name}", flush=True)
        subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True)
        kill_count += 1

print(f"[+] Hoàn tất! Đã tắt {kill_count} tiến trình liên quan đến hệ thống streamer.", flush=True)
