import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Briefcase,
  History,
  Unlock,
  DollarSign,
  CreditCard,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  BadgeCheck,
} from "lucide-react";
import { useState } from "react";
import useUser from "@/utils/useUser";

export default function DashboardLayout({ children }) {
  const { data: user, loading } = useUser();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!user,
  });

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Briefcase, label: "Jobs", href: "/jobs" },
    { icon: History, label: "My Tasks", href: "/my-tasks" },
    { icon: Unlock, label: "Tiers", href: "/tiers" },
    { icon: DollarSign, label: "Earnings", href: "/earnings" },
    { icon: CreditCard, label: "Payouts", href: "/payouts" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const isActive = (href) =>
    typeof window !== "undefined" && window.location.pathname === href;

  if (loading) return null;
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/account/signin";
    return null;
  }

  if (
    profile &&
    !profile.onboarded &&
    typeof window !== "undefined" &&
    window.location.pathname !== "/onboarding"
  ) {
    window.location.href = "/onboarding";
    return null;
  }

  return (
    <div className="min-h-screen bg-surface text-ink overflow-x-hidden">
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-shell/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      <header className="sticky top-0 z-50 border-b border-line bg-surface-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-muted transition hover:bg-surface-muted hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 lg:hidden"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          <a href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <Briefcase size={18} />
            </div>
            <span className="text-base font-semibold tracking-tight text-ink">
              SurveyTasker
            </span>
          </a>

          <nav className="ml-4 hidden min-w-0 flex-1 items-center gap-1 xl:flex">
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  isActive(item.href)
                    ? "bg-brand/10 text-brand"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-muted transition-colors hover:bg-surface-muted hover:text-brand"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5 sm:flex">
              <div className="text-right leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                  Balance
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  <p className="text-sm font-bold text-brand">
                    ${(Number(profile?.available_balance_cents ?? 0) / 100).toFixed(2)}
                  </p>
                  {profile?.identityVerified && (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-success-border bg-success-bg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-text">
                      <BadgeCheck size={11} />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-muted shadow-inner">
              {user.image ? (
                <img src={user.image} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-soft text-brand text-sm font-bold">
                  {user.name?.[0]}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform border-r border-line bg-surface-card p-4 shadow-xl transition-transform duration-300 lg:hidden ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <Briefcase size={18} />
            </div>
            <span className="text-base font-semibold tracking-tight text-ink">
              SurveyTasker
            </span>
          </a>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-muted transition hover:bg-surface-muted hover:text-brand"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileNavOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-brand/10 text-brand"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="mt-5 border-t border-line pt-4">
          <a
            href="/account/logout"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-red-600"
          >
            <LogOut size={18} />
            <span>Log out</span>
          </a>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-[1400px] min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="min-w-0">{children}</div>
      </main>
    </div>
  );
}
