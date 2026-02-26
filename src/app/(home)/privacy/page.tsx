import type { Metadata } from "next";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";

export const metadata: Metadata = genPageMetadata({
  title: "Privacy Policy",
  description: "Privacy Policy for PostClaw",
  url: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: February 24, 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="text-muted-foreground">
            PostClaw (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
            respects your privacy. This Privacy Policy explains how we collect,
            use, store, and protect your personal data when you use our Service
            at{" "}
            <a href="https://www.postclaw.io" className="underline">
              postclaw.io
            </a>
            . We are committed to complying with the General Data Protection
            Regulation (GDPR) and applicable French and EU data protection laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            2. Data Controller
          </h2>
          <p className="text-muted-foreground">
            PostClaw is the data controller for the personal data processed
            through the Service. For any questions or requests regarding your
            data, contact us at{" "}
            <a href="mailto:hello@postclaw.io" className="underline">
              hello@postclaw.io
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            3. Data We Collect
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">
                3.1 Account Information
              </h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>
                  Email address (provided at registration or via Google OAuth)
                </li>
                <li>Name (if provided or obtained via Google OAuth)</li>
                <li>Profile picture (if obtained via Google OAuth)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">
                3.2 Payment Information
              </h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>
                  Stripe customer ID and subscription details (subscription
                  status, billing period)
                </li>
                <li>
                  We do <strong>not</strong> store your credit card number or
                  full payment details — these are handled entirely by Stripe
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">
                3.3 Social Media Account Data
              </h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>
                  Platform account identifiers and usernames for connected
                  accounts (Twitter/X, LinkedIn, Bluesky, Threads)
                </li>
                <li>
                  OAuth tokens used to post on your behalf (stored securely by
                  our social media integration provider)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">
                3.4 Telegram Bot Data
              </h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Your Telegram bot token</li>
                <li>
                  Messages exchanged with your bot (processed in your isolated
                  container and not stored by us beyond the session)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">3.5 Usage Data</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>
                  Analytics data collected via PostHog (page views, feature
                  usage)
                </li>
                <li>
                  Bot status and service health metrics
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            4. How We Use Your Data
          </h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              We use your personal data for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>Provide the Service:</strong> operate your AI bot,
                publish content to your social accounts, manage your subscription
              </li>
              <li>
                <strong>Authentication:</strong> verify your identity and manage
                your account
              </li>
              <li>
                <strong>Payment processing:</strong> manage billing and
                subscriptions through Stripe
              </li>
              <li>
                <strong>Communication:</strong> send transactional emails
                (account confirmation, password reset, subscription updates)
              </li>
              <li>
                <strong>Service improvement:</strong> analyze usage patterns to
                improve the Service (anonymized analytics)
              </li>
              <li>
                <strong>Support:</strong> respond to your requests and provide
                customer support
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Legal Basis</h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Under the GDPR, we process your data based on the following legal
              grounds:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>Contract performance:</strong> processing necessary to
                provide the Service you subscribed to (Article 6(1)(b))
              </li>
              <li>
                <strong>Legitimate interest:</strong> analytics and service
                improvement, fraud prevention (Article 6(1)(f))
              </li>
              <li>
                <strong>Legal obligation:</strong> tax and accounting
                requirements (Article 6(1)(c))
              </li>
              <li>
                <strong>Consent:</strong> marketing communications, if
                applicable (Article 6(1)(a))
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            6. Third-Party Processors
          </h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              We share your data with the following third-party processors, each
              acting under data processing agreements:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>Stripe</strong> — payment processing (USA, EU Standard
                Contractual Clauses)
              </li>
              <li>
                <strong>Supabase</strong> — database hosting (PostgreSQL)
              </li>
              <li>
                <strong>Fly.io</strong> — container hosting for your bot
                instance (Europe)
              </li>
              <li>
                <strong>Late API (getlate.dev)</strong> — social media posting
                (OAuth tokens and post data)
              </li>
              <li>
                <strong>Moonshot (Kimi K2.5)</strong> — AI language model for
                content generation
              </li>
              <li>
                <strong>Resend</strong> — transactional email delivery
              </li>
              <li>
                <strong>PostHog</strong> — product analytics
              </li>
              <li>
                <strong>Vercel</strong> — web application hosting
              </li>
            </ul>
            <p className="text-muted-foreground">
              We do not sell your personal data to third parties.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            7. Data Isolation and Security
          </h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              We take security seriously and implement the following measures:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>Per-user isolation:</strong> each subscriber receives a
                dedicated, isolated bot container — your data and conversations
                are not shared with other users
              </li>
              <li>
                <strong>Scoped API keys:</strong> your social media access is
                limited to your own accounts via profile-scoped API keys
              </li>
              <li>
                <strong>Encrypted connections:</strong> all data in transit is
                encrypted via TLS/HTTPS
              </li>
              <li>
                <strong>Secure credential storage:</strong> bot tokens and API
                keys are stored as encrypted environment variables
              </li>
              <li>
                <strong>Access controls:</strong> only authorized personnel have
                access to production systems
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            8. Data Retention
          </h2>
          <div className="space-y-3">
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>Account data:</strong> retained while your account is
                active and for up to 30 days after deletion
              </li>
              <li>
                <strong>Payment records:</strong> retained as required by tax and
                accounting laws (up to 10 years)
              </li>
              <li>
                <strong>Bot conversations:</strong> processed in real-time within
                your isolated container and not permanently stored by PostClaw
              </li>
              <li>
                <strong>Analytics data:</strong> retained in anonymized form
              </li>
            </ul>
            <p className="text-muted-foreground">
              When you cancel your subscription, your bot instance and associated
              data (social account connections, bot token) are deleted at the end
              of your billing period.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            9. Your Rights (GDPR)
          </h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Under the GDPR, you have the following rights:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>Right of access:</strong> request a copy of your personal
                data
              </li>
              <li>
                <strong>Right to rectification:</strong> correct inaccurate or
                incomplete data
              </li>
              <li>
                <strong>Right to erasure:</strong> request deletion of your
                personal data
              </li>
              <li>
                <strong>Right to restrict processing:</strong> limit how we use
                your data
              </li>
              <li>
                <strong>Right to data portability:</strong> receive your data in
                a structured, machine-readable format
              </li>
              <li>
                <strong>Right to object:</strong> object to processing based on
                legitimate interest
              </li>
              <li>
                <strong>Right to withdraw consent:</strong> where processing is
                based on consent, you can withdraw it at any time
              </li>
            </ul>
            <p className="text-muted-foreground">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:hello@postclaw.io" className="underline">
                hello@postclaw.io
              </a>
              . We will respond within 30 days. You also have the right to lodge
              a complaint with the French data protection authority (CNIL) or
              your local supervisory authority.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            10. International Data Transfers
          </h2>
          <p className="text-muted-foreground">
            Some of our third-party processors are located outside the European
            Economic Area (EEA). Where data is transferred outside the EEA, we
            ensure appropriate safeguards are in place, including EU Standard
            Contractual Clauses or adequacy decisions, in compliance with GDPR
            Chapter V.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Cookies</h2>
          <p className="text-muted-foreground">
            We use essential cookies required for authentication and session
            management. We also use analytics cookies (PostHog) to understand how
            the Service is used. You can manage cookie preferences through your
            browser settings. Essential cookies cannot be disabled as they are
            necessary for the Service to function.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            12. Children&apos;s Privacy
          </h2>
          <p className="text-muted-foreground">
            The Service is not intended for anyone under the age of 18. We do not
            knowingly collect personal data from children. If you believe a child
            has provided us with personal data, please contact us and we will
            delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            13. Changes to This Policy
          </h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify
            you of material changes by email or through the Service at least 30
            days before they take effect. Your continued use of the Service after
            changes take effect constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about this Privacy Policy or your personal
            data, please contact us at{" "}
            <a href="mailto:hello@postclaw.io" className="underline">
              hello@postclaw.io
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
