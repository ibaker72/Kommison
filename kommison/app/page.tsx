"use client";

import { useState } from "react";

/* ─── Icons (inline SVG components) ─── */

function IconTrack() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 16L14 20L22 12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalculate() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 10V16L20 20" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPay() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 14H28" stroke="var(--accent)" strokeWidth="1.5" />
      <rect x="8" y="18" width="6" height="2" rx="1" fill="var(--accent)" />
    </svg>
  );
}

function IconPartners() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 24C4 20 6.5 18 10 18C11.5 18 12.8 18.4 14 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 19C17.2 18.4 18.5 18 20 18C23.5 18 26 20 26 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconReferral() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 14H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 9L22 14L17 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="14" r="2" fill="var(--accent)" />
    </svg>
  );
}

function IconCommission() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 4V24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 8H12C10.3 8 9 9.3 9 11C9 12.7 10.3 14 12 14H16C17.7 14 19 15.3 19 17C19 18.7 17.7 20 16 20H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPayout() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 12H24" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="18" r="2" fill="var(--accent)" />
    </svg>
  );
}

function IconPortal() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 10H24" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="7" r="1" fill="var(--accent)" />
      <circle cx="11" cy="7" r="1" fill="var(--accent)" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 14H8L11 8L14 20L17 12L20 16H24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8L6.5 11.5L13 5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── FAQ Accordion ─── */

const faqData = [
  {
    q: "How is Kommison different from affiliate software?",
    a: "Affiliate platforms are built for e-commerce stores with thousands of affiliates. Kommison is built for service businesses — agencies, consultants, freelancers — with 5 to 50 referral partners who need clean tracking and payout management.",
  },
  {
    q: "Do my referral partners need to create an account?",
    a: "Partners receive an email invitation and set up a simple login. They use the partner portal to view their referrals and earnings. It takes under a minute.",
  },
  {
    q: "How do commissions get calculated?",
    a: "You set the rules — flat fee per conversion or a percentage of deal value. When you mark a referral as converted, Kommison calculates the commission automatically. You can override any amount manually.",
  },
  {
    q: "Does Kommison process payments?",
    a: "Not yet. In v1, you pay partners through your preferred method (Venmo, PayPal, bank transfer) and mark the payout as completed in Kommison. Automated payouts via Stripe Connect are coming soon.",
  },
  {
    q: "Can I use Kommison if I only have a few referral partners?",
    a: "Absolutely. The free plan supports up to 3 active partners — enough to run a small referral program indefinitely. Most businesses start with 3–5 partners and grow from there.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "No. Monthly plans, cancel anytime. Annual plans are available at a discount but never required.",
  },
  {
    q: "What if I already track referrals in a spreadsheet?",
    a: "You can keep using your spreadsheet. But when a partner asks \"where's my referral?\" and you can't find the answer, or when tax season hits and you have no commission records, you'll wish you had a system. Kommison takes 10 minutes to set up and replaces hours of manual tracking every month.",
  },
  {
    q: "Who built this?",
    a: "Kommison is built by Bedrock Alliance LLC, the same team behind TweakAndBuild.com. We build and run SaaS products — Kommison is one of them. It's not a side project; it's a real product we use ourselves.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-surface-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left cursor-pointer"
      >
        <span className="font-[family-name:var(--font-geist)] text-base font-medium text-foreground pr-8">
          {q}
        </span>
        <IconChevron open={open} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-48 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-muted text-[15px] leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── Pricing Data ─── */

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For testing the waters",
    features: [
      "Up to 3 partners",
      "25 referrals / month",
      "Commission tracking",
      "Payout management",
      "Partner portal",
      "Activity log",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$39",
    period: "/mo",
    description: "For growing referral programs",
    features: [
      "Up to 25 partners",
      "Unlimited referrals",
      "Branded partner portal",
      "Email notifications",
      "Priority support",
      "Commission overrides",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$79",
    period: "/mo",
    description: "For established programs",
    features: [
      "Unlimited partners",
      "Unlimited referrals",
      "Full custom portal",
      "Advanced reporting",
      "CSV export",
      "Dedicated support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

/* ─── Main Page ─── */

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── 1. Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-blur bg-background/80 border-b border-surface-border/50">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-16">
          <a
            href="#"
            className="font-[family-name:var(--font-geist)] text-xl font-bold tracking-tight"
          >
            Kommison
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm text-muted hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">
              How It Works
            </a>
          </div>
          <a
            href="#pricing"
            className="bg-accent hover:bg-accent-hover text-background text-sm font-medium px-5 py-2 transition-colors"
            style={{ borderRadius: "4px" }}
          >
            Start Free
          </a>
        </div>
      </nav>

      {/* ─── 2. Hero ─── */}
      <section className="pt-32 pb-20 md:pt-44 md:pb-32 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="animate-fade-up">
            <span className="inline-block text-accent text-xs font-medium tracking-widest uppercase mb-6 border border-accent/20 px-3 py-1.5" style={{ borderRadius: "3px" }}>
              Referral tracking for modern businesses
            </span>
          </div>
          <h1 className="animate-fade-up delay-100 font-[family-name:var(--font-geist)] text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight max-w-4xl">
            Stop tracking referrals
            <br />
            <span className="gradient-text">in spreadsheets.</span>
          </h1>
          <p className="animate-fade-up delay-200 mt-6 text-lg md:text-xl text-muted max-w-2xl leading-relaxed">
            Kommison gives your business a clean system to manage referral partners,
            track leads, calculate commissions, and handle payouts — all in one place.
          </p>
          <div className="animate-fade-up delay-300 mt-10 flex flex-col sm:flex-row gap-4">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center bg-accent hover:bg-accent-hover text-background font-medium px-8 py-3.5 text-sm transition-colors"
              style={{ borderRadius: "4px" }}
            >
              Get Early Access
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center border border-surface-border hover:border-muted-dark text-foreground font-medium px-8 py-3.5 text-sm transition-colors"
              style={{ borderRadius: "4px" }}
            >
              See How It Works
            </a>
          </div>
          <p className="animate-fade-up delay-400 mt-6 text-xs text-muted-dark tracking-wide">
            Free to start &nbsp;·&nbsp; No credit card required &nbsp;·&nbsp; Set up in 5 minutes
          </p>
        </div>
      </section>

      {/* ─── 3. Social Proof Bar ─── */}
      <section className="border-y border-surface-border/50 py-6">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm text-muted-dark tracking-wide">
            Trusted by agencies, freelancers, and service businesses to track referrals and commissions
          </p>
        </div>
      </section>

      {/* ─── 4. Problem Statement ─── */}
      <section className="py-24 md:py-32 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="border-l-2 border-accent/40 pl-8 md:pl-12">
            <p className="font-[family-name:var(--font-geist)] text-2xl md:text-3xl font-semibold leading-snug text-foreground/90">
              Your referrals live in DMs, spreadsheets, and memory. A partner sends a
              client — you forget to log it. A commission is owed — you can&apos;t find the
              amount. Tax season hits — you have no records.
            </p>
            <p className="mt-6 text-muted text-lg">
              Informal tracking doesn&apos;t scale. Your referral partners deserve a system, and so does your business.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 5. Feature Cards (Track · Calculate · Pay) ─── */}
      <section id="features" className="py-20 md:py-28 px-6 scroll-mt-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-accent text-xs font-medium tracking-widest uppercase mb-4">
            Core workflow
          </p>
          <h2 className="font-[family-name:var(--font-geist)] text-3xl md:text-4xl font-bold tracking-tight mb-16">
            Track. Calculate. Pay.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <IconTrack />,
                title: "Track every referral",
                desc: "Every referral is logged with clear attribution — who sent it, when it arrived, and where it stands. Link clicks tracked automatically. Manual referrals take 30 seconds.",
              },
              {
                icon: <IconCalculate />,
                title: "Calculate commissions",
                desc: "Set flat fees or percentage-based commissions. When a referral converts, the commission is calculated automatically. Override when needed, with a full audit trail.",
              },
              {
                icon: <IconPay />,
                title: "Manage payouts",
                desc: "See every pending, approved, and paid commission in one view. Approve payouts, mark them as paid, and keep a clean record for your books.",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="group bg-surface border border-surface-border p-8 hover:border-muted-dark/50 transition-colors"
                style={{ borderRadius: "6px" }}
              >
                <div className="text-muted group-hover:text-foreground transition-colors mb-6">
                  {card.icon}
                </div>
                <h3 className="font-[family-name:var(--font-geist)] text-lg font-semibold mb-3">
                  {card.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. How It Works ─── */}
      <section id="how-it-works" className="py-20 md:py-28 px-6 bg-surface/50 scroll-mt-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-accent text-xs font-medium tracking-widest uppercase mb-4">
            How it works
          </p>
          <h2 className="font-[family-name:var(--font-geist)] text-3xl md:text-4xl font-bold tracking-tight mb-16">
            Up and running in 10 minutes.
          </h2>
          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {[
              {
                step: "01",
                title: "Set up your program",
                desc: "Create your referral program, set your commission rules (flat fee or percentage), and choose where referral links redirect.",
              },
              {
                step: "02",
                title: "Invite your partners",
                desc: "Add referral partners by email. Each gets a unique link and code, plus access to their own earnings portal.",
              },
              {
                step: "03",
                title: "Track and pay",
                desc: "Referrals come in, commissions calculate automatically, and you approve payouts when you're ready. Every step is tracked and visible.",
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <span className="font-[family-name:var(--font-geist)] text-5xl font-bold text-accent/15 absolute -top-2 -left-1">
                  {item.step}
                </span>
                <div className="pt-12">
                  <h3 className="font-[family-name:var(--font-geist)] text-xl font-semibold mb-3">
                    {item.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. Features Deep Dive ─── */}
      <section className="py-20 md:py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-accent text-xs font-medium tracking-widest uppercase mb-4">
            Features
          </p>
          <h2 className="font-[family-name:var(--font-geist)] text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Everything you need to run a referral program.
          </h2>
          <p className="text-muted text-lg mb-16 max-w-2xl">
            No bloat. No enterprise complexity. Just the tools a small business actually needs to formalize referrals.
          </p>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-14">
            {[
              {
                icon: <IconPartners />,
                title: "Partner Management",
                desc: "Add referral partners, assign unique links and codes, and keep everything organized in one place. No more digging through DMs to find who referred whom.",
              },
              {
                icon: <IconReferral />,
                title: "Referral Tracking",
                desc: "Every referral is logged with clear attribution — who sent it, when it arrived, and where it stands. Link clicks are tracked automatically. Manual referrals take 30 seconds to log.",
              },
              {
                icon: <IconCommission />,
                title: "Commission Calculation",
                desc: "Set flat fees or percentage-based commissions. When a referral converts, the commission is calculated automatically. Override when needed, with a full audit trail.",
              },
              {
                icon: <IconPayout />,
                title: "Payout Management",
                desc: "See every pending, approved, and paid commission in one view. Approve payouts, mark them as paid, and keep a clean record for your books.",
              },
              {
                icon: <IconPortal />,
                title: "Partner Portal",
                desc: "Your referral partners get their own login to check referrals, view earnings, and copy their referral link. No more \"where's my payment?\" emails.",
              },
              {
                icon: <IconActivity />,
                title: "Activity Log",
                desc: "Every action is recorded — referrals created, commissions approved, payouts completed. Full transparency for you and your partners.",
              },
            ].map((feature, i) => (
              <div key={i} className="flex gap-5">
                <div className="text-muted mt-0.5 shrink-0">{feature.icon}</div>
                <div>
                  <h3 className="font-[family-name:var(--font-geist)] text-base font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. Pricing ─── */}
      <section id="pricing" className="py-20 md:py-28 px-6 bg-surface/50 scroll-mt-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-accent text-xs font-medium tracking-widest uppercase mb-4">
              Pricing
            </p>
            <h2 className="font-[family-name:var(--font-geist)] text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Simple pricing. No surprises.
            </h2>
            <p className="text-muted text-lg">
              Start free with up to 3 partners. Upgrade when you&apos;re ready.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative p-8 border transition-colors ${
                  plan.highlighted
                    ? "border-accent/40 bg-surface accent-glow"
                    : "border-surface-border bg-surface hover:border-muted-dark/50"
                }`}
                style={{ borderRadius: "6px" }}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-8 bg-accent text-background text-xs font-medium px-3 py-1" style={{ borderRadius: "3px" }}>
                    Most Popular
                  </span>
                )}
                <p className="font-[family-name:var(--font-geist)] text-sm font-medium text-muted-dark uppercase tracking-wider">
                  {plan.name}
                </p>
                <div className="mt-4 mb-2 flex items-baseline gap-1">
                  <span className="font-[family-name:var(--font-geist)] text-4xl font-bold">
                    {plan.price}
                  </span>
                  <span className="text-muted text-sm">{plan.period}</span>
                </div>
                <p className="text-muted text-sm mb-8">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-foreground/80">
                      <IconCheck />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className={`block w-full text-center font-medium text-sm py-3 transition-colors ${
                    plan.highlighted
                      ? "bg-accent hover:bg-accent-hover text-background"
                      : "border border-surface-border hover:border-muted-dark text-foreground"
                  }`}
                  style={{ borderRadius: "4px" }}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-dark text-sm mt-8">
            All plans include commission tracking, payout management, email notifications, and activity log. No per-referral fees. No hidden costs.
          </p>
        </div>
      </section>

      {/* ─── 9. FAQ ─── */}
      <section className="py-20 md:py-28 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-accent text-xs font-medium tracking-widest uppercase mb-4">
            FAQ
          </p>
          <h2 className="font-[family-name:var(--font-geist)] text-3xl md:text-4xl font-bold tracking-tight mb-12">
            Common questions.
          </h2>
          <div>
            {faqData.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── 10. Final CTA ─── */}
      <section className="py-24 md:py-32 px-6 border-t border-surface-border/50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-geist)] text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Your referrals deserve a real system.
          </h2>
          <p className="text-muted text-lg mb-10 max-w-xl mx-auto">
            Set up your referral program in 10 minutes. Free to start, no credit card required.
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center justify-center bg-accent hover:bg-accent-hover text-background font-medium px-10 py-4 text-sm transition-colors"
            style={{ borderRadius: "4px" }}
          >
            Get Started Free
          </a>
          <p className="mt-6 text-muted-dark text-sm">
            Join agencies, freelancers, and small businesses already tracking referrals with Kommison.
          </p>
        </div>
      </section>

      {/* ─── 11. Footer ─── */}
      <footer className="border-t border-surface-border/50 py-10 px-6">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <span className="font-[family-name:var(--font-geist)] text-sm font-semibold tracking-tight">
              Kommison
            </span>
            <span className="text-muted-dark text-xs">
              &copy; {new Date().getFullYear()} Bedrock Alliance LLC
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-dark">
            <a href="#" className="hover:text-muted transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-muted transition-colors">
              Terms
            </a>
            <a
              href="https://tweakandbuild.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted transition-colors"
            >
              Built by Tweak &amp; Build
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
