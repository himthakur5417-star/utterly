import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";

export const GET = handleRoute(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  const subscription = await (await import("@/lib/db")).prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      plan: user.plan,
      businessName: user.businessName,
      businessType: user.businessType,
      currency: user.currency,
      paymentPreference: user.paymentPreference,
      isDemoUser: user.isDemoUser,
      onboardingComplete: Boolean(user.businessName),
      subscription: subscription
        ? { tier: subscription.tier, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd }
        : null,
    },
  });
});
