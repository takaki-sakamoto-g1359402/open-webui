extends RefCounted
class_name Analytics

const HIST_BINS := 20

func gini(values: Array) -> float:
    if values.is_empty():
        return 0.0
    var sorted := values.duplicate()
    sorted.sort()
    var n := sorted.size()
    var cumulative := 0.0
    var weighted := 0.0
    for i in range(n):
        cumulative += sorted[i]
        weighted += cumulative
    if cumulative == 0.0:
        return 0.0
    return clamp((n + 1.0 - 2.0 * weighted / cumulative) / n, 0.0, 1.0)

func histogram(values: Array, bins: int = HIST_BINS, min_value: float = 0.0, max_value: float = -1.0) -> Dictionary:
    var counts: Array = []
    if bins <= 0:
        return {"bins": [], "counts": []}
    for _i in range(bins):
        counts.append(0)
    if values.is_empty():
        return {"bins": _make_bins(min_value, max_value if max_value > min_value else min_value + 1.0, bins), "counts": counts}
    var local_min := min_value
    var local_max := max_value
    if local_max <= local_min:
        local_min = values[0]
        local_max = values[0]
        for v in values:
            if v < local_min:
                local_min = v
            if v > local_max:
                local_max = v
        if local_min == local_max:
            local_max = local_min + 1.0
    var bin_size := (local_max - local_min) / float(bins)
    if bin_size <= 0.0:
        bin_size = 1.0
    for v in values:
        var idx := int(floor((v - local_min) / bin_size))
        idx = clamp(idx, 0, bins - 1)
        counts[idx] += 1
    return {"bins": _make_bins(local_min, local_max, bins), "counts": counts}

func _make_bins(min_value: float, max_value: float, bins: int) -> Array:
    var result: Array = []
    if bins <= 0:
        return result
    var step := (max_value - min_value) / float(bins)
    for i in range(bins + 1):
        result.append(min_value + step * i)
    return result

func percent_active(values: Array, threshold: float = 0.01) -> float:
    if values.is_empty():
        return 0.0
    var active := 0
    for v in values:
        if v >= threshold:
            active += 1
    return float(active) / float(values.size()) * 100.0

func average(values: Array) -> float:
    if values.is_empty():
        return 0.0
    var total := 0.0
    for v in values:
        total += v
    return total / float(values.size())

func summarize(activations: Array, weights: Array, node_count: int, edge_count: int) -> Dictionary:
    return {
        "gini": gini(activations),
        "active_percent": percent_active(activations),
        "activation_hist": histogram(activations, HIST_BINS, 0.0),
        "weight_hist": histogram(weights, HIST_BINS, 0.0),
        "node_count": node_count,
        "edge_count": edge_count,
        "average_weight": average(weights),
        "average_activation": average(activations)
    }
