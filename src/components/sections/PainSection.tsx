const steps = [
  "Wake up. Realize you haven't posted in 3 days.",
  "Open LinkedIn. Stare at a blank editor. Write something. Delete it.",
  "Copy it to Twitter. Too long. Rewrite.",
  "Open Threads. Rewrite again, different tone.",
  "Instagram needs a visual. You don't have one.",
  "Give up on Bluesky, TikTok, and Pinterest entirely.",
];

export default function PainSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-foreground leading-tight">
            You didn&apos;t start your business
            <br />
            to be a social media manager.
          </h2>

          <div className="space-y-3 mb-8">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-4 bg-card border border-border rounded-2xl px-6 py-4 shadow-sm">
                <span className="text-muted-foreground font-mono text-sm shrink-0">
                  {index + 1}.
                </span>
                <span className="text-secondary-foreground text-[0.95rem]">{step}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 bg-card border border-primary/20 rounded-2xl px-6 py-4 shadow-sm">
            <span className="text-muted-foreground font-mono text-sm shrink-0">
              7.
            </span>
            <span className="text-secondary-foreground text-[0.95rem] italic">
              Tell yourself you&apos;ll &ldquo;batch content this
              weekend.&rdquo; You won&apos;t.
            </span>
          </div>

          <p className="text-center text-primary font-semibold text-lg mt-12">
            What if you could hand all of this to someone who actually wants to
            do it?
          </p>
        </div>
      </div>
    </section>
  );
}
