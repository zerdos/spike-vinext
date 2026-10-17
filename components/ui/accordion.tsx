"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  openValues: string[];
  toggleValue: (val: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(
  undefined
);

const AccordionItemContext = React.createContext<{ value: string; isOpen: boolean }>({
  value: "",
  isOpen: false,
});

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string) => void;
  collapsible?: boolean;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      className,
      type = "single",
      value,
      defaultValue,
      onValueChange,
      children,
      ...props
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = React.useState<string[]>(() => {
      if (!defaultValue) return [];
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    });

    const openValues = React.useMemo(() => {
      if (value !== undefined) {
        if (Array.isArray(value)) return value;
        return value ? [value] : [];
      }
      return internalOpen;
    }, [value, internalOpen]);

    const toggleValue = React.useCallback(
      (itemValue: string) => {
        if (type === "single") {
          const next = openValues.includes(itemValue) ? "" : itemValue;
          if (value === undefined) {
            setInternalOpen(next ? [next] : []);
          }
          onValueChange?.(next);
        } else {
          const exists = openValues.includes(itemValue);
          const nextArr = exists
            ? openValues.filter((v) => v !== itemValue)
            : [...openValues, itemValue];
          if (value === undefined) {
            setInternalOpen(nextArr);
          }
        }
      },
      [type, openValues, value, onValueChange]
    );

    return (
      <AccordionContext.Provider value={{ openValues, toggleValue }}>
        <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceOpen?: boolean;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, forceOpen = false, children, ...props }, ref) => {
    const context = React.useContext(AccordionContext);
    const isOpen = forceOpen || Boolean(context?.openValues.includes(value));

    return (
      <AccordionItemContext.Provider value={{ value, isOpen }}>
        <div
          ref={ref}
          data-state={isOpen ? "open" : "closed"}
          className={cn(
            "rounded-lg border border-[#C8C5BC] bg-card overflow-hidden transition-colors",
            isOpen && "border-[#111315]",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, ...props }, ref) => {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={item.isOpen}
      onClick={(e) => {
        accordion?.toggleValue(item.value);
        onClick?.(e);
      }}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-foreground hover:bg-secondary/70 transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
          item.isOpen && "rotate-180 text-foreground"
        )}
      />
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const item = React.useContext(AccordionItemContext);
  if (!item.isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn("border-t border-[#C8C5BC] bg-secondary/40 p-1.5", className)}
      {...props}
    >
      {children}
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
