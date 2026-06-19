import { Badge } from "@/components/ui/badge";
import type { MessageKey } from "@/lib/i18n/catalogs";
import type { StreamStatus } from "@/lib/domain/types";

const statusVariant: Record<StreamStatus, "live" | "scheduled" | "ended" | "stale"> = {
  live: "live",
  scheduled: "scheduled",
  ended: "ended",
  tbd: "stale",
  unverified: "stale"
};

export function StatusBadge({
  status,
  t
}: {
  status: StreamStatus;
  t: (key: MessageKey) => string;
}) {
  return (
    <Badge variant={statusVariant[status]}>
      {t(`status.${status}` as MessageKey)}
    </Badge>
  );
}
