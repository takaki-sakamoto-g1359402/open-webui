import sqlite3
from typing import Tuple

DB_PATH = 'history.db'


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    with conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS history(
            partner_a TEXT,
            partner_b TEXT,
            result TEXT,
            ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
        )
    conn.close()


def log_history(a: str, b: str, result: str) -> None:
    conn = sqlite3.connect(DB_PATH)
    with conn:
        conn.execute(
            "INSERT INTO history(partner_a, partner_b, result) VALUES (?,?,?)",
            (a, b, result),
        )
    conn.close()


def get_partner_weight(name: str) -> float:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM history WHERE (partner_a=? OR partner_b=?) AND result='success'",
        (name, name),
    )
    success = cur.fetchone()[0]
    cur.execute(
        "SELECT COUNT(*) FROM history WHERE (partner_a=? OR partner_b=?) AND result='fail'",
        (name, name),
    )
    fail = cur.fetchone()[0]
    conn.close()
    return max(0.1, 1 + 0.1 * (success - fail))


def get_stats() -> Tuple[int, int]:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM history WHERE result='success'")
    success = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM history WHERE result='fail'")
    fail = cur.fetchone()[0]
    conn.close()
    return success, fail
