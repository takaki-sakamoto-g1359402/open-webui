"""Auto-run queued queries every 24h."""

from __future__ import annotations

import time
from pathlib import Path

import schedule

from .. import run_query
from ..services import db

DATA_DIR = db.DATA_DIR
QUEUE_DIR = DATA_DIR / 'queue'
OUT_DIR = DATA_DIR / 'auto_out'
QUEUE_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR.mkdir(parents=True, exist_ok=True)


def process_queue() -> None:
    for txt in QUEUE_DIR.glob('*.txt'):
        query = txt.read_text(encoding='utf-8')
        md, _, partners, _ = run_query(query, 'innovators.json')
        out_path = OUT_DIR / (txt.stem + '.md')
        out_path.write_text(md, encoding='utf-8')
        txt.unlink()


def main() -> None:
    schedule.every(24).hours.do(process_queue)
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == '__main__':
    main()
