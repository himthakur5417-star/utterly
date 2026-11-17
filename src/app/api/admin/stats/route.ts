import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/api";

export const GET = handleRoute(async () => {
  await requireAdmin();

  const [users, subscriptions, invoices, payments, emailLogs, auditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.findMany(),
    prisma.invoice.count(),
    prisma.payment.findMany({ select: { amount: true } }),
    prisma.emailLog.findMany({ where: { status: "FAILED" }, take: 50, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.count(),
  ]);

  const activeSubs = subscriptions.filter((s) => s.status === "ACTIVE");
  const monthlyRecurringRevenue = activeSubs.reduce((s, sub) => s + sub.priceAmount, 0);
  const totalProcessed = payments.reduce((s, p) => s + p.amount, 0);

  const planDistribution = subscriptions.reduce((map, s) => {
    map.set(s.tier, (map.get(s.tier) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const statusDistribution = subscriptions.reduce((map, s) => {
    map.set(s.status, (map.get(s.status) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  return NextResponse.json({
    stats: {
      users,
      activeSubs: activeSubs.length,
      monthlyRecurringRevenue,
      totalProcessed,
      invoices,
      payments,
      auditLogs,
      failedEmails: emailLogs.length,
    },
    planDistribution: Object.fromEntries(planDistribution),
    statusDistribution: Object.fromEntries(statusDistribution),
    recentErrors: emailLogs,
  });
});
