"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { PageHeader, CardLoading } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";

interface Client {
  id: string; name: string; contactName?: string; email?: string; phone?: string; billingAddress?: string;
  notes?: string; tags: string[]; createdAt: string;
  stats: { totalInvoices: number; paidAmount: number; outstandingAmount: number; overdueAmount: number };
}
const TAGS = ["Long-term", "At risk", "New", "VIP"];

export default function ClientsPage() {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const { data, loading, error, reload } = useFetch<{ clients: Client[] }>("/api/clients");
  const [openAdd, setOpenAdd] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({ name: "", contactName: "", email: "", phone: "", billingAddress: "", notes: "", tags: [] as string[] });

  const clients = (data?.clients ?? []).filter((c) =>
    !search || c.name.toLowerCase().includes(search) || (c.email?.toLowerCase().includes(search) ?? false) || (c.contactName?.toLowerCase().includes(search) ?? false),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { toast("error", "Could not add client", json.error); return; }
      toast("success", "Client added", `${json.client.name} is now on file.`);
      setOpenAdd(false); setForm({ name: "", contactName: "", email: "", phone: "", billingAddress: "", notes: "", tags: [] }); reload();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Manage your customers and their payment behavior." actions={
        <Button onClick={() => setOpenAdd(true)}><Plus className="h-4 w-4 mr-2" /> Add client</Button>
      } />

      <div className="relative sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…" className="input pl-9" />
      </div>

      {loading ? <CardLoading /> : null}
      {error ? <div className="card p-8 text-center text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        clients.length === 0 ? (
          <Card><div className="p-6">
            <EmptyState icon={<Users className="h-6 w-6" />} title={search ? "No matching clients" : "No clients yet"}
              description={search ? "Try a different search." : "Add your first client to start invoicing."}>
              {!search ? <Button onClick={() => setOpenAdd(true)} className="mt-1"><Plus className="h-4 w-4 mr-2" /> Add client</Button> : null}
            </EmptyState>
          </div></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((c) => (
              <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="card group p-5 transition hover:shadow-pop">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 font-semibold text-brand-700">
                    {c.name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                  </div>
                  <Badge tone={c.stats.overdueAmount > 0 ? "red" : "gray"}>{c.stats.overdueAmount > 0 ? "At risk" : "On track"}</Badge>
                </div>
                <h3 className="mt-3 font-semibold text-ink-900 group-hover:text-brand-700">{c.name}</h3>
                {c.contactName ? <div className="text-sm text-ink-500">{c.contactName}</div> : null}
                {c.email ? <div className="text-xs text-ink-400">{c.email}</div> : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tags.slice(0, 3).map((t) => <Badge key={t} tone="blue">{t}</Badge>)}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center">
                  <div><div className="text-sm font-semibold text-ink-900">{c.stats.totalInvoices}</div><div className="text-[11px] text-ink-400">Invoices</div></div>
                  <div><div className="text-sm font-semibold text-emerald-600">{formatCurrency(c.stats.paidAmount)}</div><div className="text-[11px] text-ink-400">Paid</div></div>
                  <div><div className="text-sm font-semibold text-red-600">{formatCurrency(c.stats.outstandingAmount)}</div><div className="text-[11px] text-ink-400">Outstanding</div></div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : null}

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add client">
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Business name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="label">Contact name</label>
              <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
            <div><label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Tags</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {TAGS.map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, tags: form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t] })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${form.tags.includes(t) ? "border-brand-300 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-500 hover:border-ink-300"}`}>
                    {t}
                  </button>
                ))}
              </div></div>
          </div>
          <div><label className="label">Billing address</label>
            <textarea className="input min-h-16" value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} /></div>
          <div><label className="label">Internal notes</label>
            <textarea className="input min-h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button type="submit" className="w-full" loading={saving}>Add client</Button>
        </form>
      </Modal>
    </div>
  );
}
