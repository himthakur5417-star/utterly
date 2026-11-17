import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "gray" | "blue" | "green" | "amber" | "red" | "violet" | "teal";

const tones: Record<Tone, string> = {
  gray: "bg-ink-100 text-ink-600",
  blue: "bg-brand-50 text-brand-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
  teal: "bg-teal-50 text-teal-700",
};

export function Badge({ tone = "gray", className, ...props }: {
  tone?: Tone;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("badge", tones[tone], className)} {...props} />;
}

const dotTones: Record<string, string> = {
  gray: "bg-ink-400",
  blue: "bg-brand-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
};

export function Dot({ tone = "gray", className }: { tone?: Tone; className?: string }) {
  return <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotTones[tone], className)} />;
}
