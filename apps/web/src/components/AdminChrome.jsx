import { signOut } from "@auth/create/react";
import { LayoutDashboard, LogOut, Mail, Briefcase, Users, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { to: "/admin/contacts", label: "Contact", icon: Mail },
  { to: "/admin/payouts", label: "Payouts", icon: Wallet },
];

export default function AdminChrome({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-bold text-brand">SurveyTasker Admin</div>
          <nav className="flex flex-wrap items-center gap-2">
            {links.map(({ to, label, icon: Icon, end }) => {
              const path = location.pathname.replace(/\/$/, "") || "/";
              const target = to.replace(/\/$/, "") || "/";
              const active = end
                ? path === target
                : path === target || path.startsWith(`${target}/`);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
