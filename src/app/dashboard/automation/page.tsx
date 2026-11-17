"use client";

import * as React from "react";
import { BellRing, Save, Mail, CheckCircle2 } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { PageHeader, CardLoading } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface Automation {
  settings: {
    enabled: boolean; beforeDueDays: number; remindOnDue: boolean; followUp3: boolean; followUp7: boolean;
    followUp15: boolean; escalate30: boolean; defaultTone: string; templates?: string | null;
  };
}
interface EmailLog { id: string; to: string; subject: string; status: string; provider: string; error?: string; createdAt: string; invoice?: { number: string }; client?: { name: string }; }
const TONES = ["POLITE", "PROFESSIONAL", "FRIENDLY", "FIRM"];
const STATUS_TONE: Record<string, "green" | "amber" | "red" | "gray"> = {
  SENT: "green", DELIVERED: "green", SIMULATED: "amber", PREVIEW: "gray", FAILED: "red", BOUNCED: "red", OPENED: "green",
};

export default function AutomationPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useFetch<Automation>("/api/automation");
  const { data: emailData, reload: reloadEmails } = useFetch<{ logs: EmailLog[] }>("/api/emails");
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<any>(null);

  React.useEffect(() => {
    if (data && !form) setForm({ ...data.settings });
  }, [data, form]);

  const steps = form ? [
    { key: "enabled", label: "Automation enabled", on: form.enabled },
    { key: "beforeDueDays", label: `Reminder ${form.beforeDueDays}d before due date`, on: form.enabled && form.beforeDueDays > 0 },
    { key: "remindOnDue", label: "Reminder on the due date", on: form.enabled && form.remindOnDue },
    { key: "followUp3", label: "Follow-up 3 days after due", on: form.enabled && form.followUp3 },
    { key: "followUp7", label: "Follow-up 7 days after due", on: form.enabled && form.followUp7 },
    { key: "followUp15", label: "Follow-up 15 days after due", on: form.enabled && form.followUp15 },
    { key: "escalate30", label: "Escalation 30 days after due", on: form.enabled && form.escalate30 },
  ] : [];

  const toggle = (key: string) => setForm((f: any) => ({ ...f, [key]: key === "enabled" ? !f[key] : !f[key] }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/automation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { toast("error", "Save failed", json.error); return; }
      toast("success", "Automation updated", "Your reminder schedule is live.");
    } finally { setSaving(false); }
  };

  if (loading) return <CardLoading />;
  if (error) return <div className="card p-8 text-center text-sm text-red-600">{error}</div>;
  if (!data || !form) return <CardLoading />;

  return (
    <div className="space-y-6">
      <PageHeader title="Email automation" description="Automate payment reminders with a schedule you control." actions={
        <Button onClick={save} loading={saving}><Save className="h-4 w-4 mr-2" /> Save schedule</Button>
      } />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Reminder schedule</CardTitle><p className="mt-0.5 text-xs text-ink-400">Default tone: {form.defaultTone.toLowerCase()}</p></div></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {steps.map((s) => (
                <div key={s.key} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {s.on ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <BellRing className="h-4 w-4 text-ink-300" />}
                    <span className="text-sm font-medium text-ink-800">{s.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (s.key === "beforeDueDays") {
                        setForm((f: any) => ({ ...f, beforeDueDays: f.beforeDueDays > 0 ? 0 : 2 }));
                      } else {
                        toggle(s.key);
                      }
                    }}
                    className={`relative h-6 w-11 rounded-full transition ${s.on ? "bg-brand-600" : "bg-ink-200"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.on ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
                <span className="text-sm font-medium text-ink-800">Days before due date</span>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="30" className="input h-9 w-20 text-right" value={form.beforeDueDays}
                    onChange={(e) => setForm((f: any) => ({ ...f, beforeDueDays: parseInt(e.target.value) || 0 }))} />
                  <span className="text-xs text-ink-400">days</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
                <span className="text-sm font-medium text-ink-800">Default tone</span>
                <select className="input h-9 w-40" value={form.defaultTone} onChange={(e) => setForm((f: any) => ({ ...f, defaultTone: e.target.value }))}>
                  {TONES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Preview of your timeline</CardTitle><p className="mt-0.5 text-xs text-ink-400">How reminders flow for an overdue invoice</p></div></CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l border-ink-100 pl-5">
              {steps.filter((s) => s.on).map((s, i) => (
                <li key={s.key} className="relative">
                  <span className={`absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${i === 0 ? "bg-brand-500" : i === steps.filter((x) => x.on).length - 1 ? "bg-red-500" : "bg-ink-300"}`} />
                  <div className="text-sm font-medium text-ink-800">{s.label}</div>
                  <div className="text-xs text-ink-400">{i === 0 ? "Automated" : "Follow-up step"}</div>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              Emails are previewed and require your approval before the first send. After that, follow-ups run on schedule.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div><CardTitle>Email delivery log</CardTitle><p className="mt-0.5 text-xs text-ink-400">Recent reminders and their status</p></div>
          <Button variant="secondary" size="sm" onClick={reloadEmails}>Refresh</Button>
        </CardHeader>
        <CardContent className="pt-0">
          {emailData && emailData.logs.length === 0 ? (
            <EmptyState compact icon={<Mail className="h-5 w-5" />} title="No emails sent yet" description="Reminders you send will be logged here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs text-ink-400">
                    <th className="pb-2 font-medium">To</th><th className="pb-2 font-medium">Subject</th>
                    <th className="pb-2 font-medium">Invoice</th><th className="pb-2 font-medium">Provider</th>
                    <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {(emailData?.logs ?? []).map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 font-medium text-ink-900">{l.client?.name ?? l.to}</td>
                      <td className="py-2.5 max-w-[240px] truncate text-ink-600">{l.subject}</td>
                      <td className="py-2.5 text-ink-500">{l.invoice ? `#${l.invoice.number}` : "—"}</td>
                      <td className="py-2.5 text-ink-500">{l.provider}</td>
                      <td className="py-2.5"><Badge tone={STATUS_TONE[l.status] ?? "gray"}>{l.status}</Badge></td>
                      <td className="py-2.5 text-ink-400">{formatDate(l.createdAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
