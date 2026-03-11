const features = [
  {
    title: "Partner Management",
    description:
      "Add referral partners, assign unique links and codes, and keep everything organized in one place. No more digging through DMs to find who referred whom.",
  },
  {
    title: "Referral Attribution",
    description:
      "Every referral is logged with clear attribution — who sent it, when it arrived, and where it stands. Link clicks are tracked automatically. Manual referrals take 30 seconds to log.",
  },
  {
    title: "Flexible Commissions",
    description:
      "Set flat fees or percentage-based commissions. When a referral converts, the commission is calculated automatically. Override when needed, with a full audit trail.",
  },
  {
    title: "Payout Tracking",
    description:
      "See every pending, approved, and paid commission in one view. Approve payouts, mark them as paid, and keep a clean record for your books.",
  },
  {
    title: "Partner Portal",
    description:
      "Your referral partners get their own login to check referrals, view earnings, and copy their referral link. No more \"where's my payment?\" emails.",
  },
  {
    title: "Activity Log",
    description:
      "Every action is recorded — referrals created, commissions approved, payouts completed. Full transparency for you and your partners.",
  },
];

export default function FeaturesDeep() {
  return (
    <section className="border-t border-surface-border py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">Features</p>
        <h2 className="mt-3 max-w-2xl font-heading text-3xl text-foreground sm:text-4xl lg:text-5xl">
          Everything you need to run a referral program.
        </h2>

        <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="group">
              <h3 className="text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
