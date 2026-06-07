const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

// Format integer cents (CAD) as a currency string, e.g. 4800 -> "$48.00".
export function formatPrice(cents: number): string {
  return cad.format(cents / 100);
}
