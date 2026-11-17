"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Download, Send, Trash2, Link2, CreditCard, Sparkles, Check } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { PageHeader, CardLoading } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";

interface Client { id: string; name: string; contactName?: string; email?: string; billingAddress?: string; }
interface Item { id: string; description: string; quantity: number; unitPrice: number; amount: number; }
interface Payment { id: string; amount: number; method: string; status: string; transactionRef?: string; paidAt?: string; }
interface Invoice {
  id: string; number: string; clientId: string; issueDate: string; dueDate: string; status: string;
  subject?: string; memo?: string; discountPercent: number; taxPercent: number;
  totalAmount: number; amountPaid: number; currency: string;
  client: Client; items: Item[]; payments: Payment[];
}
const TONES: Record<string, "gray" | "blue" | "green" | "amber" | "red"> = {
  DRAFT: "gray", SENT: "blue", PARTIALLY_PAID: "amber", PAID: "green", OVERDUE: "red", CANCELLED: "gray",
};
const TONES_AI = ["POLITE", "PROFESSIONAL", "FRIENDLY", "FIRM"];
const METHODS = ["CARD", "BANK_TRANSFER", "CASH", "OTHER"];

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data, loading, error, reload } = useFetch<{ invoice: Invoice }>(`/api/invoices/${params.id}`);
  const invoice = data?.invoice;

  // Send reminder modal
  const [openSend, setOpenSend] = React.useState(false);
  const [tone, setTone] = React.useState("PROFESSIONAL");
  const [gen, setGen] = React.useState<any>(null);
  const [sending, setSending] = React.useState(false);

  // Payment modal
  const [openPay, setOpenPay] = React.useState(false);
  const [payAmount, setPayAmount] = React.useState("");
  const [payMethod, setPayMethod] = React.useState("CARD");
  const [payRef, setPayRef] = React.useState("");

  const generateReminder = async () => {
    if (!invoice) return;
    setGen(null);
    const res = await fetch("/api/ai/generate-reminder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: invoice.id, tone }) });
    const json = await res.json();
    if (!res.ok) { toast("error", "Could not generate", json.error); return; }
    setGen(json);
  };

  const sendReminder = async () => {
    if (!invoice || !gen) return;
    setSending(true);
    try {
      const r1 = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: invoice.id, tone, subject: gen.subject, body: gen.body }) });
      const j1 = await r1.json();
      if (!r1.ok) { toast("error", "Failed to create reminder", j1.error); return; }
      const r2 = await fetch(`/api/reminders/${j1.reminder.id}/send`, { method: "POST" });
      const j2 = await r2.json();
      if (!r2.ok) { toast("error", "Delivery failed", j2.error); return; }
      toast(j2.provider === "simulated" ? "info" : "success", j2.provider === "simulated" ? "Simulated delivery" : "Reminder sent",
        j2.note ?? `Reminder delivered to ${invoice.client.email}.`);
      setOpenSend(false);
    } finally { setSending(false); }
  };

  const copyPayLink = async () => {
    if (!invoice) return;
    const res = await fetch(`/api/invoices/${invoice.id}/pay-link`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) { toast("error", "Could not create pay link", json.error); return; }
    try { await navigator.clipboard.writeText(json.url); toast("success", "Payment link copied", "Share it with the client."); }
    catch { toast("info", "Payment link", json.url); }
  };

  const recordPayment = async () => {
    if (!invoice) return;
    const res = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: invoice.id, amount: Number(payAmount), method: payMethod, transactionRef: payRef || undefined }) });
    const json = await res.json();
    if (!res.ok) { toast("error", "Payment failed", json.error); return; }
    toast("success", "Payment recorded", "Invoice updated.");
    setOpenPay(false); setPayAmount(""); reload();
  };

  const del = async () => {
    if (!invoice) return;
    const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { toast("error", "Delete failed", json.error); return; }
    toast("success", "Invoice deleted", `#${invoice.number} removed.`);
    router.push("/dashboard/invoices");
  };

  if (loading) return <CardLoading />;
  if (error) return <div className="card p-8 text-center text-sm text-red-600">{error}</div>;
  if (!invoice) return null;

  const subtotal = invoice.items.reduce((s, i) => s + i.amount, 0);
  const afterDiscount = subtotal * (1 - invoice.discountPercent / 100);
  const outstanding = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  const overdue = daysUntil(invoice.dueDate) < 0;
  const payable = outstanding > 0 && ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status);

  return (
    <div className="space-y-6">
      <PageHeader title={`Invoice #${invoice.number}`} description={`${invoice.client.name} · issued ${formatDate(invoice.issueDate)}`} actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => router.push("/dashboard/invoices")}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          <Button variant="secondary" onClick={() => fetch(`/api/invoices/${invoice.id}/duplicate`, { method: "POST" })}>Duplicate</Button>
          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer"><Button variant="secondary"><Download className="h-4 w-4 mr-2" /> PDF</Button></a>
          <Button variant="secondary" onClick={copyPayLink}><Link2 className="h-4 w-4 mr-2" /> Copy pay link</Button>
          {invoice.status === "DRAFT" ? (
            <Button onClick={() => { setGen(null); setOpenSend(true); }}><Send className="h-4 w-4 mr-2" /> Send invoice</Button>
          ) : null}
          {payable ? (
            <Button onClick={() => setOpenPay(true)}><CreditCard className="h-4 w-4 mr-2" /> Record payment</Button>
          ) : null}
          <Button variant="danger" onClick={del}><Trash2 className="h-4 w-4" /></Button>
        </div>
      } />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoice body */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xl font-bold text-ink-950">Utterly</div>
                <div className="mt-1 text-sm text-ink-500">{user?.businessName ?? user?.name}</div>
              </div>
              <Badge tone={TONES[invoice.status] ?? "gray"}>{invoice.status.replace(/_/g, " ")}</Badge>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs font-medium uppercase text-ink-400">Billed to</div>
                <div className="mt-1 font-medium text-ink-900">{invoice.client.name}</div>
                {invoice.client.contactName ? <div className="text-ink-500">{invoice.client.contactName}</div> : null}
                {invoice.client.email ? <div className="text-ink-500">{invoice.client.email}</div> : null}
                {invoice.client.billingAddress ? <div className="text-ink-500">{invoice.client.billingAddress}</div> : null}
              </div>
              <div className="text-right">
                <div className="text-xs font-medium uppercase text-ink-400">Invoice #</div>
                <div className="mt-1 font-medium text-ink-900">{invoice.number}</div>
                <div className="mt-2 text-xs font-medium uppercase text-ink-400">Issued</div>
                <div className="text-ink-500">{formatDate(invoice.issueDate)}</div>
                <div className="mt-2 text-xs font-medium uppercase text-ink-400">Due</div>
                <div className={overdue ? "font-medium text-red-600" : "text-ink-500"}>{formatDate(invoice.dueDate)}</div>
              </div>
            </div>

            {invoice.subject ? <div className="mt-4 text-sm font-medium text-ink-700">{invoice.subject}</div> : null}

            <table className="mt-6 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs text-ink-400">
                  <th className="pb-2 font-medium">Description</th><th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Unit price</th><th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {invoice.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2.5 text-ink-900">{it.description}</td>
                    <td className="py-2.5 text-right text-ink-500">{it.quantity}</td>
                    <td className="py-2.5 text-right text-ink-500">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-2.5 text-right font-medium text-ink-900">{formatCurrency(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <div className="flex w-full max-w-xs items-center justify-between text-ink-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {invoice.discountPercent ? <div className="flex w-full max-w-xs items-center justify-between text-ink-500"><span>Discount ({invoice.discountPercent}%)</span><span>−{formatCurrency(subtotal - afterDiscount)}</span></div> : null}
              {invoice.taxPercent ? <div className="flex w-full max-w-xs items-center justify-between text-ink-500"><span>Tax ({invoice.taxPercent}%)</span><span>{formatCurrency(afterDiscount * invoice.taxPercent / 100)}</span></div> : null}
              <div className="flex w-full max-w-xs items-center justify-between border-t border-ink-100 pt-2">
                <span className="font-medium text-ink-900">Total</span>
                <span className="text-lg font-bold text-ink-950">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
              </div>
              {invoice.amountPaid > 0 ? (
                <div className="flex w-full max-w-xs items-center justify-between text-emerald-600">
                  <span>Paid</span><span>{formatCurrency(invoice.amountPaid)}</span>
                </div>
              ) : null}
              {outstanding > 0 ? (
                <div className="flex w-full max-w-xs items-center justify-between text-ink-900">
                  <span className="font-medium">Balance due</span><span className="font-bold">{formatCurrency(outstanding)}</span>
                </div>
              ) : null}
            </div>

            {invoice.memo ? <div className="mt-6 rounded-xl bg-ink-50 p-4 text-sm text-ink-500">{invoice.memo}</div> : null}
          </CardContent>
        </Card>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><div><CardTitle>Payments</CardTitle><p className="mt-0.5 text-xs text-ink-400">Amount {formatCurrency(invoice.amountPaid)} of {formatCurrency(invoice.totalAmount)}</p></div></CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <EmptyState compact icon={<CreditCard className="h-5 w-5" />} title="No payments yet" description="Payments appear here once confirmed." />
              ) : (
                <ul className="space-y-3">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium text-ink-900">{formatCurrency(p.amount)}</div>
                        <div className="text-xs text-ink-400">{p.method.replace("_", " ")} · {p.paidAt ? formatDate(p.paidAt) : "pending"}</div>
                      </div>
                      <Badge tone={p.status === "SUCCEEDED" ? "green" : "amber"}>{p.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {invoice.status === "DRAFT" ? (
            <Card>
              <CardHeader><div><CardTitle>Send invoice</CardTitle><p className="mt-0.5 text-xs text-ink-400">Use the AI engine to craft the first reminder</p></div></CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => { setGen(null); setOpenSend(true); }}><Sparkles className="h-4 w-4 mr-2" /> Send reminder</Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Send reminder modal */}
      <Modal open={openSend} onClose={() => setOpenSend(false)} title="Send payment reminder">
        <div className="space-y-4">
          <div>
            <label className="label">Tone</label>
            <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
              {TONES_AI.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          {!gen ? (
            <Button className="w-full" onClick={generateReminder}><Sparkles className="h-4 w-4 mr-2" /> Generate with AI</Button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-ink-100 p-4">
                <div className="text-xs font-medium uppercase text-ink-400">Subject</div>
                <div className="mt-1 text-sm font-medium text-ink-900">{gen.subject}</div>
                <div className="mt-3 text-xs font-medium uppercase text-ink-400">Email</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{gen.body}</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Recommended follow-up</span>
                <span className="font-medium text-ink-900">{formatDate(gen.recommendedNextDate)}</span>
              </div>
              <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700"><span className="font-medium">Strategy: </span>{gen.strategy}</div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setGen(null)}>Regenerate</Button>
                <Button className="flex-1" onClick={sendReminder} loading={sending}><Send className="h-4 w-4 mr-2" /> Send now</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Record payment modal */}
      <Modal open={openPay} onClose={() => setOpenPay(false)} title="Record a payment">
        <div className="space-y-4">
          <div>
            <label className="label">Amount (USD)</label>
            <input type="number" min="0" step="0.01" className="input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(outstanding)} />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Transaction reference (optional)</label>
            <input className="input" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="ch_123…" />
          </div>
          <Button className="w-full" onClick={recordPayment}><Check className="h-4 w-4 mr-2" /> Confirm payment</Button>
        </div>
      </Modal>
    </div>
  );
}
