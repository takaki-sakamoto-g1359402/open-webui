# Operations Guide

This guide outlines the day-to-day operational tasks for the Riai Auto-Reply Agent.

## Environments

- **Local / Staging**: Keep `DRY_RUN=true`. External sends will be recorded as "WOULD_SEND" in logs and the database.
- **Production**: Flip `DRY_RUN=false` in the runtime environment (or `.env`) after validating Slack and Gmail connectivity.

## Rotating credentials

1. Generate new credentials (OpenAI key, Slack Bot Token, Slack Signing Secret).
2. Update the secure secrets store or `.env` file.
3. Restart the FastAPI service (or container) to apply the changes.
4. Verify successful authentication by checking logs for the next inbound message.

For Gmail service accounts, replace the JSON file referenced by `GMAIL_SERVICE_ACCOUNT_JSON` and ensure filesystem permissions restrict access to the service user.

## Policy updates

- Edit `config/policy.yaml` to adjust forbidden keywords, known contacts, or thresholds.
- After updating the file, restart the application or clear the policy cache by reloading the process.
- Add new templates alongside existing ones and update the `templates` mapping to point to the new files.

## Audit & replay

- Inbound messages, drafts, and send logs live in `riai_auto_reply.db`.
- Use SQLite tooling (e.g., `sqlite3 riai_auto_reply.db`) to query logs for investigations.
- `Draft.prompt_hash` and `draft_hash` allow comparison between stored content and regenerated outputs.
- For replay testing, locate the original message record and re-run `_process_message` logic manually in a REPL with `DRY_RUN=true`.

## Monitoring & alerts

- Centralize JSON logs by shipping STDOUT to your observability stack.
- Key fields: `trace_id`, `message_id`, `send_status`, and `risk`.
- Configure alerts for repeated `send_status="unsupported"` or spikes in `risk>=40` events.

## Backup & restore

- Take periodic snapshots of `riai_auto_reply.db` (consider hourly WAL backups in production).
- To restore, stop the service, replace the database file, and restart.
- Validate integrity by running a quick `sqlite3 riai_auto_reply.db 'pragma integrity_check;'` before resuming traffic.
