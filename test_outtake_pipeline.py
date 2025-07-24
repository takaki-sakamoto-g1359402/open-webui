"""
Simple evaluation pipeline for phishing detection.

Usage:
$ pip install -r requirements.txt
$ python test_outtake_pipeline.py
$ pytest
"""

import os
import json
import asyncio
import time
from typing import List, Literal
from pydantic import BaseModel
from tqdm import tqdm
from rich.console import Console
from rich.table import Table
import types
import aiohttp
import openai

class Activity(BaseModel):
    id: str
    text: str
    label: Literal["phishing", "benign"]

SYSTEM_PROMPT = "You are a cybersecurity analyst. Classify the user's text as a phishing attempt or benign communication. Reply with JSON like {\"risk\": \"phishing\"} only."

class MockChatCompletions:
    async def create(self, model: str, messages: List[dict], temperature: float = 0):
        text = messages[-1]["content"].lower()
        suspicious = ["http", "click", "verify", "password", "account", "login"]
        label = "phishing" if any(k in text for k in suspicious) else "benign"
        data = json.dumps({"risk": label})
        message = types.SimpleNamespace(content=data)
        return types.SimpleNamespace(choices=[types.SimpleNamespace(message=message)])

class MockClient:
    def __init__(self):
        self.chat = types.SimpleNamespace(completions=MockChatCompletions())

async def classify(client: openai.AsyncOpenAI, model: str, text: str) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Respond with JSON {{\"risk\": \"phishing|benign\"}} for this text:\n{text}",
        },
    ]
    for attempt in range(3):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0,
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            return data.get("risk", "benign").lower()
        except Exception as e:
            if getattr(e, "status_code", None) in {429, 500} and attempt < 2:
                await asyncio.sleep(2 ** attempt)
                continue
            raise

async def evaluate(client: openai.AsyncOpenAI, model: str, activities: List[Activity]):
    semaphore = asyncio.Semaphore(5)
    results = []

    async def worker(act: Activity):
        async with semaphore:
            start = time.perf_counter()
            pred = await classify(client, model, act.text)
            duration = time.perf_counter() - start
            results.append((pred == act.label, duration))

    tasks = [asyncio.create_task(worker(a)) for a in activities]
    for t in tqdm(asyncio.as_completed(tasks), total=len(tasks)):
        await t
    accuracy = sum(1 for ok, _ in results if ok) / len(results)
    avg_time = sum(t for _, t in results) / len(results)
    return accuracy, avg_time

async def run_evaluation(path: str = "sample_activities.json"):
    with open(path, "r") as f:
        data = [Activity(**item) for item in json.load(f)]

    offline = os.getenv("OFFLINE", "").lower() == "true"
    if offline:
        client = MockClient()
    else:
        api_key = os.environ.get("OPENAI_API_KEY")
        client = openai.AsyncOpenAI(api_key=api_key)

    metrics = []
    for model in ["gpt-4o-2025-05-13", "openai-o3"]:
        acc, avg = await evaluate(client, model, data)
        metrics.append({"model": model, "accuracy": acc, "time": avg})

    table = Table(title="Model Evaluation")
    table.add_column("Model")
    table.add_column("Accuracy", justify="right")
    table.add_column("Avg Time (s)", justify="right")
    for m in metrics:
        table.add_row(m["model"], f"{m['accuracy']:.2f}", f"{m['time']:.2f}")
    Console().print(table)
    return metrics

if __name__ == "__main__":
    asyncio.run(run_evaluation())


def test_accuracy_offline():
    os.environ["OFFLINE"] = "true"
    metrics = asyncio.run(run_evaluation())
    for m in metrics:
        assert m["accuracy"] >= 0.5
