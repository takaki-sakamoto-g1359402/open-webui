# CDS Gateway Stub

This package houses the reference implementation of the Civic Security OS cross domain solution (CDS) guard stub.  It simulates
a one-way transfer workflow via file drops and protocol breaks so that integration tests can assert no raw bi-directional path
is available.

## Contents
- `gateway.py` exposes the `CDSGateway` facade used by tests and higher level orchestration flows.
- `__init__.py` wires the public interface for importing `CDSGateway`.

## Local Testing
Unit tests under `tests/test_cds.py` exercise the guard contract by ensuring:
1. Content written into the high side is sanitised before appearing on the low side.
2. Reverse data movement raises an exception.

Run the tests with `pytest civic-sec-os/tests/test_cds.py`.
