import Link from "next/link";
import config from "@/lib/config";
import { Button } from "@/components/ui/button";
import WaitlistForm from "@/components/WaitlistForm";

export default function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-20 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl mb-6">
          {config.project.tagline}
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {config.seo.description}
        </p>
        {config.features.waitlist.enabled ? (
          <div className="max-w-md mx-auto mb-8">
            <WaitlistForm />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/">Learn More</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
