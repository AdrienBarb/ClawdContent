const comparisons = [
  {
    without: "45 minutes writing one Instagram caption",
    with: "Approve a ready-made post in 10 seconds",
  },
  {
    without: "Googling 'what to post for my business'",
    with: "Open the app. Post ideas already waiting.",
  },
  {
    without: "Forgetting to post for weeks, then feeling guilty",
    with: "Posts go out daily. Zero effort.",
  },
  {
    without: "Same caption copy-pasted to every platform",
    with: "Each post rewritten for Instagram, Facebook, LinkedIn",
  },
  {
    without: "Hiring a social media person: $1,000–2,000/mo",
    with: "$49/mo. Everything included.",
  },
];

export default function BeforeAfterSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            What changes when PostClaw takes over
          </h2>
          <p className="text-center text-secondary-foreground text-lg mb-14">
            Less time on social media. More time on your business.
          </p>

          <div className="rounded-[2rem] border border-border bg-card p-8 md:p-12 shadow-sm">
            <div className="space-y-4">
              {comparisons.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3"
                >
                  <div className="flex items-center gap-3 bg-secondary border border-border rounded-xl px-5 py-3.5">
                    <span className="text-red-400/70 text-lg shrink-0">
                      &times;
                    </span>
                    <span className="text-secondary-foreground text-[0.92rem]">
                      {row.without}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-[#fef7f6] border border-primary/15 rounded-xl px-5 py-3.5">
                    <span className="text-primary text-lg shrink-0">
                      &#10003;
                    </span>
                    <span className="text-foreground text-[0.92rem]">
                      {row.with}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
