import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/api";

export const GET = handleRoute(async (req) => {
  await requireAdmin();
  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: search
      ? { OR: [{ email: { contains: search } }, { name: { contains: search } }, { businessName: { contains: search } }] }
      : {},
    include: { subscription: true, _count: { select: { invoices: true, clients: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      plan: u.plan,
      businessName: u.businessName,
      createdAt: u.createdAt,
      subscription: u.subscription ? { tier: u.subscription.tier, status: u.subscription.status, priceAmount: u.subscription.priceAmount } : null,
      invoiceCount: u._count.invoices,
      clientCount: u._count.clients,
    })),
  });
});
