/** Mask email for safe display, e.g. "jo•••@example.com". */
export function maskLoginEmail(email) {
  const s = String(email || "").trim().toLowerCase();
  const [u, d] = s.split("@");
  if (!d || !u) return "your signup email";
  if (u.length <= 2) return `•••@${d}`;
  return `${u.slice(0, 2)}•••@${d}`;
}
