export default function Footer() {
  return (
    <footer className="border-t border-surface-border py-10">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-6">
            <span className="font-heading text-lg text-foreground">
              Kommison
            </span>
            <span className="text-sm text-muted-dark">
              &copy; 2026 Bedrock Alliance LLC
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-dark">
            <a href="#" className="transition-colors hover:text-muted">Privacy</a>
            <a href="#" className="transition-colors hover:text-muted">Terms</a>
            <a
              href="https://tweakandbuild.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-muted"
            >
              Built by Tweak &amp; Build
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
