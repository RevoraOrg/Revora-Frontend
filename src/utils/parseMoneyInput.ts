import { SUPPORTED_LOCALES, SupportedLocale } from "../constants/i18n";

export type ParseMoneyError =
  | "EMPTY"
  | "NAN"
  | "NEGATIVE"
  | "TOO_MANY_DECIMALS"
  | "MALFORMED_SEPARATORS"
  | "INVALID_LOCALE";

export interface ParseMoneyResult {
  ok: boolean;
  cents?: number;
  error?: ParseMoneyError;
  rawValue?: string;
}

interface LocaleDecimalInfo {
  decimalSeparator: string;
  groupSeparator: string;
}

/**
 * Get decimal and group separators for a locale using Intl.NumberFormat.
 */
function getLocaleDecimalInfo(locale: SupportedLocale): LocaleDecimalInfo {
  const formatter = new Intl.NumberFormat(locale);
  const parts = formatter.formatToParts(1234.56);
  let decimalSeparator = ".";
  let groupSeparator = ",";
  for (const part of parts) {
    if (part.type === "decimal") {
      decimalSeparator = part.value;
    } else if (part.type === "group") {
      groupSeparator = part.value;
    }
  }
  return { decimalSeparator, groupSeparator };
}

/**
 * Parse a money input string according to locale conventions.
 * Returns { ok: true, cents } on success, or { ok: false, error } on failure.
 * 
 * Rules:
 * - Empty string -> EMPTY
 * - NaN after parsing -> NAN
 * - Negative values -> NEGATIVE
 * - More than 2 decimal places -> TOO_MANY_DECIMALS
 * - Malformed separators (e.g., 1.2.3, 1,,234) -> MALFORMED_SEPARATORS
 * - Invalid locale -> INVALID_LOCALE
 */
export function parseMoneyInput(
  value: string,
  locale: SupportedLocale = "en-US"
): ParseMoneyResult {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    return { ok: false, error: "INVALID_LOCALE", rawValue: value };
  }

  const { decimalSeparator, groupSeparator } = getLocaleDecimalInfo(locale);

  // Check for group separator at start or end BEFORE trimming (group separators like U+202F are removed by trim())
  if (value.startsWith(groupSeparator) || value.endsWith(groupSeparator)) {
    return { ok: false, error: "MALFORMED_SEPARATORS", rawValue: value };
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: false, error: "EMPTY", rawValue: value };
  }

  // Check for negative sign - reject immediately
  if (trimmed.startsWith("-")) {
    return { ok: false, error: "NEGATIVE", rawValue: value };
  }

  // Check for malformed separators
  // Multiple decimal separators
  const decimalCount = (trimmed.match(new RegExp(`\\${decimalSeparator}`, "g")) || []).length;
  if (decimalCount > 1) {
    return { ok: false, error: "MALFORMED_SEPARATORS", rawValue: value };
  }

  // Group separator after decimal separator (e.g., "1,234.56,78")
  if (decimalCount === 1) {
    const decimalIndex = trimmed.indexOf(decimalSeparator);
    const afterDecimal = trimmed.slice(decimalIndex + 1);
    if (afterDecimal.includes(groupSeparator)) {
      return { ok: false, error: "MALFORMED_SEPARATORS", rawValue: value };
    }
  }

  // Check for consecutive group separators (e.g., "1,,234")
  if (trimmed.includes(groupSeparator + groupSeparator)) {
    return { ok: false, error: "MALFORMED_SEPARATORS", rawValue: value };
  }

  // Remove group separators
  const withoutGroupSeparators = trimmed.split(groupSeparator).join("");

  // Check decimal places
  if (decimalCount === 1) {
    const decimalIndex = withoutGroupSeparators.indexOf(decimalSeparator);
    const decimalPlaces = withoutGroupSeparators.length - decimalIndex - 1;
    if (decimalPlaces > 2) {
      return { ok: false, error: "TOO_MANY_DECIMALS", rawValue: value };
    }
  }

  // Replace locale decimal separator with standard dot for parsing
  const normalized = withoutGroupSeparators.replace(decimalSeparator, ".");

  // Parse as float
  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) {
    return { ok: false, error: "NAN", rawValue: value };
  }

  if (parsed <= 0) {
    return { ok: false, error: "NAN", rawValue: value };
  }

  // Convert to cents (integer minor units)
  const cents = Math.round(parsed * 100);

  return { ok: true, cents, rawValue: value };
}

/**
 * Compute payout estimate in cents (8% of gross revenue cents).
 * Uses integer arithmetic to avoid floating point errors.
 */
export function computePayoutEstimateCents(grossRevenueCents: number): number {
  // 8% = 8/100 = 2/25
  // Round to nearest cent
  return Math.round((grossRevenueCents * 8) / 100);
}

/**
 * Format cents as a currency string with 2 decimal places.
 */
export function formatCentsAsCurrency(
  cents: number,
  currency: string,
  locale: SupportedLocale
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(cents / 100);
}