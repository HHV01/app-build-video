import subprocess
import time
import urllib.request
import re

def run_cmd(cmd):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        return p.stdout.strip()
    except Exception as e:
        return str(e)

# 1. Clean up drivers
for driver in ["chromedriver.exe", "msedgedriver.exe", "geckodriver.exe"]:
    subprocess.run(f"taskkill /F /IM {driver} /T", capture_output=True, shell=True)

def get_current_wifi():
    out = run_cmd("netsh wlan show interfaces")
    m = re.search(r"^\s*SSID\s*:\s*(.+)$", out, re.MULTILINE)
    if m:
        return m.group(1).strip()
    return "Unknown"

def get_public_ip():
    urls = [
        "https://api.ipify.org",
        "https://icanhazip.com",
        "https://ifconfig.me/ip"
    ]
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'curl/7.68.0'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                ip = resp.read().decode('utf-8').strip()
                if ip:
                    return ip
        except Exception:
            pass
    return "Khong the lay IP (Mat mang)"

print("=== KIEM TRA IP CUA 2 MANG WI-FI ===")

# Check mang 1: MinhLaConMeoDay
print("\n[1] Dang ket noi toi Wi-Fi: MinhLaConMeoDay...")
run_cmd('netsh wlan connect name="MinhLaConMeoDay"')
time.sleep(6)
ssid1 = get_current_wifi()
ip1 = get_public_ip()
print(f"-> SSID hien tai: {ssid1}")
print(f"-> Public IP: {ip1}")

# Check mang 2: VNTT-RD
print("\n[2] Dang ket noi toi Wi-Fi: VNTT-RD...")
run_cmd('netsh wlan connect name="VNTT-RD"')
time.sleep(6)
ssid2 = get_current_wifi()
ip2 = get_public_ip()
print(f"-> SSID hien tai: {ssid2}")
print(f"-> Public IP: {ip2}")

# Chuyen ve lai mang tot hon hoac giu nguyen
print("\n=== KET QUA TONG HOP ===")
print(f"Wi-Fi [MinhLaConMeoDay] -> IP Public: {ip1}")
print(f"Wi-Fi [VNTT-RD]         -> IP Public: {ip2}")
