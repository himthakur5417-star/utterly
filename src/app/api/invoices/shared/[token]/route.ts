import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute } from "@/lib/api";
import { computeInvoiceTotals } from "@/lib/invoice";
import { stripeConfigured } from "@/lib/stripe";
import { recallBucket } from "@/lib/ai";

// Public, shareable invoice endpoint. No authentication required.
// Only exposes what a client needs to see and pay an invoice.
export const GET = handleRoute(async (_req, ctx) => {
  const token = ctx.params.token;
  const invoice = await prisma.invoice.findUnique({
    where: { sharedLinkToken: token },
    include: { client: { select: { name: true, contactName: true } }, items: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const totals = computeInvoiceTotals(invoice.items, invoice.discountPercent, invoice.taxPercent);
  const outstanding = Math.max(0, invoice.totalAmount - invoice.amountPaid);

  return NextResponse.json({
    invoice: {
      id: invoice.id,
      number: invoice.number,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      currency: invoice.currency,
      clientName: invoice.client.name,
      memo: invoice.memo,
      items: invoice.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.amount,
      })),
      totals,
      amountPaid: invoice.amountPaid,
      outstanding,
      overdueDays: recallBucket(invoice.dueDate).days > 0 ? recallBucket(invoice.dueDate).days : 0,
    },
    canPayOnline: stripeConfigured() && outstanding > 0 && ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status),
  });
});
