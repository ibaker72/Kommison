export default function TrustBar() {
  return (
    <section className="border-y border-surface-border py-10">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <p className="text-center text-sm text-muted-dark">
          Built for agencies, freelancers, and service businesses that run on referrals
        </p>
        <div className="mt-6 flex items-center justify-center gap-8">
          {["Next.js", "Supabase", "Stripe", "Vercel"].map((name) => (
            <span key={name} className="text-xs font-medium uppercase tracking-widest text-muted-dark/60">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
