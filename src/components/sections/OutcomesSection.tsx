const items = [
  { who: "@thecornerbakery, Brooklyn", s: "12 walk-ins", t: "from a single Easter post" },
  { who: "@hannah.coaching, Austin", s: "47 booked calls", t: "from 30 days of Instagram" },
  { who: "@bloomflora, Leeds", s: "2,400 new followers", t: "in 8 weeks, no ads" },
  { who: "@studioroma, Chicago", s: "$8k extra revenue", t: "Q1 from steady posting" },
];

export default function OutcomesSection() {
  return (
    <section className="bg-[#0f1029] px-6 py-24 text-white md:px-14 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-16 max-w-[760px] md:mb-20">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#f8a594]">
            Real outcomes
          </div>
          <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-balance md:text-5xl lg:text-[72px]">
            Posts that{" "}
            <em className="italic text-[#ec6f5b]">actually move the needle.</em>
          </h2>
          <p className="mt-5 text-base leading-[1.55] text-[#b9bdd6] md:text-[17px]">
            Not impressions. Not vanity. Bookings. Walk-ins. Revenue. Here&apos;s what&apos;s happening for businesses like yours.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((x) => (
            <div
              key={x.who}
              className="rounded-2xl border border-[#2a2d52] bg-[#191b3a] p-7"
            >
              <div className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-[#ec6f5b] md:text-3xl">
                {x.s}
              </div>
              <div className="mt-3 text-sm leading-[1.45] text-[#b9bdd6]">{x.t}</div>
              <div className="mt-5 border-t border-[#2a2d52] pt-5 text-[11px] text-[#7a7fa0]">
                {x.who}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
