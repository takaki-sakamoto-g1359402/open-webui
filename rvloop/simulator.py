"""Simple telemetry simulator."""
from __future__ import annotations

import argparse
import json
import random
import time
from datetime import datetime, timezone
from typing import Dict

import requests

API_URL = "http://localhost:8000/telemetry"


def generate_metrics(seed: float) -> Dict[str, float]:
    rng = random.Random(seed)
    return {"temperature": round(20 + rng.random() * 5, 2)}


def main() -> None:
    parser = argparse.ArgumentParser(description="RV-Loop Lab telemetry simulator")
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--source", type=str, default="sim-1")
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--in-process", action="store_true", help="Call app directly instead of HTTP")
    args = parser.parse_args()

    if args.in_process:
        from .api import process_telemetry

    for idx in range(args.count):
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source_id": args.source,
            "metrics": generate_metrics(time.time() + idx),
            "notes": "simulated",
        }

        if args.in_process:
            print("Sending telemetry in-process", payload)
            process_telemetry(payload)
        else:
            print("POST", API_URL, payload)
            resp = requests.post(API_URL, json=payload, timeout=5)
            if resp.status_code != 200:
                print("Failed to send telemetry", resp.status_code, resp.text)
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
