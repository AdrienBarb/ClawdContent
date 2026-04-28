export default function DemoSection() {
  return (
    <section id="demo" className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            See it in action
          </h2>
          <p className="text-center text-secondary-foreground mb-12 text-lg">
            Publish to all your accounts in a few clicks.
          </p>

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
