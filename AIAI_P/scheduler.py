"""Automatic queue processor for AIAI Plus."""
from pathlib import Path
import time
import schedule
from AIAI_P.aiai_p import AIAIPlus


def process_queue() -> None:
    q = Path("queue")
    out_dir = Path("auto_out")
    out_dir.mkdir(exist_ok=True)
    for file in q.glob("*.txt"):
        app = AIAIPlus()
        out = app.make_roadmap(str(file))
        dest = out_dir / Path(out).name
        dest.write_text(Path(out).read_text())
        img = Path(out).with_suffix(".png")
        app.export_graph(img, ["synergy", "conflict", "supply-chain"])
        (out_dir / img.name).write_bytes(img.read_bytes())
        file.unlink()

def main() -> None:
    schedule.every(24).hours.do(process_queue)
    process_queue()
    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == "__main__":
    main()
