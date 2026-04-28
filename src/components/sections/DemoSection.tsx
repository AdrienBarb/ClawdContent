export default function DemoSection() {
  return (
    <section id="demo" className="bg-[#f5f0ea] px-6 pb-10 pt-24 md:px-14 md:pt-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 text-center">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#7e8298]">
            See it in action
          </div>
          <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-[#0f1437] text-balance md:text-5xl lg:text-6xl">
            A whole week of posts,{" "}
            <em className="italic text-[#ec6f5b]">in two minutes.</em>
          </h2>
          <p className="mt-4 text-base text-[#4a5073] md:text-lg">
            Publish to all your accounts in a few clicks.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl">
          <div
            style={{
              position: "relative",
              paddingBottom: "calc(54.6% + 41px)",
              height: 0,
              width: "100%",
            }}
          >
            <iframe
              src="https://demo.arcade.software/H4bhjO5bW6PRNNNqzbNZ?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
              title="Publish Posts to Multiple Social Media Accounts at Once"
              frameBorder={0}
              loading="lazy"
              allowFullScreen
              allow="clipboard-write"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                colorScheme: "light",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
