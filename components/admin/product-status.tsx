// Product publication status presentation for admin views.

export type ProductStatus = "active" | "draft" | "archived";

// Client mirror of adminCatalog.LOW_STOCK_THRESHOLD (variants at/below = low).
export const LOW_STOCK = 5;

export const PRODUCT_STATUSES: ProductStatus[] = ["active", "draft", "archived"];

export function productStatusBadge(status: ProductStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      };
    case "draft":
      return {
        label: "Draft",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      };
    case "archived":
      return { label: "Archived", className: "bg-muted text-muted-foreground" };
  }
}
