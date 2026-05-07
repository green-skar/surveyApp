import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Eye,
  Heart,
} from "lucide-react";
import SectionKicker from "@/components/ui/SectionKicker";
import LandingHeader from "@/components/LandingHeader";

export default function LandingPage() {
  return (
    <div className="min-h-screen hero-gradient text-ink">
      <LandingHeader />

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:pt-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div className="min-w-0 text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
              <SectionKicker>Why SurveyTasker</SectionKicker>
            </div>
            <div className="mb-6 flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-card px-4 py-1.5 text-xs font-medium text-ink-muted shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                Seamless workflow — earn on your own schedule
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl xl:text-6xl">
              Earn from micro-survey tasks.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-muted lg:mx-0">
              Complete short paid tasks, keep a clear earnings history, and
              choose PayPal, bank transfer, or M-Pesa when it&apos;s time to get
              paid.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-[1.05rem] lg:mx-0">
              Your dashboard surfaces jobs that fit the interests you pick
              during onboarding. Each task shows the payout and time limit
              before you commit—work in focused sessions, pause whenever you
              need to, and pick up again on your own timeline.
            </p>
            <ul className="mx-auto mt-8 flex max-w-xl list-none flex-col gap-3 p-0 text-left text-sm text-ink-muted sm:mx-auto sm:max-w-2xl sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-3 sm:text-center lg:mx-0 lg:max-w-none lg:flex-col lg:items-start lg:justify-start lg:gap-3 lg:text-left">
              <li className="flex items-start gap-2 sm:inline-flex sm:items-center lg:inline-flex">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand sm:mt-0" />
                <span>Free sign-up—no subscription or card required</span>
              </li>
              <li className="flex items-start gap-2 sm:inline-flex sm:items-center lg:inline-flex">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand sm:mt-0" />
                <span>Rewards and deadlines visible before you start</span>
              </li>
              <li className="flex items-start gap-2 sm:inline-flex sm:items-center lg:inline-flex">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand sm:mt-0" />
                <span>Built for phones, tablets, and desktop</span>
              </li>
            </ul>
            <div className="mt-10 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a
                href="/account/signup"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/account/signin"
                className="inline-flex items-center rounded-full border border-line bg-surface-card px-7 py-3 font-semibold text-ink transition-colors hover:bg-surface-muted"
              >
                Sign in
              </a>
            </div>
            <p className="mt-4 text-center text-sm text-ink-muted lg:max-w-md lg:text-left">
              Short tasks with clear payouts. Identity verification helps keep
              withdrawals secure.
            </p>
          </div>
          <div className="min-w-0">
            <div className="rounded-3xl border border-line bg-surface-card/80 p-6 shadow-sm sm:p-8">
              <img
                src="/images/hero-illustration.svg"
                alt="Stylized SurveyTasker dashboard with job list, task checklist, and earnings preview"
                className="mx-auto w-full max-w-md lg:max-w-none"
                width={520}
                height={420}
                loading="eager"
                decoding="async"
              />
              <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted sm:text-sm">
                Rewards and time limits are always visible before you start a
                task.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: Heart,
              title: "Surveys matched to what you care about",
              desc: "Share your interests once, and we prioritize work that fits your profile—so your time feels purposeful, not random.",
            },
            {
              icon: Eye,
              title: "Transparent rewards",
              desc: "Each task shows the exact reward and time limit before you start. No hidden conditions.",
            },
            {
              icon: Lock,
              title: "Secure withdrawals via PayPal, bank, or M-Pesa",
              desc: "Link the payout method you trust. Transfers go through established payment rails with verification steps designed to protect your account.",
            },
          ].map((b) => (
            <div
              key={b.title}
              className="rounded-3xl border border-line bg-surface-card p-7 shadow-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-ink">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-3 flex justify-center">
          <SectionKicker>How it works</SectionKicker>
        </div>
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
          From interests to paid tasks
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
          Choose your areas of interest, then see matching jobs on your
          dashboard. Open any job, pick the tasks you want to complete, and earn
          as you go.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              n: "1",
              title: "Set your interests",
              desc: "During onboarding, select the topics you want to work on so your feed stays relevant.",
            },
            {
              n: "2",
              title: "Jobs on your dashboard",
              desc: "We surface jobs that align with those interests and your tier—browse and prioritize what fits your time.",
            },
            {
              n: "3",
              title: "Open jobs and complete tasks",
              desc: "Inside each job, choose individual tasks, finish them within the time limit, and watch your balance grow.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="relative rounded-3xl border border-line bg-surface-card p-7 pt-8 shadow-sm"
            >
              <div className="absolute -top-3 left-7 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-sm">
                {s.n}
              </div>
              <h3 className="font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="rounded-[2rem] border border-line bg-gradient-to-br from-brand-soft via-surface-card to-surface-card p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            Ready to start earning?
          </h2>
          <p className="mt-3 max-w-lg mx-auto text-ink-muted">
            Free to join—no credit card and no subscription. Create your account,
            explore tasks that match your interests, and request a payout through
            your linked method once you&apos;re eligible.
          </p>
          <a
            href="/account/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <CheckCircle2 className="h-5 w-5" />
            Create your account
          </a>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-ink-muted">
        © {new Date().getFullYear()} SurveyTasker. Built with transparency in
        mind.
      </footer>
    </div>
  );
}
