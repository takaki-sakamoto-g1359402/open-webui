import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  className
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-36 flex-col items-start justify-center gap-2 rounded-[8px] border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] p-4",
        className
      )}
    >
      <AlertCircle aria-hidden="true" className="text-[var(--app-cyan)]" size={20} />
      <h2 className="text-base font-bold">{title}</h2>
      <p className="text-sm leading-5 text-[var(--app-muted)]">{body}</p>
    </section>
  );
}
