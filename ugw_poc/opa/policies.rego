package ugw.authz

import future.keywords.if

default allow = false

default matched_rules = []

default reason = "deny"

is_admin {
    input.actor.role == "admin"
}

is_auditor {
    input.actor.role == "auditor"
}

is_participant {
    input.actor.role == "participant"
}

allow if {
    is_admin
    input.action == "identity:manage"
}

allow if {
    is_admin
    input.action == "registry:manage"
}

allow if {
    is_admin
    input.action == "oracle:manage"
}

allow if {
    is_admin
    input.action == "keys:rotate"
}

allow if {
    is_admin
    input.action == "room:create"
}

allow if {
    is_admin
    input.action == "room:invite"
}

allow if {
    is_admin
    input.action == "room:remove"
}

allow if {
    is_admin
    input.action == "room:close"
}

allow if {
    is_admin
    input.action == "room:export"
    not input.room.legal_hold
}

allow if {
    is_admin
    input.action == "legal_hold:set"
}

allow if {
    is_admin
    input.action == "rate_limit:override"
}

allow if {
    is_admin
    input.action == "audit:view"
}

allow if {
    is_participant
    input.action == "room:create"
}

allow if {
    is_participant
    input.action == "room:invite"
}

allow if {
    is_participant
    input.action == "room:close"
}

allow if {
    is_participant
    input.action == "artifact:create"
}

allow if {
    is_participant
    input.action == "artifact:update"
}

allow if {
    is_participant
    input.action == "artifact:history"
}

allow if {
    is_participant
    input.action == "room:export"
    input.resource.include_confidential == false
    not input.room.legal_hold
}

allow if {
    is_auditor
    input.action == "audit:view"
}

matched_rules["identity_manage_admin"] if { is_admin; input.action == "identity:manage" }
matched_rules["registry_manage_admin"] if { is_admin; input.action == "registry:manage" }
matched_rules["oracle_manage_admin"] if { is_admin; input.action == "oracle:manage" }
matched_rules["keys_rotate_admin"] if { is_admin; input.action == "keys:rotate" }
matched_rules["room_create_admin"] if { is_admin; input.action == "room:create" }
matched_rules["room_invite_admin"] if { is_admin; input.action == "room:invite" }
matched_rules["room_remove_admin"] if { is_admin; input.action == "room:remove" }
matched_rules["room_close_admin"] if { is_admin; input.action == "room:close" }
matched_rules["room_export_admin"] if { is_admin; input.action == "room:export"; not input.room.legal_hold }
matched_rules["legal_hold_set_admin"] if { is_admin; input.action == "legal_hold:set" }
matched_rules["rate_limit_override_admin"] if { is_admin; input.action == "rate_limit:override" }
matched_rules["audit_view_admin"] if { is_admin; input.action == "audit:view" }
matched_rules["room_create_participant"] if { is_participant; input.action == "room:create" }
matched_rules["room_invite_participant"] if { is_participant; input.action == "room:invite" }
matched_rules["room_close_participant"] if { is_participant; input.action == "room:close" }
matched_rules["artifact_create_participant"] if { is_participant; input.action == "artifact:create" }
matched_rules["artifact_update_participant"] if { is_participant; input.action == "artifact:update" }
matched_rules["artifact_history_participant"] if { is_participant; input.action == "artifact:history" }
matched_rules["room_export_participant"] if { is_participant; input.action == "room:export"; input.resource.include_confidential == false; not input.room.legal_hold }
matched_rules["audit_view_auditor"] if { is_auditor; input.action == "audit:view" }

reason = "allow" if allow
reason = "deny" if not allow
