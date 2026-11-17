import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { invoiceSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { computeInvoiceTotals } from "@/lib/invoice";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import type { InvoiceStatus } from "@prisma/client";

async function getOwnedInvoice(userId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, userId },
    include: { client: true, items: true, payments: true },
  });
}

async function getParam(req: Request, ctx: { params: Record<string, string> }) {
  const id = ctx.params.id;
  if (!id) throw new Error("Missing id");
  return id;
}

export const GET = handleRoute(async (req, ctx) => {
  const user = await requireUser();
  const id = await getParam(req, ctx);
  const invoice = await getOwnedInvoice(user.id, id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json({ invoice });
});

export const PATCH = handleRoute(async (req, ctx) => {
  const user = await requireUser();
  const id = await getParam(req, ctx);
  const invoice = await getOwnedInvoice(user.id, id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const body = await readJson(req) ?? {};

  // Full editorial update (items included)
  if (body.items) {
    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
    }
    const data = parsed.data;
    const client = await prisma.client.findFirst({ where: { id: data.clientId, userId: user.id } });
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    const items = data.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: Math.round(it.quantity * it.unitPrice * 100) / 100,
    }));
    const totals = computeInvoiceTotals(items, data.discountPercent, data.taxPercent);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
      return tx.invoice.update({
        where: { id: invoice.id },
        data: {
          clientId: data.clientId,
          number: data.number,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          subject: data.subject || null,
          discountPercent: data.discountPercent,
          taxPercent: data.taxPercent,
          totalAmount: totals.total,
          memo: data.memo || null,
          items: { create: items },
        },
        include: { client: true, items: true },
      });
    });

    await recordAudit({
      actor: user.email,
      action: "invoice.updated",
      entity: "invoice",
      entityId: updated.id,
      userId: user.id,
      meta: { number: updated.number },
      ip: clientIp(req),
    });
    return NextResponse.json({ invoice: updated });
  }

  // Lightweight update (status / scalar fields only)
  const allowedScalars = ["subject", "memo", "discountPercent", "taxPercent"];
  const data: any = {};
  for (const key of allowedScalars) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.status) {
    const allowed: InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 422 });
    }
    data.status = body.status;
    if (body.status === "PAID") data.amountPaid = invoice.totalAmount;
    if (body.status === "SENT" && invoice.status === "DRAFT") data.status = "SENT";
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data,
    include: { client: true, items: true },
  });

  await recordAudit({
    actor: user.email,
    action: "invoice.updated",
    entity: "invoice",
    entityId: updated.id,
    userId: user.id,
    meta: { fields: Object.keys(data) },
    ip: clientIp(req),
  });

  return NextResponse.json({ invoice: updated });
});

export const DELETE = handleRoute(async (req, ctx) => {
  const user = await requireUser();
  const id = await getParam(req, ctx);
  const invoice = await getOwnedInvoice(user.id, id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  await prisma.invoice.delete({ where: { id } });

  await recordAudit({
    actor: user.email,
    action: "invoice.deleted",
    entity: "invoice",
    entityId: id,
    userId: user.id,
    meta: { number: invoice.number },
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
});
