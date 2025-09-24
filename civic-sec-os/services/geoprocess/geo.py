"""Geospatial analytics primitives."""
from __future__ import annotations

import math
from datetime import timedelta
from typing import Dict, List, Sequence, Tuple

EARTH_RADIUS_KM = 6371.0


def tile_index(lat: float, lon: float, zoom: int) -> Tuple[int, int]:
    lat_rad = math.radians(lat)
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return x, y


def haversine_distance_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def dbscan(
    points: Sequence[Tuple[float, float]],
    *,
    eps_km: float,
    min_samples: int,
) -> List[List[Tuple[float, float]]]:
    labels = [0] * len(points)
    cluster_id = 0

    def region_query(idx: int) -> List[int]:
        return [j for j, point in enumerate(points) if haversine_distance_km(points[idx], point) <= eps_km]

    def expand_cluster(idx: int, neighbours: List[int]) -> None:
        nonlocal cluster_id
        cluster_id += 1
        labels[idx] = cluster_id
        queue = list(neighbours)
        while queue:
            current = queue.pop()
            if labels[current] == -1:
                labels[current] = cluster_id
            if labels[current] != 0:
                continue
            labels[current] = cluster_id
            current_neighbours = region_query(current)
            if len(current_neighbours) >= min_samples:
                queue.extend(current_neighbours)

    for idx, point in enumerate(points):
        if labels[idx] != 0:
            continue
        neighbours = region_query(idx)
        if len(neighbours) < min_samples:
            labels[idx] = -1
            continue
        expand_cluster(idx, neighbours)

    clusters: List[List[Tuple[float, float]]] = []
    for cluster in range(1, cluster_id + 1):
        clusters.append([point for label, point in zip(labels, points) if label == cluster])
    return clusters


def heatmap(points: Sequence[Tuple[float, float]], precision: float = 0.01) -> Dict[Tuple[float, float], int]:
    buckets: Dict[Tuple[float, float], int] = {}
    for lat, lon in points:
        key = (round(lat / precision) * precision, round(lon / precision) * precision)
        buckets[key] = buckets.get(key, 0) + 1
    return buckets


def isochrone(
    origin: Tuple[float, float],
    *,
    travel_time: timedelta,
    average_speed_kmph: float,
    samples: int = 36,
) -> List[Tuple[float, float]]:
    reachable_km = average_speed_kmph * (travel_time.total_seconds() / 3600.0)
    lat, lon = map(math.radians, origin)
    points: List[Tuple[float, float]] = []
    for step in range(samples):
        bearing = 2 * math.pi * (step / samples)
        dest_lat = math.asin(
            math.sin(lat) * math.cos(reachable_km / EARTH_RADIUS_KM)
            + math.cos(lat) * math.sin(reachable_km / EARTH_RADIUS_KM) * math.cos(bearing)
        )
        dest_lon = lon + math.atan2(
            math.sin(bearing) * math.sin(reachable_km / EARTH_RADIUS_KM) * math.cos(lat),
            math.cos(reachable_km / EARTH_RADIUS_KM) - math.sin(lat) * math.sin(dest_lat),
        )
        points.append((math.degrees(dest_lat), (math.degrees(dest_lon) + 540) % 360 - 180))
    return points


__all__ = [
    "dbscan",
    "heatmap",
    "haversine_distance_km",
    "isochrone",
    "tile_index",
]
