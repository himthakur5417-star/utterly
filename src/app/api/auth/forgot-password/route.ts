import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { SignJWT } from "jose";
import { sendEmail } from "@/lib/email";
import { recordAudit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const resetSecret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "utterly-dev-secret-change-me",
);

export const POST = handleRoute(async (req) => {
  const rl = rateLimit({ key: `forgot:${clientIp(req)}`, limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const body = await readJson(req);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 422 });

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same to avoid account enumeration
  if (!user) {
    return NextResponse.json({ ok: true, message: "If an account exists for that email, a reset link was sent." });
  }

  const token = await new SignJWT({ sub: user.id, purpose: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30m")
    .sign(resetSecret);

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
  const emailConfigured = Boolean(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);

  if (emailConfigured) {
    await sendEmail({
      to: email,
      subject: "Reset your Utterly password",
      body: `Hi ${user.name},\n\nClick the link below to reset your Utterly password (valid for 30 minutes):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      userId: user.id,
    });
    await recordAudit({ actor: email, action: "auth.forgot_password", userId: user.id, ip: clientIp(req) });
    return NextResponse.json({ ok: true, message: "If an account exists for that email, a reset link was sent." });
  }

  // Demo mode (no email provider): surface the reset link for testing.
  await recordAudit({ actor: email, action: "auth.forgot_password", userId: user.id, ip: clientIp(req) });
  return NextResponse.json({
    ok: true,
    demo: true,
    message: "No email provider is configured, so this is a demo reset link.",
    resetUrl,
  });
});
