"use client";

import * as React from "react";
import { CreditCard, Plus } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, StatCard, CardLoading } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";

interface Payment {
  id: string; amount: number; method: string; status: string; transactionRef?: string; paidAt?: string; createdAt: string;
  invoice?: { number: string }; client: { name: string };
}
interface Stats { summary: { totalCollected: number; totalOutstanding: number; recoveryRate: number; paymentCount: number }; }
const METHODS: Record<string, "gray" | "blue" | "teal"> = {
  CARD: "blue", STRIPE: "teal", BANK_TRANSFER: "gray", CASH: "gray", OTHER: "gray",
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const [invoiceId, setInvoiceId] = React.useState("");
  const { data, loading, error, reload } = useFetch<{ payments: Payment[] }>(`/api/payments${invoiceId ? `?invoiceId=${invoiceId}` : ""}`);
  const { data: statsData } = useFetch<Stats>("/api/reports/summary");
  const { data: invoiceData } = useFetch<{ invoices: { id: string; number: string }[] }>("/api/invoices?status=ALL");

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ invoiceId: "", amount: "", method: "CARD", transactionRef: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      const json = await res.json();
      if (!res.ok) { toast("error", "Payment failed", json.error); return; }
      toast("success", "Payment recorded", "Invoice updated.");
      setOpen(false); setForm({ invoiceId: "", amount: "", method: "CARD", transactionRef: "" }); reload();
    } finally { setSaving(false); }
  };

  const s = statsData?.summary;

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Every confirmed payment across your invoices." actions={
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Record payment</Button>
      } />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total collected" value={formatCurrency(s?.totalCollected ?? 0)} icon={<CreditCard className="h-4 w-4" />} accent="green" />
        <StatCard label="Outstanding" value={formatCurrency(s?.totalOutstanding ?? 0)} icon={<CreditCard className="h-4 w-4" />} accent="amber" />
        <StatCard label="Recovery rate" value={`${s?.recoveryRate ?? 0}%`} sub={`${s?.paymentCount ?? 0} payments`} icon={<CreditCard className="h-4 w-4" />} accent="blue" />
      </div>

      <div className="flex items-center gap-3">
        <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} className="input h-10 w-auto">
          <option value="">All invoices</option>
          {(invoiceData?.invoices ?? []).map((i) => <option key={i.id} value={i.id}>#{i.number}</option>)}
        </select>
      </div>

      {loading ? <CardLoading /> : null}
      {error ? <div className="card p-8 text-center text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        data && data.payments.length === 0 ? (
          <Card><div className="p-6">
            <EmptyState icon={<CreditCard className="h-6 w-6" />} title="No payments yet" description="Record payments or connect Stripe to start tracking.">
              <Button onClick={() => setOpen(true)} className="mt-1"><Plus className="h-4 w-4 mr-2" /> Record payment</Button>
            </EmptyState>
          </div></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50 text-xs text-ink-400">
                    <th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Method</th><th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {(data?.payments ?? []).map((p) => (
                    <tr key={p.id} className="transition hover:bg-ink-50/50">
                      <td className="px-4 py-3 font-medium text-ink-900">{p.client.name}</td>
                      <td className="px-4 py-3 text-ink-500">{p.invoice ? `#${p.invoice.number}` : "—"}</td>
                      <td className="px-4 py-3"><Badge tone={METHODS[p.method] ?? "gray"}>{p.method.replace("_", " ")}</Badge></td>
                      <td className="px-4 py-3"><Badge tone={p.status === "SUCCEEDED" ? "green" : "amber"}>{p.status}</Badge></td>
                      <td className="px-4 py-3 text-ink-400">{formatDate(p.paidAt ?? p.createdAt, { month: "short", day: "numeric" })}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">+{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : null}

      <Modal open={open} onClose={() => setOpen(false)} title="Record a payment">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Invoice</label>
            <select required className="input" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
              <option value="">Select invoice…</option>
              {(invoiceData?.invoices ?? []).map((i) => <option key={i.id} value={i.id}>#{i.number}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="label">Amount (USD)</label><input type="number" min="0" step="0.01" required className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="label">Method</label>
              <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {["CARD", "BANK_TRANSFER", "CASH", "OTHER"].map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select></div>
          </div>
          <div><label className="label">Transaction reference (optional)</label><input className="input" value={form.transactionRef} onChange={(e) => setForm({ ...form, transactionRef: e.target.value })} /></div>
          <Button type="submit" className="w-full" loading={saving}>Confirm payment</Button>
        </form>
      </Modal>
    </div>
  );
}
