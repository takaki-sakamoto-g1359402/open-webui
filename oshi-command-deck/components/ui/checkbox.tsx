"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, checked, ...props }, ref) => (
    <label className="flex min-h-11 items-center gap-3 rounded-[8px] text-sm font-medium">
      <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          className={cn(
            "peer size-5 appearance-none rounded-[6px] border border-[var(--app-border-strong)] bg-[var(--app-surface)] checked:border-[var(--app-cyan)] checked:bg-[var(--app-cyan)]",
            className
          )}
          {...props}
        />
        <Check
          aria-hidden="true"
          className="pointer-events-none absolute hidden text-white peer-checked:block"
          size={14}
          strokeWidth={3}
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  )
);
Checkbox.displayName = "Checkbox";
