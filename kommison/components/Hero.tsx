export default function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center pt-24 pb-16">
      <div className="hero-glow absolute inset-0 pointer-events-none" />
      <div className="relative mx-auto w-full max-w-6xl px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-1.5 text-sm text-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            Now in early access
          </div>

          <h1 className="animate-fade-up delay-100 mt-8 font-heading text-5xl leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Stop tracking referrals in spreadsheets.
          </h1>

          <p className="animate-fade-up delay-200 mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            Kommison gives your business a clean system to manage referral partners,
            track leads, calculate commissions, and handle payouts — all in one place.
          </p>

          <div className="animate-fade-up delay-300 mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#cta"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-accent px-7 text-sm font-semibold text-background transition-all hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Early Access
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-surface-border bg-transparent px-7 text-sm font-medium text-foreground transition-all hover:border-muted-dark hover:bg-surface"
            >
              See How It Works
            </a>
          </div>

          <p className="animate-fade-up delay-400 mt-6 text-sm text-muted-dark">
            Free to start &middot; No credit card required &middot; Set up in 5 minutes
          </p>
        </div>
      </div>
    </section>
  );
}
