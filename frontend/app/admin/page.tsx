import { AdminDashboardPage } from "@/components/railia/admin-dashboard-page";
import { RequireRole } from "@/components/railia/common";

export default function AdminRoute() {
  return (
    <RequireRole role="admin">
      <AdminDashboardPage />
    </RequireRole>
  );
}
