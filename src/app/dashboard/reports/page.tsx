"use client";

import * as React from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, TrendingUp, Wallet } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { formatCurrency } from "@/lib/utils";
import { PageHeader, StatCard, CardLoading } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Summary {
  summary: { totalCollected: number; totalOutstanding: number; recoveryRate: number; avgCollectionTime: number; invoiceCount: number; paymentCount: number };
  monthly: { label: string; revenue: number; outstanding: number }[];
  recoveryTrend: { label: string; rate: number }[];
  clientWise: { name: string; amount: number }[];
  overdueByBucket: { early: number; late: number; severe: number; critical: number };
}

function TooltipBox({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs shadow-pop">
      <div className="font-medium text-ink-900">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="mt-0.5 flex items-center gap-2 text-ink-500">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-ink-900">{currency ? formatCurrency(p.value, currency) : `${p.value}%`}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { data, loading, error } = useFetch<Summary>("/api/reports/summary");

  const exportCSV = async (kind: string) => {
    const res = await fetch(`/api/reports/export?kind=${kind}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = kind === "payments" ? "utterly-payments.csv" : "utterly-invoices.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return <CardLoading />;
  if (error) return <div className="card p-8 text-center text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const { summary, monthly, recoveryTrend, clientWise, overdueByBucket } = data;
  const maxClient = Math.max(1, ...clientWise.map((c) => c.amount));
  const buckets = [
    { label: "1–7 days", k: "early", v: overdueByBucket.early, tone: "bg-amber-400" },
    { label: "8–30 days", k: "late", v: overdueByBucket.late, tone: "bg-amber-500" },
    { label: "31–60 days", k: "severe", v: overdueByBucket.severe, tone: "bg-red-400" },
    { label: "60+ days", k: "critical", v: overdueByBucket.critical, tone: "bg-red-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & analytics" description="Understand your revenue and recovery performance." actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => exportCSV("invoices")}><Download className="h-4 w-4 mr-2" /> Export invoices</Button>
          <Button variant="secondary" onClick={() => exportCSV("payments")}><Download className="h-4 w-4 mr-2" /> Export payments</Button>
        </div>
      } />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total collected" value={formatCurrency(summary.totalCollected)} icon={<Wallet className="h-4 w-4" />} accent="green" />
        <StatCard label="Total outstanding" value={formatCurrency(summary.totalOutstanding)} icon={<Wallet className="h-4 w-4" />} accent="amber" />
        <StatCard label="Recovery rate" value={`${summary.recoveryRate}%`} sub="collected vs outstanding" icon={<TrendingUp className="h-4 w-4" />} accent="violet" />
        <StatCard label="Avg collection time" value={`${summary.avgCollectionTime}d`} sub={`${summary.invoiceCount} invoices · ${summary.paymentCount} payments`} icon={<TrendingUp className="h-4 w-4" />} accent="blue" />
      </div>

      <Card>
        <CardHeader><div><CardTitle>Revenue vs outstanding</CardTitle><p className="mt-0.5 text-xs text-ink-400">Last 6 months</p></div></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9aa1af" }} dy={6} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9aa1af" }} tickFormatter={(v) => `$${v}`} width={48} />
                <Tooltip content={<TooltipBox currency="USD" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Collected" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Recovery rate trend</CardTitle><p className="mt-0.5 text-xs text-ink-400">% collected in each month</p></div></CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recoveryTrend} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9aa1af" }} dy={6} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9aa1af" }} tickFormatter={(v) => `${v}%`} width={40} />
                  <Tooltip content={<TooltipBox />} />
                  <Line type="monotone" dataKey="rate" name="Recovery rate" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Client-wise outstanding</CardTitle><p className="mt-0.5 text-xs text-ink-400">Largest balances first</p></div></CardHeader>
          <CardContent>
            {clientWise.length === 0 ? (
              <div className="py-10 text-center text-sm text-ink-400">No outstanding balances.</div>
            ) : (
              <ul className="space-y-3">
                {clientWise.slice(0, 8).map((c) => (
                  <li key={c.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-ink-800">{c.name}</span>
                      <span className="font-semibold text-ink-900">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${(c.amount / maxClient) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><div><CardTitle>Overdue aging</CardTitle><p className="mt-0.5 text-xs text-ink-400">Number of overdue invoices by age</p></div></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {buckets.map((b) => (
              <div key={b.k} className="rounded-xl border border-ink-100 p-4">
                <div className="text-sm font-medium text-ink-500">{b.label}</div>
                <div className="mt-1 text-2xl font-bold text-ink-950">{b.v}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div className={`h-full rounded-full ${b.tone}`} style={{ width: `${Math.min(100, (b.v / Math.max(1, overdueByBucket.early)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
