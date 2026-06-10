"use client";

/** The strategic angle for the account — how it should show up to hit the goal. */
export default function PlanPositioning({
  positioning,
}: {
  positioning: string;
}) {
  if (!positioning.trim()) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        Your angle
      </p>
      <p className="text-[13px] leading-relaxed text-gray-700">{positioning}</p>
    </section>
  );
}
