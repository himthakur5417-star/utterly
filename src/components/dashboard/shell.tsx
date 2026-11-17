"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Sparkles,
  BellRing,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Sparkle,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/recovery", label: "AI Recovery", icon: Sparkles },
  { href: "/dashboard/automation", label: "Automation", icon: BellRing },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-7 w-7 text-brand-500" />
      </div>
    );
  }

  if (!user) return null;

  const isActive = (item: (typeof navItems)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard"><Logo /></Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive(item)
                ? "bg-brand-50 text-brand-700"
                : "text-ink-500 hover:bg-ink-50 hover:text-ink-900",
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        ))}
        {user.role === "ADMIN" ? (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "mt-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
              pathname.startsWith("/admin") ? "border-violet-200 bg-violet-50 text-violet-700" : "border-ink-100 text-ink-500 hover:bg-violet-50",
            )}
          >
            <ShieldCheck className="h-[18px] w-[18px]" />
            Admin
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-ink-100 p-3">
        <div className="rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 p-4">
          <div className="flex items-center gap-2 text-brand-700">
            <Sparkle className="h-4 w-4" />
            <span className="text-sm font-semibold">{user.plan === "STARTER" ? "Starter" : user.plan === "BUSINESS" ? "Business" : "Professional"}</span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {user.plan === "BUSINESS" ? "Advanced AI recovery & support." : "Upgrade to unlock more."}
          </p>
          {user.plan !== "BUSINESS" ? (
            <Link href="/dashboard/settings?tab=pricing" className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700">
              Upgrade →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink-100 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-pop">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-400 hover:bg-ink-50">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-100 bg-white/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden"><Logo markOnly /></div>
          </div>

          {user.isDemoUser ? (
            <div className="hidden items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 sm:inline-flex">
              <Sparkle className="h-3.5 w-3.5" />
              Demo workspace — sample data
            </div>
          ) : null}

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-full p-1.5 hover:bg-ink-50"
            >
              <Avatar name={user.name} />
              <div className="hidden text-left sm:block">
                <div className="text-sm font-medium leading-tight text-ink-900">{user.name}</div>
                <div className="text-xs text-ink-400">{user.businessName ?? user.email}</div>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-ink-400 sm:block" />
            </button>

            {userMenuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
                  <div className="border-b border-ink-100 px-3 pb-3 pt-1">
                    <div className="text-sm font-medium text-ink-900">{user.name}</div>
                    <div className="truncate text-xs text-ink-400">{user.email}</div>
                    <div className="mt-1.5 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                      {user.plan} plan
                    </div>
                  </div>
                  <Link href="/dashboard/settings" onClick={() => setUserMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-ink-50">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="border-t border-ink-100 px-6 py-4 text-xs text-ink-400">
          © {new Date().getFullYear()} Utterly · AI Invoice & Payment Recovery
        </footer>
      </div>
    </div>
  );
}
