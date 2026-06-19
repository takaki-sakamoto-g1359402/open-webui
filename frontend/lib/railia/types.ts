export type UserRole = "worker" | "client" | "admin";

export type TaskCategory =
  | "文章修正"
  | "商品説明作成"
  | "SNS投稿案"
  | "字幕修正"
  | "口コミ要約"
  | "問い合わせ返信案"
  | "データ確認"
  | "リサーチ整理";

export type TaskDifficulty = "初級" | "標準" | "注意";

export type TaskStatus =
  | "available"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid";

export type SubmissionStatus = "under_review" | "approved" | "rejected" | "paid";

export type RewardStatus = "pending" | "available" | "paid" | "cancelled";

export type AuditAction =
  | "role_selected"
  | "task_started"
  | "ai_draft_reviewed"
  | "submission_created"
  | "submission_resubmitted"
  | "submission_approved"
  | "submission_rejected"
  | "reward_pending"
  | "reward_available"
  | "reward_paid"
  | "client_job_created"
  | "flag_created";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  level?: number;
  accuracyScore?: number;
  completedTasks?: number;
  totalEarned?: number;
  createdAt: string;
}

export interface Task {
  id: string;
  clientJobId: string;
  clientId: string;
  title: string;
  category: TaskCategory;
  originalInput: string;
  instructions: string;
  aiDraft: string;
  estimatedMinutes: number;
  rewardAmount: number;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  requiredQualityLevel: number;
  assignedWorkerId?: string;
  rejectionReason?: string;
  qualityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionChecklist {
  typo: boolean;
  factual: boolean;
  natural: boolean;
  privacy: boolean;
  instruction: boolean;
}

export interface Submission {
  id: string;
  taskId: string;
  workerId: string;
  clientId: string;
  finalAnswer: string;
  checklist: SubmissionChecklist;
  status: SubmissionStatus;
  rewardAmount: number;
  qualityScore?: number;
  rejectionReason?: string;
  resubmissionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reward {
  id: string;
  workerId: string;
  taskId: string;
  submissionId: string;
  amount: number;
  status: RewardStatus;
  historyLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface Level {
  level: number;
  title: string;
  description: string;
  minCompletedTasks: number;
  minAccuracyScore: number;
}

export interface ClientJob {
  id: string;
  clientId: string;
  title: string;
  category: TaskCategory;
  originalText: string;
  instructions: string;
  rewardPerTask: number;
  requiredQualityLevel: number;
  taskCount: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  createdAt: string;
  actorId: string;
  actorRole: UserRole;
  action: AuditAction;
  taskId?: string;
  submissionId?: string;
  clientJobId?: string;
  rewardId?: string;
  detail: string;
}

export interface Flag {
  id: string;
  targetType: "task" | "submission" | "worker" | "client";
  targetId: string;
  reason: string;
  severity: "低" | "中" | "高";
  status: "確認待ち" | "対応中" | "解決済み";
  createdAt: string;
}

export interface RailiaState {
  users: User[];
  tasks: Task[];
  submissions: Submission[];
  rewards: Reward[];
  levels: Level[];
  clientJobs: ClientJob[];
  auditLogs: AuditLog[];
  flags: Flag[];
  selectedRole: UserRole | null;
  activeUserId: string | null;
}
