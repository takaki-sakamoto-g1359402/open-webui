import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center rounded-[999px] border px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default:
          "border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-text)]",
        live: "status-live",
        scheduled: "status-scheduled",
        ended: "status-ended",
        stale: "status-stale",
        success:
          "border-[rgb(16_122_69_/_0.24)] bg-[var(--app-green-soft)] text-[var(--app-green)]",
        outline:
          "border-[var(--app-border-strong)] bg-transparent text-[var(--app-muted)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
