"use client";

import { useMemo, useState } from "react";

import { RailiaShell, TaskCard, TrustNotice } from "@/components/railia/common";
import { Button } from "@/components/ui/button";
import { useRailia } from "@/lib/railia/state";
import type { TaskCategory } from "@/lib/railia/types";
import { taskCategories } from "@/lib/railia/view";
import { cn } from "@/lib/utils";

export function TaskListPage() {
  const { state, activeUser } = useRailia();
  const [category, setCategory] = useState<TaskCategory | "すべて">("すべて");
  const tasks = useMemo(
    () =>
      state.tasks.filter((task) => {
        const visibleToWorker = task.status === "available" || task.assignedWorkerId === activeUser?.id;
        const categoryMatch = category === "すべて" || task.category === category;
        return visibleToWorker && categoryMatch;
      }),
    [activeUser?.id, category, state.tasks]
  );

  return (
    <RailiaShell
      title="タスク一覧"
      description="タスク内容、目安時間、報酬、難易度、状態を確認してから作業を開始します。"
    >
      <div className="grid gap-6">
        <TrustNotice />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["すべて", ...taskCategories] as Array<TaskCategory | "すべて">).map((item) => (
            <Button
              key={item}
              variant={category === item ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(item)}
              className={cn("shrink-0")}
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} href={`/worker/tasks/${task.id}`} />
          ))}
        </div>
      </div>
    </RailiaShell>
  );
}
