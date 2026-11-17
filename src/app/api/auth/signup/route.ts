import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { hashPassword, createSession } from "@/lib/auth";
import { readJson, handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const POST = handleRoute(async (req) => {
  // Rate limit signups per IP
  const rl = rateLimit({ key: `signup:${clientIp(req)}`, limit: 8, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again shortly." },
      { status: 429 },
    );
  }

  const body = await readJson(req);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  // Bootstrap first admin from ADMIN_EMAIL if set
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  const isAdmin = adminCount === 0 && Boolean(adminEmail) && email === adminEmail;

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: isAdmin ? "ADMIN" : "USER",
      plan: "PROFESSIONAL",
    },
  });

  // Default active subscription record (local convenience; Stripe syncs in prod)
  await prisma.subscription.create({
    data: {
      userId: user.id,
      tier: "PROFESSIONAL",
      status: "ACTIVE",
      priceAmount: 0,
    },
  });

  await createSession({ sub: user.id, email: user.email, role: user.role, name: user.name });
  await recordAudit({
    actor: email,
    action: "auth.signup",
    userId: user.id,
    ip: clientIp(req),
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      onboardingComplete: Boolean(user.businessName),
    },
  });
});
