import type { Metadata } from "next";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";

export const metadata: Metadata = genPageMetadata({
  title: "Terms of Service",
  description: "Terms of Service",
  url: "/terms",
});

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using our service, you agree to be bound by these
            Terms of Service and all applicable laws and regulations. If you do
            not agree with any of these terms, you are prohibited from using or
            accessing this service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Use License</h2>
          <p className="text-muted-foreground">
            Permission is granted to temporarily access the materials on our
            service for personal, non-commercial transitory viewing only. This
            is the grant of a license, not a transfer of title, and under this
            license you may not modify or copy the materials.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
          <p className="text-muted-foreground">
            When you create an account with us, you must provide information
            that is accurate, complete, and current at all times. You are
            responsible for safeguarding the password and for all activities
            that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Prohibited Uses</h2>
          <p className="text-muted-foreground">
            You may not use our service in any way that causes, or may cause,
            damage to the service or impairment of the availability or
            accessibility of the service, or in any way which is unlawful,
            illegal, fraudulent, or harmful.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Termination</h2>
          <p className="text-muted-foreground">
            We may terminate or suspend your account and bar access to the
            service immediately, without prior notice or liability, for any
            reason whatsoever, including without limitation if you breach the
            Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
          <p className="text-muted-foreground">
            The materials on our service are provided on an &apos;as is&apos;
            basis. We make no warranties, expressed or implied, and hereby
            disclaim and negate all other warranties including without
            limitation, implied warranties or conditions of merchantability,
            fitness for a particular purpose, or non-infringement of
            intellectual property or other violation of rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
          <p className="text-muted-foreground">
            If you have any questions about these Terms of Service, please
            contact us through our support channels.
          </p>
        </section>

        <p className="text-sm text-muted-foreground mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
