import React from "react";
import { Info, Lightbulb, AlertTriangle, AlertOctagon } from "lucide-react";

export type CalloutType = "info" | "tip" | "warning" | "danger";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const CALLOUT_STYLES: Record<
  CalloutType,
  {
    container: string;
    border: string;
    icon: React.ElementType;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    defaultTitle: string;
  }
> = {
  info: {
    container: "bg-blue-500/5 text-blue-100",
    border: "border-blue-500/30",
    icon: Info,
    iconColor: "text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-400",
    defaultTitle: "Note",
  },
  tip: {
    container: "bg-emerald-500/5 text-emerald-100",
    border: "border-emerald-500/30",
    icon: Lightbulb,
    iconColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    defaultTitle: "Tip",
  },
  warning: {
    container: "bg-amber-500/5 text-amber-100",
    border: "border-amber-500/30",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    defaultTitle: "Warning",
  },
  danger: {
    container: "bg-rose-500/5 text-rose-100",
    border: "border-rose-500/30",
    icon: AlertOctagon,
    iconColor: "text-rose-400",
    badgeBg: "bg-rose-500/10",
    badgeText: "text-rose-400",
    defaultTitle: "Caution",
  },
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.info;
  const Icon = style.icon;
  const displayTitle = title || style.defaultTitle;

  return (
    <aside
      className={`my-6 rounded-lg border p-4 sm:p-5 ${style.container} ${style.border} transition-colors`}
      role="note"
      aria-label={displayTitle}
    >
      <div className="flex items-center gap-2 mb-2 font-display text-sm font-bold tracking-tight">
        <Icon className={`h-4 w-4 shrink-0 ${style.iconColor}`} aria-hidden="true" />
        <span className="text-foreground">{displayTitle}</span>
      </div>
      <div className="text-sm text-foreground/85 leading-relaxed [&>p]:my-1.5 first:[&>p]:mt-0 last:[&>p]:mb-0">
        {children}
      </div>
    </aside>
  );
}
