import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

const colors = [
  "bg-brand-100 text-brand-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", color, className)}>
      {initials(name)}
    </div>
  );
}
