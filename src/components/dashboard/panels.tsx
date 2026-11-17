import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/button";

export function PageHeader({ title, description, actions }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-950">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, accent }: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "blue" | "green" | "amber" | "red" | "violet";
}) {
  const accents = {
    blue: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-ink-400">{label}</p>
        {icon ? <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accents[accent ?? "blue"])}>{icon}</div> : null}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-ink-950">{value}</div>
      {sub ? <div className="mt-1.5 text-xs text-ink-400">{sub}</div> : null}
    </div>
  );
}

export function PanelSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className="card p-5">
      <div className="skeleton h-4 w-36 rounded" />
      <div className={cn("mt-4 skeleton rounded-xl", height)} />
    </div>
  );
}

export function CardLoading() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-ink-400">
      <Spinner className="h-5 w-5 mr-2 text-brand-500" /> Loading…
    </div>
  );
}
