import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Stripe webhook. Lives on the Convex *.site domain:
//   https://<deployment>.convex.site/stripe/webhook
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }
    const payload = await request.text();
    const result = await ctx.runAction(internal.payments.handleStripeWebhook, {
      payload,
      signature,
    });
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { "content-type": "application/json" },
    });
  }),
});

// Shippo tracking webhook (track_updated). Shippo doesn't sign payloads, so we
// gate on a shared token in the query string:
//   https://<deployment>.convex.site/shippo/webhook?token=<SHIPPO_WEBHOOK_TOKEN>
http.route({
  path: "/shippo/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = process.env.SHIPPO_WEBHOOK_TOKEN;
    const token = new URL(request.url).searchParams.get("token");
    if (expected && token !== expected) {
      return new Response("forbidden", { status: 403 });
    }
    let body: {
      data?: {
        tracking_number?: string;
        tracking_status?: { status?: string };
      };
    };
    try {
      body = await request.json();
    } catch {
      return new Response("bad request", { status: 400 });
    }
    const trackingNumber = body.data?.tracking_number;
    const shippoStatus = body.data?.tracking_status?.status;
    if (trackingNumber && shippoStatus) {
      await ctx.runMutation(internal.shipments.applyTrackingUpdate, {
        trackingNumber,
        shippoStatus,
      });
    }
    return new Response("ok", { status: 200 });
  }),
});

export default http;
