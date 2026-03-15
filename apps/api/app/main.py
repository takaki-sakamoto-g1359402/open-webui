from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[3]
SEED_PATH = ROOT / "seed" / "mock_data.json"

WEIGHTS = {
    "child_protection": 0.20,
    "poverty": 0.17,
    "health": 0.15,
    "water_sanitation": 0.13,
    "education": 0.13,
    "food_nutrition": 0.10,
    "dignity_rights": 0.07,
    "institutions_peace": 0.05,
}

app = FastAPI(title="Heaven Blueprint Atlas API", version="0.1.0")


def load_seed() -> dict[str, Any]:
    with open(SEED_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def compute_score(observations: list[dict[str, Any]]) -> dict[str, Any]:
    grouped: dict[str, list[float]] = defaultdict(list)
    if not observations:
        return {"score": 0, "confidence": 0, "explanations": []}

    for obs in observations:
        grouped[obs["pillar"]].append(float(obs["value"]))

    explanations = []
    weighted = 0.0
    for pillar, values in grouped.items():
        pillar_score = sum(values) / len(values)
        weight = WEIGHTS.get(pillar, 0)
        weighted += pillar_score * weight
        explanations.append(
            {
                "pillar": pillar,
                "pillarScore": round(pillar_score, 2),
                "weight": weight,
                "formula": "mean(indicators) * weight",
                "confidenceNotes": "MVP confidence approximation",
            }
        )

    coverage = len(grouped) / len(WEIGHTS)
    newest = max(datetime.fromisoformat(o["lastUpdated"]) for o in observations)
    recency = 1 if newest.year >= datetime.now().year - 2 else 0.7
    confidence = round(coverage * recency, 3)

    return {"score": round(weighted, 2), "confidence": confidence, "explanations": explanations}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/dashboard")
def dashboard() -> dict[str, Any]:
    data = load_seed()
    obs = data["observations"]
    by_country = defaultdict(list)
    for o in obs:
        by_country[o["iso3"]].append(o)

    scorecards = []
    for iso3, rows in by_country.items():
        score = compute_score(rows)
        scorecards.append({"iso3": iso3, **score})

    latest_sources = sorted(
        {
            (o["sourceOrganization"], o["sourceDocumentTitle"], o["sourceUrl"], o["lastUpdated"])
            for o in obs
        },
        key=lambda x: x[3],
        reverse=True,
    )[:5]

    return {
        "globalSummary": {
            "countriesTracked": len(by_country),
            "avgScore": round(sum(s["score"] for s in scorecards) / len(scorecards), 2),
            "avgConfidence": round(sum(s["confidence"] for s in scorecards) / len(scorecards), 3),
        },
        "topRisks": sorted(scorecards, key=lambda x: x["score"])[:3],
        "topImproving": sorted(scorecards, key=lambda x: x["score"], reverse=True)[:3],
        "latestSourceUpdates": [
            {
                "organization": org,
                "title": title,
                "url": url,
                "lastUpdated": updated,
            }
            for org, title, url, updated in latest_sources
        ],
    }


@app.get("/countries/{iso3}")
def country_detail(iso3: str) -> dict[str, Any]:
    data = load_seed()
    rows = [o for o in data["observations"] if o["iso3"] == iso3.upper()]
    if not rows:
        raise HTTPException(status_code=404, detail="Country not found")
    score = compute_score(rows)

    trend = [{"year": y, "score": max(0, score["score"] - (2023 - y) * 1.2)} for y in [2020, 2021, 2022, 2023]]

    return {
        "iso3": iso3.upper(),
        "heavenScore": score["score"],
        "confidence": score["confidence"],
        "pillarBreakdown": score["explanations"],
        "trend": trend,
        "evidenceCards": rows,
        "methodology": {
            "version": "0.1.0",
            "formula": "weighted sum of pillar means",
            "weights": WEIGHTS,
        },
    }


@app.get("/sources")
def source_explorer(organization: str | None = None, pillar: str | None = None) -> dict[str, Any]:
    rows = load_seed()["observations"]
    if organization:
        rows = [r for r in rows if r["sourceOrganization"].lower() == organization.lower()]
    if pillar:
        rows = [r for r in rows if r["pillar"] == pillar]
    return {"count": len(rows), "items": rows}


class AnalystQuestion(BaseModel):
    question: str
    iso3: str | None = None


@app.post("/analyst/ask")
def analyst_mode(payload: AnalystQuestion) -> dict[str, Any]:
    rows = load_seed()["observations"]
    if payload.iso3:
        rows = [r for r in rows if r["iso3"] == payload.iso3.upper()]

    if not rows:
        return {
            "answer": "unverified: no evidence found in retrieved primary-source index.",
            "confidence": "low",
            "citations": [],
        }

    citations = [
        {
            "organization": r["sourceOrganization"],
            "title": r["sourceDocumentTitle"],
            "url": r["sourceUrl"],
            "lastUpdated": r["lastUpdated"],
        }
        for r in rows[:3]
    ]

    return {
        "answer": "Observed facts in the retrieved dataset indicate mixed progress; health and poverty remain key risk areas. This is evidence-linked and not a normative conclusion.",
        "confidence": "medium",
        "citations": citations,
    }


class ScenarioInput(BaseModel):
    iso3: str
    pillar: str
    delta: float


@app.post("/scenario")
def scenario_lab(payload: ScenarioInput) -> dict[str, Any]:
    rows = [r for r in load_seed()["observations"] if r["iso3"] == payload.iso3.upper()]
    if not rows:
        raise HTTPException(status_code=404, detail="Country not found")

    baseline = compute_score(rows)
    adjusted = []
    for r in rows:
        clone = dict(r)
        if clone["pillar"] == payload.pillar:
            clone["value"] = max(0, min(100, float(clone["value"]) + payload.delta))
        adjusted.append(clone)
    estimate = compute_score(adjusted)

    return {
        "label": "inferred estimate (not observed fact)",
        "baseline": baseline["score"],
        "estimated": estimate["score"],
        "delta": round(estimate["score"] - baseline["score"], 2),
    }
