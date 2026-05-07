import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import LandingHeader from "@/components/LandingHeader";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not send message");
        return;
      }
      toast.success(
        "Thanks — our team will get back to you as soon as possible.",
      );
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen hero-gradient text-ink">
      <LandingHeader />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <a
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </a>
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Contact us
        </h1>
        <p className="mt-3 text-ink-muted">
          Questions about SurveyTasker, payouts, or your account? Send a
          message and we&apos;ll reply to the email you provide.
        </p>
        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5 rounded-3xl border border-line bg-surface-card p-6 shadow-sm sm:p-8"
        >
          <div>
            <label
              htmlFor="contact-email"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Your email
            </label>
            <input
              id="contact-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-ink outline-none ring-brand/20 focus:ring-2"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="contact-message"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-y rounded-2xl border border-line bg-white px-4 py-3 text-ink outline-none ring-brand/20 focus:ring-2"
              placeholder="How can we help?"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-60 sm:w-auto sm:px-10"
          >
            {sending ? "Sending…" : "Send message"}
          </button>
        </form>
      </div>
    </div>
  );
}
