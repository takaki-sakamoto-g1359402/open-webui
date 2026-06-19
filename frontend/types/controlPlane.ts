// Shared API-facing types for the control-plane dashboard.
export type TaskStatus =
  | "draft"
  | "planned"
  | "queued"
  | "running"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "failed"
  | "canceled";

export type RunStatus =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "failed"
  | "canceled";

export type LogLevel = "debug" | "info" | "warning" | "warn" | "error";

export interface PlanStep {
  order: number;
  title: string;
  detail: string;
  kind: string;
}

export interface ControlTask {
  id: string;
  title: string;
  goal: string;
  repo_path: string | null;
  status: TaskStatus;
  plan: PlanStep[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RunRecord {
  id: string;
  task_id: string;
  status: RunStatus;
  attempt: number;
  plan_snapshot: PlanStep[];
  queued_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RunLog {
  id: string;
  run_id: string;
  level: LogLevel;
  message: string;
  sequence: number;
  created_at: string;
}

export interface Artifact {
  id: string;
  run_id: string;
  name: string;
  media_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Approval {
  id: string;
  run_id: string;
  status: "pending" | "approved" | "rejected";
  reviewer: string | null;
  reason: string | null;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  goal: string;
  repo_path?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateTaskFormInput {
  title: string;
  goal: string;
  repo_path: string;
  priority: "low" | "normal" | "high";
}
