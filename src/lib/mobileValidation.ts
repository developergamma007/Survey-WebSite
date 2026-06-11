const MOBILE_RE = /^\d{10}$/;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function isValidMobile(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length === 0 || MOBILE_RE.test(digits);
}

export function validateMobileRequired(value: string, label: string): string | null {
  const digits = digitsOnly(value);
  if (!digits) return `${label} is required`;
  if (!MOBILE_RE.test(digits)) return `${label} must be exactly 10 digits`;
  return null;
}

export function validateMobileOptional(value: string, label: string): string | null {
  const digits = digitsOnly(value);
  if (!digits) return null;
  if (!MOBILE_RE.test(digits)) return `${label} must be exactly 10 digits`;
  return null;
}

export function resolveOthersValue(selected: string, otherText: string): string {
  if (selected === "Others" || selected === "Other") {
    const trimmed = otherText.trim();
    return trimmed ? `Others: ${trimmed}` : "Others";
  }
  return selected;
}

export function isOthersSelection(value: string): boolean {
  return value === "Others" || value === "Other";
}
