export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-20 sm:px-10 lg:px-16">
        <div className="inline-flex w-fit items-center rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700">
          Kommison
        </div>

        <section className="max-w-3xl space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Stop tracking referrals in spreadsheets.
          </h1>
          <p className="text-lg leading-8 text-zinc-600 sm:text-xl">
            Kommison gives your business a clean system to manage referral
            partners, track leads, calculate commissions, and handle payouts in
            one place.
          </p>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            href="#"
          >
            Start Building Your Program
          </a>
          <a
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
            href="#"
          >
            View Product Brief
          </a>
        </div>

        <section className="grid gap-4 pt-4 sm:grid-cols-3">
          <article className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Track
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              Capture every referral source with links or codes so nothing gets
              lost in DMs.
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Calculate
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              Keep commissions consistent across deals with a clear pending to
              paid workflow.
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Pay
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              Give partners confidence with transparent records and reliable
              payout tracking.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
