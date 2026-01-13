# AI Drug Discovery Proof of Concept

This package provides a modular, extensible skeleton for an AI-driven drug discovery pipeline that integrates foundation models, generative design, docking, and multi-agent orchestration.

## Installation

1. Ensure Python 3.11+ is installed.
2. Install dependencies (adjust for your environment and CUDA availability):

```bash
pip install torch numpy pandas rdkit-pypi biobert autogen-agentchat langchain pyyaml
```

> Note: BioNeMo, DiffDock, RFdiffusion/EvoDiff, and related models typically require dedicated setup via NVIDIA NGC or Hugging Face. Replace the placeholder packages above with the official installation steps for your environment.

## Datasets

Place datasets in the paths defined in `ai_drug_discovery_poc/config.yaml`:

- Genomic FASTA files
- Protein FASTA/structure files
- Small-molecule CSVs (SMILES column)

Example placeholders are referenced in the config for clarity.

## Running the POC

From the repository root:

```bash
python run_poc.py --config ai_drug_discovery_poc/config.yaml
```

Outputs are written to `outputs/` by default (or override with `--output`).

## Extending the Pipeline

- Replace stub model wrappers in `ai_drug_discovery_poc/models` with BioNeMo calls.
- Connect a real message queue in `AgentManager` for large-scale orchestration.
- Swap the mock wet-lab service with real QSAR or lab automation APIs.
