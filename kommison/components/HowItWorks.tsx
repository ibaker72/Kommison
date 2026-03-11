const steps = [
  {
    number: "01",
    title: "Set up your program",
    description:
      "Create your referral program, set your commission rules — flat fee or percentage — and choose where referral links redirect.",
  },
  {
    number: "02",
    title: "Add your partners",
    description:
      "Invite referral partners by email. Each gets a unique link and code, plus access to their own earnings portal.",
  },
  {
    number: "03",
    title: "Track and pay",
    description:
      "Referrals come in, commissions calculate automatically, and you approve payouts when you're ready. Every step is tracked and visible.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">How it works</p>
        <h2 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl lg:text-5xl">
          Up and running in 10 minutes.
        </h2>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-8 hidden h-px w-8 bg-surface-border sm:block translate-x-full" />
              )}
              <div className="mb-6 font-heading text-6xl text-surface-border">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
