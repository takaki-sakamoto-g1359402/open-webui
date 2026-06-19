"use client";

import { useState } from "react";
import { Check, CreditCard, Flag, ShieldAlert, UsersRound, X } from "lucide-react";

import { AuditLogList, RailiaShell, StatusBadge } from "@/components/railia/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useRailia } from "@/lib/railia/state";
import { checklistItems, shortDate, submissionStatusLabel, yen } from "@/lib/railia/view";

const flagTargetTypeLabel = {
  task: "タスク",
  submission: "提出物",
  worker: "ワーカー",
  client: "クライアント"
} as const;

export function AdminDashboardPage() {
  const { state, reviewSubmission, createFlag, markRewardPaid } = useRailia();
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const underReview = state.submissions.filter((submission) => submission.status === "under_review");
  const availableRewards = state.rewards.filter((reward) => reward.status === "available");
  const workers = state.users.filter((user) => user.role === "worker");
  const clients = state.users.filter((user) => user.role === "client");

  return (
    <RailiaShell
      title="管理者ダッシュボード"
      description="確認待ち提出、フラグ、ユーザー、監査ログを見て、品質と安全性のゲートを管理します。"
    >
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["確認待ち提出", `${underReview.length}件`],
            ["フラグ", `${state.flags.length}件`],
            ["ワーカー", `${workers.length}名`],
            ["支払い待ち", `${availableRewards.length}件`]
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="grid content-start gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-primary" />
                  <CardTitle>確認待ち提出</CardTitle>
                </div>
                <CardDescription>管理者が承認・差し戻しを代行できます。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {underReview.map((submission) => {
                  const task = state.tasks.find((item) => item.id === submission.taskId);
                  const worker = state.users.find((user) => user.id === submission.workerId);
                  return (
                    <div key={submission.id} className="grid gap-4 rounded-md border p-4">
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <p className="font-semibold">{task?.title ?? "提出物"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {worker?.name ?? "ワーカー"} / {shortDate(submission.updatedAt)} / {yen(submission.rewardAmount)}
                          </p>
                        </div>
                        <Badge variant="secondary">{submissionStatusLabel[submission.status]}</Badge>
                      </div>
                      <div className="rounded-md bg-secondary p-3 text-sm leading-7 whitespace-pre-line">
                        {submission.finalAnswer}
                      </div>
                      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        {checklistItems.map((item) => (
                          <span key={item.key} className="flex items-center gap-2">
                            <Badge variant={submission.checklist[item.key] ? "secondary" : "destructive"}>
                              {submission.checklist[item.key] ? "確認済み" : "未確認"}
                            </Badge>
                            {item.label}
                          </span>
                        ))}
                      </div>
                      <Textarea
                        value={rejectReasons[submission.id] ?? ""}
                        onChange={(event) =>
                          setRejectReasons((current) => ({
                            ...current,
                            [submission.id]: event.target.value
                          }))
                        }
                        placeholder="差し戻し理由"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          onClick={() =>
                            reviewSubmission({
                              submissionId: submission.id,
                              approved: true,
                              qualityScore: 93
                            })
                          }
                        >
                          <Check data-icon="inline-start" />
                          承認する
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            reviewSubmission({
                              submissionId: submission.id,
                              approved: false,
                              reason: rejectReasons[submission.id] || "品質基準に対して修正が必要です。"
                            })
                          }
                        >
                          <X data-icon="inline-start" />
                          差し戻す
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            createFlag("submission", submission.id, "管理者による追加確認が必要です。")
                          }
                        >
                          <Flag data-icon="inline-start" />
                          フラグ
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="text-primary" />
                  <CardTitle>モック支払い処理</CardTitle>
                </div>
                <CardDescription>実決済は行わず、承認済み報酬を支払い済み状態へ移します。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {availableRewards.length ? (
                  availableRewards.map((reward) => {
                    const task = state.tasks.find((item) => item.id === reward.taskId);
                    const worker = state.users.find((user) => user.id === reward.workerId);
                    return (
                      <div key={reward.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_auto]">
                        <div>
                          <p className="font-semibold">{task?.title ?? reward.historyLabel}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {worker?.name ?? "ワーカー"} / {yen(reward.amount)} / {shortDate(reward.updatedAt)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => markRewardPaid(reward.id)}>
                          <CreditCard data-icon="inline-start" />
                          支払い済みにする
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">支払い処理待ちの報酬はありません。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>タスク履歴</CardTitle>
                <CardDescription>全タスクの状態、報酬、品質スコアを確認します。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {state.tasks.map((task) => (
                  <div key={task.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{task.title}</p>
                        <Badge variant="outline">{task.category}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {yen(task.rewardAmount)} / 品質 {task.qualityScore ?? "-"} / 更新 {shortDate(task.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid content-start gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Flag className="text-primary" />
                  <CardTitle>フラグと不審活動</CardTitle>
                </div>
                <CardDescription>低品質・不正疑いのプレースホルダーです。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {state.flags.map((flag) => (
                  <div key={flag.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={flag.severity === "高" ? "destructive" : "secondary"}>
                        重要度 {flag.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{flag.status}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6">{flag.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      対象: {flagTargetTypeLabel[flag.targetType]} / {flag.targetId}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UsersRound className="text-primary" />
                  <CardTitle>ユーザー</CardTitle>
                </div>
                <CardDescription>ワーカーとクライアントのモック一覧です。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[...workers, ...clients].map((user) => (
                  <div key={user.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-semibold">{user.name}</p>
                      <Badge variant="outline">{user.role === "worker" ? "ワーカー" : "クライアント"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      完了 {user.completedTasks ?? 0}件 / 品質 {user.accuracyScore ?? "-"} / 報酬 {yen(user.totalEarned ?? 0)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <AuditLogList limit={10} />
          </div>
        </div>
      </div>
    </RailiaShell>
  );
}
