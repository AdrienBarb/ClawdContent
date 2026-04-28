const personas = [
  {
    t: "Photographers",
    q: "Turn your portfolio into a feed that actually books shoots.",
  },
  {
    t: "Restaurants & cafés",
    q: "Daily specials, behind-the-scenes, the dish that flew today.",
  },
  {
    t: "Coaches",
    q: "Show up as the expert without being on Instagram all day.",
  },
  {
    t: "Local shops",
    q: "Florists, salons, studios — stay visible while serving customers.",
  },
];

export default function WhoIsThisForSection() {
  return (
    <section id="who-is-this-for" className="bg-[#f5f0ea] px-6 py-24 md:px-14 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-16 md:mb-20">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#7e8298]">
            Who it&apos;s for
          </div>
          <h2 className="max-w-[900px] font-display text-4xl leading-none tracking-[-0.025em] text-[#0f1437] text-balance md:text-5xl lg:text-[72px]">
            Built for people who have a business to run,{" "}
            <em className="italic text-[#ec6f5b]">not a feed to manage.</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => (
            <div
              key={p.t}
              className="flex min-h-[200px] flex-col justify-between rounded-2xl border border-[#e2e0eb] bg-white p-7"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ec6f5b]">
                {p.t}
              </div>
              <p className="text-lg font-medium leading-[1.4] tracking-[-0.01em] text-[#0f1437]">
                {p.q}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
