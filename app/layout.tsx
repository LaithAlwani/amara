import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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

// Fraunces — soft, organic serif for display headings (the brand's voice).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
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
