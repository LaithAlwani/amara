"use node";

import Stripe from "stripe";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set on the deployment.");
  return new Stripe(key);
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: data.email,
      client_reference_id: orderId,
      metadata: { orderId, orderNumber: data.orderNumber },
      success_url: `${origin}/checkout/success?orderId=${orderId}`,
      cancel_url: `${origin}/checkout/cancel?orderId=${orderId}`,
    });

    await ctx.runMutation(internal.orders.attachStripeSession, {
      orderId,
      sessionId: session.id,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
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
      case "checkout.session.completed":
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
    }

    return { ok: true };
  },
});
