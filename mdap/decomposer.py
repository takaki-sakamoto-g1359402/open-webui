"""Task decomposition for list pipeline."""
from __future__ import annotations

from dataclasses import dataclass

from mdap.domain.list_pipeline import InstructionParser, PipelineTask


@dataclass
class TaskDecomposer:
    parser: InstructionParser

    def decompose(self, payload: dict) -> PipelineTask:
        """Convert a high-level payload into a PipelineTask."""
        return self.parser.parse(payload)
