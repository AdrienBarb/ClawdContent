type Cell = boolean | string;

const cols = ["PostClaw", "Buffer", "Hootsuite", "Hire someone"] as const;

const rows: [string, Cell, Cell, Cell, Cell][] = [
  ["Writes the post for you", true, false, false, true],
  ["Adapts tone per platform", true, false, false, true],
  ["Schedules at peak times", true, true, true, false],
  ["Learns your business", true, false, false, false],
  ["Setup under 5 minutes", true, false, false, false],
  ["Monthly cost", "$49", "$15", "$99", "$2,000+"],
];

function renderCell(v: Cell) {
  if (v === true) return <span className="text-lg text-[#ec6f5b]">✓</span>;
  if (v === false) return <span className="text-[#cbcbd6]">✕</span>;
  return <span className="font-semibold">{v}</span>;
}

export default function CompareSection() {
  return (
    <section className="bg-[#f5f0ea] px-6 py-24 md:px-14 md:py-32">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-14 text-center">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#7e8298]">
            The honest comparison
          </div>
          <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-[#0f1437] text-balance md:text-5xl lg:text-[72px]">
            Other tools give you a dashboard.{" "}
            <em className="italic text-[#ec6f5b]">We give you the posts.</em>
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-3xl border border-[#e2e0eb] bg-white md:block">
          <div
            className="grid border-b border-[#e2e0eb] bg-[#faf8f3]"
            style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr" }}
          >
            <div className="p-5" />
            {cols.map((c, i) => (
              <div
                key={c}
                className={`p-5 text-center text-[13px] font-semibold ${
                  i === 0
                    ? "border-l-2 border-[#ec6f5b] bg-[#ec6f5b11] text-[#ec6f5b]"
                    : "text-[#7e8298]"
                }`}
              >
                {c}
              </div>
            ))}
          </div>
          {rows.map((r, ri) => (
            <div
              key={r[0]}
              className="grid"
              style={{
                gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr",
                borderBottom: ri === rows.length - 1 ? "none" : "1px solid #e2e0eb",
              }}
            >
              <div className="px-5 py-[18px] text-sm font-medium text-[#0f1437]">
                {r[0]}
              </div>
              {r.slice(1).map((v, ci) => (
                <div
                  key={ci}
                  className={`px-5 py-[18px] text-center text-sm text-[#0f1437] ${
                    ci === 0 ? "border-l-2 border-[#ec6f5b] bg-[#ec6f5b08]" : ""
                  }`}
                >
                  {renderCell(v as Cell)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Mobile stacked */}
        <div className="space-y-4 md:hidden">
          {cols.map((c, i) => (
            <div
              key={c}
              className={`overflow-hidden rounded-2xl border bg-white ${
                i === 0 ? "border-[#ec6f5b]" : "border-[#e2e0eb]"
              }`}
            >
              <div
                className={`px-5 py-3 text-sm font-semibold ${
                  i === 0 ? "bg-[#ec6f5b11] text-[#ec6f5b]" : "bg-[#faf8f3] text-[#7e8298]"
                }`}
              >
                {c}
              </div>
              <div className="divide-y divide-[#e2e0eb]">
                {rows.map((r) => (
                  <div
                    key={r[0]}
                    className="flex items-center justify-between gap-4 px-5 py-3 text-sm text-[#0f1437]"
                  >
                    <span className="font-medium">{r[0]}</span>
                    <span>{renderCell(r[i + 1] as Cell)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
