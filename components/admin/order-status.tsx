// Shared order/fulfillment status presentation for the admin views.

export type OrderStatus =
  | "pending"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type FulfillmentStatus =
  | "unfulfilled"
  | "ready_for_pickup"
  | "picked_up"
  | "label_created"
  | "shipped"
  | "delivered";

const MUTED = "bg-muted text-muted-foreground";
const GOOD = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
const WARN = "bg-amber-500/15 text-amber-700 dark:text-amber-400";

const ORDER_BADGES: Record<OrderStatus, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-clay/15 text-clay" },
  fulfilled: { label: "Fulfilled", className: GOOD },
  pending: { label: "Awaiting payment", className: WARN },
  cancelled: { label: "Cancelled", className: MUTED },
  refunded: { label: "Refunded", className: MUTED },
};

export const orderStatusBadge = (status: OrderStatus) => ORDER_BADGES[status];

const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "Unfulfilled",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  label_created: "Label created",
  shipped: "Shipped",
  delivered: "Delivered",
};

export const fulfillmentLabel = (status: FulfillmentStatus) =>
  FULFILLMENT_LABELS[status];
