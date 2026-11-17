import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { recallBucket } from "@/lib/ai";

export const GET = handleRoute(async () => {
  const user = await requireUser();

  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({ where: { userId: user.id }, include: { client: { select: { name: true } } } }),
    prisma.payment.findMany({
      where: { userId: user.id, status: "SUCCEEDED" },
      include: { invoice: { select: { issueDate: true, totalAmount: true, amountPaid: true } } },
    }),
  ]);

  const active = invoices.filter((i) => i.status !== "CANCELLED" && i.status !== "DRAFT");
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = active.reduce((s, i) => s + Math.max(0, i.totalAmount - i.amountPaid), 0);
  const recoveryRate = totalCollected + totalOutstanding > 0 ? (totalCollected / (totalCollected + totalOutstanding)) * 100 : 0;

  // Average collection time: days from issue date to payment
  const collectionDays = payments
    .map((p) => {
      if (!p.invoice) return null;
      const issue = new Date(p.invoice.issueDate);
      const paidAt = p.paidAt ?? p.createdAt;
      return Math.max(0, Math.round((paidAt.getTime() - issue.getTime()) / 86400000));
    })
    .filter((x): x is number => x !== null);
  const avgCollectionTime = collectionDays.length
    ? collectionDays.reduce((a, b) => a + b, 0) / collectionDays.length
    : 0;

  // Client-wise outstanding
  const clientOutstanding = active.reduce((map, inv) => {
    const k = inv.client.name;
    map.set(k, (map.get(k) ?? 0) + Math.max(0, inv.totalAmount - inv.amountPaid));
    return map;
  }, new Map<string, number>());

  const clientWise = [...clientOutstanding.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Monthly series
  const months = Array.from({ length: 6 }, (_, idx) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (5 - idx) + 1, 1);
    const revenue = payments.filter((p) => p.paidAt && p.paidAt >= start && p.paidAt < end).reduce((s, p) => s + p.amount, 0);
    const outstanding = active.filter((i) => i.issueDate < end).reduce((s, i) => s + Math.max(0, i.totalAmount - i.amountPaid), 0);
    return {
      label: start.toLocaleString("en-US", { month: "short" }),
      revenue: Math.round(revenue * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
    };
  });

  // Recovery trend: collected vs outstanding per month
  const recoveryTrend = months.map((m) => ({
    label: m.label,
    rate: m.revenue + m.outstanding > 0 ? Math.round((m.revenue / (m.revenue + m.outstanding)) * 1000) / 10 : 0,
  }));

  return NextResponse.json({
    summary: {
      totalCollected,
      totalOutstanding,
      recoveryRate: Math.round(recoveryRate * 10) / 10,
      avgCollectionTime: Math.round(avgCollectionTime * 10) / 10,
      invoiceCount: active.length,
      paymentCount: payments.length,
    },
    monthly: months,
    recoveryTrend,
    clientWise,
    overdueByBucket: {
      early: active.filter((i) => recallBucket(i.dueDate).bucket === "EARLY").length,
      late: active.filter((i) => recallBucket(i.dueDate).bucket === "LATE").length,
      severe: active.filter((i) => recallBucket(i.dueDate).bucket === "SEVERE").length,
      critical: active.filter((i) => recallBucket(i.dueDate).bucket === "CRITICAL").length,
    },
  });
});
