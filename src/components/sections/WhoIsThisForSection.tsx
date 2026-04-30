import Link from "next/link";

const personas = [
  {
    t: "Small Business Owners",
    q: "Run the shop, serve the customers. Your feed stays alive without you.",
    href: "/for-small-businesses",
  },
  {
    t: "Solo Founders & Indie Hackers",
    q: "Ship features, close deals, talk to users. Leave the 5-posts-a-day to PostClaw.",
    href: "/for-founders",
  },
  {
    t: "Creators Who'd Rather Create",
    q: "One idea becomes thirteen platform-ready posts. Back to the actual work.",
    href: "/for-creators",
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {personas.map((p) => (
            <Link
              key={p.t}
              href={p.href}
              className="group flex min-h-[200px] flex-col justify-between rounded-2xl border border-[#e2e0eb] bg-white p-7 transition-all hover:-translate-y-0.5 hover:border-[#ec6f5b] hover:shadow-[0_14px_40px_-20px_rgba(236,111,91,0.4)]"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ec6f5b]">
                {p.t}
              </div>
              <div>
                <p className="text-lg font-medium leading-[1.4] tracking-[-0.01em] text-[#0f1437]">
                  {p.q}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#ec6f5b] opacity-0 transition-opacity group-hover:opacity-100">
                  See the page →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
