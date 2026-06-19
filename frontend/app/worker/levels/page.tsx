import { RequireRole } from "@/components/railia/common";
import { LevelPage } from "@/components/railia/level-page";

export default function WorkerLevelsRoute() {
  return (
    <RequireRole role="worker">
      <LevelPage />
    </RequireRole>
  );
}
