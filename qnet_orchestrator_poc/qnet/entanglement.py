"""Entanglement generation and swapping primitives."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional
import math
import numpy as np

from .network import QLink


@dataclass
class EntanglementParams:
    swap_penalty: float = 0.95  # fidelity multiplier per swap
    distance_attenuation_km: float = 50.0  # characteristic length for exponential loss
    fiber_loss_coef: float = 0.02  # per km fidelity decay
    satellite_loss_coef: float = 0.01
    contention_penalty: float = 0.9
    max_attempts: int = 50


def _distance_success(link: QLink) -> float:
    # simple exponential loss; satellites ignore distance for simplicity
    if link.kind == "fiber":
        return link.p_gen * math.exp(-link.distance_km / 100)
    return link.p_gen * math.exp(-link.distance_km / 500)


def _distance_fidelity(link: QLink) -> float:
    coef = 0.02 if link.kind == "fiber" else 0.01
    f = link.fidelity_base * math.exp(-coef * link.distance_km) * (1 - link.transduction_cost)
    return max(0.0, min(1.0, f))


def attempt_entanglement(link: QLink, rng: np.random.Generator) -> Tuple[bool, float]:
    p = _distance_success(link)
    success = rng.random() < p
    fidelity = _distance_fidelity(link) if success else 0.0
    return success, fidelity


def swap_entanglement(f1: float, f2: float, swap_penalty: float) -> float:
    # simplified: combined fidelity is geometric mean times penalty
    return math.sqrt(f1 * f2) * swap_penalty


def _sequential_attempt(path_links: List[QLink], params: EntanglementParams, rng: np.random.Generator) -> Dict:
    attempts = 0
    total_latency = 0.0
    fidelities: List[float] = []
    for link in path_links:
        for _ in range(params.max_attempts):
            attempts += 1
            success, fidelity = attempt_entanglement(link, rng)
            total_latency += link.latency_ms
            if success:
                fidelities.append(fidelity)
                break
        else:
            return {"success": False, "attempts": attempts, "latency_ms": total_latency}
    # perform swapping sequentially along path
    current_fid = fidelities[0]
    for f in fidelities[1:]:
        current_fid = swap_entanglement(current_fid, f, params.swap_penalty)
    return {
        "success": current_fid > 0,
        "attempts": attempts,
        "latency_ms": total_latency,
        "fidelity": current_fid,
    }


def _segment_indices(n: int) -> List[Tuple[int, int]]:
    # split into roughly equal halves recursively
    if n == 1:
        return [(0, 1)]
    segs = []
    size = 1
    while size < n:
        start = 0
        while start < n:
            end = min(start + size, n)
            if end - start == size:
                segs.append((start, end))
            start += size * 2
        size *= 2
    return segs


def _attempt_segment(
    links: List[QLink], params: EntanglementParams, rng: np.random.Generator, contention: bool
) -> Tuple[bool, float, int, float]:
    attempts = 0
    total_latency = 0.0
    fidelities: List[float] = []
    for link in links:
        for _ in range(params.max_attempts):
            attempts += 1
            success, fidelity = attempt_entanglement(link, rng)
            latency = link.latency_ms * (1.2 if contention else 1.0)
            total_latency += latency
            if success:
                fidelities.append(fidelity)
                break
        else:
            return False, 0.0, attempts, total_latency
    current_fid = fidelities[0]
    for f in fidelities[1:]:
        current_fid = swap_entanglement(current_fid, f, params.swap_penalty)
    if contention:
        current_fid *= params.contention_penalty
    return True, current_fid, attempts, total_latency


def sequential_swapping(path_links: List[QLink], params: EntanglementParams, rng: np.random.Generator) -> Dict:
    return _sequential_attempt(path_links, params, rng)


def parallel_segment_swapping(path_links: List[QLink], params: EntanglementParams, rng: np.random.Generator) -> Dict:
    n = len(path_links)
    if n == 0:
        return {"success": False, "attempts": 0, "latency_ms": 0.0, "fidelity": 0.0}
    segments = _segment_indices(n)
    attempts = 0
    total_latency = 0.0
    temp_fids: List[Optional[float]] = [None] * n

    # round-based entanglement of segments
    for start, end in segments:
        seg_links = path_links[start:end]
        success, fid, att, lat = _attempt_segment(seg_links, params, rng, contention=False)
        attempts += att
        total_latency = max(total_latency, lat)
        if not success:
            return {"success": False, "attempts": attempts, "latency_ms": total_latency}
        # collapse segment to a single edge fidelity
        temp_fids[start] = fid
        path_links[start] = QLink(path_links[start].u, path_links[end - 1].v, path_links[start].kind, 0, 1, fid, 0, 0)

    # combine segment fidelities level by level
    current_fids = [f for f in temp_fids if f is not None]
    while len(current_fids) > 1:
        next_level: List[float] = []
        for i in range(0, len(current_fids), 2):
            if i + 1 >= len(current_fids):
                next_level.append(current_fids[i])
                continue
            f_out = swap_entanglement(current_fids[i], current_fids[i + 1], params.swap_penalty)
            next_level.append(f_out)
        current_fids = next_level
        total_latency += sum(link.latency_ms for link in path_links)
    final_fid = current_fids[0]
    return {"success": True, "attempts": attempts, "latency_ms": total_latency, "fidelity": final_fid}


def mpses_with_contention(
    path_links: List[QLink], params: EntanglementParams, rng: np.random.Generator
) -> Dict:
    # similar to parallel but with contention penalties on overlapping nodes
    n = len(path_links)
    if n == 0:
        return {"success": False, "attempts": 0, "latency_ms": 0.0, "fidelity": 0.0}
    segments = _segment_indices(n)
    attempts = 0
    total_latency = 0.0
    current_fids: List[Optional[float]] = [None] * n
    for start, end in segments:
        seg_links = path_links[start:end]
        contention = (start % 2 == 0) and (end - start > 1)
        success, fid, att, lat = _attempt_segment(seg_links, params, rng, contention=contention)
        attempts += att
        total_latency = max(total_latency, lat)
        if not success:
            return {"success": False, "attempts": attempts, "latency_ms": total_latency}
        current_fids[start] = fid
    while len([f for f in current_fids if f is not None]) > 1:
        new_fids: List[Optional[float]] = []
        for i in range(0, len(current_fids), 2):
            f1 = current_fids[i]
            f2 = current_fids[i + 1] if i + 1 < len(current_fids) else None
            if f1 is None:
                continue
            if f2 is None:
                new_fids.append(f1)
            else:
                new_fids.append(swap_entanglement(f1, f2, params.swap_penalty))
        current_fids = new_fids
        total_latency += sum(link.latency_ms for link in path_links)
    final_fid = current_fids[0]
    return {"success": True, "attempts": attempts, "latency_ms": total_latency, "fidelity": final_fid}
