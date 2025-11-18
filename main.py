"""Entry point for MDAP-style orchestration demo."""
from __future__ import annotations

from config import DEFAULT_CONFIG
from mdap.decomposer import TaskDecomposer
from mdap.domain.list_pipeline import InstructionParser, ListPipelineDomain
from mdap.llm_client import DummyLLMClient
from mdap.micro_agent import MicroAgent, DEFAULT_PROMPT_TEMPLATE
from mdap.orchestrator import Orchestrator
from mdap.red_flagger import RedFlagger
from mdap.voting import VotingAggregator


def build_demo_payload():
    return {
        "initial": [3, 1, 4, 4],
        "instructions": [
            "Add 2 to each entry",
            "Remove value 5",
            "Append 7",
            "Multiply each by 3",
            "Drop last element",
            "Sort descending",
        ],
    }


def main():
    config = DEFAULT_CONFIG
    parser = InstructionParser()
    decomposer = TaskDecomposer(parser=parser)
    domain = ListPipelineDomain()
    llm = DummyLLMClient(model_name=config.model_name, error_rate=0.2)
    agent = MicroAgent(llm=llm, prompt_template=DEFAULT_PROMPT_TEMPLATE)
    red_flagger = RedFlagger(max_tokens_per_call=config.max_tokens_per_call)
    voting = VotingAggregator(
        samples_per_round=config.samples_per_round,
        max_rounds=config.max_sampling_rounds,
        ahead_k=config.ahead_k,
        simple_k=config.simple_k,
        use_ahead_mode=config.use_ahead_mode,
    )

    orchestrator = Orchestrator(
        config=config,
        decomposer=decomposer,
        agent=agent,
        voting=voting,
        red_flagger=red_flagger,
        domain=domain,
    )

    payload = build_demo_payload()
    result = orchestrator.run(payload)
    print("Final state:", result["final_state"])
    print(orchestrator.summarize())
    print("Trace file:", result["trace_file"])


if __name__ == "__main__":
    main()
