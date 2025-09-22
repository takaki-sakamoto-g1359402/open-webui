import json
import shutil
import json
import shutil
import subprocess
from pathlib import Path

from policy.abac import PolicyDecisionPoint

POLICY_PATH = Path(__file__).resolve().parents[1] / "services" / "policy" / "policies" / "abac_policy.json"
REGO_PATH = Path(__file__).resolve().parents[1] / "services" / "policy" / "policies" / "abac.rego"


def test_abac_allows_ops_with_clearance():
    pdp = PolicyDecisionPoint(POLICY_PATH)
    decision = pdp.evaluate(
        subject={"roles": ["ops"], "attributes": {"clearance": "restricted"}},
        resource={"classification": "restricted"},
        action="view",
        context={"need_to_know": True, "location": "jp", "incident_severity": "medium"},
    )
    assert decision.effect == "allow"


def test_abac_denies_location_mismatch():
    pdp = PolicyDecisionPoint(POLICY_PATH)
    decision = pdp.evaluate(
        subject={"roles": ["ops"], "attributes": {"clearance": "restricted"}},
        resource={"classification": "restricted"},
        action="view",
        context={"need_to_know": True, "location": "us", "incident_severity": "medium"},
    )
    assert decision.effect == "deny"


def test_rego_policy_optional():
    opa = shutil.which("opa")
    if not opa:
        return
    input_doc = {
        "subject": {"roles": ["ops"], "attributes": {"clearance": "restricted"}},
        "resource": {"classification": "restricted"},
        "action": "view",
        "context": {"need_to_know": True, "location": "jp", "incident_severity": "medium"},
    }
    result = subprocess.run(
        [opa, "eval", "data.civic.security.abac.allow", "--stdin-input", "--data", str(REGO_PATH)],
        input=json.dumps(input_doc).encode(),
        capture_output=True,
        check=True,
    )
    output = json.loads(result.stdout)
    assert output["result"][0]["expressions"][0]["value"] is True
