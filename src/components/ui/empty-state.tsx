import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, compact, className, children }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6", compact ? "py-8" : "py-14", className)}>
      {icon ? (
        <div className={cn("flex items-center justify-center rounded-2xl bg-brand-50 text-brand-500", compact ? "mb-3 h-10 w-10" : "mb-4 h-12 w-12")}>
          {icon}
        </div>
      ) : null}
      <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
