import { namesMatch, normalizePersonName } from "@/lib/identity/nameMatch";

/** Strip non-alphanumerics for ID comparison */
export function normalizeIdNumber(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** @param {string|Date|null|undefined} d */
export function parseIsoDateOnly(d) {
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  const t = String(d || "").trim();
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/** Compare DOB as the same calendar date in UTC (YYYY-MM-DD strings). */
export function datesMatchUtcDay(a, b) {
  const da = parseIsoDateOnly(a);
  const db = parseIsoDateOnly(b);
  if (!da || !db) return false;
  return da === db;
}

/** Normalize sex to M or F */
export function normalizeSex(s) {
  const u = String(s || "")
    .trim()
    .toUpperCase()
    .slice(0, 6);
  if (u === "M" || u === "F") return u;
  if (u.startsWith("MALE")) return "M";
  if (u.startsWith("FEMALE")) return "F";
  return "";
}

/**
 * Application / verification date: start of today in UTC.
 * Expiry is expired if strictly before today (document valid through expiry day inclusive).
 */
export function isDocumentExpiredByOcr(expiryRaw, now = new Date()) {
  const exp = parseIsoDateOnly(expiryRaw);
  if (!exp) return { expired: false, unknown: true };
  const today = now.toISOString().slice(0, 10);
  return { expired: exp < today, unknown: false, expiry: exp, today };
}

export function countryMatchesSelected(selectedCountry, ocrCountry) {
  const a = normalizePersonName(selectedCountry).replace(/\s+/g, " ");
  const b = normalizePersonName(ocrCountry).replace(/\s+/g, " ");
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.includes(a) || a.includes(b)) return true;
  const aw = a.split(" ")[0];
  const bw = b.split(" ")[0];
  return aw === bw && aw.length > 2;
}

/** Loose region match: tokens overlap or substring */
export function regionMatches(userRegion, ocrRegion) {
  const u = normalizePersonName(userRegion).replace(/[^a-z0-9\s]/g, " ");
  const o = normalizePersonName(ocrRegion).replace(/[^a-z0-9\s]/g, " ");
  if (!u || !o) return false;
  if (u === o) return true;
  if (o.includes(u) || u.includes(o)) return true;
  const ut = u.split(" ").filter((t) => t.length > 2);
  const ot = o.split(" ").filter((t) => t.length > 2);
  const overlap = ut.filter((t) => ot.some((x) => x === t || x.includes(t) || t.includes(x)));
  return overlap.length > 0;
}

/**
 * @param {{
 *   profileFullName: string;
 *   declaredIdNumber: string;
 *   declaredDob: string;
 *   declaredSex: string;
 *   declaredRegion: string;
 *   selectedCountry: string;
 * }} declared
 * @param {{
 *   fullName: string|null;
 *   idNumber: string|null;
 *   dateOfBirth: string|null;
 *   expiryDate: string|null;
 *   country: string|null;
 *   region: string|null;
 *   sex: string|null;
 * }} ocr
 */
export function validateOcrAgainstDeclaration(declared, ocr) {
  const { expired, unknown } = isDocumentExpiredByOcr(ocr.expiryDate);
  if (!unknown && expired) {
    return {
      ok: false,
      error:
        "Your document is expired. Renew it and try again with a valid ID.",
      code: "document_expired",
    };
  }

  if (!ocr.fullName || !namesMatch(declared.profileFullName, ocr.fullName)) {
    return {
      ok: false,
      error: `Name on document does not match your legal name "${declared.profileFullName}".`,
      code: "name_mismatch",
      extractedHint: ocr.fullName,
    };
  }

  const dId = normalizeIdNumber(declared.declaredIdNumber);
  const oId = normalizeIdNumber(ocr.idNumber);
  if (!dId || !oId || dId !== oId) {
    return {
      ok: false,
      error: "ID or license number on the document does not match what you entered.",
      code: "id_mismatch",
    };
  }

  if (!datesMatchUtcDay(declared.declaredDob, ocr.dateOfBirth)) {
    return {
      ok: false,
      error: "Date of birth on the document does not match what you entered.",
      code: "dob_mismatch",
    };
  }

  const ds = normalizeSex(declared.declaredSex);
  const os = normalizeSex(ocr.sex);
  if (!ds || !os || ds !== os) {
    return {
      ok: false,
      error: "Sex on the document does not match what you selected (M/F).",
      code: "sex_mismatch",
    };
  }

  if (!countryMatchesSelected(declared.selectedCountry, ocr.country || "")) {
    return {
      ok: false,
      error:
        "Country on the document does not match the country you selected. Choose the correct country or upload the matching document.",
      code: "country_mismatch",
    };
  }

  const ocrRegion = String(ocr.region || "").trim();
  if (ocrRegion && !regionMatches(declared.declaredRegion, ocrRegion)) {
    return {
      ok: false,
      error:
        "State or city on the document could not be matched to what you entered. Check spelling and try again.",
      code: "region_mismatch",
    };
  }

  return { ok: true };
}
