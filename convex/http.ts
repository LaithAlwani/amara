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

export default http;
