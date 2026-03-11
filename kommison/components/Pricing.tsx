const plans = [
  {
    name: "Starter",
    price: "$39",
    period: "/mo",
    description: "For freelancers and solo consultants",
    features: [
      "Up to 10 referral partners",
      "Unique links and codes",
      "Commission tracking",
      "Manual payouts",
      "Partner portal",
      "Email notifications",
    ],
    popular: false,
  },
  {
    name: "Growth",
    price: "$79",
    period: "/mo",
    description: "For growing agencies and service businesses",
    features: [
      "Up to 50 referral partners",
      "Everything in Starter",
      "Custom commission rules",
      "Payout history and reporting",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Scale",
    price: "$149",
    period: "/mo",
    description: "For businesses with large referral networks",
    features: [
      "Unlimited partners",
      "Everything in Growth",
      "Team access (multiple admins)",
      "Advanced analytics",
      "API access",
      "Stripe Connect payouts (coming soon)",
    ],
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Pricing</p>
          <h2 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl lg:text-5xl">
            Simple pricing. No surprises.
          </h2>
          <p className="mt-4 text-muted">
            Start free. Upgrade when your referral program grows.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all duration-300 ${
                plan.popular
                  ? "border-accent/40 bg-surface shadow-[0_0_60px_-15px_rgba(245,158,11,0.1)]"
                  : "border-surface-border bg-surface hover:border-muted-dark/40"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-background">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-heading text-5xl text-foreground">
                  {plan.price}
                </span>
                <span className="text-muted">{plan.period}</span>
              </div>
              <a
                href="#cta"
                className={`mt-8 flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  plan.popular
                    ? "bg-accent text-background hover:bg-accent-hover"
                    : "border border-surface-border bg-transparent text-foreground hover:border-muted-dark hover:bg-surface-hover"
                }`}
              >
                Get Started
              </a>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-muted">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 8 6.5 11.5 13 5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-dark">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
