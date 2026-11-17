import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { invoiceSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { computeInvoiceTotals, checkPlanInvoiceLimit } from "@/lib/invoice";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const GET = handleRoute(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim().toLowerCase();
  const status = url.searchParams.get("status");
  const clientId = url.searchParams.get("clientId");
  const sort = url.searchParams.get("sort") ?? "createdAt";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";

  const where: any = { userId: user.id };
  if (status && status !== "ALL") where.status = status;
  if (clientId) where.clientId = clientId;
  if (search) {
    where.OR = [
      { number: { contains: search } },
      { client: { is: { name: { contains: search } } } },
      { client: { is: { contactName: { contains: search } } } },
    ];
  }

  const orderBy: any = { [sort]: order };

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: { select: { name: true, email: true } }, items: true },
    orderBy,
  });

  return NextResponse.json({ invoices });
});

export const POST = handleRoute(async (req) => {
  const user = await requireUser();
  const body = await readJson(req);
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const data = parsed.data;

  const client = await prisma.client.findFirst({ where: { id: data.clientId, userId: user.id } });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const planCheck = await checkPlanInvoiceLimit(user.id, user.plan);
  if (!planCheck.ok) return NextResponse.json({ error: planCheck.message }, { status: 403 });

  const items = data.items.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    amount: Math.round(it.quantity * it.unitPrice * 100) / 100,
  }));

  const totals = computeInvoiceTotals(items, data.discountPercent, data.taxPercent);

  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: data.clientId,
      number: data.number,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      subject: data.subject || null,
      discountPercent: data.discountPercent,
      taxPercent: data.taxPercent,
      totalAmount: totals.total,
      memo: data.memo || null,
      status: body.status === "SENT" ? "SENT" : "DRAFT",
      items: { create: items },
    },
    include: { client: true, items: true },
  });

  await recordAudit({
    actor: user.email,
    action: "invoice.created",
    entity: "invoice",
    entityId: invoice.id,
    userId: user.id,
    meta: { number: invoice.number, total: invoice.totalAmount },
    ip: clientIp(req),
  });

  return NextResponse.json({ invoice }, { status: 201 });
});
