import * as React from "react";
import { cn } from "@/lib/utils";

export function Logo({ className, markOnly }: { className?: string; markOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M5 6h14" />
          <path d="M5 18h8" />
          <path d="M8 6v12" />
          <path d="M16 9c.5-.3 1.2-.5 2-.5 1.6 0 2.5.9 2.5 2s-.9 2-2.5 2c-1.4 0-2.5.8-2.5 2s1.1 2 2.5 2c.8 0 1.5-.2 2-.5" />
        </svg>
      </div>
      {!markOnly ? <span className="text-[17px] font-bold tracking-tight text-ink-900">Utterly</span> : null}
    </div>
  );
}
