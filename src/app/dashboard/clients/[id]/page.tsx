"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Mail, Phone, MapPin, CreditCard, FileText } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, StatCard, CardLoading } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";

interface ClientDetail {
  id: string; name: string; contactName?: string; email?: string; phone?: string; billingAddress?: string;
  notes?: string; tags: string[]; createdAt: string;
  stats: { totalInvoices: number; paidAmount: number; outstandingAmount: number; overdueAmount: number };
  invoices: { id: string; number: string; issueDate: string; dueDate: string; status: string; totalAmount: number; amountPaid: number; currency: string; daysOverdue: number }[];
  payments: { id: string; amount: number; method: string; status: string; paidAt?: string; invoiceNumber?: string }[];
  timeline: { id: string; type: string; date: string; title: string; detail: string }[];
}
const TONES: Record<string, "gray" | "blue" | "green" | "amber" | "red"> = {
  DRAFT: "gray", SENT: "blue", PARTIALLY_PAID: "amber", PAID: "green", OVERDUE: "red", CANCELLED: "gray",
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error, reload } = useFetch<{ client: ClientDetail }>(`/api/clients/${params.id}`);
  const client = data?.client;

  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<any>(null);

  if (loading) return <CardLoading />;
  if (error) return <div className="card p-8 text-center text-sm text-red-600">{error}</div>;
  if (!client) return null;

  const openEdit = () => {
    setForm({ name: client.name, contactName: client.contactName ?? "", email: client.email ?? "", phone: client.phone ?? "", billingAddress: client.billingAddress ?? "", notes: client.notes ?? "", tags: client.tags });
    setEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { toast("error", "Update failed", json.error); return; }
      toast("success", "Client updated", "Changes saved.");
      setEditOpen(false); reload();
    } finally { setSaving(false); }
  };

  const del = async () => {
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { toast("error", "Delete failed", json.error); return; }
    toast("success", "Client deleted", `${client.name} removed.`);
    router.push("/dashboard/clients");
  };

  return (
    <div className="space-y-6">
      <PageHeader title={client.name} description={client.contactName ?? client.email ?? "Client"} actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => router.push("/dashboard/clients")}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          <Button variant="secondary" onClick={openEdit}><Pencil className="h-4 w-4 mr-2" /> Edit</Button>
          <Button variant="danger" onClick={del}><Trash2 className="h-4 w-4" /></Button>
        </div>
      } />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total invoices" value={client.stats.totalInvoices} icon={<FileText className="h-4 w-4" />} accent="blue" />
        <StatCard label="Paid" value={formatCurrency(client.stats.paidAmount)} icon={<CreditCard className="h-4 w-4" />} accent="green" />
        <StatCard label="Outstanding" value={formatCurrency(client.stats.outstandingAmount)} icon={<CreditCard className="h-4 w-4" />} accent="amber" />
        <StatCard label="Overdue" value={formatCurrency(client.stats.overdueAmount)} icon={<CreditCard className="h-4 w-4" />} accent="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><div><CardTitle>Invoices</CardTitle><p className="mt-0.5 text-xs text-ink-400">All invoices for this client</p></div></CardHeader>
            <CardContent className="pt-0">
              {client.invoices.length === 0 ? (
                <EmptyState compact icon={<FileText className="h-5 w-5" />} title="No invoices" description="Create an invoice for this client." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink-100 text-xs text-ink-400">
                        <th className="pb-2 font-medium">Invoice</th><th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Due</th><th className="pb-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      {client.invoices.map((i) => (
                        <tr key={i.id}>
                          <td className="py-2.5"><Link href={`/dashboard/invoices/${i.id}`} className="font-medium text-ink-900 hover:text-brand-600">#{i.number}</Link></td>
                          <td className="py-2.5"><Badge tone={TONES[i.status] ?? "gray"}>{i.status.replace(/_/g, " ")}</Badge></td>
                          <td className="py-2.5 text-ink-500">{formatDate(i.dueDate, { month: "short", day: "numeric" })}</td>
                          <td className="py-2.5 text-right font-medium text-ink-900">{formatCurrency(i.totalAmount, i.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div><CardTitle>Payment history</CardTitle><p className="mt-0.5 text-xs text-ink-400">Confirmed payments</p></div></CardHeader>
            <CardContent className="pt-0">
              {client.payments.length === 0 ? (
                <EmptyState compact icon={<CreditCard className="h-5 w-5" />} title="No payments yet" description="Payments will appear here." />
              ) : (
                <ul className="divide-y divide-ink-50">
                  {client.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <div className="font-medium text-ink-900">{formatCurrency(p.amount)}</div>
                        {p.invoiceNumber ? <div className="text-xs text-ink-400">#{p.invoiceNumber}</div> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-400">{p.method.replace("_", " ")} · {p.paidAt ? formatDate(p.paidAt) : "pending"}</span>
                        <Badge tone={p.status === "SUCCEEDED" ? "green" : "amber"}>{p.status}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><div><CardTitle>Client info</CardTitle></div></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {client.email ? <div className="flex items-center gap-2 text-ink-600"><Mail className="h-4 w-4 text-ink-400" /> <a href={`mailto:${client.email}`} className="hover:text-brand-600">{client.email}</a></div> : null}
              {client.phone ? <div className="flex items-center gap-2 text-ink-600"><Phone className="h-4 w-4 text-ink-400" /> {client.phone}</div> : null}
              {client.billingAddress ? <div className="flex items-start gap-2 text-ink-600"><MapPin className="h-4 w-4 text-ink-400 mt-0.5" /> <span>{client.billingAddress}</span></div> : null}
              {client.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">{client.tags.map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</div>
              ) : null}
              <div className="text-xs text-ink-400">Added {formatDate(client.createdAt)}</div>
            </CardContent>
          </Card>

          {client.notes ? (
            <Card>
              <CardHeader><div><CardTitle>Internal notes</CardTitle></div></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm text-ink-600">{client.notes}</p></CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><div><CardTitle>Activity</CardTitle></div></CardHeader>
            <CardContent>
              {client.timeline.length === 0 ? (
                <EmptyState compact icon={<FileText className="h-5 w-5" />} title="No activity yet" description="Events will show up here." />
              ) : (
                <ol className="relative space-y-4 border-l border-ink-100 pl-4">
                  {client.timeline.map((t) => (
                    <li key={t.id} className="relative">
                      <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${t.type === "payment" ? "bg-emerald-500" : "bg-brand-500"}`} />
                      <div className="text-sm font-medium text-ink-900">{t.title}</div>
                      <div className="text-xs text-ink-400">{t.detail} · {formatDate(t.date)}</div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit client">
        {form ? (
          <form onSubmit={submitEdit} className="space-y-4">
            <div><label className="label">Business name *</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="label">Contact name</label><input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
              <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Billing address</label><textarea className="input min-h-16" value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} /></div>
            <div><label className="label">Internal notes</label><textarea className="input min-h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
