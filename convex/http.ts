import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Square webhook. Lives on the Convex *.site domain:
//   https://<deployment>.convex.site/square/webhook
// Square signs over (notificationUrl + rawBody); we pass request.url (the exact
// URL hit, which must match the webhook subscription) to the verifier.
http.route({
  path: "/square/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("x-square-hmacsha256-signature");
    if (!signature) {
      return new Response("Missing x-square-hmacsha256-signature header", {
        status: 400,
      });
    }
    const payload = await request.text();
    const result = await ctx.runAction(internal.payments.handleSquareWebhook, {
      payload,
      signature,
      url: request.url,
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
