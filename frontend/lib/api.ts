// Browser API helpers for the local FastAPI control-plane service.
import type {
  Approval,
  Artifact,
  ControlTask,
  CreateTaskInput,
  RunLog,
  RunRecord
} from "@/types/controlPlane";

const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const API_BASE_URL = configuredBase.replace(/\/$/, "");

type ApiOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API ${response.status}: ${detail || response.statusText}`);
  }

  return (await response.json()) as T;
}

export const controlPlaneApi = {
  listTasks: () => apiRequest<ControlTask[]>("/tasks"),
  createTask: (input: CreateTaskInput) =>
    apiRequest<ControlTask>("/tasks", { method: "POST", body: input }),
  generatePlan: (taskId: string) =>
    apiRequest<ControlTask>(`/tasks/${taskId}/plan`, { method: "POST" }),
  queueRun: (taskId: string) =>
    apiRequest<RunRecord>(`/tasks/${taskId}/runs`, { method: "POST" }),
  listRuns: (taskId: string) => apiRequest<RunRecord[]>(`/tasks/${taskId}/runs`),
  listLogs: (runId: string) => apiRequest<RunLog[]>(`/runs/${runId}/logs`),
  listArtifacts: (runId: string) => apiRequest<Artifact[]>(`/runs/${runId}/artifacts`),
  approveRun: (runId: string) =>
    apiRequest<Approval>(`/runs/${runId}/approve`, {
      method: "POST",
      body: { reviewer: "local-user", reason: "Approved from local dashboard." }
    }),
  rejectRun: (runId: string) =>
    apiRequest<Approval>(`/runs/${runId}/reject`, {
      method: "POST",
      body: { reviewer: "local-user", reason: "Rejected from local dashboard." }
    }),
  rerun: (runId: string) => apiRequest<RunRecord>(`/runs/${runId}/rerun`, { method: "POST" }),
  artifactDownloadUrl: (artifactId: string) => `${API_BASE_URL}/runs/artifacts/${artifactId}/download`,
  eventStreamUrl: () => `${API_BASE_URL}/events`
};
