/**
 * Identity document OCR — pluggable backends.
 *
 * **Mock / dev (default)**  
 * Per-field env overrides: `IDENTITY_MOCK_*` below. If unset, the mock echoes
 * `options.declared` so local uploads pass when the form matches (use env to
 * simulate mismatches / expiry).
 *
 * **HTTP production adapter**  
 * Set `IDENTITY_OCR_HTTP_URL` to POST JSON `{ mimeType, imageBase64 }` and receive:
 * `{ fullName, idNumber, dateOfBirth, expiryDate, country, region, sex, confidence }`
 * (ISO dates `YYYY-MM-DD`). If the request fails, processing falls back to mock.
 *
 * @typedef {{
 *   fullName: string|null;
 *   idNumber: string|null;
 *   dateOfBirth: string|null;
 *   expiryDate: string|null;
 *   country: string|null;
 *   region: string|null;
 *   sex: string|null;
 *   confidence: number;
 * }} IdentityOcrResult
 */

const MIN_BYTES = 200;

/**
 * @param {ArrayBuffer} buffer
 * @param {string} mimeType
 * @param {{
 *   profileFullName?: string;
 *   originalFilename?: string;
 *   declared?: {
 *     fullName?: string;
 *     idNumber?: string;
 *     dateOfBirth?: string;
 *     sex?: string;
 *     country?: string;
 *     region?: string;
 *   };
 * }} options
 * @returns {Promise<IdentityOcrResult>}
 */
export async function extractIdentityDocument(buffer, mimeType, options = {}) {
  const httpResult = await tryHttpOcrAdapter(buffer, mimeType);
  if (httpResult) return httpResult;
  return extractIdentityDocumentMock(buffer, mimeType, options);
}

/**
 * @param {ArrayBuffer} buffer
 * @param {string} mimeType
 */
async function tryHttpOcrAdapter(buffer, mimeType) {
  const url = process.env.IDENTITY_OCR_HTTP_URL?.trim();
  if (!url) return null;
  try {
    const imageBase64 = Buffer.from(buffer).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mimeType, imageBase64 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeOcrPayload(data, buffer?.byteLength ?? 0);
  } catch {
    return null;
  }
}

/** @param {unknown} data @param {number} bytes */
function normalizeOcrPayload(data, bytes) {
  if (!data || typeof data !== "object") {
    return emptyOcr(bytes);
  }
  const d = /** @type {Record<string, unknown>} */ (data);
  const confidence =
    typeof d.confidence === "number" ? d.confidence : Number(d.confidence) || 0;
  return {
    fullName: pickStr(d.fullName),
    idNumber: pickStr(d.idNumber),
    dateOfBirth: pickStr(d.dateOfBirth),
    expiryDate: pickStr(d.expiryDate),
    country: pickStr(d.country),
    region: pickStr(d.region),
    sex: pickStr(d.sex),
    confidence: bytes >= MIN_BYTES ? confidence : 0,
  };
}

function pickStr(v) {
  const s = v == null ? "" : String(v).trim();
  return s || null;
}

function emptyOcr(bytes) {
  return {
    fullName: null,
    idNumber: null,
    dateOfBirth: null,
    expiryDate: null,
    country: null,
    region: null,
    sex: null,
    confidence: bytes >= MIN_BYTES ? 0 : 0,
  };
}

/**
 * @param {ArrayBuffer} buffer
 * @param {string} mimeType
 * @param {{ profileFullName?: string; originalFilename?: string; declared?: Record<string, string> }} options
 */
export async function extractIdentityDocumentMock(
  buffer,
  mimeType,
  options = {},
) {
  const bytes = buffer?.byteLength ?? 0;
  const { profileFullName = "", originalFilename = "", declared = {} } = options;

  const allowedMime =
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp" ||
    mimeType === "application/pdf";

  const baseConfidence = bytes >= MIN_BYTES && allowedMime ? 1 : 0;

  const env = (k, fallback = null) => {
    const v = process.env[k]?.trim();
    return v && v.length > 0 ? v : fallback;
  };

  const nameFromFile = () => {
    const m = String(originalFilename).match(/MOCK_([^.\s]+(?:_[^.\s]+)*)/i);
    return m ? m[1].replace(/_/g, " ") : null;
  };

  const failName = env("IDENTITY_MOCK_EXTRACTED_NAME") === "__FAIL__";

  let fullName =
    env("IDENTITY_MOCK_FULL_NAME") ||
    env("IDENTITY_MOCK_EXTRACTED_NAME") ||
    (failName ? "Someone Else" : null) ||
    nameFromFile() ||
    declared.fullName ||
    profileFullName.trim() ||
    null;

  let idNumber = env("IDENTITY_MOCK_ID_NUMBER") || declared.idNumber || null;
  let dateOfBirth = env("IDENTITY_MOCK_DOB") || declared.dateOfBirth || null;
  let expiryDate = env("IDENTITY_MOCK_EXPIRY") || "2099-12-31";
  let country = env("IDENTITY_MOCK_COUNTRY") || declared.country || null;
  let region = env("IDENTITY_MOCK_REGION") || declared.region || null;
  let sex = env("IDENTITY_MOCK_SEX") || declared.sex || null;

  if (env("IDENTITY_MOCK_EXPIRY") === "__EXPIRED__") {
    expiryDate = "2000-01-01";
  }

  if (!allowedMime) {
    return { ...emptyOcr(bytes), confidence: 0 };
  }

  const hasCore = Boolean(
    fullName && idNumber && dateOfBirth && country && sex,
  );
  const confidence = baseConfidence && hasCore ? 1 : 0;

  return {
    fullName,
    idNumber,
    dateOfBirth,
    expiryDate,
    country,
    region,
    sex,
    confidence,
  };
}

/**
 * Legacy mock (name + score only) for older callers.
 * @deprecated Use extractIdentityDocument
 */
export async function extractAndAssessMock(buffer, mimeType, options = {}) {
  const r = await extractIdentityDocumentMock(buffer, mimeType, {
    ...options,
    declared: {
      fullName: options.profileFullName,
    },
  });
  return {
    extractedFullName: r.fullName,
    documentAuthenticityScore: r.confidence >= 1 ? 1 : 0,
  };
}
