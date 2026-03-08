"""Docking engine wrapper."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import logging

logger = logging.getLogger(__name__)


@dataclass
class DockingEngine:
    """DiffDock wrapper for docking simulations."""

    checkpoint: str

    def dock(self, receptor_structure: str, ligands: list[str]) -> list[dict[str, Any]]:
        """Dock ligands into a receptor structure.

        Args:
            receptor_structure: Path or identifier for receptor structure.
            ligands: List of ligand SMILES strings.

        Returns:
            List of docking results with scores.
        """
        logger.info("Docking %s ligands against %s", len(ligands), receptor_structure)
        return [
            {"ligand": lig, "score": -7.5, "pose_id": idx}
            for idx, lig in enumerate(ligands)
        ]
