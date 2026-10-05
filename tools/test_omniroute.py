"""OmniRoute Connection Tester and Model Query Tool for Python."""

import os
import sys
import json
import time
import urllib.request
from pathlib import Path

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT_DIR / ".env"

base_url = "http://localhost:20128/v1"
api_key = "omniroute"
model = "auto"

if ENV_PATH.exists():
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                if k == "OPENAI_BASE_URL":
                    base_url = v
                elif k == "OPENAI_API_KEY":
                    api_key = v
                elif k == "OPENAI_MODEL":
                    model = v

if len(sys.argv) > 1:
    model = sys.argv[1]

print("=" * 60, flush=True)
print("🤖 KIỂM TRA KẾT NỐI OMNIROUTE AI GATEWAY (PYTHON)", flush=True)
print("=" * 60, flush=True)
print(f"🌐 Base URL: {base_url}", flush=True)
print(f"🧠 Model:    {model}", flush=True)
print(f"🔑 Key:      {api_key[:10]}...", flush=True)
print("-" * 60, flush=True)

endpoint = f"{base_url.rstrip('/')}/chat/completions"

payload = {
    "model": model,
    "stream": False,
    "temperature": 0.2,
    "max_tokens": 150,
    "messages": [
        {"role": "user", "content": "Trả lời ngắn gọn bằng tiếng Việt: Bạn là ai và đang chạy qua provider nào?"}
    ]
}

data_bytes = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(
    endpoint,
    data=data_bytes,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
)

start_time = time.time()
print(f"⏳ Đang gửi request test tới {endpoint}...", flush=True)

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        duration_ms = int((time.time() - start_time) * 1000)
        res_data = json.loads(resp.read().decode('utf-8'))
        reply = res_data.get("choices", [{}])[0].get("message", {}).get("content", "(Không có phản hồi)")
        
        print(f"✅ Kết nối thành công! ({duration_ms}ms)", flush=True)
        print("-" * 60, flush=True)
        print(f"💬 Phản hồi:\n{reply.strip()}", flush=True)
        print("-" * 60, flush=True)
        usage = res_data.get("usage")
        if usage:
            print(f"📊 Token usage: prompt={usage.get('prompt_tokens')}, completion={usage.get('completion_tokens')}, total={usage.get('total_tokens')}", flush=True)

except urllib.error.HTTPError as e:
    err_body = e.read().decode('utf-8', errors='ignore')
    print(f"❌ Lỗi phản hồi HTTP ({e.code}): {err_body}", flush=True)
    print("\n💡 Gợi ý: Hãy kiểm tra Dashboard tại http://localhost:20128/dashboard để xem cấu hình provider.", flush=True)
except Exception as e:
    print(f"❌ Không thể kết nối tới OmniRoute: {e}", flush=True)
    print("\n💡 OmniRoute có thể chưa được khởi động:", flush=True)
    print("👉 Chạy lệnh: npm run omniroute (hoặc chạy start_omniroute.bat)", flush=True)
    print("👉 Mở Dashboard: npm run omniroute:dashboard", flush=True)
