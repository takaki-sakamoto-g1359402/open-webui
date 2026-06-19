import { RequireRole } from "@/components/railia/common";
import { TaskWorkPage } from "@/components/railia/task-work-page";

export default function WorkerTaskWorkRoute({ params }: { params: { taskId: string } }) {
  return (
    <RequireRole role="worker">
      <TaskWorkPage taskId={params.taskId} />
    </RequireRole>
  );
}
