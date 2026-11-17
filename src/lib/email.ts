import { prisma } from "@/lib/db";
import type { EmailStatus } from "@prisma/client";

export interface EmailResult {
  ok: boolean;
  status: EmailStatus;
  provider: string;
  externalId?: string;
  error?: string;
}

// ── Provider detection ───────────────────────────────────────────────

export function emailProviderConfigured(): "resend" | "sendgrid" | null {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  return null;
}

const fromAddress = () => process.env.EMAIL_FROM || "Utterly <no-reply@utterly.app>";

// ── Send email via configured provider, else simulate ────────────────

export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
  invoiceId?: string;
  reminderId?: string;
  clientId?: string;
  userId?: string;
}): Promise<EmailResult> {
  const provider = emailProviderConfigured();
  const bodyText = opts.body.replace(/<[^>]+>/g, "");

  let result: EmailResult;
  if (provider === "resend") {
    result = await sendViaResend(opts.to, opts.subject, bodyText);
  } else if (provider === "sendgrid") {
    result = await sendViaSendGrid(opts.to, opts.subject, bodyText);
  } else {
    result = {
      ok: true,
      status: "SIMULATED",
      provider: "simulated",
      error: undefined,
    };
  }

  if (opts.userId) {
    await prisma.emailLog.create({
      data: {
        userId: opts.userId,
        invoiceId: opts.invoiceId,
        reminderId: opts.reminderId,
        clientId: opts.clientId,
        to: opts.to,
        subject: opts.subject,
        body: opts.body,
        status: result.status,
        provider: result.provider,
        externalId: result.externalId,
        error: result.error,
      },
    });
  }

  return result;
}

async function sendViaResend(to: string, subject: string, text: string): Promise<EmailResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: fromAddress(), to, subject, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: "FAILED", provider: "resend", error: data?.message ?? `Resend error ${res.status}` };
    }
    return { ok: true, status: "SENT", provider: "resend", externalId: data?.id };
  } catch (e: any) {
    return { ok: false, status: "FAILED", provider: "resend", error: e?.message ?? "Network error" };
  }
}

async function sendViaSendGrid(to: string, subject: string, text: string): Promise<EmailResult> {
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: (fromAddress().match(/<([^>]+)>/) ?? [])[1] ?? fromAddress() },
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, status: "FAILED", provider: "sendgrid", error: t.slice(0, 200) };
    }
    return { ok: true, status: "SENT", provider: "sendgrid" };
  } catch (e: any) {
    return { ok: false, status: "FAILED", provider: "sendgrid", error: e?.message ?? "Network error" };
  }
}

/** Convenience: update a reminder's sent state after an email. */
export async function markReminderSent(reminderId: string, status: EmailStatus, externalId?: string) {
  return prisma.reminder.update({
    where: { id: reminderId },
    data: { status, sentAt: new Date() },
  });
}
