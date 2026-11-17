import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const PATCH = handleRoute(async (req, ctx) => {
  const admin = await requireAdmin();
  const id = ctx.params.id;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: any = {};

  if (typeof body.status === "string" && ["ACTIVE", "SUSPENDED"].includes(body.status)) {
    data.status = body.status;
  }
  if (typeof body.plan === "string" && ["STARTER", "PROFESSIONAL", "BUSINESS"].includes(body.plan)) {
    data.plan = body.plan;
    await prisma.subscription.upsert({
      where: { userId: id },
      create: { userId: id, tier: body.plan, status: "ACTIVE", priceAmount: 0 },
      update: { tier: body.plan },
    });
  }
  if (typeof body.role === "string" && ["USER", "ADMIN"].includes(body.role)) {
    data.role = body.role;
  }

  const updated = await prisma.user.update({ where: { id }, data });

  await recordAudit({
    actor: admin.email,
    action: "admin.user_updated",
    userId: id,
    meta: { changes: Object.keys(data) },
    ip: clientIp(req),
  });

  return NextResponse.json({ user: updated });
});
