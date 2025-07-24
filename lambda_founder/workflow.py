"""Workflow management for Lambda-Founder."""

from typing import Any, Dict, List
import time

from .idea_pipeline import IdeaPipeline
from .micro_agents import ResearchAgent, DevAgent, MarketingAgent, FundingAgent
from .ops_lead import AIOpsLead
from .compliance import legal_check


class BusinessLoop:
    """Main loop cycling through venture phases."""

    PHASES = ["IDEATE", "VALIDATE", "BUILD", "SCALE", "REFLECT"]

    def __init__(self) -> None:
        self.pipeline = IdeaPipeline()
        self.research_agent = ResearchAgent("research")
        self.dev_agent = DevAgent("dev")
        self.marketing_agent = MarketingAgent("marketing")
        self.funding_agent = FundingAgent("funding")
        self.ops = AIOpsLead()
        self.log: List[Dict[str, Any]] = []

    def cycle_once(self) -> Dict[str, Any]:
        """Execute a single business cycle."""
        ideas = self.pipeline.generate_raw_ideas()
        scores = [self.pipeline.score(i) for i in ideas]
        doc = {"ideas": ideas, "scores": scores}
        legal_check(doc)
        self.log.append(doc)
        self.ops.daily_review()
        return doc

    def run(self, iterations: int = 1, sleep_sec: float = 0) -> List[Dict[str, Any]]:
        """Run the loop for a number of iterations."""
        results = []
        for _ in range(iterations):
            results.append(self.cycle_once())
            if sleep_sec:
                time.sleep(sleep_sec)
        return results
