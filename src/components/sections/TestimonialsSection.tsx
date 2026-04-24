import Image from "next/image";

const testimonials = [
  {
    quote:
      "I never had time to post. Now my Instagram runs itself and clients actually find me through it.",
    name: "Sarah M.",
    role: "Florist",
    image:
      "/images/testimonial/427228793_1055563818850952_6871033665526776015_n.jpg",
  },
  {
    quote:
      "I don't understand social media at all. But somehow, it works. My tables are fuller on weekdays now.",
    name: "Marco D.",
    role: "Restaurant owner",
    image:
      "/images/testimonial/18011795_447556958969799_4401819888981639168_a.jpg",
  },
  {
    quote:
      "I used to spend my Sundays trying to batch content. Now I just approve what PostClaw suggests and get on with my week.",
    name: "Jess K.",
    role: "Fitness coach",
    image:
      "/images/testimonial/10735611_753231391381135_1551863489_a.jpg",
  },
  {
    quote:
      "I was paying $1,500/month for a freelancer who posted three times a week. PostClaw does more for a fraction of the price.",
    name: "David L.",
    role: "Estate agent",
    image:
      "/images/testimonial/501219030_17846298321484295_4697703142460861154_n.jpg",
  },
  {
    quote:
      "My clients keep asking how I post so consistently. I just smile. They don't need to know.",
    name: "Priya S.",
    role: "Photographer",
    image:
      "/images/testimonial/557561785_18546285193016965_4034130549721227625_n.jpg",
  },
];

function TestimonialCard({ t }: { t: (typeof testimonials)[number] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col w-[320px] shrink-0">
      <blockquote className="text-secondary-foreground leading-relaxed text-[0.95rem] flex-1 mb-6">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Image
          src={t.image}
          alt={t.name}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div>
          <p className="text-sm font-semibold text-foreground">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            Don&apos;t take our word for it
          </h2>
          <p className="text-center text-secondary-foreground text-lg mb-14">
            Real business owners. Real results.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex animate-testimonial-marquee gap-6">
          {[...testimonials, ...testimonials].map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
