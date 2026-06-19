import type {
  ClientJob,
  RailiaState,
  Reward,
  Submission,
  SubmissionChecklist,
  Task,
  TaskCategory,
  User
} from "./types";

export type DraftRequest = {
  category: TaskCategory;
  originalInput: string;
  instructions: string;
};

export type DraftResult = {
  draft: string;
  modelLabel: string;
  createdAt: string;
};

export type ReviewGateInput = {
  task: Task;
  submission: Submission;
  checklist: SubmissionChecklist;
};

export type ReviewGateResult = {
  approved: boolean;
  qualityScore?: number;
  rejectionReason?: string;
  flagReason?: string;
};

export type PaymentRecord = {
  reward: Reward;
  worker: User;
  externalPaymentId?: string;
};

export type IdentityCheckResult = {
  userId: string;
  status: "未確認" | "確認中" | "確認済み" | "要確認";
  checkedAt?: string;
};

export type TaxSupportRecord = {
  userId: string;
  year: number;
  totalRewardAmount: number;
  note: string;
};

export interface AiDraftPort {
  createDraft(request: DraftRequest): Promise<DraftResult>;
}

export interface PersistencePort {
  loadState(): Promise<RailiaState | null>;
  saveState(state: RailiaState): Promise<void>;
}

export interface ReviewPolicyPort {
  review(input: ReviewGateInput): Promise<ReviewGateResult>;
}

export interface PaymentPort {
  markPaid(record: PaymentRecord): Promise<PaymentRecord>;
}

export interface IdentityVerificationPort {
  getStatus(user: User): Promise<IdentityCheckResult>;
}

export interface TaxSupportPort {
  createAnnualRecord(user: User, rewards: Reward[], year: number): Promise<TaxSupportRecord>;
}

export type RailiaIntegrationPorts = {
  aiDraft: AiDraftPort;
  persistence: PersistencePort;
  reviewPolicy: ReviewPolicyPort;
  payment: PaymentPort;
  identityVerification: IdentityVerificationPort;
  taxSupport: TaxSupportPort;
};
