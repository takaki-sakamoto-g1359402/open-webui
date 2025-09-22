# STIX/TAXII Service

Implements the lightweight TAXII 2.1 façade used by the Civic Security OS tests and demo harness.  The service focuses on
parsing/serialising STIX objects and mapping indicators to MITRE ATT&CK technique identifiers.

## Contents
- `taxii.py` exposes helper classes for TAXII collections and a simple in-memory client/server exchange.
- `__init__.py` defines the public API for consumers that need to import the service.

## Local Testing
Execute `pytest civic-sec-os/tests/test_taxii.py` to validate the TAXII round-trip behaviour.
