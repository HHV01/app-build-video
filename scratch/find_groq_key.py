import sqlite3

conn = sqlite3.connect(r'C:\Users\VNTT\.omniroute\storage.sqlite')
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [r[0] for r in cur.fetchall()]

for t in tables:
    try:
        cur.execute(f"SELECT * FROM {t}")
        rows = cur.fetchall()
        for row in rows:
            row_str = str(row)
            if 'gsk_' in row_str or 'groq' in row_str.lower():
                print(f"Table {t}: found match!")
                # Find columns
                cur.execute(f"PRAGMA table_info({t})")
                cols = [c[1] for c in cur.fetchall()]
                d = dict(zip(cols, row))
                # show keys
                for k, v in d.items():
                    if isinstance(v, str) and 'gsk_' in v:
                        print(f"  Field {k}: {v[:8]}...{v[-4:]}")
                    elif k in ['id', 'provider', 'name', 'account']:
                        print(f"  {k}: {v}")
    except Exception:
        pass
