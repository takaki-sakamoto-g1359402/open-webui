"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { initialRailiaState } from "./seed";
import type {
  AuditAction,
  ClientJob,
  RailiaState,
  SubmissionChecklist,
  Task,
  TaskCategory,
  User,
  UserRole
} from "./types";

const STORAGE_KEY = "railia-demo-state-v1";
const STORAGE_VERSION = 1;

type PersistedRailiaState = {
  version: number;
  state: RailiaState;
};

type ClientJobInput = {
  title: string;
  category: TaskCategory;
  originalText: string;
  instructions: string;
  rewardPerTask: number;
  requiredQualityLevel: number;
  taskCount: number;
};

type ReviewInput = {
  submissionId: string;
  approved: boolean;
  reason?: string;
  qualityScore?: number;
};

type RailiaContextValue = {
  state: RailiaState;
  activeUser: RailiaState["users"][number] | null;
  hasHydrated: boolean;
  selectRole: (role: UserRole) => void;
  startTask: (taskId: string) => void;
  submitTask: (taskId: string, finalAnswer: string, checklist: SubmissionChecklist) => void;
  reviewSubmission: (input: ReviewInput) => void;
  markRewardPaid: (rewardId: string) => void;
  createClientJob: (input: ClientJobInput) => void;
  createFlag: (targetType: "task" | "submission" | "worker" | "client", targetId: string, reason: string) => void;
  resetDemo: () => void;
};

const RailiaContext = createContext<RailiaContextValue | null>(null);

const defaultUserByRole: Record<UserRole, string> = {
  worker: "worker-1",
  client: "client-1",
  admin: "admin-1"
};

function cloneInitialState(): RailiaState {
  return JSON.parse(JSON.stringify(initialRailiaState)) as RailiaState;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "worker" || value === "client" || value === "admin";
}

function isArrayField<K extends keyof RailiaState>(state: Partial<RailiaState>, key: K) {
  return Array.isArray(state[key]) ? state[key] : cloneInitialState()[key];
}

function normalizeSelectedUser(users: User[], selectedRole: UserRole | null, activeUserId: string | null) {
  if (!selectedRole) return null;
  const activeUser = users.find((user) => user.id === activeUserId && user.role === selectedRole);
  return activeUser?.id ?? users.find((user) => user.id === defaultUserByRole[selectedRole])?.id ?? null;
}

function normalizeStateShape(candidate: Partial<RailiaState>): RailiaState {
  const seed = cloneInitialState();
  const users = isArrayField(candidate, "users") as RailiaState["users"];
  const selectedRole = isUserRole(candidate.selectedRole) ? candidate.selectedRole : null;

  return {
    ...seed,
    users,
    tasks: isArrayField(candidate, "tasks") as RailiaState["tasks"],
    submissions: isArrayField(candidate, "submissions") as RailiaState["submissions"],
    rewards: isArrayField(candidate, "rewards") as RailiaState["rewards"],
    levels: isArrayField(candidate, "levels") as RailiaState["levels"],
    clientJobs: isArrayField(candidate, "clientJobs") as RailiaState["clientJobs"],
    auditLogs: isArrayField(candidate, "auditLogs") as RailiaState["auditLogs"],
    flags: isArrayField(candidate, "flags") as RailiaState["flags"],
    selectedRole,
    activeUserId: normalizeSelectedUser(
      users,
      selectedRole,
      typeof candidate.activeUserId === "string" ? candidate.activeUserId : null
    )
  };
}

function normalizeStoredState(raw: string): RailiaState {
  const parsed = JSON.parse(raw) as Partial<PersistedRailiaState> | RailiaState;
  if ("version" in parsed && parsed.version === STORAGE_VERSION && parsed.state) {
    return normalizeStateShape(parsed.state);
  }
  return normalizeStateShape(parsed as RailiaState);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timestamp() {
  return new Date().toISOString();
}

function addAudit(
  state: RailiaState,
  action: AuditAction,
  detail: string,
  actorId: string,
  actorRole: UserRole,
  refs: Partial<Pick<Task, "id" | "clientJobId">> & {
    taskId?: string;
    submissionId?: string;
    rewardId?: string;
  } = {}
) {
  state.auditLogs = [
    {
      id: createId("audit"),
      createdAt: timestamp(),
      actorId,
      actorRole,
      action,
      taskId: refs.taskId ?? refs.id,
      submissionId: refs.submissionId,
      clientJobId: refs.clientJobId,
      rewardId: refs.rewardId,
      detail
    },
    ...state.auditLogs
  ];
}

function getActor(state: RailiaState) {
  const activeUser =
    state.users.find((user) => user.id === state.activeUserId) ??
    state.users.find((user) => user.id === defaultUserByRole[state.selectedRole ?? "worker"]) ??
    state.users[0];
  return activeUser;
}

function hasCompleteChecklist(checklist: SubmissionChecklist) {
  return Object.values(checklist).every(Boolean);
}

function canActorReview(actorRole: UserRole, actorId: string, clientId: string) {
  return actorRole === "admin" || (actorRole === "client" && actorId === clientId);
}

export function RailiaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RailiaState>(() => cloneInitialState());
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setState(normalizeStoredState(raw));
      }
    } catch {
      setState(cloneInitialState());
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, state } satisfies PersistedRailiaState)
    );
  }, [hasHydrated, state]);

  const activeUser = useMemo(() => {
    const role = state.selectedRole;
    return (
      state.users.find((user) => user.id === state.activeUserId) ??
      (role ? state.users.find((user) => user.id === defaultUserByRole[role]) : null) ??
      null
    );
  }, [state.activeUserId, state.selectedRole, state.users]);

  const selectRole = useCallback((role: UserRole) => {
    setState((current) => {
      const next = { ...current, selectedRole: role, activeUserId: defaultUserByRole[role] };
      const actor = next.users.find((user) => user.id === next.activeUserId);
      if (actor) {
        addAudit(next, "role_selected", `${actor.name}としてロールを選択しました。`, actor.id, role);
      }
      return next;
    });
  }, []);

  const startTask = useCallback((taskId: string) => {
    setState((current) => {
      const actor = getActor(current);
      if (actor.role !== "worker") return current;
      const currentTask = current.tasks.find((item) => item.id === taskId);
      if (!currentTask || currentTask.status !== "available") return current;
      const next: RailiaState = {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId && task.status === "available"
            ? {
                ...task,
                status: "in_progress",
                assignedWorkerId: actor.id,
                updatedAt: timestamp()
              }
            : task
        ),
        auditLogs: [...current.auditLogs]
      };
      const task = next.tasks.find((item) => item.id === taskId);
      if (task) {
        addAudit(next, "task_started", `${task.title}の作業を開始しました。`, actor.id, actor.role, {
          taskId
        });
      }
      return next;
    });
  }, []);

  const submitTask = useCallback(
    (taskId: string, finalAnswer: string, checklist: SubmissionChecklist) => {
      setState((current) => {
        const actor = getActor(current);
        const task = current.tasks.find((item) => item.id === taskId);
        if (!task) return current;
        if (actor.role !== "worker") return current;
        if (!finalAnswer.trim() || !hasCompleteChecklist(checklist)) return current;
        if (task.assignedWorkerId !== actor.id) return current;

        const existing = current.submissions.find(
          (submission) => submission.taskId === taskId && submission.workerId === actor.id
        );
        const isResubmission = existing?.status === "rejected";
        const canSubmit =
          (task.status === "in_progress" && !existing) ||
          (task.status === "rejected" && isResubmission && existing.resubmissionCount < 1);
        if (!canSubmit) return current;

        const submissionId = existing?.id ?? createId("sub");
        const rewardId =
          current.rewards.find((reward) => reward.submissionId === submissionId)?.id ??
          createId("reward");
        const now = timestamp();

        const next: RailiaState = {
          ...current,
          tasks: current.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  status: "submitted",
                  assignedWorkerId: actor.id,
                  rejectionReason: undefined,
                  updatedAt: now
                }
              : item
          ),
          submissions: existing
            ? current.submissions.map((submission) =>
                submission.id === existing.id
                  ? {
                      ...submission,
                      finalAnswer,
                      checklist,
                      status: "under_review",
                      rejectionReason: undefined,
                      resubmissionCount: isResubmission
                        ? submission.resubmissionCount + 1
                        : submission.resubmissionCount,
                      updatedAt: now
                    }
                  : submission
              )
            : [
                {
                  id: submissionId,
                  taskId,
                  workerId: actor.id,
                  clientId: task.clientId,
                  finalAnswer,
                  checklist,
                  status: "under_review",
                  rewardAmount: task.rewardAmount,
                  resubmissionCount: 0,
                  createdAt: now,
                  updatedAt: now
                },
                ...current.submissions
              ],
          rewards: current.rewards.some((reward) => reward.id === rewardId)
            ? current.rewards.map((reward) =>
                reward.id === rewardId
                  ? {
                      ...reward,
                      amount: task.rewardAmount,
                      status: "pending",
                      updatedAt: now
                    }
                  : reward
              )
            : [
                {
                  id: rewardId,
                  workerId: actor.id,
                  taskId,
                  submissionId,
                  amount: task.rewardAmount,
                  status: "pending",
                  historyLabel: `${task.title}の確認待ち報酬`,
                  createdAt: now,
                  updatedAt: now
                },
                ...current.rewards
              ],
          auditLogs: [...current.auditLogs]
        };

        addAudit(
          next,
          isResubmission ? "submission_resubmitted" : "submission_created",
          isResubmission
            ? `${task.title}を修正して再提出しました。`
            : `${task.title}を提出し、確認待ちにしました。`,
          actor.id,
          actor.role,
          { taskId, submissionId }
        );
        addAudit(next, "reward_pending", `${task.rewardAmount.toLocaleString("ja-JP")}円を確認待ち報酬にしました。`, actor.id, actor.role, {
          taskId,
          submissionId,
          rewardId
        });

        return next;
      });
    },
    []
  );

  const reviewSubmission = useCallback(({ submissionId, approved, reason, qualityScore = 92 }: ReviewInput) => {
    setState((current) => {
      const actor = getActor(current);
      const submission = current.submissions.find((item) => item.id === submissionId);
      if (!submission) return current;
      if (submission.status !== "under_review") return current;
      if (!canActorReview(actor.role, actor.id, submission.clientId)) return current;
      const task = current.tasks.find((item) => item.id === submission.taskId);
      const reward = current.rewards.find((item) => item.submissionId === submissionId);
      const now = timestamp();

      const next: RailiaState = {
        ...current,
        submissions: current.submissions.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                status: approved ? "approved" : "rejected",
                qualityScore: approved ? qualityScore : item.qualityScore,
                rejectionReason: approved ? undefined : reason || "品質確認で修正が必要と判断されました。",
                updatedAt: now
              }
            : item
        ),
        tasks: current.tasks.map((item) =>
          item.id === submission.taskId
            ? {
                ...item,
                status: approved ? "approved" : "rejected",
                qualityScore: approved ? qualityScore : item.qualityScore,
                rejectionReason: approved ? undefined : reason || "品質確認で修正が必要と判断されました。",
                updatedAt: now
              }
            : item
        ),
        rewards: current.rewards.map((item) =>
          item.submissionId === submissionId
            ? {
                ...item,
                status: approved ? "available" : "cancelled",
                historyLabel: approved
                  ? `${task?.title ?? "提出物"}の承認済み報酬`
                  : `${task?.title ?? "提出物"}の差し戻し取消報酬`,
                updatedAt: now
              }
            : item
        ),
        users: approved
          ? current.users.map((user) => {
              if (user.id !== submission.workerId) return user;
              const completedTasks = (user.completedTasks ?? 0) + 1;
              const previousAccuracy = user.accuracyScore ?? 0;
              const nextAccuracy = Math.round(
                ((previousAccuracy * (completedTasks - 1)) + qualityScore) / completedTasks
              );
              return {
                ...user,
                completedTasks,
                totalEarned: (user.totalEarned ?? 0) + submission.rewardAmount,
                accuracyScore: nextAccuracy
              };
            })
          : current.users,
        auditLogs: [...current.auditLogs],
        flags: approved
          ? current.flags
          : [
              {
                id: createId("flag"),
                targetType: "submission",
                targetId: submissionId,
                reason: reason || "差し戻し理由の確認",
                severity: "中",
                status: "確認待ち",
                createdAt: now
              },
              ...current.flags
            ]
      };

      addAudit(
        next,
        approved ? "submission_approved" : "submission_rejected",
        approved
          ? `${task?.title ?? "提出物"}を品質スコア${qualityScore}で承認しました。`
          : `${task?.title ?? "提出物"}を差し戻しました。理由: ${reason || "修正が必要です。"}`,
        actor.id,
        actor.role,
        { taskId: submission.taskId, submissionId, rewardId: reward?.id }
      );

      if (approved && reward) {
        addAudit(next, "reward_available", "報酬を利用可能残高へ移動しました。", actor.id, actor.role, {
          taskId: submission.taskId,
          submissionId,
          rewardId: reward.id
        });
      }

      if (!approved) {
        addAudit(
          next,
          "flag_created",
          `${task?.title ?? "提出物"}の差し戻しに伴い、品質確認フラグを追加しました。`,
          actor.id,
          actor.role,
          { taskId: submission.taskId, submissionId, rewardId: reward?.id }
        );
      }

      return next;
    });
  }, []);

  const markRewardPaid = useCallback((rewardId: string) => {
    setState((current) => {
      const actor = getActor(current);
      const reward = current.rewards.find((item) => item.id === rewardId);
      if (!reward || reward.status !== "available") return current;
      if (actor.role !== "admin") return current;
      const task = current.tasks.find((item) => item.id === reward.taskId);
      const next: RailiaState = {
        ...current,
        rewards: current.rewards.map((item) =>
          item.id === rewardId
            ? {
                ...item,
                status: "paid",
                historyLabel: `${task?.title ?? "報酬"}の支払い済み報酬`,
                updatedAt: timestamp()
              }
            : item
        ),
        tasks: current.tasks.map((task) =>
          task.id === reward.taskId ? { ...task, status: "paid", updatedAt: timestamp() } : task
        ),
        submissions: current.submissions.map((submission) =>
          submission.id === reward.submissionId
            ? { ...submission, status: "paid", updatedAt: timestamp() }
            : submission
        ),
        auditLogs: [...current.auditLogs]
      };
      addAudit(next, "reward_paid", "モック支払いとして支払い済みにしました。", actor.id, actor.role, {
        taskId: reward.taskId,
        submissionId: reward.submissionId,
        rewardId
      });
      return next;
    });
  }, []);

  const createClientJob = useCallback((input: ClientJobInput) => {
    setState((current) => {
      const actor = getActor(current);
      if (actor.role !== "client") return current;
      const now = timestamp();
      const rewardPerTask = Math.min(5000, Math.max(300, Math.round(input.rewardPerTask || 300)));
      const requiredQualityLevel = Math.min(4, Math.max(1, Math.round(input.requiredQualityLevel || 1)));
      const taskCount = Math.min(5, Math.max(1, Math.round(input.taskCount || 1)));
      const clientJob: ClientJob = {
        id: createId("job"),
        clientId: actor.id,
        title: input.title.trim(),
        category: input.category,
        originalText: input.originalText.trim(),
        instructions: input.instructions.trim(),
        rewardPerTask,
        requiredQualityLevel,
        taskCount,
        createdAt: now
      };
      const tasks: Task[] = Array.from({ length: taskCount }, (_, index) => ({
        id: createId(`task-${index + 1}`),
        clientJobId: clientJob.id,
        clientId: actor.id,
        title: `${clientJob.title} ${taskCount > 1 ? `${index + 1}` : ""}`.trim(),
        category: input.category,
        originalInput: clientJob.originalText,
        instructions: clientJob.instructions,
        aiDraft: `${clientJob.originalText}\n\nAI下書き: 指示に沿って、確認しやすい短い成果物に整えます。必要に応じて事実確認待ちの項目を残します。`,
        estimatedMinutes: 15,
        rewardAmount: rewardPerTask,
        difficulty: requiredQualityLevel >= 3 ? "注意" : "標準",
        status: "available",
        requiredQualityLevel,
        createdAt: now,
        updatedAt: now
      }));
      const next: RailiaState = {
        ...current,
        clientJobs: [clientJob, ...current.clientJobs],
        tasks: [...tasks, ...current.tasks],
        auditLogs: [...current.auditLogs]
      };
      addAudit(next, "client_job_created", `${clientJob.title}を${taskCount}件のタスクとして登録しました。`, actor.id, actor.role, {
        clientJobId: clientJob.id
      });
      return next;
    });
  }, []);

  const createFlag = useCallback(
    (targetType: "task" | "submission" | "worker" | "client", targetId: string, reason: string) => {
      setState((current) => {
        const actor = getActor(current);
        const now = timestamp();
        const next: RailiaState = {
          ...current,
          flags: [
            {
              id: createId("flag"),
              targetType,
              targetId,
              reason,
              severity: "中",
              status: "確認待ち",
              createdAt: now
            },
            ...current.flags
          ],
          auditLogs: [...current.auditLogs]
        };
        addAudit(next, "flag_created", `確認フラグを追加しました: ${reason}`, actor.id, actor.role);
        return next;
      });
    },
    []
  );

  const resetDemo = useCallback(() => {
    const next = cloneInitialState();
    window.localStorage.removeItem(STORAGE_KEY);
    setState(next);
  }, []);

  const value = useMemo(
    () => ({
      state,
      activeUser,
      hasHydrated,
      selectRole,
      startTask,
      submitTask,
      reviewSubmission,
      markRewardPaid,
      createClientJob,
      createFlag,
      resetDemo
    }),
    [
      activeUser,
      createClientJob,
      createFlag,
      hasHydrated,
      markRewardPaid,
      resetDemo,
      reviewSubmission,
      selectRole,
      startTask,
      state,
      submitTask
    ]
  );

  return <RailiaContext.Provider value={value}>{children}</RailiaContext.Provider>;
}

export function useRailia() {
  const context = useContext(RailiaContext);
  if (!context) {
    throw new Error("useRailia must be used inside RailiaProvider.");
  }
  return context;
}
