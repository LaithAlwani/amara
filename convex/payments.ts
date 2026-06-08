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

// Retrieve the subscription (+ customer) from Stripe and upsert our record.
// Idempotent; safe to call from both checkout-completed and invoice-paid.
async function ensureSubscriptionRecorded(
  ctx: ActionCtx,
  stripe: Stripe,
  subscriptionId: string,
): Promise<void> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["customer"],
  });
  const meta = sub.metadata ?? {};
  if (!meta.userId || !meta.variantId) return; // not one of ours

  const customer = sub.customer;
  let email = meta.email ?? "";
  let shippingAddress:
    | {
        name: string;
        line1: string;
        line2?: string;
        city: string;
        province: string;
        postalCode: string;
        country: string;
        phone?: string;
      }
    | undefined;
  if (customer && typeof customer !== "string" && !customer.deleted) {
    email = customer.email ?? email;
    const sh = customer.shipping;
    if (sh?.address) {
      shippingAddress = {
        name: sh.name ?? "",
        line1: sh.address.line1 ?? "",
        line2: sh.address.line2 ?? undefined,
        city: sh.address.city ?? "",
        province: sh.address.state ?? "",
        postalCode: sh.address.postal_code ?? "",
        country: sh.address.country ?? "CA",
        phone: sh.phone ?? undefined,
      };
    }
  }
  const stripeCustomerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  await ctx.runMutation(internal.subscriptions.upsertSubscription, {
    stripeSubscriptionId: sub.id,
    stripeCustomerId,
    userId: meta.userId as Id<"users">,
    email,
    variantId: meta.variantId as Id<"productVariants">,
    quantity: Number(meta.quantity ?? "1"),
    intervalCount: Number(meta.intervalCount ?? "1"),
    status: mapSubStatus(sub),
    shippingAddress,
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

// Subscribe & Save: create a Stripe Checkout Session in subscription mode for
// a single variant. Requires sign-in (subscriptions are account-bound).
export const createSubscriptionCheckout = action({
  args: {
    variantId: v.id("productVariants"),
    quantity: v.number(),
    intervalCount: v.number(),
    origin: v.string(),
  },
  handler: async (ctx, { variantId, quantity, intervalCount, origin }) => {
    const user = await ctx.runQuery(
      internal.subscriptions.getUserForCheckout,
      {},
    );
    if (!user) throw new Error("Please sign in to subscribe.");
    const vc = await ctx.runQuery(internal.subscriptions.getVariantContext, {
      variantId,
    });
    if (!vc) throw new Error("This product can't be subscribed to right now.");

    const qty = Math.max(1, Math.round(quantity));
    const ic = [1, 2, 3].includes(intervalCount) ? intervalCount : 1;
    const stripe = stripeClient();

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

    const recurring = { interval: "month" as const, interval_count: ic };
    const subtotal = vc.unitPriceCents * qty;
    const taxCents = vc.taxRatePpm
      ? Math.round(((subtotal + vc.shippingCents) * vc.taxRatePpm) / 1_000_000)
      : 0;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: qty,
        price_data: {
          currency: "cad",
          unit_amount: vc.unitPriceCents,
          recurring,
          product_data: { name: `${vc.productName} (${vc.variantTitle})` },
        },
      },
    ];
    if (vc.shippingCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: vc.shippingCents,
          recurring,
          product_data: { name: "Shipping" },
        },
      });
    }
    if (taxCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: taxCents,
          recurring,
          product_data: { name: "Tax (HST)" },
        },
      });
    }

    const metadata = {
      userId: user.userId,
      variantId,
      productId: vc.productId,
      quantity: String(qty),
      intervalCount: String(ic),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ["CA"] },
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/account/subscriptions?new=1`,
      cancel_url: `${origin}/shop`,
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
          await ensureSubscriptionRecorded(ctx, stripe, subId);
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
          await ensureSubscriptionRecorded(ctx, stripe, subId);
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
