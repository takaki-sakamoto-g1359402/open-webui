"use client";

import { CheckCircle2, Gauge } from "lucide-react";

import { MetricCard, RailiaShell } from "@/components/railia/common";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRailia } from "@/lib/railia/state";
import { getLevelProgress, getWorkerMetrics } from "@/lib/railia/view";

export function LevelPage() {
  const { state, activeUser } = useRailia();
  const metrics = getWorkerMetrics(state, activeUser);
  const progress = getLevelProgress(state, activeUser);

  return (
    <RailiaShell
      title="レベルシステム"
      description="作業範囲を急に広げず、完了数と品質スコアに応じて段階的に任せる設計です。"
    >
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="現在のレベル" value={`レベル${metrics.currentLevel}`} icon={Gauge} />
          <MetricCard title="完了タスク" value={`${metrics.completedTasks}件`} icon={CheckCircle2} />
          <MetricCard title="品質スコア" value={`${metrics.accuracyScore}%`} icon={Gauge} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>次の要件</CardTitle>
            <CardDescription>次のレベルへ進むための目安です。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Progress value={progress.progress} />
            {progress.next ? (
              <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                <p>次のレベル: レベル{progress.next.level} / {progress.next.title}</p>
                <p>必要完了数: {progress.next.minCompletedTasks}件（残り{progress.remainingTasks}件）</p>
                <p>必要品質スコア: {progress.next.minAccuracyScore}%（残り{progress.remainingAccuracy}ポイント）</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">現在のMVPで定義された最上位レベルです。</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {state.levels.map((level) => (
            <Card key={level.level} className={level.level === metrics.currentLevel ? "ring-2 ring-ring" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={level.level === metrics.currentLevel ? "default" : "secondary"}>
                    レベル{level.level}
                  </Badge>
                  {level.level === metrics.currentLevel ? <Badge variant="outline">現在</Badge> : null}
                </div>
                <CardTitle className="leading-6">{level.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{level.description}</p>
                <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
                  <p>必要完了数: {level.minCompletedTasks}件</p>
                  <p>必要品質: {level.minAccuracyScore}%</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RailiaShell>
  );
}
