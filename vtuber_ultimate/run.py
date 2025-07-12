## Overview
# CLI entry point for vtuber_ultimate

from pathlib import Path
import argparse
import json

from .persona import PersonalityCore
from .chat_engine import ChatEngine
from .voice_synth import VoiceSynth
from .stream_bot import StreamBot
from .planner import Planner, StreamStats


def demo_data(path: str) -> None:
    """Generate dummy dataset for demo."""
    import pandas as pd
    import numpy as np
    from pathlib import Path

    Path(path).mkdir(parents=True, exist_ok=True)
    profiles = pd.DataFrame([
        {
            "name": "demo",
            "mbti": "ENFP",
            "openness": 0.8,
            "conscientiousness": 0.5,
            "extraversion": 0.7,
            "agreeableness": 0.6,
            "neuroticism": 0.3,
            "dim1": 0.1,
            "dim2": 0.2,
            "dim3": 0.3,
            "dim4": 0.4,
            "dim5": 0.5,
        }
    ])
    profiles.to_csv(Path(path) / "hololive_profiles.csv", index=False)
    (Path(path) / "transcripts").mkdir(exist_ok=True)
    with open(Path(path) / "transcripts" / "sample.jsonl", "w") as f:
        f.write(json.dumps({"text": "Hello world"}) + "\n")
    df = pd.DataFrame({"watch_time": [1], "revenue": [1], "subs": [1]})
    df.to_parquet(Path(path) / "fan_stats.parquet")


def main() -> None:
    parser = argparse.ArgumentParser(description="vtuber ultimate")
    parser.add_argument("--persona", default="demo")
    parser.add_argument("--lang", default="en")
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()

    data_path = Path(__file__).parent / "data"
    if args.demo:
        demo_data(str(data_path))

    profile_csv = data_path / "hololive_profiles.csv"
    persona = PersonalityCore.load_from_csv(args.persona, str(profile_csv))
    chat = ChatEngine()
    tts = VoiceSynth()
    planner = Planner()

    messages = [
        {"role": "system", "content": f"You are {args.persona}"},
        {"role": "user", "content": "Hello"},
    ]
    for chunk in chat.chat(messages, stream=True):
        print(chunk, end="", flush=True)
    print()

    tts.set_style("default")
    tts.speak("Hello", "output.mp3")

    planner.add_stats(StreamStats(date="2024-01-01", watch_time=1, revenue=1, subs=1))
    print("Next stream:", planner.optimize_schedule())


if __name__ == "__main__":
    main()
