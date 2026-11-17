import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { automationSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

const defaultAutomation = {
  enabled: true,
  beforeDueDays: 2,
  remindOnDue: true,
  followUp3: true,
  followUp7: true,
  followUp15: true,
  escalate30: true,
  defaultTone: "PROFESSIONAL",
  templates: null,
};

export const GET = handleRoute(async () => {
  const user = await requireUser();
  const settings = await prisma.automationSetting.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ settings: { ...defaultAutomation, ...(settings ?? {}) } });
});

export const PUT = handleRoute(async (req) => {
  const user = await requireUser();
  const body = await readJson(req);
  const parsed = automationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const existing = await prisma.automationSetting.findUnique({ where: { userId: user.id } });
  const settings = await prisma.automationSetting.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  await recordAudit({
    actor: user.email,
    action: "automation.updated",
    userId: user.id,
    meta: { changed: !existing ? "created" : Object.keys(parsed.data) },
    ip: clientIp(req),
  });

  return NextResponse.json({ settings: { ...defaultAutomation, ...settings } });
});
