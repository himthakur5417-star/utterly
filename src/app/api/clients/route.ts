import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clientSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { recallBucket } from "@/lib/ai";

function computeClientStats(invoices: Array<{ totalAmount: number; amountPaid: number; dueDate: Date; status: string }>) {
  const active = invoices.filter((i) => i.status !== "CANCELLED" && i.status !== "DRAFT");
  const totalInvoices = invoices.length;
  const paidAmount = active.reduce((s, i) => s + i.amountPaid, 0);
  const outstandingAmount = active.reduce((s, i) => s + Math.max(0, i.totalAmount - i.amountPaid), 0);
  const overdueAmount = active
    .filter((i) => recallBucket(i.dueDate).days > 0)
    .reduce((s, i) => s + Math.max(0, i.totalAmount - i.amountPaid), 0);
  return { totalInvoices, paidAmount, outstandingAmount, overdueAmount };
}

export const GET = handleRoute(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim().toLowerCase();

  const clients = await prisma.client.findMany({
    where: { userId: user.id, ...(search ? { OR: [{ name: { contains: search } }, { contactName: { contains: search } }, { email: { contains: search } }] } : {}) },
    include: { invoices: { select: { totalAmount: true, amountPaid: true, dueDate: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    clients: clients.map((c) => ({
      ...c,
      tags: c.tags ? c.tags.split(",").filter(Boolean) : [],
      stats: computeClientStats(c.invoices),
    })),
  });
});

export const POST = handleRoute(async (req) => {
  const user = await requireUser();
  const body = await readJson(req);
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const data = parsed.data;

  const client = await prisma.client.create({
    data: {
      userId: user.id,
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      billingAddress: data.billingAddress || null,
      notes: data.notes || null,
      tags: data.tags?.filter(Boolean).join(",") ?? "",
    },
  });

  await recordAudit({ actor: user.email, action: "client.created", entity: "client", entityId: client.id, userId: user.id, ip: clientIp(req) });

  return NextResponse.json({ client }, { status: 201 });
});
