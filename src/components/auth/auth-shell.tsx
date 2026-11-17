import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 bg-grid-fade opacity-40" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/"><Logo /></Link>
        </div>
        <div className="card p-8 shadow-pop">
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-ink-400">{subtitle}</p> : null}
          <div className="mt-7">{children}</div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-ink-500">{footer}</div> : null}
      </div>
    </div>
  );
}
