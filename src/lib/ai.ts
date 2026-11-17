import { prisma } from "@/lib/db";
import type { Client, Invoice, RecallBucket, Tone } from "@prisma/client";
import { daysUntil, formatCurrency, formatDate } from "@/lib/utils";

// ── Recall bucketing ─────────────────────────────────────────────────

export interface BucketInfo {
  bucket: RecallBucket;
  days: number; // days overdue (positive) or negative if not due
  label: string;
}

export function recallBucket(dueDate: Date | string, now = new Date()): BucketInfo {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const days = Math.floor((now.getTime() - due.getTime()) / 86400000);
  if (days < 0) return { bucket: "UPCOMING", days, label: "Not yet due" };
  if (days <= 7) return { bucket: "EARLY", days, label: `1–7 days overdue` };
  if (days <= 30) return { bucket: "LATE", days, label: `8–30 days overdue` };
  if (days <= 60) return { bucket: "SEVERE", days, label: `31–60 days overdue` };
  return { bucket: "CRITICAL", days, label: "60+ days overdue" };
}

export const bucketOrder: RecallBucket[] = ["EARLY", "LATE", "SEVERE", "CRITICAL"];

// ── Tone-aware reminder templates ─────────────────────────────────────

interface ReminderText {
  subject: string;
  body: string;
}

function toneCopy(tone: Tone, bucket: RecallBucket): ReminderText {
  const clientName = "{clientName}";
  const businessName = "{businessName}";
  const invoiceNumber = "{invoiceNumber}";
  const amount = "{amount}";
  const dueDate = "{dueDate}";
  const daysLate = "{daysLate}";
  const link = "{paymentLink}";
  const contact = "{contact}";

  const politeBody = `Hi ${clientName},

We hope this message finds you well. This is a friendly reminder that invoice ${invoiceNumber} for ${amount} was due on ${dueDate} and is now ${daysLate} day(s) past due.

We totally understand how busy things get. If you have already made the payment, thank you — please disregard this note. Otherwise, we would be grateful if you could settle the balance at your earliest convenience.

Here is the secure payment link: ${link}

Please don't hesitate to reach out if you have any questions or if there is anything we can help with.${contact}

Best regards,
${businessName}`;

  const professionalBody = `Dear ${clientName},

This message is a formal reminder regarding invoice ${invoiceNumber} in the amount of ${amount}, which was due on ${dueDate} and is currently ${daysLate} day(s) past due.

To avoid any disruption to your services, please arrange payment as soon as possible via the secure link below:

${link}

If payment has already been made, this notice may be disregarded. For questions or to discuss a payment arrangement, please contact: ${contact}

Thank you for your prompt attention to this matter.

Sincerely,
${businessName}`;

  const friendlyBody = `Hi ${clientName},

Just checking in! We noticed invoice ${invoiceNumber} (${amount}) passed its due date of ${dueDate} — it's now ${daysLate} day(s) overdue.

No stress at all — life happens. If you could take a minute to settle the balance, we'd really appreciate it. Here's the easy payment link:

${link}

If you'd prefer to set up a different arrangement, just reply to this email or reach out at ${contact}. We're happy to help.

Thanks so much,
${businessName}`;

  const firmBody = `Dear ${clientName},

We are writing regarding invoice ${invoiceNumber} for ${amount}, which has been outstanding since ${dueDate} — now ${daysLate} day(s) past due. This is a final courtesy reminder.

Unless payment is received within the next 7 days, we will need to escalate this account to collections and review your service terms.

Please remit payment immediately using the secure link below:

${link}

If you believe this is an error or need to discuss a payment plan, contact us at ${contact} right away.

Regards,
${businessName}`;

  let subject = `Reminder: Invoice ${invoiceNumber} (${amount}) is overdue`;
  switch (tone) {
    case "POLITE":
      subject = `Friendly reminder: invoice ${invoiceNumber}`;
      return { subject, body: politeBody };
    case "FRIENDLY":
      subject = `A quick note about invoice ${invoiceNumber}`;
      return { subject, body: friendlyBody };
    case "FIRM":
      subject = `Urgent: invoice ${invoiceNumber} requires immediate attention`;
      return { subject, body: firmBody };
    default:
      subject = `Payment reminder: invoice ${invoiceNumber} (${amount})`;
      return { subject, body: professionalBody };
  }
}

export function renderReminderTemplate(
  template: { subject: string; body: string },
  ctx: {
    clientName: string;
    businessName: string;
    invoiceNumber: string;
    amount: string;
    dueDate: string;
    daysLate: number;
    paymentLink: string;
    contact: string;
  },
): ReminderText {
  const fill = (s: string) =>
    s
      .replace(/\{clientName\}/g, ctx.clientName)
      .replace(/\{businessName\}/g, ctx.businessName)
      .replace(/\{invoiceNumber\}/g, ctx.invoiceNumber)
      .replace(/\{amount\}/g, ctx.amount)
      .replace(/\{dueDate\}/g, ctx.dueDate)
      .replace(/\{daysLate\}/g, String(ctx.daysLate))
      .replace(/\{paymentLink\}/g, ctx.paymentLink)
      .replace(/\{contact\}/g, ctx.contact);
  return { subject: fill(template.subject), body: fill(template.body) };
}

export function buildReminderContent(
  invoice: Invoice,
  client: Client,
  tone: Tone,
  opts?: { businessName?: string; paymentLink?: string; contact?: string },
): ReminderText {
  const t = toneCopy(tone, recallBucket(invoice.dueDate).bucket);
  const link = opts?.paymentLink ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pay/${invoice.sharedLinkToken ?? invoice.id}`;
  return renderReminderTemplate(t, {
    clientName: client.name,
    businessName: opts?.businessName ?? "Our team",
    invoiceNumber: invoice.number,
    amount: formatCurrency(invoice.totalAmount, invoice.currency),
    dueDate: formatDate(invoice.dueDate),
    daysLate: Math.max(0, recallBucket(invoice.dueDate).days),
    paymentLink: link,
    contact: opts?.contact ?? "your Utterly workspace",
  });
}

// ── Follow-up + strategy recommendations ──────────────────────────────

export function recommendNextDate(bucket: RecallBucket, from = new Date()): Date {
  const d = new Date(from);
  switch (bucket) {
    case "EARLY":
      d.setDate(d.getDate() + 4);
      break;
    case "LATE":
      d.setDate(d.getDate() + 5);
      break;
    case "SEVERE":
      d.setDate(d.getDate() + 4);
      break;
    case "CRITICAL":
      d.setDate(d.getDate() + 3);
      break;
    default:
      d.setDate(d.getDate() + 7);
  }
  return d;
}

export function suggestStrategy(bucket: RecallBucket, invoice?: Pick<Invoice, "amountPaid" | "totalAmount">): string {
  const paid = invoice ? invoice.amountPaid / Math.max(1, invoice.totalAmount) : 0;
  switch (bucket) {
    case "EARLY":
      return "Send a warm, low-pressure reminder with a direct payment link. Most customers pay within 1–7 days of a gentle nudge.";
    case "LATE":
      return "Send a clear professional reminder, and offer a payment link and a simple 'reply to arrange a plan' option. If your client is usually reliable, a phone call can help.";
    case "SEVERE":
      return "Escalate to a firmer tone, offer a short-term payment plan, and consider pausing delivery of services until a payment plan is agreed.";
    case "CRITICAL":
      if (paid >= 0.5) {
        return "The client has partially paid — acknowledge the partial payment and propose a fixed schedule for the remaining balance before taking collection action.";
      }
      return "Escalate to collections or a formal demand letter. Include references to your payment terms and set a clear deadline before handing off to a debt collector.";
    default:
      return "This invoice is not yet due. Schedule a polite pre-due reminder a few days before the due date.";
  }
}

// ── LLM integration (optional) ────────────────────────────────────────

const hasLLM = () => Boolean(process.env.OPENAI_API_KEY);

export async function callLLM(system: string, user: string): Promise<string | null> {
  if (!hasLLM()) return null;
  try {
    const res = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.6,
        max_tokens: 700,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

// ── Assistant (LLM or functional demo mode) ────────────────────────────

const DEMO_PREFIX = "⚠️ Demo mode — simulated AI response";

export async function askAssistant(prompt: string, user: { id: string; businessName: string | null }): Promise<{ answer: string; mode: "live" | "demo" }> {
  // Build real context from the database for both live and demo paths.
  const context = await buildAssistantContext(user.id);
  const system = `You are Utterly's AI payment-recovery assistant for ${user.businessName ?? "a small business"}. ` +
    `Help the user recover overdue invoice payments. Be concise, practical and professional. ` +
    `Use only the provided data. Answer in clear prose with a short structure. Context:\n${context}`;

  const live = hasLLM();
  if (live) {
    const answer = await callLLM(system, prompt);
    if (answer) return { answer, mode: "live" };
  }

  return { answer: await demoAnswer(prompt, user.id), mode: "demo" };
}

async function buildAssistantContext(userId: string): Promise<string> {
  const [invoices, clients] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { client: { select: { name: true, contactName: true, email: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.client.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);

  const lines = invoices.map((inv) => {
    const b = recallBucket(inv.dueDate);
    return `- ${inv.number} ${inv.client.name}: ${formatCurrency(inv.totalAmount, inv.currency)} (due ${formatDate(inv.dueDate)}, ${b.label}, ${b.days >= 0 ? b.days + " days overdue" : "due in " + Math.abs(b.days) + " days"}), paid ${formatCurrency(inv.amountPaid, inv.currency)}`;
  });
  const totalOverdue = invoices.filter((i) => recallBucket(i.dueDate).days > 0)
    .reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0);
  return `Current overdue total: ${formatCurrency(totalOverdue)}.\nClients: ${clients.map((c) => c.name).join(", ") || "none"}.\nInvoices:\n${lines.join("\n") || "none"}`;
}

async function demoAnswer(prompt: string, userId: string): Promise<string> {
  const q = prompt.toLowerCase();
  const invoices = await prisma.invoice.findMany({
    where: { userId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    include: { client: true },
    orderBy: { dueDate: "asc" },
  });
  const overdue = invoices.filter((i) => recallBucket(i.dueDate).days > 0);
  const totalOverdue = overdue.reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0);

  const lines: string[] = [DEMO_PREFIX, ""];

  if (q.includes("attention") || q.includes("today") || q.includes("which invoice")) {
    const dueToday = invoices.filter((i) => daysUntil(i.dueDate) <= 3 && (i.status === "SENT" || i.status === "PARTIALLY_PAID"));
    lines.push("**Invoices needing attention now:**");
    if (dueToday.length === 0) lines.push("— Nothing due in the next 3 days.");
    for (const inv of dueToday) {
      const b = recallBucket(inv.dueDate);
      lines.push(`• ${inv.number} · ${inv.client.name} · ${formatCurrency(inv.totalAmount - inv.amountPaid, inv.currency)} · ${b.label}`);
    }
  } else if (q.includes("highest") || q.includes("outstanding balance") || q.includes("top client")) {
    lines.push("**Clients with the highest outstanding balances:**");
    const byClient = new Map<string, number>();
    for (const inv of overdue) {
      byClient.set(inv.client.name, (byClient.get(inv.client.name) ?? 0) + (inv.totalAmount - inv.amountPaid));
    }
    const sorted = [...byClient.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) lines.push("— No outstanding balances right now.");
    for (const [name, amt] of sorted.slice(0, 5)) {
      lines.push(`• ${name}: ${formatCurrency(amt)}`);
    }
  } else if (q.includes("reminder") || q.includes("write") || q.includes("late")) {
    const daysMatch = q.match(/(\d+)\s*day/i);
    const target = q.includes("15") && !daysMatch ? null : invoices.find((i) => {
      const days = recallBucket(i.dueDate).days;
      return days > 0 && (daysMatch ? days === parseInt(daysMatch[1]!) : true);
    }) ?? overdue[0];
    if (!target) {
      lines.push("There are no overdue invoices to remind right now.");
    } else {
      const b = recallBucket(target.dueDate);
      const tone: Tone = b.bucket === "CRITICAL" || b.bucket === "SEVERE" ? "FIRM" : "PROFESSIONAL";
      const content = buildReminderContent(target, target.client, tone, { businessName: "your business" });
      lines.push(`Here is a ${tone.toLowerCase()} reminder for **${target.client.name}** (${target.number}, ${b.label}):`);
      lines.push("");
      lines.push(`**Subject:** ${content.subject}`);
      lines.push("");
      lines.push(content.body);
    }
  } else if (q.includes("total overdue") || q.includes("how much") || q.includes("owed")) {
    lines.push(`**Your total overdue amount is ${formatCurrency(totalOverdue)}** across ${overdue.length} invoice(s).`);
    if (overdue.length > 0) {
      const buckets = bucketOrder.map((bk) => {
        const list = overdue.filter((i) => recallBucket(i.dueDate).bucket === bk);
        return { bk, sum: list.reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0), count: list.length };
      }).filter((x) => x.count > 0);
      lines.push("");
      lines.push("Breakdown by age:");
      for (const { bk, sum, count } of buckets) {
        lines.push(`• ${bk}: ${formatCurrency(sum)} (${count})`);
      }
    }
  } else if (q.includes("strategy") || q.includes("recover") || q.includes("collect")) {
    lines.push("**Recommended recovery strategies:**");
    for (const inv of overdue.slice(0, 5)) {
      const b = recallBucket(inv.dueDate);
      lines.push(`• ${inv.number} (${inv.client.name}, ${b.label}): ${suggestStrategy(b.bucket, inv)}`);
    }
    if (overdue.length === 0) lines.push("— Nothing overdue yet. Keep sending pre-due reminders.");
  } else {
    lines.push(
      "I can help you recover overdue payments. Try asking:",
      "• \"Which invoices need attention today?\"",
      "• \"Which clients have the highest outstanding balances?\"",
      "• \"Write a reminder for a client who is 15 days late.\"",
      "• \"What is my total overdue amount?\"",
      "• \"Suggest a recovery strategy for this invoice.\"",
    );
  }

  return lines.join("\n");
}

/** Summarize overdue buckets for a user's invoices (used by UI). */
export async function getOverdueSummary(userId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { userId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
  });
  const buckets: Record<RecallBucket, { count: number; amount: number }> = {
    UPCOMING: { count: 0, amount: 0 },
    EARLY: { count: 0, amount: 0 },
    LATE: { count: 0, amount: 0 },
    SEVERE: { count: 0, amount: 0 },
    CRITICAL: { count: 0, amount: 0 },
  };
  let totalOverdue = 0;
  for (const inv of invoices) {
    const b = recallBucket(inv.dueDate);
    const outstanding = inv.totalAmount - inv.amountPaid;
    if (b.bucket !== "UPCOMING") {
      buckets[b.bucket].count += 1;
      buckets[b.bucket].amount += outstanding;
      totalOverdue += outstanding;
    }
  }
  return { buckets, totalOverdue };
}
