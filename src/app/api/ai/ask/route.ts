import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { aiAskSchema } from "@/lib/validation";
import { readJson, handleRoute } from "@/lib/api";
import { askAssistant } from "@/lib/ai";
import { recordAudit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const POST = handleRoute(async (req) => {
  const user = await requireUser();

  const rl = rateLimit({ key: `ai:${user.id}`, limit: 40, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await readJson(req);
  const parsed = aiAskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { answer, mode } = await askAssistant(parsed.data.prompt, { id: user.id, businessName: user.businessName });

  await recordAudit({
    actor: user.email,
    action: "ai.ask",
    userId: user.id,
    meta: { mode, prompt: parsed.data.prompt.slice(0, 120) },
    ip: clientIp(req),
  });

  return NextResponse.json({ answer, mode });
});
