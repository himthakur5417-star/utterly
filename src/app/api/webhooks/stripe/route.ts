import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/stripe";

export const POST = async (req: Request) => {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? undefined;
  const result = await handleStripeWebhook(rawBody, signature);
  if (result.handled) return NextResponse.json({ received: true });
  return NextResponse.json({ received: true, note: result.reason });
};
