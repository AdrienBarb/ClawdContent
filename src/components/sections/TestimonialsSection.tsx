import Image from "next/image";

const testimonials = [
  {
    q: "I went from posting twice a month to seven days a week. Bookings followed.",
    n: "Hannah Park",
    r: "Coach · Austin",
    img: "/images/testimonial/427228793_1055563818850952_6871033665526776015_n.jpg",
  },
  {
    q: "It writes like I write. Customers tell me my Instagram has 'really gotten good lately'.",
    n: "Marie Chen",
    r: "Owner, The Corner Bakery",
    img: "/images/testimonial/18011795_447556958969799_4401819888981639168_a.jpg",
  },
  {
    q: "I closed the agency. PostClaw is doing better content for $1,950 less a month.",
    n: "James Otieno",
    r: "Studio Roma · Chicago",
    img: "/images/testimonial/10735611_753231391381135_1551863489_a.jpg",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="bg-[#0f1029] px-6 py-24 text-white md:px-14 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-16 text-center md:mb-20">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#f8a594]">
            What owners say
          </div>
          <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-balance md:text-5xl lg:text-[72px]">
            &ldquo;I&apos;d rather pay $49 than spend{" "}
            <em className="italic text-[#ec6f5b]">another Sunday</em> writing captions.&rdquo;
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((x) => (
            <div
              key={x.n}
              className="rounded-3xl border border-[#2a2d52] bg-[#191b3a] p-8"
            >
              <div className="mb-4 text-sm text-[#ec6f5b]">★★★★★</div>
              <p className="mb-6 text-base leading-[1.55] text-white text-pretty md:text-lg">
                &ldquo;{x.q}&rdquo;
              </p>
              <div className="flex items-center gap-3 border-t border-[#2a2d52] pt-6">
                <Image
                  src={x.img}
                  alt={x.n}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-white">{x.n}</div>
                  <div className="mt-0.5 text-xs text-[#7a7fa0]">{x.r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
