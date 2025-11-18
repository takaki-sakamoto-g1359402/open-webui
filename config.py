from dataclasses import dataclass


@dataclass
class Config:
    model_name: str = "dummy-mdap-001"
    max_sampling_rounds: int = 6
    samples_per_round: int = 3
    ahead_k: int = 2  # winner must lead others by this many votes
    simple_k: int = 3  # alternative mode: first outcome to reach this many votes
    use_ahead_mode: bool = True
    max_tokens_per_call: int = 256
    run_trace_dir: str = "runs"


DEFAULT_CONFIG = Config()
