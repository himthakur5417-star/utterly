import { NextResponse } from "next/server";
import { ApiError } from "@/lib/auth";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** Wrap a route handler, translating ApiError/ZodError into responses. */
export function handleRoute<T>(
  fn: (req: Request, ctx: { params: Record<string, string> }) => Promise<T>,
): (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response> {
  return async (req, ctx) => {
    try {
      const params = await ctx.params;
      const result = await fn(req, { params });
      if (result instanceof Response) return result;
      return NextResponse.json(result);
    } catch (e) {
      if (e instanceof ApiError) {
        return jsonError(e.message, e.status);
      }
      if (e instanceof ZodError) {
        return jsonError(e.issues[0]?.message ?? "Invalid input", 422);
      }
      console.error("[api error]", e);
      return jsonError("Something went wrong.", 500);
    }
  };
}
