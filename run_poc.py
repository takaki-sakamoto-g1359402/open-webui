"""Executable script for running the AI-driven drug discovery POC pipeline."""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

import pandas as pd

from ai_drug_discovery_poc.agents import (
    AgentContext,
    AgentManager,
    EvaluationAgent,
    GeneratorAgent,
    HypothesisAgent,
    LearningAgent,
    LiteratureAgent,
    SimulationAgent,
)
from ai_drug_discovery_poc.data import (
    GenomicDataset,
    MoleculeDataset,
    ProteinDataset,
)
from ai_drug_discovery_poc.evaluation import CandidateEvaluator, aggregate_agent_metrics
from ai_drug_discovery_poc.models import DockingEngine, Evo2Model, ESM2Model, UniMolModel
from ai_drug_discovery_poc.simulation import MockWetLabService
from ai_drug_discovery_poc.utils import POCConfig, configure_logging, load_config


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="AI drug discovery POC pipeline")
    parser.add_argument("--config", type=Path, default=Path("ai_drug_discovery_poc/config.yaml"))
    parser.add_argument("--output", type=Path, default=None, help="Output directory override")
    return parser.parse_args()


def load_data(config: POCConfig) -> dict[str, Any]:
    """Load datasets with graceful fallbacks if data are missing."""
    data: dict[str, Any] = {}
    genomic_path = Path(config.data_paths.get("genomic_fasta", ""))
    protein_path = Path(config.data_paths.get("protein_fasta", ""))
    molecule_path = Path(config.data_paths.get("molecule_csv", ""))

    if genomic_path.exists():
        data["genomic"] = GenomicDataset.from_fasta(genomic_path)
    else:
        data["genomic"] = GenomicDataset(sequences=["ATGC"])

    if protein_path.exists():
        data["protein"] = ProteinDataset.from_fasta(protein_path)
    else:
        data["protein"] = ProteinDataset(sequences=["MVLSPADKTNVKAA"])

    if molecule_path.exists():
        data["molecules"] = MoleculeDataset.from_csv(molecule_path)
    else:
        data["molecules"] = MoleculeDataset(smiles=["CCO", "CCN"])

    return data


async def run_pipeline(config: POCConfig, output_dir: Path) -> dict[str, Any]:
    """Run the end-to-end pipeline and return results."""
    data = load_data(config)
    evo2 = Evo2Model(checkpoint=config.model_checkpoints.get("evo2", "evo2"))
    esm2 = ESM2Model(checkpoint=config.model_checkpoints.get("esm2", "esm2"))
    unimol = UniMolModel(checkpoint=config.model_checkpoints.get("unimol", "unimol"))
    docking = DockingEngine(checkpoint=config.model_checkpoints.get("diffdock", "diffdock"))

    _ = evo2.embed(data["genomic"].sequences)
    _ = esm2.embed(data["protein"].sequences)

    wet_lab = MockWetLabService()
    evaluator = CandidateEvaluator()

    agents = [
        LiteratureAgent(name="literature"),
        HypothesisAgent(name="hypothesis"),
        GeneratorAgent(name="generator", generator=unimol),
        SimulationAgent(name="simulation", simulator=wet_lab),
        EvaluationAgent(name="evaluation", evaluator=evaluator),
        LearningAgent(name="learning"),
    ]
    manager = AgentManager(agents=agents)

    context = AgentContext(data={"seed_molecules": data["molecules"].smiles})
    context, metrics = await manager.run(context)

    candidates = context.data.get("candidates", [])
    docking_results = docking.dock("mock_receptor.pdb", candidates)

    output_dir.mkdir(parents=True, exist_ok=True)

    evaluation_results = context.data.get("evaluation_results", [])
    evaluation_df = pd.DataFrame([result.__dict__ for result in evaluation_results])
    evaluation_path = output_dir / "evaluation.csv"
    evaluation_df.to_csv(evaluation_path, index=False)

    report = {
        "candidates": candidates,
        "docking": docking_results,
        "simulation": [result.__dict__ for result in context.data.get("simulation_results", [])],
        "evaluation": evaluation_df.to_dict(orient="records"),
    }
    report_path = output_dir / "report.json"
    report_path.write_text(json.dumps(report, indent=2))

    agent_metrics = aggregate_agent_metrics(
        task_completion_rate=metrics.task_completion_rate,
        latency_by_agent=metrics.latency_by_agent,
    )

    return {
        "report_path": report_path,
        "evaluation_path": evaluation_path,
        "agent_metrics": agent_metrics,
    }


def main() -> None:
    """Entry point for the POC script."""
    args = parse_args()
    configure_logging()
    config = load_config(args.config)
    output_dir = args.output if args.output else Path(config.output_dir)
    results = asyncio.run(run_pipeline(config, output_dir))
    print("Report written to", results["report_path"])
    print("Evaluation written to", results["evaluation_path"])
    print("Agent metrics", results["agent_metrics"])


if __name__ == "__main__":
    main()
