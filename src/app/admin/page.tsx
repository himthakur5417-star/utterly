"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Users as UsersIcon, AlertTriangle, LayoutDashboard, ArrowLeft, Search } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard, CardLoading } from "@/components/dashboard/panels";
import { EmptyState } from "@/components/ui/empty-state";

interface Stats {
  stats: { users: number; activeSubs: number; monthlyRecurringRevenue: number; totalProcessed: number; invoices: number; payments: number; auditLogs: number; failedEmails: number };
  planDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  recentErrors: { id: string; to: string; subject: string; error?: string; createdAt: string }[];
}
interface AdminUser {
  id: string; name: string; email: string; role: string; status: string; plan: string; businessName?: string;
  createdAt: string; invoiceCount: number; clientCount: number;
  subscription?: { tier: string; status: string; priceAmount: number } | null;
}
const PLANS = ["STARTER", "PROFESSIONAL", "BUSINESS"];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = React.useState("overview");
  const [search, setSearch] = React.useState("");

  const { data, loading: statsLoading, error, reload } = useFetch<Stats>("/api/admin/stats");
  const { data: usersData, loading: usersLoading, reload: reloadUsers } = useFetch<{ users: AdminUser[] }>(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`);

  React.useEffect(() => {
    if (!loading && user && user.role !== "ADMIN") router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><CardLoading /></div>;
  if (!user || user.role !== "ADMIN") return null;

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const json = await res.json();
    if (!res.ok) { toast("error", "Failed", json.error); return; }
    toast("success", "User updated", `Status set to ${status}.`);
    reloadUsers();
  };
  const setPlan = async (id: string, plan: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const json = await res.json();
    if (!res.ok) { toast("error", "Failed", json.error); return; }
    toast("success", "Plan updated", `Plan set to ${plan}.`);
    reloadUsers();
  };

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-100 bg-white/80 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 text-white"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <div className="font-semibold text-ink-950">Admin panel</div>
            <div className="text-xs text-ink-400">Utterly platform owner</div>
          </div>
        </div>
        <Link href="/dashboard" className="btn-secondary h-10 px-4 inline-flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> Back to app</Link>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex gap-1 rounded-xl border border-ink-100 bg-white p-1 w-fit">
          {[["overview", "Overview"], ["users", "Users"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("rounded-lg px-4 py-2 text-sm font-medium transition", tab === k ? "bg-ink-950 text-white" : "text-ink-500 hover:bg-ink-50")}>{l}</button>
          ))}
        </div>

        {tab === "overview" ? (
          statsLoading ? <CardLoading /> : error ? <div className="card p-8 text-center text-sm text-red-600">{error}</div> : data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Registered users" value={data.stats.users} icon={<UsersIcon className="h-4 w-4" />} accent="blue" />
                <StatCard label="Active subscriptions" value={data.stats.activeSubs} icon={<ShieldCheck className="h-4 w-4" />} accent="green" />
                <StatCard label="MRR" value={formatCurrency(data.stats.monthlyRecurringRevenue)} sub="active plans" icon={<ShieldCheck className="h-4 w-4" />} accent="violet" />
                <StatCard label="Processed volume" value={formatCurrency(data.stats.totalProcessed)} sub={`${data.stats.payments} payments`} icon={<ShieldCheck className="h-4 w-4" />} accent="amber" />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card><CardHeader><CardTitle>Usage</CardTitle></CardHeader><CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span className="text-ink-500">Invoices</span><span className="font-medium text-ink-900">{data.stats.invoices}</span></li>
                    <li className="flex justify-between"><span className="text-ink-500">Payments</span><span className="font-medium text-ink-900">{data.stats.payments}</span></li>
                    <li className="flex justify-between"><span className="text-ink-500">Audit events</span><span className="font-medium text-ink-900">{data.stats.auditLogs}</span></li>
                    <li className="flex justify-between"><span className="text-ink-500">Failed emails</span><span className="font-medium text-red-600">{data.stats.failedEmails}</span></li>
                  </ul>
                </CardContent></Card>
                <Card><CardHeader><CardTitle>Plan distribution</CardTitle></CardHeader><CardContent>
                  <ul className="space-y-2">{PLANS.map((p) => (
                    <li key={p} className="flex items-center justify-between text-sm">
                      <span className="text-ink-500">{p}</span>
                      <Badge tone="gray">{data.planDistribution[p] ?? 0}</Badge>
                    </li>))}</ul>
                </CardContent></Card>
                <Card><CardHeader><CardTitle>Subscription status</CardTitle></CardHeader><CardContent>
                  <ul className="space-y-2">{Object.entries(data.statusDistribution).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between text-sm">
                      <span className="text-ink-500">{k}</span><Badge tone="blue">{v}</Badge>
                    </li>))}</ul>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Recent email errors</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {data.recentErrors.length === 0 ? (
                    <EmptyState compact icon={<AlertTriangle className="h-5 w-5" />} title="No recent errors" description="All emails are healthy." />
                  ) : (
                    <ul className="divide-y divide-ink-50">
                      {data.recentErrors.map((e) => (
                        <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                          <div><div className="font-medium text-ink-800">{e.to}</div>
                            <div className="text-xs text-ink-400">{e.subject}</div></div>
                          <Badge tone="red">{e.error ?? "failed"}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null
        ) : (
          <div className="space-y-4">
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="input pl-9" />
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/50 text-xs text-ink-400">
                      <th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Invoices</th>
                      <th className="px-4 py-3 font-medium">Clients</th><th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {(usersData?.users ?? []).map((u) => (
                      <tr key={u.id} className="transition hover:bg-ink-50/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink-900">{u.name}</div>
                          <div className="text-xs text-ink-400">{u.email} · {u.businessName ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select className="input h-8 w-32 text-xs" value={u.plan} onChange={(e) => setPlan(u.id, e.target.value)}>
                            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3"><Badge tone={u.status === "ACTIVE" ? "green" : "red"}>{u.status}</Badge></td>
                        <td className="px-4 py-3 text-ink-500">{u.invoiceCount}</td>
                        <td className="px-4 py-3 text-ink-500">{u.clientCount}</td>
                        <td className="px-4 py-3">
                          {u.role === "ADMIN" ? <span className="text-xs text-violet-600 font-medium">Admin</span> : (
                            <Button size="sm" variant={u.status === "ACTIVE" ? "danger" : "secondary"} onClick={() => setStatus(u.id, u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
                              {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
