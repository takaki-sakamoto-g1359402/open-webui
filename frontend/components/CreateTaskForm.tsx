"use client";

// Accessible task creation form aligned to the FastAPI task contract.
import { FormEvent, useState } from "react";
import type { CreateTaskFormInput } from "@/types/controlPlane";

interface CreateTaskFormProps {
  onCreate: (input: CreateTaskFormInput) => Promise<void>;
}

const initialForm: CreateTaskFormInput = {
  title: "",
  goal: "",
  repo_path: "",
  priority: "normal"
};

export function CreateTaskForm({ onCreate }: CreateTaskFormProps) {
  const [form, setForm] = useState<CreateTaskFormInput>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.goal.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate(form);
      setForm(initialForm);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="create-task-title">
      <div className="panel-header">
        <h2 id="create-task-title">Create Task</h2>
      </div>
      <div className="panel-body">
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="task-title">Title</label>
            <input
              id="task-title"
              className="input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Implement workspace scanner"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="task-goal">Goal</label>
            <textarea
              id="task-goal"
              className="textarea"
              value={form.goal}
              onChange={(event) => setForm({ ...form, goal: event.target.value })}
              placeholder="Describe desired outcome, boundaries, and validation expectations."
              required
            />
          </div>

          <div className="field">
            <label htmlFor="task-repository">Repository Path</label>
            <input
              id="task-repository"
              className="input"
              value={form.repo_path}
              onChange={(event) => setForm({ ...form, repo_path: event.target.value })}
              placeholder="/path/to/repo"
            />
          </div>

          <div className="field">
            <label htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              className="select"
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as CreateTaskFormInput["priority"] })
              }
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create task"}
          </button>
        </form>
      </div>
    </section>
  );
}
