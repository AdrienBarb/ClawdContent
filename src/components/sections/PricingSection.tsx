"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import config from "@/lib/config";

export default function PricingSection() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-muted-foreground">
            Choose the plan that&apos;s right for you
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {config.pricing.plans.map((plan) => {
            const hasCheckoutUrl =
              plan.checkoutUrl && plan.checkoutUrl.trim() !== "";
            const checkoutURL = hasCheckoutUrl
              ? plan.checkoutUrl!
              : `mailto:${config.contact.email}?subject=Inquiry about ${plan.name} plan`;

            return (
              <div
                key={plan.id}
                className="p-8 rounded-lg border bg-background hover:shadow-lg transition-shadow"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline" asChild>
                  <a
                    href={checkoutURL}
                    target={hasCheckoutUrl ? "_blank" : undefined}
                    rel={hasCheckoutUrl ? "noopener noreferrer" : undefined}
                  >
                    {hasCheckoutUrl ? "Get Started" : "Contact the team"}
                  </a>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
