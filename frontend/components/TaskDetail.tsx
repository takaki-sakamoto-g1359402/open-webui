"use client";

// Task detail view with plan controls, run status, logs, artifacts, and approvals.
import { controlPlaneApi } from "@/lib/api";
import type { Artifact, ControlTask, RunLog, RunRecord, RunStatus } from "@/types/controlPlane";

interface TaskDetailProps {
  task: ControlTask;
  runs: RunRecord[];
  logs: RunLog[];
  artifacts: Artifact[];
  onGeneratePlan: (taskId: string) => void;
  onQueueRun: (taskId: string) => void;
  onApprove: (runId: string) => void;
  onReject: (runId: string) => void;
  onRerun: (runId: string) => void;
}

const runStatusClass: Partial<Record<RunStatus, string>> = {
  approved: "ok",
  running: "accent",
  queued: "warn",
  awaiting_approval: "warn",
  rejected: "danger",
  failed: "danger"
};

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(iso));

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function ArtifactLink({ artifact }: { artifact: Artifact }) {
  return (
    <li className="artifact-item">
      <span>
        <strong>{artifact.name}</strong>
        <p className="muted">
          {artifact.media_type} · {formatBytes(artifact.size_bytes)}
        </p>
      </span>
      <a className="button" href={controlPlaneApi.artifactDownloadUrl(artifact.id)}>
        Download
      </a>
    </li>
  );
}

function LogLine({ log }: { log: RunLog }) {
  return (
    <li className="log-line">
      <span>{log.sequence}</span>
      <span>{formatTime(log.created_at)}</span>
      <span className="log-level">{log.level}</span>
      <span>{log.message}</span>
    </li>
  );
}

export function TaskDetail({
  task,
  runs,
  logs,
  artifacts,
  onGeneratePlan,
  onQueueRun,
  onApprove,
  onReject,
  onRerun
}: TaskDetailProps) {
  const latestRun = runs[0];
  const hasPlan = task.plan.length > 0;
  const activeRun = latestRun?.status === "queued" || latestRun?.status === "running";
  const awaitingApproval = latestRun?.status === "awaiting_approval";

  return (
    <section className="stack" aria-labelledby="task-detail-title">
      <div className="panel">
        <div className="panel-body detail-head">
          <div>
            <div className="meta-row">
              <span className="badge accent">{String(task.metadata.priority ?? "normal")} priority</span>
              <span className="badge">{task.status}</span>
              {latestRun ? (
                <span className={`badge ${runStatusClass[latestRun.status] ?? ""}`}>
                  run {latestRun.status}
                </span>
              ) : null}
            </div>
            <h2 id="task-detail-title" className="detail-title">
              {task.title}
            </h2>
            <p className="muted">{task.goal}</p>
            <p className="muted">Repository: {task.repo_path || "not assigned"}</p>
          </div>
          <div className="button-row" aria-label="Task actions">
            <button
              className="button"
              type="button"
              onClick={() => onGeneratePlan(task.id)}
              disabled={activeRun || awaitingApproval}
            >
              Generate plan
            </button>
            <button
              className="button primary"
              type="button"
              onClick={() => onQueueRun(task.id)}
              disabled={!hasPlan || activeRun || awaitingApproval}
            >
              Queue run
            </button>
            <button
              className="button"
              type="button"
              onClick={() => latestRun && onRerun(latestRun.id)}
              disabled={!latestRun || activeRun}
            >
              Rerun
            </button>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack">
          <section className="panel" aria-labelledby="plan-title">
            <div className="panel-header">
              <h3 id="plan-title" className="section-title">
                Plan
              </h3>
              <span className="badge">{task.plan.length} steps</span>
            </div>
            <div className="panel-body">
              {task.plan.length > 0 ? (
                <ol className="plan-list">
                  {task.plan.map((step) => (
                    <li className="plan-item" key={`${step.order}-${step.title}`}>
                      <span className="badge accent">{step.order}</span>
                      <span>
                        <strong>{step.title}</strong>
                        <p className="muted">{step.detail}</p>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="empty">No plan generated.</div>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="timeline-title">
            <div className="panel-header">
              <h3 id="timeline-title" className="section-title">
                Runs
              </h3>
              <span className="badge">{runs.length} attempts</span>
            </div>
            <div className="panel-body">
              {runs.length ? (
                <ol className="timeline">
                  {runs.map((run) => (
                    <li className="timeline-item" key={run.id}>
                      <time className="timeline-time" dateTime={run.created_at}>
                        {formatTime(run.created_at)}
                      </time>
                      <span className="timeline-content">
                        <strong>Attempt {run.attempt}</strong>
                        <p className="muted">{run.status}</p>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="empty">No runs queued.</div>
              )}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="panel" aria-labelledby="approval-title">
            <div className="panel-header">
              <h3 id="approval-title" className="section-title">
                Approval
              </h3>
            </div>
            <div className="panel-body stack">
              <p className="muted">Current gate: {awaitingApproval ? "ready for review" : "not open"}</p>
              <div className="button-row">
                <button
                  className="button primary"
                  type="button"
                  onClick={() => latestRun && onApprove(latestRun.id)}
                  disabled={!awaitingApproval}
                >
                  Approve
                </button>
                <button
                  className="button danger"
                  type="button"
                  onClick={() => latestRun && onReject(latestRun.id)}
                  disabled={!awaitingApproval}
                >
                  Reject
                </button>
              </div>
            </div>
          </section>

          <section className="panel" aria-labelledby="logs-title">
            <div className="panel-header">
              <h3 id="logs-title" className="section-title">
                Persisted Logs
              </h3>
              <span className="badge">{logs.length} lines</span>
            </div>
            <div className="panel-body">
              {logs.length ? (
                <ol className="log-list" aria-live="polite">
                  {logs.map((item) => (
                    <LogLine key={item.id} log={item} />
                  ))}
                </ol>
              ) : (
                <div className="empty">No logs persisted.</div>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="artifacts-title">
            <div className="panel-header">
              <h3 id="artifacts-title" className="section-title">
                Artifacts
              </h3>
              <span className="badge">{artifacts.length} files</span>
            </div>
            <div className="panel-body">
              {artifacts.length ? (
                <ul className="artifact-list">
                  {artifacts.map((artifact) => (
                    <ArtifactLink key={artifact.id} artifact={artifact} />
                  ))}
                </ul>
              ) : (
                <div className="empty">No artifacts persisted.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
