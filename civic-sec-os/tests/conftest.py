import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for target in ["libs", "services"]:
    path = ROOT / target
    if path.exists():
        sys.path.append(str(path))
