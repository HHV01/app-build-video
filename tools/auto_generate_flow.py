import os
import sys
import time
import json
import urllib.request
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(r"C:\Users\VNTT\OneDrive - VNTT\Desktop\Video")
PROMPTS_FILE = ROOT_DIR / "outputs" / "germany" / "prompts_list.json"
OUTPUT_DIR = ROOT_DIR / "outputs" / "germany" / "images"
PROFILE_DIR = r"C:\Users\VNTT\.gemini\antigravity-ide\scratch\flow_bot_profile"
TARGET_PROJECT_URL = "https://flow.google.com/project/8eda747b-1aff-4f13-a079-c9bcecc6c2c2"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

with open(PROMPTS_FILE, "r", encoding="utf-8") as f:
    prompts = json.load(f)

print("="*60)
print("🤖 GOOGLE FLOW AUTO-GENERATOR BOT (143 CẢNH)")
print(f"📁 Tổng số cảnh: {len(prompts)} cảnh")
print(f"📁 Thư mục lưu ảnh: {OUTPUT_DIR}")
print("="*60)

chrome_options = Options()
chrome_options.add_argument("--disable-blink-features=AutomationControlled")
chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
chrome_options.add_experimental_option("useAutomationExtension", False)
chrome_options.add_argument(f"--user-data-dir={PROFILE_DIR}")
chrome_options.add_argument("--start-maximized")

prefs = {
    "download.default_directory": str(OUTPUT_DIR),
    "download.prompt_for_download": False,
    "download.directory_upgrade": True,
    "safebrowsing.enabled": True
}
chrome_options.add_experimental_option("prefs", prefs)

print("⏳ Đang khởi động trình duyệt Chrome...")
driver = webdriver.Chrome(options=chrome_options)

try:
    print(f"🌐 Đang mở: {TARGET_PROJECT_URL}")
    driver.get(TARGET_PROJECT_URL)
    time.sleep(5)
    
    # Kiểm tra trạng thái đăng nhập
    while True:
        curr = driver.current_url.lower()
        if "accounts.google.com" in curr or "servicelogin" in curr or "signin" in curr:
            print("\n" + "!"*60)
            print("👉 VUI LÒNG ĐĂNG NHẬP GOOGLE TRÊN CỬA SỔ CHROME VỪA MỞ RA.")
            print("(Bot sẽ tự động chờ bạn đăng nhập xong để bắt đầu chạy!)")
            print("!"*60 + "\n")
            time.sleep(3)
        else:
            # Đã vào được domain flow.google.com
            print("✅ Đã phát hiện phiên làm việc Google Flow!")
            break

    # Nếu đang ở landing page hoặc trang chủ, chuyển tiếp vào project
    if "project" not in driver.current_url:
        print(f"🔄 Điều hướng vào trang dự án: {TARGET_PROJECT_URL}")
        driver.get(TARGET_PROJECT_URL)
        time.sleep(6)

    print("\n🚀 Bắt đầu quá trình tự động hóa...")
    
    start_scene = 1
    if len(sys.argv) > 1:
        try:
            start_scene = int(sys.argv[1])
        except ValueError:
            pass

    for i in range(start_scene - 1, len(prompts)):
        item = prompts[i]
        canh_num = item["canh"]
        prompt_text = item["prompt"]
        
        print(f"\n[{canh_num}/{len(prompts)}] 👉 ĐANG XỬ LÝ CẢNH {canh_num}...")
        
        # 1. Tìm ô nhập prompt với retry
        input_el = None
        selectors = [
            "textarea",
            "div[contenteditable='true']",
            "input[placeholder*='prompt' i]",
            "textarea[placeholder*='prompt' i]",
            "[aria-label*='prompt' i]"
        ]
        
        for attempt in range(15):
            for sel in selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, sel)
                    for el in elements:
                        if el.is_displayed():
                            input_el = el
                            break
                    if input_el:
                        break
                except Exception:
                    pass
            if input_el:
                break
            print(f"   ⏳ Đang chờ giao diện tải ô prompt ({attempt+1}/15)...")
            time.sleep(2)
            
        if not input_el:
            print(f"   ⚠️ Vẫn chưa tìm thấy ô nhập prompt ở Cảnh {canh_num}. Tạm dừng 10s...")
            time.sleep(10)
            continue
            
        # 2. Xóa và điền prompt mới
        try:
            input_el.click()
            time.sleep(0.5)
            input_el.send_keys(Keys.CONTROL + "a")
            input_el.send_keys(Keys.BACKSPACE)
            time.sleep(0.3)
            
            driver.execute_script("""
                arguments[0].value = arguments[1];
                arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
                arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
            """, input_el, prompt_text)
            
            if input_el.get_attribute("contenteditable") == "true":
                driver.execute_script("""
                    arguments[0].innerText = arguments[1];
                    arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
                    arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
                """, input_el, prompt_text)
                
            time.sleep(1)
            print(f"   ✍️ Đã điền xong prompt Cảnh {canh_num} ({len(prompt_text)} ký tự)")
        except Exception as e:
            print(f"   ❌ Lỗi khi nhập prompt: {e}")
            continue

        # 3. Tìm nút Tạo và click
        btn_gen = None
        try:
            buttons = driver.find_elements(By.TAG_NAME, "button")
            for b in buttons:
                if not b.is_displayed():
                    continue
                txt = (b.text + " " + (b.get_attribute("aria-label") or "")).lower()
                classes = b.get_attribute("class") or ""
                if any(k in txt for k in ["generate", "tạo", "create"]) or "flow-button-primary" in classes:
                    btn_gen = b
                    break
                    
            if not btn_gen:
                icons = driver.find_elements(By.TAG_NAME, "mat-icon")
                for ic in icons:
                    if any(s in ic.text for s in ["send", "arrow_upward", "auto_awesome"]):
                        btn_gen = ic.find_element(By.XPATH, "./ancestor::button")
                        break
        except Exception:
            pass

        if btn_gen:
            try:
                driver.execute_script("arguments[0].click();", btn_gen)
                print(f"   ⚡ Đã bấm nút Tạo (Generate)!")
            except Exception as e:
                print(f"   ⚠️ Lỗi click nút, thử gửi phím Enter: {e}")
                input_el.send_keys(Keys.ENTER)
        else:
            input_el.send_keys(Keys.ENTER)
            print(f"   ⚡ Đã nhấn phím Enter để kích hoạt tạo!")

        # 4. Đếm ngược chờ tạo ảnh (25 giây)
        print("   ⏳ Đang chờ Google Flow xử lý tạo ảnh (25s)...")
        for sec in range(25, 0, -5):
            print(f"      Còn {sec}s...")
            time.sleep(5)

        # 5. Tự động tải ảnh về
        try:
            downloaded = False
            # Thử click nút download trong UI
            all_btns = driver.find_elements(By.CSS_SELECTOR, "button, a")
            for b in reversed(all_btns):
                if not b.is_displayed():
                    continue
                label = (b.get_attribute("aria-label") or b.text or "").lower()
                if "download" in label or "tải" in label:
                    driver.execute_script("arguments[0].click();", b)
                    print(f"   💾 Đã click nút Download Cảnh {canh_num}!")
                    downloaded = True
                    break
            
            if not downloaded:
                target_filename = f"canh_{canh_num:03d}.png"
                driver.execute_script("""
                    const imgs = Array.from(document.querySelectorAll('img')).filter(img => img.src && (img.src.includes('googleusercontent') || img.src.includes('blob:')));
                    if (imgs.length > 0) {
                        const last = imgs[imgs.length - 1];
                        fetch(last.src)
                          .then(res => res.blob())
                          .then(blob => {
                              const a = document.createElement('a');
                              a.href = URL.createObjectURL(blob);
                              a.download = arguments[0];
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                          });
                    }
                """, target_filename)
                print(f"   💾 Đã lưu ảnh {target_filename} qua Blob API!")
        except Exception as e:
            print(f"   ⚠️ Lỗi khi tải ảnh: {e}")

        time.sleep(3)

    print("\n" + "="*60)
    print("🎉 HOÀN THÀNH TẤT CẢ 143 CẢNH!")
    print(f"📁 Toàn bộ ảnh đã được lưu tại: {OUTPUT_DIR}")
    print("="*60)

except Exception as e:
    print(f"\n❌ Lỗi trong quá trình chạy: {e}")

finally:
    print("\n🛑 Nhấn Enter để kết thúc phiên...")
