import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { readJson, handleRoute } from "@/lib/api";
import { buildReminderContent, recallBucket, recommendNextDate, suggestStrategy } from "@/lib/ai";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import type { Tone } from "@prisma/client";

export const GET = handleRoute(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const invoiceId = url.searchParams.get("invoiceId");

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id, ...(invoiceId ? { invoiceId } : {}) },
    include: { invoice: { include: { client: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reminders });
});

export const POST = handleRoute(async (req) => {
  const user = await requireUser();
  const body = await readJson(req) ?? {};
  const invoiceId = body.invoiceId as string;
  if (!invoiceId) return NextResponse.json({ error: "invoiceId is required." }, { status: 422 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId: user.id },
    include: { client: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const info = recallBucket(invoice.dueDate);
  const tone: Tone = body.tone ?? "PROFESSIONAL";
  const content = body.subject && body.body
    ? { subject: body.subject as string, body: body.body as string }
    : buildReminderContent(invoice, invoice.client, tone, { businessName: user.businessName ?? user.name });

  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      invoiceId,
      bucket: info.bucket,
      tone,
      subject: content.subject,
      body: content.body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : recommendNextDate(info.bucket),
      status: "PREVIEW",
      recommendedNextDate: body.recommendedNextDate ? new Date(body.recommendedNextDate) : recommendNextDate(info.bucket),
      strategy: body.strategy ?? suggestStrategy(info.bucket, invoice),
    },
    include: { invoice: { include: { client: { select: { name: true, email: true } } } } },
  });

  await recordAudit({ actor: user.email, action: "reminder.created", entity: "reminder", entityId: reminder.id, userId: user.id, meta: { invoiceId }, ip: clientIp(req) });

  return NextResponse.json({ reminder }, { status: 201 });
});
