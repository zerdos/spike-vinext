import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorClassName, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn(
        "relative h-3.5 w-full overflow-hidden rounded-sm border border-[#111315] bg-secondary",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full transition-all duration-300 ease-out bg-primary",
          indicatorClassName
        )}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress };
