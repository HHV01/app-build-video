import urllib.request
import urllib.error
import json

# Fetch keys from OmniRoute connections
req = urllib.request.Request('http://localhost:20128/api/providers', headers={'Authorization': 'Bearer omniroute'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

groq_conns = [c for c in data.get('connections', []) if c.get('provider') == 'groq']
print(f"Found {len(groq_conns)} Groq connections.")

for c in groq_conns:
    name = c.get('name')
    key = c.get('apiKey')
    print(f"\n--- Testing connection '{name}' ---")
    
    # Try direct Groq API
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": "Hi! Say Hello in Vietnamese in 3 words."}],
        "max_tokens": 20
    }
    
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
    }
    
    req_direct = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
    try:
        with urllib.request.urlopen(req_direct, timeout=10) as resp_d:
            res = json.loads(resp_d.read().decode('utf-8'))
            print("Direct Groq SUCCESS:")
            print(" ", res["choices"][0]["message"]["content"])
    except urllib.error.HTTPError as e:
        print(f"Direct Groq HTTP Error {e.code}:")
        print(" ", e.read().decode('utf-8')[:300])
    except Exception as e:
        print(f"Direct Groq Error: {e}")
