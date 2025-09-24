package civic.security.abac

default allow := false

classification_order := {"public": 0, "restricted": 1, "confidential": 2, "secret": 3}
severity_order := {"low": 0, "medium": 1, "high": 2, "critical": 3}
clearance_order := classification_order

allow {
  input.context.location in {"jp", "tokyo-metropolitan"}
  input.context.need_to_know == true
  some role
  role := input.subject.roles[_]
  role == "ops" or role == "analyst"
  clearance_order[input.subject.attributes.clearance] >= clearance_order["restricted"]
  classification_order[input.resource.classification] <= classification_order["restricted"]
  input.action == "view" or input.action == "query"
}

allow {
  input.context.location in {"jp", "tokyo-metropolitan"}
  input.subject.roles[_] == "executive"
  input.subject.attributes.delegated == true
  severity_order[input.context.incident_severity] >= severity_order["high"]
  classification_order[input.resource.classification] <= classification_order["secret"]
  input.action == "approve"
}

