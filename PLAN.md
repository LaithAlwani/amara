# AMARA MASTER PRODUCT BLUEPRINT
## Enterprise Ecommerce Platform Specification

# 1. Executive Summary

Amara is a premium organic beauty and wellness ecommerce platform designed to educate, inspire, and sell.

The platform combines:

- Luxury brand experience
- Ecommerce
- Educational content
- Subscription commerce
- Customer loyalty
- Advanced analytics
- Complete admin-driven website customization

The goal is to create a brand that feels trusted, premium, natural, and modern while giving administrators full control without requiring developers for day-to-day updates.

---

# 2. Product Vision

## Customer Promise

Amara helps customers:

- Discover clean beauty products
- Understand ingredients
- Build better routines
- Purchase confidently
- Track progress
- Reorder easily

## Business Goal

Build a scalable beauty commerce platform capable of supporting:

- Thousands of products
- Multiple collections
- International shipping
- Subscription products
- Wholesale accounts
- Future mobile applications

---

# 3. User Types

## Guest

Can:

- Browse products
- Read content
- Search catalog
- Add products to cart

Cannot:

- View order history
- Save favorites
- Manage subscriptions

## Customer

Can:

- Purchase products
- Save favorites
- Track orders
- Manage subscriptions
- Write reviews

## Content Manager

Can:

- Edit content
- Create blog posts
- Update pages

Cannot:

- Access financial data

## Inventory Manager

Can:

- Manage inventory
- Receive stock
- Adjust inventory

## Administrator

Full platform access.

---

# 4. Design System

## Brand Feel

Amara should feel:

- Organic
- Premium
- Sophisticated
- Educational
- Trustworthy

## Typography

Primary:
- Elegant serif

Secondary:
- Modern sans serif

## UI Components

- Product cards
- Collection cards
- Article cards
- Testimonial cards
- Promo banners
- Feature sections

All components should be configurable from the admin panel.

---

# 5. Public Website Architecture

## Homepage

Sections:

1. Hero
2. Featured Collections
3. Best Sellers
4. Why Amara
5. Ingredient Spotlight
6. Customer Testimonials
7. Educational Content
8. Newsletter
9. Footer

Every section must be configurable.

---

# 6. Navigation

Main Navigation:

- Home
- Shop
- Collections
- Ingredients
- Learn
- About
- Contact

Utility Navigation:

- Search
- Account
- Wishlist
- Cart

---

# 7. Product Catalog

## Product Structure

Fields:

- Name
- Slug
- SKU
- Description
- Short Description
- Ingredients
- Directions
- Benefits
- Warnings
- Certifications
- Images
- Videos
- Pricing
- Sale Pricing

---

# 8. Product Variants

Support:

- Size
- Scent
- Package Type
- Bundle Options

Inventory tracked per variant.

---

# 9. Collections

Examples:

- Skincare
- Haircare
- Body Care
- Wellness
- Best Sellers
- New Arrivals
- Seasonal

Collections can be:

- Manual
- Rule Based

---

# 10. Search System

Features:

- Instant search
- Product suggestions
- Category suggestions
- Content suggestions

Filters:

- Price
- Rating
- Ingredient
- Concern
- Skin Type
- Availability

---

# 11. Product Page

Sections:

- Gallery
- Product Details
- Ingredients
- Benefits
- Directions
- Reviews
- FAQ
- Related Products

CTAs:

- Add to Cart
- Buy Now
- Subscribe & Save

---

# 12. Cart Experience

Features:

- Quantity adjustment
- Promo codes
- Upsells
- Recommended products
- Shipping estimates

---

# 13. Checkout Experience

## Checkout Flow

Step 1:
Customer information

Step 2:
Shipping

Step 3:
Payment

Step 4:
Review

Step 5:
Confirmation

Supported payments:

- Stripe
- Apple Pay
- Google Pay
- Credit Cards

---

# 14. Customer Accounts

Features:

- Profile
- Addresses
- Order History
- Wishlist
- Subscriptions
- Rewards

---

# 15. Wishlist System

Customers can:

- Save products
- Move products to cart
- Share wishlists

---

# 16. Reviews

Review Fields:

- Rating
- Title
- Review
- Photos

Admin moderation required.

---

# 17. Loyalty Program

Points earned from:

- Purchases
- Reviews
- Referrals
- Social actions

Rewards:

- Discounts
- Free shipping
- Exclusive products

---

# 18. Subscription Commerce

Customers can:

- Subscribe monthly
- Skip shipments
- Pause subscriptions
- Cancel subscriptions

Admin can:

- Configure subscription discounts
- Configure frequencies

---

# 19. Educational Platform

## Blog

Categories:

- Beauty Tips
- Ingredient Guides
- Wellness
- Sustainability

## Ingredient Library

Each ingredient page includes:

- Benefits
- Sources
- Usage
- Research

---

# 20. Routine Builder

Customer selects:

- Skin type
- Concerns
- Goals

System recommends:

- Morning routine
- Evening routine
- Weekly routine

---

# 21. Order Management

Admin Features:

- View orders
- Refund orders
- Partial refunds
- Returns management
- Shipping updates

---

# 22. Inventory Management

Features:

- Real-time inventory
- Low stock alerts
- Purchase orders
- Supplier tracking

---

# 23. Customer Management

Admin can:

- View customers
- Segment customers
- Review purchase history
- Manage subscriptions

---

# 24. Marketing System

Features:

- Discount codes
- Coupons
- Gift cards
- Email campaigns
- Referral campaigns

---

# 25. Analytics Dashboard

## Revenue Analytics

Metrics:

- Revenue
- Profit
- AOV
- Conversion Rate
- Repeat Purchase Rate

## Product Analytics

Metrics:

- Top products
- Low performing products
- Inventory velocity

## Customer Analytics

Metrics:

- Lifetime Value
- Retention
- Churn

---

# 26. CMS System

Administrators can edit:

- Home page
- Landing pages
- Blogs
- FAQs
- Policies

Without developer involvement.

---

# 27. Visual Website Builder

Administrators can modify:

- Colors
- Typography
- Font sizes
- Layout spacing
- Buttons
- Cards
- Navigation styles
- Footer styles

Live preview required.

---

# 28. Theme Engine

Multiple themes supported.

Examples:

- Organic Luxury
- Modern Minimal
- Botanical Premium

Theme switching should not require code deployment.

---

# 29. SEO Platform

Features:

- Meta Titles
- Meta Descriptions
- Structured Data
- XML Sitemaps
- Canonicals

---

# 30. Notifications

Customer Notifications:

- Order confirmation
- Shipping updates
- Delivery updates

Admin Notifications:

- New orders
- Inventory warnings
- Failed payments

---

# 31. Security

Requirements:

- RBAC permissions
- Audit logs
- MFA support
- Encryption
- GDPR readiness

---

# 32. Database Design

Core Entities:

User
Customer
Address
Product
Variant
Collection
Cart
Order
Order Item
Inventory
Review
Blog Post
Subscription
Reward Account
Theme Settings
Website Settings

---

# 33. Recommended Tech Stack

Frontend:
- Next.js
- TypeScript
- Tailwind

Backend:
- Convex or Node.js

Database:
- PostgreSQL

Payments:
- Stripe

Storage:
- S3

Authentication:
- Clerk

Analytics:
- PostHog

Email:
- Resend

---

# 34. MVP Roadmap

Phase 1:

- Homepage
- Shop
- Product Pages
- Cart
- Checkout
- Orders
- Inventory
- Admin Dashboard
- CMS
- Theme Controls

Phase 2:

- Loyalty
- Subscriptions
- Routine Builder
- Ingredient Library
- Advanced Analytics

Phase 3:

- Mobile App
- AI Recommendations
- Wholesale Portal
- Marketplace Expansion

---

# 35. Developer Quote Questions

Developers must explain:

- Architecture
- Scalability
- Security
- Inventory design
- Analytics implementation
- Theme engine implementation
- CMS implementation
- Cost estimates
- Timeline estimates
- Hosting strategy

---

# Final Vision

Amara should become the leading organic beauty ecommerce experience by combining:

- Premium branding
- Deep education
- Exceptional shopping experience
- Powerful admin controls

Every decision should answer:

1. Does this build trust?
2. Does this increase conversion?
3. Does this improve customer education?
4. Does this strengthen the Amara brand?

---

# 36. Fulfillment & Shipping (Slice 1 addition)

## Flat-rate shipping
- Customers pay a **flat $11.99 CAD** for shipping at checkout (configurable in the `settings` singleton). No live carrier rates are shown to the customer.

## Admin label generation (Shippo)
- After payment, an admin buys the real shipping label through **Shippo** (multi-carrier aggregator; Canada Post + others linked in the Shippo dashboard).
- The admin chooses the carrier/service; the **actual label cost can be more or less than $11.99** and the business absorbs the difference.
- Labels are archived in Convex file storage; tracking number + label PDF surface in the admin order view.
- Shipping is built behind a **pluggable provider interface** (`convex/shipping/`) so other carriers can be added later as new adapters with no schema/route changes.

# 37. Local Pickup (Slice 1 addition)
- At checkout, customers can choose **Local Pickup in Ottawa** instead of shipping.
- Pickup orders are **free** (no shipping charge) and skip the label flow entirely.
- A configurable pickup location (`pickupLocations`) holds address + instructions.
- Admin marks pickup orders **Ready for pickup** then **Picked up**; the customer is notified by email.

# 38. Guest Checkout & Order Claiming (Slice 1 addition)
- Customers can check out **as a guest with just an email** (no account required).
- Orders store the `email` plus a nullable `userId`.
- When that person later **signs up or logs in with the same VERIFIED email**, their past guest orders are automatically linked to the account and appear in order history. Claiming only happens on a verified-email match.

# 39. Tech Decisions (Slice 1)
- Backend/database: **Convex** (supersedes the PostgreSQL note in section 33).
- Auth: **Clerk**. Payments: **Stripe** hosted Checkout. Email: **Nodemailer (SMTP)** (supersedes Resend in section 33).
- Framework: **Next.js 16.2.7** (App Router; note `middleware.ts` is `proxy.ts`).
- UI: **Tailwind v4** under the `taste-skill` design discipline — forest-botanical palette, **shadcn/ui** components, Geist type, Phosphor icons, `motion/react`.
- Detailed slice plan: `~/.claude/plans/i-have-created-a-fizzy-riddle.md`.

---

# Build Log

## Phase 1 — Backend foundation ✅ (2026-06-06)
**Done:**
- Created `convex/schema.ts` with all Slice-1 tables + indexes: `users`, `products`, `productVariants`, `collections`, `collectionProducts`, `carts`, `cartItems`, `orders`, `orderItems`, `shipments`, `pickupLocations`, `settings` (singleton), `webhookEvents`. Money stored as integer cents (CAD); every queried table has a `by_*` index; `products` has a `search_name` search index.
- Created `convex/seed.ts` (`seedCatalog` internal mutation, idempotent) and seeded: 6 active products, 8 variants, 2 collections (`best-sellers`, `skincare`) with membership, 1 active Ottawa pickup location, and the `settings` singleton (flat shipping 1199, free-ship threshold 9000, 13% HST `taxRatePpm`, provider `shippo`).
- Deployed to Convex dev (`proficient-narwhal-277`) and verified all rows via `npx convex data`.

**Added/changed vs blueprint:**
- Products carry `imageUrls` (seed uses `picsum.photos` placeholders) plus optional `imageStorageIds` for future uploads.
- Seed pickup name uses a hyphen, not an em-dash (taste-skill rule).

**Deferred:**
- `convex/auth.config.ts` moved to **Phase 2** — it requires `CLERK_JWT_ISSUER_DOMAIN`, which is set up with Clerk. (Deploy fails without it, so it ships alongside Clerk.)
- Deferred tables (addresses, reviews, wishlists, subscriptions, discountCodes, inventoryMovements, blogPosts, ingredients, themeSettings, pageContent) are not yet created.

**How to test Phase 1:** `npx convex data products` (and `collections`, `pickupLocations`, `settings`) — or open the [Convex dashboard](https://dashboard.convex.dev/d/proficient-narwhal-277) → Data, and confirm the tables + seed rows above.

## Phase 2 — Auth wiring + design-system foundation ✅ (2026-06-06)
**Done:**
- **Convex auth:** created `convex/auth.config.ts` (Clerk issuer `loving-treefrog-59.clerk.accounts.dev`, app id `convex`); set `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment; created `convex/users.ts` (`currentUser` query, `getOrCreateCurrentUser` mutation mirroring the Clerk identity into `users`).
- **Client wiring:** `components/providers/convex-client-provider.tsx` (`ConvexProviderWithClerk`), `components/providers/store-user.tsx` (mirrors identity on login); root `app/layout.tsx` rewritten to wrap `ClerkProvider` + Convex provider + site shell + Geist fonts mapped to `--font-sans`/`--font-mono` + Sonner toaster.
- **Auth gate:** `proxy.ts` (Next 16 replacement for middleware) running `clerkMiddleware`, protecting `/account/*` and `/admin/*`.
- **Design system:** installed taste-skill discipline + `shadcn/ui` (Radix) + `motion` + Phosphor; wrote the **forest-botanical palette** into `app/globals.css` (shadcn token names + a locked `clay` accent, light primary with auto dark via `prefers-color-scheme`); added base shadcn components (button, input, label, dropdown-menu, sheet, sonner, separator, badge, select, dialog).
- **Shell + auth UI:** `components/site/site-header.tsx` (single-line nav ≤64px, search/account/cart, mobile sheet) + `site-footer.tsx`; **custom branded sign-in/sign-up pages built with `@clerk/elements`** (not the prebuilt `<SignIn>/<SignUp>` widgets) at `app/sign-in/[[...sign-in]]` and `app/sign-up/[[...sign-up]]`; placeholder branded homepage in `app/page.tsx`; `next.config.ts` image `remotePatterns` (picsum + Convex storage).

**Added/changed vs blueprint:**
- **Downgraded `@clerk/nextjs` 7 → 6.39.5.** v7 is a new major on `@clerk/shared@4`, but `@clerk/elements` and Convex's Clerk integration target the `@clerk/shared@3` generation; the mismatch produced two provider contexts ("useClerk … within ClerkProvider" 500s). v6 dedupes everything on `@clerk/shared@3`.
- Header uses the `useUser()` hook for signed-in state (v6/v7 both expose it) instead of `<SignedIn>/<SignedOut>`.
- Build-time: zero TypeScript/lint errors; `proxy.ts` recognized as Proxy (Middleware).

**Deferred:** cart badge count (Phase 4), admin-link visibility already gated on `currentUser.role`.

**Update:** added Google + Apple social buttons to both auth "start" steps (`components/auth/social-buttons.tsx`). **Google is wired** via Clerk's OAuth `Connection` (requires Google enabled in the Clerk dashboard → SSO connections). **Apple is present but not wired** (shows a "coming soon" toast) per request.

## Phase 3 — Catalog (read) ✅ (2026-06-06)
**Done:**
- **Convex read APIs:** `convex/catalog.ts` (shared image/card helpers), `convex/products.ts` (`listProducts`, `getProductBySlug` + active variants, `searchProducts` via the `search_name` index), `convex/collections.ts` (`listCollections`, `getCollectionBySlug` + products).
- **Pages (App Router, server-rendered via `fetchQuery` from `convex/nextjs` for SEO):**
  - `/shop` — product grid.
  - `/products/[slug]` — gallery + details + `generateMetadata`; `notFound()` on missing/inactive (verified 404).
  - `/collections` + `/collections/[slug]` — collection tiles and per-collection grids.
  - `/search` — instant client search (`useQuery` on `searchProducts`).
  - Real homepage: hero, best-sellers rail, featured-collection tiles, a values band, and a closing CTA (5 distinct layout families).
- **UI:** `components/shop/product-card.tsx`, `product-purchase-panel.tsx` (variant + quantity selector), `search-experience.tsx`; `lib/format.ts` (`formatPrice`, CAD).
- Build green; all routes compile; dev log clean (0 errors). Verified: home/shop/PDP/collections/search render seeded data; `$48.00` and "Add to bag" on the serum PDP.

**Added/changed vs blueprint:**
- Product **display images resolve storage ids first, then `imageUrls`** (seed uses picsum); helper in `convex/catalog.ts`.
- Listing uses bounded `.take()` (24/48) rather than cursor pagination for the MVP catalog size; can upgrade to `paginate()` later.
- Tailwind v4 canonical classes (`bg-linear-to-t`, `aspect-4/5`).

**Deferred / placeholder:**
- **"Add to bag" is not functional yet** — it shows a toast ("Your bag is being wired up next"). The mutation lands in **Phase 4 (Cart)**; only the onClick handler changes.
- Catalog filters (price/concern/skin-type) and pagination/infinite-scroll are not in this slice.

**How to test Phase 3:** dev server at http://localhost:3000.
1. `/shop` shows the 6 seeded products with prices.
2. Click a product → PDP with gallery, variant chips (e.g. 30ml/50ml on the serum), quantity stepper, price.
3. `/collections` → tiles; open **Best Sellers** → its products.
4. `/search`, type "serum" or "oil" → instant results.
5. Home shows the hero, best sellers, collection tiles, and value band.

## Phase 4 — Cart ✅ (2026-06-06)
**Done:**
- **Convex (`convex/cart.ts`):** `getCart`, `addItem` (sums + clamps to inventory), `updateItemQty`, `removeItem`, `clearCart`, and `mergeAnonCartIntoUser`. Carts resolve by Clerk `tokenIdentifier` when signed in, else by an anon cookie id; item mutations verify the item belongs to the caller's cart (ownership). Verified via CLI: add 2 + 1 → qty 3, subtotal $42.00, stock clamp.
- **Guest identity:** `lib/use-anon-id.ts` (cookie `amara_anon_id`, reactive `anonId` + on-demand `ensureAnonId()`).
- **State:** `components/providers/cart-context.ts` (context/types) + `cart-provider.tsx` (reactive `getCart`, add/update/remove wrappers injecting the anon id, and **merges the guest cart into the account once on login**). Mounted in `app/layout.tsx`.
- **UI:** `components/cart/cart-line-items.tsx` (shared list with motion add/remove), `cart-drawer.tsx` (Radix Sheet slide-over with subtotal + checkout/view-bag), `cart-button.tsx` (navbar), and the full `/cart` page.
- **Add to bag** on the PDP is now wired (replaces the Phase 3 toast placeholder), with a loading spinner.

**Requested extras delivered:**
- **Item count badge in the navbar** (clay pill on the cart icon) with a **spring "bump" animation on add** (the icon scales, the badge pops via `motion/react`). Per request, **adding does NOT open the drawer** — only the count updates; the drawer opens on cart-icon click.

**Deferred:** promo codes / upsells in the cart (not in this slice); checkout button currently links to `/checkout` (built in Phase 5).

**How to test Phase 4:** dev server at http://localhost:3000.
1. On a PDP, pick a variant + quantity → **Add to bag**: the navbar count badge bumps/updates (the drawer does NOT open). Click the cart icon to open the drawer.
2. Adjust quantity / remove in the drawer or `/cart` (items animate); subtotal updates live; quantity is capped at stock.
3. As a guest, add items, then **sign in** → the guest bag merges into your account (count persists).
4. Reload while signed out → the bag persists via the `amara_anon_id` cookie.

## Phase 5 — Checkout core ✅ (2026-06-06)
**Done:**
- **Convex (`convex/checkout.ts`):** `quoteCart` (live, authoritative subtotal/shipping/tax/total for a chosen method + stock-issue detection + pickup location), `createDraftOrder` (re-validates inventory, snapshots `orderItems`, applies flat shipping for ship / $0 for pickup, computes 13% HST, links `userId` when signed in, sets `emailVerifiedAtPurchase`, creates a **pending** order), `getActivePickupLocation`, `getOrderConfirmation` (by order id capability).
- **Order numbers:** running counter `orderSeq` on the `settings` singleton → `AMARA-1001`, ... (OCC-safe).
- **UI:** `components/checkout/checkout-client.tsx` — contact email (prefilled when signed in), **Ship vs Local pickup toggle**, Canadian address form (province select), live order summary, stock warnings, and "Place order"; `/checkout` page + `/checkout/success` (server-rendered confirmation by `orderId`, 404 without).
- **Verified via CLI:** quote pickup = $28.00 + $0 + $3.64 = $31.64; ship = + $11.99 + $5.20 = $45.19; `createDraftOrder` → `AMARA-1001` pending with pickup location; confirmation + `/checkout/success?orderId=` render. Build green, dev log 0 errors.

**Added/changed vs blueprint:**
- Free-shipping threshold is seeded in settings but **not applied** — shipping stays a flat $11.99 per your instruction.
- Order id is treated as an unguessable capability for the confirmation screen (no auth needed to view a fresh confirmation).

**Deferred to Phase 6:** **no payment yet** — "Place order" creates a pending order and the cart is intentionally **not cleared** (the Stripe webhook will clear it and flip the order to paid). The success page shows an "awaiting payment" badge for now.

**How to test Phase 5:** dev server at http://localhost:3000.
1. Add items, go to `/checkout`. Toggle **Ship** vs **Local pickup**: the summary shipping/tax/total update live ($11.99 vs Free).
2. Ship requires an address; pickup shows the Ottawa studio. Enter your email → **Place order**.
3. You land on `/checkout/success` with an `AMARA-####` number and a pending badge; check the Convex dashboard → `orders` for the pending row.

## Phase 6 — Stripe payment ✅ (built + TESTED end-to-end) (2026-06-06; tested 2026-06-08)
**Done:**
- **`convex/payments.ts` (`"use node"`):** `createCheckoutSession` (action) builds a hosted Stripe Checkout Session from the order (line items + Shipping + Tax lines so the Stripe total equals the order total), attaches the session id, returns the URL; `handleStripeWebhook` (internalAction) verifies the signature and dispatches events.
- **`convex/http.ts`:** `POST /stripe/webhook` on the Convex `.site` domain → verifies + runs the handler. Confirmed live (no-sig → 400).
- **`convex/orders.ts` (internal):** `getOrderForStripe`, `attachStripeSession`, **`finalizeOrderPaid`** (idempotent via `webhookEvents`: marks order `paid`, sets `paidAt`/payment intent, **decrements inventory**, **clears the source cart**), `cancelPendingOrder` (expired/failed → `cancelled`).
- **Schema:** added `orders.cartId` so the webhook clears the exact cart.
- **UI:** checkout "Continue to payment" now creates the draft order then redirects to Stripe; `/checkout/success` is a **reactive** confirmation (live `pending` → `paid`, no refresh); added `/checkout/cancel`.

**Webhook URL:** `https://proficient-narwhal-277.convex.site/stripe/webhook`
**Subscribe to:** `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.

**Needed to test (set on the Convex deployment, not Vercel):** `STRIPE_SECRET_KEY` (test mode) and `STRIPE_WEBHOOK_SECRET`. Local testing uses the Stripe CLI to forward events and provide the signing secret.

**How to test Phase 6:** with keys set + `stripe listen --forward-to https://proficient-narwhal-277.convex.site/stripe/webhook`, check out with test card `4242 4242 4242 4242` → redirect to Stripe → return to `/checkout/success` → order flips `pending`→`paid`, inventory drops, cart empties. Replay the event → no double processing.

**Tested 2026-06-08 (laith):** Stripe CLI 1.42.1 installed (winget `Stripe.StripeCli`); `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (from `stripe listen`) set on the Convex dev deployment. Live test card paid order **AMARA-1005** → `status:"paid"`, `paidAt` + `stripePaymentIntentId`/`stripeCheckoutSessionId` set, `orderItems` snapshotted, CCM-75 inventory `28→27`, source cart cleared + `status:"converted"`, one `webhookEvents` row recorded. **Idempotency confirmed:** `stripe events resend` left inventory at 27 (no double-decrement). Note: 4 older Phase-5 orders (AMARA-1001..1004) remain `pending` (pre-Stripe drafts; safe to cancel/clean up).

**How to test Phase 2:** dev server is running at http://localhost:3000.
1. Home renders in the forest-botanical palette with working nav/footer.
2. Click **Sign in** → branded `/sign-in` (Amara-styled, not default Clerk widget); create an account at `/sign-up`, verify the email code.
3. After sign-in, the account menu appears; open the Convex dashboard → `users` and confirm your row exists (email, `emailVerified`, `role: "customer"`).
4. Visit `/account/orders` while signed out → you are redirected to `/sign-in` (proxy gate).

## Phase 7 — Customer order loop ✅ (built; email needs SMTP to send) (2026-06-08)
**Done:**
- **Order-confirmation email** — `convex/emails.ts` (`"use node"`) `sendOrderConfirmation` internalAction builds an on-brand inline-styled HTML receipt (items, subtotal/shipping/tax/total, ship-to or pickup block) via **Nodemailer**. Sends **two** messages: the customer receipt ("Thank you for your order") and an **owner notification on every order** ("New order received" — surfaces the customer email + ship/pickup, `replyTo` the customer). Owner address = `MAIL_TO`, falling back to `SMTP_USER` so the owner is alerted even if `MAIL_TO` is unset. **Scheduled from `orders.finalizeOrderPaid`** via `ctx.scheduler.runAfter(0, …)` so it fires only on confirmed payment and rolls back with the txn. Dev-safe: if SMTP env is unset it logs + skips (no hard fail).
- **Account order history** — `orders.listMyOrders` (identity-derived query, never takes a userId; `by_userId` index, newest-first); `app/account/orders/page.tsx` (server shell) + `components/account/my-orders.tsx` (reactive `useQuery`, status pills, loading/empty states). Route is behind the existing `proxy.ts` `/account/*` gate. **Only ever-paid orders are shown** — `pending` drafts and orders cancelled before payment (no `paidAt`) are filtered out, so an abandoned Stripe checkout never appears as "awaiting payment".
- **Abandoned-draft cleanup** — `createCheckoutSession` sets `expires_at` to 30 min (Stripe minimum); when a checkout lapses, the existing `checkout.session.expired` webhook flips the still-pending order to `cancelled`. (We deliberately do NOT cancel on the `/checkout/cancel` page — the Stripe session can still be completed via browser back, and cancelling early would make `finalizeOrderPaid` skip a real payment.)
- **Guest-order claiming** — `users.getOrCreateCurrentUser` now calls `claimGuestOrders`: on every sign-in, if the account email is **verified**, links unclaimed `orders` (`by_email`, `userId === undefined`) to the user. Verified-only per blueprint §38.
- **Internal:** `orders.getOrderForEmail` internalQuery feeds the Node email action (action can't touch the db).
- Installed `nodemailer` + `@types/nodemailer`. `npx tsc --noEmit` clean; `next build` green (`/account/orders` compiles); Convex functions deployed to dev.

**Needed to send email (set on the Convex deployment, like the Stripe keys):**
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`"true"`/`"false"`), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, and optionally `MAIL_TO` (owner inbox; defaults to `SMTP_USER` if unset). For dev, a catcher like **Mailtrap** or **Ethereal** works without a real mailbox.

**How to test Phase 7:** dev server at http://localhost:3000.
1. **Order history:** sign in → account menu → **My orders** (`/account/orders`). Past orders linked to your account list newest-first with status pills.
2. **Guest claiming:** the live data already has unclaimed orders for `laithalwani@gmail.com` (AMARA-1002/1003/1005) with no `userId` — on sign-in they auto-link and appear in *My orders* (guest@example.com's AMARA-1001 stays unclaimed). Verify in the Convex dashboard → `orders` that `userId` got set.
3. **Email:** with SMTP env set, place + pay an order (Phase 6 flow) → a confirmation email arrives at the order email (and `MAIL_TO` if set). Without SMTP set, the Convex logs show `[emails] SMTP not configured; would send confirmation for AMARA-#### to …` (everything else still works).
