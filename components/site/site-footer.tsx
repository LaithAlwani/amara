import Link from "next/link";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/collections", label: "Collections" },
      { href: "/collections/best-sellers", label: "Best sellers" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/account/orders", label: "Track an order" },
      { href: "/cart", label: "Your cart" },
      { href: "/search", label: "Search" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <p className="font-heading text-2xl font-semibold tracking-tight">
            Amara
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Clean, plant-led beauty made in small batches. Shipped across Canada
            or ready for pickup in Ottawa.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="eyebrow">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Copyright {new Date().getFullYear()} Amara Beauty Co.</p>
          <p>Ottawa, Ontario, Canada</p>
        </div>
      </div>
    </footer>
  );
}
