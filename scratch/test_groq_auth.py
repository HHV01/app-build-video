import urllib.request
import urllib.error
import json

req = urllib.request.Request('http://localhost:20128/api/providers', headers={'Authorization': 'Bearer omniroute'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

for c in data.get('connections', []):
    if c.get('provider') == 'groq':
        k = c.get('apiKey')
        name = c.get('name')
        print(f"Testing key for '{name}' ({k[:10]}...{k[-5:]}):")
        r2 = urllib.request.Request('https://api.groq.com/openai/v1/models', headers={'Authorization': f'Bearer {k}', 'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(r2, timeout=6) as resp2:
                print('  Models count:', len(json.loads(resp2.read().decode('utf-8'))['data']))
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code}: {e.read().decode('utf-8', errors='ignore')}")
