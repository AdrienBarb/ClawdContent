import type { Metadata } from "next";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";

export const metadata: Metadata = genPageMetadata({
  title: "Terms of Service",
  description: "Terms of Service for PostClaw",
  url: "/terms",
});

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: February 24, 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
          <p className="text-muted-foreground">
            These Terms of Service (&quot;Terms&quot;) govern your access to and
            use of PostClaw (&quot;the Service&quot;), operated by PostClaw
            (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), accessible at{" "}
            <a href="https://www.postclaw.io" className="underline">
              postclaw.io
            </a>
            . By creating an account or using the Service, you agree to be bound
            by these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            2. Description of the Service
          </h2>
          <p className="text-muted-foreground">
            PostClaw provides an AI content manager accessible via a web-based
            chat interface. The Service allows you to create, adapt, and publish
            social media posts to supported platforms (including Twitter/X,
            LinkedIn, Bluesky, and Threads) through a conversational interface
            with an AI-powered assistant. Each subscriber receives a dedicated,
            isolated instance.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            3. Account Registration
          </h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              To use the Service, you must create an account by providing a valid
              email address. You may also sign in using Google OAuth. You agree
              to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide accurate and complete registration information</li>
              <li>Keep your account credentials secure</li>
              <li>
                Notify us immediately of any unauthorized access to your account
              </li>
              <li>
                Accept responsibility for all activity that occurs under your
                account
              </li>
            </ul>
            <p className="text-muted-foreground">
              You must be at least 18 years old to use the Service.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            4. Subscription and Payment
          </h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              The Service is available for monthly subscription fees starting at $17/month, with multiple plan tiers available.
              Payment is processed through Stripe. By subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                Recurring billing: your subscription renews automatically each
                month until canceled
              </li>
              <li>
                Provide valid payment information and authorize us to charge your
                payment method
              </li>
              <li>
                Price changes: we may change pricing with at least 30 days&apos;
                notice before the next billing cycle
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Cancellation and Refunds</h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              You may cancel your subscription at any time from your dashboard.
              Upon cancellation:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                You retain access to the Service until the end of your current
                billing period
              </li>
              <li>
                Your bot instance and connected accounts will be deprovisioned
                after the billing period ends
              </li>
              <li>
                No partial refunds are provided for unused portions of a billing
                period, except as described in the 7-day money-back guarantee
                below
              </li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">
              7-Day Money-Back Guarantee
            </h3>
            <p className="text-muted-foreground">
              If you are not satisfied with the Service, you may request a full
              refund of your first monthly payment within 7 days of your initial
              subscription date. To request a refund:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                Send an email to{" "}
                <a href="mailto:admin@postclaw.io" className="underline">
                  admin@postclaw.io
                </a>{" "}
                within 7 days of your first payment
              </li>
              <li>
                Include your account email address and the reason for your
                refund request
              </li>
              <li>
                Refunds are processed within 5–10 business days to your
                original payment method
              </li>
            </ul>
            <p className="text-muted-foreground">
              This guarantee applies only to your first billing cycle. Subsequent
              months are not eligible for the money-back guarantee. Upon refund,
              your subscription will be canceled and your bot instance will be
              deprovisioned immediately.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            6. AI-Generated Content
          </h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              The Service uses artificial intelligence to help you create and
              adapt content. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                <strong>You are responsible</strong> for all content published
                through the Service to your social media accounts
              </li>
              <li>
                AI-generated content may contain inaccuracies or errors — you
                should review content before publishing
              </li>
              <li>
                We do not guarantee that AI-generated content will be free from
                bias, factual errors, or inappropriate material
              </li>
              <li>
                You retain ownership of the content you create using the Service
              </li>
              <li>
                We do not claim any intellectual property rights over your
                content
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            7. Third-Party Platforms
          </h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              The Service integrates with third-party platforms including
              Twitter/X, LinkedIn, Bluesky, and Threads. You
              acknowledge that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                You must comply with each platform&apos;s terms of service when
                using PostClaw to publish content
              </li>
              <li>
                We are not responsible for actions taken by third-party platforms
                (e.g., account suspension, content removal)
              </li>
              <li>
                Connecting your social accounts requires granting PostClaw
                permission to post on your behalf
              </li>
              <li>
                You may disconnect your accounts at any time from the dashboard
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Acceptable Use</h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                Publish spam, misleading, or deceptive content
              </li>
              <li>
                Generate or distribute illegal, harmful, hateful, or harassing
                content
              </li>
              <li>
                Violate any applicable law or regulation
              </li>
              <li>
                Infringe on the intellectual property rights of others
              </li>
              <li>
                Attempt to gain unauthorized access to the Service or its
                infrastructure
              </li>
              <li>
                Reverse-engineer, decompile, or disassemble any part of the
                Service
              </li>
              <li>
                Resell, sublicense, or provide the Service to third parties
              </li>
            </ul>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate accounts that violate
              these terms without notice or refund.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            9. Service Availability
          </h2>
          <p className="text-muted-foreground">
            We strive to maintain high availability but do not guarantee
            uninterrupted access to the Service. The Service may be temporarily
            unavailable due to maintenance, updates, or circumstances beyond our
            control. We are not liable for any loss or damage resulting from
            Service downtime.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            10. Limitation of Liability
          </h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              To the maximum extent permitted by applicable law:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>
                The Service is provided &quot;as is&quot; and &quot;as
                available&quot; without warranties of any kind, whether express
                or implied
              </li>
              <li>
                We disclaim all warranties, including but not limited to implied
                warranties of merchantability, fitness for a particular purpose,
                and non-infringement
              </li>
              <li>
                In no event shall our total liability exceed the amount you paid
                for the Service in the 12 months preceding the claim
              </li>
              <li>
                We are not liable for any indirect, incidental, special,
                consequential, or punitive damages, including loss of profits,
                data, or business opportunities
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            11. Indemnification
          </h2>
          <p className="text-muted-foreground">
            You agree to indemnify and hold PostClaw harmless from any claims,
            damages, losses, or expenses (including legal fees) arising from your
            use of the Service, your content, your violation of these Terms, or
            your violation of any third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We may update these Terms from time to time. We will notify you of
            material changes by email or through the Service at least 30 days
            before they take effect. Your continued use of the Service after
            changes take effect constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            13. Governing Law
          </h2>
          <p className="text-muted-foreground">
            These Terms are governed by and construed in accordance with the laws
            of France, without regard to its conflict of law provisions. Any
            disputes arising from these Terms or the Service shall be subject to
            the exclusive jurisdiction of the courts of France. Nothing in these
            Terms affects your rights as a consumer under applicable EU consumer
            protection laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            14. Contact Information
          </h2>
          <p className="text-muted-foreground">
            If you have any questions about these Terms, please contact us at{" "}
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
