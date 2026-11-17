"use client";

import * as React from "react";
import { Send, Sparkles, MessageSquare, ChevronDown, ChevronRight, CalendarClock, Lightbulb } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, StatCard, CardLoading } from "@/components/dashboard/panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";

interface OverdueInvoice {
  id: string; number: string; clientName: string; clientEmail?: string; total: number; outstanding: number;
  currency: string; dueDate: string; daysOverdue: number; status: string; strategy: string; recommendedNextDate?: string;
}
interface Bucket { bucket: string; count: number; amount: number; invoices: OverdueInvoice[]; }
interface Overview { buckets: Bucket[]; totalOverdue: number; }
interface ChatMsg { role: "user" | "ai"; content: string; mode?: string; }

const BUCKET_META: Record<string, { label: string; tone: "amber" | "red" | "violet"; icon: string }> = {
  EARLY: { label: "1–7 days overdue", tone: "amber", icon: "bg-amber-50 text-amber-600" },
  LATE: { label: "8–30 days overdue", tone: "amber", icon: "bg-amber-50 text-amber-600" },
  SEVERE: { label: "31–60 days overdue", tone: "red", icon: "bg-red-50 text-red-600" },
  CRITICAL: { label: "60+ days overdue", tone: "violet", icon: "bg-violet-50 text-violet-600" },
};
const TONES = ["POLITE", "PROFESSIONAL", "FRIENDLY", "FIRM"];
const QUICK_QUESTIONS = [
  "Which invoices need attention today?",
  "Which clients have the highest outstanding balances?",
  "What is my total overdue amount?",
  "Suggest a recovery strategy for my oldest invoice.",
];

export default function RecoveryPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useFetch<Overview>("/api/recovery/overview");
  const [open, setOpen] = React.useState<Bucket | null>(null);
  const [activeInvoice, setActiveInvoice] = React.useState<OverdueInvoice | null>(null);
  const [tone, setTone] = React.useState("PROFESSIONAL");
  const [gen, setGen] = React.useState<any>(null);
  const [sending, setSending] = React.useState(false);

  const [msgs, setMsgs] = React.useState<ChatMsg[]>([{ role: "ai", content: "Hi — I’m your AI recovery assistant. Ask me about overdue invoices, clients, or strategies." }]);
  const [prompt, setPrompt] = React.useState("");
  const [thinking, setThinking] = React.useState(false);

  const ask = async (q?: string) => {
    const text = (q ?? prompt).trim();
    if (!text || thinking) return;
    setPrompt("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setThinking(true);
    try {
      const res = await fetch("/api/ai/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text }) });
      const json = await res.json();
      if (!res.ok) { setMsgs((m) => [...m, { role: "ai", content: `I couldn’t answer that: ${json.error}` }]); return; }
      setMsgs((m) => [...m, { role: "ai", content: json.answer, mode: json.mode }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", content: "Network error — please try again." }]);
    } finally { setThinking(false); }
  };

  const openReminder = (inv: OverdueInvoice) => {
    setActiveInvoice(inv); setGen(null); setTone("PROFESSIONAL"); setOpen({ bucket: "", count: 0, amount: 0, invoices: [] });
  };

  const generate = async () => {
    if (!activeInvoice) return;
    setGen(null);
    const res = await fetch("/api/ai/generate-reminder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: activeInvoice.id, tone }) });
    const json = await res.json();
    if (!res.ok) { toast("error", "Could not generate", json.error); return; }
    setGen(json);
  };

  const send = async () => {
    if (!activeInvoice || !gen) return;
    setSending(true);
    try {
      const r1 = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: activeInvoice.id, tone, subject: gen.subject, body: gen.body }) });
      const j1 = await r1.json();
      if (!r1.ok) { toast("error", "Failed to create reminder", j1.error); return; }
      const r2 = await fetch(`/api/reminders/${j1.reminder.id}/send`, { method: "POST" });
      const j2 = await r2.json();
      if (!r2.ok) { toast("error", "Delivery failed", j2.error); return; }
      toast(j2.provider === "simulated" ? "info" : "success", j2.provider === "simulated" ? "Simulated delivery" : "Reminder sent", j2.note ?? `Delivered to ${activeInvoice.clientEmail}.`);
      setOpen(null); setActiveInvoice(null); reload();
    } finally { setSending(false); }
  };

  if (loading) return <CardLoading />;
  if (error) return <div className="card p-8 text-center text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const totalInvoices = data.buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="AI Recovery" description="Automatically detect, prioritize, and recover overdue payments." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total overdue" value={formatCurrency(data.totalOverdue)} sub={`${totalInvoices} overdue invoices`} icon={<Sparkles className="h-4 w-4" />} accent="red" />
        <StatCard label="Recoverable now" value="AI active" sub="Reminders auto-generated" icon={<Sparkles className="h-4 w-4" />} accent="violet" />
        <StatCard label="Follow-ups scheduled" value={data.buckets.reduce((s, b) => s + b.invoices.filter((i) => i.recommendedNextDate).length, 0)} sub="recommended dates" icon={<CalendarClock className="h-4 w-4" />} accent="blue" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {data.buckets.map((b) => {
            const meta = BUCKET_META[b.bucket] ?? { label: b.bucket, tone: "amber" as const, icon: "bg-amber-50 text-amber-600" };
            return (
              <Card key={b.bucket}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.icon}`}><Lightbulb className="h-4 w-4" /></div>
                    <div>
                      <CardTitle>{meta.label}</CardTitle>
                      <div className="mt-0.5 text-xs text-ink-400">{b.count} invoices · {formatCurrency(b.amount)} outstanding</div>
                    </div>
                  </div>
                  <Badge tone={meta.tone}>{b.count}</Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  {b.invoices.length === 0 ? (
                    <EmptyState compact icon={<Sparkles className="h-5 w-5" />} title="Nothing here" description="No invoices in this age range." />
                  ) : (
                    <ul className="divide-y divide-ink-50">
                      {b.invoices.map((inv) => (
                        <li key={inv.id} className="py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-ink-900">{inv.clientName}</div>
                                <div className="text-xs text-ink-400">#{inv.number} · {inv.daysOverdue}d overdue</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-ink-900">{formatCurrency(inv.outstanding, inv.currency)}</span>
                              <Button size="sm" onClick={() => openReminder(inv)}><Send className="h-3.5 w-3.5 mr-1.5" /> Reminder</Button>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-brand-50/60 px-3 py-2 text-xs text-brand-800">
                              <div className="font-medium uppercase tracking-wide text-brand-600">AI strategy</div>
                              <div className="mt-0.5">{inv.strategy}</div>
                            </div>
                            {inv.recommendedNextDate ? (
                              <div className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                                <div className="font-medium uppercase tracking-wide text-ink-400">Recommended follow-up</div>
                                <div className="mt-0.5 font-medium">{formatDate(inv.recommendedNextDate)}</div>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* AI Assistant */}
        <Card className="xl:sticky xl:top-20 xl:self-start">
          <CardHeader>
            <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white"><Sparkles className="h-4 w-4" /></div><CardTitle>AI assistant</CardTitle></div>
          </CardHeader>
          <CardContent>
            <div className="flex h-[320px] flex-col gap-3 overflow-y-auto rounded-xl bg-ink-50/60 p-3">
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "self-end bg-brand-600 text-white" : "self-start bg-white text-ink-700 shadow-sm"}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.role === "ai" && m.mode === "demo" ? (
                    <div className="mt-1.5 text-[11px] text-amber-600">Demo mode · simulated AI response</div>
                  ) : null}
                </div>
              ))}
              {thinking ? <div className="self-start rounded-2xl bg-white px-3.5 py-2.5 text-sm text-ink-400 shadow-sm">Thinking…</div> : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button key={q} onClick={() => ask(q)} className="rounded-full border border-ink-200 px-2.5 py-1 text-[11px] text-ink-500 transition hover:border-brand-300 hover:text-brand-700">
                  {q}
                </button>
              ))}
            </div>

            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(); }}>
              <input className="input h-10 flex-1" placeholder="Ask about overdue payments…" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <Button type="submit" loading={thinking}><Send className="h-4 w-4" /></Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Reminder modal */}
      <Modal open={!!open} onClose={() => { setOpen(null); setActiveInvoice(null); }} title={`Reminder · ${activeInvoice?.clientName ?? ""}`}>
        {activeInvoice ? (
          <div className="space-y-4">
            <div>
              <label className="label">Tone</label>
              <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            {!gen ? (
              <Button className="w-full" onClick={generate}><Sparkles className="h-4 w-4 mr-2" /> Generate with AI</Button>
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
                  <Button className="flex-1" onClick={send} loading={sending}><Send className="h-4 w-4 mr-2" /> Send now</Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
