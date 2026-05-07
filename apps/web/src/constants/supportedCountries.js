/**
 * Countries available for onboarding / identity (must align with ID templates you support).
 * Value is stored on profiles.country and sent to OCR cross-check as the expected jurisdiction label.
 */
export const SUPPORTED_COUNTRIES = [
  { value: "United States", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "India", label: "India" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "Kenya", label: "Kenya" },
  { value: "South Africa", label: "South Africa" },
  { value: "Brazil", label: "Brazil" },
  { value: "Philippines", label: "Philippines" },
  { value: "Pakistan", label: "Pakistan" },
  { value: "Bangladesh", label: "Bangladesh" },
  { value: "Ghana", label: "Ghana" },
  { value: "Other", label: "Other" },
];

export const SUPPORTED_COUNTRY_VALUES = new Set(
  SUPPORTED_COUNTRIES.map((c) => c.value),
);
