"use client";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import {
  User,
  Globe,
  Smartphone,
  Bell,
  Shield,
  LogOut,
  Save,
  CheckCircle2,
  Tag,
  BadgeCheck,
} from "lucide-react";
import IdentityVerificationForm from "@/components/IdentityVerificationForm";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import useAuth from "@/utils/useAuth";
import {
  MOBILE_PAYMENT_PREFERENCES,
  normalizePaymentPreference,
} from "@/constants/mobilePayments";
import { SUPPORTED_COUNTRIES } from "@/constants/supportedCountries";

const INTERESTS = [
  "Technology",
  "Health & Wellness",
  "Finance",
  "Education",
  "E-commerce",
  "Entertainment",
  "Travel",
  "Food & Beverage",
  "Automotive",
  "Sports",
  "Fashion",
  "Gaming",
];

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-8 sm:py-5">
        <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
          <Icon size={18} />
        </div>
        <h2 className="font-bold text-slate-800">{title}</h2>
      </div>
      <div className="p-5 sm:p-8">{children}</div>
    </div>
  );
}

function Label({ children }) {
  return (
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all placeholder-slate-300 ${className}`}
      {...props}
    />
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const { signOut } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    country: "",
    payment_preference: "",
    interests: [],
  });

  const [notifications, setNotifications] = useState({
    new_jobs: true,
    task_reminders: true,
    payout_updates: true,
    promotions: false,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        country: profile.country || "",
        payment_preference: normalizePaymentPreference(
          profile.payment_preference,
        ),
        interests: profile.interests || [],
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleInterestToggle = (interest) => {
    setForm((prev) => {
      const has = prev.interests.includes(interest);
      return {
        ...prev,
        interests: has
          ? prev.interests.filter((i) => i !== interest)
          : [...prev.interests, interest],
      };
    });
  };

  const handleSaveProfile = () => {
    updateProfile.mutate(form);
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!");
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/account/signin", redirect: true });
  };

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Settings
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your account, preferences, and notifications.
          </p>
        </div>

        {/* Profile Info */}
        <SectionCard icon={User} title="Profile Information">
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label>Legal full name</Label>
                <Input
                  placeholder="As on your government ID"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, full_name: e.target.value }))
                  }
                  disabled={isLoading || profile?.identityVerified}
                />
                {profile?.identityVerified && (
                  <p className="text-xs text-slate-400 mt-1.5 ml-1">
                    Legal name is locked after identity verification. Contact
                    support if your legal name changed.
                  </p>
                )}
              </div>
              <div>
                <Label>Email Address</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-slate-100 text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1.5 ml-1">
                  Email cannot be changed.
                </p>
              </div>
            </div>

            <div>
              <Label>Country</Label>
              <div className="relative">
                <select
                  value={form.country}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, country: e.target.value }))
                  }
                  disabled={isLoading}
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select your country…</option>
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <Globe
                  size={16}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending || isLoading}
              className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-sm disabled:opacity-60"
            >
              {updateProfile.isPending ? (
                <>Saving…</>
              ) : (
                <>
                  <Save size={16} />
                  Save Profile
                </>
              )}
            </motion.button>
          </div>
        </SectionCard>

        <div id="identity-verification">
          <SectionCard icon={BadgeCheck} title="Identity verification">
            {profile?.identityVerified ? (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-bold border border-emerald-200">
                  <CheckCircle2 size={16} />
                  Verified
                </div>
                <p className="text-sm text-slate-600">
                  Verified on{" "}
                  {profile.identityVerifiedAt
                    ? new Date(profile.identityVerifiedAt).toLocaleString()
                    : "—"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Upload a government ID or passport. Save your country above, then
                  enter the same details you use on your ID. Required before you
                  can request a payout.
                </p>
                <IdentityVerificationForm
                  variant="settings"
                  selectedCountry={form.country || ""}
                />
              </div>
            )}
          </SectionCard>
        </div>

        {/* Interests */}
        <SectionCard icon={Tag} title="Your Interests">
          <div>
            <p className="text-sm text-slate-500 mb-5">
              Select topics that match your background. This helps us recommend
              better tasks.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {INTERESTS.map((interest) => {
                const selected = form.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => handleInterestToggle(interest)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                      selected
                        ? "bg-brand text-white border-brand shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {selected && <CheckCircle2 size={13} />}
                    {interest}
                  </button>
                );
              })}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
              className="mt-6 flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-sm disabled:opacity-60"
            >
              <Save size={16} />
              Save Interests
            </motion.button>
          </div>
        </SectionCard>

        {/* Mobile payments */}
        <SectionCard icon={Smartphone} title="Mobile payments">
          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-4">
              This is your preferred payout type. The actual account numbers or
              PayPal email are added on the{" "}
              <a href="/payouts" className="text-brand font-bold underline">
                Payouts
              </a>{" "}
              page with email verification (code sent to your signup email).
            </p>
            {MOBILE_PAYMENT_PREFERENCES.map((pref) => {
              const selected = form.payment_preference === pref.value;
              const disabled = !pref.available;
              return (
                <button
                  key={pref.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) {
                      toast.info(`${pref.label} is coming soon.`);
                      return;
                    }
                    setForm((p) => ({ ...p, payment_preference: pref.value }));
                  }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left ${
                    disabled
                      ? "border-slate-100 bg-slate-50/80 opacity-75 cursor-not-allowed"
                      : selected
                        ? "border-brand bg-brand/5"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`font-bold text-sm ${selected && !disabled ? "text-brand" : "text-slate-700"}`}
                      >
                        {pref.label}
                      </p>
                      {disabled && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{pref.desc}</p>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      selected && !disabled
                        ? "border-brand bg-brand"
                        : "border-slate-300"
                    }`}
                  >
                    {selected && !disabled && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
              className="mt-2 flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-sm disabled:opacity-60"
            >
              <Save size={16} />
              Save Payment Preference
            </motion.button>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard icon={Bell} title="Notification Preferences">
          <div className="space-y-4">
            {[
              {
                key: "new_jobs",
                label: "New Job Alerts",
                desc: "Get notified when new tasks match your interests",
              },
              {
                key: "task_reminders",
                label: "Task Reminders",
                desc: "Reminders for in-progress tasks about to expire",
              },
              {
                key: "payout_updates",
                label: "Payout Updates",
                desc: "Status changes on your withdrawal requests",
              },
              {
                key: "promotions",
                label: "Promotions & Tips",
                desc: "Platform news, earning tips and premium offers",
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white transition-all"
              >
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() =>
                    setNotifications((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key],
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all flex-shrink-0 ${
                    notifications[item.key] ? "bg-brand" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      notifications[item.key]
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveNotifications}
              className="mt-2 flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-sm"
            >
              <Save size={16} />
              Save Notifications
            </motion.button>
          </div>
        </SectionCard>

        {/* Account / Security */}
        <SectionCard icon={Shield} title="Account & Security">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50">
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  Account Status
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your account is active and in good standing
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold border border-emerald-200">
                <CheckCircle2 size={12} />
                Active
              </span>
            </div>

            {profile?.is_premium && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-amber-100 bg-amber-50">
                <div>
                  <p className="font-bold text-amber-700 text-sm">
                    Premium Membership
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    You have access to all premium tasks and features
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                  ★ PREMIUM
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">
                Danger Zone
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSignOut}
                className="flex items-center gap-2 text-red-500 hover:bg-red-50 border border-red-200 px-6 py-3 rounded-2xl font-bold text-sm transition-all"
              >
                <LogOut size={16} />
                Sign Out of Account
              </motion.button>
            </div>
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
