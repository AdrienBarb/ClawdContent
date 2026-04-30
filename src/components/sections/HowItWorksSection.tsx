const steps = [
  {
    n: "01",
    t: "Tell it about your business",
    d: "Paste your website. PostClaw learns what you sell, your tone, what's special, in 30 seconds.",
  },
  {
    n: "02",
    t: "Connect Instagram & Facebook",
    d: "Two minutes. No technical setup. Add the accounts you actually use.",
  },
  {
    n: "03",
    t: "Approve. It posts.",
    d: "Drafts arrive ready. Tap approve. Posts go out at the right time, written for each platform.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-[#f5f0ea] px-6 py-24 md:px-14 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-16 md:mb-20">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#7e8298]">
            How it works
          </div>
          <h2 className="max-w-[900px] font-display text-4xl leading-none tracking-[-0.025em] text-[#0f1437] text-balance md:text-6xl lg:text-[80px]">
            From signup to your first post in{" "}
            <em className="italic text-[#ec6f5b]">under five minutes.</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="mb-4 text-5xl font-semibold leading-none tracking-[-0.04em] text-[#ec6f5b] md:text-7xl">
                {s.n}
              </div>
              <h3 className="mb-3 text-xl font-semibold tracking-[-0.015em] text-[#0f1437] md:text-2xl">
                {s.t}
              </h3>
              <p className="text-base leading-[1.6] text-[#4a5073]">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
