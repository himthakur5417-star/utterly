import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute } from "@/lib/api";
import { createInvoiceCheckoutSession } from "@/lib/stripe";

/**
 * Public, token-scoped checkout starter for the shareable invoice view.
 * Looks the invoice up by its shared-link token so no auth is required,
 * then returns a Stripe Checkout URL for the outstanding balance.
 */
export const GET = handleRoute(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const invoice = await prisma.invoice.findUnique({
    where: { sharedLinkToken: token },
    include: { client: { select: { name: true } } },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const outstanding = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  if (outstanding <= 0 || !["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status)) {
    return NextResponse.json({ error: "This invoice has no outstanding balance." }, { status: 400 });
  }

  const result = await createInvoiceCheckoutSession(invoice as any);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ url: result.url });
});
