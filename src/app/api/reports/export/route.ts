import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

export const GET = handleRoute(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "invoices";

  if (kind === "payments") {
    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      include: { client: { select: { name: true } }, invoice: { select: { number: true } } },
      orderBy: { createdAt: "desc" },
    });
    const rows = payments.map((p) => ({
      Date: p.paidAt ? new Date(p.paidAt).toISOString().slice(0, 10) : new Date(p.createdAt).toISOString().slice(0, 10),
      Invoice: p.invoice?.number ?? "",
      Client: p.client.name,
      Amount: p.amount,
      Method: p.method,
      Status: p.status,
      Reference: p.transactionRef ?? "",
    }));
    const csv = toCSV(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="utterly-payments-${Date.now()}.csv"`,
      },
    });
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const rows = invoices.map((i) => ({
    Number: i.number,
    Client: i.client.name,
    IssueDate: new Date(i.issueDate).toISOString().slice(0, 10),
    DueDate: new Date(i.dueDate).toISOString().slice(0, 10),
    Status: i.status,
    Total: i.totalAmount,
    AmountPaid: i.amountPaid,
    Outstanding: Math.max(0, i.totalAmount - i.amountPaid),
    Currency: i.currency,
  }));
  const csv = toCSV(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="utterly-invoices-${Date.now()}.csv"`,
    },
  });
});
