"use node";

import nodemailer from "nodemailer";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Order-confirmation email. Runs in the Node runtime (nodemailer needs it) and
// is scheduled from `orders.finalizeOrderPaid` once payment is confirmed.
//
// SMTP config lives on the CONVEX deployment (not Vercel/.env.local), because
// this send originates inside Convex:
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"/"false"),
//   SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO (owner notify; optional).
// If host/user/pass are absent we log and skip so dev never hard-fails.

type EmailOrder = {
  orderNumber: string;
  email: string;
  status: string;
  fulfillmentMethod: "ship" | "pickup";
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    phone?: string;
  } | null;
  pickupLocation: {
    name: string;
    addressLine1: string;
    city: string;
    province: string;
    postalCode: string;
    instructions: string | null;
  } | null;
  items: {
    nameSnapshot: string;
    variantTitleSnapshot: string;
    quantity: number;
    lineTotalCents: number;
  }[];
};

function money(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  // `secure: true` is implicit TLS (port 465); `false` is plaintext+STARTTLS
  // (port 587/25). A mismatch makes the server drop the socket. Honor an
  // explicit SMTP_SECURE if given, else derive it from the port.
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

function renderHtml(order: EmailOrder, audience: "customer" | "owner"): string {
  const rows = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;color:#3f463f;font-size:14px;">
          ${escapeHtml(i.nameSnapshot)}
          <span style="color:#8a938a;">(${escapeHtml(
            i.variantTitleSnapshot,
          )}) &times;${i.quantity}</span>
        </td>
        <td style="padding:8px 0;text-align:right;color:#3f463f;font-size:14px;white-space:nowrap;">
          ${money(i.lineTotalCents)}
        </td>
      </tr>`,
    )
    .join("");

  const fulfillment =
    order.fulfillmentMethod === "pickup" && order.pickupLocation
      ? `<p style="margin:4px 0 0;color:#8a938a;font-size:14px;">
           Pickup &mdash; ${escapeHtml(order.pickupLocation.name)},
           ${escapeHtml(order.pickupLocation.addressLine1)},
           ${escapeHtml(order.pickupLocation.city)},
           ${escapeHtml(order.pickupLocation.province)}
           ${escapeHtml(order.pickupLocation.postalCode)}
           ${
             order.pickupLocation.instructions
               ? `<br/>${escapeHtml(order.pickupLocation.instructions)}`
               : ""
           }
         </p>`
      : order.shippingAddress
        ? `<p style="margin:4px 0 0;color:#8a938a;font-size:14px;">
             Shipping to ${escapeHtml(order.shippingAddress.name)},
             ${escapeHtml(order.shippingAddress.line1)},
             ${escapeHtml(order.shippingAddress.city)},
             ${escapeHtml(order.shippingAddress.province)}
             ${escapeHtml(order.shippingAddress.postalCode)}
           </p>`
        : "";

  const heading =
    audience === "owner" ? "New order received" : "Thank you for your order";
  const intro =
    audience === "owner"
      ? `Order <strong style="color:#3f463f;">${escapeHtml(
          order.orderNumber,
        )}</strong> just came in from <strong style="color:#3f463f;">${escapeHtml(
          order.email,
        )}</strong> &mdash; ${
          order.fulfillmentMethod === "pickup" ? "local pickup" : "shipping"
        }.`
      : `Order <strong style="color:#3f463f;">${escapeHtml(
          order.orderNumber,
        )}</strong> is confirmed. We'll email you again when it's on its way.`;

  return `
  <div style="background:#f4f6f3;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e8e2;border-radius:16px;overflow:hidden;">
      <div style="background:#1f2a22;padding:24px 32px;">
        <span style="color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.01em;">Amara</span>
      </div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 8px;font-size:22px;color:#1f2a22;">${heading}</h1>
        <p style="margin:0 0 24px;color:#8a938a;font-size:14px;">${intro}</p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #e3e8e2;">
          ${rows}
        </table>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #e3e8e2;margin-top:8px;padding-top:8px;">
          ${summaryRow("Subtotal", money(order.subtotalCents))}
          ${summaryRow(
            "Shipping",
            order.shippingCents === 0 ? "Free" : money(order.shippingCents),
          )}
          ${summaryRow("Tax (HST)", money(order.taxCents))}
        </table>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #e3e8e2;margin-top:8px;">
          <tr>
            <td style="padding:12px 0 0;font-size:16px;font-weight:600;color:#1f2a22;">Total</td>
            <td style="padding:12px 0 0;text-align:right;font-size:16px;font-weight:600;color:#1f2a22;">
              ${money(order.totalCents)}
            </td>
          </tr>
        </table>
        <div style="margin-top:24px;border-top:1px solid #e3e8e2;padding-top:16px;">
          ${fulfillment}
        </div>
      </div>
    </div>
  </div>`;
}

function summaryRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;color:#8a938a;font-size:14px;">${label}</td>
    <td style="padding:4px 0;text-align:right;color:#3f463f;font-size:14px;">${value}</td>
  </tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const sendOrderConfirmation = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.runQuery(internal.orders.getOrderForEmail, {
      orderId,
    });
    if (!order) {
      console.warn(`[emails] order ${orderId} not found; skipping confirmation`);
      return null;
    }

    const transport = buildTransport();
    if (!transport) {
      console.warn(
        `[emails] SMTP not configured; would send confirmation for ${order.orderNumber} to ${order.email}`,
      );
      return null;
    }

    const from = process.env.MAIL_FROM ?? "Amara <orders@amara.test>";

    // Customer receipt.
    await transport.sendMail({
      from,
      to: order.email,
      subject: `Your Amara order ${order.orderNumber} is confirmed`,
      html: renderHtml(order, "customer"),
    });

    // Owner notification — every paid order. Prefer the explicit MAIL_TO inbox,
    // else fall back to the authenticated SMTP mailbox (the store's own address)
    // so the owner is still alerted even if MAIL_TO was never configured.
    const ownerTo = process.env.MAIL_TO ?? process.env.SMTP_USER;
    if (ownerTo) {
      await transport.sendMail({
        from,
        to: ownerTo,
        replyTo: order.email,
        subject: `New order ${order.orderNumber} — ${money(order.totalCents)}`,
        html: renderHtml(order, "owner"),
      });
    } else {
      console.warn(
        `[emails] no owner address (MAIL_TO/SMTP_USER) for ${order.orderNumber}; owner not notified`,
      );
    }

    return null;
  },
});
