import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute, readJson } from "@/lib/api";
import { paymentSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const GET = handleRoute(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const invoiceId = url.searchParams.get("invoiceId");

  const payments = await prisma.payment.findMany({
    where: { userId: user.id, ...(invoiceId ? { invoiceId } : {}) },
    include: { invoice: { select: { number: true } }, client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ payments });
});

export const POST = handleRoute(async (req) => {
  const user = await requireUser();
  const body = await readJson(req);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: parsed.data.invoiceId, userId: user.id },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const amount = Math.round(parsed.data.amount * 100) / 100;
  if (amount <= 0) return NextResponse.json({ error: "Amount must be positive." }, { status: 422 });

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        userId: user.id,
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        amount,
        method: parsed.data.method,
        status: "SUCCEEDED",
        transactionRef: parsed.data.transactionRef?.trim() || null,
        paidAt: new Date(),
      },
    });

    const newPaid = Math.min(invoice.totalAmount, invoice.amountPaid + amount);
    const nextStatus = newPaid >= invoice.totalAmount ? "PAID" : "PARTIALLY_PAID";
    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newPaid, status: nextStatus },
    });
    return { created, updated };
  });

  await recordAudit({
    actor: user.email,
    action: "payment.recorded",
    entity: "payment",
    entityId: payment.created.id,
    userId: user.id,
    meta: { invoiceId: invoice.id, amount, method: parsed.data.method },
    ip: clientIp(req),
  });

  return NextResponse.json({ payment: payment.created, invoice: payment.updated }, { status: 201 });
});
