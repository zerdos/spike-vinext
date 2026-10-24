"use client";

import {
  TokenSavingsSimulator,
  TokenSavingsSimulatorProps,
} from "@/components/token-savings-simulator";
import { Gauge, Sparkles } from "lucide-react";

export interface RoiCalculatorProps extends TokenSavingsSimulatorProps {
  title?: string;
  description?: string;
}

export function RoiCalculator({
  title = "Token Savings & Economic ROI Calculator",
  description = "Simulate prompt token reductions, Position-Zero prefix cache retention, and monthly cloud bill savings for your engineering team.",
  ...props
}: RoiCalculatorProps) {
  return (
    <div className="my-8 rounded-xl border-2 border-border/70 bg-card overflow-hidden shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-display text-sm font-bold text-foreground">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          <span>Interactive Component • Live Edge Sandbox</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {description && (
          <p className="mb-6 text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
        <TokenSavingsSimulator {...props} />
      </div>
    </div>
  );
}
