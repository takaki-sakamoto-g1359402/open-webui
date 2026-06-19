"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlayCircle, Send, ShieldCheck } from "lucide-react";

import { RailiaShell, StatusBadge, TrustNotice } from "@/components/railia/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useRailia } from "@/lib/railia/state";
import type { SubmissionChecklist } from "@/lib/railia/types";
import { checklistItems, taskStatusLabel, yen } from "@/lib/railia/view";

const emptyChecklist: SubmissionChecklist = {
  typo: false,
  factual: false,
  natural: false,
  privacy: false,
  instruction: false
};

export function TaskWorkPage({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { state, activeUser, startTask, submitTask } = useRailia();
  const task = state.tasks.find((item) => item.id === taskId);
  const latestSubmission = state.submissions.find(
    (submission) => submission.taskId === taskId && submission.workerId === activeUser?.id
  );
  const [finalAnswer, setFinalAnswer] = useState("");
  const [checklist, setChecklist] = useState<SubmissionChecklist>(emptyChecklist);
  const [submitted, setSubmitted] = useState(false);
  const [loadedWorkKey, setLoadedWorkKey] = useState("");
  const workKey = `${task?.id ?? "missing"}-${task?.status ?? "none"}-${latestSubmission?.updatedAt ?? "none"}`;

  useEffect(() => {
    if (!task || loadedWorkKey === workKey) return;
    if (task.status === "available") {
      setFinalAnswer("");
      setChecklist(emptyChecklist);
    } else if (latestSubmission) {
      setFinalAnswer(latestSubmission.finalAnswer);
      setChecklist(latestSubmission.checklist);
    } else if (task.status === "in_progress") {
      setFinalAnswer(task.aiDraft);
      setChecklist(emptyChecklist);
    }
    setLoadedWorkKey(workKey);
  }, [latestSubmission, loadedWorkKey, task, workKey]);

  const allChecked = useMemo(() => checklistItems.every((item) => checklist[item.key]), [checklist]);
  const canResubmit = latestSubmission?.status === "rejected" && latestSubmission.resubmissionCount < 1;
  const isEditable = task?.status === "in_progress" || (task?.status === "rejected" && canResubmit);
  const canSubmit =
    task &&
    finalAnswer.trim().length > 0 &&
    allChecked &&
    isEditable;

  if (!task) {
    return (
      <RailiaShell title="タスクが見つかりません">
        <Button asChild>
          <Link href="/worker/tasks">タスク一覧へ戻る</Link>
        </Button>
      </RailiaShell>
    );
  }

  const submit = () => {
    if (!canSubmit) return;
    submitTask(task.id, finalAnswer, checklist);
    setSubmitted(true);
  };

  const beginWork = () => {
    if (task.status !== "available") return;
    setFinalAnswer(task.aiDraft);
    setChecklist(emptyChecklist);
    startTask(task.id);
  };

  return (
    <RailiaShell
      title={task.title}
      description="AI下書きをそのまま出すのではなく、人が確認し、必要な修正を加えて提出します。"
      action={
        <Button variant="outline" asChild>
          <Link href="/worker/tasks">
            <ArrowLeft data-icon="inline-start" />
            一覧へ戻る
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{task.category}</Badge>
                <StatusBadge status={task.status} />
                <Badge variant="outline">{task.estimatedMinutes}分</Badge>
                <Badge variant="outline">{yen(task.rewardAmount)}</Badge>
              </div>
              <CardTitle>クライアントの元入力</CardTitle>
              <CardDescription>{task.instructions}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-background p-4 text-sm leading-7">
                {task.originalInput}
              </div>
              {task.status === "available" ? (
                <Button className="mt-4" onClick={beginWork}>
                  <PlayCircle data-icon="inline-start" />
                  作業を開始する
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AIが作成した下書き</CardTitle>
              <CardDescription>
                下書きは出発点です。事実、表現、個人情報、指示との一致を必ず確認してください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-secondary/70 p-4 text-sm leading-7 whitespace-pre-line">
                {task.aiDraft}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最終回答</CardTitle>
              <CardDescription>提出前に、読み手にそのまま渡せる品質へ整えます。</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={finalAnswer}
                onChange={(event) => setFinalAnswer(event.target.value)}
                className="min-h-56 leading-7"
                placeholder={task.status === "available" ? "作業を開始するとAI下書きが入力されます。" : undefined}
                disabled={!isEditable}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary" />
                <CardTitle>品質チェックリスト</CardTitle>
              </div>
              <CardDescription>すべて確認してから提出できます。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {checklistItems.map((item) => (
                <label key={item.key} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <Checkbox
                    checked={checklist[item.key]}
                    onChange={(event) =>
                      setChecklist((current) => ({
                        ...current,
                        [item.key]: event.target.checked
                      }))
                    }
                    disabled={!isEditable}
                  />
                  {item.label}
                </label>
              ))}
              <Separator />
              {task.status === "available" ? (
                <div className="rounded-md border bg-muted p-3 text-sm leading-6 text-muted-foreground">
                  まず「作業を開始する」を押すと、編集とチェックリストが有効になります。
                </div>
              ) : null}
              {task.status === "rejected" && task.rejectionReason ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
                  差し戻し理由: {task.rejectionReason}
                </div>
              ) : null}
              {latestSubmission?.status === "rejected" && latestSubmission.resubmissionCount >= 1 ? (
                <div className="rounded-md border bg-muted p-3 text-sm leading-6 text-muted-foreground">
                  このMVPでは再提出は1回までです。管理者確認に進めてください。
                </div>
              ) : null}
              <Button onClick={submit} disabled={!canSubmit}>
                <Send data-icon="inline-start" />
                提出する
              </Button>
              {submitted ? (
                <div className="grid gap-3 rounded-md border bg-secondary p-3 text-sm">
                  <p>
                    提出しました。タスクは「{taskStatusLabel.submitted}」になり、レビューキューでは
                    「{taskStatusLabel.under_review}」として扱われます。報酬は確認待ちに記録されます。
                  </p>
                  <Button variant="outline" onClick={() => router.push("/worker/wallet")}>
                    ウォレットで確認する
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <TrustNotice />
        </div>
      </div>
    </RailiaShell>
  );
}
