import { ClientDashboardPage } from "@/components/railia/client-dashboard-page";
import { RequireRole } from "@/components/railia/common";

export default function ClientRoute() {
  return (
    <RequireRole role="client">
      <ClientDashboardPage />
    </RequireRole>
  );
}
