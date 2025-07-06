"""Long-term strategy generation based on Horizon Thinking."""
from typing import List, Dict, Iterable


def generate_strategy(goals: Iterable[str], horizons: List[int]) -> Dict[int, List[str]]:
    """Generate a simple multi-horizon strategy plan.

    Parameters
    ----------
    goals: Iterable[str]
        High level strategic goals.
    horizons: List[int]
        List of horizon years. For example ``[1, 3, 5]``.

    Returns
    -------
    Dict[int, List[str]]
        Mapping of horizon year to strategy statements.
    """
    strategy = {}
    for horizon in sorted(horizons):
        steps = []
        for goal in goals:
            if horizon <= 2:
                steps.append(f"Establish groundwork for {goal} in {horizon} year(s)")
            elif horizon <= 5:
                steps.append(f"Scale efforts on {goal} by year {horizon}")
            else:
                steps.append(f"Sustain leadership in {goal} beyond year {horizon}")
        strategy[horizon] = steps
    return strategy
