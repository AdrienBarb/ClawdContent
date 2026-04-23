const steps = [
  "Your last Instagram post was three weeks ago. You keep meaning to fix that.",
  "You sat down to write something. Twenty minutes later, nothing. Back to real work.",
  "Your competitor posts every single day. Professional photos, clever captions. How?",
  "You tried a scheduling tool once. Another dashboard to learn. Another thing you abandoned.",
  "You looked into hiring someone. $1,000/month minimum. That's not in the budget.",
  "So you post when you remember, feel guilty when you don't, and wonder if it even matters.",
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

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-4 bg-card border border-border rounded-2xl px-6 py-4 shadow-sm">
                <span className="text-muted-foreground font-mono text-sm shrink-0">
                  {index + 1}.
                </span>
                <span className="text-secondary-foreground text-[0.95rem]">{step}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 bg-card border border-primary/20 rounded-2xl px-6 py-4 shadow-sm mt-3">
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
            do it, for less than your phone bill?
          </p>
        </div>
      </div>
    </section>
  );
}
