"use client";

// Task list navigation with compact status and recency signals.
import type { ControlTask, TaskStatus } from "@/types/controlPlane";

interface TaskListProps {
  tasks: ControlTask[];
  selectedTaskId: string;
  onSelect: (taskId: string) => void;
}

const statusClass: Partial<Record<TaskStatus, string>> = {
  approved: "ok",
  rejected: "danger",
  failed: "danger",
  queued: "warn",
  running: "accent",
  awaiting_approval: "warn",
  planned: "accent"
};

export function TaskList({ tasks, selectedTaskId, onSelect }: TaskListProps) {
  return (
    <section className="panel" aria-labelledby="task-list-title">
      <div className="panel-header">
        <h2 id="task-list-title">Tasks</h2>
      </div>
      <div className="task-list" role="list">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            className={`task-row ${selectedTaskId === task.id ? "is-selected" : ""}`}
            onClick={() => onSelect(task.id)}
            aria-current={selectedTaskId === task.id ? "true" : undefined}
          >
            <span>
              <span className="task-row-title">{task.title}</span>
              <span className="task-row-summary">{task.goal}</span>
            </span>
            <span className={`badge ${statusClass[task.status] ?? ""}`}>{task.status}</span>
          </button>
        ))}
        {tasks.length === 0 ? <div className="empty">No tasks yet.</div> : null}
      </div>
    </section>
  );
}
