import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clientSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { recallBucket, recallBucket as bucket } from "@/lib/ai";

export const GET = handleRoute(async (_req, ctx) => {
  const user = await requireUser();
  const id = ctx.params.id;
  const client = await prisma.client.findFirst({
    where: { id, userId: user.id },
    include: { invoices: { include: { items: true, payments: true }, orderBy: { issueDate: "desc" } } },
  });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const active = client.invoices.filter((i) => i.status !== "CANCELLED" && i.status !== "DRAFT");
  const paidAmount = active.reduce((s, i) => s + i.amountPaid, 0);
  const outstandingAmount = active.reduce((s, i) => s + Math.max(0, i.totalAmount - i.amountPaid), 0);
  const overdueAmount = active
    .filter((i) => recallBucket(i.dueDate).days > 0)
    .reduce((s, i) => s + Math.max(0, i.totalAmount - i.amountPaid), 0);

  const payments = client.invoices.flatMap((i) => i.payments).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // activity timeline: combined events (invoices + payments)
  const timeline = [
    ...client.invoices.map((i) => ({
      id: `inv-${i.id}`,
      type: "invoice",
      date: i.createdAt,
      title: `Invoice ${i.number} created`,
      detail: `${i.status.replace(/_/g, " ").toLowerCase()} · ${i.totalAmount.toLocaleString()}`,
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      type: "payment",
      date: p.paidAt ?? p.createdAt,
      title: `Payment of ${p.amount.toLocaleString()}`,
      detail: `${p.method} · ${p.status.toLowerCase()}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    client: {
      ...client,
      tags: client.tags ? client.tags.split(",").filter(Boolean) : [],
      stats: { totalInvoices: client.invoices.length, paidAmount, outstandingAmount, overdueAmount },
      invoices: client.invoices.map((i) => ({
        id: i.id,
        number: i.number,
        issueDate: i.issueDate,
        dueDate: i.dueDate,
        status: i.status,
        totalAmount: i.totalAmount,
        amountPaid: i.amountPaid,
        currency: i.currency,
        bucket: bucket(i.dueDate).bucket,
        daysOverdue: Math.max(0, bucket(i.dueDate).days),
      })),
      payments: payments.slice(0, 20).map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        paidAt: p.paidAt,
        invoiceNumber: client.invoices.find((i) => i.id === p.invoiceId)?.number,
      })),
      timeline: timeline.slice(0, 30),
    },
  });
});

export const PATCH = handleRoute(async (req, ctx) => {
  const user = await requireUser();
  const id = ctx.params.id;
  const existing = await prisma.client.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const body = await readJson(req);
  const parsed = clientSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const data = parsed.data;

  const updated = await prisma.client.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      contactName: data.contactName !== undefined ? data.contactName || null : existing.contactName,
      email: data.email !== undefined ? data.email || null : existing.email,
      phone: data.phone !== undefined ? data.phone || null : existing.phone,
      billingAddress: data.billingAddress !== undefined ? data.billingAddress || null : existing.billingAddress,
      notes: data.notes !== undefined ? data.notes || null : existing.notes,
      tags: data.tags !== undefined ? data.tags.filter(Boolean).join(",") : existing.tags,
    },
  });

  await recordAudit({ actor: user.email, action: "client.updated", entity: "client", entityId: id, userId: user.id, ip: clientIp(req) });

  return NextResponse.json({ client: { ...updated, tags: updated.tags ? updated.tags.split(",").filter(Boolean) : [] } });
});

export const DELETE = handleRoute(async (_req, ctx) => {
  const user = await requireUser();
  const id = ctx.params.id;
  const existing = await prisma.client.findFirst({ where: { id, userId: user.id }, include: { invoices: true } });
  if (!existing) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  if (existing.invoices.length > 0) {
    return NextResponse.json({ error: "Delete this client's invoices before removing the client." }, { status: 409 });
  }

  await prisma.client.delete({ where: { id } });
  await recordAudit({ actor: user.email, action: "client.deleted", entity: "client", entityId: id, userId: user.id, ip: clientIp(_req) });
  return NextResponse.json({ ok: true });
});
