const features = [
  {
    number: "01",
    title: "Track",
    description:
      "Capture every referral source with unique links or codes so nothing gets lost in DMs.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Calculate",
    description:
      "Keep commissions consistent across deals with a clear pending-to-paid workflow.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="12" y2="10" />
        <line x1="8" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="12" y2="18" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Pay",
    description:
      "Give partners confidence with transparent records and reliable payout tracking.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

export default function FeatureCards() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature, i) => (
            <article
              key={feature.title}
              className={`group rounded-2xl border border-surface-border bg-surface p-8 transition-all duration-300 hover:border-accent/30 hover:bg-surface-hover animate-fade-up delay-${(i + 1) * 100}`}
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted text-accent">
                {feature.icon}
              </div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-dark">
                {feature.number}
              </div>
              <h3 className="font-heading text-2xl text-foreground">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
