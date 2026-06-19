"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { AuditLogList, RailiaShell, StatusBadge } from "@/components/railia/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useRailia } from "@/lib/railia/state";
import type { TaskCategory } from "@/lib/railia/types";
import { checklistItems, shortDate, submissionStatusLabel, taskCategories, yen } from "@/lib/railia/view";

const initialForm = {
  title: "",
  category: "商品説明作成" as TaskCategory,
  originalText: "",
  instructions: "",
  rewardPerTask: 700,
  requiredQualityLevel: 2,
  taskCount: 1
};

export function ClientDashboardPage() {
  const { state, activeUser, createClientJob, reviewSubmission } = useRailia();
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const clientTasks = state.tasks.filter((task) => task.clientId === activeUser?.id);
  const clientSubmissions = useMemo(
    () =>
      state.submissions
        .filter((submission) => submission.clientId === activeUser?.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [activeUser?.id, state.submissions]
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    const originalText = form.originalText.trim();
    const instructions = form.instructions.trim();
    const rewardPerTask = Math.round(Number(form.rewardPerTask));
    const requiredQualityLevel = Math.round(Number(form.requiredQualityLevel));
    const taskCount = Math.round(Number(form.taskCount));

    if (!title || !originalText || !instructions) {
      setFormError("依頼タイトル、元テキスト、指示を入力してください。");
      return;
    }
    if (!Number.isFinite(rewardPerTask) || rewardPerTask < 300 || rewardPerTask > 5000) {
      setFormError("1件あたり報酬は300円から5,000円の範囲で入力してください。");
      return;
    }
    if (!Number.isFinite(requiredQualityLevel) || requiredQualityLevel < 1 || requiredQualityLevel > 4) {
      setFormError("必要品質は1から4の範囲で入力してください。");
      return;
    }
    if (!Number.isFinite(taskCount) || taskCount < 1 || taskCount > 5) {
      setFormError("件数は1から5の範囲で入力してください。");
      return;
    }

    createClientJob({
      ...form,
      title,
      originalText,
      instructions,
      rewardPerTask,
      requiredQualityLevel,
      taskCount
    });
    setFormError("");
    setForm(initialForm);
  };

  return (
    <RailiaShell
      title="クライアントダッシュボード"
      description="依頼作成、提出物の確認、承認・差し戻しを行います。実決済や本人確認はまだ実装しません。"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="text-primary" />
                <CardTitle>仕事を依頼する</CardTitle>
              </div>
              <CardDescription>カテゴリ、元テキスト、報酬、品質レベル、件数を指定します。</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={submit}>
                <label className="grid gap-2 text-sm font-medium">
                  依頼タイトル
                  <Input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="商品説明の確認"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  カテゴリ
                  <NativeSelect
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, category: event.target.value as TaskCategory }))
                    }
                  >
                    {taskCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  元テキスト・素材
                  <Textarea
                    value={form.originalText}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, originalText: event.target.value }))
                    }
                    placeholder="依頼の元になる文章や条件を入力"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  指示
                  <Textarea
                    value={form.instructions}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, instructions: event.target.value }))
                    }
                    placeholder="確認してほしい点、避けたい表現、納品形式"
                    required
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-2 text-sm font-medium">
                    1件あたり報酬
                    <Input
                      type="number"
                      min={300}
                      max={5000}
                      value={form.rewardPerTask}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, rewardPerTask: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    必要品質
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      value={form.requiredQualityLevel}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          requiredQualityLevel: Number(event.target.value)
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    件数
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={form.taskCount}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, taskCount: Number(event.target.value) }))
                      }
                    />
                  </label>
                </div>
                {formError ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {formError}
                  </p>
                ) : null}
                <Button type="submit">依頼を作成する</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>依頼中タスク</CardTitle>
              <CardDescription>作成済みタスクの状態です。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {clientTasks.map((task) => (
                <div key={task.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{task.title}</p>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {task.category} / {yen(task.rewardAmount)} / 品質レベル{task.requiredQualityLevel}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>提出物の確認</CardTitle>
              <CardDescription>承認すると報酬が利用可能残高へ移動します。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {clientSubmissions.map((submission) => {
                const task = state.tasks.find((item) => item.id === submission.taskId);
                return (
                  <div key={submission.id} className="grid gap-4 rounded-md border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{task?.title ?? "提出物"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {shortDate(submission.updatedAt)} / 報酬 {yen(submission.rewardAmount)}
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
                    {submission.status === "under_review" ? (
                      <div className="grid gap-3">
                        <Textarea
                          value={rejectReasons[submission.id] ?? ""}
                          onChange={(event) =>
                            setRejectReasons((current) => ({
                              ...current,
                              [submission.id]: event.target.value
                            }))
                          }
                          placeholder="差し戻す場合の理由"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            onClick={() =>
                              reviewSubmission({
                                submissionId: submission.id,
                                approved: true,
                                qualityScore: 94
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
                                reason: rejectReasons[submission.id] || "指示との一致に修正が必要です。"
                              })
                            }
                          >
                            <X data-icon="inline-start" />
                            差し戻す
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <AuditLogList limit={7} />
        </div>
      </div>
    </RailiaShell>
  );
}
