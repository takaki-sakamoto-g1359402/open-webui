"""Data loading and preprocessing utilities for drug discovery."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

import logging

import numpy as np
import pandas as pd

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
except ImportError:  # pragma: no cover - optional dependency
    Chem = None
    AllChem = None

logger = logging.getLogger(__name__)


@dataclass
class GenomicDataset:
    """Container for genomic sequences and metadata.

    Attributes:
        sequences: List of nucleotide sequences.
        metadata: Optional metadata table.
    """

    sequences: list[str]
    metadata: Optional[pd.DataFrame] = None

    @classmethod
    def from_fasta(cls, fasta_path: Path) -> "GenomicDataset":
        """Load genomic sequences from a FASTA file.

        Args:
            fasta_path: Path to a FASTA file.

        Returns:
            GenomicDataset containing sequences and metadata.
        """
        sequences: list[str] = []
        current_seq: list[str] = []
        for line in fasta_path.read_text().splitlines():
            if line.startswith(">"):
                if current_seq:
                    sequences.append("".join(current_seq))
                    current_seq = []
            else:
                current_seq.append(line.strip())
        if current_seq:
            sequences.append("".join(current_seq))
        logger.info("Loaded %s genomic sequences", len(sequences))
        return cls(sequences=sequences)


@dataclass
class ProteinDataset:
    """Container for protein sequences and structures."""

    sequences: list[str]
    structures: Optional[list[Path]] = None
    metadata: Optional[pd.DataFrame] = None

    @classmethod
    def from_fasta(cls, fasta_path: Path) -> "ProteinDataset":
        """Load protein sequences from a FASTA file."""
        sequences: list[str] = []
        current_seq: list[str] = []
        for line in fasta_path.read_text().splitlines():
            if line.startswith(">"):
                if current_seq:
                    sequences.append("".join(current_seq))
                    current_seq = []
            else:
                current_seq.append(line.strip())
        if current_seq:
            sequences.append("".join(current_seq))
        logger.info("Loaded %s protein sequences", len(sequences))
        return cls(sequences=sequences)


@dataclass
class MoleculeDataset:
    """Container for small-molecule datasets."""

    smiles: list[str]
    metadata: Optional[pd.DataFrame] = None

    @classmethod
    def from_csv(cls, csv_path: Path, smiles_column: str = "smiles") -> "MoleculeDataset":
        """Load SMILES from a CSV file."""
        df = pd.read_csv(csv_path)
        smiles = df[smiles_column].dropna().tolist()
        logger.info("Loaded %s molecules", len(smiles))
        return cls(smiles=smiles, metadata=df)


def smiles_to_mol(smiles: str):
    """Convert a SMILES string to an RDKit molecule.

    Args:
        smiles: SMILES string.

    Returns:
        RDKit Mol or None if RDKit is unavailable or parsing fails.
    """
    if Chem is None:
        logger.warning("RDKit is not installed; cannot parse SMILES.")
        return None
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        logger.warning("Failed to parse SMILES: %s", smiles)
    return mol


def selfies_to_mol(selfies: str):
    """Convert a SELFIES string to an RDKit molecule.

    Args:
        selfies: SELFIES string.

    Returns:
        RDKit Mol or None if conversion fails.
    """
    try:
        import selfies as selfies_lib
    except ImportError:  # pragma: no cover - optional dependency
        logger.warning("SELFIES not installed; cannot parse SELFIES.")
        return None
    smiles = selfies_lib.decoder(selfies)
    return smiles_to_mol(smiles)


def generate_conformers(smiles: Iterable[str], num_conformers: int = 10) -> dict[str, np.ndarray]:
    """Generate 3D conformers for SMILES strings.

    Args:
        smiles: Iterable of SMILES strings.
        num_conformers: Number of conformers to generate.

    Returns:
        Mapping from SMILES to conformer coordinate arrays.
    """
    results: dict[str, np.ndarray] = {}
    if Chem is None or AllChem is None:
        logger.warning("RDKit is not installed; skipping conformer generation.")
        return results
    for smi in smiles:
        mol = smiles_to_mol(smi)
        if mol is None:
            continue
        mol = Chem.AddHs(mol)
        ids = AllChem.EmbedMultipleConfs(mol, numConfs=num_conformers)
        coords = []
        for conf_id in ids:
            conf = mol.GetConformer(conf_id)
            coords.append(conf.GetPositions())
        results[smi] = np.array(coords)
    logger.info("Generated conformers for %s molecules", len(results))
    return results
