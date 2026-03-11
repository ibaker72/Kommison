export default function FinalCTA() {
  return (
    <section id="cta" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-muted/30 to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-6 text-center lg:px-8">
        <h2 className="font-heading text-3xl text-foreground sm:text-4xl lg:text-5xl">
          Ready to stop losing track of referrals?
        </h2>
        <p className="mt-4 text-muted">
          Start your free trial today. No credit card required. Set up in under 5 minutes.
        </p>
        <div className="mt-10">
          <a
            href="#"
            className="inline-flex h-13 items-center justify-center rounded-lg bg-accent px-10 text-base font-semibold text-background transition-all hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started Free
          </a>
        </div>
        <p className="mt-6 text-sm text-muted-dark">
          Join agencies, freelancers, and small businesses already tracking referrals with Kommison.
        </p>
      </div>
    </section>
  );
}
