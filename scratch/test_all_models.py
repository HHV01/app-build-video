import urllib.request
import urllib.error
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

candidates = [
    'free-ai',
    'ddgw/gpt-4o-mini',
    'ddgw/mistral-small-2501',
    'tllm/together_deepseek_v3',
    'tllm/openrouter_deepseek_r1',
    'tllm/sonar-pro',
    'tllm/GPT_4o',
    'tllm/claude_sonnet_4',
    'tllm/openrouter_grok_4',
    'aug/claude-sonnet-4.6',
    'aug/gemini-3.0-flash',
    'oc/nemotron-3-super-free',
    'auto/best-fast',
    'auto/chat',
    'auto/best-free'
]

working_models = []

for m in candidates:
    payload = {
        'model': m,
        'messages': [{'role': 'user', 'content': '1+1=? Answer 2 only.'}],
        'max_tokens': 10
    }
    req = urllib.request.Request(
        'http://localhost:20128/v1/chat/completions',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Authorization': 'Bearer omniroute', 'Content-Type': 'application/json'}
    )
    try:
        t0 = time.time()
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            reply = data['choices'][0]['message']['content'].strip()
            dt = int((time.time() - t0) * 1000)
            print(f"[OK] {m} ({dt}ms): {reply}")
            working_models.append(m)
    except urllib.error.HTTPError as e:
        err = e.read().decode('utf-8', errors='ignore')[:120]
        print(f"[FAIL] {m} ({e.code}): {err}")
    except Exception as e:
        print(f"[FAIL] {m}: {str(e)[:100]}")

print("\n--- Summary of Working Models ---")
print(working_models)
