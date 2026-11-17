import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { reminderRequestSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { buildReminderContent, recallBucket, recommendNextDate, suggestStrategy } from "@/lib/ai";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const POST = handleRoute(async (req) => {
  const user = await requireUser();
  const body = await readJson(req) ?? {};
  const parsed = reminderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: parsed.data.invoiceId, userId: user.id },
    include: { client: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const info = recallBucket(invoice.dueDate);
  const tone = parsed.data.tone ?? (info.bucket === "CRITICAL" || info.bucket === "SEVERE" ? "FIRM" : "PROFESSIONAL");
  const content = buildReminderContent(invoice, invoice.client, tone, { businessName: user.businessName ?? user.name });
  const recommendedNextDate = recommendNextDate(info.bucket);
  const strategy = suggestStrategy(info.bucket, invoice);

  await recordAudit({
    actor: user.email,
    action: "ai.generate_reminder",
    entity: "invoice",
    entityId: invoice.id,
    userId: user.id,
    meta: { number: invoice.number, tone, bucket: info.bucket },
    ip: clientIp(req),
  });

  return NextResponse.json({
    subject: content.subject,
    body: content.body,
    tone,
    bucket: info.bucket,
    bucketLabel: info.label,
    daysOverdue: Math.max(0, info.days),
    recommendedNextDate,
    strategy,
  });
});
