"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

interface SharedInvoice {
  id: string; number: string; issueDate: string; dueDate: string; status: string;
  currency: string; clientName: string; memo?: string;
  items: { description: string; quantity: number; unitPrice: number; amount: number }[];
  totals: { subtotal: number; discount: number; tax: number; total: number };
  amountPaid: number; outstanding: number; overdueDays: number;
}

export default function SharedInvoicePage() {
  const params = useParams<{ token: string }>();
  const { data, loading, error } = useFetch<{ invoice: SharedInvoice; canPayOnline: boolean }>(`/api/invoices/shared/${params.token}`);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-7 w-7 text-brand-500" /></div>;
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <div className="text-sm font-medium text-red-700">{error ?? "Invoice not found."}</div>
        </div>
      </div>
    );
  }

  const { invoice, canPayOnline } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <Logo />
          <Badge tone={invoice.status === "PAID" ? "green" : invoice.overdueDays > 0 ? "red" : "blue"}>
            {invoice.status === "PAID" ? "Paid" : invoice.overdueDays > 0 ? `${invoice.overdueDays}d overdue` : "Open"}
          </Badge>
        </div>

        <div className="card mt-6 p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm text-ink-400">Invoice</div>
              <div className="text-2xl font-bold text-ink-950">#{invoice.number}</div>
              <div className="mt-1 text-sm text-ink-500">From Utterly</div>
            </div>
            <div className="text-right text-sm">
              <div className="text-ink-400">Issued <span className="font-medium text-ink-700">{formatDate(invoice.issueDate)}</span></div>
              <div className="mt-1 text-ink-400">Due <span className="font-medium text-ink-700">{formatDate(invoice.dueDate)}</span></div>
              {invoice.overdueDays > 0 ? (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5" /> {invoice.overdueDays} days overdue
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 text-sm text-ink-500">Billed to <span className="font-medium text-ink-800">{invoice.clientName}</span></div>

          <table className="mt-8 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-xs text-ink-400">
                <th className="pb-2 font-medium">Description</th><th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit price</th><th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {invoice.items.map((it, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-ink-900">{it.description}</td>
                  <td className="py-2.5 text-right text-ink-500">{it.quantity}</td>
                  <td className="py-2.5 text-right text-ink-500">{formatCurrency(it.unitPrice)}</td>
                  <td className="py-2.5 text-right font-medium text-ink-900">{formatCurrency(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-full max-w-xs items-center justify-between text-ink-500"><span>Subtotal</span><span>{formatCurrency(invoice.totals.subtotal)}</span></div>
            {invoice.totals.discount > 0 ? <div className="flex w-full max-w-xs items-center justify-between text-ink-500"><span>Discount</span><span>−{formatCurrency(invoice.totals.discount)}</span></div> : null}
            {invoice.totals.tax > 0 ? <div className="flex w-full max-w-xs items-center justify-between text-ink-500"><span>Tax</span><span>{formatCurrency(invoice.totals.tax)}</span></div> : null}
            <div className="flex w-full max-w-xs items-center justify-between border-t border-ink-100 pt-2">
              <span className="font-medium text-ink-900">Total</span>
              <span className="text-lg font-bold text-ink-950">{formatCurrency(invoice.totals.total, invoice.currency)}</span>
            </div>
            {invoice.amountPaid > 0 ? (
              <div className="flex w-full max-w-xs items-center justify-between text-emerald-600"><span>Paid</span><span>{formatCurrency(invoice.amountPaid)}</span></div>
            ) : null}
            {invoice.outstanding > 0 ? (
              <div className="flex w-full max-w-xs items-center justify-between text-ink-900">
                <span className="font-medium">Balance due</span><span className="font-bold">{formatCurrency(invoice.outstanding)}</span>
              </div>
            ) : null}
          </div>

          {invoice.memo ? <div className="mt-6 rounded-xl bg-ink-50 p-4 text-sm text-ink-500">{invoice.memo}</div> : null}

          <div className="mt-8 border-t border-ink-100 pt-6">
            {invoice.status === "PAID" ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-medium text-emerald-700">
                ✓ This invoice has been paid. Thank you!
              </div>
            ) : canPayOnline ? (
              <Button size="lg" className="w-full" asChild>
                <a href={`/api/payments/checkout?token=${params.token}`} target="_blank" rel="noreferrer">
                  Pay {formatCurrency(invoice.outstanding)} securely <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            ) : (
              <div className="rounded-xl bg-ink-50 py-3 text-center text-sm text-ink-500">
                Online payments are not enabled yet. Please contact the sender to pay.
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">© {new Date().getFullYear()} Utterly · Powered by AI payment recovery</p>
      </div>
    </div>
  );
}
