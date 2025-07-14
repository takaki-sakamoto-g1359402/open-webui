import sqlite3
from pathlib import Path
from typing import Tuple

DB_PATH = Path(__file__).resolve().parent / "history.db"

def _ensure_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE IF NOT EXISTS history (partner_a TEXT, partner_b TEXT, result TEXT, ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    )
    conn.commit()
    conn.close()

_ensure_db()

def log_history(partner_a: str, partner_b: str, result: str) -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO history(partner_a, partner_b, result) VALUES (?,?,?)",
        (partner_a, partner_b, result),
    )
    conn.commit()
    conn.close()

def get_stats(name: str) -> Tuple[int, int]:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT result, COUNT(*) FROM history WHERE partner_a=? OR partner_b=? GROUP BY result",
        (name, name),
    )
    success = 0
    fail = 0
    for res, count in cur.fetchall():
        if res == "success":
            success += count
        elif res == "fail":
            fail += count
    conn.close()
    return success, fail
