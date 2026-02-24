const features = [
  {
    title: "Fast & Reliable",
    description: "Built with modern technologies for optimal performance and reliability.",
  },
  {
    title: "Secure by Default",
    description: "Enterprise-grade security with authentication and data protection.",
  },
  {
    title: "Easy to Use",
    description: "Intuitive interface designed for the best user experience.",
  },
  {
    title: "Scalable",
    description: "Grows with your business, from startup to enterprise scale.",
  },
  {
    title: "24/7 Support",
    description: "Get help whenever you need it with our dedicated support team.",
  },
  {
    title: "Regular Updates",
    description: "Continuous improvements and new features added regularly.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="container mx-auto px-4 py-20 bg-muted/50">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything you need</h2>
          <p className="text-xl text-muted-foreground">
            Powerful features to help you succeed
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border bg-background hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

