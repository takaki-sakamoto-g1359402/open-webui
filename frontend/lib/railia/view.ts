import type {
  AuditAction,
  RailiaState,
  RewardStatus,
  SubmissionChecklist,
  SubmissionStatus,
  TaskCategory,
  TaskStatus,
  User
} from "./types";

export const taskCategories: TaskCategory[] = [
  "文章修正",
  "商品説明作成",
  "SNS投稿案",
  "字幕修正",
  "口コミ要約",
  "問い合わせ返信案",
  "データ確認",
  "リサーチ整理"
];

export const checklistItems: Array<{ key: keyof SubmissionChecklist; label: string }> = [
  { key: "typo", label: "誤字脱字はないか" },
  { key: "factual", label: "事実と違う内容はないか" },
  { key: "natural", label: "不自然な表現はないか" },
  { key: "privacy", label: "個人情報は含まれていないか" },
  { key: "instruction", label: "指示に合っているか" }
];

export const taskStatusLabel: Record<TaskStatus, string> = {
  available: "受付中",
  in_progress: "作業中",
  submitted: "提出済み",
  under_review: "確認待ち",
  approved: "承認済み",
  rejected: "差し戻し",
  paid: "支払い済み"
};

export const submissionStatusLabel: Record<SubmissionStatus, string> = {
  under_review: "確認待ち",
  approved: "承認済み",
  rejected: "差し戻し",
  paid: "支払い済み"
};

export const rewardStatusLabel: Record<RewardStatus, string> = {
  pending: "確認待ち",
  available: "利用可能",
  paid: "支払い済み",
  cancelled: "取り消し"
};

export const auditActionLabel: Record<AuditAction, string> = {
  role_selected: "ロール選択",
  task_started: "作業開始",
  ai_draft_reviewed: "AI下書き確認",
  submission_created: "提出",
  submission_resubmitted: "再提出",
  submission_approved: "承認",
  submission_rejected: "差し戻し",
  reward_pending: "報酬確認待ち",
  reward_available: "報酬利用可能",
  reward_paid: "支払い済み",
  client_job_created: "依頼作成",
  flag_created: "フラグ追加"
};

export function yen(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getWorkerMetrics(state: RailiaState, worker: User | null) {
  const workerId = worker?.id ?? "";
  const rewards = state.rewards.filter((reward) => reward.workerId === workerId);
  const completedSubmissions = state.submissions.filter(
    (submission) =>
      submission.workerId === workerId &&
      (submission.status === "approved" || submission.status === "paid")
  );
  const pendingSubmissions = state.submissions.filter(
    (submission) => submission.workerId === workerId && submission.status === "under_review"
  );
  const availableBalance = rewards
    .filter((reward) => reward.status === "available")
    .reduce((total, reward) => total + reward.amount, 0);
  const pendingRewards = rewards
    .filter((reward) => reward.status === "pending")
    .reduce((total, reward) => total + reward.amount, 0);
  const paidRewards = rewards
    .filter((reward) => reward.status === "paid")
    .reduce((total, reward) => total + reward.amount, 0);
  const totalEarned = worker?.totalEarned ?? availableBalance + pendingRewards + paidRewards;

  return {
    availableTasks: state.tasks.filter(
      (task) => task.status === "available" || task.assignedWorkerId === workerId
    ).length,
    currentLevel: worker?.level ?? 1,
    totalEarned,
    completedTasks: worker?.completedTasks ?? completedSubmissions.length,
    accuracyScore: worker?.accuracyScore ?? 0,
    pendingReviewTasks: pendingSubmissions.length,
    availableBalance,
    pendingRewards,
    paidRewards
  };
}

export function getLevelProgress(state: RailiaState, worker: User | null) {
  const metrics = getWorkerMetrics(state, worker);
  const current = state.levels.find((level) => level.level === metrics.currentLevel) ?? state.levels[0];
  const next = state.levels.find((level) => level.level === metrics.currentLevel + 1);
  if (!next) {
    return {
      current,
      next: null,
      progress: 100,
      remainingTasks: 0,
      remainingAccuracy: 0
    };
  }
  const taskProgress = Math.min(100, (metrics.completedTasks / next.minCompletedTasks) * 100);
  const accuracyProgress = next.minAccuracyScore
    ? Math.min(100, (metrics.accuracyScore / next.minAccuracyScore) * 100)
    : 100;
  return {
    current,
    next,
    progress: Math.round((taskProgress + accuracyProgress) / 2),
    remainingTasks: Math.max(0, next.minCompletedTasks - metrics.completedTasks),
    remainingAccuracy: Math.max(0, next.minAccuracyScore - metrics.accuracyScore)
  };
}
