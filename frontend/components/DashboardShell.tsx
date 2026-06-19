"use client";

// Main client-side dashboard surface for supervised autonomous development runs.
import { useEffect, useMemo, useState } from "react";
import { controlPlaneApi, API_BASE_URL } from "@/lib/api";
import type {
  Artifact,
  ControlTask,
  CreateTaskFormInput,
  RunLog,
  RunRecord
} from "@/types/controlPlane";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import { TaskDetail } from "@/components/TaskDetail";
import { TaskList } from "@/components/TaskList";

type ApiEvent = {
  event: string;
  payload: {
    task_id?: string;
    run_id?: string;
  };
};

export function DashboardShell() {
  const [tasks, setTasks] = useState<ControlTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [notice, setNotice] = useState("Connecting to local API...");
  const [isBusy, setIsBusy] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0],
    [selectedTaskId, tasks]
  );

  const loadRunDetails = async (taskId: string) => {
    const nextRuns = await controlPlaneApi.listRuns(taskId);
    setRuns(nextRuns);
    const latestRun = nextRuns[0];
    if (!latestRun) {
      setLogs([]);
      setArtifacts([]);
      return;
    }
    const [nextLogs, nextArtifacts] = await Promise.all([
      controlPlaneApi.listLogs(latestRun.id),
      controlPlaneApi.listArtifacts(latestRun.id)
    ]);
    setLogs(nextLogs);
    setArtifacts(nextArtifacts);
  };

  const loadTasks = async (preferredTaskId?: string) => {
    const apiTasks = await controlPlaneApi.listTasks();
    setTasks(apiTasks);
    const nextSelectedId = preferredTaskId || selectedTaskId || apiTasks[0]?.id || "";
    setSelectedTaskId(nextSelectedId);
    setNotice("Connected to local API.");
  };

  useEffect(() => {
    let mounted = true;
    controlPlaneApi
      .listTasks()
      .then((apiTasks) => {
        if (!mounted) return;
        setTasks(apiTasks);
        setSelectedTaskId(apiTasks[0]?.id ?? "");
        setNotice("Connected to local API.");
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setNotice(error.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTaskId) {
      setRuns([]);
      setLogs([]);
      setArtifacts([]);
      return;
    }
    let mounted = true;
    loadRunDetails(selectedTaskId)
      .then(() => {
        if (mounted) setNotice("Run state refreshed.");
      })
      .catch((error: Error) => {
        if (mounted) setNotice(error.message);
      });
    return () => {
      mounted = false;
    };
  }, [selectedTaskId]);

  // This legacy dashboard is no longer rendered by Railia, but remains in the
  // folder for local control-plane reference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const source = new EventSource(controlPlaneApi.eventStreamUrl());
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as ApiEvent;
        const eventTaskId = event.payload.task_id;
        if (eventTaskId && eventTaskId !== selectedTaskId) return;
        void loadTasks(eventTaskId || selectedTaskId);
        if (eventTaskId || selectedTaskId) {
          void loadRunDetails(eventTaskId || selectedTaskId);
        }
      } catch {
        setNotice("Received an unreadable event payload.");
      }
    };
    source.onerror = () => {
      source.close();
    };
    return () => {
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId]);

  const withBusy = async (action: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const createTask = async (input: CreateTaskFormInput) => {
    await withBusy(async () => {
      const created = await controlPlaneApi.createTask({
        title: input.title.trim(),
        goal: input.goal.trim(),
        repo_path: input.repo_path.trim() || null,
        metadata: { priority: input.priority }
      });
      setTasks((current) => [created, ...current]);
      setSelectedTaskId(created.id);
      setRuns([]);
      setLogs([]);
      setArtifacts([]);
      setNotice("Task created.");
    });
  };

  const generatePlan = async (taskId: string) => {
    await withBusy(async () => {
      const updated = await controlPlaneApi.generatePlan(taskId);
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
      setNotice("Plan generated.");
    });
  };

  const queueRun = async (taskId: string) => {
    await withBusy(async () => {
      await controlPlaneApi.queueRun(taskId);
      await loadTasks(taskId);
      await loadRunDetails(taskId);
      setNotice("Run queued.");
    });
  };

  const approveRun = async (runId: string) => {
    await withBusy(async () => {
      await controlPlaneApi.approveRun(runId);
      if (selectedTaskId) {
        await loadTasks(selectedTaskId);
        await loadRunDetails(selectedTaskId);
      }
      setNotice("Run approved.");
    });
  };

  const rejectRun = async (runId: string) => {
    await withBusy(async () => {
      await controlPlaneApi.rejectRun(runId);
      if (selectedTaskId) {
        await loadTasks(selectedTaskId);
        await loadRunDetails(selectedTaskId);
      }
      setNotice("Run rejected.");
    });
  };

  const rerun = async (runId: string) => {
    await withBusy(async () => {
      await controlPlaneApi.rerun(runId);
      if (selectedTaskId) {
        await loadTasks(selectedTaskId);
        await loadRunDetails(selectedTaskId);
      }
      setNotice("Rerun queued.");
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            A
          </div>
          <div>
            <h1>Autonomous Development Control Plane</h1>
            <p>Local-first operator dashboard</p>
          </div>
        </div>
        <div className="header-meta" aria-live="polite">
          {isBusy ? "Working" : "Ready"} · {API_BASE_URL}
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Task navigation">
          <CreateTaskForm onCreate={createTask} />
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTask?.id ?? ""}
            onSelect={setSelectedTaskId}
          />
        </aside>

        <main className="main-panel">
          <div className="stack">
            <div className="meta-row">
              <span className="badge accent">{tasks.length} tasks</span>
              <span className="toast" role="status">
                {notice}
              </span>
            </div>

            {selectedTask ? (
              <TaskDetail
                task={selectedTask}
                runs={runs}
                logs={logs}
                artifacts={artifacts}
                onGeneratePlan={generatePlan}
                onQueueRun={queueRun}
                onApprove={approveRun}
                onReject={rejectRun}
                onRerun={rerun}
              />
            ) : (
              <section className="empty">No task selected.</section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
