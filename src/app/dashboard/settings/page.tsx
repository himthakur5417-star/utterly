"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Save, Check, Sparkles, LogOut } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { formatDate, cn } from "@/lib/utils";
import { PageHeader, CardLoading } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const BUSINESS_TYPES = ["FREELANCER", "SOLO", "SMALL_BUSINESS", "AGENCY", "SERVICE_PROVIDER", "OTHER"];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];
const PLANS = [
  { tier: "STARTER", name: "Starter", price: 19, features: ["25 invoices/month", "Basic payment reminders", "Client management", "Basic dashboard"] },
  { tier: "PROFESSIONAL", name: "Professional", price: 49, features: ["Unlimited invoices", "AI-generated reminders", "Automated follow-ups", "Advanced analytics", "Payment integration"] },
  { tier: "BUSINESS", name: "Business", price: 99, features: ["Everything in Professional", "Advanced AI recovery", "Custom automation workflows", "Priority support", "Advanced reporting"] },
];

function SettingsInner() {
  const searchParams = useSearchParams();
  const { user, refresh, logout } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = React.useState(searchParams.get("tab") === "pricing" ? "pricing" : "profile");
  const [saving, setSaving] = React.useState(false);
  const [switching, setSwitching] = React.useState<string | null>(null);
  const { data: subData } = useFetch<{ plan: string; subscription: any }>("/api/subscription");

  const [form, setForm] = React.useState({
    businessName: user?.businessName ?? "", email: user?.email ?? "", businessType: user?.businessType ?? "SOLO",
    currency: user?.currency ?? "USD", paymentPreference: user?.paymentPreference ?? "",
  });

  React.useEffect(() => {
    if (user) setForm({ businessName: user.businessName ?? "", email: user.email, businessType: user.businessType ?? "SOLO", currency: user.currency ?? "USD", paymentPreference: user.paymentPreference ?? "" });
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { toast("error", "Save failed", json.error); return; }
      toast("success", "Profile updated", "Your details were saved.");
      await refresh();
    } finally { setSaving(false); }
  };

  const switchPlan = async (tier: string) => {
    setSwitching(tier);
    try {
      const res = await fetch("/api/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }) });
      const json = await res.json();
      if (!res.ok) { toast("error", "Plan change failed", json.error); return; }
      toast("info", `Switched to ${tier}`, json.note);
      await refresh();
    } finally { setSwitching(null); }
  };

  if (!user) return <CardLoading />;

  const currentPlan = user.plan ?? "PROFESSIONAL";

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account, business profile, and plan." />

      <div className="flex gap-1 rounded-xl border border-ink-100 p-1 sm:w-fit">
        {[["profile", "Profile"], ["pricing", "Plan & billing"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-lg px-4 py-2 text-sm font-medium transition", tab === k ? "bg-ink-950 text-white" : "text-ink-500 hover:bg-ink-50")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <form onSubmit={saveProfile} className="max-w-2xl space-y-6">
          <Card>
            <CardHeader><div><CardTitle>Business profile</CardTitle><p className="mt-0.5 text-xs text-ink-400">Used on invoices and reminders</p></div></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="label">Business name *</label><input required className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></div>
              <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="label">Business type</label>
                <select className="input" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}>
                  {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select></div>
              <div><label className="label">Currency</label>
                <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div className="sm:col-span-2"><label className="label">Payment preference</label>
                <input className="input" placeholder="e.g. Net 15, PayPal, bank transfer…" value={form.paymentPreference} onChange={(e) => setForm({ ...form, paymentPreference: e.target.value })} /></div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={logout}><LogOut className="h-4 w-4 mr-2" /> Sign out</Button>
            <Button type="submit" loading={saving}><Save className="h-4 w-4 mr-2" /> Save changes</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><div><CardTitle>Current plan</CardTitle><p className="mt-0.5 text-xs text-ink-400">Manage your subscription</p></div></CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <div className="font-semibold text-ink-900">{currentPlan.charAt(0) + currentPlan.slice(1).toLowerCase()} plan</div>
                  <div className="text-sm text-ink-400">
                    ${PLANS.find((p) => p.tier === currentPlan)?.price}/month · {subData?.subscription?.currentPeriodEnd ? `renews ${formatDate(subData.subscription.currentPeriodEnd)}` : "active"}
                  </div>
                </div>
              </div>
              <Badge tone="green">Active</Badge>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {PLANS.map((p) => {
              const isCurrent = p.tier === currentPlan;
              return (
                <Card key={p.tier} className={cn("relative", isCurrent && "ring-2 ring-brand-500")}>
                  {isCurrent ? <div className="absolute right-4 top-4"><Badge tone="blue">Current</Badge></div> : null}
                  <CardContent className="flex flex-col p-6">
                    <div className="text-sm font-medium text-ink-400">{p.name}</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-ink-950">${p.price}</span>
                      <span className="text-sm text-ink-400">/month</span>
                    </div>
                    <ul className="mt-4 flex-1 space-y-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button className="mt-5 w-full" variant={isCurrent ? "secondary" : "primary"} disabled={isCurrent} loading={switching === p.tier} onClick={() => switchPlan(p.tier)}>
                      {isCurrent ? "Current plan" : "Switch to " + p.name}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <span className="font-medium">Note:</span> Plan switches are recorded locally in this build. For live card billing, configure your Stripe keys (STRIPE_SECRET_KEY) — the API is ready.
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <React.Suspense fallback={null}>
      <SettingsInner />
    </React.Suspense>
  );
}
