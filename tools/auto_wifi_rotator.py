"""Dedicated Wi-Fi IP Rotator for Streamers.
Tự động xoay giữa MinhLaConMeoDay và VNTT-RD mỗi 30 phút.
Sử dụng WlanScan trước khi kết nối để đảm bảo 100% quét thấy mạng và đổi IP thành công.
"""

import sys
import time
import json
import subprocess
import ctypes
from ctypes import wintypes
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT_DIR = Path(__file__).resolve().parents[1]
STATUS_FILE = ROOT_DIR / "tmp" / "streamer_status.json"

WIFI_LIST = ["MinhLaConMeoDay", "VNTT-RD"]
INTERVAL_SECONDS = 30 * 60 # 30 phút

def trigger_wlan_scan():
    try:
        wlanapi = ctypes.windll.wlanapi
        class GUID(ctypes.Structure):
            _fields_ = [("Data1", wintypes.DWORD), ("Data2", wintypes.WORD), ("Data3", wintypes.WORD), ("Data4", wintypes.BYTE * 8)]
        class WLAN_INTERFACE_INFO(ctypes.Structure):
            _fields_ = [("InterfaceGuid", GUID), ("strInterfaceDescription", wintypes.WCHAR * 256), ("isState", wintypes.DWORD)]
        class WLAN_INTERFACE_INFO_LIST(ctypes.Structure):
            _fields_ = [("dwNumberOfItems", wintypes.DWORD), ("dwIndex", wintypes.DWORD), ("InterfaceInfo", WLAN_INTERFACE_INFO * 1)]

        hClient = wintypes.HANDLE()
        negotiated = wintypes.DWORD()
        if wlanapi.WlanOpenHandle(2, None, ctypes.byref(negotiated), ctypes.byref(hClient)) == 0:
            pIfList = ctypes.POINTER(WLAN_INTERFACE_INFO_LIST)()
            if wlanapi.WlanEnumInterfaces(hClient, None, ctypes.byref(pIfList)) == 0:
                if pIfList.contents.dwNumberOfItems > 0:
                    guid = pIfList.contents.InterfaceInfo[0].InterfaceGuid
                    wlanapi.WlanScan(hClient, ctypes.byref(guid), None, None, None)
            wlanapi.WlanCloseHandle(hClient, None)
    except Exception:
        pass

def get_current_connected_ssid():
    try:
        out = subprocess.check_output(['netsh', 'wlan', 'show', 'interfaces'], text=True, errors='ignore')
        for line in out.splitlines():
            if 'SSID' in line and 'BSSID' not in line and ':' in line:
                return line.split(':', 1)[1].strip()
    except Exception:
        pass
    return "N/A"

def get_public_ip():
    for url in ['https://api.ipify.org', 'https://icanhazip.com']:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'curl/7.68.0'})
            with urllib.request.urlopen(req, timeout=4) as r:
                return r.read().decode('utf-8').strip()
        except Exception:
            pass
    return "N/A"

def switch_wifi(target_ssid):
    print(f"\n[🔄] Đang quét sóng và chuyển sang: {target_ssid}...", flush=True)
    trigger_wlan_scan()
    time.sleep(2)
    subprocess.run(['netsh', 'wlan', 'connect', f'name={target_ssid}'], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(10):
        time.sleep(2)
        curr = get_current_connected_ssid()
        if curr == target_ssid:
            ip = get_public_ip()
            print(f"[✓] Đã đổi mạng thành công sang: {target_ssid} | IP: {ip}\n", flush=True)
            return ip
    return None

def update_status_file(curr_ssid, curr_ip, rem_str):
    try:
        if STATUS_FILE.exists():
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["current_ssid"] = curr_ssid
            data["current_ip"] = curr_ip
            data["wifi_next_switch_in"] = rem_str
            with open(STATUS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def main():
    print("=" * 60, flush=True)
    print("🌐 BỘ TỰ ĐỘNG XOAY WI-FI (VNTT-RD <-> MinhLaConMeoDay)", flush=True)
    print(f"✓ Chu kỳ đổi IP: {INTERVAL_SECONDS // 60} phút / lần", flush=True)
    print("=" * 60, flush=True)

    curr_ssid = get_current_connected_ssid()
    curr_ip = get_public_ip()
    print(f"[*] Mạng ban đầu: {curr_ssid} | IP: {curr_ip}", flush=True)

    last_switch = time.time()

    while True:
        time.sleep(3)
        now = time.time()
        elapsed = int(now - last_switch)
        remaining = max(0, INTERVAL_SECONDS - elapsed)
        rem_str = f"{remaining // 60:02d}:{remaining % 60:02d}"

        # Kiểm tra nếu SSID thay đổi
        real_ssid = get_current_connected_ssid()
        if real_ssid != curr_ssid and real_ssid in WIFI_LIST:
            curr_ssid = real_ssid
            curr_ip = get_public_ip()
            print(f"[i] Nhận diện mạng hiện tại: {curr_ssid} | IP: {curr_ip}", flush=True)

        update_status_file(curr_ssid, curr_ip, rem_str)

        if elapsed >= INTERVAL_SECONDS:
            target = WIFI_LIST[0] if curr_ssid == WIFI_LIST[1] else WIFI_LIST[1]
            new_ip = switch_wifi(target)
            if new_ip:
                curr_ssid = target
                curr_ip = new_ip
            last_switch = time.time()

if __name__ == "__main__":
    main()
