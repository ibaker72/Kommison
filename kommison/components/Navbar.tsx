"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "nav-blur bg-[#09090B]/80 border-b border-surface-border"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <a href="#" className="font-heading text-xl text-foreground tracking-tight">
          Kommison
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="text-sm text-muted transition-colors hover:text-foreground">
            Pricing
          </a>
          <a href="#how-it-works" className="text-sm text-muted transition-colors hover:text-foreground">
            How It Works
          </a>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="#cta"
            className="hidden rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-all hover:bg-accent-hover md:inline-flex"
          >
            Get Early Access
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="17" y2="6" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="14" x2="17" y2="14" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="nav-blur border-t border-surface-border bg-[#09090B]/95 px-6 py-6 md:hidden">
          <div className="flex flex-col gap-4">
            <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-muted transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="text-sm text-muted transition-colors hover:text-foreground">
              Pricing
            </a>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-sm text-muted transition-colors hover:text-foreground">
              How It Works
            </a>
            <a
              href="#cta"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-lg bg-accent px-5 py-2.5 text-center text-sm font-medium text-background transition-all hover:bg-accent-hover"
            >
              Get Early Access
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
