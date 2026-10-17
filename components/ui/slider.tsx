import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  accentColor?: "vermilion" | "cobalt" | "emerald";
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value = 0,
      accentColor = "vermilion",
      ...props
    },
    ref
  ) => {
    const pct = Math.max(
      0,
      Math.min(100, ((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100)
    );

    const fillHex =
      accentColor === "cobalt"
        ? "#0047BB"
        : accentColor === "emerald"
        ? "#0D7A5F"
        : "#E03C1F";

    return (
      <div className={cn("relative flex w-full items-center py-1", className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{
            background: `linear-gradient(to right, ${fillHex} 0%, ${fillHex} ${pct}%, #D5D2C8 ${pct}%, #D5D2C8 100%)`,
          }}
          className="h-2.5 w-full cursor-pointer appearance-none rounded-sm border border-[#111315] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047BB]"
          {...props}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
