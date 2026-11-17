import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { handleRoute } from "@/lib/api";

export const POST = handleRoute(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
