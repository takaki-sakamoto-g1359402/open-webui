"""Utilities for fine-tuning models on custom datasets."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import logging

logger = logging.getLogger(__name__)


@dataclass
class FineTuneConfig:
    """Configuration for model fine-tuning."""

    learning_rate: float = 1e-5
    epochs: int = 5
    batch_size: int = 4


def fine_tune_model(model_name: str, data: Iterable[str], config: FineTuneConfig) -> str:
    """Stub for fine-tuning a model.

    Args:
        model_name: Name or checkpoint of the model.
        data: Iterable of training samples.
        config: Fine-tuning configuration.

    Returns:
        Path to the fine-tuned checkpoint.
    """
    logger.info(
        "Fine-tuning %s for %s epochs with lr=%s",
        model_name,
        config.epochs,
        config.learning_rate,
    )
    _ = list(data)
    return f"{model_name}-finetuned"
