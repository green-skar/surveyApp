"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

const DOC_TYPES = [
  { value: "national_id", label: "National / government ID" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's license" },
];

/**
 * @param {object} props
 * @param {"onboarding"|"settings"} [props.variant]
 * @param {() => void} [props.onVerified]
 * @param {string} [props.className]
 * @param {string} [props.selectedCountry] Supported list value; sent with upload for OCR cross-check.
 */
export default function IdentityVerificationForm({
  variant = "settings",
  onVerified,
  className = "",
  selectedCountry = "",
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("national_id");
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState("M");
  const [region, setRegion] = useState("");

  const dark = variant === "onboarding";
  const selectClass = dark
    ? "w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
    : "w-full rounded-2xl border border-line bg-surface-muted px-5 py-3.5 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
  const fileInputClass = dark
    ? "block w-full text-sm text-ink-muted file:mr-4 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand hover:file:bg-brand/15"
    : "block w-full text-sm text-ink-muted file:mr-4 file:rounded-xl file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-bold file:text-brand hover:file:bg-brand/15";
  const labelClass = dark
    ? "text-sm font-medium text-ink-muted"
    : "mb-2 block text-xs font-bold uppercase tracking-widest text-ink-muted";
  const btnClass = dark
    ? "flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-lg font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
    : "flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50";
  const inputClass = dark
    ? "w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
    : "w-full rounded-2xl border border-line bg-surface-muted px-5 py-3.5 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(selectedCountry || "").trim()) {
      toast.error("Select your country before submitting identity verification.");
      return;
    }
    if (!fullName.trim() || !idNumber.trim() || !dateOfBirth || !region.trim()) {
      toast.error("Fill in all document details before uploading.");
      return;
    }
    if (!file) {
      toast.error("Choose a photo or PDF of your ID.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", documentType);
      fd.append("fullName", fullName.trim());
      fd.append("idNumber", idNumber.trim());
      fd.append("dateOfBirth", dateOfBirth);
      fd.append("sex", sex);
      fd.append("region", region.trim());
      fd.append("country", selectedCountry.trim());

      const res = await fetch("/api/identity/verify-upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }
      if (data.alreadyVerified) {
        toast.success("You're already verified.");
      } else {
        toast.success("Identity verified.");
      }
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setFile(null);
      onVerified?.();
    } catch {
      toast.error("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${className}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className={labelClass}>Legal full name (as on ID)</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="First Middle Last"
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Government ID / license number</label>
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            className={inputClass}
            placeholder="ID number"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Date of birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Sex (as on ID)</label>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className={selectClass}
          >
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className={labelClass}>State / city (as on ID)</label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={inputClass}
            placeholder="e.g. Nairobi or California"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Document type</label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className={selectClass}
        >
          {DOC_TYPES.map((d) => (
            <option
              key={d.value}
              value={d.value}
              className={dark ? "bg-surface-card" : ""}
            >
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Upload document</label>
        <div
          className={
            dark
              ? "rounded-xl border border-dashed border-line p-4"
              : "rounded-2xl border border-dashed border-line bg-surface-muted/80 p-4"
          }
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className={fileInputClass}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <p className="mt-2 text-xs text-ink-muted">Selected: {file.name}</p>
          )}
        </div>
        <p
          className={
            dark ? "text-xs text-ink-muted" : "text-xs leading-relaxed text-ink-muted"
          }
        >
          JPG, PNG, WebP, or PDF. Expiry is read from the document only (not
          entered here). For local testing without HTTP OCR, the mock echoes your
          fields when the file is large enough; use env{" "}
          <span className="font-mono">IDENTITY_MOCK_*</span> or{" "}
          <span className="font-mono">IDENTITY_OCR_HTTP_URL</span> for production.
        </p>
      </div>

      <button type="submit" disabled={submitting} className={btnClass}>
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Verifying…
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            Submit for verification
          </>
        )}
      </button>
    </form>
  );
}
