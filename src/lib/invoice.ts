import type { InvoiceItem } from "@prisma/client";

export interface Totals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

export function computeInvoiceTotals(
  items: Array<Pick<InvoiceItem, "amount">>,
  discountPercent: number,
  taxPercent: number,
): Totals {
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const discount = (subtotal * (discountPercent || 0)) / 100;
  const taxable = subtotal - discount;
  const tax = (taxable * (taxPercent || 0)) / 100;
  return {
    subtotal,
    discount,
    taxable,
    tax,
    total: Math.round((taxable + tax) * 100) / 100,
  };
}

export async function checkPlanInvoiceLimit(userId: string, plan: string): Promise<{ ok: boolean; message?: string }> {
  if (plan !== "STARTER") return { ok: true };
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const count = await (await import("@/lib/db")).prisma.invoice.count({
    where: { userId, createdAt: { gte: startOfMonth } },
  });
  if (count >= 25) {
    return {
      ok: false,
      message: "Starter plan is limited to 25 invoices/month. Upgrade to Professional for unlimited invoices.",
    };
  }
  return { ok: true };
}
