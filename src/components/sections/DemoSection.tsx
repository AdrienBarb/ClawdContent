import AnimatedSection from "@/components/sections/AnimatedSection";

export default function DemoSection() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto max-w-4xl">
        <AnimatedSection>
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
            See it in action
          </h2>
          <p className="text-center text-[#8a8f9e] text-lg mb-12 max-w-2xl mx-auto">
            From idea to 13 published posts — one conversation.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <div className="rounded-2xl overflow-hidden border border-[#1e2233] shadow-2xl shadow-black/40 aspect-video">
            <iframe
              src="https://www.youtube.com/embed/ypoRFsYFSQU?rel=0"
              title="Demo video showing how to create and publish social media posts using PostClaw"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
