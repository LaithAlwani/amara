import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Amara Beauty Co. collects, uses, and protects your personal information.",
};

const UPDATED = "October 19, 2026";
const CONTACT = "salima.kebbeh@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated {UPDATED}
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <p>
            This Privacy Policy explains how Amara Beauty Co. (&ldquo;Amara,&rdquo;
            &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects,
            uses, and shares information when you visit our website, create an
            account, or place an order. By using our site you agree to the
            practices described here.
          </p>
        </section>

        <Section title="Information we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Account information.</strong>{" "}
              When you create an account or sign in, we collect your name, email
              address, and (if you sign in with Google) your Google profile
              information. Authentication is handled by our provider, Clerk.
            </li>
            <li>
              <strong className="text-foreground">Order &amp; delivery
              information.</strong>{" "}
              Shipping address, pickup selection, phone number, and the contents
              of your order.
            </li>
            <li>
              <strong className="text-foreground">Payment information.</strong>{" "}
              Card payments are processed by Square. We do not collect or store
              your full card number; Square handles it directly.
            </li>
            <li>
              <strong className="text-foreground">Usage information.</strong>{" "}
              Basic technical data such as device, browser, and pages visited,
              plus cookies needed to keep you signed in and remember your cart.
            </li>
          </ul>
        </Section>

        <Section title="Signing in with Google">
          <p>
            If you choose to sign in with Google, Google shares your basic
            profile information with us — your name, email address, and profile
            picture — so we can create and authenticate your account. We use this
            information only to operate your account and fulfill your orders. We
            do not use Google user data for advertising, and we do not sell it.
            Our use of information received from Google APIs adheres to the
            {" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="text-clay underline"
              target="_blank"
              rel="noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including its Limited Use requirements. You can revoke our access
            at any time in your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-clay underline"
              target="_blank"
              rel="noreferrer"
            >
              Google Account settings
            </a>
            .
          </p>
        </Section>

        <Section title="How we use your information">
          <ul className="list-disc space-y-2 pl-5">
            <li>To process, fulfill, and deliver your orders.</li>
            <li>To create and secure your account and authenticate sign-in.</li>
            <li>
              To send order confirmations, shipping and pickup updates, and
              account-related messages.
            </li>
            <li>To provide customer support and respond to your requests.</li>
            <li>
              To operate our loyalty program and apply discounts you choose to
              use.
            </li>
            <li>
              To protect against fraud and to meet legal and tax obligations.
            </li>
          </ul>
        </Section>

        <Section title="How we share information">
          <p>
            We do not sell your personal information. We share it only with
            service providers that help us run the store, and only as needed:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Clerk</strong> — account
              authentication and sign-in.
            </li>
            <li>
              <strong className="text-foreground">Convex</strong> — our backend
              database and application hosting.
            </li>
            <li>
              <strong className="text-foreground">Square</strong> — payment
              processing.
            </li>
            <li>
              <strong className="text-foreground">Shippo</strong> and carriers
              (e.g. Canada Post) — shipping labels and tracking.
            </li>
            <li>
              <strong className="text-foreground">Email delivery</strong> — to
              send transactional messages.
            </li>
          </ul>
          <p>
            We may also disclose information when required by law or to protect
            our rights, and in connection with a business transfer such as a
            merger or acquisition.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use cookies that are necessary for the site to work — keeping you
            signed in and preserving your cart between visits. You can control
            cookies through your browser settings, though disabling them may
            break parts of the checkout and account experience.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            We keep your information for as long as your account is active or as
            needed to provide our services, and thereafter as required to comply
            with legal, tax, and accounting obligations.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We rely on reputable providers and industry-standard safeguards to
            protect your information. No method of transmission or storage is
            completely secure, but we work to protect your data and limit access
            to it.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You may request access to, correction of, or deletion of your
            personal information, and you can opt out of non-essential emails at
            any time. To exercise these rights, contact us at{" "}
            <a href={`mailto:${CONTACT}`} className="text-clay underline">
              {CONTACT}
            </a>
            .
          </p>
        </Section>

        <Section title="Children">
          <p>
            Our site is intended for adults. We do not knowingly collect personal
            information from children under the age of majority in their
            province or territory.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we
            will revise the &ldquo;Last updated&rdquo; date above. Continued use
            of the site after changes take effect means you accept the updated
            policy.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Amara Beauty Co. is based in Ottawa, Ontario, Canada. If you have any
            questions about this Privacy Policy or your information, contact us
            at{" "}
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
