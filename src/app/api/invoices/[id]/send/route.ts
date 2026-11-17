import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const POST = handleRoute(async (req, ctx) => {
  const user = await requireUser();
  const id = ctx.params.id;
  const invoice = await prisma.invoice.findFirst({ where: { id, userId: user.id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: "SENT" },
    include: { client: true, items: true },
  });

  await recordAudit({
    actor: user.email,
    action: "invoice.sent",
    entity: "invoice",
    entityId: id,
    userId: user.id,
    meta: { number: invoice.number },
    ip: clientIp(req),
  });

  return NextResponse.json({ invoice: updated });
});
