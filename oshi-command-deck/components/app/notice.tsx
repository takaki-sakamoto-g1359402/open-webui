import { Info } from "lucide-react";

export function AlertBanner({ title, body }: { title: string; body: string }) {
  return (
    <section className="mb-4 flex gap-3 rounded-[8px] border border-[rgb(4_124_158_/_0.25)] bg-[var(--app-cyan-soft)] p-3">
      <Info aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--app-cyan)]" size={18} />
      <div>
        <h2 className="text-sm font-black text-[var(--app-text)]">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-[var(--app-muted)]">{body}</p>
      </div>
    </section>
  );
}
