import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword, createSession } from "@/lib/auth";
import { readJson, handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const POST = handleRoute(async (req) => {
  const rl = rateLimit({ key: `login:${clientIp(req)}`, limit: 12, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please try again shortly." }, { status: 429 });
  }

  const body = await readJson(req);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 422 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (user.status === "SUSPENDED") {
    return NextResponse.json({ error: "This account has been suspended. Contact support." }, { status: 403 });
  }

  await createSession({ sub: user.id, email: user.email, role: user.role, name: user.name });
  await recordAudit({ actor: email, action: "auth.login", userId: user.id, ip: clientIp(req) });

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
