"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Building2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const BUSINESS_TYPES = [
  { v: "FREELANCER", l: "Freelancer", d: "Solo professional" },
  { v: "SOLO", l: "Solo business", d: "Single-owner company" },
  { v: "SMALL_BUSINESS", l: "Small business", d: "2–25 employees" },
  { v: "AGENCY", l: "Agency", d: "Client-services firm" },
  { v: "SERVICE_PROVIDER", l: "Service provider", d: "Contractor / services" },
  { v: "OTHER", l: "Other", d: "Something else" },
];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ businessName: "", email: "", businessType: "SOLO", currency: "USD", paymentPreference: "" });

  const steps = ["Business", "Preferences", "Done"];

  React.useEffect(() => {
    if (user && user.onboardingComplete) router.replace("/dashboard");
  }, [user, router]);

  const finish = async () => {
    setSaving(true);
    try {
      const payload = { ...form, email: form.email || undefined };
      const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) { toast("error", "Could not save", json.error); return; }
      await refresh();
      toast("success", "Welcome to Utterly!", "Your workspace is ready.");
      router.push("/dashboard");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-white to-white">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-10">
        <div className="w-full">
          <div className="flex justify-center"><Logo /></div>
          <div className="card mt-8 p-6 sm:p-10">
            <div className="mb-8 flex items-center gap-2">
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition", i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-400")}>
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  {i < steps.length - 1 ? <div className={cn("h-0.5 flex-1 rounded", i < step ? "bg-emerald-400" : "bg-ink-100")} /> : null}
                </React.Fragment>
              ))}
            </div>

            {step === 0 ? (
              <div className="space-y-5">
                <div>
                  <h1 className="text-xl font-bold text-ink-950">What’s your business called?</h1>
                  <p className="mt-1 text-sm text-ink-400">This appears on your invoices and reminders.</p>
                </div>
                <div>
                  <label className="label">Business name</label>
                  <input autoFocus className="input" placeholder="Acme Consulting LLC" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Work email</label>
                  <input type="email" className="input" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="flex justify-end"><Button onClick={() => setStep(1)} disabled={!form.businessName.trim()}>Continue <ArrowRight className="h-4 w-4 ml-2" /></Button></div>
              </div>
            ) : step === 1 ? (
              <div className="space-y-5">
                <div>
                  <h1 className="text-xl font-bold text-ink-950">Tell us a bit more</h1>
                  <p className="mt-1 text-sm text-ink-400">We’ll tailor the experience to your business.</p>
                </div>
                <div>
                  <label className="label">Business type</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {BUSINESS_TYPES.map((t) => (
                      <button key={t.v} type="button" onClick={() => setForm({ ...form, businessType: t.v })}
                        className={cn("rounded-xl border p-3 text-left transition", form.businessType === t.v ? "border-brand-400 bg-brand-50 ring-1 ring-brand-400" : "border-ink-200 hover:border-ink-300")}>
                        <div className="text-sm font-medium text-ink-900">{t.l}</div>
                        <div className="text-xs text-ink-400">{t.d}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Currency</label>
                    <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Payment preference</label>
                    <input className="input" placeholder="Net 15, bank transfer…" value={form.paymentPreference} onChange={(e) => setForm({ ...form, paymentPreference: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                  <Button onClick={() => setStep(2)}>Continue <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white"><Building2 className="h-7 w-7" /></div>
                <div>
                  <h1 className="text-xl font-bold text-ink-950">You’re all set, {form.businessName || "there"}!</h1>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400">We’ve created your workspace. Next, create your first client and invoice — or let the AI recovery engine watch for overdue payments.</p>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
                  <Sparkles className="h-4 w-4" /> Demo data is preloaded so you can explore right away.
                </div>
                <Button size="lg" className="w-full" onClick={finish} loading={saving}>Go to my dashboard <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
