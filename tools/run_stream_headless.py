"""Headless runner for YouTube Smart Streamer.

Runs Chrome headlessly in the background, automatically streaming and interleaving
videos while reporting live status to stdout.
"""

import sys
import time
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

# Force UTF-8 output on Windows console
sys.stdout.reconfigure(encoding='utf-8')

STREAM_URL = "http://localhost:5500/youtube_stream_tool.html"

def get_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--mute-audio")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--autoplay-policy=no-user-gesture-required")
    options.add_argument("--window-size=1280,800")
    
    # Modern Chrome User Agent
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    )
    
    driver = webdriver.Chrome(options=options)
    return driver

def run():
    print("=" * 60, flush=True)
    print("🚀 Đang khởi động YouTube Stream Tool ở chế độ chạy ngầm...", flush=True)
    print(f"🔗 URL: {STREAM_URL}", flush=True)
    print("=" * 60, flush=True)

    driver = None
    try:
        driver = get_driver()
        driver.get(STREAM_URL)
        print("✓ Đã nạp trang web thành công.", flush=True)

        # Wait for YouTube Iframe API to initialize
        time.sleep(5)

        # Ensure streaming is active
        is_running = driver.execute_script("return typeof isRunning !== 'undefined' ? isRunning : false;")
        if not is_running:
            print("▶ Kích hoạt stream...", flush=True)
            driver.execute_script("""
                if (typeof toggleStream === 'function' && !isRunning) {
                    toggleStream();
                }
            """)

        last_report_time = 0
        while True:
            time.sleep(10)
            now = time.time()

            try:
                state = driver.execute_script("""
                    return {
                        status: document.getElementById('statusText') ? document.getElementById('statusText').innerText : 'N/A',
                        title: document.getElementById('displayTitle') ? document.getElementById('displayTitle').innerText : 'N/A',
                        currentTime: document.getElementById('currentTime') ? document.getElementById('currentTime').innerText : '0:00',
                        durationTime: document.getElementById('durationTime') ? document.getElementById('durationTime').innerText : '0:00',
                        mainRuns: document.getElementById('statMainRuns') ? document.getElementById('statMainRuns').innerText : '0',
                        bufferRuns: document.getElementById('statBufferRuns') ? document.getElementById('statBufferRuns').innerText : '0',
                        totalTime: document.getElementById('statTotalTime') ? document.getElementById('statTotalTime').innerText : '00:00:00',
                        isRunning: typeof isRunning !== 'undefined' ? isRunning : false
                    };
                """)

                # If it stopped for any reason, restart it
                if not state.get('isRunning'):
                    driver.execute_script("""
                        if (typeof toggleStream === 'function' && !isRunning) {
                            toggleStream();
                        }
                    """)

                # Print report every 10-20 seconds
                if now - last_report_time >= 15:
                    last_report_time = now
                    print(
                        f"[{state['totalTime']}] Trạng thái: {state['status']} | "
                        f"Video: {state['title'][:35]}... ({state['currentTime']}/{state['durationTime']}) | "
                        f"Lượt chính: {state['mainRuns']} | Lượt đệm: {state['bufferRuns']}",
                        flush=True
                    )

            except Exception as loop_err:
                print(f"⚠️ Lỗi đọc trạng thái: {loop_err}", flush=True)

    except KeyboardInterrupt:
        print("\n🛑 Nhận tín hiệu dừng từ người dùng.", flush=True)
    except Exception as e:
        print(f"❌ Lỗi chạy stream ngầm: {e}", flush=True)
    finally:
        if driver:
            try:
                driver.quit()
                print("✓ Đã đóng trình duyệt chạy ngầm an toàn.", flush=True)
            except Exception:
                pass

if __name__ == '__main__':
    run()
