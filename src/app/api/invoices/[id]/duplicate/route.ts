import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const POST = handleRoute(async (req, ctx) => {
  const user = await requireUser();
  const id = ctx.params.id;
  const source = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { items: true },
  });
  if (!source) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const now = new Date();
  const copied = await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: source.clientId,
      number: `${source.number}-copy`,
      issueDate: now,
      dueDate: new Date(now.getTime() + 14 * 86400000),
      status: "DRAFT",
      subject: source.subject,
      discountPercent: source.discountPercent,
      taxPercent: source.taxPercent,
      totalAmount: source.totalAmount,
      memo: source.memo,
      items: {
        create: source.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          amount: i.amount,
        })),
      },
    },
    include: { client: true, items: true },
  });

  await recordAudit({
    actor: user.email,
    action: "invoice.duplicated",
    entity: "invoice",
    entityId: copied.id,
    userId: user.id,
    meta: { from: source.number, to: copied.number },
    ip: clientIp(req),
  });

  return NextResponse.json({ invoice: copied }, { status: 201 });
});
