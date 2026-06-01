"""Idea pipeline for Lambda-Founder."""

from typing import List, Dict


class IdeaPipeline:
    """Generate and score business ideas."""

    def __init__(self, llm_model: str = "gpt-3.5-turbo") -> None:
        self.llm_model = llm_model

    def generate_raw_ideas(self, prompt: str = "Generate a business idea") -> List[str]:
        """Return a list of raw ideas using an LLM and optional web search."""
        # TODO: integrate actual LLM call and web search logic
        return ["Placeholder idea from LLM"]

    def score(self, idea: str) -> Dict[str, float]:
        """Score idea on ROI, Impact and Feasibility."""
        # TODO: replace with real scoring heuristics
        return {"ROI": 0.5, "Impact": 0.5, "Feasibility": 0.5}
