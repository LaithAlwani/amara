"use node";

import Stripe from "stripe";
import { action, internalAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set on the deployment.");
  return new Stripe(key);
}

type SubStatus = "active" | "paused" | "past_due" | "canceled";

// Map a Stripe subscription to our coarse status (pause overrides Stripe state).
function mapSubStatus(sub: Stripe.Subscription): SubStatus {
  if (sub.pause_collection) return "paused";
  switch (sub.status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "active";
  }
}

// Stripe moved the billing-period field to subscription items in newer API
// versions; read whichever is present (ms).
function currentPeriodEndMs(sub: Stripe.Subscription): number | undefined {
  const top = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  if (typeof top === "number") return top * 1000;
  const item = sub.items?.data?.[0] as
    | { current_period_end?: number }
    | undefined;
  if (item && typeof item.current_period_end === "number") {
    return item.current_period_end * 1000;
  }
  return undefined;
}

// Activate our draft subscription from the Stripe subscription. The draft id is
// carried in the Stripe subscription metadata. Idempotent; safe from both
// checkout-completed and invoice-paid.
async function ensureActivated(
  ctx: ActionCtx,
  stripe: Stripe,
  subscriptionId: string,
): Promise<void> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const draftId = sub.metadata?.subscriptionDraftId;
  if (!draftId) return; // not one of ours
  await ctx.runMutation(internal.subscriptions.activateSubscription, {
    subscriptionId: draftId as Id<"subscriptions">,
    stripeSubscriptionId: sub.id,
    status: mapSubStatus(sub),
    currentPeriodEnd: currentPeriodEndMs(sub),
  });
}

// Create a hosted Stripe Checkout Session for a pending order and return its URL.
// `origin` is the app base URL (passed from the browser) for success/cancel.
export const createCheckoutSession = action({
  args: { orderId: v.id("orders"), origin: v.string() },
  handler: async (ctx, { orderId, origin }) => {
    const data = await ctx.runQuery(internal.orders.getOrderForStripe, {
      orderId,
    });
    if (!data) throw new Error("Order not found.");
    if (data.status !== "pending") throw new Error("Order is not payable.");

    const stripe = stripeClient();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      data.items.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: "cad",
          unit_amount: i.unitPriceCents,
          product_data: { name: `${i.name} (${i.variantTitle})` },
        },
      }));
    if (data.shippingCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: data.shippingCents,
          product_data: { name: "Shipping" },
        },
      });
    }
    if (data.taxCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: data.taxCents,
          product_data: { name: "Tax (HST)" },
        },
      });
    }

    // Represent the discount as a one-off Stripe coupon so the hosted total
    // matches our order total. Line items stay at full price (incl. the tax
    // line already computed on the discounted base); the coupon takes the
    // discount off the top.
    let discounts:
      | Stripe.Checkout.SessionCreateParams.Discount[]
      | undefined;
    if (data.discountCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: data.discountCents,
        currency: "cad",
        duration: "once",
        name: data.discountCode ?? "Discount",
      });
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: data.email,
      client_reference_id: orderId,
      metadata: { orderId, orderNumber: data.orderNumber },
      ...(discounts ? { discounts } : {}),
      success_url: `${origin}/checkout/success?orderId=${orderId}`,
      cancel_url: `${origin}/checkout/cancel?orderId=${orderId}`,
      // Expire after 30 min (Stripe's minimum). When it lapses, the
      // `checkout.session.expired` webhook cancels the still-pending draft so
      // abandoned orders don't linger as "awaiting payment".
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    await ctx.runMutation(internal.orders.attachStripeSession, {
      orderId,
      sessionId: session.id,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  },
});

// Subscribe & Save: turn the signed-in shopper's whole cart into one recurring
// "box" (a Stripe subscription with a line per cart item + shipping + tax).
export const createCartSubscriptionCheckout = action({
  args: {
    anonId: v.optional(v.string()),
    intervalCount: v.number(),
    email: v.string(),
    shippingAddress: v.object({
      name: v.string(),
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      province: v.string(),
      postalCode: v.string(),
      country: v.string(),
      phone: v.optional(v.string()),
    }),
    origin: v.string(),
  },
  handler: async (ctx, { anonId, intervalCount, email, shippingAddress, origin }) => {
    const user = await ctx.runQuery(
      internal.subscriptions.getUserForCheckout,
      {},
    );
    if (!user) throw new Error("Please sign in to subscribe.");
    const ic = [1, 2, 3].includes(intervalCount) ? intervalCount : 1;
    const stripe = stripeClient();

    // Ensure a Stripe customer up front so the draft can store its id.
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.userId },
      });
      customerId = customer.id;
      await ctx.runMutation(internal.subscriptions.saveStripeCustomerId, {
        userId: user.userId,
        stripeCustomerId: customerId,
      });
    }

    const draft = await ctx.runMutation(
      internal.subscriptions.createSubscriptionDraft,
      {
        anonId,
        intervalCount: ic,
        email: email.trim().toLowerCase(),
        stripeCustomerId: customerId,
        shippingAddress,
      },
    );

    const recurring = { interval: "month" as const, interval_count: ic };
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      draft.lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: "cad",
          unit_amount: l.unitPriceCents,
          recurring,
          product_data: { name: l.name },
        },
      }));
    if (draft.shippingCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: draft.shippingCents,
          recurring,
          product_data: { name: "Shipping" },
        },
      });
    }
    if (draft.taxCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: draft.taxCents,
          recurring,
          product_data: { name: "Tax (HST)" },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: lineItems,
      subscription_data: {
        metadata: { subscriptionDraftId: draft.subscriptionId },
      },
      success_url: `${origin}/account/subscriptions?new=1`,
      cancel_url: `${origin}/checkout`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  },
});

// --- Manage (owner-checked) --------------------------------------------------

async function ownedStripeSubId(
  ctx: ActionCtx,
  subscriptionId: Id<"subscriptions">,
): Promise<string> {
  const owned = await ctx.runQuery(
    internal.subscriptions.getOwnedSubscription,
    { subscriptionId },
  );
  if (!owned) throw new Error("Subscription not found.");
  return owned.stripeSubscriptionId;
}

export const pauseSubscription = action({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const id = await ownedStripeSubId(ctx, subscriptionId);
    const stripe = stripeClient();
    await stripe.subscriptions.update(id, {
      pause_collection: { behavior: "void" },
    });
    await ctx.runMutation(internal.subscriptions.setSubscriptionStatus, {
      stripeSubscriptionId: id,
      status: "paused",
    });
    return { ok: true };
  },
});

export const resumeSubscription = action({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const id = await ownedStripeSubId(ctx, subscriptionId);
    const stripe = stripeClient();
    await stripe.subscriptions.update(id, { pause_collection: null });
    await ctx.runMutation(internal.subscriptions.setSubscriptionStatus, {
      stripeSubscriptionId: id,
      status: "active",
    });
    return { ok: true };
  },
});

export const cancelSubscription = action({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const id = await ownedStripeSubId(ctx, subscriptionId);
    const stripe = stripeClient();
    await stripe.subscriptions.cancel(id);
    await ctx.runMutation(internal.subscriptions.setSubscriptionStatus, {
      stripeSubscriptionId: id,
      status: "canceled",
    });
    return { ok: true };
  },
});

// Verify and dispatch a Stripe webhook event. Called by convex/http.ts.
export const handleStripeWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  handler: async (ctx, { payload, signature }) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
    const stripe = stripeClient();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      return { ok: false, error: "invalid_signature" };
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription" && s.subscription) {
          // Subscribe & Save: record the subscription. The first invoice's
          // `invoice.paid` creates the first fulfillment order.
          const subId =
            typeof s.subscription === "string"
              ? s.subscription
              : s.subscription.id;
          await ensureActivated(ctx, stripe, subId);
        } else if (s.payment_status === "paid") {
          await ctx.runMutation(internal.orders.finalizeOrderPaid, {
            sessionId: s.id,
            paymentIntentId:
              typeof s.payment_intent === "string"
                ? s.payment_intent
                : undefined,
            eventId: event.id,
          });
        }
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status === "paid") {
          await ctx.runMutation(internal.orders.finalizeOrderPaid, {
            sessionId: s.id,
            paymentIntentId:
              typeof s.payment_intent === "string"
                ? s.payment_intent
                : undefined,
            eventId: event.id,
          });
        }
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const s = event.data.object as Stripe.Checkout.Session;
        await ctx.runMutation(internal.orders.cancelPendingOrder, {
          sessionId: s.id,
          eventId: event.id,
        });
        break;
      }
      case "invoice.paid": {
        // One fulfillment order per paid subscription cycle (incl. the first).
        const inv = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subRef = inv.subscription;
        const subId =
          typeof subRef === "string" ? subRef : (subRef?.id ?? null);
        if (subId && inv.id) {
          await ensureActivated(ctx, stripe, subId);
          await ctx.runMutation(internal.subscriptions.createCycleOrder, {
            stripeSubscriptionId: subId,
            stripeInvoiceId: inv.id,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await ctx.runMutation(internal.subscriptions.setSubscriptionStatus, {
          stripeSubscriptionId: sub.id,
          status: mapSubStatus(sub),
          currentPeriodEnd: currentPeriodEndMs(sub),
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await ctx.runMutation(internal.subscriptions.setSubscriptionStatus, {
          stripeSubscriptionId: sub.id,
          status: "canceled",
        });
        break;
      }
    }

    return { ok: true };
  },
});
