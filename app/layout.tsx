import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { CartProvider } from "@/components/providers/cart-provider";
import { ConfirmProvider } from "@/components/providers/confirm-provider";
import { StoreUser } from "@/components/providers/store-user";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://amaraorganics.ca"),
  title: {
    default: "Amara | Organic Beauty, Skincare, Makeup & Wellness",
    template: "%s | Amara Organics",
  },
  description:
    "Amara is an organic beauty and wellness brand — clean, plant-led skincare, makeup, and self-care made in small batches. Shipped across Canada or ready for pickup in Ottawa.",
  keywords: [
    "Amara",
    "Amara organics",
    "organic beauty",
    "beauty products",
    "wellness",
    "makeup",
    "skincare",
    "clean beauty",
    "natural beauty",
    "plant-based beauty",
    "organic skincare",
    "organic makeup",
    "cruelty-free beauty",
    "cosmetics",
    "self-care",
    "botanical skincare",
    "Ottawa beauty",
    "Canada",
  ],
  applicationName: "Amara",
  authors: [{ name: "Amara Beauty Co." }],
  category: "beauty",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Amara",
    title: "Amara | Organic Beauty, Skincare, Makeup & Wellness",
    description:
      "Clean, plant-led organic beauty, skincare, makeup, and wellness — made in small batches in Ottawa, shipped across Canada.",
    url: "https://amaraorganics.ca",
    locale: "en_CA",
    images: [{ url: "/logo.png", width: 2000, height: 2000, alt: "Amara" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amara | Organic Beauty, Skincare, Makeup & Wellness",
    description:
      "Clean, plant-led organic beauty, skincare, makeup, and wellness — made in small batches in Ottawa, shipped across Canada.",
    images: ["/logo.png"],
  },
  robots: { index: true, follow: true },
  // Geo / local SEO signals (Ottawa, Ontario, Canada).
  other: {
    "geo.region": "CA-ON",
    "geo.placename": "Ottawa",
    "geo.position": "45.4215;-75.6972",
    ICBM: "45.4215, -75.6972",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = await fetchQuery(api.content.getSiteContent, {});
  // Runtime brand colours — override the editable tokens before paint.
  // Scoped to LIGHT mode only: these CMS values are the light palette, so
  // applying them unconditionally would clobber the dark-mode tokens in
  // globals.css and leave dark mode with a broken, low-contrast mix.
  const c = content;
  const accentStyle = `@media (prefers-color-scheme: light){:root{--clay:${c.accentHex};--color-clay:${c.accentHex};--primary:${c.primaryHex};--color-primary:${c.primaryHex};--background:${c.backgroundHex};--color-background:${c.backgroundHex};--foreground:${c.foregroundHex};--color-foreground:${c.foregroundHex};}}`;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <style dangerouslySetInnerHTML={{ __html: accentStyle }} />
        {/* Structured data for search + local/geo SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              name: "Amara",
              alternateName: "Amara Organics",
              url: "https://amaraorganics.ca",
              logo: "https://amaraorganics.ca/logo.png",
              image: "https://amaraorganics.ca/logo.png",
              description:
                "Organic beauty and wellness — clean, plant-led skincare, makeup, and self-care made in small batches.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Ottawa",
                addressRegion: "ON",
                addressCountry: "CA",
              },
              areaServed: { "@type": "Country", name: "Canada" },
              knowsAbout: [
                "organic beauty",
                "skincare",
                "makeup",
                "wellness",
                "clean beauty",
                "natural beauty",
              ],
            }),
          }}
        />
        {/* Clerk v7 (core 4) requires ClerkProvider inside <body>, not around <html>. */}
        <ClerkProvider>
          <ConvexClientProvider>
            <CartProvider>
              <ConfirmProvider>
                <StoreUser />
                <SiteHeader />
                <main className="flex-1">{children}</main>
                <SiteFooter />
                <Toaster />
              </ConfirmProvider>
            </CartProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
