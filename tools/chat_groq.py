"""Chat and Prompt Generator tool using Groq via OmniRoute."""
import sys
import json
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT_DIR / ".env"

base_url = "http://localhost:20128/v1"
api_key = "omniroute"
model = "free-ai"

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

def ask_groq(prompt, override_model=None):
    use_model = override_model or model
    endpoint = f"{base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": use_model,
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
    with urllib.request.urlopen(req, timeout=45) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return content, usage, use_model

if __name__ == '__main__':
    args = sys.argv[1:]
    target_model = None
    if "--model" in args:
        idx = args.index("--model")
        if idx + 1 < len(args):
            target_model = args[idx + 1]
            args = args[:idx] + args[idx + 2:]

    prompt = " ".join(args) if args else "Chào bạn! Hãy giới thiệu ngắn gọn khả năng của bạn và vì sao bạn chạy siêu tốc trên Groq."

    print(f"▶ Đang gửi prompt tới Groq ({target_model or model})...\n", flush=True)
    print("Prompt:", prompt, flush=True)
    print("=" * 60, flush=True)
    
    reply, usage, used_model = ask_groq(prompt, target_model)
    print(reply, flush=True)
    print("=" * 60, flush=True)
    
    comp_tokens = usage.get('completion_tokens', 0)
    comp_time = usage.get('completion_time', 0.0001)
    speed = comp_tokens / comp_time if comp_time else 0
    total_time = usage.get('total_time', 0)
    print(f"⚡ Model: {used_model} | {comp_tokens} tokens | Thời gian: {total_time:.2f}s | Tốc độ: {speed:.1f} tokens/s", flush=True)
