"use client";

function Group({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        {label}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-[13px] leading-relaxed text-gray-600"
          >
            <span
              className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gray-300"
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What we'll lean into vs ease off, from the strategy's doubleDown / stop. */
export default function PlanCoaching({
  doubleDown,
  stop,
}: {
  doubleDown: string[];
  stop: string[];
}) {
  const lean = doubleDown.slice(0, 4);
  const ease = stop.slice(0, 3);
  if (lean.length === 0 && ease.length === 0) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
      <Group label="What we'll lean into" items={lean} />
      <Group label="What we'll ease off" items={ease} />
    </section>
  );
}
