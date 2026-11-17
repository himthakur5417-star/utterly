import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const PATCH = handleRoute(async (req) => {
  const user = await requireUser();
  const body = await readJson(req);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      businessName: parsed.data.businessName,
      businessType: parsed.data.businessType,
      currency: parsed.data.currency,
      paymentPreference: parsed.data.paymentPreference || null,
      email: (parsed.data.email || undefined) && parsed.data.email !== user.email ? parsed.data.email : undefined,
    },
  });

  await recordAudit({ actor: user.email, action: "user.onboarding_updated", userId: user.id, ip: clientIp(req) });

  return NextResponse.json({
    user: {
      businessName: updated.businessName,
      businessType: updated.businessType,
      currency: updated.currency,
      paymentPreference: updated.paymentPreference,
      onboardingComplete: Boolean(updated.businessName),
    },
  });
});
