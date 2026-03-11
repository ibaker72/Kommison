"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What is Kommison?",
    answer:
      "Kommison is a referral and commission tracking platform that helps small businesses manage referral partners, track leads, calculate commissions, and handle payouts in one place.",
  },
  {
    question: "Who is Kommison for?",
    answer:
      "Agencies, freelancers, consultants, and service businesses that get customers through word-of-mouth and referrals but don't have a system to track and pay for them.",
  },
  {
    question: "How is this different from affiliate software?",
    answer:
      "Enterprise affiliate platforms are built for large e-commerce brands running influencer programs. Kommison is built for service businesses that need simple referral tracking without the bloat.",
  },
  {
    question: "Do my referral partners need to pay?",
    answer:
      "No. Partners get free access to their portal where they can see their referrals and earnings.",
  },
  {
    question: "Can I customize commission rates per partner?",
    answer:
      "Yes. You can set flat fees or percentages, and configure different rates for different partners or programs.",
  },
  {
    question: "How do payouts work?",
    answer:
      "In v1, you manage payouts manually (via Venmo, PayPal, bank transfer, or however you pay people). Stripe Connect automation is on the roadmap.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Every plan includes a 14-day free trial with no credit card required.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. No contracts, no cancellation fees. Cancel from your dashboard at any time.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="border-t border-surface-border py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">FAQ</p>
        <h2 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl">
          Frequently asked questions
        </h2>

        <div className="mt-12 divide-y divide-surface-border">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between py-5 text-left transition-colors"
              >
                <span className="text-sm font-medium text-foreground pr-8">
                  {faq.question}
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${
                    openIndex === i ? "rotate-45" : ""
                  }`}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="8" y1="3" x2="8" y2="13" />
                  <line x1="3" y1="8" x2="13" y2="8" />
                </svg>
              </button>
              <div
                className="accordion-content"
                data-open={openIndex === i}
              >
                <div className="accordion-inner">
                  <p className="pb-5 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
