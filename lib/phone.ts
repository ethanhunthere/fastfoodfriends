/**
 * Kosovo phone number normalisation + validation.
 *
 * The restaurant only accepts **Kosovo mobile prefixes**: 043, 044, 045, 048, 049.
 * All of them are 9 digits in national format (`04X XXX XXX`) which equals the
 * 8-digit national significant number `04X` + 6 digits.
 *
 * Accepted inputs (all normalise to E.164 `+383XXXXXXXX`):
 *   044 123 456 · 044-123-456 · 044123456 · +383 44 123 456
 *   00383 44 123 456 · 38344123456 · 044/123-456
 */

export const KOSOVO_MOBILE_PREFIXES = ["043", "044", "045", "048", "049"] as const;

export type KosovoMobilePrefix = (typeof KOSOVO_MOBILE_PREFIXES)[number];

const LOCAL_PATTERN = /^0(43|44|45|48|49)\d{6}$/;

export interface PhoneValidationResult {
  ok: boolean;
  /** E.164 formatted number, e.g. `+38344123456` — only set when `ok`. */
  e164: string;
  /** Local pretty format for display, e.g. `044 123 456`. */
  pretty: string;
  /** i18n-ready Albanian error message — only set when `!ok`. */
  error: string;
}

function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}

/**
 * Normalise any user-typed Kosovo mobile number into the local 9-digit shape.
 * Returns `null` when the digits cannot represent a Kosovo mobile number at all.
 */
export function normaliseKosovoMobile(raw: string): string | null {
  const digits = digitsOnly(raw ?? "");

  if (digits.length === 0) return null;

  if (LOCAL_PATTERN.test(digits)) {
    return digits;
  }

  if (digits.startsWith("00383")) {
    const local = `0${digits.slice(5)}`;
    return LOCAL_PATTERN.test(local) ? local : null;
  }

  if (digits.startsWith("383")) {
    const local = `0${digits.slice(3)}`;
    return LOCAL_PATTERN.test(local) ? local : null;
  }

  // Numbers typed without the leading 0, e.g. `44123456`.
  const withZero = `0${digits}`;
  if (LOCAL_PATTERN.test(withZero)) {
    return withZero;
  }

  return null;
}

/** Full validation used by the checkout form (client) and the Server Action. */
export function validateKosovoMobile(raw: string): PhoneValidationResult {
  const local = normaliseKosovoMobile(raw);

  if (!local) {
    return {
      ok: false,
      e164: "",
      pretty: "",
      error:
        "Numri duhet të jetë numër mobil i Kosovës (044, 045, 049, 043, 048) me 9 shifra, p.sh. 044 123 456.",
    };
  }

  const prefix = local.slice(0, 3) as KosovoMobilePrefix;
  if (!KOSOVO_MOBILE_PREFIXES.includes(prefix)) {
    return {
      ok: false,
      e164: "",
      pretty: "",
      error: `Prefiksi ${prefix} nuk pranohet. Pranohen: ${KOSOVO_MOBILE_PREFIXES.join(", ")}.`,
    };
  }

  return {
    ok: true,
    e164: `+383${local.slice(1)}`,
    pretty: `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`,
    error: "",
  };
}

/** Convenience: E.164 or empty string. */
export function toE164(raw: string): string {
  return validateKosovoMobile(raw).e164;
}

/** Pretty local display format, falls back to the raw value when invalid. */
export function prettyPhone(raw: string): string {
  const result = validateKosovoMobile(raw);
  return result.ok ? result.pretty : (raw ?? "").trim();
}

/**
 * Build a `tel:` href that dialers understand — digits plus a leading `+`.
 * Fixes the classic mistake of `tel:++383...` or `tel: (044) 123-456`.
 */
export function telHref(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.startsWith("383")) return `tel:+${digits}`;
  if (digits.startsWith("00383")) return `tel:+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `tel:+383${digits.slice(1)}`;
  return `tel:${digits}`;
}