"use client";

import * as React from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ArrowUpRight, FileText, Wallet, Clock, AlertTriangle, BadgeCheck,
  TrendingUp, ArrowRight, Users, Sparkles,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { formatCurrency, formatDate, daysUntil, pluralize } from "@/lib/utils";
import { PageHeader, StatCard, CardLoading } from "@/components/dashboard/panels";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth-context";

interface StatsResponse {
  summary: {
    totalInvoices: number;
    totalRevenueCollected: number;
    outstandingPayments: number;
    overdueInvoices: number;
    paymentsRecovered: number;
    recoveryRate: number;
    clientsCount: number;
    totalInvoiced: number;
  };
  charts: {
    monthlyRevenue: { label: string; revenue: number }[];
    monthlyOutstanding: { label: string; outstanding: number }[];
  };
  recentTransactions: {
    id: string; amount: number; clientName: string;
    invoiceNumber?: string; method: string; paidAt: string;
  }[];
  upcomingDeadlines: {
    id: string; number: string; clientName: string; amount: number;
    currency: string; dueDate: string; daysUntil: number;
  }[];
  overdueAlerts: {
    id: string; number: string; clientName: string; amount: number;
    currency: string; dueDate: string; daysOverdue: number; bucket: string;
  }[];
}

const bucketTone: Record<string, "amber" | "red" | "violet"> = {
  "1-7": "amber", "8-30": "amber", "31-60": "red", "60+": "violet",
};

function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs shadow-pop">
      <div className="font-medium text-ink-900">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="mt-0.5 flex items-center gap-2 text-ink-500">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-ink-900">{formatCurrency(p.value, currency)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch<StatsResponse>("/api/dashboard/stats");

  if (loading) return <CardLoading />;
  if (error) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm text-red-600">{error}</div>
        <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }
  if (!data) return null;

  const { summary, charts, recentTransactions, upcomingDeadlines, overdueAlerts } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Here’s what’s happening with your invoices today."
        actions={
          <Link href="/dashboard/invoices/new" className="btn-primary h-10 px-4 inline-flex items-center gap-2">
            <FileText className="h-4 w-4" /> New invoice
          </Link>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total revenue collected" value={formatCurrency(summary.totalRevenueCollected)} sub={<span className="text-emerald-600">+{formatCurrency(summary.totalRevenueCollected)} all time</span>} icon={<Wallet className="h-4 w-4" />} accent="green" />
        <StatCard label="Outstanding payments" value={formatCurrency(summary.outstandingPayments)} sub={`of ${formatCurrency(summary.totalInvoiced)} invoiced`} icon={<Clock className="h-4 w-4" />} accent="blue" />
        <StatCard label="Overdue invoices" value={summary.overdueInvoices} sub={<span className="text-red-600">{formatCurrency(overdueAlerts.reduce((s, a) => s + a.amount, 0))} at risk</span>} icon={<AlertTriangle className="h-4 w-4" />} accent="red" />
        <StatCard label="Recovery rate" value={`${summary.recoveryRate}%`} sub={`${summary.paymentsRecovered} payments recovered`} icon={<TrendingUp className="h-4 w-4" />} accent="violet" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Monthly revenue</CardTitle>
              <div className="mt-0.5 text-xs text-ink-400">Collected payments · last 6 months</div>
            </div>
            <Badge tone="green"><Dot tone="green" /> Paid</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlyRevenue} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9aa1af" }} dy={6} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9aa1af" }} tickFormatter={(v) => `$${v}`} width={44} />
                  <Tooltip content={<ChartTooltip currency="USD" />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Outstanding payments</CardTitle>
              <div className="mt-0.5 text-xs text-ink-400">Unpaid balance · last 6 months</div>
            </div>
            <Badge tone="amber"><Dot tone="amber" /> Outstanding</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlyOutstanding} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="out" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9aa1af" }} dy={6} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9aa1af" }} tickFormatter={(v) => `$${v}`} width={44} />
                  <Tooltip content={<ChartTooltip currency="USD" />} />
                  <Area type="monotone" dataKey="outstanding" name="Outstanding" stroke="#f59e0b" strokeWidth={2} fill="url(#out)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts + deadlines */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Overdue alerts</CardTitle>
              <div className="mt-0.5 text-xs text-ink-400">Invoices past due · AI recovery available</div>
            </div>
            <Link href="/dashboard/recovery" className="text-xs font-medium text-brand-600 hover:text-brand-700">AI recovery →</Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {overdueAlerts.length === 0 ? (
              <EmptyState icon={<BadgeCheck className="h-6 w-6" />} title="Nothing overdue" description="No invoices are past due. Nice work!" compact />
            ) : (
              <ul className="space-y-1">
                {overdueAlerts.map((a) => (
                  <li key={a.id}>
                    <Link href={`/dashboard/invoices/${a.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition hover:bg-ink-50">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink-900">{a.clientName}</div>
                          <div className="text-xs text-ink-400">#{a.number} · due {formatDate(a.dueDate)}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-ink-900">{formatCurrency(a.amount, a.currency)}</div>
                          <Badge tone={bucketTone[a.bucket] ?? "amber"}>{a.daysOverdue}d late</Badge>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-ink-300" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming deadlines</CardTitle>
              <div className="mt-0.5 text-xs text-ink-400">Next 14 days</div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {upcomingDeadlines.length === 0 ? (
              <EmptyState icon={<Clock className="h-6 w-6" />} title="No upcoming deadlines" description="Nothing due in the next two weeks." compact />
            ) : (
              <ul className="space-y-1">
                {upcomingDeadlines.map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboard/invoices/${d.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition hover:bg-ink-50">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink-900">{d.clientName}</div>
                          <div className="text-xs text-ink-400">#{d.number} · due {formatDate(d.dueDate)}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-ink-900">{formatCurrency(d.amount, d.currency)}</div>
                          <div className="text-xs text-ink-400">{d.daysUntil === 0 ? "today" : `in ${d.daysUntil}d`}</div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-ink-300" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent transactions</CardTitle>
            <div className="mt-0.5 text-xs text-ink-400">Latest confirmed payments</div>
          </div>
          <Link href="/dashboard/payments" className="text-xs font-medium text-brand-600 hover:text-brand-700">All payments →</Link>
        </CardHeader>
        <CardContent className="pt-0">
          {recentTransactions.length === 0 ? (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="No payments yet" description="Payments you confirm will show up here." compact />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs text-ink-400">
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Invoice</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {recentTransactions.map((t) => (
                    <tr key={t.id} className="transition hover:bg-ink-50/50">
                      <td className="py-3 font-medium text-ink-900">{t.clientName}</td>
                      <td className="py-3 text-ink-500">{t.invoiceNumber ? `#${t.invoiceNumber}` : "—"}</td>
                      <td className="py-3">
                        <Badge tone="gray">{t.method.replace("_", " ")}</Badge>
                      </td>
                      <td className="py-3 text-ink-400">{formatDate(t.paidAt, { month: "short", day: "numeric" })}</td>
                      <td className="py-3 text-right font-semibold text-emerald-600">+{formatCurrency(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/dashboard/recovery" className="group card relative overflow-hidden p-5 transition hover:shadow-pop">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br from-brand-100 to-violet-100" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold text-ink-900">AI Recovery Assistant</h3>
            <p className="mt-1 text-sm text-ink-400">Ask anything about overdue invoices, get reminder drafts and recovery strategies.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 group-hover:text-brand-700">
              Open assistant <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
        <Link href="/dashboard/clients" className="group card relative overflow-hidden p-5 transition hover:shadow-pop">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold text-ink-900">Client management</h3>
            <p className="mt-1 text-sm text-ink-400">Track payment behavior, notes and activity for every client ({summary.clientsCount} total).</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 group-hover:text-emerald-700">
              View clients <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
