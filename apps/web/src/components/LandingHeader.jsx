import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

export default function LandingHeader() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setCollapsed(window.scrollY > 28);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface-card/85 backdrop-blur-md">
        <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold tracking-tight text-ink">SurveyTasker</p>
              <p
                className={`hidden text-xs font-medium text-ink-muted transition-all duration-300 sm:block ${
                  collapsed
                    ? "max-h-8 translate-y-0 opacity-100"
                    : "max-h-0 -translate-y-1 opacity-0"
                }`}
              >
                Micro-Survey Tasks
              </p>
            </div>
          </a>
          <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            <a
              href="/contact"
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink sm:px-4"
            >
              Contact us
            </a>
            <a
              href="/account/signin"
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink sm:px-4"
            >
              Sign in
            </a>
            <a
              href="/account/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover sm:px-4"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </a>
          </nav>
        </div>
        <div
          className={`overflow-hidden border-t border-line/60 text-center transition-all duration-300 ${
            collapsed ? "max-h-0 py-0 opacity-0" : "max-h-40 py-4 opacity-100"
          }`}
        >
          <p className="text-2xl font-extrabold tracking-tight text-ink transition-all duration-300 sm:text-3xl">
            Micro-Survey Tasks
          </p>
          <p className="mt-1 text-sm font-medium text-ink-muted transition-opacity duration-300 sm:text-base">
            Clear Rewards, and Flexible Work that Fits your Schedule
          </p>
        </div>
      </header>
    </>
  );
}
