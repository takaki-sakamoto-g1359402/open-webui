"use client";

import { History, WalletCards } from "lucide-react";

import { BalanceStrip, RailiaShell } from "@/components/railia/common";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRailia } from "@/lib/railia/state";
import { getWorkerMetrics, rewardStatusLabel, shortDate, taskStatusLabel, yen } from "@/lib/railia/view";

export function WalletPage() {
  const { state, activeUser } = useRailia();
  const metrics = getWorkerMetrics(state, activeUser);
  const rewards = state.rewards.filter((reward) => reward.workerId === activeUser?.id);
  const completed = state.submissions.filter(
    (submission) =>
      submission.workerId === activeUser?.id &&
      (submission.status === "approved" || submission.status === "paid")
  );

  return (
    <RailiaShell
      title="報酬ウォレット"
      description="このMVPでは実決済は行わず、確認待ち・利用可能・支払い済みの状態遷移だけを記録します。"
    >
      <div className="grid gap-6">
        <BalanceStrip
          available={metrics.availableBalance}
          pending={metrics.pendingRewards}
          paid={metrics.paidRewards}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <WalletCards className="text-primary" />
                <CardTitle>報酬履歴</CardTitle>
              </div>
              <CardDescription>承認されると確認待ちから利用可能残高へ移動します。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {rewards.map((reward) => {
                const task = state.tasks.find((item) => item.id === reward.taskId);
                return (
                  <div key={reward.id} className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={reward.status === "available" ? "default" : "secondary"}>
                          {rewardStatusLabel[reward.status]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{shortDate(reward.updatedAt)}</span>
                      </div>
                      <p className="mt-2 font-semibold">{task?.title ?? reward.historyLabel}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{reward.historyLabel}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <p className="text-xl font-bold">{yen(reward.amount)}</p>
                      {reward.status === "available" ? (
                        <span className="text-xs text-muted-foreground">
                          管理者のモック支払い処理待ち
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="text-primary" />
                <CardTitle>完了タスク履歴</CardTitle>
              </div>
              <CardDescription>品質確認を通過した作業の履歴です。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {completed.map((submission) => {
                const task = state.tasks.find((item) => item.id === submission.taskId);
                return (
                  <div key={submission.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{task?.title ?? "完了タスク"}</p>
                      <Badge variant="secondary">{task ? taskStatusLabel[task.status] : "完了"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      品質スコア {submission.qualityScore ?? "-"} / 報酬 {yen(submission.rewardAmount)}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </RailiaShell>
  );
}
