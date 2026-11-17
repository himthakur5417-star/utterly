import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { recallBucket, bucketOrder, suggestStrategy, recommendNextDate } from "@/lib/ai";

export const GET = handleRoute(async () => {
  const user = await requireUser();
  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    include: { client: { select: { name: true, email: true } } },
    orderBy: { dueDate: "asc" },
  });

  const buckets = bucketOrder.map((bucket) => {
    const list = invoices
      .map((inv) => ({ inv, info: recallBucket(inv.dueDate) }))
      .filter((x) => x.info.bucket === bucket && x.info.days > 0)
      .map((x) => ({
        id: x.inv.id,
        number: x.inv.number,
        clientName: x.inv.client.name,
        clientEmail: x.inv.client.email,
        total: x.inv.totalAmount,
        outstanding: Math.max(0, x.inv.totalAmount - x.inv.amountPaid),
        currency: x.inv.currency,
        dueDate: x.inv.dueDate,
        daysOverdue: x.info.days,
        status: x.inv.status,
        strategy: suggestStrategy(bucket, x.inv),
        recommendedNextDate: recommendNextDate(bucket),
      }));
    return {
      bucket,
      count: list.length,
      amount: list.reduce((s, i) => s + i.outstanding, 0),
      invoices: list,
    };
  });

  const totalOverdue = buckets.reduce((s, b) => s + b.amount, 0);

  return NextResponse.json({ buckets, totalOverdue });
});
