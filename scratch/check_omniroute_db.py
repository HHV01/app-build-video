import sqlite3
import json

db_path = r'C:\Users\VNTT\.omniroute\storage.sqlite'
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cur.fetchall()]
print("Tables:", tables)

for t in tables:
    cur.execute(f"PRAGMA table_info({t});")
    cols = [c[1] for c in cur.fetchall()]
    cur.execute(f"SELECT * FROM {t} LIMIT 10;")
    rows = cur.fetchall()
    print(f"\n--- Table {t} ({len(rows)} samples) ---")
    for r in rows:
        row_dict = dict(zip(cols, r))
        # Mask sensitive keys if any
        for k in row_dict:
            if 'key' in k.lower() or 'token' in k.lower() or 'secret' in k.lower():
                val = str(row_dict[k])
                row_dict[k] = val[:6] + "..." if len(val) > 8 else "***"
        print(row_dict)
