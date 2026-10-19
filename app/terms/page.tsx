import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms and conditions for using the Amara Beauty Co. website and buying our products.",
};

const UPDATED = "October 19, 2026";
const CONTACT = "salima.kebbeh@gmail.com";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated {UPDATED}
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Section title="Agreement to these terms">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
            use of the Amara Beauty Co. (&ldquo;Amara,&rdquo; &ldquo;we,&rdquo;
            &ldquo;us&rdquo;) website and your purchase of our products. By using
            the site or placing an order, you agree to these Terms. If you do not
            agree, please do not use the site.
          </p>
        </Section>

        <Section title="Eligibility">
          <p>
            You must be the age of majority in your province or territory to make
            a purchase, and you agree to provide accurate and complete
            information when you create an account or place an order.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            Account sign-in is provided through our authentication partner,
            Clerk, including the option to sign in with Google. You are
            responsible for keeping your login secure and for activity that
            occurs under your account. Let us know right away if you suspect
            unauthorized use.
          </p>
        </Section>

        <Section title="Products, pricing, and availability">
          <p>
            We try to describe and price our products accurately, but errors can
            occur and products may be limited or unavailable. Prices are in
            Canadian dollars (CAD) and may change at any time. We reserve the
            right to correct errors and to cancel an order affected by an error,
            even after it has been submitted.
          </p>
        </Section>

        <Section title="Orders and payment">
          <p>
            Submitting an order is an offer to buy. Payment is processed securely
            by Square; by paying, you authorize the charge for your order total,
            including applicable shipping and taxes. Your order is confirmed once
            payment is completed and we send your confirmation email. We may
            refuse or cancel an order for reasons including suspected fraud or
            stock issues; if we cancel a paid order, we will refund it.
          </p>
        </Section>

        <Section title="Shipping, pickup, and taxes">
          <p>
            We offer flat-rate shipping across Canada and local pickup in Ottawa.
            Delivery estimates are not guarantees. Applicable sales tax (HST) is
            calculated at checkout. Title and risk of loss pass to you once the
            order is delivered or picked up.
          </p>
        </Section>

        <Section title="Returns and refunds">
          <p>
            If something is wrong with your order, contact us at{" "}
            <a href={`mailto:${CONTACT}`} className="text-clay underline">
              {CONTACT}
            </a>{" "}
            and we will work with you to make it right. Refunds, where
            applicable, are issued to the original payment method.
          </p>
        </Section>

        <Section title="Discounts and loyalty points">
          <p>
            Promotional codes and loyalty points are subject to their stated
            conditions, have no cash value, and may be changed or discontinued.
            They cannot be combined except where we expressly allow it.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            You agree not to misuse the site — including attempting to disrupt it,
            access it without authorization, scrape it, or use it for any unlawful
            purpose.
          </p>
        </Section>

        <Section title="Intellectual property">
          <p>
            The site and its content — including text, images, logos, and
            branding — are owned by Amara or our licensors and are protected by
            law. You may not use them without our permission.
          </p>
        </Section>

        <Section title="Third-party services">
          <p>
            We rely on third-party providers (including Clerk, Convex, Square,
            Shippo, and shipping carriers) to operate the store. Their services
            are governed by their own terms, and we are not responsible for their
            acts or omissions.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            Our products are cosmetic and are not intended to diagnose, treat,
            cure, or prevent any disease. Always review ingredients and patch-test
            if you have sensitivities. The site and products are provided
            &ldquo;as is&rdquo; without warranties of any kind to the fullest
            extent permitted by law.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, Amara will not be liable for
            any indirect, incidental, or consequential damages arising from your
            use of the site or products. Our total liability for any claim will
            not exceed the amount you paid for the order giving rise to the claim.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These Terms are governed by the laws of the Province of Ontario and
            the federal laws of Canada applicable there, without regard to
            conflict-of-laws rules.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these Terms from time to time. When we do, we will
            revise the &ldquo;Last updated&rdquo; date above. Your continued use
            of the site after changes take effect means you accept the updated
            Terms.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Amara Beauty Co. is based in Ottawa, Ontario, Canada. Questions about
            these Terms? Contact us at{" "}
            <a href={`mailto:${CONTACT}`} className="text-clay underline">
              {CONTACT}
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-medium text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
