import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/api";

export const GET = handleRoute(async (req) => {
  await requireAdmin();
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);

  const logs = await prisma.auditLog.findMany({
    where: action ? { action } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { email: true } } },
  });

  const actions = await prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true } });

  return NextResponse.json({ logs, actions });
});
