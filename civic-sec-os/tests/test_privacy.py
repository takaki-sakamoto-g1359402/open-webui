from __future__ import annotations

import privacy


def test_k_anonymity_and_l_diversity():
    dataset = [
        {"postal_code": "100-0001", "age": 34, "diagnosis": "flu"},
        {"postal_code": "100-0001", "age": 35, "diagnosis": "flu"},
        {"postal_code": "100-0001", "age": 36, "diagnosis": "cold"},
        {"postal_code": "100-0002", "age": 34, "diagnosis": "cold"},
        {"postal_code": "100-0002", "age": 35, "diagnosis": "allergy"},
        {"postal_code": "100-0002", "age": 36, "diagnosis": "flu"},
    ]
    assert privacy.satisfies_k_anonymity(dataset, ["postal_code"], k=3)
    assert privacy.satisfies_l_diversity(dataset, ["postal_code"], "diagnosis", l=2)


def test_differential_privacy_noise():
    values = [1.0, 2.0, 3.0, 4.0]
    noisy = privacy.private_mean(values, lower=0, upper=5, epsilon=1.0)
    assert isinstance(noisy, float)
    assert abs(noisy - sum(values) / len(values)) <= 5


def test_synthetic_data_generator_reduces_risk():
    real = [{"x": 1.0}, {"x": 1.1}, {"x": 1.2}]
    generator = privacy.SyntheticDataGenerator(seed=42)
    synthetic = generator.generate(real, 3)
    real_tuples = [(row["x"],) for row in real]
    synth_tuples = [(row["x"],) for row in synthetic]
    risk = privacy.privacy_risk(real_tuples, synth_tuples)
    assert risk < 1.0
