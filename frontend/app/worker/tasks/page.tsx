import { RequireRole } from "@/components/railia/common";
import { TaskListPage } from "@/components/railia/task-list-page";

export default function WorkerTasksRoute() {
  return (
    <RequireRole role="worker">
      <TaskListPage />
    </RequireRole>
  );
}
