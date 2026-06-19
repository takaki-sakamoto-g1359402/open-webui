import type { AuditLog, ClientJob, Flag, Level, RailiaState, Reward, Submission, Task, User } from "./types";

const now = "2026-06-01T18:00:00+09:00";

export const levels: Level[] = [
  {
    level: 1,
    title: "AIの出力を確認する",
    description: "AI下書きの確認、誤字脱字、指示とのズレを見つける段階です。",
    minCompletedTasks: 0,
    minAccuracyScore: 0
  },
  {
    level: 2,
    title: "AIの文章を修正する",
    description: "不自然な表現を直し、読み手に合わせて整える段階です。",
    minCompletedTasks: 5,
    minAccuracyScore: 86
  },
  {
    level: 3,
    title: "AIと一緒に提案を作る",
    description: "条件を整理し、複数案や改善提案まで作れる段階です。",
    minCompletedTasks: 14,
    minAccuracyScore: 90
  },
  {
    level: 4,
    title: "他ワーカーのレビューや案件管理を行う",
    description: "品質確認、差し戻し判断、案件進行を支援できる段階です。",
    minCompletedTasks: 30,
    minAccuracyScore: 94
  }
];

const users: User[] = [
  {
    id: "worker-1",
    name: "山田 花子",
    role: "worker",
    email: "hanako@example.local",
    level: 2,
    accuracyScore: 91,
    completedTasks: 12,
    totalEarned: 12800,
    createdAt: "2026-05-12T10:00:00+09:00"
  },
  {
    id: "worker-2",
    name: "佐藤 翔",
    role: "worker",
    email: "sho@example.local",
    level: 1,
    accuracyScore: 84,
    completedTasks: 4,
    totalEarned: 3200,
    createdAt: "2026-05-18T11:20:00+09:00"
  },
  {
    id: "worker-3",
    name: "鈴木 美咲",
    role: "worker",
    email: "misaki@example.local",
    level: 3,
    accuracyScore: 95,
    completedTasks: 22,
    totalEarned: 24600,
    createdAt: "2026-05-03T08:30:00+09:00"
  },
  {
    id: "client-1",
    name: "北浜ストア",
    role: "client",
    email: "kitahama@example.local",
    createdAt: "2026-05-01T09:00:00+09:00"
  },
  {
    id: "client-2",
    name: "ミドリ学習室",
    role: "client",
    email: "midori@example.local",
    createdAt: "2026-05-09T14:20:00+09:00"
  },
  {
    id: "admin-1",
    name: "運営レビュー担当",
    role: "admin",
    email: "admin@example.local",
    createdAt: "2026-04-25T12:00:00+09:00"
  }
];

const clientJobs: ClientJob[] = [
  {
    id: "job-1",
    clientId: "client-1",
    title: "商品説明の確認と改善",
    category: "商品説明作成",
    originalText: "新作の軽量リュック。通勤、通学、旅行につかえる。収納が多い。",
    instructions: "初心者にも伝わる自然な商品説明にしてください。",
    rewardPerTask: 850,
    requiredQualityLevel: 2,
    taskCount: 3,
    createdAt: "2026-05-28T10:00:00+09:00"
  },
  {
    id: "job-2",
    clientId: "client-2",
    title: "学習室SNS投稿案",
    category: "SNS投稿案",
    originalText: "中学生向け定期テスト対策。無料体験あり。駅から徒歩5分。",
    instructions: "落ち着いた印象で、保護者が不安なく読める投稿案にしてください。",
    rewardPerTask: 650,
    requiredQualityLevel: 2,
    taskCount: 2,
    createdAt: "2026-05-29T13:10:00+09:00"
  }
];

const tasks: Task[] = [
  {
    id: "task-1",
    clientJobId: "job-1",
    clientId: "client-1",
    title: "軽量リュックの商品説明を整える",
    category: "商品説明作成",
    originalInput: "新作の軽量リュック。通勤、通学、旅行につかえる。収納が多い。",
    instructions: "過度な表現を避け、購入前に役立つ情報を自然にまとめる。",
    aiDraft: "毎日の通勤や通学、短い旅行にも使いやすい軽量リュックです。複数の収納スペースがあり、荷物を整理しながら持ち運べます。",
    estimatedMinutes: 20,
    rewardAmount: 850,
    difficulty: "初級",
    status: "approved",
    requiredQualityLevel: 2,
    assignedWorkerId: "worker-3",
    qualityScore: 92,
    createdAt: "2026-05-28T10:10:00+09:00",
    updatedAt: now
  },
  {
    id: "task-2",
    clientJobId: "job-2",
    clientId: "client-2",
    title: "定期テスト対策のSNS投稿案",
    category: "SNS投稿案",
    originalInput: "中学生向け定期テスト対策。無料体験あり。駅から徒歩5分。",
    instructions: "保護者向けに安心感のある投稿案を2案にしてください。",
    aiDraft: "定期テスト前の不安を少し軽くしませんか。ミドリ学習室では中学生向けの対策授業と無料体験を用意しています。駅から徒歩5分で通いやすい環境です。",
    estimatedMinutes: 15,
    rewardAmount: 650,
    difficulty: "初級",
    status: "under_review",
    requiredQualityLevel: 2,
    assignedWorkerId: "worker-2",
    createdAt: "2026-05-29T13:15:00+09:00",
    updatedAt: now
  },
  {
    id: "task-3",
    clientJobId: "job-1",
    clientId: "client-1",
    title: "商品レビュー3件の要約",
    category: "口コミ要約",
    originalInput: "軽い、肩が楽。ポケットが多い。色が写真より少し暗い。ファスナーは滑らか。",
    instructions: "良い点と注意点を分けて、事実ベースで要約する。",
    aiDraft: "軽さや肩への負担の少なさ、ポケットの多さ、ファスナーの滑らかさが評価されています。一方で、色味は写真より暗く感じる場合があります。",
    estimatedMinutes: 10,
    rewardAmount: 500,
    difficulty: "初級",
    status: "under_review",
    requiredQualityLevel: 2,
    assignedWorkerId: "worker-1",
    createdAt: "2026-05-30T09:20:00+09:00",
    updatedAt: now
  },
  {
    id: "task-4",
    clientJobId: "job-2",
    clientId: "client-2",
    title: "問い合わせ返信案を作る",
    category: "問い合わせ返信案",
    originalInput: "無料体験は何分ですか。保護者も同席できますか。",
    instructions: "丁寧で短い返信案にしてください。不明点は断定しない。",
    aiDraft: "お問い合わせありがとうございます。無料体験の時間と保護者同席について、確認のうえご案内いたします。ご希望の曜日と時間帯もあわせてお知らせください。",
    estimatedMinutes: 10,
    rewardAmount: 550,
    difficulty: "標準",
    status: "approved",
    requiredQualityLevel: 2,
    assignedWorkerId: "worker-1",
    qualityScore: 94,
    createdAt: "2026-05-30T15:00:00+09:00",
    updatedAt: now
  },
  {
    id: "task-5",
    clientJobId: "job-1",
    clientId: "client-1",
    title: "商品説明の誤字と表現を確認",
    category: "文章修正",
    originalInput: "このリュックは軽量で、通勤通学に便利です。大容量でたくさんはいる。",
    instructions: "誤字脱字と不自然な表現だけを整える。",
    aiDraft: "このリュックは軽量で、通勤や通学に便利です。大容量でたくさん入ります。",
    estimatedMinutes: 8,
    rewardAmount: 400,
    difficulty: "初級",
    status: "paid",
    requiredQualityLevel: 1,
    assignedWorkerId: "worker-1",
    qualityScore: 96,
    createdAt: "2026-05-27T16:00:00+09:00",
    updatedAt: now
  },
  {
    id: "task-6",
    clientJobId: "job-2",
    clientId: "client-2",
    title: "字幕テキストの読みやすさ確認",
    category: "字幕修正",
    originalInput: "えー今日は定期テストの準備について話します。まず計画をたてて毎日少しずつ。",
    instructions: "口癖を減らし、字幕として読みやすくする。",
    aiDraft: "今日は定期テストの準備について話します。まず計画を立て、毎日少しずつ進めることが大切です。",
    estimatedMinutes: 18,
    rewardAmount: 700,
    difficulty: "標準",
    status: "rejected",
    requiredQualityLevel: 2,
    assignedWorkerId: "worker-1",
    rejectionReason: "一部の表現が元の発言内容より強く言い換えられています。断定表現を少し弱めてください。",
    createdAt: "2026-05-29T17:40:00+09:00",
    updatedAt: now
  },
  {
    id: "task-7",
    clientJobId: "job-1",
    clientId: "client-1",
    title: "商品データの表記確認",
    category: "データ確認",
    originalInput: "重量: 520g / 容量: 18L / 素材: ポリエステル / 色: 黒、紺、灰",
    instructions: "数字と単位の抜け、表記ゆれを確認し、修正案を出す。",
    aiDraft: "重量は520g、容量は18L、素材はポリエステルです。カラーは黒、紺、灰の3色です。",
    estimatedMinutes: 12,
    rewardAmount: 500,
    difficulty: "注意",
    status: "available",
    requiredQualityLevel: 2,
    createdAt: "2026-06-01T11:00:00+09:00",
    updatedAt: now
  },
  {
    id: "task-8",
    clientJobId: "job-2",
    clientId: "client-2",
    title: "競合学習室の特徴整理",
    category: "リサーチ整理",
    originalInput: "駅周辺の学習室3件。料金、対象学年、無料体験、開校時間を整理したい。",
    instructions: "このプロトタイプでは検索済みメモを整理する想定。断定できない情報は確認待ちにする。",
    aiDraft: "料金、対象学年、無料体験、開校時間の4項目で表にすると比較しやすくなります。不明な項目は確認待ちとして残します。",
    estimatedMinutes: 30,
    rewardAmount: 1200,
    difficulty: "注意",
    status: "available",
    requiredQualityLevel: 3,
    createdAt: "2026-06-01T14:20:00+09:00",
    updatedAt: now
  }
];

const checklist = {
  typo: true,
  factual: true,
  natural: true,
  privacy: true,
  instruction: true
};

const submissions: Submission[] = [
  {
    id: "sub-1",
    taskId: "task-3",
    workerId: "worker-1",
    clientId: "client-1",
    finalAnswer: "良い点は、軽さ、肩への負担の少なさ、ポケットの多さ、ファスナーの滑らかさです。注意点として、色味が写真より少し暗く見える場合があります。",
    checklist,
    status: "under_review",
    rewardAmount: 500,
    resubmissionCount: 0,
    createdAt: "2026-05-30T10:05:00+09:00",
    updatedAt: now
  },
  {
    id: "sub-2",
    taskId: "task-4",
    workerId: "worker-1",
    clientId: "client-2",
    finalAnswer: "お問い合わせありがとうございます。無料体験の時間と保護者さまの同席可否について、確認のうえご案内いたします。よろしければ、ご希望の曜日と時間帯もお知らせください。",
    checklist,
    status: "approved",
    rewardAmount: 550,
    qualityScore: 94,
    resubmissionCount: 0,
    createdAt: "2026-05-30T15:30:00+09:00",
    updatedAt: now
  },
  {
    id: "sub-3",
    taskId: "task-5",
    workerId: "worker-1",
    clientId: "client-1",
    finalAnswer: "このリュックは軽量で、通勤や通学に便利です。大容量でたくさん入ります。",
    checklist,
    status: "paid",
    rewardAmount: 400,
    qualityScore: 96,
    resubmissionCount: 0,
    createdAt: "2026-05-27T16:30:00+09:00",
    updatedAt: now
  },
  {
    id: "sub-4",
    taskId: "task-6",
    workerId: "worker-1",
    clientId: "client-2",
    finalAnswer: "今日は定期テストの準備について話します。まず計画を立て、毎日少しずつ進めることが大切です。",
    checklist,
    status: "rejected",
    rewardAmount: 700,
    rejectionReason: "一部の表現が元の発言内容より強く言い換えられています。断定表現を少し弱めてください。",
    resubmissionCount: 0,
    createdAt: "2026-05-29T18:10:00+09:00",
    updatedAt: now
  },
  {
    id: "sub-5",
    taskId: "task-2",
    workerId: "worker-2",
    clientId: "client-2",
    finalAnswer: "定期テストに向けて、少しずつ準備を進めたい方へ。ミドリ学習室では中学生向けの対策授業と無料体験をご案内しています。",
    checklist,
    status: "under_review",
    rewardAmount: 650,
    resubmissionCount: 0,
    createdAt: "2026-06-01T16:10:00+09:00",
    updatedAt: now
  },
  {
    id: "sub-6",
    taskId: "task-1",
    workerId: "worker-3",
    clientId: "client-1",
    finalAnswer: "毎日の通勤・通学から短い旅行まで使いやすい軽量リュックです。複数の収納スペースがあり、荷物を分けて持ち運べます。",
    checklist,
    status: "approved",
    rewardAmount: 850,
    qualityScore: 92,
    resubmissionCount: 0,
    createdAt: "2026-06-01T17:20:00+09:00",
    updatedAt: now
  }
];

const rewards: Reward[] = [
  {
    id: "reward-1",
    workerId: "worker-1",
    taskId: "task-3",
    submissionId: "sub-1",
    amount: 500,
    status: "pending",
    historyLabel: "口コミ要約の確認待ち報酬",
    createdAt: "2026-05-30T10:05:00+09:00",
    updatedAt: now
  },
  {
    id: "reward-2",
    workerId: "worker-1",
    taskId: "task-4",
    submissionId: "sub-2",
    amount: 550,
    status: "available",
    historyLabel: "問い合わせ返信案の承認済み報酬",
    createdAt: "2026-05-30T15:30:00+09:00",
    updatedAt: now
  },
  {
    id: "reward-3",
    workerId: "worker-1",
    taskId: "task-5",
    submissionId: "sub-3",
    amount: 400,
    status: "paid",
    historyLabel: "文章修正の支払い済み報酬",
    createdAt: "2026-05-27T16:30:00+09:00",
    updatedAt: "2026-05-28T10:00:00+09:00"
  },
  {
    id: "reward-4",
    workerId: "worker-2",
    taskId: "task-2",
    submissionId: "sub-5",
    amount: 650,
    status: "pending",
    historyLabel: "SNS投稿案の確認待ち報酬",
    createdAt: "2026-06-01T16:10:00+09:00",
    updatedAt: now
  },
  {
    id: "reward-5",
    workerId: "worker-3",
    taskId: "task-1",
    submissionId: "sub-6",
    amount: 850,
    status: "available",
    historyLabel: "商品説明作成の承認済み報酬",
    createdAt: "2026-06-01T17:20:00+09:00",
    updatedAt: now
  }
];

const auditLogs: AuditLog[] = [
  {
    id: "audit-1",
    createdAt: "2026-05-27T16:30:00+09:00",
    actorId: "worker-1",
    actorRole: "worker",
    action: "submission_created",
    taskId: "task-5",
    submissionId: "sub-3",
    detail: "ワーカーが文章修正タスクを提出しました。"
  },
  {
    id: "audit-2",
    createdAt: "2026-05-28T10:00:00+09:00",
    actorId: "admin-1",
    actorRole: "admin",
    action: "reward_paid",
    taskId: "task-5",
    submissionId: "sub-3",
    rewardId: "reward-3",
    detail: "モック支払いとして報酬を支払い済みにしました。"
  },
  {
    id: "audit-3",
    createdAt: "2026-05-29T18:20:00+09:00",
    actorId: "client-2",
    actorRole: "client",
    action: "submission_rejected",
    taskId: "task-6",
    submissionId: "sub-4",
    detail: "表現の断定が強いため差し戻しました。"
  },
  {
    id: "audit-4",
    createdAt: "2026-05-30T10:05:00+09:00",
    actorId: "worker-1",
    actorRole: "worker",
    action: "reward_pending",
    taskId: "task-3",
    submissionId: "sub-1",
    rewardId: "reward-1",
    detail: "提出により報酬を確認待ちにしました。"
  },
  {
    id: "audit-5",
    createdAt: "2026-05-30T15:40:00+09:00",
    actorId: "client-2",
    actorRole: "client",
    action: "submission_approved",
    taskId: "task-4",
    submissionId: "sub-2",
    rewardId: "reward-2",
    detail: "クライアントが提出物を承認しました。"
  },
  {
    id: "audit-6",
    createdAt: "2026-06-01T17:30:00+09:00",
    actorId: "admin-1",
    actorRole: "admin",
    action: "submission_approved",
    taskId: "task-1",
    submissionId: "sub-6",
    rewardId: "reward-5",
    detail: "管理者が品質スコア92で承認しました。"
  }
];

const flags: Flag[] = [
  {
    id: "flag-1",
    targetType: "submission",
    targetId: "sub-4",
    reason: "元テキストからの意味ずれの可能性",
    severity: "中",
    status: "対応中",
    createdAt: "2026-05-29T18:22:00+09:00"
  },
  {
    id: "flag-2",
    targetType: "worker",
    targetId: "worker-2",
    reason: "初回提出の品質ばらつき確認",
    severity: "低",
    status: "確認待ち",
    createdAt: "2026-06-01T16:30:00+09:00"
  }
];

export const initialRailiaState: RailiaState = {
  users,
  tasks,
  submissions,
  rewards,
  levels,
  clientJobs,
  auditLogs,
  flags,
  selectedRole: null,
  activeUserId: null
};
