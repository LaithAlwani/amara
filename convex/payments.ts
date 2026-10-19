"use node";

import crypto from "crypto";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";

// Square REST config, derived from deployment env. Sandbox vs production is
// chosen by SQUARE_ENVIRONMENT; everything else matches the Stripe-era setup.
const SQUARE_VERSION = "2025-01-23";

function squareConfig(): { baseUrl: string; token: string; locationId: string } {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token)
    throw new ConvexError("SQUARE_ACCESS_TOKEN is not set on the deployment.");
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId)
    throw new ConvexError("SQUARE_LOCATION_ID is not set on the deployment.");
  const env = (process.env.SQUARE_ENVIRONMENT ?? "sandbox").toLowerCase();
  const baseUrl =
    env === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";
  return { baseUrl, token, locationId };
}

// Create a Square hosted payment link for a pending order and return its URL.
// `origin` is the app base URL (passed from the browser) for the return redirect.
export const createCheckoutSession = action({
  args: { orderId: v.id("orders"), origin: v.string() },
  handler: async (ctx, { orderId, origin }): Promise<{ url: string }> => {
    // Annotate the cross-file query result to break the TS circularity that
    // arises when an action's inferred return type flows through `internal.*`.
    const data: {
      orderNumber: string;
      status: string;
      email: string;
      amountDueCents: number;
    } | null = await ctx.runQuery(internal.orders.getOrderForSquare, {
      orderId,
    });
    if (!data) throw new ConvexError("Order not found.");
    if (data.status !== "pending")
      throw new ConvexError("Order is not payable.");

    // Fully covered by points / discount — nothing to charge, finalize directly.
    if (data.amountDueCents <= 0) {
      await ctx.runMutation(internal.orders.finalizeFreeOrder, { orderId });
      return { url: `${origin}/checkout/success?order=${orderId}` };
    }

    const { baseUrl, token, locationId } = squareConfig();
    const res = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        "Square-Version": SQUARE_VERSION,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Reusing the order id makes retries return the same link (idempotent).
        idempotency_key: `order_${orderId}`,
        quick_pay: {
          name: `Amara order ${data.orderNumber}`,
          price_money: { amount: data.amountDueCents, currency: "CAD" },
          location_id: locationId,
        },
        checkout_options: {
          // Square appends its own `orderId`/`transactionId`; we key off `order`.
          redirect_url: `${origin}/checkout/success?order=${orderId}`,
          ask_for_shipping_address: false,
        },
        pre_populated_data: { buyer_email: data.email },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json?.errors?.[0]?.detail ?? JSON.stringify(json);
      throw new ConvexError(`Square: ${msg}`);
    }
    const link = json.payment_link;
    if (!link?.url || !link?.order_id) {
      throw new ConvexError("Square did not return a payment link.");
    }
    await ctx.runMutation(internal.orders.attachSquareOrder, {
      orderId,
      squareOrderId: link.order_id as string,
    });
    return { url: link.url as string };
  },
});

// Verify and dispatch a Square webhook event. Called by convex/http.ts.
// Square signs with HMAC-SHA256 over (notificationUrl + rawBody), base64,
// compared to the `x-square-hmacsha256-signature` header.
export const handleSquareWebhook = internalAction({
  args: { payload: v.string(), signature: v.string(), url: v.string() },
  handler: async (ctx, { payload, signature, url }) => {
    const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!key)
      throw new ConvexError("SQUARE_WEBHOOK_SIGNATURE_KEY is not set.");

    const expected = crypto
      .createHmac("sha256", key)
      .update(url + payload)
      .digest("base64");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, error: "invalid_signature" };
    }

    let event: {
      event_id?: string;
      type?: string;
      data?: {
        object?: {
          payment?: { id?: string; status?: string; order_id?: string };
        };
      };
    };
    try {
      event = JSON.parse(payload);
    } catch {
      return { ok: false, error: "invalid_payload" };
    }

    const payment = event.data?.object?.payment;
    if (
      event.event_id &&
      (event.type === "payment.updated" || event.type === "payment.created") &&
      payment?.status === "COMPLETED" &&
      payment.order_id
    ) {
      await ctx.runMutation(internal.orders.finalizeOrderPaid, {
        squareOrderId: payment.order_id,
        squarePaymentId: payment.id,
        eventId: event.event_id,
      });
    }

    return { ok: true };
  },
});
