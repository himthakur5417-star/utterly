"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Send, Save } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Client { id: string; name: string; email?: string; }
interface Row { description: string; quantity: number; unitPrice: number; }

export default function NewInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: clientData } = useFetch<{ clients: Client[] }>("/api/clients?search=");

  const [clientId, setClientId] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [discount, setDiscount] = React.useState(0);
  const [tax, setTax] = React.useState(0);
  const [memo, setMemo] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = React.useState(false);
  const [sendAfter, setSendAfter] = React.useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const subtotal = rows.reduce((s, r) => s + (r.quantity || 0) * (r.unitPrice || 0), 0);
  const afterDiscount = subtotal * (1 - (discount || 0) / 100);
  const total = afterDiscount * (1 + (tax || 0) / 100);

  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addRow = () => setRows((r) => [...r, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeRow = (i: number) => setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        clientId, number, issueDate, dueDate,
        subject: subject || undefined,
        discountPercent: Number(discount), taxPercent: Number(tax),
        memo: memo || undefined,
        items: rows.map((r) => ({ description: r.description, quantity: Number(r.quantity) || 0, unitPrice: Number(r.unitPrice) || 0 })),
        status: sendAfter ? "SENT" : "DRAFT",
      };
      const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { toast("error", "Could not save", json.error); return; }
      toast("success", sendAfter ? "Invoice created & sent" : "Draft saved", `#${json.invoice.number} created.`);
      router.push(`/dashboard/invoices/${json.invoice.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New invoice" description="Create an invoice for a client." actions={
        <Button variant="ghost" onClick={() => router.push("/dashboard/invoices")}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
      } />

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader><div><CardTitle>Details</CardTitle><p className="mt-0.5 text-xs text-ink-400">Client and scheduling</p></div></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Client</label>
              <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className="input">
                <option value="">Select a client…</option>
                {(clientData?.clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Invoice number</label>
              <input required className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="INV-001" />
            </div>
            <div>
              <label className="label">Subject (optional)</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Invoice for September services" />
            </div>
            <div>
              <label className="label">Issue date</label>
              <input type="date" required className="input" value={issueDate} max={today} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Due date</label>
              <input type="date" required className="input" value={dueDate} min={issueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div><CardTitle>Line items</CardTitle><p className="mt-0.5 text-xs text-ink-400">What’s being billed</p></div>
            <Button type="button" variant="secondary" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1.5" /> Add item</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="hidden grid-cols-12 gap-3 text-xs font-medium text-ink-400 sm:grid">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-3">Unit price</div>
                <div className="col-span-1" />
              </div>
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 sm:gap-3">
                  <input className="input col-span-12 sm:col-span-6" placeholder="Description" value={r.description}
                    onChange={(e) => setRow(i, { description: e.target.value })} />
                  <input type="number" min="0" className="input col-span-4 sm:col-span-2" placeholder="1" value={r.quantity || ""}
                    onChange={(e) => setRow(i, { quantity: parseFloat(e.target.value) })} />
                  <input type="number" min="0" step="0.01" className="input col-span-5 sm:col-span-3" placeholder="0.00" value={r.unitPrice || ""}
                    onChange={(e) => setRow(i, { unitPrice: parseFloat(e.target.value) })} />
                  <div className="col-span-3 sm:col-span-1 flex items-center justify-end">
                    <button type="button" className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => removeRow(i)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-end gap-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex w-full max-w-xs items-center justify-between"><span className="text-ink-400">Subtotal</span><span className="font-medium text-ink-900">{formatCurrency(subtotal)}</span></div>
              <div className="flex w-full max-w-xs items-center justify-between gap-3">
                <span className="text-ink-400">Discount</span>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" className="input h-9 w-20 text-right" value={discount || ""} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
                  <span className="text-xs text-ink-400">%</span>
                </div>
              </div>
              <div className="flex w-full max-w-xs items-center justify-between gap-3">
                <span className="text-ink-400">Tax</span>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" className="input h-9 w-20 text-right" value={tax || ""} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} />
                  <span className="text-xs text-ink-400">%</span>
                </div>
              </div>
              <div className="flex w-full max-w-xs items-center justify-between border-t border-ink-100 pt-2">
                <span className="font-medium text-ink-900">Total</span>
                <span className="text-lg font-bold text-ink-950">{formatCurrency(total, user?.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Notes</CardTitle><p className="mt-0.5 text-xs text-ink-400">Optional memo shown on the invoice</p></div></CardHeader>
          <CardContent>
            <textarea className="input min-h-24" placeholder="Thank you for your business!…" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <label className="flex items-center gap-2 text-sm text-ink-500">
            <input type="checkbox" checked={sendAfter} onChange={(e) => setSendAfter(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
            Mark as sent after creating
          </label>
          <Button type="submit" loading={saving}><Send className="h-4 w-4 mr-2" /> {sendAfter ? "Create & send" : "Save invoice"}</Button>
        </div>
      </form>
    </div>
  );
}
