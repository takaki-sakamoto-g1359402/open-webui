import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, ...props }, ref) => (
    <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        className={cn(
          "peer size-5 appearance-none rounded border border-input bg-card ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:border-primary checked:bg-primary",
          className
        )}
        {...props}
      />
      <Check className="pointer-events-none absolute hidden text-primary-foreground peer-checked:block" />
    </span>
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
