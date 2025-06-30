import numpy as np

DISTANCES = {
    0: 0.0,
    1: 1.0,
    2: 2 * np.sqrt(2 / 3),
    3: np.sqrt(11 / 3),
    4: 4 / np.sqrt(3),
    5: np.sqrt(19 / 3),
}


def protein_distance(d: int) -> float:
    """Return the protein distance for ``d`` in the range 0-5."""
    if d not in DISTANCES:
        raise ValueError("d must be in range 0 to 5")
    return float(DISTANCES[d])


if __name__ == "__main__":
    for d in range(6):
        print(f"d({d}) -> r = {protein_distance(d):.3f}")
