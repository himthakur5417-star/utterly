import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { createInvoiceCheckoutSession } from "@/lib/stripe";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const POST = handleRoute(async (req, ctx) => {
  const user = await requireUser();
  const id = ctx.params.id;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { client: { select: { name: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const result = await createInvoiceCheckoutSession(invoice);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await recordAudit({
    actor: user.email,
    action: "invoice.payment_link_created",
    entity: "invoice",
    entityId: id,
    userId: user.id,
    meta: { number: invoice.number },
    ip: clientIp(req),
  });

  return NextResponse.json({ url: result.url });
});
