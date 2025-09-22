# Policy Tests

Run `opa eval` against `policies/abac.rego` using the input documents from `tests/test_policy.py` to validate behaviour. The automated pytest suite skips the Rego execution when the `opa` binary is unavailable.
