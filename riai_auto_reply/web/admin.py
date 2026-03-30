"""Minimal admin UI for approvals."""
from __future__ import annotations

from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse

from app import store
from app.connectors.gmail_sender import send_email
from app.connectors.slack_sender import send_message
from app.utils import json_log

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("", response_class=HTMLResponse)
def list_queue():
    drafts = store.list_pending_drafts()
    rows = []
    for draft in drafts:
        message = store.get_message(draft.message_id)
        if not message:
            continue
        rows.append(
            f"<tr><td>{draft.id}</td><td>{message.platform}</td><td>{message.sender_name or message.sender_id}</td>"
            f"<td>{message.summary or message.body_text[:80]}</td>"
            f"<td>{'Yes' if draft.auto_send else 'No'}</td>"
            f"<td>"
            f"<form method='post' action='/admin/approve/{draft.id}' style='display:inline;'>"
            f"<input type='hidden' name='decision' value='approve'/>"
            f"<button>Approve</button></form>"
            f"<form method='post' action='/admin/approve/{draft.id}' style='display:inline;margin-left:8px;'>"
            f"<input type='hidden' name='decision' value='reject'/>"
            f"<button>Reject</button></form>"
            f"</td></tr>"
        )
    table_rows = "".join(rows) or "<tr><td colspan='6'>No pending drafts</td></tr>"
    body = (
        "<html><head><title>Riai Pending Drafts</title></head><body>"
        "<h1>Pending Drafts</h1>"
        "<table border='1' cellpadding='6'><tr><th>ID</th><th>Platform</th><th>Sender</th><th>Summary</th><th>Auto?</th><th>Actions</th></tr>"
        f"{table_rows}</table>"
        "</body></html>"
    )
    return HTMLResponse(content=body)


@router.post("/approve/{draft_id}")
def approve_draft(draft_id: int, decision: str = Form(...)):
    draft = store.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    message = store.get_message(draft.message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message missing")

    if decision == "approve":
        if message.platform == "slack":
            send_message(channel=message.channel_or_thread or message.sender_id, text=draft.body, message_id=message.id, draft_id=draft.id)
        else:
            to = message.sender_id.split(":", 1)[-1]
            send_email(
                thread_id=message.channel_or_thread,
                to=to,
                subject=message.subject or "Re: your message",
                body=draft.body,
                message_id=message.id,
                draft_id=draft.id,
            )
        store.mark_draft_status(draft_id, "approved")
        json_log(20, "Draft approved", draft_id=draft_id)
    else:
        store.mark_draft_status(draft_id, "rejected")
        json_log(20, "Draft rejected", draft_id=draft_id)
    return RedirectResponse(url="/admin", status_code=303)
