import { RequireRole } from "@/components/railia/common";
import { WorkerDashboardPage } from "@/components/railia/worker-dashboard-page";

export default function WorkerRoute() {
  return (
    <RequireRole role="worker">
      <WorkerDashboardPage />
    </RequireRole>
  );
}
