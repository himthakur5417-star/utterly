import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { generateInvoicePdf } from "@/lib/pdf";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const GET = handleRoute(async (_req, ctx) => {
  const user = await requireUser();
  const id = ctx.params.id;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { client: true, items: true },
  });
  if (!invoice) throw Object.assign(new Error("Invoice not found"), { status: 404 });

  const pdf = await generateInvoicePdf(invoice, user.businessName ?? user.name);

  await recordAudit({
    actor: user.email,
    action: "invoice.pdf_downloaded",
    entity: "invoice",
    entityId: id,
    userId: user.id,
    ip: clientIp(_req),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
