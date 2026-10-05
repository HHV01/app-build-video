"""Chat and Prompt Generator tool using Google Gemini via OmniRoute."""
import sys
import json
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT_DIR / ".env"

base_url = "http://localhost:20128/v1"
api_key = "omniroute"
model = "gemini/gemini-3.8-flash"

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

def ask_gemini(prompt):
    endpoint = f"{base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "stream": False,
        "temperature": 0.7,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0"
        }
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        return data["choices"][0]["message"]["content"]

if __name__ == '__main__':
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
    else:
        prompt = "Chào bạn! Giới thiệu ngắn gọn 1 câu về bạn."
    print("Prompt:", prompt, flush=True)
    print("-" * 50, flush=True)
    print(ask_gemini(prompt), flush=True)
