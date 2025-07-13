import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
import random


def generate_contacts(n: int = 100) -> pd.DataFrame:
    """Generate dummy contacts DataFrame."""
    ids = range(1, n + 1)
    data = {
        "id": ids,
        "name": [f"Person{i}" for i in ids],
        "role": [random.choice(["manager", "analyst", "staff"]) for _ in ids],
        "org": [random.choice(["OrgA", "OrgB"]) for _ in ids],
        "email": [f"person{i}@example.com" for i in ids],
    }
    return pd.DataFrame(data)


def generate_interactions(n: int = 100, max_id: int = 100) -> pd.DataFrame:
    """Generate dummy interactions DataFrame."""
    data = {
        "source_id": np.random.randint(1, max_id + 1, size=n),
        "target_id": np.random.randint(1, max_id + 1, size=n),
        "timestamp": [datetime.utcnow() - timedelta(days=random.randint(0, 30)) for _ in range(n)],
        "channel": [random.choice(["email", "phone", "sms"]) for _ in range(n)],
        "volume": np.random.randint(1, 50, size=n),
    }
    return pd.DataFrame(data)


def generate_events(n: int = 100, max_id: int = 100) -> pd.DataFrame:
    """Generate dummy events DataFrame."""
    data = {
        "event_id": range(1, n + 1),
        "name": [f"Event{i}" for i in range(1, n + 1)],
        "location": [random.choice(["Loc1", "Loc2", "Loc3"]) for _ in range(n)],
        "start_time": [datetime.utcnow() - timedelta(days=random.randint(0, 30)) for _ in range(n)],
        "end_time": [datetime.utcnow() + timedelta(days=random.randint(1, 30)) for _ in range(n)],
        "participants": [";".join(map(str, random.sample(range(1, max_id + 1), k=3))) for _ in range(n)],
    }
    return pd.DataFrame(data)


def create_csvs(data_dir: Path = Path("data")) -> None:
    """Create sample CSV files if they do not exist."""
    data_dir.mkdir(exist_ok=True)
    (data_dir / "contacts.csv").write_text(generate_contacts().to_csv(index=False))
    (data_dir / "interactions.csv").write_text(generate_interactions().to_csv(index=False))
    (data_dir / "events.csv").write_text(generate_events().to_csv(index=False))


if __name__ == "__main__":
    create_csvs()
