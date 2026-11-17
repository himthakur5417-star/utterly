import Stripe from "stripe";
import { prisma } from "@/lib/db";
import type { Invoice, PlanTier, User } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

// Server-side only. NEVER expose STRIPE_SECRET_KEY to the frontend.
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

const priceIdForTier = (tier: PlanTier): string | null => {
  const map: Record<PlanTier, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL,
    BUSINESS: process.env.STRIPE_PRICE_BUSINESS,
  };
  return map[tier] ?? null;
};

// ── One-off invoice payment link (Stripe Checkout) ────────────────────

export async function createInvoiceCheckoutSession(
  invoice: Invoice & { client: { name: string } },
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment." };

  const outstanding = Math.max(0, invoice.totalAmount - invoice.amountPaid);
  if (outstanding <= 0) return { error: "This invoice has no outstanding balance." };

  const user = await prisma.user.findUnique({ where: { id: invoice.userId } });
  const customer = user?.stripeCustomerId;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customer ?? undefined,
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            unit_amount: Math.round(outstanding * 100),
            product_data: {
              name: `Invoice ${invoice.number}`,
              description: `${invoice.client.name} — ${formatCurrency(outstanding, invoice.currency)}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId: invoice.id, userId: invoice.userId },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/invoices?paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/invoices/${invoice.id}`,
    });
    return { url: session.url ?? "" };
  } catch (e: any) {
    return { error: e?.message ?? "Failed to create a payment session." };
  }
}

// ── Subscription checkout ─────────────────────────────────────────────

export async function createSubscriptionCheckoutSession(
  user: User,
  tier: PlanTier,
): Promise<{ url: string } | { error: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe is not configured for subscriptions." };
  const priceId = priceIdForTier(tier);
  if (!priceId) return { error: "No Stripe price is configured for this plan." };

  try {
    let customer = user.stripeCustomerId;
    if (!customer) {
      const c = await stripe.customers.create({
        email: user.email,
        name: user.businessName ?? user.name,
        metadata: { userId: user.id },
      });
      customer = c.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer } });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.id, tier },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/settings?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/pricing`,
    });
    return { url: session.url ?? "" };
  } catch (e: any) {
    return { error: e?.message ?? "Failed to create a subscription session." };
  }
}

// ── Trusted payment application (webhook only) ────────────────────────
// Never called from the frontend. Invoice status only changes here.

export async function applyConfirmedPayment(args: {
  invoiceId: string;
  amount: number;
  transactionRef: string;
}) {
  const { invoiceId, amount, transactionRef } = args;
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Invoice not found");

    const newPaid = Math.min(invoice.totalAmount, invoice.amountPaid + amount);
    let status = invoice.status;
    if (newPaid >= invoice.totalAmount - 0.001) status = "PAID";
    else if (newPaid > 0) status = "PARTIALLY_PAID";

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newPaid, status },
    });

    await tx.payment.create({
      data: {
        userId: invoice.userId,
        invoiceId,
        clientId: invoice.clientId,
        amount,
        method: "STRIPE",
        status: "SUCCEEDED",
        transactionRef,
        paidAt: new Date(),
      },
    });

    return updated;
  });
}

// ── Webhook handler ───────────────────────────────────────────────────

export async function handleStripeWebhook(rawBody: string, signature?: string) {
  const stripe = getStripe();
  if (!stripe) return { handled: false, reason: "stripe-not-configured" };
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return { handled: false, reason: "missing-signature" };
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e: any) {
    return { handled: false, reason: `signature-verification-failed: ${e?.message}` };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;
      if (session.mode === "payment" && invoiceId) {
        const amount = (session.amount_total ?? 0) / 100;
        await applyConfirmedPayment({ invoiceId, amount, transactionRef: session.payment_intent as string });
      } else if (session.mode === "subscription" && typeof session.subscription === "string") {
        await syncSubscriptionFromStripe(session.customer as string, session.subscription);
      }
      break;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      if (typeof inv.subscription === "string") {
        await updateSubscriptionPeriod(inv.subscription);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscriptionStatus(sub);
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      if (typeof inv.subscription === "string") {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: inv.subscription },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }
  }

  return { handled: true };
}

async function syncSubscriptionFromStripe(customerId: string, subscriptionId: string) {
  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tier: user.plan, status: "ACTIVE", priceAmount: 0, stripeSubscriptionId: subscriptionId },
    update: { stripeSubscriptionId: subscriptionId, status: "ACTIVE" },
  });
  await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });
}

async function updateSubscriptionPeriod(subscriptionId: string) {
  const stripe = getStripe();
  if (!stripe) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const tier = (sub.items.data[0]?.price?.id) === process.env.STRIPE_PRICE_STARTER ? "STARTER"
    : (sub.items.data[0]?.price?.id) === process.env.STRIPE_PRICE_BUSINESS ? "BUSINESS"
      : "PROFESSIONAL";
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: "ACTIVE",
      tier,
      priceAmount: (sub.items.data[0]?.price?.unit_amount ?? 0) / 100,
      currentPeriodEnd: new Date((sub.current_period_end ?? Date.now()) * 1000),
    },
  });
  await prisma.user.updateMany({
    where: { id: (await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscriptionId } }))?.userId },
    data: { plan: tier },
  });
}

async function syncSubscriptionStatus(sub: Stripe.Subscription) {
  const status = sub.status === "canceled" ? "CANCELED" : sub.status === "past_due" ? "PAST_DUE" : "ACTIVE";
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status, currentPeriodEnd: new Date((sub.current_period_end ?? Date.now()) * 1000) },
  });
}
