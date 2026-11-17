import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/button";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm min-w-[640px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-ink-50/60">{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-ink-100">{children}</tbody>;
}

export function TR({ children, className, onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr className={cn("transition-colors hover:bg-ink-50/40", onClick && "cursor-pointer", className)} onClick={onClick}>
      {children}
    </tr>
  );
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("th", className)}>{children}</th>;
}

export function TD({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("td", className)}>{children}</td>;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-ink-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="skeleton h-4 rounded" style={{ width: `${100 / cols}%`, maxWidth: 160 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TableLoading({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-ink-400">
      <Spinner className="h-5 w-5 mr-2 text-brand-500" /> Loading…
    </div>
  );
}
