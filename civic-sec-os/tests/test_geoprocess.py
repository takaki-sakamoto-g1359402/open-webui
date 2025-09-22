from datetime import timedelta

from geoprocess import dbscan, heatmap, isochrone, tile_index


def test_tile_index():
    x, y = tile_index(35.6762, 139.6503, 8)
    assert isinstance(x, int) and isinstance(y, int)


def test_dbscan_clusters():
    points = [(35.0, 139.0), (35.0005, 139.0005), (36.0, 140.0)]
    clusters = dbscan(points, eps_km=1.0, min_samples=2)
    assert any(len(cluster) == 2 for cluster in clusters)


def test_isochrone_points():
    ring = isochrone((35.6762, 139.6503), travel_time=timedelta(minutes=15), average_speed_kmph=30)
    assert len(ring) == 36


def test_heatmap_counts():
    points = [(35.0, 139.0), (35.001, 139.001)]
    hm = heatmap(points, precision=0.01)
    assert sum(hm.values()) == len(points)
