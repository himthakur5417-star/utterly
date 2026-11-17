import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { planChangeSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const PLAN_PRICES: Record<string, number> = {
  STARTER: 19,
  PROFESSIONAL: 49,
  BUSINESS: 99,
};

/**
 * User-facing plan management.
 *
 * In production this is backed by Stripe Billing (customer/subscription in
 * src/lib/stripe.ts). When Stripe keys are configured, swap the body of POST
 * for a Stripe Checkout/Portal redirect. Until then we record the plan switch
 * locally so the product is fully usable in development/demo, and we say so
 * in the response rather than pretending a real card payment happened.
 */
export const GET = handleRoute(async () => {
  const user = await requireUser();
  const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ plan: user.plan, subscription });
});

export const POST = handleRoute(async (req) => {
  const user = await requireUser();
  const body = await readJson(req);
  const parsed = planChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid plan" }, { status: 422 });
  }

  const price = PLAN_PRICES[parsed.data.tier] ?? 0;

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { plan: parsed.data.tier } }),
    prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, tier: parsed.data.tier, status: "ACTIVE", priceAmount: price },
      update: { tier: parsed.data.tier, status: "ACTIVE", priceAmount: price },
    }),
  ]);

  await recordAudit({
    actor: user.email,
    action: "user.plan_changed",
    userId: user.id,
    meta: { tier: parsed.data.tier },
    ip: clientIp(req),
  });

  return NextResponse.json({
    plan: parsed.data.tier,
    local: true,
    note: "Plan switched locally. Connect Stripe billing keys to take real card payments.",
  });
});
