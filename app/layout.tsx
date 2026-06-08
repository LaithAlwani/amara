import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Amara · Clean, plant-led beauty",
    template: "%s · Amara",
  },
  description:
    "Clean, plant-led beauty made in small batches. Shipped across Canada or ready for pickup in Ottawa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">
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
        </body>
      </html>
    </ClerkProvider>
  );
}
