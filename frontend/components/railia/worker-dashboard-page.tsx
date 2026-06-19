"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, Coins, Gauge, ListChecks, Percent } from "lucide-react";

import {
  AuditLogList,
  MetricCard,
  RailiaShell,
  SectionHeader,
  TaskCard,
  TrustNotice
} from "@/components/railia/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRailia } from "@/lib/railia/state";
import { getLevelProgress, getWorkerMetrics, yen } from "@/lib/railia/view";

export function WorkerDashboardPage() {
  const { state, activeUser } = useRailia();
  const metrics = getWorkerMetrics(state, activeUser);
  const level = getLevelProgress(state, activeUser);
  const workerTasks = state.tasks
    .filter((task) => task.status === "available" || task.assignedWorkerId === activeUser?.id)
    .slice(0, 4);

  return (
    <RailiaShell
      title="ワーカーダッシュボード"
      description="AIの下書きを確認し、人の判断で品質を整えるための作業画面です。"
      action={
        <Button asChild>
          <Link href="/worker/tasks">タスクを探す</Link>
        </Button>
      }
    >
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="現在のレベル"
            value={`レベル${metrics.currentLevel}`}
            description={level.current?.title}
            icon={Gauge}
            progress={level.progress}
          />
          <MetricCard title="累計報酬" value={yen(metrics.totalEarned)} icon={Coins} />
          <MetricCard title="完了タスク" value={`${metrics.completedTasks}件`} icon={CheckCircle2} />
          <MetricCard title="品質スコア" value={`${metrics.accuracyScore}%`} icon={Percent} />
          <MetricCard title="確認待ち" value={`${metrics.pendingReviewTasks}件`} icon={Clock3} />
          <MetricCard title="表示中タスク" value={`${metrics.availableTasks}件`} icon={ListChecks} />
        </div>

        <TrustNotice />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
          <section>
            <SectionHeader
              title="作業できるタスク"
              description="5〜30分で終えやすいタスクを、AI下書き付きで確認できます。"
            />
            <div className="grid gap-4 md:grid-cols-2">
              {workerTasks.map((task) => (
                <TaskCard key={task.id} task={task} href={`/worker/tasks/${task.id}`} />
              ))}
            </div>
          </section>

          <div className="grid content-start gap-6">
            <Card>
              <CardHeader>
                <CardTitle>次のレベルまで</CardTitle>
                <CardDescription>
                  完了数と品質スコアを両方見て、無理なく次の作業範囲に進みます。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Progress value={level.progress} />
                {level.next ? (
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <p>次: レベル{level.next.level} / {level.next.title}</p>
                    <p>残り完了数: {level.remainingTasks}件</p>
                    <p>必要品質まで: {level.remainingAccuracy}ポイント</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">現在のMVPで最上位レベルです。</p>
                )}
              </CardContent>
            </Card>
            <AuditLogList limit={5} />
          </div>
        </div>
      </div>
    </RailiaShell>
  );
}
