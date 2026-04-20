#!/usr/bin/env python3.12
from __future__ import annotations
"""Demo of MSS to Palantir Gotham data-flow."""

# Auto-generated requirements
requirements = """\
ultralytics==8.*
confluent-kafka==2.*
rdflib==7.*
opencv-python==4.*
"""
import json
import os
import sqlite3
import time
from datetime import datetime
from typing import Any, List

# Optional third-party imports
try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover - package missing
    YOLO = None  # type: ignore

try:
    from confluent_kafka import Producer, Consumer
except Exception:  # pragma: no cover - package missing
    Producer = Consumer = None  # type: ignore

try:
    from rdflib import Graph, Namespace, URIRef, Literal
except Exception:  # pragma: no cover - package missing
    Graph = Namespace = URIRef = Literal = None  # type: ignore

from queue import Queue

# Fallback queue when Kafka is unavailable
KAFKA_QUEUE: Queue[bytes] = Queue()

def detect_objects(paths: List[str]) -> List[dict[str, Any]]:
    """Detect objects using YOLOv8 nano."""
    results: List[dict[str, Any]] = []
    model = None
    if YOLO is not None:
        try:
            model = YOLO("yolov8n.yaml")  # avoids network weight download
        except Exception:
            pass
    for path in paths:
        timestamp = datetime.utcnow().isoformat()
        lat, lon = 38.8895, -77.0353
        if model is not None:
            try:
                pred = model(path)
                if pred and hasattr(pred[0], "boxes"):
                    names = model.names
                    for box in pred[0].boxes:
                        results.append({
                            "object_type": names[int(box.cls)],
                            "prob": float(box.conf),
                            "lat": lat,
                            "lon": lon,
                            "timestamp": timestamp,
                        })
                    continue
            except Exception:
                pass
        # Fallback fake detection
        results.append({
            "object_type": "truck",
            "prob": 0.8,
            "lat": lat,
            "lon": lon,
            "timestamp": timestamp,
        })
    return results

def stream_to_kafka(detections: List[dict[str, Any]], topic: str = "mss_gotham") -> None:
    """Serialize detections and push to Kafka or fallback queue."""
    payloads = [json.dumps(d).encode() for d in detections]
    if Producer is not None:
        producer = Producer({"bootstrap.servers": "localhost:9092"})
        for data in payloads:
            producer.produce(topic, data)
        producer.flush()
    else:
        for data in payloads:
            KAFKA_QUEUE.put(data)

def consume_and_fuse(topic: str = "mss_gotham") -> Graph:
    """Consume the topic and build an RDF graph."""
    g = Graph() if Graph is not None else None
    ex = Namespace("http://example.org/") if Namespace is not None else None
    def insert(data: dict[str, Any]) -> None:
        if g is None or ex is None:
            return
        uid = int(time.time() * 1000)
        uri = URIRef(f"{ex}Vehicle/{uid}")
        g.add((uri, ex.object_type, Literal(data["object_type"])))
        g.add((uri, ex.prob, Literal(data["prob"])))
        g.add((uri, ex.lat, Literal(data["lat"])))
        g.add((uri, ex.lon, Literal(data["lon"])))
        g.add((uri, ex.ts, Literal(data["timestamp"])))

    if Consumer is not None:
        consumer = Consumer({
            "bootstrap.servers": "localhost:9092",
            "group.id": "demo",
            "auto.offset.reset": "earliest",
        })
        consumer.subscribe([topic])
        while True:
            msg = consumer.poll(0)
            if msg is None:
                break
            if not msg.error():
                insert(json.loads(msg.value().decode()))
        consumer.close()
    else:
        while not KAFKA_QUEUE.empty():
            insert(json.loads(KAFKA_QUEUE.get().decode()))
    return g if g is not None else Graph()

AOI = {
    "lat_min": 38.88,
    "lat_max": 38.90,
    "lon_min": -77.04,
    "lon_max": -77.03,
}

def check_alerts(graph: Graph) -> List[str]:
    """Raise alerts for trucks within AOI with high confidence."""
    alerts: List[str] = []
    ex = Namespace("http://example.org/")
    for s in graph.subjects(predicate=ex.object_type, object=Literal("truck")):
        prob = float(next(graph.objects(s, ex.prob)))
        lat = float(next(graph.objects(s, ex.lat)))
        lon = float(next(graph.objects(s, ex.lon)))
        if prob >= 0.75 and AOI["lat_min"] <= lat <= AOI["lat_max"] \
                and AOI["lon_min"] <= lon <= AOI["lon_max"]:
            alerts.append(f"ALERT: truck detected at ({lat}, {lon}) prob={prob}")
    return alerts

def audit_log(entries: List[str], db_path: str = "audit.db") -> None:
    """Append rule triggers to SQLite audit log."""
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute(
        """CREATE TABLE IF NOT EXISTS audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT,
                rule TEXT,
                details TEXT
            )"""
    )
    for entry in entries:
        cur.execute(
            "INSERT INTO audit (ts, rule, details) VALUES (?, ?, ?)",
            (datetime.utcnow().isoformat(), "truck_rule", entry),
        )
    con.commit()
    con.close()

def main() -> None:
    images = [os.path.join("backend/open_webui/static", "logo.png")]
    dets = detect_objects(images)
    stream_to_kafka(dets)
    graph = consume_and_fuse()
    alerts = check_alerts(graph)
    for alert in alerts:
        print(alert)
    if alerts:
        audit_log(alerts)

if __name__ == "__main__":
    main()
