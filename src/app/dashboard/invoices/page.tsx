"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, FileText, MoreHorizontal, Trash2, Copy, ArrowUpDown } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { PageHeader, CardLoading } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface InvoiceItem { description: string; quantity: number; unitPrice: number; amount: number; }
interface Invoice {
  id: string; number: string; issueDate: string; dueDate: string; status: string;
  totalAmount: number; amountPaid: number; currency: string; subject?: string; memo?: string;
  client: { name: string; email: string }; items: InvoiceItem[];
}
const STATUSES = ["ALL", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const TONES: Record<string, "gray" | "blue" | "green" | "amber" | "red"> = {
  DRAFT: "gray", SENT: "blue", PARTIALLY_PAID: "amber", PAID: "green", OVERDUE: "red", CANCELLED: "gray",
};
const SORTS = [{ k: "createdAt", l: "Newest" }, { k: "dueDate", l: "Due date" }, { k: "totalAmount", l: "Amount" }];

export default function InvoicesPage() {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [sort, setSort] = React.useState("createdAt");

  const { data, loading, error, reload } = useFetch<{ invoices: Invoice[] }>(
    `/api/invoices?search=${encodeURIComponent(search)}&status=${status}&sort=${sort}`,
  );

  const del = async (id: string, number: string) => {
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { toast("error", "Delete failed", json.error); return; }
    toast("success", "Invoice deleted", `#${number} removed.`);
    reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Create, send, and track every invoice." actions={
        <Link href="/dashboard/invoices/new" className="btn-primary h-10 px-4 inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> New invoice
        </Link>
      } />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client or number…"
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input h-10 w-auto">
            {STATUSES.map((s) => <option key={s} value={s}>{s === "ALL" ? "All statuses" : s.replace(/_/g, " ")}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input h-10 w-auto">
            {SORTS.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
          </select>
        </div>
      </div>

      {loading ? <CardLoading /> : null}
      {error ? (
        <div className="card p-8 text-center"><div className="text-sm text-red-600">{error}</div>
          <Button variant="secondary" className="mt-4" onClick={reload}>Retry</Button></div>
      ) : null}

      {!loading && !error && data ? (
        data.invoices.length === 0 ? (
          <Card><div className="p-6">
            <EmptyState icon={<FileText className="h-6 w-6" />}
              title={search || status !== "ALL" ? "No matching invoices" : "No invoices yet"}
              description={search || status !== "ALL" ? "Try changing your search or filters." : "Create your first invoice to get started."}>
              {!search && status === "ALL" ? (
                <Link href="/dashboard/invoices/new" className="btn-primary mt-1">Create your first invoice</Link>
              ) : null}
            </EmptyState>
          </div></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50 text-xs text-ink-400">
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Due date</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="group transition hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/invoices/${inv.id}`} className="font-semibold text-ink-900 hover:text-brand-600">#{inv.number}</Link>
                        <div className="text-xs text-ink-400">Issued {formatDate(inv.issueDate, { month: "short", day: "numeric", year: "numeric" })}</div>
                      </td>
                      <td className="px-4 py-3"><div className="font-medium text-ink-900">{inv.client.name}</div>
                        <div className="text-xs text-ink-400">{inv.client.email}</div></td>
                      <td className="px-4 py-3"><Badge tone={TONES[inv.status] ?? "gray"}>{inv.status.replace(/_/g, " ")}</Badge></td>
                      <td className="px-4 py-3">
                        <span className={daysUntil(inv.dueDate) < 0 ? "text-red-600" : "text-ink-500"}>
                          {formatDate(inv.dueDate, { month: "short", day: "numeric" })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-ink-900">{formatCurrency(inv.totalAmount, inv.currency)}</div>
                        {inv.amountPaid > 0 ? <div className="text-xs text-ink-400">{formatCurrency(inv.amountPaid)} paid</div> : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          <Link href={`/dashboard/invoices/${inv.id}`} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700" title="View"><FileText className="h-4 w-4" /></Link>
                          <button
                            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                            title="Duplicate"
                            onClick={async () => {
                              const r = await fetch(`/api/invoices/${inv.id}/duplicate`, { method: "POST" });
                              const j = await r.json();
                              if (r.ok) { toast("success", "Duplicated", `#${j.invoice.number} created.`); reload(); }
                              else toast("error", "Failed", j.error);
                            }}
                          ><Copy className="h-4 w-4" /></button>
                          <button className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Delete" onClick={() => del(inv.id, inv.number)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : null}
    </div>
  );
}
