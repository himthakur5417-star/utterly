import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { sendEmail } from "@/lib/email";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const POST = handleRoute(async (req, ctx) => {
  const user = await requireUser();
  const id = ctx.params.id;

  const reminder = await prisma.reminder.findFirst({
    where: { id, userId: user.id },
    include: { invoice: { include: { client: true } } },
  });
  if (!reminder) return NextResponse.json({ error: "Reminder not found." }, { status: 404 });

  // If this reminder was already sent, block re-sending to avoid duplicates.
  if (reminder.sentAt) {
    return NextResponse.json({ error: "This reminder has already been sent." }, { status: 409 });
  }

  const clientEmail = reminder.invoice.client.email;
  if (!clientEmail) {
    return NextResponse.json({ error: "This client has no email address on file. Add an email to send reminders." }, { status: 400 });
  }

  const result = await sendEmail({
    to: clientEmail,
    subject: reminder.subject,
    body: reminder.body,
    userId: user.id,
    invoiceId: reminder.invoiceId,
    reminderId: reminder.id,
    clientId: reminder.invoice.clientId,
  });

  const status = result.status;
  const updated = await prisma.reminder.update({
    where: { id },
    data: {
      status,
      sentAt: result.ok ? new Date() : null,
      recommendedNextDate: reminder.recommendedNextDate,
    },
  });

  // Ensure the invoice is marked as SENT once contacted
  if (result.ok && reminder.invoice.status === "DRAFT") {
    await prisma.invoice.update({ where: { id: reminder.invoiceId }, data: { status: "SENT" } });
  }

  await recordAudit({
    actor: user.email,
    action: "reminder.sent",
    entity: "reminder",
    entityId: id,
    userId: user.id,
    meta: { provider: result.provider, status, invoiceId: reminder.invoiceId },
    ip: clientIp(req),
  });

  return NextResponse.json({
    ok: result.ok,
    status,
    provider: result.provider,
    note: result.provider === "simulated"
      ? "No email provider is configured, so this was recorded as a simulated delivery. Set RESEND_API_KEY or SENDGRID_API_KEY to send real emails."
      : result.error,
    reminder: updated,
  });
});
