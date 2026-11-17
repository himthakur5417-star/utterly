import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { recallBucket } from "@/lib/ai";
import type { Invoice } from "@prisma/client";

const MONTHS = 6;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
  return { start, end, label: start.toLocaleString("en-US", { month: "short" }) };
}

export const GET = handleRoute(async () => {
  const user = await requireUser();

  const [invoices, payments, clientsCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId: user.id },
      include: { client: { select: { name: true, email: true } } },
      orderBy: { issueDate: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId: user.id, status: "SUCCEEDED" },
      include: { invoice: { select: { number: true } }, client: { select: { name: true } } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.client.count({ where: { userId: user.id } }),
  ]);

  const active = invoices.filter((i) => i.status !== "CANCELLED" && i.status !== "DRAFT");
  const totalRevenueCollected = payments.reduce((s, p) => s + p.amount, 0);
  const outstandingPayments = active.reduce((s, i) => s + Math.max(0, i.totalAmount - i.amountPaid), 0);
  const overdue = active.filter((i) => recallBucket(i.dueDate).days > 0);
  const overdueAmount = overdue.reduce((s, i) => s + Math.max(0, i.totalAmount - i.amountPaid), 0);
  const recoveryRate =
    totalRevenueCollected + outstandingPayments > 0
      ? (totalRevenueCollected / (totalRevenueCollected + outstandingPayments)) * 100
      : 0;

  // monthly series
  const monthlyRevenue = Array.from({ length: MONTHS }, (_, idx) => {
    const { start, end, label } = monthRange(MONTHS - 1 - idx);
    const sum = payments
      .filter((p) => p.paidAt && p.paidAt >= start && p.paidAt < end)
      .reduce((s, p) => s + p.amount, 0);
    return { label, revenue: Math.round(sum * 100) / 100 };
  });

  const monthlyOutstanding = Array.from({ length: MONTHS }, (_, idx) => {
    const { end, label } = monthRange(MONTHS - 1 - idx);
    const outstanding = active
      .filter((i) => i.issueDate < end)
      .reduce((s, i) => s + Math.max(0, i.totalAmount - i.amountPaid), 0);
    return { label, outstanding: Math.round(outstanding * 100) / 100 };
  });

  const upcomingDeadlines = invoices
    .filter((i) => {
      const days = recallBucket(i.dueDate).days;
      return days <= 0 && days >= -14 && i.status !== "PAID" && i.status !== "CANCELLED" && i.status !== "DRAFT";
    })
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      number: i.number,
      clientName: i.client.name,
      amount: Math.max(0, i.totalAmount - i.amountPaid),
      currency: i.currency,
      dueDate: i.dueDate,
      daysUntil: Math.abs(recallBucket(i.dueDate).days),
    }));

  const overdueAlerts = overdue
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      number: i.number,
      clientName: i.client.name,
      amount: Math.max(0, i.totalAmount - i.amountPaid),
      currency: i.currency,
      dueDate: i.dueDate,
      daysOverdue: recallBucket(i.dueDate).days,
      bucket: recallBucket(i.dueDate).bucket,
    }));

  return NextResponse.json({
    summary: {
      totalInvoices: invoices.length,
      totalRevenueCollected,
      outstandingPayments,
      overdueInvoices: overdue.length,
      paymentsRecovered: payments.length,
      recoveryRate: Math.round(recoveryRate * 10) / 10,
      clientsCount,
      totalInvoiced: active.reduce((s, i) => s + i.totalAmount, 0),
    },
    charts: {
      monthlyRevenue,
      monthlyOutstanding,
    },
    recentTransactions: payments.slice(0, 8).map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.invoice ? undefined : "USD",
      clientName: p.client.name,
      invoiceNumber: p.invoice?.number,
      method: p.method,
      paidAt: p.paidAt,
    })),
    upcomingDeadlines,
    overdueAlerts,
  });
});
