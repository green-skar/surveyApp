/**
 * Small uppercase section label (e.g. — SETTINGS) matching reference sites.
 */
export default function SectionKicker({ children, className = "" }) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-muted ${className}`}
    >
      <span className="text-brand-muted/70">—</span> {children}{" "}
      <span className="text-brand-muted/70">—</span>
    </p>
  );
}
