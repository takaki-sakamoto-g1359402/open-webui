from __future__ import annotations

import sys
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for target in ("services", "libs"):
    path = ROOT / target
    if path.exists():
        sys.path.append(str(path))

from audit.log import AuditLog
from fusion import Entity, build_graph, resolve_entities
from geoprocess import dbscan, isochrone
from ingestor.main import IngestorService
from policy.abac import PolicyDecisionPoint
from privacy import SyntheticDataGenerator
from stix_taxii.taxii import TaxiiCollection, create_bundle, create_indicator

POLICY_PATH = Path(__file__).resolve().parents[1] / "services" / "policy" / "policies" / "abac_policy.json"


def run_demo() -> dict:
    ingestor = IngestorService()
    ingestor.register_schema("iot", "1", {"device_id": "string", "value": "float"})
    ingested = ingestor.ingest("iot-sensor", "iot", {"device_id": "sensor-1", "value": 12.3})

    entities = [
        Entity(id="sensor-1", attributes={"name": "Sensor 1", "city": "Tokyo"}),
        Entity(id="sensor-1-shadow", attributes={"name": "Sensor 1", "city": "Tokyo"}),
    ]
    clusters = resolve_entities(entities, block_keys=["city"], weights={"name": 1.0})
    graph = build_graph(clusters)

    cluster_points = dbscan([(35.0, 139.0), (35.0005, 139.0005)], eps_km=1.0, min_samples=2)
    ring = isochrone((35.6762, 139.6503), travel_time=timedelta(minutes=15), average_speed_kmph=30)

    generator = SyntheticDataGenerator(seed=7)
    synthetic = generator.generate([{"value": 12.3}], 1)

    pdp = PolicyDecisionPoint(POLICY_PATH)
    decision = pdp.evaluate(
        subject={"roles": ["ops"], "attributes": {"clearance": "restricted"}},
        resource={"classification": "restricted"},
        action="view",
        context={"need_to_know": True, "location": "jp", "incident_severity": "medium"},
    )

    audit = AuditLog()
    audit_hash = audit.append(
        subject="ops-analyst",
        action="view",
        resource="sensor-1",
        decision=decision.effect,
        justification="incident-triage",
    )

    indicator = create_indicator(ioc="deadbeef", technique_id="T1486", description="Ransomware hash")
    collection = TaxiiCollection(title="demo")
    collection.push(create_bundle([indicator]))
    taxii_bundle = collection.pull()

    return {
        "ingested": ingested,
        "graph": graph,
        "clusters": cluster_points,
        "isochrone_points": len(ring),
        "synthetic": synthetic,
        "decision": decision.effect,
        "audit_hash": audit_hash,
        "taxii_objects": len(taxii_bundle["objects"]),
    }
