import sqlite3
conn = sqlite3.connect("pillmate.db")
try:
    conn.execute("ALTER TABLE prescriptions ADD COLUMN image_uri TEXT DEFAULT ''")
    conn.commit()
    print("Added image_uri column")
except Exception as e:
    print(f"Column may already exist: {e}")
conn.close()
