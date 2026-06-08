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

export function orderStatusBadge(status: OrderStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "paid":
      return { label: "Paid", className: "bg-clay/15 text-clay" };
    case "fulfilled":
      return {
        label: "Fulfilled",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      };
    case "pending":
      return {
        label: "Awaiting payment",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      };
    case "cancelled":
      return { label: "Cancelled", className: "bg-muted text-muted-foreground" };
    case "refunded":
      return { label: "Refunded", className: "bg-muted text-muted-foreground" };
  }
}

export function fulfillmentLabel(status: FulfillmentStatus): string {
  switch (status) {
    case "unfulfilled":
      return "Unfulfilled";
    case "ready_for_pickup":
      return "Ready for pickup";
    case "picked_up":
      return "Picked up";
    case "label_created":
      return "Label created";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
  }
}
