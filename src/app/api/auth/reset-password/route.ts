import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { jwtVerify } from "jose";
import { hashPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const resetSecret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "utterly-dev-secret-change-me",
);

export const POST = handleRoute(async (req) => {
  const body = await readJson(req);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { token, password } = parsed.data;
  let payload: { sub?: string; purpose?: string };
  try {
    const { payload: p } = await jwtVerify(token, resetSecret);
    payload = p as { sub?: string; purpose?: string };
  } catch {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
  if (payload.purpose !== "reset" || !payload.sub) {
    return NextResponse.json({ error: "This reset link is invalid." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await recordAudit({ actor: user.email, action: "auth.reset_password", userId: user.id });

  return NextResponse.json({ ok: true });
});
